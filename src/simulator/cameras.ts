import { create } from 'zustand'
import * as THREE from 'three'
import type { PieceInstance } from '../types'
import { opticaLeitor } from './leitura'
import { campoHorizontal } from './optica-ocr'

export interface ConfigCamera {
  ativa: boolean; abertura: number; host?: string
  perfil?: 'generica' | 'intelbras-vip-5460-lpr-ia'
  focalMm?: number
  /** Ângulo óptico absoluto: negativo para baixo, positivo para cima. */
  inclinacao?: number
  distanciaReferencia?: number
}
export interface ConfigCameras { fps: number; largura: number; porta: number }
export interface EstadoCameras {
  fase: 'desligado' | 'iniciando' | 'executando' | 'erro'
  mensagem: string
  sessao: number
  fps: number
  largura: number
  altura: number
  porta: number
  hosts: string[]
  cameras: { id: string; nome: string; caminho: string; pronta: boolean; erro?: string }[]
}
export const CONFIG_CAMERAS: ConfigCameras = { fps: 2, largura: 640, porta: 8554 }
export const camerasDesligadas: EstadoCameras = { fase: 'desligado', mensagem: 'Câmeras desligadas', sessao: 0, fps: 2, largura: 640, altura: 360, porta: 8554, hosts: ['127.0.0.1'], cameras: [] }
export const useCameras = create<{
  estado: EstadoCameras; erro: string; previewId: string | null; preview: string | null
}>(() => ({ estado: camerasDesligadas, erro: '', previewId: null, preview: null }))
export function ehCamera(tipo: string) { return ['camera-ip', 'camera-ip-baixo', 'camera-ocr'].includes(tipo) }
export function aberturaCamera(p: Pick<PieceInstance, 'tipo' | 'cameraRtsp' | 'leitor'>) {
  return campoHorizontal(p)
}

// Mesmo caminho usado pelo servidor: disponível para copiar mesmo com a câmera parada.
export async function caminhoCamera(id: string) {
  const slug = id.normalize('NFKD').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || 'camera'
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id))
  const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('').slice(0, 10)
  return `camera/${slug}-${hash}`
}

// Centros das lentes e normais das faces dos GLBs, antes da âncora e da rotação.
// A OCR compartilha a óptica com o simulador de leitura da placa.
export function opticaCamera(tipo: string, inclinacao?: number) {
  if (tipo === 'camera-ocr') return opticaLeitor(tipo, inclinacao)
  return tipo === 'camera-ip-baixo'
    ? { origem: new THREE.Vector3(-.07652, .02677, -.09396), direcao: new THREE.Vector3(-.418601, -.724172, -.548041).normalize() }
    : { origem: new THREE.Vector3(-.14062, .06467, -.06511), direcao: new THREE.Vector3(-.92303, 0, -.384729).normalize() }
}
export function posicionarCamera(camera: THREE.PerspectiveCamera, p: PieceInstance, objeto: THREE.Object3D) {
  objeto.updateWorldMatrix(true, false)
  const { origem, direcao } = opticaCamera(p.tipo, p.cameraRtsp?.inclinacao)
  origem.sub(new THREE.Vector3(...(p.ancora ?? [0, 0, 0]))).applyMatrix4(objeto.matrixWorld)
  direcao.transformDirection(objeto.matrixWorld)
  camera.position.copy(origem)
  camera.up.set(0, 1, 0).transformDirection(objeto.matrixWorld)
  // O controle mostra a abertura horizontal; Three.js recebe a abertura vertical.
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(aberturaCamera(p) / 2)) / camera.aspect))
  camera.lookAt(origem.clone().add(direcao))
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
}

declare global {
  interface Window { cameras?: {
    estado: () => Promise<EstadoCameras>
    configurar: (config: ConfigCameras & { ativa: boolean; cameras: { id: string; nome: string }[] }) => Promise<void>
    quadro: (sessao: number, id: string, pixels: Uint8Array) => Promise<boolean>
    onEstado: (callback: (state: EstadoCameras) => void) => () => void
  } }
}
