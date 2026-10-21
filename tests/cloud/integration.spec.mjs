import { test, expect } from '@playwright/test'

test('saves scale, simulator and equipment preferences to local file and cloud, then restores both', async ({page}) => {
  await install(page, {cached: true})
  await page.goto('/')
  await ready(page)
  const expected = {
    pesoVeiculoKg: 67300, mostrarPeso: false,
    balancaTcp: {porta: 31005, margemContato: .22, recolhido: true},
    simuladorClp: {portas: {modbus: 1502, owl: 31055}, recolhido: true, modosSensores: {A: 'auto', B: 'ocupado'}, semaforos: {'entrada-a': true}, entradas: {'2': false}},
    canaisCancelas: {'cancela-entrada': 'B', 'cancela-saida': 'figurante'},
    cancelasAbertas: {'cancela-saida': true},
    perifericosSiap02: [
      {id:'s',tipo:'semaforo',altura:2.2,rotacaoY:0,canalSemaforo:'saida-b',estadoSemaforo:'verde'},
      {id:'d',tipo:'display-mensagens',altura:2.5,rotacaoY:0,mensagemDisplay:'SIAMAC teste'},
      {id:'p',tipo:'sensor-emissor',altura:1,rotacaoY:0,canalSensor:'A'},
    ],
  }
  await page.evaluate(async settings => {
    const {useProject}=await import('/src/store/project.ts')
    useProject.getState().criarNovoProjeto('Simulação salva','Teste','SIM-01')
    for(const [key,value] of Object.entries(settings))useProject.getState().setConfig(key,value)
    const {saveTo}=await import('/src/projects/commands.ts');await saveTo('both')
  }, expected)
  await pending(page,0)
  const saved = await page.evaluate(()=>({
    local:JSON.parse(JSON.stringify(window.cloudTest.localSaves.at(-1))),
    cloud:window.cloudTest.requests.findLast(r=>r.method==='PUT'&&r.endpoint.startsWith('projects/')).body.config,
  }))
  for(const source of [saved.local,saved.cloud]) for(const [key,value] of Object.entries(expected)) expect(source[key]).toEqual(value)
  for(const mode of ['local','cloud']) {
    const restored = await page.evaluate(async ({mode,saved})=>{
      const {useProject}=await import('/src/store/project.ts');useProject.getState().fecharProjeto()
      if(mode==='local'){const {openLocalProject}=await import('/src/projects/commands.ts');openLocalProject(saved.local)}
      else {const {openCloudProject}=await import('/src/cloud/sync.ts');openCloudProject({id:saved.cloud.cloudId,version:1,config:saved.cloud})}
      return useProject.getState().config
    },{mode,saved})
    for(const [key,value] of Object.entries(expected))expect(restored[key]).toEqual(value)
  }
})

async function install(page, { admin = true, cached = false, offline = false } = {}) {
  await page.addInitScript(({admin, cached, offline}) => {
    const user = {id: 81, company_id: 91, name: 'Usuário de teste', email: 'test@example.test', admin}
    window.cloudTest = { offline, requests: [], conflict: false, projects: [], localSaves: [] }
    window.projectFiles = {
      onCommand: callback => { window.cloudTest.command = callback; return () => {} },
      updateState: state => { window.cloudTest.menuState = state },
      saveLocal: async config => { window.cloudTest.localSaves.push(config); return window.cloudTest.cancelLocal ? {ok:false,canceled:true} : {ok:true} },
      openLocal: async () => ({ok: !!window.cloudTest.localFile, canceled: !window.cloudTest.localFile, config: window.cloudTest.localFile}),
      confirmLeave: async () => 'discard',
    }
    window.siasgl = {
      session: async () => cached ? {user} : null,
      login: async () => ({ok: true, status: 200, data: {user}}),
      logout: async () => {},
      request: async (endpoint, method, body) => {
        window.cloudTest.requests.push({endpoint, method, body})
        if (window.cloudTest.offline) return {ok: false, status: 0, error: 'Sem conexão com o SIASGL.'}
        if (endpoint === 'bootstrap') return {ok: true, status: 200, data: {user, settings: window.cloudTest.settings || null, projects: window.cloudTest.projects}}
        if (endpoint === 'settings' && window.cloudTest.loseSettingsReply) {
          window.cloudTest.settings = {version:body.version+1,data:body.data}
          window.cloudTest.loseSettingsReply = false
          return {ok:false,status:0,error:'Resposta perdida.'}
        }
        if (window.cloudTest.conflict && endpoint.startsWith('projects/')) return {ok: false, status: 409}
        return {ok: true, status: 200, data: {version: (body?.version || 0) + 1}}
      },
    }
  }, {admin, cached, offline})
}
async function ready(page) {
  await expect.poll(() => page.evaluate(() => !!window.cloudTest.menuState?.authenticated)).toBe(true)
}
async function sync(page) {
  await page.evaluate(async () => { const {synchronize} = await import('/src/cloud/sync.ts'); await synchronize() })
}
async function pending(page, count) {
  await expect.poll(() => page.evaluate(async () => (await import('/src/cloud/sync.ts')).useCloud.getState().pending)).toBe(count)
}

