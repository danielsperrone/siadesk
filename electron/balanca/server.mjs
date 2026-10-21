import net from 'node:net'
import { performance } from 'node:perf_hooks'
import { PesoDinamico } from './fisica.mjs'

// SimuladorBalancaLider/Unit2.pas e AdicionaByteLIDER do OWL:
// SOH + sete dígitos em kg + espaço + E (estável) / I (instável) + STX.
export function pacoteLider(peso, estavel) {
  const value = Math.max(0, Math.min(9999999, Math.round(peso)))
  return Buffer.from(`\x01${String(value).padStart(7, '0')} ${estavel ? 'E' : 'I'}\x02`, 'ascii')
}
export class ServidorBalanca {
  constructor(onState = () => {}) {
    this.physics = new PesoDinamico(); this.onState = onState
    this.server = null; this.clients = new Set(); this.port = 30005; this.error = ''; this.queue = Promise.resolve()
    let previous = performance.now(), frames = 0
    this.timer = setInterval(() => {
      const now = performance.now()
      this.physics.avancar((now - previous) / 1000); previous = now
      if (++frames % 4 === 0) this.transmitir()
      if (frames % 2 === 0) this.onState(this.snapshot())
    }, 50)
  }
  snapshot() { return { ...this.physics.snapshot(), porta: this.port, running: !!this.server?.listening, clients: this.clients.size, error: this.error } }
  transmitir() {
    const s = this.physics.snapshot(), packet = pacoteLider(s.peso, s.estavel)
    for (const client of this.clients) {
      if (client.writableLength > 65536) client.destroy()
      else if (!client.destroyed && client.writable) client.write(packet)
    }
  }
  receber(sample) {
    if (!sample || !['alvo', 'pesoTotal', 'rodasDentro', 'totalRodas'].every(k => Number.isFinite(sample[k]) && sample[k] >= 0)
      || sample.pesoTotal > 120000 || sample.alvo > sample.pesoTotal || sample.rodasDentro > sample.totalRodas || sample.totalRodas > 100 || typeof sample.emMovimento !== 'boolean') throw new Error('Amostra de peso inválida.')
    this.physics.receber(sample)
  }
  configurar(porta) {
    const operation = this.queue.then(async () => {
      if (!Number.isInteger(porta) || porta < 1 || porta > 65535) throw new Error('A porta deve estar entre 1 e 65535.')
      if (porta === this.port && this.server?.listening) return
      await this.parar()
      this.port = porta; this.error = ''
      const server = net.createServer(socket => {
        this.clients.add(socket); socket.setNoDelay(true)
        socket.on('error', () => {})
        socket.on('data', () => {}) // O indicador transmite continuamente; comandos não alteram a carga.
        socket.on('close', () => { this.clients.delete(socket); this.onState(this.snapshot()) })
        const s = this.physics.snapshot(); socket.write(pacoteLider(s.peso, s.estavel))
        this.onState(this.snapshot())
      })
      try {
        await new Promise((resolve, reject) => { server.once('error', reject); server.listen(porta, '127.0.0.1', resolve) })
        server.removeAllListeners('error'); server.on('error', err => { this.error = err.message; this.onState(this.snapshot()) })
        this.server = server
      } catch (error) {
        this.error = error.code === 'EADDRINUSE' ? `A porta ${porta} já está em uso. Feche o outro simulador ou escolha outra porta.` : error.message
      }
      this.onState(this.snapshot())
    })
    this.queue = operation.catch(() => {})
    return operation
  }
  async parar() {
    for (const client of this.clients) client.destroy()
    this.clients.clear()
    const previous = this.server; this.server = null
    if (previous?.listening) await new Promise(resolve => previous.close(resolve))
  }
  async dispose() { clearInterval(this.timer); await this.queue; await this.parar() }
}
