import { _electron as electron, expect } from '@playwright/test'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import assert from 'node:assert/strict'
const userData=fs.mkdtempSync(path.join(os.tmpdir(),'siadesk-packaged-'))
const app=await electron.launch({executablePath:path.resolve('dist-packaged/win-unpacked/SIADESK.exe'),args:[`--user-data-dir=${userData}`]})
try {
 await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows().forEach(w=>w.hide()))
 const info=await app.evaluate(({app})=>({version:app.getVersion(),packaged:app.isPackaged,userData:app.getPath('userData')}))
 assert.equal(info.version,'0.2.1');assert.equal(info.packaged,true)
 const page=await app.firstWindow()
 await page.getByRole('heading',{name:'Entrar no SIADESK'}).waitFor()
 assert.equal(await page.evaluate(()=>typeof window.siasgl.login),'function')
 const labels=await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.map(item=>item.label))
 assert.ok(labels.includes('Arquivo'))
 assert.equal(await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('save').enabled),false)
 await app.evaluate(() => {
   global.testUser = {id:991,company_id:991,name:'Teste do menu',email:'menu@example.test',admin:true}
   global.testProjects = []; global.testWrites = []
   global.fetch = async (url, options) => {
     let data
     if (url.endsWith('/login')) data={token:'b'.repeat(64),user:global.testUser}
     else if (url.endsWith('/bootstrap')) data={user:global.testUser,settings:null,projects:global.testProjects}
     else {const body=JSON.parse(options.body);global.testWrites.push({url,body});data={version:body.version+1}}
     return {ok:true,status:200,json:async()=>data}
   }
 })
 await page.getByLabel('E-mail do SIASGL').fill('menu@example.test')
 await page.getByLabel('Senha',{exact:true}).fill('mock-password')
 await page.locator('form').evaluate(form=>form.requestSubmit())
 await expect.poll(()=>app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('new').enabled)).toBe(true)
 await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('new').click())
 const creation=page.getByRole('dialog',{name:'Novo projeto'})
 await creation.getByLabel('Nome do projeto').fill('Projeto menu nativo')
 await creation.getByLabel('Cliente',{exact:true}).fill('Cliente teste')
 await creation.getByLabel('Código da proposta / OS').fill('MENU-01')
 await creation.locator('form').evaluate(form=>form.requestSubmit())
 await expect.poll(()=>app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('save').enabled)).toBe(true)
 const savePath=path.join(userData,'projeto-menu.json')
 await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file})},savePath)
 await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('save').click())
 const save=page.getByRole('dialog',{name:'Salvar projeto'})
 await expect(save.getByRole('radio',{name:/Nuvem e arquivo local/})).toBeChecked()
 await save.locator('form').evaluate(form=>form.requestSubmit())
 await expect.poll(()=>fs.existsSync(savePath)).toBe(true)
 assert.equal(JSON.parse(fs.readFileSync(savePath,'utf8')).nomeProjeto,'Projeto menu nativo')
 await expect.poll(()=>app.evaluate(()=>global.testWrites.some(write=>write.url.includes('/projects/')))).toBe(true)
 const cloud={id:'d519b080-ef5e-4b4c-80a4-6fb499eb15f7',version:1,config:{...JSON.parse(fs.readFileSync(savePath,'utf8')),nomeProjeto:'Aberto da nuvem'}}
 await app.evaluate((_,project)=>{global.testProjects=[project]},cloud)
 await expect(save).not.toBeVisible()
 await app.evaluate(({Menu})=>Menu.getApplicationMenu().getMenuItemById('open').click())
 const opening=page.getByRole('dialog',{name:'Abrir projeto'})
 await opening.getByRole('button',{name:/Aberto da nuvem/}).click({force:true})
 await expect(opening).not.toBeVisible()
 await expect(page.locator('.logo-superior')).toContainText('Aberto da nuvem')
 assert.equal(await page.locator('.cloud-toolbar').count(),0)
 console.log('Packaged SIADESK 0.2.1: native File menu, new project, default both save, native JSON file, cloud upload, cloud open and login verified. Isolated profile:',info.userData===userData)
} finally {await app.close()}