test('requires login and renders usable login at desktop and narrow widths', async ({page}) => {
  await install(page)
  await page.goto('/')
  await expect(page.getByRole('heading', {name: 'Entrar no SIADESK'})).toBeVisible()
  await page.screenshot({path: 'test-results/cloud/login-desktop.png'})
  await page.setViewportSize({width: 480, height: 800})
  await expect(page.getByLabel('E-mail do SIASGL')).toBeVisible()
  await page.screenshot({path: 'test-results/cloud/login-narrow.png'})
  await page.getByLabel('E-mail do SIASGL').fill('test@example.test')
  await page.getByLabel('Senha', {exact: true}).fill('password')
  await page.getByRole('button', {name: 'Entrar com SIASGL'}).click()
  await ready(page)
})
test('offline saves survive restart and upload when connection returns', async ({page}) => {
  await install(page, {cached: true, offline: true})
  await page.goto('/')
  await ready(page)
  await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    const {queueProject} = await import('/src/cloud/sync.ts')
    useProject.getState().criarNovoProjeto('Projeto offline', 'Cliente', 'P-01')
    queueProject(useProject.getState().salvarConfig())
    useProject.getState().setProjetoAtivo(false)
  })
  await pending(page, 1)
  await page.reload()
  await pending(page, 1)
  await page.evaluate(() => { window.cloudTest.offline = false })
  await sync(page)
  await pending(page, 0)
  expect(await page.evaluate(() => window.cloudTest.requests.some(r => r.endpoint.startsWith('projects/') && r.body.config.nomeProjeto === 'Projeto offline'))).toBe(true)
})
test('non-admin cannot change calibration or publish global scenes', async ({page}) => {
  await install(page, {cached: true, admin: false})
  await page.goto('/')
  await ready(page)
  const result = await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    const s = useProject.getState()
    const before = s.calibracoes.cancela.altura
    s.updateCalibracao('cancela', 'altura', 99)
    s.setConfig('padroesPerifericosPostes', {siap01: {}})
    s.setEscopoCena('global')
    useProject.getState().adicionarCena('Global', [1,2,3], [0,0,0])
    return {before, after: useProject.getState().calibracoes.cancela.altura, scenes: useProject.getState().cenasGlobais.length, defaults: useProject.getState().config.padroesPerifericosPostes}
  })
  expect(result.after).toBe(result.before)
  expect(result.scenes).toBe(0)
  expect(result.defaults).toBeUndefined()
})
test('global scenes and project scenes stay separate; cloud conflicts preserve local copies', async ({page}) => {
  await install(page, {cached: true})
  await page.goto('/')
  await ready(page)
  const scenes = await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    const {publishSettings, queueProject} = await import('/src/cloud/sync.ts')
    useProject.getState().setEscopoCena('global')
    useProject.getState().adicionarCena('Global', [1,2,3], [0,0,0])
    await publishSettings()
    useProject.getState().setEscopoCena('projeto')
    useProject.getState().criarNovoProjeto('Projeto conflito', 'Cliente', 'P-02')
    useProject.getState().adicionarCena('Local', [3,2,1], [0,0,0])
    window.cloudTest.conflict = true
    queueProject(useProject.getState().salvarConfig())
    useProject.getState().setProjetoAtivo(false)
    return {global: useProject.getState().cenasGlobais.length, local: useProject.getState().config.cenas.length}
  })
  expect(scenes).toEqual({global: 1, local: 1})
  await page.evaluate(() => window.cloudTest.command('sync'))
  await expect(page.getByRole('button', {name: 'Enviar conflitos como cópias'})).toBeVisible()
  await page.screenshot({path: 'test-results/cloud/conflict-desktop.png', animations: 'disabled'})
  await page.evaluate(() => { window.cloudTest.conflict = false })
  await page.getByRole('button', {name: 'Enviar conflitos como cópias'}).click()
  await pending(page, 0)
})

