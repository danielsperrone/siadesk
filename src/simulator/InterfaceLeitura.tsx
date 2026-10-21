import { useId, useState } from 'react'
import { ModalConfiguracao } from '../components/ModalConfiguracao'
import { useProject } from '../store/project'
import { identidadePadrao, padraoLeitor, TAGS, useLeitura, type ConfigLeitor, type ParteVeiculo } from './leitura'
import './leitura.css'
import { campoHorizontal } from './optica-ocr'
import type { ConfigCamera } from './cameras'

export function IdentidadeVeiculoModal({ parteInicial, fechar, peso }: { parteInicial: ParteVeiculo; fechar: () => void; peso: () => void }) {
  const [parte, setParte] = useState(parteInicial), [busca, setBusca] = useState('')
  const listaId = useId(), ajudaId = useId()
  const config = useProject(s => s.config), setConfig = useProject(s => s.setConfig)
  const identidades = config.identidadesVeiculo ?? identidadePadrao
  const atual = identidades[parte]
  const numero = /^\d+$/.test(busca.trim()) ? Number(busca) : NaN
  const tag = Number.isInteger(numero) && numero >= 1 && numero <= 100 ? TAGS[numero - 1] : undefined
  const adicionada = !!tag && atual.tags.includes(tag)
  const alterar = (patch: Partial<typeof atual>) => setConfig('identidadesVeiculo', { ...identidades, [parte]: { ...atual, ...patch } })
  const adicionar = () => { if (tag && !adicionada) { alterar({ tags: [...atual.tags, tag] }); setBusca('') } }
  return <ModalConfiguracao titulo="Identificação do veículo" fechar={fechar} className="identidade-modal">
    <div className="identidade-partes" aria-label="Parte do veículo">{(['cavalo', 'reboque'] as const).map(p => <button key={p} aria-pressed={parte === p} onClick={() => setParte(p)}>{p === 'cavalo' ? 'Cavalo · cabine' : 'Reboque · traseira'}</button>)}</div>
    <label className="controle-sinalizacao">Placa do {parte}
      <input type="text" className="identidade-placa" aria-label={`Placa do ${parte}`} value={atual.placa} maxLength={8} placeholder="ABC1D23" onChange={e => alterar({ placa: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7) })} />
      <small>{/^[A-Z]{3}[0-9][A-Z0-9][0-9]{2}$/.test(atual.placa) ? 'A placa aparece no 3D e pode ser lida pelas câmeras OCR.' : 'Use 7 caracteres: ABC1234 ou ABC1D23. O OCR só envia placas completas.'}</small>
    </label>
    <section className="tags-secao" aria-label="Tags RFID">
    <div className="tags-titulo"><h4>Tags RFID</h4><span>{atual.tags.length} {atual.tags.length === 1 ? 'vinculada' : 'vinculadas'}</span></div>
    <p className="clp-description">{parte === 'cavalo' ? 'Lidas quando o para-brisa entra no cone da antena.' : 'Lidas quando a traseira do reboque entra no cone da antena.'}</p>
    <div className="tags-adicionar">
      <label className="controle-sinalizacao">Pesquisar número da tag
        <input type="text" inputMode="numeric" list={listaId} value={busca} maxLength={24} placeholder="Digite de 1 a 100" aria-describedby={ajudaId} onChange={e => setBusca(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); adicionar() } }} />
        <datalist id={listaId}>{TAGS.filter(t => !atual.tags.includes(t)).map(t => <option key={t} value={String(Number(t)).padStart(3, '0')}>Tag {String(Number(t)).padStart(3, '0')}</option>)}</datalist>
      </label>
      <button type="button" disabled={!tag || adicionada} onClick={adicionar}>Adicionar tag</button>
    </div>
    <div id={ajudaId} className="tag-preview" aria-live="polite">{adicionada ? 'Esta tag já está vinculada.' : tag ? <code>{tag}</code> : busca ? 'Informe um número de 1 a 100.' : 'Pesquise pelo número ou cole os 24 dígitos da tag.'}</div>
    {atual.tags.length ? <ul className="tags-lista">{atual.tags.map(t => <li key={t}><span><strong>Tag {Number(t).toString().padStart(3, '0')}</strong><code>{t}</code></span><button aria-label={`Remover tag ${Number(t)}`} onClick={() => alterar({ tags: atual.tags.filter(v => v !== t) })}>Remover</button></li>)}</ul> : <p className="tags-vazio">Nenhuma tag neste {parte}. Pesquise um número acima para adicionar.</p>}
    </section>
    <button className="identidade-peso" onClick={peso}>Voltar ao peso do conjunto</button>
  </ModalConfiguracao>
}

