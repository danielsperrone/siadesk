import { chromium } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
const browser=await chromium.launch({headless:true,channel:'msedge'})
const page=await browser.newPage({viewport:{width:1440,height:1000}})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
try {
 await page.goto('http://127.0.0.1:5192', {waitUntil:'domcontentloaded',timeout:90000})
 await page.waitForTimeout(1500); await page.evaluate(async()=>{
 const {useSession}=await import('/src/cloud/session.ts');useSession.setState({ready:true,user:{id:1,name:'Teste',email:'teste@example.test',company_id:1,admin:true}})
 const {useProject,CONFIG_PADRAO}=await import('/src/store/project.ts');useProject.getState().abrirProjeto({...CONFIG_PADRAO,nomeProjeto:'Teste dos refletores',perifericosSiap02:[]});useProject.getState().setPosteEditandoPerifericos('siap02')
 })
 for(const tipo of ['refletor-frontal','refletor-poste']) {await page.getByLabel(/Adicionar Equipamento/).selectOption(tipo);await page.getByRole('button',{name:'Adicionar',exact:true}).click()}
 const installed=await page.evaluate(async()=>{const {useProject}=await import('/src/store/project.ts');return useProject.getState().config.perifericosSiap02})
 assert.deepEqual(installed.map(p=>p.tipo),['refletor-frontal','refletor-poste'])
 await page.waitForTimeout(1500); await page.evaluate(async()=>{const {useProject}=await import('/src/store/project.ts');useProject.getState().setPosteEditandoPerifericos(null)})
 for(const p of installed) await page.waitForFunction(id=>{let count=0;window.__cena?.getObjectByName(id)?.traverse(o=>{if(o.isMesh)count++});return count>10},p.id)
 const result=await page.evaluate(async()=>{
 const {useProject}=await import('/src/store/project.ts');const {gerarLayout}=await import('/src/layout/engine.ts');const {config,calibracoes}=useProject.getState();return gerarLayout(config,calibracoes).filter(p=>p.tipo.startsWith('refletor')).map(p=>({tipo:p.tipo,y:p.posicao[1],rot:p.rotacaoY}))
 });assert.equal(result.length,2);assert.equal(result[0].y,2.7);assert.equal(result[1].y,3)
 await fs.mkdir('docs/testes-refletores',{recursive:true})
 await page.screenshot({path:'docs/testes-refletores/cena.png'})
 // Inspect actual loaded geometry in a close-up isolated from the rest of the scene.
 await page.evaluate(async(ids)=>{
 const THREE=await import('/node_modules/three/build/three.module.js');const scene=new THREE.Scene();scene.background=new THREE.Color('#dce4ec');
 ids.forEach((id,i)=>{const obj=window.__cena.getObjectByName(id).clone();obj.position.set(i*1.3-.7,0,0);obj.rotation.set(0,0,0);scene.add(obj);const pole=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.8,24),new THREE.MeshStandardMaterial({color:0x929da5,metalness:.6,roughness:.4}));pole.position.set(i*1.3-.7,-.23,0);scene.add(pole)})
 scene.add(new THREE.HemisphereLight(0xffffff,0x445566,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,4,4);scene.add(light)
 const camera=new THREE.PerspectiveCamera(35,1100/600,.01,100);camera.position.set(3.3,1.8,3.6);camera.lookAt(.3,0,0)
 const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(1100,600);renderer.render(scene,camera);const img=document.createElement('img');img.id='preview-refletores';img.src=renderer.domElement.toDataURL();img.style='position:fixed;inset:0;z-index:2147483647';document.body.append(img)
 },installed.map(p=>p.id))
 await page.locator('#preview-refletores').screenshot({path:'docs/testes-refletores/modelos.png'})
 await page.evaluate(async()=>{
  document.getElementById('preview-refletores').remove()
  const {default:React}=await import('/node_modules/.vite/deps/react.js');const {default:{createRoot}}=await import('/node_modules/.vite/deps/react-dom_client.js');const {DocumentoDocumentacao}=await import('/src/components/DocumentoDocumentacao.tsx');const {useProject}=await import('/src/store/project.ts')
  const host=document.createElement('div');host.id='test-doc';document.body.append(host)
  createRoot(host).render(React.createElement(DocumentoDocumentacao,{config:useProject.getState().config,dataEmissao:new Date(),codigoDocumento:'TESTE',tipoDocumento:'tecnico',onFechar:()=>{},onExportar:()=>{}}))
 })
 await page.locator('#test-doc .btn-pag-nav').first().waitFor()
 let cableRow; const wiring=[]
 for(let i=0;i<50;i++) {
  const rows=await page.locator('#test-doc tr').allTextContents()
  cableRow ||= rows.find(t=>t.includes('Cabo PP 3x2,5 mm² para refletores'))
  wiring.push(...rows.filter(t=>t.includes('Um cabo por refletor.')&&t.includes('SIAP02')))
  if(cableRow&&wiring.length>=2)break
  const next=page.locator('#test-doc .btn-pag-nav').last();if(await next.isDisabled())break
  await next.click();await page.waitForTimeout(60)
 }
 assert.ok(cableRow?.includes('2x'));console.log('Quantitativo:',cableRow)
 assert.equal(wiring.length,2);for(const row of wiring)assert.ok(row.includes('Quadro de Distribuição'))
 assert.deepEqual(errors,[])
 console.log('PASS: inclusão via interface, dois GLBs carregados, alturas e montagem 3D; nenhum erro.',result)
}catch(e){console.log(await page.locator('body').innerText());console.log(errors);throw e}finally{await browser.close()}