test('label saves queue the project and standards do not copy equipment credentials', async ({page}) => {
  await install(page, {cached: true})
  await page.goto('/')
  await ready(page)
  const result = await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    const {salvarDadosEtiquetas} = await import('/src/labels/save-labels.ts')
    const {captureStandards, synchronize} = await import('/src/cloud/sync.ts')
    useProject.getState().criarNovoProjeto('Etiquetas', 'Cliente', 'P-03')
    window.dimensionador = {salvarArquivoEtiquetas: async () => ({ok: true})}
    await salvarDadosEtiquetas({nome:'Etiquetas',codigo:'P-03',equipamentos:[{id:'device'}]}, {version:1,equipamentos:[{id:'device',nome:'Camera',ip:'192.168.0.10',username:'operator',password:'device-secret',excluded:[]}]})
    await synchronize()
    captureStandards()
    return {standards:useProject.getState().padroesGlobais, saves:window.cloudTest.requests.filter(r=>r.endpoint.startsWith('projects/'))}
  })
  expect(result.standards.etiquetas).toBeUndefined()
  expect(result.saves.at(-1).body.config.etiquetas.equipamentos[0].id).toBe('device')
})

test('switching accounts isolates cached projects and restores the original offline cache', async ({page}) => {
  await install(page, {cached:true})
  await page.goto('/')
  await ready(page)
  const result = await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    const {activate} = await import('/src/cloud/sync.ts')
    useProject.getState().criarNovoProjeto('Somente conta A','Cliente','P-04')
    useProject.getState().setProjetoAtivo(false)
    window.cloudTest.offline = true
    await activate({id:82,company_id:92,name:'Conta B',email:'b@example.test',admin:false})
    const isolated = useProject.getState().projetosRecentes.length
    await activate({id:81,company_id:91,name:'Conta A',email:'a@example.test',admin:true})
    return {isolated, restored:useProject.getState().projetosRecentes[0].nomeProjeto}
  })
  expect(result).toEqual({isolated:0, restored:'Somente conta A'})
})

test('calibration autosave preserves its draft on network failure and retries on reconnect', async ({page}) => {
  await install(page, {cached:true})
  await page.goto('/')
  await ready(page)
  await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    window.cloudTest.offline = true
    useProject.getState().updateCalibracao('cancela','altura',2)
  })
  await expect.poll(() => page.evaluate(async () => (await import('/src/cloud/session.ts')).useSession.getState().online)).toBe(false)
  await page.evaluate(() => { window.cloudTest.offline = false })
  await sync(page)
  await pending(page, 0)
  const height = await page.evaluate(() => window.cloudTest.requests.filter(r=>r.endpoint==='settings').at(-1).body.data.calibracoes.cancela.altura)
  expect(height).toBe(2)
})

