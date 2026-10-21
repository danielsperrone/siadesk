import { Suspense, useEffect, useMemo, useRef } from 'react'
import { PlacasVeiculo } from '../simulator/PlacasVeiculo'
import { ConeLeitor } from '../simulator/LeitoresCena'
import type { ParteVeiculo } from '../simulator/leitura'
import { Html, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { CATALOGO, modeloDaPeca } from '../catalog/pieces'
import type { PieceInstance } from '../types'
import { useProject } from '../store/project'
import { criarCancelaArticulada } from './cancela-rig'
import type { AlvoCancela } from './MenuCancela'
import { gerarLayout } from '../layout/engine'
import { criarVeiculoArticulado, girarRodas } from './veiculo-rig'
import type { RefObject } from 'react'
import { ModeloSinalizacao } from './ModeloSinalizacao'
import { ModeloCameraOcr } from './ModeloCameraOcr'
import { cancelaAberta, useSimulator } from '../simulator/store'
import { proximoPesoApresentacao } from '../simulator/apresentacao'

interface PieceProps {
  interativo?: boolean
  instancia: PieceInstance
  modeloDisponivel: boolean
  mostrarRotulos: boolean
  onMenuCancela?: (alvo: AlvoCancela) => void
  onPesoVeiculo?: () => void
  onIdentidadeVeiculo?: (parte: ParteVeiculo) => void
}

function ModeloCancela({ url, aberta }: { url: string; aberta: boolean }) {
  const { scene } = useGLTF(url)
  const { modelo, pivot } = useMemo(() => criarCancelaArticulada(scene), [scene])
  const reduzirMovimento = useRef(false)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const atualizar = () => { reduzirMovimento.current = media.matches }
    atualizar()
    media.addEventListener('change', atualizar)
    return () => media.removeEventListener('change', atualizar)
  }, [])
  useFrame((_, delta) => {
    const destino = aberta ? Math.PI / 2 : 0
    const passo = Math.min(delta, 0.1) * Math.PI / 2
    const diferenca = destino - pivot.rotation.x
    pivot.rotation.x = reduzirMovimento.current || Math.abs(diferenca) <= passo
      ? destino : pivot.rotation.x + Math.sign(diferenca) * passo
  })
  return <primitive object={modelo} dispose={null} />
}

// Renderiza o GLB exportado do SketchUp. Convenção dos modelos:
// unidades em metros, origem no centro da base da peça, frente para +X.
function ModeloGlb({ url, scale }: { url: string; scale?: [number, number, number] }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} scale={scale} />
}

