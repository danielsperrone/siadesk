// Reproducible, offline GLB authoring. Reuses the current tractor, chassis,
// materials and articulated wheels; the standard vehicle is never overwritten.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO, getBounds } from '@gltf-transform/core'
import { prune, compactPrimitive } from '@gltf-transform/functions'
import * as T from 'three'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const root = fileURLToPath(new URL('../', import.meta.url))
const io = new NodeIO()
const doc = await io.read(path.join(root, 'public/models/veiculo.glb'))
const scene = doc.getRoot().getDefaultScene()
const before = getBounds(scene)
const buffer = doc.getRoot().listBuffers()[0]
const body = doc.getRoot().listNodes().find(n => n.getName() === 'Mesh10')
const matrix = new T.Matrix4().fromArray(body.getWorldMatrix())
const point = new T.Vector3()
let removedTriangles = 0

// Remove the van above its deck, retaining every cabin/chassis/wheel triangle.
for (const primitive of body.getMesh().listPrimitives()) {
  const pos = primitive.getAttribute('POSITION')
  const ids = primitive.getIndices()?.getArray() ?? Uint32Array.from({ length: pos.getCount() }, (_, i) => i)
  const keep = []
  for (let i = 0; i < ids.length; i += 3) {
    const vertices = [...ids.slice(i, i + 3)].map(id => point.fromArray(pos.getArray(), id * 3).applyMatrix4(matrix).clone())
    // Side triangles span from the floor to the roof; testing every vertex's
    // height would leave those large van panels hiding the new corrugations.
    const oldFront = vertices.every(v => Math.abs(v.x + 4.573599609375) < .002)
    const van = vertices.some(v => v.y > 1.03) && (vertices.some(v => v.x > -4.4) || oldFront)
    if (van) removedTriangles++
    else keep.push(...ids.slice(i, i + 3))
  }
  if (!keep.length) {
    body.getMesh().removePrimitive(primitive)
    primitive.dispose()
  } else {
    primitive.setIndices(doc.createAccessor().setType('SCALAR').setBuffer(buffer).setArray(new Uint32Array(keep)))
    compactPrimitive(primitive)
  }
}
// Retain the exact approved logo outlines for the new container's livery.
const logos = doc.getRoot().listNodes().filter(n => n.getName().startsWith('SIAMAC ') && n.getMesh())
for (const node of logos) scene.removeChild(node)

