"""
处理蝴蝶 FBX v4：用 numpy 直接操作顶点/面数据拆分
"""
import pymeshlab
import numpy as np
import os

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"

# Clean old butterfly files
for f in os.listdir(output_dir):
    if f.startswith("butterfly_") and (f.endswith(".obj") or f.endswith(".mtl") or f.endswith(".glb") or f.endswith(".json") or f.endswith(".png")):
        os.remove(os.path.join(output_dir, f))
        print(f"Deleted: {f}")

print(f"\nLoading FBX...")
ms = pymeshlab.MeshSet()
ms.load_new_mesh(fbx_path)
ms.set_current_mesh(0)
m = ms.current_mesh()

verts = m.vertex_matrix()
faces = m.face_matrix()
print(f"Total: {len(verts)} verts, {len(faces)} faces")
print(f"X range: {verts[:,0].min():.2f} to {verts[:,0].max():.2f}")
print(f"Y range: {verts[:,1].min():.2f} to {verts[:,1].max():.2f}")
print(f"Z range: {verts[:,2].min():.2f} to {verts[:,2].max():.2f}")

SPLIT_THRESHOLD = 2.0

groups = [
    ("left_wing",  lambda x: x < -SPLIT_THRESHOLD),
    ("body",       lambda x: np.abs(x) <= SPLIT_THRESHOLD),
    ("right_wing", lambda x: x > SPLIT_THRESHOLD),
]

results = {}

for name, condition in groups:
    print(f"\n--- Processing: {name} ---")
    
    # Get X coordinate of each face's 3 vertices
    face_x = verts[faces][:, :, 0]  # (M, 3)
    
    # Select faces where ALL 3 vertices satisfy the condition
    face_mask = np.all(condition(face_x), axis=1)
    group_faces = faces[face_mask]
    
    print(f"  Faces: {len(group_faces)} / {len(faces)} ({len(group_faces)/len(faces)*100:.1f}%)")
    
    if len(group_faces) == 0:
        print(f"  WARNING: No faces for {name}!")
        continue
    
    # Get unique vertex indices used by these faces
    used_verts = np.unique(group_faces)
    
    # Create remapping: old index -> new index
    remap = np.full(len(verts), -1, dtype=np.int64)
    remap[used_verts] = np.arange(len(used_verts))
    
    # Remap faces
    new_faces = remap[group_faces]
    new_verts = verts[used_verts]
    
    # Compute bounding box
    bbox_min = new_verts.min(axis=0)
    bbox_max = new_verts.max(axis=0)
    center = (bbox_min + bbox_max) / 2
    dims = bbox_max - bbox_min
    print(f"  Verts: {len(new_verts)}, Faces: {len(new_faces)}")
    print(f"  BBox center: ({center[0]:.2f}, {center[1]:.2f}, {center[2]:.2f})")
    print(f"  BBox dims: ({dims[0]:.2f}, {dims[1]:.2f}, {dims[2]:.2f})")
    
    # Create new mesh
    ms_part = pymeshlab.MeshSet()
    new_mesh = pymeshlab.Mesh(
        vertex_matrix=new_verts.astype(np.float32),
        face_matrix=new_faces.astype(np.int32),
    )
    ms_part.add_mesh(new_mesh, mesh_name=f"butterfly_{name}")
    
    # Simplify
    target_faces = 3000 if "wing" in name else 1500
    print(f"  Simplifying to ~{target_faces} faces...")
    
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
    print(f"  After: {m_simp.vertex_number()} verts, {m_simp.face_number()} faces")
    
    # Compute normals
    ms_part.compute_normal_per_vertex()
    
    # Save as OBJ
    obj_path = os.path.join(output_dir, f"butterfly_{name}.obj")
    ms_part.save_current_mesh(obj_path)
    obj_size = os.path.getsize(obj_path)
    print(f"  OBJ: {obj_size / 1024:.1f} KB")
    
    results[name] = {
        'obj_path': obj_path,
        'vertices': int(m_simp.vertex_number()),
        'faces': int(m_simp.face_number()),
        'center': [round(center[0], 2), round(center[1], 2), round(center[2], 2)],
        'size_kb': round(obj_size / 1024, 1),
    }

print("\n=== Summary ===")
for name, info in results.items():
    print(f"  {name}: {info['vertices']}v {info['faces']}f {info['size_kb']}KB center=({info['center'][0]},{info['center'][1]},{info['center'][2]})")

print("\nDone! OBJ files ready for GLB conversion.")
