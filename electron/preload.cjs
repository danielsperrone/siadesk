const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('dimensionador', {
  exportPdf: () => ipcRenderer.invoke('export-pdf'),
})
