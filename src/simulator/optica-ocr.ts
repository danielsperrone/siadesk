import * as THREE from 'three'
import type { PieceInstance } from '../types'
import resolucoes from '../../electron/cameras/resolucoes.json'

export const PERFIL_5460 = 'intelbras-vip-5460-lpr-ia' as const
export const VIP_5460 = {
  nome: 'Intelbras VIP 5460 LPR IA', focalMin: 2.7, focalMax: 12,
  horizontal: [92, 46.1], verticalFicha: [49, 26], largura: 2688, altura: 1520,
  fonte: 'https://backend.intelbras.com/sites/default/files/2026-01/Datasheet%20-%20VIP%205460%20LPR%20IA%20-%20V16.pdf',
} as const
type CameraOptica = Pick<PieceInstance, 'tipo' | 'cameraRtsp' | 'leitor'>
export function dimensoesCamera(largura: number) {
  const altura = resolucoes[String(largura) as keyof typeof resolucoes]
  return altura ? { largura, altura } : { largura: 640, altura: 360 }
}
export function perfil5460(p: CameraOptica) {
  return p.tipo === 'camera-ocr' && (p.cameraRtsp?.perfil === PERFIL_5460 ||
    (!p.cameraRtsp?.perfil && p.cameraRtsp?.abertura === undefined && p.leitor?.abertura === undefined))
}
export function focalCamera(valor?: number) {
  return THREE.MathUtils.clamp(Number.isFinite(valor) ? valor! : 2.7, 2.7, 12)
}
function interpolarCampo(extremos: readonly [number, number], focal: number) {
  // Calibrated to the manufacturer's published endpoints, rather than deriving
  // an invented sensor size. Intermediate focal settings are an approximation.
  const t = Math.log(focalCamera(focal) / 2.7) / Math.log(12 / 2.7)
  const a = Math.tan(THREE.MathUtils.degToRad(extremos[0] / 2))
  const b = Math.tan(THREE.MathUtils.degToRad(extremos[1] / 2))
  return THREE.MathUtils.radToDeg(2 * Math.atan(a * (b / a) ** t))
}
export function campoHorizontal(p: CameraOptica) {
  if (perfil5460(p)) return interpolarCampo(VIP_5460.horizontal, p.cameraRtsp?.focalMm ?? 2.7)
  const graus = p.cameraRtsp?.abertura ?? (p.tipo === 'camera-ocr' ? p.leitor?.abertura ?? 45 : 70)
  return THREE.MathUtils.clamp(Number.isFinite(graus) ? graus : 70, 20, 110)
}
export function campoVertical(p: CameraOptica, aspecto = 16 / 9) {
  return THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(campoHorizontal(p) / 2)) / aspecto))
}
export function campoVerticalFicha(p: CameraOptica) {
  return interpolarCampo(VIP_5460.verticalFicha, p.cameraRtsp?.focalMm ?? 2.7)
}

// Measured joint centre (Mesh8) and original lens normal in camera-ocr.glb.
// The fixed straps, mounting plate and neck (Mesh1..5) never move.
export const PIVO_OCR = new THREE.Vector3(-.03465625, .079076354, .017601528)
const DIRECAO_OCR = new THREE.Vector3(.8401, -.1771, -.5128).normalize()
export const ELEVACAO_ORIGINAL_OCR = THREE.MathUtils.radToDeg(Math.asin(DIRECAO_OCR.y))
export const EIXO_OCR = DIRECAO_OCR.clone().setY(0).normalize().cross(new THREE.Vector3(0, 1, 0)).normalize()
export function inclinacaoCamera(valor?: number) {
  return THREE.MathUtils.clamp(Number.isFinite(valor) ? valor! : ELEVACAO_ORIGINAL_OCR, -45, 45)
}
export function rotacaoOcr(valor?: number) {
  return new THREE.Quaternion().setFromAxisAngle(EIXO_OCR, THREE.MathUtils.degToRad(inclinacaoCamera(valor) - ELEVACAO_ORIGINAL_OCR))
}
export function opticaOcr(valor?: number) {
  const q = rotacaoOcr(valor)
  return {
    origem: new THREE.Vector3(.165, .038, -.106).sub(PIVO_OCR).applyQuaternion(q).add(PIVO_OCR),
    direcao: DIRECAO_OCR.clone().applyQuaternion(q),
  }
}

/** Rectangular perspective field, shared by the OCR detector and the 3D frustum. */
export function dentroCampoCamera(ponto: THREE.Vector3, origem: THREE.Vector3, direcao: THREE.Vector3,
  alcance: number, horizontal: number, vertical: number) {
  const frente = direcao.clone().normalize(), direita = frente.clone().cross(new THREE.Vector3(0, 1, 0)).normalize()
  const cima = direita.clone().cross(frente).normalize(), deslocamento = ponto.clone().sub(origem)
  const profundidade = deslocamento.dot(frente)
  return profundidade > .025 && profundidade <= alcance &&
    Math.abs(deslocamento.dot(direita)) <= profundidade * Math.tan(THREE.MathUtils.degToRad(horizontal / 2)) + 1e-9 &&
    Math.abs(deslocamento.dot(cima)) <= profundidade * Math.tan(THREE.MathUtils.degToRad(vertical / 2)) + 1e-9
}
