import importlib.util
from collections import Counter,defaultdict
import numpy as np
s=importlib.util.spec_from_file_location('glb','tools/truck-repair/inspect-glb.py');g=importlib.util.module_from_spec(s);s.loader.exec_module(g)
for p in g.gltf['meshes'][9]['primitives']:
 if p['material'] not in [17,18,29,15,14]:continue
 pts=g.accessor(p['attributes']['POSITION']); ix=g.accessor(p['indices']).ravel(); tris=pts[ix].reshape(-1,3,3)
 print('MATERIAL',p['material'],Counter(np.round(pts[:,2],1)).most_common(7))
 keys={}; parent=list(range(len(tris)))
 def find(i):
  while parent[i]!=i: parent[i]=parent[parent[i]];i=parent[i]
  return i
 for i,t in enumerate(tris):
  for pt in t:
   k=tuple(np.round(pt,2))
   if k in keys:parent[find(i)]=find(keys[k])
   else:keys[k]=i
 groups=defaultdict(list)
 for i,t in enumerate(tris):groups[find(i)].append(t)
 for ts in sorted(groups.values(),key=len,reverse=True)[:20]:
  a=np.array(ts).reshape(-1,3)
  print(len(ts),np.round(a.min(0),2).tolist(),np.round(a.max(0),2).tolist())
