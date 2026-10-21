import importlib.util, json
from pathlib import Path
from xml.sax.saxutils import escape
import numpy as np
import cv2
from PIL import Image

HERE=Path(__file__).resolve().parent
s=importlib.util.spec_from_file_location('glb', HERE/'inspect-glb.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
root=g.ROOT

# Trace the supplied original artwork, keeping the two A counters as holes.
im=np.array(Image.open(root/'Arquivos 3d/peças/veiculo/SIAMAC_NOVA_LOGO.png').convert('RGB'))
colors={'Preto':(0,0,0),'Vermelho':(128,0,0),'Verde':(0,137,66),'Azul':(0,76,138)}
masks={'Preto':im.max(2)<90,'Vermelho':(im[:,:,0]>90)&(im[:,:,1]<80)&(im[:,:,2]<80),'Verde':(im[:,:,1]>80)&(im[:,:,0]<80)&(im[:,:,2]<120),'Azul':(im[:,:,2]>90)&(im[:,:,0]<80)&(im[:,:,1]<120)}
shapes=[]
for name,mask in masks.items():
 cs,hs=cv2.findContours(mask.astype('uint8'),cv2.RETR_CCOMP,cv2.CHAIN_APPROX_SIMPLE)
 # Sample the actual dominant solid color instead of substituting brand approximations.
 pixels=im[mask];vals,counts=np.unique(pixels,axis=0,return_counts=True);color=vals[counts.argmax()].tolist()
 for i,c in enumerate(cs):
  if hs[0,i,3]!=-1 or cv2.contourArea(c)<40:continue
  def poly(c):return (cv2.approxPolyDP(c,0.7,True)[:,0,:]/np.array([im.shape[1]-1,im.shape[0]-1])).tolist()
  holes=[];child=int(hs[0,i,2])
  while child!=-1:
   holes.append(poly(cs[child]));child=int(hs[0,child,0])
  shapes.append({'name':name,'color':color,'outer':poly(c),'holes':holes})
(HERE/'logo-contours.json').write_text(json.dumps({'width':5.31310449,'height':5.31310449*im.shape[0]/im.shape[1],'center':[1.35525146,2.06787970],'sides':[-1.03765845,1.06234155],'relief':0.004,'shapes':shapes}),encoding='utf8')

# A standard COLLADA copy brings the CURRENT application model into SketchUp.
# Keep the original GLB geometry/materials; the raster logo alone is omitted.
out=['<?xml version="1.0" encoding="utf-8"?><COLLADA xmlns="http://www.collada.org/2005/11/COLLADASchema" version="1.4.1"><asset><contributor><authoring_tool>SIADESK model repair</authoring_tool></contributor><created>2026-09-14T03:00:00Z</created><modified>2026-09-14T03:00:00Z</modified><unit name="meter" meter="1"/><up_axis>Y_UP</up_axis></asset><library_images>']
for i,im in enumerate(g.gltf.get('images',[])):
 v=g.gltf['bufferViews'][im['bufferView']];ext='jpg' if im['mimeType']=='image/jpeg' else 'png';name=f'model-texture-{i}.{ext}'
 (HERE/name).write_bytes(g.binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']])
 out.append(f'<image id="image{i}"><init_from>{name}</init_from></image>')
out.append('</library_images><library_effects>')
for i,m in enumerate(g.gltf['materials']):
 p=m.get('pbrMetallicRoughness',{});color=p.get('baseColorFactor',[1,1,1,1]);tex=p.get('baseColorTexture')
 if i==17:color=[.8,.8,.8,1];tex=None
 if i==18:color=[.196,.208,.196,1];tex=None
 out.append(f'<effect id="effect{i}"><profile_COMMON>')
 if tex:
  img=g.gltf['textures'][tex['index']]['source']
  out.append(f'<newparam sid="surf{i}"><surface type="2D"><init_from>image{img}</init_from></surface></newparam><newparam sid="samp{i}"><sampler2D><source>surf{i}</source></sampler2D></newparam>')
 diffuse=f'<texture texture="samp{i}" texcoord="UVSET0"/>' if tex else '<color>'+' '.join(map(str,color))+'</color>'
 out.append(f'<technique sid="common"><phong><diffuse>{diffuse}</diffuse><specular><color>0 0 0 1</color></specular><transparency><float>{color[3]}</float></transparency></phong></technique></profile_COMMON></effect>')
out.append('</library_effects><library_materials>')
for i,m in enumerate(g.gltf['materials']):out.append(f'<material id="mat{i}" name="{escape(m["name"])}"><instance_effect url="#effect{i}"/></material>')
out.append('</library_materials><library_geometries>');instances=[]
for mi,mesh in enumerate(g.gltf['meshes']):
 for pi,p in enumerate(mesh['primitives']):
  if p['material']==41:continue
  gid=f'geo{mi}_{pi}';pts=g.accessor(p['attributes']['POSITION']).astype(float)*.001+np.array(g.gltf['nodes'][0]['translation'])
  arrays={'pos':pts,'norm':g.accessor(p['attributes']['NORMAL'])}
  if 'TEXCOORD_0' in p['attributes']:arrays['uv']=g.accessor(p['attributes']['TEXCOORD_0']);arrays['uv'][:,1]=1-arrays['uv'][:,1]
  out.append(f'<geometry id="{gid}" name="{mesh["name"]}"><mesh>')
  for key,a in arrays.items():
   stride=a.shape[1];params=['X','Y','Z'] if stride==3 else ['S','T']
   out.append(f'<source id="{gid}-{key}"><float_array id="{gid}-{key}-a" count="{a.size}">'+ ' '.join(f'{v:.8g}' for v in a.ravel())+f'</float_array><technique_common><accessor source="#{gid}-{key}-a" count="{len(a)}" stride="{stride}">'+''.join(f'<param name="{c}" type="float"/>' for c in params)+'</accessor></technique_common></source>')
  ids=g.accessor(p['indices']).ravel();n=len(arrays)
  out.append(f'<vertices id="{gid}-v"><input semantic="POSITION" source="#{gid}-pos"/></vertices><triangles count="{len(ids)//3}" material="material"><input semantic="VERTEX" source="#{gid}-v" offset="0"/><input semantic="NORMAL" source="#{gid}-norm" offset="1"/>')
  if 'uv' in arrays:out.append(f'<input semantic="TEXCOORD" source="#{gid}-uv" offset="2" set="0"/>')
  out.append('<p>'+' '.join(str(int(v)) for v in np.repeat(ids,n))+'</p></triangles></mesh></geometry>')
  instances.append(f'<node id="node-{gid}" name="{mesh["name"]}_{p["material"]}"><instance_geometry url="#{gid}"><bind_material><technique_common><instance_material symbol="material" target="#mat{p["material"]}"><bind_vertex_input semantic="UVSET0" input_semantic="TEXCOORD" input_set="0"/></instance_material></technique_common></bind_material></instance_geometry></node>')
out.append('</library_geometries><library_visual_scenes><visual_scene id="Scene">'+''.join(instances)+'</visual_scene></library_visual_scenes><scene><instance_visual_scene url="#Scene"/></scene></COLLADA>')
(HERE/'current-truck.dae').write_text(''.join(out),encoding='utf8')
print('Artwork:',len(shapes),'shapes;',sum(len(s['holes']) for s in shapes),'holes. COLLADA ready.')
