import os
import struct
import zlib
import math

COLOR_MAP = [
    ("C01_deep_teal.png", (13, 92, 117), "Deep Teal"),
    ("C02_caramel_brown.png", (133, 77, 39), "Caramel Brown"),
    ("C03_muted_mint_green.png", (106, 154, 139), "Muted Mint Green"),
    ("C04_ash_beige_blonde.png", (194, 178, 157), "Ash Beige Blonde"),
    ("C05_rose_pink.png", (209, 102, 130), "Rose Pink"),
    ("C06_cherry_red.png", (158, 27, 50), "Cherry Red"),
    ("C07_dusty_rose_gold.png", (183, 110, 121), "Dusty Rose Gold"),
    ("C08_milk_tea_brown.png", (184, 134, 101), "Milk Tea Brown"),
    ("C09_silver_blue.png", (143, 169, 186), "Silver Blue"),
    ("C10_brown_with_beige_highlights.png", (110, 71, 59), "Brown with Beige Highlights"),
    ("C11_natural_black.jpg", (26, 26, 26), "Natural Black"),
    ("C12_deep_emerald_green.png", (9, 82, 56), "Deep Emerald Green"),
    ("C13_violet_ash_grey.png", (116, 109, 130), "Violet Ash Grey"),
    ("C14_burgundy_wine_red.png", (110, 26, 36), "Burgundy Wine Red"),
    ("C15_smoky_blue_grey.png", (94, 109, 122), "Smoky Blue Grey"),
    ("C16_cream_blonde.png", (232, 220, 190), "Cream Blonde"),
    ("C17_bright_copper_orange.png", (211, 95, 41), "Bright Copper Orange"),
    ("C18_deep_plum_purple.png", (74, 25, 54), "Deep Plum Purple"),
    ("C19_silver_lavender.png", (184, 178, 203), "Silver Lavender"),
    ("C20_deep_magenta.png", (153, 27, 92), "Deep Magenta"),
    ("C21_purple_with_rose_pink_highlights.jpg", (107, 53, 94), "Purple with Rose Pink Highlights"),
    ("C22_violet_purple.png", (96, 40, 130), "Violet Purple"),
    ("C23_deep_dusty_pink.png", (158, 71, 112), "Deep Dusty Pink"),
    ("C24_bright_rose_pink.png", (224, 82, 133), "Bright Rose Pink"),
    ("C25_vivid_golden_yellow.png", (230, 168, 23), "Vivid Golden Yellow"),
    ("C26_pastel_blue.png", (142, 197, 252), "Pastel Blue"),
    ("C27_lavender_purple.png", (159, 132, 189), "Lavender Purple"),
    ("C28_deep_copper_orange.png", (194, 83, 37), "Deep Copper Orange"),
]

def create_silky_hair_texture(base_r, base_g, base_b, width=400, height=500):
    raw_bytes = bytearray()
    
    strand_offsets = [(math.sin(i * 0.45) * 12 + math.cos(i * 1.25) * 8) for i in range(width)]
    
    for y in range(height):
        raw_bytes.append(0)  # Filter byte None
        ny = y / height
        
        # Specular gloss sheens (sheen across hair curve)
        spec1 = math.exp(-((ny - 0.36) ** 2) / 0.012)
        spec2 = math.exp(-((ny - 0.62) ** 2) / 0.022) * 0.45
        specular = spec1 + spec2
        
        # Depth gradient: slightly deeper shadows towards the roots (top) and ends (bottom)
        ambient = 0.72 + 0.28 * math.sin(ny * math.pi)
        
        for x in range(width):
            nx = x / width
            # Fine micro-strands simulating natural hair fibers
            strand1 = math.sin((x + strand_offsets[x] + y * 0.06) * 0.35) * 0.10
            strand2 = math.sin((x * 1.5 + y * 0.03)) * 0.05
            strand3 = math.cos((x * 0.8 - y * 0.04)) * 0.03
            
            brightness = ambient + specular * 0.55 + strand1 + strand2 + strand3
            
            # Subtle highlight desaturation / brightness boost for silky shine
            glow = specular * 55.0
            r = min(255, max(0, int(base_r * brightness + glow)))
            g = min(255, max(0, int(base_g * brightness + glow)))
            b = min(255, max(0, int(base_b * brightness + glow)))
            
            raw_bytes.extend([r, g, b, 255])
            
    png_sig = b"\x89PNG\r\n\x1a\n"
    def make_chunk(tag, data):
        return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data))
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6, 0, 0, 0)
    idat = zlib.compress(raw_bytes, 7)
    return png_sig + make_chunk(b"IHDR", ihdr) + make_chunk(b"IDAT", idat) + make_chunk(b"IEND", b"")

def main():
    target_dir = os.path.join(os.getcwd(), "public", "assets", "colors")
    os.makedirs(target_dir, exist_ok=True)
    
    for filename, rgb, name in COLOR_MAP:
        out_path = os.path.join(target_dir, filename)
        data = create_silky_hair_texture(rgb[0], rgb[1], rgb[2], 360, 450)
        with open(out_path, "wb") as f:
            f.write(data)
        print(f"Generated {filename} ({name}) -> {len(data)} bytes")

if __name__ == "__main__":
    main()
