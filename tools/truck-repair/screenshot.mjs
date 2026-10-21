import {chromium} from '@playwright/test'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawn} from 'node:child_process'
const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../..')
const server=spawn(process.execPath,[path.join(root,'node_modules/vite/bin/vite.js'),'--host','127.0.0.1','--port','5187'],{cwd:root,windowsHide:true,stdio:'ignore'})
for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:5187')).ok)break}catch{}await new Promise(r=>setTimeout(r,100))}
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-webgl','--use-gl=angle','--use-angle=swiftshader']})
const page=await browser.newPage({viewport:{width:1600,height:700},deviceScaleFactor:1})
const errors=[];page.on('pageerror',e=>errors.push(e.message))
await page.goto('http://127.0.0.1:5187/tools/truck-repair/preview.html')
await page.waitForFunction(()=>window.ready,{timeout:60000})
for(const side of ['left','right','detail']){await page.evaluate(s=>window.setView(s),side);await page.waitForTimeout(500);await page.screenshot({path:path.join(here,`after-${side}.png`)})}
console.log(JSON.stringify({errors}));await browser.close();server.kill()
