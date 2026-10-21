import { _electron as electron, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-clp-'))
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)) }) })
const modbus = await freePort(), owl = await freePort(), balancaPort = await freePort()
fs.writeFileSync(path.join(folder, 'simulador-clp.json'), JSON.stringify({ modbus, owl }))
fs.writeFileSync(path.join(folder, 'simulador-balanca.json'), JSON.stringify({ porta: balancaPort }))
fs.writeFileSync(path.join(folder, 'main.cjs'), `
const {app,BrowserWindow,ipcMain}=require('electron');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
app.setPath('userData',${JSON.stringify(folder)});
require(${JSON.stringify(path.resolve('electron/simulador/index.cjs'))}).registerSimulator({app,BrowserWindow,ipcMain});
require(${JSON.stringify(path.resolve('electron/balanca/index.cjs'))}).registerBalanca({app,BrowserWindow,ipcMain});
require(${JSON.stringify(path.resolve('electron/display/index.cjs'))}).registerDisplays({app,BrowserWindow,ipcMain});
require(${JSON.stringify(path.resolve('electron/leitores/index.cjs'))}).registerLeitores({app,BrowserWindow,ipcMain});
ipcMain.handle('siasgl:session',()=>null);
app.whenReady().then(()=>{
 const win=new BrowserWindow({show:false,width:1480,height:1000,webPreferences:{preload:${JSON.stringify(path.resolve('electron/preload.cjs'))},contextIsolation:true,nodeIntegration:false,backgroundThrottling:false,offscreen:true}});
 win.loadURL(${JSON.stringify(process.argv[2] || 'http://127.0.0.1:5189')});
});
app.on('window-all-closed',()=>app.quit());
`)
let app, scaleClient, monitorClient, currentPage
const errors = []
async function writeCoil(address, value) {
  const client = net.connect(modbus, '127.0.0.1')
  await new Promise((resolve, reject) => {
    client.once('error', reject)
    client.once('connect', () => { const data=Buffer.from([0,1,0,0,0,6,1,5,0,0,0,0]); data.writeUInt16BE(address,8);data.writeUInt16BE(value?0xff00:0,10);client.write(data) })
    client.once('data', () => {client.end();resolve()})
  })
}
try {
  app = await electron.launch({ args: [path.join(folder, 'main.cjs')] })
  const page = await app.firstWindow();currentPage=page
  page.on('pageerror', e => errors.push(e.message))
  await page.evaluate(async()=>{window.__clpTest=await window.clp.state();window.clp.onState(s=>{window.__clpTest=s})})
  await page.waitForFunction(() => window.__clpTest?.listening.modbus)
  assert.equal((await page.evaluate(() => window.clp.state())).running, true, 'Início automático antes do projeto')
  await page.evaluate(async()=>{window.__pesoTest=await window.balanca.state();window.balanca.onState(s=>{window.__pesoTest=s})})
  await page.waitForFunction(()=>window.__pesoTest?.running && window.__pesoTest.peso===0)
  const frames = []
  scaleClient = net.connect(balancaPort, '127.0.0.1'); scaleClient.on('data', data=>frames.push(data))
  await page.evaluate(async ({modbus,owl,balancaPort}) => {
    const { useSession } = await import('/src/cloud/session.ts')
    useSession.setState({ ready: true, user: { id: 1, name: 'Teste', email: 'teste@example.test', company_id: 1, admin: true } })
    const { useProject, CONFIG_PADRAO } = await import('/src/store/project.ts')
    window.__projectTest = useProject
    const sems = ['entrada-a','entrada-b','saida-a','saida-b'].map((canal,i)=>({id:`sem-${i}`,tipo:'semaforo',altura:2+i*.3,rotacaoY:0,canalSemaforo:canal}))
    useProject.getState().abrirProjeto({...CONFIG_PADRAO,nomeProjeto:'Simulação de automação',cliente:'Teste',
      simuladorClp:{portas:{modbus,owl}},balancaTcp:{porta:balancaPort,margemContato:.15},
      mostrarVeiculo:true,offsetVeiculoX:50,cancelaEntrada:true,cancelaSaida:true,
      siap01:false,siap02:true,siap03:false,siap04:false,siap05:false,siap06:true,siap07:false,siap08:false,siap09:false,
      perifericosSiap02:[...sems,{id:'sensor-a',tipo:'sensor-emissor',altura:1,rotacaoY:0}],
      perifericosSiap06:[{id:'sensor-b',tipo:'sensor-receptor',altura:1,rotacaoY:0,canalSensor:'B'}]})
    useProject.getState().setAbaAtiva('funcoes_especiais')
  },{modbus,owl,balancaPort})
  await page.waitForFunction(()=>window.__cena?.getObjectByName('cancela-entrada')?.getObjectByName('eixo-abertura-cancela'))
  await page.getByRole('button',{name:/Funções Especiais/}).click()
  await page.getByRole('button',{name:'Abrir A',exact:true}).click()
  await page.waitForFunction(()=>Math.abs(window.__cena.getObjectByName('cancela-entrada').getObjectByName('eixo-abertura-cancela').rotation.x-Math.PI/2)<.001)
  await page.getByRole('button',{name:'Fechar A',exact:true}).click()
  await page.waitForFunction(()=>window.__cena.getObjectByName('cancela-entrada').getObjectByName('eixo-abertura-cancela').rotation.x===0)
  for(let i=0;i<4;i++){
    await writeCoil(6+i,true)
    await page.waitForFunction(i=>{
      let on=false;window.__cena.getObjectByName(`sem-${i}`).traverse(o=>{if(o.material?.name==='Color_G05')on=o.material.emissiveIntensity>0});return on
    },i)
    await writeCoil(6+i,false)
  }
  // Vincula o sensor pela interface; figurante não deve detectar.
  await page.evaluate(async()=>{const {useProject}=await import('/src/store/project.ts');useProject.getState().setPosteEditandoPerifericos('siap02')})
  assert.equal(await page.getByLabel('Canal do sensor no simulador').count(),0,'Opções devem ficar ocultas até abrir a engrenagem')
  await page.getByRole('button',{name:/Configurar Sensor/}).click()
  await page.getByLabel('Canal do sensor no simulador').selectOption('A')
  await page.getByRole('button',{name:'Concluir',exact:true}).click()
  await page.evaluate(async()=>{const {useProject}=await import('/src/store/project.ts');useProject.getState().setPosteEditandoPerifericos(null)})
  async function posicionar(channel, offset=0) {
    await page.evaluate(async({channel,offset})=>{
      const THREE=await import('/node_modules/three/build/three.module.js')
      const {useProject}=await import('/src/store/project.ts')
      const vehicle=window.__cena.getObjectByName('veiculo');vehicle.updateWorldMatrix(true,true)
      const bounds=new THREE.Box3().setFromObject(vehicle)
      const sensor=window.__cena.getObjectByName(`sensor-${channel.toLowerCase()}`)
      const x=sensor.getWorldPosition(new THREE.Vector3()).x
      useProject.getState().setConfig('offsetVeiculoX',vehicle.position.x+x-bounds.max.x+offset)
    },{channel,offset})
  }
  await posicionar('A',-0.5)
  await page.waitForTimeout(250)
  assert.equal((await page.evaluate(()=>window.clp.state())).sensors.A,false)
  await page.locator('canvas').first().click({position:{x:500,y:200}})
  await page.keyboard.down('ArrowRight')
  await page.waitForFunction(()=>window.__clpTest.sensors.A)
  await page.keyboard.up('ArrowRight')
  await page.waitForFunction(()=>Math.abs(window.__cena.getObjectByName('veiculo').position.x-window.__projectTest.getState().config.offsetVeiculoX)<0.00001)
  assert.equal((await page.evaluate(()=>window.clp.state())).sensors.A,true,'Presença deve continuar após parar o caminhão')
  await page.getByRole('button',{name:'Abrir A',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.gates.A)
  await page.getByRole('button',{name:'Fechar A',exact:true}).click()
  await page.waitForTimeout(400)
  assert.equal((await page.evaluate(()=>window.clp.state())).gates.A,true,'Sensor ocupado deve impedir fechamento')
  await posicionar('A',-1)
  await page.waitForFunction(()=>!window.__clpTest.gates.A)
  await posicionar('B',1)
  await page.waitForFunction(()=>window.__clpTest.sensors.B)
  // Remapeia a cancela da entrada para B; comando externo deve abrir esse modelo.
  await page.getByLabel('Cancela da entrada no 3D').selectOption('B')
  await writeCoil(4,true)
  await page.waitForFunction(()=>Math.abs(window.__cena.getObjectByName('cancela-entrada').getObjectByName('eixo-abertura-cancela').rotation.x-Math.PI/2)<.001)
  // Sensores figurantes não interferem e seus vínculos sobrevivem ao salvar/reabrir.
  await page.evaluate(async()=>{
    const {useProject}=await import('/src/store/project.ts');const c=useProject.getState().config
    useProject.getState().setConfig('perifericosSiap06',c.perifericosSiap06.map(p=>({...p,canalSensor:'figurante'})))
    const saved=JSON.parse(JSON.stringify(useProject.getState().config));useProject.getState().abrirProjeto(saved)
    useProject.getState().setAbaAtiva('funcoes_especiais')
  })
  await page.waitForFunction(()=>!window.__clpTest.sensors.B)
  await page.getByRole('button',{name:/Funções Especiais/}).click()
  assert.equal(await page.getByLabel('Cancela da entrada no 3D').inputValue(),'B')
  await page.getByLabel('Mostrar rótulos').uncheck()
  // A balança usa as rodas reais da cena e o peso escolhido ao clicar no veículo.
  await page.evaluate(()=>window.__projectTest.getState().setConfig('offsetVeiculoX',0))
  await page.waitForFunction(()=>window.__pesoTest.estavel && window.__pesoTest.peso===40000 && window.__pesoTest.totalRodas===10)
  const point = await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js');const scene=window.__cena
    const p=new THREE.Box3().setFromObject(scene.getObjectByName('veiculo')).getCenter(new THREE.Vector3()).project(scene.__r3f.root.getState().camera)
    const r=document.querySelector('canvas').getBoundingClientRect();return {x:r.x+(p.x+1)*r.width/2,y:r.y+(1-p.y)*r.height/2}
  })
  await page.mouse.click(point.x,point.y)
  await page.getByRole('button',{name:'Ajustar peso do conjunto',exact:true}).click()
  await page.getByRole('dialog',{name:'Peso do veículo',exact:true}).waitFor()
  const slider=page.getByLabel('Ajustar peso total')
  await slider.focus();await slider.press('ArrowRight')
  assert.equal(await page.getByLabel('Peso total em kg').inputValue(),'40100')
  await page.getByLabel('Peso total em kg').fill('60000')
  assert.equal(await slider.inputValue(),'60000')
  fs.mkdirSync('docs/testes-simulador',{recursive:true})
  await page.screenshot({path:'docs/testes-simulador/peso-veiculo.png'})
  await page.getByRole('button',{name:'Concluir',exact:true}).click()
  await page.waitForFunction(()=>window.__pesoTest.estavel && window.__pesoTest.peso===60000)
  await expect.poll(()=>Buffer.concat(frames).includes(Buffer.from('\x010060000 E\x02')),{message:'TCP deve transmitir o peso estável configurado'}).toBe(true)
  // Movimento contínuo como o usuário faz; um teletransporte de uma única
  // amostra pode acontecer inteiro entre duas atualizações do indicador.
  await page.keyboard.down('ArrowRight')
  await page.waitForFunction(()=>!window.__pesoTest.estavel)
  await page.keyboard.up('ArrowRight')
  assert(Math.abs((await page.evaluate(()=>window.__pesoTest.peso))-60000)<100,'Movimento interno deve oscilar pouco')
  await page.waitForFunction(()=>window.__pesoTest.estavel)
  // Duas rodas no limite da plataforma contribuem com meia parcela cada.
  await page.evaluate(async()=>{
    const THREE=await import('/node_modules/three/build/three.module.js'), scene=window.__cena
    const vehicle=scene.getObjectByName('veiculo'),rodas=[];vehicle.updateWorldMatrix(true,true)
    vehicle.traverse(o=>{if(o.userData.wheelRadius)rodas.push(o.getWorldPosition(new THREE.Vector3()).x)})
    const edge=new THREE.Box3().setFromObject(scene.getObjectByName('balanca')).max.x
    window.__projectTest.getState().setConfig('offsetVeiculoX',vehicle.position.x+edge-Math.max(...rodas))
  })
  await page.waitForFunction(()=>window.__pesoTest.estavel && Math.abs(window.__pesoTest.peso-54000)<=1)
  await page.getByLabel('Mostrar peso',{exact:true}).uncheck()
  assert.equal(await page.getByLabel('Peso na balança',{exact:true}).count(),0)
  assert.equal((await page.evaluate(()=>window.balanca.state())).peso,54000,'Ocultar indicador não pode parar a balança')
  await page.getByLabel('Mostrar peso',{exact:true}).check()
  monitorClient=net.connect(modbus,'127.0.0.1')
  await page.waitForFunction(()=>window.__clpTest.clients.modbus===1)
  await page.getByRole('button',{name:/Simulador da automação/}).click()
  assert.equal(await page.getByRole('button',{name:'Abrir A',exact:true}).count(),0)
  assert(await page.getByText('1 conexão TCP ativa',{exact:true}).isVisible())
  // A balança mantém o peso, a execução e a conexão visíveis ao recolher.
  const scalePanel = page.getByRole('region', {name:'Simulador de balança TCP',exact:true})
  await scalePanel.getByRole('button',{name:'Balança TCP',exact:true}).click()
  assert.equal(await scalePanel.getByLabel('Porta da balança TCP').count(),0)
  assert(await scalePanel.getByText('Balança em execução',{exact:true}).isVisible())
  assert(await scalePanel.getByText(/1 cliente conectado.*54.000 kg/).isVisible())
  assert.equal(await page.evaluate(()=>window.__projectTest.getState().config.balancaTcp.recolhido),true)
  await scalePanel.getByRole('button',{name:'Balança TCP',exact:true}).click()
  assert(await scalePanel.getByLabel('Porta da balança TCP').isVisible())
  await scalePanel.getByRole('button',{name:'Balança TCP',exact:true}).click()
  // Monitor disponível mesmo recolhido, ligado ao mesmo worker e à cena.
  await page.getByRole('button',{name:'Abrir monitor da automação',exact:true}).click()
  const monitor=page.getByRole('dialog',{name:'Simulador CLP Modbus — Integração OWL',exact:true})
  await monitor.waitFor()
  const entrada=monitor.getByRole('region',{name:'Pista 1 — Entrada',exact:true})
  const saida=monitor.getByRole('region',{name:'Pista 2 — Saída',exact:true})
  await writeCoil(6,true)
  await expect(monitor.getByRole('figure',{name:'Semáforo AA: Verde',exact:true})).toBeVisible()
  await entrada.getByRole('button',{name:'Obstruir sensor (Simular veículo)',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.sensors.A && window.__clpTest.sensorMode.A==='ocupado')
  await expect(entrada.getByText('Obstrução forçada',{exact:true})).toBeVisible()
  assert.equal((await page.evaluate(()=>window.clp.state())).memory[6],true,'Forçar sensor não pode apagar comandos de semáforo do OWL')
  await saida.getByRole('button',{name:'Obstruir sensor (Simular veículo)',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.sensors.B)
  await saida.getByRole('button',{name:'Liberar sensor (Pista livre)',exact:true}).click()
  await page.waitForFunction(()=>!window.__clpTest.sensors.B && window.__clpTest.sensorMode.B==='livre')
  await saida.getByRole('button',{name:'Voltar ao automático',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.sensorMode.B==='auto')
  await entrada.getByRole('button',{name:'Abrir cancela A',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.gates.A)
  await entrada.getByRole('button',{name:'Fechar cancela A',exact:true}).click()
  await page.waitForTimeout(300)
  assert.equal((await page.evaluate(()=>window.clp.state())).gates.A,true,'Obstrução forçada deve impedir fechamento')
  await page.screenshot({path:'docs/testes-simulador/monitor-sinotico.png'})
  await entrada.getByRole('button',{name:'Liberar sensor (Pista livre)',exact:true}).click()
  await page.waitForFunction(()=>!window.__clpTest.sensors.A && !window.__clpTest.gates.A)
  await entrada.getByRole('button',{name:'Voltar ao automático',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.sensorMode.A==='auto')
  await monitor.getByRole('tab',{name:'Painel Detalhado (Modbus & CLP)',exact:true}).click()
  await monitor.getByLabel('%I0.12',{exact:true}).check()
  await page.waitForFunction(()=>window.__clpTest.inputs['%I0.12'])
  await monitor.getByLabel('%I0.12',{exact:true}).uncheck()
  await page.waitForFunction(()=>!window.__clpTest.inputs['%I0.12'])
  await monitor.getByLabel('Semáforo AA',{exact:true}).selectOption('vermelho')
  await page.waitForFunction(()=>window.__clpTest.lights['entrada-a']==='vermelho')
  await monitor.getByLabel('Semáforo BB',{exact:true}).selectOption('verde')
  await page.waitForFunction(()=>window.__clpTest.lights['saida-b']==='verde')
  await page.screenshot({path:'docs/testes-simulador/monitor-detalhado.png'})
  await monitor.getByRole('button',{name:'Limpar log',exact:true}).click()
  await expect(monitor.getByText('Nenhuma atividade registrada.',{exact:true})).toBeVisible()
  await monitor.getByRole('tab',{name:'Sinótico Simplificado',exact:true}).click()
  await expect(monitor.getByRole('figure',{name:'Semáforo BB: Verde',exact:true})).toBeVisible()
  await page.setViewportSize({width:900,height:700})
  await page.screenshot({path:'docs/testes-simulador/monitor-compacto.png'})
  assert(await monitor.evaluate(el=>el.scrollWidth<=el.clientWidth),'Monitor não pode cortar conteúdo horizontalmente')
  await page.keyboard.press('Escape')
  await expect(monitor).toHaveCount(0)
  assert.equal((await page.evaluate(()=>window.clp.state())).running,true,'Fechar o monitor mantém o CLP em execução')
  await page.setViewportSize({width:1480,height:1000})
  await page.screenshot({path:'docs/testes-simulador/painel-recolhido.png'})
  await page.getByRole('button',{name:/Simulador da automação/}).click()
  fs.mkdirSync('docs/testes-simulador',{recursive:true})
  await page.screenshot({path:'docs/testes-simulador/painel.png'})
  await page.getByRole('button',{name:'Parar simulador',exact:true}).click()
  await page.waitForFunction(()=>!window.__clpTest.running)
  await page.getByRole('button',{name:'Iniciar simulador',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.listening.modbus)
  assert.deepEqual(errors,[])
  await app.close();app=null
  // O aplicativo deve liberar as duas portas ao encerrar.
  for(const port of [modbus,owl,balancaPort]) await new Promise((resolve,reject)=>{const s=net.createServer();s.once('error',reject);s.listen(port,'127.0.0.1',()=>s.close(resolve))})
  console.log('OK: CLP, engrenagens, detecção, balança TCP automática, rodas reais, ajuste de peso, estabilização, contato parcial e painel recolhível.')
} catch(error) {
  console.log('Erros da interface:',errors)
  console.log('Tela:',await currentPage?.locator('body').innerText())
  throw error
} finally { scaleClient?.destroy();monitorClient?.destroy();if(app) await app.close() }
