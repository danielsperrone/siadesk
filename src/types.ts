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
  | 'refletor-frontal'
  | 'refletor-poste'
  | 'camera-ocr'
  | 'leitor-rfid'
  | 'sensor-emissor'
  | 'sensor-receptor'
  | 'poste-3m'
  | 'poste-6m'
  | 'poste-1-5m'
  | 'poste-trave'
  | 'display-mensagens'
  | 'painel-automacao'
  | 'painel-som'
  | 'cabine'
  | 'caixa-de-som'
  | 'veiculo'
  | 'laco-indutivo'

export type EstadoSemaforo = 'desligado' | 'verde' | 'vermelho'

export interface PostePeriferico {
  montagem?: 'coluna-negativa' | 'coluna-positiva' | 'barra-superior'
  /** Posição na barra superior, em metros a partir do centro da balança. */
  deslocamentoBarra?: number
  velocidadeDisplay?: number
  cameraRtsp?: import('./simulator/cameras').ConfigCamera
  displayTcp?: import('./simulator/display').ConfigDisplay
  leitor?: import('./simulator/leitura').ConfigLeitor
  canalSemaforo?: import('./simulator/types').CanalSemaforo | 'figurante'
  canalSensor?: import('./simulator/types').CanalSensor
  id: string
  tipo: PieceTypeId
  altura: number
  rotacaoY: number // em graus, ex: -180 a 180
  rotacaoYNormal?: number
  rotacaoYInvertido?: number
  fornecimentoSiamac?: boolean
  estadoSemaforo?: EstadoSemaforo
  mensagemDisplay?: string
}

