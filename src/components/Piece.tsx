import { Suspense } from 'react'
import { Html, useGLTF } from '@react-three/drei'
import { CATALOGO } from '../catalog/pieces'
import type { PieceInstance } from '../types'
import { useProject } from '../store/project'

interface PieceProps {
  instancia: PieceInstance
  modeloDisponivel: boolean
  mostrarRotulos: boolean
}

// Renderiza o GLB exportado do SketchUp. Convenção dos modelos:
// unidades em metros, origem no centro da base da peça, frente para +X.
function ModeloGlb({ url, scale }: { url: string; scale?: [number, number, number] }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} scale={scale} />
}

function Placeholder({ instancia, config }: { instancia: PieceInstance; config: any }) {
  const tipo = CATALOGO[instancia.tipo]
  const cx = instancia.tipo === 'balanca' ? 16 : tipo.placeholder[0]
  const cy = tipo.placeholder[1]
  const cz = instancia.tipo === 'balanca' ? config.larguraBalanca : tipo.placeholder[2]
  return (
    <mesh position={[0, cy / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[cx, cy, cz]} />
      <meshStandardMaterial color={tipo.cor} />
    </mesh>
  )
}

export function Piece({ instancia, modeloDisponivel, mostrarRotulos }: PieceProps) {
  const config = useProject((s) => s.config)
  const tipo = CATALOGO[instancia.tipo]
  const alturaRotulo = tipo.placeholder[1] + 0.6
  // Com âncora definida, o modelo é deslocado para que o ponto de ancoragem
  // (centro do fixador) caia na origem do grupo: posição e giro do grupo
  // passam a acontecer em torno da âncora, não da origem do modelo
  const [ax, ay, az] = instancia.ancora ?? [0, 0, 0]

  const escalaX = instancia.tipo === 'balanca' ? 16 / 14.91 : 1
  const escalaZ = instancia.tipo === 'balanca' ? config.larguraBalanca / 3.20 : 1
  const scale: [number, number, number] = [escalaX, 1, escalaZ]

  return (
    <group position={instancia.posicao} rotation={[0, instancia.rotacaoY, 0]}>
      <group position={[-ax, -ay, -az]}>
        {modeloDisponivel ? (
          <Suspense fallback={<Placeholder instancia={instancia} config={config} />}>
            <ModeloGlb url={`models/${tipo.modelo}.glb`} scale={scale} />
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

