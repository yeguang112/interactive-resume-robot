"""
Parse ASCII FBX file to extract model structure.
Search for Model, Geometry, Texture, Material definitions.
"""
import sys
import re

def parse_ascii_fbx(filepath):
    with open(filepath, 'r', encoding='utf-8', errors='replace') as f:
        content = f.read()
    
    file_size_mb = round(len(content) / 1024 / 1024, 1)
    print(f"File size: {file_size_mb} MB")
    print(f"Total lines: {content.count(chr(10))}")
    print()
    
    # Find all Model: definitions
    # Format: Model: "<id>", "Model::<name>" {
    model_pattern = r'Model:\s*"([^"]+)",\s*"Model::([^"]*)"'
    models = re.findall(model_pattern, content)
    
    # Find Geometry: definitions
    # Format: Geometry: "<id>", "Geometry::<name>" {
    geom_pattern = r'Geometry:\s*"([^"]+)",\s*"Geometry::([^"]*)"'
    geometries = re.findall(geom_pattern, content)
    
    # Find Texture: definitions
    tex_pattern = r'Texture:\s*"([^"]+)",\s*"Texture::([^"]*)"'
    textures = re.findall(tex_pattern, content)
    
    # Find Video (image data) definitions
    video_pattern = r'Video:\s*"([^"]+)",\s*"Video::([^"]*)"'
    videos = re.findall(video_pattern, content)
    
    # Find Material: definitions
    mat_pattern = r'Material:\s*"([^"]+)",\s*"Material::([^"]*)"'
    materials = re.findall(mat_pattern, content)
    
    # Find Properties70 for each Model (Translation, Rotation, Scaling)
    # We need to find each Model block and extract its properties
    # Pattern: Model: "id", "Model::name" { ... Properties70 { ... } ... }
    
    print(f"=== Models ({len(models)}) ===\n")
    
    for model_id, model_name in models:
        print(f"  Model: {model_name}")
        print(f"  ID: {model_id}")
        
        # Find the block for this model and extract Properties70
        # Search for Lcl Translation, Lcl Rotation, Lcl Scaling after this model
        model_block_start = content.find(f'Model: "{model_id}"')
        if model_block_start >= 0:
            # Find the next Model: or Geometry: or similar top-level keyword
            next_block = len(content)
            for keyword in ['\n\tModel:', '\n\tGeometry:', '\n\tTexture:', '\n\tVideo:', '\n\tMaterial:', '\n\tTake:', '\n\tConnections']:
                pos = content.find(keyword, model_block_start + 10)
                if pos >= 0 and pos < next_block:
                    next_block = pos
            
            block = content[model_block_start:next_block]
            
            # Extract Lcl Translation
            trans_match = re.search(r'Lcl Translation:\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)', block)
            if trans_match:
                x, y, z = float(trans_match.group(5)), float(trans_match.group(6)), float(trans_match.group(7))
                print(f"  Translation: [{round(x, 4)}, {round(y, 4)}, {round(z, 4)}]")
            
            # Extract Lcl Rotation
            rot_match = re.search(r'Lcl Rotation:\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)', block)
            if rot_match:
                x, y, z = float(rot_match.group(5)), float(rot_match.group(6)), float(rot_match.group(7))
                print(f"  Rotation: [{round(x, 4)}, {round(y, 4)}, {round(z, 4)}]")
            
            # Extract Lcl Scaling
            scale_match = re.search(r'Lcl Scaling:\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*"([^"]*)",\s*([-\d.]+),\s*([-\d.]+),\s*([-\d.]+)', block)
            if scale_match:
                x, y, z = float(scale_match.group(5)), float(scale_match.group(6)), float(scale_match.group(7))
                print(f"  Scaling: [{round(x, 4)}, {round(y, 4)}, {round(z, 4)}]")
        
        print()
    
    print(f"=== Geometries ({len(geometries)}) ===\n")
    
    for geom_id, geom_name in geometries:
        print(f"  Geometry: {geom_name}")
        print(f"  ID: {geom_id}")
        
        # Find the block and extract vertex count
        geom_block_start = content.find(f'Geometry: "{geom_id}"')
        if geom_block_start >= 0:
            next_block = len(content)
            for keyword in ['\n\tModel:', '\n\tGeometry:', '\n\tTexture:', '\n\tVideo:', '\n\tMaterial:', '\n\tTake:', '\n\tConnections']:
                pos = content.find(keyword, geom_block_start + 10)
                if pos >= 0 and pos < next_block:
                    next_block = pos
            
            block = content[geom_block_start:next_block]
            
            # Count vertices: Vertices: *<count> {
            vert_match = re.search(r'Vertices:\s*\*(\d+)\s*\{', block)
            if vert_match:
                vert_count = int(vert_match.group(1)) // 3
                print(f"  Vertex count: {vert_count}")
            
            # Count polygons
            poly_match = re.search(r'PolygonVertexIndex:\s*\*(\d+)\s*\{', block)
            if poly_match:
                poly_count = int(poly_match.group(1))
                print(f"  Polygon indices: {poly_count}")
            
            # Check for Normals
            if 'Normals:' in block:
                print(f"  Has normals: Yes")
            
            # Check for UV
            if 'UVSet:' in block or 'UVIndex:' in block:
                print(f"  Has UV: Yes")
        
        print()
    
    print(f"=== Textures ({len(textures)}) ===\n")
    for tex_id, tex_name in textures:
        print(f"  Texture: {tex_name}")
        print(f"  ID: {tex_id}")
        # Find filename
        tex_block_start = content.find(f'Texture: "{tex_id}"')
        if tex_block_start >= 0:
            next_block = len(content)
            for keyword in ['\n\tModel:', '\n\tGeometry:', '\n\tTexture:', '\n\tVideo:', '\n\tMaterial:', '\n\tTake:', '\n\tConnections']:
                pos = content.find(keyword, tex_block_start + 10)
                if pos >= 0 and pos < next_block:
                    next_block = pos
            block = content[tex_block_start:next_block]
            fname_match = re.search(r'FileName:\s*"([^"]*)"', block)
            if fname_match:
                print(f"  File: {fname_match.group(1)}")
        print()
    
    print(f"=== Videos ({len(videos)}) ===\n")
    for vid_id, vid_name in videos:
        print(f"  Video: {vid_name}")
        # Find filename
        vid_block_start = content.find(f'Video: "{vid_id}"')
        if vid_block_start >= 0:
            next_block = len(content)
            for keyword in ['\n\tModel:', '\n\tGeometry:', '\n\tTexture:', '\n\tVideo:', '\n\tMaterial:', '\n\tTake:', '\n\tConnections']:
                pos = content.find(keyword, vid_block_start + 10)
                if pos >= 0 and pos < next_block:
                    next_block = pos
            block = content[vid_block_start:next_block]
            fname_match = re.search(r'FileName:\s*"([^"]*)"', block)
            if fname_match:
                print(f"  File: {fname_match.group(1)}")
            # Check for embedded content
            if 'Content:' in block:
                print(f"  Has embedded content: Yes")
        print()
    
    print(f"=== Materials ({len(materials)}) ===\n")
    for mat_id, mat_name in materials:
        print(f"  Material: {mat_name}")
        print(f"  ID: {mat_id}")
        print()
    
    # Find Connections (which model uses which geometry/material)
    print(f"=== Connections ===\n")
    conn_section = content.find('Connections:')
    if conn_section >= 0:
        conn_end = content.find('\n}', conn_section)
        conn_block = content[conn_section:conn_end if conn_end > 0 else conn_section + 50000]
        
        # Find OO (object-object) and OP (object-property) connections
        # C: "OO","<id1>","<id2>"
        # C: "OP","<id1>","<id2>","<property>"
        oo_pattern = r'C:\s*"OO",\s*"([^"]+)",\s*"([^"]+)"'
        op_pattern = r'C:\s*"OP",\s*"([^"]+)",\s*"([^"]+)",\s*"([^"]+)"'
        
        oo_conns = re.findall(oo_pattern, conn_block)
        op_conns = re.findall(op_pattern, conn_block)
        
        # Build ID to name mapping
        id_to_name = {}
        for mid, mname in models:
            id_to_name[mid] = f"Model::{mname}"
        for gid, gname in geometries:
            id_to_name[gid] = f"Geometry::{gname}"
        for tid, tname in textures:
            id_to_name[tid] = f"Texture::{tname}"
        for vid, vname in videos:
            id_to_name[vid] = f"Video::{vname}"
        for mid, mname in materials:
            id_to_name[mid] = f"Material::{mname}"
        
        print("Object-Object connections:")
        for id1, id2 in oo_conns:
            name1 = id_to_name.get(id1, id1)
            name2 = id_to_name.get(id2, id2)
            print(f"  {name1} -> {name2}")
        
        print()
        print("Object-Property connections:")
        for id1, id2, prop in op_conns:
            name1 = id_to_name.get(id1, id1)
            name2 = id_to_name.get(id2, id2)
            print(f"  {name1} -> {name2} ({prop})")

if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else r"E:\document\Edge file\20260705002920_07341d5e.fbx"
    print(f"Parsing: {filepath}")
    print()
    parse_ascii_fbx(filepath)
