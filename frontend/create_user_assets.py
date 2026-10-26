import os
import struct
import zlib

def make_png(r, g, b, width=128, height=128):
    # Generates a solid color PNG image in memory without any external libraries
    pixel_data = bytearray()
    for y in range(height):
        pixel_data.append(0) # Filter type 0 (None)
        for x in range(width):
            pixel_data.extend([r, g, b, 255])
            
    png_sig = b'\x89PNG\r\n\x1a\n'
    
    def make_chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
        
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0) # 8-bit RGBA
    idat = zlib.compress(pixel_data)
    
    return png_sig + make_chunk(b'IHDR', ihdr) + make_chunk(b'IDAT', idat) + make_chunk(b'IEND', b'')

def make_hair_silhouette(r, g, b, width=128, height=128):
    # Generates a simple, elegant hair silhouette PNG
    pixel_data = bytearray()
    for y in range(height):
        pixel_data.append(0)
        for x in range(width):
            # Mathematical formula to draw a stylized head and hair silhouette
            cx, cy = x - width / 2, y - height / 2
            # Hair shape: hair bun or top volume
            is_hair = (cx*cx + (cy+10)*(cy+10) < 35*35) or (abs(cx) < 40 and cy < 10 and cy > -45)
            # Head/face shape: simple oval to cut out
            is_face = (cx*cx + cy*cy < 25*25)
            
            if is_hair and not (is_face and cy > -10):
                pixel_data.extend([r, g, b, 255]) # Hair color
            elif is_face:
                pixel_data.extend([245, 222, 179, 255]) # Wheat skin color
            else:
                pixel_data.extend([250, 249, 246, 255]) # Warm background
                
    png_sig = b'\x89PNG\r\n\x1a\n'
    def make_chunk(tag, data):
        return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data))
    ihdr = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(pixel_data)
    return png_sig + make_chunk(b'IHDR', ihdr) + make_chunk(b'IDAT', idat) + make_chunk(b'IEND', b'')

def main():
    public_dir = os.path.join(os.getcwd(), 'public')
    assets_dir = os.path.join(public_dir, 'assets')
    color_dir = os.path.join(assets_dir, 'color')
    hair_dir = os.path.join(assets_dir, 'hair')
    overlay_dir = os.path.join(assets_dir, 'overlay')

    # Ensure directories exist
    for d in [color_dir, hair_dir, overlay_dir]:
        os.makedirs(d, exist_ok=True)

    # 1. Generate hair colors
    colors = [
        ("ash blonde hair.jpg", (184, 170, 145)),
        ("blue.jpg", (30, 64, 175)),
        ("Champagne Blonde.jpg", (230, 210, 180)),
        ("chanom.png", (210, 144, 98)),
        ("Copper Brown.jpg", (178, 90, 56)),
        ("orange.png", (249, 115, 22)),
        ("purple.png", (124, 58, 237)),
        ("red_brown_hair.jpeg", (158, 42, 43)),
        ("Rose Gold.jpg", (183, 110, 121)),
        ("smoke.png", (112, 128, 144))
    ]

    for filename, rgb in colors:
        path = os.path.join(color_dir, filename)
        # Use png payload but save as correct suffix (browsers can handle png header with .jpg suffix perfectly!)
        data = make_png(rgb[0], rgb[1], rgb[2])
        with open(path, 'wb') as f:
            f.write(data)
        print(f"Generated color asset: {filename}")

    # 2. Generate hair shape silhouettes
    hairs = [
        "Blunt Bob.png",
        "Bob.jpg",
        "Build Perm.png",
        "Comma.png",
        "Curtain.jpg",
        "Korean Long Layered Perm.jpg",
        "Korean Short Bob.png",
        "Modern Quiff.jpg",
        "Pompadour.png",
        "two-block.jpg"
    ]

    for filename in hairs:
        path = os.path.join(hair_dir, filename)
        # Generate a stylized dark brown hair silhouette
        data = make_hair_silhouette(74, 53, 40)
        with open(path, 'wb') as f:
            f.write(data)
        print(f"Generated hair shape asset: {filename}")

    # 3. Handle missing overlays by copying an existing overlay as fallback if needed
    existing_overlays = [f for f in os.listdir(overlay_dir) if f.endswith('_overlay.png')]
    if existing_overlays:
        source_overlay = os.path.join(overlay_dir, existing_overlays[0])
        missing_overlays = [
            "Blunt Bob_overlay.png",
            "Bob_overlay.png",
            "Build Perm_overlay.png"
        ]
        for filename in missing_overlays:
            path = os.path.join(overlay_dir, filename)
            if not os.path.exists(path):
                with open(source_overlay, 'rb') as sf:
                    data = sf.read()
                with open(path, 'wb') as df:
                    df.write(data)
                print(f"Copied overlay fallback for: {filename}")

if __name__ == "__main__":
    main()
