import type { PieceInstance, ProjectConfig, CalibrationData, PostePeriferico } from '../types'
import { CATALOGO, MODELOS_VEICULO } from '../catalog/pieces'
import { alturaPoste, posicaoPosteAdicional } from './postes'

// Motor de layout paramétrico.
//
// Sistema de coordenadas (metros):
//   - Origem (0,0,0) no centro da plataforma da balança, no nível do piso.
//   - +X = sentido do fluxo dos caminhões (entrada em -X, saída em +X).
//   - +Y = para cima.
//   - Z = lateral; -Z é o lado do motorista (cancelas, postes de leitura),
//     +Z é o lado da cabine de pesagem.
//
// As montagens seguem o padrão SIAP da SIAMAC: um poste base + equipamentos
// montados em alturas definidas (constants.ts). Cada lado (entrada/saída)
// espelha o outro, como no projeto de referência ("igual ao outro lado").


// Monta equipamentos de forma dinâmica nos postes, posicionando-os no eixo do poste
// na altura definida e aplicando a rotação do periférico específica + a calibração de fábrica.
function adicionarPerifericosPoste(
  pecas: PieceInstance[],
  idPoste: string,
  xPoste: number,
  zPoste: number,
  perifericos: PostePeriferico[],
  calibracoes: Record<string, CalibrationData>,
  inverterZ: boolean
) {
  if (!perifericos) return
  perifericos.forEach((perif) => {
    const cal = calibracoes[perif.tipo] || { altura: 0, rotacaoY: 0, fixadorX: 0, fixadorY: 0, fixadorZ: 0 }
    const anguloGraus = perif.rotacaoY + cal.rotacaoY
    const anguloFinal = inverterZ ? -anguloGraus : anguloGraus
    const rotacaoRadianos = (anguloFinal * Math.PI) / 180
    
    let nomeEquipamento = CATALOGO[perif.tipo]?.nome || 'Equipamento'
    if (idPoste === 'siap09') {
      if (perif.id === 'camera-siap09-ampla' || perif.tipo === 'camera-ip') {
        nomeEquipamento = 'Câmera Superior 01 - Visão geral da plataforma'
      } else if (perif.id === 'camera-siap09-auditoria' || perif.tipo === 'camera-ip-baixo') {
        nomeEquipamento = 'Câmera Superior 02 - Visão complementar / auditoria superior'
      }
    }

    pecas.push({
      id: perif.id,
      posteId: idPoste,
      tipo: perif.tipo,
      estadoSemaforo: perif.estadoSemaforo,
      mensagemDisplay: perif.mensagemDisplay,
      velocidadeDisplay: perif.velocidadeDisplay,
      displayTcp: perif.displayTcp,
      canalSemaforo: perif.canalSemaforo,
      canalSensor: perif.canalSensor,
      leitor: perif.leitor,
      cameraRtsp: perif.cameraRtsp,
      rotulo: `${nomeEquipamento} — ${idPoste.toUpperCase()}`,
      posicao: [xPoste, perif.altura, zPoste],
      rotacaoY: rotacaoRadianos,
      ancora: [cal.fixadorX, cal.fixadorY, cal.fixadorZ],
    })
  })
}

