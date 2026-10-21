import { useEffect, useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { CanalCancela } from '../simulator/types'

export interface AlvoCancela { id: string; rotulo: string; x: number; y: number }

export function MenuCancela({ alvo, aberta, fechar, alterar, canal, definirCanal }: {
  alvo: AlvoCancela
  aberta: boolean
  fechar: () => void
  alterar: (aberta: boolean) => void
  canal: CanalCancela
  definirCanal: (canal: CanalCancela) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const focoAnterior = useRef<Element | null>(null)
  useLayoutEffect(() => {
    const menu = ref.current!
    if (!menu.contains(document.activeElement)) focoAnterior.current = document.activeElement
    menu.style.left = `${Math.max(8, Math.min(alvo.x, window.innerWidth - menu.offsetWidth - 8))}px`
    menu.style.top = `${Math.max(8, Math.min(alvo.y, window.innerHeight - menu.offsetHeight - 8))}px`
    menu.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
  }, [alvo])
  useEffect(() => {
    const fora = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) fechar() }
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Tab') fechar()
    }
    window.addEventListener('pointerdown', fora)
    window.addEventListener('keydown', tecla)
    window.addEventListener('resize', fechar)
    window.addEventListener('blur', fechar)
    return () => {
      window.removeEventListener('pointerdown', fora)
      window.removeEventListener('keydown', tecla)
      window.removeEventListener('resize', fechar)
      window.removeEventListener('blur', fechar)
      const anterior = focoAnterior.current
      if (anterior instanceof HTMLElement && anterior.isConnected) anterior.focus()
    }
  }, [fechar])
  return createPortal(
    <div ref={ref} className="menu-cancela" role="dialog" aria-label={alvo.rotulo}
      onContextMenu={(e) => e.preventDefault()}>
      <strong>{alvo.rotulo}</strong>
      <label className="controle-sinalizacao">Canal no simulador
        <select value={canal} onChange={e => definirCanal(e.target.value as CanalCancela)}>
          <option value="A">Cancela A (entrada)</option><option value="B">Cancela B (saída)</option><option value="figurante">Figurante / controle manual</option>
        </select>
      </label>
      <button disabled={aberta} onClick={() => alterar(true)}>Abrir cancela</button>
      <button disabled={!aberta} onClick={() => alterar(false)}>Fechar cancela</button>
    </div>, document.body,
  )
}
