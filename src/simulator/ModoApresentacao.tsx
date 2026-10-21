import { useEffect, useRef } from 'react'
import { useProject } from '../store/project'
import { useBalanca } from './balanca'

const formatarPeso = (peso: number) => Math.round(peso).toLocaleString('pt-BR')

export function ModoApresentacao() {
  const pesoVeiculo = useProject(s => s.config.pesoVeiculoKg ?? 40000)
  const sair = useProject(s => s.setModoApresentacao)
  const leitura = useBalanca(s => s.state)
  const botaoSair = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    botaoSair.current?.focus({ preventScroll: true })
    const tecla = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.repeat) return
      if (document.querySelector('dialog[open], .menu-cancela')) return
      const projeto = useProject.getState()
      if (projeto.posteEditandoPerifericos) {
        projeto.setPosteEditandoPerifericos(null)
        return
      }
      event.preventDefault()
      sair(false)
    }
    window.addEventListener('keydown', tecla)
    return () => window.removeEventListener('keydown', tecla)
  }, [sair])

  return <>
    <div className="apresentacao-peso" aria-label="Pesagem em apresentação">
      <span className="apresentacao-peso-titulo">Peso na balança</span>
      <output aria-label="Peso na balança">{formatarPeso(leitura.peso)} <span>kg</span></output>
      <div className="apresentacao-peso-detalhes">
        <span className={`apresentacao-estabilidade ${leitura.estavel ? 'estavel' : ''}`} title={leitura.estavel ? 'Peso estável' : 'Peso estabilizando'} />
        <span>Veículo <output aria-label="Peso total do veículo">{formatarPeso(pesoVeiculo)} kg</output></span>
      </div>
    </div>
    <button ref={botaoSair} type="button" className="apresentacao-sair" onClick={() => sair(false)} title="Sair do modo de apresentação (Esc)">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M9 4H4v16h5M13 8l4 4-4 4M8 12h12" /></svg>
      Sair da apresentação
    </button>
  </>
}