function ModeloTrave({ altura, largura }: { altura: number; largura: number }) {
  // Mesmo diâmetro visual do tubo dos GLBs dos postes padrão (0,12 m).
  const raio = 0.06
  return <group>
    {[-largura / 2, largura / 2].map(z => <group key={z} position={[0, 0, z]}>
      <mesh position={[0, altura / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[raio, raio, altura, 20]} />
        <meshStandardMaterial color="#9aa3ab" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[0, 0.015, 0]} castShadow receiveShadow>
        <boxGeometry args={[0.25, 0.03, 0.25]} />
        <meshStandardMaterial color="#7b858d" metalness={0.7} roughness={0.4} />
      </mesh>
    </group>)}
    <mesh position={[0, altura, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
      <cylinderGeometry args={[raio, raio, largura + 2 * raio, 20]} />
      <meshStandardMaterial color="#9aa3ab" metalness={0.7} roughness={0.4} />
    </mesh>
  </group>
}

function ModeloVeiculo({ url, percurso }: { url: string; percurso: RefObject<number> }) {
  const { scene } = useGLTF(url)
  const { modelo, rodas } = useMemo(() => criarVeiculoArticulado(scene), [scene])
  const anterior = useRef(percurso.current)
  useFrame(() => {
    girarRodas(rodas, percurso.current - anterior.current)
    anterior.current = percurso.current
  })
  return <primitive object={modelo} dispose={null} />
}

function Placeholder({ instancia, config }: { instancia: PieceInstance; config: any }) {
  const tipo = CATALOGO[instancia.tipo]
  const cx = instancia.tipo === 'balanca' ? 16 : tipo.placeholder[0]
  const cy = instancia.estruturaPoste?.altura ?? tipo.placeholder[1]
  const cz = instancia.tipo === 'balanca' ? config.larguraBalanca : tipo.placeholder[2]
  return (
    <mesh position={[0, cy / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[cx, cy, cz]} />
      <meshStandardMaterial color={tipo.cor} />
    </mesh>
  )
}

function VeiculoPiece({ instancia, modeloDisponivel, mostrarRotulos, interativo = false, onIdentidadeVeiculo }: PieceProps) {
  const config = useProject((s) => s.config)
  const setConfig = useProject((s) => s.setConfig)
  const abaAtiva = useProject((s) => s.abaAtiva)

  const groupRef = useRef<THREE.Group>(null)

  // Física do movimento com inércia
  const velocity = useRef(0)
  const percurso = useRef(0)
  const localOffset = useRef(instancia.posicao[0])
  const keysPressed = useRef({ ArrowLeft: false, ArrowRight: false })
  const isMoving = useRef(false)

  // Sincroniza o offset local se ele mudar externamente e o veículo estiver parado
  useEffect(() => {
    if (velocity.current === 0 && !isMoving.current) {
      localOffset.current = instancia.posicao[0]
      if (groupRef.current) {
        groupRef.current.position.x = localOffset.current
      }
    }
  }, [instancia.posicao[0]])

  // Escuta os eventos de teclado
  useEffect(() => {
    // As miniaturas da documentação também renderizam veículos. Somente a
    // cena principal pode consumir teclas e persistir seu movimento.
    if (!interativo) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.altKey || e.metaKey || e.isComposing) return
      // Ignora se estiver na aba de calibração para não mover o caminhão com o teclado
      if (abaAtiva === 'calibracao') {
        return
      }

      // Ignora se o foco estiver em campos de input ou textarea
      const target = e.target as HTMLElement
      if (target instanceof HTMLElement && (target.closest('input, textarea, select, dialog') || target.isContentEditable)) {
        return
      }

      const tecla = e.key.toLowerCase()
      const { modoApresentacao } = useProject.getState()
      if (tecla === 'v') {
        if (e.repeat) return
        e.preventDefault()
        // Gira o grupo inteiro: rodas, placas e pontos de leitura RFID/OCR
        // continuam vinculados à mesma parte do veículo.
        const invertido = !useProject.getState().config.veiculoInvertido
        setConfig('veiculoInvertido', invertido)
        if (!modoApresentacao) return
        // Calcula a posição de reinício já com a nova orientação, antes do
        // próximo render, para manter todo o caminhão além dos postes.
        if (groupRef.current) groupRef.current.rotation.y = invertido ? Math.PI : 0
      }

      if (tecla === 'r' || (tecla === 'v' && modoApresentacao)) {
        if (e.repeat || !groupRef.current) return
        e.preventDefault()
        const { config: atual, calibracoes } = useProject.getState()
        const postesSaida = gerarLayout({ ...atual, comprimentoBalanca: 16 }, calibracoes)
          .filter((peca) => peca.id.startsWith('poste-') && peca.posicao[0] > 0)
        const limiteSaida = postesSaida.length
          ? Math.max(...postesSaida.map((peca) => peca.posicao[0]))
          : 14.5
        const grupo = groupRef.current
        grupo.updateWorldMatrix(true, true)
        const extremidadeInterna = new THREE.Box3().setFromObject(grupo).min.x - grupo.position.x
        const inicio = limiteSaida + 1 - extremidadeInterna
        velocity.current = 0
        isMoving.current = false
        keysPressed.current = { ArrowLeft: false, ArrowRight: false }
        localOffset.current = inicio
        grupo.position.x = inicio
        setConfig('offsetVeiculoX', inicio)
        if (modoApresentacao) {
          setConfig('pesoVeiculoKg', proximoPesoApresentacao(atual.pesoVeiculoKg ?? 40000))
        }
        return
      }

      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault()
        if (e.key === 'ArrowLeft') keysPressed.current.ArrowLeft = true
        if (e.key === 'ArrowRight') keysPressed.current.ArrowRight = true
        isMoving.current = true
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') keysPressed.current.ArrowLeft = false
      if (e.key === 'ArrowRight') keysPressed.current.ArrowRight = false
    }
    const liberarTeclas = () => { keysPressed.current = { ArrowLeft: false, ArrowRight: false } }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', liberarTeclas)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', liberarTeclas)
    }
  }, [abaAtiva, setConfig, interativo])

  // Parâmetros físicos calibrados para precisão e inércia suaves
  const ACCELERATION = 14 // m/s² (aceleração responsiva)
  const MAX_SPEED = 6 // m/s (velocidade controlada)
  const DAMPING = 5.0 // Damping exponencial (maior = para mais rápido)

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1) // Evita pulos se houver lag grande

    let direction = 0
    if (keysPressed.current.ArrowRight) direction += 1
    if (keysPressed.current.ArrowLeft) direction -= 1

    if (direction !== 0) {
      // Acelera na direção desejada
      velocity.current += direction * ACCELERATION * dt
      velocity.current = THREE.MathUtils.clamp(velocity.current, -MAX_SPEED, MAX_SPEED)
    } else {
      // Desaceleração suave por atrito (damping)
      velocity.current *= Math.exp(-DAMPING * dt)

      if (Math.abs(velocity.current) < 0.01 && velocity.current !== 0) {
        velocity.current = 0
        isMoving.current = false
        // Atualiza o Zustand para persistir a nova posição final
        setConfig('offsetVeiculoX', localOffset.current)
      }
    }

    // Aplica o movimento
    if (velocity.current !== 0) {
      const deslocamento = velocity.current * dt
      localOffset.current += deslocamento
      // Projeta o deslocamento mundial no eixo longitudinal do modelo.
      // Reposicionamentos pela configuração ou tecla R não contam como rodagem.
      percurso.current += deslocamento * Math.cos(instancia.rotacaoY)
      if (groupRef.current) {
        groupRef.current.position.x = localOffset.current
      }
    }
  })

  const tipo = CATALOGO[instancia.tipo]
  const alturaRotulo = tipo.placeholder[1] + 0.6

  return (
    <group
      ref={groupRef}
      name={instancia.id}
      onClick={interativo ? e => { if (e.delta <= 4 && groupRef.current) { e.stopPropagation(); const p = groupRef.current.worldToLocal(e.point.clone()); onIdentidadeVeiculo?.(p.x < -4.3 ? 'cavalo' : 'reboque') } } : undefined}
      position={[localOffset.current, instancia.posicao[1], instancia.posicao[2]]}
      rotation={[0, instancia.rotacaoY, 0]}
    >
      <PlacasVeiculo />
      <group position={[0, 0, 0]}>
        {modeloDisponivel ? (
          <Suspense fallback={<Placeholder instancia={instancia} config={config} />}>
            <ModeloVeiculo key={modeloDaPeca(instancia)} url={`models/${modeloDaPeca(instancia)}.glb`} percurso={percurso} />
          </Suspense>
        ) : (
          <Placeholder instancia={instancia} config={config} />
        )}
      </group>
      {mostrarRotulos && (
        <Html
          position={[0, alturaRotulo, 0]}
          center
          distanceFactor={18}
          style={{ pointerEvents: 'none' }}
        >
          <div className="rotulo-peca">{instancia.rotulo}</div>
        </Html>
      )}
    </group>
  )
}

