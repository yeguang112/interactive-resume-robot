"""
从 FBX 二进制文件中提取嵌入的 PNG 纹理
"""
import os
import struct

fbx_path = r"E:\document\Edge file\20260705010549_400ad0ac.fbx"
output_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"

# PNG signatures
PNG_START = b'\x89PNG\r\n\x1a\n'
PNG_IEND = b'IEND\xae\x42\x60\x82'

print(f"Scanning FBX for embedded PNG textures...")
print(f"File size: {os.path.getsize(fbx_path) / 1024 / 1024:.1f} MB")

with open(fbx_path, 'rb') as f:
    data = f.read()

print(f"Read {len(data)} bytes")

# Find all PNG starts
positions = []
start = 0
while True:
    pos = data.find(PNG_START, start)
    if pos == -1:
        break
    positions.append(pos)
    start = pos + 1

print(f"Found {len(positions)} PNG images")

texture_names = ['base_color', 'normal', 'roughness', 'metallic']

for i, pos in enumerate(positions):
    # Find the IEND marker after this PNG start
    end_pos = data.find(PNG_IEND, pos)
    if end_pos == -1:
        print(f"  PNG {i}: No IEND found, skipping")
        continue
    
    # Include the IEND marker itself
    png_data = data[pos:end_pos + len(PNG_IEND)]
    
    name = texture_names[i] if i < len(texture_names) else f"texture_{i}"
    out_path = os.path.join(output_dir, f"butterfly_{name}.png")
    
    with open(out_path, 'wb') as f:
        f.write(png_data)
    
    size_kb = len(png_data) / 1024
    print(f"  {name}: {size_kb:.1f} KB -> {out_path}")

print("\nDone!")
