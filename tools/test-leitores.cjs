const assert = require('node:assert/strict')
const net = require('node:net')
const http = require('node:http')
const { once } = require('node:events')
const { Leitores } = require('../electron/leitores/index.cjs')
const delay = ms => new Promise(r => setTimeout(r, ms))
const config = (porta, modo = 'tcp') => ({ ativo: true, ip: '127.0.0.1', porta, modo })
async function freePort() { const s = net.createServer(); s.listen(0, '127.0.0.1'); await once(s, 'listening'); const p = s.address().port; await new Promise(r => s.close(r)); return p }
async function until(fn) { for (let i = 0; i < 100; i++) { if (fn()) return; await delay(30) } throw Error('Tempo de espera excedido') }
;(async () => {
  const engine = new Leitores(), clients = [], servers = []
  try {
    const rfidPort = await freePort(), httpPort = await freePort()
    const owl = net.createServer(s => { clients.push(s); s.on('data', d => { direct += d }) }); servers.push(owl)
    let direct = '', tags = '', lpr = ''
    owl.listen(0, '127.0.0.1'); await once(owl, 'listening')
    const items = [{ id: 'rfid', tipo: 'leitor-rfid', config: config(rfidPort) }, { id: 'ocr', tipo: 'camera-ocr', config: config(owl.address().port) }, { id: 'http', tipo: 'camera-ocr', config: config(httpPort, 'http') }]
    engine.configurar(items); await until(() => Object.values(engine.state()).every(s => s.running))
    const rfid = net.createConnection(rfidPort, '127.0.0.1'); clients.push(rfid); rfid.on('data', d => { tags += d }); await once(rfid, 'connect')
    const req = http.get(`http://127.0.0.1:${httpPort}/cgi-bin/eventManager.cgi?action=attach`, res => { assert.match(res.headers['content-type'], /myboundary/); res.on('data', d => { lpr += d }) }); clients.push(req)
    await until(() => engine.state().http.clients === 1 && engine.state().rfid.clients === 1)
    engine.detectar([{ id: 'rfid', valores: ['000000000000000000000001', '000000000000000000000100', '000000000000000000000101', 'invalid'] }, { id: 'ocr', valores: ['ABC1D23'] }, { id: 'http', valores: ['XYZ1234'] }]); engine.emitir()
    await until(() => tags.includes('100') && direct.length && lpr.length)
    assert.equal(tags, '000000000000000000000001\r\n000000000000000000000100\r\n')
    assert.equal(direct, '*ABC1D23!\n')
    assert.equal(lpr, '--myboundary\r\nContent-Type: text/plain\r\n\r\nPlateNumber\\":\\"XYZ1234\\"\r\n')
    engine.detectar([]); const count = engine.state().rfid.enviados; engine.emitir(); assert.equal(engine.state().rfid.enviados, count)
    assert.throws(() => engine.configurar([...items, { ...items[0], id: 'duplicate' }]), /Dois servidores/)
    engine.configurar(items.map(i => ({ ...i, config: { ...i.config, ativo: false } }))); assert.deepEqual(engine.state(), {})
    console.log('OK: RFID 1/100, filtro de tags, OCR TCP, HTTP LPR idêntico à referência, saída da área, conflito e desligamento.')
  } finally { engine.close(); for (const c of clients) c.destroy(); for (const s of servers) s.close() }
})().catch(e => { console.error(e); process.exitCode = 1 })
