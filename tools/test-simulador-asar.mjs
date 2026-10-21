import { _electron as electron } from '@playwright/test'
import { createPackage } from '@electron/asar'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import net from 'node:net'
import assert from 'node:assert/strict'

const folder = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-clp-asar-'))
const stage = path.join(folder, 'app'), data = path.join(folder, 'data')
fs.mkdirSync(stage); fs.mkdirSync(data)
fs.cpSync('electron/simulador', path.join(stage, 'simulador'), { recursive: true })
fs.cpSync('electron/balanca', path.join(stage, 'balanca'), { recursive: true })
fs.copyFileSync('electron/preload.cjs', path.join(stage, 'preload.cjs'))
const freePort = () => new Promise(resolve => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const port = s.address().port; s.close(() => resolve(port)) }) })
fs.writeFileSync(path.join(data, 'simulador-clp.json'), JSON.stringify({ modbus: await freePort(), owl: await freePort() }))
fs.writeFileSync(path.join(data, 'simulador-balanca.json'), JSON.stringify({ porta: await freePort() }))
fs.writeFileSync(path.join(stage, 'package.json'), JSON.stringify({ name: 'test-clp', version: '1.0.0', main: 'main.cjs' }))
fs.writeFileSync(path.join(stage, 'index.html'), '<!doctype html><title>Teste CLP empacotado</title>')
fs.writeFileSync(path.join(stage, 'main.cjs'), `
const {app,BrowserWindow,ipcMain}=require('electron');const path=require('node:path');
app.setPath('userData',${JSON.stringify(data)});
require('./simulador/index.cjs').registerSimulator({app,BrowserWindow,ipcMain});
require('./balanca/index.cjs').registerBalanca({app,BrowserWindow,ipcMain});
app.whenReady().then(()=>{const win=new BrowserWindow({show:false,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false}});win.loadFile(path.join(__dirname,'index.html'));});
app.on('window-all-closed',()=>app.quit());
`)
const archive = path.join(folder, 'app.asar')
await createPackage(stage, archive)
const app = await electron.launch({ args: [archive] })
try {
  const page = await app.firstWindow()
  await page.evaluate(async()=>{window.snapshot=await window.clp.state();window.clp.onState(s=>{window.snapshot=s})})
  await page.waitForFunction(()=>window.snapshot?.listening.modbus && window.snapshot?.listening.owl)
  assert.equal((await page.evaluate(()=>window.clp.command({type:'coil',address:2,value:true}))).ok,true)
  await page.waitForFunction(()=>window.snapshot.gates.A)
  await page.evaluate(async()=>{window.peso=await window.balanca.state();window.balanca.onState(s=>{window.peso=s})})
  await page.waitForFunction(()=>window.peso?.running && window.peso?.peso===0)
  await page.evaluate(()=>window.balanca.amostra({alvo:20000,pesoTotal:40000,emMovimento:false,rodasDentro:5,totalRodas:10}))
  await page.waitForFunction(()=>window.peso?.estavel && window.peso?.peso===20000)
  console.log('OK: worker, firmware, balança TCP e IPC executados de dentro do app.asar, sem Python.')
} finally { await app.close() }
