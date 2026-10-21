// Tradução do interpretador oficial firmware_schneider.py. A lista de
// instruções é extraída do mesmo .smbp, sem reimplementar rungs por aproximação.
const firmware = require('./firmware/programa.json')
class PLC {
  constructor(program = firmware) {
    this.program = program
    this.memory = new Uint8Array(65536)
    this.inputs = Object.fromEntries(program.inputs.map(a => [a, false]))
    this.outputs = Object.fromEntries(program.outputs.map(a => [a, false]))
    this.timers = Object.fromEntries(Object.entries(program.timers).map(([a, preset]) => [a, { preset, elapsed: 0, q: false }]))
    this.elapsed = 0
    this.presenceWrites = [0, 0]
    const ops = new Set(['LD', 'LDN', 'AND', 'ANDN', 'OR', 'ORN', 'OR(', 'OR(N', ')', 'ST', 'STN', 'S', 'R', 'BLK', 'IN', 'OUT_BLK', 'END_BLK'])
    for (const [, rungs] of program.pous) for (const rung of rungs) for (const [op, arg] of rung) {
      if (!ops.has(op)) throw new Error(`Instrução não suportada: ${op}`)
      if (![')', 'IN', 'OUT_BLK', 'END_BLK'].includes(op) && arg !== 'Q' && !(arg in this.timers) && !(arg in this.inputs) && !(arg in this.outputs) && !/^%M\d+$/.test(arg)) throw new Error(`Endereço inválido: ${arg}`)
    }
    for (let i = 0; i < 4; i++) this.inputs[`%I0.${i}`] = true
  }
  read(address) {
    if (address.startsWith('%M')) return !!this.memory[Number(address.slice(2))]
    return address in this.inputs ? this.inputs[address] : this.outputs[address]
  }
  store(address, value) {
    if (address.startsWith('%M')) this.memory[Number(address.slice(2))] = Number(!!value)
    else this.outputs[address] = !!value
  }
  writeCoils(address, values, external = false) {
    if (!Number.isInteger(address) || address < 0 || address + values.length > this.memory.length) throw new Error('Memória fora do banco')
    values.forEach((value, i) => {
      this.memory[address + i] = Number(!!value)
      if (external && address + i < 2) this.presenceWrites[address + i]++
    })
  }
  step(ms) {
    if (!Number.isFinite(ms) || ms < 0) throw new Error('Tempo de varredura inválido')
    for (const [, rungs] of this.program.pous) for (const instructions of rungs) {
      let acc = false, timer = null
      const stack = []
      for (const [op, arg] of instructions) {
        if (op === 'BLK') timer = this.timers[arg]
        else if (op === 'IN') {
          timer.elapsed = acc ? Math.min(timer.preset, timer.elapsed + ms) : 0
          timer.q = acc && timer.elapsed >= timer.preset
        } else if (op === 'OUT_BLK') continue
        else if (op === 'END_BLK') timer = null
        else if (op === ')') acc = stack.pop() || acc
        else if (['ST', 'STN', 'S', 'R'].includes(op)) {
          if (op === 'ST' || op === 'STN' || acc) this.store(arg, op === 'STN' ? !acc : op === 'R' ? false : acc)
        } else {
          let value = arg === 'Q' ? timer.q : this.read(arg)
          if (['LDN', 'ANDN', 'ORN', 'OR(N'].includes(op)) value = !value
          if (op === 'LD' || op === 'LDN') acc = value
          else if (op === 'AND' || op === 'ANDN') acc = acc && value
          else if (op === 'OR' || op === 'ORN') acc = acc || value
          else { stack.push(acc); acc = value }
        }
      }
    }
    this.elapsed += ms
  }
  snapshot() {
    const lights = {}
    for (const [i, channel] of ['entrada-a', 'entrada-b', 'saida-a', 'saida-b'].entries()) {
      lights[channel] = this.read(`%Q1.${i * 2}`) ? 'verde' : this.read(`%Q1.${i * 2 + 1}`) ? 'vermelho' : 'desligado'
    }
    return { firmware: this.program.version, sha256: this.program.sha256, elapsed: this.elapsed,
      connected: this.read('%Q0.4'), initializing: this.elapsed < this.timers['%TM4'].preset,
      presenceWrites: [...this.presenceWrites], inputs: { ...this.inputs }, outputs: { ...this.outputs },
      memory: Array.from(this.memory.slice(0, 50), Boolean), lights,
      gates: { A: this.read('%M12'), B: this.read('%M17') },
      sensors: { A: !this.read('%I0.0'), B: !this.read('%I0.1') } }
  }
}
module.exports = { PLC }