const scale = .86 // Uniform 40 ft standard miniature, within the incumbent vehicle envelope.
const L = 12.192 * scale, W = 2.438 * scale, H = 2.591 * scale
const x0 = 6.73 - L, x1 = 6.73, y0 = .96, y1 = y0 + H, z0 = -W / 2, z1 = W / 2
const cx = (x0 + x1) / 2
const container = doc.createNode('container-siamac').setExtras({
  containerType: '40-foot-standard', isoSizeType: '42G1',
  nominalDimensionsMetres: [12.192, 2.591, 2.438], displayScale: scale,
  markingReference: 'https://www.bic-code.org/marking-of-containers/',
  illustrativeIdentity: true,
})
scene.addChild(container)
const groups = new Map()
function material(name, hex, metal = 0, rough = .65) {
  const c = new T.Color(hex)
  return doc.createMaterial(name).setBaseColorFactor([c.r, c.g, c.b, 1]).setMetallicFactor(metal).setRoughnessFactor(rough)
}
const paint = material('Contêiner / aço pintado cinza claro', '#d9e2e0', .18, .63)
const frame = material('Contêiner / estrutura e nervuras', '#aabbbb', .3, .53)
const steel = material('Contêiner / aço galvanizado', '#afb8b9', .72, .3)
const dark = material('Contêiner / borracha e fixações', '#253336', .1, .8)
const ink = material('Contêiner / estêncil grafite', '#172f3a')
const white = material('Contêiner / identificação branca', '#f7f8f2')
const yellow = material('Contêiner / aviso amarelo', '#eec84e')
const red = material('Contêiner / refletores vermelhos', '#b73930', .1, .4)
const font = new FontLoader().parse(JSON.parse(fs.readFileSync(path.join(root, 'node_modules/three/examples/fonts/helvetiker_bold.typeface.json'), 'utf8')))
function add(geometry, mat, name) {
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals()
  const g = geometry.index ? geometry.toNonIndexed() : geometry
  g.deleteAttribute('uv')
  if (!groups.has(mat)) groups.set(mat, [])
  groups.get(mat).push(g)
  return name
}
function box(name, position, dimensions, mat = frame, rotation) {
  const g = new T.BoxGeometry(...dimensions)
  if (rotation) g.applyMatrix4(new T.Matrix4().makeRotationFromEuler(new T.Euler(...rotation)))
  g.translate(...position)
  add(g, mat, name)
}
function rod(name, from, to, radius = .012, mat = steel) {
  const a = new T.Vector3(...from), b = new T.Vector3(...to), d = b.clone().sub(a)
  const g = new T.CylinderGeometry(radius, radius, d.length(), 12)
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), d.normalize()))
  g.translate(...a.add(b).multiplyScalar(.5).toArray())
  add(g, mat, name)
}
function text(name, value, origin, size, maxWidth, face = 'side+', mat = ink, align = 'left') {
  // Stencils are filled flat glyphs. ShapeGeometry avoids unnecessary extrusion
  // walls and preserves the front caps even in Three versions with bevel issues.
  const g = new T.ShapeGeometry(font.generateShapes(value, size), 4)
  g.computeBoundingBox()
  const width = g.boundingBox.max.x - g.boundingBox.min.x
  g.translate(-g.boundingBox.min.x, 0, 0)
  if (width > maxWidth) g.scale(maxWidth / width, 1, 1)
  if (align === 'right') g.translate(-Math.min(width, maxWidth), 0, 0)
  const rotation = { 'side+': 0, 'side-': Math.PI, rear: Math.PI / 2, front: -Math.PI / 2, roof: -Math.PI / 2 }
  if (face === 'roof') g.rotateX(rotation.roof)
  else g.rotateY(rotation[face])
  g.translate(...origin)
  const p = doc.createPrimitive().setMaterial(mat)
  for (const [name, semantic] of [['position', 'POSITION'], ['normal', 'NORMAL']]) p.setAttribute(semantic,
    doc.createAccessor().setType('VEC3').setBuffer(buffer).setArray(new Float32Array(g.getAttribute(name).array)))
  if (g.index) p.setIndices(doc.createAccessor().setType('SCALAR').setBuffer(buffer).setArray(new Uint32Array(g.index.array)))
  container.addChild(doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p)).setExtras({ markingText: value, face }))
}

