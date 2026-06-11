import type { PieceInstance, ProjectConfig, CalibrationData } from '../types'
import {
  AFASTAMENTO_CABINE,
  AFASTAMENTO_LATERAL,
  AFASTAMENTO_SENSOR,
  RECUO_CANCELA,
  RECUO_LACO,
  RECUO_POSTE_CAMERA,
  RECUO_POSTE_RFID,
} from './constants'

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

interface Lado {
  /** -1 = entrada (-X), +1 = saída (+X) */
  sinal: 1 | -1
  nome: string
  sufixo: string
}

const LADOS: Lado[] = [
  { sinal: -1, nome: 'entrada', sufixo: 'entrada' },
  { sinal: 1, nome: 'saída', sufixo: 'saida' },
]

// Monta um equipamento no poste: a âncora (centro do fixador, calibrada na
// aba "Calibrar Postes") é colocada no eixo do poste na altura definida, e o
// giro acontece em torno dela — o equipamento nunca "sai" do poste.
function calcularPosicaoEquipamento(
  xPoste: number,
  zPoste: number,
  rotBase: number,
  cal: CalibrationData
): { posicao: [number, number, number]; rotacaoY: number; ancora: [number, number, number] } {
  return {
    posicao: [xPoste, cal.altura, zPoste],
    rotacaoY: rotBase + (cal.rotacaoY * Math.PI) / 180,
    ancora: [cal.fixadorX, cal.fixadorY, cal.fixadorZ],
  }
}

