const { BrowserWindow, ipcMain, dialog, session } = require('electron')
const path = require('node:path')
const { pathToFileURL } = require('node:url')

function validarProjeto(project) {
  if (project?.version !== 1 || !Array.isArray(project.equipamentos) || project.equipamentos.length > 500) throw new Error('Lista de equipamentos inválida.')
  const texto = (value, max) => { if (typeof value !== 'string' || value.length > max) throw new Error('Dados do projeto inválidos.'); return value }
  return { key:texto(project.key||'',100), version: 1, nome: texto(project.nome, 300), cliente: texto(project.cliente, 300), codigo: texto(project.codigo, 100),
    equipamentos: project.equipamentos.map(e => ({ id: texto(e.id, 200), nome: texto(e.nome, 300), tipo: texto(e.tipo, 100), saved:e.saved })) }
}

function registrarEtiquetas({ isDev, devUrl }) {
  const projetos = new Map()
  const owners = new Map(), pending = new Map()
  const appUrl = isDev ? `${devUrl}/` : pathToFileURL(path.join(__dirname, '..', 'dist', 'index.html')).href
  const labelUrl = isDev ? `${devUrl}/etiquetas/index.html` : pathToFileURL(path.join(__dirname, '..', 'dist', 'etiquetas', 'index.html')).href
  const propriaPagina = (url, base) => typeof url === 'string' && url.split(/[?#]/)[0] === base
  let ses
  function sessaoEtiquetas() {
    if (ses) return ses
    // Modelos e medida do rolo persistem; os dados do projeto ficam somente em memória.
    ses = session.fromPartition('persist:siadesk-etiquetas')
    const autorizado = contents => contents && !contents.isDestroyed() && projetos.has(contents.id) && propriaPagina(contents.getURL(), labelUrl)
    ses.setPermissionCheckHandler((contents, permission) => autorizado(contents) && ['serial', 'bluetooth'].includes(permission))
    ses.setPermissionRequestHandler((contents, permission, callback) => callback(autorizado(contents) && ['serial', 'bluetooth'].includes(permission)))
    ses.setDevicePermissionHandler(() => false)
    ses.on('select-serial-port', async (e, ports, contents, callback) => {
      e.preventDefault()
      if (!autorizado(contents)) return callback('')
      const win = BrowserWindow.fromWebContents(contents)
      if (!ports.length) { callback(''); dialog.showMessageBox(win, { message: 'Nenhuma porta disponível. Pareie a B1 no Bluetooth do Windows e tente novamente.' }); return }
      try {
        const result = await dialog.showMessageBox(win, { title: 'Conectar impressora B1', message: 'Selecione a porta da sua B1', detail: 'Escolha a porta Bluetooth de saída da impressora (por exemplo, COM4).', buttons: ['Cancelar', ...ports.map(p => `${p.portName} — ${p.displayName || 'Porta serial'}`)], defaultId: 0, cancelId: 0, noLink: true })
        callback(ports[result.response - 1]?.portId || '')
      } catch { callback('') }
    })
    return ses
  }
  ipcMain.handle('etiquetas-salvar-dados', (event,data)=>{
    const project=projetos.get(event.sender.id),owner=owners.get(event.sender.id)
    if(!project||!owner||owner.isDestroyed()||!propriaPagina(event.senderFrame?.url,labelUrl))return {ok:false,error:'Reabra as etiquetas pelo projeto.'}
    if(!data||JSON.stringify(data).length>500000)return {ok:false,error:'Dados de etiquetas inválidos.'}
    const requestId=require('node:crypto').randomUUID()
    return new Promise(resolve=>{const timer=setTimeout(()=>{pending.delete(requestId);resolve({ok:false,error:'Tempo de salvamento esgotado.'})},600000);pending.set(requestId,{owner,resolve,timer});owner.send('etiquetas-salvar-pedido',{requestId,key:project.key,data})})
  })
  ipcMain.on('etiquetas-salvar-resposta',(event,{requestId,result})=>{
    const request=pending.get(requestId);if(!request||request.owner!==event.sender)return
    clearTimeout(request.timer);pending.delete(requestId);request.resolve(result)
  })
  ipcMain.handle('etiquetas-salvar-arquivo',async(event,config)=>{
    if(!propriaPagina(event.senderFrame?.url,appUrl))return {ok:false,error:'Origem inválida.'}
    try{
      const fs=require('node:fs/promises'),safe=value=>String(value||'projeto').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').slice(0,100)
      const {canceled,filePath}=await dialog.showSaveDialog(BrowserWindow.fromWebContents(event.sender),{title:'Salvar projeto com etiquetas',defaultPath:safe(config.nomeProjeto)+'.json',filters:[{name:'Projeto SIADESK',extensions:['json']}]})
      if(canceled||!filePath)return {ok:false,error:'Salvamento cancelado. Os dados continuam na tela.'}
      const json=JSON.stringify(config,null,2),history=path.join(path.dirname(filePath),'Jsons alterados')
      await fs.mkdir(history,{recursive:true})
      const stamp=new Date().toISOString().replace(/[:.]/g,'-')
      await fs.writeFile(path.join(history,stamp+'_'+safe(config.cliente)+'.json'),json,'utf8')
      await fs.writeFile(filePath,json,'utf8');return {ok:true}
    }catch(error){return {ok:false,error:error.message}}
  })
  ipcMain.handle('etiquetas-obter-projeto', event => {
    if (!propriaPagina(event.senderFrame?.url, labelUrl)) throw new Error('Origem inválida.')
    return projetos.get(event.sender.id) || null
  })
  ipcMain.handle('abrir-etiquetas', async (event, input) => {
    if (!propriaPagina(event.senderFrame?.url, appUrl)) return { ok: false, error: 'Origem inválida.' }
    let project
    try { project = validarProjeto(input) } catch(error) { return { ok: false, error: error.message } }
    const parent = BrowserWindow.fromWebContents(event.sender)
    const win = new BrowserWindow({ parent, width: 1420, height: 960, title: `SIADESK — Etiquetas — ${project.nome}`,
      webPreferences: { preload: path.join(__dirname, 'etiquetas-preload.cjs'), session: sessaoEtiquetas(), contextIsolation: true, nodeIntegration: false, sandbox: true } })
    projetos.set(win.webContents.id, project)
    owners.set(win.webContents.id,event.sender)
    const id = win.webContents.id
    let selecionandoBluetooth = false, buscaTimer
    win.webContents.on('select-bluetooth-device', async (e, devices, callback) => {
      e.preventDefault()
      if (selecionandoBluetooth) return
      const list = devices.filter(d => d.deviceName.startsWith('B1'))
      if (!list.length) {
        if (!buscaTimer) buscaTimer = setTimeout(() => { buscaTimer = null; callback('') }, 20000)
        return
      }
      clearTimeout(buscaTimer); buscaTimer = null
      selecionandoBluetooth = true
      try { const result = await dialog.showMessageBox(win, { title: 'Conectar B1 por Bluetooth LE', message: 'Selecione sua impressora', buttons: ['Cancelar', ...list.map(d => d.deviceName)], cancelId: 0, defaultId: 0, noLink: true }); callback(list[result.response - 1]?.deviceId || '') }
      catch { callback('') }
      finally { selecionandoBluetooth = false }
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))
    win.webContents.on('will-navigate', (e, url) => { if (!propriaPagina(url, labelUrl)) e.preventDefault() })
    win.on('closed', () => { clearTimeout(buscaTimer); projetos.delete(id);owners.delete(id) })
    try { await win.loadURL(labelUrl); return { ok: true } }
    catch(error) { win.close(); return { ok: false, error: error.message } }
  })
}
module.exports = { registrarEtiquetas, validarProjeto }