export function Piece(props: PieceProps) {
  return props.instancia.tipo === 'veiculo' ? <VeiculoPiece {...props} /> : <StaticPiece {...props} />
}

function StaticPiece({ instancia, modeloDisponivel, mostrarRotulos, onMenuCancela, interativo = true }: PieceProps) {
  const config = useProject((s) => s.config)
  const modoApresentacao = useProject(s => s.modoApresentacao)
  const aberta = useSimulator(s => cancelaAberta(config, instancia.id, s.state))
  const abaAtiva = useProject((s) => s.abaAtiva)
  const setPosteEditandoPerifericos = useProject((s) => s.setPosteEditandoPerifericos)

  const tipo = CATALOGO[instancia.tipo]
  const alturaRotulo = (instancia.estruturaPoste?.altura ?? tipo.placeholder[1]) + 0.6
  // Com âncora definida, o modelo é deslocado para que o ponto de ancoragem
  // (centro do fixador) caia na origem do grupo: posição e giro do grupo
  // passam a acontecer em torno da âncora, não da origem do modelo
  const [ax, ay, az] = instancia.ancora ?? [0, 0, 0]

  const escalaX = instancia.tipo === 'balanca' ? 16 / 14.91 : 1
  const escalaZ = instancia.tipo === 'balanca' ? config.larguraBalanca / 3.20 : 1
  const scale: [number, number, number] = [escalaX, instancia.estruturaPoste ? instancia.estruturaPoste.altura / tipo.placeholder[1] : 1, escalaZ]

  const matchPoste = instancia.id.match(/^poste-(siap0[1-9])$/)
  const posteId = instancia.id.startsWith('poste-') ? instancia.posteId ?? matchPoste?.[1] : undefined
  const isPosteClicavel = interativo && abaAtiva === 'postes' && !!posteId
  const isCancela = instancia.tipo.startsWith('cancela')

  useEffect(() => {
    return () => {
      document.body.style.cursor = 'auto'
    }
  }, [])

  return (
    <group
      name={instancia.id}
      position={instancia.posicao}
      rotation={[0, instancia.rotacaoY, 0]}
      onContextMenu={isCancela && modeloDisponivel ? (e) => {
        e.stopPropagation()
        e.nativeEvent.preventDefault()
        onMenuCancela?.({ id: instancia.id, rotulo: instancia.rotulo, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY })
      } : undefined}
      onClick={isPosteClicavel && posteId ? (e) => {
        e.stopPropagation()
        setPosteEditandoPerifericos(posteId)
      } : undefined}
      onPointerOver={isPosteClicavel ? (e) => {
        e.stopPropagation()
        document.body.style.cursor = 'pointer'
      } : undefined}
      onPointerOut={isPosteClicavel ? () => {
        document.body.style.cursor = 'auto'
      } : undefined}
    >
      <group position={[-ax, -ay, -az]}>
        {instancia.tipo === 'poste-trave' ? <ModeloTrave altura={instancia.estruturaPoste?.altura ?? 6} largura={instancia.estruturaPoste?.largura ?? 5} /> : modeloDisponivel ? (
          <Suspense fallback={<Placeholder instancia={instancia} config={config} />}>
            {isCancela ? (
              <ModeloCancela url={`models/${tipo.modelo}.glb`} aberta={aberta} />
            ) : instancia.tipo === 'camera-ocr' ? (
              <ModeloCameraOcr url={`models/${tipo.modelo}.glb`} inclinacao={instancia.cameraRtsp?.inclinacao} />
            ) : instancia.tipo === 'semaforo' || instancia.tipo === 'display-mensagens' ? (
              <ModeloSinalizacao url={`models/${tipo.modelo}.glb`} instancia={instancia} />
            ) : <ModeloGlb url={`models/${tipo.modelo}.glb`} scale={scale} />}
          </Suspense>
        ) : (
          <Placeholder instancia={instancia} config={config} />
        )}
      </group>
      {!modoApresentacao && (instancia.tipo === 'leitor-rfid' || instancia.tipo === 'camera-ocr') && <ConeLeitor instancia={instancia} />}
      {mostrarRotulos && (
        <Html
          position={[0, alturaRotulo, 0]}
          center
          distanceFactor={18}
          style={{ pointerEvents: 'none' }}
        >
          <div className="rotulo-peca">{instancia.rotulo}</div>
        </Html>
      )}
    </group>
  )
}
