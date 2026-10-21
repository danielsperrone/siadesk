import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import { gerarLayout } from '../layout/engine'
import { COMPRIMENTO_PISTA_CENA, LARGURA_PISTA } from '../layout/constants'
import { useProject } from '../store/project'
import { useModelosDisponiveis } from '../hooks/useModelosDisponiveis'
import { CATALOGO, MODELOS_VEICULO, modeloDaPeca } from '../catalog/pieces'
import { Piece } from './Piece'
import { MenuCancela, type AlvoCancela } from './MenuCancela'
import { SensoresCena } from '../simulator/SensoresCena'
import { CamerasCena } from '../simulator/CamerasCena'
import { LeitoresCena } from '../simulator/LeitoresCena'
import { IdentidadeVeiculoModal } from '../simulator/InterfaceLeitura'
import type { ParteVeiculo } from '../simulator/leitura'
import { PesagemCena } from '../simulator/PesagemCena'
import { PesoVeiculoModal } from '../simulator/InterfaceBalanca'
import { canalCancela, cancelaAberta, enviarCLP, useSimulator } from '../simulator/store'
import type { PieceInstance } from '../types'

function Pista({ comprimentoBalanca, mostrarPista, mostrarGrama }: { comprimentoBalanca: number; mostrarPista: boolean; mostrarGrama: boolean }) {
  const comprimentoTotal = comprimentoBalanca + 2 * COMPRIMENTO_PISTA_CENA
  return (
    <group>
      {/* Faixa de asfalto ao longo do fluxo */}
      {mostrarPista && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
          <planeGeometry args={[comprimentoTotal, LARGURA_PISTA]} />
          <meshStandardMaterial color="#3a3d40" />
        </mesh>
      )}
      {/* Terreno */}
      {mostrarGrama && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
          <planeGeometry args={[comprimentoTotal + 20, 60]} />
          <meshStandardMaterial color="#6b7d5e" />
        </mesh>
      )}
    </group>
  )
}

// Em desenvolvimento, expõe a cena para inspeção via console/automação
function ExporCenaDev() {
  const scene = useThree((s) => s.scene)
  useEffect(() => {
    if (import.meta.env.DEV) {
      ;(window as unknown as Record<string, unknown>).__cena = scene
    }
  }, [scene])
  return null
}

function AtualizadorCamera({ abaAtiva }: { abaAtiva: string }) {
  const { camera, controls } = useThree()
  const abaAnteriorRef = useRef<string>(abaAtiva)

  useEffect(() => {
    if (abaAtiva === 'calibracao') {
      camera.position.set(0.8, 2.2, 4.5)
      if (controls) {
        // @ts-ignore
        controls.target.set(0, 1.2, 0)
        // @ts-ignore
        controls.update()
      }
      camera.updateProjectionMatrix()
    } else if (abaAnteriorRef.current === 'calibracao') {
      camera.position.set(18, 14, 18)
      if (controls) {
        // @ts-ignore
        controls.target.set(0, 0, 0)
        // @ts-ignore
        controls.update()
      }
      camera.updateProjectionMatrix()
    }
    abaAnteriorRef.current = abaAtiva
  }, [abaAtiva, camera, controls])
  return null
}

function ControladorCena() {
  const { camera, controls } = useThree()
  const solicitouSalvarCena = useProject((s) => s.solicitouSalvarCena)
  const setSolicitouSalvarCena = useProject((s) => s.setSolicitouSalvarCena)
  const adicionarCena = useProject((s) => s.adicionarCena)
  const cenaParaIr = useProject((s) => s.cenaParaIr)
  const setCenaParaIr = useProject((s) => s.setCenaParaIr)

  // Salva a cena quando solicitado
  useEffect(() => {
    if (solicitouSalvarCena) {
      const pos: [number, number, number] = [camera.position.x, camera.position.y, camera.position.z]
      let trg: [number, number, number] = [0, 0, 0]
      if (controls) {
        // @ts-ignore
        trg = [controls.target.x, controls.target.y, controls.target.z]
      }
      adicionarCena(solicitouSalvarCena, pos, trg)
      setSolicitouSalvarCena(null)
    }
  }, [solicitouSalvarCena, camera, controls, adicionarCena, setSolicitouSalvarCena])

  // Transição suave para a cena desejada
  useFrame((_, delta) => {
    if (!cenaParaIr) return

    // Ajusta o passo de acordo com o delta time (4x delta)
    const step = Math.min(delta * 4, 1)

    // Interpola a posição da câmera
    const targetPos = new THREE.Vector3(...cenaParaIr.posicao)
    camera.position.lerp(targetPos, step)

    // Interpola o target do OrbitControls
    if (controls) {
      const targetTrg = new THREE.Vector3(...cenaParaIr.target)
      // @ts-ignore
      controls.target.lerp(targetTrg, step)
      // @ts-ignore
      controls.update()
    }

    camera.updateProjectionMatrix()

    // Verifica se chegou muito próximo
    const distPos = camera.position.distanceTo(targetPos)
    let distTrg = 0
    if (controls) {
      // @ts-ignore
      distTrg = controls.target.distanceTo(new THREE.Vector3(...cenaParaIr.target))
    }

    if (distPos < 0.01 && distTrg < 0.01) {
      camera.position.copy(targetPos)
      if (controls) {
        // @ts-ignore
        controls.target.copy(new THREE.Vector3(...cenaParaIr.target))
        // @ts-ignore
        controls.update()
      }
      setCenaParaIr(null)
    }
  })

  return null
}

