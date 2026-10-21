import importlib.util,json
from pathlib import Path
import numpy as np
here=Path(__file__).resolve().parent
s=importlib.util.spec_from_file_location('g',here/'inspect-glb.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
out=[]
for mesh in g.gltf['meshes']:
 seen={};tris=[]
 for p in mesh['primitives']:
  mat=p['material']
  if mat==41:continue
  points=g.accessor(p['attributes']['POSITION']);ids=g.accessor(p['indices']).ravel();uv=g.accessor(p['attributes']['TEXCOORD_0']) if 'TEXCOORD_0' in p['attributes'] else np.zeros((len(points),2))
  for ix in ids.reshape(-1,3):
   pts=points[ix].astype(float)*.001+np.array(g.gltf['nodes'][0]['translation'])
   key=tuple(sorted(tuple(np.round(x,6)) for x in pts))
   if key in seen:
    prev=tris[seen[key]]
    # SketchUp has separate front/back materials; preserve their orientation.
    old=np.array(prev['p']);oldn=np.cross(old[1]-old[0],old[2]-old[0]);newn=np.cross(pts[1]-pts[0],pts[2]-pts[0])
    if np.dot(oldn,newn)<0:prev['back']=mat
    continue
   seen[key]=len(tris);tris.append({'m':mat,'back':mat,'p':pts.tolist(),'uv':uv[ix].tolist()})
 groups={}
 for t in tris:
  d=groups.setdefault((t['m'],t['back']),{'name':mesh['name'],'mat':t['m'],'back':t['back'],'points':[],'uv':[]})
  d['points'].extend(t['p']);d['uv'].extend(t['uv'])
 out.extend(groups.values())
mats=[]
for i,m in enumerate(g.gltf['materials']):
 p=m.get('pbrMetallicRoughness',{});c=p.get('baseColorFactor',[1,1,1,1]);tex=p.get('baseColorTexture')
 if i==17:c=[.8,.8,.8,1];tex=None
 if i==18:c=[.19607843,.20784314,.19607843,1];tex=None
 item={'name':m['name'],'color':[round(x*255) for x in c[:3]],'alpha':c[3]}
 if tex:
  n=g.gltf['textures'][tex['index']]['source'];ext='jpg' if g.gltf['images'][n]['mimeType']=='image/jpeg' else 'png';item['texture']=str(here/f'model-texture-{n}.{ext}').replace('\\','/')
 mats.append(item)
(here/'native-truck-data.json').write_text(json.dumps({'materials':mats,'groups':out},separators=(',',':')),encoding='utf8')
print('Triangles',sum(len(d['points'])//3 for d in out))
