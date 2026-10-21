import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PieceInstance } from '../types'
import { enviarCLP } from './store'

// Feixe transversal à pista: o caminhão ocupa o sensor quando seu volume
// mundial intercepta a linha na altura e posição longitudinal do equipamento.
export function sensorObstruido(sensor: THREE.Vector3, bounds: THREE.Box3) {
  return !bounds.isEmpty() && sensor.x >= bounds.min.x && sensor.x <= bounds.max.x
    && sensor.y >= bounds.min.y && sensor.y <= bounds.max.y
}

export function SensoresCena({ pecas, ativo }: { pecas: PieceInstance[]; ativo: boolean }) {
  const sensores = useMemo(() => pecas.filter(p => (p.tipo === 'sensor-emissor' || p.tipo === 'sensor-receptor') && (p.canalSensor === 'A' || p.canalSensor === 'B')), [pecas])
  const box = useMemo(() => new THREE.Box3(), [])
  const point = useMemo(() => new THREE.Vector3(), [])
  const elapsed = useRef(0), heartbeat = useRef(0), last = useRef('')
  useEffect(() => () => { if (window.clp) void enviarCLP({ type: 'sensors', A: false, B: false }) }, [])
  useFrame(({ scene }, delta) => {
    if (!window.clp) return
    elapsed.current += delta; heartbeat.current += delta
    if (elapsed.current < 0.05) return
    elapsed.current = 0
    const detected = { A: false, B: false }
    const vehicle = ativo ? scene.getObjectByName('veiculo') : undefined
    if (vehicle) {
      vehicle.updateWorldMatrix(true, true)
      box.setFromObject(vehicle)
      for (const sensor of sensores) {
        // O grupo da peça fica na altura de montagem, independente do fixador.
        const object = scene.getObjectByName(sensor.id)
        if (object && sensorObstruido(object.getWorldPosition(point), box)) detected[sensor.canalSensor as 'A' | 'B'] = true
      }
    }
    const signature = `${detected.A}:${detected.B}`
    if (signature !== last.current || heartbeat.current >= 0.5) {
      last.current = signature; heartbeat.current = 0
      void enviarCLP({ type: 'sensors', ...detected })
    }
  })
  return null
}
