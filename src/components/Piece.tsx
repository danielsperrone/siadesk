import { Suspense } from 'react'
import { Html, useGLTF } from '@react-three/drei'
import { CATALOGO } from '../catalog/pieces'
import type { PieceInstance } from '../types'

interface PieceProps {
  instancia: PieceInstance
  modeloDisponivel: boolean
  mostrarRotulos: boolean
}

// Renderiza o GLB exportado do SketchUp. Convenção dos modelos:
// unidades em metros, origem no centro da base da peça, frente para +X.
function ModeloGlb({ url }: { url: string }) {
  const { scene } = useGLTF(url)
  return <primitive object={scene.clone()} />
}

function Placeholder({ instancia }: { instancia: PieceInstance }) {
  const tipo = CATALOGO[instancia.tipo]
  const [cx, cy, cz] = tipo.placeholder
  return (
    <mesh position={[0, cy / 2, 0]} castShadow receiveShadow>
      <boxGeometry args={[cx, cy, cz]} />
      <meshStandardMaterial color={tipo.cor} />
    </mesh>
  )
}

export function Piece({ instancia, modeloDisponivel, mostrarRotulos }: PieceProps) {
  const tipo = CATALOGO[instancia.tipo]
  const alturaRotulo = tipo.placeholder[1] + 0.6

  return (
    <group position={instancia.posicao} rotation={[0, instancia.rotacaoY, 0]}>
      {modeloDisponivel ? (
        <Suspense fallback={<Placeholder instancia={instancia} />}>
          <ModeloGlb url={`models/${tipo.modelo}.glb`} />
        </Suspense>
      ) : (
        <Placeholder instancia={instancia} />
      )}
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
