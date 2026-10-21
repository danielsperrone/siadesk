// Separate complete connected wheel surfaces from the SketchUp body, preserving
// every triangle, material and vertex attribute. Run after replacing veiculo.glb.
import { NodeIO } from '@gltf-transform/core'
import { fileURLToPath } from 'node:url'

const file = fileURLToPath(new URL('../../public/models/veiculo.glb', import.meta.url))
const io = new NodeIO()
const doc = await io.read(file)
if (doc.getRoot().listNodes().some(n => n.getExtras().wheelRadius)) {
  console.log('Vehicle wheels already articulated.')
  process.exit(0)
}
const body = doc.getRoot().listNodes().find(n => n.getName() === 'Mesh10')
if (!body?.getMesh()) throw new Error('Expected SketchUp vehicle Mesh10')
// Measured wheel centres and lateral extents in the source mesh (millimetres).
const wheels = [
  [11089.4585, 1352.7157, 1810, 2089, 378],
  [11089.4585, 1352.7157, 3479, 3757, 378],
  [13891.5, 1343.825, 1859, 2337, 378],
  [13906.19, 1349.625, 3220, 3698, 378],
  ...[19625.72, 20670.72, 21705.72].flatMap(x => [
    [x, 1325.13, 1892, 2129, 425],
    [x, 1325.13, 3508, 3745, 425],
  ]),
].map(([x, y, zMin, zMax, radius], i) => {
  const center = [x, y, (zMin + zMax) / 2]
  const mesh = doc.createMesh(`roda-${i + 1}`)
  const node = doc.createNode(`roda-${i + 1}`).setTranslation(center)
    .setMesh(mesh).setExtras({ wheelRadius: radius / 1000 })
  body.addChild(node)
  return { center, zMin, zMax, radius, mesh, triangles: 0 }
})
let before = 0, after = 0
for (const primitive of [...body.getMesh().listPrimitives()]) {
  const pos = primitive.getAttribute('POSITION')
  const indices = primitive.getIndices()?.getArray() ?? Uint32Array.from({ length: pos.getCount() }, (_, i) => i)
  const count = indices.length / 3
  before += count
  const parents = Array.from({ length: count }, (_, i) => i)
  const find = i => {
    while (parents[i] !== i) { parents[i] = parents[parents[i]]; i = parents[i] }
    return i
  }
  const seen = new Map(), point = []
  for (let t = 0; t < count; t++) for (let v = 0; v < 3; v++) {
    pos.getElement(indices[t * 3 + v], point)
    const key = point.map(n => Math.round(n * 100)).join(',')
    if (seen.has(key)) parents[find(t)] = find(seen.get(key))
    else seen.set(key, t)
  }
  const components = new Map()
  for (let t = 0; t < count; t++) {
    const root = find(t)
    if (!components.has(root)) components.set(root, [])
    components.get(root).push(...indices.slice(t * 3, t * 3 + 3))
  }
  const buckets = Array.from({ length: wheels.length + 1 }, () => [])
  for (const component of components.values()) {
    const vertices = [...new Set(component)]
    const wheel = wheels.findIndex(w => vertices.every(index => {
      pos.getElement(index, point)
      return point[2] >= w.zMin && point[2] <= w.zMax &&
        Math.hypot(point[0] - w.center[0], point[1] - w.center[1]) <= w.radius + 2
    }))
    for (const index of component) buckets[wheel + 1].push(index)
  }
  buckets.forEach((bucket, i) => {
    if (!bucket.length) return
    const wheel = wheels[i - 1]
    const remap = new Map(), originalIds = []
    const newIndices = bucket.map(id => {
      if (!remap.has(id)) { remap.set(id, originalIds.length); originalIds.push(id) }
      return remap.get(id)
    })
    const part = doc.createPrimitive().setMaterial(primitive.getMaterial()).setMode(primitive.getMode())
    for (const semantic of primitive.listSemantics()) {
      const source = primitive.getAttribute(semantic)
      const ArrayType = source.getArray().constructor
      const values = new ArrayType(originalIds.length * source.getElementSize())
      const element = []
      originalIds.forEach((id, j) => {
        source.getElement(id, element)
        if (wheel && semantic === 'POSITION') for (let k = 0; k < 3; k++) element[k] -= wheel.center[k]
        values.set(element, j * source.getElementSize())
      })
      part.setAttribute(semantic, doc.createAccessor().setType(source.getType())
        .setBuffer(source.getBuffer()).setArray(values).setNormalized(source.getNormalized()))
    }
    part.setIndices(doc.createAccessor().setType('SCALAR').setBuffer(pos.getBuffer()).setArray(new Uint32Array(newIndices)))
    ;(wheel?.mesh ?? body.getMesh()).addPrimitive(part)
    after += bucket.length / 3
    if (wheel) wheel.triangles += bucket.length / 3
  })
  body.getMesh().removePrimitive(primitive)
  primitive.dispose()
}
if (before !== after || wheels.some(w => w.triangles < 300)) throw new Error('Incomplete wheel extraction')
// Remove only the now-unreferenced source accessors.
for (const accessor of doc.getRoot().listAccessors()) {
  if (accessor.listParents().every(p => p === doc.getRoot())) accessor.dispose()
}
await io.write(file, doc)
console.log(JSON.stringify({ before, after, wheels: wheels.map(w => ({ center: w.center, triangles: w.triangles })) }, null, 2))
