const { test } = require('node:test')
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const net = require('node:net')
const { PLC } = require('../../electron/simulador/core.cjs')
const { listen, modbusResponse } = require('../../electron/simulador/transport.cjs')
const step = (plc, ms) => { for (let i = 0; i < ms; i += 10) plc.step(10) }

test('19.000 varreduras iguais ao interpretador Python oficial, incluindo perda de presença e comandos aleatórios', () => {
  const oracle = JSON.parse(execFileSync('python', ['tools/clp-oracle.py'], { encoding: 'utf8', maxBuffer: 4e6 }))
  const plc = new PLC(), actions = new Map(oracle.actions), digest = createHash('sha256')
  for (let frame = 0; frame < oracle.frames; frame++) {
    for (const [kind, index, value] of actions.get(frame) || []) {
      if (kind === 'M') plc.writeCoils(index, [value]); else plc.inputs[`%I0.${index}`] = value
    }
    plc.step(10)
    digest.update(Buffer.from([...plc.memory.slice(0, 256), ...Object.values(plc.inputs).map(Number), ...Object.values(plc.outputs).map(Number)]))
  }
  assert.equal(digest.digest('hex'), oracle.sha256)
})

test('cancelas A/B e intertravamento dos sensores seguem firmware', () => {
  for (const [open, close, memory, sensor] of [[2, 3, 12, 0], [4, 5, 17, 1]]) {
    const plc = new PLC()
    plc.writeCoils(open, [true]); step(plc, 210)
    assert.equal(plc.read(`%M${memory}`), true)
    plc.inputs[`%I0.${sensor}`] = false; plc.writeCoils(close, [true]); step(plc, 300)
    assert.equal(plc.read(`%M${memory}`), true)
    plc.inputs[`%I0.${sensor}`] = true; step(plc, 210)
    assert.equal(plc.read(`%M${memory}`), false)
  }
})

test('quatro semáforos independentes e memórias sem aliases de E/S', () => {
  const plc = new PLC(); plc.writeCoils(6, [true, false, true, false]); plc.writeCoils(100, [true]); plc.writeCoils(256, [true]); plc.step(10)
  assert.deepEqual(Object.values(plc.snapshot().lights), ['verde', 'vermelho', 'verde', 'vermelho'])
  assert.equal(plc.read('%I0.0'), true); assert.equal(plc.read('%Q0.0'), false)
  plc.writeCoils(26, [true]); plc.step(10)
  assert.deepEqual(Object.values(plc.snapshot().lights), ['verde', 'verde', 'verde', 'verde'])
})

function connect(port) {
  return new Promise((resolve, reject) => { const socket = net.connect(port, '127.0.0.1', () => resolve(socket)); socket.once('error', reject) })
}
function collect(socket, length) {
  return new Promise((resolve, reject) => {
    let bytes = Buffer.alloc(0)
    const timer = setTimeout(() => { socket.off('data', receive); reject(new Error('Resposta ausente')) }, 2000)
    function receive(chunk) { bytes = Buffer.concat([bytes, chunk]); if (bytes.length >= length) { clearTimeout(timer); socket.off('data', receive); resolve(bytes) } }
    socket.on('data', receive)
  })
}
function frame(pdu, id = 1) { const h = Buffer.from([0, id, 0, 0, 0, pdu.length + 1, 1]); return Buffer.concat([h, Buffer.from(pdu)]) }

test('Modbus TCP real: fragmentação, concatenação, FC15, FC1 e erros', async () => {
  const plc = new PLC(), server = await listen(plc, 0, 'Modbus'), socket = await connect(server.port)
  try {
    const write = frame([5, 0, 6, 255, 0]), response = collect(socket, 24)
    socket.write(write.subarray(0, 3)); socket.write(Buffer.concat([write.subarray(3), frame([5, 0, 8, 255, 0], 2)]))
    assert.equal((await response).length, 24); assert.equal(plc.memory[6], 1); assert.equal(plc.memory[8], 1)
    const multi = collect(socket, 12); socket.write(frame([15, 0, 6, 0, 4, 1, 10])); await multi
    const read = collect(socket, 10); socket.write(frame([1, 0, 6, 0, 4])); assert.equal((await read)[9], 10)
    const invalid = modbusResponse(plc, Buffer.from([15, 0, 0, 0, 9, 1, 0]), [], [])
    assert.deepEqual([...invalid], [143, 3])
  } finally { socket.destroy(); await server.close() }
})

test('Protocolo OWL mantém base um e não converte M0 em M1', async () => {
  const plc = new PLC(), server = await listen(plc, 0, 'OWL'), socket = await connect(server.port)
  try {
    const write = collect(socket, 9); socket.write('Write|1|1\n'); assert.equal((await write).toString(), 'Write|OK\n')
    step(plc, 2200); assert.equal(plc.snapshot().connected, false)
    const second = collect(socket, 9); socket.write('Write|2|1\n'); await second; step(plc, 20)
    assert.equal(plc.snapshot().connected, true)
    assert.deepEqual(plc.presenceWrites, [1, 1])
    const read = collect(socket, 14); socket.write('ReadCoils|1|2\n'); assert.equal((await read).toString(), 'ReadCoils|1|0\n')
  } finally { socket.destroy(); await server.close() }
})