// Corrugated sheet profile has flat ridges, sloped webs and recessed valleys.
const pitch = .278 * scale, amplitude = .027
function depthAt(x) {
  const f = ((x - x0) / pitch % 1 + 1) % 1
  return f < .18 ? 0 : f < .36 ? amplitude * (f - .18) / .18 : f < .68 ? amplitude : f < .86 ? amplitude * (1 - (f - .68) / .18) : 0
}
for (const sign of [-1, 1]) {
  const positions = []
  const xs = [x0 + .08]
  for (let i = 0; i < L / pitch; i++) for (const f of [0, .18, .36, .68, .86, 1]) {
    const x = x0 + (i + f) * pitch
    if (x > x0 + .08 && x < x1 - .08 && x > xs.at(-1) + .00001) xs.push(x)
  }
  xs.push(x1 - .08)
  for (let i = 0; i < xs.length - 1; i++) {
    const a = xs[i], b = xs[i + 1]
    const za = sign * (W / 2 - .045 + depthAt(a)), zb = sign * (W / 2 - .045 + depthAt(b))
    const verts = [[a, y0 + .09, za], [b, y0 + .09, zb], [b, y1 - .08, zb], [a, y1 - .08, za]]
    for (const index of (sign > 0 ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2])) positions.push(...verts[index])
  }
  const g = new T.BufferGeometry().setAttribute('position', new T.Float32BufferAttribute(positions, 3))
  add(g, paint, 'Chapa lateral trapezoidal')
  for (const y of [y0 + .045, y1 - .04]) box('Longarina lateral', [cx, y, sign * (W / 2 - .035)], [L - .16, .085, .075])
  // Flush, dark stencilling at the top right as viewed from each side.
  const tx = sign > 0 ? x1 - 2.2 : x0 + 2.2
  const face = sign > 0 ? 'side+' : 'side-'
  const z = sign * (W / 2 - .010)
  text(`identificacao-lateral-${sign}`, 'SIAU 634601 2', [tx, y1 - .27, z], .122, 1.88, face)
  text(`tipo-lateral-${sign}`, '42G1', [tx, y1 - .43, z], .103, .55, face)
  for (const xx of [x0 + .45, x1 - .45]) {
    box('Respiro com tela', [xx, y1 - .22, sign * (W / 2 - .009)], [.18, .10, .014], frame)
    for (let i = 0; i < 4; i++) box('Lâmina do respiro', [xx, y1 - .253 + i * .021, sign * (W / 2 + .001)], [.14, .007, .008], dark)
  }
  // Approved SIAMAC logo, reprojected onto the corrugated metal (including its
  // red, green and blue bars). Keep letter outlines instead of substituting a font.
  const sourceNodes = logos.filter(n => n.getName().includes(sign > 0 ? 'direita' : 'esquerda'))
  const oldBounds = sourceNodes.map(n => getBounds(n))
  const oldMin = Math.min(...oldBounds.map(b => b.min[0])), oldMax = Math.max(...oldBounds.map(b => b.max[0]))
  const oldCenter = (oldMin + oldMax) / 2, logoScale = 4.1 / (oldMax - oldMin)
  for (const original of sourceNodes) {
    const node = doc.createNode(`Container ${original.getName()}`)
    const mesh = original.getMesh().clone()
    node.setMesh(mesh).setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1])
    for (const primitive of [...mesh.listPrimitives()]) {
      const p = primitive.clone()
      const sourcePos = primitive.getAttribute('POSITION').getArray()
      const values = new Float32Array(sourcePos.length)
      for (let i = 0; i < values.length; i += 3) {
        const x = cx - .35 + (sourcePos[i] - oldCenter) * logoScale
        values[i] = x
        values[i + 1] = y0 + 1.08 + (sourcePos[i + 1] - 2.06) * logoScale
        // A paint layer at the ridge height avoids z fighting at grazing views.
        const oldBase = sign > 0 ? 1.0620415210723877 : -1.0373584032058716
        values[i + 2] = sign * (W / 2 - .045 + amplitude + .002) + (sourcePos[i + 2] - oldBase) * .5
      }
      p.setAttribute('POSITION', doc.createAccessor().setType('VEC3').setBuffer(buffer).setArray(values))
      mesh.removePrimitive(primitive).addPrimitive(p)
    }
    container.addChild(node)
  }
  for (let i = 0; i < 11; i++) box('Faixa refletiva do chassi', [x0 + .3 + i * (L - .6) / 10, y0 - .035, sign * (W / 2 + .005)], [.29, .042, .008], i % 2 ? red : white)
}

// Ribbed steel roof and structural floor, independent of the old box.
box('Piso de aço', [cx, y0 + .035, 0], [L - .10, .07, W - .10], dark)
box('Teto estanque', [cx, y1 - .035, 0], [L - .12, .025, W - .12], paint)
for (let x = x0 + .18; x < x1 - .15; x += pitch) box('Nervura do teto', [x, y1 - .016, 0], [.065, .017, W - .18], paint)
for (const x of [x0 + .045, x1 - .045]) {
  for (const z of [z0 + .045, z1 - .045]) {
    box('Coluna de canto', [x, (y0 + y1) / 2, z], [.09, H - .13, .09])
    for (const y of [y0 + .05, y1 - .05]) {
      box('Corner casting ISO 1161', [x, y, z], [.15, .10, .13], steel)
      box('Abertura do corner casting', [x, y + .0508, z], [.066, .0015, .042], dark)
      box('Abertura lateral do casting', [x, y, Math.sign(z) * (W / 2 + .021)], [.07, .038, .0015], dark)
    }
  }
  for (const y of [y0 + .045, y1 - .04]) box('Travessa de extremidade', [x, y, 0], [.10, .085, W - .18])
}