export function gerarLayout(cfg: ProjectConfig, calibracoes: Record<string, CalibrationData>): PieceInstance[] {
  const pecas: PieceInstance[] = []
  const metadeComprimento = cfg.comprimentoBalanca / 2
  const metadeLargura = cfg.larguraBalanca / 2

  // --- Balança (sempre presente, centrada na origem) -------------------------
  pecas.push({
    id: 'balanca',
    tipo: 'balanca',
    rotulo: 'Balança rodoviária',
    posicao: [0, 0, 0],
    rotacaoY: 0,
  })

  // Veículo opcional (caminhão ilustrativo)
  if (cfg.mostrarVeiculo) {
    const alturaCalibrada = calibracoes.veiculo?.altura ?? 0.55
    pecas.push({
      id: 'veiculo',
      tipo: 'veiculo',
      modelo: MODELOS_VEICULO[cfg.modeloVeiculo === 'container' ? 'container' : 'padrao'].modelo,
      rotulo: cfg.modeloVeiculo === 'container' ? 'Caminhão com contêiner SIAMAC' : 'Caminhão (ilustrativo)',
      posicao: [cfg.offsetVeiculoX ?? 0, alturaCalibrada, 0],
      rotacaoY: cfg.veiculoInvertido ? Math.PI : 0,
    })
  }

  // --- Cancelas de entrada e saída -------------------------------------------
  if (cfg.cancelaEntrada) {
    const dist = cfg.customCancelaEntrada ? (cfg.distanciaCancelaEntrada ?? 0.67) : 0.67
    const afast = cfg.customCancelaEntrada ? (cfg.afastamentoZCancelaEntrada ?? 0.6) : 0.6
    const sinalZ = cfg.inverterLateralEntrada ? 1 : -1
    const rotY = cfg.inverterLateralEntrada ? 0 : Math.PI
    const tipoModelo = cfg.inverterLateralEntrada ? 'cancela-lado-a' : 'cancela-lado-b'
    pecas.push({
      id: 'cancela-entrada',
      tipo: tipoModelo,
      rotulo: 'Cancela de Entrada',
      posicao: [-(metadeComprimento + dist), 0, sinalZ * (metadeLargura + afast)],
      rotacaoY: rotY,
    })
  }

  if (cfg.cancelaSaida) {
    const dist = cfg.customCancelaSaida ? (cfg.distanciaCancelaSaida ?? 0.67) : 0.67
    const afast = cfg.customCancelaSaida ? (cfg.afastamentoZCancelaSaida ?? 0.6) : 0.6
    const sinalZ = cfg.inverterLateralSaida ? 1 : -1
    const rotY = cfg.inverterLateralSaida ? 0 : Math.PI
    const tipoModelo = cfg.inverterLateralSaida ? 'cancela-lado-b' : 'cancela-lado-a'
    pecas.push({
      id: 'cancela-saida',
      tipo: tipoModelo,
      rotulo: 'Cancela de Saída',
      posicao: [metadeComprimento + dist, 0, sinalZ * (metadeLargura + afast)],
      rotacaoY: rotY,
    })
  }

  // SIAP01: Poste de 3 metros, fica na cabeceira A da balança, ele fica a 6,5m afastado lateralmente (X) da balança e 0,6m deslocado do limite lateral (Z) da balança
  if (cfg.siap01) {
    const dist = cfg.customSiap01 ? (cfg.distanciaSiap01 ?? 6.5) : 6.5
    const afast = cfg.customSiap01 ? (cfg.afastamentoZSiap01 ?? 0.6) : 0.6
    const xPoste = - (metadeComprimento + dist)
    const sinalZ = cfg.inverterLateralEntrada ? 1 : -1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap01',
      tipo: 'poste-3m',
      rotulo: 'Poste 3m — SIAP01',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap01', xPoste, zPoste, cfg.perifericosSiap01 ?? [], calibracoes, cfg.inverterLateralEntrada)
  }

  // SIAP02: Poste de 3 metros, fica na cabeceira A da balança, ele fica a 3,5m afastado lateralmente (X) da balança e 0,6m deslocado do limite lateral (Z) da balança
  if (cfg.siap02) {
    const dist = cfg.customSiap02 ? (cfg.distanciaSiap02 ?? 3.5) : 3.5
    const afast = cfg.customSiap02 ? (cfg.afastamentoZSiap02 ?? 0.6) : 0.6
    const xPoste = - (metadeComprimento + dist)
    const sinalZ = cfg.inverterLateralEntrada ? 1 : -1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap02',
      tipo: 'poste-3m',
      rotulo: 'Poste 3m — SIAP02',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap02', xPoste, zPoste, cfg.perifericosSiap02 ?? [], calibracoes, cfg.inverterLateralEntrada)
  }

  // SIAP03: Poste de 3 metros, fica na cabeceira A da balança, ele fica a 1,0m afastado lateralmente (X) da balança e 0,6m deslocado do limite lateral (Z) da balança
  if (cfg.siap03) {
    const dist = cfg.customSiap03 ? (cfg.distanciaSiap03 ?? 1.0) : 1.0
    const afast = cfg.customSiap03 ? (cfg.afastamentoZSiap03 ?? 0.6) : 0.6
    const xPoste = - (metadeComprimento + dist)
    const sinalZ = cfg.inverterLateralEntrada ? -1 : 1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap03',
      tipo: 'poste-3m',
      rotulo: 'Poste 3m — SIAP03',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap03', xPoste, zPoste, cfg.perifericosSiap03 ?? [], calibracoes, !cfg.inverterLateralEntrada)
  }

  // SIAP04: Poste de 1,5 metros (é aquele menorzinho), ele fica do outro lado da balança em relação ao SIAP03, mas na mesma cabeceira A, ele está a 0,6m deslocado do limite lateral da balança (da outra lateral)
  if (cfg.siap04) {
    const dist = cfg.customSiap04 ? (cfg.distanciaSiap04 ?? 0.0) : 0.0
    const afast = cfg.customSiap04 ? (cfg.afastamentoZSiap04 ?? 0.6) : 0.6
    const xPoste = - (metadeComprimento + dist)
    const sinalZ = cfg.inverterLateralEntrada ? 1 : -1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap04',
      tipo: 'poste-1-5m',
      rotulo: 'Poste 1.5m — SIAP04',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap04', xPoste, zPoste, cfg.perifericosSiap04 ?? [], calibracoes, !cfg.inverterLateralEntrada)
  }

  // SIAP05: Poste de 3 metros, fica na cabeceira B da balança, a 6,5m afastado (X positivo) e 0,6m deslocado do limite lateral (Z negativo)
  if (cfg.siap05) {
    const dist = cfg.customSiap05 ? (cfg.distanciaSiap05 ?? 6.5) : 6.5
    const afast = cfg.customSiap05 ? (cfg.afastamentoZSiap05 ?? 0.6) : 0.6
    const xPoste = metadeComprimento + dist
    const sinalZ = cfg.inverterLateralSaida ? 1 : -1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap05',
      tipo: 'poste-3m',
      rotulo: 'Poste 3m — SIAP05',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap05', xPoste, zPoste, cfg.perifericosSiap05 ?? [], calibracoes, cfg.inverterLateralSaida)
  }

  // SIAP06: Poste de 3 metros, fica na cabeceira B da balança, a 3,5m afastado (X positivo) e 0,6m deslocado do limite lateral (Z negativo)
  if (cfg.siap06) {
    const dist = cfg.customSiap06 ? (cfg.distanciaSiap06 ?? 3.5) : 3.5
    const afast = cfg.customSiap06 ? (cfg.afastamentoZSiap06 ?? 0.6) : 0.6
    const xPoste = metadeComprimento + dist
    const sinalZ = cfg.inverterLateralSaida ? 1 : -1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap06',
      tipo: 'poste-3m',
      rotulo: 'Poste 3m — SIAP06',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap06', xPoste, zPoste, cfg.perifericosSiap06 ?? [], calibracoes, cfg.inverterLateralSaida)
  }

  // SIAP07: Poste de 3 metros, fica na cabeceira B da balança, a 1,0m afastado (X positivo) e 0,6m deslocado do limite lateral (Z negativo)
  if (cfg.siap07) {
    const dist = cfg.customSiap07 ? (cfg.distanciaSiap07 ?? 1.0) : 1.0
    const afast = cfg.customSiap07 ? (cfg.afastamentoZSiap07 ?? 0.6) : 0.6
    const xPoste = metadeComprimento + dist
    const sinalZ = cfg.inverterLateralSaida ? -1 : 1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap07',
      tipo: 'poste-3m',
      rotulo: 'Poste 3m — SIAP07',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap07', xPoste, zPoste, cfg.perifericosSiap07 ?? [], calibracoes, !cfg.inverterLateralSaida)
  }

  // SIAP08: Poste de 1,5 metros (menorzinho), fica do outro lado da balança em relação ao SIAP07, na cabeceira B. Fica alinhado com o limite da cabeceira (X positivo) e 0,6m deslocado lateralmente (Z positivo)
  if (cfg.siap08) {
    const dist = cfg.customSiap08 ? (cfg.distanciaSiap08 ?? 0.0) : 0.0
    const afast = cfg.customSiap08 ? (cfg.afastamentoZSiap08 ?? 0.6) : 0.6
    const xPoste = metadeComprimento + dist
    const sinalZ = cfg.inverterLateralSaida ? 1 : -1
    const zPoste = sinalZ * (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap08',
      tipo: 'poste-1-5m',
      rotulo: 'Poste 1.5m — SIAP08',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap08', xPoste, zPoste, cfg.perifericosSiap08 ?? [], calibracoes, !cfg.inverterLateralSaida)
  }

  // SIAP09: Poste de 6 metros, fica no meio da balança, a 0m de deslocamento em X (centro) e 0,6m deslocado do limite lateral (Z negativo)
  if (cfg.siap09) {
    const dist = cfg.customSiap09 ? (cfg.distanciaSiap09 ?? 0.0) : 0.0
    const afast = cfg.customSiap09 ? (cfg.afastamentoZSiap09 ?? 0.6) : 0.6
    const xPoste = dist
    const zPoste = - (metadeLargura + afast)
    pecas.push({
      id: 'poste-siap09',
      tipo: 'poste-6m',
      rotulo: 'Poste 6m — SIAP09',
      posicao: [xPoste, 0, zPoste],
      rotacaoY: 0,
    })
    adicionarPerifericosPoste(pecas, 'siap09', xPoste, zPoste, cfg.perifericosSiap09 ?? [], calibracoes, false)
  }

  // Alturas independentes dos nove postes padrão; a base permanece no chão.
  for (const peca of pecas) {
    const match = peca.id.match(/^poste-(siap0[1-9])$/)
    if (match) {
      peca.posteId = match[1]
      peca.estruturaPoste = { altura: alturaPoste(cfg, match[1]) }
      peca.rotulo = `Poste ${peca.estruturaPoste.altura} m — ${match[1].toUpperCase()}`
    }
  }
  for (const poste of cfg.postesAdicionais ?? []) {
    const { x, z, zNegativo, zPositivo } = posicaoPosteAdicional(cfg, poste)
    const altura = alturaPoste(cfg, poste.id)
    pecas.push({ id: `poste-${poste.id}`, posteId: poste.id,
      tipo: poste.tipo === 'trave' ? 'poste-trave' : 'poste-3m', rotulo: poste.nome,
      posicao: [x, 0, poste.tipo === 'trave' ? (zNegativo + zPositivo) / 2 : z], rotacaoY: 0,
      estruturaPoste: { altura, ...(poste.tipo === 'trave' ? { largura: zPositivo - zNegativo } : {}) },
    })
    for (const perif of poste.perifericos) {
      const superior = poste.tipo === 'trave' && perif.montagem === 'barra-superior'
      const zEquip = poste.tipo === 'simples' ? z : superior ? perif.deslocamentoBarra ?? 0
        : perif.montagem === 'coluna-positiva' ? zPositivo : zNegativo
      adicionarPerifericosPoste(pecas, poste.nome, x, zEquip,
        [{ ...perif, altura: superior ? altura : Math.min(perif.altura, altura) }], calibracoes, false)
      pecas[pecas.length - 1].posteId = poste.id
    }
  }

  // --- Painéis centrais (SIAMAC e Som) ---------------------------------------
  // Não vinculados a poste. Partem do meio da balança (X=0), no lado da cabine
  // (+Z), à distância configurada (distanciaPainelAutomacao). Com os dois ativos,
  // ficam lado a lado no eixo X com ~0,5 m de folga entre as bordas, centralizados
  // como conjunto em X=0. Ficam voltados para a balança (rotacaoY = PI).
  const paineisAtivos: Array<{ id: string; tipo: PieceInstance['tipo'] }> = []
  if (cfg.painelAutomacao) paineisAtivos.push({ id: 'painel-siamac', tipo: 'painel-automacao' })
  if (cfg.painelSom) paineisAtivos.push({ id: 'painel-som', tipo: 'painel-som' })
  if (paineisAtivos.length > 0) {
    const zPainel = metadeLargura + (cfg.distanciaPainelAutomacao ?? 15)
    const folga = 0.5
    // Espaçamento centro-a-centro entre painéis adjacentes (meia-largura de cada + folga)
    const larguras = paineisAtivos.map((pa) => CATALOGO[pa.tipo].placeholder[0])
    const espacamentos = paineisAtivos.map((_, i) =>
      i === 0 ? 0 : larguras[i - 1] / 2 + folga + larguras[i] / 2,
    )
    // Posição X acumulada e depois recentrada em torno de 0
    const xAcum: number[] = []
    espacamentos.reduce((acc, e, i) => {
      const x = acc + e
      xAcum[i] = x
      return x
    }, 0)
    const centro = (xAcum[0] + xAcum[xAcum.length - 1]) / 2
    paineisAtivos.forEach((pa, i) => {
      pecas.push({
        id: pa.id,
        tipo: pa.tipo,
        rotulo: CATALOGO[pa.tipo].nome,
        posicao: [xAcum[i] - centro, 0, zPainel],
        rotacaoY: Math.PI,
      })
    })
  }

  // Aplica ajuste fino manual, quando existir
  return pecas.map((p) =>
    p.offset
      ? {
          ...p,
          posicao: [
            p.posicao[0] + p.offset[0],
            p.posicao[1] + p.offset[1],
            p.posicao[2] + p.offset[2],
          ] as [number, number, number],
        }
      : p,
  )
}
