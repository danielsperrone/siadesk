import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5192'], { windowsHide: true, stdio: 'ignore' })
let browser
try {
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:5192')).ok) break } catch {} await new Promise(r => setTimeout(r, 100)) }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } }), errors = []
  page.on('pageerror', e => errors.push(e.message))
  page.on('console', m => { if (m.type() === 'error') console.log('Browser:', m.text()) })
  await page.goto('http://127.0.0.1:5192')
  await page.getByRole('heading', { name: 'Entrar no SIADESK' }).waitFor({ timeout: 60000 })
  await page.evaluate(async () => {
    const { useSession } = await import('/src/cloud/session.ts')
    useSession.setState({ ready: true, user: { id: 1, name: 'Teste', email: 'teste@example.com', company_id: 1, admin: true } })
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    useProject.getState().abrirProjeto({ ...CONFIG_PADRAO, nomeProjeto: 'Leitura automática', mostrarVeiculo: true, offsetVeiculoX: 0, siap01: true,
      perifericosSiap01: [{ id: 'rfid-test', tipo: 'leitor-rfid', altura: 2.5, rotacaoY: 0 }, { id: 'ocr-test', tipo: 'camera-ocr', altura: 2.5, rotacaoY: 0 }] })
  })
  await page.waitForFunction(() => window.__cena?.getObjectByName('veiculo')?.getObjectByName('Mesh10')).catch(async e => { console.log(errors, await page.locator('body').innerText(), await page.evaluate(() => window.__cena?.children.map(c => c.name))); throw e })
  async function clickPart(x) {
    const point = await page.evaluate(async x => {
      const T = await import('/node_modules/three/build/three.module.js'), scene = window.__cena, root = scene.__r3f.root.getState(), v = scene.getObjectByName('veiculo')
      v.updateWorldMatrix(true, true)
      const center = v.localToWorld(new T.Vector3(x, 1.6, 0))
      root.camera.position.copy(center).add(new T.Vector3(-2, 1, 9)); root.controls.target.copy(center); root.controls.update()
      root.camera.updateMatrixWorld(true)
      const p = v.localToWorld(new T.Vector3(x, 1.6, 1.1)).project(root.camera), r = root.gl.domElement.getBoundingClientRect()
      return { x: r.left + (p.x + 1) * r.width / 2, y: r.top + (1 - p.y) * r.height / 2 }
    }, x)
    await page.waitForTimeout(800); await page.mouse.click(point.x, point.y)
  }
  await clickPart(-5.7)
  await page.getByRole('dialog', { name: 'Peso do veículo', exact: true }).waitFor()
  assert.equal(await page.getByRole('dialog', { name: 'Identificação do veículo' }).count(), 0)
  await page.getByRole('button', { name: 'Ajustar placas e tags', exact: true }).click()
  await page.getByLabel('Placa do cavalo', { exact: true }).fill('DEF2G34', { timeout: 5000 }).catch(async e => { await page.screenshot({ path: 'docs/leitura-click-debug.png' }); console.log(await page.locator('body').innerText()); throw e })
  const buscaTag = page.getByLabel('Pesquisar número da tag')
  await buscaTag.fill('101')
  assert.equal(await page.getByRole('button', { name: 'Adicionar tag', exact: true }).isDisabled(), true)
  await buscaTag.fill('1'); await buscaTag.press('Enter')
  await buscaTag.fill('001')
  assert.equal(await page.getByRole('button', { name: 'Adicionar tag', exact: true }).isDisabled(), true)
  await buscaTag.fill('000000000000000000000100')
  await page.getByRole('button', { name: 'Adicionar tag', exact: true }).click()
  await page.getByRole('button', { name: 'Remover tag 1', exact: true }).click()
  assert.equal(await page.getByRole('button', { name: 'Remover tag 100', exact: true }).count(), 1)
  await fs.mkdir('docs/testes-leitura', { recursive: true })
  await page.screenshot({ path: 'docs/testes-leitura/cavalo.png' })
  await page.setViewportSize({ width: 390, height: 844 }); await page.screenshot({ path: 'docs/testes-leitura/mobile.png' })
  assert.equal(await page.getByRole('dialog', { name: 'Identificação do veículo' }).evaluate(el => el.scrollWidth <= el.clientWidth), true)
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.keyboard.press('Escape')
  await clickPart(3)
  await page.getByRole('dialog', { name: 'Peso do veículo', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Ajustar placas e tags', exact: true }).click()
  await page.getByLabel('Placa do reboque', { exact: true }).fill('HIJ5678')
  await buscaTag.fill('2'); await page.getByRole('button', { name: 'Adicionar tag', exact: true }).click()
  await page.getByRole('button', { name: 'Voltar ao peso do conjunto', exact: true }).click()
  await page.getByRole('dialog', { name: 'Peso do veículo', exact: true }).waitFor()
  await page.keyboard.press('Escape')
  await page.evaluate(async () => { const { useProject } = await import('/src/store/project.ts'); useProject.getState().setPosteEditandoPerifericos('siap01') })
  await page.getByRole('button', { name: 'Configurar Leitor antena RFID', exact: true }).click()
  await page.getByLabel('Ativar simulador RFID').check()
  await page.getByLabel('Visualizar cone no cenário').check()
  await page.screenshot({ path: 'docs/testes-leitura/leitor.png' })
  await page.keyboard.press('Escape')
  const result = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js')
    const { dentroCone, opticaLeitor, pontosVeiculo, useLeitura } = await import('/src/simulator/leitura.ts')
    const { useProject } = await import('/src/store/project.ts')
    const s = useProject.getState(); s.setPosteEditandoPerifericos(null)
    const saved = JSON.parse(JSON.stringify(s.config)); s.fecharProjeto(); s.abrirProjeto(saved)
    const o = new T.Vector3(), d = new T.Vector3(1, 0, 0)
    const cone = [dentroCone(new T.Vector3(5,0,0),o,d,8,45), dentroCone(new T.Vector3(-1,0,0),o,d,8,45), dentroCone(new T.Vector3(9,0,0),o,d,8,45), dentroCone(new T.Vector3(3,4,0),o,d,8,45)]
    window.testLeitura = { T, opticaLeitor, pontosVeiculo, useLeitura, useProject }
    return { saved: saved.identidadesVeiculo, cone }
  })
  assert.deepEqual(result.cone, [true, false, false, false])
  assert.deepEqual(result.saved, { cavalo: { placa: 'DEF2G34', tags: ['000000000000000000000100'] }, reboque: { placa: 'HIJ5678', tags: ['000000000000000000000002'] } })
  await page.waitForFunction(() => window.__cena?.getObjectByName('rfid-test'))
  // Place the actual reader so its calibrated face points at each actual vehicle target.
  for (const part of ['cavalo', 'reboque']) {
    await page.evaluate(part => {
      const { T, opticaLeitor, pontosVeiculo } = window.testLeitura, scene = window.__cena
      const v = scene.getObjectByName('veiculo'), r = scene.getObjectByName('rfid-test')
      v.updateWorldMatrix(true, true); r.rotation.set(0, 0, 0)
      const optical = opticaLeitor('leitor-rfid'), target = v.localToWorld(new T.Vector3(...pontosVeiculo[part].rfid))
      r.position.copy(target).addScaledVector(optical.direcao, -3).sub(optical.origem.clone().sub(new T.Vector3(-.05,.30,.08)))
      r.updateWorldMatrix(true, true)
    }, part)
    await page.waitForFunction(expected => window.testLeitura.useLeitura.getState().deteccoes['rfid-test'] === expected, part === 'cavalo' ? '000000000000000000000100' : '000000000000000000000002')
  }
  await page.evaluate(() => { window.__cena.getObjectByName('rfid-test').position.y += 100 })
  await page.waitForFunction(() => !window.testLeitura.useLeitura.getState().deteccoes['rfid-test'])
  await page.evaluate(() => {
    const { useProject } = window.testLeitura, s = useProject.getState()
    s.setConfig('perifericosSiap01', s.config.perifericosSiap01.map(p => p.tipo === 'camera-ocr' ? { ...p, leitor: { ativo: true, ip: '127.0.0.1', porta: 3004, modo: 'tcp', alcance: 8, abertura: 45, mostrarCone: false } } : p))
  })
  for (const part of ['cavalo', 'reboque']) {
    await page.evaluate(part => {
      const { T, opticaLeitor, pontosVeiculo } = window.testLeitura, scene = window.__cena, root = scene.__r3f.root.getState()
      const v = scene.getObjectByName('veiculo'), r = scene.getObjectByName('ocr-test')
      v.updateWorldMatrix(true, true); r.rotation.set(0, 0, 0)
      const optical = opticaLeitor('camera-ocr'), target = v.localToWorld(new T.Vector3(...pontosVeiculo[part].placa))
      r.position.copy(target).addScaledVector(optical.direcao, -3).sub(optical.origem.clone().sub(new T.Vector3(-.15,.07,.08)))
      r.updateWorldMatrix(true, true)
      root.controls.target.copy(target); root.camera.position.copy(target).add(new T.Vector3(part === 'cavalo' ? -3 : 3, .4, .4)); root.controls.update()
    }, part)
    await page.waitForFunction(expected => window.testLeitura.useLeitura.getState().deteccoes['ocr-test'] === expected, part === 'cavalo' ? 'DEF2G34' : 'HIJ5678')
    await page.screenshot({ path: `docs/testes-leitura/placa-${part}.png` })
    if (part === 'reboque') {
      await page.evaluate(() => {
        const { T, pontosVeiculo } = window.testLeitura, scene = window.__cena, root = scene.__r3f.root.getState()
        const target = scene.getObjectByName('veiculo').localToWorld(new T.Vector3(...pontosVeiculo.reboque.placa))
        root.controls.target.copy(target); root.camera.position.copy(target).add(new T.Vector3(1.2, .65, 1.4)); root.controls.update()
      })
      await page.screenshot({ path: 'docs/testes-leitura/placa-reboque-encaixe.png' })
    }
  }
  await page.evaluate(() => { window.__cena.getObjectByName('ocr-test').position.y += 100 })
  await page.waitForFunction(() => !window.testLeitura.useLeitura.getState().deteccoes['ocr-test'])
  assert.deepEqual(errors, [])
  console.log('OK: clique real cabine/reboque, placas 3D, adicionar/remover 1/100, persistência, controles, mobile, cones RFID e OCR dianteiro/traseiro e saída da área.')
} finally { await browser?.close(); server.kill() }
