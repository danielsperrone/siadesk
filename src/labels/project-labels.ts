import { salvarDadosEtiquetas } from './save-labels'
import type { PreferenciasEtiquetas, PieceInstance, ProjectConfig } from '../types'

export interface ProjetoEtiquetas {
  key?: string
  version: 1
  nome: string
  cliente: string
  codigo: string
  equipamentos: { id: string; nome: string; tipo: string; saved?: PreferenciasEtiquetas['equipamentos'][number] }[]
}

// Mesmas instâncias usadas pelo 3D: acessórios estruturais e veículo ilustrativo não são equipamentos.
export function criarProjetoEtiquetas(config: ProjectConfig, pecas: PieceInstance[]): ProjetoEtiquetas {
  const estruturas = new Set(['poste-3m', 'poste-6m', 'poste-1-5m', 'poste-trave', 'cabine', 'veiculo'])
  const equipamentos: ProjetoEtiquetas['equipamentos'] = pecas.filter(p => !estruturas.has(p.tipo)).map(p => ({ id: p.id, nome: p.rotulo, tipo: p.tipo }))
  for (const adicional of config.equipamentosAdicionais || []) {
    if (!Number.isInteger(adicional.quantidade) || adicional.quantidade < 0 || adicional.quantidade > 500) throw new Error('Confira a quantidade dos equipamentos adicionais (0 a 500).')
    for (let i = 0; i < adicional.quantidade; i++) equipamentos.push({
      id: `adicional-${adicional.id}-${i}`, nome: adicional.quantidade > 1 ? `${adicional.nome} ${i + 1}` : adicional.nome, tipo: 'adicional',
    })
  }
  if (equipamentos.length > 500) throw new Error('Este projeto ultrapassa o limite de 500 etiquetas por lista. Divida a instalação em projetos menores.')
  for(const e of equipamentos)e.saved=config.etiquetas?.equipamentos?.find(s=>s.id===e.id)
  return { version: 1, key:crypto.randomUUID(), nome: config.nomeProjeto, cliente: config.cliente, codigo: config.codigoProposta, equipamentos }
}

export async function abrirEtiquetas(projeto: ProjetoEtiquetas) {
  if (window.dimensionador?.abrirEtiquetas) {
    const bridge=window.dimensionador
    bridge.onSalvarEtiquetas(async request=>{
      if(request.key!==projeto.key)return
      try{await salvarDadosEtiquetas(projeto,request.data);bridge.responderEtiquetas(request.requestId,{ok:true})}
      catch(error){bridge.responderEtiquetas(request.requestId,{ok:false,error:error instanceof Error?error.message:'Falha ao salvar.'})}
    })
    const result = await bridge.abrirEtiquetas(projeto)
    if (!result.ok) throw new Error(result.error || 'Não foi possível abrir as etiquetas.')
    return
  }
  // Execução no navegador: envia os dados somente para a janela local criada por este clique.
  const url = new URL('etiquetas/index.html', document.baseURI)
  const popup = window.open(url.href, '_blank', 'popup,width=1380,height=900')
  if (!popup) throw new Error('O navegador bloqueou a janela. Permita a abertura de etiquetas para este Siadesk.')
  const listener = async (event: MessageEvent) => {
    if(event.source===popup&&event.origin===url.origin&&event.data?.type==='siadesk-etiquetas-save'){
      try{await salvarDadosEtiquetas(projeto,event.data.data);popup.postMessage({type:'siadesk-etiquetas-saved',ok:true},url.origin)}
      catch(error){popup.postMessage({type:'siadesk-etiquetas-saved',ok:false,error:error instanceof Error?error.message:'Falha ao salvar.'},url.origin)}
    }
    if (event.source === popup && event.origin === url.origin && event.data?.type === 'siadesk-etiquetas-ready') {
      popup.postMessage({ type: 'siadesk-etiquetas-project', project: projeto }, url.origin)
      clearTimeout(timer)
    }
  }
  const timer = window.setTimeout(() => window.removeEventListener('message', listener), 30000)
  window.addEventListener('message', listener)
}
