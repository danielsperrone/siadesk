// Distâncias de engenharia usadas pelo motor de layout, em metros.
// Valores baseados no projeto de referência (docs/exemplo-desenho-tecnico.pdf,
// página "POSICIONAMENTO SUGERIDO"). Ajuste conforme o padrão de instalação —
// nenhuma regra de posicionamento usa número mágico fora deste arquivo.

/** Distância da cancela até a borda da plataforma */
export const RECUO_CANCELA = 1.0

/** Distância do poste de câmera/semáforos (SIAP02) até a cancela */
export const RECUO_POSTE_CAMERA = 2.5

/** Distância do poste RFID (SIAP01) até o poste de câmera (SIAP02) */
export const RECUO_POSTE_RFID = 3.0

/** Afastamento lateral dos equipamentos em relação à borda da pista */
export const AFASTAMENTO_LATERAL = 0.6

/** Afastamento dos postes de sensores em relação à borda da plataforma */
export const AFASTAMENTO_SENSOR = 0.675

/** Largura da faixa de pista de cada lado da balança */
export const LARGURA_PISTA = 3.5

/** Comprimento de pista renderizado antes e depois da plataforma */
export const COMPRIMENTO_PISTA_CENA = 18.0

/** Distância do laço indutivo até a cancela */
export const RECUO_LACO = 1.0

/** Afastamento da cabine em relação à borda da plataforma */
export const AFASTAMENTO_CABINE = 5.0

// --- Alturas de montagem dos equipamentos nos postes -----------------------

/** Altura de montagem do leitor RFID no poste de 3 m (SIAP01) */
export const ALTURA_RFID = 2.2

/** Altura de montagem da câmera IP no poste de 3 m (SIAP02) */
export const ALTURA_CAMERA_IP = 2.8

/** Altura de montagem dos semáforos no poste de 3 m (SIAP02) */
export const ALTURA_SEMAFORO = 2.2

/** Altura de montagem da câmera OCR */
export const ALTURA_CAMERA_OCR = 2.5

/** Altura de montagem dos sensores de barreira (feixe) */
export const ALTURA_SENSOR = 0.75

/** Altura de montagem da caixa de som */
export const ALTURA_CAIXA_SOM = 2.0

/** Altura de montagem do display de mensagens no poste */
export const ALTURA_DISPLAY = 2.2

/** Deslocamento lateral dos equipamentos em relação ao eixo do poste */
export const OFFSET_EQUIPAMENTO_POSTE = 0.15
