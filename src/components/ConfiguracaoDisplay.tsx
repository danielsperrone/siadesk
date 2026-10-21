import { useEffect, useState } from 'react'
import { DISPLAY_PADRAO, textoDisplay, useDisplays, type ConfigDisplay } from '../simulator/display'

export function ConfiguracaoDisplay({ id, config, alterar }: { id: string; config?: ConfigDisplay; alterar: (config: ConfigDisplay) => void }) {
  const atual = config ?? DISPLAY_PADRAO
  const [ip, setIp] = useState(atual.ip)
  const [porta, setPorta] = useState(String(atual.porta))
  const [erro, setErro] = useState('')
  const [agora, setAgora] = useState(new Date())
  const estado = useDisplays(s => s.estados[id])
  const globalError = useDisplays(s => s.error)
  useEffect(() => { const timer = setInterval(() => setAgora(new Date()), 1000); return () => clearInterval(timer) }, [])
  const aplicar = (ativo: boolean) => {
    const endereco = ip.trim(), partes = endereco.split('.')
    if (ativo && (partes.length !== 4 || partes.some(p => !/^(0|[1-9]\d{0,2})$/.test(p) || Number(p) > 255) || endereco === '0.0.0.0' || !/^\d+$/.test(porta) || Number(porta) < 1 || Number(porta) > 65535)) {
      setErro('Informe um IPv4 válido e uma porta entre 1 e 65535.'); return
    }
    setErro(''); alterar(ativo ? { ativo, ip: endereco, porta: Number(porta) } : { ...atual, ativo })
  }
  return <>
    <label className="controle-sinalizacao">IP do display remoto
      <input type="text" value={ip} onChange={e => setIp(e.target.value)} placeholder="127.0.0.1" />
      <small>Use o mesmo IP no OWL. Para vários displays neste computador, use 127.0.0.2, 127.0.0.3 ou portas diferentes. Um IP de rede precisa estar atribuído a este computador.</small>
    </label>
    <label className="controle-sinalizacao">Porta TCP do display
      <input type="text" inputMode="numeric" value={porta} onChange={e => setPorta(e.target.value)} />
      <small>OWL normal: 2101. OWL em modo simulado: 30056 (display 1) e 30057 (display 2).</small>
    </label>
    <div className="display-acoes">
      <button type="button" onClick={() => aplicar(true)}>{atual.ativo ? 'Aplicar conexão' : 'Iniciar display'}</button>
      {atual.ativo && <button type="button" onClick={() => aplicar(false)}>Parar display</button>}
    </div>
    {!window.displays && <p className="display-aviso">A recepção do OWL funciona no aplicativo SIADESK. A configuração será salva no projeto.</p>}
    {(erro || globalError || estado?.error) && <p className="display-erro" role="alert">{erro || globalError || estado?.error}</p>}
    <div className="controle-sinalizacao">
      <span role="status">{!atual.ativo ? 'Display parado · texto manual' : estado?.running ? `${estado.clients ? 'OWL conectado' : 'Aguardando o OWL'} · ${estado.ip}:${estado.porta}` : 'Display sem conexão'}</span>
      {atual.ativo && <>
        <output className="display-previa" aria-label="Mensagem recebida do OWL">{textoDisplay(estado, agora) || (estado?.recebidos ? 'Painel apagado' : 'Aguardando mensagem')}</output>
        <small>{estado?.recebidos ?? 0} mensagens recebidas{estado?.invalidos ? ` · ${estado.invalidos} pacotes inválidos ignorados` : ''}</small>
      </>}
    </div>
  </>
}
