import { NumberField } from './NumberField'
import { useState } from 'react'
import { useProject } from '../store/project'
import { ALTURA_MAX_POSTE, ALTURA_MIN_POSTE, alturaPoste, limitar } from '../layout/postes'
import type { PosteAdicional } from '../types'

export function AlturaPostePadrao({ id }: { id: string }) {
  const config = useProject(s => s.config)
  const setConfig = useProject(s => s.setConfig)
  return <label className="altura-poste-padrao">Altura do poste (m)
    <input type="number" aria-label={`Altura do poste ${id.toUpperCase()}`} min={ALTURA_MIN_POSTE} max={ALTURA_MAX_POSTE} step={0.1}
      value={alturaPoste(config, id)} onChange={e => setConfig('alturasPostes', { ...config.alturasPostes,
        [id]: limitar(Number(e.target.value), ALTURA_MIN_POSTE, ALTURA_MAX_POSTE) })} />
  </label>
}

export function PostesAdicionais() {
  const config = useProject(s => s.config)
  const setConfig = useProject(s => s.setConfig)
  const editarEquipamentos = useProject(s => s.setPosteEditandoPerifericos)
  const [tipo, setTipo] = useState<PosteAdicional['tipo']>('trave')
  const postes = config.postesAdicionais ?? []
  const alterar = (id: string, valores: Partial<PosteAdicional>) => setConfig('postesAdicionais', postes.map(p => p.id === id ? { ...p, ...valores } : p))
  const adicionar = () => {
    let numero = 1
    while (postes.some(p => p.nome === `Poste ${tipo === 'trave' ? 'trave' : 'simples'} ${numero}`)) numero++
    setConfig('postesAdicionais', [...postes, { id: `adicional-${crypto.randomUUID()}`,
      nome: `Poste ${tipo === 'trave' ? 'trave' : 'simples'} ${numero}`, tipo, referencia: 'A', distanciaX: 0,
      lateral: 'negativa', afastamentoZ: 0.6, afastamentoZPositivo: 0.6, altura: tipo === 'trave' ? 6 : 3,
      fornecimentoSiamac: true, perifericos: [],
    }])
  }
  return <section className="postes-adicionais">
    <h2>Postes adicionais</h2>
    <p className="poste-ajuda">Adicione postes simples ou traves conforme o projeto. Todos ficam apoiados no chão.</p>
    <label>Tipo de poste
      <select value={tipo} onChange={e => setTipo(e.target.value as PosteAdicional['tipo'])}>
        <option value="trave">Poste trave (portal)</option><option value="simples">Poste simples</option>
      </select>
    </label>
    <button type="button" className="poste-acao" onClick={adicionar}>Adicionar poste</button>
    {!postes.length && <p className="poste-ajuda">O poste trave atravessa a balança e recebe equipamentos nas colunas e na barra superior.</p>}
    {postes.map(poste => <details key={poste.id} className="poste-adicional" open>
      <summary>{poste.nome}<span>{poste.perifericos.length} equipamento{poste.perifericos.length === 1 ? '' : 's'}</span></summary>
      <div className="poste-campos">
        <label>Nome do poste<input type="text" value={poste.nome} onChange={e => alterar(poste.id, { nome: e.target.value })} /></label>
        <label>Referência de posicionamento
          <select value={poste.referencia} onChange={e => alterar(poste.id, { referencia: e.target.value as PosteAdicional['referencia'] })}>
            <option value="A">Lado A — cabeceira de entrada</option><option value="B">Lado B — cabeceira de saída</option><option value="meio">Meio da balança</option>
          </select>
        </label>
        <label>Deslocamento longitudinal — X (m)
          <NumberField step={0.1} value={poste.distanciaX} onChange={e => alterar(poste.id, { distanciaX: Number(e.target.value) })} />
        </label>
        <p className="poste-ajuda">{poste.referencia === 'meio' ? 'A partir do centro: positivo em direção ao lado B e negativo ao lado A.' : 'A partir da cabeceira: positivo para fora e negativo sobre a plataforma.'}</p>
        <label>Altura do poste (m)<input type="number" min={ALTURA_MIN_POSTE} max={ALTURA_MAX_POSTE} step={0.1} value={poste.altura}
          onChange={e => alterar(poste.id, { altura: limitar(Number(e.target.value), ALTURA_MIN_POSTE, ALTURA_MAX_POSTE) })} /></label>
        {poste.tipo === 'simples' && <label>Lateral da balança
          <select value={poste.lateral} onChange={e => alterar(poste.id, { lateral: e.target.value as PosteAdicional['lateral'] })}>
            <option value="negativa">Z−</option><option value="positiva">Z+</option>
          </select>
        </label>}
        {(poste.tipo === 'trave' || poste.lateral === 'negativa') && <label>{poste.tipo === 'trave' ? 'Afastamento da coluna Z− (m)' : 'Afastamento lateral — Z (m)'}
          <input type="number" min={0} step={0.1} value={poste.afastamentoZ} onChange={e => alterar(poste.id, { afastamentoZ: Math.max(0, Number(e.target.value)) })} />
        </label>}
        {(poste.tipo === 'trave' || poste.lateral === 'positiva') && <label>{poste.tipo === 'trave' ? 'Afastamento da coluna Z+ (m)' : 'Afastamento lateral — Z (m)'}
          <input type="number" min={0} step={0.1} value={poste.afastamentoZPositivo} onChange={e => alterar(poste.id, { afastamentoZPositivo: Math.max(0, Number(e.target.value)) })} />
        </label>}
        {poste.tipo === 'trave' && <p className="poste-ajuda">Largura entre colunas: <strong>{(config.larguraBalanca + poste.afastamentoZ + poste.afastamentoZPositivo).toFixed(2)} m</strong>. Afastamentos medidos da borda da balança ao eixo de cada coluna.</p>}
        <label className="checkbox"><input type="checkbox" checked={poste.fornecimentoSiamac} onChange={e => alterar(poste.id, { fornecimentoSiamac: e.target.checked })} />Fornecimento SIAMAC</label>
        <div className="poste-acoes">
          <button type="button" className="poste-acao" onClick={() => editarEquipamentos(poste.id)}>Equipamentos</button>
          <button type="button" className="poste-remover" onClick={() => {
            if (poste.perifericos.length && !window.confirm(`Remover ${poste.nome} e seus ${poste.perifericos.length} equipamentos?`)) return
            if (useProject.getState().posteEditandoPerifericos === poste.id) editarEquipamentos(null)
            setConfig('postesAdicionais', postes.filter(p => p.id !== poste.id))
          }}>Remover poste</button>
        </div>
      </div>
    </details>)}
  </section>
}
