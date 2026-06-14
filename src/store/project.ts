import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectConfig, CalibrationData, PieceTypeId } from '../types'

interface ProjetoRecente {
  id: string
  nomeProjeto: string
  cliente: string
  codigoProposta: string
  dataCriacao: string
  config: ProjectConfig
}

interface ProjectState {
  config: ProjectConfig
  setConfig: <K extends keyof ProjectConfig>(key: K, value: ProjectConfig[K]) => void
  abaAtiva: 'projeto' | 'postes' | 'calibracao'
  setAbaAtiva: (aba: 'projeto' | 'postes' | 'calibracao') => void
  projetoAtivo: boolean
  setProjetoAtivo: (ativo: boolean) => void
  projetosRecentes: ProjetoRecente[]
  criarNovoProjeto: (nomeProjeto: string, cliente: string, codigoProposta: string) => void
  abrirProjeto: (config: ProjectConfig) => void
  fecharProjeto: () => void
  excluirProjetoRecente: (id: string) => void
  equipamentoCalibrando: PieceTypeId
  setEquipamentoCalibrando: (tipo: PieceTypeId) => void
  calibracoes: Record<string, CalibrationData>
  updateCalibracao: (tipo: PieceTypeId, key: keyof CalibrationData, value: number) => void
}

export const CONFIG_PADRAO: ProjectConfig = {
  nomeProjeto: '',
  codigoProposta: '',
  cliente: '',
  obra: '',
  comprimentoBalanca: 15,
  larguraBalanca: 3.2,
  siap01: true,
  siap02: true,
  siap03: true,
  siap04: true,
  siap05: true,
  siap06: true,
  siap07: true,
  siap08: true,
  siap09: true,
  distanciaSiap01: 6.5,
  distanciaSiap02: 3.5,
  distanciaSiap03: 1.0,
  distanciaSiap04: 0.0,
  distanciaSiap05: 6.5,
  distanciaSiap06: 3.5,
  distanciaSiap07: 1.0,
  distanciaSiap08: 0.0,
  distanciaSiap09: 0.0,
  afastamentoZSiap01: 0.6,
  afastamentoZSiap02: 0.6,
  afastamentoZSiap03: 0.6,
  afastamentoZSiap04: 0.6,
  afastamentoZSiap05: 0.6,
  afastamentoZSiap06: 0.6,
  afastamentoZSiap07: 0.6,
  afastamentoZSiap08: 0.6,
  afastamentoZSiap09: 0.6,
  customSiap01: false,
  customSiap02: false,
  customSiap03: false,
  customSiap04: false,
  customSiap05: false,
  customSiap06: false,
  customSiap07: false,
  customSiap08: false,
  customSiap09: false,
  perifericosSiap01: [
    { id: 'rfid-siap01', tipo: 'leitor-rfid', altura: 2.5, rotacaoY: 0 }
  ],
  perifericosSiap02: [
    { id: 'camera-siap02', tipo: 'camera-ip', altura: 2.8, rotacaoY: 180 },
    { id: 'semaforo-frente-siap02', tipo: 'semaforo', altura: 2.2, rotacaoY: 0 },
    { id: 'semaforo-tras-siap02', tipo: 'semaforo', altura: 1.75, rotacaoY: 180 }
  ],
  perifericosSiap03: [
    { id: 'receptor-siap03', tipo: 'sensor-receptor', altura: 0.75, rotacaoY: -90 }
  ],
  perifericosSiap04: [
    { id: 'emissor-siap04', tipo: 'sensor-emissor', altura: 0.75, rotacaoY: 90 }
  ],
  perifericosSiap05: [
    { id: 'rfid-siap05', tipo: 'leitor-rfid', altura: 2.5, rotacaoY: 0 }
  ],
  perifericosSiap06: [
    { id: 'camera-siap06', tipo: 'camera-ip', altura: 2.8, rotacaoY: 180 },
    { id: 'semaforo-frente-siap06', tipo: 'semaforo', altura: 2.2, rotacaoY: 0 },
    { id: 'semaforo-tras-siap06', tipo: 'semaforo', altura: 1.75, rotacaoY: 180 }
  ],
  perifericosSiap07: [
    { id: 'receptor-siap07', tipo: 'sensor-receptor', altura: 0.75, rotacaoY: -90 }
  ],
  perifericosSiap08: [
    { id: 'emissor-siap08', tipo: 'sensor-emissor', altura: 0.75, rotacaoY: 90 }
  ],
  perifericosSiap09: [],
  cancelaEntrada: false,
  cancelaSaida: false,
  distanciaCancelaEntrada: 0.45,
  afastamentoZCancelaEntrada: 0.6,
  customCancelaEntrada: false,
  distanciaCancelaSaida: 0.45,
  afastamentoZCancelaSaida: 0.6,
  customCancelaSaida: false,
  rfidEntrada: false,
  rfidSaida: false,
  posteCameraEntrada: false,
  posteCameraSaida: false,
  cameraOcrEntrada: false,
  cameraOcrSaida: false,
  sensoresBarreira: false,
  cameraVeiculoGrande: false,
  displayMensagens: false,
  caixaSom: false,
  painelAutomacao: false,
  cabinePesagem: false,
  lacosIndutivos: false,
  mostrarVeiculo: false,
  inverterLateralEntrada: false,
  inverterLateralSaida: false,
}

