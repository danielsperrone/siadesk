export interface AmostraPeso { alvo: number; pesoTotal: number; emMovimento: boolean; rodasDentro: number; totalRodas: number }
export interface LeituraPeso extends AmostraPeso { peso: number; estavel: boolean }
export function calcularApoio(rodas: { x: number; z: number }[], plataforma: { minX: number; maxX: number; minZ: number; maxZ: number }, margem?: number): { fracao: number; rodasDentro: number; totalRodas: number }
export class PesoDinamico {
  receber(amostra: AmostraPeso): void
  avancar(delta: number): LeituraPeso
  snapshot(): LeituraPeso
}
