require 'json'
HERE='D:/Projetos/siadesk/tools/truck-repair'
UI.start_timer(2,false) do
 begin
  model=Sketchup.active_model
  data=JSON.parse(File.read(HERE+'/logo-contours.json'))
  all=model.entities.grep(Sketchup::Group).find{|g|g.name.start_with?('SIAMAC - relevo')}
  raise 'Logo group missing' unless all
  # Correct the initial preview's reading direction on both exterior sides.
  reflection=Geom::Transformation.scaling([data['center'][0]/0.0254,0,0],-1,1,1)
  all.transform!(reflection)
  parts=[]
  all.entities.grep(Sketchup::Group).each do |group|
   triangles=[]
   t=all.transformation*group.transformation
   group.entities.grep(Sketchup::Face).each do |face|
    mesh=face.mesh(0)
    mesh.polygons.each do |poly|
     points=poly.reverse.map do |idx|
      p=mesh.point_at(idx.abs).transform(t)
      [p.x.to_f*0.0254,p.z.to_f*0.0254,-p.y.to_f*0.0254]
     end
     triangles << points
    end
   end
   mat=group.entities.grep(Sketchup::Face).first.material
   parts << {name:group.name,color:mat.color.to_a[0,3],triangles:triangles,solid:group.manifold?}
  end
  File.write(HERE+'/native-logo-mesh.json',JSON.generate(parts))
  destination='D:/Projetos/siadesk/Arquivos 3d/pecas-revisadas'
  model.active_view.camera=Sketchup::Camera.new([0,-800,110],[0,0,70],[0,0,1],false)
  model.active_view.zoom_extents
  model.save(destination+'/Caminhao SIAMAC - rodas e relevo.skp')
  model.active_view.write_image(filename:HERE+'/sketchup-final.png',width:1800,height:700,antialias:true)
  ok=model.export(destination+'/veiculo.fbx',{units:'mm',triangulated_faces:true,doublesided_faces:true,texture_maps:true,separate_disconnected_faces:false,swap_yz:true,show_summary:false})
  File.write(HERE+'/native-finalized.txt',"FBX export: #{ok}; solids: #{parts.length}")
 rescue => e
  File.write(HERE+'/native-finalize-error.txt',"#{e.message}\n#{e.backtrace.join("\n")}")
 end
end
