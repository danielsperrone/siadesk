// Executar com Vite ativo: node tools/test-cancelas.mjs [URL]
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', (e) => errors.push(e.message))
try {
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5188')
  await page.evaluate(async () => {
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    useProject.getState().abrirProjeto({ ...CONFIG_PADRAO, nomeProjeto: 'Teste cancelas', cliente: 'Teste', codigoProposta: 'TESTE', cancelasAbertas: {}, cancelaEntrada: true, cancelaSaida: true,
      siap01: false, siap02: false, siap03: false, siap04: false, siap05: false, siap06: false, siap07: false, siap08: false, siap09: false })
  })
  await page.waitForFunction(() => window.__cena?.getObjectByName('cancela-saida')?.getObjectByName('eixo-abertura-cancela'))
  async function snapshot(id) {
    return page.evaluate(async (id) => {
      const THREE = await import('/node_modules/three/build/three.module.js')
      const scene = window.__cena
      scene.updateMatrixWorld(true)
      const p = scene.getObjectByName(id)
      const bounds = (name) => {
        const b = new THREE.Box3().setFromObject(p.getObjectByName(name))
        return { min: b.min.toArray(), max: b.max.toArray() }
      }
      return { arm: bounds('Mesh2'), cabinet: bounds('Mesh1'), angle: p.getObjectByName('eixo-abertura-cancela').rotation.x }
    }, id)
  }
  async function menu(id) {
    const point = await page.evaluate(async (id) => {
      const THREE = await import('/node_modules/three/build/three.module.js')
      const scene = window.__cena
      const camera = scene.__r3f.root.getState().camera
      const pos = new THREE.Box3().setFromObject(scene.getObjectByName(id).getObjectByName('Mesh1')).getCenter(new THREE.Vector3()).project(camera)
      const rect = document.querySelector('canvas').getBoundingClientRect()
      return { x: rect.x + (pos.x + 1) * rect.width / 2, y: rect.y + (1 - pos.y) * rect.height / 2 }
    }, id)
    await page.mouse.click(point.x, point.y, { button: 'right' })
    await page.getByRole('dialog', { name: /Cancela de/ }).waitFor()
  }
  for (const inverted of [false, true]) {
    if (inverted) {
      await page.evaluate(async () => {
        const { useProject } = await import('/src/store/project.ts')
        useProject.getState().setConfig('inverterLateralEntrada', true)
        useProject.getState().setConfig('inverterLateralSaida', true)
      })
      await page.waitForTimeout(500)
    }
    for (const id of ['cancela-entrada', 'cancela-saida']) {
      const other = id === 'cancela-entrada' ? 'cancela-saida' : 'cancela-entrada'
      const before = await snapshot(id)
      const untouched = await snapshot(other)
      await menu(id)
      assert(await page.getByRole('button', { name: 'Fechar cancela', exact: true }).isDisabled())
      if (!inverted && id === 'cancela-entrada') {
        await fs.mkdir('docs/testes-cancelas', { recursive: true })
        await page.screenshot({ path: 'docs/testes-cancelas/menu.png' })
      }
      await page.getByRole('button', { name: 'Abrir cancela', exact: true }).click()
      await page.waitForFunction((id) => window.__cena.getObjectByName(id).getObjectByName('eixo-abertura-cancela').rotation.x === Math.PI / 2, id)
      const after = await snapshot(id)
      assert.deepEqual(after.cabinet, before.cabinet, 'Gabinete deve permanecer imóvel')
      assert.deepEqual(await snapshot(other), untouched, 'Outra cancela deve permanecer imóvel')
      assert(after.arm.max[1] - after.arm.min[1] > 3.49, 'Braço deve ficar vertical')
      assert(after.arm.min[1] > 1.1, 'Braço deve abrir para cima')
      if (!inverted && id === 'cancela-entrada') await page.screenshot({ path: 'docs/testes-cancelas/aberta.png' })
      await menu(id)
      assert(await page.getByRole('button', { name: 'Abrir cancela', exact: true }).isDisabled())
      await page.getByRole('button', { name: 'Fechar cancela', exact: true }).click()
      await page.waitForFunction((id) => window.__cena.getObjectByName(id).getObjectByName('eixo-abertura-cancela').rotation.x === 0, id)
      assert.deepEqual(await snapshot(id), before, 'Fechamento deve restaurar a geometria')
      console.log(`OK ${id}, lateral invertida=${inverted}`)
    }
  }
  await menu('cancela-entrada')
  await page.keyboard.press('Escape')
  assert.equal(await page.getByRole('dialog', { name: /Cancela de/ }).count(), 0)
  await menu('cancela-entrada')
  await page.mouse.click(900, 800)
  assert.equal(await page.getByRole('dialog', { name: /Cancela de/ }).count(), 0)
  await menu('cancela-entrada')
  await page.getByRole('button', { name: 'Abrir cancela', exact: true }).click()
  await page.reload()
  await page.waitForFunction(() => window.__cena?.getObjectByName('cancela-entrada')?.getObjectByName('eixo-abertura-cancela')?.rotation.x === Math.PI / 2)
  assert.equal((await snapshot('cancela-saida')).angle, 0)
  assert.deepEqual(errors, [])
  console.log('OK Escape, clique externo, persistência e ausência de erros de execução')
} finally {
  await browser.close()
}
