// Protocolo de Software/Blibliotecas Feitas/uSIADisplaySpider.pas, no OWL.
const PREFIX = Buffer.from([1, 2, 80, 1])
const ACCENTS = { 128: 'Ç', 129: 'ç', 130: 'À', 131: 'Á', 132: 'Â', 133: 'Ã', 134: 'É', 135: 'Ê', 136: 'Í', 141: 'à', 142: 'á', 143: 'â', 144: 'ã', 145: 'é', 146: 'ê', 147: 'í', 148: 'ó', 149: 'ô', 151: 'ú' }
function crc16(bytes) {
  let crc = 0xffff
  for (const byte of bytes) {
    crc ^= byte << 8
    for (let bit = 0; bit < 8; bit++) crc = ((crc << 1) ^ (crc & 0x8000 ? 0x1021 : 0)) & 0xffff
  }
  return crc
}
function decode(frame) {
  let mensagem = '', modo = 'texto'
  const efeitos = []
  for (let i = 13; i < frame.length - 3; i++) {
    const byte = frame[i]
    if (byte === 170) {
      const command = frame[++i]
      if (command === 65) { mensagem = ''; modo = 'apagado' }
      if (command === 29) modo = 'relogio'
      if (command === 30) modo = 'data'
      if (command === 34) efeitos.push('pisca')
      if (command === 54) efeitos.push('desce')
      if (command === 51) efeitos.push('sobe')
      if (command === 62) efeitos.push('explode')
      if ([64, 34, 15].includes(command)) i++
    } else if (byte >= 32 || byte === 10 || byte === 13) mensagem += ACCENTS[byte] ?? String.fromCharCode(byte)
  }
  return { mensagem, modo, efeitos }
}
class SpiderParser {
  constructor(onFrame, onInvalid = () => {}) { this.buffer = Buffer.alloc(0); this.onFrame = onFrame; this.onInvalid = onInvalid }
  push(data) {
    this.buffer = Buffer.concat([this.buffer, data])
    while (this.buffer.length >= 4) {
      const start = this.buffer.indexOf(PREFIX)
      if (start < 0) { this.buffer = this.buffer.subarray(-3); return }
      this.buffer = this.buffer.subarray(start)
      if (this.buffer.length < 16) return
      // O OWL guarda o comprimento em um byte; textos longos podem dar a volta em 256.
      let size = 16 + this.buffer[12]
      while (size <= this.buffer.length && size <= 4096 && this.buffer[size - 3] !== 3) size += 256
      if (size > this.buffer.length || size > 4096) {
        const next = this.buffer.indexOf(PREFIX, 4)
        if (next >= 0) { this.onInvalid(); this.buffer = this.buffer.subarray(next); continue }
        if (this.buffer.length > 4096) { this.onInvalid(); this.buffer = this.buffer.subarray(-3) }
        return
      }
      const frame = this.buffer.subarray(0, size)
      this.buffer = this.buffer.subarray(size)
      if (crc16(frame.subarray(0, -2)) !== frame.readUInt16BE(size - 2)) { this.onInvalid(); continue }
      this.onFrame(decode(frame))
    }
  }
}
module.exports = { SpiderParser, crc16 }
