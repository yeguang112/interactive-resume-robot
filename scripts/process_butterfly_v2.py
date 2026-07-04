"""
处理蝴蝶 FBX：按 X 轴位置拆分为左翅/身体/右翅，简化后导出 OBJ
然后用 Node.js 转 GLB
"""
import pymeshlab
import os
import sys

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"

# Clean old files
for f in os.listdir(output_dir):
    if f.startswith("butterfly_") and (f.endswith(".obj") or f.endswith(".mtl") or f.endswith(".glb") or f.endswith(".json")):
        path = os.path.join(output_dir, f)
        os.remove(path)
        print(f"Deleted: {f}")

print(f"\nLoading FBX: {fbx_path}")
ms = pymeshlab.MeshSet()
ms.load_new_mesh(fbx_path)

m = ms.current_mesh()
bbox = m.bounding_box()
print(f"Vertices: {m.vertex_number()}")
print(f"Faces: {m.face_number()}")
print(f"BBox: ({bbox.min()[0]:.2f},{bbox.min()[1]:.2f},{bbox.min()[2]:.2f}) -> ({bbox.max()[0]:.2f},{bbox.max()[1]:.2f},{bbox.max()[2]:.2f})")

# Split threshold: body is within X = [-2, 2], wings are outside
# This captures the narrow body strip in the center
SPLIT_THRESHOLD = 2.0

groups = [
    ("left_wing",  f"x < {-SPLIT_THRESHOLD}"),
    ("body",       f"x >= {-SPLIT_THRESHOLD} and x <= {SPLIT_THRESHOLD}"),
    ("right_wing", f"x > {SPLIT_THRESHOLD}"),
]

results = {}

for name, condition in groups:
    print(f"\n--- Processing: {name} ---")
    
    # Create a fresh copy
    ms_part = pymeshlab.MeshSet()
    ms_part.load_new_mesh(fbx_path)
    
    # Select vertices by X position using conditional selection
    # pymeshlab uses meshlab filter "Conditional Vertex Selection"
    ms_part.set_current_mesh(0)
    
    # Select vertices matching condition
    ms_part.conditional_vertex_selection(condselect=condition)
    
    # Check how many vertices selected
    selected = ms_part.current_mesh().selected_vertex_number()
    total = ms_part.current_mesh().vertex_number()
    print(f"  Selected {selected} / {total} vertices")
    
    if selected == 0:
        print(f"  WARNING: No vertices selected for {name}!")
        continue
    
    # Invert selection (select everything NOT in our group)
    ms_part.invert_selection()
    
    # Delete selected (non-group) vertices
    ms_part.delete_selected_vertices()
    
    # Get remaining mesh info
    m_part = ms_part.current_mesh()
    print(f"  Remaining: {m_part.vertex_number()} verts, {m_part.face_number()} faces")
    
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
    # Target: 3000 faces for wings, 1500 for body
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
        'vertices': m_simp.vertex_number(),
        'faces': m_simp.face_number(),
        'center': [round(pcx, 2), round(pcy, 2), round(pcz, 2)],
        'size_kb': round(obj_size / 1024, 1),
    }

print("\n=== Summary ===")
for name, info in results.items():
    print(f"  {name}: {info['vertices']} verts, {info['faces']} faces, {info['size_kb']} KB, center=({info['center'][0]},{info['center'][1]},{info['center'][2]})")

print("\nDone! Now convert OBJ to GLB using Node.js.")
