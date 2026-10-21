import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { NodeIO, getBounds } from '@gltf-transform/core'
const here=path.dirname(fileURLToPath(import.meta.url))
const root=path.resolve(here,'../..')
const source=path.join(root,'public/models/veiculo.glb')
const backup=path.join(root,'Arquivos 3d/pecas-revisadas/backup-original')
fs.mkdirSync(backup,{recursive:true})
for(const [src,name] of [[source,'veiculo.glb'],[path.join(root,'public/models/entrada/veiculo.fbx'),'veiculo.fbx']]){
  const dest=path.join(backup,name)
  if(!fs.existsSync(dest))fs.copyFileSync(src,dest)
}
const io=new NodeIO()
const doc=await io.read(path.join(backup,'veiculo.glb'))
const scene=doc.getRoot().getDefaultScene()
const before=getBounds(scene)
const materials=doc.getRoot().listMaterials()
const rim=materials.find(m=>m.getName()==='Metal_Seamed')
rim.setBaseColorTexture(null).setBaseColorFactor([0.8,0.8,0.8,1]).setMetallicFactor(0).setRoughnessFactor(.5527864)
const tyre=materials.find(m=>m.getName()==='Color_008')
tyre.setBaseColorFactor([.19607843,.20784314,.19607843,1])
for(const mesh of doc.getRoot().listMeshes())for(const p of mesh.listPrimitives())if(p.getMaterial()?.getName()==='SIAMAC_NOVA_LOGO'){mesh.removePrimitive(p);p.dispose()}
const parts=JSON.parse(fs.readFileSync(path.join(here,'native-logo-mesh.json'),'utf8'))
if(parts.length!==18 || parts.some(p=>!p.solid))throw Error('SketchUp must produce 18 closed solids')
const buffer=doc.getRoot().listBuffers()[0]
// Logo vertices are exported from SketchUp in metres; attach at scene level.
for(const part of parts){
  const p=[],n=[]
  let signedVolume=0
  for(const [a,b,c] of part.triangles)signedVolume+=(a[0]*(b[1]*c[2]-b[2]*c[1])+a[1]*(b[2]*c[0]-b[0]*c[2])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6
  for(const original of part.triangles){
    const t=signedVolume<0?[original[0],original[2],original[1]]:original
    if(t.length!==3)throw Error('Expected triangulated SketchUp face mesh')
    const a=t[1].map((v,i)=>v-t[0][i]),b=t[2].map((v,i)=>v-t[0][i])
    const normal=[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]]
    const len=Math.hypot(...normal);if(len<1e-15)continue // SketchUp may emit collinear tessellation vertices.
    for(const v of t){p.push(...v);n.push(...normal.map(v=>v/len))}
  }
  const material=doc.createMaterial(part.name).setBaseColorFactor([...part.color.map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4}),1]).setMetallicFactor(0).setRoughnessFactor(.62)
  const primitive=doc.createPrimitive().setAttribute('POSITION',doc.createAccessor().setType('VEC3').setArray(new Float32Array(p)).setBuffer(buffer)).setAttribute('NORMAL',doc.createAccessor().setType('VEC3').setArray(new Float32Array(n)).setBuffer(buffer)).setMaterial(material)
  scene.addChild(doc.createNode(part.name).setMesh(doc.createMesh(part.name).addPrimitive(primitive)))
}
const after=getBounds(scene)
const output=path.join(root,'Arquivos 3d/pecas-revisadas/veiculo.glb')
await io.write(output,doc)
fs.writeFileSync(path.join(here,'validation.json'),JSON.stringify({before,after,logoSolids:parts.length,logoReliefMetres:.004,logoColors:[...new Set(parts.map(p=>p.color.join(',')))],output},null,2))
console.log(output,JSON.stringify({before,after,solids:parts.length}))
