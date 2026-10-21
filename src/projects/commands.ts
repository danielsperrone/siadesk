import { create } from 'zustand'
import { useProject } from '../store/project'
import type { ProjectConfig } from '../types'
import { markLocalSave, queueProject } from '../cloud/sync'

export type SaveMode = 'both' | 'cloud' | 'local'
export type ProjectCommand = 'new' | 'open' | 'save' | 'close' | 'sync' | 'standards' | 'reload-standards' | 'logout'
declare global {
  interface Window {
    projectFiles?: {
      onCommand: (callback: (command: ProjectCommand) => void) => () => void
      updateState: (state: {authenticated: boolean; active: boolean; admin: boolean; name: string; presentation: boolean}) => void
      openLocal: () => Promise<{ok: boolean; canceled?: boolean; error?: string; config?: ProjectConfig}>
      saveLocal: (config: ProjectConfig) => Promise<{ok: boolean; canceled?: boolean; error?: string}>
      confirmLeave: () => Promise<'save' | 'discard' | 'cancel'>
    }
  }
}
export const useProjectDialogs = create<{dialog: 'new' | 'open' | 'save' | 'sync' | null; busy: boolean; error: string}>(() => ({dialog: null, busy: false, error: ''}))
let resolveSave: ((success: boolean) => void) | undefined
let savePromise: Promise<boolean> | undefined
let suppliedSnapshot: ProjectConfig | undefined
export function requestSave(snapshot?: ProjectConfig): Promise<boolean> {
  if (savePromise) return savePromise
  if (!useProject.getState().projetoAtivo) return Promise.resolve(false)
  suppliedSnapshot = snapshot
  savePromise = new Promise(resolve => { resolveSave = resolve })
  useProjectDialogs.setState({dialog: 'save', error: ''})
  return savePromise
}
export function closeProjectDialog(success = false) {
  resolveSave?.(success)
  resolveSave = undefined; savePromise = undefined; suppliedSnapshot = undefined
  useProjectDialogs.setState({dialog: null, busy: false, error: ''})
}
export async function saveTo(mode: SaveMode): Promise<void> {
  if (useProjectDialogs.getState().busy) return
  const before = useProject.getState().config
  const config: ProjectConfig = suppliedSnapshot ?? {
    ...before, cloudId: before.cloudId || crypto.randomUUID(), revisao: (before.revisao || 0) + 1, dataAlteracao: new Date().toLocaleDateString('pt-BR'),
  }
  config.cloudId ||= crypto.randomUUID()
  useProjectDialogs.setState({busy: true, error: ''})
  try {
    if (mode !== 'cloud') {
      if (window.projectFiles) {
        const result = await window.projectFiles.saveLocal(config)
        if (result.canceled) { useProjectDialogs.setState({busy: false}); return }
        if (!result.ok) throw new Error(result.error || 'Não foi possível salvar o arquivo local.')
      } else {
        const url = URL.createObjectURL(new Blob([JSON.stringify(config, null, 2)], {type:'application/json'}))
        const anchor = document.createElement('a'); anchor.href = url; anchor.download = `${config.nomeProjeto.replace(/[<>:"/\\|?*]/g, '_') || 'projeto'}.json`; anchor.click()
        setTimeout(() => URL.revokeObjectURL(url), 1000)
      }
    }
    // Local-only changes must not be replaced by the last cloud version during background refresh.
    markLocalSave(config.cloudId!)
    useProject.setState(state => {
      const unchanged = state.config === before
      return {
        config: unchanged ? config : {...state.config, cloudId: config.cloudId},
        isDirty: !unchanged,
        projetosRecentes: state.projetosRecentes.map(project => (before.cloudId && project.config.cloudId === before.cloudId) || (project.nomeProjeto === before.nomeProjeto && project.codigoProposta === before.codigoProposta)
          ? {...project, config: unchanged ? config : state.config} : project),
      }
    })
    if (mode !== 'local') queueProject(config)
    closeProjectDialog(true)
  } catch (error) { useProjectDialogs.setState({busy: false, error: error instanceof Error ? error.message : 'Não foi possível salvar. Tente novamente.'}) }
}
export async function confirmLeave(): Promise<boolean> {
  if (!useProject.getState().isDirty) return true
  const choice = window.projectFiles ? await window.projectFiles.confirmLeave() : (confirm('Deseja salvar o projeto antes de continuar?') ? 'save' : 'cancel')
  if (choice === 'cancel') return false
  return choice === 'discard' || await requestSave()
}
export function openLocalProject(config: ProjectConfig) {
  useProject.getState().abrirProjeto(config)
  markLocalSave(useProject.getState().config.cloudId!)
}
