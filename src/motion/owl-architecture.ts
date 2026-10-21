import '@fontsource-variable/manrope'
import narration from './owl-architecture-timeline.json'

async function iniciarArquiteturas() {
  const requested = new URLSearchParams(location.search).get('format')
  const format = ['square', 'reels', 'feed'].includes(requested ?? '') ? requested! : 'landscape'
  const landscape = format === 'landscape', reels = format === 'reels', square = format === 'square'
  const width = landscape ? 1920 : 1080, height = reels ? 1920 : format === 'feed' ? 1350 : 1080
  const duration = narration.duration, left = landscape ? 96 : 80, right = landscape ? 1824 : reels ? 926 : 1000
  const canvas = document.querySelector<HTMLCanvasElement>('#motion')!
  canvas.width = width; canvas.height = height
  document.body.classList.add(format)
  const ctx = canvas.getContext('2d', { alpha: false })!
  const css = getComputedStyle(document.documentElement)
  const C = { blue: css.getPropertyValue('--siamac-blue').trim(), red: css.getPropertyValue('--siamac-red').trim(), green: css.getPropertyValue('--siamac-green').trim(), ink: '#122336', muted: '#617084', line: '#DDE5EE', pale: '#F4F7FA' }
  const clamp = (n: number) => Math.max(0, Math.min(1, n))
  const ease = (n: number) => { const v = clamp(n); return v * v * (3 - 2 * v) }
  const out = (n: number) => 1 - Math.pow(1 - clamp(n), 4)
  const phase = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
  let overflow: string[] = [], sizes: number[] = []
  const scenes = [
    { id: 'bancos', start: 0, end: 8 },
    { id: 'pesagem', start: 8, end: 18 },
    { id: 'clientes', start: 18, end: 28 },
    { id: 'local', start: 28, end: 38 },
    { id: 'local-servidor', start: 38, end: 49 },
    { id: 'centralizado', start: 49, end: 61 },
    { id: 'nuvem', start: 61, end: 73 },
    { id: 'hibrida', start: 73, end: 90 },
    { id: 'encerramento', start: 90, end: 97 },
  ]
  function text(value: string, x: number, y: number, size = 42, weight = 500, color = C.ink, align: CanvasTextAlign = 'left') {
    ctx.font = `${weight} ${size}px "Manrope Variable", Manrope, sans-serif`
    ctx.textAlign = align; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = color
    const extent = ctx.measureText(value).width, transform = ctx.getTransform()
    const a = x - (align === 'center' ? extent / 2 : align === 'right' ? extent : 0)
    const x1 = a * transform.a + transform.e, x2 = (a + extent) * transform.a + transform.e
    if (ctx.globalAlpha > .95 && (x1 < -1 || x2 > width + 1)) overflow.push(value)
    sizes.push(size * transform.a)
    ctx.fillText(value, x, y)
  }
  function lines(values: string[], x: number, y: number, size: number, leading: number, weight = 500, color = C.ink, align: CanvasTextAlign = 'left') {
    values.forEach((value, i) => text(value, x, y + i * leading, size, weight, color, align))
  }
  function rect(x: number, y: number, w: number, h: number, fill = '#fff', r = 12, stroke?: string) {
    ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill()
    if (stroke) { ctx.lineWidth = 2; ctx.strokeStyle = stroke; ctx.stroke() }
  }
  function line(x1: number, y1: number, x2: number, y2: number, color = C.line, thickness = 3) {
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = thickness; ctx.stroke()
  }
  function group(alpha: number, dx: number, dy: number, draw: () => void) {
    if (alpha <= 0) return
    ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.translate(dx, dy); draw(); ctx.restore()
  }
  function appear(t: number, start: number, draw: () => void) {
    const p = out((t - start) / .8); group(p, 0, (1 - p) * 24, draw)
  }
  function shadow(draw: () => void) {
    ctx.save(); ctx.shadowColor = 'rgba(0,35,71,.08)'; ctx.shadowBlur = 35; ctx.shadowOffsetY = 16; draw(); ctx.restore()
  }
  function symbol(path: string, x: number, y: number, size: number, color = C.blue, thickness = 1.6) {
    ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24); ctx.strokeStyle = color; ctx.lineWidth = thickness
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(new Path2D(path)); ctx.restore()
  }
  function check(x: number, y: number, color = C.green) { symbol('M4 12l5 5L20 5', x, y, 36, color, 2) }
  async function asset(file: string) { const img = new Image(); img.src = `${import.meta.env.BASE_URL}brand/motion-owl/${file}`; await img.decode(); return img }
  const [owl, siamac] = await Promise.all([asset('owl-logo.png'), asset('siamac.webp'), document.fonts.ready])
  function owlBrand(x: number, y: number, h: number) {
    const w = h * owl.width / owl.height
    ctx.drawImage(owl, x, y, w, h); text('OWL', x + w + 16, y + h * .74, h * .65, 800)
  }
  function header(t: number) {
    appear(t, 0, () => {
      const y = landscape ? 55 : reels ? 268 : square ? 35 : 54
      owlBrand(left, y, 64)
      ctx.drawImage(siamac, right - 266, y + 16, 266, 39)
    })
  }
  function footer(index: number) {
    const y = landscape ? 1012 : reels ? 1476 : square ? 1030 : 1284
    text('Arquiteturas OWL', left, y, landscape ? 30 : 34, 600, C.muted)
    const segment = (right - left) / scenes.length
    scenes.forEach((_, i) => rect(left + segment * i, y + 24, segment - 8, 4, i <= index ? C.blue : C.line, 0))
    ;[C.red, C.green, C.blue].forEach((color, i) => rect(right - 58 + i * 20, y - 23, 10, 18, color, 0))
  }
  function heading(title: string[], sub: string[], t: number, start: number) {
    const y = landscape ? 338 : reels ? 430 : square ? 182 : 220
    appear(t, start, () => {
      lines(title, left, y, landscape ? 74 : square ? 60 : 64, landscape ? 90 : 78, 750)
      lines(sub, left, y + (landscape ? 208 : 156), landscape ? 40 : square ? 36 : 38, landscape ? 56 : 49, 400, C.muted)
    })
  }
  function region() {
    return landscape ? { x: 824, y: 218, w: 1000, h: 660 } : { x: 80, y: reels ? 738 : square ? 448 : 520, w: right - 80, h: reels ? 650 : square ? 500 : 650 }
  }
  function graph(draw: (w: number, h: number) => void) {
    const r = region(); ctx.save(); ctx.translate(r.x, r.y); draw(r.w, r.h); ctx.restore()
  }
  function link(points: [number, number][], t: number, start: number, color = C.blue, active = true) {
    const p = ease(phase(t, start, start + .9))
    if (p <= 0) return
    const lengths = points.slice(1).map((point, i) => Math.hypot(point[0] - points[i][0], point[1] - points[i][1]))
    const total = lengths.reduce((a, b) => a + b, 0)
    ctx.save(); ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = active ? C.line : '#A7B2C0'
    if (!active) ctx.setLineDash([10, 12])
    ctx.beginPath(); points.forEach((point, i) => i ? ctx.lineTo(...point) : ctx.moveTo(...point)); ctx.stroke(); ctx.setLineDash([])
    let remaining = total * p; ctx.strokeStyle = active ? color : '#A7B2C0'; ctx.beginPath(); ctx.moveTo(...points[0])
    for (let i = 0; i < lengths.length; i++) {
      const a = points[i], b = points[i + 1], fraction = Math.min(1, remaining / lengths[i])
      ctx.lineTo(a[0] + (b[0] - a[0]) * fraction, a[1] + (b[1] - a[1]) * fraction)
      remaining -= lengths[i]; if (remaining <= 0) break
    }
    ctx.globalAlpha *= active ? .6 : .45; ctx.stroke(); ctx.restore()
    if (!active) return
    let at = ((t - start) / 2.4 % 1) * total
    for (let i = 0; i < lengths.length; i++) {
      if (at <= lengths[i]) {
        const a = points[i], b = points[i + 1], v = at / lengths[i]
        shadow(() => rect(a[0] + (b[0] - a[0]) * v - 9, a[1] + (b[1] - a[1]) * v - 9, 18, 18, color, 4)); break
      }
      at -= lengths[i]
    }
  }
  function database(cx: number, cy: number, size = 110, color = C.blue) {
    ctx.save(); ctx.translate(cx - size / 2, cy - size / 2); ctx.scale(size / 100, size / 100)
    ctx.fillStyle = '#fff'; ctx.strokeStyle = color; ctx.lineWidth = 3.5
    ctx.beginPath(); ctx.moveTo(12, 21); ctx.lineTo(12, 79); ctx.ellipse(50, 79, 38, 14, 0, Math.PI, 0, true); ctx.lineTo(88, 21); ctx.closePath(); ctx.fill(); ctx.stroke()
    for (const y of [41, 60]) { ctx.beginPath(); ctx.ellipse(50, y, 38, 14, 0, 0, Math.PI); ctx.stroke() }
    ctx.beginPath(); ctx.ellipse(50, 21, 38, 14, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore()
  }
  function computer(cx: number, cy: number, localDB = false, color = C.blue, label = 'OWL') {
    shadow(() => rect(cx - 116, cy - 82, 232, 152, '#fff', 12, C.line))
    rect(cx - 104, cy - 70, 208, 118, '#EFF4FA', 5)
    line(cx, cy + 70, cx, cy + 98, color, 4); line(cx - 54, cy + 99, cx + 54, cy + 99, color, 4)
    if (localDB) { text('OWL', cx - 90, cy + 2, 40, 800, color); database(cx + 61, cy - 8, 74, color) }
    else if (label.startsWith('@')) {
      const paths: Record<string, string> = {
        '@pesagens': 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7ZM15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0',
        '@relatorios': 'M5 3h10l4 4v14H5ZM14 3v5h5M8 16v2M12 12v6M16 10v8',
        '@gestao': 'M3 3h7v7H3ZM14 3h7v7h-7ZM3 14h7v7H3ZM14 14h7v7h-7Z',
      }
      symbol(paths[label], cx - 29, cy - 39, 58, color)
    } else text(label, cx, cy + 8, 44, 800, color, 'center')
    rect(cx - 28, cy + 56, 56, 4, color, 0)
  }
  function scale(cx: number, cy: number) {
    // Uma balança rodoviária em perspectiva, sem periféricos.
    ctx.save(); ctx.translate(cx, cy)
    ctx.beginPath(); ctx.moveTo(-126, 3); ctx.lineTo(72, -34); ctx.lineTo(132, 5); ctx.lineTo(-68, 43); ctx.closePath(); ctx.fillStyle = '#EEF2F6'; ctx.fill(); ctx.strokeStyle = C.blue; ctx.lineWidth = 3; ctx.stroke()
    ctx.beginPath(); ctx.moveTo(-126, 3); ctx.lineTo(-126, 28); ctx.lineTo(-68, 68); ctx.lineTo(132, 30); ctx.lineTo(132, 5); ctx.lineTo(-68, 43); ctx.closePath(); ctx.fillStyle = '#E2EAF3'; ctx.fill(); ctx.stroke()
    for (let i = 0; i < 10; i++) line(-59 + i * 18, 48 - i * 3.4, -59 + i * 18, 64 - i * 3.4, C.blue, 3)
    ctx.restore()
  }
  function server(cx: number, cy: number, color = C.blue) {
    shadow(() => rect(cx - 72, cy - 78, 144, 156, '#fff', 10, C.line))
    for (let i = 0; i < 3; i++) {
      rect(cx - 57, cy - 60 + i * 43, 114, 32, C.pale, 5)
      line(cx - 41, cy - 44 + i * 43, cx + 19, cy - 44 + i * 43, color, 3)
      rect(cx + 34, cy - 49 + i * 43, 9, 9, color, 5)
    }
    database(cx + 60, cy + 45, 75, color)
  }
  function cloud(cx: number, cy: number, color = C.blue) {
    ctx.save(); ctx.translate(cx - 120, cy - 80); ctx.fillStyle = '#fff'; ctx.strokeStyle = color; ctx.lineWidth = 4
    const p = new Path2D('M51 129C0 130 0 57 50 55C56 6 126 0 147 43C190 25 218 52 213 78C254 91 246 133 205 133H51Z')
    ctx.fill(p); ctx.stroke(p); ctx.restore(); database(cx + 4, cy + 12, 80, color)
  }
  function label(values: string[], cx: number, y: number, size = 40, color = C.ink) { lines(values, cx, y, size, size + 10, 650, color, 'center') }
  function pill(value: string, cx: number, y: number, color = C.blue, fill = '#E8EFF7') {
    ctx.font = '650 38px "Manrope Variable"'; const w = ctx.measureText(value).width + 44
    rect(cx - w / 2, y - 39, w, 58, fill, 8); text(value, cx, y, 38, 650, color, 'center')
  }
  function banks(t: number) {
    heading(['Seu OWL.', 'Seu banco de dados.'], ['Compatível com', 'SQL Server Express ou MySQL.'], t, 0)
    graph((w, h) => {
      const top = h * .16, bottom = h * .67, a = w * .23, b = w * .77
      link([[w / 2, top + 40], [w / 2, h * .37], [a, h * .37], [a, bottom - 90]], t, 1.4)
      link([[w / 2, top + 40], [w / 2, h * .37], [b, h * .37], [b, bottom - 90]], t, 1.8)
      appear(t, .3, () => owlBrand(w / 2 - 124, top - 45, 80))
      ;[a, b].forEach((cx, i) => appear(t, 1 + i * .4, () => {
        shadow(() => rect(cx - w * .215, bottom - 93, w * .43, 224, '#fff', 12, C.line))
        database(cx, bottom - 34, 80)
        if (i === 0) lines(['SQL Server', 'Express'], cx, bottom + 52, 48, 59, 750, C.ink, 'center')
        else text('MySQL', cx, bottom + 84, 60, 750, C.ink, 'center')
      }))
    })
  }
  function weighing(t: number) {
    heading(['Computador', 'de pesagem.'], ['Conecta na balança', 'e realiza a pesagem.'], t, 8)
    graph((w, h) => {
      const a = w * .19, b = w * .72, cy = h * .44
      link([[a + 128, cy + 18], [b - 120, cy + 18]], t, 9.6)
      appear(t, 8.5, () => { scale(a, cy); label(['Balança'], a, cy + 150, 42) })
      appear(t, 9.1, () => { computer(b, cy); label(['Computador', 'de pesagem'], b, cy + 153, 42) })
      appear(t, 11.3, () => pill('Conexão com a balança', w / 2, h * .92))
    })
  }
  function clients(t: number) {
    heading(['Computadores clientes.', 'A operação à vista.'], ['Visualize pesagens.', 'Emita relatórios. Gerencie.'], t, 18)
    graph((w, h) => {
      const top = h * .15, bottom = h * .66, centers = [w * .16, w * .5, w * .84]
      centers.forEach((cx, i) => link([[w / 2, top + 55], [w / 2, h * .37], [cx, h * .37], [cx, bottom - 87]], t, 19.5 + i * .35))
      appear(t, 18.4, () => { database(w / 2, top, 108); pill('Dados da operação', w / 2, top + 116) })
      centers.forEach((cx, i) => appear(t, 19 + i * .5, () => {
        computer(cx, bottom, false, C.blue, ['@pesagens', '@relatorios', '@gestao'][i])
        label([['Pesagens'], ['Relatórios'], ['Gestão']][i], cx, bottom + 153, 40)
      }))
    })
  }
  function local(t: number) {
    heading(['Arquitetura local.'], ['OWL e banco de dados', 'no mesmo computador.'], t, 28)
    graph((w, h) => {
      const a = w * .18, b = w * .71, cy = h * .43
      link([[a + 128, cy + 18], [b - 120, cy + 18]], t, 29.7)
      appear(t, 28.5, () => { scale(a, cy); label(['Balança'], a, cy + 151, 42) })
      appear(t, 29, () => {
        rect(b - 162, cy - 130, 324, 370, '#F4F7FA', 12)
        computer(b, cy, true); label(['OWL + banco', 'no mesmo PC'], b, cy + 155, 40)
      })
    })
  }
  function localServer(t: number) {
    heading(['Local com servidor.'], ['Banco em outro computador,', 'dentro da mesma rede.'], t, 38)
    graph((w, h) => {
      const a = w * .22, b = w * .76, cy = h * .47
      link([[a + 118, cy], [b - 81, cy]], t, 39.5)
      appear(t, 38.4, () => { computer(a, cy); label(['Computador', 'de pesagem'], a, cy + 153, 40) })
      appear(t, 39, () => { server(b, cy); label(['Servidor local', 'Banco de dados'], b, cy + 153, 40) })
      appear(t, 40.4, () => pill('Ethernet / rede local', w / 2, cy - 137))
    })
  }
  function centralized(t: number, inCloud: boolean) {
    const start = inCloud ? 61 : 49
    heading(inCloud ? ['Arquitetura', 'em nuvem.'] : ['Servidor centralizado.'], inCloud ? ['O banco de dados fica', 'em um servidor na nuvem.'] : ['Um banco na central do cliente.', 'As unidades acessam via VPN.'], t, start)
    graph((w, h) => {
      const top = h * .13, bottom = h * .72, centers = [w * .16, w * .5, w * .84]
      centers.forEach((cx, i) => link([[cx, bottom - 84], [cx, h * .48], [w / 2, h * .48], [w / 2, top + 70]], t, start + 1.6 + i * .3))
      appear(t, start + .4, () => {
        if (inCloud) cloud(w / 2, top); else server(w / 2, top)
        pill(inCloud ? 'Servidor em nuvem' : 'Central do cliente', w / 2, top + 141, C.ink, '#fff')
      })
      appear(t, start + 2.5, () => pill('Ethernet + VPN', w / 2, h * .49))
      centers.forEach((cx, i) => appear(t, start + .9 + i * .4, () => {
        computer(cx, bottom); label([`Unidade ${i + 1}`], cx, bottom + 153, 40)
      }))
    })
  }
  function hybrid(t: number) {
    const integrated = t >= 79, updated = t >= 85
    heading(updated ? ['Tudo atualizado.', 'Unidades conectadas.'] : integrated ? ['Pesagem finalizada.', 'Dados integrados.'] : ['Arquitetura híbrida.'], updated ? ['Operação local.', 'Visão consolidada na central.'] : integrated ? ['Cada conclusão segue', 'para a central ou a nuvem.'] : ['Cada unidade pesa localmente,', 'sem depender da internet.'], t, updated ? 85 : integrated ? 79 : 73)
    graph((w, h) => {
      const top = h * .11, middle = h * .49, bottom = h * .81, centers = [w * .25, w * .75], iconScale = h < 550 ? .72 : .86
      centers.forEach((cx, i) => appear(t, 74 + i * .3, () => rect(cx - w * .23, middle - 100, w * .46, bottom - middle + (iconScale < 1 ? 210 : 245), '#F4F7FA', 12)))
      centers.forEach((cx, i) => {
        link([[cx, middle - 80 * iconScale], [cx, h * .28], [w / 2, h * .28], [w / 2, top + 53]], t, 74.2 + i * .2, C.blue, integrated)
        link([[cx + 118 * iconScale, bottom], [cx + 170, bottom], [cx + 170, middle], [cx + 85 * iconScale, middle]], t, 74.8 + i * .3, C.green)
      })
      appear(t, 73.5, () => { cloud(w / 2, top, integrated ? C.blue : '#8995A4'); pill('Central / nuvem', w / 2, top + 105, integrated ? C.blue : C.muted, '#fff') })
      centers.forEach((cx, i) => appear(t, 74 + i * .3, () => {
        label([`Unidade ${i + 1}`], cx, middle - (h < 550 ? 121 : 95), 38)
        ctx.save(); ctx.translate(cx, middle); ctx.scale(iconScale, iconScale); server(0, 0, C.green); ctx.restore()
        label(['Servidor local'], cx, middle + (h < 550 ? 96 : 102), 38)
        ctx.save(); ctx.translate(cx, bottom); ctx.scale(iconScale, iconScale); computer(0, 0, false, C.green); ctx.restore()
        label(['Pesagem'], cx, bottom + (h < 550 ? 115 : 136), 40)
      }))
      if (updated) appear(t, 85.3, () => { check(w / 2 + 127, top - 40); })
    })
  }
  function closing(t: number) {
    heading(['Do local à nuvem.', 'O OWL acompanha.'], ['Uma arquitetura', 'para cada operação.'], t, 90)
    graph((w, h) => {
      const cy = h * .35
      appear(t, 90.5, () => owlBrand(w / 2 - 194, cy - 78, 126))
      appear(t, 91.5, () => {
        line(w * .1, cy + 115, w * .9, cy + 115)
        label(['SQL Server Express'], w / 2, cy + 195, 44)
        text('ou MySQL', w / 2, cy + 254, 44, 650, C.ink, 'center')
      })
      appear(t, 93.5, () => { check(w / 2 - 289, h * .92 - 29); text('Sua operação conectada.', w / 2 + 26, h * .92, 42, 650, C.green, 'center') })
    })
  }
  function logicalTime(time: number) {
    const actual = Math.max(0, Math.min(duration, time))
    const chapter = narration.chapters.find(chapter => actual >= chapter.start && actual < chapter.end) ?? narration.chapters[narration.chapters.length - 1]
    return chapter.logicalStart + (chapter.logicalEnd - chapter.logicalStart) * (actual - chapter.start) / (chapter.end - chapter.start)
  }
  function actualTime(logical: number) {
    const chapter = narration.chapters.find(chapter => logical >= chapter.logicalStart && logical < chapter.logicalEnd) ?? narration.chapters[narration.chapters.length - 1]
    return chapter.start + (chapter.end - chapter.start) * (logical - chapter.logicalStart) / (chapter.logicalEnd - chapter.logicalStart)
  }
  function render(time: number) {
    const t = logicalTime(time); overflow = []; sizes = []
    ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, width, height)
    const index = scenes.findIndex(scene => t >= scene.start && t < scene.end), sceneIndex = index < 0 ? scenes.length - 1 : index
    const cut = scenes.slice(1).find(scene => Math.abs(t - scene.start) < .28)
    const alpha = cut ? ease(Math.abs(t - cut.start) / .28) : 1
    group(alpha, 0, 0, () => {
      switch (sceneIndex) {
        case 0: banks(t); break
        case 1: weighing(t); break
        case 2: clients(t); break
        case 3: local(t); break
        case 4: localServer(t); break
        case 5: centralized(t, false); break
        case 6: centralized(t, true); break
        case 7: hybrid(t); break
        default: closing(t)
      }
    })
    header(t); footer(sceneIndex); return Math.max(0, Math.min(duration, time))
  }
  let playing = false, current = 0, raf = 0
  const audio = new Audio()
  audio.preload = new URLSearchParams(location.search).has('render') ? 'none' : 'metadata'
  audio.src = `${import.meta.env.BASE_URL}brand/motion-owl/owl-arquiteturas-narracao.mp3`
  const play = document.querySelector<HTMLButtonElement>('#play')!, seek = document.querySelector<HTMLInputElement>('#seek')!
  const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`
  function updateTime() { seek.value = String(current); document.querySelector('#time')!.textContent = `${clock(current)} / ${clock(duration)}` }
  function stop() { playing = false; audio.pause(); cancelAnimationFrame(raf); play.textContent = 'Reproduzir' }
  function tick() { current = Math.min(duration, audio.currentTime); render(current); updateTime(); if (playing && current < duration && !audio.ended) raf = requestAnimationFrame(tick); else stop() }
  play.onclick = async () => {
    if (playing) { stop(); return }
    if (current >= duration) current = 0
    audio.currentTime = current
    try { await audio.play(); playing = true; play.textContent = 'Pausar'; raf = requestAnimationFrame(tick) }
    catch { stop(); play.textContent = 'Tentar reproduzir' }
  }
  seek.max = String(duration); seek.oninput = () => { stop(); current = Number(seek.value); audio.currentTime = current; render(current); updateTime() }
  document.querySelector<HTMLButtonElement>('#restart')!.onclick = () => { stop(); current = 0; audio.currentTime = 0; render(0); updateTime() }
  const selection = document.querySelector<HTMLSelectElement>('#format')!
  selection.value = format; selection.onchange = () => { const url = new URL(location.href); url.searchParams.set('format', selection.value); location.assign(url.href) }
  document.body.classList.toggle('render', new URLSearchParams(location.search).has('render'))
  window.owlMotion = {
    ready: true, duration, render,
    frame: t => { render(t); return canvas.toDataURL('image/png') },
    poster: () => { render(actualTime(94.8)); return canvas.toDataURL('image/png') },
    inspect: () => ({ format, width, height, duration, narration: true, timeline: narration.chapters, architectures: ['local', 'local-servidor', 'centralizado', 'nuvem', 'hibrida'], engines: ['SQL Server Express', 'MySQL'], scenes: scenes.map(scene => ({ ...scene, start: actualTime(scene.start), end: actualTime(scene.end) })), overflow, minTextSize: Math.min(...sizes), palette: C }),
  }
  render(0); updateTime()
}

void iniciarArquiteturas().catch(error => { console.error(error); document.body.textContent = 'Não foi possível carregar o motion de arquiteturas OWL.' })
