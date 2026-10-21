const net = require('node:net')
const { SpiderParser } = require('./protocol.cjs')

class Displays {
  constructor(onState = () => {}) { this.items = new Map(); this.onState = onState; this.queue = Promise.resolve(); this.scope = ''; this.closed = false }
  state() { return Object.fromEntries([...this.items].map(([id, e]) => [id, { ...e.state, running: !!e.server.listening, clients: e.clients.size }])) }
  emit() { this.onState(this.state()) }
  configurar(items, scope = '') {
    const operation = this.queue.then(async () => {
      if (this.closed) return
      if (!Array.isArray(items) || items.length > 100 || typeof scope !== 'string') throw new Error('Lista de displays inválida.')
      const ids = new Set(), endpoints = new Set()
      for (const item of items) {
        const c = item?.config
        if (typeof item?.id !== 'string' || !item.id || ids.has(item.id) || !c || typeof c.ativo !== 'boolean' || net.isIP(c.ip) !== 4 || c.ip === '0.0.0.0' || !Number.isInteger(c.porta) || c.porta < 1 || c.porta > 65535) throw new Error('Confira o IP local e a porta (1 a 65535) de cada display.')
        ids.add(item.id)
        const endpoint = `${c.ip}:${c.porta}`
        if (c.ativo && endpoints.has(endpoint)) throw new Error(`Dois displays usam ${endpoint}. Escolha IPs ou portas diferentes.`)
        if (c.ativo) endpoints.add(endpoint)
      }
      for (const [id, e] of this.items) {
        if (scope !== this.scope || !items.some(i => i.id === id && i.config.ativo && i.config.ip === e.state.ip && i.config.porta === e.state.porta) || !e.server.listening) await this.remover(id)
      }
      this.scope = scope
      for (const item of items) if (item.config.ativo && !this.items.has(item.id)) await this.iniciar(item)
      this.emit()
    })
    this.queue = operation.catch(() => {})
    return operation
  }
  async iniciar({ id, config }) {
    const e = { clients: new Set(), state: { ip: config.ip, porta: config.porta, mensagem: '', modo: 'apagado', efeitos: [], recebidos: 0, invalidos: 0, error: '', atualizadoEm: null } }
    e.server = net.createServer(socket => {
      e.clients.add(socket); socket.setNoDelay(true)
      const parser = new SpiderParser(frame => { Object.assign(e.state, frame, { recebidos: e.state.recebidos + 1, atualizadoEm: new Date().toISOString() }); this.emit() }, () => { e.state.invalidos++; this.emit() })
      socket.on('data', data => parser.push(data))
      socket.on('error', () => {})
      socket.on('close', () => { e.clients.delete(socket); this.emit() })
      this.emit()
    })
    e.server.maxConnections = 16
    this.items.set(id, e)
    e.server.on('error', error => {
      e.state.error = error.code === 'EADDRINUSE' ? `O endereço ${config.ip}:${config.porta} já está em uso. Altere o IP ou a porta.`
        : error.code === 'EADDRNOTAVAIL' ? `O IP ${config.ip} não está disponível neste computador. Use um IP local ou 127.0.0.1.` : error.message
      this.emit()
    })
    await new Promise(resolve => { e.server.once('error', resolve); e.server.listen(config.porta, config.ip, () => { e.server.removeListener('error', resolve); resolve() }) })
  }
  async remover(id) {
    const e = this.items.get(id); this.items.delete(id)
    for (const socket of e.clients) socket.destroy()
    if (e.server.listening) await new Promise(resolve => e.server.close(resolve))
  }
  async close() { this.closed = true; await this.queue; for (const id of this.items.keys()) await this.remover(id); this.emit() }
}
function registerDisplays({ app, ipcMain, BrowserWindow }) {
  const engine = new Displays(state => { for (const win of BrowserWindow.getAllWindows()) if (!win.isDestroyed()) win.webContents.send('displays:state', state) })
  let owner
  const observed = new Set()
  ipcMain.handle('displays:state', () => engine.state())
  ipcMain.handle('displays:configurar', async (event, items, scope) => {
    owner = event.sender.id
    if (!observed.has(owner)) {
      const id = owner; observed.add(id)
      const clear = () => { if (owner === id) { owner = null; void engine.configurar([]) } }
      event.sender.on('render-process-gone', clear)
      event.sender.once('destroyed', () => { clear(); observed.delete(id) })
    }
    try { await engine.configurar(items, scope); return { ok: true } } catch (error) {
      await engine.configurar([])
      return { ok: false, error: error.message }
    }
  })
  app.on('before-quit', () => { void engine.close() })
}
module.exports = { Displays, registerDisplays }
