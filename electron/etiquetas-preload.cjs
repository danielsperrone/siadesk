const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('siadeskEtiquetas', {
  salvar: data => ipcRenderer.invoke('etiquetas-salvar-dados',data),
  obterProjeto: () => ipcRenderer.invoke('etiquetas-obter-projeto'),
})
