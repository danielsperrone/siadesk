import type { PosteAdicional, PostePeriferico, ProjectConfig } from '../types'

export const ALTURA_MIN_POSTE = 0.5
export const ALTURA_MAX_POSTE = 15
export const TIPOS_BARRA_SUPERIOR = ['camera-ip-baixo', 'camera-ip', 'camera-ocr', 'refletor-frontal', 'refletor-poste']
export const limitar = (valor: number, min: number, max: number) => Math.max(min, Math.min(max, Number.isFinite(valor) ? valor : min))

export function alturaPoste(config: ProjectConfig, id: string): number {
  const adicional = config.postesAdicionais?.find(p => p.id === id)
  const padrao = id === 'siap09' ? 6 : ['siap04', 'siap08'].includes(id) ? 1.5 : 3
  return limitar(adicional?.altura ?? config.alturasPostes?.[id] ?? padrao, ALTURA_MIN_POSTE, ALTURA_MAX_POSTE)
}

export function perifericosPoste(config: ProjectConfig, id: string): PostePeriferico[] {
  const adicional = config.postesAdicionais?.find(p => p.id === id)
  return adicional?.perifericos ?? (config[`perifericos${id.charAt(0).toUpperCase()}${id.slice(1)}` as keyof ProjectConfig] as PostePeriferico[] | undefined) ?? []
}

export function posicaoPosteAdicional(config: ProjectConfig, poste: PosteAdicional) {
  const x = poste.referencia === 'A' ? -config.comprimentoBalanca / 2 - poste.distanciaX
    : poste.referencia === 'B' ? config.comprimentoBalanca / 2 + poste.distanciaX : poste.distanciaX
  const zNegativo = -config.larguraBalanca / 2 - poste.afastamentoZ
  const zPositivo = config.larguraBalanca / 2 + poste.afastamentoZPositivo
  return { x, zNegativo, zPositivo, z: poste.lateral === 'negativa' ? zNegativo : zPositivo }
}

export function itensAdicionaisFornecidos(config: ProjectConfig) {
  const itens: { nome: string; descricao: string }[] = []
  for (const poste of config.postesAdicionais ?? []) {
    if (poste.fornecimentoSiamac !== false) itens.push({ nome: `Poste ${poste.tipo === 'trave' ? 'trave' : 'simples'} (${poste.altura}m)`,
      descricao: poste.tipo === 'trave' ? `Portal de ${poste.altura} m de altura e ${config.larguraBalanca + poste.afastamentoZ + poste.afastamentoZPositivo} m entre colunas` : `Poste de sustentação de ${poste.altura} m` })
    for (const p of poste.perifericos) if (p.fornecimentoSiamac !== false) itens.push({ nome: p.tipo === 'camera-ip-baixo' ? 'camera-ip' : p.tipo, descricao: '' })
  }
  return itens
}

/** Mantém os equipamentos presos à estrutura quando a altura/largura diminui. */
export function ajustarPostes(config: ProjectConfig): ProjectConfig {
  const ajustar = (id: string, lista: PostePeriferico[]) => lista.map(p => ({ ...p, altura: limitar(p.altura, 0, alturaPoste(config, id)) }))
  const result = { ...config }
  for (let n = 1; n <= 9; n++) {
    const id = `siap0${n}`
    const key = `perifericosSiap0${n}` as 'perifericosSiap01'
    result[key] = ajustar(id, config[key] ?? [])
  }
  result.postesAdicionais = (config.postesAdicionais ?? []).map(p => {
    const altura = alturaPoste(config, p.id)
    const { zNegativo, zPositivo } = posicaoPosteAdicional(config, p)
    return { ...p, altura, perifericos: ajustar(p.id, p.perifericos).map(perif => ({ ...perif,
      altura: p.tipo === 'trave' && perif.montagem === 'barra-superior' ? altura : perif.altura,
      deslocamentoBarra: limitar(perif.deslocamentoBarra ?? 0, zNegativo, zPositivo),
    })) }
  })
  return result
}
