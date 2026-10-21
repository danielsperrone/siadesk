import { useSession } from '../cloud/session'
import { AlturaPostePadrao, PostesAdicionais } from './PostesAdicionais'
import { perifericosPoste, posicaoPosteAdicional, TIPOS_BARRA_SUPERIOR } from '../layout/postes'
import { useState } from 'react'
import { useProject, CALIBRACOES_PADRAO } from '../store/project'
import { CATALOGO, MODELOS_VEICULO } from '../catalog/pieces'
import { alturaMaximaPoste, criarPeriferico, obterPadraoPeriferico } from '../store/padroes-perifericos'
import { PainelSimulador } from '../simulator/PainelSimulador'
import { ConfiguracaoPeriferico } from './ConfiguracaoPeriferico'
import { PainelCameras } from '../simulator/InterfaceCameras'
import { PainelBalanca } from '../simulator/InterfaceBalanca'
import type { CalibrationData, PadraoPerifericoPoste, PieceTypeId, PostePeriferico, ProjectConfig } from '../types'

const EQUIPAMENTOS_CALIBRACAO: Array<{ id: PieceTypeId; label: string }> = [
  { id: 'cancela', label: 'Cancela' },
  { id: 'leitor-rfid', label: 'Antena RFID' },
  { id: 'semaforo', label: 'Semáforo' },
  { id: 'sensor-emissor', label: 'Sensor Emissor' },
  { id: 'sensor-receptor', label: 'Sensor Receptor' },
  { id: 'caixa-de-som', label: 'Caixa de Som' },
  { id: 'display-mensagens', label: 'Display de Mensagens' },
  { id: 'camera-ip', label: 'Câmera IP POE' },
  { id: 'camera-ocr', label: 'Câmera OCR' },
  { id: 'camera-ip-baixo', label: 'Câmera IP de Auditoria de Carga (Superior)' },
  { id: 'refletor-frontal', label: 'Refletor frontal' },
  { id: 'refletor-poste', label: 'Refletor tipo poste (para baixo)' },
  { id: 'veiculo', label: 'Caminhão (Ilustrativo)' },
]

const OPCOES_EQUIPAMENTOS_ADICIONAIS = [
  'Roteador POE 8 portas',
  'Roteador POE 12 portas',
  'Roteador POE 16 portas',
  'Roteador POE 20 portas',
  'TAG RFID Guarda Chuva',
  'TAG RFID Bolacha',
  'TAG RFID colável',
  'leitor RFID de mesa',
  'Microfone'
]

