import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useProject } from '../store/project'
import { identidadePadrao, pontosVeiculo } from './leitura'

function Placa({ texto, traseira }: { texto: string; traseira: boolean }) {
  const texture = useMemo(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 176
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f7f7f4'; ctx.fillRect(0, 0, 512, 176)
    ctx.fillStyle = '#1856a0'; ctx.fillRect(0, 0, 512, 34)
    ctx.fillStyle = 'white'; ctx.font = 'bold 22px Arial'; ctx.textAlign = 'center'; ctx.fillText('BRASIL', 256, 26)
    ctx.fillStyle = '#111820'; ctx.font = 'bold 100px Arial'; ctx.fillText(texto, 256, 137, 490)
    const t = new THREE.CanvasTexture(canvas); t.colorSpace = THREE.SRGBColorSpace; return t
  }, [texto])
  useEffect(() => () => texture.dispose(), [texture])
  return <mesh position={[...pontosVeiculo[traseira ? 'reboque' : 'cavalo'].placa]} rotation={[0, traseira ? Math.PI / 2 : -Math.PI / 2, 0]}>
    {/* O alojamento traseiro mede 547 × 153 mm; preserve sua moldura. */}
    <planeGeometry args={traseira ? [.543, .149] : [.52, .18]} /><meshBasicMaterial map={texture} />
  </mesh>
}
export function PlacasVeiculo() {
  const ids = useProject(s => s.config.identidadesVeiculo ?? identidadePadrao)
  return <><Placa texto={ids.cavalo.placa} traseira={false} /><Placa texto={ids.reboque.placa} traseira /></>
}
