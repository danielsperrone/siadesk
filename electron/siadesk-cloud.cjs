const { app, ipcMain, safeStorage } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const BASE = 'https://siasgl.siamac.com.br/api/siadesk'

function registerCloud() {
  const sessionPath = () => path.join(app.getPath('userData'), 'siasgl-session.bin')
  function read() {
    try { return JSON.parse(safeStorage.decryptString(fs.readFileSync(sessionPath()))) } catch { return null }
  }
  function write(session) {
    if (!safeStorage.isEncryptionAvailable()) throw new Error('O Windows não disponibilizou armazenamento seguro. Tente iniciar novamente.')
    const target = sessionPath()
    fs.writeFileSync(target + '.tmp', safeStorage.encryptString(JSON.stringify(session)))
    fs.renameSync(target + '.tmp', target)
  }
  async function request(endpoint, method, body, token) {
    try {
      const response = await fetch(BASE + '/' + endpoint, {
        method, headers: { Accept: 'application/json', 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(15000), redirect: 'error',
      })
      const data = response.status === 204 ? null : await response.json().catch(() => ({}))
      return { ok: response.ok, status: response.status, data, error: response.ok ? undefined : data.message || `SIASGL indisponível (${response.status}).` }
    } catch { return { ok: false, status: 0, error: 'Sem conexão com o SIASGL. Seus dados locais foram preservados.' } }
  }
  ipcMain.handle('siasgl:session', () => {
    const session = read()
    return session ? { user: session.user } : null
  })
  ipcMain.handle('siasgl:login', async (_event, credentials) => {
    const result = await request('login', 'POST', credentials)
    if (!result.ok) return result
    try { write(result.data) } catch (error) { return { ok: false, status: 500, error: error.message } }
    return { ok: true, status: 200, data: { user: result.data.user } }
  })
  ipcMain.handle('siasgl:request', async (_event, endpoint, method, body) => {
    if (!((endpoint === 'bootstrap' && method === 'GET') || (endpoint === 'settings' && method === 'PUT') || (/^projects\/[a-f0-9-]{36}$/.test(endpoint) && method === 'PUT'))) {
      return { ok: false, status: 400, error: 'Operação não permitida.' }
    }
    const session = read()
    if (!session) return { ok: false, status: 401, error: 'Entre no SIASGL.' }
    const result = await request(endpoint, method, body, session.token)
    if (result.ok && endpoint === 'bootstrap') write({ ...session, user: result.data.user })
    if (result.status === 401 || (result.status === 403 && endpoint === 'bootstrap')) {
      fs.rmSync(sessionPath(), { force: true })
    }
    return result
  })
  ipcMain.handle('siasgl:logout', async () => {
    const session = read()
    fs.rmSync(sessionPath(), { force: true })
    if (session) await request('logout', 'POST', {}, session.token)
  })
}
module.exports = { registerCloud }
