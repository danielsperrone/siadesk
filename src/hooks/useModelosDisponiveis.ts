import { useEffect, useState } from 'react'
import { CATALOGO } from '../catalog/pieces'

// Verifica quais arquivos GLB existem em public/models/. Peças sem modelo
// são renderizadas como placeholder; ao adicionar o GLB exportado do
// SketchUp, basta recarregar o app para o modelo real aparecer.
export function useModelosDisponiveis(): Set<string> {
  const [disponiveis, setDisponiveis] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelado = false
    async function verificar() {
      const nomes = [...new Set(Object.values(CATALOGO).map((p) => p.modelo))]
      const resultados = await Promise.all(
        nomes.map(async (nome) => {
          try {
            const res = await fetch(`models/${nome}.glb`, { method: 'HEAD' })
            const tipo = res.headers.get('content-type') ?? ''
            return res.ok && !tipo.includes('text/html') ? nome : null
          } catch {
            return null
          }
        }),
      )
      if (!cancelado) {
        setDisponiveis(new Set(resultados.filter((n): n is string => n !== null)))
      }
    }
    verificar()
    return () => {
      cancelado = true
    }
  }, [])

  return disponiveis
}
