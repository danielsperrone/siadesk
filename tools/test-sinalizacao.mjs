// Com Vite ativo: node tools/test-sinalizacao.mjs [URL]
import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const browser = await chromium.launch({ headless: true, channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
try {
  await page.goto(process.argv[2] ?? 'http://127.0.0.1:5189')
  await page.evaluate(async () => {
    const { useSession } = await import('/src/cloud/session.ts')
    useSession.setState({ ready: true, user: { id: 1, name: 'Teste local', email: 'teste@example.com', company_id: 1, admin: true } })
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    useProject.getState().abrirProjeto({ ...CONFIG_PADRAO, nomeProjeto: 'Teste sinalização',
      siap01: false, siap02: true, siap03: false, siap04: false, siap05: false, siap06: false, siap07: false, siap08: false, siap09: false,
      perifericosSiap02: [
        { id: 'sem-1', tipo: 'semaforo', altura: 2.2, rotacaoY: 0 },
        { id: 'sem-2', tipo: 'semaforo', altura: 1.7, rotacaoY: 180 },
        { id: 'display-1', tipo: 'display-mensagens', altura: 2.8, rotacaoY: 0 },
      ] })
    useProject.getState().setPosteEditandoPerifericos('siap02')
  })
  await page.waitForFunction(() => {
    let found = false
    window.__cena?.getObjectByName('display-1')?.traverse(o => { if(o.material?.name === 'letreiro-mensagem') found = true })
    return found
  })
  async function lights(id) {
    return page.evaluate(id => {
      const result = {}
      window.__cena.getObjectByName(id).traverse(o => {
        for (const m of [o.material].flat().filter(Boolean)) {
          if (['Color_A05', 'Color_G05'].includes(m.name)) result[m.name] = m.emissiveIntensity
        }
      })
      return result
    }, id)
  }
  assert.equal(await page.getByLabel('Estado do semáforo').count(),0)
  await page.getByRole('button',{name:'Configurar Semáforo',exact:true}).first().click()
  const state = page.getByLabel('Estado do semáforo')
  assert.equal(await state.inputValue(), 'vermelho')
  assert.deepEqual(await lights('sem-1'), { Color_A05: 1.5, Color_G05: 0 })
  for (const [value, expected] of [['verde', { Color_A05: 0, Color_G05: 1.5 }], ['vermelho', { Color_A05: 1.5, Color_G05: 0 }], ['desligado', { Color_A05: 0, Color_G05: 0 }]]) {
    await state.selectOption(value)
    await page.waitForTimeout(150)
    assert.deepEqual(await lights('sem-1'), expected)
    assert.deepEqual(await lights('sem-2'), { Color_A05: 1.5, Color_G05: 0 })
  }
  await state.selectOption('verde')
  await page.getByRole('button',{name:'Concluir',exact:true}).click()
  await page.getByRole('button',{name:/Configurar Display/}).click()
  const message = page.getByLabel('Mensagem do letreiro')
  assert.equal(await message.inputValue(),'SIAMAC')
  await message.fill('ATENÇÃO • Aguarde a liberação')
  const texture = () => page.evaluate(() => {
    let value
    window.__cena.getObjectByName('display-1').traverse(o => {
      if (o.material?.name === 'letreiro-mensagem') value = o.material.map.image.toDataURL()
    })
    return value
  })
  const before = await texture()
  await page.waitForTimeout(300)
  assert.notEqual(await texture(), before, 'O texto deve se mover')
  await fs.mkdir('docs/testes-sinalizacao', { recursive: true })
  await page.screenshot({ path: 'docs/testes-sinalizacao/controles.png' })
  await message.fill('')
  await page.waitForTimeout(150)
  const blank = await texture()
  await page.waitForTimeout(200)
  assert.equal(await texture(), blank, 'Mensagem vazia deve apagar o texto')
  await message.fill('AGUARDE A LIBERAÇÃO')
  await page.getByRole('button',{name:'Concluir',exact:true}).click()
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    const saved = JSON.parse(JSON.stringify(useProject.getState().config))
    useProject.getState().fecharProjeto()
    useProject.getState().abrirProjeto(saved)
    useProject.getState().setPosteEditandoPerifericos('siap02')
  })
  await page.getByRole('button',{name:'Configurar Semáforo',exact:true}).first().click()
  assert.equal(await state.inputValue(), 'verde')
  await page.keyboard.press('Escape')
  await page.getByRole('button',{name:/Configurar Display/}).click()
  assert.equal(await message.inputValue(), 'AGUARDE A LIBERAÇÃO')
  await page.getByRole('button',{name:'Concluir',exact:true}).click()
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    useProject.getState().setPosteEditandoPerifericos(null)
    const THREE = await import('/node_modules/three/build/three.module.js')
    const scene = window.__cena
    const root = scene.__r3f.root.getState()
    let screen
    scene.getObjectByName('display-1').traverse(o => { if (o.material?.name === 'letreiro-mensagem') screen = o })
    scene.updateMatrixWorld(true)
    const center = new THREE.Box3().setFromObject(screen).getCenter(new THREE.Vector3())
    const normal = new THREE.Vector3().fromBufferAttribute(screen.geometry.getAttribute('normal'), 0).transformDirection(screen.matrixWorld)
    root.controls.target.copy(center)
    root.camera.position.copy(center).addScaledVector(normal, 2)
    root.controls.update()
  })
  await page.waitForTimeout(600)
  await page.screenshot({ path: 'docs/testes-sinalizacao/cena.png' })
  assert.deepEqual(errors, [])
  console.log('OK: três estados, isolamento entre semáforos, letreiro animado, apagar e reabrir projeto.')
} finally {
  await browser.close()
}
