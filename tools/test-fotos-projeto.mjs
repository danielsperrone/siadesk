import { chromium, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'

const baseURL = process.env.RELATORIO_TEST_URL || 'http://127.0.0.1:5196'
const output = 'test-results/fotos-projeto'
await fs.mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1800, height: 1250 } })
const errors = []
page.on('pageerror', error => errors.push(error.message))
try {
  await page.route('**/fotos-test', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
  await page.goto(`${baseURL}/fotos-test`)
  await page.evaluate(async () => {
    const { default: refresh } = await import('/@react-refresh')
    refresh.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => type => type
    window.__vite_plugin_react_preamble_installed__ = true
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js')
    await import('/src/styles.css')
    const { ConfigPanel } = await import('/src/components/ConfigPanel.tsx')
    const { DocumentoDocumentacao } = await import('/src/components/DocumentoDocumentacao.tsx')
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    const { useSession } = await import('/src/cloud/session.ts')
    const { captureStandards } = await import('/src/cloud/sync.ts')
    useSession.setState({ user: { id: 999, company_id: 999, admin: true } })
    window.project = useProject
    window.captureStandards = captureStandards
    const config = { ...CONFIG_PADRAO, nomeProjeto: 'Teste das fotos', cliente: 'Cliente de teste', codigoProposta: 'FOTOS-01' }
    for (let n = 1; n <= 9; n++) config[`siap0${n}`] = false
    useProject.setState({ config, projetoAtivo: true })
    const root = ReactDOM.createRoot(document.getElementById('root'))
    window.editor = () => root.render(React.createElement(ConfigPanel, { key: 'editor' }))
    window.report = (count, tipoDocumento = 'tecnico') => {
      const config = { ...useProject.getState().config, fotosProjeto: window.photos.slice(0, count) }
      root.render(React.createElement(DocumentoDocumentacao, { key: `${count}-${tipoDocumento}`, config,
        dataEmissao: new Date('2026-10-31T12:00:00Z'), codigoDocumento: 'FOTOS-01', tipoDocumento,
        onFechar() {}, onExportar() {} }))
    }
    window.editor()
  })
  const file = (name, buffer, mimeType = 'image/png') => ({ name, mimeType, buffer })
  const landscape = await fs.readFile('public/print_1781568355857.png')
  const portrait = Buffer.from(await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 400; c.height = 900
    const ctx = c.getContext('2d'); ctx.fillStyle = '#406a86'; ctx.fillRect(0, 0, 400, 900)
    ctx.fillStyle = '#ffffff'; ctx.font = '28px sans-serif'; ctx.fillText('Teste vertical', 40, 440)
    return c.toDataURL('image/png').split(',')[1]
  }), 'base64')
  const input = page.getByLabel('Selecionar fotos do projeto')
  await input.setInputFiles([file('Principal.png', landscape), file('Vertical.png', portrait), file('Adicional 2.png', landscape), file('Adicional 3.png', portrait)])
  await expect(page.locator('.fotos-projeto-lista li')).toHaveCount(4)
  await expect(page.getByRole('button', { name: 'Limite de 4 fotos atingido' })).toBeDisabled()
  await page.locator('.fotos-projeto-editor').screenshot({ path: `${output}/editor.png` })
  assert.equal(await page.evaluate(() => window.project.getState().isDirty), true)
  await page.getByRole('button', { name: 'Usar foto 2 como principal', exact: true }).click()
  assert.equal(await page.evaluate(() => window.project.getState().config.fotosProjeto[0].nome), 'Vertical.png')
  await page.getByRole('button', { name: 'Trocar foto 1', exact: true }).click()
  await input.setInputFiles(file('Nova principal.png', landscape))
  await expect(page.locator('.foto-projeto-info > span').first()).toHaveText('Nova principal.png')
  await input.setInputFiles(file('invalida.png', Buffer.from('arquivo inválido')))
  await expect(page.getByRole('alert')).toContainText('Não foi possível ler')
  await expect(page.locator('.fotos-projeto-lista li')).toHaveCount(4)
  await page.evaluate(async () => {
    window.photos = structuredClone(window.project.getState().config.fotosProjeto)
    await window.project.persist.rehydrate()
  })
  assert.equal(await page.evaluate(() => window.project.getState().config.fotosProjeto.length), 4)
  await page.evaluate(() => window.captureStandards())
  assert.equal(await page.evaluate(() => 'fotosProjeto' in window.project.getState().padroesGlobais), false)
  await page.getByRole('button', { name: 'Remover foto 1', exact: true }).click()
  await expect(page.locator('.fotos-projeto-lista li')).toHaveCount(3)
  await page.getByRole('button', { name: 'Adicionar fotos adicionais', exact: true }).click()
  await input.setInputFiles([file('extra1.png', landscape), file('extra2.png', landscape)])
  await expect(page.getByRole('alert')).toContainText('limite')
  await expect(page.locator('.fotos-projeto-lista li')).toHaveCount(3)
  const totals = []
  for (let count = 0; count <= 4; count++) {
    await page.evaluate(count => window.report(count), count)
    await page.locator('.capa-documento').waitFor()
    await page.getByRole('button', { name: '▶', exact: true }).click()
    if (count === 0) {
      await expect(page.locator('.pagina-fotos-projeto')).toHaveCount(0)
      await expect(page.locator('.titulo-planta-pagina')).toContainText('REFERÊNCIA')
    } else {
      await expect(page.locator('.pagina-fotos-projeto img')).toHaveCount(count)
      await page.locator('.pagina-fotos-projeto img').evaluateAll(images => Promise.all(images.map(i => i.decode())))
      const bounds = await page.locator('.pagina-fotos-projeto').evaluate(el => {
        const page = el.getBoundingClientRect()
        return [...el.querySelectorAll('figure, img, .rodape-tecnico')].every(child => {
          const b = child.getBoundingClientRect()
          return b.height > 0 && b.width > 0 && b.bottom <= page.bottom && b.right <= page.right
        })
      })
      assert.ok(bounds, `Layout ${count}: fotos e rodapé cabem na folha`)
      await page.locator('.pagina-fotos-projeto').screenshot({ path: `${output}/layout-${count}.png` })
      await page.pdf({ path: `${output}/layout-${count}.pdf`, preferCSSPageSize: true, printBackground: true })
      await page.getByRole('button', { name: '▶', exact: true }).click()
      await expect(page.locator('.titulo-planta-pagina')).toContainText('REFERÊNCIA')
    }
    totals.push(await page.locator('.selo-celula').filter({ hasText: /^Página/ }).locator('.selo-valor').innerText())
    // Confere que todas as páginas seguintes têm navegação contínua e carimbo sequencial.
    let previous = count ? 2 : 1
    while (await page.getByRole('button', { name: '▶', exact: true }).isEnabled()) {
      await page.getByRole('button', { name: '▶', exact: true }).click()
      const text = await page.locator('.selo-celula').filter({ hasText: /^Página/ }).locator('.selo-valor').innerText()
      const current = Number(text.split('/')[0].trim())
      assert.equal(current, ++previous)
    }
  }
  assert.equal(totals[1], totals[2]); assert.equal(totals[2], totals[3]); assert.equal(totals[3], totals[4])
  assert.equal(Number(totals[1].split('/')[1]), Number(totals[0].split('/')[1]) + 1)
  for (const tipo of ['instalacao', 'compra', 'picklist']) {
    await page.evaluate(tipo => window.report(4, tipo), tipo)
    await page.locator('.pagina-a4-vertical').first().waitFor()
    await expect(page.locator('.pagina-fotos-projeto')).toHaveCount(0)
  }
  await page.evaluate(() => window.project.getState().criarNovoProjeto('Outro', 'Cliente', 'FOTOS-02', true))
  assert.deepEqual(await page.evaluate(() => window.project.getState().config.fotosProjeto), [])
  assert.deepEqual(errors, [])
  console.log(JSON.stringify({ result: 'Fotos, persistência, isolamento, quatro layouts, impressão e paginação verificados.', totals, errors }))
} finally { await browser.close() }
