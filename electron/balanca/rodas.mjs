// Consulte a árvore atual: o grupo do veículo pode sobreviver à troca do modelo.
export function localizarRodas(vehicle, point) {
  const rodas = []
  vehicle.updateWorldMatrix(true, true)
  vehicle.traverse(roda => {
    const raio = roda.userData.wheelRadius
    if (typeof raio !== 'number' || !Number.isFinite(raio) || raio <= 0) return
    roda.getWorldPosition(point)
    rodas.push({ x: point.x, z: point.z })
  })
  return rodas
}