test('save menu defaults to both and respects local-only and cloud-only choices', async ({page}) => {
  await install(page, {cached:true})
  await page.goto('/'); await ready(page)
  await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    useProject.getState().criarNovoProjeto('Salvar destinos','Cliente','P-05')
    window.cloudTest.command('save')
  })
  const modal = page.getByRole('dialog', {name:'Salvar projeto'})
  await expect(modal.getByRole('radio', {name:/Nuvem e arquivo local/})).toBeChecked()
  await modal.getByRole('button', {name:'Salvar', exact:true}).click()
  await expect(modal).not.toBeVisible(); await pending(page, 0)
  expect(await page.evaluate(() => window.cloudTest.localSaves.length)).toBe(1)
  expect(await page.evaluate(() => window.cloudTest.requests.filter(r=>r.endpoint.startsWith('projects/')).length)).toBe(1)

  await page.evaluate(() => window.cloudTest.command('save'))
  await modal.getByRole('radio', {name:/Somente arquivo local/}).check()
  await modal.getByRole('button', {name:'Salvar', exact:true}).click()
  await expect(modal).not.toBeVisible()
  expect(await page.evaluate(() => window.cloudTest.localSaves.length)).toBe(2)
  expect(await page.evaluate(() => window.cloudTest.requests.filter(r=>r.endpoint.startsWith('projects/')).length)).toBe(1)
  await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    const current = useProject.getState().config
    window.cloudTest.projects = [{id:current.cloudId, version:7, config:{...current, nomeProjeto:'Outra versão remota'}}]
  })
  await sync(page)
  expect(await page.evaluate(async () => (await import('/src/store/project.ts')).useProject.getState().config.nomeProjeto)).toBe('Salvar destinos')

  await page.evaluate(() => window.cloudTest.command('save'))
  await expect(modal.getByRole('radio', {name:/Nuvem e arquivo local/})).toBeChecked()
  await modal.getByRole('radio', {name:/Somente na nuvem/}).check()
  await modal.getByRole('button', {name:'Salvar', exact:true}).click()
  await expect(modal).not.toBeVisible(); await pending(page, 0)
  expect(await page.evaluate(() => window.cloudTest.localSaves.length)).toBe(2)
  expect(await page.evaluate(() => window.cloudTest.requests.filter(r=>r.endpoint.startsWith('projects/')).length)).toBe(2)
})

test('canceling the local file picker does not save or increment the project revision', async ({page}) => {
  await install(page, {cached:true})
  await page.goto('/'); await ready(page)
  await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    useProject.getState().criarNovoProjeto('Cancelar','Cliente','P-06')
    useProject.getState().setConfig('obra','Edição ainda não salva')
    window.cloudTest.cancelLocal = true
    window.cloudTest.command('save')
  })
  const modal=page.getByRole('dialog', {name:'Salvar projeto'})
  await modal.getByRole('button', {name:'Salvar', exact:true}).click()
  await expect(modal.getByRole('button', {name:'Salvar', exact:true})).toBeEnabled()
  await modal.getByRole('button', {name:'Cancelar'}).click()
  const state=await page.evaluate(async () => {const s=(await import('/src/store/project.ts')).useProject.getState();return {revision:s.config.revisao,dirty:s.isDirty,requests:window.cloudTest.requests.filter(r=>r.endpoint.startsWith('projects/')).length}})
  expect(state).toEqual({revision:0,dirty:true,requests:0})
})

