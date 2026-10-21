require 'json'
HERE = 'D:/Projetos/siadesk/tools/truck-repair'
UI.start_timer(2, false) do
  begin
    model=Sketchup.active_model
    # This script is launched in its own SketchUp process with an unchanged input.
    model.entities.clear!
    File.write(HERE+'/native-progress.txt', 'Reconstructing current truck')
    truck=JSON.parse(File.read(HERE+'/native-truck-data.json'))
    mats=truck['materials'].map do |m|
      mat=model.materials.add('Caminhao '+m['name'])
      mat.color=Sketchup::Color.new(*m['color']);mat.alpha=m['alpha']
      mat.texture=m['texture'] if m['texture']
      mat
    end
    truck['groups'].each_with_index do |d,i|
      File.write(HERE+'/native-progress.txt', "Building mesh #{i+1}/#{truck['groups'].length}")
      group=model.entities.add_group;group.name=d['name']+' '+truck['materials'][d['mat']]['name']
      mesh=Geom::PolygonMesh.new(d['points'].length,d['points'].length/3)
      ids=d['points'].each_with_index.map do |p,k|
        idx=mesh.add_point([p[0]/0.0254,-p[2]/0.0254,p[1]/0.0254])
        mesh.set_uv(idx,Geom::Point3d.new(d['uv'][k][0],1-d['uv'][k][1],1),true) if truck['materials'][d['mat']]['texture']
        idx
      end
      ids.each_slice(3){|v|mesh.add_polygon(v)}
      group.entities.fill_from_mesh(mesh,true,0,mats[d['mat']],mats[d['back']])
      group.entities.grep(Sketchup::Edge).each do |e|
        next unless e.faces.length==2
        angle=e.faces[0].normal.angle_between(e.faces[1].normal)
        if angle<0.52
          e.soft=true;e.smooth=true;e.hidden=true
        end
      end
    end
    data=JSON.parse(File.read(HERE+'/logo-contours.json'))
    all=model.entities.add_group
    all.name='SIAMAC - relevo 4 mm - ambos os lados'
    results=[]
    data['sides'].each_with_index do |side,side_index|
      outward=side_index==0 ? 1 : -1 # SketchUp Y = negative GLTF Z
      data['shapes'].each_with_index do |shape,idx|
        group=all.entities.add_group
        group.name="SIAMAC #{side_index==0 ? 'esquerda' : 'direita'} #{shape['name']} #{idx+1}"
        group.transformation=Geom::Transformation.scaling(0.01)
        ents=group.entities
        point=lambda do |uv|
          # The opposite side reads normally to its outside observer.
          x=data['center'][0]+(side_index==0 ? 0.5-uv[0] : uv[0]-0.5)*data['width']
          z=data['center'][1]+(0.5-uv[1])*data['height']
          y=-side-outward*0.0003
          [x/0.0254*100,y/0.0254*100,z/0.0254*100]
        end
        face=ents.add_face(shape['outer'].map{|uv|point.call(uv)})
        raise 'Missing logo face' unless face
        shape['holes'].each do |hole|
          hole_face=ents.add_face(hole.map{|uv|point.call(uv)})
          hole_face.erase! if hole_face
        end
        face=ents.grep(Sketchup::Face).max_by{|f|f.area}
        face.reverse! if face.normal.y*outward<0
        mat=model.materials["SIAMAC Relevo #{shape['name']}"] || model.materials.add("SIAMAC Relevo #{shape['name']}")
        mat.color=Sketchup::Color.new(*shape['color']);mat.alpha=1.0
        face.material=mat;face.back_material=mat
        face.pushpull((data['relief']+0.0003)/0.0254*100)
        ents.grep(Sketchup::Face).each{|f|f.material=mat;f.back_material=mat}
        # Export the ACTUAL SketchUp push/pull geometry for the app model.
        triangles=[]
        ents.grep(Sketchup::Face).each do |f|
          mesh=f.mesh(0)
          mesh.polygons.each do |poly|
            pts=poly.map do |index|
              p=mesh.point_at(index.abs).transform(group.transformation)
              [p.x.to_f*0.0254,p.z.to_f*0.0254,-p.y.to_f*0.0254]
            end
            triangles << pts
          end
        end
        results << {name:group.name, color:shape['color'], triangles:triangles, solid:group.manifold?, volume_m3:group.volume*0.0254**3}
      end
    end
    model.rendering_options['DisplayEdges']=false
    model.rendering_options['DisplayProfiles']=false
    model.active_view.camera=Sketchup::Camera.new([0,800,70],[0,0,70],[0,0,1],false)
    model.active_view.zoom_extents
    destination='D:/Projetos/siadesk/Arquivos 3d/pecas-revisadas'
    Dir.mkdir(destination) unless Dir.exist?(destination)
    model.definitions.purge_unused
    model.materials.purge_unused
    raise 'SKP save failed' unless model.save(destination+'/Caminhao SIAMAC - revisado.skp')
    File.write(HERE+'/native-logo-mesh.json',JSON.generate(results))
    File.write(HERE+'/native-progress.txt',"Saved; #{results.length} solids; bounds #{[model.bounds.min.to_a,model.bounds.max.to_a].inspect}")
    model.active_view.write_image(filename:HERE+'/sketchup-after.png',width:1800,height:700,antialias:true)
    File.write(HERE+'/native-finalized.txt',"SKP saved; solids: #{results.length}")
  rescue => e
    File.write(HERE+'/native-build-error.txt',"#{e.message}\n#{e.backtrace.join("\n")}")
  end
end
