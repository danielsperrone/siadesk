import { chromium } from '@playwright/test'
import fs from 'node:fs/promises'
import path from 'node:path'
import assert from 'node:assert/strict'
import { pathToFileURL } from 'node:url'

const browser = await chromium.launch({ channel: 'msedge', headless: true })
const architecture = process.argv.includes('--architecture')
const folder = architecture ? 'entregas/motion-owl-arquiteturas' : 'entregas/motion-owl'
const narration = architecture ? JSON.parse(await fs.readFile('src/motion/owl-architecture-timeline.json', 'utf8')) : null
const duration = architecture ? narration.duration : 34
const videos = architecture ? [
  ['OWL-arquiteturas-1080p.mp4', 1920, 1080],
  ['OWL-arquiteturas-1080x1080.mp4', 1080, 1080],
  ['OWL-arquiteturas-instagram-reels-1080x1920.mp4', 1080, 1920],
  ['OWL-arquiteturas-instagram-feed-1080x1350.mp4', 1080, 1350],
] : process.argv.includes('--instagram') ? [
  ['OWL-alerta-de-fraude-instagram-reels-1080x1920.mp4', 1080, 1920],
  ['OWL-alerta-de-fraude-instagram-feed-1080x1350.mp4', 1080, 1350],
] : [
  ['OWL-alerta-de-fraude-1080p.mp4', 1920, 1080],
  ['OWL-alerta-de-fraude-1080x1080.mp4', 1080, 1080],
]
try {
for (const [filename, width, height] of videos) {
const dest = path.resolve(folder, filename)
const data = await fs.readFile(dest)
const boxes = []
for (let offset = 0; offset < data.length;) {
  const size = data.readUInt32BE(offset), type = data.toString('ascii', offset + 4, offset + 8)
  assert.ok(size >= 8 && offset + size <= data.length)
  boxes.push({ type, offset, size }); offset += size
}
assert.ok(boxes.find(b => b.type === 'moov').offset < boxes.find(b => b.type === 'mdat').offset, 'O índice do vídeo deve ficar no início para reprodução progressiva no site')
if (architecture) {
  const moov = boxes.find(b => b.type === 'moov')
  const trackMetadata = data.subarray(moov.offset, moov.offset + moov.size)
  assert.ok(trackMetadata.includes(Buffer.from('soun')), 'A narração deve estar incorporada ao MP4 como faixa de áudio')
  assert.ok(trackMetadata.includes(Buffer.from('mp4a')), 'A narração deve utilizar AAC compatível com site e Instagram')
}
  const page = await browser.newPage({ viewport: { width, height } })
  await page.goto(pathToFileURL(dest).href, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => document.querySelector('video')?.readyState >= 2)
  const meta = await page.locator('video').evaluate(video => ({ duration: video.duration, width: video.videoWidth, height: video.videoHeight, error: video.error?.message }))
  assert.ok(Math.abs(meta.duration - duration) < .05); assert.equal(meta.width, width); assert.equal(meta.height, height); assert.equal(meta.error, undefined)
  for (const time of architecture ? [1, ...narration.chapters.map(c => (c.start + c.end) / 2), duration - .2] : [1, 5.1, 10.7, 17.3, 19.7, 24.2, 31.3, 33.8]) {
    await page.locator('video').evaluate((video, time) => new Promise((resolve, reject) => {
      video.addEventListener('seeked', () => resolve(true), { once: true })
      video.addEventListener('error', () => reject(new Error(video.error?.message)), { once: true })
      video.currentTime = time
    }), time)
  }
  await page.locator('video').evaluate(video => { video.currentTime = 0; video.muted = true; return video.play() })
  await page.waitForFunction(() => document.querySelector('video').currentTime > .2)
  await page.locator('video').evaluate(video => video.pause())
  console.log(`OK: MP4 H.264 ${architecture ? '+ narração AAC' : ''} reproduz no Edge, ${width}×${height}, ${duration} s, navegação em todas as cenas e índice no início. Bytes:`, data.length)
  await page.close()
}
} finally { await browser.close() }
