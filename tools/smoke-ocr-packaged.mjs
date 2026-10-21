import { _electron as electron, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const executable = path.resolve(process.argv[2] || 'dist-packaged/win-unpacked/SIADESK.exe')
const installed = executable === path.resolve('dist-packaged/win-unpacked/SIADESK.exe')
const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-ocr-5460-'))
const out = path.resolve('reports/ocr-5460')
fs.mkdirSync(out, { recursive: true })
const ffmpeg = path.join(process.env.APPDATA, 'dimensionador/bin/ffmpeg.exe')
assert.ok(fs.existsSync(ffmpeg), 'FFmpeg preparado para teste RTSP')
const freePort = () => new Promise(resolve => {
  const server = net.createServer()
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) })
})
const port = await freePort(), scale = await freePort(), modbus = await freePort(), owl = await freePort()
fs.writeFileSync(path.join(folder, 'simulador-balanca.json'), JSON.stringify({ porta: scale }))
fs.writeFileSync(path.join(folder, 'simulador-clp.json'), JSON.stringify({ modbus, owl }))
const configText = fs.readFileSync('src/store/project.ts', 'utf8').match(/export const CONFIG_PADRAO: ProjectConfig = (\{[\s\S]*?\n\})/)[1]
const config = Function(`return (${configText})`)()
const fixture = path.join(folder, 'ocr.json')
fs.writeFileSync(fixture, JSON.stringify({ ...config, nomeProjeto: 'Teste OCR 5460 isolado', cliente: 'Teste', codigoProposta: 'OCR-TEST',
  mostrarVeiculo: true, modeloVeiculo: 'container',
  balancaTcp: { porta: scale, margemContato: .15 }, simuladorClp: { portas: { modbus, owl } },
  simuladorCameras: { porta: port, largura: 2688, fps: 1 },
  siap01: false, siap02: true, siap03: false, siap04: false, siap05: false, siap06: false, siap07: false, siap08: false, siap09: false,
  // Factory calibration contributes 180°; this relative yaw aims into the lane.
  perifericosSiap02: [{ id: 'ocr-packaged', tipo: 'camera-ocr', altura: 2, rotacaoY: 150,
    cameraRtsp: { ativa: true, perfil: 'intelbras-vip-5460-lpr-ia', abertura: 92, focalMm: 8, inclinacao: 0 } }],
}))
const app = await electron.launch({ executablePath: executable, args: [`--user-data-dir=${folder}`], env: { ...process.env, SIADESK_FFMPEG: ffmpeg } })
const errors = []
try {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(w => w.hide()))
  const info = await app.evaluate(({ app }) => ({ version: app.getVersion(), packaged: app.isPackaged, profile: app.getPath('userData') }))
  assert.equal(info.version, version); assert.equal(info.packaged, true); assert.equal(info.profile, folder)
  await app.evaluate(() => {
    const user = { id: 994, company_id: 994, name: 'Teste OCR', email: 'ocr@example.test', admin: true }
    global.fetch = async url => ({ ok: true, status: 200, json: async () => url.endsWith('/login') ? { token: 'c'.repeat(64), user } : { user, settings: null, projects: [] } })
  })
  const page = await app.firstWindow()
  page.on('pageerror', e => errors.push(e.message))
  await page.getByLabel('E-mail do SIASGL').fill('ocr@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('isolated-mock')
  await page.locator('form').evaluate(form => form.requestSubmit())
  await expect.poll(() => app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('open').enabled)).toBe(true)
  await app.evaluate(({ dialog, Menu }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] })
    Menu.getApplicationMenu().getMenuItemById('open').click()
  }, fixture)
  await page.getByRole('button', { name: 'Escolher arquivo local…', exact: true }).click()
  await page.waitForFunction(() => window.balanca.state().then(s => s?.totalRodas === 10), null, { timeout: 60000 })
  const state = () => page.evaluate(() => window.cameras.estado())
  await expect.poll(async () => {
    const s = await state()
    if (s.fase === 'erro') throw new Error(s.mensagem)
    return s.largura === 2688 && s.altura === 1520 && s.cameras.length === 1 && s.cameras[0].pronta
  }, { timeout: 60000 }).toBe(true)
  const initial = await state()
  assert.ok(initial.fps > 0 && initial.fps < 1)
  const url = `rtsp://127.0.0.1:${port}/${initial.cameras[0].caminho}`
  const decode = async name => {
    const file = path.join(out, `${installed ? 'installed' : 'staged'}-${name}.png`)
    await exec(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-rtsp_transport', 'tcp', '-analyzeduration', '0', '-probesize', '32', '-i', url, '-frames:v', '1', '-update', '1', '-y', file], { windowsHide: true, timeout: 45000 })
    const data = fs.readFileSync(file)
    assert.equal(data.readUInt32BE(16), 2688); assert.equal(data.readUInt32BE(20), 1520)
    assert.ok(data.length > 2000)
    return { bytes: data.length, hash: crypto.createHash('sha256').update(data).digest('hex') }
  }
  const before = await decode('rtsp-4mp')
  await page.getByRole('button', { name: /Equipamentos/ }).click()
  await page.getByRole('button', { name: 'Periféricos', exact: true }).click()
  await page.getByRole('button', { name: 'Configurar Câmera OCR', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Configurar Câmera OCR', exact: true })
  await expect(dialog.getByLabel('Perfil da câmera OCR')).toHaveValue('intelbras-vip-5460-lpr-ia')
  await dialog.getByLabel('Distância focal da câmera OCR').fill('12')
  await dialog.getByLabel('Ângulo vertical em graus').fill('-5')
  await dialog.getByRole('button', { name: 'Ver imagem da câmera', exact: true }).click()
  await expect(dialog.locator('.camera-preview')).toBeVisible({ timeout: 30000 })
  await expect.poll(() => dialog.locator('.camera-preview').evaluate(img => img.naturalWidth)).toBe(2688)
  assert.equal((await state()).sessao, initial.sessao, 'Ajustes da óptica não reiniciam o RTSP')
  const after = await decode('rtsp-zoom-tilt')
  assert.notEqual(before.hash, after.hash, 'Zoom e inclinação atualizam a imagem transmitida')
  await dialog.getByRole('button', { name: 'Concluir', exact: true }).click()
  await page.getByRole('button', { name: 'Concluído', exact: true }).click()
  const savePath = path.join(folder, 'salvo.json')
  await app.evaluate(({ dialog, Menu }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file })
    Menu.getApplicationMenu().getMenuItemById('save').click()
  }, savePath)
  const saving = page.getByRole('dialog', { name: 'Salvar projeto', exact: true })
  await saving.getByRole('radio', { name: /Somente arquivo local/ }).check()
  await saving.locator('form').evaluate(form => form.requestSubmit())
  await expect.poll(() => fs.existsSync(savePath)).toBe(true)
  const saved = JSON.parse(fs.readFileSync(savePath, 'utf8'))
  const optical = saved.perifericosSiap02[0].cameraRtsp
  assert.equal(optical.perfil, 'intelbras-vip-5460-lpr-ia'); assert.equal(optical.focalMm, 12); assert.equal(optical.inclinacao, -5)
  assert.equal(saved.simuladorCameras.largura, 2688)
  assert.equal(saved.modeloVeiculo, 'container')
  assert.deepEqual(errors, [])
  await app.close()
  const available = await new Promise(resolve => {
    const s = net.createServer(); s.once('error', () => resolve(false)); s.listen(port, '0.0.0.0', () => s.close(() => resolve(true)))
  })
  assert.equal(available, true, 'Fechar o aplicativo encerra o RTSP')
  const report = { version, executable, installed, packaged: true, isolatedProfile: true, rtsp4mp: true, width: 2688, height: 1520,
    fps: initial.fps, preview: true, liveOpticalChanges: true, savedJson: true, cleanShutdown: true, before, after, errors }
  fs.writeFileSync(path.join(out, installed ? 'packaged.json' : 'packaged-staged.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await app.close().catch(() => {}) }
