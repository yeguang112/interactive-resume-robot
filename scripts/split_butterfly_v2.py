"""
Load FBX with pymeshlab, analyze mesh structure, split by vertex position,
decimate, and export as GLB.
"""
import pymeshlab
import sys
import os
import numpy as np

def process_butterfly_fbx(fbx_path, output_dir):
    print(f"Loading FBX: {fbx_path}")
    print(f"File size: {round(os.path.getsize(fbx_path) / 1024 / 1024, 1)} MB")
    
    ms = pymeshlab.MeshSet()
    print("Loading FBX with pymeshlab...")
    ms.load_new_mesh(fbx_path)
    
    try:
        ms.compute_normal_for_point_clouds()
    except:
        pass
    
    print(f"Loaded {ms.mesh_number()} mesh(es)")
    
    m = ms.current_mesh()
    print(f"\nMesh 0:")
    print(f"  Vertices: {m.vertex_number()}")
    print(f"  Faces: {m.face_number()}")
    
    bbox = m.bounding_box()
    bmin = bbox.min()
    bmax = bbox.max()
    print(f"  BBox min: [{bmin[0]:.4f}, {bmin[1]:.4f}, {bmin[2]:.4f}]")
    print(f"  BBox max: [{bmax[0]:.4f}, {bmax[1]:.4f}, {bmax[2]:.4f}]")
    print(f"  BBox size: [{bmax[0]-bmin[0]:.4f}, {bmax[1]-bmin[1]:.4f}, {bmax[2]-bmin[2]:.4f}]")
    
    verts = m.vertex_matrix()
    faces = m.face_matrix()
    
    print(f"\n  X range: [{verts[:,0].min():.4f}, {verts[:,0].max():.4f}] size={verts[:,0].max()-verts[:,0].min():.4f}")
    print(f"  Y range: [{verts[:,1].min():.4f}, {verts[:,1].max():.4f}] size={verts[:,1].max()-verts[:,1].min():.4f}")
    print(f"  Z range: [{verts[:,2].min():.4f}, {verts[:,2].max():.4f}] size={verts[:,2].max()-verts[:,2].min():.4f}")
    
    # Determine split axis (largest dimension = wing span)
    dims = [bmax[0]-bmin[0], bmax[1]-bmin[1], bmax[2]-bmin[2]]
    split_axis = dims.index(max(dims))
    axis_names = ['X', 'Y', 'Z']
    
    print(f"\n  Split axis: {axis_names[split_axis]} (size: {max(dims):.4f})")
    
    split_vals = verts[:, split_axis]
    split_center = (split_vals.min() + split_vals.max()) / 2
    split_range = split_vals.max() - split_vals.min()
    
    # Body is center 10% of span
    body_threshold = split_range * 0.05
    
    print(f"  Split center: {split_center:.4f}")
    print(f"  Body threshold: ±{body_threshold:.4f}")
    
    # Classify vertices
    vertex_class = np.zeros(len(verts), dtype=int)
    for i, v in enumerate(verts):
        val = v[split_axis]
        if val < split_center - body_threshold:
            vertex_class[i] = 0  # Left
        elif val > split_center + body_threshold:
            vertex_class[i] = 2  # Right
        else:
            vertex_class[i] = 1  # Body
    
    left_v = (vertex_class == 0).sum()
    body_v = (vertex_class == 1).sum()
    right_v = (vertex_class == 2).sum()
    print(f"\n  Vertex classification:")
    print(f"    Left: {left_v} ({100*left_v/len(verts):.1f}%)")
    print(f"    Body: {body_v} ({100*body_v/len(verts):.1f}%)")
    print(f"    Right: {right_v} ({100*right_v/len(verts):.1f}%)")
    
    # Classify faces
    face_classes = np.zeros(len(faces), dtype=int)
    for i, face in enumerate(faces):
        classes = vertex_class[face]
        counts = np.bincount(classes, minlength=3)
        face_classes[i] = np.argmax(counts)
    
    left_f = (face_classes == 0).sum()
    body_f = (face_classes == 1).sum()
    right_f = (face_classes == 2).sum()
    print(f"\n  Face classification:")
    print(f"    Left wing: {left_f} ({100*left_f/len(faces):.1f}%)")
    print(f"    Body: {body_f} ({100*body_f/len(faces):.1f}%)")
    print(f"    Right wing: {right_f} ({100*right_f/len(faces):.1f}%)")
    
    os.makedirs(output_dir, exist_ok=True)
    
    # Extract and save each part
    parts = [
        ("left_wing", 0),
        ("body", 1),
        ("right_wing", 2),
    ]
    
    results = []
    
    for name, class_id in parts:
        print(f"\n\n=== Processing {name} ===")
        
        face_mask = face_classes == class_id
        part_faces = faces[face_mask]
        
        if len(part_faces) == 0:
            print(f"  No faces for {name}, skipping")
            continue
        
        # Get unique vertices
        part_vert_indices = np.unique(part_faces)
        
        # Remap
        vert_map = np.zeros(len(verts), dtype=int)
        for new_idx, old_idx in enumerate(part_vert_indices):
            vert_map[old_idx] = new_idx
        
        part_verts = verts[part_vert_indices]
        part_faces_remapped = np.array([[vert_map[f[0]], vert_map[f[1]], vert_map[f[2]]] for f in part_faces])
        
        # Create mesh
        part_mesh = pymeshlab.Mesh(vertex_matrix=part_verts, face_matrix=part_faces_remapped)
        ms_part = pymeshlab.MeshSet()
        ms_part.add_mesh(part_mesh, name)
        
        # Generate normals (pymeshlab auto-computes on save for most formats)
        try:
            ms_part.compute_normal_for_point_clouds()
        except:
            pass
        
        m = ms_part.current_mesh()
        pbbox = m.bounding_box()
        pmin = pbbox.min()
        pmax = pbbox.max()
        print(f"  Vertices: {m.vertex_number()}")
        print(f"  Faces: {m.face_number()}")
        print(f"  BBox min: [{pmin[0]:.4f}, {pmin[1]:.4f}, {pmin[2]:.4f}]")
        print(f"  BBox max: [{pmax[0]:.4f}, {pmax[1]:.4f}, {pmax[2]:.4f}]")
        print(f"  Center: [{(pmin[0]+pmax[0])/2:.4f}, {(pmin[1]+pmax[1])/2:.4f}, {(pmin[2]+pmax[2])/2:.4f}]")
        
        # Decimate
        target = min(5000, m.face_number())
        if m.face_number() > target:
            print(f"  Decimating to {target} faces...")
            ms_part.meshing_decimation_quadric_edge_collapse(
                targetfacenum=target,
                preservetopology=True,
                preservenormal=True,
            )
            m = ms_part.current_mesh()
            print(f"  After: {m.vertex_number()} verts, {m.face_number()} faces")
        
        # Save as OBJ (will convert to GLB later)
        obj_path = os.path.join(output_dir, f"butterfly_{name}.obj")
        ms_part.save_current_mesh(obj_path)
        obj_size = os.path.getsize(obj_path)
        print(f"  OBJ: {round(obj_size / 1024, 1)} KB -> {obj_path}")
        
        results.append({
            'name': name,
            'obj_path': obj_path,
            'size_kb': round(obj_size / 1024, 1),
            'bbox_center': [(pmin[0]+pmax[0])/2, (pmin[1]+pmax[1])/2, (pmin[2]+pmax[2])/2],
        })
    
    # Also save the full mesh (decimated)
    print("\n\n=== Processing full butterfly (decimated) ===")
    ms_full = pymeshlab.MeshSet()
    ms_full.load_new_mesh(fbx_path)
    # Generate normals
    try:
        ms_full.compute_normal_for_point_clouds()
    except:
        pass
    
    m = ms_full.current_mesh()
    print(f"  Original: {m.vertex_number()} verts, {m.face_number()} faces")
    
    target = 15000
    if m.face_number() > target:
        print(f"  Decimating to {target} faces...")
        ms_full.meshing_decimation_quadric_edge_collapse(
            targetfacenum=target,
            preservetopology=True,
            preservenormal=True,
        )
        m = ms_full.current_mesh()
        print(f"  After: {m.vertex_number()} verts, {m.face_number()} faces")
    
    full_obj = os.path.join(output_dir, "butterfly_full.obj")
    ms_full.save_current_mesh(full_obj)
    print(f"  OBJ: {round(os.path.getsize(full_obj) / 1024, 1)} KB -> {full_obj}")
    
    print("\n\n=== Summary ===")
    for r in results:
        print(f"  {r['name']}: {r['size_kb']} KB, center: {r['bbox_center']}")
    print(f"  full: {round(os.path.getsize(full_obj) / 1024, 1)} KB")
    
    print("\nDone!")


if __name__ == '__main__':
    fbx_path = r"E:\document\Edge file\20260705002920_07341d5e.fbx"
    output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"
    process_butterfly_fbx(fbx_path, output_dir)
