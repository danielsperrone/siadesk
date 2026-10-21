import '@fontsource-variable/manrope'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { criarVeiculoArticulado } from '../components/veiculo-rig'

declare global {
  interface Window { owlMotion: { ready: boolean; duration: number; render: (time: number) => number; frame: (time: number) => string; poster: () => string; inspect: () => unknown } }
}

async function iniciarMotion() {
// A composição tem relógio determinístico: a prévia e o MP4 usam os mesmos frames.
// Não usa stores, sessões, simuladores ou dados de projetos do SIADESK.
const requestedFormat = new URLSearchParams(location.search).get('format')
const formatName = ['square', 'reels', 'feed'].includes(requestedFormat ?? '') ? requestedFormat! : 'landscape'
const square = formatName === 'square', reels = formatName === 'reels', social = reels || formatName === 'feed'
const WIDTH = formatName === 'landscape' ? 1920 : 1080, HEIGHT = reels ? 1920 : formatName === 'feed' ? 1350 : 1080, DURATION = 34
const socialRight = reels ? 926 : 1000, socialWidth = socialRight - 80, socialCenter = (80 + socialRight) / 2
const PESO_DETECTADO = 54000
const pesoDetectado = `${PESO_DETECTADO.toLocaleString('pt-BR')} kg`
const canvas = document.querySelector<HTMLCanvasElement>('#motion')!
canvas.width = WIDTH; canvas.height = HEIGHT
document.body.classList.toggle('square', square)
document.body.classList.toggle('reels', reels)
document.body.classList.toggle('feed', formatName === 'feed')
const ctx = canvas.getContext('2d', { alpha: false })!
const css = getComputedStyle(document.documentElement)
const C = {
  blue: css.getPropertyValue('--siamac-blue').trim(),
  red: css.getPropertyValue('--siamac-red').trim(),
  green: css.getPropertyValue('--siamac-green').trim(),
  ink: '#122336', muted: '#617084', line: '#DDE5EE', pale: '#F4F7FA',
}
const clamp = (n: number) => Math.max(0, Math.min(1, n))
const ease = (n: number) => { const v = clamp(n); return v * v * (3 - 2 * v) }
const out = (n: number) => 1 - Math.pow(1 - clamp(n), 4)
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const phase = (t: number, a: number, b: number) => clamp((t - a) / (b - a))

function text(s: string, x: number, y: number, size = 28, weight = 500, color = C.ink, align: CanvasTextAlign = 'left') {
  ctx.font = `${weight} ${size}px "Manrope Variable", Manrope, sans-serif`
  ctx.fillStyle = color; ctx.textAlign = align; ctx.textBaseline = 'alphabetic'
  ctx.fillText(s, x, y)
}
function lines(values: string[], x: number, y: number, size: number, leading: number, weight = 700, color = C.ink, align: CanvasTextAlign = 'left') {
  values.forEach((value, i) => text(value, x, y + i * leading, size, weight, color, align))
}
function rect(x: number, y: number, w: number, h: number, fill = '#fff', r = 10, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill()
  if (stroke) { ctx.lineWidth = 1.5; ctx.strokeStyle = stroke; ctx.stroke() }
}
function line(x1: number, y1: number, x2: number, y2: number, color = C.line, width = 2) {
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.stroke()
}
function group(alpha: number, x: number, y: number, scale: number, draw: () => void) {
  if (alpha <= 0) return
  ctx.save(); ctx.globalAlpha *= clamp(alpha); ctx.translate(x, y); ctx.scale(scale, scale); draw(); ctx.restore()
}
function shadow(draw: () => void) {
  ctx.save(); ctx.shadowColor = 'rgba(0,35,71,.10)'; ctx.shadowBlur = 50; ctx.shadowOffsetY = 20; draw(); ctx.restore()
}
function bars(x: number, y: number, width: number, height: number) {
  ;[C.red, C.green, C.blue].forEach((color, i) => rect(x, y + i * (height + 5), width + i * 10, height, color, 0))
}
type Icon = 'check' | 'alert' | 'document' | 'mail' | 'shield' | 'arrow' | 'scan'
function icon(name: Icon, x: number, y: number, size: number, color = C.blue) {
  ctx.save(); ctx.translate(x, y); ctx.scale(size / 24, size / 24)
  ctx.lineWidth = 1.75; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = color
  const p = new Path2D({
    check: 'M5 12l4 4L19 6',
    alert: 'M12 3L2 21h20L12 3M12 9v5M12 17v.1',
    document: 'M14 2H5v20h14V7l-5-5M14 2v6h5M8 12h8M8 16h8',
    mail: 'M3 5h18v14H3ZM3 6l9 7 9-7',
    shield: 'M12 2l8 3v6c0 5-4 9-8 11-4-2-8-6-8-11V5l8-3M8 12l3 3 5-6',
    arrow: 'M4 12h16M14 6l6 6-6 6',
    scan: 'M8 3H3v5M16 3h5v5M21 16v5h-5M8 21H3v-5M7 12h10',
  }[name]); ctx.stroke(p); ctx.restore()
}
function chip(label: string, x: number, y: number, color: string, fill: string, width: number) {
  rect(x, y, width, 42, fill, 6); text(label, x + 16, y + 28, 20, 650, color)
}
async function asset(file: string) {
  const img = new Image(); img.src = `${import.meta.env.BASE_URL}brand/motion-owl/${file}`; await img.decode(); return img
}
const [owl, siamac] = await Promise.all([asset('owl-logo.png'), asset('siamac.webp'), document.fonts.ready])

function owlBrand(x: number, y: number, height = 64) {
  // Marca original, sem reconstruir a coruja ou alterar suas proporções.
  ctx.drawImage(owl, x, y, height * owl.width / owl.height, height)
  text('OWL', x + height * owl.width / owl.height + 14, y + height * .72, height * .62, 800)
}
function header(t: number) {
  group(out(t / .8), 0, 0, 1, () => {
    if (social) {
      const y = reels ? 280 : 60
      owlBrand(80, y, 64)
      ctx.drawImage(siamac, socialRight - 266, y + 16, 266, 39)
      return
    }
    if (square) {
      owlBrand(56, 35, 46)
      line(211, 43, 211, 76)
      text('Inteligência na pesagem', 235, 65, 18, 500, C.muted)
      ctx.drawImage(siamac, 792, 46, 232, 34)
      return
    }
    owlBrand(96, 55, 64)
    line(303, 63, 303, 109)
    text('Inteligência na pesagem', 332, 93, 23, 500, C.muted)
    ctx.drawImage(siamac, 1538, 73, 286, 42)
  })
}
function footer() {
  if (social) {
    const y = reels ? 1476 : 1284
    text('Demonstração ilustrativa', 80, y, 34, 400, C.muted)
    bars(80, y + 26, 31, 3)
    return
  }
  if (square) {
    text('Monitoramento antifraude', 56, 1034, 17, 600, C.muted)
    text('Demonstração ilustrativa', 1024, 1034, 16, 400, '#7C8999', 'right')
    bars(56, 1056, 31, 3)
    return
  }
  text('Monitoramento antifraude', 96, 1017, 20, 600, C.muted)
  text('Demonstração ilustrativa', 1824, 1017, 18, 400, '#7C8999', 'right')
  bars(96, 1042, 41, 3)
}
function heading(content: string[], sub: string[], t: number, start: number, x = 96, y = 266) {
  const e = out((t - start) / 1)
  group(e, 0, (1 - e) * 28, 1, () => {
    lines(content, x, y, 76, 89, 750)
    lines(sub, x, y + content.length * 89 + 14, 28, 42, 400, C.muted)
  })
}

// Os mesmos GLBs calibrados da apresentação do SIADESK, em um estúdio claro.
const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, preserveDrawingBuffer: true })
renderer.setSize(1500, 840); renderer.setPixelRatio(1)
renderer.setClearColor(0xffffff, 0)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(32, 1500 / 840, .1, 200)
scene.add(new THREE.HemisphereLight('#ffffff', '#b9c9d8', 2.7))
const sun = new THREE.DirectionalLight('#ffffff', 3.5); sun.position.set(-12, 26, 16); sun.castShadow = true
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -38; sun.shadow.camera.right = 38
sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28; sun.shadow.normalBias = .04
scene.add(sun)
const fill = new THREE.DirectionalLight('#d7eaff', 1.7); fill.position.set(15, 8, -15); scene.add(fill)
const loader = new GLTFLoader()
const modelFiles = ['veiculo', 'balanca'] as const
const loaded = await Promise.all(modelFiles.map(async name => ({ name, model: (await loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`)).scene })))
const models = Object.fromEntries(loaded.map(({ name, model }) => [name, model])) as Record<typeof modelFiles[number], THREE.Group>
function model(name: typeof modelFiles[number], position: [number, number, number], rotationY = 0) {
  const m = models[name].clone(true); m.position.set(...position); m.rotation.y = rotationY
  m.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true } })
  scene.add(m); return m
}
const platform = model('balanca', [0, 0, 0]); platform.scale.x = 16 / 14.91
const { modelo: truck, rodas: wheels } = criarVeiculoArticulado(models.veiculo)
truck.position.y = .55
truck.traverse(o => { if (o instanceof THREE.Mesh) { o.castShadow = true; o.receiveShadow = true } })
scene.add(truck)
const wheelAngles = wheels.map(w => w.pivot.rotation.z)
const floor = new THREE.Mesh(new THREE.PlaneGeometry(180, 120), new THREE.ShadowMaterial({ opacity: .12 }))
floor.rotation.x = -Math.PI / 2; floor.position.y = -.03; floor.receiveShadow = true; scene.add(floor)
const road = new THREE.Mesh(new THREE.BoxGeometry(34, .035, 4.2), new THREE.MeshStandardMaterial({ color: '#e2e8ee', roughness: .9 }))
road.position.y = -.015; road.receiveShadow = true; scene.add(road)
// Marcas de fluxo discretas, sem a área verde do configurador.
for (let x = -15; x <= 15; x += 5) {
  if (Math.abs(x) < 10) continue
  for (const z of [-1.94, 1.94]) {
    const marking = new THREE.Mesh(new THREE.PlaneGeometry(2.2, .07), new THREE.MeshBasicMaterial({ color: '#ffffff' }))
    marking.rotation.x = -Math.PI / 2; marking.position.set(x, .012, z); scene.add(marking)
  }
}
const scanMaterial = new THREE.MeshBasicMaterial({ color: C.blue, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
const scan = new THREE.Mesh(new THREE.PlaneGeometry(3.3, 4.8), scanMaterial)
scan.rotation.y = Math.PI / 2; scan.position.set(0, 2.3, 0); scene.add(scan)
function render3D(t: number) {
  // O conjunto tem a cabine voltada a -X: a frente e as rodas acompanham o percurso.
  const travel = ease(phase(t, .8, 9.6)), x = mix(29, -32, travel)
  truck.position.x = x
  wheels.forEach(({ pivot, raio }, i) => { pivot.rotation.z = wheelAngles[i] - (x - 29) / raio })
  const drift = ease(t / 12)
  camera.position.set(mix(17, 13, drift), mix(15, 13, drift), 29)
  camera.lookAt(-1, .6, 0)
  scan.position.x = mix(8, -8, phase(t, 2.7, 7.2))
  scanMaterial.opacity = .06 * ease(phase(t, 2, 3)) * (1 - ease(phase(t, 7.6, 8.3)))
  renderer.render(scene, camera)
}
const evidence = document.createElement('canvas'); evidence.width = 1000; evidence.height = 560
render3D(5.1); evidence.getContext('2d')!.drawImage(renderer.domElement, 0, 0, 1000, 560)
function evidenceImage(x: number, y: number, w: number, h: number) {
  ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, w, h, 6); ctx.clip()
  rect(x, y, w, h, C.pale); ctx.drawImage(evidence, x, y - h * .08, w, h * 1.15)
  ctx.restore()
}

function alertCard(x: number, y: number, scale = 1) {
  group(1, x, y, scale, () => {
    shadow(() => rect(0, 0, 760, 262, '#fff', 10, '#E4D4D7'))
    rect(0, 10, 6, 242, C.red, 0)
    owlBrand(33, 27, 48)
    chip('Alerta de fraude', 234, 29, C.red, '#F9ECEC', 219)
    text('agora', 723, 59, 19, 400, C.muted, 'right')
    lines(['Veículo passou pela balança', 'sem registrar o ticket.'], 34, 125, 31, 43, 650)
    line(34, 204, 726, 204)
    icon('scan', 34, 222, 20, C.muted)
    text('Balança 01', 65, 239, 19, 500, C.muted)
    text('Passagem sem ticket', 725, 239, 19, 600, C.red, 'right')
  })
}
function progressNode(x: number, y: number, label: string, detail: string, p: number, type: Icon, color = C.blue) {
  const e = out(p)
  group(e, 0, (1 - e) * 16, 1, () => {
    rect(x, y, 58, 58, color === C.red ? '#F9ECEC' : '#E8EFF7', 8)
    icon(type, x + 15, y + 15, 28, color)
    text(label, x + 82, y + 23, 27, 700)
    text(detail, x + 82, y + 56, 22, 400, C.muted)
  })
}
function connector(x1: number, y: number, x2: number, p: number, color = C.blue) {
  line(x1, y, x2, y, C.line, 2)
  const length = (x2 - x1) * ease(p)
  line(x1, y, x1 + length, y, color, 3)
  if (p > 0 && p < 1) { rect(x1 + length - 7, y - 7, 14, 14, color, 3) }
}
function report(x: number, y: number, p: number, scale = 1) {
  group(1, x, y, scale, () => {
    shadow(() => rect(0, 0, 940, 608, '#fff', 10, C.line))
    rect(0, 0, 940, 6, C.blue, 0)
    icon('document', 36, 35, 32)
    text('Relatório de auditoria', 87, 61, 31, 750)
    text('OWL', 901, 60, 24, 800, C.blue, 'right')
    line(36, 90, 904, 90)
    text('Ocorrências da balança', 36, 130, 21, 500, C.muted)
    chip('1 ocorrência registrada', 637, 107, C.green, '#E8F4ED', 267)
    const e = out(p)
    group(e, 0, (1 - e) * 20, 1, () => {
      rect(36, 178, 868, 102, '#F9ECEC', 6)
      icon('alert', 60, 205, 30, C.red)
      text('Passagem sem ticket de pesagem', 110, 219, 29, 750, C.red)
      text('EVT-0042', 110, 255, 21, 500, C.muted)
      text('14:32:08', 879, 220, 24, 650, C.red, 'right')
      text('Balança 01', 879, 255, 21, 500, C.muted, 'right')
      evidenceImage(36, 309, 380, 212)
      text('Detalhes da ocorrência', 450, 332, 23, 700)
      text('Data e hora', 450, 371, 21, 400, C.muted)
      text('11/10/2026  14:32:08', 901, 371, 21, 600, C.ink, 'right')
      line(450, 386, 904, 386)
      text('Peso detectado', 450, 413, 21, 400, C.muted)
      text(pesoDetectado, 901, 413, 26, 750, C.blue, 'right')
      line(450, 428, 904, 428)
      text('Ticket de pesagem', 450, 455, 21, 400, C.muted)
      text('Não emitido', 901, 455, 22, 700, C.red, 'right')
      line(450, 470, 904, 470)
      text('Status', 450, 497, 21, 400, C.muted)
      text('Registrado na auditoria', 901, 497, 21, 650, C.green, 'right')
      icon('check', 36, 556, 22, C.green)
      text('Histórico disponível para conferência', 70, 575, 22, 500, C.muted)
    })
  })
}

function weightAt(t: number) {
  if (t < 2.6 || t > 9) return 0
  if (t < 4) return Math.round(mix(0, PESO_DETECTADO, ease(phase(t, 2.6, 4))) / 20) * 20
  if (t < 6.5) return PESO_DETECTADO
  return Math.round(mix(PESO_DETECTADO, 0, ease(phase(t, 6.5, 9))) / 20) * 20
}

function opening(t: number) {
  const intro = out(t / 1)
  group(intro, 0, 24 * (1 - intro), 1, () => {
    lines(['Um veículo passa.', 'O ticket não.'], 96, 278, 83, 100, 750)
    lines(['Uma passagem sem registro', 'não pode passar despercebida.'], 100, 517, 29, 44, 400, C.muted)
  })
  render3D(t)
  group(out((t - .2) / 1.2), 0, 0, 1, () => { ctx.drawImage(renderer.domElement, 600, 280, 1320, 739) })
  // Painel acompanha o peso, mas deixa inequívoco que nenhum ticket foi emitido.
  group(out((t - 1) / .8), 96, 660, 1, () => {
    line(0, 0, 344, 0)
    text('Peso na balança', 0, 44, 21, 500, C.muted)
    const weight = weightAt(t)
    text(weight.toLocaleString('pt-BR'), 0, 115, 60, 700, C.blue)
    text('kg', 278, 115, 26, 400, C.muted)
    line(0, 147, 344, 147)
    text('Tickets emitidos', 0, 192, 22, 500, C.muted)
    text('0', 344, 192, 35, 750, t > 8.8 ? C.red : C.ink, 'right')
  })
  const a = out((t - 9) / .7)
  group(a, 1010 + (1 - a) * 95, 227, mix(.96, 1, a), () => alertCard(0, 0))
  group(out((t - 9.5) / .7), 0, 0, 1, () => {
    icon('alert', 1006, 846, 27, C.red)
    text('Passagem concluída. Nenhum ticket registrado.', 1050, 869, 25, 650, C.red)
  })
}
function audit(t: number) {
  heading(['O OWL detecta.', 'E registra o evento.'], ['A passagem fica documentada', 'no relatório de auditoria.'], t, 12)
  const e = out((t - 12.5) / 1)
  group(e, 0, (1 - e) * 30, 1, () => report(866, 276, phase(t, 14.9, 15.9)))
  line(125, 604, 125, 805, C.line, 2)
  progressNode(96, 558, 'Passagem detectada', 'O veículo cruzou a balança.', (t - 12.7) / .65, 'scan')
  progressNode(96, 686, 'Ticket não encontrado', 'A passagem ficou sem pesagem registrada.', (t - 13.6) / .65, 'alert', C.red)
  progressNode(96, 814, 'Ocorrência registrada', 'Um novo evento no relatório de auditoria.', (t - 14.6) / .65, 'document')
  connector(696, 714, 832, phase(t, 14.3, 15.5))
  group(out((t - 16.2) / .7), 0, 0, 1, () => {
    icon('check', 875, 929, 24, C.green)
    text('A passagem deixa um registro, mesmo sem ticket.', 911, 949, 24, 650, C.green)
  })
}
function emailCard(x: number, y: number, scale = 1) {
  // A mesma ocorrência e o mesmo peso acompanham o registro e a notificação.
  group(1, x - 884 * scale, y - 280 * scale, scale, () => {
    shadow(() => rect(884, 280, 920, 612, '#fff', 10, C.line))
    rect(884, 280, 920, 6, C.blue, 0)
    icon('mail', 924, 316, 32)
    text('Notificação por e-mail', 975, 343, 31, 750)
    chip('Enviado', 1648, 313, C.green, '#E8F4ED', 118)
    line(924, 372, 1764, 372)
    text('Para', 924, 417, 22, 400, C.muted)
    text('Responsáveis pela operação', 1012, 417, 24, 600)
    text('Assunto', 924, 464, 22, 400, C.muted)
    text('Alerta de fraude · Passagem sem ticket', 1012, 464, 24, 700, C.red)
    line(924, 497, 1764, 497)
    owlBrand(926, 526, 46)
    lines(['Um veículo passou pela Balança 01', 'sem registrar o ticket de pesagem.'], 926, 641, 31, 46, 650)
    text(`Peso detectado: ${pesoDetectado}`, 926, 738, 29, 750, C.blue)
    text('A ocorrência foi registrada no relatório de auditoria.', 926, 779, 24, 400, C.muted)
    rect(926, 808, 836, 52, C.pale, 6)
    icon('document', 946, 821, 26)
    text('Ocorrência EVT-0042', 991, 843, 23, 650)
    text('11/10/2026  14:32:08', 1738, 842, 21, 500, C.muted, 'right')
  })
}
function email(t: number) {
  heading(['O alerta chega', 'a quem precisa agir.'], ['O OWL envia um e-mail', 'aos responsáveis pela operação.'], t, 19)
  const r = ease(phase(t, 19, 20.4))
  group(1, mix(866, 96, r), mix(276, 594, r), mix(1, .64, r), () => report(0, 0, 1))
  connector(714, 757, 856, phase(t, 20.2, 21.4))
  const e = out((t - 20.5) / 1)
  group(e, 0, (1 - e) * 35, 1, () => emailCard(884, 280))
  group(out((t - 22.1) / .8), 0, 0, 1, () => {
    icon('check', 897, 930, 25, C.green)
    text('Informação disponível. Responsáveis avisados.', 935, 949, 25, 650, C.green)
  })
}
function closing(t: number) {
  const p = out((t - 26) / 1)
  group(p, 0, 32 * (1 - p), 1, () => {
    const h = 119, w = h * owl.width / owl.height
    ctx.drawImage(owl, 960 - (w + 175) / 2, 222, w, h)
    text('OWL', 960 - (w + 175) / 2 + w + 28, 310, 85, 800)
    lines(['Passou sem registrar?', 'O OWL detecta.'], 960, 482, 88, 108, 750, C.ink, 'center')
    text('Auditoria registrada. Responsáveis avisados.', 960, 683, 32, 400, C.muted, 'center')
  })
  const labels: { x: number; title: string; detail: string; type: Icon; color: string }[] = [
    { x: 377, title: 'Detecta', detail: 'Passagem sem ticket', type: 'scan', color: C.blue },
    { x: 865, title: 'Registra', detail: 'Relatório de auditoria', type: 'document', color: C.blue },
    { x: 1353, title: 'Notifica', detail: 'E-mail aos responsáveis', type: 'mail', color: C.green },
  ]
  connector(615, 807, 827, phase(t, 27.4, 28.2))
  connector(1103, 807, 1315, phase(t, 28.2, 29))
  labels.forEach((item, i) => {
    group(out((t - 26.9 - i * .65) / .7), 0, 0, 1, () => {
      rect(item.x, 775, 64, 64, i === 2 ? '#E8F4ED' : '#E8EFF7', 10)
      icon(item.type, item.x + 17, 792, 30, item.color)
      text(item.title, item.x + 85, 818, 30, 750)
      text(item.detail, item.x, 885, 23, 400, C.muted)
    })
  })
  group(out((t - 29.4) / 1), 0, 0, 1, () => text('Mais controle em cada passagem.', 960, 958, 28, 650, C.blue, 'center'))
}

// A versão quadrada recompõe a hierarquia em 1080×1080, preservando o conteúdo.
function squareHeading(content: string[], sub: string[], t: number, start: number) {
  const e = out((t - start) / 1)
  group(e, 0, (1 - e) * 24, 1, () => {
    lines(content, 56, 188, 60, 73, 750)
    lines(sub, 58, 317, 24, 34, 400, C.muted)
  })
}
function squareAlert(y = 388, x = 56, width = 968) {
  shadow(() => rect(x, y, width, 194, '#fff', 10, '#E4D4D7'))
  rect(x, y + 10, 6, 174, C.red, 0)
  owlBrand(x + 24, y + 18, 38)
  chip('Alerta de fraude', x + 216, y + 17, C.red, '#F9ECEC', 219)
  text('agora', x + width - 30, y + 46, 19, 400, C.muted, 'right')
  text('Veículo passou pela balança sem registrar o ticket.', x + 24, y + 102, 29, 650)
  line(x + 24, y + 130, x + width - 26, y + 130)
  icon('scan', x + 24, y + 150, 21, C.muted)
  text('Balança 01', x + 57, y + 169, 20, 500, C.muted)
  text('Passagem sem ticket', x + width - 30, y + 169, 20, 650, C.red, 'right')
}
function openingSquare(t: number) {
  squareHeading(['Um veículo passa.', 'O ticket não.'], ['Uma passagem sem registro', 'não pode passar despercebida.'], t, 0)
  render3D(t)
  group(out((t - .2) / 1.2), 0, 0, 1, () => ctx.drawImage(renderer.domElement, -120, 385, 1320, 739))
  group(out((t - 1) / .8), 0, 0, 1, () => {
    rect(0, 866, 1080, 138, '#fff', 0)
    line(56, 868, 1024, 868)
    text('Peso na balança', 56, 906, 21, 500, C.muted)
    text(`${weightAt(t).toLocaleString('pt-BR')} kg`, 56, 961, 47, 700, C.blue)
    line(650, 895, 650, 969)
    text('Tickets emitidos', 698, 906, 21, 500, C.muted)
    text('0', 1024, 961, 47, 750, t > 8.8 ? C.red : C.ink, 'right')
  })
  const a = out((t - 9) / .7)
  group(a, 0, (1 - a) * -24, 1, () => squareAlert())
}
function auditSquare(t: number) {
  squareHeading(['O OWL detecta.', 'E registra o evento.'], ['A passagem fica no relatório de auditoria.'], t, 12)
  const steps: { x: number; label: string; detail: string; start: number; type: Icon; color: string }[] = [
    { x: 56, label: 'Passagem detectada', detail: 'O veículo cruza a balança.', start: 12.7, type: 'scan', color: C.blue },
    { x: 387, label: 'Ticket ausente', detail: 'Nenhuma pesagem registrada.', start: 13.6, type: 'alert', color: C.red },
    { x: 718, label: 'Evento registrado', detail: 'Histórico para conferência.', start: 14.6, type: 'document', color: C.blue },
  ]
  steps.forEach(step => {
    const e = out((t - step.start) / .65)
    group(e, 0, (1 - e) * 16, 1, () => {
      rect(step.x, 361, 42, 42, step.color === C.red ? '#F9ECEC' : '#E8EFF7', 7)
      icon(step.type, step.x + 10, 371, 22, step.color)
      text(step.label, step.x + 56, 389, 22, 700)
      text(step.detail, step.x, 431, 19, 400, C.muted)
    })
  })
  const e = out((t - 12.5) / 1)
  group(e, 0, (1 - e) * 30, 1, () => report(117, 454, phase(t, 14.9, 15.9), .9))
}
function emailSquare(t: number) {
  squareHeading(['O alerta chega', 'a quem precisa agir.'], ['O OWL envia um e-mail aos responsáveis.'], t, 19)
  const r = ease(phase(t, 19, 20.4))
  group(1 - ease(phase(t, 20.2, 20.8)), mix(117, 80, r), mix(454, 410, r), mix(.9, .4, r), () => report(0, 0, 1))
  const e = out((t - 20.5) / 1)
  group(e, 0, (1 - e) * 35, 1, () => emailCard(80, 377))
}
function closingSquare(t: number) {
  const p = out((t - 26) / 1)
  group(p, 0, 30 * (1 - p), 1, () => {
    const h = 92, w = h * owl.width / owl.height, x = 540 - (w + 164) / 2
    ctx.drawImage(owl, x, 169, w, h)
    text('OWL', x + w + 24, 239, 66, 800)
    lines(['Passou sem registrar?', 'O OWL detecta.'], 540, 391, 64, 83, 750, C.ink, 'center')
    lines(['Auditoria registrada.', 'Responsáveis avisados.'], 540, 559, 27, 38, 400, C.muted, 'center')
  })
  const labels: { center: number; title: string; detail: string[]; type: Icon; color: string }[] = [
    { center: 200, title: 'Detecta', detail: ['Passagem', 'sem ticket'], type: 'scan', color: C.blue },
    { center: 540, title: 'Registra', detail: ['Relatório', 'de auditoria'], type: 'document', color: C.blue },
    { center: 880, title: 'Notifica', detail: ['E-mail aos', 'responsáveis'], type: 'mail', color: C.green },
  ]
  connector(250, 722, 486, phase(t, 27.4, 28.2))
  connector(590, 722, 826, phase(t, 28.2, 29))
  labels.forEach((item, i) => {
    group(out((t - 26.9 - i * .65) / .7), 0, 0, 1, () => {
      rect(item.center - 32, 690, 64, 64, i === 2 ? '#E8F4ED' : '#E8EFF7', 10)
      icon(item.type, item.center - 15, 707, 30, item.color)
      text(item.title, item.center, 809, 32, 750, C.ink, 'center')
      lines(item.detail, item.center, 852, 23, 31, 400, C.muted, 'center')
    })
  })
  group(out((t - 29.4) / 1), 0, 0, 1, () => text('Mais controle em cada passagem.', 540, 965, 26, 650, C.blue, 'center'))
}

// Composição para Instagram: arte e textos se reorganizam, sem cortar a versão 1:1.
// No 9:16, a leitura principal fica afastada do topo, da legenda e da coluna de ações.
function socialHeading(content: string[], sub: string[], t: number, start: number) {
  const y = reels ? 440 : 234, e = out((t - start) / 1)
  group(e, 0, (1 - e) * 24, 1, () => {
    lines(content, 80, y, 64, 78, 750)
    lines(sub, 80, y + 150, 38, 49, 400, C.muted)
  })
}
function socialAlert(y = reels ? 668 : 476) {
  const x = 80
  shadow(() => rect(x, y, socialWidth, 300, '#fff', 10, '#E4D4D7'))
  rect(x, y + 10, 7, 280, C.red, 0)
  owlBrand(x + 32, y + 24, 54)
  text('Alerta de fraude', x + 222, y + 65, 42, 750, C.red)
  lines(['Veículo passou pela balança', 'sem registrar o ticket.'], x + 32, y + 145, 42, 56, 650)
  line(x + 32, y + 230, x + socialWidth - 32, y + 230)
  icon('scan', x + 32, y + 252, 32, C.muted)
  text('Balança 01', x + 82, y + 279, 36, 500, C.muted)
}
function openingSocial(t: number) {
  socialHeading(['Um veículo passa.', 'O ticket não.'], ['Uma passagem sem registro', 'não pode passar despercebida.'], t, 0)
  render3D(t)
  const stageX = socialCenter - 660
  group(out((t - .2) / 1.2), 0, 0, 1, () => ctx.drawImage(renderer.domElement, stageX, reels ? 706 : 470, 1320, 739))
  const y = reels ? 1248 : 1045
  group(out((t - 1) / .8), 0, 0, 1, () => {
    rect(0, y, WIDTH, 142, '#fff', 0)
    line(80, y, socialRight, y)
    text('Peso na balança', 80, y + 42, 36, 500, C.muted)
    text(`${weightAt(t).toLocaleString('pt-BR')} kg`, 80, y + 115, 64, 750, C.blue)
    line(600, y + 24, 600, y + 111)
    text('Tickets emitidos', socialRight, y + 42, 36, 500, C.muted, 'right')
    text('0', socialRight, y + 115, 64, 750, t > 8.8 ? C.red : C.ink, 'right')
  })
  const a = out((t - 9) / .7)
  group(a, 0, (1 - a) * -24, 1, () => socialAlert())
}
// Documentos próprios para celular: os dados essenciais ficam grandes, em uma coluna.
function socialDocument(type: 'report' | 'email', p = 1) {
  const x = 80, y = reels ? 710 : 495, w = socialWidth, left = x + 36, right = x + w - 36
  shadow(() => rect(x, y, w, 700, '#fff', 10, C.line))
  rect(x, y, w, 6, C.blue, 0)
  icon(type === 'report' ? 'document' : 'mail', left, y + 34, 40)
  text(type === 'report' ? 'Relatório de auditoria' : 'Notificação por e-mail', left + 60, y + 69, 42, 750)
  line(left, y + 104, right, y + 104)
  if (type === 'report') {
    group(out(p), 0, (1 - out(p)) * 20, 1, () => {
      rect(x + 30, y + 134, w - 60, 156, '#F9ECEC', 6)
      icon('alert', x + 52, y + 162, 38, C.red)
      lines(['Passagem sem ticket', 'de pesagem'], x + 108, y + 185, 42, 56, 750, C.red)
      text('Peso detectado', left, y + 351, 38, 500, C.muted)
      text(pesoDetectado, left, y + 432, 78, 750, C.blue)
      text('Balança 01 · 14:32:08', left, y + 490, 36, 500, C.muted)
      line(left, y + 520, right, y + 520)
      text('Ticket', left, y + 572, 38, 500, C.muted)
      text('Não emitido', right, y + 572, 42, 700, C.red, 'right')
      line(left, y + 600, right, y + 600)
      icon('check', left, y + 636, 38, C.green)
      text('Registrado na auditoria', left + 58, y + 669, 40, 650, C.green)
    })
  } else {
    text('Para', left, y + 158, 36, 500, C.muted)
    text('Responsáveis pela operação', left, y + 214, 42, 650)
    line(left, y + 247, right, y + 247)
    text('Alerta de fraude', left, y + 310, 46, 750, C.red)
    lines(['Passagem pela Balança 01', 'sem registrar o ticket.'], left, y + 384, 40, 55, 650)
    text('Peso detectado', left, y + 510, 38, 500, C.muted)
    text(pesoDetectado, left, y + 590, 72, 750, C.blue)
    line(left, y + 620, right, y + 620)
    icon('check', left, y + 648, 38, C.green)
    text('E-mail enviado', left + 58, y + 681, 42, 650, C.green)
  }
}
function auditSocial(t: number) {
  socialHeading(['O OWL detecta.', 'E registra o evento.'], ['A passagem fica registrada', 'no relatório de auditoria.'], t, 12)
  const e = out((t - 12.5) / 1)
  group(e, 0, (1 - e) * 30, 1, () => socialDocument('report', phase(t, 13.4, 14.5)))
}
function emailSocial(t: number) {
  socialHeading(['O alerta chega', 'a quem precisa agir.'], ['O OWL envia um e-mail', 'aos responsáveis.'], t, 19)
  const r = ease(phase(t, 19, 20.4))
  // O documento sai lateralmente; os textos mantêm seu tamanho durante a transição.
  group(1 - r, -180 * r, 0, 1, () => socialDocument('report'))
  const e = out((t - 20.1) / .9)
  group(e, 60 * (1 - e), 0, 1, () => socialDocument('email'))
}
function closingSocial(t: number) {
  const p = out((t - 26) / 1), logoY = reels ? 440 : 205
  group(p, 0, 30 * (1 - p), 1, () => {
    const h = 102, w = h * owl.width / owl.height, x = socialCenter - (w + 164) / 2
    ctx.drawImage(owl, x, logoY, w, h)
    text('OWL', x + w + 24, logoY + 78, 73, 800)
    lines(['Passou sem registrar?', 'O OWL detecta.'], socialCenter, reels ? 700 : 473, 64, 83, 750, C.ink, 'center')
    lines(['Auditoria registrada.', 'Responsáveis avisados.'], socialCenter, reels ? 876 : 668, 38, 49, 400, C.muted, 'center')
  })
  const centers = [.15, .5, .85].map(value => 80 + socialWidth * value), y = reels ? 1010 : 840
  const labels: { title: string; detail: string[]; type: Icon; color: string }[] = [
    { title: 'Detecta', detail: ['Passagem', 'sem ticket'], type: 'scan', color: C.blue },
    { title: 'Registra', detail: ['Relatório', 'de auditoria'], type: 'document', color: C.blue },
    { title: 'Notifica', detail: ['E-mail aos', 'responsáveis'], type: 'mail', color: C.green },
  ]
  connector(centers[0] + 50, y + 32, centers[1] - 54, phase(t, 27.4, 28.2))
  connector(centers[1] + 50, y + 32, centers[2] - 54, phase(t, 28.2, 29))
  labels.forEach((item, i) => {
    const center = centers[i]
    group(out((t - 26.9 - i * .65) / .7), 0, 0, 1, () => {
      rect(center - 32, y, 64, 64, i === 2 ? '#E8F4ED' : '#E8EFF7', 10)
      icon(item.type, center - 15, y + 17, 30, item.color)
      text(item.title, center, y + 119, 42, 750, C.ink, 'center')
      lines(item.detail, center, y + 172, 36, 46, 400, C.muted, 'center')
    })
  })
  group(out((t - 29.4) / 1), 0, 0, 1, () => text('Mais controle em cada passagem.', socialCenter, reels ? 1350 : 1194, 36, 650, C.blue, 'center'))
}

function content(t: number) {
  if (social) {
    if (t < 12) openingSocial(t)
    else if (t < 19) auditSocial(t)
    else if (t < 26) emailSocial(t)
    else closingSocial(t)
    return
  }
  if (square) {
    if (t < 12) openingSquare(t)
    else if (t < 19) auditSquare(t)
    else if (t < 26) emailSquare(t)
    else closingSquare(t)
    return
  }
  if (t < 12) opening(t)
  else if (t < 19) audit(t)
  else if (t < 26) email(t)
  else closing(t)
}
function render(t: number) {
  t = Math.max(0, Math.min(DURATION, t))
  ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, WIDTH, HEIGHT)
  // Transições curtas em branco mantêm continuidade e dão tempo para ler cada cena.
  const cut = [12, 26].find(value => Math.abs(t - value) < .34)
  const alpha = cut === undefined ? 1 : ease(Math.abs(t - cut) / .34)
  group(alpha, 0, 0, 1, () => content(t))
  header(t); footer()
  return t
}
let playing = false, current = 0, started = 0, raf = 0
const play = document.querySelector<HTMLButtonElement>('#play')!
const seek = document.querySelector<HTMLInputElement>('#seek')!
function tick(now: number) {
  current = Math.min(DURATION, (now - started) / 1000)
  render(current); seek.value = String(current)
  document.querySelector('#time')!.textContent = `0:${String(Math.floor(current)).padStart(2, '0')} / 0:34`
  if (current < DURATION && playing) raf = requestAnimationFrame(tick)
  else { playing = false; play.textContent = 'Reproduzir' }
}
function stop() { playing = false; cancelAnimationFrame(raf); play.textContent = 'Reproduzir' }
play.onclick = () => {
  if (playing) { stop(); return }
  if (current >= DURATION) current = 0
  playing = true; play.textContent = 'Pausar'; started = performance.now() - current * 1000; raf = requestAnimationFrame(tick)
}
seek.oninput = () => { stop(); current = Number(seek.value); render(current) }
document.querySelector<HTMLButtonElement>('#restart')!.onclick = () => { stop(); current = 0; seek.value = '0'; render(0) }
const format = document.querySelector<HTMLSelectElement>('#format')!
format.value = formatName
format.onchange = () => {
  const url = new URL(location.href)
  url.searchParams.set('format', format.value)
  location.assign(url.href)
}
document.body.classList.toggle('render', new URLSearchParams(location.search).has('render'))
window.owlMotion = {
  ready: true, duration: DURATION, render,
  frame: t => { render(t); return canvas.toDataURL('image/png') },
  poster: () => {
    render(5.1)
    if (social) {
      // A capa dá lugar ao alerta sem sobrepor a cabine ou diminuir sua tipografia.
      rect(0, reels ? 548 : 342, WIDTH, 140, '#fff', 0)
      socialAlert(reels ? 580 : 370)
    } else if (square) squareAlert()
    else alertCard(1010, 227)
    return canvas.toDataURL('image/png')
  },
  inspect: () => ({ truck: new THREE.Box3().setFromObject(truck).min.toArray(), truckMax: new THREE.Box3().setFromObject(truck).max.toArray(), wheels: wheels.length, models: modelFiles, pesoDetectado: PESO_DETECTADO, format: formatName, width: WIDTH, height: HEIGHT, palette: C }),
}
render(0)
}

void iniciarMotion().catch(error => {
  console.error(error)
  document.body.textContent = 'Não foi possível carregar o motion OWL.'
})
