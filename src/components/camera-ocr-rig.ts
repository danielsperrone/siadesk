import * as THREE from 'three'
import { PIVO_OCR, rotacaoOcr } from '../simulator/optica-ocr'

export function criarCameraOcrArticulada(original: THREE.Object3D) {
  const modelo = original.clone(true)
  const cabeca = new THREE.Group()
  cabeca.name = 'camera-ocr-articulacao'
  cabeca.position.copy(PIVO_OCR)
  modelo.add(cabeca)
  modelo.updateMatrixWorld(true)
  for (const nome of ['Mesh6', 'Mesh7', 'Mesh8']) {
    const parte = modelo.getObjectByName(nome)
    if (!parte) throw new Error(`Cabeça da câmera OCR incompleta: ${nome}`)
    cabeca.attach(parte)
  }
  return { modelo, cabeca }
}
export function inclinarCameraOcr(cabeca: THREE.Object3D, graus?: number) {
  cabeca.quaternion.copy(rotacaoOcr(graus))
}
