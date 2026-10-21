import {test,expect} from '@playwright/test';
import {recipe,itemsFor,buildJobs,labelData,hasNetwork} from '../../modules/etiquetas/src/recipes.js';
const row=tipo=>({id:tipo,name:'Equipamento teste',tipo,ip:'192.0.2.1',username:'operador',password:'teste',excluded:[],selected:true});
test('receitas respeitam todos os conjuntos e quantidades pedidos',()=>{
  const counts={'balanca':5,'cancela':17,'cancela-lado-a':17,'cancela-lado-b':17,'camera-ip':3,'camera-ip-baixo':3,'camera-ocr':3,'sensor-emissor':11,'sensor-receptor':11,'painel-automacao':8,'painel-som':8,'caixa-de-som':5,'display-mensagens':5,'leitor-rfid':5};
  for(const [tipo,n] of Object.entries(counts))expect(itemsFor(row(tipo)),tipo).toHaveLength(n);
  expect(recipe('cancela').map(i=>[i.body||i.layout,i.qty])).toEqual([['Alimentação 1',1],['Alimentação 2',1],['Terra',1],['Cabo de alimentação',2],['Cabo de controle',2],['Abrir',2],['Fechar',2],['Sinal de Terra',4],['voltage',1],['electrical',1]]);
  expect(labelData(row('balanca'),recipe('balanca')[2],{})).toMatchObject({username:'não se aplica',password:'não se aplica',ip:'192.0.2.1'});
  expect(labelData(row('camera-ocr'),recipe('camera-ocr')[1],{})).toMatchObject({name:'Equipamento teste',password:'teste'});
  expect(hasNetwork('cancela')).toBe(false);expect(hasNetwork('painel-som')).toBe(true);
});
test('separadoras apenas entre grupos, exclusões por cópia e grupos vazios ignorados',()=>{
  const a=row('balanca'),b=row('camera-ip'),c=row('sensor-emissor');a.excluded=['fio:Cabo serial:1'];c.excluded=itemsFor(c).map(i=>i.id);
  const jobs=buildJobs([a,b,c],{});expect(jobs).toHaveLength(8);expect(jobs.filter(j=>j.separator)).toHaveLength(1);expect(jobs[4].data.layout).toBe('siamac');expect(jobs[0].itemId).toBe('fio:Cabo serial:2');expect(buildJobs([b],{}).some(j=>j.separator)).toBe(false);
});
test('modal mostra cópias, destaca exclusão, oculta acessos elétricos e renderiza todos os modelos',async({page})=>{
  await page.addInitScript(()=>{window.siadeskEtiquetas={obterProjeto:async()=>({version:1,nome:'Teste',equipamentos:['cancela','camera-ip','sensor-emissor','painel-som'].map(tipo=>({id:tipo,tipo,nome:tipo}))})};});
  await page.goto('/');await expect(page.locator('#project-fields tbody tr').first().locator('input')).toHaveCount(2);
  await expect(page.locator('#project-fields tbody tr').nth(1).locator('input')).toHaveCount(5);
  await page.locator('#project-fields tbody tr').first().getByRole('button').click();await expect(page.locator('#details-list input')).toHaveCount(17);
  await page.locator('#details-list input').nth(3).uncheck();await page.getByRole('button',{name:'Concluir',exact:true}).click();await expect(page.locator('#project-fields tbody tr').first()).toHaveClass('modified');
  await page.locator('#project-fields tbody tr').first().getByRole('button').click();await expect(page.locator('#details-list input').nth(3)).not.toBeChecked();await expect(page.locator('#details-list input').nth(4)).toBeChecked();
  await page.screenshot({path:'test-results/etiquetas/detalhamento.png'});await page.getByRole('button',{name:'Concluir',exact:true}).click();
  const errors=await page.evaluate(async()=>{const {recipe,labelData}=await import('/src/recipes.js');const {renderLabel,defaults}=await import('/src/label.js');const errors=[];for(const tipo of ['balanca','cancela','camera-ip','sensor-emissor','painel-som','caixa-de-som','display-mensagens','leitor-rfid'])for(const item of recipe(tipo))try{renderLabel(document.createElement('canvas'),labelData({tipo,name:'Equipamento teste',ip:'192.0.2.1',username:'operador',password:'teste'},item,defaults));}catch(e){errors.push(tipo+':'+e.message)}return errors;});expect(errors).toEqual([]);
  await page.locator('#home-view').click();await page.locator('[data-model=electrical]').click();await page.locator('#electrical-name').fill('Cancela de entrada');await expect(page.locator('#export')).toBeEnabled();await page.locator('#label-canvas').screenshot({path:'test-results/etiquetas/eletrico.png'});
});
