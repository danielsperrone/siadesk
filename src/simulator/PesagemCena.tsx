import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useProject } from '../store/project'
import { calcularApoio, PesoDinamico } from '../../electron/balanca/fisica.mjs'
import { localizarRodas } from '../../electron/balanca/rodas.mjs'
import { useBalanca, PESO_VAZIO } from './balanca'

export function PesagemCena({ ativo }: { ativo: boolean }) {
  const config = useProject(s => s.config)
  const timer = useRef(0), previousX = useRef<number | null>(null)
  const box = useMemo(() => new THREE.Box3(), [])
  const point = useMemo(() => new THREE.Vector3(), [])
  const physics = useMemo(() => new PesoDinamico(), [])
  useEffect(() => () => {
    window.balanca?.amostra(PESO_VAZIO)
    useBalanca.setState(s => ({ state: { ...s.state, ...PESO_VAZIO } }))
  }, [])
  useFrame(({ scene }, delta) => {
    timer.current += delta
    if (timer.current < 0.05) return
    const dt = timer.current; timer.current = 0
    const vehicle = ativo ? scene.getObjectByName('veiculo') : undefined
    const scale = scene.getObjectByName('balanca')
    const rodas = vehicle ? localizarRodas(vehicle, point) : []
    let sample = { ...PESO_VAZIO }
    if (vehicle && scale && rodas.length) {
      scale.updateWorldMatrix(true, true)
      box.setFromObject(scale)
      const apoio = calcularApoio(rodas, { minX: box.min.x, maxX: box.max.x, minZ: box.min.z, maxZ: box.max.z }, config.balancaTcp?.margemContato ?? 0.15)
      const pesoTotal = Math.max(0, Math.min(120000, config.pesoVeiculoKg ?? 40000))
      const x = rodas.reduce((sum, r) => sum + r.x, 0) / rodas.length
      const emMovimento = previousX.current !== null && Math.abs(x - previousX.current) / dt > 0.005
      previousX.current = x
      sample = { ...sample, alvo: pesoTotal * apoio.fracao, pesoTotal, emMovimento, rodasDentro: apoio.rodasDentro, totalRodas: apoio.totalRodas }
    } else previousX.current = null
    if (window.balanca) window.balanca.amostra(sample)
    else {
      physics.receber(sample)
      const reading = physics.avancar(dt)
      useBalanca.setState(s => ({ state: { ...s.state, ...reading } }))
    }
  })
  return null
}
