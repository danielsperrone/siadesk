import { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { criarCameraOcrArticulada, inclinarCameraOcr } from './camera-ocr-rig'

export function ModeloCameraOcr({ url, inclinacao }: { url: string; inclinacao?: number }) {
  const { scene } = useGLTF(url)
  const { modelo, cabeca } = useMemo(() => criarCameraOcrArticulada(scene), [scene])
  inclinarCameraOcr(cabeca, inclinacao)
  return <primitive object={modelo} dispose={null} />
}