export function Scene({
  mostrarRotulos,
  mostrarGrades,
  mostrarPista,
  mostrarGrama,
}: {
  mostrarRotulos: boolean
  mostrarGrades: boolean
  mostrarPista: boolean
  mostrarGrama: boolean
}) {
  const config = useProject((s) => s.config)
  const abaAtiva = useProject((s) => s.abaAtiva)
  const equipamentoCalibrando = useProject((s) => s.equipamentoCalibrando)
  const calibracoes = useProject((s) => s.calibracoes)
  const modelosDisponiveis = useModelosDisponiveis()
  const [menuCancela, setMenuCancela] = useState<AlvoCancela | null>(null)
  const [pesoVeiculoAberto, setPesoVeiculoAberto] = useState(false)
  const [parteVeiculo, setParteVeiculo] = useState<ParteVeiculo>('cavalo')
  const [identidadeAberta, setIdentidadeAberta] = useState(false)
  const menuAberta = useSimulator(s => menuCancela ? cancelaAberta(config, menuCancela.id, s.state) : false)
  const fecharMenuCancela = useCallback(() => setMenuCancela(null), [])
  useEffect(fecharMenuCancela, [abaAtiva, fecharMenuCancela])

  useEffect(() => {
    const atalhos: Record<string, [string, boolean]> = {
      q: ['cancela-entrada', true],
      a: ['cancela-entrada', false],
      w: ['cancela-saida', true],
      s: ['cancela-saida', false],
    }
    const controlarCancela = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.ctrlKey || event.altKey || event.metaKey || event.isComposing || event.repeat) return
      const target = event.target
      if (target instanceof HTMLElement && (target.closest('input, textarea, select, dialog') || target.isContentEditable)) return
      const { abaAtiva, config, setConfig } = useProject.getState()
      if (abaAtiva === 'calibracao') return
      const comando = atalhos[event.key.toLowerCase()]
      if (!comando) return
      const [id, aberta] = comando
      if (id === 'cancela-entrada' ? !config.cancelaEntrada : !config.cancelaSaida) return
      event.preventDefault()
      const canal = canalCancela(config, id)
      if (useSimulator.getState().state?.running && canal !== 'figurante') {
        void enviarCLP({ type: 'coil', address: canal === 'A' ? (aberta ? 2 : 3) : (aberta ? 4 : 5), value: true })
      } else setConfig('cancelasAbertas', { ...config.cancelasAbertas, [id]: aberta })
      fecharMenuCancela()
    }
    window.addEventListener('keydown', controlarCancela)
    return () => window.removeEventListener('keydown', controlarCancela)
  }, [fecharMenuCancela])

  const calib = calibracoes[equipamentoCalibrando] ?? {
    altura: 0,
    rotacaoY: 0,
    fixadorX: 0,
    fixadorY: 0,
    fixadorZ: 0,
  }

  const pecas: PieceInstance[] = useMemo(() => {
    if (abaAtiva === 'calibracao') {
      if (equipamentoCalibrando === 'veiculo') {
        const listaVeiculo: PieceInstance[] = [
          {
            id: 'balanca-calibracao',
            tipo: 'balanca',
            rotulo: 'Balança rodoviária',
            posicao: [0, 0, 0],
            rotacaoY: 0,
          },
          {
            id: 'veiculo',
            tipo: 'veiculo',
            modelo: MODELOS_VEICULO[config.modeloVeiculo === 'container' ? 'container' : 'padrao'].modelo,
            rotulo: 'Caminhão (Ilustrativo)',
            posicao: [0, calib.altura, 0],
            rotacaoY: 0,
          }
        ]
        return listaVeiculo
      }

      const tipoPoste =
        (equipamentoCalibrando === 'sensor-emissor' || equipamentoCalibrando === 'camera-ip-baixo')
          ? ('poste-1-5m' as const)
          : ('poste-3m' as const)

      const lista = [
        // --- Painel esquerdo: peça de referência PARADA; a bolinha rosa é
        // posicionada sobre ela para marcar o centro do fixador
        {
          id: 'periferico-referencia',
          tipo: equipamentoCalibrando,
          rotulo: `${CATALOGO[equipamentoCalibrando]?.nome ?? ''} (marque o fixador)`,
          posicao: [-1.2, 1.0, 0] as [number, number, number],
          rotacaoY: 0,
        },
        // --- Painel direito: preview montado no poste; altura e giro
        // acontecem em torno da âncora (= bolinha), nunca saindo do poste
        {
          id: 'periferico-montado',
          tipo: equipamentoCalibrando,
          rotulo: 'Montado (preview)',
          posicao: [1.2, calib.altura, 0] as [number, number, number],
          rotacaoY: (calib.rotacaoY * Math.PI) / 180,
          ancora: [calib.fixadorX, calib.fixadorY, calib.fixadorZ] as [number, number, number],
        },
      ]

      if (equipamentoCalibrando !== 'cancela') {
        lista.push({
          id: 'poste-calibracao',
          tipo: tipoPoste,
          rotulo: tipoPoste === 'poste-1-5m' ? 'Poste de 1,5 m' : 'Poste de 3,0 m',
          posicao: [1.2, 0, 0] as [number, number, number],
          rotacaoY: 0,
        })
      }

      return lista
    }
    return gerarLayout({ ...config, comprimentoBalanca: 16 }, calibracoes)
  }, [config, abaAtiva, equipamentoCalibrando, calibracoes, calib])

  return (
    <>
    <Canvas
      shadows
      camera={{ position: [18, 14, 18], fov: 45 }}
      gl={{ preserveDrawingBuffer: true }} // necessário para snapshots no PDF
    >
      <ExporCenaDev />
      <AtualizadorCamera abaAtiva={abaAtiva} />
      <ControladorCena />
      <CamerasCena pecas={pecas} ativo={abaAtiva !== 'calibracao'} />
      <color attach="background" args={['#ffffff']} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {abaAtiva !== 'calibracao' && (
        <Pista
          comprimentoBalanca={16}
          mostrarPista={mostrarPista}
          mostrarGrama={mostrarGrama}
        />
      )}
      {mostrarGrades && (
        <Grid
          userData={{ ocultarNoRtsp: true }}
          position={[0, 0.01, 0]}
          args={[80, 80]}
          cellSize={1}
          sectionSize={5}
          cellColor="#9aa7b0"
          sectionColor="#5f6e78"
          fadeDistance={70}
          infiniteGrid
        />
      )}
      {pecas.map((p) => (
        <Piece
          key={p.id}
          interativo
          onPesoVeiculo={() => setPesoVeiculoAberto(true)}
          onIdentidadeVeiculo={parte => { setParteVeiculo(parte); setPesoVeiculoAberto(true) }}
          instancia={p}
          modeloDisponivel={modelosDisponiveis.has(modeloDaPeca(p))}
          mostrarRotulos={mostrarRotulos}
          onMenuCancela={setMenuCancela}
        />
      ))}
      <SensoresCena pecas={pecas} ativo={abaAtiva !== 'calibracao'} />
      <LeitoresCena pecas={pecas} ativo={abaAtiva !== 'calibracao'} />
      <PesagemCena ativo={abaAtiva !== 'calibracao'} />
      {abaAtiva === 'calibracao' && equipamentoCalibrando !== 'veiculo' && (
        <>
          {/* Bolinha rosa sobre a peça de referência: marca o centro do
              fixador nas coordenadas locais do modelo */}
          <mesh
            position={[-1.2 + calib.fixadorX, 1.0 + calib.fixadorY, calib.fixadorZ]}
            renderOrder={10}
          >
            <sphereGeometry args={[0.035, 32, 32]} />
            <meshBasicMaterial color="#ff00ff" depthTest={false} transparent opacity={0.9} />
          </mesh>
          {/* Bolinha no preview montado: fica sempre no eixo do poste, na
              altura escolhida — é em torno dela que a peça gira */}
          <mesh position={[1.2, calib.altura, 0]} renderOrder={10}>
            <sphereGeometry args={[0.035, 32, 32]} />
            <meshBasicMaterial color="#ff00ff" depthTest={false} transparent opacity={0.9} />
          </mesh>
        </>
      )}
      <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
    {pesoVeiculoAberto && <PesoVeiculoModal fechar={() => setPesoVeiculoAberto(false)} ajustarIdentidade={() => { setPesoVeiculoAberto(false); setIdentidadeAberta(true) }} />}
    {identidadeAberta && <IdentidadeVeiculoModal parteInicial={parteVeiculo} fechar={() => setIdentidadeAberta(false)} peso={() => { setIdentidadeAberta(false); setPesoVeiculoAberto(true) }} />}
    {menuCancela && pecas.some((p) => p.id === menuCancela.id) && (
      <MenuCancela alvo={menuCancela} aberta={menuAberta}
        canal={canalCancela(config, menuCancela.id)} definirCanal={canal => useProject.getState().setConfig('canaisCancelas', { ...config.canaisCancelas, [menuCancela.id]: canal })}
        fechar={fecharMenuCancela} alterar={(aberta) => {
          const { config: atual, setConfig } = useProject.getState()
          const canal = canalCancela(atual, menuCancela.id)
          if (useSimulator.getState().state?.running && canal !== 'figurante') {
            void enviarCLP({ type: 'coil', address: canal === 'A' ? (aberta ? 2 : 3) : (aberta ? 4 : 5), value: true })
            fecharMenuCancela()
            return
          }
          setConfig('cancelasAbertas', { ...atual.cancelasAbertas, [menuCancela.id]: aberta })
          fecharMenuCancela()
        }} />
    )}
    </>
  )
}
