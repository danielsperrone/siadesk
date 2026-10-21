// Receitas físicas. Cada cópia é um trabalho individual, confirmado pela impressora.
export const hasNetwork = type => ['balanca','camera-ip','camera-ip-baixo','camera-ocr','painel-automacao','painel-som','display-mensagens','leitor-rfid'].includes(type);
export function recipe(type) {
  const fio=(body,qty)=>({key:`fio:${body}`,layout:'cable',body,qty,label:`Fio · ${body}`});
  const equip={key:'equipment',layout:'equipment',qty:1,label:'Identificação do equipamento'};
  const eletrico={key:'electrical',layout:'electrical',qty:1,label:'Equipamento elétrico'};
  const ethernet=fio('Cabo Ethernet',2);
  if(type==='balanca')return [fio('Cabo serial',2),ethernet,equip];
  if(type.startsWith('cancela'))return [fio('Alimentação 1',1),fio('Alimentação 2',1),fio('Terra',1),fio('Cabo de alimentação',2),fio('Cabo de controle',2),fio('Abrir',2),fio('Fechar',2),fio('Sinal de Terra',4),{key:'voltage',layout:'voltage',qty:1,label:'Aviso · verifique a chave na placa',voltageText:'VERIFIQUE A CHAVE NA PLACA'},eletrico];
  if(type.startsWith('camera-'))return [ethernet,equip];
  if(type.startsWith('sensor-'))return [eletrico,fio('Cabo do sensor',2),fio('24v +',2),fio('24v -',2),fio('Sinal',2),fio('Retorno do sinal',2)];
  if(['painel-automacao','painel-som'].includes(type))return [ethernet,equip,fio('Cabo de alimentação',2),fio('Alimentação 1',1),fio('Alimentação 2',1),fio('Terra',1)];
  if(type==='caixa-de-som')return [eletrico,fio('Cabo paralelo 1',2),fio('Cabo paralelo 2',2)];
  if(['display-mensagens','leitor-rfid'].includes(type))return [ethernet,equip,fio('Alimentação',2)];
  return [eletrico];
}
export function labelData(row,item,base) {
  return {...base,layout:item.layout,title:row.name,body:item.body||'',name:row.name,ip:row.ip||'',username:row.tipo==='balanca'?'não se aplica':row.username||'',password:row.tipo==='balanca'?'não se aplica':row.password||'',allowEmptyAccess:true,voltageText:item.voltageText||'',qr:'',image:'',align:'left',fontSize:14};
}
export function itemsFor(row) {
  return recipe(row.tipo).flatMap(item=>Array.from({length:item.qty},(_,i)=>({...item,id:`${item.key}:${i+1}`,copy:i+1})));
}
export function buildJobs(rows,base) {
  const groups=rows.filter(r=>r.selected).map(row=>({row,items:itemsFor(row).filter(i=>!row.excluded.includes(i.id))})).filter(g=>g.items.length);
  return groups.flatMap(({row,items},n)=>[
    ...(n?[{id:`separator:${groups[n-1].row.id}:${row.id}`,separator:true,data:{...base,layout:'siamac',title:'',body:'',qr:'',image:''}}]:[]),
    ...items.map(item=>({id:`${row.id}/${item.id}`,rowId:row.id,itemId:item.id,data:labelData(row,item,base)}))
  ]);
}
