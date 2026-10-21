import { test, expect } from '@playwright/test'
import { sessaoIsolada } from './setup'

async function abrirPoste(page, id) {
  await page.evaluate(async (id) => {
    const { useProject } = await import('/src/store/project.ts')
    useProject.getState().setPosteEditandoPerifericos(id)
  }, id)
}

async function config(page) {
  return page.evaluate(async () => (await import('/src/store/project.ts')).useProject.getState().config)
}

test.beforeEach(async ({ page }) => {
  await sessaoIsolada(page)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(async () => (await import('/src/cloud/session.ts')).useSession.getState().ready)
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    useProject.getState().criarNovoProjeto('Teste padrões', 'Teste', 'TESTE')
    useProject.getState().setAbaAtiva('postes')
  })
  await abrirPoste(page, 'siap01')
})

test('padrões por poste e tipo sobrevivem à remoção, recarga e exportação', async ({ page }) => {
  await page.getByText('Padrões deste equipamento no poste', { exact: true }).click()
  await page.getByRole('slider', { name: 'Altura padrão', exact: true }).fill('1.85')
  await page.getByRole('slider', { name: 'Giro padrão normal', exact: true }).fill('65')
  await page.getByRole('slider', { name: 'Giro padrão lateral invertida', exact: true }).fill('-35')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  let c = await config(page)
  expect(c.perifericosSiap01.at(-1)).toMatchObject({ tipo: 'camera-ip', altura: 1.85, rotacaoY: 65 })
  expect(c.perifericosSiap01[0]).toMatchObject({ tipo: 'leitor-rfid', altura: 2.5, rotacaoY: 0 })
  await page.screenshot({ path: 'test-results/postes/padroes-desktop.png' })
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    useProject.getState().setConfig('perifericosSiap01', [])
    useProject.getState().setConfig('inverterLateralEntrada', true)
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await abrirPoste(page, 'siap01')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  c = await config(page)
  expect(c.perifericosSiap01[0]).toMatchObject({ altura: 1.85, rotacaoY: -35, rotacaoYNormal: 65 })
  await page.evaluate(async () => {
    const { useProject } = await import('/src/store/project.ts')
    const exported = JSON.parse(JSON.stringify(useProject.getState().salvarConfig()))
    useProject.getState().fecharProjeto()
    useProject.getState().abrirProjeto(exported)
    useProject.getState().setConfig('inverterLateralEntrada', false)
  })
  expect((await config(page)).perifericosSiap01[0].rotacaoY).toBe(65)
  await abrirPoste(page, 'siap02')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  expect((await config(page)).perifericosSiap02.at(-1)).toMatchObject({ altura: 2.8, rotacaoY: 180 })
})

test('aproveita ajuste instalado, preserva outras unidades e restaura padrão', async ({ page }) => {
  await page.getByRole('button', { name: 'Usar como padrão neste poste', exact: true }).click()
  await page.getByText('Padrões deste equipamento no poste', { exact: true }).click()
  await page.getByRole('slider', { name: 'Altura padrão', exact: true }).fill('1.25')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  let c = await config(page)
  expect(c.perifericosSiap01[0].altura).toBe(2.5)
  expect(c.perifericosSiap01.at(-1)).toMatchObject({ tipo: 'leitor-rfid', altura: 1.25 })
  await page.getByRole('button', { name: 'Restaurar padrão geral' }).click()
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  c = await config(page)
  expect(c.perifericosSiap01.at(-1).altura).toBe(2.5)
  expect(new Set(c.perifericosSiap01.map(p => p.id)).size).toBe(c.perifericosSiap01.length)
})

test('poste baixo limita altura e SIAP09 tem padrão independente da inversão', async ({ page }) => {
  await abrirPoste(page, 'siap04')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  expect((await config(page)).perifericosSiap04.at(-1).altura).toBe(1.5)
  await abrirPoste(page, 'siap09')
  await page.getByText('Padrões deste equipamento no poste', { exact: true }).click()
  await expect(page.getByRole('slider', { name: 'Giro padrão lateral invertida', exact: true })).toHaveCount(0)
  await page.getByRole('slider', { name: 'Altura padrão', exact: true }).fill('5.5')
  await page.getByRole('button', { name: 'Adicionar', exact: true }).click()
  expect((await config(page)).perifericosSiap09.at(-1).altura).toBe(5.5)
})
