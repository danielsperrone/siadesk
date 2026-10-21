import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export function ModalConfiguracao({ titulo, fechar, children, className = '' }: { titulo: string; fechar: () => void; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const previous = document.activeElement
    ref.current?.showModal()
    return () => { ref.current?.close(); if (previous instanceof HTMLElement && previous.isConnected) previous.focus() }
  }, [])
  return createPortal(<dialog ref={ref} className={`modal-configuracao ${className}`} aria-label={titulo}
    onCancel={e => { e.preventDefault(); fechar() }} onClick={e => { if (e.target === e.currentTarget) {
      const rect = e.currentTarget.getBoundingClientRect()
      if (e.clientX < rect.left || e.clientX > rect.right || e.clientY < rect.top || e.clientY > rect.bottom) fechar()
    } }}>
    <header><h3>{titulo}</h3><button type="button" onClick={fechar} aria-label="Fechar configurações">×</button></header>
    <div className="modal-configuracao-conteudo">{children}</div>
    <footer><button type="button" onClick={fechar}>Concluir</button></footer>
  </dialog>, document.body)
}

export function BotaoConfiguracao({ nome, abrir }: { nome: string; abrir: () => void }) {
  return <button type="button" className="botao-configuracao" onClick={abrir} aria-label={`Configurar ${nome}`} title={`Configurar ${nome}`}>
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      <path d="m9.5 3-.6 2.4-2 .9-2.2-.7-2.5 4.3 1.7 1.7v2.3l-1.7 1.7 2.5 4.3 2.2-.7 2 .9.6 2.4h5l.6-2.4 2-.9 2.2.7 2.5-4.3-1.7-1.7v-2.3l1.7-1.7-2.5-4.3-2.2.7-2-.9-.6-2.4z" transform="translate(0 -1)" />
      <circle cx="12" cy="11.5" r="3" />
    </svg>
  </button>
}
