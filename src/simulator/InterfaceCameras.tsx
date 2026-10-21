import { useEffect, useMemo, useState } from 'react'
import { useProject } from '../store/project'
import { gerarLayout } from '../layout/engine'
import { CONFIG_CAMERAS, ehCamera, useCameras } from './cameras'
import './cameras.css'

export function OpcoesCameras() {
  const settings = useProject(s => s.config.simuladorCameras ?? CONFIG_CAMERAS)
  const setConfig = useProject(s => s.setConfig)
  const [porta, setPorta] = useState(settings.porta)
  useEffect(() => setPorta(settings.porta), [settings.porta])
  const portaValida = Number.isInteger(porta) && porta >= 1024 && porta <= 65535
  return <>
    <div className="cameras-opcoes">
      <label className="controle-sinalizacao">Quadros por segundo
        <select aria-label="Quadros por segundo" value={settings.fps} onChange={e => setConfig('simuladorCameras', { ...settings, fps: Number(e.target.value) })}>
          <option value={1}>1 · mais leve</option><option value={2}>2 · recomendado</option><option value={5}>5 · mais movimento</option>
        </select>
      </label>
      <label className="controle-sinalizacao">Resolução
        <select aria-label="Resolução" value={settings.largura} onChange={e => setConfig('simuladorCameras', { ...settings, largura: Number(e.target.value) })}>
          <option value={640}>640 × 360 · leve</option><option value={960}>960 × 540 · mais detalhe</option>
          <option value={1920}>1920 × 1080 · Full HD</option><option value={2688}>2688 × 1520 · 4 MP</option>
        </select>
      </label>
    </div>
    <label className="controle-sinalizacao">Porta RTSP
      <div className="cameras-endereco"><input aria-label="Porta RTSP" type="number" min={1024} max={65535} value={porta} onChange={e => setPorta(Number(e.target.value))} />
        <button type="button" disabled={!portaValida || porta === settings.porta} onClick={() => setConfig('simuladorCameras', { ...settings, porta })}>Aplicar</button>
      </div>
    </label>
    {!portaValida && <p role="alert" className="clp-error">Use uma porta de 1024 a 65535.</p>}
  </>
}

export function PainelCameras() {
  const config = useProject(s => s.config), cal = useProject(s => s.calibracoes)
  const estado = useCameras(s => s.estado), erro = useCameras(s => s.erro)
  const cameras = useMemo(() => gerarLayout(config, cal).filter(p => ehCamera(p.tipo)), [config, cal])
  const ativas = cameras.filter(p => p.cameraRtsp?.ativa).length
  const settings = config.simuladorCameras ?? CONFIG_CAMERAS
  return <section className="painel-simulador painel-cameras" aria-label="Simulador de câmeras RTSP">
    <h3>Câmeras IP e OCR · RTSP</h3>
    <p className="clp-description">Abra a engrenagem da câmera nos equipamentos do poste para ativar a transmissão, copiar o endereço e ver a imagem. As opções ficam salvas no projeto.</p>
    <button type="button" onClick={() => useProject.getState().setAbaAtiva('postes')}>Configurar câmeras nos equipamentos</button>
    <p role="status" className="clp-status">{ativas ? `${ativas} de ${cameras.length} câmeras ativadas · ${estado.cameras.filter(c => c.pronta).length} transmitindo` : 'Nenhuma câmera ativada'}</p>
    {(erro || estado.fase === 'erro') && <p role="alert" className="clp-error">{erro || estado.mensagem}</p>}
    {!window.cameras && <p className="clp-description">As configurações podem ser salvas aqui. A transmissão funciona no aplicativo SIADESK.</p>}
    <OpcoesCameras />
    {estado.fase === 'executando' && estado.fps < settings.fps && <p className="clp-description">Para manter o uso leve, a taxa foi ajustada para {estado.fps.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} quadros/s por câmera.</p>}
  </section>
}
