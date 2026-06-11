import { useEffect, useMemo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import { gerarLayout } from '../layout/engine'
import { COMPRIMENTO_PISTA_CENA, LARGURA_PISTA } from '../layout/constants'
import { useProject } from '../store/project'
import { useModelosDisponiveis } from '../hooks/useModelosDisponiveis'
import { CATALOGO } from '../catalog/pieces'
import { Piece } from './Piece'

function Pista({ comprimentoBalanca }: { comprimentoBalanca: number }) {
  const comprimentoTotal = comprimentoBalanca + 2 * COMPRIMENTO_PISTA_CENA
  return (
    <group>
      {/* Faixa de asfalto ao longo do fluxo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[comprimentoTotal, LARGURA_PISTA]} />
        <meshStandardMaterial color="#3a3d40" />
      </mesh>
      {/* Terreno */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]} receiveShadow>
        <planeGeometry args={[comprimentoTotal + 20, 60]} />
        <meshStandardMaterial color="#6b7d5e" />
      </mesh>
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
  useEffect(() => {
    if (abaAtiva === 'calibracao') {
      camera.position.set(6, 4, 6)
      if (controls) {
        // @ts-ignore
        controls.target.set(0, 1.5, 0)
        // @ts-ignore
        controls.update()
      }
    } else {
      camera.position.set(18, 14, 18)
      if (controls) {
        // @ts-ignore
        controls.target.set(0, 0, 0)
        // @ts-ignore
        controls.update()
      }
    }
    camera.updateProjectionMatrix()
  }, [abaAtiva, camera, controls])
  return null
}

export function Scene({ mostrarRotulos }: { mostrarRotulos: boolean }) {
  const config = useProject((s) => s.config)
  const abaAtiva = useProject((s) => s.abaAtiva)
  const equipamentoCalibrando = useProject((s) => s.equipamentoCalibrando)
  const calibracoes = useProject((s) => s.calibracoes)
  const modelosDisponiveis = useModelosDisponiveis()

  const pecas = useMemo(() => {
    if (abaAtiva === 'calibracao') {
      const calib = calibracoes[equipamentoCalibrando] || { altura: 0, rotacaoY: 0, offsetX: 0, offsetZ: 0 }
      const tipoPoste = equipamentoCalibrando === 'sensor-emissor' ? 'poste-1-5m' : 'poste-3m'
      return [
        {
          id: 'poste-calibracao',
          tipo: tipoPoste,
          rotulo: tipoPoste === 'poste-1-5m' ? 'Poste de 1,5 m' : 'Poste de 3,0 m',
          posicao: [0, 0, 0] as [number, number, number],
          rotacaoY: 0,
        },
        {
          id: 'periferico-calibracao',
          tipo: equipamentoCalibrando,
          rotulo: CATALOGO[equipamentoCalibrando]?.nome || '',
          posicao: [
            calib.offsetX * Math.cos(calib.rotacaoY * Math.PI / 180) - calib.offsetZ * Math.sin(calib.rotacaoY * Math.PI / 180),
            calib.altura,
            calib.offsetX * Math.sin(calib.rotacaoY * Math.PI / 180) + calib.offsetZ * Math.cos(calib.rotacaoY * Math.PI / 180),
          ] as [number, number, number],
          rotacaoY: calib.rotacaoY * Math.PI / 180,
        }
      ]
    }
    return gerarLayout(config, calibracoes)
  }, [config, abaAtiva, equipamentoCalibrando, calibracoes])

  return (
    <Canvas
      shadows
      camera={{ position: [18, 14, 18], fov: 45 }}
      gl={{ preserveDrawingBuffer: true }} // necessário para snapshots no PDF
    >
      <ExporCenaDev />
      <AtualizadorCamera abaAtiva={abaAtiva} />
      <color attach="background" args={['#cfe0ec']} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      {abaAtiva !== 'calibracao' && <Pista comprimentoBalanca={config.comprimentoBalanca} />}
      <Grid
        position={[0, 0.01, 0]}
        args={[80, 80]}
        cellSize={1}
        sectionSize={5}
        cellColor="#9aa7b0"
        sectionColor="#5f6e78"
        fadeDistance={70}
        infiniteGrid
      />
      {pecas.map((p) => (
        <Piece
          key={p.id}
          instancia={p}
          modeloDisponivel={modelosDisponiveis.has(CATALOGO[p.tipo].modelo)}
          mostrarRotulos={mostrarRotulos}
        />
      ))}
      <OrbitControls makeDefault target={[0, 0, 0]} maxPolarAngle={Math.PI / 2.05} />
    </Canvas>
  )
}
