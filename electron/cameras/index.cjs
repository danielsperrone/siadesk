const { CameraServer } = require('./server.cjs')

function registerCameras({ app, ipcMain }) {
  let owner = null, quitting = false
  const manager = new CameraServer(app, state => { if (owner && !owner.isDestroyed()) owner.send('cameras:estado', state) })
  ipcMain.handle('cameras:estado', () => manager.state)
  ipcMain.handle('cameras:configurar', (event, config) => {
    if (owner !== event.sender) {
      if (owner && !owner.isDestroyed()) throw new Error('As câmeras já estão em uso em outra janela.')
      owner = event.sender
      const current = owner
      const stop = () => {
        current.removeListener('destroyed', stop)
        current.removeListener('render-process-gone', stop)
        current.removeListener('did-start-navigation', navigation)
        if (owner === current) { owner = null; void manager.stop() }
      }
      const navigation = (_event, _url, inPlace, mainFrame) => { if (mainFrame && !inPlace) stop() }
      current.once('destroyed', stop)
      current.on('render-process-gone', stop)
      current.on('did-start-navigation', navigation)
    }
    return manager.configure(config)
  })
  ipcMain.handle('cameras:quadro', (event, session, id, pixels) => event.sender === owner ? manager.frame(session, id, pixels) : false)
  app.on('before-quit', event => {
    if (quitting) return
    event.preventDefault(); quitting = true
    void manager.stop().finally(() => app.quit())
  })
  return manager
}
module.exports = { registerCameras }
