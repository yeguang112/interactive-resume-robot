"""
处理蝴蝶 FBX v5：
1. 加载 FBX（含纹理）
2. 生成平面投影 UV（从顶部投影，适合蝴蝶展翅形态）
3. 将纹理颜色转移到顶点颜色（作为备份）
4. 按 X 轴拆分为左翅/身体/右翅
5. 简化网格
6. 导出 OBJ（含 UV + 顶点颜色）
"""
import pymeshlab
import numpy as np
import os

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"
texture_path = os.path.join(output_dir, "butterfly_base_color.png")

# Clean old OBJ files
for f in os.listdir(output_dir):
    if f.startswith("butterfly_") and (f.endswith(".obj") or f.endswith(".mtl")):
        os.remove(os.path.join(output_dir, f))
        print(f"Deleted: {f}")

print("Loading FBX with texture...")
ms = pymeshlab.MeshSet()
ms.load_new_mesh(fbx_path)
ms.set_current_mesh(0)
m = ms.current_mesh()

print(f"Vertices: {m.vertex_number()}, Faces: {m.face_number()}")
print(f"Has vertex tex_coord: {m.has_vertex_tex_coord()}")
print(f"Has wedge tex_coord: {m.has_wedge_tex_coord()}")
print(f"Has vertex color: {m.has_vertex_color()}")

# Generate UV coordinates using flat plane projection (top view: X->U, Y->V)
print("\nGenerating planar UV coordinates (XY plane projection)...")
try:
    ms.compute_texcoord_parametrization_flat_plane_per_wedge()
    print(f"  After: has wedge tex_coord: {ms.current_mesh().has_wedge_tex_coord()}")
except Exception as e:
    print(f"  Flat plane failed: {e}")
    # Try triangle trivial as fallback
    try:
        ms.compute_texcoord_parametrization_triangle_trivial_per_wedge()
        print("  Triangle trivial UV generated")
    except Exception as e2:
        print(f"  Triangle trivial also failed: {e2}")

# Transfer texture to vertex colors as backup
print("\nTransferring texture to vertex colors...")
try:
    ms.transfer_texture_to_color_per_vertex()
    print(f"  Has vertex color: {ms.current_mesh().has_vertex_color()}")
except Exception as e:
    print(f"  Transfer failed: {e}")

# Get vertex and face data
verts = m.vertex_matrix()
faces = m.face_matrix()
print(f"\nVertex matrix shape: {verts.shape}")
print(f"Face matrix shape: {faces.shape}")

SPLIT_THRESHOLD = 2.0

groups = [
    ("left_wing",  lambda x: x < -SPLIT_THRESHOLD),
    ("body",       lambda x: np.abs(x) <= SPLIT_THRESHOLD),
    ("right_wing", lambda x: x > SPLIT_THRESHOLD),
]

results = {}

for name, condition in groups:
    print(f"\n--- Processing: {name} ---")
    
    face_x = verts[faces][:, :, 0]
    face_mask = np.all(condition(face_x), axis=1)
    group_faces = faces[face_mask]
    
    print(f"  Faces: {len(group_faces)} / {len(faces)}")
    if len(group_faces) == 0:
        continue
    
    used_verts = np.unique(group_faces)
    remap = np.full(len(verts), -1, dtype=np.int64)
    remap[used_verts] = np.arange(len(used_verts))
    new_faces = remap[group_faces]
    new_verts = verts[used_verts]
    
    # Get vertex colors if available
    vertex_colors = None
    if m.has_vertex_color():
        try:
            all_colors = m.vertex_color_matrix()
            vertex_colors = all_colors[used_verts]
            print(f"  Vertex colors: {vertex_colors.shape}")
        except:
            pass
    
    # Get wedge texcoords if available
    wedge_texcoords = None
    if m.has_wedge_tex_coord():
        try:
            all_texcoords = m.wedge_tex_coord_matrix()
            # Need to remap faces for texcoords too
            # wedge texcoords are per-face-per-vertex (M, 3, 2)
            wedge_texcoords = all_texcoords[face_mask]
            print(f"  Wedge texcoords: {wedge_texcoords.shape}")
        except Exception as e:
            print(f"  Texcoord extraction failed: {e}")
    
    # Create new mesh
    ms_part = pymeshlab.MeshSet()
    
    mesh_kwargs = {
        'vertex_matrix': new_verts.astype(np.float32),
        'face_matrix': new_faces.astype(np.int32),
    }
    if vertex_colors is not None:
        mesh_kwargs['v_color_matrix'] = vertex_colors.astype(np.float32)
    if wedge_texcoords is not None:
        try:
            mesh_kwargs['w_texcoord_matrix'] = wedge_texcoords.astype(np.float32)
            print(f"  Added wedge texcoords to mesh")
        except:
            pass
    
    new_mesh = pymeshlab.Mesh(**mesh_kwargs)
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
    print(f"  After: {m_simp.vertex_number()}v {m_simp.face_number()}f")
    
    # Compute normals
    ms_part.compute_normal_per_vertex()
    
    # Save as OBJ (with MTL for texture reference)
    obj_path = os.path.join(output_dir, f"butterfly_{name}.obj")
    ms_part.save_current_mesh(obj_path)
    obj_size = os.path.getsize(obj_path)
    
    # Check if MTL was created
    mtl_path = obj_path.replace('.obj', '.mtl')
    has_mtl = os.path.exists(mtl_path)
    
    print(f"  OBJ: {obj_size/1024:.1f} KB, MTL: {'yes' if has_mtl else 'no'}")
    
    # Bounding box
    bbox_min = new_verts.min(axis=0)
    bbox_max = new_verts.max(axis=0)
    center = (bbox_min + bbox_max) / 2
    
    results[name] = {
        'vertices': int(m_simp.vertex_number()),
        'faces': int(m_simp.face_number()),
        'center': [round(center[0], 2), round(center[1], 2), round(center[2], 2)],
        'size_kb': round(obj_size / 1024, 1),
        'has_vcolor': vertex_colors is not None,
        'has_uv': wedge_texcoords is not None,
    }

print("\n=== Summary ===")
for name, info in results.items():
    print(f"  {name}: {info['vertices']}v {info['faces']}f {info['size_kb']}KB "
          f"vcolor={info['has_vcolor']} uv={info['has_uv']} "
          f"center=({info['center'][0]},{info['center'][1]},{info['center'][2]})")

print("\nDone!")
