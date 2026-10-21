import { create } from 'zustand'
import * as THREE from 'three'
import { opticaOcr } from './optica-ocr'

export type ParteVeiculo = 'cavalo' | 'reboque'
export interface IdentidadeVeiculo { placa: string; tags: string[] }
export interface ConfigLeitor {
  ativo: boolean; ip: string; porta: number; modo: 'tcp' | 'http'
  alcance: number; abertura: number; mostrarCone: boolean
}
export interface EstadoLeitor { running: boolean; clients: number; error?: string; ultimo?: string; enviados: number }
export const TAGS = Array.from({ length: 100 }, (_, i) => String(i + 1).padStart(24, '0'))
export const identidadePadrao: Record<ParteVeiculo, IdentidadeVeiculo> = {
  cavalo: { placa: 'ABC1D23', tags: [] }, reboque: { placa: 'XYZ4E56', tags: [] },
}
export const pontosVeiculo = {
  cavalo: { rfid: [-6.55, 2.25, 0], placa: [-6.94, 0.58, 0] },
  // Centro do alojamento da placa no GLB (face X=6.780034), com 1 mm
  // de afastamento para evitar sobreposição de superfícies na renderização.
  reboque: { rfid: [6.93, 2.1, 0], placa: [6.781034, 0.485763, 0.041394] },
} as const
export function padraoLeitor(tipo: string): ConfigLeitor {
  return { ativo: false, ip: '127.0.0.1', porta: tipo === 'leitor-rfid' ? 8080 : 3004, modo: 'tcp', alcance: 8, abertura: 45, mostrarCone: false }
}
// Centros e normais das faces emissoras dos GLBs, antes da calibração/âncora.
export function opticaLeitor(tipo: string, inclinacao?: number) {
  return tipo === 'leitor-rfid'
    ? { origem: new THREE.Vector3(.021, .3105, -.0283), direcao: new THREE.Vector3(.54464, 0, -.83867).normalize() }
    : opticaOcr(inclinacao)
}
/** Cone finito: alcance axial e abertura total em graus. */
export function dentroCone(ponto: THREE.Vector3, origem: THREE.Vector3, direcao: THREE.Vector3, alcance: number, abertura: number) {
  const v = ponto.clone().sub(origem), eixo = direcao.clone().normalize()
  const axial = v.dot(eixo)
  return axial > 0 && axial <= alcance && v.lengthSq() - axial * axial <= (axial * Math.tan(abertura * Math.PI / 360)) ** 2 + 1e-9
}
export const useLeitura = create<{ estados: Record<string, EstadoLeitor>; erro: string; deteccoes: Record<string, string> }>(() => ({ estados: {}, erro: '', deteccoes: {} }))
declare global {
  interface Window { leitores?: {
    configurar: (items: { id: string; tipo: string; config: ConfigLeitor }[]) => Promise<{ ok: boolean; error?: string }>
    detectar: (items: { id: string; valores: string[] }[]) => void
    onState: (callback: (state: Record<string, EstadoLeitor>) => void) => () => void
  } }
}
