// Com Vite ativo: node tools/test-cameras-electron.mjs http://127.0.0.1:5198
import { _electron as electron, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const { findBinary } = require('../electron/cameras/dependencies.cjs')
const ffmpeg = findBinary({ getPath: () => path.join(process.env.APPDATA, 'dimensionador') }, 'ffmpeg')
assert.ok(ffmpeg, 'Execute o simulador uma vez para preparar o FFmpeg antes do teste.')
const exec = promisify(execFile)
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-cameras-'))
const artifacts = path.resolve('test-results/cameras')
fs.mkdirSync(artifacts, { recursive: true })
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)) }) })
const port = await freePort(), scale = await freePort(), modbus = await freePort(), owl = await freePort()
fs.writeFileSync(path.join(folder, 'simulador-clp.json'), JSON.stringify({ modbus, owl }))
fs.writeFileSync(path.join(folder, 'simulador-balanca.json'), JSON.stringify({ porta: scale }))
fs.writeFileSync(path.join(folder, 'main.cjs'), `
const {app,BrowserWindow,ipcMain}=require('electron');
app.setPath('userData',${JSON.stringify(folder)});
process.env.SIADESK_FFMPEG=${JSON.stringify(ffmpeg)};
${[['display','registerDisplays'],['balanca','registerBalanca'],['simulador','registerSimulator'],['leitores','registerLeitores'],['cameras','registerCameras']].map(([dir,fn]) => `require(${JSON.stringify(path.resolve('electron',dir,'index.cjs'))}).${fn}({app,BrowserWindow,ipcMain});`).join('\n')}
ipcMain.handle('siasgl:session',()=>null);
ipcMain.handle('project:save-local', (_event,config)=>{ require('node:fs').writeFileSync(${JSON.stringify(path.join(folder, 'projeto-salvo.json'))},JSON.stringify(config)); return {ok:true}; });
app.whenReady().then(()=>{
const win=new BrowserWindow({show:false,width:1480,height:1000,webPreferences:{preload:${JSON.stringify(path.resolve('electron/preload.cjs'))},contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,offscreen:true}});
win.loadURL(${JSON.stringify(process.argv[2] ?? 'http://127.0.0.1:5198')});
});app.on('window-all-closed',()=>app.quit());`)

