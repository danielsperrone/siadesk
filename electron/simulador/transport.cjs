const net = require('node:net')

// MBAP é enquadrado pelo comprimento, aceitando quadros fragmentados ou
// concatenados. Endereços Modbus são base zero; protocolo OWL, base um.
function modbusResponse(plc, pdu, holding, inputRegisters) {
  const fc = pdu[0]
  const error = code => Buffer.from([fc | 0x80, code])
  if (![1, 2, 3, 4, 5, 6, 15, 16].includes(fc)) return error(1)
  if (pdu.length < 5) return error(3)
  const address = pdu.readUInt16BE(1), count = pdu.readUInt16BE(3)
  if ([1, 2, 3, 4].includes(fc)) {
    if (pdu.length !== 5 || count < 1 || count > (fc <= 2 ? 2000 : 125)) return error(3)
    if (address + count > 65536) return error(2)
    const bytes = fc <= 2 ? Math.ceil(count / 8) : count * 2
    const result = Buffer.alloc(2 + bytes); result[0] = fc; result[1] = bytes
    for (let i = 0; i < count; i++) {
      if (fc === 1 && plc.memory[address + i]) result[2 + (i >> 3)] |= 1 << (i % 8)
      // Assim como no original, %I/%Q não são aliases dos bancos Modbus.
      if (fc >= 3) result.writeUInt16BE((fc === 3 ? holding : inputRegisters)[address + i], 2 + i * 2)
    }
    return result
  }
  if (fc === 5 || fc === 6) {
    if (pdu.length !== 5 || (fc === 5 && count !== 0 && count !== 0xff00)) return error(3)
    if (fc === 5) plc.writeCoils(address, [count === 0xff00], true)
    else holding[address] = count
    return Buffer.from(pdu)
  }
  if (pdu.length < 6 || count < 1 || count > (fc === 15 ? 1968 : 123)) return error(3)
  if (address + count > 65536) return error(2)
  const bytes = fc === 15 ? Math.ceil(count / 8) : count * 2
  if (pdu[5] !== bytes || pdu.length !== bytes + 6) return error(3)
  if (fc === 15) plc.writeCoils(address, Array.from({ length: count }, (_, i) => !!(pdu[6 + (i >> 3)] & (1 << (i % 8)))), true)
  else for (let i = 0; i < count; i++) holding[address + i] = pdu.readUInt16BE(6 + i * 2)
  return pdu.subarray(0, 5)
}

async function listen(plc, port, kind, log = () => {}) {
  const sockets = new Set(), holding = new Uint16Array(65536), inputRegisters = new Uint16Array(65536)
  const server = net.createServer(socket => {
    sockets.add(socket)
    socket.setNoDelay(true)
    let pending = Buffer.alloc(0)
    socket.on('error', () => {})
    socket.on('close', () => { sockets.delete(socket) })
    log(`${kind}: cliente conectado`)
    socket.on('data', chunk => {
      pending = Buffer.concat([pending, chunk])
      if (pending.length > 65536) return socket.destroy()
      if (kind === 'Modbus') {
        while (pending.length >= 7) {
          const length = pending.readUInt16BE(4)
          if (pending.readUInt16BE(2) !== 0 || length < 2 || length > 254) return socket.destroy()
          if (pending.length < length + 6) break
          const frame = pending.subarray(0, length + 6)
          pending = pending.subarray(length + 6)
          const response = modbusResponse(plc, frame.subarray(7), holding, inputRegisters)
          const header = Buffer.from(frame.subarray(0, 7)); header.writeUInt16BE(response.length + 1, 4)
          socket.write(Buffer.concat([header, response]))
          if ([5, 15].includes(frame[7])) log(`Modbus: escrita em %M${frame.readUInt16BE(8)}`)
        }
      } else {
        let end
        while ((end = pending.indexOf(10)) >= 0) {
          const line = pending.subarray(0, end).toString('latin1')
          pending = pending.subarray(end + 1)
          const commands = line.match(/ReadCoils\|\d+\|\d+|Write\|\d+\|[01]/g) || []
          for (const command of commands) {
            const [op, start, value] = command.split('|'), address = Number(start) - 1
            const count = op === 'ReadCoils' ? Number(value) : 1
            if (!Number.isInteger(address) || address < 0 || count < 1 || count > 2000 || address + count > 65536) { socket.write('Error|Endereco invalido\n'); continue }
            if (op === 'Write') {
              plc.writeCoils(address, [value === '1'], true)
              socket.write('Write|OK\n'); log(`OWL: escrita em %M${address}`)
            } else socket.write(`ReadCoils|${Array.from(plc.memory.slice(address, address + count)).join('|')}\n`)
          }
        }
      }
    })
  })
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve() })
  })
  server.on('error', err => log(`${kind}: ${err.message}`))
  return { port: server.address().port, clients: () => sockets.size, close: () => new Promise(resolve => { for (const socket of sockets) socket.destroy(); server.close(resolve) }) }
}
module.exports = { listen, modbusResponse }
