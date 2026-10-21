import { useEffect, useState } from 'react'
import type { PostePeriferico } from '../types'
import { useProject } from '../store/project'
import { aberturaCamera, caminhoCamera, CONFIG_CAMERAS, useCameras, type ConfigCamera } from '../simulator/cameras'
import { OpcoesCameras } from '../simulator/InterfaceCameras'
import { campoVertical, campoVerticalFicha, dimensoesCamera, focalCamera, inclinacaoCamera, perfil5460, PERFIL_5460, VIP_5460 } from '../simulator/optica-ocr'

export function ConfiguracaoCamera({ perif, alterar }: { perif: PostePeriferico; alterar: (config: ConfigCamera) => void }) {
  const ocr = perif.tipo === 'camera-ocr', intelbras = perfil5460(perif)
  const atual: ConfigCamera = { ativa: false, ...perif.cameraRtsp, abertura: aberturaCamera(perif),
    ...(ocr ? { perfil: intelbras ? PERFIL_5460 : 'generica' } : {}) }
  const settings = useProject(s => s.config.simuladorCameras ?? CONFIG_CAMERAS)
  const { estado, erro, previewId, preview } = useCameras()
  const stream = estado.cameras.find(c => c.id === perif.id)
  const [caminho, setCaminho] = useState(''), [copiado, setCopiado] = useState(false), [erroLink, setErroLink] = useState('')
  const host = atual.host || '127.0.0.1'
  const hosts = [...new Set(['127.0.0.1', ...estado.hosts, host])]
  const url = caminho ? `rtsp://${host}:${settings.porta}/${caminho}` : ''
  const selecionada = previewId === perif.id
  useEffect(() => {
    let valido = true
    void caminhoCamera(perif.id).then(value => { if (valido) setCaminho(value) }).catch(() => { if (valido) setErroLink('Não foi possível gerar o endereço RTSP.') })
    return () => {
      valido = false
      if (useCameras.getState().previewId === perif.id) useCameras.setState({ previewId: null, preview: null })
    }
  }, [perif.id])
  useEffect(() => {
    if (!copiado) return
    const timer = setTimeout(() => setCopiado(false), 2000)
    return () => clearTimeout(timer)
  }, [copiado])
  const configurar = (patch: Partial<ConfigCamera>) => alterar({ ...atual, ...patch })
  const erroVideo = atual.ativa ? stream?.erro || erro || (estado.fase === 'erro' ? estado.mensagem : '') : ''
  const focal = focalCamera(atual.focalMm), inclinacao = inclinacaoCamera(atual.inclinacao)
  const dimensoes = dimensoesCamera(settings.largura)
  const vertical = campoVertical(perif, dimensoes.largura / dimensoes.altura)
  const distancia = Math.max(1, Math.min(30, Number.isFinite(atual.distanciaReferencia) ? atual.distanciaReferencia! : 5))
  const medida = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })
  return <section className="camera-config painel-cameras" aria-label="Imagem da câmera por RTSP">
    {ocr && <>
      <h4>Lente e inclinação</h4>
      <label className="controle-sinalizacao">Perfil da câmera OCR
        <select aria-label="Perfil da câmera OCR" value={intelbras ? PERFIL_5460 : 'generica'} onChange={e => configurar(e.target.value === PERFIL_5460
          ? { perfil: PERFIL_5460, focalMm: 2.7, abertura: 92 }
          : { perfil: 'generica', abertura: atual.abertura })}>
          <option value={PERFIL_5460}>{VIP_5460.nome}</option><option value="generica">Campo de visão personalizado</option>
        </select>
      </label>
      {intelbras && <>
        <label className="controle-sinalizacao">Lente · {medida(focal)} mm · zoom óptico {medida(focal / 2.7)}×
          <input type="range" min={2.7} max={12} step={0.1} value={focal} aria-label="Distância focal da câmera OCR" onChange={e => configurar({ focalMm: Number(e.target.value) })} />
          <small>2,7 mm abre a imagem; 12 mm aproxima o detalhe. Resolução nativa de referência: 2688 × 1520.</small>
        </label>
        <p className="clp-description">Campo horizontal: {medida(atual.abertura)}° · vertical simulado: {medida(vertical)}°.</p>
      </>}
      <label className="controle-sinalizacao">Inclinação vertical · {medida(inclinacao)}°
        <input type="range" min={-45} max={45} step={0.1} value={inclinacao} aria-label="Inclinação vertical da câmera OCR" onChange={e => configurar({ inclinacao: Number(e.target.value) })} />
        <small>Negativo aponta para baixo; positivo para cima. Só a cabeça inclina; a fixação no poste permanece parada.</small>
      </label>
      <div className="cameras-endereco">
        <input type="number" aria-label="Ângulo vertical em graus" min={-45} max={45} step={0.1} value={Number(inclinacao.toFixed(1))} onChange={e => {
          if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) configurar({ inclinacao: inclinacaoCamera(e.target.valueAsNumber) })
        }} />
        <button type="button" onClick={() => configurar({ inclinacao: 0 })}>Nivelar cabeça</button>
      </div>
      <label className="controle-sinalizacao">Distância para conferir o enquadramento (m)
        <input type="number" min={1} max={30} step={0.5} value={distancia} onChange={e => {
          if (e.target.value !== '' && Number.isFinite(e.target.valueAsNumber)) configurar({ distanciaReferencia: Math.max(1, Math.min(30, e.target.valueAsNumber)) })
        }} />
        <small>A {medida(distancia)} m no eixo da lente, cabem aproximadamente {medida(2 * distancia * Math.tan(atual.abertura * Math.PI / 360))} m de largura × {medida(2 * distancia * Math.tan(vertical * Math.PI / 360))} m de altura, em um plano frontal.</small>
      </label>
      {intelbras && <details className="camera-opcoes-comuns"><summary>Referência e limites da simulação</summary>
        <p className="clp-description">A ficha informa H de 92° a 46,1° e V de 49° a 26°. Esses pares não correspondem exatamente à proporção do vídeo. O 3D usa H como referência e calcula V pelo formato da imagem, preservando as proporções dos objetos. Nesta lente, V publicado é {medida(campoVerticalFicha(perif))}°. Os valores entre as extremidades da lente são aproximados.</p>
        <p className="clp-description">Enquadrar não garante leitura: textos pequenos, foco, luz e ângulo precisam de validação na câmera real. <a href={VIP_5460.fonte} target="_blank" rel="noreferrer">Ficha técnica Intelbras</a></p>
      </details>}
    </>}
    <h4>Imagem por RTSP</h4>
    <label className="checkbox"><input type="checkbox" checked={atual.ativa} onChange={e => {
      configurar({ ativa: e.target.checked })
      if (!e.target.checked && selecionada) useCameras.setState({ previewId: null, preview: null })
    }} />Ativar transmissão RTSP</label>
    <p role="status" className="clp-status">{!atual.ativa ? 'Câmera desativada' : !window.cameras ? 'Ativação salva · transmissão disponível no aplicativo' : stream?.pronta ? 'Transmitindo imagem' : estado.fase === 'iniciando' || estado.fase === 'erro' ? estado.mensagem : 'Aguardando imagem da câmera'}</p>
    {hosts.length > 1 && <label className="controle-sinalizacao">Endereço para acessar esta câmera
      <select aria-label="Endereço para acessar esta câmera" value={host} onChange={e => configurar({ host: e.target.value })}>
        {hosts.map(h => <option key={h} value={h}>{h === '127.0.0.1' ? 'Neste computador · 127.0.0.1' : `Na rede · ${h}`}</option>)}
      </select>
    </label>}
    <label className="controle-sinalizacao">Endereço RTSP
      <div className="cameras-endereco"><input type="text" aria-label="Endereço RTSP da câmera" readOnly value={url} onFocus={e => e.target.select()} />
        <button type="button" disabled={!url} onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopiado(true); setErroLink('') }
          catch { setErroLink('Selecione o endereço e pressione Ctrl+C para copiar.') }
        }}>{copiado ? 'Copiado' : 'Copiar'}</button>
      </div>
      <small>Use este endereço no OWL, VLC ou NVR com transporte RTSP/TCP. O link permanece o mesmo ao salvar e reabrir o projeto.</small>
    </label>
    {(erroVideo || erroLink) && <p role="alert" className="clp-error">{erroVideo || erroLink}</p>}
    {!intelbras && <label className="controle-sinalizacao">Campo de visão · {medida(atual.abertura)}°
      <input aria-label="Campo de visão da câmera" type="range" min={20} max={110} step={1} value={atual.abertura} onChange={e => configurar({ abertura: Number(e.target.value) })} />
      <small>A altura e o giro acompanham o equipamento no poste.</small>
    </label>}
    <button type="button" aria-expanded={selecionada} onClick={() => useCameras.setState({ previewId: selecionada ? null : perif.id, preview: null })}>{selecionada ? 'Ocultar imagem' : 'Ver imagem da câmera'}</button>
    {selecionada && (preview ? <img className="camera-preview" src={preview} alt="Imagem desta câmera" /> : <p className="clp-description">Aguardando o próximo quadro…</p>)}
    {!atual.ativa && <p className="clp-description">A prévia funciona sem ativar a transmissão RTSP.</p>}
    <details className="camera-opcoes-comuns"><summary>Qualidade e porta RTSP do projeto</summary>
      <p className="clp-description">Estas opções são compartilhadas pelas câmeras deste projeto.</p>
      <OpcoesCameras />
    </details>
    <p className="clp-description">A ativação e as configurações são aplicadas agora. Use <strong>Salvar Projeto</strong> para mantê-las ao reabrir. Cada câmera inicia conforme o estado salvo.</p>
    {perif.tipo === 'camera-ocr' && <p className="clp-description">O envio da leitura de placa é configurado separadamente abaixo.</p>}
  </section>
}
