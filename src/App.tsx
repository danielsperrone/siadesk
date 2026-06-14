import { useState, useRef, useEffect } from 'react'
import { ConfigPanel } from './components/ConfigPanel'
import { Scene } from './components/Scene'
import { useProject } from './store/project'

export default function App() {
  const [mostrarRotulos, setMostrarRotulos] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-rotulos') !== 'false'
  })
  const [mostrarGrades, setMostrarGrades] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-grades') !== 'false'
  })
  const [mostrarPista, setMostrarPista] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-pista') !== 'false'
  })
  const [mostrarGrama, setMostrarGrama] = useState(() => {
    return localStorage.getItem('siadesk-mostrar-grama') !== 'false'
  })

  // Efeitos para persistir os estados de visualização no localStorage
  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-rotulos', String(mostrarRotulos))
  }, [mostrarRotulos])

  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-grades', String(mostrarGrades))
  }, [mostrarGrades])

  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-pista', String(mostrarPista))
  }, [mostrarPista])

  useEffect(() => {
    localStorage.setItem('siadesk-mostrar-grama', String(mostrarGrama))
  }, [mostrarGrama])
  
  // Estado para formulário de criação de projeto
  const [novoNome, setNovoNome] = useState('')
  const [novoCliente, setNovoCliente] = useState('')
  const [novoCodigo, setNovoCodigo] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)

  const projetoAtivo = useProject((s) => s.projetoAtivo)
  const config = useProject((s) => s.config)
  const abaAtiva = useProject((s) => s.abaAtiva)
  const setAbaAtiva = useProject((s) => s.setAbaAtiva)
  const criarNovoProjeto = useProject((s) => s.criarNovoProjeto)
  const abrirProjeto = useProject((s) => s.abrirProjeto)
  const fecharProjeto = useProject((s) => s.fecharProjeto)
  const projetosRecentes = useProject((s) => s.projetosRecentes)
  const excluirProjetoRecente = useProject((s) => s.excluirProjetoRecente)

  const handleCriar = (e: React.FormEvent) => {
    e.preventDefault()
    if (!novoNome.trim() || !novoCliente.trim() || !novoCodigo.trim()) {
      alert('Por favor, preencha todos os campos para criar o projeto.')
      return
    }
    criarNovoProjeto(novoNome, novoCliente, novoCodigo)
    // Limpa os campos do formulário
    setNovoNome('')
    setNovoCliente('')
    setNovoCodigo('')
  }

  const handleImportarJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (parsed.nomeProjeto !== undefined && parsed.cliente !== undefined) {
          abrirProjeto(parsed)
        } else {
          alert('Arquivo JSON inválido. Verifique se é um projeto SIADESK.')
        }
      } catch (err) {
        alert('Erro ao ler o arquivo JSON.')
      }
    }
    reader.readAsText(file)
    // Limpa o input para permitir importar o mesmo arquivo novamente se necessário
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleExportarJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(config, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute("href", dataStr)
    const filename = `${config.nomeProjeto.toLowerCase().replace(/\s+/g, '-') || 'projeto'}-${config.codigoProposta || 'proposta'}.json`
    downloadAnchor.setAttribute("download", filename)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  // --- Renderização da Tela de Boas-vindas ---
  if (!projetoAtivo) {
    return (
      <div className="tela-inicio">
        <div className="inicio-header">
          <h1>SIADESK</h1>
          <p className="sub">Dimensionador de Automação de Balança Rodoviária</p>
        </div>

        <div className="inicio-grid">
          {/* Card: Criar Novo Projeto */}
          <div className="card-inicio">
            <h2>
              <span style={{ fontSize: '24px' }}>⚡</span> Criar Novo Projeto
            </h2>
            <form onSubmit={handleCriar} className="form-inicio">
              <label>
                Nome do Projeto
                <input
                  type="text"
                  placeholder="Ex: Balança Termoelétrica Sul"
                  value={novoNome}
                  onChange={(e) => setNovoNome(e.target.value)}
                />
              </label>
              <label>
                Nome do Cliente
                <input
                  type="text"
                  placeholder="Ex: Lactalis Brasil"
                  value={novoCliente}
                  onChange={(e) => setNovoCliente(e.target.value)}
                />
              </label>
              <label>
                Código da Proposta / OS
                <input
                  type="text"
                  placeholder="Ex: OWLAUT-220424"
                  value={novoCodigo}
                  onChange={(e) => setNovoCodigo(e.target.value)}
                />
              </label>
              <button type="submit" className="btn-principal">
                Criar Projeto
              </button>
            </form>
          </div>

          {/* Card: Abrir Existente ou Recentes */}
          <div className="card-inicio">
            <h2>
              <span style={{ fontSize: '24px' }}>📂</span> Abrir Projeto
            </h2>
            
            <button 
              className="btn-upload"
              onClick={() => fileInputRef.current?.click()}
            >
              Importar arquivo .json
            </button>
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImportarJSON}
              accept=".json"
              style={{ display: 'none' }}
            />

            <h3 style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '12px', fontWeight: '600' }}>
              Projetos Recentes
            </h3>

            <div className="recentes-lista">
              {projetosRecentes.length === 0 ? (
                <p className="sem-recentes">Nenhum projeto recente encontrado.</p>
              ) : (
                projetosRecentes.map((p) => (
                  <div key={p.id} className="recente-item" onClick={() => abrirProjeto(p.config)}>
                    <div className="recente-info">
                      <span className="recente-nome">{p.nomeProjeto}</span>
                      <span className="recente-detalhes">
                        {p.cliente} • {p.codigoProposta} • {p.dataCriacao}
                      </span>
                    </div>
                    <button 
                      className="btn-excluir-recente"
                      onClick={(e) => {
                        e.stopPropagation()
                        excluirProjetoRecente(p.id)
                      }}
                      title="Remover da lista"
                    >
                      🗑️
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- Renderização da Interface Principal com Menu Superior ---
  return (
    <div className="app-container">
      {/* Menu Superior Horizontal */}
      <header className="menu-superior">
        <div className="logo-superior">
          <h2>SIADESK</h2>
          <span>{config.nomeProjeto}</span>
        </div>

        <nav className="abas-superiores">
          <button
            className={abaAtiva === 'projeto' ? 'active' : ''}
            onClick={() => setAbaAtiva('projeto')}
          >
            📋 Projeto
          </button>
          <button
            className={abaAtiva === 'postes' ? 'active' : ''}
            onClick={() => setAbaAtiva('postes')}
          >
            🛢️ Equipamentos
          </button>
          <button
            className={abaAtiva === 'calibracao' ? 'active' : ''}
            onClick={() => setAbaAtiva('calibracao')}
          >
            ⚙️ Calibrar
          </button>
        </nav>

        <div className="acoes-superiores">
          <button 
            className="btn-principal" 
            style={{ padding: '7px 14px', fontSize: '12px', marginTop: 0 }}
            onClick={handleExportarJSON}
          >
            💾 Salvar Projeto (.json)
          </button>
          <button 
            className="btn-sair"
            onClick={fecharProjeto}
          >
            Sair
          </button>
        </div>
      </header>

      {/* Conteúdo Principal (Painel Lateral + Cena 3D) */}
      <div className="conteudo-principal">
        <ConfigPanel />
        <main className="viewport" style={{ flex: 1, height: '100%', position: 'relative' }}>
          <div className="toolbar" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarRotulos}
                onChange={(e) => setMostrarRotulos(e.target.checked)}
              />
              Mostrar rótulos
            </label>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarGrades}
                onChange={(e) => setMostrarGrades(e.target.checked)}
              />
              Mostrar grades
            </label>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarPista}
                onChange={(e) => setMostrarPista(e.target.checked)}
              />
              Mostrar pista
            </label>
            <label className="checkbox" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={mostrarGrama}
                onChange={(e) => setMostrarGrama(e.target.checked)}
              />
              Mostrar grama
            </label>
          </div>
          <Scene
            mostrarRotulos={mostrarRotulos}
            mostrarGrades={mostrarGrades}
            mostrarPista={mostrarPista}
            mostrarGrama={mostrarGrama}
          />
        </main>
      </div>
    </div>
  )
}
