import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import assert from 'node:assert/strict'

const url = 'http://127.0.0.1:5197'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5197', '--strictPort'], { windowsHide: true, stdio: 'ignore' })
let browser
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch(url)).ok) break } catch {}
    await new Promise(r => setTimeout(r, 100))
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  const page = await browser.newPage()
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto(url)
  await page.evaluate(async () => {
    const { useSession } = await import('/src/cloud/session.ts')
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    const T = await import('/node_modules/three/build/three.module.js')
    const leitura = await import('/src/simulator/leitura.ts')
    useSession.setState({ ready: true, user: { id: 1, name: 'Teste', email: 'teste@example.com', company_id: 1, admin: true } })
    useProject.getState().abrirProjeto({ ...CONFIG_PADRAO, nomeProjeto: 'Inversão', mostrarVeiculo: true, offsetVeiculoX: 0, siap01: true,
      identidadesVeiculo: { cavalo: { placa: 'ABC1D23', tags: ['001'] }, reboque: { placa: 'XYZ4E56', tags: ['002'] } },
      perifericosSiap01: [{ id: 'rfid-test', tipo: 'leitor-rfid', altura: 2.5, rotacaoY: 0, leitor: { ...leitura.padraoLeitor('leitor-rfid'), ativo: true, alcance: 4 } }] })
    window.testInversao = { T, useProject, ...leitura }
  })
  await page.waitForFunction(() => {
    let rodas = 0
    window.__cena?.getObjectByName('veiculo')?.traverse(o => { if (o.userData.wheelRadius) rodas++ })
    return rodas > 0 && window.__cena.getObjectByName('rfid-test')
  })
  const snapshot = () => page.evaluate(() => {
    const { T, pontosVeiculo } = window.testInversao
    const v = window.__cena.getObjectByName('veiculo'), rodas = []
    v.updateWorldMatrix(true, true)
    v.traverse(o => { if (o.userData.wheelRadius) rodas.push({ angle: o.rotation.z, radius: o.userData.wheelRadius, position: o.getWorldPosition(new T.Vector3()).toArray() }) })
    return { x: v.position.x, rotation: v.rotation.y, rodas, tag: v.localToWorld(new T.Vector3(...pontosVeiculo.cavalo.rfid)).toArray() }
  })
  const initial = await snapshot()
  await page.keyboard.press('v')
  await page.waitForFunction(() => window.__cena.getObjectByName('veiculo').rotation.y === Math.PI)
  const flipped = await snapshot()
  assert.equal(flipped.x, initial.x)
  assert.ok(Math.abs(flipped.tag[0] + initial.tag[0]) < 1e-8)
  flipped.rodas.forEach((r, i) => {
    assert.equal(r.angle, initial.rodas[i].angle)
    assert.ok(Math.abs(r.position[0] + initial.rodas[i].position[0]) < 1e-8)
  })
  // Repetição da tecla e atalhos modificados não devem inverter novamente.
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'v', repeat: true })))
  await page.keyboard.press('Control+v')
  assert.equal((await snapshot()).rotation, Math.PI)
  await page.evaluate(() => {
    const input = document.createElement('input'); input.id = 'test-focus'; document.body.append(input); input.focus()
  })
  await page.keyboard.press('v')
  assert.equal((await snapshot()).rotation, Math.PI)
  await page.evaluate(() => document.getElementById('test-focus').remove())

  // Com leitor fixo, a inversão troca a tag presente naquela extremidade.
  await page.evaluate(() => {
    const { T, opticaLeitor, pontosVeiculo } = window.testInversao
    const v = window.__cena.getObjectByName('veiculo'), r = window.__cena.getObjectByName('rfid-test')
    const optical = opticaLeitor('leitor-rfid')
    const target = v.localToWorld(new T.Vector3(...pontosVeiculo.cavalo.rfid))
    r.rotation.set(0, 0, 0)
    r.position.copy(target).addScaledVector(optical.direcao, -3).sub(optical.origem.clone().sub(new T.Vector3(-.05, .30, .08)))
  })
  await page.waitForFunction(() => window.testInversao.useLeitura.getState().deteccoes['rfid-test'] === '001')
  await page.keyboard.press('Shift+V')
  await page.waitForFunction(() => window.testInversao.useLeitura.getState().deteccoes['rfid-test'] === '002')

  // Verifica ângulo = distância / raio nas duas orientações e direções.
  for (const inverted of [false, true]) {
    if (inverted) await page.keyboard.press('v')
    await page.waitForFunction(expected => window.__cena.getObjectByName('veiculo').rotation.y === expected, inverted ? Math.PI : 0)
    for (const key of ['ArrowRight', 'ArrowLeft']) {
      const before = await snapshot()
      await page.keyboard.down(key)
      await page.waitForTimeout(200)
      await page.keyboard.up(key)
      await page.waitForTimeout(1600)
      const after = await snapshot(), dx = after.x - before.x
      assert.ok(key === 'ArrowRight' ? dx > 0 : dx < 0)
      after.rodas.forEach((r, i) => {
        const error = r.angle - before.rodas[i].angle + dx * (inverted ? -1 : 1) / r.radius
        assert.ok(Math.abs(Math.sin(error / 2)) < 1e-5, `Rodagem incoerente: ${error}`)
      })
    }
  }
  await page.evaluate(() => {
    const s = window.testInversao.useProject.getState(), saved = JSON.parse(JSON.stringify(s.config))
    s.fecharProjeto(); s.abrirProjeto(saved)
  })
  await page.waitForFunction(() => window.__cena?.getObjectByName('veiculo')?.rotation.y === Math.PI)
  assert.deepEqual(errors, [])
  console.log('OK: tecla V, retorno com Shift+V, repetição e campos protegidos, rodas nos dois sentidos, RFID com leitor fixo e persistência ao reabrir.')
} finally {
  await browser?.close()
  server.kill()
}
