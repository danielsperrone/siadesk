import { useEffect, useRef, useState } from 'react'
import { useProject } from '../store/project'
import { useSession } from '../cloud/session'
import { captureStandards, discardSettingsDraft, openCloudProject, resolveConflictsAsCopies, synchronize, useCloud } from '../cloud/sync'
import { closeProjectDialog, confirmLeave, openLocalProject, requestSave, saveTo, useProjectDialogs, type ProjectCommand, type SaveMode } from './commands'
import './projects.css'

export function ProjectCommands() {
  const { dialog, busy, error } = useProjectDialogs()
  const { user, online, message } = useSession()
  const { projects, pending, conflicts, settingsDirty, settingsError, syncing } = useCloud()
  const [mode, setMode] = useState<SaveMode>('both')
  const [search, setSearch] = useState('')
  const [name, setName] = useState('')
  const [client, setClient] = useState('')
  const [code, setCode] = useState('')
  const [template, setTemplate] = useState(false)
  const modal = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const command = async (action: ProjectCommand) => {
      if (!useSession.getState().user || useProjectDialogs.getState().busy) return
      if (useProjectDialogs.getState().dialog && action !== 'save') return
      if (action === 'save') { void requestSave(); return }
      if (['new', 'open', 'close', 'logout'].includes(action) && !await confirmLeave()) return
      if (action === 'close') useProject.getState().fecharProjeto()
      if (action === 'new' || action === 'open' || action === 'sync') {
        useProjectDialogs.setState({dialog: action, error: ''})
        if (action === 'open' || action === 'sync') void synchronize()
      }
      if (action === 'standards' && useSession.getState().user?.admin) {
        if (confirm('Usar as posições e os equipamentos deste projeto como padrão para novos projetos da empresa?')) captureStandards()
      }
      if (action === 'reload-standards' && useSession.getState().user?.admin) {
        if (confirm('Recarregar os padrões do SIASGL? Alterações locais ainda não enviadas serão descartadas somente se a conexão for bem-sucedida.')) await discardSettingsDraft()
      }
      if (action === 'logout') {
        await window.siasgl?.logout()
        useSession.setState({user: null, online: false, message: ''})
      }
    }
    const unsubscribe = window.projectFiles?.onCommand(action => { void command(action).catch(error => { useProjectDialogs.setState({dialog:'sync', error: String(error)}) }) })
    return () => { unsubscribe?.(); closeProjectDialog() }
  }, [])
  useEffect(() => {
    if (dialog) {
      setMode('both'); setSearch(''); setName(''); setClient(''); setCode(''); setTemplate(false)
      modal.current?.showModal()
    } else modal.current?.close()
  }, [dialog])
  const title = dialog === 'save' ? 'Salvar projeto' : dialog === 'new' ? 'Novo projeto' : dialog === 'open' ? 'Abrir projeto' : 'Sincronização'
  return <dialog ref={modal} className="project-dialog" aria-labelledby="project-dialog-title" onCancel={event => { event.preventDefault(); if (!busy) closeProjectDialog() }}>
    <div className="project-dialog-body">
      <h2 id="project-dialog-title">{title}</h2>
      {dialog === 'save' && <form onSubmit={event => { event.preventDefault(); void saveTo(mode) }}>
        <p>Onde deseja salvar este projeto?</p>
        <fieldset className="project-destinations" disabled={busy}>
          <legend>Destino do salvamento</legend>
          {([['both','Nuvem e arquivo local','Salvar no SIASGL e escolher uma pasta neste computador.'],['cloud','Somente na nuvem','Salvar no SIASGL, sem gerar um arquivo.'],['local','Somente arquivo local','Escolher uma pasta, sem enviar esta versão ao SIASGL.']] as const).map(([value,label,description]) => <label key={value}>
            <input type="radio" name="destination" value={value} checked={mode === value} onChange={() => setMode(value)} />
            <span><strong>{label}</strong><small>{description}</small></span>
          </label>)}
        </fieldset>
        {!online && mode !== 'local' && <p>A cópia será enviada automaticamente quando a conexão voltar.</p>}
        {error && <p role="alert" className="project-error">{error}</p>}
        <footer><button type="button" disabled={busy} onClick={() => closeProjectDialog()}>Cancelar</button><button className="project-primary" disabled={busy} type="submit">{busy ? 'Salvando…' : 'Salvar'}</button></footer>
      </form>}
      {dialog === 'new' && <form onSubmit={event => {
        event.preventDefault()
        useProject.getState().criarNovoProjeto(name.trim(), client.trim(), code.trim(), template)
        closeProjectDialog()
      }}>
        <label className="project-field">Nome do projeto<input autoFocus required maxLength={255} value={name} onChange={event => setName(event.target.value)} /></label>
        <label className="project-field">Cliente<input required maxLength={255} value={client} onChange={event => setClient(event.target.value)} /></label>
        <label className="project-field">Código da proposta / OS<input required maxLength={255} value={code} onChange={event => setCode(event.target.value)} /></label>
        <label className="project-checkbox"><input type="checkbox" checked={template} onChange={event => setTemplate(event.target.checked)} />Usar template de balança completa</label>
        <footer><button type="button" onClick={() => closeProjectDialog()}>Cancelar</button><button className="project-primary" type="submit" disabled={!name.trim() || !client.trim() || !code.trim()}>Criar projeto</button></footer>
      </form>}
      {dialog === 'open' && <>
        <button type="button" disabled={busy} onClick={async () => {
          useProjectDialogs.setState({busy:true, error:''})
          try {
            const result = await window.projectFiles?.openLocal()
            if (result?.ok && result.config) { openLocalProject(result.config); closeProjectDialog() }
            else if (result?.error) useProjectDialogs.setState({error:result.error})
          } finally { useProjectDialogs.setState({busy:false}) }
        }}>Escolher arquivo local…</button>
        <h3>Projetos no SIASGL</h3>
        <p>{online ? 'Projetos compartilhados na sua empresa.' : 'Sem conexão. Exibindo os projetos da nuvem disponíveis neste computador.'}</p>
        <label className="project-field">Buscar projeto ou cliente<input type="search" value={search} onChange={event => setSearch(event.target.value)} /></label>
        <div className="project-cloud-list">
          {projects.filter(project => `${project.config.nomeProjeto} ${project.config.cliente} ${project.config.codigoProposta}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())).map(project => <button type="button" key={project.id} disabled={busy} onClick={() => {
            try { openCloudProject(project); closeProjectDialog() } catch (error) { useProjectDialogs.setState({error: (error as Error).message}) }
          }}><strong>{project.config.nomeProjeto}</strong><span>{project.config.cliente} · {project.config.codigoProposta}</span></button>)}
          {!projects.length && <p>{syncing ? 'Carregando projetos…' : 'Nenhum projeto da nuvem disponível. Você pode abrir um arquivo local.'}</p>}
          {projects.length > 0 && !projects.some(project => `${project.config.nomeProjeto} ${project.config.cliente} ${project.config.codigoProposta}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) && <p>Nenhum projeto encontrado para esta busca.</p>}
        </div>
        {error && <p role="alert" className="project-error">{error}</p>}
        <footer><button disabled={syncing || busy} onClick={() => void synchronize()}>{syncing ? 'Atualizando…' : 'Atualizar lista'}</button><button disabled={busy} onClick={() => closeProjectDialog()}>Fechar</button></footer>
      </>}
      {dialog === 'sync' && <>
        <p>{user?.name} · {online ? 'Conectado ao SIASGL' : 'Offline'}</p>
        <p role="status">{settingsError || message || 'Sincronização automática em segundo plano.'}</p>
        <p>{pending} projeto(s) aguardando envio. {settingsDirty ? 'Há padrões locais aguardando envio.' : 'Padrões sincronizados.'}</p>
        {conflicts > 0 && <button onClick={resolveConflictsAsCopies}>Enviar conflitos como cópias</button>}
        {settingsError && user?.admin && <button onClick={() => { if (confirm('Descartar o rascunho local e carregar os padrões da nuvem?')) void discardSettingsDraft() }}>Recarregar padrões da nuvem</button>}
        {error && <p role="alert" className="project-error">{error}</p>}
        <footer><button disabled={syncing} onClick={() => void synchronize()}>{syncing ? 'Sincronizando…' : 'Tentar agora'}</button><button onClick={() => closeProjectDialog()}>Fechar</button></footer>
      </>}
    </div>
  </dialog>
}
