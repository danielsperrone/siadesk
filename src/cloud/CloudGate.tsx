import { useEffect, useState, type ReactNode } from 'react'
import { useSession } from './session'
import { activate, initialize, synchronize } from './sync'
import { ProjectCommands } from '../projects/ProjectCommands'
import { useProject } from '../store/project'
import './cloud.css'
import { SiadeskBrand } from '../components/SiadeskBrand'

let initialization: Promise<void> | undefined
export function CloudGate({ children }: { children: ReactNode }) {
  const { user, ready, message } = useSession()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const active = useProject(s => s.projetoAtivo)
  const presentation = useProject(s => s.modoApresentacao)
  useEffect(() => {
    window.projectFiles?.updateState({authenticated: !!user && ready, active, admin: !!user?.admin, name: user?.name || '', presentation})
  }, [user, ready, active, presentation])
  useEffect(() => {
    initialization ??= initialize().catch(() => { useSession.setState({ ready: true, message: 'Não foi possível recuperar a sessão. Entre novamente.' }) })
    const refresh = () => { void synchronize() }
    const offline = () => useSession.setState({ online: false, message: 'Modo offline. Projetos salvos serão enviados quando a conexão retornar.' })
    window.addEventListener('online', refresh)
    window.addEventListener('offline', offline)
    const interval = window.setInterval(refresh, 60000)
    return () => { window.removeEventListener('online', refresh); window.removeEventListener('offline', offline); window.clearInterval(interval) }
  }, [])
  if (!ready) return <div className="cloud-login"><p role="status">Carregando sua sessão e configurações…</p></div>
  if (!user) return <main className="cloud-login">
    <form className="cloud-login-form" onSubmit={async event => {
      event.preventDefault()
      if (!window.siasgl) { setError('Abra o aplicativo SIADESK instalado para entrar com segurança.'); return }
      setBusy(true); setError('')
      try {
        const result = await window.siasgl.login({ email, password, two_factor_code: code || undefined })
        if (!result.ok) { setError(result.error || 'Não foi possível entrar.'); return }
        setPassword(''); setCode('')
        await activate(result.data.user)
      } catch { setError('Não foi possível conectar. Verifique sua conexão e tente novamente.') }
      finally { setBusy(false) }
    }}>
      <SiadeskBrand />
      <h1>Entrar no SIADESK</h1>
      <p>Use sua conta do SIASGL para carregar os projetos e padrões da sua empresa.</p>
      <label>E-mail do SIASGL<input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} /></label>
      <label>Senha<input type="password" autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>
      <label>Código de autenticação <span>(se ativado)</span><input inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e => setCode(e.target.value)} /></label>
      {(error || message) && <p role="alert" className="cloud-error">{error || message}</p>}
      <button disabled={busy} type="submit">{busy ? 'Entrando…' : 'Entrar com SIASGL'}</button>
      <p className="cloud-login-help">O primeiro acesso precisa de internet. Depois, este computador pode abrir sua última sessão offline.</p>
    </form>
  </main>
  return <>{children}<ProjectCommands /></>
}
