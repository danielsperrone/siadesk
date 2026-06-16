import React, { useMemo, useState, useEffect, Suspense, useRef } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, useGLTF } from '@react-three/drei'
import { useModelosDisponiveis } from '../hooks/useModelosDisponiveis'
import { useProject } from '../store/project'
import { CATALOGO } from '../catalog/pieces'
import { gerarLayout } from '../layout/engine'
import { Piece } from './Piece'
import type { ProjectConfig, PieceInstance, PostePeriferico, CalibrationData, PieceTypeId } from '../types'

function pluralizarNomePeriferico(nome: string): string {
  if (!nome) return ''
  const lower = nome.toLowerCase()
  if (lower.includes('semáforo')) return 'Semáforos'
  if (lower.includes('câmera ip')) return 'Câmeras IP PoE'
  if (lower.includes('câmera ocr')) return 'Câmeras OCR'
  if (lower.includes('leitor')) return 'Leitores antena RFID'
  if (lower.includes('sensor-receptor') || lower.includes('receptor')) return 'Sensores de barreira (receptor)'
  if (lower.includes('sensor-emissor') || lower.includes('emissor')) return 'Sensores de barreira (emissor)'
  if (lower.includes('display')) return 'Displays de mensagens'
  if (lower.includes('caixa de som')) return 'Caixas de som'
  
  // Plural padrão
  if (nome.endsWith('r') || nome.endsWith('s') || nome.endsWith('z')) {
    return nome + 'es'
  }
  return nome + 's'
}

function obterPerifericosAgrupados(perifericos: PostePeriferico[], siapId?: string): Array<{ nome: string; quantidade: number }> {
  if (!perifericos || perifericos.length === 0) return []
  
  if (siapId === 'siap09') {
    return perifericos.map((p) => {
      const nome = p.id === 'camera-siap09-ampla' || p.tipo === 'camera-ip'
        ? 'Câmera Superior 01 - Visão geral da plataforma'
        : 'Câmera Superior 02 - Visão complementar / auditoria superior'
      return { nome, quantidade: 1 }
    })
  }

  const contagem: Record<string, number> = {}
  const ordem: string[] = [] // Para manter a ordem original
  
  perifericos.forEach((p) => {
    const nome = CATALOGO[p.tipo]?.nome || p.tipo
    if (!contagem[nome]) {
      contagem[nome] = 0
      ordem.push(nome)
    }
    contagem[nome]++
  })
  
  return ordem.map((nome) => {
    const qtd = contagem[nome]
    return {
      nome: qtd > 1 ? pluralizarNomePeriferico(nome) : nome,
      quantidade: qtd
    }
  })
}

function calcularComprimentoCabo(
  p: PieceInstance,
  destino: string,
  config: ProjectConfig
): number {
  // Folga técnica padrão para todos os cabos
  const folga = 3.5

  // Casos especiais dos painéis centrais (SIAMAC/Som): os cabos próprios saem direto do
  // painel ao destino, usando as distâncias definidas no projeto (não roteiam pela balança).
  if (p.tipo === 'painel-automacao' || p.tipo === 'painel-som') {
    if (destino.includes('Quadro de Distribuição')) {
      return Math.ceil((config.distanciaPainelQuadro ?? 5) + folga)
    }
    if (destino.includes('Roteador')) {
      return Math.ceil((config.distanciaPainelRoteador ?? 5) + folga)
    }
  }

  // 1. Descida do poste (Altura máxima)
  let alturaPoste = 0
  if (p.id.startsWith('poste-siap') || p.rotulo.includes('SIAP')) {
    const siapId = p.id.startsWith('poste-siap') 
      ? p.id 
      : `poste-${p.rotulo.split(' — ')[1]?.toLowerCase() || ''}`
    
    if (siapId.includes('siap09')) {
      alturaPoste = 6.0
    } else if (siapId.includes('siap04') || siapId.includes('siap08')) {
      alturaPoste = 1.5
    } else {
      alturaPoste = 3.0 // siap01, siap02, siap03, siap05, siap06, siap07
    }
  } else if (p.id.startsWith('cancela')) {
    alturaPoste = 1.37 // altura física da cancela
  }

  // 2. Trajeto subterrâneo ortogonal até a caixa de passagem do meio da balança (0,0)
  const distHorizontal = Math.abs(p.posicao[0]) + Math.abs(p.posicao[2])

  // 3. Do meio da balança até o destino final
  let distDestino = 0
  if (destino.includes('Painel SIAMAC') || destino.includes('Painel de Som')) {
    // Ambos os painéis centrais ficam à mesma distância do meio da balança
    distDestino = config.distanciaPainelAutomacao || 15
  } else if (destino.includes('Quadro de Distribuição')) {
    distDestino = config.distanciaQuadroDistribuicao || 10
  } else if (destino.includes('Roteador')) {
    distDestino = config.distanciaRoteadorPoE || 20
  }

  // Comprimento total arredondado para cima para segurança comercial
  return Math.ceil(alturaPoste + distHorizontal + distDestino + folga)
}

const ESPEC_CABO_ALIMENTACAO_25 = 'Cabo de cobre flexível 0,6/1 kV, 3G2,5 mm², com condutores internos de cores distintas, incluindo condutor de proteção, adequado para instalação em eletroduto subterrâneo/externo. A configuração dos condutores deverá seguir o padrão elétrico local: F+N+PE ou 2F+PE, conforme tensão disponível e projeto elétrico da unidade (alimentação em 220 V).'
const ESPEC_CABO_COMANDO_15 = 'Cabo PP flexível de cobre, blindado, 4x1,5 mm², com condutores internos de cores distintas, destinado a comando/sinal entre periférico e Painel SIAMAC.'
const ESPEC_CABO_SEMAFORO_25 = 'Cabo PP flexível de cobre, 3x2,5 mm², com condutores internos de cores distintas, destinado ao acionamento dos semáforos pelo Painel SIAMAC.'
const ESPEC_CABO_REDE_CAT6 = 'Cabo de rede CAT6 blindado ou superior, cobre puro, compatível com tráfego de dados e PoE quando aplicável, instalado em eletroduto protegido, com aterramento da blindagem conforme projeto elétrico.'
const ESPEC_CABO_SOM_25 = 'Cabo paralelo de som 2x2,5 mm², cobre puro, não CCA, compatível com a potência do amplificador e impedância da caixa/corneta instalada.'

const obterPartePrincipalCabo = (cabo: string): string => {
  if (cabo.includes('0,6/1 kV') && cabo.includes('3G2,5 mm²')) {
    return 'Cabo de cobre flexível 0,6/1 kV, 3G2,5 mm²';
  }
  if (cabo.includes('PP flexível de cobre, blindado, 4x1,5 mm²')) {
    return 'Cabo PP flexível de cobre, blindado, 4x1,5 mm²';
  }
  if (cabo.includes('PP flexível de cobre, 3x2,5 mm²')) {
    return 'Cabo PP flexível de cobre, 3x2,5 mm²';
  }
  if (cabo.includes('CAT6 blindado')) {
    return 'Cabo de rede CAT6 blindado ou superior (cobre puro)';
  }
  if (cabo.includes('paralelo de som 2x2,5 mm²')) {
    return 'Cabo paralelo de som 2x2,5 mm² (cobre puro)';
  }
  return cabo;
}

const obterDetalheCabo = (cabo: string): string => {
  if (cabo.includes('0,6/1 kV') && cabo.includes('3G2,5 mm²')) {
    return 'Condutores internos de cores distintas, com condutor de proteção (PE), próprio para duto subterrâneo (alimentação 220 V).';
  }
  if (cabo.includes('PP flexível de cobre, blindado, 4x1,5 mm²')) {
    return 'Condutores de cores distintas, com malha de blindagem, para comando/sinal com o Painel SIAMAC.';
  }
  if (cabo.includes('PP flexível de cobre, 3x2,5 mm²')) {
    return 'Condutores de cores distintas, destinado ao acionamento de semáforos pelo Painel SIAMAC.';
  }
  if (cabo.includes('CAT6 blindado')) {
    return 'Instalado em eletroduto protegido com aterramento da blindagem conforme projeto elétrico.';
  }
  if (cabo.includes('paralelo de som 2x2,5 mm²')) {
    return 'Não CCA (Alumínio Revestido de Cobre), adequado para a potência do amplificador e impedância.';
  }
  return '';
}

interface DocumentoDocumentacaoProps {
  config: ProjectConfig
  dataEmissao: Date
  codigoDocumento: string
  onFechar: () => void
  onExportar: () => any
  apenasChecklist?: boolean
}

// Componente do Selo / Carimbo padrão da SIAMAC nas folhas técnicas
export const SeloPagina: React.FC<{
  config: ProjectConfig
  tituloPlanta: string
  revisao: number
  paginaNum: number
  totalPaginas: number
}> = ({ config, tituloPlanta, revisao, paginaNum, totalPaginas }) => {
  return (
    <div className="selo-carimbo">
      {/* Linha 1 */}
      <div className="selo-linha">
        <div className="selo-celula" style={{ flex: 1 }}>
          <span className="selo-label">Empresa</span>
          <span className="selo-valor">SIAMAC AUTOMAÇÃO</span>
        </div>
        <div className="selo-celula" style={{ flex: 1.2 }}>
          <span className="selo-label">Pedido / OS / Proposta</span>
          <span className="selo-valor">{config.codigoProposta || '-'}</span>
        </div>
      </div>
      {/* Linha 2 */}
      <div className="selo-linha">
        <div className="selo-celula" style={{ flex: 1 }}>
          <span className="selo-label">Cliente</span>
          <span className="selo-valor" style={{ fontSize: '9px' }}>{config.cliente || '-'}</span>
        </div>
      </div>
      {/* Linha 3 */}
      <div className="selo-linha">
        <div className="selo-celula" style={{ flex: 1.5 }}>
          <span className="selo-label">Planta</span>
          <span className="selo-valor" style={{ fontSize: '9px', color: '#8b1a1a' }}>{tituloPlanta}</span>
        </div>
        <div className="selo-celula" style={{ flex: 1 }}>
          <span className="selo-label">Criação</span>
          <span className="selo-valor">{config.dataCriacao || '-'}</span>
        </div>
      </div>
      {/* Linha 4 */}
      <div className="selo-linha">
        <div className="selo-celula" style={{ flex: 0.6 }}>
          <span className="selo-label">Página</span>
          <span className="selo-valor">{paginaNum} / {totalPaginas}</span>
        </div>
        <div className="selo-celula" style={{ flex: 1.4 }}>
          <span className="selo-label">Link</span>
          <span className="selo-valor" style={{ textTransform: 'none', fontSize: '6px' }}>www.siamac.com.br/owl</span>
        </div>
        <div className="selo-celula" style={{ flex: 1 }}>
          <span className="selo-label">Alteração</span>
          <span className="selo-valor">{config.dataAlteracao || '-'}</span>
        </div>
        <div className="selo-celula" style={{ flex: 0.6 }}>
          <span className="selo-label">Rev.</span>
          <span className="selo-valor" style={{ color: '#10b981' }}>R{String(revisao).padStart(2, '0')}</span>
        </div>
      </div>
    </div>
  )
}


interface ItemDetalheSpec {
  id: string
  tipo: 'poste' | 'cancela' | 'painel'
  titulo: string
  nomeNoSelo: string
  ativo: boolean
  altura: number
  diametro?: string
  tipoPeca: PieceTypeId
  perifericos: PostePeriferico[]
  paginaNum?: number
}

function ModeloGlb({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} />
}

function PlaceholderDetalhe({ instancia }: { instancia: PieceInstance }) {
  const tipo = CATALOGO[instancia.tipo]
  const [cx, cy, cz] = tipo.placeholder
  return (
    <mesh position={[0, cy / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[cx, cy, cz]} />
      <meshStandardMaterial color={tipo.cor} />
    </mesh>
  )
}

interface PosteDetalheCanvasProps {
  tipoPeca: PieceTypeId
  altura: number
  perifericos: PostePeriferico[]
  calibracoes: Record<string, CalibrationData>
  modelosDisponiveis: Set<string>
  idItem: string
  rotacaoInicial: number
  onRotationChange: (theta: number) => void
  distanciaCamera?: number
  bloquearRotacao?: boolean
}

const PosteDetalheCanvas: React.FC<PosteDetalheCanvasProps> = ({
  tipoPeca,
  altura,
  perifericos,
  calibracoes,
  modelosDisponiveis,
  idItem,
  rotacaoInicial,
  onRotationChange,
  distanciaCamera,
  bloquearRotacao
}) => {
  const controlsRef = useRef<any>(null)

  const pecasLocais = useMemo(() => {
    const list: PieceInstance[] = []

    // 1. O Poste ou Cancela principal
    list.push({
      id: `main-${idItem}`,
      tipo: tipoPeca,
      rotulo: idItem.toUpperCase(),
      posicao: [0, 0, 0],
      rotacaoY: 0
    })

    // 2. Os periféricos instalados nele
    perifericos.forEach((perif) => {
      const cal = calibracoes[perif.tipo] || { altura: 0, rotacaoY: 0, fixadorX: 0, fixadorY: 0, fixadorZ: 0 }
      const anguloGraus = perif.rotacaoY + cal.rotacaoY
      const rotacaoRadianos = (anguloGraus * Math.PI) / 180

      list.push({
        id: `local-perif-${perif.id}`,
        tipo: perif.tipo,
        rotulo: CATALOGO[perif.tipo]?.nome || 'Equipamento',
        posicao: [0, perif.altura, 0],
        rotacaoY: rotacaoRadianos,
        ancora: [cal.fixadorX, cal.fixadorY, cal.fixadorZ]
      })
    })

    return list
  }, [tipoPeca, altura, perifericos, calibracoes, idItem])

  const camConfig = useMemo(() => {
    const theta = rotacaoInicial || 0
    let py = 1.5
    let r = distanciaCamera !== undefined ? distanciaCamera : 4.5
    let target = [0, 1.5, 0] as [number, number, number]

    if (distanciaCamera === undefined) {
      if (altura === 6.0) {
        py = 3.0
        r = 7.5
        target = [0, 3.0, 0]
      } else if (altura === 1.5) {
        py = 0.75
        r = 2.5
        target = [0, 0.75, 0]
      } else if (tipoPeca.startsWith('cancela')) {
        py = 0.7
        r = 2.5
        target = [0, 0.7, 0]
      }
    } else {
      py = altura / 2
      target = [0, altura / 2, 0]
    }

    const px = r * Math.sin(theta)
    const pz = r * Math.cos(theta)

    return { position: [px, py, pz] as [number, number, number], target }
  }, [altura, tipoPeca, rotacaoInicial, distanciaCamera])

  return (
    <Canvas
      shadows
      camera={{ position: camConfig.position, fov: 45 }}
      style={{ width: '100%', height: '100%' }}
      gl={{ preserveDrawingBuffer: true }}
      className="canvas-render-3d"
    >
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={1.2} castShadow />

      {pecasLocais.map((p) => {
        const tipo = CATALOGO[p.tipo]
        const [ax, ay, az] = p.ancora ?? [0, 0, 0]

        return (
          <group key={p.id} position={p.posicao} rotation={[0, p.rotacaoY, 0]}>
            {/* Grupo deslocado de forma a alinhar o fixador com a âncora */}
            <group position={[-ax, -ay, -az]}>
              {modelosDisponiveis.has(tipo.modelo) ? (
                <Suspense fallback={<PlaceholderDetalhe instancia={p} />}>
                  <ModeloGlb url={`models/${tipo.modelo}.glb`} />
                </Suspense>
              ) : (
                <PlaceholderDetalhe instancia={p} />
              )}
            </group>
          </group>
        )
      })}

      {!bloquearRotacao && (
        <OrbitControls
          ref={controlsRef}
          makeDefault
          target={camConfig.target}
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 2}
          maxPolarAngle={Math.PI / 2}
          onEnd={() => {
            if (controlsRef.current) {
              const theta = controlsRef.current.getAzimuthalAngle()
              onRotationChange(theta)
            }
          }}
        />
      )}
    </Canvas>
  )
}