// Blind/front end with closely spaced corrugations.
box('Parede frontal', [x0 + .038, (y0 + y1) / 2, 0], [.025, H - .16, W - .17], paint)
for (let z = z0 + .15; z < z1 - .10; z += .19) box('Nervura frontal', [x0 + .013, (y0 + y1) / 2, z], [.038, H - .2, .058], paint)
text('identificacao-frente', 'SIAU 634601 2', [x0 - .009, y1 - .27, -.88], .115, 1.75, 'front')
text('tipo-frente', '42G1', [x0 - .009, y1 - .43, -.88], .10, .55, 'front')
text('identificacao-teto', 'SIAU 634601 2', [x1 - 3.1, y1 + .001, .32], .22, 2.65, 'roof')
text('tipo-teto', '42G1', [x1 - 3.1, y1 + .001, .68], .17, .9, 'roof')

// Double rear doors: perimeter gaskets, hinges, four lock rods and cam keepers.
// The continuous inner face and overlapping centre seal close the door join;
// only the narrow rubber seam remains visible, never a view through the box.
box('Contraface estanque das portas', [x1 - .015, (y0 + y1) / 2, 0], [.035, H - .15, W - .12], dark)
box('Vedação central sobreposta', [x1 + .016, (y0 + y1) / 2, 0], [.010, H - .15, .020], dark)
for (const sign of [-1, 1]) {
  const z = sign * W / 4
  box('Vedação de borracha da porta', [x1 - .022, (y0 + y1) / 2, z], [.035, H - .135, W / 2 - .006], dark)
  box('Folha da porta', [x1 + .001, (y0 + y1) / 2, z], [.025, H - .15, W / 2 - .014], paint)
  for (const y of [y0 + .12, y0 + .63, y1 - .53]) box('Reforço horizontal da porta', [x1 + .018, y, z], [.025, .043, W / 2 - .14], frame)
  for (const y of [y0 + .28, y0 + .89, y1 - .28]) {
    box('Dobradiça de porta', [x1 + .045, y, sign * (W / 2 - .09)], [.043, .08, .19], steel)
    rod('Pino da dobradiça', [x1 + .066, y - .055, sign * (W / 2 - .13)], [x1 + .066, y + .055, sign * (W / 2 - .13)], .018)
  }
}
// Leave a clear painted field between each pair of rods, including guides and
// hinges; the markings stay on the door skin, behind correctly placed hardware.
for (const z of [-.93, -.12, .12, .93]) {
  rod('Barra vertical de travamento', [x1 + .054, y0 + .13, z], [x1 + .054, y1 - .13, z], .014)
  for (const y of [y0 + .16, y0 + .72, y1 - .56, y1 - .16]) {
    box('Guia e came da barra', [x1 + .048, y, z], [.06, .045, .075], steel)
    rod('Parafuso da guia', [x1 + .079, y, z - .024], [x1 + .083, y, z - .024], .008, dark)
  }
  const handleZ = z + (z < 0 ? .17 : -.17)
  rod('Alavanca de abertura', [x1 + .075, y0 + .64, z], [x1 + .075, y0 + .64, handleZ], .012)
  box('Trava com lacre', [x1 + .067, y0 + .64, handleZ], [.045, .08, .055], dark)
}
// Right-hand door identification and weights (as seen from behind).
const rearX = x1 + .027
text('identificacao-portas', 'SIAU 634601 2', [rearX, y1 - .27, -.19], .09, .63, 'rear')
text('tipo-portas', '42G1', [rearX, y1 - .43, -.19], .085, .55, 'rear')
for (const [index, [label, value]] of [
  ['MAX. GROSS', '30,480 KG'], ['', '67,200 LB'],
  ['TARE', '3,750 KG'], ['', '8,270 LB'],
  ['NET', '26,730 KG'], ['', '58,930 LB'],
  ['CU. CAP.', '67.7 CU.M'], ['', '2,390 CU.FT'],
].entries()) {
  const y = y1 - .78 - index * .102
  if (label) text(`pesos-portas-${index}-label`, label, [rearX, y, -.19], .042, .30, 'rear')
  text(`pesos-portas-${index}`, value, [rearX, y, -.83], .042, .32, 'rear', ink, 'right')
}
text('logo-porta', 'SIAMAC', [rearX, y0 + 1.14, .83], .105, .63, 'rear')
// CSC plate is on the lower left door, the inspection disc immediately above.
box('Placa combinada CSC', [x1 + .032, y0 + .31, .525], [.008, .25, .62], steel)
for (const [i, value] of ['CSC SAFETY APPROVAL', 'TYPE 40 STANDARD / 42G1', 'MAX GROSS 30,480 KG', 'STACKING 192,000 KG', 'RACKING 150 KN', 'SIAMAC / DEMONSTRACAO'].entries())
  text(`placa-csc-${i}`, value, [x1 + .038, y0 + .397 - i * .033, .81], .019, .57, 'rear', ink)
