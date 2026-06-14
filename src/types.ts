// Tipos centrais do projeto. A configuração (ProjectConfig) é a única fonte
// de verdade: o 3D, a documentação e o PDF são gerados a partir dela.

export type PieceTypeId =
  | 'balanca'
  | 'cancela'
  | 'cancela-lado-a'
  | 'cancela-lado-b'
  | 'semaforo'
  | 'camera-ip'
  | 'camera-ip-baixo'
  | 'camera-ocr'
  | 'leitor-rfid'
  | 'sensor-emissor'
  | 'sensor-receptor'
  | 'poste-3m'
  | 'poste-6m'
  | 'poste-1-5m'
  | 'display-mensagens'
  | 'painel-automacao'
  | 'cabine'
  | 'caixa-de-som'
  | 'veiculo'
  | 'laco-indutivo'

export interface PostePeriferico {
  id: string
  tipo: PieceTypeId
  altura: number
  rotacaoY: number // em graus, ex: -180 a 180
}

export interface PieceType {
  id: PieceTypeId
  nome: string
  descricao: string
  /** Nome do arquivo GLB em public/models (sem extensão) */
  modelo: string
  /** Dimensões do placeholder [comprimento X, altura Y, largura Z] em metros */
  placeholder: [number, number, number]
  /** Cor do placeholder */
  cor: string
}

export interface PieceInstance {
  id: string
  tipo: PieceTypeId
  /** Rótulo exibido na cena e na documentação, ex.: "Cancela de entrada" */
  rotulo: string
  posicao: [number, number, number]
  /** Rotação em torno de Y, em radianos */
  rotacaoY: number
  /**
   * Ponto de ancoragem (centro do fixador) nas coordenadas locais do modelo.
   * Quando presente, `posicao` e `rotacaoY` referem-se a ESTE ponto, não à
   * origem do modelo: a peça é deslocada para que a âncora caia em `posicao`
   * e o giro acontece em torno dela (= em torno do eixo do poste).
   */
  ancora?: [number, number, number]
  /** Ajuste fino manual somado à posição calculada */
  offset?: [number, number, number]
}

export interface ProjectConfig {
  nomeProjeto: string
  codigoProposta: string
  cliente: string
  obra: string
  /** Comprimento da plataforma em metros (referência de posicionamento) */
  comprimentoBalanca: number
  /** Largura da plataforma em metros */
  larguraBalanca: number
  // Novos Postes Cabeceira A
  siap01: boolean
  siap02: boolean
  siap03: boolean
  siap04: boolean
  // Novos Postes Cabeceira B
  siap05: boolean
  siap06: boolean
  siap07: boolean
  siap08: boolean
  // Novos Postes Plataforma (Meio)
  siap09: boolean
  // Distâncias personalizadas em relação à cabeceira (eixo X)
  distanciaSiap01: number
  distanciaSiap02: number
  distanciaSiap03: number
  distanciaSiap04: number
  distanciaSiap05: number
  distanciaSiap06: number
  distanciaSiap07: number
  distanciaSiap08: number
  distanciaSiap09: number
  // Afastamento lateral personalizado (eixo Z)
  afastamentoZSiap01: number
  afastamentoZSiap02: number
  afastamentoZSiap03: number
  afastamentoZSiap04: number
  afastamentoZSiap05: number
  afastamentoZSiap06: number
  afastamentoZSiap07: number
  afastamentoZSiap08: number
  afastamentoZSiap09: number
  // Indica se o poste tem posicionamento personalizado (botão Alterar ativado)
  customSiap01: boolean
  customSiap02: boolean
  customSiap03: boolean
  customSiap04: boolean
  customSiap05: boolean
  customSiap06: boolean
  customSiap07: boolean
  customSiap08: boolean
  customSiap09: boolean
  // Periféricos de cada poste
  perifericosSiap01: PostePeriferico[]
  perifericosSiap02: PostePeriferico[]
  perifericosSiap03: PostePeriferico[]
  perifericosSiap04: PostePeriferico[]
  perifericosSiap05: PostePeriferico[]
  perifericosSiap06: PostePeriferico[]
  perifericosSiap07: PostePeriferico[]
  perifericosSiap08: PostePeriferico[]
  perifericosSiap09: PostePeriferico[]
  // Itens de automação selecionados (montagens SIAP: poste + equipamentos)
  cancelaEntrada: boolean
  cancelaSaida: boolean
  distanciaCancelaEntrada: number
  afastamentoZCancelaEntrada: number
  customCancelaEntrada: boolean
  distanciaCancelaSaida: number
  afastamentoZCancelaSaida: number
  customCancelaSaida: boolean
  /** SIAP01: poste 3 m + leitor RFID */
  rfidEntrada: boolean
  rfidSaida: boolean
  /** SIAP02: poste 3 m + câmera IP + 2 semáforos */
  posteCameraEntrada: boolean
  posteCameraSaida: boolean
  /** Câmera OCR de leitura de placas (poste 3 m próprio) */
  cameraOcrEntrada: boolean
  cameraOcrSaida: boolean
  /** SIAP03 + SIAP04: sensores de barreira nas duas extremidades */
  sensoresBarreira: boolean
  /** Câmera voltada para baixo no SIAP04 (veículo maior que a balança) */
  cameraVeiculoGrande: boolean
  displayMensagens: boolean
  caixaSom: boolean
  painelAutomacao: boolean
  cabinePesagem: boolean
  lacosIndutivos: boolean
  /** Caminhão ilustrativo sobre a balança */
  mostrarVeiculo: boolean
  inverterLateralEntrada: boolean
  inverterLateralSaida: boolean
}

export interface CalibrationData {
  altura: number
  rotacaoY: number // Rotação em torno de Y, em graus (ex: -180 a 180)
  fixadorX: number // Posição X da bolinha rosa (centro do poste) em relação à origem do 3D do periférico
  fixadorY: number // Posição Y da bolinha rosa
  fixadorZ: number // Posição Z da bolinha rosa
}

