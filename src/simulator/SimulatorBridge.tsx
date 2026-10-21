import { useEffect, useRef } from 'react'
import { enviarCLP, useSimulator } from './store'
import { useProject } from '../store/project'
import { SEMAFOROS } from './types'
import type { ConfiguracaoCLP } from './types'

export function SimulatorBridge() {
  const ativo = useProject(s => s.projetoAtivo)
  const projeto = useProject(s => s.config.cloudId)
  const settings = useProject(s => s.config.simuladorClp)
  const applied = useRef<{ projeto: string | undefined; settings: ConfiguracaoCLP } | null>(null)
  const signature = JSON.stringify(settings ? { portas: settings.portas, modosSensores: settings.modosSensores, semaforos: settings.semaforos, entradas: settings.entradas } : null)
  useEffect(() => {
    if (!ativo || !window.clp || signature === 'null') { applied.current = null; return }
    const next: ConfiguracaoCLP = JSON.parse(signature), previous = applied.current
    applied.current = { projeto, settings: next }
    if (!previous || previous.projeto !== projeto || previous.settings.portas.modbus !== next.portas.modbus || previous.settings.portas.owl !== next.portas.owl) {
      void enviarCLP({ type: 'configure', settings: next })
      return
    }
    // Um ajuste de sensor não pode sobrescrever comandos que chegaram do OWL.
    // Ao abrir outro projeto, a configuração completa continua sendo restaurada.
    for (const channel of ['A', 'B'] as const) {
      const mode = next.modosSensores?.[channel] ?? 'auto'
      if (mode !== (previous.settings.modosSensores?.[channel] ?? 'auto')) void enviarCLP({ type: 'sensor-mode', channel, mode })
    }
    for (const sem of SEMAFOROS) {
      const value = next.semaforos?.[sem.id] ?? false
      if (value !== (previous.settings.semaforos?.[sem.id] ?? false)) void enviarCLP({ type: 'coil', address: sem.memoria, value })
    }
    for (let index = 2; index < 14; index++) {
      const value = next.entradas?.[index] ?? (index < 4)
      if (value !== (previous.settings.entradas?.[index] ?? (index < 4))) void enviarCLP({ type: 'input', index, value })
    }
  }, [ativo, projeto, signature])
  useEffect(() => {
    if (!window.clp) return
    let active = true, received = false
    const unsubscribe = window.clp.onState(state => {
      received = true
      useSimulator.setState({ state })
    })
    void window.clp.state().then(state => {
      if (active && !received) useSimulator.setState({ state })
    }).catch(() => { if (active) useSimulator.setState({ error: 'Não foi possível consultar o simulador.' }) })
    return () => { active = false; unsubscribe() }
  }, [])
  return null
}
