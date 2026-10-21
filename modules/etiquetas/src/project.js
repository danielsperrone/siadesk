import { printBatch } from './batch.js';
import { hasNetwork, itemsFor, labelData, buildJobs } from './recipes.js';
import { renderLabel } from './label.js';
import './project.css';

export function setupProjectLabels({getData,refresh,status,printer,setBusy,showHome}) {
  let rows=[],active=false,current=0,previewItem=null,running=false,stop=false,received=false,dirty=false;
  const confirmed=new Set();
  const section=document.createElement('section');section.id='project-labels';section.hidden=true;
  section.innerHTML=`<h1 id="project-title"></h1><p id="project-description"></p><p class="hint">Confira os conjuntos e os dados de rede. Salvar grava nomes, acessos e escolhas no arquivo do projeto. Entre equipamentos será impressa uma etiqueta Siamac · site.</p><div class="project-actions"><button id="project-preview" class="quiet">Etiquetas do projeto</button><button id="project-all" class="quiet">Selecionar todos</button><button id="project-none" class="quiet">Limpar seleção</button><button id="project-save" class="secondary">Salvar no projeto</button><button id="project-reset" class="quiet" disabled>Reiniciar lote</button><button id="project-print" class="primary">Imprimir selecionados</button><button id="project-stop" class="quiet" hidden>Parar após a etiqueta atual</button></div><p id="project-count" role="status"></p><p id="project-status" role="status"></p><fieldset id="project-fields"><div class="project-scroll"><table><thead><tr><th>Imprimir</th><th>Equipamento</th><th>IP</th><th>Usuário</th><th>Senha</th><th>Etiquetas</th></tr></thead><tbody></tbody></table></div></fieldset>`;
  document.querySelector('.view-nav').after(section);
  const find=id=>document.getElementById(id),tbody=section.querySelector('tbody');
  const modal=document.createElement('dialog');modal.className='label-details';modal.setAttribute('aria-labelledby','details-title');
  modal.innerHTML='<div class="details-heading"><div><h2 id="details-title"></h2><p>Desmarque as cópias que não deseja imprimir.</p></div><button type="button" id="details-close" class="secondary">Concluir</button></div><div id="details-list"></div>';
  document.body.append(modal);find('details-close').onclick=()=>modal.close();
  function change(){dirty=true;find('project-save').textContent='Salvar alterações';}
  const remaining=()=>buildJobs(rows,getData()).filter(j=>!confirmed.has(j.id));
  function count(){const n=rows.filter(r=>r.selected).length,jobs=remaining(),separators=jobs.filter(j=>j.separator).length;
    find('project-count').textContent=`${n} equipamentos selecionados · ${jobs.length} etiquetas pendentes${separators?` (${separators} separadoras Siamac)`:''}`;
    find('project-reset').disabled=running||!confirmed.size;find('project-print').disabled=running||!printer.connected()||!jobs.length;
  }
  function activate(index=current,item=null){active=true;current=index;previewItem=item;showHome();refresh();}
  function details(index){const row=rows[index];find('details-title').textContent=row.name;const list=find('details-list');list.replaceChildren();
    for(const item of itemsFor(row)){
      const line=document.createElement('div');line.className='detail-label';const label=document.createElement('label'),pick=document.createElement('input');pick.type='checkbox';pick.checked=!row.excluded.includes(item.id);
      const text=document.createElement('span');text.textContent=`${item.label} · cópia ${item.copy} de ${item.qty}`;label.append(pick,text);
      pick.onchange=()=>{row.excluded=pick.checked?row.excluded.filter(id=>id!==item.id):[...row.excluded,item.id];change();draw();};
      const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',`Prévia: ${text.textContent}`);
      try{renderLabel(canvas,labelData(row,item,getData()));}catch(error){const msg=document.createElement('p');msg.className='error';msg.textContent=error.message;line.append(msg);}
      const preview=document.createElement('button');preview.className='text-button';preview.textContent='Ampliar';preview.onclick=()=>{modal.close();activate(index,item);};line.append(label,canvas,preview);list.append(line);
    }
    modal.showModal();
  }
  function draw(){tbody.replaceChildren();for(const [i,row] of rows.entries()){
    const tr=document.createElement('tr');tr.classList.toggle('modified',row.excluded.length>0);
    const pick=document.createElement('input');pick.type='checkbox';pick.checked=row.selected;pick.setAttribute('aria-label',`Imprimir ${row.name}`);pick.onchange=()=>{row.selected=pick.checked;count();};const cell=document.createElement('td');cell.append(pick);tr.append(cell);
    function field(key,title){const td=document.createElement('td'),input=document.createElement('input');input.value=row[key];input.maxLength=120;input.autocomplete='off';input.spellcheck=false;input.setAttribute('aria-label',`${title} de ${row.name}`);input.oninput=()=>{row[key]=input.value;change();if(active&&current===i)refresh();else count();};td.append(input);tr.append(td);}
    field('name','Nome');
    if(hasNetwork(row.tipo)){
      field('ip','IP');
      if(row.tipo==='balanca'){for(let k=0;k<2;k++){const td=document.createElement('td');td.textContent='não se aplica';tr.append(td);}}
      else{field('username','Usuário');field('password','Senha');}
    }else{const td=document.createElement('td');td.colSpan=3;td.textContent='Sem dados de rede';td.className='no-network';tr.append(td);}
    const td=document.createElement('td'),button=document.createElement('button');button.className='text-button';const items=itemsFor(row);button.textContent=`Detalhar · ${items.length-row.excluded.length}/${items.length}`;button.onclick=()=>details(i);td.append(button);
    if(row.excluded.length){const note=document.createElement('small');note.textContent='Conjunto alterado';td.append(note);}tr.append(td);tbody.append(tr);
  }count();}
  function receive(p){if(received)return;try{
    if(p?.version!==1||!Array.isArray(p.equipamentos)||p.equipamentos.length>500)throw Error('Dados de projeto inválidos.');received=true;
    document.querySelector('.view-nav').prepend(find('project-preview'));
    find('project-title').textContent=`Etiquetas — ${p.nome}`;find('project-description').textContent=[p.cliente,p.codigo].filter(Boolean).join(' · ');
    rows=p.equipamentos.map(e=>{const saved=e.saved||{},row={id:e.id,tipo:e.tipo,name:saved.nome??e.nome,ip:saved.ip||'',username:saved.username||'',password:saved.password||'',excluded:[],selected:true};const valid=new Set(itemsFor(row).map(i=>i.id));row.excluded=(Array.isArray(saved.excluded)?saved.excluded:[]).filter(id=>valid.has(id));return row;});
    draw();activate(0);if(!rows.length)status('O projeto não contém equipamentos. Os modelos individuais continuam disponíveis.');
  }catch(error){status(error.message,'error');}}
  find('project-reset').onclick=()=>{confirmed.clear();count();status('Contagem reiniciada. O próximo lote incluirá novamente todas as cópias selecionadas.');};
  find('project-all').onclick=()=>{rows.forEach(r=>r.selected=true);draw();};find('project-none').onclick=()=>{rows.forEach(r=>r.selected=false);draw();};find('project-preview').onclick=()=>activate();
  find('project-stop').onclick=()=>{stop=true;find('project-stop').disabled=true;status('O lote será interrompido após a confirmação da etiqueta atual.');};
  find('project-save').onclick=async()=>{
    const data={version:1,equipamentos:rows.map(r=>({id:r.id,nome:r.name,ip:hasNetwork(r.tipo)?r.ip:'',username:r.tipo==='balanca'?'não se aplica':hasNetwork(r.tipo)?r.username:'',password:r.tipo==='balanca'?'não se aplica':hasNetwork(r.tipo)?r.password:'',excluded:[...r.excluded]}))};
    setBusy(true);
    try{let result;if(window.siadeskEtiquetas?.salvar)result=await window.siadeskEtiquetas.salvar(data);
      else if(window.opener)result=await new Promise((resolve,reject)=>{const handler=e=>{if(e.source===window.opener&&e.origin===location.origin&&e.data?.type==='siadesk-etiquetas-saved'){window.removeEventListener('message',handler);clearTimeout(timer);resolve(e.data);}};const timer=setTimeout(()=>{window.removeEventListener('message',handler);reject(Error('Não foi possível confirmar o salvamento.'))},600000);window.addEventListener('message',handler);window.opener.postMessage({type:'siadesk-etiquetas-save',data},location.origin);});
      else throw Error('Abra as etiquetas pelo menu do Siadesk para salvar no projeto.');
      if(!result?.ok)throw Error(result?.error||'Não foi possível salvar.');dirty=false;find('project-save').textContent='Salvar no projeto';status('Projeto salvo com os dados e as escolhas de etiquetas.','success');
    }catch(error){status(error.message,'error');}finally{setBusy(false);}
  };
  find('project-print').onclick=async()=>{
    if(running||!printer.connected())return;const jobs=remaining();stop=false;setBusy(true);find('project-stop').hidden=false;find('project-stop').disabled=false;
    try{const result=await printBatch(printer,jobs,{shouldStop:()=>stop,onConfirmed:(id,n,total)=>{confirmed.add(id);status(`${n} de ${total} etiquetas confirmadas.`);}});status(result.stopped?`Lote interrompido: ${result.confirmed} confirmadas. As restantes continuam pendentes.`:`Lote concluído: ${result.confirmed} etiquetas confirmadas.`,'success');}
    catch(error){status(error.message,'error');}
    finally{setBusy(false);find('project-stop').hidden=true;count();}
  };
  window.addEventListener('beforeunload',event=>{if(dirty||running){event.preventDefault();event.returnValue='';}});
  if(window.siadeskEtiquetas)window.siadeskEtiquetas.obterProjeto().then(receive).catch(e=>status(e.message,'error'));
  else if(window.opener){const listener=e=>{if(e.source===window.opener&&e.origin===location.origin&&e.data?.type==='siadesk-etiquetas-project'){receive(e.data.project);window.removeEventListener('message',listener);}};window.addEventListener('message',listener);window.opener.postMessage({type:'siadesk-etiquetas-ready'},location.origin);}
  return {
    overrideData:base=>active&&rows[current]?labelData(rows[current],previewItem||itemsFor(rows[current]).find(i=>['equipment','electrical'].includes(i.layout))||itemsFor(rows[current])[0],base):base,
    leave(){active=false;section.hidden=true;document.body.classList.remove('project-preview-active');find('project-preview').className='quiet';find('quick-settings').append(find('roll-settings'));},isActive:()=>active,
    setBusy(value){running=value;find('project-fields').disabled=value;for(const id of ['project-preview','project-all','project-none','project-save'])find(id).disabled=value;section.hidden=!active;find('project-preview').className=active?'primary':'quiet';if(active)find('home-view').className='quiet';document.body.classList.toggle('project-preview-active',active);if(active)section.append(find('roll-settings'));count();},
  };
}
