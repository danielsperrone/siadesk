require 'json'
UI.start_timer(2, false) do
  begin
    model = Sketchup.active_model
    rows = []
    walk = lambda do |ents, path|
      ents.each do |e|
        if e.is_a?(Sketchup::Group) || e.is_a?(Sketchup::ComponentInstance)
          d = e.is_a?(Sketchup::Group) ? e.entities : e.definition.entities
          rows << {path: path, id: e.entityID, name: e.name, definition: (e.respond_to?(:definition) ? e.definition.name : ''), bounds: [e.bounds.min.to_a, e.bounds.max.to_a], count: d.length}
          walk.call(d, path + [e.entityID]) if path.length < 4
        end
      end
    end
    walk.call(model.entities, [])
    File.write('D:/Projetos/siadesk/tools/truck-repair/sketchup-inspection.json', JSON.pretty_generate({path:model.path, rows:rows, materials:model.materials.map{|m| {name:m.name,color:m.color.to_a}}}))
  rescue => e
    File.write('D:/Projetos/siadesk/tools/truck-repair/sketchup-error.txt', e.full_message)
  end
end
