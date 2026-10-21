const assert = require('node:assert/strict')
const { test } = require('node:test')
const { EventEmitter } = require('node:events')
const { CameraServer, normalize, streamPath, serverConfig } = require('../electron/cameras/server.cjs')

const config = { ativa: true, porta: 8554, largura: 640, fps: 2, cameras: ['normal', 'baixo', 'ocr'].map(id => ({ id, nome: id })) }
test('Endereços persistentes e distintos, inclusive IDs que viram o mesmo slug', () => {
  assert.equal(streamPath('normal'), streamPath('normal'))
  assert.notEqual(streamPath('câmera/1'), streamPath('camera-1'))
  assert.match(streamPath('../../a\n'), /^camera\/[a-zA-Z0-9_-]+$/)
})
test('O orçamento de pixels limita o trabalho para muitas câmeras e maior resolução', () => {
  assert.equal(normalize(config).fps, 2)
  for (const largura of [640, 960, 1920, 2688]) for (const quantidade of [1, 6, 12, 32]) {
    const c = normalize({ ...config, largura, fps: 5, cameras: Array.from({ length: quantidade }, (_, i) => ({ id: String(i) })) })
    assert.ok(c.fps * quantidade * c.largura * c.altura <= 12 * 640 * 360)
    assert.ok(c.fps > 0)
  }
  assert.throws(() => normalize({ ...config, cameras: [{ id: 'a' }, { id: 'a' }] }), /únicos/)
  assert.throws(() => normalize({ ...config, porta: 0 }), /porta/)
  assert.equal(normalize({ ...config, largura: 2688 }).altura, 1520)
  assert.throws(() => normalize({ ...config, largura: 2048 }), /Qualidade/)
  assert.equal(normalize({ ativa: false }), null)
})
test('A configuração só abre RTSP/TCP e permite publicar apenas localmente', () => {
  const c = normalize(config), yaml = serverConfig(c.porta, c.cameras)
  assert.match(yaml, /rtspTransports: \[tcp\]/)
  assert.match(yaml, /ips: \[127.0.0.1, '::1'\]/)
  for (const protocol of ['hls', 'rtmp', 'webrtc', 'srt', 'moq', 'api']) assert.ok(yaml.includes(`${protocol}: false`))
})
test('Rejeita quadros inválidos, sessões antigas e filas concorrentes', async () => {
  const m = new CameraServer({})
  m.state = { ...m.state, fase: 'executando', largura: 2, altura: 2, fps: 2 }; m.generation = 7
  let callback
  const stdin = { writable: true, destroyed: false, write: (_buffer, cb) => { callback = cb } }
  const entry = { child: { stdin }, busy: false, receivedAt: -10000 }
  m.encoders.set('normal', entry)
  assert.equal(await m.frame(6, 'normal', new Uint8Array(16)), false)
  assert.equal(await m.frame(7, 'normal', new Uint8Array(15)), false)
  assert.equal(await m.frame(7, 'ausente', new Uint8Array(16)), false)
  const sending = m.frame(7, 'normal', new Uint8Array(16))
  assert.equal(entry.busy, true)
  assert.equal(await m.frame(7, 'normal', new Uint8Array(16)), false)
  callback()
  assert.equal(await sending, true)
  assert.equal(entry.busy, false)
})
test('Desligamentos rápidos encerram processos e invalidam sessões anteriores', async () => {
  const m = new CameraServer({}), child = new EventEmitter()
  child.exitCode = null; child.signalCode = null
  child.kill = () => { child.exitCode = 0; queueMicrotask(() => child.emit('close', 0)) }
  child.stdin = { destroy() {} }
  m.encoders.set('normal', { child })
  await Promise.all([m.stop(), m.stop(), m.stop()])
  assert.equal(m.state.fase, 'desligado'); assert.equal(m.encoders.size, 0); assert.equal(child.exitCode, 0)
})
