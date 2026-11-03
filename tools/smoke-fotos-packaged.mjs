import { _electron as electron, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

const executable = path.resolve(process.argv[2] || 'dist-fotos-0212/win-unpacked/SIADESK.exe')
const output = path.resolve(process.argv[3] || 'test-results/fotos-projeto/completo.pdf')
const expectedVersion = JSON.parse(fs.readFileSync('package.json', 'utf8')).version
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-trave-pdf-'))
fs.mkdirSync(path.dirname(output), { recursive: true })
const freePort = () => new Promise(resolve => {
  const server = net.createServer()
  server.listen(0, '127.0.0.1', () => { const port = server.address().port; server.close(() => resolve(port)) })
})
fs.writeFileSync(path.join(profile, 'simulador-balanca.json'), JSON.stringify({ porta: await freePort() }))
fs.writeFileSync(path.join(profile, 'simulador-clp.json'), JSON.stringify({ modbus: await freePort(), owl: await freePort() }))
const source = fs.readFileSync('src/store/project.ts', 'utf8').match(/export const CONFIG_PADRAO: ProjectConfig = (\{[\s\S]*?\n\})/)[1]
const base = Function(`return (${source})`)()
const photo = fs.readFileSync('public/print_1781568355857.png').toString('base64')
const config = { ...base, nomeProjeto: 'Verificação das fotos', cliente: 'Projeto de teste', codigoProposta: 'FOTOS-PDF',
  cancelaEntrada: false, cancelaSaida: false, siap01: false, siap02: false, siap03: false, siap04: false,
  siap05: false, siap06: false, siap07: false, siap08: false, siap09: false, mostrarVeiculo: false,
  fotosProjeto: Array.from({length: 4}, (_,i) => ({id: 'foto-'+i, nome: 'Foto '+(i+1)+'.png', dataUrl: 'data:image/png;base64,'+photo})),
}
const fixture = path.join(profile, 'traves.json')
fs.writeFileSync(fixture, JSON.stringify(config))
const sourceApp = executable === path.resolve('node_modules/electron/dist/electron.exe')
const app = await electron.launch({ executablePath: executable, args: [...(sourceApp ? ['.'] : []), `--user-data-dir=${profile}`] })
try {
  const info = await app.evaluate(({ app, BrowserWindow }) => {
    BrowserWindow.getAllWindows().forEach(w => w.hide())
    return { version: app.getVersion(), packaged: app.isPackaged, profile: app.getPath('userData') }
  })
  assert.equal(info.profile, profile)
  assert.equal(info.version, expectedVersion)
  assert.equal(info.packaged, !sourceApp)
  const page = await app.firstWindow(), errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('dialog', d => void d.accept())
  await page.getByRole('heading', { name: 'Entrar no SIADESK', exact: true }).waitFor()
  await app.evaluate(() => {
    const user = { id: 996, company_id: 996, name: 'Teste PDF', email: 'pdf@example.test', admin: true }
    global.fetch = async (url, options) => ({ ok: true, status: 200, json: async () => url.endsWith('/login')
      ? { user, token: 'p'.repeat(64) } : url.endsWith('/bootstrap') ? { user, settings: null, projects: [] }
      : { version: (JSON.parse(options?.body || '{}').version || 0) + 1 } })
  })
  await page.getByLabel('E-mail do SIASGL').fill('pdf@example.test')
  await page.getByLabel('Senha', { exact: true }).fill('isolated-test')
  await page.locator('form').evaluate(f => f.requestSubmit())
  await expect.poll(() => app.evaluate(({ Menu }) => Menu.getApplicationMenu().getMenuItemById('open').enabled)).toBe(true)
  await app.evaluate(({ dialog, Menu }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] })
    Menu.getApplicationMenu().getMenuItemById('open').click()
  }, fixture)
  await page.getByRole('button', { name: 'Escolher arquivo local…', exact: true }).click()
  await expect(page.locator('.fotos-projeto-lista li')).toHaveCount(4)
  const saved = path.join(profile, 'fotos-salvas.json')
  await app.evaluate(({ dialog, Menu }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file })
    Menu.getApplicationMenu().getMenuItemById('save').click()
  }, saved)
  const save = page.getByRole('dialog', {name: 'Salvar projeto'})
  await save.locator('form').evaluate(f => f.requestSubmit())
  await expect.poll(() => fs.existsSync(saved)).toBe(true)
  assert.deepEqual(JSON.parse(fs.readFileSync(saved, 'utf8')).fotosProjeto, config.fotosProjeto)
  await expect(save).not.toBeVisible()
  await page.getByRole('button', { name: /Emitir documentos/ }).click()
  await page.getByRole('button', { name: /Relatório Técnico/ }).click()
  await page.locator('.pagina-a3').waitFor()
  await app.evaluate(({ dialog }, file) => {
    dialog.showSaveDialog = async () => ({ canceled: false, filePath: file })
  }, output)
  await page.getByRole('button', { name: /Salvar PDF/ }).click()
  await expect.poll(() => fs.existsSync(output) && fs.statSync(output).size, { timeout: 120000 }).toBeGreaterThan(10000)
  await expect(page.getByText('Renderizando vistas 3D em alta resolução para garantir a qualidade do documento...', { exact: true })).not.toBeVisible({ timeout: 30000 })
  assert.deepEqual(errors, [])
  fs.writeFileSync(output.replace(/\.pdf$/i, '.json'), JSON.stringify({ ...info, executable, output, bytes: fs.statSync(output).size,
    isolatedProfile: info.profile === profile, photos: config.fotosProjeto.length, errors }, null, 2))
  console.log(JSON.stringify({ version: info.version, executable, output, bytes: fs.statSync(output).size, errors }))
} finally { await app.close() }
