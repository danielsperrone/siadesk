// Tipos centrais do projeto. A configuração (ProjectConfig) é a única fonte
// de verdade: o 3D, a documentação e o PDF são gerados a partir dela.

export type PieceTypeId =
  | 'balanca'
  | 'cancela'
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
  /** Ajuste fino manual somado à posição calculada */
  offset?: [number, number, number]
}

export interface ProjectConfig {
  cliente: string
  obra: string
  /** Comprimento da plataforma em metros (referência de posicionamento) */
  comprimentoBalanca: number
  /** Largura da plataforma em metros */
  larguraBalanca: number
  // Itens de automação selecionados (montagens SIAP: poste + equipamentos)
  cancelaEntrada: boolean
  cancelaSaida: boolean
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
}
