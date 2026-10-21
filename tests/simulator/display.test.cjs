const { test } = require('node:test')
const assert = require('node:assert/strict')
const net = require('node:net')
const { once } = require('node:events')
const { SpiderParser, crc16 } = require('../../electron/display/protocol.cjs')
const { Displays } = require('../../electron/display/index.cjs')
// Bytes literais extraídos do OWL, incluindo seus CRCs originais.
const fixtures = require('../fixtures/display-owl.json')
const packets = Object.fromEntries(Object.entries(fixtures).map(([k, v]) => [k, Buffer.from(v, 'hex')]))
const wait = async condition => { for (let i = 0; i < 100; i++) { if (condition()) return; await new Promise(r => setTimeout(r, 10)) } assert.fail('Estado esperado não chegou') }
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)) }) })

test('todos os comandos reais do OWL, fragmentados em cada posição', () => {
  for (const [name, packet] of Object.entries(packets)) for (let cut = 1; cut < packet.length; cut++) {
    const results = []; const parser = new SpiderParser(frame => results.push(frame), () => assert.fail(name))
    parser.push(packet.subarray(0, cut)); assert.equal(results.length, 0)
    parser.push(packet.subarray(cut)); assert.equal(results.length, 1)
    if (name === 'msgPodeSairDaBalanca') assert.equal(results[0].mensagem, 'Pode sair da balança!')
    if (name === 'msgPesagemAcimaDaTolerancia') assert.equal(results[0].mensagem, 'Peso acima da tolerância!')
    if (name === 'ApagaPainel') assert.equal(results[0].modo, 'apagado')
    if (name === 'AtivaRelogio') assert.equal(results[0].modo, 'relogio')
    if (name === 'AtivaData') assert.equal(results[0].modo, 'data')
  }
})
test('pacotes concatenados, ruído e CRC incorreto não alteram a mensagem válida', () => {
  const results = []; let invalid = 0
  const parser = new SpiderParser(f => results.push(f), () => invalid++)
  const broken = Buffer.from(packets.msgConfirmada); broken[25] ^= 1
  parser.push(Buffer.concat([Buffer.from('ruido'), broken, packets.msgPodeSubirDaBalanca, packets.ApagaPainel]))
  assert.equal(invalid, 1); assert.equal(results.length, 2)
  assert.equal(results[0].mensagem, 'Pode subir na balança!'); assert.equal(results[1].mensagem, '')
})
test('Envia do OWL com acentos e comprimento excedendo um byte', () => {
  const header = packets.msgConfirmada.subarray(0, 22)
  const body = Buffer.concat([header, Buffer.from([128,129,130,131,132,133,134,135,136,141,142,143,144,145,146,147,148,149,151]), Buffer.from('A'.repeat(300)), Buffer.from([170,34,1,170,15,1,170,15,1,170,54,3])])
  body[12] = (body.length - 14) & 255
  const crc = Buffer.alloc(2); crc.writeUInt16BE(crc16(body))
  const results = [], parser = new SpiderParser(f => results.push(f))
  for (const byte of Buffer.concat([body, crc])) parser.push(Buffer.from([byte]))
  assert.equal(results.length, 1)
  assert.equal(results[0].mensagem, 'ÇçÀÁÂÃÉÊÍàáâãéêíóôú' + 'A'.repeat(300))
})
test('displays independentes por IP, reconexão, erro de porta e encerramento', async () => {
  const engine = new Displays(), port = await freePort(), sockets = []
  const config = (id, ip) => ({ id, config: { ativo: true, ip, porta: port } })
  const a = config('a', '127.0.0.1'), b = config('b', '127.0.0.2')
  try {
    await engine.configurar([a, b], 'projeto1')
    assert.equal(engine.state().a.running, true); assert.equal(engine.state().b.running, true)
    for (const item of [a, b]) { const s = net.connect(port, item.config.ip); sockets.push(s); await once(s, 'connect') }
    sockets[0].write(packets.msgConfirmada); sockets[1].write(packets.msgPodeSairDaBalanca)
    await wait(() => engine.state().a.recebidos === 1 && engine.state().b.recebidos === 1)
    assert.equal(engine.state().a.mensagem, 'Pesagem confirmada!')
    assert.equal(engine.state().b.mensagem, 'Pode sair da balança!')
    await engine.configurar([a, b], 'projeto1')
    assert.equal(engine.state().a.recebidos, 1, 'Configuração idêntica preserva conexão')
    const closed = once(sockets[0], 'close'); sockets[0].destroy(); await closed
    await wait(() => engine.state().a.clients === 0)
    const reconnect = net.connect(port, a.config.ip); sockets.push(reconnect); await once(reconnect, 'connect')
    reconnect.write(packets.ApagaPainel); await wait(() => engine.state().a.recebidos === 2)
    assert.equal(engine.state().a.mensagem, '')
    await assert.rejects(engine.configurar([a, { ...a, id: 'duplicado' }]), /Dois displays/)
    await assert.rejects(engine.configurar([config('c', '256.0.0.1')]), /Confira/)
    const occupied = new Displays()
    await occupied.configurar([a]); assert.match(occupied.state().a.error, /já está em uso/); await occupied.close()
    await engine.configurar([a, b], 'outro-projeto')
    assert.equal(engine.state().a.recebidos, 0, 'Trocar de projeto limpa mensagens')
    await engine.configurar([a]); assert.equal(engine.state().b, undefined)
    await engine.configurar([]); assert.deepEqual(engine.state(), {})
    await engine.configurar([a]); assert.equal(engine.state().a.running, true, 'Porta liberada e reutilizável')
  } finally { sockets.forEach(s => s.destroy()); await engine.close() }
})
