import { useEffect } from 'react'
import { useProject } from '../store/project'
import { configurarBalanca, useBalanca } from './balanca'

export function BalancaBridge() {
  const ativo = useProject(s => s.projetoAtivo)
  const id = useProject(s => s.config.cloudId)
  const porta = useProject(s => s.config.balancaTcp?.porta ?? 30005)
  useEffect(() => {
    if (!window.balanca) return
    let active = true, received = false
    const unsub = window.balanca.onState(state => { received = true; useBalanca.setState({ state }) })
    void window.balanca.state().then(state => { if (active && !received && state) useBalanca.setState({ state }) }).catch(() => {
      if (active) useBalanca.setState({ error: 'Não foi possível consultar a balança.' })
    })
    return () => { active = false; unsub() }
  }, [])
  useEffect(() => { if (ativo) void configurarBalanca(porta) }, [ativo, id, porta])
  return null
}
