import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import { mkdir, readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'

// Requer Vite em execução. Não acessa sessões nem projetos do usuário.
const baseURL = process.env.RELATORIO_TEST_URL || 'http://127.0.0.1:5196'
const browser = await chromium.launch({ channel: 'msedge', headless: true })
const page = await browser.newPage({ viewport: { width: 1800, height: 900 } })
const css = await readFile(new URL('../src/styles.css', import.meta.url), 'utf8')
const previousCSS = execFileSync('git', ['show', 'HEAD:src/styles.css'], { encoding: 'utf8' })
await mkdir('test-results/relatorio', { recursive: true })
try {
  await page.route('**/pdf-layout-test', route => route.fulfill({ contentType: 'text/html', body: '<div id="root"></div>' }))
  await page.goto(`${baseURL}/pdf-layout-test`)
  await page.evaluate(async () => {
    const { default: RefreshRuntime } = await import('/@react-refresh')
    RefreshRuntime.injectIntoGlobalHook(window)
    window.$RefreshReg$ = () => {}
    window.$RefreshSig$ = () => type => type
    window.__vite_plugin_react_preamble_installed__ = true
    const { default: React } = await import('/node_modules/.vite/deps/react.js')
    const { default: ReactDOM } = await import('/node_modules/.vite/deps/react-dom_client.js')
    const { DocumentoDocumentacao } = await import('/src/components/DocumentoDocumentacao.tsx')
    const { useProject } = await import('/src/store/project.ts')
    window.reportRoot = ReactDOM.createRoot(document.getElementById('root'))
    window.renderReport = tipoDocumento => window.reportRoot.render(React.createElement(DocumentoDocumentacao, {
      config: useProject.getState().config, dataEmissao: new Date('2026-09-28T12:00:00Z'),
      key: tipoDocumento, codigoDocumento: 'TESTE-LAYOUT', tipoDocumento, onFechar() {}, onExportar() {},
    }))
    window.renderReport('tecnico')
  })
  await page.locator('.pagina-a3').waitFor()
  const style = await page.addStyleTag({ content: previousCSS })
  const dimensions = selector => page.locator(selector).first().evaluate(el => {
    const r = el.getBoundingClientRect()
    return { width: r.width, height: r.height }
  })
  const original = await dimensions('.pagina-a3')
  await style.evaluate((el, css) => { el.textContent = css }, css)
  const fixed = await dimensions('.pagina-a3')
  assert.deepEqual(fixed, original, 'A3 deve preservar as dimensões anteriores')
  await page.getByRole('button', { name: 'Diminuir zoom', exact: true }).click()
  assert.ok(Math.abs((await dimensions('.pagina-a3')).width - original.width * .75) < 1)
  await page.emulateMedia({ media: 'print' })
  assert.deepEqual(await dimensions('.pagina-a3'), original, 'Zoom da tela não altera impressão')
  await page.emulateMedia({ media: 'screen' })
  await page.getByRole('button', { name: /Zoom 75%/ }).click()
  await page.getByRole('button', { name: 'Aumentar zoom', exact: true }).click()
  assert.ok(Math.abs((await dimensions('.pagina-a3')).width - original.width * 1.25) < 1)
  await page.getByRole('button', { name: /Zoom 125%/ }).click()
  await page.screenshot({ path: 'test-results/relatorio/capa.png' })
  await page.getByRole('button', { name: '▶', exact: true }).click()
  await page.locator('.titulo-planta-pagina').waitFor()
  await page.waitForLoadState('networkidle')
  assert.deepEqual(await dimensions('.pagina-a3'), original)
  await page.screenshot({ path: 'test-results/relatorio/planta.png' })
  await page.emulateMedia({ media: 'print' })
  assert.deepEqual(await dimensions('.pagina-a3'), original)
  await page.locator('.pagina-a3').screenshot({ path: 'test-results/relatorio/planta-impressao.png' })
  await page.emulateMedia({ media: 'screen' })
  // Demonstra a regressão sem a proteção contra encolhimento das folhas.
  await page.locator('.pagina-a3').evaluate(el => { el.style.flexShrink = '1' })
  const broken = await dimensions('.pagina-a3')
  assert.ok(broken.height < original.height - 100, 'Reproduzir o encolhimento anterior')
  for (const tipo of ['instalacao', 'compra', 'picklist']) {
    await page.evaluate(tipo => window.renderReport(tipo), tipo)
    await page.locator('.pagina-a4-vertical').first().waitFor()
    const size = await dimensions('.pagina-a4-vertical')
    assert.ok(Math.abs(size.width - 210 * 96 / 25.4) < 1)
    assert.ok(Math.abs(size.height - 297 * 96 / 25.4) < 1)
    await page.emulateMedia({ media: 'print' })
    assert.deepEqual(await dimensions('.pagina-a4-vertical'), size)
    await page.emulateMedia({ media: 'screen' })
  }
  console.log(JSON.stringify({ original, fixed, broken, result: 'A3 e três relatórios A4 preservados em tela e impressão.' }))
} finally {
  await browser.close()
}
