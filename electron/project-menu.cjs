const { Menu, ipcMain, dialog } = require('electron')
const fs = require('node:fs/promises')

function registerProjectMenu(win) {
  let presenting = false
  let wasFullScreen = false
  const command = name => { if (!win.isDestroyed()) { win.focus(); win.webContents.send('project:command', name) } }
  const item = (id, label, accelerator) => ({ id, label, accelerator, enabled: false, click: () => command(id) })
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'Arquivo', submenu: [
      item('new', 'Novo projeto…', 'CmdOrCtrl+N'),
      item('open', 'Abrir projeto…', 'CmdOrCtrl+O'),
      item('save', 'Salvar projeto…', 'CmdOrCtrl+S'),
      { type: 'separator' }, item('close', 'Fechar projeto', 'CmdOrCtrl+W'),
      { type: 'separator' }, { role: 'quit', label: 'Sair do SIADESK' },
    ] },
    { label: 'Editar', submenu: [
      { role: 'undo', label: 'Desfazer' }, { role: 'redo', label: 'Refazer' }, { type: 'separator' },
      { role: 'cut', label: 'Recortar' }, { role: 'copy', label: 'Copiar' }, { role: 'paste', label: 'Colar' }, { role: 'selectAll', label: 'Selecionar tudo' },
    ] },
    { label: 'Exibir', submenu: [
      { id: 'hotkeys', label: 'Mostrar hotkeys', click: () => dialog.showMessageBox(win, {
        type: 'info', title: 'Hotkeys do SIADESK', message: 'Atalhos de teclado',
        detail: [
          'CAMINHÃO',
          '← / → — Mover para a esquerda / direita',
          'V — Inverter a frente e o fundo',
          'R — Reposicionar além dos postes de saída',
          'No modo de apresentação, R e V reposicionam e alternam o peso: vazio (16.700 ± 600 kg) / carregado (51.000 a 57.000 kg). V também inverte o veículo.',
          'Esc — Sair do modo de apresentação',
          '',
          'CANCELAS',
          'Q / A — Abrir / fechar a cancela de entrada',
          'W / S — Abrir / fechar a cancela de saída',
          '',
          'PROJETOS',
          'Ctrl + N — Novo projeto',
          'Ctrl + O — Abrir projeto',
          'Ctrl + S — Salvar projeto',
          'Ctrl + W — Fechar projeto',
          '',
          'EXIBIÇÃO E EDIÇÃO',
          'Ctrl + + / Ctrl + − — Ampliar / reduzir',
          'Ctrl + 0 — Tamanho original',
          'F11 — Entrar / sair da tela cheia',
          'Ctrl + Z / Ctrl + Y — Desfazer / refazer',
          'Ctrl + X / C / V — Recortar / copiar / colar',
          'Ctrl + A — Selecionar tudo',
          'Esc — Fechar popups',
          '',
          'Os atalhos do caminhão e das cancelas funcionam na cena, fora de campos de texto, popups e da aba de calibração. As cancelas precisam estar presentes no projeto.',
        ].join('\n'),
        buttons: ['Fechar'], defaultId: 0, cancelId: 0, noLink: true,
      }) },
      { type: 'separator' },
      { role: 'resetZoom', label: 'Tamanho original' }, { role: 'zoomIn', label: 'Ampliar' },
      { role: 'zoomOut', label: 'Reduzir' }, { role: 'togglefullscreen', label: 'Tela cheia' },
    ] },
    { label: 'Conta', submenu: [
      { id: 'identity', label: 'Entre com sua conta SIASGL', enabled: false },
      item('sync', 'Sincronização…'),
      { type: 'separator' }, item('standards', 'Usar projeto atual como padrão'),
      item('reload-standards', 'Recarregar padrões da nuvem'),
      { type: 'separator' }, item('logout', 'Sair da conta'),
    ] },
  ]))
  const trusted = event => event.sender === win.webContents && event.senderFrame === event.sender.mainFrame
  ipcMain.on('project:state', (event, state) => {
    if (!trusted(event)) return
    const presentation = !!state.authenticated && !!state.active && !!state.presentation
    if (presentation !== presenting) {
      presenting = presentation
      if (presentation) {
        wasFullScreen = win.isFullScreen()
        win.setMenu(null)
        win.setFullScreen(true)
      } else {
        win.setFullScreen(wasFullScreen)
        win.setMenu(Menu.getApplicationMenu())
        win.setMenuBarVisibility(true)
      }
    }
    const menu = Menu.getApplicationMenu()
    for (const id of ['new', 'open', 'sync', 'logout']) menu.getMenuItemById(id).enabled = !!state.authenticated
    for (const id of ['save', 'close']) menu.getMenuItemById(id).enabled = !!state.authenticated && !!state.active
    menu.getMenuItemById('standards').enabled = !!state.authenticated && !!state.admin && !!state.active
    menu.getMenuItemById('reload-standards').enabled = !!state.authenticated && !!state.admin
    menu.getMenuItemById('identity').label = state.authenticated ? String(state.name).slice(0, 120) : 'Entre com sua conta SIASGL'
  })
  ipcMain.handle('project:open-local', async event => {
    if (!trusted(event)) return { ok: false, error: 'Janela inválida.' }
    const result = await dialog.showOpenDialog(win, { title: 'Abrir projeto local', properties: ['openFile'], filters: [{ name: 'Projeto SIADESK', extensions: ['json'] }] })
    if (result.canceled) return { ok: false, canceled: true }
    try {
      const file = result.filePaths[0]
      if ((await fs.stat(file)).size > 10_000_000) throw new Error('O arquivo ultrapassa 10 MB.')
      const config = JSON.parse(await fs.readFile(file, 'utf8'))
      if (typeof config.nomeProjeto !== 'string' || typeof config.cliente !== 'string' || typeof config.codigoProposta !== 'string') throw new Error('Selecione um projeto SIADESK válido.')
      return { ok: true, config }
    } catch (error) { return { ok: false, error: error.message } }
  })
  ipcMain.handle('project:save-local', async (event, config) => {
    if (!trusted(event)) return { ok: false, error: 'Janela inválida.' }
    const result = await dialog.showSaveDialog(win, { title: 'Salvar projeto local', defaultPath: `${String(config.nomeProjeto || 'projeto').replace(/[<>:"/\\|?*]/g, '_')}.json`, filters: [{ name: 'Projeto SIADESK', extensions: ['json'] }] })
    if (result.canceled || !result.filePath) return { ok: false, canceled: true }
    try { await fs.writeFile(result.filePath, JSON.stringify(config, null, 2), 'utf8'); return { ok: true } }
    catch (error) { return { ok: false, error: error.message } }
  })
  ipcMain.handle('project:confirm-leave', async event => {
    if (!trusted(event)) return 'cancel'
    const { response } = await dialog.showMessageBox(win, { type: 'question', title: 'Alterações no projeto', message: 'Deseja salvar o projeto antes de continuar?', buttons: ['Salvar', 'Continuar sem salvar', 'Cancelar'], defaultId: 0, cancelId: 2 })
    return ['save', 'discard', 'cancel'][response]
  })
}
module.exports = { registerProjectMenu }
