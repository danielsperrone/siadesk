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

export function Scene({ mostrarRotulos }: { mostrarRotulos: boolean }) {
  const config = useProject((s) => s.config)
  const modelosDisponiveis = useModelosDisponiveis()
  const pecas = useMemo(() => gerarLayout(config), [config])

  return (
    <Canvas
      shadows
      camera={{ position: [18, 14, 18], fov: 45 }}
      gl={{ preserveDrawingBuffer: true }} // necessário para snapshots no PDF
    >
      <ExporCenaDev />
      <color attach="background" args={['#cfe0ec']} />
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[20, 30, 10]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[2048, 2048]}
      />
      <Pista comprimentoBalanca={config.comprimentoBalanca} />
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
