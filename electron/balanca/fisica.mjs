const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t) }

export function calcularApoio(rodas, plataforma, margem = 0.15) {
  const m = Math.max(0.001, margem)
  const fatores = rodas.map(({ x, z }) => {
    const dx = Math.min(x - plataforma.minX, plataforma.maxX - x)
    const dz = Math.min(z - plataforma.minZ, plataforma.maxZ - z)
    return smooth((dx + m) / (2 * m)) * smooth((dz + m) / (2 * m))
  })
  return {
    fracao: fatores.length ? fatores.reduce((a, b) => a + b, 0) / fatores.length : 0,
    rodasDentro: rodas.filter(p => p.x >= plataforma.minX && p.x <= plataforma.maxX && p.z >= plataforma.minZ && p.z <= plataforma.maxZ).length,
    totalRodas: rodas.length,
  }
}

export class PesoDinamico {
  constructor() {
    this.amostra = { alvo: 0, pesoTotal: 0, emMovimento: false, rodasDentro: 0, totalRodas: 0 }
    this.base = 0; this.peso = 0; this.restante = 0; this.tempo = 0; this.amplitude = 0
  }
  receber(amostra) {
    const delta = Math.abs(amostra.alvo - this.amostra.alvo)
    if (delta > 0.1) {
      this.restante = 2
      this.amplitude = Math.max(this.amplitude, Math.min(amostra.pesoTotal * 0.012, delta * 0.08))
    }
    this.amostra = { ...amostra }
    if (amostra.totalRodas === 0 || amostra.pesoTotal === 0) this.zerar()
  }
  zerar() { this.base = 0; this.peso = 0; this.restante = 0; this.amplitude = 0 }
  avancar(delta) {
    const dt = Math.max(0, delta)
    this.tempo += dt
    const { alvo, pesoTotal, emMovimento } = this.amostra
    if (emMovimento && alvo > 0) {
      this.restante = 2
      this.amplitude = Math.max(this.amplitude, pesoTotal * 0.0005)
    } else this.restante = Math.max(0, this.restante - dt)
    this.base += (alvo - this.base) * (1 - Math.exp(-dt * 12))
    const oscilacao = alvo > 0 ? this.amplitude * (this.restante / 2) ** 2 * (Math.sin(this.tempo * 19) + 0.25 * Math.sin(this.tempo * 31)) : 0
    if (this.restante === 0) { this.base = alvo; this.amplitude = 0 }
    this.peso = Math.round(clamp(this.base + oscilacao, 0, pesoTotal * 1.02))
    return this.snapshot()
  }
  snapshot() { return { ...this.amostra, peso: this.peso, estavel: this.restante === 0 } }
}
