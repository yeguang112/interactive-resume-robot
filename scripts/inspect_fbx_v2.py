"""
Parse FBX binary file to extract model structure.
"""
import struct
import sys

def read_fbx_binary(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
    
    file_size_mb = round(len(data) / 1024 / 1024, 1)
    print(f"File size: {file_size_mb} MB")
    
    # Header: "Kaydara FBX Binary  " (21 bytes)
    header_str = b'Kaydara FBX Binary  '
    print(f"Header bytes: {data[:23]}")
    print(f"Header match: {data[:21] == header_str}")
    
    if data[:21] != header_str:
        print(f"First 30 bytes hex: {data[:30].hex()}")
        # Try to find the header
        idx = data.find(b'Kaydara')
        print(f"Found 'Kaydara' at offset: {idx}")
        return None
    
    version = struct.unpack('<I', data[23:27])[0]
    print(f"FBX Version: {version}")
    print()
    
    offset = 27
    nodes = []
    
    def read_string(data, offset, length):
        return data[offset:offset+length].decode('utf-8', errors='replace')
    
    def read_property(data, offset):
        """Read a single property, return (type_str, value, new_offset)"""
        if offset >= len(data):
            return None, None, offset
        
        prop_type = data[offset:offset+1]
        offset += 1
        
        if prop_type == b'S':
            length = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            value = read_string(data, offset, length)
            offset += length
            return 'String', value, offset
        elif prop_type == b'R':
            length = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            value = data[offset:offset+length]
            offset += length
            return 'Raw', f'{length} bytes', offset
        elif prop_type == b'I':
            value = struct.unpack('<i', data[offset:offset+4])[0]
            offset += 4
            return 'Int32', value, offset
        elif prop_type == b'Y':
            value = struct.unpack('<h', data[offset:offset+2])[0]
            offset += 2
            return 'Int16', value, offset
        elif prop_type == b'L':
            value = struct.unpack('<q', data[offset:offset+8])[0]
            offset += 8
            return 'Int64', value, offset
        elif prop_type == b'F':
            value = struct.unpack('<f', data[offset:offset+4])[0]
            offset += 4
            return 'Float32', value, offset
        elif prop_type == b'D':
            value = struct.unpack('<d', data[offset:offset+8])[0]
            offset += 8
            return 'Float64', value, offset
        elif prop_type == b'C':
            value = data[offset]
            offset += 1
            return 'Bool', bool(value), offset
        elif prop_type in (b'i', b'f', b'd', b'l', b'b'):
            # Array type
            elem_size = {'i': 4, 'f': 4, 'd': 8, 'l': 8, 'b': 1}[prop_type.decode()]
            array_length = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            encoding = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            comp_length = struct.unpack('<I', data[offset:offset+4])[0]
            offset += 4
            
            if encoding == 0:  # Uncompressed
                if prop_type == b'f':
                    vals = []
                    for j in range(min(array_length, 20)):
                        v = struct.unpack('<f', data[offset+j*4:offset+j*4+4])[0]
                        vals.append(round(v, 6))
                    value = f'{array_length} items: {vals}...' if array_length > 20 else str(vals)
                elif prop_type == b'd':
                    vals = []
                    for j in range(min(array_length, 20)):
                        v = struct.unpack('<d', data[offset+j*8:offset+j*8+8])[0]
                        vals.append(round(v, 6))
                    value = f'{array_length} items: {vals}...' if array_length > 20 else str(vals)
                elif prop_type == b'i':
                    vals = []
                    for j in range(min(array_length, 20)):
                        v = struct.unpack('<i', data[offset+j*4:offset+j*4+4])[0]
                        vals.append(v)
                    value = f'{array_length} items: {vals}...' if array_length > 20 else str(vals)
                elif prop_type == b'l':
                    vals = []
                    for j in range(min(array_length, 20)):
                        v = struct.unpack('<q', data[offset+j*8:offset+j*8+8])[0]
                        vals.append(v)
                    value = f'{array_length} items: {vals}...' if array_length > 20 else str(vals)
                else:
                    value = f'{array_length} items'
            else:  # zlib compressed
                value = f'{array_length} items (zlib compressed, {comp_length} bytes)'
            
            offset += comp_length
            return f'{prop_type.decode()}Array', value, offset
        else:
            return f'Unknown({prop_type})', None, offset
    
    def read_node(offset, depth=0):
        if offset + 13 > len(data):
            return None, offset
        
        end_offset = struct.unpack('<I', data[offset:offset+4])[0]
        if end_offset == 0:
            return None, offset + 4
        
        num_properties = struct.unpack('<I', data[offset+4:offset+8])[0]
        property_list_len = struct.unpack('<I', data[offset+8:offset+12])[0]
        name_len = data[offset+12]
        
        name = data[offset+13:offset+13+name_len].decode('ascii', errors='replace')
        
        prop_offset = offset + 13 + name_len
        properties = []
        
        for _ in range(num_properties):
            ptype, pvalue, prop_offset = read_property(data, prop_offset)
            if ptype is None:
                break
            properties.append((ptype, pvalue))
        
        child_offset = prop_offset
        children = []
        
        if end_offset > child_offset:
            while child_offset < end_offset and child_offset < len(data):
                child, new_offset = read_node(child_offset, depth + 1)
                if child is None:
                    break
                children.append(child)
                child_offset = new_offset
        
        return {
            'name': name,
            'properties': properties,
            'children': children,
            'depth': depth,
            'offset': offset,
            'end_offset': end_offset
        }, end_offset
    
    # Read top-level nodes
    while offset < len(data):
        node, new_offset = read_node(offset)
        if node is None:
            break
        nodes.append(node)
        offset = new_offset
    
    return nodes


def extract_model_info(nodes):
    """Extract Model, Geometry, Texture, Material info from parsed nodes"""
    results = {'models': [], 'geometries': [], 'textures': [], 'materials': [], 'videos': []}
    
    def traverse(node):
        name = node['name']
        props = node['properties']
        
        if name == 'Model' and len(props) >= 2:
            obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
            obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
            
            translation = None
            rotation = None
            scaling = None
            
            for child in node['children']:
                if child['name'] == 'Properties70':
                    for prop in child['children']:
                        if prop['name'] == 'P' and len(prop['properties']) >= 5:
                            pname = prop['properties'][0][1] if prop['properties'][0][0] == 'String' else ''
                            if pname == 'Lcl Translation':
                                vals = [p[1] for p in prop['properties'][1:] if isinstance(p[1], (int, float))]
                                if len(vals) >= 3:
                                    translation = [round(v, 6) for v in vals[:3]]
                            elif pname == 'Lcl Rotation':
                                vals = [p[1] for p in prop['properties'][1:] if isinstance(p[1], (int, float))]
                                if len(vals) >= 3:
                                    rotation = [round(v, 6) for v in vals[:3]]
                            elif pname == 'Lcl Scaling':
                                vals = [p[1] for p in prop['properties'][1:] if isinstance(p[1], (int, float))]
                                if len(vals) >= 3:
                                    scaling = [round(v, 6) for v in vals[:3]]
            
            results['models'].append({
                'id': obj_id,
                'name': obj_name,
                'translation': translation,
                'rotation': rotation,
                'scaling': scaling,
            })
        
        elif name == 'Geometry' and len(props) >= 2:
            obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
            obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
            
            vertex_count = 0
            poly_count = 0
            has_normals = False
            has_uv = False
            bbox_min = None
            bbox_max = None
            
            for child in node['children']:
                if child['name'] == 'Vertices':
                    for p in child['properties']:
                        import re
                        nums = re.findall(r'(\d+) items', str(p[1]))
                        if nums:
                            vertex_count = int(nums[0]) // 3
                elif child['name'] == 'PolygonVertexIndex':
                    for p in child['properties']:
                        import re
                        nums = re.findall(r'(\d+) items', str(p[1]))
                        if nums:
                            poly_count = int(nums[0])
                elif child['name'] == 'Normals':
                    has_normals = True
                elif child['name'] == 'UVIndex' or child['name'] == 'UV':
                    has_uv = True
                elif child['name'] == 'Geometry' and len(child['properties']) >= 3:
                    # Bounding box info might be here
                    pass
            
            results['geometries'].append({
                'id': obj_id,
                'name': obj_name,
                'vertex_count': vertex_count,
                'poly_count': poly_count,
                'has_normals': has_normals,
                'has_uv': has_uv,
            })
        
        elif name == 'Texture' and len(props) >= 2:
            obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
            obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
            
            filename = None
            for child in node['children']:
                if child['name'] == 'FileName' and child['properties']:
                    filename = child['properties'][0][1]
            
            results['textures'].append({
                'id': obj_id,
                'name': obj_name,
                'filename': filename,
            })
        
        elif name == 'Video' and len(props) >= 2:
            obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
            obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
            
            filename = None
            has_content = False
            for child in node['children']:
                if child['name'] == 'FileName' and child['properties']:
                    filename = child['properties'][0][1]
                elif child['name'] == 'Content':
                    has_content = True
            
            results['videos'].append({
                'id': obj_id,
                'name': obj_name,
                'filename': filename,
                'has_content': has_content,
            })
        
        elif name == 'Material' and len(props) >= 2:
            obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
            obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
            results['materials'].append({
                'id': obj_id,
                'name': obj_name,
            })
        
        elif name == 'Connections':
            # Extract connections
            for child in node['children']:
                if child['name'] == 'C' and len(child['properties']) >= 3:
                    conn_type = child['properties'][0][1] if child['properties'][0][0] == 'String' else ''
                    id1 = child['properties'][1][1] if child['properties'][1][0] == 'String' else str(child['properties'][1])
                    id2 = child['properties'][2][1] if child['properties'][2][0] == 'String' else str(child['properties'][2])
                    prop_name = child['properties'][3][1] if len(child['properties']) > 3 and child['properties'][3][0] == 'String' else None
                    
                    if not hasattr(results, 'connections'):
                        results['connections'] = []
                    results.setdefault('connections', []).append({
                        'type': conn_type,
                        'id1': id1,
                        'id2': id2,
                        'property': prop_name,
                    })
        
        for child in node['children']:
            traverse(child)
    
    for node in nodes:
        traverse(node)
    
    return results


if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else r"E:\document\Edge file\20260705002920_07341d5e.fbx"
    print(f"Parsing: {filepath}")
    print()
    
    nodes = read_fbx_binary(filepath)
    if nodes is None:
        print("Failed to parse FBX")
        sys.exit(1)
    
    print(f"Parsed {len(nodes)} top-level nodes")
    print(f"Top-level node names: {[n['name'] for n in nodes]}")
    print()
    
    info = extract_model_info(nodes)
    
    # Build ID to name mapping
    id_to_name = {}
    for m in info['models']:
        id_to_name[m['id']] = f"Model::{m['name']}"
    for g in info['geometries']:
        id_to_name[g['id']] = f"Geometry::{g['name']}"
    for t in info['textures']:
        id_to_name[t['id']] = f"Texture::{t['name']}"
    for v in info['videos']:
        id_to_name[v['id']] = f"Video::{v['name']}"
    for m in info['materials']:
        id_to_name[m['id']] = f"Material::{m['name']}"
    
    print(f"=== Models ({len(info['models'])}) ===\n")
    for m in info['models']:
        print(f"  Name: {m['name']}")
        print(f"  ID: {m['id']}")
        if m['translation']:
            print(f"  Translation: {m['translation']}")
        if m['rotation']:
            print(f"  Rotation: {m['rotation']}")
        if m['scaling']:
            print(f"  Scaling: {m['scaling']}")
        print()
    
    print(f"=== Geometries ({len(info['geometries'])}) ===\n")
    for g in info['geometries']:
        print(f"  Name: {g['name']}")
        print(f"  ID: {g['id']}")
        print(f"  Vertices: {g['vertex_count']}")
        print(f"  Polygons: {g['poly_count']}")
        print(f"  Normals: {'Yes' if g['has_normals'] else 'No'}")
        print(f"  UV: {'Yes' if g['has_uv'] else 'No'}")
        print()
    
    print(f"=== Textures ({len(info['textures'])}) ===\n")
    for t in info['textures']:
        print(f"  Name: {t['name']}")
        if t['filename']:
            print(f"  File: {t['filename']}")
        print()
    
    print(f"=== Videos ({len(info['videos'])}) ===\n")
    for v in info['videos']:
        print(f"  Name: {v['name']}")
        if v['filename']:
            print(f"  File: {v['filename']}")
        print(f"  Has embedded content: {'Yes' if v['has_content'] else 'No'}")
        print()
    
    print(f"=== Materials ({len(info['materials'])}) ===\n")
    for m in info['materials']:
        print(f"  Name: {m['name']}")
        print()
    
    connections = info.get('connections', [])
    print(f"=== Connections ({len(connections)}) ===\n")
    for c in connections:
        name1 = id_to_name.get(c['id1'], c['id1'])
        name2 = id_to_name.get(c['id2'], c['id2'])
        if c['property']:
            print(f"  {name1} --[{c['property']}]--> {name2}")
        else:
            print(f"  {name1} --> {name2}")
