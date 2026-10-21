import { test } from 'node:test'
import assert from 'node:assert/strict'
import net from 'node:net'
import { Group, Vector3 } from 'three'
import { localizarRodas } from '../../electron/balanca/rodas.mjs'
import { calcularApoio, PesoDinamico } from '../../electron/balanca/fisica.mjs'
import { pacoteLider, ServidorBalanca } from '../../electron/balanca/server.mjs'

const plataforma = { minX: -8, maxX: 8, minZ: -1.6, maxZ: 1.6 }
const sample = (alvo, extra = {}) => ({ alvo, pesoTotal: 40000, totalRodas: 10, rodasDentro: 10, emMovimento: false, ...extra })
const advance = (physics, time) => { let value; for (let i = 0; i < time * 100; i++) value = physics.avancar(.01); return value }

test('pesagem acompanha rodas substituídas no mesmo grupo e zera ao sair da plataforma', () => {
  const vehicle = new Group(), point = new Vector3(), physics = new PesoDinamico()
  const modelo = () => {
    const group = new Group()
    for (const z of [-1, 1]) {
      const roda = new Group()
      roda.userData.wheelRadius = .5
      roda.position.set(0, .5, z)
      group.add(roda)
    }
    return group
  }
  const original = modelo()
  vehicle.add(original)
  const ler = () => {
    const apoio = calcularApoio(localizarRodas(vehicle, point), plataforma)
    physics.receber(sample(40000 * apoio.fracao, apoio))
    return advance(physics, 2.01)
  }
  assert.equal(ler().peso, 40000)
  vehicle.remove(original)
  vehicle.add(modelo())
  vehicle.position.x = 20
  assert.equal(ler().peso, 0)
  assert.equal(physics.snapshot().rodasDentro, 0)
  vehicle.position.x = 0
  assert.equal(ler().peso, 40000)
  vehicle.clear()
  assert.equal(ler().peso, 0)
  assert.equal(physics.snapshot().totalRodas, 0)
})

test('peso proporcional aos centros das rodas, com transição contínua nas quatro bordas', () => {
  const wheels = Array.from({ length: 10 }, (_, i) => ({ x: i < 4 ? 9 : 0, z: i % 2 ? 1 : -1 }))
  assert.equal(calcularApoio(wheels, plataforma).fracao, .6)
  assert.equal(calcularApoio(wheels, plataforma).rodasDentro, 6)
  for (const [axis, edge] of [['x', 8], ['x', -8], ['z', 1.6], ['z', -1.6]]) {
    const point = { x: 0, z: 0, [axis]: edge }
    assert.equal(calcularApoio([point], plataforma).fracao, .5)
    assert.equal(calcularApoio([{ ...point, [axis]: edge + Math.sign(edge) * .2 }], plataforma).fracao, 0)
    assert.equal(calcularApoio([{ ...point, [axis]: edge - Math.sign(edge) * .2 }], plataforma).fracao, 1)
  }
  assert.equal(calcularApoio([], plataforma).fracao, 0)
})
test('estabiliza em dois segundos e movimentação interna tem oscilação pequena', () => {
  const physics = new PesoDinamico()
  physics.receber(sample(40000))
  assert.equal(advance(physics, 1.9).estavel, false)
  assert.deepEqual([advance(physics, .11).peso, physics.snapshot().estavel], [40000, true])
  physics.receber(sample(40000, { emMovimento: true }))
  const values = Array.from({ length: 40 }, () => physics.avancar(.05))
  assert(values.every(v => !v.estavel && Math.abs(v.peso - 40000) < 30))
  assert(new Set(values.map(v => v.peso)).size > 5)
  physics.receber(sample(40000)); assert.equal(advance(physics, 2.01).peso, 40000)
  assert.equal(physics.snapshot().estavel, true)
  physics.receber(sample(20000, { rodasDentro: 5 })); assert.equal(advance(physics, 2.01).peso, 20000)
  physics.receber(sample(0, { rodasDentro: 0 })); assert.equal(advance(physics, 2.01).peso, 0)
})
test('protocolo Líder reproduz os 11 bytes lidos pelo OWL, com E/I e sete dígitos', () => {
  assert.deepEqual([...pacoteLider(2000, true)], [1, 48, 48, 48, 50, 48, 48, 48, 32, 69, 2])
  assert.equal(pacoteLider(40000, false).toString('ascii'), '\x010040000 I\x02')
  assert.equal(pacoteLider(0, true).length, 11)
})
const freePort = () => new Promise(resolve => { const server = net.createServer(); server.listen(0, '127.0.0.1', () => { const p = server.address().port; server.close(() => resolve(p)) }) })
test('TCP transmite continuamente, conta clientes e libera porta ao reconfigurar', async () => {
  const server = new ServidorBalanca(), porta = await freePort(), next = await freePort()
  let client
  try {
    await server.configurar(porta)
    assert.equal(server.snapshot().running, true)
    const frames = []
    client = net.connect(porta, '127.0.0.1')
    client.on('data', bytes => frames.push(bytes))
    await new Promise((resolve, reject) => { client.once('connect', resolve); client.once('error', reject) })
    server.receber(sample(40000)); await new Promise(r => setTimeout(r, 2400))
    const received = Buffer.concat(frames)
    assert(received.length >= 100)
    for (let i = 0; i < received.length; i += 11) { assert.equal(received[i], 1); assert.equal(received[i + 10], 2) }
    assert(received.includes(pacoteLider(40000, true)))
    assert.equal(server.snapshot().clients, 1)
    await server.configurar(next)
    assert.equal(server.snapshot().clients, 0); assert.equal(server.snapshot().porta, next)
    assert.equal(server.snapshot().peso, 40000)
    await assert.rejects(server.configurar(0), /porta/)
    assert.equal(server.snapshot().running, true)
    assert.throws(() => server.receber(sample(NaN)), /inválida/)
    const occupied = net.createServer()
    await new Promise(resolve => occupied.listen(0, '127.0.0.1', resolve))
    try {
      await server.configurar(occupied.address().port)
      assert.equal(server.snapshot().running, false)
      assert.match(server.snapshot().error, /já está em uso/)
      await server.configurar(next)
      assert.equal(server.snapshot().running, true)
      assert.equal(server.snapshot().error, '')
    } finally { await new Promise(resolve => occupied.close(resolve)) }
  } finally { client?.destroy(); await server.dispose() }
})
