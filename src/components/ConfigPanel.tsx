import { useProject, CALIBRACOES_PADRAO } from '../store/project'
import { CATALOGO } from '../catalog/pieces'
import type { ProjectConfig, CalibrationData, PieceTypeId } from '../types'

const ITENS_AUTOMACAO: Array<{ key: keyof ProjectConfig; label: string }> = [
  { key: 'cancelaEntrada', label: 'Cancela de entrada' },
  { key: 'cancelaSaida', label: 'Cancela de saída' },
  { key: 'rfidEntrada', label: 'Leitor RFID de entrada (SIAP01)' },
  { key: 'rfidSaida', label: 'Leitor RFID de saída (SIAP01)' },
  { key: 'posteCameraEntrada', label: 'Câmera + semáforos de entrada (SIAP02)' },
  { key: 'posteCameraSaida', label: 'Câmera + semáforos de saída (SIAP02)' },
  { key: 'cameraOcrEntrada', label: 'Câmera OCR de entrada' },
  { key: 'cameraOcrSaida', label: 'Câmera OCR de saída' },
  { key: 'sensoresBarreira', label: 'Sensores de barreira (SIAP03/04)' },
  { key: 'cameraVeiculoGrande', label: 'Câmera de veículo maior que a balança' },
  { key: 'displayMensagens', label: 'Display de mensagens' },
  { key: 'caixaSom', label: 'Caixa de som' },
  { key: 'painelAutomacao', label: 'Painel SIAMAC' },
  { key: 'cabinePesagem', label: 'Cabine de pesagem' },
  { key: 'lacosIndutivos', label: 'Laços indutivos' },
  { key: 'mostrarVeiculo', label: 'Caminhão ilustrativo' },
]

const EQUIPAMENTOS_CALIBRACAO: Array<{ id: PieceTypeId; label: string }> = [
  { id: 'leitor-rfid', label: 'Leitor RFID' },
  { id: 'semaforo', label: 'Semáforo' },
  { id: 'sensor-emissor', label: 'Sensor Emissor' },
  { id: 'sensor-receptor', label: 'Sensor Receptor' },
  { id: 'caixa-de-som', label: 'Caixa de Som' },
  { id: 'display-mensagens', label: 'Display de Mensagens' },
  { id: 'camera-ip', label: 'Câmera IP' },
  { id: 'camera-ocr', label: 'Câmera OCR' },
]

