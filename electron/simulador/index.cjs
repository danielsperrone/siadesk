const { Worker } = require('node:worker_threads')
const path = require('node:path')
const fs = require('node:fs')
const { PLC } = require('./core.cjs')

function registerSimulator({ app, ipcMain, BrowserWindow }) {
  let worker, state = null, nextId = 0, stopping = false
  const pending = new Map()
  const observed = new Set()
  let sensorOwner = null
  const settingsFile = () => path.join(app.getPath('userData'), 'simulador-clp.json')
  function broadcast() {
    for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('clp:state', state)
  }
  function fail(error) {
    state = { ...new PLC().snapshot(),
      ports: { modbus: 502, owl: 30055 }, logs: [], sensorMode: { A: 'auto', B: 'auto' },
      ...state, running: false, errors: [error], listening: { modbus: false, owl: false } }
    for (const { resolve, timer } of pending.values()) { clearTimeout(timer); resolve({ ok: false, error }) }
    pending.clear(); broadcast()
  }
  function start() {
    let ports
    try { const data = JSON.parse(fs.readFileSync(settingsFile(), 'utf8')); if ([data.modbus, data.owl].every(p => Number.isInteger(p) && p >= 1 && p <= 65535) && data.modbus !== data.owl) ports = data } catch {}
    worker = new Worker(path.join(__dirname, 'worker.cjs'), { workerData: ports })
    worker.on('message', message => {
      if (message.type === 'state') { state = message.state; broadcast() }
      else if (message.type === 'reply') {
        const request = pending.get(message.id)
        if (request) { clearTimeout(request.timer); pending.delete(message.id); request.resolve(message.result) }
      }
    })
    worker.on('error', err => fail(`Falha no simulador: ${err.message}`))
    worker.on('exit', code => { worker = null; if (!stopping) fail(`Simulador encerrado (${code}). Reabra o SIADESK.`) })
  }
  function send(command) {
    if (!worker) return Promise.resolve({ ok: false, error: 'Simulador indisponível. Reabra o SIADESK.' })
    return new Promise(resolve => {
      const id = ++nextId
      const timer = setTimeout(() => { pending.delete(id); resolve({ ok: false, error: 'O simulador não respondeu.' }) }, 5000)
      pending.set(id, { resolve, timer }); worker.postMessage({ id, command })
    })
  }
  ipcMain.handle('clp:state', () => state)
  ipcMain.handle('clp:command', async (event, command) => {
    if (command?.type === 'sensors') {
      const id = event.sender.id
      sensorOwner = id
      if (!observed.has(id)) {
        observed.add(id)
        const release = () => { if (sensorOwner === id) { sensorOwner = null; void send({ type: 'sensors', A: false, B: false }) } }
        event.sender.on('render-process-gone', release)
        event.sender.once('destroyed', () => { release(); observed.delete(id) })
      }
    }
    const result = await send(command)
    if (result.ok && command.type === 'start' && command.ports) {
      try { fs.writeFileSync(settingsFile(), JSON.stringify(command.ports)) }
      catch { return { ok: false, error: 'Simulador iniciado, mas não foi possível salvar as portas.' } }
    }
    return result
  })
  app.whenReady().then(start)
  app.on('before-quit', () => { stopping = true; worker?.terminate() })
}
module.exports = { registerSimulator }
