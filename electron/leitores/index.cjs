const net = require('node:net')
const http = require('node:http')

class Leitores {
  constructor() { this.items = new Map(); this.timer = setInterval(() => this.emitir(), 1000); this.timer.unref() }
  configurar(items) {
    if (!Array.isArray(items) || items.length > 100) throw new Error('Lista de leitores inválida.')
    const ids = new Set(), endpoints = new Set()
    for (const item of items) {
      const c = item.config
      if (!item.id || ids.has(item.id) || !['leitor-rfid', 'camera-ocr'].includes(item.tipo) || !c || !net.isIP(c.ip) || !Number.isInteger(c.porta) || c.porta < 1 || c.porta > 65535 || !['tcp', 'http'].includes(c.modo)) throw new Error('Confira IP e porta de cada leitor.')
      ids.add(item.id)
      if (c.ativo && (item.tipo === 'leitor-rfid' || c.modo === 'http')) {
        const key = `${c.ip}:${c.porta}`
        if (endpoints.has(key)) throw new Error(`Dois servidores usam ${key}. Escolha portas diferentes.`)
        endpoints.add(key)
      }
    }
    for (const [id, entry] of this.items) if (!items.some(i => i.id === id && this.chave(i) === entry.key && i.config.ativo)) this.remover(id)
    for (const item of items) if (item.config.ativo && !this.items.has(item.id)) this.iniciar(item)
  }
  chave(i) { return JSON.stringify([i.tipo, i.config.ip, i.config.porta, i.config.modo]) }
  iniciar(item) {
    const c = item.config, entry = { item, key: this.chave(item), clients: new Set(), values: [], seen: 0, state: { running: false, clients: 0, enviados: 0 } }
    this.items.set(item.id, entry)
    const connected = socket => {
      entry.clients.add(socket); socket.on('error', e => { entry.state.error = e.message; socket.destroy() })
      socket.on('close', () => entry.clients.delete(socket)); socket.on('data', () => {})
    }
    if (item.tipo === 'camera-ocr' && c.modo === 'tcp') {
      const connect = () => {
        if (this.items.get(item.id) !== entry) return
        const socket = net.createConnection({ host: c.ip, port: c.porta })
        entry.socket = socket
        socket.setTimeout(5000, () => { if (!entry.state.running) socket.destroy() })
        socket.on('connect', () => { entry.state.running = true; entry.state.error = undefined; connected(socket) })
        socket.on('error', e => { entry.state.error = e.message })
        socket.on('close', () => { entry.state.running = false; if (this.items.get(item.id) === entry) entry.retry = setTimeout(connect, 2000) })
      }
      connect()
    } else {
      entry.server = item.tipo === 'camera-ocr' ? http.createServer((req, res) => {
        if (req.method !== 'GET') { res.writeHead(405); res.end(); return }
        res.writeHead(200, { 'Content-Type': 'multipart/x-mixed-replace; boundary=myboundary', Connection: 'keep-alive' }); res.flushHeaders()
        entry.clients.add(res); res.on('close', () => entry.clients.delete(res)); res.on('error', () => res.destroy())
      }) : net.createServer(connected)
      entry.server.on('error', e => { entry.state.running = false; entry.state.error = e.message })
      entry.server.listen(c.porta, c.ip, () => { entry.state.running = true; entry.state.error = undefined })
    }
  }
  detectar(items) {
    if (!Array.isArray(items)) return
    for (const entry of this.items.values()) { entry.values = []; entry.seen = Date.now() }
    for (const item of items) {
      const entry = this.items.get(item.id)
      if (!entry || !Array.isArray(item.valores)) continue
      entry.values = [...new Set(item.valores)].filter(v => typeof v === 'string' && (entry.item.tipo === 'leitor-rfid' ? /^\d{24}$/.test(v) && Number(v) >= 1 && Number(v) <= 100 : /^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(v))).slice(0, 100)
    }
  }
  emitir() {
    for (const e of this.items.values()) {
      if (Date.now() - e.seen > 1500) continue
      for (const value of e.values) for (const client of e.clients) {
        if (client.destroyed || client.writableLength > 65536) { client.destroy(); continue }
        const payload = e.item.tipo === 'leitor-rfid' ? `${value}\r\n` : e.item.config.modo === 'tcp' ? `*${value}!\n` : `--myboundary\r\nContent-Type: text/plain\r\n\r\nPlateNumber\\":\\"${value}\\"\r\n`
        client.write(payload); e.state.ultimo = value; e.state.enviados++
      }
    }
  }
  state() { return Object.fromEntries([...this.items].map(([id, e]) => [id, { ...e.state, clients: e.clients.size }])) }
  remover(id) { const e = this.items.get(id); this.items.delete(id); clearTimeout(e.retry); e.socket?.destroy(); for (const c of e.clients) c.destroy(); e.server?.close() }
  close() { clearInterval(this.timer); for (const id of this.items.keys()) this.remover(id) }
}
function registerLeitores({ app, ipcMain, BrowserWindow }) {
  const engine = new Leitores()
  let owner
  ipcMain.handle('leitores:configurar', (event, items) => { owner = event.sender.id; try { engine.configurar(items); return { ok: true } } catch (e) { engine.configurar([]); return { ok: false, error: e.message } } })
  ipcMain.on('leitores:detectar', (_event, items) => engine.detectar(items))
  const timer = setInterval(() => { for (const win of BrowserWindow.getAllWindows()) win.webContents.send('leitores:state', engine.state()) }, 500)
  app.on('before-quit', () => { clearInterval(timer); engine.close() })
  app.on('web-contents-created', (_event, contents) => { const id = contents.id; const stop = () => { if (owner === id) engine.configurar([]) }; contents.on('destroyed', stop); contents.on('render-process-gone', stop) })
}
module.exports = { Leitores, registerLeitores }
