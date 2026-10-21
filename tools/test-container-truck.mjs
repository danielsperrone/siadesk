import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { transform } from 'esbuild'
import { chromium, expect } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const out = `${root}/reports/container-truck`
fs.mkdirSync(out, { recursive: true })
const rig = (await transform(fs.readFileSync(path.join(root, 'src/components/veiculo-rig.ts'), 'utf8'), { loader: 'ts', format: 'esm' })).code
const types = { '.html': 'text/html', '.js': 'text/javascript', '.ts': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.glb': 'model/gltf-binary', '.png': 'image/png', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (url === '/src/components/veiculo-rig.ts') { res.setHeader('Content-Type', 'text/javascript'); res.end(rig); return }
  if (url === '/') url = '/dist/index.html'
  else if (/^\/(assets|models|brand|etiquetas)\//.test(url)) url = '/dist' + url
  const filename = path.resolve(root, '.' + url)
  if (!filename.startsWith(root) || !fs.existsSync(filename) || !fs.statSync(filename).isFile()) { res.statusCode = 404; res.end(); return }
  res.setHeader('Content-Type', types[path.extname(filename)] || 'application/octet-stream')
  if (req.method === 'HEAD') { res.end(); return }
  fs.createReadStream(filename).pipe(res)
})
await new Promise(resolve => server.listen(5195, '127.0.0.1', resolve))
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1600, height: 850 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', m => { if (m.type() === 'error') console.log('Browser:', m.text().slice(0, 300)) })
  await page.goto('http://127.0.0.1:5195/tools/truck-repair/preview.html?model=/models/veiculo-container.glb', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => window.ready, { timeout: 60000 })
  const geometry = await page.evaluate(async () => {
    const T = await import('three')
    const { criarVeiculoArticulado, girarRodas } = await import('/src/components/veiculo-rig.ts')
    const { modelo, rodas } = criarVeiculoArticulado(window.scene)
    const centers = rodas.map(w => w.pivot.getWorldPosition(new T.Vector3()))
    girarRodas(rodas, .2)
    const forward = rodas.every(w => Math.abs(w.pivot.rotation.z + .2 / w.raio) < 1e-8)
    const angles = rodas.map(w => w.pivot.rotation.z)
    girarRodas(rodas, 0)
    const stopped = rodas.every((w, i) => w.pivot.rotation.z === angles[i])
    modelo.updateMatrixWorld(true)
    const centered = rodas.every((w, i) => w.pivot.getWorldPosition(new T.Vector3()).distanceTo(centers[i]) < 1e-8)
    girarRodas(rodas, -.2)
    const reversible = rodas.every(w => Math.abs(w.pivot.rotation.z) < 1e-8)
    const marker = modelo.getObjectByName('container-siamac')
    // Filled marking faces must exist, not only extrusion outlines.
    const marking = modelo.getObjectByName('identificacao-portas')
    const normals = marking.geometry.attributes.normal.array
    const filledMarking = [...normals].some((v, i) => i % 3 === 0 && v > .9)
    // Trace real geometry. A door join must hit a closed rear surface, rather
    // than the distant front wall, at every sampled height and lateral offset.
    const seamLeaks = [], physical = []
    marker.traverse(o => { if (o.isMesh && !o.userData.markingText) physical.push(o) })
    const ray = new T.Raycaster()
    for (let i = 0; i <= 20; i++) for (const z of [-.009, 0, .009]) {
      const y = 1.08 + i * (3.07 - 1.08) / 20
      ray.set(new T.Vector3(7.1, y, z), new T.Vector3(-1, 0, 0))
      const hit = ray.intersectObjects(physical, false)[0]
      if (!hit || hit.point.x < 6.69) seamLeaks.push({ y, z, hitX: hit?.point.x })
    }
    // Sample filled triangles of each rear stencil at 0 and ±15 degrees.
    // Hardware must never be closer to the viewer than the painted letters.
    const occludedMarkings = []
    let markingSamples = 0
    for (const o of marker.children.filter(n => n.userData.face === 'rear')) {
      const positions = o.geometry.attributes.position, ids = o.geometry.index
      const triangles = (ids?.count ?? positions.count) / 3
      for (let i = 0; i < triangles; i += Math.max(1, Math.floor(triangles / 40))) {
        const center = new T.Vector3()
        for (let v = 0; v < 3; v++) center.add(new T.Vector3().fromBufferAttribute(positions, ids ? ids.getX(i * 3 + v) : i * 3 + v))
        center.multiplyScalar(1 / 3).applyMatrix4(o.matrixWorld)
        for (const angle of [-15, 0, 15]) {
          const toViewer = new T.Vector3(1, 0, Math.tan(T.MathUtils.degToRad(angle))).normalize()
          ray.set(center.clone().addScaledVector(toViewer, .4), toViewer.clone().negate())
          const hit = ray.intersectObjects(physical, false)[0]
          markingSamples++
          if (hit && hit.distance < .3995) occludedMarkings.push({ name: o.name, angle, hit: hit.object.name, point: hit.point.toArray() })
        }
      }
    }
    return { wheels: rodas.length, forward, stopped, centered, reversible, filledMarking, seamLeaks, markingSamples, occludedMarkings,
      markings: marker.children.filter(n => n.userData.markingText).map(n => ({ name: n.name, text: n.userData.markingText, face: n.userData.face })),
      bounds: new T.Box3().setFromObject(modelo).getSize(new T.Vector3()).toArray() }
  })
  assert.equal(geometry.wheels, 10)
  for (const key of ['forward', 'stopped', 'centered', 'reversible', 'filledMarking']) assert.equal(geometry[key], true, key)
  assert.equal(geometry.markings.filter(m => m.text === 'SIAU 634601 2').length, 5)
  assert.ok(Math.abs(geometry.bounds[0] - 13.852798828125) < .01)
  fs.writeFileSync(`${out}/door-regression.json`, JSON.stringify({ version: JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).version,
    seamLeaks: geometry.seamLeaks, markingSamples: geometry.markingSamples, occludedMarkings: geometry.occludedMarkings }, null, 2))
  assert.deepEqual(geometry.seamLeaks, [], 'Closed door seam must not expose the interior')
  assert.deepEqual(geometry.occludedMarkings, [], 'Rear markings must be clear of locking hardware')
  // One batched inspection: side profiles, rear doors, roof and front detail.
  for (const [name, camera, target] of [
    ['perspectiva', [-12, 6, 17], [0, 1.45, 0]],
    ['lateral', [0, 3.5, 17], [0, 1.5, 0]],
    ['outra-lateral', [0, 3.5, -17], [0, 1.5, 0]],
    ['portas', [11, 3.7, 4], [5.9, 1.8, 0]],
    ['portas-frontal', [12.2, 2.07413, 0], [6.73, 2.07413, 0]],
    ['teto', [2, 14, 6], [1, 1.6, 0]],
  ]) {
    await page.evaluate(({ camera, target }) => {
      document.getElementById('caption').textContent = 'SIAMAC · caminhão com contêiner'
      window.camera.position.set(...camera); window.controls.target.set(...target); window.controls.update()
    }, { camera, target })
    await page.waitForTimeout(200)
    await page.screenshot({ path: `${out}/${name}.png` })
  }
  console.log('Model geometry, wheel rig and five views verified.')
  const configText = fs.readFileSync(path.join(root, 'src/store/project.ts'), 'utf8').match(/export const CONFIG_PADRAO: ProjectConfig = (\{[\s\S]*?\n\})/)[1]
  const config = Function(`return (${configText})`)()
  delete config.modeloVeiculo
  await page.addInitScript(config => {
    const user = { id: 1, name: 'Teste', email: 'teste@example.test', company_id: 1, admin: true }
    window.siasgl = { session: async () => ({ user }), request: async () => ({ ok: true, data: { user, settings: null, projects: [] } }) }
    if (!localStorage.getItem('siadesk-container-test')) {
      localStorage.setItem('siadesk-storage-1-1', JSON.stringify({ state: { config: { ...config, nomeProjeto: 'Contêiner SIAMAC', mostrarVeiculo: true }, projetoAtivo: true }, version: 0 }))
      localStorage.setItem('siadesk-container-test', '1')
    }
  }, config)
  const loaded = []
  page.on('response', r => { if (r.url().includes('veiculo') && r.url().endsWith('.glb') && r.request().method() === 'GET') loaded.push(r.url()) })
  await page.goto('http://127.0.0.1:5195', { waitUntil: 'domcontentloaded', timeout: 30000 })
  await page.waitForTimeout(2000)
  await page.screenshot({ path: `${out}/siadesk-inicial.png` })
  console.log('Production UI:', (await page.locator('body').innerText()).slice(0, 500))
  await page.getByRole('button', { name: /Equipamentos/ }).click()
  const select = page.getByLabel('Modelo do caminhão')
  await expect(select).toHaveValue('padrao', { timeout: 60000 })
  await select.selectOption('container')
  await expect.poll(() => loaded.some(u => u.includes('veiculo-container.glb')), { timeout: 15000 }).toBe(true)
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('siadesk-storage-1-1')).state.config)
  const initial = await read()
  await select.blur()
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(220); await page.keyboard.up('ArrowRight')
  await page.waitForTimeout(1800)
  await expect.poll(async () => (await read()).offsetVeiculoX, { timeout: 15000 }).toBeGreaterThan(initial.offsetVeiculoX)
  await page.keyboard.press('v')
  await expect.poll(async () => (await read()).veiculoInvertido).toBe(true)
  await select.scrollIntoViewIfNeeded()
  await page.screenshot({ path: `${out}/siadesk-seletor.png` })
  await page.reload()
  await page.getByRole('button', { name: /Equipamentos/ }).click()
  await expect(select).toHaveValue('container')
  await select.selectOption('padrao')
  await expect.poll(async () => (await read()).modeloVeiculo).toBe('padrao')
  await select.selectOption('container')
  await expect.poll(async () => (await read()).modeloVeiculo).toBe('container')
  assert.ok(loaded.some(u => u.endsWith('/veiculo.glb')))
  assert.deepEqual(errors, [])
  const result = { geometry, selector: true, oldProjectsDefault: true, movement: true, inversion: true, projectRoundtrip: true, switchBack: true, errors }
  fs.writeFileSync(`${out}/tests.json`, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
