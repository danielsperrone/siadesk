import { _electron as electron, expect } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-monitor-'))
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
let app, scaleClient, monitorClient
const errors=[]
try {
  app=await electron.launch({args:[path.join(folder,'main.cjs')]})
  const page=await app.firstWindow()
  page.on('pageerror',e=>errors.push(e.message))
  await page.evaluate(async()=>{window.__clpTest=await window.clp.state();window.clp.onState(s=>{window.__clpTest=s})})
  await page.waitForFunction(()=>window.__clpTest?.listening.modbus)
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

  await page.getByRole('button',{name:/Funções Especiais/}).click()
  monitorClient=net.connect(modbus,'127.0.0.1')
  scaleClient=net.connect(balancaPort,'127.0.0.1')
  await page.waitForFunction(()=>window.__clpTest.clients.modbus===1)
  await page.getByRole('button',{name:/Simulador da automação/}).click()
  fs.mkdirSync('docs/testes-simulador',{recursive:true})
  // A balança mantém o peso, a execução e a conexão visíveis ao recolher.
  const scalePanel = page.getByRole('region', {name:'Simulador de balança TCP',exact:true})
  await scalePanel.getByRole('button',{name:'Balança TCP',exact:true}).click()
  assert.equal(await scalePanel.getByLabel('Porta da balança TCP').count(),0)
  assert(await scalePanel.getByText('Balança em execução',{exact:true}).isVisible())
  assert(await scalePanel.getByText(/1 cliente conectado.*0 kg/).isVisible())
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
  await page.evaluate(()=>window.clp.command({type:'coil',address:6,value:true}))
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
  await page.getByRole('button',{name:'Abrir monitor da automação',exact:true}).click()
  await monitor.getByRole('tab',{name:'Painel Detalhado (Modbus & CLP)',exact:true}).click()
  await monitor.getByRole('button',{name:'Parar simulador',exact:true}).click()
  await page.waitForFunction(()=>!window.__clpTest.running)
  await expect(monitor.getByLabel('%I0.0',{exact:true})).toBeDisabled()
  await monitor.getByRole('button',{name:'Iniciar simulador',exact:true}).click()
  await page.waitForFunction(()=>window.__clpTest.running && window.__clpTest.listening.modbus)
  assert.deepEqual(errors,[])
  console.log('OK: balança recolhível, monitor recolhido/expandido, cancelas, quatro semáforos, sensores forçados/automáticos, intertravamento, entradas, log e reinício.')
} catch(error) {
  console.log('Erros da interface:',errors)
  const page=await app?.firstWindow()
  console.log('Tela:',await page?.locator('body').innerText())
  throw error
} finally {scaleClient?.destroy();monitorClient?.destroy();if(app)await app.close()}
