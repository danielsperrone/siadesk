import { create } from 'zustand'
import type { AmostraPeso, LeituraPeso } from '../../electron/balanca/fisica.mjs'
export type { AmostraPeso, LeituraPeso }
export interface EstadoBalanca extends LeituraPeso { porta: number; running: boolean; clients: number; error: string }
export const PESO_VAZIO: LeituraPeso = { peso: 0, alvo: 0, pesoTotal: 0, emMovimento: false, estavel: true, rodasDentro: 0, totalRodas: 0 }
export const useBalanca = create<{ state: EstadoBalanca; error: string }>(() => ({
  state: { ...PESO_VAZIO, porta: 30005, running: false, clients: 0, error: '' }, error: '',
}))
export async function configurarBalanca(porta: number) {
  if (!window.balanca) return
  try {
    const result = await window.balanca.configurar(porta)
    useBalanca.setState({ error: result.ok ? '' : result.error ?? 'Não foi possível iniciar a balança.' })
  } catch { useBalanca.setState({ error: 'Não foi possível comunicar com a balança.' }) }
}
declare global {
  interface Window {
    balanca?: {
      state: () => Promise<EstadoBalanca | null>
      configurar: (porta: number) => Promise<{ ok: boolean; error?: string }>
      amostra: (sample: AmostraPeso) => void
      onState: (callback: (state: EstadoBalanca) => void) => () => void
    }
  }
}
