import { useEffect } from 'react'
import { useProject } from '../store/project'
import { gerarLayout } from '../layout/engine'
import { DISPLAY_PADRAO, useDisplays } from './display'

export function DisplayBridge() {
  const ativo = useProject(s => s.projetoAtivo)
  const scope = useProject(s => s.config.cloudId ?? s.config.dataCriacao)
  const items = useProject(s => JSON.stringify(s.projetoAtivo
    ? gerarLayout(s.config, s.calibracoes).filter(p => p.tipo === 'display-mensagens').map(p => ({ id: p.id, config: p.displayTcp ?? DISPLAY_PADRAO })) : []))
  useEffect(() => {
    if (!window.displays) return
    let active = true, received = false
    const unsub = window.displays.onState(estados => { received = true; useDisplays.setState({ estados }) })
    void window.displays.state().then(estados => { if (active && !received) useDisplays.setState({ estados }) }).catch(() => {
      if (active) useDisplays.setState({ error: 'Não foi possível consultar os displays.' })
    })
    return () => { active = false; unsub() }
  }, [])
  useEffect(() => {
    if (!window.displays) return
    let active = true
    const timer = setTimeout(() => {
      void window.displays!.configurar(JSON.parse(items), ativo ? scope : '').then(result => {
        if (active) useDisplays.setState({ error: result.ok ? '' : result.error ?? 'Não foi possível iniciar os displays.' })
      }).catch(() => { if (active) useDisplays.setState({ error: 'Não foi possível comunicar com os displays.' }) })
    }, 100)
    return () => { active = false; clearTimeout(timer) }
  }, [items, scope, ativo])
  return null
}
