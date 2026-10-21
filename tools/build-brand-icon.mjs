import sharp from 'sharp'
import fs from 'node:fs/promises'

// ICO stores one PNG per Windows icon size, preserving the source alpha channel.
const sizes = [16, 24, 32, 48, 64, 128, 256]
const images = await Promise.all(sizes.map(size => sharp('public/brand/siadesk-icon.png').resize(size, size).png().toBuffer()))
const header = Buffer.alloc(6 + 16 * sizes.length)
header.writeUInt16LE(1, 2)
header.writeUInt16LE(sizes.length, 4)
let offset = header.length
images.forEach((image, index) => {
  const entry = 6 + index * 16
  header[entry] = sizes[index] % 256
  header[entry + 1] = sizes[index] % 256
  header.writeUInt16LE(1, entry + 4)
  header.writeUInt16LE(32, entry + 6)
  header.writeUInt32LE(image.length, entry + 8)
  header.writeUInt32LE(offset, entry + 12)
  offset += image.length
})
await fs.writeFile('public/brand/siadesk.ico', Buffer.concat([header, ...images]))
