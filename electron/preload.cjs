const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('leitores', {
  configurar: items => ipcRenderer.invoke('leitores:configurar', items),
  detectar: items => ipcRenderer.send('leitores:detectar', items),
  onState: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('leitores:state', listener); return () => ipcRenderer.removeListener('leitores:state', listener) },
})

contextBridge.exposeInMainWorld('displays', {
  state: () => ipcRenderer.invoke('displays:state'),
  configurar: (items, scope) => ipcRenderer.invoke('displays:configurar', items, scope),
  onState: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('displays:state', listener); return () => ipcRenderer.removeListener('displays:state', listener) },
})
contextBridge.exposeInMainWorld('balanca', {
  state: () => ipcRenderer.invoke('balanca:state'),
  configurar: porta => ipcRenderer.invoke('balanca:porta', porta),
  amostra: sample => ipcRenderer.send('balanca:amostra', sample),
  onState: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('balanca:state', listener); return () => ipcRenderer.removeListener('balanca:state', listener) },
})

contextBridge.exposeInMainWorld('clp', {
  state: () => ipcRenderer.invoke('clp:state'),
  command: command => ipcRenderer.invoke('clp:command', command),
  onState: callback => {
    const listener = (_event, state) => callback(state)
    ipcRenderer.on('clp:state', listener)
    return () => ipcRenderer.removeListener('clp:state', listener)
  },
})

contextBridge.exposeInMainWorld('projectFiles', {
  onCommand: callback => { const listener = (_event, command) => callback(command); ipcRenderer.on('project:command', listener); return () => ipcRenderer.removeListener('project:command', listener) },
  updateState: state => ipcRenderer.send('project:state', state),
  openLocal: () => ipcRenderer.invoke('project:open-local'),
  saveLocal: config => ipcRenderer.invoke('project:save-local', config),
  confirmLeave: () => ipcRenderer.invoke('project:confirm-leave'),
})

contextBridge.exposeInMainWorld('siasgl', {
  session: () => ipcRenderer.invoke('siasgl:session'),
  login: credentials => ipcRenderer.invoke('siasgl:login', credentials),
  request: (endpoint, method, body) => ipcRenderer.invoke('siasgl:request', endpoint, method, body),
  logout: () => ipcRenderer.invoke('siasgl:logout'),
})

contextBridge.exposeInMainWorld('dimensionador', {
  onSalvarEtiquetas: callback => {const listener=(_event,data)=>callback(data);ipcRenderer.on('etiquetas-salvar-pedido',listener);return ()=>ipcRenderer.removeListener('etiquetas-salvar-pedido',listener)},
  responderEtiquetas: (requestId,result)=>ipcRenderer.send('etiquetas-salvar-resposta',{requestId,result}),
  salvarArquivoEtiquetas: config=>ipcRenderer.invoke('etiquetas-salvar-arquivo',config),
  abrirEtiquetas: (project) => ipcRenderer.invoke('abrir-etiquetas', project),
  exportPdf: () => ipcRenderer.invoke('export-pdf'),

})

contextBridge.exposeInMainWorld('cameras', {
  estado: () => ipcRenderer.invoke('cameras:estado'),
  configurar: config => ipcRenderer.invoke('cameras:configurar', config),
  quadro: (sessao, id, pixels) => ipcRenderer.invoke('cameras:quadro', sessao, id, pixels),
  onEstado: callback => { const listener = (_event, state) => callback(state); ipcRenderer.on('cameras:estado', listener); return () => ipcRenderer.removeListener('cameras:estado', listener) },
})
