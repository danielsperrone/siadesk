import { useProject } from '../store/project'
import { queueProject } from '../cloud/sync'
import type { PreferenciasEtiquetas } from '../types'
import type { ProjetoEtiquetas } from './project-labels'

export async function salvarDadosEtiquetas(project:ProjetoEtiquetas,input:PreferenciasEtiquetas) {
  const state=useProject.getState(),current=state.config
  if(!state.projetoAtivo||current.nomeProjeto!==project.nome||current.codigoProposta!==project.codigo)throw new Error('O projeto aberto no Siadesk mudou. Reabra a tela de etiquetas do projeto correto.')
  if(input?.version!==1||!Array.isArray(input.equipamentos)||input.equipamentos.length>500)throw new Error('Dados de etiquetas inválidos.')
  const allowed=new Set(project.equipamentos.map(e=>e.id)),seen=new Set<string>()
  const equipamentos=input.equipamentos.map(e=>{
    if(!allowed.has(e.id)||seen.has(e.id))throw new Error('Equipamento inválido.');seen.add(e.id)
    for(const k of ['nome','ip','username','password'] as const)if(typeof e[k]!=='string'||e[k].length>120||/[\r\n]/.test(e[k]))throw new Error('Confira os campos do equipamento.')
    if(!e.nome.trim()||!Array.isArray(e.excluded)||e.excluded.length>100||e.excluded.some(x=>typeof x!=='string'||x.length>160))throw new Error('Seleção de etiquetas inválida.')
    return {id:e.id,nome:e.nome,ip:e.ip,username:e.username,password:e.password,excluded:[...e.excluded]}
  })
  const labels:PreferenciasEtiquetas={version:1,equipamentos:[...(current.etiquetas?.equipamentos||[]).filter(e=>!seen.has(e.id)),...equipamentos]}
  const updated={...current,cloudId:current.cloudId||crypto.randomUUID(),etiquetas:labels,revisao:(current.revisao||0)+1,dataAlteracao:new Date().toLocaleDateString('pt-BR')}
  if(window.dimensionador?.salvarArquivoEtiquetas){const result=await window.dimensionador.salvarArquivoEtiquetas(updated);if(!result.ok)throw new Error(result.error||'Salvamento cancelado.')}
  else{const url=URL.createObjectURL(new Blob([JSON.stringify(updated,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download=`${current.nomeProjeto.replace(/[<>:"/\\|?*]/g,'_')}.json`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
  const latest=useProject.getState()
  queueProject(updated)
  if(latest.config.nomeProjeto===project.nome&&latest.config.codigoProposta===project.codigo){
    const unchanged=latest.config===current
    latest.setConfig('cloudId',updated.cloudId);latest.setConfig('etiquetas',labels);latest.setConfig('revisao',updated.revisao);latest.setConfig('dataAlteracao',updated.dataAlteracao)
    if(unchanged)latest.setDirty(false)
  }
}