export function gerarLayout(cfg: ProjectConfig, calibracoes: Record<string, CalibrationData>): PieceInstance[] {
  const pecas: PieceInstance[] = []
  const metadeComprimento = cfg.comprimentoBalanca / 2
  const metadeLargura = cfg.larguraBalanca / 2
  const ladoMotorista = -(metadeLargura + AFASTAMENTO_LATERAL)
  const ladoCabine = metadeLargura + AFASTAMENTO_LATERAL

  // --- Balança (sempre presente, centrada na origem) -------------------------

  pecas.push({
    id: 'balanca',
    tipo: 'balanca',
    rotulo: 'Balança rodoviária',
    posicao: [0, 0, 0],
    rotacaoY: 0,
  })

  if (cfg.mostrarVeiculo) {
    pecas.push({
      id: 'veiculo',
      tipo: 'veiculo',
      rotulo: 'Caminhão (ilustrativo)',
      posicao: [0, 0.55, 0],
      rotacaoY: 0,
    })
  }

  // --- Montagens por lado (entrada / saída) ----------------------------------

  for (const lado of LADOS) {
    const { sinal, nome, sufixo } = lado
    // Para a entrada (sinal -1) as distâncias crescem para -X; para a saída, +X
    const xCancela = sinal * (metadeComprimento + RECUO_CANCELA)
    const xPosteCamera = sinal * (metadeComprimento + RECUO_CANCELA + RECUO_POSTE_CAMERA)
    const xPosteRfid =
      sinal * (metadeComprimento + RECUO_CANCELA + RECUO_POSTE_CAMERA + RECUO_POSTE_RFID)
    // Equipamentos "olham" para o caminhão que se aproxima: na entrada o
    // caminhão vem de -X (rotação 0 = frente para -X após ajuste por peça)
    const rotFrenteFluxo = sinal === -1 ? 0 : Math.PI

    const habilitado = {
      cancela: sinal === -1 ? cfg.cancelaEntrada : cfg.cancelaSaida,
      rfid: sinal === -1 ? cfg.rfidEntrada : cfg.rfidSaida,
      posteCamera: sinal === -1 ? cfg.posteCameraEntrada : cfg.posteCameraSaida,
      cameraOcr: sinal === -1 ? cfg.cameraOcrEntrada : cfg.cameraOcrSaida,
    }

    if (habilitado.cancela) {
      pecas.push(
        (() => {
          const l = calcularPosicaoEquipamento(xCancela, ladoMotorista, Math.PI, calibracoes['cancela'])
          return {
            id: `cancela-${sufixo}`,
            tipo: 'cancela',
            rotulo: `Cancela de ${nome}`,
            posicao: l.posicao,
            rotacaoY: l.rotacaoY,
            ancora: l.ancora,
          }
        })()
      )
      if (cfg.lacosIndutivos) {
        pecas.push({
          id: `laco-${sufixo}`,
          tipo: 'laco-indutivo',
          rotulo: `Laço indutivo de ${nome}`,
          posicao: [xCancela + sinal * RECUO_LACO, 0.02, 0],
          rotacaoY: 0,
        })
      }
    }

    // SIAP01: poste 3 m + leitor RFID
    if (habilitado.rfid) {
      pecas.push(
        {
          id: `poste-rfid-${sufixo}`,
          tipo: 'poste-3m',
          rotulo: `Poste 3 m — SIAP01 ${nome}`,
          posicao: [xPosteRfid, 0, ladoMotorista],
          rotacaoY: 0,
        },
        (() => {
          const l = calcularPosicaoEquipamento(xPosteRfid, ladoMotorista, rotFrenteFluxo, calibracoes['leitor-rfid'])
          return {
            id: `rfid-${sufixo}`,
            tipo: 'leitor-rfid',
            rotulo: `Leitor RFID de ${nome}`,
            posicao: l.posicao,
            rotacaoY: l.rotacaoY,
            ancora: l.ancora,
          }
        })(),
      )
    }

    // SIAP02: poste 3 m + câmera IP + 2 conjuntos de semáforos
    if (habilitado.posteCamera) {
      pecas.push(
        {
          id: `poste-camera-${sufixo}`,
          tipo: 'poste-3m',
          rotulo: `Poste 3 m — SIAP02 ${nome}`,
          posicao: [xPosteCamera, 0, ladoMotorista],
          rotacaoY: 0,
        },
        (() => {
          const l = calcularPosicaoEquipamento(xPosteCamera, ladoMotorista, rotFrenteFluxo, calibracoes['camera-ip'])
          return {
            id: `camera-ip-${sufixo}`,
            tipo: 'camera-ip',
            rotulo: `Câmera IP POE de ${nome}`,
            posicao: l.posicao,
            rotacaoY: l.rotacaoY,
            ancora: l.ancora,
          }
        })(),
        (() => {
          const l = calcularPosicaoEquipamento(xPosteCamera, ladoMotorista, rotFrenteFluxo, calibracoes['semaforo'])
          return {
            id: `semaforo-frente-${sufixo}`,
            tipo: 'semaforo',
            rotulo: `Semáforo de ${nome} (aproximação)`,
            posicao: l.posicao,
            rotacaoY: l.rotacaoY,
            ancora: l.ancora,
          }
        })(),
        (() => {
          const l = calcularPosicaoEquipamento(xPosteCamera, ladoMotorista, rotFrenteFluxo + Math.PI, calibracoes['semaforo'])
          return {
            id: `semaforo-tras-${sufixo}`,
            tipo: 'semaforo',
            rotulo: `Semáforo de ${nome} (balança)`,
            posicao: [
              l.posicao[0],
              l.posicao[1] - 0.45,
              l.posicao[2]
            ] as [number, number, number],
            rotacaoY: l.rotacaoY,
            ancora: l.ancora,
          }
        })(),
      )
    }

    // Câmera OCR em poste de 3 m próprio
    if (habilitado.cameraOcr) {
      const xOcr = xPosteCamera + sinal * 1.0
      pecas.push(
        {
          id: `poste-ocr-${sufixo}`,
          tipo: 'poste-3m',
          rotulo: `Poste 3 m — OCR ${nome}`,
          posicao: [xOcr, 0, ladoCabine],
          rotacaoY: 0,
        },
        (() => {
          const l = calcularPosicaoEquipamento(xOcr, ladoCabine, rotFrenteFluxo, calibracoes['camera-ocr'])
          return {
            id: `camera-ocr-${sufixo}`,
            tipo: 'camera-ocr',
            rotulo: `Câmera OCR de ${nome}`,
            posicao: l.posicao,
            rotacaoY: l.rotacaoY,
            ancora: l.ancora,
          }
        })(),
      )
    }

    // SIAP03 (receptor, poste 3 m) e SIAP04 (emissor, poste 1,5 m) — nas duas
    // extremidades, na diagonal em relação à cancela (o braço não pode repousar
    // interrompendo o feixe, mas deve cruzá-lo ao abrir/fechar)
    if (cfg.sensoresBarreira) {
      const xEmissor = sinal * (metadeComprimento - 0.2)
      const xReceptor = sinal * (metadeComprimento + AFASTAMENTO_SENSOR)
      pecas.push(
        {
          id: `poste-emissor-${sufixo}`,
          tipo: 'poste-1-5m',
          rotulo: `Poste 1,5 m — SIAP04 ${nome}`,
          posicao: [xEmissor, 0, ladoMotorista],
          rotacaoY: 0,
        },
        (() => {
          const l = calcularPosicaoEquipamento(xEmissor, ladoMotorista, 0, calibracoes['sensor-emissor'])
          return {
            id: `sensor-emissor-${sufixo}`,
            tipo: 'sensor-emissor',
            rotulo: `Sensor emissor de ${nome}`,
            posicao: l.posicao,
            rotacaoY: l.rotacaoY,
            ancora: l.ancora,
          }
        })(),
        {
          id: `poste-receptor-${sufixo}`,
          tipo: 'poste-3m',
          rotulo: `Poste 3 m — SIAP03 ${nome}`,
          posicao: [xReceptor, 0, ladoCabine],
          rotacaoY: 0,
        },
        (() => {
          const l = calcularPosicaoEquipamento(xReceptor, ladoCabine, 0, calibracoes['sensor-receptor'])
          return {
            id: `sensor-receptor-${sufixo}`,
            tipo: 'sensor-receptor',
            rotulo: `Sensor receptor de ${nome}`,
            posicao: l.posicao,
            rotacaoY: l.rotacaoY,
          }
        })(),
      )

      // Câmera de reconhecimento de veículo maior que a balança (SIAP04 entrada)
      if (cfg.cameraVeiculoGrande && sinal === -1) {
        pecas.push(
          (() => {
            const l = calcularPosicaoEquipamento(xEmissor, ladoMotorista, rotFrenteFluxo, calibracoes['camera-ip-baixo'])
            return {
              id: 'camera-veiculo-grande',
              tipo: 'camera-ip-baixo',
              rotulo: 'Câmera de reconhecimento de veículo',
              posicao: l.posicao,
              rotacaoY: l.rotacaoY,
            }
          })()
        )
      }
    }
  }

  // --- Itens centrais (lado da balança) --------------------------------------

  if (cfg.caixaSom) {
    pecas.push(
      {
        id: 'poste-caixa-som',
        tipo: 'poste-3m',
        rotulo: 'Poste 3 m — caixa de som',
        posicao: [0, 0, ladoMotorista],
        rotacaoY: 0,
      },
      (() => {
        const l = calcularPosicaoEquipamento(0, ladoMotorista, 0, calibracoes['caixa-de-som'])
        return {
          id: 'caixa-som',
          tipo: 'caixa-de-som',
          rotulo: 'Caixa de som',
          posicao: l.posicao,
          rotacaoY: l.rotacaoY,
          ancora: l.ancora,
        }
      })(),
    )
  }

  if (cfg.displayMensagens) {
    const xDisplay = 2.0
    pecas.push(
      {
        id: 'poste-display',
        tipo: 'poste-3m',
        rotulo: 'Poste 3 m — display',
        posicao: [xDisplay, 0, ladoCabine],
        rotacaoY: 0,
      },
      (() => {
        const l = calcularPosicaoEquipamento(xDisplay, ladoCabine, 0, calibracoes['display-mensagens'])
        return {
          id: 'display-mensagens',
          tipo: 'display-mensagens',
          rotulo: 'Display de mensagens',
          posicao: l.posicao,
          rotacaoY: l.rotacaoY,
          ancora: l.ancora,
        }
      })(),
    )
  }

  if (cfg.cabinePesagem) {
    pecas.push({
      id: 'cabine',
      tipo: 'cabine',
      rotulo: 'Cabine de pesagem',
      posicao: [0, 0, metadeLargura + AFASTAMENTO_CABINE],
      rotacaoY: Math.PI,
    })
  }

  if (cfg.painelAutomacao) {
    // Próximo à cabine quando ela existe; senão, na lateral da balança
    const z = cfg.cabinePesagem
      ? metadeLargura + AFASTAMENTO_CABINE - 2.6
      : ladoCabine + 1.0
    pecas.push({
      id: 'painel-automacao',
      tipo: 'painel-automacao',
      rotulo: 'Painel SIAMAC',
      posicao: [3.0, 0, z],
      rotacaoY: Math.PI,
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
