import type { CalibrationData, PadraoPerifericoPoste, PieceTypeId, PostePeriferico, ProjectConfig } from '../types'
import { ELEVACAO_ORIGINAL_OCR, PERFIL_5460 } from '../simulator/optica-ocr'
import { alturaPoste } from '../layout/postes'

export function alturaMaximaPoste(posteId: string, config?: ProjectConfig): number {
  if (config) return alturaPoste(config, posteId)
  if (posteId === 'siap04' || posteId === 'siap08') return 1.5
  return posteId === 'siap09' ? 6 : 3
}

export function posteInvertido(config: ProjectConfig, posteId: string): boolean {
  if (['siap01', 'siap02', 'siap03', 'siap04'].includes(posteId)) return config.inverterLateralEntrada
  if (['siap05', 'siap06', 'siap07', 'siap08'].includes(posteId)) return config.inverterLateralSaida
  return false
}

export function obterPadraoPeriferico(
  config: ProjectConfig, posteId: string, tipo: PieceTypeId,
  calibracoes: Record<string, CalibrationData>,
): PadraoPerifericoPoste {
  return config.padroesPerifericosPostes?.[posteId]?.[tipo] ?? {
    altura: Math.min(calibracoes[tipo]?.altura ?? 1.5, alturaMaximaPoste(posteId, config)),
    rotacaoYNormal: calibracoes[tipo]?.rotacaoY ?? 0,
    rotacaoYInvertido: calibracoes[tipo]?.rotacaoY ?? 0,
  }
}

export function criarPeriferico(
  config: ProjectConfig, posteId: string, tipo: PieceTypeId,
  calibracoes: Record<string, CalibrationData>,
): PostePeriferico {
  const padrao = obterPadraoPeriferico(config, posteId, tipo, calibracoes)
  return {
    id: `${tipo}-${crypto.randomUUID()}`,
    tipo,
    ...(tipo === 'camera-ocr' ? { cameraRtsp: { ativa: false, abertura: 92, perfil: PERFIL_5460, focalMm: 2.7, inclinacao: ELEVACAO_ORIGINAL_OCR } } : {}),
    ...padrao,
    altura: Math.min(padrao.altura, alturaMaximaPoste(posteId, config)),
    rotacaoY: posteInvertido(config, posteId) ? padrao.rotacaoYInvertido : padrao.rotacaoYNormal,
    fornecimentoSiamac: true,
  }
}
