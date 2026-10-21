import { _electron as electron, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import net from 'node:net'

const executable = path.resolve(process.argv[2] || 'dist-packaged/win-unpacked/SIADESK.exe')
const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-postes-028-'))
const out = path.resolve('reports/postes')
fs.mkdirSync(out, { recursive: true })
const installed = executable === path.resolve('dist-packaged/win-unpacked/SIADESK.exe')
const freePort = () => new Promise(resolve => {
  const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) })
})
fs.writeFileSync(path.join(profile, 'simulador-balanca.json'), JSON.stringify({ porta: await freePort() }))
fs.writeFileSync(path.join(profile, 'simulador-clp.json'), JSON.stringify({ modbus: await freePort(), owl: await freePort() }))
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex')
const expectedIndex = hash(fs.readFileSync('dist/index.html'))
const app = await electron.launch({ executablePath: executable, args: [`--user-data-dir=${profile}`] })
try {
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(w => w.hide()))
  const info = await app.evaluate(({ app }) => {
    const fs = process.getBuiltinModule('fs'), path = process.getBuiltinModule('path'), crypto = process.getBuiltinModule('crypto')
    return { version: app.getVersion(), packaged: app.isPackaged, profile: app.getPath('userData'),
      indexHash: crypto.createHash('sha256').update(fs.readFileSync(path.join(app.getAppPath(), 'dist/index.html'))).digest('hex') }
  })
  assert.equal(info.version, version); assert.equal(info.packaged, true)
  assert.equal(info.profile, profile); assert.equal(info.indexHash, expectedIndex)
  const page = await app.firstWindow(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.getByRole('heading', { name: 'Entrar no SIADESK', exact: true }).waitFor()
  await app.evaluate(() => {
    const user = { id: 999, company_id: 999, name: 'Teste postes', email: 'postes@example.test', admin: true }
    global.fetch = async (url, options) => ({ ok: true, status: 200, json: async () => url.endsWith('/login')
      ? { token: 't'.repeat(64), user } : url.endsWith('/bootstrap') ? { user, settings: null, projects: [] }
      : { version: (JSON.parse(options?.body || '{}').version || 0) + 1 } })
  })
  await page.getByLabel('E-mail do SIASGL').fill('postes@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('isolated-test')
  await page.locator('form').evaluate(f => f.requestSubmit())
  await expect.poll(() => app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('new').enabled)).toBe(true)
  await app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('new').click())
  const creation = page.getByRole('dialog', { name: 'Novo projeto', exact: true })
  await creation.getByLabel('Nome do projeto').fill('Teste postes instalado')
  await creation.getByLabel('Cliente', { exact: true }).fill('Teste isolado')
  await creation.getByLabel('Código da proposta / OS').fill('POSTES-028')
  await creation.locator('form').evaluate(f => f.requestSubmit())
  await page.getByRole('button', { name: /Equipamentos/ }).click()
  const painel = page.locator('.postes-adicionais')
  await painel.getByRole('button', { name: 'Adicionar poste', exact: true }).click()
  const poste = painel.locator('.poste-adicional').first()
  await poste.getByLabel('Altura do poste (m)', { exact: true }).fill('6.8')
  await poste.getByLabel('Afastamento da coluna Z− (m)').fill('1')
  await poste.getByLabel('Afastamento da coluna Z+ (m)').fill('1.5')
  await poste.getByRole('button', { name: 'Equipamentos', exact: true }).click()
  await page.getByLabel('Fixar equipamento em', { exact: true }).selectOption('barra-superior')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByRole('combobox', { name: 'Adicionar Equipamento', exact: true }).selectOption('refletor-poste')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByRole('button', { name: 'Concluído', exact: true }).click()
  const row = page.locator('label.checkbox').filter({ hasText: 'SIAP01' }).first()
  await row.getByRole('button', { name: 'Alterar', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Altura do poste SIAP01', exact: true }).fill('4.6')
  const savedPath = path.join(profile, 'postes.json')
  await app.evaluate(({ dialog, Menu }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file })
    Menu.getApplicationMenu().getMenuItemById('save').click()
  }, savedPath)
  const saving = page.getByRole('dialog', { name: 'Salvar projeto', exact: true })
  await saving.getByRole('radio', { name: /Somente arquivo local/ }).check()
  await saving.locator('form').evaluate(f => f.requestSubmit())
  await expect.poll(() => fs.existsSync(savedPath)).toBe(true)
  const saved = JSON.parse(fs.readFileSync(savedPath, 'utf8'))
  assert.equal(saved.postesAdicionais.length, 1)
  assert.equal(saved.postesAdicionais[0].altura, 6.8)
  assert.deepEqual(saved.postesAdicionais[0].perifericos.map(p => p.tipo), ['camera-ip-baixo', 'refletor-poste'])
  assert.ok(saved.postesAdicionais[0].perifericos.every(p => p.montagem === 'barra-superior' && p.altura === 6.8))
  assert.equal(saved.alturasPostes.siap01, 4.6)
  await expect(saving).not.toBeVisible()
  assert.deepEqual(errors, [])
  const report = { executable, version, installed, packaged: info.packaged, isolatedProfile: info.profile === profile,
    indexHash: info.indexHash, savedProject: true, trave: true, cameraSuperior: true, refletorSuperior: true, alturaSiap: true, errors }
  fs.writeFileSync(path.join(out, installed ? 'installed.json' : 'staged.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await app.close() }
