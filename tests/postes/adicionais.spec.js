import { test, expect } from '@playwright/test'
import { sessaoIsolada } from './setup'

async function estado(page) {
  return page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    const { gerarLayout } = await import('/src/layout/engine.ts')
    const s = useProject.getState()
    return { config: s.config, layout: gerarLayout(s.config, s.calibracoes) }
  })
}

test.beforeEach(async ({ page }) => {
  await sessaoIsolada(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(async () => (await import('/src/cloud/session.ts')).useSession.getState().ready)
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    useProject.getState().criarNovoProjeto('Postes adicionais', 'Teste', 'POSTES')
    useProject.getState().setAbaAtiva('postes')
  })
})

test('trave permite equipamentos nas colunas e na barra, e preserva montagem ao reabrir', async ({ page }) => {
  const painel = page.locator('.postes-adicionais')
  await painel.getByRole('button', { name: 'Adicionar poste', exact: true }).click()
  const poste = painel.locator('.poste-adicional').first()
  await poste.getByLabel('Altura do poste (m)', { exact: true }).fill('7.2')
  await poste.getByLabel('Afastamento da coluna Z− (m)').fill('1.1')
  await poste.getByLabel('Afastamento da coluna Z+ (m)').fill('1.7')
  await poste.getByRole('combobox', { name: 'Referência de posicionamento', exact: true }).selectOption('B')
  await poste.getByLabel('Deslocamento longitudinal — X (m)').fill('2.3')
  await poste.getByRole('button', { name: 'Equipamentos', exact: true }).click()
  await page.getByRole('combobox', { name: 'Adicionar Equipamento', exact: true }).selectOption('leitor-rfid')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Fixar equipamento em', { exact: true }).selectOption('coluna-positiva')
  await page.getByRole('combobox', { name: 'Adicionar Equipamento', exact: true }).selectOption('semaforo')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Fixar equipamento em', { exact: true }).selectOption('barra-superior')
  await expect(page.getByRole('combobox', { name: 'Adicionar Equipamento', exact: true })).toHaveValue('camera-ip-baixo')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  await page.getByLabel('Posição na barra', { exact: true }).fill('0.5')
  await page.getByRole('combobox', { name: 'Adicionar Equipamento', exact: true }).selectOption('refletor-poste')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  const { config, layout } = await estado(page)
  const trave = config.postesAdicionais[0]
  const p = layout.find(p => p.id === `poste-${trave.id}`)
  expect(p.posicao[0]).toBe(config.comprimentoBalanca / 2 + 2.3)
  expect(p.posicao[1]).toBe(0)
  expect(p.posicao[2]).toBeCloseTo(0.3)
  expect(p.estruturaPoste.altura).toBe(7.2)
  expect(p.estruturaPoste.largura).toBeCloseTo(config.larguraBalanca + 2.8)
  const [rfid, sinal, camera, luz] = trave.perifericos.map(e => layout.find(p => p.id === e.id))
  expect(rfid.posicao[2]).toBe(-config.larguraBalanca / 2 - 1.1)
  expect(sinal.posicao[2]).toBe(config.larguraBalanca / 2 + 1.7)
  expect(camera.posicao).toEqual([p.posicao[0], 7.2, 0.5])
  expect(luz.posicao).toEqual([p.posicao[0], 7.2, 0])
  const optica = await page.evaluate(async camera => {
    const THREE = await import('/node_modules/three/build/three.module.js')
    const { posicionarCamera } = await import('/src/simulator/cameras.ts')
    const objeto = new THREE.Group(); objeto.position.set(...camera.posicao); objeto.rotation.y = camera.rotacaoY
    const lente = new THREE.PerspectiveCamera(); posicionarCamera(lente, camera, objeto)
    return { y: lente.getWorldDirection(new THREE.Vector3()).y, up: lente.up.y }
  }, camera)
  expect(optica.y).toBeLessThan(-0.7)
  expect(optica.up).toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/postes/trave-desktop.png' })
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    const s = useProject.getState(), saved = JSON.parse(JSON.stringify(s.salvarConfig()))
    s.fecharProjeto(); s.abrirProjeto(saved)
  })
  expect((await estado(page)).config.postesAdicionais).toEqual(config.postesAdicionais)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(async () => (await import('/src/cloud/session.ts')).useSession.getState().ready)
  expect((await estado(page)).config.postesAdicionais).toEqual(config.postesAdicionais)
  expect(await page.evaluate(async () => {
    const { criarProjetoEtiquetas } = await import('/src/labels/project-labels.ts')
    const { useProject } = await import('/src/store/project.ts')
    const { gerarLayout } = await import('/src/layout/engine.ts')
    const s = useProject.getState()
    return criarProjetoEtiquetas(s.config, gerarLayout(s.config, s.calibracoes)).equipamentos.map(p => p.tipo)
  })).not.toContain('poste-trave')
  await page.evaluate(async x => {
    const { useProject } = await import('/src/store/project.ts')
    useProject.getState().setPosteEditandoPerifericos(null)
    useProject.getState().setCenaParaIr({ id: 'teste-trave', nome: 'Trave', posicao: [x + 10, 9, 11], target: [x, 3.2, 0] })
  }, p.posicao[0])
  await page.getByLabel('Mostrar rótulos', { exact: true }).uncheck()
  await page.waitForFunction(async () => !(await import('/src/store/project.ts')).useProject.getState().cenaParaIr)
  await page.waitForFunction(id => {
    const objeto = window.__cena?.getObjectByName(id)
    let meshes = 0; objeto?.traverse(o => { if (o.isMesh) meshes++ })
    return meshes > 0
  }, camera.id)
  await page.screenshot({ path: 'test-results/postes/trave-montagem.png' })
  // Inspect this structure directly, without creating a dozen GPU contexts by
  // rapidly paging through the standard pole previews in the same frame.
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    for (let n = 1; n <= 9; n++) useProject.getState().setConfig(`siap0${n}`, false)
    useProject.getState().setConfig('cancelaEntrada', false)
    useProject.getState().setConfig('cancelaSaida', false)
    useProject.getState().salvarConfig()
  })
  await page.getByRole('button', { name: /Emitir documentos/ }).click()
  await page.getByRole('button', { name: /Relatório Técnico/ }).click()
  for (let i = 0; i < 20; i++) {
    if (await page.getByText('DETALHAMENTO TÉCNICO - POSTE TRAVE 1', { exact: true }).isVisible()) break
    await page.locator('.btn-pag-nav').last().click()
  }
  await expect(page.getByText('DETALHAMENTO TÉCNICO - POSTE TRAVE 1', { exact: true })).toBeVisible()
  await expect(page.getByText('Largura entre colunas:', { exact: true })).toBeVisible()
  await expect(page.locator('.linha-espec').filter({ hasText: 'Largura entre colunas:' })).toContainText('6,00 m')
  await expect(page.locator('.linha-espec').filter({ hasText: 'Altura da Estrutura:' })).toContainText('7,20 m')
  await expect(page.getByRole('img', { name: /Desenho cotado de Poste trave 1/ })).toBeVisible()
  await expect(page.locator('.linha-espec').filter({ hasText: 'Afastamento da coluna Z-:' })).toContainText('1,10 m')
  await expect(page.locator('.linha-espec').filter({ hasText: 'Afastamento da coluna Z+:' })).toContainText('1,70 m')
  await expect(page.getByText('Coluna lateral Z+', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Diminuir zoom', exact: true }).click()
  await page.waitForFunction(() => {
    const canvas = document.querySelector('.canvas-poste-3d-clean canvas')
    if (!canvas || !canvas.width || !canvas.height) return false
    const gl = canvas.getContext('webgl2')
    if (!gl || gl.isContextLost()) return false
    const pixels = new Uint8Array(canvas.width * canvas.height * 4)
    gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels)
    let colored = 0
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i + 3] > 0 && pixels[i] < 240) colored++
    return colored > 30
  }, null, { timeout: 10000 })
  await page.screenshot({ path: 'test-results/postes/trave-documentacao.png', fullPage: true })
})