export function ConfigPanel() {
  const canCalibrate = useSession(s => !!s.user?.admin)
  const cenasGlobais = useProject(s => s.cenasGlobais)
  const escopoCena = useProject(s => s.escopoCena)
  const setEscopoCena = useProject(s => s.setEscopoCena)
  const config = useProject((s) => s.config)
  const setConfig = useProject((s) => s.setConfig)
  
  const [posteEditandoDistancia, setPosteEditandoDistancia] = useState<string | null>(null)
  const posteEditandoPerifericos = useProject((s) => s.posteEditandoPerifericos)
  const setPosteEditandoPerifericos = useProject((s) => s.setPosteEditandoPerifericos)
  const [perifericoSelecionadoParaAdicionar, setPerifericoSelecionadoParaAdicionar] = useState<string>('camera-ip')
  const [montagemTrave, setMontagemTrave] = useState<NonNullable<PostePeriferico['montagem']>>('coluna-negativa')
  const [modalAdicionaisAberto, setModalAdicionaisAberto] = useState(false)
  const [menuMaisOpcoesAberto, setMenuMaisOpcoesAberto] = useState(false)
  const [modalCopiarPerifericosAberto, setModalCopiarPerifericosAberto] = useState(false)

  const fecharModalPerifericos = () => {
    setPosteEditandoPerifericos(null)
    setMenuMaisOpcoesAberto(false)
    setModalCopiarPerifericosAberto(false)
  }
  const [equipamentoAdicionalSelecionado, setEquipamentoAdicionalSelecionado] = useState(OPCOES_EQUIPAMENTOS_ADICIONAIS[0])
  const [quantidadeAdicional, setQuantidadeAdicional] = useState(1)
  
  const abaAtiva = useProject((s) => s.abaAtiva)
  const equipamentoCalibrando = useProject((s) => s.equipamentoCalibrando)
  const setEquipamentoCalibrando = useProject((s) => s.setEquipamentoCalibrando)
  
  const calibracoes = useProject((s) => s.calibracoes)
  const updateCalibracao = useProject((s) => s.updateCalibracao)

  const setSolicitouSalvarCena = useProject((s) => s.setSolicitouSalvarCena)
  const setCenaParaIr = useProject((s) => s.setCenaParaIr)
  const excluirCena = useProject((s) => s.excluirCena)

  const [nomeNovaCena, setNomeNovaCena] = useState('')

  const handleSalvarCena = () => {
    if (!nomeNovaCena.trim()) return
    setSolicitouSalvarCena(nomeNovaCena.trim())
    setNomeNovaCena('')
  }

  const calib = calibracoes[equipamentoCalibrando] || { altura: 0, rotacaoY: 0, fixadorX: 0, fixadorY: 0, fixadorZ: 0 }

  const handleUpdate = (key: keyof CalibrationData, value: number) => {
    updateCalibracao(equipamentoCalibrando, key, value)
  }

  return (
    <aside className="painel-config">
      <div className="aba-conteudo">
        {abaAtiva === 'projeto' && (
          <>
            <section>
              <h2>Informações do Projeto</h2>
              <label>
                Nome do Projeto
                <input
                  type="text"
                  value={config.nomeProjeto}
                  onChange={(e) => setConfig('nomeProjeto', e.target.value)}
                  placeholder="Ex: Automação Balança 01"
                />
              </label>
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
                Código da Proposta
                <input
                  type="text"
                  value={config.codigoProposta}
                  onChange={(e) => setConfig('codigoProposta', e.target.value)}
                  placeholder="Ex: OWLAUT-220424"
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
              <label>
                Tipo de instalação
                <select
                  value={config.tipoInstalacaoBalanca ?? 'sobrepor'}
                  onChange={(e) => setConfig('tipoInstalacaoBalanca', e.target.value as ProjectConfig['tipoInstalacaoBalanca'])}
                >
                  <option value="sobrepor">De sobrepor</option>
                  <option value="semiembutida">Semiembutida</option>
                  <option value="embutida">Embutida</option>
                </select>
              </label>
            </section>

            <section>
              <h2>Painéis Centrais</h2>
              <p style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4', marginTop: 0 }}>
                Painéis concentradores de cabos. Não ficam em poste: partem do meio da balança, no
                lado da cabine, à distância definida abaixo. Com os dois ativos, ficam lado a lado
                (0,5 m entre eles) centralizados como conjunto.
              </p>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={config.painelAutomacao}
                  onChange={(e) => setConfig('painelAutomacao', e.target.checked)}
                />
                Painel SIAMAC (automação)
              </label>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={config.painelSom}
                  onChange={(e) => setConfig('painelSom', e.target.checked)}
                />
                Painel de Som
              </label>
            </section>

            <section>
              <h2>Distâncias para Cabeamento</h2>
              <label>
                Meio da Balança até os Painéis (SIAMAC / Som) (m)
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={config.distanciaPainelAutomacao ?? 15}
                  onChange={(e) => setConfig('distanciaPainelAutomacao', Number(e.target.value))}
                />
              </label>
              <label>
                Meio da Balança até Quadro Distribuição (m)
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={config.distanciaQuadroDistribuicao ?? 10}
                  onChange={(e) => setConfig('distanciaQuadroDistribuicao', Number(e.target.value))}
                />
              </label>
              <label>
                Meio da Balança até Roteador POE (m)
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={config.distanciaRoteadorPoE ?? 20}
                  onChange={(e) => setConfig('distanciaRoteadorPoE', Number(e.target.value))}
                />
              </label>
              <label>
                Painéis (SIAMAC / Som) até Quadro de Distribuição (m)
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={config.distanciaPainelQuadro ?? 5}
                  onChange={(e) => setConfig('distanciaPainelQuadro', Number(e.target.value))}
                />
              </label>
              <label>
                Painéis (SIAMAC / Som) até Roteador POE (m)
                <input
                  type="number"
                  min={0}
                  max={200}
                  step={1}
                  value={config.distanciaPainelRoteador ?? 5}
                  onChange={(e) => setConfig('distanciaPainelRoteador', Number(e.target.value))}
                />
              </label>
            </section>
          </>
        )}

        {abaAtiva === 'postes' && (
          <>
            <section>
              <h2>Equipamentos Cabeceira A (Entrada)</h2>
              <button
                type="button"
                className={`btn-inverter-lado ${config.inverterLateralEntrada ? 'active' : ''}`}
                onClick={() => setConfig('inverterLateralEntrada', !config.inverterLateralEntrada)}
              >
                🔄 Inverter Lateral (Atual: {config.inverterLateralEntrada ? 'Lado da Cabine' : 'Lado do Motorista'})
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px', marginBottom: '20px' }}>
                
                {/* Cancela de Entrada */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.cancelaEntrada}
                      onChange={(e) => setConfig('cancelaEntrada', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>Cancela de Entrada</strong>
                        {config.cancelaEntrada && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customCancelaEntrada) {
                                  setConfig('customCancelaEntrada', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customCancelaEntrada', true)
                                  setConfig('distanciaCancelaEntrada', 0.67)
                                  setConfig('afastamentoZCancelaEntrada', 0.6)
                                  setPosteEditandoDistancia('cancelaEntrada')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customCancelaEntrada ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacCancelaEntrada ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacCancelaEntrada', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#8fa3b3', marginTop: '2px', lineHeight: '1.4' }}>
                        Cancela automática na entrada. Afastada a {config.customCancelaEntrada ? config.distanciaCancelaEntrada : 0.67}m em X e {config.customCancelaEntrada ? config.afastamentoZCancelaEntrada : 0.6}m em Z.
                      </span>
                    </div>
                  </label>
                  {config.cancelaEntrada && config.customCancelaEntrada && posteEditandoDistancia === 'cancelaEntrada' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.05}
                          min={0}
                          max={10}
                          value={config.distanciaCancelaEntrada}
                          onChange={(e) => setConfig('distanciaCancelaEntrada', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.05}
                          min={0}
                          max={10}
                          value={config.afastamentoZCancelaEntrada}
                          onChange={(e) => setConfig('afastamentoZCancelaEntrada', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP01 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap01}
                      onChange={(e) => setConfig('siap01', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP01</strong>
                        {config.siap01 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap01) {
                                  setConfig('customSiap01', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap01', true)
                                  setConfig('distanciaSiap01', 6.5)
                                  setConfig('afastamentoZSiap01', 0.6)
                                  setPosteEditandoDistancia('siap01')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap01 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap01')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap01 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap01', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 3m na cabeceira A. Fica a {config.customSiap01 ? config.distanciaSiap01 : 6.5}m afastado em X e {config.customSiap01 ? config.afastamentoZSiap01 : 0.6}m deslocado em Z. RFID.
                      </span>
                    </div>
                  </label>
                  {config.siap01 && config.customSiap01 && posteEditandoDistancia === 'siap01' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap01" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={20}
                          value={config.distanciaSiap01}
                          onChange={(e) => setConfig('distanciaSiap01', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap01}
                          onChange={(e) => setConfig('afastamentoZSiap01', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP02 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap02}
                      onChange={(e) => setConfig('siap02', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP02</strong>
                        {config.siap02 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap02) {
                                  setConfig('customSiap02', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap02', true)
                                  setConfig('distanciaSiap02', 3.5)
                                  setConfig('afastamentoZSiap02', 0.6)
                                  setPosteEditandoDistancia('siap02')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap02 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap02')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap02 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap02', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 3m na cabeceira A. Fica a {config.customSiap02 ? config.distanciaSiap02 : 3.5}m afastado em X e {config.customSiap02 ? config.afastamentoZSiap02 : 0.6}m deslocado em Z. Câmera IP e semáforos.
                      </span>
                    </div>
                  </label>
                  {config.siap02 && config.customSiap02 && posteEditandoDistancia === 'siap02' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap02" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={20}
                          value={config.distanciaSiap02}
                          onChange={(e) => setConfig('distanciaSiap02', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap02}
                          onChange={(e) => setConfig('afastamentoZSiap02', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP03 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap03}
                      onChange={(e) => setConfig('siap03', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP03</strong>
                        {config.siap03 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap03) {
                                  setConfig('customSiap03', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap03', true)
                                  setConfig('distanciaSiap03', 1.0)
                                  setConfig('afastamentoZSiap03', 0.6)
                                  setPosteEditandoDistancia('siap03')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap03 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap03')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap03 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap03', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 3m na cabeceira A. Fica a {config.customSiap03 ? config.distanciaSiap03 : 1.0}m afastado em X e {config.customSiap03 ? config.afastamentoZSiap03 : 0.6}m deslocado em Z. Receptor.
                      </span>
                    </div>
                  </label>
                  {config.siap03 && config.customSiap03 && posteEditandoDistancia === 'siap03' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap03" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={20}
                          value={config.distanciaSiap03}
                          onChange={(e) => setConfig('distanciaSiap03', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap03}
                          onChange={(e) => setConfig('afastamentoZSiap03', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP04 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap04}
                      onChange={(e) => setConfig('siap04', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP04</strong>
                        {config.siap04 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap04) {
                                  setConfig('customSiap04', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap04', true)
                                  setConfig('distanciaSiap04', 0.0)
                                  setConfig('afastamentoZSiap04', 0.6)
                                  setPosteEditandoDistancia('siap04')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap04 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap04')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap04 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap04', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 1,5m na cabeceira A. Fica a {config.customSiap04 ? config.distanciaSiap04 : 0.0}m deslocado em X e {config.customSiap04 ? config.afastamentoZSiap04 : 0.6}m deslocado em Z. Emissor.
                      </span>
                    </div>
                  </label>
                  {config.siap04 && config.customSiap04 && posteEditandoDistancia === 'siap04' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap04" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={-10}
                          max={20}
                          value={config.distanciaSiap04}
                          onChange={(e) => setConfig('distanciaSiap04', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap04}
                          onChange={(e) => setConfig('afastamentoZSiap04', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <h2>Equipamentos Cabeceira B (Saída)</h2>
              <button
                type="button"
                className={`btn-inverter-lado ${config.inverterLateralSaida ? 'active' : ''}`}
                onClick={() => setConfig('inverterLateralSaida', !config.inverterLateralSaida)}
              >
                🔄 Inverter Lateral (Atual: {config.inverterLateralSaida ? 'Lado da Cabine' : 'Lado do Motorista'})
              </button>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px', marginBottom: '20px' }}>
                
                {/* Cancela de Saída */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.cancelaSaida}
                      onChange={(e) => setConfig('cancelaSaida', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>Cancela de Saída</strong>
                        {config.cancelaSaida && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customCancelaSaida) {
                                  setConfig('customCancelaSaida', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customCancelaSaida', true)
                                  setConfig('distanciaCancelaSaida', 0.67)
                                  setConfig('afastamentoZCancelaSaida', 0.6)
                                  setPosteEditandoDistancia('cancelaSaida')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customCancelaSaida ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacCancelaSaida ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacCancelaSaida', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ display: 'block', fontSize: '11px', color: '#8fa3b3', marginTop: '2px', lineHeight: '1.4' }}>
                        Cancela automática na saída. Afastada a {config.customCancelaSaida ? config.distanciaCancelaSaida : 0.67}m em X e {config.customCancelaSaida ? config.afastamentoZCancelaSaida : 0.6}m em Z.
                      </span>
                    </div>
                  </label>
                  {config.cancelaSaida && config.customCancelaSaida && posteEditandoDistancia === 'cancelaSaida' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.05}
                          min={0}
                          max={10}
                          value={config.distanciaCancelaSaida}
                          onChange={(e) => setConfig('distanciaCancelaSaida', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.05}
                          min={0}
                          max={10}
                          value={config.afastamentoZCancelaSaida}
                          onChange={(e) => setConfig('afastamentoZCancelaSaida', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP05 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap05}
                      onChange={(e) => setConfig('siap05', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP05</strong>
                        {config.siap05 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap05) {
                                  setConfig('customSiap05', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap05', true)
                                  setConfig('distanciaSiap05', 6.5)
                                  setConfig('afastamentoZSiap05', 0.6)
                                  setPosteEditandoDistancia('siap05')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap05 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap05')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap05 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap05', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 3m na cabeceira B. Fica a {config.customSiap05 ? config.distanciaSiap05 : 6.5}m afastado em X e {config.customSiap05 ? config.afastamentoZSiap05 : 0.6}m deslocado em Z. RFID.
                      </span>
                    </div>
                  </label>
                  {config.siap05 && config.customSiap05 && posteEditandoDistancia === 'siap05' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap05" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={20}
                          value={config.distanciaSiap05}
                          onChange={(e) => setConfig('distanciaSiap05', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap05}
                          onChange={(e) => setConfig('afastamentoZSiap05', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP06 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap06}
                      onChange={(e) => setConfig('siap06', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP06</strong>
                        {config.siap06 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap06) {
                                  setConfig('customSiap06', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap06', true)
                                  setConfig('distanciaSiap06', 3.5)
                                  setConfig('afastamentoZSiap06', 0.6)
                                  setPosteEditandoDistancia('siap06')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap06 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap06')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap06 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap06', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 3m na cabeceira B. Fica a {config.customSiap06 ? config.distanciaSiap06 : 3.5}m afastado em X e {config.customSiap06 ? config.afastamentoZSiap06 : 0.6}m deslocado em Z. Câmera IP e semáforos.
                      </span>
                    </div>
                  </label>
                  {config.siap06 && config.customSiap06 && posteEditandoDistancia === 'siap06' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap06" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={20}
                          value={config.distanciaSiap06}
                          onChange={(e) => setConfig('distanciaSiap06', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap06}
                          onChange={(e) => setConfig('afastamentoZSiap06', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP07 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap07}
                      onChange={(e) => setConfig('siap07', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP07</strong>
                        {config.siap07 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap07) {
                                  setConfig('customSiap07', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap07', true)
                                  setConfig('distanciaSiap07', 1.0)
                                  setConfig('afastamentoZSiap07', 0.6)
                                  setPosteEditandoDistancia('siap07')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap07 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap07')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap07 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap07', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 3m na cabeceira B. Fica a {config.customSiap07 ? config.distanciaSiap07 : 1.0}m afastado em X e {config.customSiap07 ? config.afastamentoZSiap07 : 0.6}m deslocado em Z. Receptor.
                      </span>
                    </div>
                  </label>
                  {config.siap07 && config.customSiap07 && posteEditandoDistancia === 'siap07' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap07" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={20}
                          value={config.distanciaSiap07}
                          onChange={(e) => setConfig('distanciaSiap07', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap07}
                          onChange={(e) => setConfig('afastamentoZSiap07', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>

                {/* SIAP08 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap08}
                      onChange={(e) => setConfig('siap08', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP08</strong>
                        {config.siap08 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap08) {
                                  setConfig('customSiap08', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap08', true)
                                  setConfig('distanciaSiap08', 0.0)
                                  setConfig('afastamentoZSiap08', 0.6)
                                  setPosteEditandoDistancia('siap08')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap08 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap08')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap08 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap08', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 1,5m na cabeceira B. Fica a {config.customSiap08 ? config.distanciaSiap08 : 0.0}m deslocado em X e {config.customSiap08 ? config.afastamentoZSiap08 : 0.6}m deslocado em Z. Emissor.
                      </span>
                    </div>
                  </label>
                  {config.siap08 && config.customSiap08 && posteEditandoDistancia === 'siap08' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap08" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={-10}
                          max={20}
                          value={config.distanciaSiap08}
                          onChange={(e) => setConfig('distanciaSiap08', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap08}
                          onChange={(e) => setConfig('afastamentoZSiap08', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>

              <h2 style={{ marginTop: '20px' }}>Equipamentos da Plataforma (Meio)</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                
                {/* SIAP09 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label className="checkbox" style={{ alignItems: 'flex-start', margin: 0 }}>
                    <input
                      type="checkbox"
                      checked={config.siap09}
                      onChange={(e) => setConfig('siap09', e.target.checked)}
                      style={{ marginTop: '3px' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: '#fff' }}>SIAP09</strong>
                        {config.siap09 && (
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => {
                                if (config.customSiap09) {
                                  setConfig('customSiap09', false)
                                  setPosteEditandoDistancia(null)
                                } else {
                                  setConfig('customSiap09', true)
                                  setConfig('distanciaSiap09', 0.0)
                                  setConfig('afastamentoZSiap09', 0.6)
                                  setPosteEditandoDistancia('siap09')
                                }
                              }}
                              style={{ background: 'transparent', border: 'none', color: '#3b82f6', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              {config.customSiap09 ? 'Usar Padrão' : 'Alterar'}
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <button
                              type="button"
                              onClick={() => setPosteEditandoPerifericos('siap09')}
                              style={{ background: 'transparent', border: 'none', color: '#10b981', fontSize: '11px', cursor: 'pointer', fontWeight: '600', padding: 0 }}
                            >
                              Periféricos
                            </button>
                            <span style={{ color: '#4b5563', fontSize: '11px' }}>|</span>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                              <input
                                type="checkbox"
                                checked={config.fornecimentoSiamacSiap09 ?? true}
                                onChange={(e) => setConfig('fornecimentoSiamacSiap09', e.target.checked)}
                                style={{ margin: 0 }}
                              />
                              Siamac
                            </label>
                          </div>
                        )}
                      </div>
                      <span style={{ fontSize: '11px', color: '#8fa3b3', lineHeight: '1.4' }}>
                        Poste de 6m no meio da balança. Fica a {config.customSiap09 ? config.distanciaSiap09 : 0.0}m deslocado do centro em X e {config.customSiap09 ? config.afastamentoZSiap09 : 0.6}m deslocado em Z.
                      </span>
                    </div>
                  </label>
                  {config.siap09 && config.customSiap09 && posteEditandoDistancia === 'siap09' && (
                    <div style={{ marginLeft: '24px', marginTop: '6px', padding: '10px', background: '#141b22', border: '1px solid #283440', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <AlturaPostePadrao id="siap09" />
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Espaçamento Horizontal - X (m)
                        <input
                          type="number"
                          step={0.1}
                          min={-10}
                          max={10}
                          value={config.distanciaSiap09}
                          onChange={(e) => setConfig('distanciaSiap09', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                      <label style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: '#a4b4c0', margin: 0 }}>
                        Afastamento lateral - Z (m)
                        <input
                          type="number"
                          step={0.1}
                          min={0}
                          max={10}
                          value={config.afastamentoZSiap09}
                          onChange={(e) => setConfig('afastamentoZSiap09', Number(e.target.value))}
                          style={{ padding: '6px 10px', background: 'rgba(15,23,42,0.6)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#fff', fontSize: '13px', width: '100%', marginTop: '4px' }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            </section>

            <PostesAdicionais />

            <section>
              <h2>Opções de Visualização</h2>
              <label className="checkbox">
                <input
                  type="checkbox"
                  checked={config.mostrarVeiculo}
                  onChange={(e) => setConfig('mostrarVeiculo', e.target.checked)}
                />
                Mostrar caminhão ilustrativo
              </label>
              <label htmlFor="modelo-veiculo">Modelo do caminhão</label>
              <select
                id="modelo-veiculo"
                className="modelo-veiculo-select"
                value={config.modeloVeiculo ?? 'padrao'}
                onChange={(e) => setConfig('modeloVeiculo', e.target.value as 'padrao' | 'container')}
              >
                {Object.entries(MODELOS_VEICULO).map(([id, modelo]) => (
                  <option key={id} value={id}>{modelo.nome}</option>
                ))}
              </select>
            </section>

            <section style={{ marginTop: '20px' }}>
              <h2>Equipamentos Adicionais</h2>
              <button
                type="button"
                onClick={() => setModalAdicionaisAberto(true)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  marginTop: '10px'
                }}
              >
                📦 Equipamentos Adicionais
              </button>
            </section>
          </>
        )}

        {abaAtiva === 'calibracao' && (
          <fieldset disabled={!canCalibrate} className="calibracao-container" style={{border: 0, minWidth: 0}}>
            <section>
              <h2>Calibrar Sensores nos Postes</h2>
              <p className="instrucao">
                Selecione o periférico para ajustar a bolinha rosa (ponto de fixação no poste):
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
              
              {equipamentoCalibrando === 'veiculo' ? (
                <>
                  <p className="ajuda-calibracao">
                    Ajuste a altura vertical do caminhão em relação à plataforma da balança:
                  </p>
                  
                  <div className="controle-grupo">
                    <label>
                      <span>Altura em relação à Balança (Y): <strong>{calib.altura.toFixed(2)} m</strong></span>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.01"
                        value={calib.altura}
                        onChange={(e) => handleUpdate('altura', Number(e.target.value))}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <h4>1. Marcar o fixador (peça da esquerda)</h4>
                  <p className="ajuda-calibracao">
                    Mova a bolinha rosa até o centro do fixador do periférico:
                  </p>
                  
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

                  <h4>2. Altura e Rotação no poste (preview da direita)</h4>
                  <p className="ajuda-calibracao">
                    Ajuste a altura de fixação no poste e a direção em que o periférico aponta:
                  </p>

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
                      <span>Giro no Poste (Rotação Y): <strong>{calib.rotacaoY}°</strong></span>
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
                </>
              )}

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
                Resetar para o Padrão
              </button>
            </section>
          </fieldset>
        )}

        {abaAtiva === 'cenas' && (
          <div className="cenas-container animate-fade-in">
            <section>
              <h2>Gerenciar Cenas</h2>
              <label>Salvar cena em
                <select value={escopoCena} onChange={e => setEscopoCena(e.target.value as 'projeto' | 'global')}>
                  <option value="projeto">Somente neste projeto</option>
                  <option value="global" disabled={!canCalibrate}>Global — todos os projetos da empresa</option>
                </select>
              </label>
              {escopoCena === 'global' && <p>A cena será sincronizada com todos os projetos da empresa.</p>}
              <p className="instrucao" style={{ marginBottom: '14px', fontSize: '12.5px', color: '#8fa3b3', lineHeight: '1.4' }}>
                Posicione a câmera na visualização 3D como desejar e clique no botão abaixo para salvar a cena atual (ângulo, zoom e posição).
              </p>
              
              <div style={{ marginTop: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', color: '#c4d0da', marginBottom: '8px' }}>
                  Nome da nova cena
                  <input
                    type="text"
                    placeholder="Ex: Entrada, Vista Geral"
                    value={nomeNovaCena}
                    onChange={(e) => setNomeNovaCena(e.target.value)}
                    style={{
                      display: 'block',
                      width: '100%',
                      marginTop: '6px',
                      padding: '7px 9px',
                      border: '1px solid #3b4a58',
                      borderRadius: '6px',
                      background: '#141b22',
                      color: '#e8edf2',
                      fontSize: '13px'
                    }}
                  />
                </label>
                <button
                  type="button"
                  className="btn-salvar-cena"
                  onClick={handleSalvarCena}
                  disabled={!nomeNovaCena.trim() || (escopoCena === 'global' && !canCalibrate)}
                  style={{ marginTop: '8px' }}
                >
                  📸 Salvar Cena
                </button>
              </div>
            </section>

            <section>
              <h2>Cenas Salvas</h2>
              {([...cenasGlobais, ...(config.cenas || [])]).length === 0 ? (
                <div style={{
                  padding: '20px 16px',
                  background: '#141b22',
                  border: '1px dashed #3b4a58',
                  borderRadius: '6px',
                  textAlign: 'center',
                  color: '#8fa3b3',
                  fontSize: '12.5px',
                  lineHeight: '1.4'
                }}>
                  Nenhuma cena salva ainda.<br/>Ajuste a câmera e salve uma cena acima.
                </div>
              ) : (
                <div className="cenas-lista">
                  {[...cenasGlobais, ...(config.cenas || [])].map((cena) => (
                    <div
                      key={cena.id}
                      className="cena-item"
                      onClick={() => setCenaParaIr(cena)}
                    >
                      <div className="cena-info">
                        🎬 {cena.nome} {cenasGlobais.some(c => c.id === cena.id) ? '· Global' : '· Projeto'}
                      </div>
                      <button
                        type="button"
                        className="btn-excluir-cena"
                        disabled={cenasGlobais.some(c => c.id === cena.id) && !canCalibrate}
                        onClick={(e) => {
                          e.stopPropagation()
                          if (window.confirm(`Deseja realmente excluir a cena "${cena.nome}"?`)) {
                            excluirCena(cena.id)
                          }
                        }}
                        title="Excluir cena"
                      >
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}

        {abaAtiva === 'funcoes_especiais' && (
          <div className="funcoes-especiais-container animate-fade-in">
            <section>
              <h2>Funções Especiais</h2>
              <PainelSimulador />
              <PainelBalanca />
              <PainelCameras />
            </section>
          </div>
        )}
      </div>

      {/* Modal de Periféricos do Poste */}
      {posteEditandoPerifericos && (() => {
        const key = `perifericos${posteEditandoPerifericos.charAt(0).toUpperCase()}${posteEditandoPerifericos.slice(1)}` as keyof ProjectConfig
        const posteAdicional = config.postesAdicionais?.find(p => p.id === posteEditandoPerifericos)
        const trave = posteAdicional?.tipo === 'trave'
        const lista = perifericosPoste(config, posteEditandoPerifericos)
        const salvarLista = (perifericos: PostePeriferico[]) => posteAdicional
          ? setConfig('postesAdicionais', (config.postesAdicionais ?? []).map(p => p.id === posteAdicional.id ? { ...p, perifericos } : p))
          : setConfig(key, perifericos)

        const getAlturaMaximaPoste = (id: string) => alturaMaximaPoste(id, config)
        const tipoSelecionado = (trave && montagemTrave === 'barra-superior' && !TIPOS_BARRA_SUPERIOR.includes(perifericoSelecionadoParaAdicionar)
          ? 'camera-ip-baixo' : perifericoSelecionadoParaAdicionar) as PieceTypeId
        const padrao = obterPadraoPeriferico(config, posteEditandoPerifericos, tipoSelecionado, calibracoes)
        const salvarPadrao = (tipo: PieceTypeId, valores: PadraoPerifericoPoste) => {
          setConfig('padroesPerifericosPostes', {
            ...config.padroesPerifericosPostes,
            [posteEditandoPerifericos]: {
              ...config.padroesPerifericosPostes?.[posteEditandoPerifericos],
              [tipo]: valores,
            },
          })
        }

        const handleAdicionar = () => {
          const novo = criarPeriferico(config, posteEditandoPerifericos, tipoSelecionado, calibracoes)
          if (trave) {
            novo.montagem = montagemTrave
            novo.deslocamentoBarra = 0
          }
          const novaLista = [...lista, novo]
          salvarLista(novaLista)
        }

        const handleUpdatePeriferico = <T extends keyof PostePeriferico>(id: string, campo: T, valor: PostePeriferico[T]) => {
          const invertido = !!(
            posteEditandoPerifericos && (
              ['siap01', 'siap02', 'siap03', 'siap04'].includes(posteEditandoPerifericos)
                ? config.inverterLateralEntrada
                : ['siap05', 'siap06', 'siap07', 'siap08'].includes(posteEditandoPerifericos)
                  ? config.inverterLateralSaida
                  : false
            )
          )

          const novaLista = lista.map((p) => {
            if (p.id === id) {
              const updated = { ...p, [campo]: valor }
              if (campo === 'rotacaoY') {
                const rotVal = valor as number
                if (invertido) {
                  updated.rotacaoYInvertido = rotVal
                  if (updated.rotacaoYNormal === undefined) {
                    updated.rotacaoYNormal = p.rotacaoY
                  }
                } else {
                  updated.rotacaoYNormal = rotVal
                  if (updated.rotacaoYInvertido === undefined) {
                    updated.rotacaoYInvertido = p.rotacaoY
                  }
                }
              }
              return updated
            }
            return p
          })
          salvarLista(novaLista)
        }

        const handleExcluirPeriferico = (id: string) => {
          const novaLista = lista.filter((p) => p.id !== id)
          salvarLista(novaLista)
        }

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none',
            zIndex: 20000000,
            display: 'flex',
            justifyContent: 'flex-end',
            alignItems: 'flex-start',
            padding: '75px 20px 20px 20px',
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.93)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
              padding: '24px',
              width: '380px',
              maxHeight: 'calc(100vh - 95px)',
              overflowX: 'hidden',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              color: '#f8fafc',
              pointerEvents: 'auto',
              animation: 'slideUp 0.3s ease-out',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                  {posteAdicional ? `Equipamentos — ${posteAdicional.nome}` : `Periféricos do Poste ${posteEditandoPerifericos.toUpperCase()}`}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                  {/* Botão de 3 pontinhos */}
                  <button
                    type="button"
                    onClick={() => setMenuMaisOpcoesAberto(!menuMaisOpcoesAberto)}
                    style={{
                      background: menuMaisOpcoesAberto ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '18px',
                      cursor: 'pointer',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}
                    title="Mais opções"
                  >
                    &#8942;
                  </button>

                  {/* Dropdown de opções */}
                  {menuMaisOpcoesAberto && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      right: 0,
                      marginTop: '6px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
                      zIndex: 20000002,
                      width: '180px',
                      display: 'flex',
                      flexDirection: 'column',
                      overflow: 'hidden',
                    }}>
                      {!posteAdicional && <button
                        type="button"
                        onClick={() => {
                          setMenuMaisOpcoesAberto(false)
                          if (!posteAdicional) setModalCopiarPerifericosAberto(true)
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f8fafc',
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                        Copiar de outro poste
                      </button>}
                      <button
                        type="button"
                        onClick={() => {
                          setMenuMaisOpcoesAberto(false)
                          if (window.confirm(`Deseja realmente excluir todos os periféricos do poste ${posteEditandoPerifericos.toUpperCase()}?`)) {
                            salvarLista([])
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          padding: '10px 12px',
                          textAlign: 'left',
                          fontSize: '12px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          borderTop: '1px solid #334155',
                        }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        Excluir todos
                      </button>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={fecharModalPerifericos}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#94a3b8',
                      fontSize: '20px',
                      cursor: 'pointer',
                      fontWeight: 'bold',
                      padding: '4px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    &times;
                  </button>
                </div>
              </div>

              {/* Add New Periphery */}
              <div style={{
                background: '#0f172a',
                padding: '16px',
                borderRadius: '8px',
                border: '1px solid #1e293b',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                alignItems: 'stretch',
              }}>
                {trave && <label className="trave-montagem">Fixar equipamento em
                  <select aria-label="Fixar equipamento em" value={montagemTrave} onChange={e => {
                    setMontagemTrave(e.target.value as NonNullable<PostePeriferico['montagem']>)
                    if (e.target.value === 'barra-superior') setPerifericoSelecionadoParaAdicionar('camera-ip-baixo')
                  }}>
                    <option value="coluna-negativa">Coluna lateral Z−</option><option value="coluna-positiva">Coluna lateral Z+</option><option value="barra-superior">Barra superior</option>
                  </select>
                </label>}
                <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                  Adicionar Equipamento
                  <select
                    value={tipoSelecionado}
                    onChange={(e) => setPerifericoSelecionadoParaAdicionar(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '13px',
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    <option value="camera-ip">Câmera IP POE</option>
                    <option value="camera-ocr">Câmera OCR de Placas</option>
                    <option value="camera-ip-baixo">Câmera IP de Auditoria de Carga (Superior)</option>
                    <option value="refletor-frontal">Refletor frontal</option>
                    <option value="refletor-poste">Refletor tipo poste (para baixo)</option>
                    <option disabled={trave && montagemTrave === 'barra-superior'} value="leitor-rfid">Leitor Antena RFID</option>
                    <option disabled={trave && montagemTrave === 'barra-superior'} value="semaforo">Semáforo</option>
                    <option disabled={trave && montagemTrave === 'barra-superior'} value="sensor-emissor">Sensor Barreira (Emissor)</option>
                    <option disabled={trave && montagemTrave === 'barra-superior'} value="sensor-receptor">Sensor Barreira (Receptor)</option>
                    <option disabled={trave && montagemTrave === 'barra-superior'} value="display-mensagens">Display de Mensagens</option>
                    <option disabled={trave && montagemTrave === 'barra-superior'} value="caixa-de-som">Caixa de Som</option>
                  </select>
                </label>
                <details className="padroes-poste">
                  <summary>Padrões deste equipamento no poste</summary><fieldset disabled={!canCalibrate} style={{border: 0, minWidth: 0}}>
                  <p>Valem para novas unidades neste poste. Os equipamentos instalados mantêm seus ajustes.</p>
                  <label>
                    Altura padrão: {padrao.altura.toFixed(2)} m
                    <input type="range" aria-label="Altura padrão" min="0" max={getAlturaMaximaPoste(posteEditandoPerifericos)} step="0.05"
                      value={padrao.altura} onChange={(e) => salvarPadrao(tipoSelecionado, { ...padrao, altura: Number(e.target.value) })} />
                  </label>
                  <label>
                    Giro padrão (normal): {padrao.rotacaoYNormal}°
                    <input type="range" aria-label="Giro padrão normal" min="-180" max="180" step="5"
                      value={padrao.rotacaoYNormal} onChange={(e) => salvarPadrao(tipoSelecionado, { ...padrao, rotacaoYNormal: Number(e.target.value) })} />
                  </label>
                  {posteEditandoPerifericos !== 'siap09' && <label>
                    Giro padrão (lateral invertida): {padrao.rotacaoYInvertido}°
                    <input type="range" aria-label="Giro padrão lateral invertida" min="-180" max="180" step="5"
                      value={padrao.rotacaoYInvertido} onChange={(e) => salvarPadrao(tipoSelecionado, { ...padrao, rotacaoYInvertido: Number(e.target.value) })} />
                  </label>}
                  <button type="button" className="padrao-poste-acao" disabled={!config.padroesPerifericosPostes?.[posteEditandoPerifericos]?.[tipoSelecionado]}
                    onClick={() => {
                      const padroes = { ...config.padroesPerifericosPostes?.[posteEditandoPerifericos] }
                      delete padroes[tipoSelecionado]
                      setConfig('padroesPerifericosPostes', { ...config.padroesPerifericosPostes, [posteEditandoPerifericos]: padroes })
                    }}>Restaurar padrão geral</button>
                </fieldset></details>
                <button
                  type="button"
                  onClick={handleAdicionar}
                  style={{
                    padding: '10px 16px',
                    background: '#10b981',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  Adicionar
                </button>
              </div>

              {/* List Current */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                  Equipamentos Instalados
                </h4>

                {lista.length === 0 ? (
                  <div style={{
                    padding: '24px',
                    textAlign: 'center',
                    background: '#0f172a',
                    border: '1px dashed #334155',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '13px',
                  }}>
                    Nenhum periférico instalado neste poste.
                  </div>
                ) : (
                  lista.map((perif) => (
                    <div
                      key={perif.id}
                      style={{
                        background: '#0f172a',
                        border: '1px solid #1e293b',
                        borderRadius: '8px',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px',
                      }}
                    >
                      {/* Name & Delete */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: '600', fontSize: '13px', color: '#10b981' }}>
                          {CATALOGO[perif.tipo]?.nome || 'Equipamento'}
                        </span>
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <ConfiguracaoPeriferico perif={perif} alterar={handleUpdatePeriferico} />
                          <label style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#a4b4c0', fontSize: '11px', cursor: 'pointer', margin: 0 }}>
                            <input
                              type="checkbox"
                              checked={perif.fornecimentoSiamac ?? true}
                              onChange={(e) => handleUpdatePeriferico(perif.id, 'fornecimentoSiamac', e.target.checked)}
                              style={{ margin: 0 }}
                            />
                            Siamac
                          </label>
                          <span style={{ color: '#334155', fontSize: '11px' }}>|</span>
                          <button
                            type="button"
                            onClick={() => handleExcluirPeriferico(perif.id)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#ef4444',
                              fontSize: '11px',
                              cursor: 'pointer',
                              fontWeight: '600',
                              padding: 0,
                            }}
                          >
                            Remover
                          </button>
                        </div>
                      </div>

                      {trave && <label className="trave-montagem">Ponto de montagem
                        <select aria-label="Ponto de montagem" value={perif.montagem ?? 'coluna-negativa'} onChange={e => handleUpdatePeriferico(perif.id, 'montagem', e.target.value as PostePeriferico['montagem'])}>
                          <option value="coluna-negativa">Coluna lateral Z−</option><option value="coluna-positiva">Coluna lateral Z+</option>
                          {TIPOS_BARRA_SUPERIOR.includes(perif.tipo) && <option value="barra-superior">Barra superior</option>}
                        </select>
                      </label>}
                      {trave && perif.montagem === 'barra-superior' && posteAdicional ? <label className="trave-montagem">
                        Posição na barra — Z (m)
                        <input aria-label="Posição na barra" type="number" step={0.1}
                          min={posicaoPosteAdicional(config, posteAdicional).zNegativo} max={posicaoPosteAdicional(config, posteAdicional).zPositivo}
                          value={perif.deslocamentoBarra ?? 0} onChange={e => handleUpdatePeriferico(perif.id, 'deslocamentoBarra', Number(e.target.value))} />
                        <span className="poste-ajuda">0 = centro da balança. Altura acompanha a trave ({posteAdicional.altura.toFixed(2)} m). {perif.tipo === 'camera-ip-baixo' ? 'Câmera voltada para baixo; o giro orienta a imagem.' : 'Ajuste o giro para orientar o equipamento.'}</span>
                      </label> : <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Altura de Fixação</span>
                          <strong style={{ color: '#fff' }}>{perif.altura.toFixed(2)} m</strong>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max={getAlturaMaximaPoste(posteEditandoPerifericos)}
                          step="0.05"
                          value={perif.altura}
                          onChange={(e) => handleUpdatePeriferico(perif.id, 'altura', Number(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>}

                      {/* Rotação Slider */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#94a3b8' }}>
                          <span>Direção (Giro)</span>
                          <strong style={{ color: '#fff' }}>{perif.rotacaoY}°</strong>
                        </div>
                        <input
                          type="range"
                          min="-180"
                          max="180"
                          step="5"
                          value={perif.rotacaoY}
                          onChange={(e) => handleUpdatePeriferico(perif.id, 'rotacaoY', Number(e.target.value))}
                          style={{ width: '100%', cursor: 'pointer' }}
                        />
                      </div>
                      <button type="button" className="padrao-poste-acao" disabled={!canCalibrate}
                        onClick={() => {
                          salvarPadrao(perif.tipo, {
                            altura: Math.min(perif.altura, getAlturaMaximaPoste(posteEditandoPerifericos)),
                            rotacaoYNormal: perif.rotacaoYNormal ?? perif.rotacaoY,
                            rotacaoYInvertido: perif.rotacaoYInvertido ?? perif.rotacaoY,
                          })
                          setPerifericoSelecionadoParaAdicionar(perif.tipo)
                        }}>
                        Usar como padrão neste poste
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Close Button Footer */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #334155', paddingTop: '16px', marginTop: '8px' }}>
                <button
                  type="button"
                  onClick={fecharModalPerifericos}
                  style={{
                    padding: '8px 16px',
                    background: '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Concluído
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal para Copiar Periféricos de Outro Poste */}
      {modalCopiarPerifericosAberto && posteEditandoPerifericos && (() => {
        const keyDestino = `perifericos${posteEditandoPerifericos.charAt(0).toUpperCase()}${posteEditandoPerifericos.slice(1)}` as keyof ProjectConfig
        
        // Listar todos os postes de SIAP01 a SIAP09, menos o atual que está sendo editado, que estão ativos
        const postesPossiveis = [
          { id: 'siap01', nome: 'SIAP01' },
          { id: 'siap02', nome: 'SIAP02' },
          { id: 'siap03', nome: 'SIAP03' },
          { id: 'siap04', nome: 'SIAP04' },
          { id: 'siap05', nome: 'SIAP05' },
          { id: 'siap06', nome: 'SIAP06' },
          { id: 'siap07', nome: 'SIAP07' },
          { id: 'siap08', nome: 'SIAP08' },
          { id: 'siap09', nome: 'SIAP09' },
        ].filter(p => p.id !== posteEditandoPerifericos && config[p.id as keyof ProjectConfig])

        const handleCopiarDe = (posteOrigemId: string) => {
          const keyOrigem = `perifericos${posteOrigemId.charAt(0).toUpperCase()}${posteOrigemId.slice(1)}` as keyof ProjectConfig
          const listaOrigem = (config[keyOrigem] || []) as PostePeriferico[]
          
          if (listaOrigem.length === 0) {
            alert(`O poste ${posteOrigemId.toUpperCase()} não possui nenhum periférico instalado para ser copiado.`)
            return
          }

          if (window.confirm(`Deseja copiar todos os ${listaOrigem.length} periféricos do poste ${posteOrigemId.toUpperCase()} para o poste ${posteEditandoPerifericos.toUpperCase()}? (Isso substituirá os periféricos atuais deste poste)`)) {
            const novaLista = listaOrigem.map(p => ({
              ...p,
              // Novo ID único para evitar conflito de chaves no React
              id: `${p.tipo}-${Date.now()}-${Math.floor(Math.random() * 10000)}`
            }))
            setConfig(keyDestino, novaLista)
            setModalCopiarPerifericosAberto(false)
          }
        }

        return (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            pointerEvents: 'auto',
            zIndex: 30000000,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(15, 23, 42, 0.6)',
            backdropFilter: 'blur(4px)',
          }}>
            <div style={{
              background: 'rgba(30, 41, 59, 0.98)',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              borderRadius: '12px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
              padding: '24px',
              width: '400px',
              color: '#f8fafc',
              display: 'flex',
              flexDirection: 'column',
              gap: '20px',
              animation: 'slideUp 0.3s ease-out',
            }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                  Copiar Periféricos para {posteEditandoPerifericos.toUpperCase()}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalCopiarPerifericosAberto(false)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#94a3b8',
                    fontSize: '20px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    padding: '4px 8px',
                    borderRadius: '4px',
                  }}
                >
                  &times;
                </button>
              </div>

              {/* Lista de postes origens */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8', lineHeight: '1.4' }}>
                  Selecione o poste de origem para copiar os periféricos (incluindo alturas e giros):
                </p>

                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '250px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                  marginTop: '8px',
                }}>
                  {postesPossiveis.length === 0 ? (
                    <div style={{
                      padding: '16px',
                      textAlign: 'center',
                      background: '#0f172a',
                      border: '1px dashed #334155',
                      borderRadius: '8px',
                      color: '#64748b',
                      fontSize: '13px',
                    }}>
                      Nenhum outro poste ativo no projeto para copiar.
                    </div>
                  ) : (
                    postesPossiveis.map(p => {
                      const keyOrigem = `perifericos${p.id.charAt(0).toUpperCase()}${p.id.slice(1)}` as keyof ProjectConfig
                      const numPerifericos = ((config[keyOrigem] || []) as PostePeriferico[]).length
                      
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => handleCopiarDe(p.id)}
                          style={{
                            background: '#0f172a',
                            border: '1px solid #1e293b',
                            borderRadius: '8px',
                            padding: '12px 16px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            textAlign: 'left',
                            color: '#fff',
                            transition: 'all 0.2s',
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#10b981'
                            e.currentTarget.style.background = '#1e293b'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#1e293b'
                            e.currentTarget.style.background = '#0f172a'
                          }}
                        >
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>
                            {p.nome}
                          </span>
                          <span style={{
                            fontSize: '11px',
                            background: numPerifericos > 0 ? '#10b981' : '#334155',
                            color: '#fff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '600',
                          }}>
                            {numPerifericos} {numPerifericos === 1 ? 'periférico' : 'periféricos'}
                          </span>
                        </button>
                      )
                    })
                  )}
                </div>
              </div>

              {/* Botão de Cancelar */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #334155', paddingTop: '16px' }}>
                <button
                  type="button"
                  onClick={() => setModalCopiarPerifericosAberto(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#334155',
                    border: 'none',
                    borderRadius: '6px',
                    color: '#fff',
                    fontWeight: '600',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal de Equipamentos Adicionais */}
      {modalAdicionaisAberto && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          pointerEvents: 'none',
          zIndex: 20000000,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          padding: '75px 20px 20px 20px',
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.93)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)',
            padding: '24px',
            width: '380px',
            maxHeight: 'calc(100vh - 95px)',
            overflowX: 'hidden',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            color: '#f8fafc',
            pointerEvents: 'auto',
            animation: 'slideUp 0.3s ease-out',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #334155', paddingBottom: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#fff' }}>
                Equipamentos Adicionais
              </h3>
              <button
                type="button"
                onClick={() => setModalAdicionaisAberto(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#94a3b8',
                  fontSize: '20px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  padding: '4px 8px',
                  borderRadius: '4px',
                }}
              >
                &times;
              </button>
            </div>

            {/* Form de Adicionar */}
            <div style={{
              background: '#0f172a',
              padding: '16px',
              borderRadius: '8px',
              border: '1px solid #1e293b',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              alignItems: 'stretch',
            }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                Selecionar Equipamento
                <select
                  value={equipamentoAdicionalSelecionado}
                  onChange={(e) => setEquipamentoAdicionalSelecionado(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    cursor: 'pointer',
                    width: '100%',
                  }}
                >
                  {OPCOES_EQUIPAMENTOS_ADICIONAIS.map(opcao => (
                    <option key={opcao} value={opcao}>{opcao}</option>
                  ))}
                </select>
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '12px', color: '#94a3b8' }}>
                Quantidade
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={quantidadeAdicional}
                  onChange={(e) => setQuantidadeAdicional(Math.max(1, parseInt(e.target.value) || 1))}
                  style={{
                    padding: '8px 12px',
                    background: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#fff',
                    fontSize: '13px',
                    width: '100%',
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => {
                  const novosEquipamentos = [...(config.equipamentosAdicionais || [])];
                  const indexExistente = novosEquipamentos.findIndex(e => e.nome === equipamentoAdicionalSelecionado);
                  if (indexExistente > -1) {
                    novosEquipamentos[indexExistente].quantidade += quantidadeAdicional;
                  } else {
                    novosEquipamentos.push({
                      id: `${Date.now()}-${Math.random()}`,
                      nome: equipamentoAdicionalSelecionado,
                      quantidade: quantidadeAdicional
                    });
                  }
                  setConfig('equipamentosAdicionais', novosEquipamentos);
                  setQuantidadeAdicional(1);
                }}
                style={{
                  padding: '10px 16px',
                  background: '#10b981',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                  width: '100%',
                  marginTop: '4px'
                }}
              >
                Adicionar
              </button>
            </div>

            {/* Lista de Equipamentos Adicionais */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ margin: 0, fontSize: '13px', fontWeight: '600', color: '#94a3b8' }}>
                Adicionados ({config.equipamentosAdicionais?.length || 0})
              </h4>

              {(!config.equipamentosAdicionais || config.equipamentosAdicionais.length === 0) ? (
                <div style={{
                  padding: '24px',
                  textAlign: 'center',
                  background: '#0f172a',
                  border: '1px dashed #334155',
                  borderRadius: '8px',
                  color: '#64748b',
                  fontSize: '13px',
                }}>
                  Nenhum equipamento adicional adicionado.
                </div>
              ) : (
                config.equipamentosAdicionais.map((eq) => (
                  <div
                    key={eq.id}
                    style={{
                      background: '#0f172a',
                      border: '1px solid #1e293b',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '13px', color: '#10b981' }}>
                        {eq.nome}
                      </div>
                      <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                        Quantidade: {eq.quantidade}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const novaLista = config.equipamentosAdicionais.filter(item => item.id !== eq.id);
                        setConfig('equipamentosAdicionais', novaLista);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '11px',
                        cursor: 'pointer',
                        fontWeight: '600',
                      }}
                    >
                      Remover
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid #334155', paddingTop: '16px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => setModalAdicionaisAberto(false)}
                style={{
                  padding: '8px 16px',
                  background: '#334155',
                  border: 'none',
                  borderRadius: '6px',
                  color: '#fff',
                  fontWeight: '600',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                Concluído
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
