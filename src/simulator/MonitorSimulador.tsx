import { useState } from 'react'
import { ModalConfiguracao } from '../components/ModalConfiguracao'
import { useProject } from '../store/project'
import { definirSemaforoCLP, enviarCLP, useSimulator } from './store'
import { SEMAFOROS } from './types'
import type { ConfiguracaoCLP, EstadoCLP, ModoSensor } from './types'
import './monitor.css'

function SemaforoMonitor({ indice, state }: { indice: number; state: EstadoCLP | null }) {
  const sem = SEMAFOROS[indice]
  const verde = !!state?.outputs[`%Q1.${indice * 2}`]
  const vermelho = !!state?.outputs[`%Q1.${indice * 2 + 1}`]
  const texto = !state ? 'Sem leitura' : verde && vermelho ? 'Verde e vermelho' : verde ? 'Verde' : vermelho ? 'Vermelho' : 'Desligado'
  return <figure className="monitor-semaforo" aria-label={`${sem.nome}: ${texto}`}>
    <figcaption>{sem.nome}</figcaption>
    <svg viewBox="0 0 60 126" width="54" height="114" aria-hidden="true">
      <rect x="3" y="3" width="54" height="120" rx="5" fill="#141416" stroke="#505056" strokeWidth="2" />
      <circle cx="30" cy="32" r="17" fill={vermelho ? '#ff3471' : '#4a202e'} />
      <circle cx="30" cy="94" r="17" fill={verde ? '#20df80' : '#143b28'} />
    </svg>
    <span>{texto}</span>
  </figure>
}

function CancelaMonitor({ aberta, movimento, canal, disponivel }: { aberta: boolean; movimento: boolean; canal: string; disponivel: boolean }) {
  return <figure className="monitor-cancela" aria-label={`Cancela ${canal}: ${!disponivel ? 'Sem leitura' : aberta ? 'Aberta' : 'Fechada'}${movimento ? ', em movimento' : ''}`}>
    <figcaption>Cancela {canal}</figcaption>
    <svg viewBox="0 0 140 126" width="126" height="114" aria-hidden="true">
      <rect x="10" y="87" width="32" height="36" fill="#45454c" />
      <path className={`monitor-haste ${aberta ? 'aberta' : ''}`} d="M27 88h94" stroke={aberta ? '#20df80' : '#ffbd45'} strokeWidth="8" strokeLinecap="round" />
      <circle cx="27" cy="88" r="6" fill="#202024" stroke="#20c9d4" strokeWidth="2" />
      <circle cx="26" cy="106" r="4" fill={aberta ? '#20df80' : '#ff3471'} />
    </svg>
    <span>{movimento ? 'Em movimento' : !disponivel ? 'Sem leitura' : aberta ? 'Aberta' : 'Fechada'}</span>
  </figure>
}