export function ConfigPanel() {
  const config = useProject((s) => s.config)
  const setConfig = useProject((s) => s.setConfig)
  
  const abaAtiva = useProject((s) => s.abaAtiva)
  const setAbaAtiva = useProject((s) => s.setAbaAtiva)
  
  const equipamentoCalibrando = useProject((s) => s.equipamentoCalibrando)
  const setEquipamentoCalibrando = useProject((s) => s.setEquipamentoCalibrando)
  
  const calibracoes = useProject((s) => s.calibracoes)
  const updateCalibracao = useProject((s) => s.updateCalibracao)

  const calib = calibracoes[equipamentoCalibrando] || { altura: 0, rotacaoY: 0, offsetX: 0, offsetZ: 0 }

  const handleUpdate = (key: keyof CalibrationData, value: number) => {
    updateCalibracao(equipamentoCalibrando, key, value)
  }

  return (
    <aside className="painel-config">
      <h1>Dimensionador</h1>
      <p className="subtitulo">Automação de balança rodoviária</p>

      <div className="abas">
        <button
          className={abaAtiva === 'dimensionamento' ? 'active' : ''}
          onClick={() => setAbaAtiva('dimensionamento')}
        >
          Dimensionamento
        </button>
        <button
          className={abaAtiva === 'calibracao' ? 'active' : ''}
          onClick={() => setAbaAtiva('calibracao')}
        >
          Calibrar Postes
        </button>
      </div>

      <div className="aba-conteudo">
        {abaAtiva === 'dimensionamento' ? (
          <>
            <section>
              <h2>Projeto</h2>
              <label>
                Cliente
                <input
                  type="text"
                  value={config.cliente}
                  onChange={(e) => setConfig('cliente', e.target.value)}
                  placeholder="Nome do cliente"
                />
              </label>
              <label>
                Obra / Local
                <input
                  type="text"
                  value={config.obra}
                  onChange={(e) => setConfig('obra', e.target.value)}
                  placeholder="Cidade — UF"
                />
              </label>
            </section>

            <section>
              <h2>Balança</h2>
              <label>
                Comprimento da plataforma (m)
                <input
                  type="number"
                  min={6}
                  max={36}
                  step={0.5}
                  value={config.comprimentoBalanca}
                  onChange={(e) => setConfig('comprimentoBalanca', Number(e.target.value))}
                />
              </label>
              <label>
                Largura da plataforma (m)
                <input
                  type="number"
                  min={3}
                  max={4}
                  step={0.1}
                  value={config.larguraBalanca}
                  onChange={(e) => setConfig('larguraBalanca', Number(e.target.value))}
                />
              </label>
            </section>

            <section>
              <h2>Itens de automação</h2>
              {ITENS_AUTOMACAO.map(({ key, label }) => (
                <label key={key} className="checkbox">
                  <input
                    type="checkbox"
                    checked={config[key] as boolean}
                    onChange={(e) => setConfig(key, e.target.checked as ProjectConfig[typeof key])}
                  />
                  {label}
                </label>
              ))}
            </section>
          </>
        ) : (
          <div className="calibracao-container">
            <section>
              <h2>Configuração do Fixador</h2>
              <p className="instrucao">
                Selecione o equipamento para ajustar o ponto central do fixador em relação ao poste:
              </p>
              
              <div className="seletor-equipamento">
                {EQUIPAMENTOS_CALIBRACAO.map((eq) => (
                  <button
                    key={eq.id}
                    className={equipamentoCalibrando === eq.id ? 'active' : ''}
                    onClick={() => setEquipamentoCalibrando(eq.id)}
                  >
                    {eq.label}
                  </button>
                ))}
              </div>
            </section>

            <section className="controles-calibracao">
              <h3>Ajustes de {CATALOGO[equipamentoCalibrando]?.nome}</h3>
              
              <h4>Assistente de Fixador (Bolinha Rosa)</h4>
              <p className="ajuda-calibracao">Posicione a bolinha rosa no centro geometrico do fixador/abracadeira do modelo:</p>
              
              <div className="controle-grupo">
                <label>
                  <span>Fixador Lateral (X): <strong>{calib.fixadorX.toFixed(2)} m</strong></span>
                  <input
                    type="range"
                    min="-0.8"
                    max="0.8"
                    step="0.01"
                    value={calib.fixadorX}
                    onChange={(e) => handleUpdate('fixadorX', Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="controle-grupo">
                <label>
                  <span>Fixador Altura (Y): <strong>{calib.fixadorY.toFixed(2)} m</strong></span>
                  <input
                    type="range"
                    min="-0.8"
                    max="0.8"
                    step="0.01"
                    value={calib.fixadorY}
                    onChange={(e) => handleUpdate('fixadorY', Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="controle-grupo">
                <label>
                  <span>Fixador Profundidade (Z): <strong>{calib.fixadorZ.toFixed(2)} m</strong></span>
                  <input
                    type="range"
                    min="-0.8"
                    max="0.8"
                    step="0.01"
                    value={calib.fixadorZ}
                    onChange={(e) => handleUpdate('fixadorZ', Number(e.target.value))}
                  />
                </label>
              </div>

              <h4>Posicao no Poste (Bolinha Rosa)</h4>
              <p className="ajuda-calibracao">Movimente e gire o conjunto no poste a partir da bolinha rosa:</p>

              <div className="controle-grupo">
                <label>
                  <span>Altura no Poste (Y): <strong>{calib.altura.toFixed(2)} m</strong></span>
                  <input
                    type="range"
                    min="0.0"
                    max="3.5"
                    step="0.05"
                    value={calib.altura}
                    onChange={(e) => handleUpdate('altura', Number(e.target.value))}
                  />
                </label>
              </div>

              <div className="controle-grupo">
                <label>
                  <span>Giro no Poste (Rotacao Y): <strong>{calib.rotacaoY}°</strong></span>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={calib.rotacaoY}
                    onChange={(e) => handleUpdate('rotacaoY', Number(e.target.value))}
                  />
                </label>
              </div>

              <button
                className="btn-reset"
                onClick={() => {
                  const padrao = CALIBRACOES_PADRAO[equipamentoCalibrando]
                  if (padrao) {
                    handleUpdate('altura', padrao.altura)
                    handleUpdate('rotacaoY', padrao.rotacaoY)
                    handleUpdate('fixadorX', padrao.fixadorX)
                    handleUpdate('fixadorY', padrao.fixadorY)
                    handleUpdate('fixadorZ', padrao.fixadorZ)
                  }
                }}
              >
                Resetar para o Padrao
              </button>
            </section>
          </div>
        )}
      </div>
    </aside>
  )
}