export const DocumentoDocumentacao: React.FC<DocumentoDocumentacaoProps> = ({
  config,
  dataEmissao,
  codigoDocumento,
  onFechar,
  onExportar,
  apenasChecklist = false
}) => {
  const calibracoes = useProject((s) => s.calibracoes)
  const setConfig = useProject((s) => s.setConfig)
  const modelosDisponiveis = useModelosDisponiveis()

  // Flag para controle se a capa deve ser incluída no total de páginas e na numeração.
  // Se false: Planta de referência = Página 1. Se true: Planta de referência = Página 2.
  const CAPA_ENTRA_NA_CONTAGEM = false

  // Estados para paginação na visualização do PDF
  const [paginaAtiva, setPaginaAtiva] = useState(1)
  const [isPrinting, setIsPrinting] = useState(false)

  // Estado para armazenar o deslocamento manual dos balões (dx, dy em pixels)
  const [offsetsArrasto, setOffsetsArrasto] = useState<Record<string, { dx: number, dy: number }>>(
    config.offsetsArrasto || {}
  )

  // Sincroniza o estado local caso a config mude externamente (ex: abrindo outro projeto)
  useEffect(() => {
    setOffsetsArrasto(config.offsetsArrasto || {})
  }, [config.offsetsArrasto])

  // Gerenciamento dinâmico de orientação da página de impressão (@page size)
  useEffect(() => {
    const styleEl = document.createElement('style')
    styleEl.id = 'print-page-setup'
    if (apenasChecklist) {
      styleEl.innerHTML = `@page { size: A4 portrait; margin: 0; }`
      document.body.classList.add('pdf-a4-retrato')
    } else {
      styleEl.innerHTML = `@page { size: A3 landscape; margin: 0; }`
      document.body.classList.add('pdf-a3-paisagem')
    }
    document.head.appendChild(styleEl)

    return () => {
      styleEl.remove()
      document.body.classList.remove('pdf-a4-retrato', 'pdf-a3-paisagem')
    }
  }, [apenasChecklist])

  const handleSalvarPDF = () => {
    setIsPrinting(true)
    setTimeout(() => {
      const promise = onExportar()
      if (promise && typeof (promise as any).then === 'function') {
        (promise as any).then(() => {
          setIsPrinting(false)
        }).catch(() => {
          setIsPrinting(false)
        })
      } else {
        setIsPrinting(false)
      }
    }, 600)
  }

  const handleRedefinirBaloes = () => {
    const confirmacao = window.confirm(
      'Deseja redefinir a posição de todos os balões e visualizações 3D para o padrão inicial?'
    )
    if (confirmacao) {
      setOffsetsArrasto({})
      setConfig('offsetsArrasto', {})
      setConfig('rotacoes3D', {})
    }
  }

  const handleRotationChange = (id: string, theta: number) => {
    const novasRotacoes = {
      ...(config.rotacoes3D || {}),
      [id]: theta
    }
    setConfig('rotacoes3D', novasRotacoes)
  }

  const iniciarArrasto = (idBalao: string, pagina: number, e: React.MouseEvent) => {
    // Apenas com o botão esquerdo do mouse
    if (e.button !== 0) return
    e.preventDefault()

    const chave = `${idBalao}-p${pagina}`
    const offsetInicial = offsetsArrasto[chave] || { dx: 0, dy: 0 }
    const startX = e.clientX
    const startY = e.clientY

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const diffX = moveEvent.clientX - startX
      const diffY = moveEvent.clientY - startY
      setOffsetsArrasto(prev => ({
        ...prev,
        [chave]: {
          dx: offsetInicial.dx + diffX,
          dy: offsetInicial.dy + diffY
        }
      }))
    }

    const handleMouseUp = (upEvent: MouseEvent) => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)

      const diffX = upEvent.clientX - startX
      const diffY = upEvent.clientY - startY

      // Só persiste se houve algum arrasto real
      if (diffX !== 0 || diffY !== 0) {
        const novosOffsets = {
          ...offsetsArrasto,
          [chave]: {
            dx: offsetInicial.dx + diffX,
            dy: offsetInicial.dy + diffY
          }
        }
        setOffsetsArrasto(novosOffsets)
        setConfig('offsetsArrasto', novosOffsets)
      }
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const formatarData = (data: Date) => {
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  // --- Lógica de cálculo da Vista de Cima (Página 2) ---
  // Peças usadas para o desenho visual 2D (Vista de Cima) - sempre 16m
  const pecas = useMemo(() => {
    return gerarLayout({ ...config, comprimentoBalanca: 16 }, calibracoes)
  }, [config, calibracoes])

  // Peças reais usadas nos cálculos da fiação e cabeamento - usa o real (config.comprimentoBalanca)
  const pecasCalculo = useMemo(() => {
    return gerarLayout(config, calibracoes)
  }, [config, calibracoes])

  const quantitativoPostes = useMemo(() => {
    let p15m = 0
    let p30m = 0
    let p60m = 0

    pecasCalculo.forEach((p) => {
      if (p.tipo === 'poste-1-5m') p15m++
      if (p.tipo === 'poste-3m') p30m++
      if (p.tipo === 'poste-6m') p60m++
    })

    return [
      { tamanho: '1,50 m', quantidade: p15m, descricao: 'Poste Curto (Sensor de barreira / Câmera de veículo grande)', aplicacao: 'SIAP04, SIAP08' },
      { tamanho: '3,00 m', quantidade: p30m, descricao: 'Poste Padrão (Antena RFID, Semáforo, Câmera IP / OCR)', aplicacao: 'SIAP01, SIAP02, SIAP03, SIAP05, SIAP06, SIAP07' },
      { tamanho: '6,00 m', quantidade: p60m, descricao: 'Poste Elevado (câmeras superiores de auditoria e monitoração ampla)', aplicacao: 'SIAP09' }
    ]
  }, [pecasCalculo])

  const itensFiacao = useMemo(() => {
    const lista: Array<{
      equipamento: string
      local: string
      cabo: string
      destino: string
      comprimento: number
    }> = []

    pecasCalculo.forEach((p) => {
      const nomeBase = CATALOGO[p.tipo]?.nome || p.rotulo
      const local = p.rotulo.split(' — ')[1] || p.rotulo.split(' - ')[1] || 'Área da balança rodoviária'
      const equipamentoFormatado = p.rotulo.split(' — ')[0] || p.rotulo.split(' - ')[0] || nomeBase

      if (p.tipo === 'semaforo') {
        const dest = 'Painel SIAMAC'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_SEMAFORO_25,
          destino: dest,
          comprimento: calcularComprimentoCabo(p, dest, config)
        })
      } else if (p.tipo === 'camera-ip' || p.tipo === 'camera-ip-baixo') {
        const dest = 'Roteador PoE'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: dest,
          comprimento: calcularComprimentoCabo(p, dest, config)
        })
      } else if (p.tipo === 'camera-ocr') {
        const dest = 'Roteador PoE'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: dest,
          comprimento: calcularComprimentoCabo(p, dest, config)
        })
      } else if (p.tipo === 'cancela' || p.tipo === 'cancela-lado-a' || p.tipo === 'cancela-lado-b') {
        const dest1 = 'Quadro de Distribuição'
        const dest2 = 'Painel SIAMAC'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: dest1,
          comprimento: calcularComprimentoCabo(p, dest1, config)
        }, {
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_COMANDO_15,
          destino: dest2,
          comprimento: calcularComprimentoCabo(p, dest2, config)
        })
      } else if (p.tipo === 'sensor-emissor' || p.tipo === 'sensor-receptor') {
        const dest = 'Painel SIAMAC'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_COMANDO_15,
          destino: dest,
          comprimento: calcularComprimentoCabo(p, dest, config)
        })
      } else if (p.tipo === 'display-mensagens') {
        const dest1 = 'Quadro de Distribuição'
        const dest2 = 'Roteador PoE'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: dest1,
          comprimento: calcularComprimentoCabo(p, dest1, config)
        }, {
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: dest2,
          comprimento: calcularComprimentoCabo(p, dest2, config)
        })
      } else if (p.tipo === 'leitor-rfid') {
        const dest1 = 'Quadro de Distribuição'
        const dest2 = 'Roteador'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: dest1,
          comprimento: calcularComprimentoCabo(p, dest1, config)
        }, {
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: dest2,
          comprimento: calcularComprimentoCabo(p, dest2, config)
        })
      } else if (p.tipo === 'caixa-de-som') {
        const dest = 'Painel de Som'
        lista.push({
          equipamento: equipamentoFormatado,
          local: local,
          cabo: ESPEC_CABO_SOM_25,
          destino: dest,
          comprimento: calcularComprimentoCabo(p, dest, config)
        })
      } else if (p.tipo === 'painel-automacao' || p.tipo === 'painel-som') {
        // Alimentação própria do painel central + cabo de rede
        lista.push({
          equipamento: nomeBase,
          local: 'Central de Comando',
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: 'Quadro de Distribuição',
          comprimento: calcularComprimentoCabo(p, 'Quadro de Distribuição', config)
        }, {
          equipamento: nomeBase,
          local: 'Central de Comando',
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: 'Roteador PoE',
          comprimento: calcularComprimentoCabo(p, 'Roteador PoE', config)
        })
      }
    })

    return lista
  }, [pecasCalculo, config])

  const itensParaRotular = useMemo(() => {
    const lista: PieceInstance[] = []
    pecas.forEach(p => {
      if (p.id.startsWith('poste-siap')) {
        lista.push(p)
      } else if (p.id === 'balanca') {
        lista.push(p)
      } else if (p.id === 'cancela-entrada' || p.id === 'cancela-saida') {
        lista.push(p)
      }
    })
    return lista
  }, [pecas])

  const canvasWidth = 1480
  const canvasHeight = 640
  const comprimentoTotalVisible = 16 + 20
  
  // Calcula o zoom de escala para a câmera ortográfica e overlay
  const zoom = useMemo(() => {
    return (canvasWidth / comprimentoTotalVisible) * 1.03
  }, [comprimentoTotalVisible])

  const cx = canvasWidth / 2
  const cy = canvasHeight / 2
  const metadeComprimento = 16 / 2
  const metadeLargura = config.larguraBalanca / 2

  // Mapeia os postes, balança e cancelas para suas coordenadas 2D correspondentes na tela
  const itemsPostes = useMemo(() => {
    // 1. Mapeamento inicial básico com lado estrito associado ao Z físico do poste
    const list = itensParaRotular.map(p => {
      const px = canvasWidth / 2 + p.posicao[0] * zoom
      // Inverte o Z 3D para o eixo Y 2D da tela já que a câmera olha para baixo com up [0, 0, -1]
      const py = canvasHeight / 2 + p.posicao[2] * zoom
      
      // O balão deve ficar sempre do mesmo lado da balança! (Z negativo é topo, Z positivo é base)
      const isTop = p.id === 'balanca' ? false : p.posicao[2] < 0
      const vaiParaOTopo = p.id === 'poste-siap03' ? true : isTop
      
      let labelX = px
      // Se for a cancela de entrada/saída, aplicamos um deslocamento lateral inicial para fora
      if (p.id === 'cancela-entrada') {
        labelX = px - 45
      } else if (p.id === 'cancela-saida') {
        labelX = px + 45
      }
      
      let refPoste = ''
      if (p.id.startsWith('poste-siap')) {
        refPoste = p.id.replace('poste-', '').toUpperCase() // ex: "SIAP01"
      } else if (p.id === 'balanca') {
        refPoste = 'BALANÇA'
      } else if (p.id === 'cancela-entrada') {
        refPoste = 'CANCELA A'
      } else if (p.id === 'cancela-saida') {
        refPoste = 'CANCELA B'
      }

      // Calcula o py limite de toda a estrutura física do poste (incluindo periféricos que se projetam em Z)
      let pyRef = py
      if (vaiParaOTopo !== isTop) {
        pyRef = canvasHeight - py
      }
      let pyEstrutura = pyRef
      if (p.id.startsWith('poste-siap')) {
        // Filtra os periféricos deste poste pela proximidade X e Z no 3D
        const perifsDestePoste = pecas.filter(peca => 
          peca.id !== p.id && 
          Math.abs(peca.posicao[0] - p.posicao[0]) < 0.01 && 
          Math.abs(peca.posicao[2] - p.posicao[2]) < 0.01
        )
        if (perifsDestePoste.length > 0) {
          const posicoesPy = perifsDestePoste.map(perif => {
            const cal = calibracoes[perif.tipo] || { fixadorZ: 0, fixadorX: 0 }
            const rotY = perif.rotacaoY
            const offsetZ = cal.fixadorZ * Math.cos(rotY) + cal.fixadorX * Math.sin(rotY)
            const zFinal = perif.posicao[2] + offsetZ
            let pyPerif = canvasHeight / 2 + zFinal * zoom
            if (vaiParaOTopo !== isTop) {
              pyPerif = canvasHeight - pyPerif
            }
            return pyPerif
          })
          if (vaiParaOTopo) {
            pyEstrutura = Math.min(pyRef, ...posicoesPy)
          } else {
            pyEstrutura = Math.max(pyRef, ...posicoesPy)
          }
        }
      }

      // Adiciona o raio físico do componente (0.15m na escala 3D) na direção do balão
      const raioFisicoComponente = 0.15 * zoom
      if (vaiParaOTopo) {
        pyEstrutura -= raioFisicoComponente
      } else {
        pyEstrutura += raioFisicoComponente
      }

      return {
        id: p.id,
        px,
        py,
        pyEstrutura,
        isTop,
        vaiParaOTopo,
        labelX,
        labelY: vaiParaOTopo ? 48 : canvasHeight - 48, // valor padrão inicial
        ancoraY: vaiParaOTopo ? 48 + 22 : canvasHeight - 48, // valor padrão inicial
        ancoraYPadrao: vaiParaOTopo ? 48 + 22 : canvasHeight - 48, // valor padrão inicial
        nivel: 0, // nível de altura padrão inicial para prevenção dinâmica de colisão
        refPoste,
        instancia: p,
        cor: '#8b1a1a' // cor padrão inicial
      }
    })

    // 2. Separa os rótulos em balões do topo e da base com base em vaiParaOTopo
    const ordenarBaloes = (a: any, b: any) => {
      const aIsChao = a.id === 'balanca' || a.id.startsWith('cancela')
      const bIsChao = b.id === 'balanca' || b.id.startsWith('cancela')
      if (aIsChao && !bIsChao) return -1
      if (!aIsChao && bIsChao) return 1
      return a.px - b.px
    }

    const superiores = list.filter(ip => ip.vaiParaOTopo).sort(ordenarBaloes)
    const inferiores = list.filter(ip => !ip.vaiParaOTopo).sort(ordenarBaloes)

    // Fator de escala 3D: 0.60 metros convertidos para pixels na tela
    const distMinPixels = 0.60 * zoom

    // 3. Prevenção dinâmica de colisão horizontal para superiores
    const larguraSegurancaSup = 75
    const degrauSup = 35
    superiores.forEach((ip, idx) => {
      // Encontra o menor nível de altura livre que evite sobreposição horizontal com anteriores
      const niveisProibidos = new Set<number>()
      for (let j = 0; j < idx; j++) {
        const outro = superiores[j]
        if (Math.abs(ip.px - outro.px) < larguraSegurancaSup) {
          niveisProibidos.add(outro.nivel)
        }
      }
      let nivel = 0
      while (niveisProibidos.has(nivel)) {
        nivel++
      }
      ip.nivel = nivel
      
      // Obtém o offset do drag manual para a página 2
      const drag = offsetsArrasto[`${ip.id}-p2`] || { dx: 0, dy: 0 }

      // 1. Calcula ancoraYPadrao sem drag e limitando a tela para que o balão padrão não saia da página
      const ancoraYPadraoOriginal = ip.pyEstrutura - (distMinPixels + nivel * degrauSup)
      const alturaCaixa = 22
      const idealYPadrao = ancoraYPadraoOriginal - alturaCaixa
      const labelYPadrao = Math.max(6, idealYPadrao)
      const ancoraYPadrao = labelYPadrao + alturaCaixa // Ancoragem vertical padrão limitada

      // 2. Guarda a âncora padrão para a dobra do SVG
      ip.ancoraYPadrao = ancoraYPadrao

      // 3. Aplica o drag de forma aditiva após os limites
      ip.labelY = labelYPadrao + drag.dy
      ip.ancoraY = ip.labelY + alturaCaixa
      ip.labelX = ip.px + drag.dx // Aplica o arrasto horizontal
    })

    // Prevenção dinâmica de colisão horizontal para inferiores
    const larguraSegurancaInf = 75
    const degrauInf = 35
    inferiores.forEach((ip, idx) => {
      const niveisProibidos = new Set<number>()
      for (let j = 0; j < idx; j++) {
        const outro = inferiores[j]
        if (Math.abs(ip.px - outro.px) < larguraSegurancaInf) {
          niveisProibidos.add(outro.nivel)
        }
      }
      let nivel = 0
      while (niveisProibidos.has(nivel)) {
        nivel++
      }
      ip.nivel = nivel

      // Obtém o offset do drag manual para a página 2
      const drag = offsetsArrasto[`${ip.id}-p2`] || { dx: 0, dy: 0 }

      // 1. Calcula ancoraYPadrao sem drag e limitando a tela
      const ancoraYPadraoOriginal = ip.pyEstrutura + (distMinPixels + nivel * degrauInf)
      const alturaCaixa = 22
      const labelYPadrao = Math.min(canvasHeight - 6 - alturaCaixa, ancoraYPadraoOriginal)
      const ancoraYPadrao = labelYPadrao // Para balão inferior, a âncora é no topo da caixa (que é labelY)

      // 2. Guarda a âncora padrão para a dobra do SVG
      ip.ancoraYPadrao = ancoraYPadrao

      // 3. Aplica o drag de forma aditiva após os limites
      ip.labelY = labelYPadrao + drag.dy
      ip.ancoraY = ip.labelY
      ip.labelX = ip.px + drag.dx // Aplica o arrasto horizontal
    })

    // 4. Atribui as cores oficiais da SIAMAC de forma alternada
    const coresSiamac = ['#8b1a1a', '#1a7a4a', '#1a4a8b'] // Vinho, Verde e Azul
    superiores.forEach((ip, idx) => {
      ip.cor = coresSiamac[idx % coresSiamac.length]
    })
    inferiores.forEach((ip, idx) => {
      ip.cor = coresSiamac[(idx + 1) % coresSiamac.length]
    })

    return [...superiores, ...inferiores]
  }, [itensParaRotular, zoom, pecas, calibracoes, offsetsArrasto])

  // Mapeia os postes, balança e cancelas especificamente para a Página 4 (detalhada de equipamentos)
  const itemsPostesP4 = useMemo(() => {
    const list = itensParaRotular.map(p => {
      const px = canvasWidth / 2 + p.posicao[0] * zoom
      const py = canvasHeight / 2 + p.posicao[2] * zoom
      const isTop = p.id === 'balanca' ? false : p.posicao[2] < 0
      const vaiParaOTopo = p.id === 'poste-siap03' ? true : isTop
      
      let labelX = px
      if (p.id === 'cancela-entrada') {
        labelX = px - 55 // Desloca um pouco mais para fora no layout P3
      } else if (p.id === 'cancela-saida') {
        labelX = px + 55
      }
      
      let refPoste = ''
      if (p.id.startsWith('poste-siap')) {
        refPoste = p.id.replace('poste-', '').toUpperCase()
      } else if (p.id === 'balanca') {
        refPoste = 'BALANÇA'
      } else if (p.id === 'cancela-entrada') {
        refPoste = 'CANCELA A'
      } else if (p.id === 'cancela-saida') {
        refPoste = 'CANCELA B'
      }

      // Calcula o py limite de toda a estrutura física do poste (incluindo periféricos que se projetam in Z)
      let pyRef = py
      if (vaiParaOTopo !== isTop) {
        pyRef = canvasHeight - py
      }
      let pyEstrutura = pyRef
      if (p.id.startsWith('poste-siap')) {
        // Filtra os periféricos deste poste pela proximidade X e Z no 3D
        const perifsDestePoste = pecas.filter(peca => 
          peca.id !== p.id && 
          Math.abs(peca.posicao[0] - p.posicao[0]) < 0.01 && 
          Math.abs(peca.posicao[2] - p.posicao[2]) < 0.01
        )
        if (perifsDestePoste.length > 0) {
          const posicoesPy = perifsDestePoste.map(perif => {
            const cal = calibracoes[perif.tipo] || { fixadorZ: 0, fixadorX: 0 }
            const rotY = perif.rotacaoY
            const offsetZ = cal.fixadorZ * Math.cos(rotY) + cal.fixadorX * Math.sin(rotY)
            const zFinal = perif.posicao[2] + offsetZ
            let pyPerif = canvasHeight / 2 + zFinal * zoom
            if (vaiParaOTopo !== isTop) {
              pyPerif = canvasHeight - pyPerif
            }
            return pyPerif
          })
          if (vaiParaOTopo) {
            pyEstrutura = Math.min(pyRef, ...posicoesPy)
          } else {
            pyEstrutura = Math.max(pyRef, ...posicoesPy)
          }
        }
      }

      // Adiciona o raio físico do componente (0.15m na escala 3D) na direção do balão
      const raioFisicoComponente = 0.15 * zoom
      if (vaiParaOTopo) {
        pyEstrutura -= raioFisicoComponente
      } else {
        pyEstrutura += raioFisicoComponente
      }

      return {
        id: p.id,
        px,
        py,
        pyEstrutura,
        isTop,
        vaiParaOTopo,
        labelX,
        labelY: vaiParaOTopo ? 48 : canvasHeight - 48, // valor padrão inicial
        ancoraY: vaiParaOTopo ? 48 + 22 : canvasHeight - 48, // valor padrão inicial
        ancoraYPadrao: vaiParaOTopo ? 48 + 22 : canvasHeight - 48, // valor padrão inicial
        nivel: 0, // nível de altura padrão inicial para prevenção dinâmica de colisão
        refPoste,
        instancia: p,
        cor: '#8b1a1a'
      }
    })

    // Separa os balões com base na posição vertical final (vaiParaOTopo) e ordena cancelas/balança primeiro
    const ordenarBaloes = (a: any, b: any) => {
      const aIsChao = a.id === 'balanca' || a.id.startsWith('cancela')
      const bIsChao = b.id === 'balanca' || b.id.startsWith('cancela')
      if (aIsChao && !bIsChao) return -1
      if (!aIsChao && bIsChao) return 1
      return a.px - b.px
    }

    const superiores = list.filter(ip => ip.vaiParaOTopo).sort(ordenarBaloes)
    const inferiores = list.filter(ip => !ip.vaiParaOTopo).sort(ordenarBaloes)

    // Fator de escala 3D: 0.60 metros convertidos para pixels na tela
    const distMinPixels = 0.60 * zoom

    // Prevenção dinâmica de colisão horizontal para superiores (caixas com periféricos)
    const larguraSegurancaSup = 155
    const degrauSup = 75
    superiores.forEach((ip, idx) => {
      // Determina os periféricos do poste para calcular alturaCaixa (agrupando duplicados)
      let listaAgrupados: Array<{ nome: string; quantidade: number }> = []
      if (ip.id.startsWith('poste-siap')) {
        const siapNum = ip.id.replace('poste-siap', '')
        const chave = `perifericosSiap${siapNum}` as keyof ProjectConfig
        const perifericos = config[chave] as PostePeriferico[] | undefined
        if (perifericos && perifericos.length > 0) {
          listaAgrupados = obterPerifericosAgrupados(perifericos, `siap${siapNum}`)
        }
      }
      
      // Estimativa precisa da altura da caixa HTML em pixels
      let linhasPerifs = 0
      listaAgrupados.forEach(item => {
        const textoCompleto = item.quantidade > 1 ? `${item.quantidade} ${item.nome}` : item.nome
        if (textoCompleto.length > 25) {
          linhasPerifs += 2
        } else {
          linhasPerifs += 1
        }
      })
      const alturaCaixa = 32 + linhasPerifs * 13

      // Encontra o menor nível de altura livre que evite sobreposição horizontal com anteriores
      const niveisProibidos = new Set<number>()
      for (let j = 0; j < idx; j++) {
        const outro = superiores[j]
        if (Math.abs(ip.px - outro.px) < larguraSegurancaSup) {
          niveisProibidos.add(outro.nivel)
        }
      }
      let nivel = 0
      while (niveisProibidos.has(nivel)) {
        nivel++
      }
      ip.nivel = nivel

      // Obtém o offset do drag manual para a página 4
      const drag = offsetsArrasto[`${ip.id}-p4`] || { dx: 0, dy: 0 }

      // 1. Calcula ancoraYPadrao sem drag e limitando a tela
      const ancoraYPadraoOriginal = ip.pyEstrutura - (distMinPixels + nivel * degrauSup)
      const idealYPadrao = ancoraYPadraoOriginal - alturaCaixa
      const labelYPadrao = Math.max(6, idealYPadrao)
      const ancoraYPadrao = labelYPadrao + alturaCaixa

      // 2. Guarda a âncora padrão para a dobra do SVG
      ip.ancoraYPadrao = ancoraYPadrao

      // 3. Aplica o drag de forma aditiva após os limites
      ip.labelY = labelYPadrao + drag.dy
      ip.ancoraY = ip.labelY + alturaCaixa
      ip.labelX = ip.px + drag.dx // Aplica o arrasto horizontal
    })

    // Prevenção dinâmica de colisão horizontal para inferiores (caixas com periféricos)
    const larguraSegurancaInf = 155
    const degrauInf = 75
    inferiores.forEach((ip, idx) => {
      // Determina os periféricos do poste para calcular alturaCaixa (agrupando duplicados)
      let listaAgrupados: Array<{ nome: string; quantidade: number }> = []
      if (ip.id.startsWith('poste-siap')) {
        const siapNum = ip.id.replace('poste-siap', '')
        const chave = `perifericosSiap${siapNum}` as keyof ProjectConfig
        const perifericos = config[chave] as PostePeriferico[] | undefined
        if (perifericos && perifericos.length > 0) {
          listaAgrupados = obterPerifericosAgrupados(perifericos, `siap${siapNum}`)
        }
      }
      
      // Estimativa precisa da altura da caixa HTML em pixels
      let linhasPerifs = 0
      listaAgrupados.forEach(item => {
        const textoCompleto = item.quantidade > 1 ? `${item.quantidade} ${item.nome}` : item.nome
        if (textoCompleto.length > 25) {
          linhasPerifs += 2
        } else {
          linhasPerifs += 1
        }
      })
      const alturaCaixa = 32 + linhasPerifs * 13

      // Encontra o menor nível de altura livre que evite sobreposição horizontal com anteriores
      const niveisProibidos = new Set<number>()
      for (let j = 0; j < idx; j++) {
        const outro = inferiores[j]
        if (Math.abs(ip.px - outro.px) < larguraSegurancaInf) {
          niveisProibidos.add(outro.nivel)
        }
      }
      let nivel = 0
      while (niveisProibidos.has(nivel)) {
        nivel++
      }
      ip.nivel = nivel

      // Obtém o offset do drag manual para a página 4
      const drag = offsetsArrasto[`${ip.id}-p4`] || { dx: 0, dy: 0 }

      // 1. Calcula ancoraYPadrao sem drag e limitando a tela
      const ancoraYPadraoOriginal = ip.pyEstrutura + (distMinPixels + nivel * degrauInf)
      const labelYPadrao = Math.min(canvasHeight - 6 - alturaCaixa, ancoraYPadraoOriginal)
      const ancoraYPadrao = labelYPadrao

      // 2. Guarda a âncora padrão para a dobra do SVG
      ip.ancoraYPadrao = ancoraYPadrao

      // 3. Aplica o drag de forma aditiva após os limites
      ip.labelY = labelYPadrao + drag.dy
      ip.ancoraY = ip.labelY
      ip.labelX = ip.px + drag.dx // Aplica o arrasto horizontal
    })

    // Cores alternadas
    const coresSiamac = ['#8b1a1a', '#1a7a4a', '#1a4a8b']
    superiores.forEach((ip, idx) => {
      ip.cor = coresSiamac[idx % coresSiamac.length]
    })
    inferiores.forEach((ip, idx) => {
      ip.cor = coresSiamac[(idx + 1) % coresSiamac.length]
    })

    return [...superiores, ...inferiores]
  }, [itensParaRotular, zoom, pecas, calibracoes, config, offsetsArrasto])

  const fiacaoPorPonto = useMemo(() => {
    const pontosMap: Record<string, {
      ponto: string
      cor: string
      cabos: Record<string, {
        cabo: string
        destino: string
        quantidade: number
        comprimentoTotal: number
        equipamentos: string[]
      }>
    }> = {}

    // Inicializa todos os pontos a partir de itemsPostes para manter a ordem e a cor
    itemsPostes.forEach((ip) => {
      // Evita o ponto "BALANÇA" já que a balança rodoviária em si não tem periféricos de fiação adicionados nela
      if (ip.id === 'balanca') return

      const nomePonto = ip.id.startsWith('poste-siap')
        ? `Poste ${ip.id.replace('poste-', '').toUpperCase()}`
        : ip.refPoste // ex: "CANCELA A", "CANCELA B"
      
      pontosMap[nomePonto] = {
        ponto: nomePonto,
        cor: ip.cor || '#1e293b',
        cabos: {}
      }
    })

    // Varre todas as peças ativas para encontrar periféricos e cancelas e mapear seus cabos
    pecasCalculo.forEach((p) => {
      let nomePonto = ''
      if (p.tipo === 'cancela-lado-a' || p.tipo === 'cancela-lado-b') {
        // Mapeia cancelas de entrada/saída
        nomePonto = p.id === 'cancela-entrada' ? 'CANCELA A' : 'CANCELA B'
      } else if (p.tipo === 'painel-automacao' || p.tipo === 'painel-som') {
        // Painéis centrais entram como ponto próprio (alimentação do painel)
        nomePonto = p.tipo === 'painel-automacao' ? 'Painel SIAMAC' : 'Painel de Som'
      } else if (p.rotulo.includes(' — ')) {
        const siapId = p.rotulo.split(' — ')[1] // ex: "SIAP01", "SIAP02"
        nomePonto = `Poste ${siapId.toUpperCase()}`
      } else {
        return // Ignora balança, veículo, cabine, etc.
      }

      // Se o ponto não existir no mapa, inicializa
      if (!pontosMap[nomePonto]) {
        const corPonto =
          p.tipo === 'painel-automacao' ? '#8b1a1a'
          : p.tipo === 'painel-som' ? '#1a4a8b'
          : '#1e293b'
        pontosMap[nomePonto] = {
          ponto: nomePonto,
          cor: corPonto,
          cabos: {}
        }
      }

      const nomeEquipamento = p.id.startsWith('cancela') ? p.rotulo : (p.rotulo.includes(' — ') ? p.rotulo.split(' — ')[0] : (CATALOGO[p.tipo]?.nome || p.rotulo))

      // Mapeamento dos cabos para cada tipo de periférico
      const cabosEspecificos: Array<{ cabo: string; destino: string }> = []
      if (p.tipo === 'semaforo') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_SEMAFORO_25,
          destino: 'Painel SIAMAC'
        })
      } else if (p.tipo === 'camera-ip' || p.tipo === 'camera-ip-baixo' || p.tipo === 'camera-ocr') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: 'Roteador PoE'
        })
      } else if (p.tipo === 'cancela-lado-a' || p.tipo === 'cancela-lado-b' || p.tipo === 'cancela') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: 'Quadro de Distribuição'
        }, {
          cabo: ESPEC_CABO_COMANDO_15,
          destino: 'Painel SIAMAC'
        })
      } else if (p.tipo === 'sensor-emissor' || p.tipo === 'sensor-receptor') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_COMANDO_15,
          destino: 'Painel SIAMAC'
        })
      } else if (p.tipo === 'display-mensagens') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: 'Quadro de Distribuição'
        }, {
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: 'Roteador PoE'
        })
      } else if (p.tipo === 'leitor-rfid') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: 'Quadro de Distribuição'
        }, {
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: 'Roteador'
        })
      } else if (p.tipo === 'caixa-de-som') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_SOM_25,
          destino: 'Painel de Som'
        })
      } else if (p.tipo === 'painel-automacao' || p.tipo === 'painel-som') {
        cabosEspecificos.push({
          cabo: ESPEC_CABO_ALIMENTACAO_25,
          destino: 'Quadro de Distribuição'
        }, {
          cabo: ESPEC_CABO_REDE_CAT6,
          destino: 'Roteador PoE'
        })
      }

      // Adiciona no mapa agrupando cabos idênticos no mesmo ponto e somando seus comprimentos
      cabosEspecificos.forEach((ce) => {
        const chaveAgrupador = `${ce.cabo}|||${ce.destino}`
        const cabosDoPonto = pontosMap[nomePonto].cabos
        const comprimento = calcularComprimentoCabo(p, ce.destino, config)
        if (!cabosDoPonto[chaveAgrupador]) {
          cabosDoPonto[chaveAgrupador] = {
            cabo: ce.cabo,
            destino: ce.destino,
            quantidade: 0,
            comprimentoTotal: 0,
            equipamentos: []
          }
        }
        cabosDoPonto[chaveAgrupador].quantidade += 1
        cabosDoPonto[chaveAgrupador].comprimentoTotal += comprimento
        if (!cabosDoPonto[chaveAgrupador].equipamentos.includes(nomeEquipamento)) {
          cabosDoPonto[chaveAgrupador].equipamentos.push(nomeEquipamento)
        }
      })
    })

    // Converte para array e limpa pontos sem cabo
    return Object.values(pontosMap)
      .map(p => ({
        ...p,
        cabosList: Object.values(p.cabos)
      }))
      .filter(p => p.cabosList.length > 0)
  }, [pecasCalculo, itemsPostes, config])

  // Divide a tabela de fiação geral em blocos de até 15 itens para evitar scroll na impressão
  const paginasT5 = useMemo(() => {
    if (itensFiacao.length === 0) return [[]]
    const chunks = []
    const limite = 15
    for (let i = 0; i < itensFiacao.length; i += limite) {
      chunks.push(itensFiacao.slice(i, i + limite))
    }
    return chunks
  }, [itensFiacao])

  // Consolida o quantitativo total por tipo de cabo
  const resumoQuantitativoCabos = useMemo(() => {
    const resumoMap: Record<string, { cabo: string; nomeAmigavel: string; quantidade: number; metragemTotal: number }> = {}

    pecasCalculo.forEach((p) => {
      const cabosEspecificos: Array<{ cabo: string; destino: string; nomeAmigavel: string }> = []
      if (p.tipo === 'semaforo') {
        cabosEspecificos.push({ cabo: ESPEC_CABO_SEMAFORO_25, destino: 'Painel SIAMAC', nomeAmigavel: 'Cabo PP 3x2,5 mm² para semáforos' })
      } else if (p.tipo === 'camera-ip' || p.tipo === 'camera-ip-baixo' || p.tipo === 'camera-ocr') {
        cabosEspecificos.push({ cabo: ESPEC_CABO_REDE_CAT6, destino: 'Roteador PoE', nomeAmigavel: 'Cabo de rede CAT6 blindado ou superior' })
      } else if (p.tipo === 'cancela-lado-a' || p.tipo === 'cancela-lado-b' || p.tipo === 'cancela') {
        cabosEspecificos.push(
          { cabo: ESPEC_CABO_ALIMENTACAO_25, destino: 'Quadro de Distribuição', nomeAmigavel: 'Cabo de alimentação 3x2,5 mm²' },
          { cabo: ESPEC_CABO_COMANDO_15, destino: 'Painel SIAMAC', nomeAmigavel: 'Cabo PP blindado 4x1,5 mm² para comando de cancela' }
        )
      } else if (p.tipo === 'sensor-emissor' || p.tipo === 'sensor-receptor') {
        cabosEspecificos.push({ cabo: ESPEC_CABO_COMANDO_15, destino: 'Painel SIAMAC', nomeAmigavel: 'Cabo PP blindado 4x1,5 mm² para sensores de barreira' })
      } else if (p.tipo === 'display-mensagens') {
        cabosEspecificos.push(
          { cabo: ESPEC_CABO_ALIMENTACAO_25, destino: 'Quadro de Distribuição', nomeAmigavel: 'Cabo de alimentação 3x2,5 mm²' },
          { cabo: ESPEC_CABO_REDE_CAT6, destino: 'Roteador PoE', nomeAmigavel: 'Cabo de rede CAT6 blindado ou superior' }
        )
      } else if (p.tipo === 'leitor-rfid') {
        cabosEspecificos.push(
          { cabo: ESPEC_CABO_ALIMENTACAO_25, destino: 'Quadro de Distribuição', nomeAmigavel: 'Cabo de alimentação 3x2,5 mm²' },
          { cabo: ESPEC_CABO_REDE_CAT6, destino: 'Roteador', nomeAmigavel: 'Cabo de rede CAT6 blindado ou superior' }
        )
      } else if (p.tipo === 'caixa-de-som') {
        cabosEspecificos.push({ cabo: ESPEC_CABO_SOM_25, destino: 'Painel de Som', nomeAmigavel: 'Cabo paralelo de som 2x2,5 mm²' })
      } else if (p.tipo === 'painel-automacao' || p.tipo === 'painel-som') {
        cabosEspecificos.push(
          { cabo: ESPEC_CABO_ALIMENTACAO_25, destino: 'Quadro de Distribuição', nomeAmigavel: 'Cabo de alimentação 3x2,5 mm²' },
          { cabo: ESPEC_CABO_REDE_CAT6, destino: 'Roteador PoE', nomeAmigavel: 'Cabo de rede CAT6 blindado ou superior' }
        )
      }

      cabosEspecificos.forEach((ce) => {
        const comprimento = calcularComprimentoCabo(p, ce.destino, config)
        if (!resumoMap[ce.nomeAmigavel]) {
          resumoMap[ce.nomeAmigavel] = {
            cabo: ce.cabo,
            nomeAmigavel: ce.nomeAmigavel,
            quantidade: 0,
            metragemTotal: 0
          }
        }
        resumoMap[ce.nomeAmigavel].quantidade += 1
        resumoMap[ce.nomeAmigavel].metragemTotal += comprimento
      })
    })

    return Object.values(resumoMap)
  }, [pecasCalculo, config])

  // Divide os cards de fiação por poste em blocos de até 8 itens (grid 4x2) para evitar scroll
  const paginasT6 = useMemo(() => {
    if (fiacaoPorPonto.length === 0) return []
    const chunks = []
    const limite = 8
    for (let i = 0; i < fiacaoPorPonto.length; i += limite) {
      chunks.push(fiacaoPorPonto.slice(i, i + limite))
    }
    return chunks
  }, [fiacaoPorPonto])

  // Gera a lista dinâmica de detalhes individuais de postes/cancelas
  const itensDetalhe = useMemo(() => {
    const lista: ItemDetalheSpec[] = []

    // Cancelas
    if (config.cancelaEntrada) {
      lista.push({
        id: 'cancela-entrada',
        tipo: 'cancela',
        titulo: 'DETALHAMENTO TÉCNICO - CANCELA A',
        nomeNoSelo: 'CANCELA A',
        ativo: true,
        altura: 1.37,
        tipoPeca: config.inverterLateralEntrada ? 'cancela-lado-a' : 'cancela-lado-b',
        perifericos: []
      })
    }

    if (config.cancelaSaida) {
      lista.push({
        id: 'cancela-saida',
        tipo: 'cancela',
        titulo: 'DETALHAMENTO TÉCNICO - CANCELA B',
        nomeNoSelo: 'CANCELA B',
        ativo: true,
        altura: 1.37,
        tipoPeca: config.inverterLateralSaida ? 'cancela-lado-b' : 'cancela-lado-a',
        perifericos: []
      })
    }

    // SIAP01 a SIAP09
    const siapSpecs = [
      { num: '01', altura: 3.0, diametro: '2 1/2" - Tubo SCH. 40', tipoPeca: 'poste-3m' as PieceTypeId },
      { num: '02', altura: 3.0, diametro: '2 1/2" - Tubo SCH. 40', tipoPeca: 'poste-3m' as PieceTypeId },
      { num: '03', altura: 3.0, diametro: '2 1/2" - Tubo SCH. 40', tipoPeca: 'poste-3m' as PieceTypeId },
      { num: '04', altura: 1.5, diametro: '2" - Tubo SCH. 40', tipoPeca: 'poste-1-5m' as PieceTypeId },
      { num: '05', altura: 3.0, diametro: '2 1/2" - Tubo SCH. 40', tipoPeca: 'poste-3m' as PieceTypeId },
      { num: '06', altura: 3.0, diametro: '2 1/2" - Tubo SCH. 40', tipoPeca: 'poste-3m' as PieceTypeId },
      { num: '07', altura: 3.0, diametro: '2 1/2" - Tubo SCH. 40', tipoPeca: 'poste-3m' as PieceTypeId },
      { num: '08', altura: 1.5, diametro: '2" - Tubo SCH. 40', tipoPeca: 'poste-1-5m' as PieceTypeId },
      { num: '09', altura: 6.0, diametro: '4" - Tubo SCH. 40', tipoPeca: 'poste-6m' as PieceTypeId }
    ]

    siapSpecs.forEach(spec => {
      const keyAtivo = `siap${spec.num}` as keyof ProjectConfig
      const keyPerif = `perifericosSiap${spec.num}` as keyof ProjectConfig

      if (config[keyAtivo]) {
        const perifs = (config[keyPerif] as PostePeriferico[]) || []
        lista.push({
          id: `poste-siap${spec.num}`,
          tipo: 'poste',
          titulo: `DETALHAMENTO TÉCNICO - POSTE SIAP${spec.num}`,
          nomeNoSelo: `SIAP${spec.num}`,
          ativo: true,
          altura: spec.altura,
          diametro: spec.diametro,
          tipoPeca: spec.tipoPeca,
          perifericos: perifs
        })
      }
    })

    // Painéis centrais (SIAMAC e Som) — concentradores de cabos, sem poste
    if (config.painelAutomacao) {
      lista.push({
        id: 'painel-siamac',
        tipo: 'painel',
        titulo: 'DETALHAMENTO TÉCNICO - PAINEL SIAMAC (AUTOMAÇÃO)',
        nomeNoSelo: 'PAINEL SIAMAC',
        ativo: true,
        altura: CATALOGO['painel-automacao'].placeholder[1],
        tipoPeca: 'painel-automacao',
        perifericos: []
      })
    }
    if (config.painelSom) {
      lista.push({
        id: 'painel-som',
        tipo: 'painel',
        titulo: 'DETALHAMENTO TÉCNICO - PAINEL DE SOM',
        nomeNoSelo: 'PAINEL DE SOM',
        ativo: true,
        altura: CATALOGO['painel-som'].placeholder[1],
        tipoPeca: 'painel-som',
        perifericos: []
      })
    }

    // Atribui números de páginas dinâmicos sequenciais (começando na página 5 se a capa conta, ou 4 se não conta)
    const paginaInicialDetalhe = CAPA_ENTRA_NA_CONTAGEM ? 5 : 4
    return lista.map((item, idx) => ({
      ...item,
      paginaNum: paginaInicialDetalhe + idx
    }))
  }, [config])



  // --- Lógica para o Checklist de Comissionamento e Instalação Física ---
  const itensChecklist = useMemo(() => {
    const lista: Array<{ ponto: string; pergunta: string }> = []

    // --- GRUPO 1: POSTES CIVIS E SEUS PERIFÉRICOS ---
    const siapKeys: Array<keyof ProjectConfig> = ['siap01', 'siap02', 'siap03', 'siap04', 'siap05', 'siap06', 'siap07', 'siap08', 'siap09']
    
    siapKeys.forEach((key) => {
      const isAct = config[key] === true
      if (isAct) {
        const siapNum = (key as string).replace('siap', '')
        const siapName = `POSTE SIAP${siapNum}`
        
        // Perguntas gerais do poste
        lista.push(
          { ponto: siapName, pergunta: 'O poste foi instalado rigorosamente no nível da pista da balança (conforme aviso importante da Pág. 4)?' },
          { ponto: siapName, pergunta: 'O poste está perfeitamente aprumado (verticalidade verificada com nível/prumo)?' },
          { ponto: siapName, pergunta: 'A base de concreto está firme e o poste está rigidamente fixado com os chumbadores?' },
          { ponto: siapName, pergunta: 'O acabamento do material do poste (Aço Carbono Galvanizado com pintura eletrostática) está sem riscos ou danos?' }
        )

        // Adiciona perguntas para os periféricos do poste
        const siapNumPerif = (key as string).replace('siap', '')
        const perifKey = `perifericosSiap${siapNumPerif}` as keyof ProjectConfig
        const perifericos = config[perifKey] as PostePeriferico[] | undefined
        
        if (perifericos && perifericos.length > 0) {
          perifericos.forEach((perif) => {
            if (perif.tipo === 'semaforo') {
              lista.push(
                { ponto: siapName, pergunta: `Semáforo: Está fixado firmemente na altura correta (${perif.altura}m) e posicionado visivelmente para o motorista?` },
                { ponto: siapName, pergunta: `Semáforo: Está conectado com cabo PP flexível de cobre, 3x2,5 mm², destinado ao acionamento dos semáforos pelo Painel SIAMAC?` },
                { ponto: siapName, pergunta: 'Semáforo: As lentes indicadoras (verde e vermelha) acendem corretamente nos testes de comando?' }
              )
            } else if (perif.tipo === 'camera-ip' || perif.tipo === 'camera-ip-baixo' || perif.tipo === 'camera-ocr') {
              const labelCam = perif.tipo === 'camera-ocr' ? 'Câmera OCR' : 'Câmera IP'
              lista.push(
                { ponto: siapName, pergunta: `${labelCam}: Está fixada no suporte na altura recomendada (${perif.altura}m) e direcionada para a área de captura?` },
                { ponto: siapName, pergunta: `${labelCam}: Está conectada com cabo de rede CAT6 blindado ou superior, conforme especificações de aterramento?` },
                { ponto: siapName, pergunta: `${labelCam}: O prensa-cabo ou caixa de passagem técnica está hermeticamente fechado para evitar infiltração de chuva?` },
                { ponto: siapName, pergunta: `${labelCam}: O foco, enquadramento e luminosidade de imagem estão operacionais no software de pesagem?` }
              )
            } else if (perif.tipo === 'leitor-rfid') {
              lista.push(
                { ponto: siapName, pergunta: `RFID: A antena está fixada a ${perif.altura}m de altura e apontada no ângulo correto para leitura de TAG no para-brisa?` },
                { ponto: siapName, pergunta: `RFID: Está conectada com cabo de rede CAT6 blindado ou superior e cabo de alimentação de cobre flexível 0,6/1 kV, 3G2,5 mm²?` },
                { ponto: siapName, pergunta: 'RFID: Foi testado e verificado que não há obstáculos metálicos bloqueando a frente de leitura da antena?' },
                { ponto: siapName, pergunta: 'RFID: O leitor realiza a leitura de TAGs de teste com boa margem de sinal (RSSI)?' }
              )
            } else if (perif.tipo === 'display-mensagens') {
              lista.push(
                { ponto: siapName, pergunta: `Display: O painel de LED está fixado de forma segura no poste elevado de 6m?` },
                { ponto: siapName, pergunta: `Display: Está alimentado via cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² e conectado à rede via cabo de rede CAT6 blindado ou superior?` },
                { ponto: siapName, pergunta: 'Display: A isolação contra poeira e vedação contra chuva do gabinete do painel estão em conformidade?' },
                { ponto: siapName, pergunta: 'Display: As mensagens de peso e textos instrucionais são exibidos por completo sem falhas nos caracteres?' }
              )
            } else if (perif.tipo === 'sensor-emissor' || perif.tipo === 'sensor-receptor') {
              const labelSens = perif.tipo === 'sensor-emissor' ? 'Sensor Emissor' : 'Sensor Receptor'
              lista.push(
                { ponto: siapName, pergunta: `${labelSens}: Está fixado firmemente na altura regulamentada de 0,75m no poste?` },
                { ponto: siapName, pergunta: `${labelSens}: Está conectado com cabo PP flexível de cobre, blindado, 4x1,5 mm² de sinal até o Painel SIAMAC?` }
              )
              if (perif.tipo === 'sensor-receptor') {
                lista.push(
                  { ponto: siapName, pergunta: 'Sensores de Barreira: O alinhamento óptico foi concluído com sucesso (LED indicador aceso no receptor)?' },
                  { ponto: siapName, pergunta: 'Sensores de Barreira: O corte de sinal ocorre imediatamente quando o feixe é obstruído?' }
                )
              }
            } else if (perif.tipo === 'caixa-de-som') {
              lista.push(
                { ponto: siapName, pergunta: 'Caixa de Som: A corneta de som está fixada no suporte do poste e direcionada para a pista?' },
                { ponto: siapName, pergunta: 'Caixa de Som: Está conectada com cabo paralelo de som 2x2,5 mm² (cobre puro, não CCA) até o Painel de Som?' },
                { ponto: siapName, pergunta: 'Caixa de Som: A comunicação e avisos por áudio foram testados e estão claros e audíveis?' }
              )
            }
          })
        }
      }
    })

    // --- GRUPO 2: CANCELAS ---
    if (config.cancelaEntrada) {
      const cancelaName = 'CANCELA A'
      lista.push(
        { ponto: cancelaName, pergunta: 'A base civil de concreto foi construída com altura de 20 cm acima do nível da pista da balança rodoviária?' },
        { ponto: cancelaName, pergunta: 'A cancela está alimentada por cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² até o Quadro de Distribuição?' },
        { ponto: cancelaName, pergunta: 'O cabo de comando PP flexível de cobre, blindado, 4x1,5 mm² está conectado da cancela ao Painel SIAMAC?' },
        { ponto: cancelaName, pergunta: 'Os laços indutivos foram cortados e selados com resina na pista e conectados aos bornes detectores?' },
        { ponto: cancelaName, pergunta: 'O braço da cancela está balanceado por mola e os interruptores de fim de curso estão calibrados?' }
      )
    }
    if (config.cancelaSaida) {
      const cancelaName = 'CANCELA B'
      lista.push(
        { ponto: cancelaName, pergunta: 'A base civil de concreto foi construída com altura de 20 cm acima do nível da pista da balança rodoviária?' },
        { ponto: cancelaName, pergunta: 'A cancela está alimentada por cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² até o Quadro de Distribuição?' },
        { ponto: cancelaName, pergunta: 'O cabo de comando PP flexível de cobre, blindado, 4x1,5 mm² está conectado da cancela ao Painel SIAMAC?' },
        { ponto: cancelaName, pergunta: 'Os laços indutivos foram cortados e selados com resina na pista e conectados aos bornes detectores?' },
        { ponto: cancelaName, pergunta: 'O braço da cancela está balanceado por mola e os interruptores de fim de curso estão calibrados?' }
      )
    }

    // --- GRUPO 3: PAINÉIS DE AUTOMAÇÃO E COMANDO ---
    if (config.painelAutomacao) {
      const painelName = 'PAINEL SIAMAC'
      lista.push(
        { ponto: painelName, pergunta: 'O painel está instalado em local seco, ventilado e devidamente protegido na sala técnica/cabine?' },
        { ponto: painelName, pergunta: 'A alimentação 220V via disjuntor com cabo de cobre flexível 0,6/1 kV, 3G2,5 mm² está concluída?' },
        { ponto: painelName, pergunta: 'O aterramento de proteção (fio verde) está interligado ao barramento geral de terra da cabine?' },
        { ponto: painelName, pergunta: 'Todos os cabos de sinal provenientes dos sensores de barreira e cancelas estão devidamente anilhados e conectados?' }
      )
    }
    
    if (config.painelSom) {
      const painelName = 'PAINEL DE SOM'
      lista.push(
        { ponto: painelName, pergunta: 'O painel/amplificador de som está fixado na sala técnica e alimentado via cabo de cobre flexível 0,6/1 kV, 3G2,5 mm²?' },
        { ponto: painelName, pergunta: 'Os cabos das cornetas de áudio estão conectados e identificados nos canais correspondentes?' }
      )
    }

    // --- GRUPO 4: DISPOSITIVOS DA CABINE (COMPUTADOR E IMPRESSORA) ---
    const cabineName = 'CABINE DE OPERAÇÃO'
    lista.push(
      { ponto: cabineName, pergunta: 'O computador está ligado, conectado na rede IP e com comunicação estabelecida com o Painel SIAMAC?' },
      { ponto: cabineName, pergunta: 'Os softwares de controle e pesagem (SIAMAC/OWL) estão instalados e licenciados?' },
      { ponto: cabineName, pergunta: 'A impressora de tickets de pesagem está instalada e os drivers configurados no computador de pesagem?' },
      { ponto: cabineName, pergunta: 'A impressão de teste de tickets foi realizada com sucesso e o corte de papel automático está funcional?' }
    )

    return lista
  }, [config])

  const paginasChecklist = useMemo(() => {
    if (itensChecklist.length === 0) return [[]]
    const chunks = []
    const limite = apenasChecklist ? 8 : 10 // 8 itens por página no A4 vertical (evita cortes e preenche bem o espaço), 10 no A3 horizontal
    for (let i = 0; i < itensChecklist.length; i += limite) {
      chunks.push(itensChecklist.slice(i, i + limite))
    }
    return chunks
  }, [itensChecklist, apenasChecklist])

  // Balanças de sobrepor ou semiembutidas têm a pista acima do solo: exige a página de
  // orientação sobre nivelamento dos postes e da base da cancela em relação à pista.
  const exigeNivelamentoBalanca =
    config.tipoInstalacaoBalanca === 'sobrepor' || config.tipoInstalacaoBalanca === 'semiembutida'

  // Número da página de nivelamento (após a última página de fiação por ponto)
  const numPaginaNivelamento = 6 + itensDetalhe.length + paginasT5.length + paginasT6.length + 1
  const numPaginaNivelamentoSelo = (CAPA_ENTRA_NA_CONTAGEM ? 6 : 5) + itensDetalhe.length + paginasT5.length + paginasT6.length + 1

  // Número da página da Matriz de Responsabilidades (após a de nivelamento, se houver, ou fiação por ponto)
  const numPaginaMatriz = 6 + itensDetalhe.length + paginasT5.length + paginasT6.length + (exigeNivelamentoBalanca ? 1 : 0) + 1
  const numPaginaMatrizSelo = (CAPA_ENTRA_NA_CONTAGEM ? 6 : 5) + itensDetalhe.length + paginasT5.length + paginasT6.length + (exigeNivelamentoBalanca ? 1 : 0) + 1

  // Calcula a quantidade total de páginas físicas do documento (inclui sempre a capa física no total de lances do visualizador)
  const totalPaginasFisicas = useMemo(() => {
    if (apenasChecklist) {
      return paginasChecklist.length
    }
    return 6 + 1 + itensDetalhe.length + paginasT5.length + paginasT6.length + (exigeNivelamentoBalanca ? 1 : 0)
  }, [itensDetalhe, paginasT5, paginasT6, exigeNivelamentoBalanca, paginasChecklist, apenasChecklist])

  // Calcula a quantidade total de páginas do documento (para o carimbo/selo, que pode ou não contar a capa)
  const totalPaginas = useMemo(() => {
    if (apenasChecklist) {
      return paginasChecklist.length
    }
    const paginasFixas = (CAPA_ENTRA_NA_CONTAGEM ? 6 : 5) + 1
    return paginasFixas + itensDetalhe.length + paginasT5.length + paginasT6.length + (exigeNivelamentoBalanca ? 1 : 0)
  }, [itensDetalhe, paginasT5, paginasT6, exigeNivelamentoBalanca, paginasChecklist, apenasChecklist])

  return (
    <div className="documento-impressao">
      {/* Barra de Ferramentas de Impressão (Preview) */}
      <div className="barra-preview-pdf">
        <span className="preview-titulo">{apenasChecklist ? 'Checklist de Instalação (A4)' : 'Visualização Técnica (A3)'}</span>
        
        {/* Controles de Paginação (visíveis apenas quando não estiver imprimindo) */}
        {!isPrinting && (
          <div className="preview-paginacao" style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 20px', background: '#1e293b', padding: '4px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
            <button 
              className="btn-pag-nav" 
              onClick={() => setPaginaAtiva(p => Math.max(1, p - 1))}
              disabled={paginaAtiva === 1}
              style={{ background: 'transparent', border: 'none', color: paginaAtiva === 1 ? '#64748b' : '#f8fafc', cursor: paginaAtiva === 1 ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}
            >
              ◀
            </button>
            <span style={{ color: '#f8fafc', fontSize: '12px', fontWeight: '500', minWidth: '100px', textAlign: 'center' }}>
              {apenasChecklist ? (
                `Página ${paginaAtiva} de ${totalPaginas}`
              ) : paginaAtiva === 1 ? (
                CAPA_ENTRA_NA_CONTAGEM ? `Página 1 de ${totalPaginas}` : 'Capa'
              ) : (
                `Página ${CAPA_ENTRA_NA_CONTAGEM ? paginaAtiva : paginaAtiva - 1} de ${totalPaginas}`
              )}
            </span>
            <button 
              className="btn-pag-nav" 
              onClick={() => setPaginaAtiva(p => Math.min(totalPaginasFisicas, p + 1))}
              disabled={paginaAtiva === totalPaginasFisicas}
              style={{ background: 'transparent', border: 'none', color: paginaAtiva === totalPaginasFisicas ? '#64748b' : '#f8fafc', cursor: paginaAtiva === totalPaginasFisicas ? 'not-allowed' : 'pointer', fontSize: '14px', fontWeight: 'bold' }}
            >
              ▶
            </button>
          </div>
        )}


        <button className="btn-preview-print" onClick={handleSalvarPDF}>
          🖨️ Salvar PDF
        </button>
        <button className="btn-preview-print" onClick={handleRedefinirBaloes} style={{ marginLeft: '8px', background: '#475569' }}>
          🔄 Redefinir Balões
        </button>
        <button className="btn-preview-close" onClick={onFechar}>
          ⬅️ Voltar ao Editor
        </button>
      </div>

      {!apenasChecklist && (
        <>
          {/* PÁGINA 1: CAPA */}
          {(isPrinting || paginaAtiva === 1) && (
        <div className="pagina-a3 capa-documento">
          <div className="capa-decoracao-topo"></div>
          
          <div className="capa-conteudo">
            <div className="capa-header">
              <span className="capa-tag">SIAMAC • LINHA OWL</span>
              <h1 className="capa-titulo">GUIA ORIENTATIVO DE INSTALAÇÃO DA INFRAESTRUTURA</h1>
              <h2 className="capa-subtitulo">Dimensionamento Técnico de Balança Rodoviária</h2>
            </div>

            <div className="capa-detalhes">
              <div className="detalhe-item">
                <span className="detalhe-label">Proposta / Pedido</span>
                <span className="detalhe-valor proposta-codigo">{config.codigoProposta || 'Não especificado'}</span>
              </div>
              
              <div className="detalhe-item">
                <span className="detalhe-label">Cliente</span>
                <span className="detalhe-valor">{config.cliente || 'Não especificado'}</span>
              </div>

              {config.obra && (
                <div className="detalhe-item">
                  <span className="detalhe-label">Obra / Local</span>
                  <span className="detalhe-valor">{config.obra}</span>
                </div>
              )}
            </div>

            <div className="capa-footer">
              <div className="footer-col">
                <span className="footer-label">Código do Documento</span>
                <span className="footer-valor doc-codigo">{codigoDocumento}</span>
              </div>
              <div className="footer-col">
                <span className="footer-label">Data de Emissão</span>
                <span className="footer-valor">{formatarData(dataEmissao)}</span>
              </div>
              <div className="footer-col">
                <span className="footer-label">Revisão</span>
                <span className="footer-valor rev-codigo">R{(config.revisao !== undefined) ? String(config.revisao).padStart(2, '0') : '00'}</span>
              </div>
            </div>
          </div>

          <div className="capa-decoracao-bottom">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>
        </div>
      )}

      {/* PÁGINA 2: VISÃO GERAL DA BALANÇA (PLANTA DE CIMA) */}
      {(isPrinting || paginaAtiva === 2) && (
        <div className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          {/* Planta Baixa com Cena 3D Ortográfica e Overlay 2D */}
          <div className="titulo-planta-pagina">
            REFERÊNCIA DOS POSTES
          </div>

          <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <div 
              className="canvas-container-planta" 
              style={{ 
                position: 'relative', 
                width: `${canvasWidth}px`, 
                height: `${canvasHeight}px`,
                background: '#ffffff',
                margin: '0 auto'
              }}
            >
              <Canvas
                orthographic
                camera={{ 
                  position: [0, 20, 0], 
                  zoom: zoom, 
                  up: [0, 0, -1] 
                }}
                style={{ width: '100%', height: '100%' }}
                gl={{ preserveDrawingBuffer: true }}
                className="canvas-render-3d"
              >
                <color attach="background" args={['#ffffff']} />
                <ambientLight intensity={0.8} />
                <directionalLight position={[0, 30, 0]} intensity={1.0} />
                
                {pecas.map((p) => (
                  <Piece
                    key={p.id}
                    instancia={p}
                    modeloDisponivel={modelosDisponiveis.has(CATALOGO[p.tipo].modelo)}
                    mostrarRotulos={false} // Rótulos são gerenciados pelo overlay 2D em SVG/HTML
                  />
                ))}
              </Canvas>

              {/* Overlay SVG para desenhar os traçados técnicos vermelhos (linhas-guia) */}
              <svg 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '100%', 
                  pointerEvents: 'none',
                  zIndex: 4
                }}
              >
                {itemsPostes.map(ip => {
                  // Linha vertical com dobra 90 graus (caso haja deslocamento horizontal) para o balão
                  const pathData = `M ${ip.px} ${ip.py} L ${ip.px} ${ip.ancoraYPadrao} L ${ip.labelX} ${ip.ancoraYPadrao} L ${ip.labelX} ${ip.ancoraY}`

                  return (
                    <g key={`svg-g-${ip.id}`}>
                      {/* Linha tracejada ortogonal (90 graus) com cor do respectivo grupo */}
                      <path
                        d={pathData}
                        stroke={ip.cor}
                        strokeWidth="1.2"
                        strokeDasharray="4,4"
                        fill="none"
                      />
                      {/* Alvo técnico no poste */}
                      <circle cx={ip.px} cy={ip.py} r="4" fill={ip.cor} />
                      <circle cx={ip.px} cy={ip.py} r="8" fill="none" stroke={ip.cor} strokeWidth="1" />
                    </g>
                  )
                })}

              </svg>

              {/* Rótulos HTML Absolutos com borda e texto na cor correspondente e fundo branco */}
              {itemsPostes.map(ip => (
                <div
                  key={`html-label-${ip.id}`}
                  onMouseDown={(e) => iniciarArrasto(ip.id, 2, e)}
                  style={{
                    position: 'absolute',
                    left: `${ip.labelX}px`,
                    top: `${ip.labelY}px`,
                    transform: 'translateX(-50%)',
                    backgroundColor: '#ffffff',
                    border: `1.5px solid ${ip.cor}`,
                    borderRadius: '4px',
                    padding: '3px 8px',
                    fontSize: '10px',
                    fontWeight: 'bold',
                    color: ip.cor,
                    boxShadow: `0 2px 6px ${ip.cor}26`, // 15% opacidade na sombra
                    whiteSpace: 'nowrap',
                    cursor: 'grab',
                    userSelect: 'none',
                    zIndex: 5
                  }}
                >
                  {ip.refPoste}
                </div>
              ))}
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
          <div className="rodape-tecnico">
            <div className="notas-rodape">
              <strong>NOTAS DE PROJETO:</strong>
              <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                <li>As dimensões estão expressas em metros (m).</li>
                <li>O posicionamento sugerido é meramente orientativo e poderá sofrer ajustes de infraestrutura local conforme a obra.</li>
                <li>A fiação e infraestrutura subterrânea de eletrodutos é de inteira responsabilidade do cliente.</li>
                <li>Os postes identificados acima (SIAP01 a SIAP09) acomodam os periféricos conforme especificação de fiação anexa.</li>
              </ol>
            </div>
            
            <SeloPagina
              config={config}
              tituloPlanta="REFERÊNCIA DOS POSTES"
              revisao={config.revisao}
              paginaNum={CAPA_ENTRA_NA_CONTAGEM ? 2 : 1}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )}

      {/* PÁGINA 3: AFASTAMENTO DOS EQUIPAMENTOS (COTAS DE AFASTAMENTO EM RELAÇÃO À BALANÇA) */}
      {(isPrinting || paginaAtiva === 3) && (
        <div className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          <div className="titulo-planta-pagina">
            AFASTAMENTO DOS EQUIPAMENTOS
          </div>

          <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <div 
              className="canvas-container-planta" 
              style={{ 
                position: 'relative', 
                width: `${canvasWidth}px`, 
                height: `${canvasHeight}px`,
                background: '#ffffff',
                margin: '0 auto'
              }}
            >
              <Canvas
                orthographic
                camera={{ 
                  position: [0, 20, 0], 
                  zoom: zoom, 
                  up: [0, 0, -1] 
                }}
                style={{ width: '100%', height: '100%' }}
                gl={{ preserveDrawingBuffer: true }}
                className="canvas-render-3d"
              >
                <color attach="background" args={['#ffffff']} />
                <ambientLight intensity={0.8} />
                <directionalLight position={[0, 30, 0]} intensity={1.0} />
                
                {pecas.map((p) => (
                  <Piece
                    key={`p-afast-3d-${p.id}`}
                    instancia={p}
                    modeloDisponivel={modelosDisponiveis.has(CATALOGO[p.tipo].modelo)}
                    mostrarRotulos={false}
                  />
                ))}
              </Canvas>

              {/* Overlay SVG para desenhar as cotas técnicas de afastamento */}
              <svg 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '100%', 
                  pointerEvents: 'auto',
                  zIndex: 4
                }}
              >
                {/* Linhas de referência verticais para as extremidades (cabeceiras) da balança */}
                <line 
                  x1={cx - metadeComprimento * zoom} 
                  y1={cy - metadeLargura * zoom - 115} 
                  x2={cx - metadeComprimento * zoom} 
                  y2={cy + metadeLargura * zoom + 55} 
                  stroke="#64748b" 
                  strokeWidth="0.8" 
                  strokeDasharray="4,4" 
                />
                <line 
                  x1={cx + metadeComprimento * zoom} 
                  y1={cy - metadeLargura * zoom - 115} 
                  x2={cx + metadeComprimento * zoom} 
                  y2={cy + metadeLargura * zoom + 55} 
                  stroke="#64748b" 
                  strokeWidth="0.8" 
                  strokeDasharray="4,4" 
                />

                {/* Desenho das cotas das peças ativas em relação à balança */}
                {pecas.map(p => {
                  if (!p.id.startsWith('poste-siap') && p.id !== 'cancela-entrada' && p.id !== 'cancela-saida') return null;
                  
                  const px = cx + p.posicao[0] * zoom;
                  const py = cy + p.posicao[2] * zoom;
                  
                  const isCabeceiraA = p.posicao[0] < 0;
                  const x_cabeceira = isCabeceiraA 
                    ? cx - metadeComprimento * zoom 
                    : cx + metadeComprimento * zoom;
                  
                  const isCentral = Math.abs(p.posicao[0]) < 0.1;
                  
                  // Distância física horizontal em metros
                  const distFisicaX = isCentral 
                    ? 0 
                    : Math.abs(p.posicao[0] - (isCabeceiraA ? -metadeComprimento : metadeComprimento));

                  // 1. COTA HORIZONTAL (X)
                  if (!isCentral && distFisicaX > 0.01) {
                    // Define a trilha vertical (Y) para evitar sobreposição
                    let y_cota_inicial = cy - metadeLargura * zoom - 40; // padrão
                    
                    if (p.id === 'cancela-entrada' || p.id === 'cancela-saida') {
                      y_cota_inicial = cy - metadeLargura * zoom - 15;
                    } else if (p.id.includes('siap03') || p.id.includes('siap07')) {
                      y_cota_inicial = cy - metadeLargura * zoom - 45;
                    } else if (p.id.includes('siap02') || p.id.includes('siap06')) {
                      y_cota_inicial = cy - metadeLargura * zoom - 75;
                    } else if (p.id.includes('siap01') || p.id.includes('siap05')) {
                      y_cota_inicial = cy - metadeLargura * zoom - 105;
                    } else if (p.id.includes('siap04') || p.id.includes('siap08')) {
                      y_cota_inicial = cy + metadeLargura * zoom + 35; // trilha inferior
                    }

                    const dragChave = `cota-x-${p.id}`;
                    const drag = offsetsArrasto[`${dragChave}-p3`] || { dx: 0, dy: 0 };
                    const y_cota = y_cota_inicial + drag.dy;

                    const xMin = Math.min(px, x_cabeceira);
                    const xMax = Math.max(px, x_cabeceira);
                    const larguraPixels = Math.abs(xMin - xMax);
                    const isPequena = larguraPixels < 55;
                    const xCentro = (xMin + xMax) / 2;

                    return (
                      <g 
                        key={`cota-afast-x-${p.id}`}
                        onMouseDown={(e) => iniciarArrasto(dragChave, 3, e)}
                        style={{ cursor: 'grab', pointerEvents: 'auto' }}
                      >
                        {/* Linhas de extensão verticais cinzas */}
                        <line x1={px} y1={py} x2={px} y2={y_cota} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2,2" />
                        <line x1={x_cabeceira} y1={py} x2={x_cabeceira} y2={y_cota} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2,2" />
                        
                        {/* Linha de cota principal vermelha (interrompida se for grande, contínua se for pequena) */}
                        {isPequena ? (
                          <line x1={xMin} y1={y_cota} x2={xMax} y2={y_cota} stroke="#dc2626" strokeWidth="1.2" />
                        ) : (
                          <>
                            <line x1={xMin} y1={y_cota} x2={xCentro - 22} y2={y_cota} stroke="#dc2626" strokeWidth="1.2" />
                            <line x1={xCentro + 22} y1={y_cota} x2={xMax} y2={y_cota} stroke="#dc2626" strokeWidth="1.2" />
                          </>
                        )}
                        
                        {/* Linhas perpendiculares verticais nas extremidades */}
                        <line x1={xMin} y1={y_cota - 6} x2={xMin} y2={y_cota + 6} stroke="#dc2626" strokeWidth="1.2" />
                        <line x1={xMax} y1={y_cota - 6} x2={xMax} y2={y_cota + 6} stroke="#dc2626" strokeWidth="1.2" />

                        {/* Ticks oblíquos a 45 graus nas pontas */}
                        <line x1={xMin - 4} y1={y_cota + 4} x2={xMin + 4} y2={y_cota - 4} stroke="#dc2626" strokeWidth="1.5" />
                        <line x1={xMax - 4} y1={y_cota + 4} x2={xMax + 4} y2={y_cota - 4} stroke="#dc2626" strokeWidth="1.5" />
                        
                        {/* Retângulo de máscara atrás do texto com bordas arredondadas e opacidade */}
                        <rect 
                          x={xCentro - 20} 
                          y={isPequena ? y_cota - 16 : y_cota - 6} 
                          width="40" 
                          height="12" 
                          fill="#ffffff" 
                          rx="3" 
                          ry="3" 
                        />
                        {/* Valor da cota */}
                        <text 
                          x={xCentro} 
                          y={isPequena ? y_cota - 7 : y_cota + 3} 
                          fill="#dc2626" 
                          fontSize="9px" 
                          fontWeight="bold" 
                          textAnchor="middle"
                        >
                          {distFisicaX.toFixed(2).replace('.', ',')} m
                        </text>
                      </g>
                    );
                  }

                  return null;
                })}

                {/* 2. COTA VERTICAL (Z) - AFASTAMENTO LATERAIS */}
                {pecas.map(p => {
                  if (!p.id.startsWith('poste-siap') && p.id !== 'cancela-entrada' && p.id !== 'cancela-saida') return null;

                  const px = cx + p.posicao[0] * zoom;
                  const py = cy + p.posicao[2] * zoom;

                  const isCabeceiraA = p.posicao[0] < 0;
                  const isTop = p.posicao[2] < 0;
                  const z_balanca = isTop 
                    ? cy - metadeLargura * zoom 
                    : cy + metadeLargura * zoom;

                  // Afastamento físico em metros
                  const distFisicaZ = Math.abs(p.posicao[2] - (isTop ? -metadeLargura : metadeLargura));
                  
                  if (distFisicaZ > 0.05) {
                    // Desloca a cota vertical um pouco para o lado do poste para não cruzar com ele
                    const offsetCotaX_inicial = isCabeceiraA ? -22 : 22;
                    const dragChave = `cota-z-${p.id}`;
                    const drag = offsetsArrasto[`${dragChave}-p3`] || { dx: 0, dy: 0 };
                    const x_cota = px + offsetCotaX_inicial + drag.dx;
                    
                    const yMin = Math.min(py, z_balanca);
                    const yMax = Math.max(py, z_balanca);

                    return (
                      <g 
                        key={`cota-afast-z-${p.id}`}
                        onMouseDown={(e) => iniciarArrasto(dragChave, 3, e)}
                        style={{ cursor: 'grab', pointerEvents: 'auto' }}
                      >
                        {/* Linhas de extensão horizontais cinzas */}
                        <line x1={px} y1={py} x2={x_cota} y2={py} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2,2" />
                        <line x1={px} y1={z_balanca} x2={x_cota} y2={z_balanca} stroke="#cbd5e1" strokeWidth="0.8" strokeDasharray="2,2" />
                        
                        {/* Linha de cota principal vertical */}
                        <line x1={x_cota} y1={yMin} x2={x_cota} y2={yMax} stroke="#dc2626" strokeWidth="1.2" />
                        
                        {/* Linhas perpendiculares horizontais nas extremidades */}
                        <line x1={x_cota - 6} y1={yMin} x2={x_cota + 6} y2={yMin} stroke="#dc2626" strokeWidth="1.2" />
                        <line x1={x_cota - 6} y1={yMax} x2={x_cota + 6} y2={yMax} stroke="#dc2626" strokeWidth="1.2" />

                        {/* Ticks oblíquos a 45 graus */}
                        <line x1={x_cota - 4} y1={yMin + 4} x2={x_cota + 4} y2={yMin - 4} stroke="#dc2626" strokeWidth="1.5" />
                        <line x1={x_cota - 4} y1={yMax + 4} x2={x_cota + 4} y2={yMax - 4} stroke="#dc2626" strokeWidth="1.5" />
                        
                        {/* Retângulo de máscara atrás do texto com bordas arredondadas e opacidade */}
                        <rect 
                          x={x_cota + (isCabeceiraA ? -44 : 4)} 
                          y={(yMin + yMax) / 2 - 6} 
                          width="40" 
                          height="12" 
                          fill="#ffffff" 
                          rx="3" 
                          ry="3" 
                        />
                        {/* Texto com a medida lateral */}
                        <text 
                          x={x_cota + (isCabeceiraA ? -4 : 6)} 
                          y={(yMin + yMax) / 2 + 3} 
                          fill="#dc2626" 
                          fontSize="9px" 
                          fontWeight="bold" 
                          textAnchor={isCabeceiraA ? "end" : "start"}
                        >
                          {distFisicaZ.toFixed(2).replace('.', ',')} m
                        </text>
                      </g>
                    );
                  }

                  return null;
                })}
              </svg>
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
          <div className="rodape-tecnico">
            <div className="notas-rodape" style={{ display: 'flex', gap: '20px', width: '70%' }}>
              <div style={{ flex: 1.2 }}>
                <strong>NOTAS DE PROJETO (COTAS DE AFASTAMENTO):</strong>
                <ol style={{ paddingLeft: '14px', marginTop: '4px', fontSize: '8px', lineHeight: '1.3' }}>
                  <li>As dimensões e cotas de afastamento apresentadas no desenho estão expressas em metros (m).</li>
                  <li><strong>Referência das Cotas Longitudinais (X):</strong> Medidas partem da respectiva <strong>cabeceira (borda extrema de entrada/saída) da plataforma da balança</strong> até o <strong>centro do poste</strong> (ou centro da base da cancela).</li>
                  <li><strong>Referência das Cotas Transversais (Z):</strong> Medidas partem da <strong>borda lateral da plataforma metálica/concreto da balança</strong> até o <strong>centro do poste</strong> (ou centro da base da cancela).</li>
                  <li><strong>Posicionamento e Ajustes:</strong> Todos os posicionamentos e afastamentos sugeridos neste projeto são orientativos e podem ser ligeiramente ajustados em campo conforme as características físicas locais.</li>
                  <li>A fiação e infraestrutura subterrânea de eletrodutos é de inteira responsabilidade do cliente.</li>
                </ol>
              </div>
              <div style={{ 
                flex: 1.8, 
                background: '#f8fafc', 
                border: '1px solid #e2e8f0', 
                borderRadius: '4px', 
                padding: '6px 10px', 
                fontSize: '7.5px', 
                lineHeight: '1.2',
                color: '#475569'
              }}>
                <strong style={{ color: '#b91c1c', display: 'block', marginBottom: '2px' }}>AVISO IMPORTANTE / PROJETO ORIENTATIVO</strong>
                Este documento apresenta um dimensionamento técnico orientativo para infraestrutura de automação de balança rodoviária. As posições, bases, fundações, eletrodutos, alimentação elétrica, aterramento e demais elementos civis/elétricos devem ser validados em campo e, quando aplicável, por responsável técnico habilitado. Este documento não substitui projeto executivo civil, estrutural, elétrico, SPDA, aterramento ou ART específica da obra.
              </div>
            </div>
            
            <SeloPagina
              config={config}
              tituloPlanta="AFASTAMENTO DOS EQUIPAMENTOS"
              revisao={config.revisao}
              paginaNum={CAPA_ENTRA_NA_CONTAGEM ? 3 : 2}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )}

      {/* PÁGINA 4: DETALHAMENTO DO POSTE E QUANTITATIVOS */}
      {(isPrinting || paginaAtiva === 4) && (
        <div className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          <div className="titulo-planta-pagina">
            DETALHE DE FIXAÇÃO DOS POSTES
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
            <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none', display: 'flex', gap: '20px', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', padding: '10px 0', flex: 'none' }}>
              
              {/* COLUNA 1: DESENHO DO TUBO (ESQUERDA) */}
              <div className="subcontainer-tabela" style={{ flex: 0.55, display: 'flex', flexDirection: 'column', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '12px', height: '530px' }}>
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/Poste Frontal.png" alt="Poste Frontal" style={{ height: '100%', width: '100%', objectFit: 'contain' }} />
                </div>
              </div>

              {/* COLUNA 2: DETALHES DE FIXAÇÃO E SAPATA (MEIO) */}
              <div className="subcontainer-tabela" style={{ flex: 1.6, display: 'flex', flexDirection: 'column', gap: '10px', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '12px', height: '530px' }}>
                <h3 style={{ fontSize: '11px', color: '#1e293b', margin: '0 0 5px 0', borderBottom: '2px solid #1a7a4a', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                  Detalhe de Fixação (A) e Sapata Construtiva
                </h3>

                {/* Sub-layout com Detalhe A (esquerda) e Sapata Planta (direita) */}
                <div style={{ display: 'flex', flexDirection: 'row', gap: '15px', flex: 1, alignItems: 'stretch', justifyContent: 'center', overflow: 'hidden' }}>
                  
                  {/* Detalhe A (Elevação de Fixação) */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>DETALHE "A" - FIXAÇÃO DO POSTE</span>
                    <img src="/Chumbamento.png" alt="Detalhe A" style={{ maxHeight: '310px', maxWidth: '100%', objectFit: 'contain' }} />
                  </div>

                  {/* Sapata / Pilar (Planta Superior) */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#475569', marginBottom: '5px' }}>VISTA SUPERIOR DA SAPATA</span>
                    <img src="/Visão dos reforços.png" alt="Vista Superior da Sapata" style={{ maxHeight: '310px', maxWidth: '100%', objectFit: 'contain' }} />
                    <span style={{ fontSize: '8.5px', color: '#0284c7', marginTop: '6px', textAlign: 'center', fontStyle: 'italic', fontWeight: '600' }}>
                      * A parte em azul representa a base de alvenaria para o poste
                    </span>
                  </div>

                </div>

                {/* Legendas/Anotações na base da coluna central */}
                <div style={{ fontSize: '7.5px', color: '#dc2626', lineHeight: '1.2', borderLeft: '2px solid #dc2626', paddingLeft: '6px', fontStyle: 'italic', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span>* A representação gráfica do diâmetro do poste e sapata é meramente ilustrativa e fora de escala.</span>
                  <span>* Dimensão mínima da base/pilar de concreto: 350x350 mm (FCK mínimo: 25 MPa).</span>
                  <span>* É obrigatório o perfeito nivelamento da base e a proteção física dos cabos na saída do poste.</span>
                  <span>* Ancoragem sugerida: chumbadores de 3/8" (conforme projeto) ou tipo de fixação recomendada pelo fabricante.</span>
                </div>
              </div>

              {/* COLUNA 3: QUANTITATIVOS, TORQUE E NOTAS (DIREITA) */}
              <div style={{ flex: 1.05, display: 'flex', flexDirection: 'column', gap: '10px', height: '530px' }}>
                
                {/* 3.1: Quantitativo de Postes Ativos */}
                <div className="subcontainer-tabela" style={{ flex: 1, backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '11px', color: '#1e293b', margin: '0 0 5px 0', borderBottom: '2px solid #1e3a8a', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>QUANTITATIVO DE POSTES</span>
                    <span style={{ fontSize: '9px', backgroundColor: '#dbeafe', color: '#1e40af', padding: '2px 6px', borderRadius: '10px' }}>
                      Total: {quantitativoPostes.reduce((acc, p) => acc + p.quantidade, 0)} un.
                    </span>
                  </h3>
                  <table className="tabela-fiacao" style={{ fontSize: '9px', marginTop: '4px', flex: 1 }}>
                    <thead>
                      <tr style={{ height: '26px' }}>
                        <th style={{ padding: '4px 6px', fontSize: '8.5px', backgroundColor: '#1e3a8a', borderColor: '#172554' }}>Modelo</th>
                        <th style={{ padding: '4px 6px', fontSize: '8.5px', backgroundColor: '#1e3a8a', borderColor: '#172554' }}>Altura</th>
                        <th style={{ padding: '4px 6px', fontSize: '8.5px', backgroundColor: '#1e3a8a', borderColor: '#172554', textAlign: 'center' }}>Qtd.</th>
                        <th style={{ padding: '4px 6px', fontSize: '8.5px', backgroundColor: '#1e3a8a', borderColor: '#172554' }}>Locais</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quantitativoPostes.map((p, idx) => {
                        const ativo = p.quantidade > 0;
                        return (
                          <tr key={idx} style={{ backgroundColor: ativo ? '#eff6ff' : 'transparent', fontWeight: ativo ? 'bold' : 'normal', height: '24px' }}>
                            <td style={{ padding: '4px 6px', color: ativo ? '#1e40af' : '#64748b' }}>{p.descricao}</td>
                            <td style={{ padding: '4px 6px', color: ativo ? '#1e40af' : '#64748b' }}>{p.tamanho}</td>
                            <td style={{ padding: '4px 6px', textAlign: 'center', color: ativo ? '#1e40af' : '#64748b', fontSize: '10.5px' }}>
                              {ativo ? `${p.quantidade} un.` : '0 un.'}
                            </td>
                            <td style={{ padding: '4px 6px', fontSize: '8px', color: ativo ? '#3b82f6' : '#94a3b8' }}>
                              {ativo ? p.aplicacao : 'Nenhum'}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {/* 3.2: Tabela de Torques Recomendados */}
                <div className="subcontainer-tabela" style={{ flex: 1.3, backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '10px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={{ fontSize: '11px', color: '#1e293b', margin: '0 0 5px 0', borderBottom: '2px solid #8b1a1a', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                    TORQUE RECOMENDADO PARA CONCRETO
                  </h3>
                  <table className="tabela-fiacao" style={{ fontSize: '8.5px', marginTop: '4px', flex: 1 }}>
                    <thead>
                      <tr style={{ height: '20px' }}>
                        <th style={{ padding: '3px 6px', fontSize: '8px', backgroundColor: '#8b1a1a' }}>DIÂMETRO</th>
                        <th style={{ padding: '3px 6px', fontSize: '8px', backgroundColor: '#8b1a1a', textAlign: 'center' }}>TORQUE (N.m)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ height: '20px' }}>
                        <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>3/16"</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>5 MAX</td>
                      </tr>
                      <tr style={{ height: '20px' }}>
                        <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>1/4"</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>10 - 15</td>
                      </tr>
                      <tr style={{ height: '20px' }}>
                        <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>5/16"</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>20 - 35</td>
                      </tr>
                      <tr style={{ height: '20px' }}>
                        <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>3/8" (Padrão)</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 'bold', color: '#b91c1c', backgroundColor: '#fef2f2' }}>35 - 50</td>
                      </tr>
                      <tr style={{ height: '20px' }}>
                        <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>1/2"</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>50 - 75</td>
                      </tr>
                      <tr style={{ height: '20px' }}>
                        <td style={{ padding: '3px 6px', fontWeight: 'bold' }}>5/8"</td>
                        <td style={{ padding: '3px 6px', textAlign: 'center', fontWeight: 'bold' }}>75 - 100</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ marginTop: '5px', fontSize: '7.5px', color: '#64748b', fontStyle: 'italic', lineHeight: '1.2' }}>
                    * Valores referenciais. A especificação técnica e a recomendação de torque do fabricante do chumbador utilizado prevalecem sempre sobre esta tabela.
                  </div>
                </div>

              </div>
            </div>

            {/* Aviso de Nível de Instalação do Poste */}
            <div style={{ display: 'flex' }}>
              <div style={{
                backgroundColor: '#fffbeb',
                border: '1.5px solid #d97706',
                borderRadius: '6px',
                padding: '10px 15px',
                margin: '0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
              }}>
                <span style={{ fontSize: '9.5px', color: '#78350f', fontWeight: 'bold', lineHeight: '1.4' }}>
                  <strong>AVISO IMPORTANTE DE MONTAGEM:</strong> O poste deve ser instalado no nível da pista da balança. Caso necessário, fazer pilares para elevação do poste ou utilizar postes maiores para compensar o desnível entre as laterais da balança e a pista da balança.
                </span>
              </div>
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
          <div className="rodape-tecnico">
            <div className="notas-rodape" style={{ width: '58%' }}>
              <strong>NOTAS DE PROJETO (FIXAÇÃO DE POSTES):</strong>
              <ol style={{ paddingLeft: '14px', marginTop: '3px', fontSize: '8px', lineHeight: '1.25' }}>
                <li>A representação gráfica 3D e desenhos de fixação são meramente ilustrativos, indicativos e fora de escala para auxílio de montagem.</li>
                <li>A dimensão mínima sugerida para a base/pilar de concreto é de 350x350 mm com concreto de classe de resistência FCK mínimo de 25 MPa.</li>
                <li>Todas as dimensões físicas, profundidade da fundação/sapata, armaduras e chumbadores devem ser calculadas e validadas por responsável técnico habilitado (engenheiro civil/calculista) da obra.</li>
                <li>O tipo de chumbador sugerido é de fixação química ou mecânica expansiva robusta (p. ex., barras roscadas de 3/8" de diâmetro ou conforme projeto civil).</li>
                <li>A base de concreto deve estar perfeitamente nivelada, plana e no nível da pista da balança para assegurar a estabilidade e a correta operação dos sensores.</li>
                <li>Os cabos elétricos devem ser protegidos mecanicamente na saída do poste, garantindo vedação adequada contra intempéries e direcionamento a eletroduto subterrâneo ou caixa de passagem.</li>
                <li>A tabela de torques recomendados é meramente referencial. Prevalece estritamente a especificação técnica e recomendação de torque do fabricante do chumbador utilizado na instalação.</li>
              </ol>
            </div>
            
            <SeloPagina
              config={config}
              tituloPlanta="DETALHE DE FIXAÇÃO DOS POSTES"
              revisao={config.revisao}
              paginaNum={CAPA_ENTRA_NA_CONTAGEM ? 4 : 3}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )}


      {/* PÁGINAS DE DETALHE INDIVIDUAL DE CADA POSTE E CANCELA ATIVOS */}
      {itensDetalhe.map((item, idx) => {
        const numPag = 5 + idx
        if (!isPrinting && paginaAtiva !== numPag) return null

        return (
          <div key={item.id} className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          <div className="titulo-planta-pagina">
            {item.titulo}
          </div>

          <div className="conteudo-tecnico-poste-detalhe-novo">
            {/* SEÇÃO SUPERIOR: Canvas (Esquerda) e Especificações do Poste/Cancela (Direita) */}
            <div className="secao-superior-detalhe">
              
              {/* Lado Esquerdo: Bloco de Visualização 3D */}
              <div className="bloco-visualizacao-3d">
                <div className="container-canvas-poste-detalhe-clean">
                  <div className="canvas-poste-3d-clean">
                    <PosteDetalheCanvas
                      tipoPeca={item.tipoPeca}
                      altura={item.altura}
                      perifericos={item.perifericos}
                      calibracoes={calibracoes}
                      modelosDisponiveis={modelosDisponiveis}
                      idItem={item.id}
                      rotacaoInicial={(config.rotacoes3D || {})[item.id] || 0}
                      onRotationChange={(theta) => handleRotationChange(item.id, theta)}
                      distanciaCamera={item.tipo === 'painel' ? 2.5 : undefined}
                    />
                  </div>
                </div>
                <div className="legenda-3d">
                  Clique e arraste para rotacionar horizontalmente
                </div>
              </div>

              {/* Lado Direito: Especificações Estruturais do Poste/Cancela */}
              <div className="bloco-especificacao-direita">
                <h3 className="titulo-secao-espec">
                  Especificações da Estrutura
                </h3>
                
                <div className="tabela-espec-estrutura">
                  <div className="linha-espec">
                    <span className="rotulo-espec">Identificação:</span>
                    <span className="valor-espec destaque">{item.nomeNoSelo}</span>
                  </div>
                  <div className="linha-espec">
                    <span className="rotulo-espec">Tipo de Equipamento:</span>
                    <span className="valor-espec">
                      {item.tipo === 'painel'
                        ? (item.tipoPeca === 'painel-automacao' ? 'Painel de Automação (Central de Comando)' : 'Painel de Som (Amplificação de Áudio)')
                        : item.tipo === 'cancela' ? 'Cancela Automática de Acesso' : 'Poste Metálico de Suporte'}
                    </span>
                  </div>
                  <div className="linha-espec">
                    <span className="rotulo-espec">Altura da Estrutura:</span>
                    <span className="valor-espec">{item.altura.toFixed(2).replace('.', ',')} m</span>
                  </div>
                  {item.tipo === 'poste' && item.diametro && (
                    <div className="linha-espec">
                      <span className="rotulo-espec">Diâmetro Nominal:</span>
                      <span className="valor-espec">{item.diametro.split(' - ')[0]}</span>
                    </div>
                  )}
                  {item.tipo === 'poste' && item.diametro && (
                    <div className="linha-espec">
                      <span className="rotulo-espec">Especificação do Tubo:</span>
                      <span className="valor-espec">{item.diametro.split(' - ')[1] || 'SCH 40'}</span>
                    </div>
                  )}
                  <div className="linha-espec">
                    <span className="rotulo-espec">Acabamento / Material:</span>
                    <span className="valor-espec">
                      {item.tipo === 'painel'
                        ? 'Gabinete/quadro metálico com tratamento anticorrosivo e pintura eletrostática.'
                        : item.tipo === 'cancela'
                        ? 'Gabinete em aço galvanizado com tratamento anticorrosivo e pintura eletrostática, conforme especificação do fabricante.'
                        : 'Aço Carbono Galvanizado a Fogo (NBR 6323) com pintura eletrostática'}
                    </span>
                  </div>
                  <div className="linha-espec">
                    <span className="rotulo-espec">Instalação / Fixação:</span>
                    <span className="valor-espec">
                      {item.tipo === 'painel'
                        ? 'Fixação em parede/estrutura da central de comando'
                        : item.tipo === 'cancela'
                        ? 'Base de concreto nivelada com parafusos de fixação'
                        : 'Chapa de base soldada flangeada com chumbadores'}
                    </span>
                  </div>
                  <div className="linha-espec">
                    <span className="rotulo-espec">Infraestrutura interna:</span>
                    <span className="valor-espec">
                      {item.tipo === 'painel'
                        ? 'Bornes/réguas de ligação e eletrodutos de entrada para os cabos'
                        : item.tipo === 'cancela'
                        ? 'Eletrodutos na base para passagem de cabos'
                        : 'Passagem interna de cabos com saída em cada local'}
                    </span>
                  </div>
                </div>

                <div className="bloco-resumo-perifericos">
                  <div className="titulo-resumo-perif">
                    Resumo de Dispositivos Instalados
                  </div>
                  {item.perifericos.length === 0 ? (
                    <div className="sem-perif-msg">
                      Nenhum equipamento adicional instalado nesta estrutura.
                    </div>
                  ) : (
                    <div className="tags-perif-resumo">
                      {obterPerifericosAgrupados(item.perifericos, item.id.replace('poste-', '')).map((agrupado, aIdx) => (
                        <span key={aIdx} className="tag-perif">
                          <strong>{agrupado.quantidade}x</strong> {agrupado.nome}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* SEÇÃO INFERIOR: Balõezinhos/Cards dos Equipamentos Instalados */}
            <div className="secao-inferior-detalhe">
              <h3 className="titulo-secao-equipamentos">
                Equipamentos Instalados e Cabeamento Recomendado
              </h3>
              
              {item.perifericos.length === 0 && item.tipo !== 'cancela' && item.tipo !== 'painel' ? (
                <div className="cards-vazios-container">
                  <div className="card-periferico-vazio">
                    Nenhum periférico instalado neste ponto. A infraestrutura básica consiste em passagem subterrânea para posterior expansão, se necessário.
                  </div>
                </div>
              ) : (
                <div className="cards-perifericos-inferior">
                  {/* Se for painel central, mostra a alimentação e os cabos que chegam até ele */}
                  {item.tipo === 'painel' && (() => {
                    const ehSiamac = item.tipoPeca === 'painel-automacao'
                    const destinoNome = ehSiamac ? 'Painel SIAMAC' : 'Painel de Som'
                    const nomePainel = CATALOGO[item.tipoPeca]?.nome || item.nomeNoSelo
                    const cabosChegando = itensFiacao.filter(f => f.destino === destinoNome)
                    const alimentacao = itensFiacao.find(f => f.equipamento === nomePainel && f.destino === 'Quadro de Distribuição')
                    const rede = itensFiacao.find(f => f.equipamento === nomePainel && f.destino === 'Roteador PoE')
                    return (
                      <>
                        <div className="card-periferico-detalhe cor-vinho">
                          <div className="card-header-perif">
                            <span className="nome-perif">Alimentação e Rede do Painel</span>
                          </div>
                          <div className="card-body-perif">
                            <div className="corpo-item">
                              <strong className="etiqueta">Alimentação elétrica:</strong>
                              <span>Cabo de cobre flexível 0,6/1 kV, 3G2,5 mm², com condutores internos de cores distintas, incluindo condutor de proteção, adequado para instalação em eletroduto subterrâneo/externo (destino: Quadro de Distribuição{alimentacao ? ` — aprox. ${alimentacao.comprimento} m` : ''}). Obs: Alimentação 220 V (F+N+PE ou 2F+PE).</span>
                            </div>
                            <div className="corpo-item">
                              <strong className="etiqueta">Rede:</strong>
                              <span>Cabo de rede CAT6 blindado ou superior, cobre puro, compatível com tráfego de dados e PoE (destino: Roteador PoE{rede ? ` — aprox. ${rede.comprimento} m` : ''}).</span>
                            </div>
                            <div className="corpo-item">
                              <strong className="etiqueta">Função:</strong>
                              <span>{ehSiamac
                                ? 'Central de automação SIAMAC — concentra os sinais de comando e dos sensores do sistema de pesagem.'
                                : 'Painel de som — concentra e amplifica os sinais de áudio das caixas de som.'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="card-periferico-detalhe cor-azul">
                          <div className="card-header-perif">
                            <span className="nome-perif">Cabos que chegam a este painel</span>
                          </div>
                          <div className="card-body-perif">
                            {cabosChegando.length === 0 ? (
                              <div className="corpo-item">
                                <span>Nenhum cabo de periférico direcionado a este painel na configuração atual.</span>
                              </div>
                            ) : (
                              cabosChegando.map((c, ci) => (
                                <div className="corpo-item" key={ci}>
                                  <strong className="etiqueta">{c.equipamento}{c.local ? ` (${c.local})` : ''}:</strong>
                                  <span>{c.cabo.split(' (')[0]} — aprox. {c.comprimento} m</span>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </>
                    )
                  })()}

                  {/* Se for cancela, renderiza um card padrão para ela mesma */}
                  {item.tipo === 'cancela' && (
                    <div className="card-periferico-detalhe cor-vinho">
                      <div className="card-header-perif">
                        <span className="nome-perif">Mecanismo da Cancela</span>
                      </div>
                      <div className="card-body-perif">
                        <div className="corpo-item">
                          <strong className="etiqueta">Alimentação elétrica:</strong>
                          <span>Cabo de cobre flexível 0,6/1 kV, 3G2,5 mm², com condutores internos de cores distintas, incluindo condutor de proteção, adequado para instalação em eletroduto subterrâneo/externo (destino: Quadro de Distribuição). Obs: Alimentação 220 V (F+N+PE ou 2F+PE).</span>
                        </div>
                        <div className="corpo-item">
                          <strong className="etiqueta">Comando/Sinalização:</strong>
                          <span>Cabo PP flexível de cobre, blindado, 4x1,5 mm², com condutores internos de cores distintas, destinado a comando/sinal (destino: Painel SIAMAC).</span>
                        </div>
                        <div className="corpo-item">
                          <strong className="etiqueta">Funcionamento:</strong>
                          <span>Braço articulado com acionamento motorizado controlado pelo painel.</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card de Alerta/Observação da Base de Concreto da Cancela */}
                  {item.tipo === 'cancela' && (
                    <div className="card-periferico-detalhe cor-alerta-base">
                      <div className="card-header-perif">
                        <span className="nome-perif">ATENÇÃO: Requisito de Base Civil</span>
                      </div>
                      <div className="card-body-perif">
                        <div className="corpo-item">
                          <strong className="etiqueta">Dimensões da Base:</strong>
                          <span>É necessário confeccionar uma base de concreto de 42 x 42 cm.</span>
                        </div>
                        <div className="corpo-item">
                          <strong className="etiqueta">Altura da Base:</strong>
                          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#dc2626' }}>
                            20 cm ACIMA do nível da pista da BALANÇA RODOVIÁRIA.
                          </span>
                        </div>
                        <div className="corpo-item">
                          <strong className="etiqueta">IMPORTANTE:</strong>
                          <span style={{ color: '#b91c1c', fontStyle: 'italic', fontWeight: 'bold', lineHeight: '1.3' }}>
                            A altura de 20 cm refere-se estritamente à diferença em relação à PISTA DA BALANÇA RODOVIÁRIA, e não em relação ao solo onde a cancela será instalada.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Renderiza um card para cada periférico do poste */}
                  {item.perifericos.map((perif, pIdx) => {
                    const tipoCatalogo = CATALOGO[perif.tipo];
                    let nomeEquipamento = tipoCatalogo?.nome || 'Equipamento';
                    
                    if (item.id === 'poste-siap09') {
                      if (perif.id === 'camera-siap09-ampla' || perif.tipo === 'camera-ip') {
                        nomeEquipamento = 'Câmera Superior 01 - Visão geral da plataforma'
                      } else if (perif.id === 'camera-siap09-auditoria' || perif.tipo === 'camera-ip-baixo') {
                        nomeEquipamento = 'Câmera Superior 02 - Visão complementar / auditoria superior'
                      }
                    }
                    
                    let listaCabos: Array<{ rotulo: string; espec: string; destino: string }> = [];
                    let textoFuncao = '';
                    let icone = '';

                    if (perif.tipo === 'semaforo') {
                      listaCabos = [{
                        rotulo: 'Sinal',
                        espec: ESPEC_CABO_SEMAFORO_25,
                        destino: 'Painel SIAMAC'
                      }];
                      textoFuncao = 'Sinalização visual de parada/liberação do fluxo de veículos sobre a balança rodoviária.';
                      icone = '';
                    } else if (perif.tipo === 'camera-ip') {
                      listaCabos = [{
                        rotulo: 'Rede',
                        espec: ESPEC_CABO_REDE_CAT6,
                        destino: 'Roteador PoE'
                      }];
                      textoFuncao = item.id === 'poste-siap09'
                        ? 'Captura de imagens em alta resolução para visão geral de toda a plataforma de pesagem, permitindo o monitoramento amplo do veículo e da carga.'
                        : 'Captura de imagens em alta resolução do veículo posicionado na pista (frontal/lateral) para registro e auditoria.';
                      icone = '';
                    } else if (perif.tipo === 'camera-ocr') {
                      listaCabos = [{
                        rotulo: 'Rede',
                        espec: ESPEC_CABO_REDE_CAT6,
                        destino: 'Roteador PoE'
                      }];
                      textoFuncao = 'Câmera de leitura de placas veiculares (LPR/OCR) para identificação automática do veículo associado à pesagem.';
                      icone = '';
                    } else if (perif.tipo === 'leitor-rfid') {
                      listaCabos = [
                        {
                          rotulo: 'Rede',
                          espec: ESPEC_CABO_REDE_CAT6,
                          destino: 'Roteador PoE'
                        },
                        {
                          rotulo: 'Alimentação',
                          espec: ESPEC_CABO_ALIMENTACAO_25,
                          destino: 'Quadro de Distribuição'
                        }
                      ];
                      textoFuncao = 'Leitor de identificação por radiofrequência (RFID) de longo alcance para leitura automatizada de tags de identificação veicular.';
                      icone = '';
                    } else if (perif.tipo === 'sensor-emissor') {
                      listaCabos = [{
                        rotulo: 'Sinal',
                        espec: ESPEC_CABO_COMANDO_15,
                        destino: 'Painel SIAMAC'
                      }];
                      textoFuncao = 'Detecção de presença e validação do posicionamento físico do veículo sobre a plataforma de pesagem.';
                      icone = '';
                    } else if (perif.tipo === 'sensor-receptor') {
                      listaCabos = [{
                        rotulo: 'Sinal',
                        espec: ESPEC_CABO_COMANDO_15,
                        destino: 'Painel SIAMAC'
                      }];
                      textoFuncao = 'Detecção de presença e validação do posicionamento físico do veículo sobre a plataforma de pesagem.';
                      icone = '';
                    } else if (perif.tipo === 'camera-ip-baixo') {
                      listaCabos = [{
                        rotulo: 'Rede',
                        espec: ESPEC_CABO_REDE_CAT6,
                        destino: 'Roteador PoE'
                      }];
                      textoFuncao = item.id === 'poste-siap09'
                        ? 'Captura de imagens superiores do veículo para visão complementar e auditoria superior da carga durante a pesagem.'
                        : 'Captura de imagens superiores do veículo (carga) para fins de auditoria, segurança e monitoração ampla da plataforma de pesagem.';
                      icone = '';
                    } else if (perif.tipo === 'display-mensagens') {
                      listaCabos = [
                        {
                          rotulo: 'Rede',
                          espec: ESPEC_CABO_REDE_CAT6,
                          destino: 'Roteador PoE'
                        },
                        {
                          rotulo: 'Alimentação',
                          espec: ESPEC_CABO_ALIMENTACAO_25,
                          destino: 'Quadro de Distribuição'
                        }
                      ];
                      textoFuncao = 'Painel de LED alfanumérico para exibição do peso registrado, mensagens de instrução e status da pesagem ao motorista.';
                      icone = '';
                    } else if (perif.tipo === 'caixa-de-som') {
                      listaCabos = [{
                        rotulo: 'Sinal',
                        espec: ESPEC_CABO_SOM_25,
                        destino: 'Painel de Som'
                      }];
                      textoFuncao = 'Alto-falante corneta para avisos sonoros e comunicação de voz automatizada com o motorista durante as pesagens.';
                      icone = '';
                    }

                    // Determina a cor com base em um esquema estético de alternância
                    const classesCores = ['cor-vinho', 'cor-verde', 'cor-azul'];
                    const classeCor = classesCores[pIdx % classesCores.length];

                    return (
                      <div key={perif.id} className={`card-periferico-detalhe ${classeCor}`}>
                        <div className="card-header-perif">
                          {icone && <span className="icon-perif">{icone}</span>}
                          <span className="nome-perif">{nomeEquipamento}</span>
                        </div>
                        <div className="card-body-perif">
                          {listaCabos.map((cabo, cIdx) => (
                            <div key={cIdx} className="corpo-item">
                              <strong className="etiqueta">{cabo.rotulo}:</strong>
                              <span>{cabo.espec} (destino: {cabo.destino})</span>
                            </div>
                          ))}
                          <div className="corpo-item">
                            <strong className="etiqueta">Altura instalada:</strong>
                            <span>{perif.altura.toFixed(2).replace('.', ',')} m de altura</span>
                          </div>
                          <div className="corpo-item">
                            <strong className="etiqueta">Função no sistema:</strong>
                            <span>{textoFuncao}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
          <div className="rodape-tecnico">
            <div className="notas-rodape">
              <strong>NOTAS DE INSTALAÇÃO:</strong>
              {item.tipo === 'cancela' ? (
                <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                  <li>Instalar a cancela com recuo seguro em relação à borda da plataforma de pesagem, evitando interferência com o tráfego de caminhões e veículos leves.</li>
                  <li>Executar base de concreto de 42 x 42 cm, com altura de 20 cm acima do nível da pista da balança rodoviária.</li>
                  <li>Garantir nivelamento da base, cura adequada do concreto e fixação com chumbadores compatíveis com o equipamento.</li>
                  <li>Prever eletrodutos independentes para alimentação elétrica e comando/sinal.</li>
                  <li>Alinhar o braço da cancela de forma que fique paralelo ao fluxo quando aberto e perpendicular ao fluxo quando fechado.</li>
                  <li>Validar o sentido de abertura do braço em campo antes da fixação final.</li>
                </ol>
              ) : (
                <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                  <li>A fundação deve ser executada em concreto com FCK mínimo de 25 MPa, com dimensões, profundidade, armadura e chumbadores validados por responsável técnico da obra.</li>
                  <li>O tubo do poste deve ser em aço-carbono SCH 40, galvanizado por imersão a quente conforme ABNT NBR 6323.</li>
                  <li>A passagem dos cabos deve ocorrer preferencialmente pelo interior do poste, com saída protegida para eletroduto subterrâneo ou caixa de passagem.</li>
                  <li>A fixação deve ser feita com chumbadores adequados ao tipo de base e carga solicitante, seguindo recomendação do fabricante dos chumbadores.</li>
                  <li>O aterramento do poste é obrigatório e deve ser integrado ao sistema de aterramento da unidade.</li>
                  <li>Para postes elevados ou sujeitos a vento, validar estabilidade, base, chumbadores e fundação com responsável técnico habilitado.</li>
                </ol>
              )}
            </div>
            
            <SeloPagina
              config={config}
              tituloPlanta={item.nomeNoSelo}
              revisao={config.revisao}
              paginaNum={item.paginaNum || (CAPA_ENTRA_NA_CONTAGEM ? 5 : 4)}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )
    })}

      {/* PÁGINA 4 (RENUMERADA): EQUIPAMENTOS DOS POSTES (VISÃO GERAL) */}
      {(isPrinting || paginaAtiva === (5 + itensDetalhe.length)) && (
        <div className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          {/* Planta Baixa com Cena 3D Ortográfica e Overlay 2D */}
          <div className="titulo-planta-pagina">
            EQUIPAMENTOS DOS POSTES
          </div>

          <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <div 
              className="canvas-container-planta" 
              style={{ 
                position: 'relative', 
                width: `${canvasWidth}px`, 
                height: `${canvasHeight}px`,
                background: '#ffffff',
                margin: '0 auto'
              }}
            >
              <Canvas
                orthographic
                camera={{ 
                  position: [0, 20, 0], 
                  zoom: zoom, 
                  up: [0, 0, -1] 
                }}
                style={{ width: '100%', height: '100%' }}
                gl={{ preserveDrawingBuffer: true }}
                className="canvas-render-3d"
              >
                <color attach="background" args={['#ffffff']} />
                <ambientLight intensity={0.8} />
                <directionalLight position={[0, 30, 0]} intensity={1.0} />
                
                {pecas.map((p) => (
                  <Piece
                    key={`p4-3d-${p.id}`}
                    instancia={p}
                    modeloDisponivel={modelosDisponiveis.has(CATALOGO[p.tipo].modelo)}
                    mostrarRotulos={false}
                  />
                ))}
              </Canvas>

              {/* Overlay SVG para desenhar os traçados técnicos coloridos */}
              <svg 
                style={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  width: '100%', 
                  height: '100%', 
                  pointerEvents: 'none',
                  zIndex: 4
                }}
              >
                {itemsPostesP4.map(ip => {
                  // Linha vertical com dobra 90 graus (caso haja deslocamento horizontal) para o balão detalhado
                  const pathData = `M ${ip.px} ${ip.py} L ${ip.px} ${ip.ancoraYPadrao} L ${ip.labelX} ${ip.ancoraYPadrao} L ${ip.labelX} ${ip.ancoraY}`

                  return (
                    <g key={`svg-g-p4-${ip.id}`}>
                      {/* Linha tracejada ortogonal (90 graus) com cor do respectivo grupo */}
                      <path
                        d={pathData}
                        stroke={ip.cor}
                        strokeWidth="1.2"
                        strokeDasharray="4,4"
                        fill="none"
                      />
                      {/* Alvo técnico no poste */}
                      <circle cx={ip.px} cy={ip.py} r="4" fill={ip.cor} />
                      <circle cx={ip.px} cy={ip.py} r="8" fill="none" stroke={ip.cor} strokeWidth="1" />
                    </g>
                  )
                })}
              </svg>

              {/* Rótulos HTML Absolutos com detalhamento de periféricos */}
              {itemsPostesP4.map(ip => {
                // Busca os periféricos se for um poste (agrupando duplicados)
                let listaAgrupados: Array<{ nome: string; quantidade: number }> = []
                if (ip.id.startsWith('poste-siap')) {
                  const siapNum = ip.id.replace('poste-siap', '')
                  const chave = `perifericosSiap${siapNum}` as keyof ProjectConfig
                  const perifericos = config[chave] as PostePeriferico[] | undefined
                  if (perifericos && perifericos.length > 0) {
                    listaAgrupados = obterPerifericosAgrupados(perifericos, `siap${siapNum}`)
                  }
                }

                return (
                  <div
                    key={`html-label-p4-${ip.id}`}
                    onMouseDown={(e) => iniciarArrasto(ip.id, 4, e)}
                    style={{
                      position: 'absolute',
                      left: `${ip.labelX}px`,
                      top: `${ip.labelY}px`,
                      transform: 'translateX(-50%)',
                      backgroundColor: '#ffffff',
                      border: `1.5px solid ${ip.cor}`,
                      borderRadius: '4px',
                      padding: '5px 8px',
                      fontSize: '9px',
                      fontWeight: 'bold',
                      color: ip.cor,
                      boxShadow: `0 2px 6px ${ip.cor}26`, // 15% opacidade na sombra
                      whiteSpace: 'normal', // Permite quebra de linha interna
                      width: 'max-content',
                      maxWidth: '145px', // Limita a largura para evitar caixas horizontais gigantescas
                      cursor: 'grab',
                      userSelect: 'none',
                      zIndex: 5,
                      lineHeight: '1.3'
                    }}
                  >
                    <div 
                      style={{ 
                        fontSize: '10px', 
                        borderBottom: listaAgrupados.length > 0 ? `1px dashed ${ip.cor}` : 'none', 
                        paddingBottom: listaAgrupados.length > 0 ? '2px' : '0', 
                        marginBottom: listaAgrupados.length > 0 ? '3px' : '0', 
                        textAlign: 'center' 
                      }}
                    >
                      {ip.refPoste}
                    </div>
                    {listaAgrupados.map((item, pIdx) => (
                      <div 
                        key={pIdx} 
                        style={{ 
                          fontWeight: 'normal', 
                          fontSize: '8px', 
                          textAlign: 'left', 
                          display: 'flex', 
                          alignItems: 'flex-start', // alinhar no topo em caso de quebra de linha do periférico
                          gap: '3px',
                          marginTop: '2px',
                          whiteSpace: 'normal'
                        }}
                      >
                        <span style={{ fontSize: '9px', lineHeight: '1' }}>•</span>
                        <span style={{ display: 'inline-block' }}>
                          {item.quantidade > 1 ? (
                            <>
                              <strong>{item.quantidade}</strong> {item.nome}
                            </>
                          ) : (
                            item.nome
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico da Página 4 */}
          <div className="rodape-tecnico">
            <div className="notas-rodape">
              <strong>NOTAS DE PROJETO:</strong>
              <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                <li>As dimensões estão expressas em metros (m).</li>
                <li>O posicionamento sugerido é meramente orientativo e poderá sofrer ajustes de infraestrutura local conforme a obra.</li>
                <li>A fiação e infraestrutura subterrânea de eletrodutos é de inteira responsabilidade do cliente.</li>
                <li>Os postes identificados acima (SIAP01 a SIAP09) acomodam os periféricos conforme especificação de fiação anexa.</li>
              </ol>
            </div>
            
            <SeloPagina
              config={config}
              tituloPlanta="EQUIPAMENTOS DOS POSTES"
              revisao={config.revisao}
              paginaNum={(CAPA_ENTRA_NA_CONTAGEM ? 5 : 4) + itensDetalhe.length}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )}

      {/* PÁGINAS DA TABELA GERAL DE FIAÇÃO (PÁGINA 6 EM DIANTE) */}
      {paginasT5.map((itensDaPagina, p5Idx) => {
        const numPaginaFisica = 6 + itensDetalhe.length + p5Idx;
        const numPaginaSelo = (CAPA_ENTRA_NA_CONTAGEM ? 6 : 5) + itensDetalhe.length + p5Idx;
        if (!isPrinting && paginaAtiva !== numPaginaFisica) return null;

        return (
          <div key={`p5-chunk-${p5Idx}`} className="pagina-a3 pagina-tecnica">
            {/* Cabeçalho Divisor */}
            <div className="cabecalho-tecnico">
              <div className="logo-siamac-doc">
                SIAMAC <span>OWL</span>
              </div>
              <div className="documento-meta-topo">
                PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
              </div>
            </div>
            <div className="decoracao-linha-cabecalho">
              <div className="linha-vinho"></div>
              <div className="linha-verde"></div>
              <div className="linha-azul"></div>
            </div>

            <div className="titulo-planta-pagina">
              ESPECIFICAÇÃO DE FIAÇÃO E CABEAMENTO {paginasT5.length > 1 ? `(FOLHA ${p5Idx + 1}/${paginasT5.length})` : ''}
            </div>

            <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: '10px 0' }}>
              <div className="subcontainer-tabela" style={{ width: '100%', boxSizing: 'border-box' }}>
                {itensDaPagina.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
                    Nenhum periférico com especificação de cabeamento foi adicionado ao projeto atual.
                  </div>
                ) : (
                  <table className="tabela-fiacao" style={{ fontSize: '10.5px' }}>
                    <thead>
                      <tr>
                        <th className="col-equipamento">Equipamento</th>
                        <th className="col-local">Local de Instalação</th>
                        <th className="col-cabo">Especificação do Cabo</th>
                        <th className="col-destino">Destino da Fiação</th>
                        <th className="col-tamanho" style={{ width: '10%', textAlign: 'center' }}>Tamanho</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensDaPagina.map((item, idx) => (
                        <tr key={idx}>
                          <td className="col-equipamento" style={{ padding: '6px 8px' }}>{item.equipamento}</td>
                          <td className="col-local" style={{ padding: '6px 8px' }}>{item.local}</td>
                          <td className="col-cabo" style={{ padding: '6px 8px', lineHeight: '1.25' }}>
                            <div style={{ fontWeight: '700', color: '#0f172a' }}>{obterPartePrincipalCabo(item.cabo)}</div>
                            <div style={{ fontSize: '8px', color: '#64748b', marginTop: '1.5px' }}>{obterDetalheCabo(item.cabo)}</div>
                          </td>
                          <td className="col-destino" style={{ padding: '6px 8px' }}>{item.destino}</td>
                          <td className="col-tamanho" style={{ textAlign: 'center', fontWeight: 'bold', padding: '6px 8px' }}>{item.comprimento} m</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>

            {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
            <div className="rodape-tecnico">
              <div className="notes-rodape" style={{ fontSize: '10px', color: '#475569', maxWidth: '60%', lineHeight: '1.4' }}>
                <strong>NOTAS DE FIAÇÃO E INFRAESTRUTURA:</strong>
                <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                  <li>A passagem de fiação e a infraestrutura subterrânea de dutos/eletrodutos são de inteira responsabilidade do cliente.</li>
                  <li>A especificação de cor dos cabos de controle/alimentação deve seguir o padrão da empresa cliente, desde que os condutores internos possuam cores distintas entre si.</li>
                  <li>Cabos de rede CAT6 blindados ou superior devem ser de cobre puro e ter sua blindagem devidamente aterrada para evitar interferências eletromagnéticas na comunicação dos periféricos.</li>
                  <li>Cabos paralelos de som 2x2,5 mm² devem ser de cobre puro (OFC), não CCA, compatíveis com a potência/impedância dos amplificadores e cornetas instalados.</li>
                  <li>Os cabos de energia, comando, rede/dados e áudio devem ser conduzidos em eletrodutos separados ou conforme segregação definida pelo projeto elétrico, evitando interferências eletromagnéticas e facilitando manutenção.</li>
                  <li>Não passar cabos de rede/dados no mesmo eletroduto de cabos de potência, salvo quando permitido e tecnicamente previsto pelo projeto elétrico.</li>
                  <li>Todos os cabos devem ser identificados nas duas extremidades, indicando equipamento de origem, destino e função. Recomenda-se manter sobra técnica em caixas de passagem e no interior dos painéis para manutenção.</li>
                </ol>
              </div>
              
              <SeloPagina
                config={config}
                tituloPlanta={`ESPECIFICAÇÃO DE FIAÇÃO E CABEAMENTO ${paginasT5.length > 1 ? `FL.${p5Idx + 1}` : ''}`}
                revisao={config.revisao}
                paginaNum={numPaginaSelo}
                totalPaginas={totalPaginas}
              />
            </div>
          </div>
        )
      })}

      {/* PÁGINA DE CONSOLIDAÇÃO: RESUMO DE CABOS E PREMISSAS */}
      {(isPrinting || paginaAtiva === (6 + itensDetalhe.length + paginasT5.length)) && (
        <div className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          <div className="titulo-planta-pagina">
            RESUMO DE CABEAMENTO
          </div>

          <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none', display: 'flex', gap: '20px', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', padding: '10px 0' }}>
            {/* Coluna 1: Premissas de Cálculo */}
            <div className="subcontainer-tabela" style={{ flex: 1.0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '12px', color: '#1e293b', margin: '0 0 5px 0', borderBottom: '2px solid #8b1a1a', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Premissas de Cálculo de Metragem
              </h3>
              <table className="tabela-fiacao" style={{ fontSize: '10px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Trecho / Variável</th>
                    <th style={{ width: '70%' }}>Critério Considerado no Dimensionamento</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '5px 8px' }}>Descida de Equipamento/Poste</td>
                    <td style={{ padding: '5px 8px' }}>Considera a descida vertical integral do cabo desde o ponto de instalação do equipamento até a base do poste ou gabinete do periférico (conforme altura cadastrada de cada ponto).</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '5px 8px' }}>Percurso Subterrâneo</td>
                    <td style={{ padding: '5px 8px' }}>Trajeto horizontal subterrâneo do poste até o ponto de passagem central calculado via distância ortogonal (Manhattan: <code>|X| + |Z|</code>) para simular o traçado real a 90°.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '5px 8px' }}>Distância até Destino Final</td>
                    <td style={{ padding: '5px 8px' }}>Distância linear direta do ponto centralizador até o local do painel ou quadro de destino (Painel SIAMAC: <strong>{config.distanciaPainelAutomacao || 15} m</strong>; Quadro de Distribuição: <strong>{config.distanciaQuadroDistribuicao || 10} m</strong>; Roteador PoE: <strong>{config.distanciaRoteadorPoE || 20} m</strong>).</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '5px 8px' }}>Folga Técnica por Lance</td>
                    <td style={{ padding: '5px 8px' }}>Acrescentada uma folga de <strong>3,5 m</strong> por lance de fiação para decapagem, sobras para acomodação de fios em caixas de passagem e bornes de conexão.</td>
                  </tr>
                  <tr>
                    <td style={{ fontWeight: 'bold', padding: '5px 8px' }}>Arredondamento das Metragens</td>
                    <td style={{ padding: '5px 8px' }}>O comprimento final calculado para cada lance individual é arredondado para o número inteiro superior (em metros) para segurança comercial de compras.</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Coluna 2: Premissas Técnicas Gerais */}
            <div className="subcontainer-tabela" style={{ flex: 1.0, display: 'flex', flexDirection: 'column', gap: '8px', backgroundColor: '#ffffff', border: '1.5px solid #cbd5e1', borderRadius: '6px', padding: '10px' }}>
              <h3 style={{ fontSize: '12px', color: '#1e293b', margin: '0 0 5px 0', borderBottom: '2px solid #0284c7', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                Premissas Técnicas Gerais
              </h3>
              <ul style={{ fontSize: '8.5px', color: '#334155', margin: 0, paddingLeft: '14px', lineHeight: '1.45', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <li><strong>Objetivo:</strong> Sistema destinado à automação de balança rodoviária.</li>
                <li><strong>Cenário:</strong> Layout orientativo baseado em cenário padrão.</li>
                <li><strong>Validação:</strong> Necessidade de validação e confirmação das distâncias em campo.</li>
                <li><strong>Responsabilidade civil/elétrica:</strong> Infraestrutura civil e elétrica sob responsabilidade do cliente, salvo contratação específica TURNKEY.</li>
                <li><strong>Flexibilidade de cotas:</strong> Distâncias e alturas de montagem dos sensores são ajustáveis conforme local.</li>
                <li><strong>Alimentação:</strong> Necessidade de alimentação estabilizada/protegida (Nobreak) para painéis e periféricos.</li>
                <li><strong>Aterramento:</strong> Necessidade de aterramento adequado dos postes e blindagens de cabos.</li>
                <li><strong>Conectividade local:</strong> Rede local funcional e ativa para dispositivos IP.</li>
                <li><strong>Proteção externa:</strong> Proteção física, mecânica e contra umidade de cabos e equipamentos na área externa.</li>
              </ul>
            </div>

            {/* Coluna 3: Quantitativo Consolidado */}
            <div className="subcontainer-tabela" style={{ flex: 0.8, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <h3 style={{ fontSize: '12px', color: '#1e293b', margin: '0 0 5px 0', borderBottom: '2px solid #1a7a4a', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Quantitativo Consolidado por Cabo
              </h3>
              <table className="tabela-fiacao" style={{ fontSize: '10.5px' }}>
                <thead>
                  <tr>
                    <th style={{ width: '60%' }}>Especificação do Cabo</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Lances</th>
                    <th style={{ width: '20%', textAlign: 'center' }}>Total (m)</th>
                  </tr>
                </thead>
                <tbody>
                  {resumoQuantitativoCabos.map((res, idx) => (
                    <tr key={idx} style={{ height: '35px' }}>
                      <td style={{ padding: '6px 8px', lineHeight: '1.25' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '10px' }}>{res.nomeAmigavel}</div>
                        <div style={{ fontSize: '8px', color: '#64748b', marginTop: '1.5px' }}>{obterPartePrincipalCabo(res.cabo)}</div>
                      </td>
                      <td style={{ textAlign: 'center', fontWeight: '600', padding: '6px 8px' }}>{res.quantidade}x</td>
                      <td style={{ textAlign: 'center', fontWeight: '800', color: '#1a7a4a', fontSize: '12px', padding: '6px 8px' }}>{res.metragemTotal} m</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              <div style={{ marginTop: '5px', padding: '8px', backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '8.5px', color: '#166534', lineHeight: '1.3', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div>
                  <strong>Recomendação Comercial:</strong> Adquirir bobinas com margem de segurança de 5% a 10% sobre o quantitativo total para prever eventuais perdas em campo na execução física da obra.
                </div>
                <div style={{ fontWeight: 'bold', borderTop: '1px solid #bbf7d0', paddingTop: '4px', marginTop: '2px', color: '#15803d' }}>
                  * As metragens devem ser conferidas em campo antes da compra definitiva dos cabos, considerando o traçado real dos eletrodutos, caixas de passagem e painel de destino.
                </div>
              </div>
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico da Página de Resumo */}
          <div className="rodape-tecnico">
            <div className="notes-rodape" style={{ fontSize: '10px', color: '#475569', maxWidth: '60%', lineHeight: '1.4' }}>
              <strong>NOTAS DE CONSOLIDAÇÃO:</strong>
              <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                <li>As metragens são estimativas técnicas com folga, baseadas no traçado previsto. A metragem final pode variar conforme infraestrutura executada em campo.</li>
                <li>A fiação total real poderá sofrer ligeiras variações dependendo da profundidade das valas de eletrodutos e percurso físico final.</li>
                <li>Os cabos de energia, comando, rede/dados e áudio devem ser conduzidos em eletrodutos separados ou conforme segregação definida pelo projeto elétrico, evitando interferências eletromagnéticas e facilitando manutenção.</li>
                <li>Não passar cabos de rede/dados no mesmo eletroduto de cabos de potência, salvo quando permitido e tecnicamente previsto pelo projeto elétrico.</li>
                <li>Todos os cabos devem ser identificados nas duas extremidades, indicando equipamento de origem, destino e função. Recomenda-se manter sobra técnica em caixas de passagem e no interior dos painéis para manutenção.</li>
              </ol>
            </div>
            
            <SeloPagina
              config={config}
              tituloPlanta="RESUMO DE CABEAMENTO"
              revisao={config.revisao}
              paginaNum={(CAPA_ENTRA_NA_CONTAGEM ? 6 : 5) + itensDetalhe.length + paginasT5.length}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )}

      {/* PÁGINAS DO DETALHAMENTO DE FIAÇÃO POR POSTE (PÁGINA 6 EM DIANTE) */}
      {paginasT6.map((cardsDaPagina, p6Idx) => {
        const numPaginaFisica = 6 + itensDetalhe.length + paginasT5.length + 1 + p6Idx;
        const numPaginaSelo = (CAPA_ENTRA_NA_CONTAGEM ? 6 : 5) + itensDetalhe.length + paginasT5.length + 1 + p6Idx;
        if (!isPrinting && paginaAtiva !== numPaginaFisica) return null;

        return (
          <div key={`p6-chunk-${p6Idx}`} className="pagina-a3 pagina-tecnica">
            {/* Cabeçalho Divisor */}
            <div className="cabecalho-tecnico">
              <div className="logo-siamac-doc">
                SIAMAC <span>OWL</span>
              </div>
              <div className="documento-meta-topo">
                PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
              </div>
            </div>
            <div className="decoracao-linha-cabecalho">
              <div className="linha-vinho"></div>
              <div className="linha-verde"></div>
              <div className="linha-azul"></div>
            </div>

            <div className="titulo-planta-pagina">
              FIAÇÃO POR POSTE {paginasT6.length > 1 ? `(FOLHA ${p6Idx + 1}/${paginasT6.length})` : ''}
            </div>

            <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: '10px 0' }}>
              <div className="grid-fiações-postes" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px', width: '100%', boxSizing: 'border-box' }}>
                {cardsDaPagina.map((ponto, pIdx) => (
                  <div 
                    key={pIdx}
                    className="card-fiacao-poste"
                    style={{
                      backgroundColor: '#ffffff',
                      border: `1.5px solid ${ponto.cor}`,
                      borderRadius: '6px',
                      boxShadow: `0 2px 8px ${ponto.cor}15`,
                      padding: '12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div 
                      style={{
                        fontSize: '12px',
                        fontWeight: '800',
                        color: ponto.cor,
                        borderBottom: `1.5px solid ${ponto.cor}`,
                        paddingBottom: '4px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}
                    >
                      {ponto.ponto}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '9.5px', color: '#334155' }}>
                      {ponto.cabosList.map((c, cIdx) => (
                        <div 
                          key={cIdx} 
                          style={{ 
                            padding: '6px 8px', 
                            backgroundColor: '#f8fafc', 
                            border: '1px solid #e2e8f0', 
                            borderRadius: '4px',
                            lineHeight: '1.3'
                          }}
                        >
                          <div>
                            <strong>{c.quantidade}x</strong> {obterPartePrincipalCabo(c.cabo)}
                          </div>
                          <div style={{ color: '#0f172a', fontWeight: '600', marginTop: '2px' }}>
                            Destino: {c.destino} | Comprimento: {c.comprimentoTotal} m {c.quantidade > 1 ? `(${Math.ceil(c.comprimentoTotal / c.quantidade)} m cada)` : ''}
                          </div>
                          <div style={{ color: '#64748b', fontSize: '8.5px', marginTop: '3px', fontStyle: 'italic' }}>
                            Equipamento: {c.equipamentos.join(', ')}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
            <div className="rodape-tecnico">
              <div className="notes-rodape" style={{ fontSize: '10px', color: '#475569', maxWidth: '60%', lineHeight: '1.4' }}>
                <strong>NOTAS DE INSTALAÇÃO:</strong>
                <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                  <li>Verifique a identificação do poste (SIAP01 a SIAP09) na planta de "Equipamentos dos Postes" (Pág. 4) para correlacionar fisicamente com este detalhamento.</li>
                  <li>A fiação interna de cada poste deve ser protegida contra intempéries and atrito mecânico.</li>
                  <li>As conexões de aterramento e isolação elétrica devem ser revisadas em cada ponto de distribuição antes da energização.</li>
                  <li>Os cabos de energia, comando, rede/dados e áudio devem ser conduzidos em eletrodutos separados ou conforme segregação definida pelo projeto elétrico, evitando interferências eletromagnéticas e facilitando manutenção.</li>
                  <li>Não passar cabos de rede/dados no mesmo eletroduto de cabos de potência, salvo quando permitido e tecnicamente previsto pelo projeto elétrico.</li>
                  <li>Todos os cabos devem ser identificados nas duas extremidades, indicando equipamento de origem, destino e função. Recomenda-se manter sobra técnica em caixas de passagem e no interior dos painéis para manutenção.</li>
                  <li>O aterramento dos postes metálicos, painéis, blindagens de cabos e equipamentos deve ser executado conforme projeto elétrico da unidade e normas aplicáveis. A continuidade elétrica e equipotencialização devem ser verificadas antes do comissionamento.</li>
                </ol>
              </div>
              
              <SeloPagina
                config={config}
                tituloPlanta={`FIAÇÃO POR POSTE ${paginasT6.length > 1 ? `FL.${p6Idx + 1}` : ''}`}
                revisao={config.revisao}
                paginaNum={numPaginaSelo}
                totalPaginas={totalPaginas}
              />
            </div>
          </div>
        )
      })}

      {/* PÁGINA DE NIVELAMENTO — apenas balanças de sobrepor ou semiembutidas */}
      {exigeNivelamentoBalanca && (isPrinting || paginaAtiva === numPaginaNivelamento) && (
        <div className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          <div className="titulo-planta-pagina">
            NIVELAMENTO EM BALANÇA {config.tipoInstalacaoBalanca === 'semiembutida' ? 'SEMIEMBUTIDA' : 'DE SOBREPOR'} — REFERÊNCIA NA PISTA
          </div>

          <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'flex-start', padding: '10px 0', gap: '20px' }}>
            {/* Coluna de texto */}
            <div style={{ flex: 1.1, display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ padding: '12px 14px', backgroundColor: '#fff7ed', border: '1.5px solid #fdba74', borderRadius: '6px', fontSize: '11px', color: '#7c2d12', lineHeight: '1.5' }}>
                <strong style={{ color: '#9a3412', fontSize: '12px' }}>Por que isto é crítico?</strong>
                <p style={{ margin: '6px 0 0 0' }}>
                  Nas balanças <strong>{config.tipoInstalacaoBalanca === 'semiembutida' ? 'semiembutidas' : 'de sobrepor'}</strong> a
                  plataforma fica <strong>acima do nível do solo</strong>. Assim, a pista por onde o veículo trafega
                  (e que serve de referência para câmeras, sensores e semáforos) está mais alta que o piso onde os
                  postes e as cancelas são fixados.
                </p>
              </div>

              <div style={{ padding: '12px 14px', backgroundColor: '#ffffff', border: '1.5px solid #1a4a8b', borderRadius: '6px', fontSize: '11px', color: '#1e293b', lineHeight: '1.5' }}>
                <strong style={{ color: '#1a4a8b', fontSize: '12px' }}>Postes — referência na pista</strong>
                <p style={{ margin: '6px 0 0 0' }}>
                  As alturas dos equipamentos nos postes (RFID, câmeras, semáforos, sensores de barreira) são
                  cotadas <strong>a partir do nível da pista da balança</strong>, e não do piso ao redor. Ao posicionar
                  os postes, considere essa diferença de nível para que os equipamentos fiquem na altura correta em
                  relação ao veículo sobre a plataforma.
                </p>
              </div>

              {(config.cancelaEntrada || config.cancelaSaida) && (
                <div style={{ padding: '12px 14px', backgroundColor: '#ffffff', border: '1.5px solid #8b1a1a', borderRadius: '6px', fontSize: '11px', color: '#1e293b', lineHeight: '1.5' }}>
                  <strong style={{ color: '#8b1a1a', fontSize: '12px' }}>Base da cancela — 20 cm acima da pista</strong>
                  <p style={{ margin: '6px 0 0 0' }}>
                    A base de concreto da cancela deve ficar a <strong>20 cm acima do nível da pista</strong> da balança
                    rodoviária (e <strong>não</strong> em relação ao chão onde a cancela é instalada). Isso garante o
                    recuo e a altura corretos do braço em relação à plataforma de pesagem.
                  </p>
                </div>
              )}
            </div>

            {/* Coluna da foto */}
            <div style={{ flex: 0.9, display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
              <img
                src="instalacao_balanca_pista.png"
                alt="Exemplo de balança de sobrepor com base da cancela elevada em relação à pista"
                style={{ width: '100%', borderRadius: '6px', border: '1.5px solid #cbd5e1', boxShadow: '0 2px 10px rgba(15,23,42,0.12)' }}
              />
              <span style={{ fontSize: '9px', color: '#64748b', fontStyle: 'italic', textAlign: 'center', lineHeight: '1.3' }}>
                Exemplo real: a pista da balança fica acima do piso; a base da cancela e os postes acompanham esse
                nível (referência indicada pelas setas).
              </span>
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
          <div className="rodape-tecnico">
            <div className="notes-rodape" style={{ fontSize: '10px', color: '#475569', maxWidth: '60%', lineHeight: '1.4' }}>
              <strong>NOTAS DE NIVELAMENTO:</strong>
              <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                <li>Toda cota de altura de equipamentos{(config.cancelaEntrada || config.cancelaSaida) ? ' e da base da cancela' : ''} tem como referência o nível da PISTA da balança.</li>
                <li>Confirme em campo o desnível entre a pista e o piso antes da fixação dos postes{(config.cancelaEntrada || config.cancelaSaida) ? ' e da concretagem das bases' : ''}.</li>
              </ol>
            </div>

            <SeloPagina
              config={config}
              tituloPlanta="NIVELAMENTO NA PISTA"
              revisao={config.revisao}
              paginaNum={numPaginaNivelamentoSelo}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )}

      {/* PÁGINA: MATRIZ DE RESPONSABILIDADES */}
      {(isPrinting || paginaAtiva === numPaginaMatriz) && (
        <div className="pagina-a3 pagina-tecnica">
          {/* Cabeçalho Divisor */}
          <div className="cabecalho-tecnico">
            <div className="logo-siamac-doc">
              SIAMAC <span>OWL</span>
            </div>
            <div className="documento-meta-topo">
              PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
            </div>
          </div>
          <div className="decoracao-linha-cabecalho">
            <div className="linha-vinho"></div>
            <div className="linha-verde"></div>
            <div className="linha-azul"></div>
          </div>

          <div className="titulo-planta-pagina">
            MATRIZ DE RESPONSABILIDADES
          </div>

          <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none', display: 'flex', gap: '20px', flexDirection: 'row', alignItems: 'stretch', justifyContent: 'space-between', padding: '10px 0' }}>
            {/* Coluna 1: Tabela de Matriz */}
            <div className="subcontainer-tabela" style={{ flex: 1.35, display: 'flex', flexDirection: 'column' }}>
              <table className="tabela-fiacao" style={{ width: '100%' }}>
                <thead>
                  <tr style={{ height: '30px' }}>
                    <th style={{ width: '46%', padding: '6px 10px', fontSize: '10px' }}>Item / Escopo do Projeto</th>
                    <th style={{ width: '27%', padding: '6px 10px', fontSize: '10px', textAlign: 'center' }}>Responsabilidade SIAMAC</th>
                    <th style={{ width: '27%', padding: '6px 10px', fontSize: '10px', textAlign: 'center' }}>Responsabilidade Cliente</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { item: "Fornecimento dos equipamentos de automação", siamac: "Sim", cliente: "Não" },
                    { item: "Construção de bases civis (cancelas e totens)", siamac: "Não", cliente: "Sim" },
                    { item: "Fundação e chumbamento dos postes", siamac: "Não", cliente: "Sim" },
                    { item: "Eletrodutos subterrâneos e infraestrutura de valas", siamac: "Não", cliente: "Sim" },
                    { item: "Caixas de passagem e derivação", siamac: "Não", cliente: "Sim" },
                    { item: "Passagem dos cabos de sinal e potência nos eletrodutos", siamac: "Não", cliente: "Sim" },
                    { item: "Fixação dos equipamentos nos postes", siamac: "Sim", cliente: "Apoio local" },
                    { item: "Alimentação elétrica dos equipamentos e painéis", siamac: "Não", cliente: "Sim" },
                    { item: "Quadro de distribuição, disjuntores e proteção elétrica", siamac: "Não, salvo contratado", cliente: "Sim" },
                    { item: "Aterramento e equipotencialização dos postes e blindagens", siamac: "Não", cliente: "Sim" },
                    { item: "Infraestrutura de rede local", siamac: "Não", cliente: "Sim" },
                    { item: "Configuração do sistema e softwares da linha OWL", siamac: "Sim", cliente: "Não" },
                    { item: "Comissionamento, calibração e testes finais da automação", siamac: "Sim", cliente: "Apoio local" },
                    { item: "ART civil, elétrica e estrutural das fundações/infraestrutura", siamac: "Não, salvo contratado", cliente: "Sim" }
                  ].map((row, idx) => {
                    const renderBadge = (txt: string) => {
                      if (txt === "Sim") {
                        return (
                          <span style={{ backgroundColor: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', display: 'inline-block', minWidth: '45px', textAlign: 'center' }}>
                            Sim
                          </span>
                        )
                      }
                      if (txt === "Não") {
                        return (
                          <span style={{ backgroundColor: '#f1f5f9', color: '#64748b', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', display: 'inline-block', minWidth: '45px', textAlign: 'center' }}>
                            Não
                          </span>
                        )
                      }
                      if (txt === "Não, salvo contratado") {
                        return (
                          <span style={{ backgroundColor: '#fef3c7', color: '#d97706', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', display: 'inline-block', textAlign: 'center' }}>
                            Não *
                          </span>
                        )
                      }
                      if (txt === "Apoio local") {
                        return (
                          <span style={{ backgroundColor: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '4px', fontWeight: 'bold', fontSize: '9px', textTransform: 'uppercase', display: 'inline-block', textAlign: 'center' }}>
                            Apoio Local
                          </span>
                        )
                      }
                      return txt;
                    }

                    return (
                      <tr key={idx} style={{ height: '28px', backgroundColor: idx % 2 === 0 ? '#f8fafc' : 'transparent' }}>
                        <td style={{ padding: '5px 10px', fontWeight: 'bold', fontSize: '9.5px', color: '#1e293b' }}>{row.item}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center' }}>{renderBadge(row.siamac)}</td>
                        <td style={{ padding: '5px 10px', textAlign: 'center' }}>{renderBadge(row.cliente)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Coluna 2: Card Explicativo de Fluxo / Requisitos */}
            <div style={{ flex: 0.65, display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ backgroundColor: '#ffffff', border: '1.5px solid #1a4a8b', borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '11px', color: '#1a4a8b', margin: '0 0 5px 0', borderBottom: '2px solid #1a4a8b', paddingBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 'bold' }}>
                  Diretrizes de Integração Técnica
                </h4>
                <div style={{ fontSize: '9.5px', color: '#334155', lineHeight: '1.4', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <p>
                    Para o sucesso da implantação da automação da balança rodoviária, as etapas de infraestrutura civil, elétrica e de dados devem ser devidamente preparadas de acordo com as especificações deste guia.
                  </p>
                  <p>
                    <strong>* Não, salvo contratado:</strong> Indica itens de infraestrutura elétrica e civil que por padrão cabem à engenharia do cliente, exceto se houver cláusula de contratação turnkey explícita na proposta comercial da SIAMAC.
                  </p>
                  <p>
                    <strong>Apoio Local:</strong> O cliente deverá disponibilizar eletricista e profissional de TI locais durante a fase de comissionamento técnico da SIAMAC para liberação de acessos à rede corporativa e suporte elétrico no local.
                  </p>
                </div>
              </div>

              <div style={{ backgroundColor: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '6px', padding: '15px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <h4 style={{ fontSize: '11px', color: '#166534', margin: '0', fontWeight: 'bold', textTransform: 'uppercase' }}>
                  Validação da Infraestrutura
                </h4>
                <p style={{ fontSize: '9px', color: '#166534', lineHeight: '1.4', margin: '0' }}>
                  A liberação da visita da equipe de comissionamento da SIAMAC está condicionada ao envio do checklist de pré-instalação física assinado pelo cliente, atestando que todas as bases, postes, eletrodutos, cabeamento e alimentação de energia foram executados de acordo com este projeto orientativo.
                </p>
              </div>
            </div>
          </div>

          {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
          <div className="rodape-tecnico">
            <div className="notes-rodape" style={{ fontSize: '9.5px', color: '#475569', maxWidth: '60%', lineHeight: '1.4' }}>
              <strong>NOTAS DA MATRIZ DE RESPONSABILIDADES:</strong>
              <ol style={{ paddingLeft: '14px', marginTop: '4px' }}>
                <li>A finalização das infraestruturas civis e elétricas é requisito obrigatório para a solicitação de comissionamento em campo.</li>
                <li>O cliente deve garantir que todas as fiações estejam devidamente passadas, identificadas nas duas extremidades e testadas (continuidade elétrica) antes do comissionamento.</li>
              </ol>
            </div>

            <SeloPagina
              config={config}
              tituloPlanta="MATRIZ DE RESPONSABILIDADES"
              revisao={config.revisao}
              paginaNum={numPaginaMatrizSelo}
              totalPaginas={totalPaginas}
            />
          </div>
        </div>
      )}

        </>
      )}

      {/* PÁGINAS DO CHECKLIST DE PRÉ-INSTALAÇÃO (Apenas no modo de emissão isolada) */}
      {apenasChecklist && paginasChecklist.map((itensDaPagina, checklistIdx) => {
        const numPaginaFisica = apenasChecklist
          ? 1 + checklistIdx
          : numPaginaMatriz + 1 + checklistIdx
        
        const numPaginaSelo = apenasChecklist
          ? 1 + checklistIdx
          : numPaginaMatrizSelo + 1 + checklistIdx

        if (!isPrinting && paginaAtiva !== numPaginaFisica) return null

        const ehUltimaPagina = checklistIdx === paginasChecklist.length - 1

        if (apenasChecklist) {
          // FORMATO A4 RETRATO (Checklist emitido separadamente)
          return (
            <div key={`checklist-pag-a4-${checklistIdx}`} className="pagina-a4-vertical">
              {/* Cabeçalho A4 Retrato */}
              <div className="cabecalho-tecnico-a4">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div className="logo-siamac-doc" style={{ fontSize: '15px' }}>
                    SIAMAC <span>OWL</span>
                  </div>
                  <div style={{ fontSize: '9.5px', color: '#8b1a1a', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                    CHECKLIST DE PRÉ-INSTALAÇÃO
                  </div>
                </div>
                <div style={{ fontSize: '8px', color: '#64748b', marginTop: '4px', display: 'flex', justifyContent: 'space-between' }}>
                  <span>CLIENTE: {config.cliente || '-'}</span>
                  <span>PEDIDO/PROPOSTA: {config.codigoProposta || '-'}</span>
                  <span>DOC: {codigoDocumento}</span>
                </div>
                <div style={{ height: '1.5px', background: 'linear-gradient(to right, #8b1a1a, #1a7a4a, #1a4a8b)', marginTop: '5px' }}></div>
              </div>

              {/* Corpo da página com os cards "item a item" */}
              <div style={{ display: 'flex', flexDirection: 'column', flex: 1, gap: '10px', overflow: 'hidden', margin: '5px 0' }}>
                {itensDaPagina.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '12px' }}>
                    Nenhum item de verificação configurado no projeto atual.
                  </div>
                ) : (
                  itensDaPagina.map((item, idx) => {
                    const itemSeq = checklistIdx * 8 + idx + 1
                    return (
                      <div key={idx} className="card-checklist-a4">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                          <span style={{ fontSize: '9.5px', fontWeight: 'bold', color: '#1e3a8a', backgroundColor: '#eff6ff', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}>
                            {item.ponto}
                          </span>
                          <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#64748b' }}>
                            Item #{itemSeq}
                          </span>
                        </div>
                        
                        <div style={{ fontSize: '9px', color: '#1e293b', lineHeight: '1.3', marginBottom: '8px', fontWeight: '500' }}>
                          {item.pergunta}
                        </div>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', gap: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8.5px', color: '#334155', fontWeight: '500' }}>
                              <div style={{ width: '10px', height: '10px', border: '1.2px solid #64748b', borderRadius: '2px' }}></div>
                              Conforme
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8.5px', color: '#334155', fontWeight: '500' }}>
                              <div style={{ width: '10px', height: '10px', border: '1.2px solid #64748b', borderRadius: '2px' }}></div>
                              Não Conforme
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '8.5px', color: '#334155', fontWeight: '500' }}>
                              <div style={{ width: '10px', height: '10px', border: '1.2px solid #64748b', borderRadius: '2px' }}></div>
                              Não Aplicável
                            </label>
                          </div>
                          <div style={{ width: '45%', borderBottom: '1px dashed #cbd5e1', height: '15px', position: 'relative', display: 'flex', alignItems: 'flex-end', paddingBottom: '1px' }}>
                            <span style={{ fontSize: '7.5px', color: '#94a3b8', marginRight: '4px', fontWeight: 'bold' }}>Obs:</span>
                            <span style={{ flex: 1 }}></span>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Assinaturas na última folha do A4 */}
              {ehUltimaPagina && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px', padding: '0 10px', boxSizing: 'border-box' }}>
                  <div style={{ width: '45%', textAlign: 'center' }}>
                    <div style={{ borderTop: '1.2px solid #475569', marginTop: '25px', paddingTop: '4px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>TÉCNICO RESPONSÁVEL</span>
                      <span style={{ fontSize: '7.5px', color: '#64748b', display: 'block' }}>SIAMAC AUTOMAÇÃO / PARCEIRO</span>
                    </div>
                  </div>
                  <div style={{ width: '45%', textAlign: 'center' }}>
                    <div style={{ borderTop: '1.2px solid #475569', marginTop: '25px', paddingTop: '4px' }}>
                      <span style={{ fontSize: '8.5px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>REPRESENTANTE DO CLIENTE (ACEITE)</span>
                      <span style={{ fontSize: '7.5px', color: '#64748b', display: 'block' }}>NOME / CARGO / DATA</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Rodapé A4 Retrato */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '8px', marginTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div style={{ fontSize: '7.5px', color: '#64748b', maxWidth: '70%', lineHeight: '1.2' }}>
                  <strong>NOTAS DE COMISSIONAMENTO:</strong>
                  <ul style={{ paddingLeft: '10px', margin: '2px 0 0 0', fontSize: '7px' }}>
                    <li>Todos os itens devem ser testados na presença do cliente.</li>
                    <li>Itens não conformes (NC) devem ter justificativa e plano de ação anotados.</li>
                    <li>Envie este documento digitalizado e assinado para validação da garantia.</li>
                    <li>Este documento apresenta um dimensionamento técnico orientativo para infraestrutura de automação de balança rodoviária. As posições, bases, fundações, eletrodutos, alimentação elétrica, aterramento e demais elementos civis/elétricos devem ser validados em campo e, quando aplicável, por responsável técnico habilitado. Este documento não substitui projeto executivo civil, estrutural, elétrico, SPDA, aterramento ou ART específica da obra.</li>
                  </ul>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '8px', color: '#475569', fontWeight: 'bold' }}>
                  <span>PÁGINA {numPaginaSelo} DE {totalPaginas}</span>
                  <span style={{ color: '#10b981', fontSize: '7px', marginTop: '2px' }}>REV. R{String(config.revisao).padStart(2, '0')}</span>
                </div>
              </div>
            </div>
          )
        }

        // FORMATO A3 PAISAGEM (Anexo da Documentação Técnica completa)
        return (
          <div key={`checklist-pag-a3-${checklistIdx}`} className="pagina-a3 pagina-tecnica">
            {/* Cabeçalho Divisor */}
            <div className="cabecalho-tecnico">
              <div className="logo-siamac-doc">
                SIAMAC <span>OWL</span>
              </div>
              <div className="documento-meta-topo">
                PROPOSTA: {config.codigoProposta || '-'} | DOCUMENTO: {codigoDocumento}
              </div>
            </div>
            <div className="decoracao-linha-cabecalho">
              <div className="linha-vinho"></div>
              <div className="linha-verde"></div>
              <div className="linha-azul"></div>
            </div>

            <div className="titulo-planta-pagina">
              CHECKLIST DE PRÉ-INSTALAÇÃO {paginasChecklist.length > 1 ? `(FOLHA ${checklistIdx + 1}/${paginasChecklist.length})` : ''}
            </div>

            <div className="conteudo-tecnico" style={{ border: 'none', background: 'transparent', boxShadow: 'none', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start', padding: '10px 0' }}>
              <div className="subcontainer-tabela" style={{ width: '100%', boxSizing: 'border-box' }}>
                {itensDaPagina.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '40px', color: '#64748b', fontSize: '14px' }}>
                    Nenhum item de verificação configurado no projeto atual.
                  </div>
                ) : (
                  <table className="tabela-fiacao" style={{ tableLayout: 'fixed', width: '100%' }}>
                    <thead>
                      <tr>
                        <th style={{ width: '6%', textAlign: 'center', padding: '5px' }}>Item</th>
                        <th style={{ width: '22%', padding: '5px' }}>Equipamento / Ponto</th>
                        <th style={{ width: '42%', padding: '5px' }}>Item de Verificação (Checklist)</th>
                        <th style={{ width: '4%', textAlign: 'center', padding: '5px' }}>C</th>
                        <th style={{ width: '4%', textAlign: 'center', padding: '5px' }}>NC</th>
                        <th style={{ width: '4%', textAlign: 'center', padding: '5px' }}>NA</th>
                        <th style={{ width: '18%', padding: '5px' }}>Observações / Ações Corretivas</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itensDaPagina.map((item, idx) => {
                        const itemSeq = checklistIdx * 10 + idx + 1
                        return (
                          <tr key={idx} style={{ height: '36px' }}>
                            <td style={{ textAlign: 'center', fontWeight: 'bold', padding: '4px' }}>{itemSeq}</td>
                            <td style={{ fontWeight: 'bold', padding: '4px', fontSize: '9px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.ponto}</td>
                            <td style={{ fontSize: '9px', lineHeight: '1.2', padding: '4px', whiteSpace: 'normal', wordBreak: 'break-word' }}>{item.pergunta}</td>
                            <td style={{ textAlign: 'center', padding: '4px' }}>
                              <div style={{ width: '10px', height: '10px', border: '1.2px solid #64748b', borderRadius: '1.5px', margin: '0 auto' }}></div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '4px' }}>
                              <div style={{ width: '10px', height: '10px', border: '1.2px solid #64748b', borderRadius: '1.5px', margin: '0 auto' }}></div>
                            </td>
                            <td style={{ textAlign: 'center', padding: '4px' }}>
                              <div style={{ width: '10px', height: '10px', border: '1.2px solid #64748b', borderRadius: '1.5px', margin: '0 auto' }}></div>
                            </td>
                            <td style={{ padding: '4px' }}></td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                )}
              </div>

              {ehUltimaPagina && (
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30px', padding: '0 20px', width: '100%', boxSizing: 'border-box' }}>
                  <div style={{ width: '45%', textAlign: 'center' }}>
                    <div style={{ borderTop: '1.5px solid #475569', marginTop: '35px', paddingTop: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>TÉCNICO RESPONSÁVEL</span>
                      <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>SIAMAC AUTOMAÇÃO / PARCEIRO CREDENCIADO</span>
                    </div>
                  </div>
                  <div style={{ width: '45%', textAlign: 'center' }}>
                    <div style={{ borderTop: '1.5px solid #475569', marginTop: '35px', paddingTop: '6px' }}>
                      <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#1e293b', display: 'block' }}>REPRESENTANTE DO CLIENTE (ACEITE)</span>
                      <span style={{ fontSize: '8.5px', color: '#64748b', display: 'block' }}>NOME / CARGO / DATA</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rodapé com as notas técnicas e o carimbo caraterístico */}
            <div className="rodape-tecnico">
              <div className="notes-rodape" style={{ fontSize: '9px', color: '#475569', maxWidth: '60%', lineHeight: '1.3' }}>
                <strong>NOTAS DE COMISSIONAMENTO:</strong>
                <ol style={{ paddingLeft: '14px', marginTop: '4px', margin: 0 }}>
                  <li>Todos os itens devem ser verificados e testados pelo técnico de campo na presença do cliente.</li>
                  <li>Itens não conformes (NC) devem ser justificados no campo de observações, constando a ação corretiva e novo prazo de teste.</li>
                  <li>Este documento devidamente assinado deve ser digitalizado e enviado para a SIAMAC para fins de validação da garantia do sistema.</li>
                  <li>Este documento apresenta um dimensionamento técnico orientativo para infraestrutura de automação de balança rodoviária. As posições, bases, fundações, eletrodutos, alimentação elétrica, aterramento e demais elementos civis/elétricos devem ser validados em campo e, quando aplicável, por responsável técnico habilitado. Este documento não substitui projeto executivo civil, estrutural, elétrico, SPDA, aterramento ou ART específica da obra.</li>
                </ol>
              </div>
              
              <SeloPagina
                config={config}
                tituloPlanta={`CHECKLIST DE PRÉ-INSTALAÇÃO ${paginasChecklist.length > 1 ? `FL.${checklistIdx + 1}` : ''}`}
                revisao={config.revisao}
                paginaNum={numPaginaSelo}
                totalPaginas={totalPaginas}
              />
            </div>
          </div>
        )
      })}

    </div>
  )
}
