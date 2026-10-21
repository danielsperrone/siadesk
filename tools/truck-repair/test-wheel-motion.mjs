import assert from 'node:assert/strict'
import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5189'],
  { cwd: root, windowsHide: true, stdio: 'ignore' })
let browser
try {
  for (let i = 0; i < 100; i++) {
    try { if ((await fetch('http://127.0.0.1:5189')).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ channel: 'chrome', headless: true,
    args: ['--enable-webgl', '--use-gl=angle', '--use-angle=swiftshader'] })
  const page = await browser.newPage({ viewport: { width: 1600, height: 700 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto('http://127.0.0.1:5189/tools/truck-repair/preview.html?model=/models/veiculo.glb', { waitUntil: 'domcontentloaded', timeout: 60000 })
  await page.waitForFunction(() => window.ready, { timeout: 60000 })
  const result = await page.evaluate(async () => {
    const THREE = await import('three')
    const { criarVeiculoArticulado, girarRodas } = await import('/src/components/veiculo-rig.ts')
    const { modelo, rodas } = criarVeiculoArticulado(window.scene)
    const body = modelo.getObjectByName('Mesh10')
    modelo.updateMatrixWorld(true)
    const initialBody = body.matrixWorld.clone()
    const centers = rodas.map(w => w.pivot.getWorldPosition(new THREE.Vector3()))
    girarRodas(rodas, 0.2)
    const forward = rodas.every(w => Math.abs(w.pivot.rotation.z + 0.2 / w.raio) < 1e-8)
    const angles = rodas.map(w => w.pivot.rotation.z)
    girarRodas(rodas, 0)
    const stopped = rodas.every((w, i) => w.pivot.rotation.z === angles[i])
    modelo.updateMatrixWorld(true)
    const centered = rodas.every((w, i) => w.pivot.getWorldPosition(new THREE.Vector3()).distanceTo(centers[i]) < 1e-8)
    const fixedBody = body.matrixWorld.equals(initialBody)
    girarRodas(rodas, -0.2)
    const reversible = rodas.every(w => Math.abs(w.pivot.rotation.z) < 1e-8)
    girarRodas(rodas, -0.1)
    const reverse = rodas.every(w => w.pivot.rotation.z > 0)
    const sourceUntouched = []
    window.scene.traverse(n => { if (n.userData.wheelRadius) sourceUntouched.push(n.rotation.z === 0) })
    // Show the real model at a non-symmetric angle for visual inspection.
    window.scene.traverse(n => { if (n.userData.wheelRadius) n.rotation.z = 0.7 })
    window.setView('left')
    return { wheels: rodas.length, forward, stopped, centered, fixedBody, reversible, reverse,
      sourceUntouched: sourceUntouched.every(Boolean) }
  })
  await page.screenshot({ path: `${root}/tools/truck-repair/wheels-rotated.png` })
  assert.equal(result.wheels, 10)
  for (const [key, value] of Object.entries(result)) if (key !== 'wheels') assert.equal(value, true, key)
  assert.deepEqual(errors, [])
  console.log(JSON.stringify(result, null, 2))
} finally {
  await browser?.close()
  server.kill()
}
