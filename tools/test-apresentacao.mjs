import { chromium, expect } from '@playwright/test'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const url = 'http://127.0.0.1:5208'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5208', '--strictPort'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
server.stderr.on('data', data => process.stderr.write(data))
let browser
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.getByRole('heading', { name: 'Entrar no SIADESK' }).waitFor({ timeout: 60000 })
  await page.evaluate(async () => {
    const { useSession } = await import('/src/cloud/session.ts')
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    const { useBalanca } = await import('/src/simulator/balanca.ts')
    const { proximoPesoApresentacao } = await import('/src/simulator/apresentacao.ts')
    useSession.setState({ ready: true, user: { id: 1, name: 'Teste', email: 'teste@example.test', company_id: 1, admin: true } })
    useProject.getState().abrirProjeto({ ...CONFIG_PADRAO, nomeProjeto: 'Apresentação', mostrarVeiculo: true, offsetVeiculoX: 0, pesoVeiculoKg: 56000, cancelaEntrada: true, cancelaSaida: true, mostrarPeso: false })
    useProject.getState().setAbaAtiva('cenas')
    window.testApresentacao = { useProject, useBalanca, proximoPesoApresentacao }
  })
  await page.waitForFunction(() => {
    let rodas = 0
    window.__cena?.getObjectByName('veiculo')?.traverse(object => { if (object.userData.wheelRadius) rodas++ })
    return rodas > 0
  })
  const initialScene = await page.evaluate(() => window.__cena.uuid)
  await page.getByRole('button', { name: 'Modo de apresentação', exact: true }).click()
  await expect(page.locator('.menu-superior')).toBeHidden()
  await expect(page.locator('.toolbar')).toBeHidden()
  await expect(page.locator('.aba-conteudo')).toBeHidden()
  await expect(page.getByRole('button', { name: 'Sair da apresentação', exact: true })).toBeVisible()
  const state = () => page.evaluate(() => {
    const s = window.testApresentacao.useProject.getState()
    return { peso: s.config.pesoVeiculoKg, x: s.config.offsetVeiculoX, invertido: !!s.config.veiculoInvertido, modo: s.modoApresentacao, aba: s.abaAtiva, dirty: s.isDirty }
  })
  assert.equal((await state()).aba, 'postes')
  assert.equal((await state()).dirty, false)
  assert.equal(await page.locator('.rotulo-peca').count(), 0)
  assert.equal(await page.evaluate(() => window.__cena.uuid), initialScene)
  await page.waitForFunction(() => window.testApresentacao.useBalanca.getState().state.estavel && window.testApresentacao.useBalanca.getState().state.peso > 0)
  await fs.mkdir('docs/testes-apresentacao', { recursive: true })
  await page.screenshot({ path: 'docs/testes-apresentacao/desktop.png' })
  await page.setViewportSize({ width: 1024, height: 768 })
  await page.screenshot({ path: 'docs/testes-apresentacao/compacto.png' })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  await page.setViewportSize({ width: 1440, height: 900 })

  // Limites inclusivos da tara e caso inicial intermediário de 40 t.
  const limits = await page.evaluate(() => {
    const p = window.testApresentacao.proximoPesoApresentacao
    return [p(50001, () => 0), p(50001, () => 1 - Number.EPSILON), p(16100, () => 0), p(17300, () => 1 - Number.EPSILON), p(40000, () => .5), p(50000, () => .5)]
  })
  assert.deepEqual(limits, [16100, 17300, 51000, 57000, 54000, 54000])
  for (let i = 0; i < 8; i++) {
    const before = await state()
    const tecla = ['r', 'v', 'Shift+R', 'Shift+V'][i % 4]
    await page.keyboard.press(tecla)
    const after = await state()
    assert.ok(before.peso > 50000 ? after.peso >= 16100 && after.peso <= 17300 : after.peso >= 51000 && after.peso <= 57000)
    assert.ok(after.x > 14.5, 'R e V reposicionam para a próxima passagem')
    assert.equal(after.invertido, tecla.toLowerCase().endsWith('v') ? !before.invertido : before.invertido)
    const liberouPostes = await page.evaluate(async () => {
      const T = await import('/node_modules/three/build/three.module.js')
      const cena = window.__cena, veiculo = cena.getObjectByName('veiculo')
      const limite = Math.max(...cena.children.filter(p => p.name.startsWith('poste-')).map(p => p.position.x))
      veiculo.updateWorldMatrix(true, true)
      return new T.Box3().setFromObject(veiculo).min.x > limite
    })
    assert.ok(liberouPostes, 'Todo o caminhão fica além dos postes, inclusive após inverter com V')
  }
  const protectedWeight = (await state()).peso
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', ctrlKey: true })))
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', repeat: true })))
  const protectedOrientation = (await state()).invertido
  await page.keyboard.press('Control+v')
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', repeat: true })))
  assert.equal((await state()).peso, protectedWeight)
  assert.equal((await state()).invertido, protectedOrientation)

  // Clique real no caminhão abre o editor existente. R digitado no campo não altera peso.
  async function clickObject(name, point, button = 'left') {
    const screen = await page.evaluate(async ({ name, point }) => {
      const T = await import('/node_modules/three/build/three.module.js')
      const scene = window.__cena, root = scene.__r3f.root.getState(), object = scene.getObjectByName(name)
      object.updateWorldMatrix(true, true)
      const center = object.localToWorld(new T.Vector3(...point))
      root.camera.position.copy(center).add(new T.Vector3(-2, 1, 9))
      root.controls.target.copy(center); root.controls.update(); root.camera.updateMatrixWorld(true)
      const p = center.project(root.camera), rect = root.gl.domElement.getBoundingClientRect()
      return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 }
    }, { name, point })
    await page.mouse.click(screen.x, screen.y, { button })
  }
  await clickObject('veiculo', [-5.7, 1.6, 1.1])
  const modal = page.getByRole('dialog', { name: 'Peso do veículo', exact: true })
  await expect(modal).toBeVisible()
  await modal.locator('input[type=number]').focus()
  await page.keyboard.press('r')
  await page.keyboard.press('v')
  assert.equal((await state()).peso, protectedWeight)
  assert.equal((await state()).invertido, protectedOrientation)
  await page.keyboard.press('Escape')
  await expect(modal).toBeHidden()
  assert.equal((await state()).modo, true)

  await clickObject('poste-siap01', [0, 1.5, 0])
  await expect(page.getByRole('heading', { name: 'Periféricos do Poste SIAP01' })).toBeVisible()
  await page.getByRole('button', { name: 'Configurar Leitor antena RFID', exact: true }).click()
  await expect(page.getByRole('dialog', { name: /RFID/ })).toBeVisible()
  await page.keyboard.press('Escape')
  assert.equal((await state()).modo, true)
  await page.keyboard.press('Escape') // Fecha somente o painel do poste.
  await expect(page.getByRole('heading', { name: 'Periféricos do Poste SIAP01' })).toBeHidden()
  await clickObject('cancela-entrada', [0, .5, 0], 'right')
  await expect(page.locator('.menu-cancela')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.locator('.menu-cancela')).toBeHidden()
  assert.equal((await state()).modo, true)

  // Comandos de cancela e movimento continuam operantes.
  await page.keyboard.press('q')
  assert.equal(await page.evaluate(() => window.testApresentacao.useProject.getState().config.cancelasAbertas['cancela-entrada']), true)
  const x = (await state()).x
  await page.keyboard.down('ArrowLeft'); await page.waitForTimeout(350); await page.keyboard.up('ArrowLeft')
  await expect.poll(async () => (await state()).x).toBeLessThan(x)
  await page.getByRole('button', { name: 'Sair da apresentação', exact: true }).click()
  assert.equal((await state()).modo, false)
  assert.equal((await state()).aba, 'cenas')
  await expect(page.locator('.menu-superior')).toBeVisible()
  const pesoAntes = (await state()).peso
  await page.keyboard.press('r')
  assert.equal((await state()).peso, pesoAntes, 'Fora da apresentação, R mantém apenas o reposicionamento')
  const foraAntes = await state()
  await page.keyboard.press('v')
  const foraDepois = await state()
  assert.equal(foraDepois.invertido, !foraAntes.invertido)
  assert.equal(foraDepois.x, foraAntes.x, 'Fora da apresentação, V mantém apenas a inversão')
  assert.equal(foraDepois.peso, foraAntes.peso)
  await page.getByRole('button', { name: 'Modo de apresentação', exact: true }).click()
  await page.keyboard.press('Escape')
  assert.equal((await state()).modo, false)
  await page.evaluate(() => {
    const s = window.testApresentacao.useProject.getState()
    s.setModoApresentacao(true); s.fecharProjeto()
  })
  assert.equal((await state()).modo, false)
  assert.deepEqual(errors, [])
  console.log('OK: apresentação sem menus, cena preservada, peso visível, tara e carga, R/V e Shift+R/V, inversão antes de reposicionar, proteções, cliques de caminhão/poste/cancela, periféricos, movimento e saídas. Fora da apresentação V mantém apenas a inversão.')
} finally {
  await browser?.close()
  server.kill()
}
