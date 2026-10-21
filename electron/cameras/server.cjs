const { spawn } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')
const os = require('node:os')
const net = require('node:net')
const { ensureBinaries } = require('./dependencies.cjs')
const resolucoes = require('./resolucoes.json')

const initialState = () => ({ fase: 'desligado', mensagem: 'Câmeras desligadas', sessao: 0,
  fps: 2, largura: 640, altura: 360, porta: 8554, hosts: ['127.0.0.1'], cameras: [] })
function streamPath(id) {
  const slug = id.normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || 'camera'
  return `camera/${slug}-${createHash('sha256').update(id).digest('hex').slice(0, 10)}`
}
function normalize(config) {
  if (!config?.ativa) return null
  if (!Number.isInteger(config.porta) || config.porta < 1024 || config.porta > 65535) throw new Error('Use uma porta RTSP de 1024 a 65535.')
  if (![1, 2, 5].includes(config.fps) || !Number.isInteger(config.largura) || !Object.hasOwn(resolucoes, config.largura)) throw new Error('Qualidade de vídeo inválida.')
  if (!Array.isArray(config.cameras) || config.cameras.length > 32) throw new Error('São permitidas até 32 câmeras simultâneas.')
  const ids = new Set()
  const cameras = config.cameras.map(c => {
    if (typeof c.id !== 'string' || !c.id || c.id.length > 256 || ids.has(c.id)) throw new Error('As câmeras precisam ter identificadores únicos.')
    ids.add(c.id)
    return { id: c.id, nome: String(c.nome || c.id).slice(0, 200), caminho: streamPath(c.id), pronta: false }
  })
  const altura = resolucoes[config.largura]
  // No máximo 12 capturas VGA por segundo, distribuídas entre todas as câmeras.
  const fps = Math.floor(Math.min(config.fps, 12 * 640 * 360 / (config.largura * altura * Math.max(1, cameras.length))) * 1000) / 1000
  return { cameras, largura: config.largura, altura, porta: config.porta, fps }
}
function serverConfig(porta, cameras) {
  return `logLevel: info
logDestinations: [stdout]
rtsp: true
rtspAddress: :${porta}
rtspTransports: [tcp]
rtmp: false
hls: false
webrtc: false
srt: false
moq: false
api: false
metrics: false
pprof: false
playback: false
authMethod: internal
authInternalUsers:
  - user: any
    ips: [127.0.0.1, '::1']
    permissions:
      - action: publish
  - user: any
    permissions:
      - action: read
paths:
${cameras.map(c => `  ${c.caminho}:\n    source: publisher\n    overridePublisher: false`).join('\n')}
`
}
function encoderArgs(config, camera) {
  return ['-hide_banner', '-loglevel', 'warning', '-nostats', '-progress', 'pipe:1',
    '-f', 'rawvideo', '-pixel_format', 'rgba', '-video_size', `${config.largura}x${config.altura}`,
    '-framerate', String(config.fps), '-probesize', '32', '-analyzeduration', '0', '-i', 'pipe:0',
    '-an', '-vf', 'vflip', '-filter_threads', '1', '-c:v', 'libx264', '-threads', '1', '-preset', 'ultrafast',
    '-tune', 'zerolatency', '-pix_fmt', 'yuv420p', '-profile:v', 'baseline', '-crf', '25',
    '-g', String(Math.max(1, Math.ceil(config.fps))), '-keyint_min', '1', '-sc_threshold', '0',
    '-bf', '0', '-rtsp_transport', 'tcp', '-f', 'rtsp', `rtsp://127.0.0.1:${config.porta}/${camera.caminho}`]
}
function checkPort(port) {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.once('error', () => reject(new Error(`A porta RTSP ${port} está ocupada ou indisponível. Escolha outra porta.`)))
    server.listen({ port, host: '0.0.0.0', exclusive: true }, () => server.close(resolve))
  })
}
function kill(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve()
  return new Promise(resolve => {
    const timer = setTimeout(() => { child.kill('SIGKILL'); resolve() }, 1500)
    child.once('close', () => { clearTimeout(timer); resolve() })
    child.stdin?.destroy()
    child.kill()
  })
}

