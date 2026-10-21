import bpy, sys
from mathutils import Vector
from pathlib import Path
root=Path(__file__).resolve().parents[2]
args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
source=args[0] if args else str(root/'public/models/veiculo.glb')
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=24
scene.world=bpy.data.worlds.new('Studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(0.8,0.8,0.8,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=0.8
scene.view_settings.view_transform='Standard'
bpy.ops.object.camera_add(location=(0,-22,1.6));cam=bpy.context.object
cam.rotation_euler=(Vector((0,0,1.6))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=15
scene.camera=cam
scene.render.resolution_x=2000;scene.render.resolution_y=600;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.render.filepath=str(root/'tools/truck-repair'/('before.png' if len(args)<2 else args[1]))
bpy.ops.render.render(write_still=True)