text('aviso-porta', 'CAUTION', [rearX, y0 + .88, .83], .065, .63, 'rear')
text('aviso-porta-inferior', 'DOOR OPENING', [rearX, y0 + .77, .83], .046, .63, 'rear')
// Small yellow inspection label. This is a standard 8 ft 6 in box: no false
// high-cube height/electricity warnings (no ladder) are added.
box('Selo de inspeção', [x1 + .033, y0 + .50, .525], [.009, .085, .16], yellow)
text('selo-inspecao', 'ACEP', [x1 + .039, y0 + .48, .595], .03, .14, 'rear')
for (const x of [x0 + .11, x1 - .11]) for (const z of [z0 + .05, z1 - .05]) {
  box('Apoio twist-lock no chassi', [x, y0 - .045, z], [.18, .09, .16], dark)
  rod('Pino twist-lock', [x, y0 - .02, z], [x, y0 + .045, z], .026, steel)
}

// Batch small fittings and sheet panels by material to keep the live renderer light.
for (const [mat, geometries] of groups) {
  const g = mergeGeometries(geometries)
  const p = doc.createPrimitive().setMaterial(mat)
  for (const [name, semantic] of [['position', 'POSITION'], ['normal', 'NORMAL']]) p.setAttribute(semantic,
    doc.createAccessor().setType('VEC3').setBuffer(buffer).setArray(new Float32Array(g.getAttribute(name).array)))
  container.addChild(doc.createNode(mat.getName()).setMesh(doc.createMesh(mat.getName()).addPrimitive(p)))
}
await doc.transform(prune())
const after = getBounds(scene)
const wheelCount = doc.getRoot().listNodes().filter(n => n.getExtras().wheelRadius).length
if (wheelCount !== 10 || removedTriangles < 100) throw new Error('Incomplete vehicle conversion')
if (after.max[1] > before.max[1] + .005 || after.min[0] < before.min[0] - .005 || after.max[0] > before.max[0] + .005) throw new Error('Vehicle envelope changed')
const output = path.join(root, 'public/models/veiculo-container.glb')
await io.write(output, doc)
const report = { source: 'public/models/veiculo.glb', output: 'public/models/veiculo-container.glb', before, after,
  wheels: wheelCount, removedTriangles, container: { length: L, width: W, height: H, uniformScale: scale, isoType: '42G1', identification: 'SIAU 634601 2', illustrative: true },
  bytes: fs.statSync(output).size, markingsReference: 'https://www.bic-code.org/marking-of-containers/' }
fs.mkdirSync(path.join(root, 'reports/container-truck'), { recursive: true })
fs.writeFileSync(path.join(root, 'reports/container-truck/model.json'), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
