import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useProject } from '../store/project'
import { gerarLayout } from '../layout/engine'
import type { PieceInstance } from '../types'
import { dentroCone, identidadePadrao, opticaLeitor, pontosVeiculo, useLeitura } from './leitura'
import { campoHorizontal, campoVertical, dentroCampoCamera, dimensoesCamera } from './optica-ocr'

export function LeitoresBridge() {
  const config = useProject(s => s.config), cal = useProject(s => s.calibracoes), ativo = useProject(s => s.projetoAtivo), aba = useProject(s => s.abaAtiva)
  const items = JSON.stringify(ativo && aba !== 'calibracao' ? gerarLayout(config, cal).filter(p => p.leitor?.ativo).map(p => ({ id: p.id, tipo: p.tipo, config: p.leitor })) : [])
  useEffect(() => window.leitores?.onState(estados => useLeitura.setState({ estados })), [])
  useEffect(() => {
    let atual = true
    if (window.leitores) void window.leitores.configurar(JSON.parse(items)).then(r => { if (atual) useLeitura.setState({ erro: r.error ?? '' }) }).catch(() => { if (atual) useLeitura.setState({ erro: 'Não foi possível configurar os leitores.' }) })
    return () => { atual = false }
  }, [items])
  useEffect(() => () => { void window.leitores?.configurar([]) }, [])
  return null
}

export function LeitoresCena({ pecas, ativo }: { pecas: PieceInstance[]; ativo: boolean }) {
  const identidades = useProject(s => s.config.identidadesVeiculo ?? identidadePadrao)
  const leitores = useMemo(() => pecas.filter(p => p.leitor?.ativo), [pecas])
  const largura = useProject(s => s.config.simuladorCameras?.largura ?? 640)
  const dimensoes = dimensoesCamera(largura), aspecto = dimensoes.largura / dimensoes.altura
  const elapsed = useRef(0), last = useRef('')
  useEffect(() => () => { window.leitores?.detectar([]); useLeitura.setState({ deteccoes: {} }) }, [])
  useFrame(({ scene }, delta) => {
    elapsed.current += delta
    if (elapsed.current < .1) return
    elapsed.current = 0
    const vehicle = ativo ? scene.getObjectByName('veiculo') : undefined
    const deteccoes: Record<string, string> = {}
    vehicle?.updateWorldMatrix(true, false)
    const items = leitores.map(p => {
      const valores: string[] = [], obj = scene.getObjectByName(p.id), c = p.leitor!
      if (vehicle && obj) {
        obj.updateWorldMatrix(true, false)
        const { origem, direcao } = opticaLeitor(p.tipo, p.cameraRtsp?.inclinacao)
        origem.sub(new THREE.Vector3(...(p.ancora ?? [0, 0, 0]))).applyMatrix4(obj.matrixWorld)
        direcao.transformDirection(obj.matrixWorld)
        for (const parte of ['cavalo', 'reboque'] as const) {
          const point = new THREE.Vector3(...pontosVeiculo[parte][p.tipo === 'leitor-rfid' ? 'rfid' : 'placa']).applyMatrix4(vehicle.matrixWorld)
          const dentro = p.tipo === 'leitor-rfid'
            ? dentroCone(point, origem, direcao, c.alcance, c.abertura)
            : dentroCampoCamera(point, origem, direcao, c.alcance, campoHorizontal(p), campoVertical(p, aspecto))
          if (dentro) valores.push(...(p.tipo === 'leitor-rfid' ? identidades[parte].tags : [identidades[parte].placa]))
        }
      }
      if (valores.length) deteccoes[p.id] = valores.join(', ')
      return { id: p.id, valores }
    })
    window.leitores?.detectar(items)
    const signature = JSON.stringify(deteccoes)
    if (signature !== last.current) { last.current = signature; useLeitura.setState({ deteccoes }) }
  })
  return null
}

export function ConeLeitor({ instancia }: { instancia: PieceInstance }) {
  const c = instancia.leitor
  const largura = useProject(s => s.config.simuladorCameras?.largura ?? 640)
  const { origem, direcao } = opticaLeitor(instancia.tipo, instancia.cameraRtsp?.inclinacao)
  if (!c?.mostrarCone) return null
  origem.sub(new THREE.Vector3(...(instancia.ancora ?? [0, 0, 0])))
  if (instancia.tipo === 'camera-ocr') {
    const dimensoes = dimensoesCamera(largura)
    const direita = direcao.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
    const cima = direita.clone().cross(direcao).normalize(), centro = origem.clone().addScaledVector(direcao, c.alcance)
    const w = c.alcance * Math.tan(campoHorizontal(instancia) * Math.PI / 360)
    const h = c.alcance * Math.tan(campoVertical(instancia, dimensoes.largura / dimensoes.altura) * Math.PI / 360)
    const cantos = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => centro.clone().addScaledVector(direita, x * w).addScaledVector(cima, y * h))
    const vertices = cantos.flatMap((p, i) => [...origem.toArray(), ...p.toArray(), ...cantos[(i + 1) % 4].toArray()])
    return <mesh userData={{ ocultarNoRtsp: true }} raycast={() => null}>
      <bufferGeometry><bufferAttribute attach="attributes-position" args={[new Float32Array(vertices), 3]} /></bufferGeometry>
      <meshBasicMaterial color="#18a88c" transparent opacity={.13} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  }
  const centro = origem.addScaledVector(direcao, c.alcance / 2)
  const rotacao = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), direcao)
  return <mesh userData={{ ocultarNoRtsp: true }} position={centro} quaternion={rotacao} raycast={() => null}>
    <coneGeometry args={[c.alcance * Math.tan(c.abertura * Math.PI / 360), c.alcance, 40, 1, true]} />
    <meshBasicMaterial color={instancia.tipo === 'leitor-rfid' ? '#428de0' : '#18a88c'} transparent opacity={.13} side={THREE.DoubleSide} depthWrite={false} />
  </mesh>
}
