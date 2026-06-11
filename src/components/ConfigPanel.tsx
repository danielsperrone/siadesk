import { useProject } from '../store/project'
import type { ProjectConfig } from '../types'

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

export function ConfigPanel() {
  const config = useProject((s) => s.config)
  const setConfig = useProject((s) => s.setConfig)

  return (
    <aside className="painel-config">
      <h1>Dimensionador</h1>
      <p className="subtitulo">Automação de balança rodoviária</p>

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
    </aside>
  )
}