export const CALIBRACOES_PADRAO: Record<string, CalibrationData> = {
  'cancela': { altura: 0.0, rotacaoY: 0, fixadorX: 0.0, fixadorY: 0.0, fixadorZ: 0.0 },
  'leitor-rfid': { altura: 2.5, rotacaoY: 0, fixadorX: -0.05, fixadorY: 0.30, fixadorZ: 0.08 },
  'semaforo': { altura: 2.2, rotacaoY: 0, fixadorX: 0.07, fixadorY: 0.11, fixadorZ: 0.00 },
  'sensor-emissor': { altura: 0.75, rotacaoY: 90, fixadorX: 0.00, fixadorY: 0.07, fixadorZ: 0.05 },
  'sensor-receptor': { altura: 0.75, rotacaoY: -90, fixadorX: 0.03, fixadorY: 0.05, fixadorZ: -0.09 },
  'caixa-de-som': { altura: 2.0, rotacaoY: 90, fixadorX: 0.06, fixadorY: 0.15, fixadorZ: 0.07 },
  'display-mensagens': { altura: 2.2, rotacaoY: -90, fixadorX: 0.13, fixadorY: 0.09, fixadorZ: 0.07 },
  'camera-ip': { altura: 2.8, rotacaoY: 180, fixadorX: 0.10, fixadorY: 0.06, fixadorZ: 0.03 },
  'camera-ocr': { altura: 2.5, rotacaoY: 180, fixadorX: -0.15, fixadorY: 0.07, fixadorZ: 0.08 },
  'camera-ip-baixo': { altura: 1.5, rotacaoY: 0, fixadorX: 0.05, fixadorY: 0.14, fixadorZ: 0.07 },
}

export const useProject = create<ProjectState>()(
  persist(
    (set) => ({
      config: CONFIG_PADRAO,
      setConfig: (key, value) =>
        set((state) => {
          const novaConfig = { ...state.config, [key]: value }
          // Se o projeto estiver ativo, atualiza também a config do projeto correspondente na lista de recentes
          const novosRecentes = state.projetosRecentes.map((pr) => {
            if (pr.nomeProjeto === state.config.nomeProjeto && pr.codigoProposta === state.config.codigoProposta) {
              return { ...pr, nomeProjeto: novaConfig.nomeProjeto, cliente: novaConfig.cliente, codigoProposta: novaConfig.codigoProposta, config: novaConfig }
            }
            return pr
          })
          return { config: novaConfig, projetosRecentes: novosRecentes }
        }),
      abaAtiva: 'projeto',
      setAbaAtiva: (aba) => set({ abaAtiva: aba }),
      projetoAtivo: false,
      setProjetoAtivo: (ativo) => set({ projetoAtivo: ativo }),
      projetosRecentes: [],
      criarNovoProjeto: (nomeProjeto, cliente, codigoProposta) =>
        set((state) => {
          const novaConfig: ProjectConfig = {
            ...CONFIG_PADRAO,
            nomeProjeto,
            cliente,
            codigoProposta,
            obra: '',
          }
          const novoProjeto: ProjetoRecente = {
            id: crypto.randomUUID(),
            nomeProjeto,
            cliente,
            codigoProposta,
            dataCriacao: new Date().toLocaleDateString('pt-BR'),
            config: novaConfig,
          }
          return {
            config: novaConfig,
            projetoAtivo: true,
            abaAtiva: 'projeto',
            projetosRecentes: [novoProjeto, ...state.projetosRecentes.filter(p => p.nomeProjeto !== nomeProjeto || p.codigoProposta !== codigoProposta)],
          }
        }),
      abrirProjeto: (config) =>
        set((state) => {
          // Garante que todas as propriedades novas do CONFIG_PADRAO estejam presentes
          const configMesclada = { ...CONFIG_PADRAO, ...config }
          // Adiciona ou joga para o topo da lista de recentes
          const id = state.projetosRecentes.find(p => p.nomeProjeto === configMesclada.nomeProjeto && p.codigoProposta === configMesclada.codigoProposta)?.id || crypto.randomUUID()
          const projetoExistente: ProjetoRecente = {
            id,
            nomeProjeto: configMesclada.nomeProjeto,
            cliente: configMesclada.cliente,
            codigoProposta: configMesclada.codigoProposta,
            dataCriacao: new Date().toLocaleDateString('pt-BR'),
            config: configMesclada,
          }
          const listaFiltrada = state.projetosRecentes.filter(p => p.id !== id)
          return {
            config: configMesclada,
            projetoAtivo: true,
            abaAtiva: 'projeto',
            projetosRecentes: [projetoExistente, ...listaFiltrada],
          }
        }),
      fecharProjeto: () => set({ projetoAtivo: false, config: CONFIG_PADRAO }),
      excluirProjetoRecente: (id) =>
        set((state) => ({
          projetosRecentes: state.projetosRecentes.filter((p) => p.id !== id),
        })),
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
    }),
    {
      name: 'siadesk-storage',
      // Persiste as calibrações, lista de projetos recentes, projeto ativo e configuração atual
      partialize: (state) => ({
        calibracoes: state.calibracoes,
        projetosRecentes: state.projetosRecentes,
        config: state.config,
        projetoAtivo: state.projetoAtivo,
      }),
      merge: (persisted, atual) => {
        const p = persisted as Partial<ProjectState> | undefined
        const projetosRecentesMesclados = (p?.projetosRecentes ?? []).map((pr: any) => ({
          ...pr,
          config: {
            ...CONFIG_PADRAO,
            ...(pr.config ?? {}),
          }
        }))
        return {
          ...atual,
          calibracoes: {
            ...CALIBRACOES_PADRAO,
            ...(p?.calibracoes ?? {}),
          },
          projetosRecentes: projetosRecentesMesclados,
          config: {
            ...CONFIG_PADRAO,
            ...(p?.config ?? {}),
          },
          projetoAtivo: p?.projetoAtivo ?? false,
        }
      },
    },
  ),
)

