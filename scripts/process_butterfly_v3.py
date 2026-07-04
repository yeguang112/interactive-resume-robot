"""
处理蝴蝶 FBX v3：按 X 轴位置拆分为左翅/身体/右翅，简化后导出 OBJ
然后用 Node.js 转 GLB
"""
import pymeshlab
import os

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"

# Clean old butterfly files
for f in os.listdir(output_dir):
    if f.startswith("butterfly_") and (f.endswith(".obj") or f.endswith(".mtl") or f.endswith(".glb") or f.endswith(".json") or f.endswith(".png")):
        path = os.path.join(output_dir, f)
        os.remove(path)
        print(f"Deleted: {f}")

# Split threshold: body is within X = [-2, 2], wings are outside
SPLIT_THRESHOLD = 2.0

groups = [
    ("left_wing",  f"x<-{SPLIT_THRESHOLD}"),
    ("body",       f"x>={-SPLIT_THRESHOLD} && x<={SPLIT_THRESHOLD}"),
    ("right_wing", f"x>{SPLIT_THRESHOLD}"),
]

results = {}

for name, condition in groups:
    print(f"\n--- Processing: {name} (condition: {condition}) ---")
    
    # Load fresh copy each time
    ms_part = pymeshlab.MeshSet()
    ms_part.load_new_mesh(fbx_path)
    ms_part.set_current_mesh(0)
    m = ms_part.current_mesh()
    
    # Select vertices we WANT to keep
    ms_part.compute_selection_by_condition_per_vertex(condselect=condition)
    selected = m.selected_vertex_number()
    total = m.vertex_number()
    print(f"  Selected (keep): {selected} / {total} vertices")
    
    if selected == 0:
        print(f"  WARNING: No vertices selected for {name}!")
        continue
    
    # Invert selection -> now we have selected the ones to DELETE
    ms_part.apply_selection_inverse()
    
    # Delete selected vertices and faces
    ms_part.meshing_remove_selected_vertices_and_faces()
    
    m_part = ms_part.current_mesh()
    print(f"  After removal: {m_part.vertex_number()} verts, {m_part.face_number()} faces")
    
    if m_part.face_number() == 0:
        print(f"  WARNING: No faces remaining for {name}!")
        continue
    
    pbbox = m_part.bounding_box()
    pcx = (pbbox.min()[0] + pbbox.max()[0]) / 2
    pcy = (pbbox.min()[1] + pbbox.max()[1]) / 2
    pcz = (pbbox.min()[2] + pbbox.max()[2]) / 2
    print(f"  BBox center: ({pcx:.2f}, {pcy:.2f}, {pcz:.2f})")
    print(f"  BBox dims: ({pbbox.dim_x():.2f}, {pbbox.dim_y():.2f}, {pbbox.dim_z():.2f})")
    
    # Simplify mesh using Quadric Edge Collapse
    target_faces = 3000 if "wing" in name else 1500
    print(f"  Simplifying to {target_faces} faces...")
    
    ms_part.meshing_quadric_edge_collapse_decimation(
        targetfacenum=target_faces,
        qualitythr=0.3,
        preserveboundary=True,
        boundaryweight=2.0,
        preservenormal=True,
        preservetopology=False,
        optimalplacement=True,
        planarweight=0.5,
        autoclean=True,
        selected=False,
    )
    
    m_simp = ms_part.current_mesh()
    print(f"  After simplification: {m_simp.vertex_number()} verts, {m_simp.face_number()} faces")
    
    # Compute normals
    ms_part.compute_normal_for_points_and_faces()
    
    # Save as OBJ
    obj_path = os.path.join(output_dir, f"butterfly_{name}.obj")
    ms_part.save_current_mesh(obj_path)
    obj_size = os.path.getsize(obj_path)
    print(f"  OBJ: {obj_size / 1024:.1f} KB -> {obj_path}")
    
    results[name] = {
        'obj_path': obj_path,
        'vertices': int(m_simp.vertex_number()),
        'faces': int(m_simp.face_number()),
        'center': [round(pcx, 2), round(pcy, 2), round(pcz, 2)],
        'size_kb': round(obj_size / 1024, 1),
    }

print("\n=== Summary ===")
for name, info in results.items():
    print(f"  {name}: {info['vertices']} verts, {info['faces']} faces, {info['size_kb']} KB, center=({info['center'][0]},{info['center'][1]},{info['center'][2]})")

print("\nDone! OBJ files ready for GLB conversion.")
