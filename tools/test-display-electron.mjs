// Com Vite ativo: node tools/test-display-electron.mjs http://127.0.0.1:5198
import { _electron as electron, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { once } from 'node:events'
const fixtures = JSON.parse(fs.readFileSync('tests/fixtures/display-owl.json', 'utf8'))
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-display-'))
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)) }) })
const port = await freePort(), scale = await freePort(), modbus = await freePort(), owl = await freePort()
fs.writeFileSync(path.join(folder, 'simulador-clp.json'), JSON.stringify({ modbus, owl }))
fs.writeFileSync(path.join(folder, 'simulador-balanca.json'), JSON.stringify({ porta: scale }))
fs.writeFileSync(path.join(folder, 'main.cjs'), `
const {app,BrowserWindow,ipcMain}=require('electron');
app.setPath('userData',${JSON.stringify(folder)});
${[['display','registerDisplays'],['balanca','registerBalanca'],['simulador','registerSimulator'],['leitores','registerLeitores']].map(([dir,fn]) => `require(${JSON.stringify(path.resolve('electron',dir,'index.cjs'))}).${fn}({app,BrowserWindow,ipcMain});`).join('\n')}
ipcMain.handle('siasgl:session',()=>null);
app.whenReady().then(()=>{
const win=new BrowserWindow({show:false,width:1480,height:1000,webPreferences:{preload:${JSON.stringify(path.resolve('electron/preload.cjs'))},contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,offscreen:true}});
win.loadURL(${JSON.stringify(process.argv[2] ?? 'http://127.0.0.1:5198')});
});app.on('window-all-closed',()=>app.quit());`)
let app, socket, currentPage
try {
  app = await electron.launch({ args: [path.join(folder, 'main.cjs')] })
  const page = await app.firstWindow(), errors = []
  currentPage = page
  await page.waitForFunction(() => window.displays && document.querySelector('input'))
  page.on('pageerror', e => errors.push(e.message))
  await page.evaluate(async ({ port, scale, modbus, owl }) => {
    const { useSession } = await import('/src/cloud/session.ts')
    useSession.setState({ ready: true, user: { id: 1, name: 'Teste', email: 'teste@example.test', company_id: 1, admin: true } })
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    useProject.getState().abrirProjeto({ ...CONFIG_PADRAO, nomeProjeto: 'Display remoto', balancaTcp: { porta: scale, margemContato: .15 }, simuladorClp: { portas: { modbus, owl } },
      siap01: false, siap02: true, siap03: false, siap04: false, siap05: false, siap06: false, siap07: false, siap08: false, siap09: false,
      perifericosSiap02: [{ id: 'display-teste', tipo: 'display-mensagens', altura: 2.8, rotacaoY: 0, mensagemDisplay: 'MANUAL', displayTcp: { ativo: false, ip: '127.0.0.1', porta: port } }] })
    useProject.getState().setPosteEditandoPerifericos('siap02')
    const original = CanvasRenderingContext2D.prototype.fillText
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { this.canvas.dataset.ultimoTexto = text; return original.call(this, text, ...args) }
  }, { port, scale, modbus, owl })
  await page.getByRole('button', { name: /Configurar Display/ }).click()
  await page.getByLabel('IP do display remoto').fill('999.0.0.1')
  await page.getByRole('button', { name: 'Iniciar display', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('IPv4 válido')
  await page.getByLabel('IP do display remoto').fill('127.0.0.1')
  await page.getByRole('button', { name: 'Iniciar display', exact: true }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Aguardando o OWL' })).toBeVisible()
  socket = net.connect(port, '127.0.0.1'); await once(socket, 'connect')
  socket.write(Buffer.from(fixtures.msgPodeSairDaBalanca, 'hex'))
  await expect(page.getByLabel('Mensagem recebida do OWL')).toHaveText('Pode sair da balança!')
  await page.waitForFunction(() => {
    let text
    window.__cena?.getObjectByName('display-teste')?.traverse(o => { if (o.material?.name === 'letreiro-mensagem') text = o.material.map.image.dataset.ultimoTexto })
    return text === 'Pode sair da balança!'
  })
  fs.mkdirSync('docs/testes-display', { recursive: true })
  await page.getByRole('dialog').screenshot({ path: 'docs/testes-display/configuracao.png' })
  socket.write(Buffer.from(fixtures.ApagaPainel, 'hex'))
  await expect(page.getByLabel('Mensagem recebida do OWL')).toHaveText('Painel apagado')
  await page.getByRole('button', { name: 'Parar display', exact: true }).click()
  await page.waitForFunction(async () => Object.keys(await window.displays.state()).length === 0)
  await page.waitForFunction(() => {
    let text
    window.__cena?.getObjectByName('display-teste')?.traverse(o => { if (o.material?.name === 'letreiro-mensagem') text = o.material.map.image.dataset.ultimoTexto })
    return text === 'MANUAL'
  })
  await page.getByRole('button', { name: 'Iniciar display', exact: true }).click()
  await page.waitForFunction(async () => (await window.displays.state())['display-teste']?.running)
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    window.__savedDisplayProject = JSON.parse(JSON.stringify(useProject.getState().config))
    useProject.getState().fecharProjeto()
  })
  await page.waitForFunction(async () => Object.keys(await window.displays.state()).length === 0)
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    useProject.getState().abrirProjeto(window.__savedDisplayProject)
  })
  await page.waitForFunction(async () => (await window.displays.state())['display-teste']?.running)
  assert.deepEqual(errors, [])
  console.log('PASSOU: configuração, validação, TCP real, mensagem na textura 3D, apagar, parar, fechar e reabrir projeto.')
} catch (error) {
  console.error(await currentPage?.locator('body').innerText())
  await currentPage?.screenshot({ path: path.join(folder, 'erro.png') })
  console.error('Captura:', path.join(folder, 'erro.png'))
  throw error
} finally { socket?.destroy(); await app?.close() }