test('new and cloud-open menu commands work without an extra toolbar or outer scrollbars', async ({page}) => {
  await install(page, {cached:true})
  await page.goto('/'); await ready(page)
  await page.evaluate(() => window.cloudTest.command('new'))
  const modal = page.getByRole('dialog',{name:'Novo projeto'})
  await modal.getByLabel('Nome do projeto').fill('Pelo menu')
  await modal.getByLabel('Cliente', {exact:true}).fill('Cliente')
  await modal.getByLabel('Código da proposta / OS').fill('P-07')
  await modal.getByRole('button',{name:'Criar projeto'}).click()
  await expect(modal).not.toBeVisible()
  await page.evaluate(async () => {
    const {CONFIG_PADRAO} = await import('/src/store/project.ts')
    window.cloudTest.projects = [{id:'60fa7120-61db-436c-90c8-c41f8490c683',version:2,config:{...CONFIG_PADRAO,nomeProjeto:'Projeto da nuvem',cliente:'Cliente na nuvem',codigoProposta:'P-08'}}]
    window.cloudTest.command('open')
  })
  const open=page.getByRole('dialog',{name:'Abrir projeto'})
  await expect(open.getByRole('button',{name:/Projeto da nuvem/})).toBeVisible()
  await page.screenshot({path:'test-results/cloud/open-cloud.png',animations:'disabled'})
  await open.getByRole('button',{name:/Projeto da nuvem/}).click()
  await expect(open).not.toBeVisible()
  await expect(page.locator('.cloud-toolbar')).toHaveCount(0)
  for (const width of [1440, 1100]) {
    await page.setViewportSize({width,height:850})
    const dimensions=await page.evaluate(() => {
      const root=document.querySelector('.app-container'), content=document.querySelector('.conteudo-principal'), panel=document.querySelector('.painel-config'), scene=document.querySelector('.viewport')
      return {bodyOverflow:document.body.scrollHeight > innerHeight || document.body.scrollWidth > innerWidth, rootOverflow:root.scrollWidth > root.clientWidth || root.scrollHeight > root.clientHeight, contentOverflow:content.scrollWidth > content.clientWidth, sceneBottom:scene.getBoundingClientRect().bottom, panelScrollbar:getComputedStyle(panel).scrollbarWidth}
    })
    expect(dimensions.bodyOverflow).toBe(false); expect(dimensions.rootOverflow).toBe(false); expect(dimensions.contentOverflow).toBe(false)
    expect(dimensions.sceneBottom).toBeLessThanOrEqual(850); expect(dimensions.panelScrollbar).toBe('none')
    await page.screenshot({path:`test-results/cloud/editor-${width}.png`,animations:'disabled'})
  }
})

test('an offline admin can edit standards and global scenes; drafts survive restart and upload later', async ({page}) => {
  await install(page, {cached:true, offline:true})
  await page.goto('/'); await ready(page)
  await page.evaluate(async () => {
    const {useProject} = await import('/src/store/project.ts')
    useProject.getState().updateCalibracao('cancela','altura',3)
    useProject.getState().setEscopoCena('global')
    useProject.getState().adicionarCena('Cena offline',[1,2,3],[0,0,0])
  })
  await page.reload(); await ready(page)
  const draft=await page.evaluate(async () => {const s=(await import('/src/store/project.ts')).useProject.getState();return {height:s.calibracoes.cancela.altura,scenes:s.cenasGlobais.length}})
  expect(draft).toEqual({height:3,scenes:1})
  await page.evaluate(() => {window.cloudTest.offline=false})
  await sync(page)
  expect(await page.evaluate(async () => (await import('/src/cloud/sync.ts')).useCloud.getState().settingsDirty)).toBe(false)
  expect(await page.evaluate(() => window.cloudTest.requests.filter(r=>r.endpoint==='settings').at(-1).body.data.cenas[0].nome)).toBe('Cena offline')
})

test('a lost settings response is acknowledged on reconnect without a false conflict', async ({page}) => {
  await install(page, {cached:true})
  await page.goto('/'); await ready(page); await sync(page)
  await page.evaluate(async () => {
    window.cloudTest.loseSettingsReply = true
    const {useProject} = await import('/src/store/project.ts')
    useProject.getState().updateCalibracao('cancela','altura',4)
  })
  await expect.poll(() => page.evaluate(async () => (await import('/src/cloud/session.ts')).useSession.getState().online)).toBe(false)
  const writes=await page.evaluate(() => window.cloudTest.requests.filter(r=>r.endpoint==='settings').length)
  await page.evaluate(() => { const data=window.cloudTest.settings.data; data.calibracoes=Object.fromEntries(Object.entries(data.calibracoes).reverse()) })
  await sync(page)
  const status=await page.evaluate(async () => {const s=(await import('/src/cloud/sync.ts')).useCloud.getState();return {dirty:s.settingsDirty,error:s.settingsError,writes:window.cloudTest.requests.filter(r=>r.endpoint==='settings').length}})
  expect(status).toEqual({dirty:false,error:undefined,writes})
})
