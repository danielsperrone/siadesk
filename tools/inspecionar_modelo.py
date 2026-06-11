"""Render de inspeção de um GLB convertido.

Uso:
  blender -b -P tools/inspecionar_modelo.py -- <nome-da-peca>

Gera docs/inspecao-<nome>.png e imprime o bounding box (validação de
origem: X/Y centrados, base em Z = 0).
"""
import math
import os
import sys
import bpy
from mathutils import Vector

RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
NOME = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else "semaforo"
GLB = os.path.join(RAIZ, "public", "models", f"{NOME}.glb")
SAIDA = os.path.join(RAIZ, "docs", f"inspecao-{NOME}.png")

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)

minimo = [math.inf] * 3
maximo = [-math.inf] * 3
for obj in bpy.context.scene.objects:
    if obj.type != "MESH":
        continue
    for canto in obj.bound_box:
        p = obj.matrix_world @ Vector(canto)
        for i in range(3):
            minimo[i] = min(minimo[i], p[i])
            maximo[i] = max(maximo[i], p[i])
centro = Vector([(minimo[i] + maximo[i]) / 2 for i in range(3)])
tamanho = max(maximo[i] - minimo[i] for i in range(3))
print(f"Origem check - min: ({minimo[0]:.3f}, {minimo[1]:.3f}, {minimo[2]:.3f}) "
      f"max: ({maximo[0]:.3f}, {maximo[1]:.3f}, {maximo[2]:.3f})")

cam_data = bpy.data.cameras.new("cam")
cam = bpy.data.objects.new("cam", cam_data)
bpy.context.scene.collection.objects.link(cam)
direcao = Vector((1, -1, 0.6)).normalized()
cam.location = centro + direcao * tamanho * 2.5
olhar = (centro - cam.location).normalized()
cam.rotation_euler = olhar.to_track_quat('-Z', 'Y').to_euler()
bpy.context.scene.camera = cam

sol_data = bpy.data.lights.new("sol", type='SUN')
sol_data.energy = 4
sol = bpy.data.objects.new("sol", sol_data)
sol.rotation_euler = (math.radians(50), 0, math.radians(30))
bpy.context.scene.collection.objects.link(sol)

cena = bpy.context.scene
cena.render.engine = 'BLENDER_EEVEE'
cena.render.resolution_x = 800
cena.render.resolution_y = 800
cena.render.filepath = SAIDA
bpy.ops.render.render(write_still=True)
print("Render salvo em", SAIDA)
