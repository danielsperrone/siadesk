import { _electron as electron, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-apresentacao-'))
const fixture = path.join(userData, 'apresentacao.json')
fs.writeFileSync(fixture, JSON.stringify({ nomeProjeto: 'Teste isolado · Apresentação', cliente: 'Teste', codigoProposta: 'TESTE', pesoVeiculoKg: 56000, mostrarPeso: false, mostrarVeiculo: true, offsetVeiculoX: 0, balancaTcp: { porta: 49195, margemContato: .15 } }))
const application = await electron.launch({ executablePath: path.resolve('dist-packaged/win-unpacked/SIADESK.exe'), args: [`--user-data-dir=${userData}`] })
try {
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().forEach(window => window.hide()))
  const info = await application.evaluate(({ app }) => ({ version: app.getVersion(), packaged: app.isPackaged, userData: app.getPath('userData') }))
  assert.equal(info.version, '0.2.4')
  assert.equal(info.packaged, true)
  assert.equal(info.userData, userData)
  await application.evaluate(() => {
    const user = { id: 998, company_id: 998, name: 'Teste isolado', email: 'apresentacao@example.test', admin: false }
    global.fetch = async url => {
      const data = url.endsWith('/login') ? { token: 'c'.repeat(64), user } : { user, settings: null, projects: [] }
      return { ok: true, status: 200, json: async () => data }
    }
  })
  const page = await application.firstWindow()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.getByLabel('E-mail do SIASGL').fill('apresentacao@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('isolated-mock')
  await page.locator('form').evaluate(form => form.requestSubmit())
  await expect.poll(() => application.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('open').enabled)).toBe(true)
  await application.evaluate(({ dialog, Menu }, fixture) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [fixture] })
    Menu.getApplicationMenu().getMenuItemById('open').click()
  }, fixture)
  await page.getByRole('button', { name: 'Escolher arquivo local…', exact: true }).click()
  await expect(page.locator('.logo-superior')).toContainText('Teste isolado')
  await page.getByRole('button', { name: 'Modo de apresentação', exact: true }).click()
  const windowState = () => application.evaluate(({ BrowserWindow }) => {
    const window = BrowserWindow.getAllWindows()[0]
    return { fullscreen: window.isFullScreen(), menu: window.isMenuBarVisible() }
  })
  await expect.poll(async () => (await windowState()).fullscreen).toBe(true)
  assert.equal((await windowState()).menu, false)
  await expect(page.locator('.menu-superior')).toBeHidden()
  await expect(page.locator('.toolbar')).toBeHidden()
  await expect(page.locator('.aba-conteudo')).toBeHidden()
  await expect(page.locator('button:visible')).toHaveCount(1)
  await expect(page.getByRole('button', { name: 'Sair da apresentação', exact: true })).toBeVisible()
  await page.waitForFunction(() => window.balanca.state().then(state => state?.totalRodas > 0 && state.estavel && state.peso > 0), null, { timeout: 60000 })
  const total = () => page.getByLabel('Peso total do veículo', { exact: true }).textContent().then(text => Number(text.replace(/\D/g, '')))
  assert.equal(await total(), 56000)
  for (let i = 0; i < 6; i++) {
    const before = await total()
    await page.keyboard.press(['r', 'v', 'Shift+R', 'Shift+V'][i % 4])
    await expect.poll(total).not.toBe(before)
    const after = await total()
    assert.ok(before > 50000 ? after >= 16100 && after <= 17300 : after >= 51000 && after <= 57000)
    const config = await page.evaluate(() => JSON.parse(localStorage.getItem('siadesk-storage-998-998')).state.config)
    assert.ok(config.offsetVeiculoX > 14.5)
    assert.equal(!!config.veiculoInvertido, [1, 2, 5].includes(i))
  }
  await page.getByRole('button', { name: 'Sair da apresentação', exact: true }).click()
  await expect(page.locator('.menu-superior')).toBeVisible()
  await expect.poll(async () => (await windowState()).fullscreen).toBe(false)
  assert.equal((await windowState()).menu, true)
  await page.getByRole('button', { name: 'Modo de apresentação', exact: true }).click()
  await page.keyboard.press('Escape')
  await expect(page.locator('.menu-superior')).toBeVisible()
  await expect.poll(async () => (await windowState()).fullscreen).toBe(false)
  // Entrar em apresentação a partir de tela cheia preserva o estado anterior ao sair.
  await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setFullScreen(true))
  await page.getByRole('button', { name: 'Modo de apresentação', exact: true }).click()
  await expect(page.locator('.apresentacao-sair')).toBeVisible()
  await page.getByRole('button', { name: 'Sair da apresentação', exact: true }).click()
  await expect(page.locator('.menu-superior')).toBeVisible()
  assert.equal((await windowState()).fullscreen, true)
  assert.deepEqual(errors, [])
  console.log('OK: SIADESK 0.2.4 do atalho iniciou com perfil isolado; apresentação em tela cheia, todos os menus ocultos, pesagem ativa, R/V alternando tara/carga e reposicionando, V mantendo inversão, saída por botão/Esc e restauração da tela cheia anterior. Perfil:', userData)
} finally {
  await application.close()
}
