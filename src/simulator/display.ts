import { create } from 'zustand'
export interface ConfigDisplay { ativo: boolean; ip: string; porta: number }
export interface EstadoDisplay {
  ip: string; porta: number; running: boolean; clients: number; mensagem: string
  modo: 'texto' | 'apagado' | 'relogio' | 'data'; efeitos: string[]
  recebidos: number; invalidos: number; error: string; atualizadoEm: string | null
}
export const DISPLAY_PADRAO: ConfigDisplay = { ativo: false, ip: '127.0.0.1', porta: 2101 }
export function velocidadeDisplay(valor?: number) {
  return typeof valor === 'number' && Number.isFinite(valor) ? Math.max(0.25, Math.min(3, valor)) : 1
}
export const useDisplays = create<{ estados: Record<string, EstadoDisplay>; error: string }>(() => ({ estados: {}, error: '' }))
export function textoDisplay(estado: EstadoDisplay | undefined, agora = new Date()) {
  if (!estado) return ''
  if (estado.modo === 'relogio') return agora.toLocaleTimeString('pt-BR')
  if (estado.modo === 'data') return agora.toLocaleDateString('pt-BR')
  return estado.modo === 'apagado' ? '' : estado.mensagem
}
declare global {
  interface Window { displays?: {
    state: () => Promise<Record<string, EstadoDisplay>>
    configurar: (items: { id: string; config: ConfigDisplay }[], scope: string) => Promise<{ ok: boolean; error?: string }>
    onState: (callback: (state: Record<string, EstadoDisplay>) => void) => () => void
  } }
}
