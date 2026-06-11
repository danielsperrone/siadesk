import { create } from 'zustand'
import type { ProjectConfig } from '../types'

interface ProjectState {
  config: ProjectConfig
  setConfig: <K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => void
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

export const useProject = create<ProjectState>((set) => ({
  config: CONFIG_PADRAO,
  setConfig: (key, value) =>
    set((state) => ({ config: { ...state.config, [key]: value } })),
}))
