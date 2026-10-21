import { test, expect, _electron as electron } from '@playwright/test';
import path from 'node:path';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { criarProjetoEtiquetas } from '../../src/labels/project-labels';

test('lista usa equipamentos, exclui estruturas e expande adicionais',()=>{
  const config={nomeProjeto:'Teste',cliente:'Cliente teste',codigoProposta:'TESTE',equipamentosAdicionais:[{id:'x',nome:'Switch',quantidade:2}]};
  const pecas=['poste-3m','veiculo','cabine','balanca','sensor'].map((tipo,i)=>({id:String(i),tipo,rotulo:tipo}));
  const p=criarProjetoEtiquetas(config,pecas);
  expect(p.equipamentos.map(e=>e.nome)).toEqual(['balanca','sensor','Switch 1','Switch 2']);
  expect(()=>criarProjetoEtiquetas({...config,equipamentosAdicionais:[{id:'x',nome:'X',quantidade:501}]},[])).toThrow();
});

test('lote valida tudo, confirma em sequência, interrompe e preserva o retrato dos dados',async({page})=>{
  await page.goto('/');
  const r=await page.evaluate(async()=>{
    const {printBatch}=await import('/src/batch.js');
    const {defaults}=await import('/src/label.js');
    const jobs=()=>[1,2,3].map(n=>({id:String(n),data:{...defaults,layout:'equipment',name:`Equipamento ${n}`,ip:'',username:'',password:'',allowEmptyAccess:true}}));
    let calls=[];const invalid=jobs();invalid[2].data.name='';
    try{await printBatch({print:async()=>calls.push('invalid')},invalid)}catch{}
    const preflight=calls.length;
    const stable=jobs(),confirmed=[];
    await printBatch({print:async(c,d,n)=>{calls.push([d.name,n]);stable[1].data.name='EDITADO';}},stable,{onConfirmed:id=>confirmed.push(id)});
    const failureCalls=[];let failure;
    try{await printBatch({print:async(c,d)=>{failureCalls.push(d.name);if(failureCalls.length===2)throw Error('Sem papel');}},jobs());}catch(e){failure=e.message;}
    let stop=false;
    const stopped=await printBatch({print:async()=>{}},jobs(),{onConfirmed:()=>stop=true,shouldStop:()=>stop});
    return {preflight,calls,confirmed,failureCalls,failure,stopped};
  });
  expect(r.preflight).toBe(0);expect(r.calls).toEqual([['Equipamento 1',1],['Equipamento 2',1],['Equipamento 3',1]]);
  expect(r.confirmed).toEqual(['1','2','3']);expect(r.failureCalls).toHaveLength(2);expect(r.failure).toContain('1 de 3 confirmadas');expect(r.failure).toContain('Confira se essa etiqueta saiu');
  expect(r.stopped).toEqual({confirmed:1,total:3,stopped:true});
});

test('Electron salva no JSON, cancela sem perda e restaura dados e exclusões',async()=>{
  const profile=mkdtempSync(path.join(tmpdir(),'siadesk-package-test-'));
  const app=await electron.launch(process.env.SIADESK_TEST_EXECUTABLE?{executablePath:process.env.SIADESK_TEST_EXECUTABLE,args:[`--user-data-dir=${profile}`,'--disable-gpu']}:{args:[path.resolve('tests/etiquetas/entrada.cjs')]});
  try{
    const main=await app.firstWindow();expect(app.windows()).toHaveLength(1);
    await main.getByLabel('Nome do Projeto',{exact:true}).fill('Projeto de teste');await main.getByLabel('Nome do Cliente',{exact:true}).fill('Cliente de teste');await main.getByLabel('Código da Proposta / OS',{exact:true}).fill('TESTE');await main.getByRole('button',{name:'Criar Projeto',exact:true}).click();
    async function open(){await main.getByRole('button',{name:/Emitir documentos/}).click();const next=app.waitForEvent('window');await main.getByRole('button',{name:'Etiquetas do projeto (NIIMBOT B1)',exact:true}).click();const page=await next;await expect(page.locator('#project-title')).toBeVisible();return page;}
    const labels=await open();await expect(labels.locator('[data-model]')).toHaveCount(6);
    await labels.getByLabel('IP de Balança rodoviária',{exact:true}).fill('192.0.2.10');
    const withLogin=labels.locator('#project-fields input[aria-label^="Usuário de"]').first();await withLogin.fill('operador');
    await labels.locator('#project-fields input[aria-label^="Senha de"]').first().fill('TESTE-123');
    await labels.locator('#project-fields tbody tr').first().getByRole('button').click();await labels.locator('#details-list input').first().uncheck();await labels.getByRole('button',{name:'Concluir',exact:true}).click();
    await expect(labels.locator('#project-fields tbody tr').first()).toHaveClass('modified');
    await app.evaluate(({dialog})=>{dialog.showSaveDialog=async()=>({canceled:true});});await labels.locator('#project-save').click();await expect(labels.locator('#project-status')).toContainText('cancelado');await expect(labels.getByLabel('IP de Balança rodoviária',{exact:true})).toHaveValue('192.0.2.10');
    const file=path.join(profile,'projeto.json');await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});},file);
    await labels.locator('#project-save').click();await expect(labels.locator('#project-status')).toContainText('Projeto salvo');
    const saved=JSON.parse((await import('node:fs')).readFileSync(file,'utf8'));expect(saved.etiquetas.equipamentos.find(e=>e.nome==='Balança rodoviária')).toMatchObject({ip:'192.0.2.10',username:'não se aplica',password:'não se aplica',excluded:['fio:Cabo serial:1']});expect(saved.etiquetas.equipamentos.some(e=>e.password==='TESTE-123')).toBe(true);
    await labels.screenshot({path:'test-results/etiquetas/projeto-conjuntos.png',fullPage:true});
    await labels.close();
    await main.getByRole('button',{name:'Sair',exact:true}).click();
    await main.locator('input[type=file]').first().setInputFiles(file);
    const again=await open();await expect(again.getByLabel('IP de Balança rodoviária',{exact:true})).toHaveValue('192.0.2.10');await expect(again.locator('#project-fields tbody tr').first()).toHaveClass('modified');
    await expect(again.locator('#project-fields input[aria-label^="Senha de"]').first()).toHaveValue('TESTE-123');
  }finally{await app.close();}
});