let app, page, blocker, clipboardAnterior
const errors = []
const waitState = async predicate => { await expect.poll(async () => predicate(await page.evaluate(() => window.cameras.estado())), { timeout: 30000 }).toBe(true) }
try {
  app = await electron.launch({ args: [path.join(folder, 'main.cjs')] })
  clipboardAnterior = await app.evaluate(({ clipboard }) => clipboard.readText())
  page = await app.firstWindow()
  page.on('pageerror', e => errors.push(e.message))
  await page.waitForFunction(() => window.cameras && document.querySelector('input'))
  await page.evaluate(async ({ port, scale, modbus, owl }) => {
    const { useSession } = await import('/src/cloud/session.ts')
    useSession.setState({ ready: true, user: { id: 1, name: 'Teste', email: 'teste@example.test', company_id: 1, admin: true } })
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    window.testProject = useProject
    useProject.getState().abrirProjeto({ ...CONFIG_PADRAO, nomeProjeto: 'Câmeras RTSP', mostrarVeiculo: true,
      balancaTcp: { porta: scale, margemContato: .15 }, simuladorClp: { portas: { modbus, owl } },
      simuladorCameras: { porta: port, largura: 640, fps: 2 },
      siap01: false, siap02: true, siap03: false, siap04: false, siap05: false, siap06: true, siap07: false, siap08: false, siap09: true,
      perifericosSiap02: [{ id: 'teste-normal', tipo: 'camera-ip', altura: 1.5, rotacaoY: 0 }],
      perifericosSiap06: [{ id: 'teste-ocr', tipo: 'camera-ocr', altura: 1.4, rotacaoY: -20 }],
      perifericosSiap09: [{ id: 'teste-baixo', tipo: 'camera-ip-baixo', altura: 5.6, rotacaoY: 90 }] })
    useProject.getState().setAbaAtiva('postes')
  }, { port, scale, modbus, owl })
  await page.waitForFunction(() => window.__cena?.getObjectByName('teste-baixo')?.children?.[0]?.children?.length > 0)
  const cameraNames = { siap02: 'Câmera IP POE', siap06: 'Câmera OCR', siap09: 'Câmera IP de Auditoria de Carga (Superior)' }
  const openCamera = async poste => {
    await page.evaluate(poste => { window.testProject.getState().setAbaAtiva('postes'); window.testProject.getState().setPosteEditandoPerifericos(poste) }, poste)
    await page.getByRole('button', { name: `Configurar ${cameraNames[poste]}`, exact: true }).click()
    return page.getByRole('dialog', { name: `Configurar ${cameraNames[poste]}`, exact: true })
  }
  const closeCamera = async dialog => {
    await dialog.getByRole('button', { name: 'Concluir', exact: true }).click()
    await page.evaluate(() => window.testProject.getState().setPosteEditandoPerifericos(null))
  }
  const links = {}
  let quantidade = 0
  for (const poste of ['siap02', 'siap06', 'siap09']) {
    const dialog = await openCamera(poste)
    await expect(dialog.getByLabel('Ativar transmissão RTSP', { exact: true })).not.toBeChecked()
    await expect(dialog.getByLabel('Endereço RTSP da câmera', { exact: true })).toHaveValue(/^rtsp:\/\/127\.0\.0\.1:\d+\/camera\//)
    links[poste] = await dialog.getByLabel('Endereço RTSP da câmera', { exact: true }).inputValue()
    await dialog.getByRole('button', { name: 'Copiar', exact: true }).click()
    assert.equal(await app.evaluate(({ clipboard }) => clipboard.readText()), links[poste])
    await dialog.getByLabel('Ativar transmissão RTSP', { exact: true }).check()
    quantidade++
    await waitState(s => s.cameras.length === quantidade && s.cameras.every(c => c.pronta))
    if (poste === 'siap06') await expect(dialog.getByLabel('Ativar simulador OCR', { exact: true })).not.toBeChecked()
    await closeCamera(dialog)
  }
  const state = await page.evaluate(() => window.cameras.estado())
  assert.equal(state.fps, 2); assert.equal(state.largura, 640)
  assert.equal(new Set(state.cameras.map(c => c.caminho)).size, 3)
  const stats = []
  for (const camera of state.cameras) {
    const url = `rtsp://127.0.0.1:${port}/${camera.caminho}`
    const file = path.join(artifacts, `${camera.id}.png`)
    await exec(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-rtsp_transport', 'tcp', '-analyzeduration', '0', '-probesize', '32', '-i', url, '-frames:v', '1', '-update', '1', '-y', file], { windowsHide: true, timeout: 20000 })
    assert.ok(fs.statSync(file).size > 2000, `Imagem válida para ${camera.id}`)
    stats.push({ id: camera.id, bytes: fs.statSync(file).size })
  }
  assert.equal(new Set(stats.map(s => s.bytes)).size, 3, 'As três câmeras têm imagens diferentes')
  let dialog = await openCamera('siap02')
  await dialog.getByRole('button', { name: 'Ver imagem da câmera', exact: true }).click()
  await expect(dialog.locator('.camera-preview')).toBeVisible()
  await dialog.screenshot({ path: path.join(artifacts, 'engrenagem.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  assert.equal(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth), true)
  await dialog.screenshot({ path: path.join(artifacts, 'engrenagem-mobile.png') })
  await page.setViewportSize({ width: 1480, height: 1000 })

  // A óptica acompanha o objeto/âncora. Orbitar a tela não altera sua visão.
  const optical = await page.evaluate(async () => {
    const { opticaCamera, posicionarCamera } = await import('/src/simulator/cameras.ts')
    const { gerarLayout } = await import('/src/layout/engine.ts')
    const THREE = await import('/node_modules/three/build/three.module.js')
    const s = window.testProject.getState(), scene = window.__cena
    const p = gerarLayout(s.config, s.calibracoes).find(p => p.id === 'teste-normal')
    const obj = scene.getObjectByName(p.id), camera = new THREE.PerspectiveCamera(45, 16 / 9)
    posicionarCamera(camera, p, obj)
    const before = camera.matrixWorld.toArray()
    scene.__r3f.root.getState().camera.position.set(20, 12, -20)
    posicionarCamera(camera, p, obj)
    const after = camera.matrixWorld.toArray()
    obj.rotation.y += Math.PI / 2; posicionarCamera(camera, p, obj)
    const rotated = camera.matrixWorld.toArray()
    obj.rotation.y -= Math.PI / 2
    const normal = opticaCamera('camera-ip'), baixo = opticaCamera('camera-ip-baixo'), ocr = opticaCamera('camera-ocr')
    return { before, after, rotated, y: [normal.direcao.y, baixo.direcao.y, ocr.direcao.y] }
  })
  assert.deepEqual(optical.before, optical.after); assert.notDeepEqual(optical.before, optical.rotated)
  assert.equal(optical.y[0], 0); assert.ok(optical.y[1] < -.7); assert.ok(optical.y[2] < 0)
  const session = state.sessao
  await dialog.getByLabel('Campo de visão da câmera', { exact: true }).fill('50')
  assert.equal((await page.evaluate(() => window.cameras.estado())).sessao, session, 'Enquadramento não reinicia RTSP')
  const host = state.hosts.find(h => h !== '127.0.0.1') || '127.0.0.1'
  if (state.hosts.length > 1) await dialog.getByLabel('Endereço para acessar esta câmera').selectOption(host)
  const normalUrl = links.siap02.replace('127.0.0.1', host)
  await expect(dialog.getByLabel('Endereço RTSP da câmera')).toHaveValue(normalUrl)
  await dialog.getByLabel('Ativar transmissão RTSP', { exact: true }).uncheck()
  await waitState(s => s.cameras.length === 2 && s.cameras.every(c => c.pronta))
  await expect(dialog.getByLabel('Endereço RTSP da câmera')).toHaveValue(normalUrl)
  assert.ok(!(await page.evaluate(() => window.cameras.estado())).cameras.some(c => c.id === 'teste-normal'))
  await dialog.getByLabel('Ativar transmissão RTSP', { exact: true }).check()
  await waitState(s => s.cameras.length === 3 && s.cameras.every(c => c.pronta))
  assert.equal((await page.evaluate(() => window.cameras.estado())).cameras[0].caminho, state.cameras[0].caminho)
  await dialog.getByText('Qualidade e porta RTSP do projeto', { exact: true }).click()
  await dialog.getByLabel('Resolução', { exact: true }).selectOption('960')
  await waitState(s => s.largura === 960 && s.cameras.length === 3 && s.cameras.every(c => c.pronta))
  assert.ok((await page.evaluate(() => window.cameras.estado())).fps < 2, 'Orçamento automático de pixels')
  await closeCamera(dialog)

  dialog = await openCamera('siap06')
  await dialog.getByLabel('Ativar transmissão RTSP', { exact: true }).uncheck()
  await waitState(s => s.cameras.length === 2 && s.cameras.every(c => c.pronta))
  await closeCamera(dialog)
  assert.equal(await page.evaluate(() => window.testProject.getState().isDirty), true)
  await page.getByRole('button', { name: 'Salvar Projeto', exact: true }).click()
  const salvar = page.getByRole('dialog', { name: 'Salvar projeto', exact: true })
  await salvar.getByRole('radio', { name: /Somente arquivo local/ }).check()
  await salvar.getByRole('button', { name: 'Salvar', exact: true }).click()
  await expect(salvar).not.toBeVisible()
  const saved = JSON.parse(fs.readFileSync(path.join(folder, 'projeto-salvo.json'), 'utf8'))
  assert.equal(saved.perifericosSiap02[0].cameraRtsp.ativa, true)
  assert.equal(saved.perifericosSiap02[0].cameraRtsp.abertura, 50)
  assert.equal(saved.perifericosSiap02[0].cameraRtsp.host ?? '127.0.0.1', host)
  assert.equal(saved.perifericosSiap06[0].cameraRtsp.ativa, false)
  assert.equal(saved.perifericosSiap09[0].cameraRtsp.ativa, true)
  assert.deepEqual(saved.simuladorCameras, { porta: port, largura: 960, fps: 2 })
  assert.equal(await page.evaluate(() => window.testProject.getState().isDirty), false)
  await page.evaluate(() => window.testProject.getState().fecharProjeto())
  await waitState(s => s.fase === 'desligado')
  await page.evaluate(config => window.testProject.getState().abrirProjeto(config), saved)
  await waitState(s => s.cameras.length === 2 && s.cameras.every(c => c.pronta))
  dialog = await openCamera('siap02')
  await expect(dialog.getByLabel('Ativar transmissão RTSP', { exact: true })).toBeChecked()
  await expect(dialog.getByLabel('Campo de visão da câmera', { exact: true })).toHaveValue('50')
  await expect(dialog.getByLabel('Endereço RTSP da câmera')).toHaveValue(normalUrl)
  await closeCamera(dialog)
  dialog = await openCamera('siap06')
  await expect(dialog.getByLabel('Ativar transmissão RTSP', { exact: true })).not.toBeChecked()
  await expect(dialog.getByLabel('Endereço RTSP da câmera')).toHaveValue(links.siap06)
  await closeCamera(dialog)
  await page.evaluate(() => window.testProject.getState().fecharProjeto())
  await waitState(s => s.fase === 'desligado')
  blocker = net.createServer()
  await new Promise(resolve => blocker.listen(port, '0.0.0.0', resolve))
  await page.evaluate(config => window.testProject.getState().abrirProjeto(config), saved)
  await waitState(s => s.fase === 'erro')
  dialog = await openCamera('siap02')
  await expect(dialog.locator('.camera-config [role=alert]')).toContainText('ocupada')
  await new Promise(resolve => blocker.close(resolve)); blocker = null
  await dialog.getByLabel('Ativar transmissão RTSP', { exact: true }).uncheck()
  await dialog.getByLabel('Ativar transmissão RTSP', { exact: true }).check()
  await waitState(s => s.fase === 'executando' && s.cameras.length === 2 && s.cameras.every(c => c.pronta))
  await closeCamera(dialog)
  await page.evaluate(() => window.testProject.getState().fecharProjeto())
  await waitState(s => s.fase === 'desligado')
  assert.deepEqual(errors, [])
  console.log('PASSOU: engrenagens IP/superior/OCR, link disponível com câmera parada, copiar, ativação independente, 3 streams reais, prévia desktop/mobile, salvar arquivo pelo botão, reabrir com estados/URL/FOV/qualidade preservados, porta ocupada e recuperação.', stats)
} catch (error) {
  console.error('Estado:', await page?.evaluate(() => window.cameras?.estado()).catch(() => null))
  console.error('Erros da página:', errors)
  console.error('Store:', await page?.evaluate(async () => (await import('/src/simulator/cameras.ts')).useCameras.getState()).catch(() => null))
  console.error('Módulos:', await page?.evaluate(() => performance.getEntriesByType('resource').map(r => r.name).filter(n => /cameras/i.test(n))).catch(() => null))
  await page?.screenshot({ path: path.join(artifacts, 'erro.png') }).catch(() => {})
  throw error
} finally {
  blocker?.close()
  if (app && clipboardAnterior !== undefined) await app.evaluate(({ clipboard }, value) => clipboard.writeText(value), clipboardAnterior).catch(() => {})
  await app?.close()
}
