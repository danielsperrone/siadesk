const path = require('node:path')
const fs = require('node:fs')

function registerBalanca({ app, ipcMain, BrowserWindow }) {
  let server, owner, lastState = null
  const observed = new Set()
  const settings = () => path.join(app.getPath('userData'), 'simulador-balanca.json')
  const ready = app.whenReady().then(async () => {
    const { ServidorBalanca } = await import('./server.mjs')
    server = new ServidorBalanca(state => {
      lastState = state
      for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('balanca:state', state)
    })
    let porta = 30005
    try { const saved = JSON.parse(fs.readFileSync(settings(), 'utf8')); if (Number.isInteger(saved.porta) && saved.porta >= 1 && saved.porta <= 65535) porta = saved.porta } catch {}
    await server.configurar(porta)
  })
  ipcMain.handle('balanca:state', async () => { await ready; return lastState })
  ipcMain.handle('balanca:porta', async (_event, porta) => {
    try {
      await ready; await server.configurar(porta)
      fs.writeFileSync(settings(), JSON.stringify({ porta }))
      return { ok: !server.error, error: server.error }
    } catch (error) { return { ok: false, error: error.message } }
  })
  ipcMain.on('balanca:amostra', (event, sample) => {
    if (!server) return
    try {
      server.receber(sample); owner = event.sender.id
      if (!observed.has(owner)) {
        const id = owner; observed.add(id)
        const clear = () => { if (owner === id) { owner = null; server.receber({ alvo: 0, pesoTotal: 0, emMovimento: false, rodasDentro: 0, totalRodas: 0 }) } }
        event.sender.on('render-process-gone', clear)
        event.sender.once('destroyed', () => { clear(); observed.delete(id) })
      }
    } catch { /* Somente amostras válidas entram no indicador. */ }
  })
  app.on('before-quit', () => { void server?.dispose() })
}
module.exports = { registerBalanca }
