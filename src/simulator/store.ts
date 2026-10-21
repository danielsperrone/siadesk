import { create } from 'zustand'
import type { ComandoCLP, EstadoCLP, CanalCancela } from './types'
import type { ProjectConfig } from '../types'
import { useProject } from '../store/project'
import { SEMAFOROS } from './types'
import type { CanalSemaforo } from './types'

export const useSimulator = create<{ state: EstadoCLP | null; error: string }>(() => ({ state: null, error: '' }))
export function definirSemaforoCLP(canal: CanalSemaforo, verde: boolean) {
  const store = useProject.getState()
  const settings = store.config.simuladorClp ?? { portas: { modbus: 502, owl: 30055 } }
  store.setConfig('simuladorClp', { ...settings, semaforos: { ...settings.semaforos, [canal]: verde } })
  // Se a preferência já era essa, o efeito de configuração não dispara.
  // Ainda assim o usuário pode querer substituir um comando recebido do OWL.
  if ((settings.semaforos?.[canal] ?? false) === verde) {
    const sem = SEMAFOROS.find(item => item.id === canal)!
    void enviarCLP({ type: 'coil', address: sem.memoria, value: verde })
  }
}
export async function enviarCLP(command: ComandoCLP) {
  try {
    if (!window.clp) throw new Error('Abra o SIADESK instalado para usar o simulador CLP.')
    const result = await window.clp.command(command)
    if (!result.ok) throw new Error(result.error || 'Falha ao enviar comando ao CLP.')
    if (command.type !== 'sensors') useSimulator.setState({ error: '' })
    return true
  } catch (error) {
    useSimulator.setState({ error: error instanceof Error ? error.message : 'Falha no simulador.' })
    return false
  }
}
export function canalCancela(config: ProjectConfig, id: string): CanalCancela {
  return config.canaisCancelas?.[id] ?? (id === 'cancela-entrada' ? 'A' : id === 'cancela-saida' ? 'B' : 'figurante')
}
export function cancelaAberta(config: ProjectConfig, id: string, state: EstadoCLP | null) {
  const channel = canalCancela(config, id)
  return state?.running && channel !== 'figurante' ? !!state.gates[channel] : !!config.cancelasAbertas?.[id]
}