export interface PadraoPerifericoPoste {
  altura: number
  rotacaoYNormal: number
  rotacaoYInvertido: number
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
  posteId?: string
  estruturaPoste?: { altura: number; largura?: number }
  /** Modelo alternativo com a mesma origem e escala da peça de catálogo. */
  modelo?: string
  velocidadeDisplay?: number
  cameraRtsp?: import('./simulator/cameras').ConfigCamera
  displayTcp?: import('./simulator/display').ConfigDisplay
  leitor?: import('./simulator/leitura').ConfigLeitor
  canalSemaforo?: import('./simulator/types').CanalSemaforo | 'figurante'
  canalSensor?: import('./simulator/types').CanalSensor
  estadoSemaforo?: EstadoSemaforo
  mensagemDisplay?: string
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

export interface PreferenciasEtiquetas {
  version: 1
  equipamentos: { id: string; nome: string; ip: string; username: string; password: string; excluded: string[] }[]
}

export interface ProjectConfig {
  /** Imagens incorporadas ao projeto; a primeira é a foto principal (máximo de quatro). */
  fotosProjeto?: FotoProjeto[]
  postesAdicionais?: PosteAdicional[]
  alturasPostes?: Record<string, number>
  simuladorCameras?: import('./simulator/cameras').ConfigCameras
  identidadesVeiculo?: Record<import('./simulator/leitura').ParteVeiculo, import('./simulator/leitura').IdentidadeVeiculo>
  pesoVeiculoKg?: number
  mostrarPeso?: boolean
  balancaTcp?: { porta: number; margemContato: number; recolhido?: boolean }
  simuladorClp?: import('./simulator/types').ConfiguracaoCLP
  canaisCancelas?: Record<string, import('./simulator/types').CanalCancela>
  cloudId?: string
  etiquetas?: PreferenciasEtiquetas
  /** Estado de abertura de cada cancela na visualização 3D. */
  cancelasAbertas?: Record<string, boolean>
  /** Posições para novas unidades, por poste e tipo; independem dos itens instalados. */
  padroesPerifericosPostes?: Record<string, Partial<Record<PieceTypeId, PadraoPerifericoPoste>>>
  nomeProjeto: string
  codigoProposta: string
  cliente: string
  obra: string
  /** Comprimento da plataforma em metros (referência de posicionamento) */
  comprimentoBalanca: number
  /** Largura da plataforma em metros */
  larguraBalanca: number
  /** Tipo de instalação da balança: de sobrepor, semiembutida ou embutida */
  tipoInstalacaoBalanca: 'sobrepor' | 'semiembutida' | 'embutida'
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
  painelSom: boolean
  cabinePesagem: boolean
  lacosIndutivos: boolean
  /** Caminhão ilustrativo sobre a balança */
  mostrarVeiculo: boolean
  /** Projetos antigos usam o caminhão padrão. */
  modeloVeiculo?: 'padrao' | 'container'
  /** Posição X (deslocamento) do caminhão na pista */
  offsetVeiculoX: number
  veiculoInvertido?: boolean
  inverterLateralEntrada: boolean
  inverterLateralSaida: boolean
  // Campos de controle de versão e auditoria
  revisao: number
  dataCriacao: string
  dataAlteracao: string
  offsetsArrasto?: Record<string, { dx: number, dy: number }>
  rotacoes3D?: Record<string, number>
  rotacoes3DNormal?: Record<string, number>
  rotacoes3DInvertido?: Record<string, number>
  distanciaPainelAutomacao: number
  distanciaQuadroDistribuicao: number
  distanciaRoteadorPoE: number
  /** Distância direta dos painéis centrais (SIAMAC/Som) até o Quadro de Distribuição (alimentação) */
  distanciaPainelQuadro: number
  /** Distância direta dos painéis centrais (SIAMAC/Som) até o Roteador POE (cabo de rede) */
  distanciaPainelRoteador: number
  equipamentosAdicionais: EquipamentoAdicional[]
  fornecimentoSiamacCancelaEntrada?: boolean
  fornecimentoSiamacCancelaSaida?: boolean
  fornecimentoSiamacSiap01?: boolean
  fornecimentoSiamacSiap02?: boolean
  fornecimentoSiamacSiap03?: boolean
  fornecimentoSiamacSiap04?: boolean
  fornecimentoSiamacSiap05?: boolean
  fornecimentoSiamacSiap06?: boolean
  fornecimentoSiamacSiap07?: boolean
  fornecimentoSiamacSiap08?: boolean
  fornecimentoSiamacSiap09?: boolean
  fornecimentoSiamacPainelAutomacao?: boolean
  fornecimentoSiamacPainelSom?: boolean
  cenas?: CenaData[]
}

export interface FotoProjeto {
  id: string
  nome: string
  dataUrl: string
}

export interface PosteAdicional {
  id: string
  nome: string
  tipo: 'simples' | 'trave'
  referencia: 'A' | 'B' | 'meio'
  distanciaX: number
  lateral: 'negativa' | 'positiva'
  afastamentoZ: number
  afastamentoZPositivo: number
  altura: number
  fornecimentoSiamac: boolean
  perifericos: PostePeriferico[]
}

export interface CenaData {
  id: string
  nome: string
  posicao: [number, number, number]
  target: [number, number, number]
}

export interface EquipamentoAdicional {
  id: string
  nome: string
  quantidade: number
}


export interface CalibrationData {
  altura: number
  rotacaoY: number // Rotação em torno de Y, em graus (ex: -180 a 180)
  fixadorX: number // Posição X da bolinha rosa (centro do poste) em relação à origem do 3D do periférico
  fixadorY: number // Posição Y da bolinha rosa
  fixadorZ: number // Posição Z da bolinha rosa
}

declare global {
  interface Window {
    dimensionador?: {
      onSalvarEtiquetas: (callback: (request: {requestId:string;key:string;data:PreferenciasEtiquetas}) => void) => () => void
      responderEtiquetas: (requestId:string,result:{ok:boolean;error?:string}) => void
      salvarArquivoEtiquetas: (config:ProjectConfig) => Promise<{ok:boolean;error?:string}>
      abrirEtiquetas: (project: import('./labels/project-labels').ProjetoEtiquetas) => Promise<{ ok: boolean; error?: string }>
      exportPdf: () => Promise<any>
    }
  }
}
