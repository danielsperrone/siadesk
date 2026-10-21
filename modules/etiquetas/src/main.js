import './style.css';
import './home.css';
import { defaults, validate, renderLabel } from './label.js';
import { Printer } from './printer.js';
import { setupProjectLabels } from './project.js';

const $ = id => document.getElementById(id), canvas = $('label-canvas');
const fields = {layout:'layout',title:'title',body:'body',fontSize:'font-size',align:'align',qr:'qr',width:'width',height:'height',density:'density',paper:'paper'};
const numeric = ['fontSize','width','height','density','paper'];
let imageData = '', loadedImage, valid = false, busy = false, connecting = false, templates = [], imageRevision = 0;
const STORAGE = 'nimbot.templates.v1', DRAFT = 'nimbot.draft.v1';
let advanced=new URLSearchParams(location.search).has('editor'),selectedModel='cable',projectLabels;
function setView(value){advanced=value;if(value)projectLabels?.leave();document.body.classList.toggle('advanced',value);$('home-view').className=value?'quiet':'primary';$('advanced-view').className=value?'primary':'quiet';(value?$('editor-fields'):$('quick-settings')).append($('roll-settings'));render();}
function status(text,kind='info') { $('status').textContent=text; $('status').dataset.kind=kind; const ps=$('project-status');if(ps){ps.textContent=text;ps.dataset.kind=kind;} }
function data() {
  const base={...Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,numeric.includes(key)?Number($(id).value):$(id).value])),image:imageData};
  if(advanced)return base;
  const quick={...base,layout:selectedModel,title:$('wire-name').value,body:$('wire-detail').value,fontSize:14,align:'left',qr:'',image:'',name:selectedModel==='electrical'?$('electrical-name').value:$('equipment-name').value,ip:$('equipment-ip').value,username:$('equipment-user').value,password:$('equipment-password').value};
  return projectLabels?.overrideData(quick)||quick;
}
function controls() {
  $('print').disabled = !valid || !printer.connected() || busy || connecting;
  $('export').disabled = !valid || busy; $('connect').disabled = busy || connecting;
  $('transport').disabled=busy||connecting||printer.connected();
  $('editor-fields').disabled = busy; $('copies').disabled = busy;
  $('quick-fields').disabled=busy;
  document.querySelectorAll('[data-model],#home-view,#advanced-view,#roll-settings input,#roll-settings select').forEach(el=>el.disabled=busy);
  for (const id of ['new-label','save-template','import-file']) $(id).disabled=busy;
  document.querySelectorAll('.template-load,.template-delete').forEach(b=>b.disabled=busy);
  projectLabels?.setBusy(busy);
}
const printer = new Printer(status, () => { $('connection-state').textContent='B1 desconectada'; $('connection-state').classList.remove('connected'); $('connect').textContent='Conectar Bluetooth'; controls(); status(busy?'A conexão caiu durante a impressão. Confira se alguma etiqueta já saiu antes de repetir.':'B1 desconectada. Conecte novamente para imprimir.',busy?'error':'info'); });
function render() {
  const cable=$('layout').value==='cable';
  if(cable)$('align').value='left';
  $('align').disabled=cable;
  $('normal-extras').hidden=cable;$('cable-hint').hidden=!cable;
  document.querySelector('label[for="title"]').textContent=cable?'Primeira linha':'Texto principal';
  document.querySelector('label[for="body"]').textContent=cable?'Segunda linha':'Informações adicionais';
  try {
    const current = data(); renderLabel(canvas,current,loadedImage); valid=true;
    $('render-error').hidden=true;
    $('size-badge').textContent=`${current.width} × ${current.height} mm`;
    document.querySelector('.paper-wrap').style.width=`${Math.min(430,current.width*8)}px`;
    try { if(advanced)localStorage.setItem(DRAFT,JSON.stringify(current));localStorage.setItem('nimbot.roll.v1',JSON.stringify(Object.fromEntries(['width','height','density','paper'].map(key=>[key,current[key]])))); } catch { /* Manual model save reports storage problems. */ }
  } catch(error) { valid=false; $('render-error').textContent=error.message; $('render-error').hidden=false; }
  controls();
}
async function decodeImage(src) { const image=new Image(); image.src=src; await image.decode(); return image; }
async function applyData(raw) {
  const next=validate({...defaults,...raw,layout:raw.layout??'normal'});
  const decoded = next.image ? await decodeImage(next.image) : undefined;
  imageRevision++;
  for(const [key,id] of Object.entries(fields)) $(id).value=next[key];
  imageData=next.image; loadedImage=decoded; $('image-name').textContent=imageData?'Imagem carregada':'Adicionar logotipo ou imagem'; $('remove-image').hidden=!imageData;
  render();
}
$('editor-form').addEventListener('submit', e=>e.preventDefault());
$('configure-size').onclick=()=>{$('roll-settings').open=true;$('height').focus();};
$('home-view').onclick=()=>{projectLabels?.leave();setView(false)};$('advanced-view').onclick=()=>setView(true);
$('quick-form').onsubmit=e=>e.preventDefault();$('quick-form').oninput=render;
$('roll-settings').addEventListener('input',render);
document.querySelectorAll('[data-model]').forEach(button=>button.onclick=()=>{
  projectLabels?.leave();
  selectedModel=button.dataset.model;
  document.querySelectorAll('[data-model]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
  for(const model of ['cable','equipment','cross','voltage','siamac','electrical'])$('quick-'+model).hidden=model!==selectedModel;
  $('quick-heading').textContent={cable:'Dados do fio',equipment:'Dados do equipamento',cross:'X grande',electrical:'Equipamento elétrico',voltage:'Aviso de tensão',siamac:'Siamac · site'}[selectedModel];render();
});
$('editor-form').addEventListener('input',e=>{if(e.target.type!=='file')render();});
$('copies').addEventListener('input',()=>{ if(!Number.isInteger(Number($('copies').value)) || Number($('copies').value)<1 || Number($('copies').value)>100) status('Escolha de 1 a 100 cópias.','error'); });
$('image-file').addEventListener('change',async e=>{
  const file=e.target.files[0]; if(!file)return;
  const revision=++imageRevision;
  try {
    if(file.size>8*1024*1024)throw new Error('Escolha uma imagem de até 8 MB.');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Use uma imagem PNG, JPEG ou WebP.');
    const url=URL.createObjectURL(file); let img;
    try { img=await decodeImage(url); } finally { URL.revokeObjectURL(url); }
    const reduced=document.createElement('canvas'),scale=Math.min(1,800/Math.max(img.width,img.height));
    reduced.width=Math.max(1,Math.round(img.width*scale));reduced.height=Math.max(1,Math.round(img.height*scale));
    const ctx=reduced.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,reduced.width,reduced.height);ctx.drawImage(img,0,0,reduced.width,reduced.height);
    const src=reduced.toDataURL('image/png'); const decoded=await decodeImage(src);
    if(revision!==imageRevision)return;
    if(src.length>1500000)throw new Error('A imagem ficou grande demais. Use um arquivo mais simples.');
    imageData=src;loadedImage=decoded;$('image-name').textContent=file.name;$('remove-image').hidden=false;render();
  }catch(error){status(error.message,'error');}finally{e.target.value='';}
});
$('remove-image').onclick=()=>{imageRevision++;imageData='';loadedImage=undefined;$('image-name').textContent='Adicionar logotipo ou imagem';$('remove-image').hidden=true;render();};
$('new-label').onclick=async()=>{await applyData({...data(),title:'',body:'',qr:'',image:''});$('title').focus();};
$('connect').onclick=async()=>{
  if(printer.connected()){await printer.disconnect();return;}
  const transport=$('transport').value;
  if(transport==='serial'?!navigator.serial:!navigator.bluetooth){status('Use o Siadesk desktop ou o Chrome/Edge no Windows para esta conexão.','error');return;}
  connecting=true;controls();status(transport==='serial'?'Selecione a porta COM4 da B1 na janela de conexão.':'Selecione a B1 na janela Bluetooth do navegador.');
  try {
    const name=await printer.connect(transport);$('connection-state').textContent=name+' conectada';$('connection-state').classList.add('connected');$('connect').textContent='Desconectar';status('B1 conectada. Confira a medida do rolo e imprima uma cópia de teste.','success');
  }catch(error){status(error.name==='NotFoundError'?'Nenhuma impressora selecionada. Ligue a B1 e tente conectar novamente.':`Não foi possível conectar: ${error.message}. Desconecte a B1 do celular e tente novamente.`,'error');}
  finally{connecting=false;controls();}
};
$('print').onclick=async()=>{
  if(busy)return; render(); if(!valid)return;
  const quantity=Number($('copies').value);
  if(!Number.isInteger(quantity)||quantity<1||quantity>100){status('Escolha de 1 a 100 cópias.','error');return;}
  busy=true;controls();status(`Enviando ${quantity} ${quantity===1?'etiqueta':'etiquetas'} para a B1…`);
  try{await printer.print(canvas,data(),quantity);status(`A B1 confirmou a impressão de ${quantity} ${quantity===1?'etiqueta':'etiquetas'}.`,'success');}
  catch(error){status(`Não foi possível confirmar a impressão: ${error.message}. Confira papel, tampa e conexão. Algumas etiquetas podem já ter saído; verifique antes de repetir.`,'error');}
  finally{busy=false;controls();}
};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);}
$('export').onclick=()=>{render();if(valid)canvas.toBlob(blob=>{if(blob)download(blob,`etiqueta-${data().width}x${data().height}mm.png`);});};
function renderTemplates(){
  const list=$('template-list');list.replaceChildren();
  if(!templates.length){const p=document.createElement('p');p.className='template-empty';p.textContent='Nenhum modelo salvo ainda. Sua primeira etiqueta pode virar um modelo.';list.append(p);}
  for(const item of templates){
    const row=document.createElement('div');row.className='template-item';
    const load=document.createElement('button');load.className='template-load';const name=document.createElement('strong'),size=document.createElement('small');name.textContent=item.name;size.textContent=`${item.data.width} × ${item.data.height} mm`;load.append(name,size);
    load.onclick=async()=>{if(busy)return;try{await applyData(item.data);$('template-name').value=item.name;status('Modelo carregado.');}catch(error){status(error.message,'error');}};
    const remove=document.createElement('button');remove.className='template-delete';remove.textContent='Excluir';remove.setAttribute('aria-label',`Excluir modelo ${item.name}`);remove.onclick=()=>{if(busy)return;try{const next=templates.filter(t=>t.id!==item.id);localStorage.setItem(STORAGE,JSON.stringify(next));templates=next;renderTemplates();status('Modelo excluído.');}catch{status('Não foi possível salvar a alteração neste navegador.','error');}};
    row.append(load,remove);list.append(row);
  }
  controls();
}
$('save-template').onclick=()=>{
  render();if(!valid){status('Ajuste a etiqueta antes de salvar.','error');return;}
  const name=$('template-name').value.trim();if(!name){status('Dê um nome ao modelo antes de salvar.','error');$('template-name').focus();return;}
  if(templates.length>=50){status('Limite de 50 modelos. Exporte um backup e remova os modelos antigos.','error');return;}
  try{const next=[{id:crypto.randomUUID(),name,data:data()},...templates];localStorage.setItem(STORAGE,JSON.stringify(next));templates=next;renderTemplates();status('Modelo salvo neste navegador.','success');}
  catch{status('O navegador não conseguiu salvar. Exporte seus modelos para liberar espaço.','error');}
};
$('backup').onclick=()=>download(new Blob([JSON.stringify({version:1,templates},null,2)],{type:'application/json'}),'nimbot-modelos.json');
$('import-file').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    if(file.size>10*1024*1024)throw new Error('O backup deve ter até 10 MB.');
    const parsed=JSON.parse(await file.text());if(parsed.version!==1||!Array.isArray(parsed.templates))throw new Error('Formato de backup inválido.');
    if(templates.length+parsed.templates.length>50)throw new Error('O total não pode ultrapassar 50 modelos.');
    const incoming=parsed.templates.map(item=>{if(typeof item.name!=='string'||!item.name.trim()||item.name.length>60)throw new Error('Nome de modelo inválido.');return{id:crypto.randomUUID(),name:item.name,data:validate({...defaults,...item.data,layout:item.data?.layout??'normal'})};});
    for(const item of incoming)if(item.data.image)await decodeImage(item.data.image);
    const next=[...incoming,...templates];localStorage.setItem(STORAGE,JSON.stringify(next));templates=next;renderTemplates();status('Modelos importados.','success');
  }catch(error){status(`Não foi possível importar: ${error.message}`,'error');}finally{e.target.value='';}
};
try { const saved=JSON.parse(localStorage.getItem(STORAGE)||'[]'); if(!Array.isArray(saved)||saved.length>50)throw new Error();templates=saved.map(item=>{if(typeof item.name!=='string'||typeof item.id!=='string')throw new Error();return{...item,data:validate({...defaults,...item.data,layout:item.data?.layout??'normal'})};}); }
catch{status('Não foi possível ler os modelos salvos. Importe um backup para recuperá-los.','error');}
renderTemplates();
let storedRoll;try{storedRoll=JSON.parse(localStorage.getItem('nimbot.roll.v1')||'null');if(storedRoll)validate({...defaults,...storedRoll});}catch{storedRoll=null;}
try{const draft=localStorage.getItem(DRAFT);const saved=draft?JSON.parse(draft):defaults;await applyData({...saved,layout:saved.layout??'cable'});}catch{await applyData(defaults);}
if(storedRoll)for(const key of ['width','height','density','paper'])$(key).value=storedRoll[key];
setView(advanced);
projectLabels=setupProjectLabels({getData:data,refresh:render,status,printer,setBusy:value=>{busy=value;controls();},showHome:()=>setView(false)});
