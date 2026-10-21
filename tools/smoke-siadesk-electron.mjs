import { _electron as electron } from '@playwright/test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'siadesk-cloud-smoke-'))
const main = path.join(directory, 'main.cjs')
fs.writeFileSync(path.join(directory, 'index.html'), '<!doctype html><title>SIADESK storage verification</title>')
fs.writeFileSync(main, `
const { app, BrowserWindow } = require('electron');
app.setPath('userData', ${JSON.stringify(directory)});
global.offline = false;
global.fetch = async () => {
  if (global.offline) throw new Error('offline');
  return {ok:true, status:200, json:async()=>({token:'a'.repeat(64), user:{id:1,company_id:1,name:'Test',email:'test@example.test',admin:true}})};
};
require(${JSON.stringify(path.resolve('electron/siadesk-cloud.cjs'))}).registerCloud();
app.whenReady().then(() => {
 const win = new BrowserWindow({show:false,webPreferences:{preload:${JSON.stringify(path.resolve('electron/preload.cjs'))},contextIsolation:true,nodeIntegration:false}});
 win.loadFile(${JSON.stringify(path.join(directory, 'index.html'))});
});
`)
let app
try {
  app = await electron.launch({args:[main]})
  const page = await app.firstWindow()
  assert.equal(await page.evaluate(() => window.siasgl.session()), null)
  const result = await page.evaluate(() => window.siasgl.login({email:'test@example.test',password:'never-store-this-password'}))
  assert.equal(result.ok, true)
  assert.equal(result.data.token, undefined)
  const encrypted = fs.readFileSync(path.join(directory, 'siasgl-session.bin'))
  assert.equal(encrypted.includes(Buffer.from('never-store-this-password')), false)
  assert.equal(encrypted.includes(Buffer.from('a'.repeat(64))), false)
  await app.close()
  app = await electron.launch({args:[main]})
  const restarted = await app.firstWindow()
  assert.equal((await restarted.evaluate(() => window.siasgl.session())).user.id, 1)
  await app.evaluate(() => { global.offline = true })
  assert.equal((await restarted.evaluate(() => window.siasgl.request('bootstrap','GET'))).status, 0)
  assert.equal((await restarted.evaluate(() => window.siasgl.session())).user.id, 1)
  assert.equal((await restarted.evaluate(() => window.siasgl.request('https://example.com','GET'))).status, 400)
  await restarted.evaluate(() => window.siasgl.logout())
  assert.equal(await restarted.evaluate(() => window.siasgl.session()), null)
  console.log('Electron: encrypted session, restart, offline fallback, endpoint allowlist and logout passed.')
} finally { if (app) await app.close() }