class CameraServer {
  constructor(app, onState = () => {}) {
    this.app = app; this.onState = onState; this.state = initialState()
    this.generation = 0; this.encoders = new Map(); this.queue = Promise.resolve(); this.controller = null; this.server = null
  }
  emit() { this.onState(structuredClone(this.state)) }
  async stopProcesses() {
    const encoders = [...this.encoders.values()]; this.encoders.clear()
    const server = this.server; this.server = null
    await Promise.all(encoders.map(e => kill(e.child)))
    await kill(server)
  }
  configure(raw) {
    const generation = ++this.generation
    this.controller?.abort()
    this.controller = new AbortController()
    const signal = this.controller.signal
    // Parar/iniciar repetidamente nunca deixa instaladores ou servidores antigos ativos.
    this.queue = this.queue.catch(() => {}).then(async () => {
      if (generation !== this.generation) return
      await this.stopProcesses()
      if (generation !== this.generation) return
      this.state = { ...initialState(), sessao: generation }
      try {
        const config = normalize(raw)
        if (!config || !config.cameras.length) {
          if (config) this.state.mensagem = 'Nenhuma câmera selecionada no projeto.'
          this.emit(); return
        }
        const hosts = ['127.0.0.1', ...Object.values(os.networkInterfaces()).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => n.address)]
        this.state = { ...this.state, ...config, hosts: [...new Set(hosts)], fase: 'iniciando', mensagem: 'Preparando câmeras…' }
        this.emit()
        const binaries = await ensureBinaries(this.app, signal, mensagem => {
          if (generation === this.generation) { this.state.mensagem = mensagem; this.emit() }
        })
        signal.throwIfAborted()
        await checkPort(config.porta)
        signal.throwIfAborted()
        const dir = path.join(this.app.getPath('userData'), 'cameras')
        fs.mkdirSync(dir, { recursive: true })
        const configPath = path.join(dir, 'mediamtx.yml')
        fs.writeFileSync(configPath, serverConfig(config.porta, config.cameras))
        const server = spawn(binaries.mediamtx, [configPath], { cwd: dir, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
        this.server = server
        await new Promise((resolve, reject) => {
          let output = '', done = false
          const finish = error => { if (done) return; done = true; clearTimeout(timer); signal.removeEventListener('abort', abort); error ? reject(error) : resolve() }
          const abort = () => finish(new Error('Inicialização cancelada.'))
          const timer = setTimeout(() => finish(new Error('O servidor RTSP não ficou pronto em 10 segundos.')), 10000)
          signal.addEventListener('abort', abort, { once: true })
          const read = data => { output = (output + data.toString()).slice(-4000); if (/\[RTSP\] (?:listener opened|started with listeners)/.test(output)) finish() }
          server.stdout.on('data', read); server.stderr.on('data', read)
          server.once('error', error => finish(new Error(`Falha ao iniciar RTSP: ${error.message}`)))
          server.once('close', code => {
            if (!done) finish(new Error(`O servidor RTSP encerrou (${code}): ${output.trim()}`))
            else if (this.server === server && generation === this.generation) {
              this.state.fase = 'erro'; this.state.mensagem = 'O servidor RTSP foi encerrado. Desligue e ligue as câmeras para tentar novamente.'
              this.state.cameras.forEach(c => { c.pronta = false })
              this.emit(); void this.stopProcesses()
            }
          })
        })
        signal.throwIfAborted()
        for (const camera of config.cameras) this.startEncoder(binaries.ffmpeg, camera, config, generation)
        this.state.fase = 'executando'; this.state.mensagem = 'Gerando as imagens das câmeras…'; this.emit()
      } catch (error) {
        await this.stopProcesses()
        if (generation === this.generation) {
          this.state.fase = 'erro'; this.state.mensagem = error.message
          this.state.cameras.forEach(c => { c.pronta = false }); this.emit()
        }
      }
    })
    return this.queue
  }
  startEncoder(binary, camera, config, generation) {
    const child = spawn(binary, encoderArgs(config, camera), { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] })
    const entry = { child, busy: false, error: '', receivedAt: 0 }; this.encoders.set(camera.id, entry)
    const fail = message => {
      if (generation !== this.generation || this.encoders.get(camera.id) !== entry) return
      camera.erro = message; camera.pronta = false; this.emit(); void kill(child)
    }
    child.stderr.on('data', data => { entry.error = (entry.error + data.toString()).slice(-2000) })
    let progress = ''
    child.stdout.on('data', data => {
      if (generation !== this.generation || this.encoders.get(camera.id) !== entry) return
      progress = (progress + data.toString()).slice(-2000)
      if (!camera.pronta && /frame=\s*[1-9]\d*/.test(progress)) {
        camera.pronta = true; this.state.mensagem = 'RTSP disponível'; this.emit()
      }
    })
    child.stdin.on('error', error => fail(`Falha ao enviar vídeo: ${error.message}`))
    child.once('error', error => fail(`Não foi possível iniciar o vídeo: ${error.message}`))
    child.once('close', () => fail(`Vídeo encerrado. ${entry.error.trim() || 'Desligue e ligue as câmeras para tentar novamente.'}`))
  }
  frame(session, id, pixels) {
    const entry = this.encoders.get(id)
    if (session !== this.generation || this.state.fase !== 'executando' || !entry || entry.busy || !entry.child.stdin.writable || entry.child.stdin.destroyed) return Promise.resolve(false)
    if (!(pixels instanceof Uint8Array) || pixels.byteLength !== this.state.largura * this.state.altura * 4) return Promise.resolve(false)
    // Recusa rajadas; não mantém fila de imagens antigas na memória.
    const now = performance.now()
    if (now - entry.receivedAt < 450 / this.state.fps) return Promise.resolve(false)
    entry.receivedAt = now; entry.busy = true
    return new Promise(resolve => {
      let done = false
      const finish = ok => { if (done) return; done = true; clearTimeout(timer); entry.busy = false; resolve(ok) }
      const timer = setTimeout(() => { void kill(entry.child); finish(false) }, 5000)
      try { entry.child.stdin.write(Buffer.from(pixels.buffer, pixels.byteOffset, pixels.byteLength), error => finish(!error)) }
      catch { finish(false) }
    })
  }
  stop() { return this.configure({ ativa: false }) }
}
module.exports = { CameraServer, streamPath, normalize, serverConfig, encoderArgs }
