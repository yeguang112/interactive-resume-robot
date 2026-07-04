"""
Parse FBX binary file to extract node names, mesh data, and bounding boxes.
FBX binary format: header -> nested node structure
"""
import struct
import sys

def read_fbx_binary(filepath):
    with open(filepath, 'rb') as f:
        data = f.read()
    
    # Check header
    header = b'Kaydara FBX Binary  '
    if data[:21] != header:
        print("Not a valid FBX binary file")
        # Try ASCII
        if b'Kaydara FBX' in data[:100]:
            print("This is an ASCII FBX file")
        return
    
    version = struct.unpack('<I', data[23:27])[0]
    print(f"FBX Version: {version}")
    
    # Parse nodes
    offset = 27
    nodes = []
    
    def read_node(offset, depth=0):
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
            prop_type = data[prop_offset:prop_offset+1]
            prop_offset += 1
            
            if prop_type == b'S':  # String
                length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                value = data[prop_offset:prop_offset+length].decode('ascii', errors='replace')
                prop_offset += length
                properties.append(('String', value))
            elif prop_type == b'R':  # Raw bytes
                length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                value = data[prop_offset:prop_offset+length]
                prop_offset += length
                properties.append(('Raw', f'{length} bytes'))
            elif prop_type == b'I':  # Int32
                value = struct.unpack('<i', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                properties.append(('Int32', value))
            elif prop_type == b'Y':  # Int16
                value = struct.unpack('<h', data[prop_offset:prop_offset+2])[0]
                prop_offset += 2
                properties.append(('Int16', value))
            elif prop_type == b'L':  # Int64
                value = struct.unpack('<q', data[prop_offset:prop_offset+8])[0]
                prop_offset += 8
                properties.append(('Int64', value))
            elif prop_type == b'F':  # Float32
                value = struct.unpack('<f', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                properties.append(('Float32', value))
            elif prop_type == b'D':  # Float64
                value = struct.unpack('<d', data[prop_offset:prop_offset+8])[0]
                prop_offset += 8
                properties.append(('Float64', value))
            elif prop_type == b'C':  # Boolean
                value = data[prop_offset]
                prop_offset += 1
                properties.append(('Bool', bool(value)))
            elif prop_type == b'b':  # Array of bool
                array_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                encoding = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                comp_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                prop_offset += comp_length
                properties.append(('BoolArray', f'{array_length} items'))
            elif prop_type == b'i':  # Array of int32
                array_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                encoding = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                comp_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                if encoding == 0 and array_length <= 100:
                    vals = []
                    for j in range(min(array_length, 10)):
                        v = struct.unpack('<i', data[prop_offset+j*4:prop_offset+j*4+4])[0]
                        vals.append(v)
                    properties.append(('IntArray', f'{array_length} items: {vals}...' if array_length > 10 else f'{vals}'))
                else:
                    properties.append(('IntArray', f'{array_length} items (compressed={encoding})'))
                prop_offset += comp_length
            elif prop_type == f'l'.encode():  # Array of int64
                array_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                encoding = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                comp_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                prop_offset += comp_length
                properties.append(('Int64Array', f'{array_length} items'))
            elif prop_type == f'f'.encode():  # Array of float32
                array_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                encoding = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                comp_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                if encoding == 0 and array_length <= 30:
                    vals = []
                    for j in range(min(array_length, 10)):
                        v = struct.unpack('<f', data[prop_offset+j*4:prop_offset+j*4+4])[0]
                        vals.append(round(v, 4))
                    properties.append(('FloatArray', f'{array_length} items: {vals}...' if array_length > 10 else f'{vals}'))
                else:
                    properties.append(('FloatArray', f'{array_length} items (compressed={encoding})'))
                prop_offset += comp_length
            elif prop_type == f'd'.encode():  # Array of float64
                array_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                encoding = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                comp_length = struct.unpack('<I', data[prop_offset:prop_offset+4])[0]
                prop_offset += 4
                if encoding == 0 and array_length <= 30:
                    vals = []
                    for j in range(min(array_length, 10)):
                        v = struct.unpack('<d', data[prop_offset+j*8:prop_offset+j*8+8])[0]
                        vals.append(round(v, 4))
                    properties.append(('DoubleArray', f'{array_length} items: {vals}...' if array_length > 10 else f'{vals}'))
                else:
                    properties.append(('DoubleArray', f'{array_length} items (compressed={encoding})'))
                prop_offset += comp_length
            else:
                # Unknown property type, skip
                properties.append(('Unknown', f'type={prop_type}'))
                break
        
        # Now read child nodes
        child_offset = prop_offset
        children = []
        
        if end_offset > child_offset:
            while child_offset < end_offset:
                child, new_offset = read_node(child_offset, depth + 1)
                if child is None:
                    break
                children.append(child)
                child_offset = new_offset
        
        node = {
            'name': name,
            'properties': properties,
            'children': children,
            'depth': depth
        }
        
        return node, end_offset
    
    # Read top-level nodes
    while offset < len(data):
        node, new_offset = read_node(offset)
        if node is None:
            break
        nodes.append(node)
        offset = new_offset
    
    return nodes


def find_mesh_info(nodes, path=""):
    """Find Model and Geometry nodes, extract useful info"""
    results = []
    
    def traverse(node, path=""):
        name = node['name']
        props = node['properties']
        full_path = f"{path}/{name}" if path else name
        
        if name == 'Model':
            # Model node - has object id and name
            if len(props) >= 2:
                obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
                obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
                
                # Look for Properties70 in children
                translation = None
                rotation = None
                scaling = None
                for child in node['children']:
                    if child['name'] == 'Properties70':
                        for prop in child['children']:
                            if prop['name'] == 'P':
                                pname = prop['properties'][0][1] if prop['properties'] and prop['properties'][0][0] == 'String' else ''
                                if pname == 'Lcl Translation' and len(prop['properties']) >= 5:
                                    vals = [prop['properties'][i][1] for i in range(1, 5) if isinstance(prop['properties'][i][1], (int, float))]
                                    if len(vals) >= 3:
                                        translation = [round(v, 4) for v in vals[:3]]
                                elif pname == 'Lcl Rotation' and len(prop['properties']) >= 5:
                                    vals = [prop['properties'][i][1] for i in range(1, 5) if isinstance(prop['properties'][i][1], (int, float))]
                                    if len(vals) >= 3:
                                        rotation = [round(v, 4) for v in vals[:3]]
                                elif pname == 'Lcl Scaling' and len(prop['properties']) >= 5:
                                    vals = [prop['properties'][i][1] for i in range(1, 5) if isinstance(prop['properties'][i][1], (int, float))]
                                    if len(vals) >= 3:
                                        scaling = [round(v, 4) for v in vals[:3]]
                
                results.append({
                    'type': 'Model',
                    'id': obj_id,
                    'name': obj_name,
                    'translation': translation,
                    'rotation': rotation,
                    'scaling': scaling,
                    'path': full_path
                })
        
        elif name == 'Geometry':
            if len(props) >= 2:
                obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
                obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
                
                # Look for Vertices and PolygonVertexIndex in children
                vertex_count = 0
                poly_count = 0
                bbox_min = None
                bbox_max = None
                
                for child in node['children']:
                    if child['name'] == 'Vertices':
                        # Extract vertex count from the property
                        for p in child['properties']:
                            if 'Array' in str(p[0]):
                                import re
                                nums = re.findall(r'(\d+) items', str(p[1]))
                                if nums:
                                    vertex_count = int(nums[0]) // 3
                    elif child['name'] == 'PolygonVertexIndex':
                        for p in child['properties']:
                            if 'Array' in str(p[0]):
                                import re
                                nums = re.findall(r'(\d+) items', str(p[1]))
                                if nums:
                                    poly_count = int(nums[0])
                
                results.append({
                    'type': 'Geometry',
                    'id': obj_id,
                    'name': obj_name,
                    'vertex_count': vertex_count,
                    'poly_count': poly_count,
                    'path': full_path
                })
        
        elif name == 'Texture':
            if len(props) >= 2:
                obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
                obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
                
                # Find filename
                filename = None
                for child in node['children']:
                    if child['name'] == 'FileName':
                        if child['properties']:
                            filename = child['properties'][0][1]
                
                results.append({
                    'type': 'Texture',
                    'id': obj_id,
                    'name': obj_name,
                    'filename': filename,
                    'path': full_path
                })
        
        elif name == 'Material':
            if len(props) >= 2:
                obj_id = props[0][1] if props[0][0] == 'String' else str(props[0])
                obj_name = props[1][1] if props[1][0] == 'String' else str(props[1])
                results.append({
                    'type': 'Material',
                    'id': obj_id,
                    'name': obj_name,
                    'path': full_path
                })
        
        # Traverse children
        for child in node['children']:
            traverse(child, full_path)
    
    for node in nodes:
        traverse(node)
    
    return results


if __name__ == '__main__':
    filepath = sys.argv[1] if len(sys.argv) > 1 else r"E:\document\Edge file\20260705002920_07341d5e.fbx"
    print(f"Parsing: {filepath}")
    print(f"File size: {round(len(open(filepath, 'rb').read()) / 1024 / 1024, 1)} MB")
    print()
    
    nodes = read_fbx_binary(filepath)
    if nodes:
        info = find_mesh_info(nodes)
        
        print(f"=== Found {len(info)} objects ===\n")
        
        models = [i for i in info if i['type'] == 'Model']
        geometries = [i for i in info if i['type'] == 'Geometry']
        textures = [i for i in info if i['type'] == 'Texture']
        materials = [i for i in info if i['type'] == 'Material']
        
        print(f"--- Models ({len(models)}) ---")
        for m in models:
            print(f"  Name: {m['name']}")
            print(f"  ID: {m['id']}")
            if m['translation']:
                print(f"  Translation: {m['translation']}")
            if m['rotation']:
                print(f"  Rotation: {m['rotation']}")
            if m['scaling']:
                print(f"  Scaling: {m['scaling']}")
            print()
        
        print(f"--- Geometries ({len(geometries)}) ---")
        for g in geometries:
            print(f"  Name: {g['name']}")
            print(f"  ID: {g['id']}")
            print(f"  Vertices: {g['vertex_count']}")
            print(f"  Polygons: {g['poly_count']}")
            print()
        
        print(f"--- Textures ({len(textures)}) ---")
        for t in textures:
            print(f"  Name: {t['name']}")
            if t['filename']:
                print(f"  File: {t['filename']}")
            print()
        
        print(f"--- Materials ({len(materials)}) ---")
        for m in materials:
            print(f"  Name: {m['name']}")
            print()
