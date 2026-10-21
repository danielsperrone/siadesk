import { useState } from 'react'
import { CamposLeitor } from '../simulator/InterfaceLeitura'
import type { PostePeriferico } from '../types'
import { CATALOGO } from '../catalog/pieces'
import { SEMAFOROS } from '../simulator/types'
import { BotaoConfiguracao, ModalConfiguracao } from './ModalConfiguracao'
import { ConfiguracaoDisplay } from './ConfiguracaoDisplay'
import { velocidadeDisplay } from '../simulator/display'
import { ConfiguracaoCamera } from './ConfiguracaoCamera'
import { ehCamera } from '../simulator/cameras'

export function ConfiguracaoPeriferico({ perif, alterar }: {
  perif: PostePeriferico
  alterar: <K extends keyof PostePeriferico>(id: string, key: K, value: PostePeriferico[K]) => void
}) {
  const [aberto, setAberto] = useState(false)
  if (!ehCamera(perif.tipo) && !['leitor-rfid', 'semaforo', 'display-mensagens', 'sensor-emissor', 'sensor-receptor'].includes(perif.tipo)) return null
  const nome = CATALOGO[perif.tipo].nome
  return <>
    <BotaoConfiguracao nome={nome} abrir={() => setAberto(true)} />
    {aberto && <ModalConfiguracao titulo={`Configurar ${nome}`} fechar={() => setAberto(false)}>
      {ehCamera(perif.tipo) && <ConfiguracaoCamera perif={perif} alterar={config => alterar(perif.id, 'cameraRtsp', config)} />}
      {perif.tipo === 'camera-ocr' && <h4>Leitura de placa</h4>}
      {(perif.tipo === 'leitor-rfid' || perif.tipo === 'camera-ocr') && <CamposLeitor id={perif.id} tipo={perif.tipo} valor={perif.leitor} cameraRtsp={perif.cameraRtsp} alterar={c => alterar(perif.id, 'leitor', c)} />}
      {perif.tipo === 'semaforo' && <>
        <label className="controle-sinalizacao">Canal do semáforo no simulador
          <select value={perif.canalSemaforo ?? 'figurante'} onChange={e => alterar(perif.id, 'canalSemaforo', e.target.value as PostePeriferico['canalSemaforo'])}>
            <option value="figurante">Figurante / controle manual</option>
            {SEMAFOROS.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
          </select>
          {perif.canalSemaforo && perif.canalSemaforo !== 'figurante' && <small>Segue o CLP quando o simulador está em execução.</small>}
        </label>
        <label className="controle-sinalizacao">{perif.canalSemaforo && perif.canalSemaforo !== 'figurante' ? 'Estado manual (simulador parado)' : 'Estado do semáforo'}
          <select value={perif.estadoSemaforo ?? 'vermelho'} onChange={e => alterar(perif.id, 'estadoSemaforo', e.target.value as PostePeriferico['estadoSemaforo'])}>
            <option value="desligado">Desligado</option><option value="verde">Verde ligado</option><option value="vermelho">Vermelho ligado</option>
          </select>
        </label>
      </>}
      {(perif.tipo === 'sensor-emissor' || perif.tipo === 'sensor-receptor') && <label className="controle-sinalizacao">Canal do sensor no simulador
        <select value={perif.canalSensor ?? 'figurante'} onChange={e => alterar(perif.id, 'canalSensor', e.target.value as PostePeriferico['canalSensor'])}>
          <option value="figurante">Figurante</option><option value="A">Sensor A (entrada)</option><option value="B">Sensor B (saída)</option>
        </select><small>Detecta o caminhão ao cruzar sua posição na pista, na altura de montagem.</small>
      </label>}
      {perif.tipo === 'display-mensagens' && <>
      <ConfiguracaoDisplay id={perif.id} config={perif.displayTcp} alterar={config => alterar(perif.id, 'displayTcp', config)} />
      <label className="controle-sinalizacao">Mensagem do letreiro
        <input type="text" value={perif.mensagemDisplay ?? 'SIAMAC'} maxLength={240} placeholder="Ex.: Aguarde a liberação" onChange={e => alterar(perif.id, 'mensagemDisplay', e.target.value)} />
        <small>{perif.displayTcp?.ativo ? 'Texto manual usado quando o simulador estiver parado. Enquanto ativo, o OWL controla o letreiro.' : 'O texto passa da direita para a esquerda na área vermelha. Deixe vazio para apagar.'}</small>
      </label>
      <label className="controle-sinalizacao">Velocidade do texto · {velocidadeDisplay(perif.velocidadeDisplay).toLocaleString('pt-BR')}×
        <input type="range" min={0.25} max={3} step={0.25} value={velocidadeDisplay(perif.velocidadeDisplay)}
          aria-valuetext={`${velocidadeDisplay(perif.velocidadeDisplay).toLocaleString('pt-BR')} vezes a velocidade padrão`}
          onChange={e => alterar(perif.id, 'velocidadeDisplay', Number(e.target.value))} />
        <small>Mais lento à esquerda, mais rápido à direita. 1× é a velocidade padrão. Aplica na hora e fica salvo neste display.</small>
      </label></>}
    </ModalConfiguracao>}
  </>
}
