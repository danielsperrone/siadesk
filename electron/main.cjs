const { app, BrowserWindow, ipcMain, dialog } = require('electron')
const path = require('node:path')
const fs = require('node:fs')
require('./siadesk-cloud.cjs').registerCloud()
require('./simulador/index.cjs').registerSimulator({ app, ipcMain, BrowserWindow })
require('./balanca/index.cjs').registerBalanca({ app, ipcMain, BrowserWindow })
require('./display/index.cjs').registerDisplays({ app, ipcMain, BrowserWindow })
require('./leitores/index.cjs').registerLeitores({ app, ipcMain, BrowserWindow })
require('./cameras/index.cjs').registerCameras({ app, ipcMain })

const DEV_URL = 'http://localhost:5173'
const isDev = !app.isPackaged && process.argv.includes('--dev')
require('./etiquetas.cjs').registrarEtiquetas({ isDev, devUrl: DEV_URL })

function createWindow() {
  const win = new BrowserWindow({
    width: 1480,
    height: 920,
    title: 'SIADESK — Automação de Balança Rodoviária',
    icon: path.join(__dirname, '..', 'dist', 'brand', 'siadesk-icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false, // O CLP e os sensores continuam ativos ao usar o OWL em primeiro plano.
    },
  })

  require('./project-menu.cjs').registerProjectMenu(win)
  if (isDev) {
    win.loadURL(DEV_URL)
  } else {
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

// Exporta a janela atual como PDF (usado pelo gerador de documentação)
ipcMain.handle('export-pdf', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (!win) return { ok: false, error: 'Janela não encontrada' }

  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    title: 'Exportar projeto em PDF',
    defaultPath: 'projeto-balanca.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return { ok: false, error: 'cancelado' }

  const data = await win.webContents.printToPDF({
    pageSize: 'A3',
    landscape: true,
    printBackground: true,
  })
  fs.writeFileSync(filePath, data)
  return { ok: true, filePath }
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
