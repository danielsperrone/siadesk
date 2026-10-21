import { useEffect, useState } from 'react'
import { useProject } from '../store/project'
import { useBalanca, configurarBalanca } from './balanca'
import { ModalConfiguracao } from '../components/ModalConfiguracao'
const kg = (value: number) => `${Math.round(value).toLocaleString('pt-BR')} kg`
const CONFIG_BALANCA_PADRAO = { porta: 30005, margemContato: 0.15, recolhido: false }

export function PesoVeiculoModal({ fechar, ajustarIdentidade }: { fechar: () => void; ajustarIdentidade?: () => void }) {
  const peso = useProject(s => s.config.pesoVeiculoKg ?? 40000)
  const setConfig = useProject(s => s.setConfig)
  const alterar = (value: number) => { if (Number.isFinite(value)) setConfig('pesoVeiculoKg', Math.max(0, Math.min(120000, Math.round(value)))) }
  return <ModalConfiguracao titulo="Peso do veículo" fechar={fechar}>
    <output className="peso-veiculo-valor">{kg(peso)}</output>
    <label className="controle-sinalizacao">Ajustar peso total
      <input type="range" min={0} max={120000} step={100} value={peso} onChange={e => alterar(Number(e.target.value))} />
      <span className="peso-limites"><span>0 kg</span><span>120.000 kg</span></span>
    </label>
    <label className="controle-sinalizacao">Peso total em kg
      <input type="number" min={0} max={120000} step={100} value={peso} onChange={e => alterar(Number(e.target.value))} />
    </label>
    <p className="clp-description">O peso é dividido igualmente entre as rodas. A balança recebe a parcela apoiada na plataforma e estabiliza cerca de 2 segundos após o movimento.</p>
    {ajustarIdentidade && <button type="button" onClick={ajustarIdentidade}>Ajustar placas e tags</button>}
  </ModalConfiguracao>
}

export function IndicadorPeso() {
  const mostrar = useProject(s => s.config.mostrarPeso ?? true)
  const setConfig = useProject(s => s.setConfig)
  const state = useBalanca(s => s.state)
  return <>
    <label className="checkbox" style={{ margin: 0 }}><input type="checkbox" checked={mostrar} onChange={e => setConfig('mostrarPeso', e.target.checked)} />Mostrar peso</label>
    {mostrar && <div className="indicador-peso" aria-label="Peso na balança">
      <span>Peso na balança</span><output>{kg(state.peso)}</output>
      <span className={state.estavel ? 'peso-estavel' : 'peso-oscilando'}>{state.estavel ? 'Estável' : 'Estabilizando…'}</span>
      <small>{state.rodasDentro} de {state.totalRodas} rodas na plataforma</small>
    </div>}
  </>
}

export function PainelBalanca() {
  const config = useProject(s => s.config.balancaTcp ?? CONFIG_BALANCA_PADRAO)
  const setConfig = useProject(s => s.setConfig)
  const state = useBalanca(s => s.state), error = useBalanca(s => s.error)
  const [porta, setPorta] = useState(config.porta)
  const recolhido = !!config.recolhido
  useEffect(() => setPorta(config.porta), [config.porta])
  return <section className="painel-simulador" aria-label="Simulador de balança TCP">
    <button type="button" className="clp-recolher" aria-expanded={!recolhido} aria-controls="balanca-conteudo" onClick={() => setConfig('balancaTcp', { ...config, recolhido: !recolhido })}>
      <span>Balança TCP</span><span aria-hidden="true">{recolhido ? '+' : '−'}</span>
    </button>
    <p className="clp-status"><span className={`clp-dot ${state.running ? 'on' : ''}`} />{state.running ? 'Balança em execução' : window.balanca ? 'Balança indisponível' : 'Prévia do peso · TCP disponível no aplicativo'}</p>
    <p className="clp-description">{state.clients ? `${state.clients} ${state.clients === 1 ? 'cliente conectado' : 'clientes conectados'}` : 'Nenhum cliente conectado'} · {kg(state.peso)} · {state.estavel ? 'estável' : 'instável'}</p>
    <p className="clp-description clp-conexoes">Porta {state.running ? state.porta : config.porta}</p>
    {(state.error || error) && <p role="alert" className="clp-error">{state.error || error}</p>}
    {!recolhido && <div id="balanca-conteudo">
    <label className="controle-sinalizacao">Porta da balança TCP
      <input type="number" min={1} max={65535} value={porta} onChange={e => setPorta(Number(e.target.value))} />
    </label>
    <button type="button" disabled={!Number.isInteger(porta) || porta < 1 || porta > 65535} onClick={() => {
      setConfig('balancaTcp', { ...config, porta }); void configurarBalanca(porta)
    }}>Aplicar porta da balança</button>
    <p className="clp-description">No OWL, use o protocolo Líder via TCP, IP 127.0.0.1 e porta {config.porta}. Clique no caminhão para ajustar o peso.</p>
    <label className="controle-sinalizacao">Margem de contato nas bordas · {Math.round(config.margemContato * 100)} cm
      <input type="range" min={0.05} max={0.5} step={0.01} value={config.margemContato} onChange={e => setConfig('balancaTcp', { ...config, margemContato: Number(e.target.value) })} />
      <small>No limite da plataforma, a roda contribui com metade da sua parcela. Fora dessa margem, sua contribuição chega a zero.</small>
    </label>
    </div>}
  </section>
}
