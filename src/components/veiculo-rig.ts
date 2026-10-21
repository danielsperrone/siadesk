import * as THREE from 'three'

export function criarVeiculoArticulado(original: THREE.Object3D) {
  const modelo = original.clone(true)
  const rodas: { pivot: THREE.Object3D; raio: number }[] = []
  modelo.traverse(pivot => {
    const raio = pivot.userData.wheelRadius
    if (typeof raio === 'number' && Number.isFinite(raio) && raio > 0) {
      rodas.push({ pivot, raio })
    }
  })
  return { modelo, rodas }
}

/** Distância assinada no eixo X local; rotação sem deslizamento: ângulo = distância / raio. */
export function girarRodas(rodas: ReturnType<typeof criarVeiculoArticulado>['rodas'], distancia: number) {
  for (const { pivot, raio } of rodas) {
    pivot.rotation.z = (pivot.rotation.z - distancia / raio) % (2 * Math.PI)
  }
}
