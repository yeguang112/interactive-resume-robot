"""
分析新 FBX 文件的 10 个组件结构
根据包围盒位置识别身体、左翅、右翅
"""
import pymeshlab
import json
import os

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"

print(f"Loading FBX: {fbx_path}")
print(f"File size: {os.path.getsize(fbx_path) / 1024 / 1024:.1f} MB")

ms = pymeshlab.MeshSet()
ms.load_new_mesh(fbx_path)

total_verts = 0
total_faces = 0
parts_info = []

print(f"\n=== {ms.number_meshes()} meshes loaded ===\n")

for i in range(ms.number_meshes()):
    ms.set_current_mesh(i)
    m = ms.current_mesh()
    bbox = m.bounding_box()

    cx = (bbox.min()[0] + bbox.max()[0]) / 2
    cy = (bbox.min()[1] + bbox.max()[1]) / 2
    cz = (bbox.min()[2] + bbox.max()[2]) / 2
    dx = bbox.dim_x()
    dy = bbox.dim_y()
    dz = bbox.dim_z()

    info = {
        'index': i,
        'vertices': int(m.vertex_number()),
        'faces': int(m.face_number()),
        'center': [round(cx, 2), round(cy, 2), round(cz, 2)],
        'dimensions': [round(dx, 2), round(dy, 2), round(dz, 2)],
        'bbox_min': [round(bbox.min()[0], 2), round(bbox.min()[1], 2), round(bbox.min()[2], 2)],
        'bbox_max': [round(bbox.max()[0], 2), round(bbox.max()[1], 2), round(bbox.max()[2], 2)],
    }
    parts_info.append(info)
    total_verts += m.vertex_number()
    total_faces += m.face_number()

    print(f"Part {i}: {m.vertex_number():>8} verts, {m.face_number():>8} faces")
    print(f"  Center: ({cx:>8.2f}, {cy:>8.2f}, {cz:>8.2f})")
    print(f"  Dims:   ({dx:>8.2f}, {dy:>8.2f}, {dz:>8.2f})")
    print(f"  BBox:   [({bbox.min()[0]:.2f},{bbox.min()[1]:.2f},{bbox.min()[2]:.2f}) -> ({bbox.max()[0]:.2f},{bbox.max()[1]:.2f},{bbox.max()[2]:.2f})]")
    print()

print(f"\n=== Total: {total_verts} verts, {total_faces} faces ===")

# Determine overall bounding box
all_min = [min(p['bbox_min'][i] for p in parts_info) for i in range(3)]
all_max = [max(p['bbox_max'][i] for p in parts_info) for i in range(3)]
print(f"Overall BBox: [({all_min[0]:.2f},{all_min[1]:.2f},{all_min[2]:.2f}) -> ({all_max[0]:.2f},{all_max[1]:.2f},{all_max[2]:.2f})]")
print(f"Overall Dims: ({all_max[0]-all_min[0]:.2f}, {all_max[1]-all_min[1]:.2f}, {all_max[2]-all_min[2]:.2f})")

# Classify parts by X position
center_threshold = (all_max[0] + all_min[0]) / 2  # midpoint of overall X range
print(f"\nX midpoint: {center_threshold:.2f}")

left_parts = []
right_parts = []
center_parts = []

for p in parts_info:
    cx = p['center'][0]
    x_extent = p['dimensions'][0]
    # If the part's center is clearly left of center
    if cx < center_threshold - x_extent * 0.3:
        left_parts.append(p['index'])
        print(f"  Part {p['index']}: LEFT (center_x={cx:.2f}, dim_x={x_extent:.2f})")
    elif cx > center_threshold + x_extent * 0.3:
        right_parts.append(p['index'])
        print(f"  Part {p['index']}: RIGHT (center_x={cx:.2f}, dim_x={x_extent:.2f})")
    else:
        center_parts.append(p['index'])
        print(f"  Part {p['index']}: CENTER (center_x={cx:.2f}, dim_x={x_extent:.2f})")

print(f"\nClassification:")
print(f"  Left parts:  {left_parts}")
print(f"  Center parts: {center_parts}")
print(f"  Right parts: {right_parts}")

# Save analysis results
results = {
    'parts': parts_info,
    'overall_bbox': {'min': all_min, 'max': all_max},
    'classification': {
        'left': left_parts,
        'center': center_parts,
        'right': right_parts,
    },
    'total_verts': total_verts,
    'total_faces': total_faces,
}

result_path = os.path.join(output_dir, 'fbx_analysis.json')
with open(result_path, 'w') as f:
    json.dump(results, f, indent=2)
print(f"\nAnalysis saved to: {result_path}")
