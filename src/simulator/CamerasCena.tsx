import { useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useProject } from '../store/project'
import type { PieceInstance } from '../types'
import { camerasDesligadas, CONFIG_CAMERAS, ehCamera, posicionarCamera, useCameras } from './cameras'
import { dimensoesCamera } from './optica-ocr'

export function CamerasCena({ pecas, ativo }: { pecas: PieceInstance[]; ativo: boolean }) {
  const { gl, scene } = useThree()
  const config = useProject(s => s.config.simuladorCameras ?? CONFIG_CAMERAS)
  const pecasRef = useRef(pecas)
  pecasRef.current = pecas
  const configRef = useRef(config), ativoRef = useRef(ativo)
  configRef.current = config; ativoRef.current = ativo
  const spec = JSON.stringify({ ...config, ativa: ativo,
    cameras: pecas.filter(p => ehCamera(p.tipo) && p.cameraRtsp?.ativa === true).map(p => ({ id: p.id, nome: p.rotulo })) })

  useEffect(() => {
    const api = window.cameras
    if (!api) return
    const unsub = api.onEstado(estado => useCameras.setState({ estado, erro: '' }))
    return () => {
      unsub()
      void api.configurar({ ...CONFIG_CAMERAS, ativa: false, cameras: [] }).catch(() => {})
      useCameras.setState({ estado: camerasDesligadas, preview: null })
    }
  }, [])
  useEffect(() => {
    let atual = true
    useCameras.setState({ erro: '', preview: null })
    void window.cameras?.configurar(JSON.parse(spec)).catch(error => {
      if (atual) useCameras.setState({ erro: String(error) })
    })
    return () => { atual = false }
  }, [spec])

  useEffect(() => {
    let fim = false, timer: ReturnType<typeof setTimeout>, indice = 0
    let target: THREE.WebGLRenderTarget | undefined, pixels = new Uint8Array(0)
    const camera = new THREE.PerspectiveCamera(45, 16 / 9, .025, 180)
    const canvas = document.createElement('canvas'), ctx = canvas.getContext('2d')
    const viewport = new THREE.Vector4(), scissor = new THREE.Vector4()
    const capturar = async () => {
      const inicio = performance.now()
      const { estado, previewId } = useCameras.getState()
      const transmitindo = ativoRef.current && estado.fase === 'executando'
      const lista: { id: string }[] = transmitindo ? estado.cameras.filter(c => !c.erro) : []
      if (ativoRef.current && previewId && !lista.some(c => c.id === previewId) && pecasRef.current.some(p => p.id === previewId && ehCamera(p.tipo))) lista.push({ id: previewId })
      const dimensoes = transmitindo ? { largura: estado.largura, altura: estado.altura } : dimensoesCamera(configRef.current.largura)
      const fps = transmitindo ? estado.fps : configRef.current.fps
      const intervalo = lista.length ? Math.max(1000 / (fps * lista.length), 1000 * dimensoes.largura * dimensoes.altura / (12 * 640 * 360)) : 250
      try {
        if (!lista.length) return
        const item = lista[indice++ % lista.length], peca = pecasRef.current.find(p => p.id === item.id)
        const objeto = peca && scene.getObjectByName(peca.id)
        if (!peca || !objeto || gl.getContext().isContextLost()) return
        if (!target || target.width !== dimensoes.largura || target.height !== dimensoes.altura) {
          target?.dispose()
          target = new THREE.WebGLRenderTarget(dimensoes.largura, dimensoes.altura, { depthBuffer: true, generateMipmaps: false })
          target.texture.colorSpace = THREE.SRGBColorSpace
          pixels = new Uint8Array(dimensoes.largura * dimensoes.altura * 4)
          canvas.width = dimensoes.largura; canvas.height = dimensoes.altura
        }
        camera.aspect = target.width / target.height
        posicionarCamera(camera, peca, objeto)
        const anterior = gl.getRenderTarget(), autoClear = gl.autoClear, scissorTest = gl.getScissorTest()
        const shadow = gl.shadowMap.autoUpdate, shadowNeedsUpdate = gl.shadowMap.needsUpdate, xr = gl.xr.enabled
        gl.getViewport(viewport); gl.getScissor(scissor)
        const ocultos: THREE.Object3D[] = []
        scene.traverse(o => { if (o.visible && (o === objeto || o.userData.ocultarNoRtsp)) { ocultos.push(o); o.visible = false } })
        try {
          gl.xr.enabled = false; gl.autoClear = true; gl.shadowMap.autoUpdate = false; gl.shadowMap.needsUpdate = false
          gl.setRenderTarget(target); gl.setViewport(0, 0, target.width, target.height); gl.setScissorTest(false)
          gl.render(scene, camera)
          gl.readRenderTargetPixels(target, 0, 0, target.width, target.height, pixels)
        } finally {
          ocultos.forEach(o => { o.visible = true })
          gl.setRenderTarget(anterior); gl.setViewport(viewport); gl.setScissor(scissor); gl.setScissorTest(scissorTest)
          gl.autoClear = autoClear; gl.shadowMap.autoUpdate = shadow; gl.shadowMap.needsUpdate = shadowNeedsUpdate; gl.xr.enabled = xr
        }
        if (previewId === item.id && ctx) {
          const frame = ctx.createImageData(target.width, target.height), stride = target.width * 4
          for (let y = 0; y < target.height; y++) frame.data.set(pixels.subarray(y * stride, (y + 1) * stride), (target.height - 1 - y) * stride)
          ctx.putImageData(frame, 0, 0)
          useCameras.setState({ preview: canvas.toDataURL('image/jpeg', .8) })
        }
        // Um único quadro em trânsito. Só captura novamente depois que o encoder aceitar.
        if (transmitindo && peca.cameraRtsp?.ativa) await window.cameras?.quadro(estado.sessao, item.id, pixels)
      } catch (error) {
        if (!fim) useCameras.setState({ erro: `Não foi possível gerar a imagem: ${String(error)}` })
      } finally {
        if (!fim) timer = setTimeout(() => void capturar(), Math.max(10, intervalo - (performance.now() - inicio)))
      }
    }
    timer = setTimeout(() => void capturar(), 100)
    return () => { fim = true; clearTimeout(timer); target?.dispose() }
  }, [gl, scene])
  return null
}
