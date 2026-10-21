import { create } from 'zustand'
import { useProject, CONFIG_PADRAO, CALIBRACOES_PADRAO } from '../store/project'
import type { ProjectConfig } from '../types'
import { useSession, type CloudUser } from './session'

type Pending = { config: ProjectConfig; version: number; conflict?: boolean }
export type CloudProject = { id: string; config: ProjectConfig; version: number; updated_at?: string }
interface Metadata { versions: Record<string, number>; pending: Record<string, Pending>; settingsVersion: number; settingsDirty: boolean; settingsError?: string; projects?: CloudProject[]; localOnly?: Record<string, boolean> }
let meta: Metadata = { versions: {}, pending: {}, settingsVersion: 0, settingsDirty: false }
let key = ''
let applying = false
let running: Promise<void> | null = null
let settingsTimer: ReturnType<typeof setTimeout> | undefined
let publishing = false
export const useCloud = create<{pending: number; conflicts: number; settingsDirty: boolean; settingsError?: string; syncing: boolean; projects: CloudProject[]}>(() => ({ pending: 0, conflicts: 0, settingsDirty: false, syncing: false, projects: [] }))
function persist() {
  if (key) localStorage.setItem(key, JSON.stringify(meta))
  useCloud.setState({ pending: Object.keys(meta.pending).length, conflicts: Object.values(meta.pending).filter(p => p.conflict).length, settingsDirty: meta.settingsDirty, settingsError: meta.settingsError, projects: meta.projects ?? [] })
}
function message(text: string) { useSession.setState({ message: text }) }
function comparable(value: unknown): string {
  if (value && typeof value === 'object') {
    if (!Object.keys(value).length) return '{}'
    if (Array.isArray(value)) return `[${value.map(comparable).join(',')}]`
    return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${JSON.stringify(k)}:${comparable(v)}`).join(',')}}`
  }
  return JSON.stringify(value)
}
function rejected(status: number, error?: string) {
  if (status === 401 || status === 403) useSession.setState({ user: null, online: false })
  else useSession.setState({ online: false })
  message(error || 'Não foi possível sincronizar. A cópia local está preservada.')
}
export async function activate(user: CloudUser) {
  clearTimeout(settingsTimer)
  useSession.setState({ user, ready: false, online: false })
  key = `siadesk-cloud-${user.company_id}-${user.id}`
  try { meta = JSON.parse(localStorage.getItem(key) || 'null') || { versions: {}, pending: {}, settingsVersion: 0, settingsDirty: false } }
  catch { meta = { versions: {}, pending: {}, settingsVersion: 0, settingsDirty: false } }
  const storageName = `siadesk-storage-${user.company_id}-${user.id}`
  // Preserve the old installation's local projects on the first account migration only.
  if (!localStorage.getItem('siadesk-migrated-account') && localStorage.getItem('siadesk-storage')) {
    localStorage.setItem(storageName, localStorage.getItem('siadesk-storage')!)
    localStorage.setItem('siadesk-migrated-account', storageName)
  }
  applying = true
  useProject.persist.setOptions({ name: storageName })
  // Do not write reset state to the account's existing storage before rehydration.
  const saved = localStorage.getItem(storageName)
  useProject.setState({ config: CONFIG_PADRAO, calibracoes: CALIBRACOES_PADRAO, projetosRecentes: [], projetoAtivo: false, isDirty: false, padroesGlobais: {}, cenasGlobais: [], abaAtiva: 'projeto', escopoCena: 'projeto' })
  if (saved) localStorage.setItem(storageName, saved)
  await useProject.persist.rehydrate()
  applying = false
  persist()
  // Render the cached workspace immediately; a slow or absent connection must not block it.
  useSession.setState({ ready: true })
  await synchronize()
}
export async function initialize() {
  const session = await window.siasgl?.session()
  if (session) await activate(session.user)
  else useSession.setState({ ready: true })
}
export function queueProject(config: ProjectConfig) {
  if (!key || !config.cloudId) throw new Error('Entre no SIASGL antes de salvar.')
  const id = config.cloudId
  if (meta.localOnly) delete meta.localOnly[id]
  meta.pending[id] = { config: structuredClone(config), version: meta.versions[id] || 0 }
  persist()
  message('Projeto salvo neste computador; envio ao SIASGL pendente.')
  void synchronize()
}
export function markLocalSave(id: string) {
  meta.localOnly = { ...meta.localOnly, [id]: true }
  persist()
}
export function openCloudProject(project: CloudProject) {
  if (meta.pending[project.id]) throw new Error('Este projeto tem alterações locais aguardando envio. Sincronize ou resolva o conflito em Conta → Sincronização antes de abrir a versão da nuvem.')
  meta.versions[project.id] = project.version
  if (meta.localOnly) delete meta.localOnly[project.id]
  persist()
  useProject.getState().abrirProjeto({ ...project.config, cloudId: project.id })
}
export function synchronize(): Promise<void> {
  if (running) return running
  running = sync().catch(error => message(error instanceof Error ? error.message : 'Falha ao sincronizar.')).finally(() => { running = null; useCloud.setState({ syncing: false }) })
  return running
}
async function sync() {
  if (!useSession.getState().user || !window.siasgl) return
  useCloud.setState({ syncing: true })
  const result = await window.siasgl.request('bootstrap', 'GET')
  if (!result.ok) { rejected(result.status, result.error); return }
  useSession.setState({ user: result.data.user, online: true })
  applying = true
  const state = useProject.getState()
  const settings = result.data.settings
  if (meta.settingsDirty && settings && comparable(settings.data) === comparable({calibracoes: state.calibracoes, padroes: state.padroesGlobais, cenas: state.cenasGlobais})) {
    // The previous upload may have succeeded even when its response was lost.
    meta.settingsVersion = settings.version
    meta.settingsDirty = false
    meta.settingsError = undefined
  }
  if (!meta.settingsDirty && settings && settings.version !== meta.settingsVersion) {
    meta.settingsVersion = settings.version
    useProject.setState({ calibracoes: { ...CALIBRACOES_PADRAO, ...settings.data.calibracoes }, padroesGlobais: settings.data.padroes,
      cenasGlobais: settings.data.cenas, config: { ...state.config, padroesPerifericosPostes: settings.data.padroes.padroesPerifericosPostes } })
  }
  const remoteProjects = result.data.projects as CloudProject[]
  meta.projects = remoteProjects
  let recent = [...useProject.getState().projetosRecentes]
  for (const remote of remoteProjects) {
    const config = { ...CONFIG_PADRAO, ...remote.config, cloudId: remote.id }
    const active = state.config.cloudId === remote.id && state.projetoAtivo
    if (!meta.pending[remote.id] && !meta.localOnly?.[remote.id] && !(active && state.isDirty)
      && (meta.versions[remote.id] !== remote.version || !recent.some(project => project.config.cloudId === remote.id))) {
      recent = recent.filter(p => p.config.cloudId !== remote.id)
      recent.push({ id: remote.id, nomeProjeto: config.nomeProjeto, cliente: config.cliente, codigoProposta: config.codigoProposta, dataCriacao: config.dataCriacao, config })
      if (active) useProject.setState({ config: { ...config, padroesPerifericosPostes: useProject.getState().padroesGlobais.padroesPerifericosPostes } })
      meta.versions[remote.id] = remote.version
    }
  }
  useProject.setState({ projetosRecentes: recent })
  applying = false
  if (!settings && meta.settingsVersion === 0 && result.data.user.admin && !meta.settingsDirty) {
    const current = useProject.getState()
    useProject.setState({ padroesGlobais: {
      ...extractStandards(CONFIG_PADRAO), ...current.padroesGlobais,
      ...(current.config.padroesPerifericosPostes ? { padroesPerifericosPostes: current.config.padroesPerifericosPostes } : {}),
    } })
    // The first administrator carries the installation's existing calibrations into the cloud.
    clearTimeout(settingsTimer)
    await publishSettings()
  }
  if (meta.settingsDirty && !meta.settingsError && result.data.user.admin) await publishSettings()
  if (!useSession.getState().online) return
  for (const [id, pending] of Object.entries(meta.pending)) {
    if (pending.conflict) continue
    const snapshot = JSON.stringify(pending.config)
    const saved = await window.siasgl.request(`projects/${id}`, 'PUT', { version: pending.version, config: pending.config })
    if (saved.ok) {
      meta.versions[id] = saved.data.version
      if (meta.pending[id] && JSON.stringify(meta.pending[id].config) === snapshot) delete meta.pending[id]
      else if (meta.pending[id]) meta.pending[id].version = saved.data.version
    } else if (saved.status === 409) meta.pending[id].conflict = true
    else { if (saved.status === 0 || saved.status === 401 || saved.status === 403) rejected(saved.status, saved.error); else message(saved.error || 'Falha no envio do projeto.'); persist(); return }
    persist()
  }
  persist()
  if (useCloud.getState().conflicts) message('Há versões diferentes deste projeto. Salve a cópia pendente como outro projeto para preservar as duas.')
  else if (useCloud.getState().pending) message('Há projetos locais aguardando envio ao SIASGL.')
  else message('Projetos sincronizados com o SIASGL.')
}
export async function publishSettings() {
  if (publishing || !useSession.getState().user?.admin) return
  publishing = true
  clearTimeout(settingsTimer)
  const state = useProject.getState()
  const data = { calibracoes: state.calibracoes, padroes: state.padroesGlobais, cenas: state.cenasGlobais }
  const snapshot = JSON.stringify(data)
  const accountKey = key
  let result
  try { result = await window.siasgl!.request('settings', 'PUT', { version: meta.settingsVersion, data }) }
  catch { result = {ok: false, status: 0, error: 'Não foi possível publicar os padrões. O rascunho local foi preservado.'} }
  finally { publishing = false }
  if (key !== accountKey) return
  if (result.ok) {
    meta.settingsError = undefined
    meta.settingsVersion = result.data.version
    const latest = useProject.getState()
    meta.settingsDirty = snapshot !== JSON.stringify({ calibracoes: latest.calibracoes, padroes: latest.padroesGlobais, cenas: latest.cenasGlobais })
    message('Padrões publicados para todos os usuários da empresa.')
    if (meta.settingsDirty) settingsTimer = setTimeout(() => void publishSettings(), 800)
  } else {
    meta.settingsError = result.status === 409 ? 'Padrões alterados em outro computador. Seu rascunho foi preservado. Use Padrões para recarregar a versão da nuvem.' : result.status === 422 ? result.error : undefined
    message(result.error || 'Não foi possível publicar os padrões.')
    if (result.status === 0 || result.status === 401) rejected(result.status, result.error)
    if (result.status === 403) { useSession.setState({ online: false }); void synchronize() }
  }
  persist()
}
export async function discardSettingsDraft() {
  if (!useSession.getState().user?.admin || publishing) return
  const result = await window.siasgl!.request('bootstrap', 'GET')
  if (!result.ok) { rejected(result.status, result.error); return }
  if (!result.data.settings) { message('Ainda não há padrões publicados na nuvem. O rascunho local foi preservado.'); return }
  const settings = result.data.settings
  applying = true
  useSession.setState({user: result.data.user, online: true})
  useProject.setState(state => ({ calibracoes: {...CALIBRACOES_PADRAO, ...settings.data.calibracoes}, padroesGlobais: settings.data.padroes,
    cenasGlobais: settings.data.cenas, config: {...state.config, padroesPerifericosPostes: settings.data.padroes.padroesPerifericosPostes} }))
  applying = false
  meta.settingsVersion = settings.version
  meta.settingsDirty = false
  meta.settingsError = undefined
  persist()
  message('Padrões da nuvem carregados.')
}
export function captureStandards() {
  if (!useSession.getState().user?.admin) return
  const { config } = useProject.getState()
  useProject.setState({ padroesGlobais: extractStandards(config) })
  message('Posições e equipamentos atuais definidos como padrão. Sincronizando com a empresa…')
}
function extractStandards(config: ProjectConfig) {
  const { nomeProjeto, cliente, codigoProposta, obra, dataCriacao, dataAlteracao, revisao, cenas, cloudId, etiquetas, cancelasAbertas, ...standards } = config
  return standards
}
export function resolveConflictsAsCopies() {
  for (const [id, pending] of Object.entries(meta.pending)) {
    if (!pending.conflict) continue
    const newId = crypto.randomUUID()
    const config = { ...pending.config, cloudId: newId, nomeProjeto: `${pending.config.nomeProjeto} (cópia local)` }
    meta.pending[newId] = { config, version: 0 }
    delete meta.pending[id]
    useProject.getState().abrirProjeto(config)
  }
  persist()
  void synchronize()
}
useProject.subscribe((state, previous) => {
  if (applying || !key) return
  if (state.calibracoes !== previous.calibracoes || state.padroesGlobais !== previous.padroesGlobais || state.cenasGlobais !== previous.cenasGlobais) {
    meta.settingsDirty = true
    persist()
    clearTimeout(settingsTimer)
    settingsTimer = setTimeout(() => void publishSettings(), 800)
  }
})
