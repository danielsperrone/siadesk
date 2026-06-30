import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ProjectConfig, CalibrationData, PieceTypeId } from '../types'
import templateConfig from './template.json'

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
  criarNovoProjeto: (nomeProjeto: string, cliente: string, codigoProposta: string, usarTemplate?: boolean) => void
  abrirProjeto: (config: ProjectConfig) => void
  fecharProjeto: () => void
  excluirProjetoRecente: (id: string) => void
  equipamentoCalibrando: PieceTypeId
  setEquipamentoCalibrando: (tipo: PieceTypeId) => void
  calibracoes: Record<string, CalibrationData>
  updateCalibracao: (tipo: PieceTypeId, key: keyof CalibrationData, value: number) => void
  isDirty: boolean
  setDirty: (dirty: boolean) => void
  salvarConfig: () => ProjectConfig
  posteEditandoPerifericos: string | null
  setPosteEditandoPerifericos: (posteId: string | null) => void
}

export const CONFIG_PADRAO: ProjectConfig = {
  nomeProjeto: '',
  codigoProposta: '',
  cliente: '',
  obra: '',
  comprimentoBalanca: 15,
  larguraBalanca: 3.2,
  tipoInstalacaoBalanca: 'sobrepor',
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
    { id: 'rfid-siap01', tipo: 'leitor-rfid', altura: 2.5, rotacaoY: 0, fornecimentoSiamac: true }
  ],
  perifericosSiap02: [
    { id: 'camera-siap02', tipo: 'camera-ip', altura: 2.8, rotacaoY: 180, fornecimentoSiamac: true },
    { id: 'semaforo-frente-siap02', tipo: 'semaforo', altura: 2.2, rotacaoY: 0, fornecimentoSiamac: true },
    { id: 'semaforo-tras-siap02', tipo: 'semaforo', altura: 1.75, rotacaoY: 180, fornecimentoSiamac: true }
  ],
  perifericosSiap03: [
    { id: 'receptor-siap03', tipo: 'sensor-receptor', altura: 0.75, rotacaoY: -90, fornecimentoSiamac: true }
  ],
  perifericosSiap04: [
    { id: 'emissor-siap04', tipo: 'sensor-emissor', altura: 0.75, rotacaoY: 90, fornecimentoSiamac: true }
  ],
  perifericosSiap05: [
    { id: 'rfid-siap05', tipo: 'leitor-rfid', altura: 2.5, rotacaoY: 0, fornecimentoSiamac: true }
  ],
  perifericosSiap06: [
    { id: 'camera-siap06', tipo: 'camera-ip', altura: 2.8, rotacaoY: 180, fornecimentoSiamac: true },
    { id: 'semaforo-frente-siap06', tipo: 'semaforo', altura: 2.2, rotacaoY: 0, fornecimentoSiamac: true },
    { id: 'semaforo-tras-siap06', tipo: 'semaforo', altura: 1.75, rotacaoY: 180, fornecimentoSiamac: true }
  ],
  perifericosSiap07: [
    { id: 'receptor-siap07', tipo: 'sensor-receptor', altura: 0.75, rotacaoY: -90, fornecimentoSiamac: true }
  ],
  perifericosSiap08: [
    { id: 'emissor-siap08', tipo: 'sensor-emissor', altura: 0.75, rotacaoY: 90, fornecimentoSiamac: true }
  ],
  perifericosSiap09: [
    { id: 'camera-siap09-ampla', tipo: 'camera-ip', altura: 5.5, rotacaoY: 180, fornecimentoSiamac: true },
    { id: 'camera-siap09-auditoria', tipo: 'camera-ip-baixo', altura: 5.8, rotacaoY: 180, fornecimentoSiamac: true }
  ],
  cancelaEntrada: false,
  cancelaSaida: false,
  distanciaCancelaEntrada: 0.67,
  afastamentoZCancelaEntrada: 0.6,
  customCancelaEntrada: false,
  distanciaCancelaSaida: 0.67,
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
  painelSom: false,
  cabinePesagem: false,
  lacosIndutivos: false,
  mostrarVeiculo: false,
  inverterLateralEntrada: false,
  inverterLateralSaida: false,
  revisao: 0,
  dataCriacao: '',
  dataAlteracao: '',
  distanciaPainelAutomacao: 15,
  distanciaQuadroDistribuicao: 10,
  distanciaRoteadorPoE: 20,
  distanciaPainelQuadro: 5,
  distanciaPainelRoteador: 5,
  rotacoes3D: {},
  rotacoes3DNormal: {},
  rotacoes3DInvertido: {},
  equipamentosAdicionais: [],
  fornecimentoSiamacCancelaEntrada: true,
  fornecimentoSiamacCancelaSaida: true,
  fornecimentoSiamacSiap01: false,
  fornecimentoSiamacSiap02: false,
  fornecimentoSiamacSiap03: false,
  fornecimentoSiamacSiap04: false,
  fornecimentoSiamacSiap05: false,
  fornecimentoSiamacSiap06: false,
  fornecimentoSiamacSiap07: false,
  fornecimentoSiamacSiap08: false,
  fornecimentoSiamacSiap09: false,
  fornecimentoSiamacPainelAutomacao: true,
  fornecimentoSiamacPainelSom: true,
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
      isDirty: false,
      setConfig: (key, value) =>
        set((state) => {
          let novaConfig = { ...state.config, [key]: value }

          // Ajusta rotações dos equipamentos ao inverter lateralmente a Entrada
          if (key === 'inverterLateralEntrada') {
            const invertido = !!value
            const keysEntrada = ['perifericosSiap01', 'perifericosSiap02', 'perifericosSiap03', 'perifericosSiap04'] as const
            
            // 1. Atualiza periféricos individuais
            keysEntrada.forEach((k) => {
              if (novaConfig[k]) {
                novaConfig[k] = novaConfig[k].map((p) => {
                  const pNormal = p.rotacaoYNormal !== undefined ? p.rotacaoYNormal : p.rotacaoY
                  const pInvertido = p.rotacaoYInvertido !== undefined ? p.rotacaoYInvertido : p.rotacaoY
                  return {
                    ...p,
                    rotacaoYNormal: pNormal,
                    rotacaoYInvertido: pInvertido,
                    rotacaoY: invertido ? pInvertido : pNormal
                  }
                })
              }
            })

            // 2. Atualiza rotações 3D da documentação
            const idsEntrada = ['cancela-entrada', 'poste-siap01', 'poste-siap02', 'poste-siap03', 'poste-siap04']
            const rot3D = { ...(novaConfig.rotacoes3D || {}) }
            const rot3DNormal = { ...(novaConfig.rotacoes3DNormal || {}) }
            const rot3DInvertido = { ...(novaConfig.rotacoes3DInvertido || {}) }

            idsEntrada.forEach((id) => {
              const currentRot = rot3D[id] ?? 0
              if (rot3DNormal[id] === undefined) rot3DNormal[id] = currentRot
              if (rot3DInvertido[id] === undefined) rot3DInvertido[id] = currentRot
              rot3D[id] = invertido ? rot3DInvertido[id] : rot3DNormal[id]
            })

            novaConfig.rotacoes3D = rot3D
            novaConfig.rotacoes3DNormal = rot3DNormal
            novaConfig.rotacoes3DInvertido = rot3DInvertido
          }

          // Ajusta rotações dos equipamentos ao inverter lateralmente a Saída
          if (key === 'inverterLateralSaida') {
            const invertido = !!value
            const keysSaida = ['perifericosSiap05', 'perifericosSiap06', 'perifericosSiap07', 'perifericosSiap08'] as const
            
            // 1. Atualiza periféricos individuais
            keysSaida.forEach((k) => {
              if (novaConfig[k]) {
                novaConfig[k] = novaConfig[k].map((p) => {
                  const pNormal = p.rotacaoYNormal !== undefined ? p.rotacaoYNormal : p.rotacaoY
                  const pInvertido = p.rotacaoYInvertido !== undefined ? p.rotacaoYInvertido : p.rotacaoY
                  return {
                    ...p,
                    rotacaoYNormal: pNormal,
                    rotacaoYInvertido: pInvertido,
                    rotacaoY: invertido ? pInvertido : pNormal
                  }
                })
              }
            })

            // 2. Atualiza rotações 3D da documentação
            const idsSaida = ['cancela-saida', 'poste-siap05', 'poste-siap06', 'poste-siap07', 'poste-siap08']
            const rot3D = { ...(novaConfig.rotacoes3D || {}) }
            const rot3DNormal = { ...(novaConfig.rotacoes3DNormal || {}) }
            const rot3DInvertido = { ...(novaConfig.rotacoes3DInvertido || {}) }

            idsSaida.forEach((id) => {
              const currentRot = rot3D[id] ?? 0
              if (rot3DNormal[id] === undefined) rot3DNormal[id] = currentRot
              if (rot3DInvertido[id] === undefined) rot3DInvertido[id] = currentRot
              rot3D[id] = invertido ? rot3DInvertido[id] : rot3DNormal[id]
            })

            novaConfig.rotacoes3D = rot3D
            novaConfig.rotacoes3DNormal = rot3DNormal
            novaConfig.rotacoes3DInvertido = rot3DInvertido
          }

          // Se o projeto estiver ativo, atualiza também a config do projeto correspondente na lista de recentes
          const novosRecentes = state.projetosRecentes.map((pr) => {
            if (pr.nomeProjeto === state.config.nomeProjeto && pr.codigoProposta === state.config.codigoProposta) {
              return { ...pr, nomeProjeto: novaConfig.nomeProjeto, cliente: novaConfig.cliente, codigoProposta: novaConfig.codigoProposta, config: novaConfig }
            }
            return pr
          })
          const isMeta = key === 'revisao' || key === 'dataAlteracao' || key === 'dataCriacao'
          return {
            config: novaConfig,
            projetosRecentes: novosRecentes,
            isDirty: isMeta ? state.isDirty : true
          }
        }),
      abaAtiva: 'projeto',
      setAbaAtiva: (aba) => set({ abaAtiva: aba }),
      posteEditandoPerifericos: null,
      setPosteEditandoPerifericos: (posteId) => set({ posteEditandoPerifericos: posteId }),
      projetoAtivo: false,
      setProjetoAtivo: (ativo) => set({ projetoAtivo: ativo }),
      projetosRecentes: [],
      criarNovoProjeto: (nomeProjeto, cliente, codigoProposta, usarTemplate) =>
        set((state) => {
          const dataCriacao = new Date().toLocaleDateString('pt-BR')
          const baseConfig = usarTemplate ? { ...CONFIG_PADRAO, ...(templateConfig as any) } : CONFIG_PADRAO
          const novaConfig: ProjectConfig = {
            ...baseConfig,
            nomeProjeto,
            cliente,
            codigoProposta,
            obra: '',
            revisao: 0,
            dataCriacao,
            dataAlteracao: dataCriacao,
          }
          const novoProjeto: ProjetoRecente = {
            id: crypto.randomUUID(),
            nomeProjeto,
            cliente,
            codigoProposta,
            dataCriacao,
            config: novaConfig,
          }
          return {
            config: novaConfig,
            projetoAtivo: true,
            abaAtiva: 'projeto',
            isDirty: false,
            projetosRecentes: [novoProjeto, ...state.projetosRecentes.filter(p => p.nomeProjeto !== nomeProjeto || p.codigoProposta !== codigoProposta)],
          }
        }),
      abrirProjeto: (config) =>
        set((state) => {
          const dataCriacao = config.dataCriacao || new Date().toLocaleDateString('pt-BR')
          const configMesclada: ProjectConfig = {
            ...CONFIG_PADRAO,
            ...config,
            revisao: config.revisao ?? 0,
            dataCriacao: config.dataCriacao || dataCriacao,
            dataAlteracao: config.dataAlteracao || config.dataCriacao || dataCriacao,
          }
          // Adiciona ou joga para o topo da lista de recentes
          const id = state.projetosRecentes.find(p => p.nomeProjeto === configMesclada.nomeProjeto && p.codigoProposta === configMesclada.codigoProposta)?.id || crypto.randomUUID()
          const projetoExistente: ProjetoRecente = {
            id,
            nomeProjeto: configMesclada.nomeProjeto,
            cliente: configMesclada.cliente,
            codigoProposta: configMesclada.codigoProposta,
            dataCriacao: configMesclada.dataCriacao,
            config: configMesclada,
          }
          const listaFiltrada = state.projetosRecentes.filter(p => p.id !== id)
          return {
            config: configMesclada,
            projetoAtivo: true,
            abaAtiva: 'projeto',
            isDirty: false,
            projetosRecentes: [projetoExistente, ...listaFiltrada],
          }
        }),
      fecharProjeto: () => set({ projetoAtivo: false, config: CONFIG_PADRAO, isDirty: false }),
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
      setDirty: (dirty) => set({ isDirty: dirty }),
      salvarConfig: () => {
        let configAtualizada!: ProjectConfig
        set((state) => {
          const novaRevisao = (state.config.revisao ?? 0) + 1
          const dataAlt = new Date().toLocaleDateString('pt-BR')
          configAtualizada = {
            ...state.config,
            revisao: novaRevisao,
            dataAlteracao: dataAlt
          }
          const novosRecentes = state.projetosRecentes.map((pr) => {
            if (pr.nomeProjeto === state.config.nomeProjeto && pr.codigoProposta === state.config.codigoProposta) {
              return {
                ...pr,
                nomeProjeto: configAtualizada.nomeProjeto,
                cliente: configAtualizada.cliente,
                codigoProposta: configAtualizada.codigoProposta,
                config: configAtualizada
              }
            }
            return pr
          })
          return {
            config: configAtualizada,
            projetosRecentes: novosRecentes,
            isDirty: false
          }
        })
        return configAtualizada
      }
    }),
    {
      name: 'siadesk-storage',
      partialize: (state) => ({
        calibracoes: state.calibracoes,
        projetosRecentes: state.projetosRecentes,
        config: state.config,
        projetoAtivo: state.projetoAtivo,
        isDirty: state.isDirty,
      }),
      merge: (persisted, atual) => {
        const p = persisted as Partial<ProjectState> | undefined
        const projetosRecentesMesclados = (p?.projetosRecentes ?? []).map((pr: any) => ({
          ...pr,
          config: {
            ...CONFIG_PADRAO,
            revisao: pr.config?.revisao ?? 0,
            dataCriacao: pr.config?.dataCriacao ?? '',
            dataAlteracao: pr.config?.dataAlteracao ?? '',
            equipamentosAdicionais: pr.config?.equipamentosAdicionais ?? [],
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
            revisao: p?.config?.revisao ?? 0,
            dataCriacao: p?.config?.dataCriacao ?? '',
            dataAlteracao: p?.config?.dataAlteracao ?? '',
            equipamentosAdicionais: p?.config?.equipamentosAdicionais ?? [],
            ...(p?.config ?? {}),
          },
          projetoAtivo: p?.projetoAtivo ?? false,
          isDirty: p?.isDirty ?? false,
        }
      },
    },
  ),
)

