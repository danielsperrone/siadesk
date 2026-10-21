import { useEffect, useState } from 'react'
import { useProject } from '../store/project'
import { canalCancela, definirSemaforoCLP, enviarCLP, useSimulator } from './store'
import { SEMAFOROS } from './types'
import type { CanalCancela, ModoSensor, ConfiguracaoCLP } from './types'
import './simulador.css'
import { MonitorSimulador } from './MonitorSimulador'

export function PainelSimulador() {
  const state = useSimulator(s => s.state)
  const error = useSimulator(s => s.error)
  const config = useProject(s => s.config)
  const setConfig = useProject(s => s.setConfig)
  const [modbus, setModbus] = useState(502), [owl, setOwl] = useState(30055)
  const [busy, setBusy] = useState(false)
  const [monitorAberto, setMonitorAberto] = useState(false)
  useEffect(() => { if (state?.ports) { setModbus(state.ports.modbus); setOwl(state.ports.owl) } }, [state?.ports.modbus, state?.ports.owl])
  const available = !!window.clp
  const running = !!state?.running
  const settings = config.simuladorClp ?? { portas: { modbus: 502, owl: 30055 } }
  const recolhido = !!settings.recolhido
  const alterar = (patch: Partial<ConfiguracaoCLP>) => setConfig('simuladorClp', { ...settings, ...patch })
  const clients = (state?.clients?.modbus ?? 0) + (state?.clients?.owl ?? 0)
  return <section className="painel-simulador" aria-label="Simulador CLP">
    <div className="clp-cabecalho">
    <button type="button" className="clp-recolher" aria-expanded={!recolhido} aria-controls="clp-conteudo" onClick={() => alterar({ recolhido: !recolhido })}>
      <span>Simulador da automação</span><span aria-hidden="true">{recolhido ? '+' : '−'}</span>
    </button>
    <button type="button" className="clp-abrir-monitor" aria-label="Abrir monitor da automação" title="Abrir monitor da automação" onClick={() => setMonitorAberto(true)}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><rect x="3" y="3" width="18" height="13" rx="2" /><path d="M12 16v5M7 21h10" /></svg>
    </button>
    </div>
    {monitorAberto && <MonitorSimulador fechar={() => setMonitorAberto(false)} />}
    <p className="clp-status" role="status">
      <span className={`clp-dot ${running ? 'on' : ''}`} />
      {!available ? 'Disponível no aplicativo instalado' : !state ? 'Iniciando simulador…' : running ? 'Simulador em execução' : 'Simulador parado'}
    </p>
    <p className="clp-description clp-conexoes">{clients ? `${clients} ${clients === 1 ? 'conexão TCP ativa' : 'conexões TCP ativas'}` : 'Nenhum cliente conectado'}{state?.connected && !state.initializing ? ' · OWL reconhecido' : ''}</p>
    {(error || !!state?.errors.length) && <div className="clp-error" role="alert">{error && <p>{error}</p>}{state?.errors.map(text => <p key={text}>{text}</p>)}</div>}
    {!recolhido && <div id="clp-conteudo">
    <p className="clp-description">Inicia junto com o SIADESK. O CLP controla os equipamentos vinculados e recebe a presença do caminhão na cena.</p>
    {available && <>
      <p className="clp-description">{!running ? 'Inicie o simulador para testar a automação.' : state?.initializing ? 'Inicializando o firmware…' : state?.connected ? 'Presença do OWL reconhecida pelo CLP.' : 'Aguardando presença do OWL. Os comandos abaixo permitem testar sem ele.'}</p>
      <button type="button" disabled={busy || !state} onClick={async () => {
        setBusy(true)
        if (running) await enviarCLP({ type: 'stop' })
        else if (await enviarCLP({ type: 'start', ports: settings.portas })) await enviarCLP({ type: 'configure', settings })
        setBusy(false)
      }}>{busy ? 'Aguarde…' : running ? 'Parar simulador' : 'Iniciar simulador'}</button>
      <div className="clp-section">
        <h4>Cancelas</h4>
        {(['A', 'B'] as const).map((channel, i) => <div className="clp-row" key={channel}>
          <strong>Cancela {channel} <span>{i === 0 ? '(entrada)' : '(saída)'}</span></strong>
          <span>{state?.gates?.[channel] ? 'Aberta' : 'Fechada'}{state?.memory?.[i === 0 ? 10 : 16] ? ' · em movimento' : ''}</span>
          <div className="clp-actions">
            <button type="button" disabled={!running} onClick={() => void enviarCLP({ type: 'coil', address: i === 0 ? 2 : 4, value: true })}>Abrir {channel}</button>
            <button type="button" disabled={!running} onClick={() => void enviarCLP({ type: 'coil', address: i === 0 ? 3 : 5, value: true })}>Fechar {channel}</button>
          </div>
        </div>)}
        <p className="clp-description">O fechamento respeita os sensores e os tempos do firmware.</p>
        {([{ id: 'cancela-entrada', nome: 'Cancela da entrada', ativa: config.cancelaEntrada }, { id: 'cancela-saida', nome: 'Cancela da saída', ativa: config.cancelaSaida }]).filter(c => c.ativa).map(c => <label className="controle-sinalizacao" key={c.id}>
          {c.nome} no 3D
          <select value={canalCancela(config, c.id)} onChange={e => setConfig('canaisCancelas', { ...config.canaisCancelas, [c.id]: e.target.value as CanalCancela })}>
            <option value="A">Cancela A (entrada)</option><option value="B">Cancela B (saída)</option><option value="figurante">Figurante / controle manual</option>
          </select>
        </label>)}
      </div>
      <div className="clp-section">
        <h4>Semáforos</h4>
        {SEMAFOROS.map(sem => <label key={sem.id} className="controle-sinalizacao">
          {sem.nome}
          <select disabled={!running} value={state?.memory?.[sem.memoria] ? 'verde' : 'vermelho'} onChange={e => definirSemaforoCLP(sem.id, e.target.value === 'verde')}>
            <option value="vermelho">Vermelho</option><option value="verde">Verde</option>
          </select>
          <small>Saída do CLP: {state?.lights?.[sem.id] ?? 'desligado'}</small>
        </label>)}
      </div>
      <div className="clp-section">
        <h4>Sensores</h4>
        {(['A', 'B'] as const).map(channel => <label className="controle-sinalizacao" key={channel}>
          Sensor {channel} · {state?.sensors?.[channel] ? 'Veículo detectado' : 'Livre'}
          <select disabled={!running} value={state?.sensorMode?.[channel] ?? 'auto'} onChange={e => alterar({ modosSensores: { ...settings.modosSensores, [channel]: e.target.value as ModoSensor } })}>
            <option value="auto">Detectar pelo veículo no 3D</option><option value="ocupado">Forçar veículo detectado</option><option value="livre">Forçar pista livre</option>
          </select>
        </label>)}
        <p className="clp-description">Em Equipamentos → Periféricos, use a engrenagem do item para escolher o canal. Use as setas ← → para mover o caminhão e V para inverter a frente e o fundo. Se vários sensores usarem o mesmo canal, basta um detectar o veículo.</p>
      </div>
      <details className="clp-section">
        <summary>Conexão com o OWL</summary>
        <p className="clp-description">Neste computador: 127.0.0.1. Configure no OWL a mesma porta do protocolo escolhido.</p>
        <label className="controle-sinalizacao">Porta Modbus TCP<input type="number" min={1} max={65535} value={modbus} onChange={e => setModbus(Number(e.target.value))} /></label>
        <small>{state?.listening?.modbus ? 'Modbus disponível' : 'Modbus indisponível'}</small>
        <label className="controle-sinalizacao">Porta de simulação OWL<input type="number" min={1} max={65535} value={owl} onChange={e => setOwl(Number(e.target.value))} /></label>
        <small>{state?.listening?.owl ? 'Conexão auxiliar disponível' : 'Conexão auxiliar indisponível'}</small>
        <button type="button" disabled={busy || !Number.isInteger(modbus) || !Number.isInteger(owl) || modbus < 1 || modbus > 65535 || owl < 1 || owl > 65535 || modbus === owl} onClick={async () => {
          setBusy(true)
          if (await enviarCLP({ type: 'start', ports: { modbus, owl } })) {
            const next = { ...settings, portas: { modbus, owl } }
            alterar(next); await enviarCLP({ type: 'configure', settings: next })
          }
          setBusy(false)
        }}>Aplicar portas e reiniciar</button>
        <p className="clp-description">O reinício limpa os comandos transitórios. As portas e preferências ficam salvas no projeto.</p>
        <p className="clp-description">Presenças recebidas: M0: {state?.presenceWrites?.[0] ?? 0} · M1: {state?.presenceWrites?.[1] ?? 0}. O firmware espera M1; M0 mantém o comportamento do simulador original.</p>
      </details>
      <details className="clp-section">
        <summary>Entradas e diagnóstico</summary>
        <p className="clp-description">Firmware Schneider {state?.firmware}. Entradas físicas adicionais do simulador original.</p>
        {Array.from({ length: 12 }, (_, i) => i + 2).map(i => <label className="clp-input" key={i}>
          <input type="checkbox" disabled={!running} checked={!!state?.inputs?.[`%I0.${i}`]} onChange={e => alterar({ entradas: { ...settings.entradas, [i]: e.target.checked } })} />
          I0.{i}{i === 2 || i === 3 ? ' · sensor auxiliar livre' : i === 5 ? ' · fechar ambas' : i === 6 ? ' · abrir ambas' : ''}
        </label>)}
        <ol className="clp-log">{state?.logs?.slice(-12).reverse().map((item, i) => <li key={`${item.time}-${i}`}><time>{new Date(item.time).toLocaleTimeString('pt-BR')}</time> {item.text}</li>)}</ol>
      </details>
    </>}
    </div>}
  </section>
}
