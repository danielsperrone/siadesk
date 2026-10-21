const { test } = require('node:test')
const assert = require('node:assert/strict')
const { Worker } = require('node:worker_threads')
const net = require('node:net')
const path = require('node:path')

async function port() { const s = net.createServer(); await new Promise(r => s.listen(0, '127.0.0.1', r)); const p = s.address().port; await new Promise(r => s.close(r)); return p }
async function start(ports) {
  const worker = new Worker(path.resolve('electron/simulador/worker.cjs'), { workerData: ports })
  let state, id = 0
  worker.on('message', m => { if (m.type === 'state') state = m.state })
  function wait(predicate) {
    return new Promise((resolve, reject) => {
      if (state && predicate(state)) return resolve(state)
      const timer = setTimeout(() => { worker.off('message', receive); reject(new Error('Estado não alcançado')) }, 4000)
      function receive(m) { if (m.type === 'state' && predicate(m.state)) { clearTimeout(timer); worker.off('message', receive); resolve(m.state) } }
      worker.on('message', receive)
    })
  }
  function command(command) {
    return new Promise(resolve => {
      const requestId = ++id
      function receive(m) { if (m.type === 'reply' && m.id === requestId) { worker.off('message', receive); resolve(m.result) } }
      worker.on('message', receive); worker.postMessage({ id: requestId, command })
    })
  }
  await wait(s => s.running)
  return { worker, wait, command }
}
test('worker inicia sozinho, sinaliza porta ocupada e reinicia sem deixar sockets', async () => {
  const occupied = net.createServer()
  await new Promise(r => occupied.listen(0, '127.0.0.1', r))
  const ports = { modbus: occupied.address().port, owl: await port() }
  const sim = await start(ports)
  try {
    const initial = await sim.wait(s => s.errors.length > 0)
    assert.equal(initial.listening.modbus, false); assert.equal(initial.listening.owl, true)
    assert.match(initial.errors[0], /já está em uso/)
    assert.equal((await sim.command({ type: 'start', ports: { modbus: 0, owl: 5 } })).ok, false)
    await new Promise(r => occupied.close(r))
    assert.equal((await sim.command({ type: 'start', ports })).ok, true)
    await sim.wait(s => s.listening.modbus && s.errors.length === 0)
    await sim.command({ type: 'sensors', A: true, B: false })
    await sim.wait(s => s.sensors.A && !s.sensors.B && !s.inputs['%I0.0'])
    await sim.command({ type: 'sensor-mode', channel: 'A', mode: 'livre' })
    await sim.wait(s => !s.sensors.A)
    await sim.command({ type: 'sensor-mode', channel: 'B', mode: 'ocupado' })
    await sim.wait(s => s.sensors.B)
    await sim.command({ type: 'sensor-mode', channel: 'B', mode: 'auto' })
    await sim.wait(s => !s.sensors.B)
    await sim.command({ type: 'sensor-mode', channel: 'A', mode: 'auto' })
    await sim.command({ type: 'sensors', A: true, B: false })
    await sim.wait(s => s.sensors.A)
    // Atrasos de renderização não podem apagar um caminhão que continua parado no sensor.
    await new Promise(resolve => setTimeout(resolve, 1800))
    await sim.wait(s => s.sensors.A)
    await sim.command({ type: 'sensors', A: false, B: false })
    await sim.wait(s => !s.sensors.A)
    const client = net.connect(ports.modbus, '127.0.0.1')
    await new Promise((resolve, reject) => { client.once('connect', resolve); client.once('error', reject) })
    try {
      await sim.wait(s => s.clients.modbus === 1)
      assert.equal((await sim.command({ type: 'configure', settings: {
        portas: ports, modosSensores: { A: 'ocupado', B: 'livre' },
        semaforos: { 'entrada-a': true, 'saida-b': true }, entradas: { '2': false, '12': true },
      } })).ok, true)
      const configured = await sim.wait(s => s.sensors.A && s.memory[6] && s.memory[9] && s.inputs['%I0.12'])
      assert.equal(configured.inputs['%I0.2'], false)
      assert.equal(configured.clients.modbus, 1, 'Aplicar preferências não deve derrubar conexões')
      await sim.command({ type: 'configure', settings: { portas: ports } })
      await sim.wait(s => !s.sensors.A && !s.memory[6] && s.inputs['%I0.2'] && !s.inputs['%I0.12'])
    } finally { client.destroy() }
    await sim.command({ type: 'stop' }); await sim.wait(s => !s.running && !s.listening.modbus)
  } finally { await sim.worker.terminate(); if (occupied.listening) await new Promise(r => occupied.close(r)) }
})
