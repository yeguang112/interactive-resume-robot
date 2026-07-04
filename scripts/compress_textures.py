"""
压缩蝴蝶纹理：将 4 张纹理缩放到 512x512 并压缩
只保留 base_color（主要外观），其他用小尺寸或跳过
"""
from PIL import Image
import os

models_dir = r"D:\workbuddy space\art personal\interactive-resume-robot\public\models"

textures = [
    ("butterfly_base_color.png", 512),   # 主纹理，缩到 512
    ("butterfly_normal.png", 256),        # 法线贴图，缩到 256
]

for filename, target_size in textures:
    path = os.path.join(models_dir, filename)
    if not os.path.exists(path):
        print(f"  SKIP: {filename} not found")
        continue
    
    orig_size = os.path.getsize(path) / 1024
    print(f"  {filename}: {orig_size:.0f} KB -> resizing to {target_size}px")
    
    img = Image.open(path)
    print(f"    Original: {img.size} {img.mode}")
    
    # Resize using LANCZOS for quality
    img = img.resize((target_size, target_size), Image.LANCZOS)
    
    # Convert to RGB if needed (for JPEG-like compression in PNG)
    if img.mode == 'RGBA':
        # Keep RGBA for potential transparency
        pass
    elif img.mode != 'RGB':
        img = img.convert('RGB')
    
    # Save optimized PNG
    img.save(path, 'PNG', optimize=True)
    new_size = os.path.getsize(path) / 1024
    print(f"    Resized: {img.size} -> {new_size:.0f} KB")

# Delete roughness and metallic (not needed for cursor)
for f in ["butterfly_roughness.png", "butterfly_metallic.png"]:
    path = os.path.join(models_dir, f)
    if os.path.exists(path):
        os.remove(path)
        print(f"  Deleted: {f}")

# Show final models directory
print("\n=== Final models directory ===")
for f in sorted(os.listdir(models_dir)):
    size = os.path.getsize(os.path.join(models_dir, f))
    print(f"  {f}: {size/1024:.1f} KB")
