import * as THREE from 'three'

/** Os GLBs do SketchUp têm Mesh1 (gabinete), Mesh2 (braço) e Mesh3 (eixo). */
export function criarCancelaArticulada(original: THREE.Object3D) {
  const modelo = original.clone(true)
  modelo.updateMatrixWorld(true)
  const braco = modelo.getObjectByName('Mesh2')
  const encaixe = modelo.getObjectByName('Mesh3')
  if (!braco || !encaixe) throw new Error('Modelo de cancela sem braço ou eixo separado.')

  const centroEixo = new THREE.Box3().setFromObject(encaixe).getCenter(new THREE.Vector3())
  const pivot = new THREE.Group()
  pivot.name = 'eixo-abertura-cancela'
  pivot.position.copy(modelo.worldToLocal(centroEixo))
  modelo.add(pivot)
  modelo.updateMatrixWorld(true)
  // attach preserva a posição, escala e materiais da exportação original.
  pivot.attach(braco)
  pivot.attach(encaixe)
  return { modelo, pivot }
}