test('vários postes independentes e referências A, B e meio acompanham o comprimento da balança', async ({ page }) => {
  const painel = page.locator('.postes-adicionais')
  await painel.getByRole('combobox', { name: 'Tipo de poste', exact: true }).selectOption('simples')
  for (let i = 0; i < 3; i++) await painel.getByRole('button', { name: 'Adicionar poste', exact: true }).click()
  for (const [i, referencia] of ['A', 'B', 'meio'].entries()) {
    const poste = painel.locator('.poste-adicional').nth(i)
    await poste.getByRole('combobox', { name: 'Referência de posicionamento', exact: true }).selectOption(referencia)
    await poste.getByLabel('Deslocamento longitudinal — X (m)').fill('2')
  }
  await painel.locator('.poste-adicional').nth(1).getByRole('combobox', { name: 'Lateral da balança', exact: true }).selectOption('positiva')
  await page.evaluate(async () => (await import('/src/store/project.ts')).useProject.getState().setConfig('comprimentoBalanca', 24))
  const { config, layout } = await estado(page)
  const pecas = config.postesAdicionais.map(p => layout.find(item => item.id === `poste-${p.id}`))
  expect(pecas.map(p => p.posicao[0])).toEqual([-14, 14, 2])
  expect(pecas.map(p => p.posicao[1])).toEqual([0, 0, 0])
  expect(pecas[1].posicao[2]).toBeGreaterThan(0)
  expect(new Set(config.postesAdicionais.map(p => p.id)).size).toBe(3)
  await painel.locator('.poste-adicional').nth(1).getByRole('button', { name: 'Remover poste' }).click()
  expect((await estado(page)).config.postesAdicionais.map(p => p.id)).toEqual([config.postesAdicionais[0].id, config.postesAdicionais[2].id])
})

