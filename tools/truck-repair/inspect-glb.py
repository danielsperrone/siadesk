import json, struct
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parents[2]
original=ROOT/'Arquivos 3d/pecas-revisadas/backup-original/veiculo.glb'
raw = (original if original.exists() else ROOT/'public/models/veiculo.glb').read_bytes()
size = struct.unpack_from('<I', raw, 12)[0]
gltf = json.loads(raw[20:20+size])
binary = raw[28+size:]
def accessor(i):
    a=gltf['accessors'][i]; v=gltf['bufferViews'][a['bufferView']]
    dt={5126:'<f4',5125:'<u4',5123:'<u2',5121:'u1'}[a['componentType']]
    n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
    off=v.get('byteOffset',0)+a.get('byteOffset',0)
    return np.ndarray((a['count'],n),dtype=dt,buffer=binary,offset=off,strides=(v.get('byteStride',np.dtype(dt).itemsize*n),np.dtype(dt).itemsize)).copy()

if __name__=='__main__':
    # Triangle centroids and material labels help locate the axle geometry.
    for p in gltf['meshes'][9]['primitives']:
        pts=accessor(p['attributes']['POSITION']); ids=accessor(p['indices']).ravel() if 'indices' in p else np.arange(len(pts))
        tris=pts[ids].reshape(-1,3,3); c=tris.mean(axis=1)
        m=p['material']
        if m in [17,18,16,4,15,29,14,1,0]:
            rear=c[(c[:,0]>19000)&(c[:,1]<1800)]
            if len(rear):
                hist,edges=np.histogram(rear[:,0],bins=np.arange(19000,23601,100))
                print(m,gltf['materials'][m]['name'],len(rear),'peaks',[(int(edges[i]),int(hist[i])) for i in np.argsort(hist)[-8:]])
    for i,im in enumerate(gltf.get('images',[])):
        v=gltf['bufferViews'][im['bufferView']]; data=binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
        (Path(__file__).parent/f'texture-{i}.png').write_bytes(data)
