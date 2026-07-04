"""
Load FBX with pymeshlab, split mesh by vertex X position into
left wing / body / right wing, decimate each part, export as GLB.
"""
import pymeshlab
import sys
import os
import struct

def process_butterfly_fbx(fbx_path, output_dir):
    print(f"Loading FBX: {fbx_path}")
    print(f"File size: {round(os.path.getsize(fbx_path) / 1024 / 1024, 1)} MB")
    
    ms = pymeshlab.MeshSet()
    
    # Load FBX
    print("Loading FBX with pymeshlab...")
    ms.load_new_mesh(fbx_path)
    
    print(f"Loaded {ms.number_of_meshes()} mesh(es)")
    
    for i in range(ms.number_of_meshes()):
        m = ms.current_mesh()
        print(f"\nMesh {i}:")
        print(f"  Vertices: {m.vertex_number()}")
        print(f"  Faces: {m.face_number()}")
        
        # Get bounding box
        bbox = m.boundingbox()
        print(f"  BBox min: [{bbox.min()[0]:.4f}, {bbox.min()[1]:.4f}, {bbox.min()[2]:.4f}]")
        print(f"  BBox max: [{bbox.max()[0]:.4f}, {bbox.max()[1]:.4f}, {bbox.max()[2]:.4f}]")
        print(f"  BBox size: [{bbox.dim_x():.4f}, {bbox.dim_y():.4f}, {bbox.dim_z():.4f}]")
        
        # Get vertex data
        verts = m.vertex_matrix()
        print(f"\n  Vertex X range: [{verts[:,0].min():.4f}, {verts[:,0].max():.4f}]")
        print(f"  Vertex Y range: [{verts[:,1].min():.4f}, {verts[:,1].max():.4f}]")
        print(f"  Vertex Z range: [{verts[:,2].min():.4f}, {verts[:,2].max():.4f}]")
        
        # Analyze distribution along X axis (likely left-right)
        x_vals = verts[:, 0]
        x_center = (x_vals.min() + x_vals.max()) / 2
        x_range = x_vals.max() - x_vals.min()
        
        # Count vertices in each region
        left_count = (x_vals < x_center - x_range * 0.05).sum()
        right_count = (x_vals > x_center + x_range * 0.05).sum()
        center_count = len(x_vals) - left_count - right_count
        
        print(f"\n  X center: {x_center:.4f}")
        print(f"  Left (X < {x_center - x_range*0.05:.4f}): {left_count} vertices ({100*left_count/len(x_vals):.1f}%)")
        print(f"  Center: {center_count} vertices ({100*center_count/len(x_vals):.1f}%)")
        print(f"  Right (X > {x_center + x_range*0.05:.4f}): {right_count} vertices ({100*right_count/len(x_vals):.1f}%)")
        
        # Also check Y and Z distributions
        y_vals = verts[:, 1]
        z_vals = verts[:, 2]
        y_range = y_vals.max() - y_vals.min()
        z_range = z_vals.max() - z_vals.min()
        
        print(f"\n  Y range: {y_range:.4f} (up-down?)")
        print(f"  Z range: {z_range:.4f} (forward-back?)")
        
        # The largest dimension is likely the wing span
        print(f"\n  Largest dimension: ", end="")
        if x_range >= y_range and x_range >= z_range:
            print(f"X ({x_range:.4f}) - wings span left-right")
        elif y_range >= x_range and y_range >= z_range:
            print(f"Y ({y_range:.4f}) - wings span up-down")
        else:
            print(f"Z ({z_range:.4f}) - wings span forward-back")
    
    # Now let's split the mesh
    # First, save the full mesh as GLB for reference
    os.makedirs(output_dir, exist_ok=True)
    
    # Step 1: Generate normals
    print("\n\nGenerating normals...")
    ms.compute_normal_for_points_and_faces()
    
    # Step 2: Check if we can split by a plane
    m = ms.current_mesh()
    verts = m.vertex_matrix()
    faces = m.face_matrix()
    
    x_vals = verts[:, 0]
    x_center = (x_vals.min() + x_vals.max()) / 2
    
    # Determine which axis is the wing span
    bbox = m.boundingbox()
    dims = [bbox.dim_x(), bbox.dim_y(), bbox.dim_z()]
    max_dim_idx = dims.index(max(dims))
    axis_names = ['X', 'Y', 'Z']
    
    print(f"\nSplit axis: {axis_names[max_dim_idx]} (dimension: {max(dims):.4f})")
    
    split_axis = max_dim_idx
    split_vals = verts[:, split_axis]
    split_center = (split_vals.min() + split_vals.max()) / 2
    split_range = split_vals.max() - split_vals.min()
    
    # Body is the center 10% of the span
    body_threshold = split_range * 0.08
    
    # Classify each vertex
    vertex_class = []
    for v in verts:
        val = v[split_axis]
        if val < split_center - body_threshold:
            vertex_class.append(0)  # Left wing
        elif val > split_center + body_threshold:
            vertex_class.append(2)  # Right wing
        else:
            vertex_class.append(1)  # Body
    
    # Classify faces by majority vertex class
    import numpy as np
    vertex_class = np.array(vertex_class)
    
    face_classes = []
    for face in faces:
        classes = vertex_class[face]
        # Majority vote
        counts = np.bincount(classes, minlength=3)
        face_classes.append(np.argmax(counts))
    
    face_classes = np.array(face_classes)
    
    left_faces = (face_classes == 0).sum()
    body_faces = (face_classes == 1).sum()
    right_faces = (face_classes == 2).sum()
    
    print(f"\nFace classification:")
    print(f"  Left wing: {left_faces} faces ({100*left_faces/len(face_classes):.1f}%)")
    print(f"  Body: {body_faces} faces ({100*body_faces/len(face_classes):.1f}%)")
    print(f"  Right wing: {right_faces} faces ({100*right_faces/len(face_classes):.1f}%)")
    
    # Now we need to export 3 separate meshes
    # Save the whole mesh first, then we'll split using meshlab filters
    
    # Save original mesh
    full_path = os.path.join(output_dir, "butterfly_full.glb")
    print(f"\nSaving full mesh to {full_path}...")
    ms.save_current_mesh(full_path, save_face_color=False)
    print(f"  Saved: {round(os.path.getsize(full_path) / 1024 / 1024, 1)} MB")
    
    # Split: select faces by class and save separately
    # We'll use vertex selection and face selection
    
    # Left wing
    print("\nExtracting left wing...")
    ms.clear()
    ms.load_new_mesh(fbx_path)
    ms.compute_normal_for_points_and_faces()
    
    # Select left wing faces
    m = ms.current_mesh()
    verts = m.vertex_matrix()
    faces = m.face_matrix()
    
    split_vals = verts[:, split_axis]
    split_center = (split_vals.min() + split_vals.max()) / 2
    split_range = split_vals.max() - split_vals.min()
    body_threshold = split_range * 0.08
    
    vertex_class = np.array([
        0 if v[split_axis] < split_center - body_threshold
        else (2 if v[split_axis] > split_center + body_threshold else 1)
        for v in verts
    ])
    
    # Select faces that are mostly left wing
    left_face_mask = np.zeros(len(faces), dtype=bool)
    for i, face in enumerate(faces):
        classes = vertex_class[face]
        counts = np.bincount(classes, minlength=3)
        if np.argmax(counts) == 0:
            left_face_mask[i] = True
    
    # Use meshlab to select and delete non-left faces
    # We need to use the face selection via quality or color
    # Actually, let's use a simpler approach: export to temp, then use numpy
    
    # Create a new mesh with only left wing faces
    left_faces_arr = faces[left_face_mask]
    # Get unique vertices used
    left_vert_indices = np.unique(left_faces_arr)
    # Remap indices
    vert_map = np.zeros(len(verts), dtype=int)
    for new_idx, old_idx in enumerate(left_vert_indices):
        vert_map[old_idx] = new_idx
    left_verts = verts[left_vert_indices]
    left_faces_remapped = np.array([[vert_map[f[0]], vert_map[f[1]], vert_map[f[2]]] for f in left_faces_arr])
    
    left_mesh = pymeshlab.Mesh(vertex_matrix=left_verts, face_matrix=left_faces_remapped)
    ms_left = pymeshlab.MeshSet()
    ms_left.add_mesh(left_mesh, "left_wing")
    ms_left.compute_normal_for_points_and_faces()
    
    left_path = os.path.join(output_dir, "butterfly_left_wing.obj")
    ms_left.save_current_mesh(left_path)
    print(f"  Left wing: {len(left_vert_indices)} verts, {len(left_faces_arr)} faces -> {left_path}")
    
    # Body
    print("\nExtracting body...")
    body_face_mask = np.zeros(len(faces), dtype=bool)
    for i, face in enumerate(faces):
        classes = vertex_class[face]
        counts = np.bincount(classes, minlength=3)
        if np.argmax(counts) == 1:
            body_face_mask[i] = True
    
    body_faces_arr = faces[body_face_mask]
    body_vert_indices = np.unique(body_faces_arr)
    vert_map = np.zeros(len(verts), dtype=int)
    for new_idx, old_idx in enumerate(body_vert_indices):
        vert_map[old_idx] = new_idx
    body_verts = verts[body_vert_indices]
    body_faces_remapped = np.array([[vert_map[f[0]], vert_map[f[1]], vert_map[f[2]]] for f in body_faces_arr])
    
    body_mesh = pymeshlab.Mesh(vertex_matrix=body_verts, face_matrix=body_faces_remapped)
    ms_body = pymeshlab.MeshSet()
    ms_body.add_mesh(body_mesh, "body")
    ms_body.compute_normal_for_points_and_faces()
    
    body_path = os.path.join(output_dir, "butterfly_body.obj")
    ms_body.save_current_mesh(body_path)
    print(f"  Body: {len(body_vert_indices)} verts, {len(body_faces_arr)} faces -> {body_path}")
    
    # Right wing
    print("\nExtracting right wing...")
    right_face_mask = np.zeros(len(faces), dtype=bool)
    for i, face in enumerate(faces):
        classes = vertex_class[face]
        counts = np.bincount(classes, minlength=3)
        if np.argmax(counts) == 2:
            right_face_mask[i] = True
    
    right_faces_arr = faces[right_face_mask]
    right_vert_indices = np.unique(right_faces_arr)
    vert_map = np.zeros(len(verts), dtype=int)
    for new_idx, old_idx in enumerate(right_vert_indices):
        vert_map[old_idx] = new_idx
    right_verts = verts[right_vert_indices]
    right_faces_remapped = np.array([[vert_map[f[0]], vert_map[f[1]], vert_map[f[2]]] for f in right_faces_arr])
    
    right_mesh = pymeshlab.Mesh(vertex_matrix=right_verts, face_matrix=right_faces_remapped)
    ms_right = pymeshlab.MeshSet()
    ms_right.add_mesh(right_mesh, "right_wing")
    ms_right.compute_normal_for_points_and_faces()
    
    right_path = os.path.join(output_dir, "butterfly_right_wing.obj")
    ms_right.save_current_mesh(right_path)
    print(f"  Right wing: {len(right_vert_indices)} verts, {len(right_faces_arr)} faces -> {right_path}")
    
    # Now decimate each part
    print("\n\n=== Decimating meshes ===")
    
    for name, meshset, path in [
        ("left_wing", ms_left, left_path),
        ("body", ms_body, body_path),
        ("right_wing", ms_right, right_path),
    ]:
        m = meshset.current_mesh()
        print(f"\n{name}: {m.vertex_number()} verts, {m.face_number()} faces")
        
        # Decimate to target polygon count
        target = min(3000, m.face_number())
        if m.face_number() > target:
            print(f"  Decimating to {target} faces...")
            meshset.meshing_decimation_quadric_edge_collapse(
                targetfacenum=target,
                preservetopology=True,
                preservenormal=True,
            )
            m = meshset.current_mesh()
            print(f"  After decimation: {m.vertex_number()} verts, {m.face_number()} faces")
        
        # Export as GLB
        glb_path = path.replace('.obj', '.glb')
        meshset.save_current_mesh(glb_path)
        print(f"  Saved GLB: {round(os.path.getsize(glb_path) / 1024, 1)} KB")
    
    # Print bounding boxes for each part
    print("\n\n=== Bounding boxes ===")
    for name, meshset in [("left_wing", ms_left), ("body", ms_body), ("right_wing", ms_right)]:
        m = meshset.current_mesh()
        bbox = m.boundingbox()
        verts = m.vertex_matrix()
        print(f"\n{name}:")
        print(f"  BBox min: [{bbox.min()[0]:.4f}, {bbox.min()[1]:.4f}, {bbox.min()[2]:.4f}]")
        print(f"  BBox max: [{bbox.max()[0]:.4f}, {bbox.max()[1]:.4f}, {bbox.max()[2]:.4f}]")
        print(f"  Center: [{(bbox.min()[0]+bbox.max()[0])/2:.4f}, {(bbox.min()[1]+bbox.max()[1])/2:.4f}, {(bbox.min()[2]+bbox.max()[2])/2:.4f}]")
    
    print("\n\nDone!")


if __name__ == '__main__':
    fbx_path = r"E:\document\Edge file\20260705002920_07341d5e.fbx"
    output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"
    process_butterfly_fbx(fbx_path, output_dir)