test('altura padrão muda a estrutura e limita equipamentos; barra acompanha altura e largura', async ({ page }) => {
  const row = page.locator('label.checkbox').filter({ hasText: 'SIAP01' }).first()
  await row.getByRole('button', { name: 'Alterar', exact: true }).click()
  await page.getByRole('spinbutton', { name: 'Altura do poste SIAP01', exact: true }).fill('4.7')
  let result = await estado(page)
  expect(result.layout.find(p => p.id === 'poste-siap01').estruturaPoste.altura).toBe(4.7)
  await page.getByRole('spinbutton', { name: 'Altura do poste SIAP01', exact: true }).fill('1.2')
  result = await estado(page)
  expect(result.config.perifericosSiap01.every(p => p.altura <= 1.2)).toBe(true)
  await row.getByRole('button', { name: 'Usar Padrão', exact: true }).click()
  expect((await estado(page)).layout.find(p => p.id === 'poste-siap01').estruturaPoste.altura).toBe(3)
  await page.locator('.postes-adicionais').getByRole('button', { name: 'Adicionar poste', exact: true }).click()
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    const s = useProject.getState(), p = s.config.postesAdicionais[0]
    s.setConfig('postesAdicionais', [{ ...p, altura: 8, perifericos: [
      { id: 'topo', tipo: 'camera-ip-baixo', altura: 5, rotacaoY: 90, montagem: 'barra-superior', deslocamentoBarra: 99 },
      { id: 'lateral', tipo: 'camera-ip', altura: 7, rotacaoY: 45, montagem: 'coluna-positiva' },
    ] }])
    s.setConfig('postesAdicionais', useProject.getState().config.postesAdicionais.map(p => ({ ...p, altura: 4 })))
  })
  result = await estado(page)
  expect(result.layout.find(p => p.id === 'topo').posicao[1]).toBe(4)
  expect(result.layout.find(p => p.id === 'lateral').posicao[1]).toBe(4)
  expect(result.config.postesAdicionais[0].perifericos[0].deslocamentoBarra).toBe(result.config.larguraBalanca / 2 + 0.6)
})
