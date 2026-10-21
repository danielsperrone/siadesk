import { useEffect, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { PieceInstance } from '../types'
import { useSimulator } from '../simulator/store'
import { textoDisplay, useDisplays, velocidadeDisplay } from '../simulator/display'

// A superfície do display é inclinada no arquivo original. Projetar os UVs
// pela normal mantém o texto legível sem alterar a montagem/calibração.
function mapearTela(geometry: THREE.BufferGeometry) {
  const position = geometry.getAttribute('position')
  const normal = new THREE.Vector3().fromBufferAttribute(geometry.getAttribute('normal'), 0)
  const right = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), normal).normalize()
  const point = new THREE.Vector3()
  const xs: number[] = [], ys: number[] = []
  for (let i = 0; i < position.count; i++) {
    point.fromBufferAttribute(position, i)
    xs.push(point.dot(right))
    ys.push(point.y)
  }
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys), maxY = Math.max(...ys)
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(xs.flatMap((x, i) => [
    (x - minX) / (maxX - minX), (ys[i] - minY) / (maxY - minY),
  ]), 2))
}

export function ModeloSinalizacao({ url, instancia }: { url: string; instancia: PieceInstance }) {
  const remoto = useDisplays(s => s.estados[instancia.id])
  const mensagem = instancia.displayTcp?.ativo ? textoDisplay(remoto) : instancia.mensagemDisplay ?? 'SIAMAC'
  const estado = useSimulator(s => s.state?.running && instancia.canalSemaforo && instancia.canalSemaforo !== 'figurante'
    ? s.state.lights[instancia.canalSemaforo] : instancia.estadoSemaforo ?? 'vermelho')
  const { scene } = useGLTF(url)
  const rig = useMemo(() => {
    const modelo = scene.clone(true)
    const materiais: THREE.Material[] = []
    const geometrias: THREE.BufferGeometry[] = []
    const lentes: { material: THREE.MeshStandardMaterial; cor: 'verde' | 'vermelho' }[] = []
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 152
    const contexto = canvas.getContext('2d')!
    const textura = new THREE.CanvasTexture(canvas)
    textura.colorSpace = THREE.SRGBColorSpace
    modelo.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return
      const transformar = (original: THREE.Material) => {
        const vermelho = original.name === 'Color_A05'
        const verde = original.name === 'Color_G05'
        if (instancia.tipo === 'semaforo' && (vermelho || verde)) {
          const material = (original as THREE.MeshStandardMaterial).clone()
          materiais.push(material)
          lentes.push({ material, cor: verde ? 'vermelho' : 'verde' })
          return material
        }
        if (instancia.tipo === 'display-mensagens' && vermelho) {
          obj.geometry = obj.geometry.clone()
          geometrias.push(obj.geometry)
          mapearTela(obj.geometry)
          const material = new THREE.MeshBasicMaterial({ map: textura, toneMapped: false, side: original.side })
          material.name = 'letreiro-mensagem'
          materiais.push(material)
          return material
        }
        return original
      }
      obj.material = Array.isArray(obj.material) ? obj.material.map(transformar) : transformar(obj.material)
    })
    return { modelo, materiais, geometrias, lentes, contexto, textura, deslocamento: 0, larguraTexto: 0, texto: '' }
  }, [scene, instancia.tipo])

  useEffect(() => {
    for (const { material, cor } of rig.lentes) {
      const ligada = estado === cor
      material.color.set(ligada ? (cor === 'verde' ? '#00ed55' : '#ff2020') : (cor === 'verde' ? '#07351b' : '#400909'))
      material.emissive.set(ligada ? (cor === 'verde' ? '#00ed55' : '#ff2020') : '#000000')
      material.emissiveIntensity = ligada ? 1.5 : 0
      material.toneMapped = !ligada
    }
  }, [rig, estado])

  useEffect(() => {
    rig.texto = mensagem.trim()
    rig.contexto.font = 'bold 108px monospace'
    rig.larguraTexto = rig.contexto.measureText(rig.texto).width
    rig.deslocamento = 0
  }, [rig, mensagem])

  useFrame((_, delta) => {
    if (instancia.tipo !== 'display-mensagens') return
    if (instancia.displayTcp?.ativo && (remoto?.modo === 'relogio' || remoto?.modo === 'data')) {
      rig.texto = textoDisplay(remoto)
      rig.larguraTexto = rig.contexto.measureText(rig.texto).width
    }
    const ctx = rig.contexto
    ctx.fillStyle = '#400707'
    ctx.fillRect(0, 0, 1024, 152)
    if (rig.texto) {
      // Distância constante por segundo, independente da taxa de quadros.
      const ciclo = Math.max(1024, rig.larguraTexto + 160)
      rig.deslocamento = (rig.deslocamento + Math.min(delta, 0.1) * 140 * velocidadeDisplay(instancia.velocidadeDisplay)) % ciclo
      ctx.fillStyle = '#ff4940'
      ctx.textBaseline = 'middle'
      ctx.fillText(rig.texto, 32 - rig.deslocamento, 80)
      ctx.fillText(rig.texto, 32 - rig.deslocamento + ciclo, 80)
    }
    rig.textura.needsUpdate = true
  })

  useEffect(() => () => {
    rig.materiais.forEach((material) => material.dispose())
    rig.geometrias.forEach((geometry) => geometry.dispose())
    rig.textura.dispose()
  }, [rig])

  return <primitive object={rig.modelo} dispose={null} />
}
