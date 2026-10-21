import * as THREE from 'three'
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js'
import fs from 'node:fs/promises'
// GLTFExporter uses the browser FileReader interface to encode binary buffers.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) { blob.arrayBuffer().then(value => { this.result = value; this.onloadend?.() }) }
  readAsDataURL(blob) { blob.arrayBuffer().then(value => { this.result = `data:${blob.type};base64,${Buffer.from(value).toString('base64')}`; this.onloadend?.() }) }
}
const metal = new THREE.MeshStandardMaterial({name:'Alumínio grafite',color:0x30363b,metalness:0.75,roughness:0.35})
const steel = new THREE.MeshStandardMaterial({name:'Suporte galvanizado',color:0xa5afb7,metalness:0.85,roughness:0.3})
const lens = new THREE.MeshStandardMaterial({name:'Lente LED',color:0xfff4cd,emissive:0xffe6a0,emissiveIntensity:0.4,roughness:0.2})
function box(g,name,size,pos,mat=metal) { const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.name=name;m.position.set(...pos);g.add(m);return m }
function tube(g,a,b,r,mat=steel) { const d=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=new THREE.Mesh(new THREE.CylinderGeometry(r,r,d.length(),20),mat);m.position.copy(new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),d.normalize());g.add(m) }
for(const type of ['refletor-frontal','refletor-poste']) {
 const root=new THREE.Group();root.name=type
 // Origin is the pole center at mounting height, shared by both fixtures.
 for(const y of [-.075,.075]) {const ring=new THREE.Mesh(new THREE.TorusGeometry(.052,.009,8,32),steel);ring.rotation.x=Math.PI/2;ring.position.y=y;root.add(ring)}
 if(type==='refletor-frontal') {
  box(root,'Suporte central',[.10,.025,.04],[.09,0,0],steel)
  for(const z of [-.065,.065]) box(root,'Suporte lateral',[.07,.02,.012],[.145,0,z],steel)
  // Face de 15 x 15 cm; dimensões em metros, frente para +X.
  box(root,'Carcaça do refletor',[.04,.15,.15],[.18,0,0])
  box(root,'Lente frontal +X',[.004,.13,.13],[.202,0,0],lens)
  for(let i=0;i<7;i++) box(root,'Aleta de dissipação',[.02,.13,.004],[.15,0,-.06+i*.02])
  for(const y of [-.04,0,.04]) for(const z of [-.045,-.015,.015,.045]) box(root,'Módulo LED',[.005,.023,.021],[.206,y,z],lens)
 } else {
  tube(root,[.04,0,0],[.45,.13,0],.026)
  tube(root,[.45,.13,0],[.76,.13,0],.026)
  box(root,'Corpo da luminária',[.50,.09,.30],[.79,.11,0])
  box(root,'Lente inferior -Y',[.43,.012,.25],[.80,.059,0],lens)
  for(let i=0;i<8;i++) box(root,'Aleta superior',[.012,.025,.26],[.60+i*.05,.167,0])
  for(const x of [.66,.78,.9]) for(const z of [-.075,.075]) box(root,'Módulo LED inferior',[.075,.015,.055],[x,.048,z],lens)
 }
 const result=await new GLTFExporter().parseAsync(root,{binary:true})
 await fs.writeFile(`public/models/${type}.glb`,Buffer.from(result))
 console.log(type,result.byteLength)
}
