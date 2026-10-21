const { parentPort, workerData } = require('node:worker_threads')
const { performance } = require('node:perf_hooks')
const { PLC } = require('./core.cjs')
const { listen } = require('./transport.cjs')
let plc = new PLC(), running = false, servers = [], scan, previous = 0
let ports = { modbus: 502, owl: 30055, ...workerData }, errors = [], logs = []
let sceneSensors = { A: false, B: false }, sensorMode = { A: 'auto', B: 'auto' }
const log = text => { logs.push({ time: new Date().toISOString(), text }); if (logs.length > 60) logs.shift() }
const publish = () => parentPort.postMessage({ type: 'state', state: { ...plc.snapshot(), running, ports, errors, logs, sensorMode,
  clients: { modbus: servers.find(s => s.kind === 'modbus')?.clients() ?? 0, owl: servers.find(s => s.kind === 'owl')?.clients() ?? 0 },
  listening: { modbus: servers.some(s => s.kind === 'modbus'), owl: servers.some(s => s.kind === 'owl') } } })
async function stop() {
  clearInterval(scan); running = false
  await Promise.all(servers.map(s => s.close())); servers = []
}
async function start(nextPorts = ports) {
  nextPorts = { modbus: nextPorts?.modbus, owl: nextPorts?.owl }
  for (const p of Object.values(nextPorts)) if (!Number.isInteger(p) || p < 1 || p > 65535) throw new Error('Porta deve estar entre 1 e 65535.')
  if (nextPorts.modbus === nextPorts.owl) throw new Error('Use portas diferentes para Modbus e OWL.')
  await stop()
  ports = nextPorts; plc = new PLC(); errors = []; sensorMode = { A: 'auto', B: 'auto' }
  for (const [kind, port] of Object.entries(ports)) {
    try { servers.push({ ...await listen(plc, port, kind === 'modbus' ? 'Modbus' : 'OWL', log), kind }) }
    catch (err) { const message = `Porta ${port}: ${err.code === 'EADDRINUSE' ? 'já está em uso. Feche o outro simulador ou escolha outra porta.' : err.message}`; errors.push(message); log(message) }
  }
  running = true; previous = performance.now()
  scan = setInterval(() => {
    const now = performance.now()
    for (const [channel, index] of [['A', 0], ['B', 1]]) {
      const occupied = sensorMode[channel] === 'ocupado' || (sensorMode[channel] === 'auto' && sceneSensors[channel])
      plc.inputs[`%I0.${index}`] = !occupied
    }
    plc.step(now - previous); previous = now
  }, 10)
  log(`Simulador iniciado • firmware ${plc.program.version}`)
}
async function command(command) {
  if (!command || typeof command !== 'object') throw new Error('Comando inválido')
  if (command.type === 'configure') {
    const s = command.settings
    if (!s?.portas || !['modbus', 'owl'].every(k => Number.isInteger(s.portas[k]) && s.portas[k] >= 1 && s.portas[k] <= 65535) || s.portas.modbus === s.portas.owl) throw new Error('Portas do projeto inválidas.')
    if (['A', 'B'].some(c => !['auto', 'livre', 'ocupado'].includes(s.modosSensores?.[c] ?? 'auto'))) throw new Error('Modo de sensor inválido.')
    if (ports.modbus !== s.portas.modbus || ports.owl !== s.portas.owl) await start(s.portas)
    for (const channel of ['A', 'B']) sensorMode[channel] = s.modosSensores?.[channel] ?? 'auto'
    for (const [i, channel] of ['entrada-a', 'entrada-b', 'saida-a', 'saida-b'].entries()) plc.writeCoils(6 + i, [s.semaforos?.[channel] === true])
    for (let i = 2; i < 14; i++) plc.inputs[`%I0.${i}`] = s.entradas?.[i] ?? (i < 4)
  }
  else if (command.type === 'start') await start(command.ports || ports)
  else if (command.type === 'stop') { await stop(); log('Simulador parado') }
  else if (command.type === 'clear-log') logs = []
  else if (command.type === 'sensors') {
    sceneSensors = { A: command.A === true, B: command.B === true }
  } else if (command.type === 'sensor-mode') {
    if (!['A', 'B'].includes(command.channel) || !['auto', 'livre', 'ocupado'].includes(command.mode)) throw new Error('Sensor inválido')
    if (sensorMode[command.channel] !== command.mode) log(`Sensor ${command.channel}: ${command.mode === 'auto' ? 'detecção automática' : command.mode === 'ocupado' ? 'obstrução forçada' : 'pista livre forçada'}`)
    sensorMode[command.channel] = command.mode
  } else if (command.type === 'coil') {
    if (!running) throw new Error('Inicie o simulador primeiro.')
    if (!Number.isInteger(command.address) || command.address < 2 || command.address > 9 || typeof command.value !== 'boolean') throw new Error('Comando de memória inválido')
    // Botões/atalhos são uma intenção única. Cancela uma solicitação manual
    // oposta pendente; escritas externas do OWL continuam fiéis ao banco original.
    if (command.value && command.address <= 5) plc.writeCoils(command.address % 2 === 0 ? command.address + 1 : command.address - 1, [false])
    plc.writeCoils(command.address, [command.value]); log(`Painel: %M${command.address} = ${command.value ? 1 : 0}`)
  } else if (command.type === 'input') {
    if (!running || !Number.isInteger(command.index) || command.index < 2 || command.index > 13 || typeof command.value !== 'boolean') throw new Error('Entrada inválida')
    plc.inputs[`%I0.${command.index}`] = command.value
  } else throw new Error('Comando desconhecido')
}
// Serializa reinícios e comandos para nunca criar dois servidores concorrentes.
let queue = start().catch(err => { errors.push(err.message) }).then(publish)
parentPort.on('message', message => {
  queue = queue.then(async () => {
    try { await command(message.command); parentPort.postMessage({ type: 'reply', id: message.id, result: { ok: true } }) }
    catch (err) { parentPort.postMessage({ type: 'reply', id: message.id, result: { ok: false, error: err.message } }) }
    if (message.command?.type !== 'sensors') publish()
  })
})
setInterval(publish, 100)