export function MonitorSimulador({ fechar }: { fechar: () => void }) {
  const state = useSimulator(s => s.state), error = useSimulator(s => s.error)
  const settings = useProject(s => s.config.simuladorClp)
  const [aba, setAba] = useState<'sinotico' | 'detalhado'>('sinotico')
  const [busy, setBusy] = useState(false)
  const running = !!state?.running, disponivel = !!state
  const alterar = (patch: Partial<ConfiguracaoCLP>) => {
    const store = useProject.getState()
    store.setConfig('simuladorClp', { ...(store.config.simuladorClp ?? { portas: { modbus: 502, owl: 30055 } }), ...patch })
  }
  const sensor = (canal: 'A' | 'B', modo: ModoSensor) => alterar({ modosSensores: { ...useProject.getState().config.simuladorClp?.modosSensores, [canal]: modo } })
  const conectado = running && !state?.initializing && !!state?.connected
  const presenca = !window.clp ? 'Disponível no aplicativo instalado' : !state ? 'Iniciando simulador…' : !running ? 'Simulador parado' : state.initializing ? 'Inicializando o firmware…' : conectado ? 'OWL conectado' : 'Sem presença do OWL'
  return <ModalConfiguracao titulo="Simulador CLP Modbus — Integração OWL" className="monitor-clp" fechar={fechar}>
    <div className="monitor-rede">
      <strong className={state?.listening.modbus ? 'monitor-verde' : 'monitor-alerta'}>{state?.listening.modbus ? `Servidor ativo :${state.ports.modbus}` : 'Servidor Modbus indisponível'}</strong>
      <span>Conexões TCP: {(state?.clients?.modbus ?? 0) + (state?.clients?.owl ?? 0)} · Auxiliar OWL :{state?.ports.owl ?? settings?.portas.owl ?? 30055}</span>
    </div>
    <section className="monitor-presenca" aria-label="Conexão OWL reconhecida pelo CLP">
      <span className={`monitor-led-presenca ${conectado ? 'conectado' : ''}`} aria-hidden="true" />
      <div><h4>Conexão OWL reconhecida pelo CLP</h4><strong className={conectado ? 'monitor-verde' : 'monitor-alerta'}>{presenca}</strong>
        <p>Versão {state?.firmware ?? '5.0.6'} · Presença esperada em %M1 · Sinaleiro %Q0.4</p></div>
      <p className="monitor-envios">Envios recebidos<br />%M0: {state?.presenceWrites[0] ?? 0} · %M1: {state?.presenceWrites[1] ?? 0}</p>
    </section>
    {(error || !!state?.errors.length) && <div role="alert" className="clp-error">{error}{state?.errors.map(text => <p key={text}>{text}</p>)}</div>}
    <div className="monitor-abas" role="tablist" aria-label="Visualização do simulador">
      {(['sinotico', 'detalhado'] as const).map(id => <button key={id} id={`monitor-tab-${id}`} role="tab" type="button" aria-selected={aba === id} aria-controls={`monitor-painel-${id}`} tabIndex={aba === id ? 0 : -1}
        onClick={() => setAba(id)} onKeyDown={e => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
          e.preventDefault()
          const next = e.key === 'Home' ? 'sinotico' : e.key === 'End' ? 'detalhado' : aba === 'sinotico' ? 'detalhado' : 'sinotico'
          setAba(next); document.getElementById(`monitor-tab-${next}`)?.focus()
        }}>{id === 'sinotico' ? 'Sinótico Simplificado' : 'Painel Detalhado (Modbus & CLP)'}</button>)}
    </div>
    {aba === 'sinotico' ? <div role="tabpanel" id="monitor-painel-sinotico" aria-labelledby="monitor-tab-sinotico" className="monitor-pistas">
      {(['A', 'B'] as const).map((canal, i) => {
        const ocupado = !!state?.sensors[canal], aberta = !!state?.gates[canal]
        const modo = state?.sensorMode[canal] ?? 'auto'
        return <section className="monitor-pista" key={canal} aria-label={`Pista ${i + 1} — ${i === 0 ? 'Entrada' : 'Saída'}`}>
          <h4>Pista {i + 1} — {i === 0 ? 'Entrada' : 'Saída'}</h4>
          <dl><div><dt>Estado da cancela</dt><dd>{!disponivel ? 'Sem leitura' : aberta ? 'Aberta' : 'Fechada'}</dd></div>
            <div><dt>Sensor de presença</dt><dd className={ocupado ? 'monitor-alerta' : 'monitor-verde'}>{!disponivel ? 'Sem leitura' : ocupado ? 'Veículo detectado' : 'Pista livre'}</dd></div></dl>
          <button className={`monitor-forcar ${ocupado ? 'liberar' : ''}`} type="button" disabled={!running} onClick={() => sensor(canal, ocupado ? 'livre' : 'ocupado')}>{ocupado ? 'Liberar sensor (Pista livre)' : 'Obstruir sensor (Simular veículo)'}</button>
          <div className="monitor-modo"><span>{modo === 'auto' ? 'Detecção automática pelo veículo' : modo === 'ocupado' ? 'Obstrução forçada' : 'Pista livre forçada'}</span>
            <button type="button" disabled={!running || modo === 'auto'} onClick={() => sensor(canal, 'auto')}>Voltar ao automático</button></div>
          <div className="monitor-visuais">
            <CancelaMonitor canal={canal} aberta={aberta} movimento={!!state?.memory[i === 0 ? 10 : 16]} disponivel={disponivel} />
            <SemaforoMonitor indice={i * 2} state={state} /><SemaforoMonitor indice={i * 2 + 1} state={state} />
          </div>
          <div className="monitor-comandos"><button type="button" disabled={!running} onClick={() => void enviarCLP({ type: 'coil', address: i === 0 ? 2 : 4, value: true })}>Abrir cancela {canal}</button>
            <button type="button" disabled={!running} onClick={() => void enviarCLP({ type: 'coil', address: i === 0 ? 3 : 5, value: true })}>Fechar cancela {canal}</button></div>
        </section>
      })}
    </div> : <div role="tabpanel" id="monitor-painel-detalhado" aria-labelledby="monitor-tab-detalhado" className="monitor-detalhes">
      <div className="monitor-comandos"><span>127.0.0.1 · Modbus :{state?.ports.modbus ?? settings?.portas.modbus ?? 502} · Altere as portas no painel de Funções Especiais.</span>
        <button type="button" disabled={!window.clp || busy || !state} onClick={async () => {
          setBusy(true)
          if (running) await enviarCLP({ type: 'stop' })
          else if (await enviarCLP({ type: 'start', ports: settings?.portas })) { if (settings) await enviarCLP({ type: 'configure', settings }) }
          setBusy(false)
        }}>{busy ? 'Aguarde…' : running ? 'Parar simulador' : 'Iniciar simulador'}</button></div>
      <section><h4>Entradas físicas da CPU — %I0.0 a %I0.13</h4><p>Ligado = 1. Nos sensores, 1 significa pista livre. Alterar I0.0 ou I0.1 força o sensor; retome a detecção automática no sinótico.</p>
        <div className="monitor-bits">{Array.from({ length: 14 }, (_, i) => <label key={i} className={state?.inputs[`%I0.${i}`] ? 'ativo' : ''}>
          <input type="checkbox" disabled={!running} checked={!!state?.inputs[`%I0.${i}`]} onChange={e => i < 2 ? sensor(i === 0 ? 'A' : 'B', e.target.checked ? 'livre' : 'ocupado') : alterar({ entradas: { ...settings?.entradas, [i]: e.target.checked } })} />%I0.{i}
        </label>)}</div>
      </section>
      <section><h4>Saídas do firmware — %Q0 e %Q1</h4><div className="monitor-bits">{[...Array.from({ length: 10 }, (_, i) => `%Q0.${i}`), ...Array.from({ length: 8 }, (_, i) => `%Q1.${i}`)].map(address => <output key={address} className={state?.outputs[address] ? 'ativo' : ''}>{address} <strong>{state ? state.outputs[address] ? '1' : '0' : '—'}</strong></output>)}</div></section>
      <section><h4>Comandos de semáforos</h4><p>AA: lado A voltado para fora. AB: lado A voltado para B. BA: lado B voltado para A. BB: lado B voltado para fora.</p><div className="monitor-seletores">{SEMAFOROS.map(sem => <label className="controle-sinalizacao" key={sem.id}>{sem.nome}
        <select aria-label={sem.nome} disabled={!running} value={state?.memory[sem.memoria] ? 'verde' : 'vermelho'} onChange={e => definirSemaforoCLP(sem.id, e.target.value === 'verde')}><option value="vermelho">Vermelho</option><option value="verde">Verde</option></select>
      </label>)}</div></section>
      <section><h4>Memórias do piloto automático</h4><div className="monitor-memorias">{([['Entrada', [13, 6, 7, 2, 3, 12, 10]], ['Saída', [18, 8, 9, 4, 5, 17, 16]]] as const).map(([nome, enderecos]) => <div key={nome}><h5>{nome}</h5><dl>{enderecos.map((m, i) => <div key={m}><dt>%M{m} · {['Presença', `${SEMAFOROS.find(sem => sem.memoria === enderecos[1])?.nome} verde`, `${SEMAFOROS.find(sem => sem.memoria === enderecos[2])?.nome} verde`, 'Comando abrir', 'Comando fechar', 'Cancela aberta', 'Cancela em movimento'][i]}</dt><dd className={state?.memory[m] ? 'monitor-verde' : ''}>{state ? state.memory[m] ? '1' : '0' : '—'}</dd></div>)}</dl></div>)}</div></section>
    </div>}
    <section className="monitor-atividades" aria-label="Log de atividades">
      <div><h4>Log de atividades Modbus e simulador</h4><button type="button" disabled={!state?.logs.length} onClick={() => void enviarCLP({ type: 'clear-log' })}>Limpar log</button></div>
      <ol>{state?.logs.length ? [...state.logs].reverse().map((item, i) => <li key={`${item.time}-${i}`}><time>{new Date(item.time).toLocaleTimeString('pt-BR')}</time> {item.text}</li>) : <li>Nenhuma atividade registrada.</li>}</ol>
    </section>
  </ModalConfiguracao>
}
