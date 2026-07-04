"""
处理蝴蝶 FBX v6：生成UV → 转移纹理到顶点颜色 → 拆分 → 简化 → 导出OBJ
"""
import pymeshlab
import numpy as np
import os

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"

# Clean old OBJ/MTL files
for f in os.listdir(output_dir):
    if f.startswith("butterfly_") and (f.endswith(".obj") or f.endswith(".mtl")):
        os.remove(os.path.join(output_dir, f))
        print(f"Deleted: {f}")

print("Loading FBX...")
ms = pymeshlab.MeshSet()
ms.load_new_mesh(fbx_path)
ms.set_current_mesh(0)
m = ms.current_mesh()

print(f"Verts: {m.vertex_number()}, Faces: {m.face_number()}")
print(f"Has v_color: {m.has_vertex_color()}, Has w_tex: {m.has_wedge_tex_coord()}")

# Step 1: Generate planar UV (XY plane projection - top view)
print("\nGenerating planar UV...")
ms.compute_texcoord_parametrization_flat_plane_per_wedge()
print(f"  Has w_tex after: {ms.current_mesh().has_wedge_tex_coord()}")

# Step 2: Transfer texture color to vertex colors
print("Transferring texture to vertex colors...")
ms.transfer_texture_to_color_per_vertex()
print(f"  Has v_color after: {ms.current_mesh().has_vertex_color()}")

# Step 3: Get data arrays
verts = m.vertex_matrix()
faces = m.face_matrix()

# Get vertex colors
v_colors = None
if m.has_vertex_color():
    v_colors = m.vertex_color_matrix()
    print(f"  Color matrix: {v_colors.shape}, range: [{v_colors.min():.3f}, {v_colors.max():.3f}]")

SPLIT_THRESHOLD = 2.0
groups = [
    ("left_wing",  lambda x: x < -SPLIT_THRESHOLD),
    ("body",       lambda x: np.abs(x) <= SPLIT_THRESHOLD),
    ("right_wing", lambda x: x > SPLIT_THRESHOLD),
]

results = {}

for name, condition in groups:
    print(f"\n--- {name} ---")
    
    face_x = verts[faces][:, :, 0]
    face_mask = np.all(condition(face_x), axis=1)
    group_faces = faces[face_mask]
    
    if len(group_faces) == 0:
        print(f"  No faces!")
        continue
    
    used_verts = np.unique(group_faces)
    remap = np.full(len(verts), -1, dtype=np.int64)
    remap[used_verts] = np.arange(len(used_verts))
    new_faces = remap[group_faces]
    new_verts = verts[used_verts]
    
    # Get colors for used vertices
    new_colors = v_colors[used_verts] if v_colors is not None else None
    
    bbox_min = new_verts.min(axis=0)
    bbox_max = new_verts.max(axis=0)
    center = (bbox_min + bbox_max) / 2
    print(f"  Before: {len(new_verts)}v {len(group_faces)}f, center=({center[0]:.1f},{center[1]:.1f},{center[2]:.1f})")
    
    # Create mesh
    ms_part = pymeshlab.MeshSet()
    mesh_kwargs = {
        'vertex_matrix': new_verts.astype(np.float64),
        'face_matrix': new_faces.astype(np.int32),
    }
    if new_colors is not None:
        mesh_kwargs['v_color_matrix'] = new_colors.astype(np.float64)
    
    new_mesh = pymeshlab.Mesh(**mesh_kwargs)
    ms_part.add_mesh(new_mesh, mesh_name=f"butterfly_{name}")
    
    # Simplify
    target_faces = 3000 if "wing" in name else 1500
    print(f"  Simplifying to ~{target_faces}...")
    ms_part.meshing_decimation_quadric_edge_collapse(
        targetfacenum=target_faces,
        qualitythr=0.3,
        preserveboundary=True,
        boundaryweight=2.0,
        preservenormal=True,
        preservetopology=False,
        optimalplacement=True,
        planarweight=0.5,
        autoclean=True,
    )
    
    m_simp = ms_part.current_mesh()
    print(f"  After: {m_simp.vertex_number()}v {m_simp.face_number()}f")
    
    # Normals
    ms_part.compute_normal_per_vertex()
    
    # Save OBJ
    obj_path = os.path.join(output_dir, f"butterfly_{name}.obj")
    ms_part.save_current_mesh(obj_path)
    obj_size = os.path.getsize(obj_path)
    
    results[name] = {
        'vertices': int(m_simp.vertex_number()),
        'faces': int(m_simp.face_number()),
        'center': [round(center[0], 2), round(center[1], 2), round(center[2], 2)],
        'size_kb': round(obj_size / 1024, 1),
        'has_vcolor': new_colors is not None,
    }
    print(f"  OBJ: {obj_size/1024:.1f} KB, vcolor={'yes' if new_colors is not None else 'no'}")

print("\n=== Summary ===")
for n, i in results.items():
    print(f"  {n}: {i['vertices']}v {i['faces']}f {i['size_kb']}KB vcolor={i['has_vcolor']} center=({i['center'][0]},{i['center'][1]},{i['center'][2]})")
print("\nDone!")
