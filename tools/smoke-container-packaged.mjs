import { _electron as electron, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import assert from 'node:assert/strict'

const expectedVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const userData = fs.mkdtempSync(path.join(os.tmpdir(), `siadesk-container-${expectedVersion}-`))
const executable = path.resolve(process.argv[2] || 'dist-packaged/win-unpacked/SIADESK.exe')
const sourceHash = crypto.createHash('sha256').update(fs.readFileSync('public/models/veiculo-container.glb')).digest('hex')
const app = await electron.launch({ executablePath: executable, args: [`--user-data-dir=${userData}`] })
try {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(w => w.hide()))
  const info = await app.evaluate(({ app }) => {
    const fs = process.getBuiltinModule('fs'), path = process.getBuiltinModule('path'), crypto = process.getBuiltinModule('crypto')
    return { version: app.getVersion(), packaged: app.isPackaged, userData: app.getPath('userData'),
      modelHash: crypto.createHash('sha256').update(fs.readFileSync(path.join(app.getAppPath(), 'dist/models/veiculo-container.glb'))).digest('hex') }
  })
  assert.equal(info.version, expectedVersion)
  assert.equal(info.packaged, true)
  assert.equal(info.userData, userData)
  assert.equal(info.modelHash, sourceHash)
  const page = await app.firstWindow()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.getByRole('heading', { name: 'Entrar no SIADESK' }).waitFor()
  await app.evaluate(() => {
    global.testUser = { id: 991, company_id: 991, name: 'Teste contêiner', email: 'container@example.test', admin: true }
    global.fetch = async (url, options) => {
      let data
      if (url.endsWith('/login')) data = { token: 'c'.repeat(64), user: global.testUser }
      else if (url.endsWith('/bootstrap')) data = { user: global.testUser, settings: null, projects: [] }
      else { const body = JSON.parse(options.body); data = { version: (body.version || 0) + 1 } }
      return { ok: true, status: 200, json: async () => data }
    }
  })
  await page.getByLabel('E-mail do SIASGL').fill('container@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('mock-password')
  await page.locator('form').evaluate(form => form.requestSubmit())
  await expect.poll(() => app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('new').enabled)).toBe(true)
  await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('new').click())
  const creation = page.getByRole('dialog', { name: 'Novo projeto' })
  await creation.getByLabel('Nome do projeto').fill('Teste contêiner instalado')
  await creation.getByLabel('Cliente', { exact: true }).fill('Teste isolado')
  await creation.getByLabel('Código da proposta / OS').fill(`CONTAINER-${expectedVersion}`)
  await creation.locator('form').evaluate(form => form.requestSubmit())
  await page.getByRole('button', { name: /Equipamentos/ }).click()
  await page.getByLabel('Mostrar caminhão ilustrativo').check()
  const select = page.getByLabel('Modelo do caminhão')
  await expect(select).toHaveValue('padrao')
  const modelResponse = page.waitForResponse(r => r.url().includes('veiculo-container.glb') && r.request().method() === 'GET')
  await select.selectOption('container')
  assert.ok((await modelResponse).ok())
  // A file response precedes GLB decoding and GPU upload. Exercise the moving
  // model only after the live simulator has found all of its articulated wheels.
  await page.waitForFunction(() => window.balanca.state().then(s => s?.totalRodas === 10), null, { timeout: 60000 })
  await page.waitForTimeout(500)
  await select.blur()
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })))
  await page.waitForTimeout(500)
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true })))
  const readConfig = () => page.evaluate(() => JSON.parse(localStorage.getItem('siadesk-storage-991-991')).state.config)
  await expect.poll(async () => (await readConfig()).offsetVeiculoX, { timeout: 15000 }).toBeGreaterThan(0)
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', bubbles: true })))
  await expect.poll(async () => (await readConfig()).veiculoInvertido).toBe(true)
  const savePath = path.join(userData, 'container.json')
  await app.evaluate(({ dialog }, file) => { dialog.showSaveDialog = async () => ({ canceled: false, filePath: file }) }, savePath)
  await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('save').click())
  const saving = page.getByRole('dialog', { name: 'Salvar projeto' })
  await saving.locator('form').evaluate(form => form.requestSubmit())
  await expect.poll(() => fs.existsSync(savePath)).toBe(true)
  assert.equal(JSON.parse(fs.readFileSync(savePath, 'utf8')).modeloVeiculo, 'container')
  await expect(saving).not.toBeVisible()
  await select.selectOption('padrao')
  await expect(select).toHaveValue('padrao')
  await select.selectOption('container')
  await expect(select).toHaveValue('container')
  assert.deepEqual(errors, [])
  const installed = executable === path.resolve('dist-packaged/win-unpacked/SIADESK.exe')
  const report = { version: info.version, executable, packaged: true, installed, isolatedProfile: info.userData === userData,
    modelHash: info.modelHash, selector: true, glbLoaded: true, movement: true, inversion: true, savedJson: true, switchBack: true, errors }
  fs.writeFileSync(`reports/container-truck/${installed ? 'packaged' : 'packaged-staged'}.json`, JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await app.close() }