export function CamposLeitor({ id, tipo, valor, alterar, cameraRtsp }: { id: string; tipo: string; valor?: ConfigLeitor; alterar: (c: ConfigLeitor) => void; cameraRtsp?: ConfigCamera }) {
  const c = valor ?? padraoLeitor(tipo), rfid = tipo === 'leitor-rfid'
  const estado = useLeitura(s => s.estados[id]), erro = useLeitura(s => s.erro), detectado = useLeitura(s => s.deteccoes[id])
  const [ip, setIp] = useState(c.ip), [porta, setPorta] = useState(String(c.porta))
  const ipValido = /^(\d{1,3}\.){3}\d{1,3}$/.test(ip) && ip.split('.').every(v => Number(v) <= 255)
  const valido = ipValido && /^\d+$/.test(porta) && Number(porta) > 0 && Number(porta) <= 65535
  const set = (patch: Partial<ConfigLeitor>) => alterar({ ...c, ...patch })
  return <div className="leitor-config">
    <label className="checkbox"><input type="checkbox" checked={c.ativo} onChange={e => set({ ativo: e.target.checked })} />Ativar simulador {rfid ? 'RFID' : 'OCR'}</label>
    {!rfid && <label className="controle-sinalizacao">Conexão OCR<select value={c.modo} onChange={e => set({ modo: e.target.value as ConfigLeitor['modo'] })}><option value="tcp">Direto no OWL · TCP</option><option value="http">Plugin de câmera · HTTP LPR</option></select></label>}
    <div className="leitor-rede"><label className="controle-sinalizacao">{rfid || c.modo === 'http' ? 'IP local de escuta' : 'IP do OWL'}<input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="127.0.0.1" /></label><label className="controle-sinalizacao">Porta<input type="text" inputMode="numeric" value={porta} onChange={e => setPorta(e.target.value)} /></label></div>
    <button disabled={!valido || (ip === c.ip && Number(porta) === c.porta)} onClick={() => set({ ip, porta: Number(porta) })}>Aplicar conexão</button>
    <p className="clp-description">{rfid || c.modo === 'http' ? 'Use um IP desta máquina. Para vários leitores no mesmo IP, escolha portas diferentes.' : 'O simulador se conecta ao servidor OCR do OWL e reconecta automaticamente.'}</p>
    <label className="controle-sinalizacao">Alcance · {c.alcance} m<input type="range" min="1" max="30" step="0.5" value={c.alcance} onChange={e => set({ alcance: Number(e.target.value) })} /></label>
    {rfid ? <label className="controle-sinalizacao">Abertura do cone · {c.abertura}°<input type="range" min="5" max="120" value={c.abertura} onChange={e => set({ abertura: Number(e.target.value) })} /></label>
      : <p className="clp-description">O campo retangular de leitura acompanha a lente e a inclinação da câmera · H {campoHorizontal({ tipo: 'camera-ocr', cameraRtsp, leitor: valor }).toFixed(1)}°. O RTSP e o envio da placa podem ser ativados separadamente.</p>}
    <label className="checkbox"><input type="checkbox" checked={c.mostrarCone} onChange={e => set({ mostrarCone: e.target.checked })} />Visualizar cone no cenário</label>
    <div className="leitor-status" role="status">{!window.leitores ? 'Prévia 3D · conexão disponível no aplicativo' : !c.ativo ? 'Simulador desativado' : estado?.running ? `${estado.clients} conexão(ões) · ${estado.enviados} envio(s)` : 'Aguardando conexão'}{detectado && <small>Na área de leitura: {detectado}</small>}{estado?.ultimo && <small>Último envio: {estado.ultimo}</small>}</div>
    {(erro || estado?.error) && <p role="alert" className="clp-error">{erro || estado?.error}</p>}
  </div>
}
