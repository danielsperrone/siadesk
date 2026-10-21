import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import http from 'node:http'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { chromium, expect } from '@playwright/test'

const root = fileURLToPath(new URL('../', import.meta.url))
const out = path.join(root, 'reports/ocr-5460')
fs.mkdirSync(out, { recursive: true })
const api = (await build({ stdin: { contents: `export * from './src/simulator/optica-ocr'; export * from './src/components/camera-ocr-rig'; export {posicionarCamera} from './src/simulator/cameras';`, resolveDir: root }, bundle: true, format: 'esm', platform: 'browser', external: ['three'], write: false })).outputFiles[0].text
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.glb': 'model/gltf-binary', '.png': 'image/png', '.woff2': 'font/woff2' }
const server = http.createServer((req, res) => {
  let url = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
  if (url === '/ocr-test-api.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(api); return }
  if (url === '/') url = '/dist/index.html'
  else if (/^\/(assets|models|brand|etiquetas)\//.test(url)) url = '/dist' + url
  const file = path.resolve(root, '.' + url)
  if (!file.startsWith(root) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.statusCode = 404; res.end(); return }
  res.setHeader('Content-Type', mime[path.extname(file)] || 'application/octet-stream')
  if (req.method === 'HEAD') { res.end(); return }
  fs.createReadStream(file).pipe(res)
})
await new Promise(resolve => server.listen(5197, '127.0.0.1', resolve))
let browser
try {
  browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1480, height: 960 } })
  const errors = []
  page.on('pageerror', e => errors.push(e.message))
  await page.goto('http://127.0.0.1:5197/tools/truck-repair/preview.html?model=/models/camera-ocr.glb')
  await page.waitForFunction(() => window.ready)
  const geometry = await page.evaluate(async () => {
    const T = await import('three'), api = await import('/ocr-test-api.js')
    const source = window.scene.getObjectByName('Mesh1')
    let root = source
    while (root.parent && root.parent !== window.scene) root = root.parent
    const { modelo, cabeca } = api.criarCameraOcrArticulada(root)
    modelo.updateMatrixWorld(true)
    const fixed = ['Mesh1', 'Mesh2', 'Mesh3', 'Mesh4', 'Mesh5'].map(n => ({ node: modelo.getObjectByName(n), matrix: modelo.getObjectByName(n).matrixWorld.clone() }))
    const center = cabeca.getWorldPosition(new T.Vector3())
    const probe = new T.Object3D(), base = api.opticaOcr()
    probe.position.copy(base.origem)
    probe.quaternion.setFromUnitVectors(new T.Vector3(0, 0, -1), base.direcao)
    modelo.add(probe); modelo.updateMatrixWorld(true); cabeca.attach(probe)
    const checks = []
    for (const angle of [-35, -10, 0, 20, 35]) {
      api.inclinarCameraOcr(cabeca, angle); modelo.updateMatrixWorld(true)
      const optical = api.opticaOcr(angle)
      checks.push({ angle,
        supportFixed: fixed.every(x => x.node.matrixWorld.elements.every((v, i) => Math.abs(v - x.matrix.elements[i]) < 1e-9)),
        jointFixed: cabeca.getWorldPosition(new T.Vector3()).distanceTo(center) < 1e-9,
        lensMatches: probe.getWorldPosition(new T.Vector3()).distanceTo(optical.origem) < 1e-9,
        directionMatches: new T.Vector3(0, 0, -1).transformDirection(probe.matrixWorld).distanceTo(optical.direcao) < 1e-9,
      })
    }
    const p = { tipo: 'camera-ocr', ancora: [-.15, .07, .08], cameraRtsp: { ativa: false, abertura: 92, perfil: api.PERFIL_5460, focalMm: 2.7, inclinacao: 0 } }
    const wide = api.campoHorizontal(p)
    p.cameraRtsp.focalMm = 12
    const tele = api.campoHorizontal(p)
    const legacy = api.campoHorizontal({ tipo: 'camera-ocr', cameraRtsp: { ativa: false, abertura: 54 } })
    const widths = [2.7, 4, 6, 8, 12].map(focalMm => api.campoHorizontal({ ...p, cameraRtsp: { ...p.cameraRtsp, focalMm } }))
    const obj = new T.Group(); obj.position.set(2, 1.8, -2.2); obj.rotation.y = .6
    const camera = new T.PerspectiveCamera(45, 2688 / 1520, .025, 30)
    api.posicionarCamera(camera, p, obj)
    const optical = api.opticaOcr(0)
    const expectedOrigin = optical.origem.sub(new T.Vector3(...p.ancora)).applyMatrix4(obj.matrixWorld)
    const projected = []
    const direction = camera.getWorldDirection(new T.Vector3()), right = direction.clone().cross(camera.up).normalize(), up = right.clone().cross(direction)
    for (const x of [-1.01, -.99, 0, .99, 1.01]) for (const y of [-1.01, -.99, 0, .99, 1.01]) {
      const at = camera.position.clone().addScaledVector(direction, 5)
        .addScaledVector(right, x * 5 * Math.tan(api.campoHorizontal(p) * Math.PI / 360))
        .addScaledVector(up, y * 5 * Math.tan(api.campoVertical(p, camera.aspect) * Math.PI / 360))
      const ndc = at.clone().project(camera)
      projected.push(api.dentroCampoCamera(at, camera.position, direction, 8, api.campoHorizontal(p), api.campoVertical(p, camera.aspect)) === (Math.abs(ndc.x) <= 1 && Math.abs(ndc.y) <= 1))
    }
    // Display the complete camera, with a fixed mounting bracket and moving head.
    window.scene.remove(root); window.scene.add(modelo)
    window.ocrRig = { modelo, cabeca, api }
    document.getElementById('caption').textContent = 'OCR · articulação da cabeça · suporte fixo'
    window.camera.position.set(.55, .35, .65); window.camera.near = .001
    window.controls.target.set(0, .065, 0); window.controls.update(); window.camera.updateProjectionMatrix()
    return { checks, wide, tele, legacy, widths, detectorMatchesImage: projected.every(Boolean), anchorMatches: camera.position.distanceTo(expectedOrigin) < 1e-9,
      nativeResolution: api.dimensoesCamera(2688), originalPitch: api.ELEVACAO_ORIGINAL_OCR }
  })
  for (const c of geometry.checks) for (const [key, value] of Object.entries(c)) if (key !== 'angle') assert.equal(value, true, `${key} at ${c.angle}°`)
  assert.ok(Math.abs(geometry.wide - 92) < 1e-8)
  assert.ok(Math.abs(geometry.tele - 46.1) < 1e-8)
  assert.equal(geometry.legacy, 54)
  assert.ok(geometry.widths.every((w, i) => i === 0 || w < geometry.widths[i - 1]))
  assert.equal(geometry.detectorMatchesImage, true)
  assert.equal(geometry.anchorMatches, true)
  assert.deepEqual(geometry.nativeResolution, { largura: 2688, altura: 1520 })
  for (const angle of [-30, 0, 30]) {
    await page.evaluate(angle => window.ocrRig.api.inclinarCameraOcr(window.ocrRig.cabeca, angle), angle)
    await page.screenshot({ path: path.join(out, `camera-${angle}.png`) })
  }

  // Measured coverage of the actual truck model. Distances refer to the rear
  // door plane, rather than the pole-to-vehicle centre or a slanted distance.
  const planning = await page.evaluate(async () => {
    const T = await import('three'), api = await import('/ocr-test-api.js')
    const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js')
    const vehicle = (await new GLTFLoader().loadAsync('/models/veiculo-container.glb')).scene
    vehicle.position.y = .55; vehicle.updateMatrixWorld(true)
    const scene = new T.Scene(); scene.background = new T.Color('#edf0f3')
    scene.add(vehicle, new T.HemisphereLight(0xffffff, 0x777777, 2.2))
    const light = new T.DirectionalLight(0xffffff, 2.1); light.position.set(15, 7, 5); scene.add(light)
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 176
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#f7f7f4'; ctx.fillRect(0, 0, 512, 176)
    ctx.fillStyle = '#1856a0'; ctx.fillRect(0, 0, 512, 34); ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.font = 'bold 22px Arial'; ctx.fillText('BRASIL', 256, 26)
    ctx.fillStyle = '#111820'; ctx.font = 'bold 100px Arial'; ctx.fillText('XYZ4E56', 256, 137, 490)
    const plate = new T.Mesh(new T.PlaneGeometry(.543, .149), new T.MeshBasicMaterial({ map: new T.CanvasTexture(canvas) }))
    plate.position.set(6.781034, .485763, .041394); plate.rotation.y = Math.PI / 2; vehicle.add(plate); vehicle.updateMatrixWorld(true)
    const targets = []
    for (const x of [6.73]) for (const y of [.96, 3.18826]) for (const z of [-1.04834, 1.04834]) targets.push(new T.Vector3(x, y, z).applyMatrix4(vehicle.matrixWorld))
    for (const y of [-.149 / 2, .149 / 2]) for (const z of [-.543 / 2, .543 / 2]) targets.push(new T.Vector3(6.781034, .485763 + y, .041394 + z).applyMatrix4(vehicle.matrixWorld))
    const renderCamera = new T.PerspectiveCamera(45, 2688 / 1520, .025, 180)
    const rows = []
    for (const d of [3, 4, 5, 6, 7, 8]) for (const focalMm of [2.7, 4, 6, 8, 12]) for (const angle of [0, 2, 3, 4]) {
      const p = { tipo: 'camera-ocr', cameraRtsp: { ativa: false, abertura: 92, perfil: api.PERFIL_5460, focalMm, inclinacao: angle } }
      const position = new T.Vector3(6.73 + d, 2, 2.2)
      const base = api.opticaOcr(angle), yaw = Math.atan2(base.direcao.z, base.direcao.x) - Math.atan2(-2.2, -d)
      const obj = new T.Group(); obj.rotation.y = yaw
      obj.position.copy(position).sub(base.origem.clone().applyQuaternion(obj.quaternion))
      api.posicionarCamera(renderCamera, p, obj)
      const points = targets.map(v => v.clone().project(renderCamera))
      const inFrame = points.every(v => v.z < 1 && Math.abs(v.x) <= .94 && Math.abs(v.y) <= .94)
      const direction = renderCamera.getWorldDirection(new T.Vector3())
      const conservative = targets.every(v => api.dentroCampoCamera(v, position, direction, 30, api.campoHorizontal(p) * .94, Math.min(api.campoVertical(p, renderCamera.aspect), api.campoVerticalFicha(p)) * .94))
      const pxHeight = (height, x = 6.757, y = 2.43, z = -.5) => {
        const a = new T.Vector3(x, y + .55, z).project(renderCamera), b = new T.Vector3(x, y + height + .55, z).project(renderCamera)
        return Math.hypot((b.x - a.x) * 2688 / 2, (b.y - a.y) * 1520 / 2)
      }
      const a = new T.Vector3(6.781034, 1.035763, -.230106).project(renderCamera), b = new T.Vector3(6.781034, 1.035763, .312894).project(renderCamera)
      rows.push({ longitudinal: d, lateralFromLaneCenter: 2.2, lensHeight: 2, focalMm, angle, yawToVehicle: Math.atan2(2.2, d) * 180 / Math.PI, horizontal: api.campoHorizontal(p), vertical: api.campoVertical(p, renderCamera.aspect), conservativeVertical: api.campoVerticalFicha(p), inFrame, conservative,
        plateWidthPixels: Math.hypot((b.x - a.x) * 2688 / 2, (b.y - a.y) * 1520 / 2), codeHeightPixels: pxHeight(.09), weightHeightPixels: pxHeight(.042), cscHeightPixels: pxHeight(.019, 6.768, 1.28, .5) })
      if (d === 6 && focalMm === 8 && angle === 3) {
        window.renderer.setSize(2688, 1520)
        window.renderer.render(scene, renderCamera)
        window.captureOcr = window.renderer.domElement.toDataURL('image/png')
      }
    }
    return { rows, capture: window.captureOcr }
  })
  fs.writeFileSync(path.join(out, 'enquadramento-6m-8mm.png'), Buffer.from(planning.capture.split(',')[1], 'base64'))
  const recommended = planning.rows.find(r => r.longitudinal === 6 && r.focalMm === 8 && r.angle === 3)
  assert.equal(recommended.inFrame, true)
  assert.equal(recommended.conservative, true)
  fs.writeFileSync(path.join(out, 'distancias.json'), JSON.stringify({ version: '0.2.7', assumptions: 'Portas traseiras e placa do reboque; lente a 2 m de altura e 2,2 m do eixo da pista; modelo na altura de calibração 0,55 m; margem de 6%; pixels em 4 MP.', recommended, rows: planning.rows }, null, 2))

  // The production UI runs without a camera server for the local aiming preview.
  const configText = fs.readFileSync(path.join(root, 'src/store/project.ts'), 'utf8').match(/export const CONFIG_PADRAO: ProjectConfig = (\{[\s\S]*?\n\})/)[1]
  const config = Function(`return (${configText})`)()
  await page.addInitScript(config => {
    const user = { id: 7, name: 'Teste OCR', company_id: 7, admin: true, email: 'ocr@example.test' }
    window.siasgl = { session: async () => ({ user }), request: async () => ({ ok: true, data: { user, settings: null, projects: [] } }) }
    if (!localStorage.getItem('ocr-test-ready')) {
      localStorage.setItem('siadesk-storage-7-7', JSON.stringify({ state: { projetoAtivo: true, config: { ...config, nomeProjeto: 'Óptica OCR 5460', mostrarVeiculo: true, modeloVeiculo: 'container',
        siap01: false, siap02: true, siap03: false, siap04: false, siap05: false, siap06: false, siap07: false, siap08: false, siap09: false,
        perifericosSiap02: [{ id: 'ocr-test', tipo: 'camera-ocr', altura: 2, rotacaoY: -30, cameraRtsp: { ativa: false, abertura: 92, perfil: 'intelbras-vip-5460-lpr-ia', focalMm: 2.7, inclinacao: 0 } }] } }, version: 0 }))
      localStorage.setItem('ocr-test-ready', '1')
    }
  }, config)
  await page.goto('http://127.0.0.1:5197')
  await page.getByRole('button', { name: /Equipamentos/ }).click()
  // Each installed pole has its own "Periféricos" button; only SIAP02 is active.
  await page.getByRole('button', { name: 'Periféricos', exact: true }).click()
  await page.getByRole('button', { name: 'Configurar Câmera OCR', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Configurar Câmera OCR' })
  await expect(dialog.getByLabel('Perfil da câmera OCR')).toHaveValue('intelbras-vip-5460-lpr-ia')
  await dialog.getByLabel('Distância focal da câmera OCR').fill('12')
  await expect(dialog).toContainText('46,1°')
  await dialog.getByLabel('Ângulo vertical em graus').fill('20')
  await dialog.getByRole('button', { name: 'Ver imagem da câmera', exact: true }).click()
  await expect(dialog.locator('.camera-preview')).toBeVisible({ timeout: 30000 })
  assert.equal(await dialog.getByLabel('Ativar transmissão RTSP', { exact: true }).isChecked(), false)
  await dialog.screenshot({ path: path.join(out, 'controles-desktop.png') })
  await page.setViewportSize({ width: 900, height: 768 })
  await dialog.screenshot({ path: path.join(out, 'controles-compacto.png') })
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true)
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('siadesk-storage-7-7')).state.config.perifericosSiap02[0].cameraRtsp)
  assert.equal(saved.focalMm, 12); assert.equal(saved.inclinacao, 20)
  await page.reload(); await page.getByRole('button', { name: /Equipamentos/ }).click()
  await page.getByRole('button', { name: 'Periféricos', exact: true }).click()
  await page.getByRole('button', { name: 'Configurar Câmera OCR', exact: true }).click()
  await expect(page.getByLabel('Distância focal da câmera OCR')).toHaveValue('12')
  await expect(page.getByLabel('Ângulo vertical em graus')).toHaveValue('20')
  assert.deepEqual(errors, [])
  const result = { version: '0.2.7', geometry, recommended, localPreviewWithoutRtsp: true, persistence: true, errors }
  fs.writeFileSync(path.join(out, 'tests.json'), JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser?.close()
  await new Promise(resolve => server.close(resolve))
}
