import { useRef, useState } from 'react'
import { useProject } from '../store/project'
import type { FotoProjeto } from '../types'
import './fotos-projeto.css'

const FORMATOS = ['image/jpeg', 'image/png', 'image/webp']

async function importarFoto(file: File): Promise<FotoProjeto> {
  if (!FORMATOS.includes(file.type)) throw new Error('Escolha uma foto JPG, PNG ou WebP.')
  if (file.size > 30 * 1024 * 1024) throw new Error('A foto deve ter até 30 MB. Escolha um arquivo menor.')
  const url = URL.createObjectURL(file)
  try {
    const imagem = new Image()
    imagem.src = url
    await imagem.decode()
    const canvas = document.createElement('canvas')
    let lado = Math.min(2000, Math.max(imagem.naturalWidth, imagem.naturalHeight))
    let dataUrl = ''
    // Limita o tamanho incorporado sem recortar a foto nem deformar suas proporções.
    do {
      const escala = lado / Math.max(imagem.naturalWidth, imagem.naturalHeight)
      canvas.width = Math.max(1, Math.round(imagem.naturalWidth * escala))
      canvas.height = Math.max(1, Math.round(imagem.naturalHeight * escala))
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Não foi possível preparar a foto. Tente novamente.')
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(imagem, 0, 0, canvas.width, canvas.height)
      dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      lado = Math.floor(lado * 0.8)
    } while (dataUrl.length > 350000 && lado > 320)
    return { id: crypto.randomUUID(), nome: file.name, dataUrl }
  } catch (error) {
    if (error instanceof Error && error.message.includes('Tente novamente')) throw error
    throw new Error(`Não foi possível ler “${file.name}”. Escolha uma imagem válida.`)
  } finally { URL.revokeObjectURL(url) }
}

export function FotosProjeto() {
  const fotos = useProject(s => s.config.fotosProjeto) ?? []
  const input = useRef<HTMLInputElement>(null)
  const alvo = useRef<string | null>(null)
  const [ocupado, setOcupado] = useState(false)
  const [erro, setErro] = useState('')

  function escolher(id: string | null = null) {
    alvo.current = id
    if (input.current) {
      input.current.multiple = id === null
      input.current.click()
    }
  }

  async function adicionar(files: File[]) {
    if (!files.length || ocupado) return
    const origem = useProject.getState().config
    const substituir = alvo.current
    const atuais = origem.fotosProjeto ?? []
    if (!substituir && files.length + atuais.length > 4) {
      setErro(`Você pode adicionar mais ${4 - atuais.length} foto(s). O limite é uma principal e três adicionais.`)
      return
    }
    setOcupado(true)
    setErro('')
    try {
      const novas: FotoProjeto[] = []
      for (const file of substituir ? files.slice(0, 1) : files) novas.push(await importarFoto(file))
      // Não aplica uma importação a outro projeto nem sobrescreve alterações feitas durante a leitura.
      if (useProject.getState().config !== origem) throw new Error('O projeto mudou durante a importação. Selecione as fotos novamente.')
      useProject.getState().setConfig('fotosProjeto', substituir
        ? atuais.map(f => f.id === substituir ? novas[0] : f)
        : [...atuais, ...novas])
    } catch (error) { setErro(error instanceof Error ? error.message : 'Não foi possível adicionar as fotos.') }
    finally { setOcupado(false) }
  }

  return <section className="fotos-projeto-editor" aria-labelledby="titulo-fotos-projeto">
    <h2 id="titulo-fotos-projeto">Fotos do projeto</h2>
    <p>Uma foto principal e até três adicionais, em uma página logo após a capa do relatório técnico.</p>
    <input ref={input} type="file" multiple accept="image/jpeg,image/png,image/webp" hidden aria-label="Selecionar fotos do projeto"
      onChange={e => { const files = Array.from(e.target.files ?? []); e.target.value = ''; void adicionar(files) }} />
    {fotos.length > 0 && <ol className="fotos-projeto-lista">
      {fotos.map((foto, index) => <li key={foto.id}>
        <img src={foto.dataUrl} alt={index === 0 ? 'Foto principal do projeto' : `Foto adicional ${index}`} />
        <div className="foto-projeto-info">
          <strong>{index === 0 ? 'Principal' : `Adicional ${index}`}</strong>
          <span title={foto.nome}>{foto.nome}</span>
          <div className="foto-projeto-acoes">
            <button type="button" disabled={ocupado} onClick={() => escolher(foto.id)} aria-label={`Trocar foto ${index + 1}`}>Trocar</button>
            {index > 0 && <button type="button" disabled={ocupado} onClick={() => useProject.getState().setConfig('fotosProjeto', [foto, ...fotos.filter(f => f.id !== foto.id)])} aria-label={`Usar foto ${index + 1} como principal`}>Tornar principal</button>}
            <button type="button" disabled={ocupado} onClick={() => useProject.getState().setConfig('fotosProjeto', fotos.filter(f => f.id !== foto.id))} aria-label={`Remover foto ${index + 1}`}>Remover</button>
          </div>
        </div>
      </li>)}
    </ol>}
    <button type="button" className="fotos-projeto-adicionar" disabled={ocupado || fotos.length >= 4} onClick={() => escolher()}>
      {ocupado ? 'Preparando fotos…' : fotos.length === 0 ? 'Adicionar fotos' : fotos.length === 4 ? 'Limite de 4 fotos atingido' : 'Adicionar fotos adicionais'}
    </button>
    <small>JPG, PNG ou WebP · {fotos.length}/4 fotos</small>
    {erro && <p role="alert" className="fotos-projeto-erro">{erro}</p>}
  </section>
}
