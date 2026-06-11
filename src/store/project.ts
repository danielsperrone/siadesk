import { create } from 'zustand'
import type { ProjectConfig, CalibrationData, PieceTypeId } from '../types'

interface ProjectState {
  config: ProjectConfig
  setConfig: <K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => void
  abaAtiva: 'dimensionamento' | 'calibracao'
  setAbaAtiva: (aba: 'dimensionamento' | 'calibracao') => void
  equipamentoCalibrando: PieceTypeId
  setEquipamentoCalibrando: (tipo: PieceTypeId) => void
  calibracoes: Record<string, CalibrationData>
  updateCalibracao: (tipo: PieceTypeId, key: keyof CalibrationData, value: number) => void
}

export const CONFIG_PADRAO: ProjectConfig = {
  cliente: '',
  obra: '',
  comprimentoBalanca: 15,
  larguraBalanca: 3.2,
  cancelaEntrada: true,
  cancelaSaida: true,
  rfidEntrada: true,
  rfidSaida: true,
  posteCameraEntrada: true,
  posteCameraSaida: true,
  cameraOcrEntrada: true,
  cameraOcrSaida: false,
  sensoresBarreira: true,
  cameraVeiculoGrande: true,
  displayMensagens: true,
  caixaSom: true,
  painelAutomacao: true,
  cabinePesagem: true,
  lacosIndutivos: true,
  mostrarVeiculo: false,
}

export const CALIBRACOES_PADRAO: Record<string, CalibrationData> = {
  'leitor-rfid': { altura: 2.2, rotacaoY: 0, fixadorX: 0, fixadorY: 0, fixadorZ: -0.15 },
  'semaforo': { altura: 2.2, rotacaoY: 0, fixadorX: -0.15, fixadorY: 0, fixadorZ: 0 },
  'sensor-emissor': { altura: 0.75, rotacaoY: 90, fixadorX: 0, fixadorY: 0, fixadorZ: -0.15 },
  'sensor-receptor': { altura: 0.75, rotacaoY: -90, fixadorX: 0, fixadorY: 0, fixadorZ: 0.15 },
  'caixa-de-som': { altura: 2.0, rotacaoY: 90, fixadorX: 0, fixadorY: 0, fixadorZ: -0.15 },
  'display-mensagens': { altura: 2.2, rotacaoY: -90, fixadorX: 0, fixadorY: 0, fixadorZ: 0.15 },
  'camera-ip': { altura: 2.8, rotacaoY: 180, fixadorX: 0, fixadorY: 0, fixadorZ: -0.15 },
  'camera-ocr': { altura: 2.5, rotacaoY: 180, fixadorX: 0, fixadorY: 0, fixadorZ: 0.15 },
}

export const useProject = create<ProjectState>((set) => ({
  config: CONFIG_PADRAO,
  setConfig: (key, value) =>
    set((state) => ({ config: { ...state.config, [key]: value } })),
  abaAtiva: 'dimensionamento',
  setAbaAtiva: (aba) => set({ abaAtiva: aba }),
  equipamentoCalibrando: 'leitor-rfid',
  setEquipamentoCalibrando: (tipo) => set({ equipamentoCalibrando: tipo }),
  calibracoes: CALIBRACOES_PADRAO,
  updateCalibracao: (tipo, key, value) =>
    set((state) => ({
      calibracoes: {
        ...state.calibracoes,
        [tipo]: {
          ...state.calibracoes[tipo],
          [key]: value,
        },
      },
    })),
}))

