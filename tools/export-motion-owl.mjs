import { chromium } from '@playwright/test'
import { spawn } from 'node:child_process'
import { once } from 'node:events'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'

const architecture = process.argv.includes('--architecture')
const output = path.resolve(architecture ? 'entregas/motion-owl-arquiteturas' : 'entregas/motion-owl')
const entry = architecture ? 'motion-owl-arquiteturas.html' : 'motion-owl.html'
const coverName = architecture ? 'owl-arquiteturas-capa' : 'owl-antifraude-capa'
const preview = process.argv.includes('--preview')
const production = process.argv.includes('--production')
const narration = architecture ? JSON.parse(await fs.readFile('src/motion/owl-architecture-timeline.json', 'utf8')) : null
const narratedTime = logical => {
  if (!narration) return logical
  const chapter = narration.chapters.find(c => logical >= c.logicalStart && logical < c.logicalEnd) ?? narration.chapters.at(-1)
  return chapter.start + (chapter.end - chapter.start) * (logical - chapter.logicalStart) / (chapter.logicalEnd - chapter.logicalStart)
}
const configurations = {
  landscape: { width: 1920, height: 1080, suffix: '', filename: 'OWL-alerta-de-fraude-1080p.mp4' },
  square: { width: 1080, height: 1080, suffix: '-1x1', filename: 'OWL-alerta-de-fraude-1080x1080.mp4' },
  reels: { width: 1080, height: 1920, suffix: '-instagram-reels', filename: 'OWL-alerta-de-fraude-instagram-reels-1080x1920.mp4' },
  feed: { width: 1080, height: 1350, suffix: '-instagram-feed', filename: 'OWL-alerta-de-fraude-instagram-feed-1080x1350.mp4' },
}
const formats = process.argv.includes('--all') ? Object.keys(configurations) : process.argv.includes('--instagram') ? ['reels', 'feed'] : [process.argv.includes('--square') ? 'square' : 'landscape']
const ffmpeg = process.env.FFMPEG_PATH || path.resolve('.motion-tools/imageio_ffmpeg/binaries/ffmpeg-win-x86_64-v7.1.exe')
const url = 'http://127.0.0.1:5219'
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', ...(production ? ['preview'] : []), '--host', '127.0.0.1', '--port', '5219', '--strictPort'], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] })
server.stdout.resume()
server.stderr.on('data', chunk => process.stderr.write(chunk))
let browser, encoder
try {
  await fs.mkdir(output, { recursive: true })
  for (let i = 0; i < 150; i++) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(1000) })).ok) break } catch {}
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  browser = await chromium.launch({ channel: 'msedge', headless: true })
  for (const format of formats) {
  const { width, height, suffix, filename } = configurations[format]
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 })
  const errors = [], failed = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('requestfailed', request => failed.push(`${request.url()} ${request.failure()?.errorText}`))
  await page.goto(`${url}/${entry}?render&format=${format}`, { waitUntil: 'domcontentloaded', timeout: 120000 })
  await page.waitForFunction(() => window.owlMotion?.ready, null, { timeout: 120000 })
  await page.evaluate(async () => { await document.fonts.load('700 80px "Manrope Variable"'); await document.fonts.ready })
  assert.equal(await page.evaluate(() => document.fonts.check('700 80px "Manrope Variable"')), true)
  assert.deepEqual(errors, [])
  assert.deepEqual(failed, [])
  const info = await page.evaluate(() => window.owlMotion.inspect())
  assert.equal(info.width, width); assert.equal(info.height, height); assert.equal(info.format, format)
  if (architecture) {
    assert.deepEqual(info.architectures, ['local', 'local-servidor', 'centralizado', 'nuvem', 'hibrida'])
    assert.deepEqual(info.engines, ['SQL Server Express', 'MySQL'])
  } else {
    assert.deepEqual(info.models, ['veiculo', 'balanca'])
    assert.equal(info.pesoDetectado, 54000)
  }
  console.log('Recursos locais e tipografia carregados:', { format, width, height, duration: info.duration, narration: info.narration, minTextSize: info.minTextSize })
  const previews = architecture ? [['bancos', 5], ['pesagem', 14], ['clientes', 24], ['local', 34], ['local-servidor', 45], ['centralizado', 57], ['nuvem', 69], ['hibrida-local', 77.5], ['hibrida-integracao', 83], ['hibrida-central', 88], ['encerramento', 95]] : [['passagem', 5.1], ['alerta', 10.7], ['auditoria', 17.3], ['email', 24.2], ['encerramento', 31.3]]
  for (const [name, time] of previews) {
    const frame = await page.evaluate(t => window.owlMotion.frame(t), narratedTime(time))
    await fs.writeFile(path.join(output, `preview-${name}${suffix}.png`), Buffer.from(frame.split(',')[1], 'base64'))
    if (architecture) {
      const layout = await page.evaluate(() => window.owlMotion.inspect())
      assert.deepEqual(layout.overflow, [], `Texto cortado: ${format}, ${name}`)
    }
  }
  const cover = await page.evaluate(() => window.owlMotion.poster())
  const coverPath = path.join(output, `${coverName}${suffix}.png`)
  await fs.writeFile(coverPath, Buffer.from(cover.split(',')[1], 'base64'))
  if (!architecture) {
    await page.evaluate(() => window.owlMotion.render(9.6))
    const exited = await page.evaluate(() => window.owlMotion.inspect())
    assert.ok(exited.truckMax[0] < -8, 'O caminhão inteiro deve sair da balança antes do alerta')
    assert.ok(exited.wheels > 0, 'As rodas do veículo original devem ser articuladas')
  }
  if (preview) {
    console.log('Prévia validada:', format, output)
  } else {
    const dest = path.join(output, architecture ? filename.replace('alerta-de-fraude', 'arquiteturas') : filename)
    const temp = dest.replace('.mp4', '.rendering.mp4')
    const audioArgs = architecture ? ['-i', path.resolve('public/brand/motion-owl/owl-arquiteturas-narracao.mp3')] : []
    const mixArgs = architecture ? ['-map', '0:v:0', '-map', '1:a:0', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-af', 'apad', '-t', String(narration.duration), '-metadata', 'comment=Narração em português brasileiro; OWL / SIAMAC'] : ['-an']
    encoder = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'warning', '-f', 'image2pipe', '-framerate', '30', '-vcodec', 'png', '-i', 'pipe:0', ...audioArgs, '-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...mixArgs, temp], { windowsHide: true, stdio: ['pipe', 'ignore', 'pipe'] })
    encoder.stderr.on('data', chunk => process.stderr.write(chunk))
    const done = once(encoder, 'close')
    const frames = Math.round(await page.evaluate(() => window.owlMotion.duration * 30))
    for (let i = 0; i < frames; i++) {
      const data = await page.evaluate(t => window.owlMotion.frame(t), i / 30)
      const bytes = Buffer.from(data.split(',')[1], 'base64')
      if (!encoder.stdin.write(bytes)) await once(encoder.stdin, 'drain')
      if (i % 90 === 0) console.log(`Render ${format}: ${i}/${frames} frames (${Math.floor(i / frames * 100)}%)`)
    }
    encoder.stdin.end()
    const [code] = await done
    assert.equal(code, 0, 'FFmpeg deve concluir sem erro')
    assert.deepEqual(errors, [])
    await fs.rename(temp, dest)
    const convert = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', coverPath, '-quality', '86', coverPath.replace('.png', '.webp')], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
    convert.stderr.on('data', chunk => process.stderr.write(chunk))
    assert.equal((await once(convert, 'close'))[0], 0)
    if (format === 'reels' || format === 'feed') {
      const jpeg = spawn(ffmpeg, ['-y', '-hide_banner', '-loglevel', 'error', '-i', coverPath, '-q:v', '2', '-frames:v', '1', coverPath.replace('.png', '.jpg')], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] })
      jpeg.stderr.on('data', chunk => process.stderr.write(chunk))
      assert.equal((await once(jpeg, 'close'))[0], 0)
    }
    console.log('MP4 final:', dest, 'bytes:', (await fs.stat(dest)).size)
  }
  await page.close()
  }
} finally {
  await browser?.close()
  server.kill()
  if (encoder && encoder.exitCode === null) encoder.kill()
}
