"""
处理蝴蝶 FBX v7：手动采样纹理颜色到顶点 → 拆分 → 简化 → 导出OBJ
"""
import pymeshlab
import numpy as np
from PIL import Image
import os

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"
texture_path = os.path.join(output_dir, "butterfly_base_color.png")

# Clean old files
for f in os.listdir(output_dir):
    if f.startswith("butterfly_") and (f.endswith(".obj") or f.endswith(".mtl")):
        os.remove(os.path.join(output_dir, f))

print("Loading FBX...")
ms = pymeshlab.MeshSet()
ms.load_new_mesh(fbx_path)
ms.set_current_mesh(0)
m = ms.current_mesh()

verts = m.vertex_matrix()
faces = m.face_matrix()

print(f"Verts: {len(verts)}, Faces: {len(faces)}")
xmin, ymin, zmin = verts.min(axis=0)
xmax, ymax, zmax = verts.max(axis=0)
print(f"BBox: X[{xmin:.2f},{xmax:.2f}] Y[{ymin:.2f},{ymax:.2f}] Z[{zmin:.2f},{zmax:.2f}]")

# Load texture and sample colors
print(f"\nLoading texture: {texture_path}")
img = Image.open(texture_path)
tex = np.array(img)  # (H, W, 3) or (H, W, 4)
print(f"Texture: {img.size} {img.mode} -> array {tex.shape}")

# Planar projection: X->U, Y->V (flip Y for image coords)
u = (verts[:, 0] - xmin) / (xmax - xmin)
v = 1.0 - (verts[:, 1] - ymin) / (ymax - ymin)

# Sample texture
px = np.clip((u * (tex.shape[1] - 1)).astype(int), 0, tex.shape[1] - 1)
py = np.clip((v * (tex.shape[0] - 1)).astype(int), 0, tex.shape[0] - 1)
rgb = tex[py, px][:, :3].astype(np.float64) / 255.0  # (N, 3) in [0-1]

# Add alpha = 1.0
colors = np.hstack([rgb, np.ones((len(verts), 1))])  # (N, 4)
print(f"Sampled colors: {colors.shape}, range: [{colors.min():.3f}, {colors.max():.3f}]")
print(f"  R: [{rgb[:,0].min():.3f}, {rgb[:,0].max():.3f}]")
print(f"  G: [{rgb[:,1].min():.3f}, {rgb[:,1].max():.3f}]")
print(f"  B: [{rgb[:,2].min():.3f}, {rgb[:,2].max():.3f}]")

# Split and process
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
        continue
    
    used_verts = np.unique(group_faces)
    remap = np.full(len(verts), -1, dtype=np.int64)
    remap[used_verts] = np.arange(len(used_verts))
    new_faces = remap[group_faces]
    new_verts = verts[used_verts]
    new_colors = colors[used_verts]
    
    center = new_verts.mean(axis=0)
    print(f"  Before: {len(new_verts)}v {len(group_faces)}f center=({center[0]:.1f},{center[1]:.1f},{center[2]:.1f})")
    
    # Create mesh with vertex colors
    ms_part = pymeshlab.MeshSet()
    new_mesh = pymeshlab.Mesh(
        vertex_matrix=new_verts.astype(np.float64),
        face_matrix=new_faces.astype(np.int32),
        v_color_matrix=new_colors.astype(np.float64),
    )
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
    
    # Verify colors are preserved
    if m_simp.has_vertex_color():
        vc = m_simp.vertex_color_matrix()
        print(f"  After: {m_simp.vertex_number()}v {m_simp.face_number()}f, colors: [{vc.min():.3f}, {vc.max():.3f}]")
    else:
        print(f"  After: {m_simp.vertex_number()}v {m_simp.face_number()}f, NO vertex colors!")
    
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
    }
    print(f"  OBJ: {obj_size/1024:.1f} KB")

print("\n=== Summary ===")
for n, i in results.items():
    print(f"  {n}: {i['vertices']}v {i['faces']}f {i['size_kb']}KB center=({i['center'][0]},{i['center'][1]},{i['center'][2]})")
print("\nDone!")
