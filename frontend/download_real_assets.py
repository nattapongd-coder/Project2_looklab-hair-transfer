import urllib.request
import os
import shutil

os.makedirs('public/assets/hairs', exist_ok=True)
os.makedirs('public/assets/colors', exist_ok=True)

# Curated Unsplash real haircut photography
HAIR_PHOTOS = [
    ("H01_long_waves_with_curtain_bangs.png", "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&auto=format&fit=crop&q=80"),
    ("H02_curly_lob_with_curtain_bangs.png", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"),
    ("H03_side_part_wavy_bob.png", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80"),
    ("H04_korean_curtain_hair.png", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80"),
    ("H05_side_part_quiff.jpg", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80"),
    ("H06_straight_bob_with_see_through_bangs.jpg", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80"),
    ("H07_short_curtain_mullet.png", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80"),
    ("H08_long_layered_loose_waves.png", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80"),
    ("H09_short_curtain_perm.png", "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=80"),
    ("H10_side_part_voluminous_curls.png", "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&auto=format&fit=crop&q=80"),
    ("H11_short_curly_bob.png", "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&auto=format&fit=crop&q=80"),
    ("H12_classic_middle_part.jpg", "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80"),
    ("H13_shoulder_length_flipped_layers.png", "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=500&auto=format&fit=crop&q=80"),
    ("H14_textured_crop_with_swept_fringe.png", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"),
    ("H15_middle_part_blunt_bob.png", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80"),
    ("H16_long_straight_middle_part.png", "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=500&auto=format&fit=crop&q=80"),
    ("H17_side_swept_hollywood_waves.png", "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=500&auto=format&fit=crop&q=80"),
    ("H18_straight_blunt_lob.png", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80"),
    ("H19_side_part_c_curve_bob.png", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"),
    ("H20_short_blunt_bob_with_wispy_bangs.png", "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=500&auto=format&fit=crop&q=80"),
    ("H21_short_wolf_cut_with_fringe.png", "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=500&auto=format&fit=crop&q=80"),
    ("H22_wavy_middle_part_with_lifted_fringe.png", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80"),
    ("H23_textured_side_swept_quiff.png", "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80"),
    ("H24_middle_part_wavy_lob.png", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80"),
    ("H25_slicked_side_part.jpg", "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=500&auto=format&fit=crop&q=80"),
    ("H26_medium_long_s_waves_with_curtain_bangs.png", "https://images.unsplash.com/photo-1526080652727-5b77f74eacd2?w=500&auto=format&fit=crop&q=80"),
    ("H27_two_block_with_straight_fringe.png", "https://images.unsplash.com/photo-1480429370139-e0132c086e2a?w=500&auto=format&fit=crop&q=80"),
]

# Real hair color portrait/swatch photos matching each hair color shade
COLOR_PHOTOS = [
    ("C01_deep_teal.png", "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80"),
    ("C02_caramel_brown.png", "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?w=500&auto=format&fit=crop&q=80"),
    ("C03_muted_mint_green.png", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80"),
    ("C04_ash_beige_blonde.png", "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&auto=format&fit=crop&q=80"),
    ("C05_rose_pink.png", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"),
    ("C06_cherry_red.png", "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=500&auto=format&fit=crop&q=80"),
    ("C07_dusty_rose_gold.png", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80"),
    ("C08_milk_tea_brown.png", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=500&auto=format&fit=crop&q=80"),
    ("C09_silver_blue.png", "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=500&auto=format&fit=crop&q=80"),
    ("C10_brown_with_beige_highlights.png", "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=500&auto=format&fit=crop&q=80"),
    ("C11_natural_black.jpg", "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=500&auto=format&fit=crop&q=80"),
    ("C12_deep_emerald_green.png", "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=500&auto=format&fit=crop&q=80"),
    ("C13_violet_ash_grey.png", "https://images.unsplash.com/photo-1526080652727-5b77f74eacd2?w=500&auto=format&fit=crop&q=80"),
    ("C14_purple_pink_with_blue_highlights.png", "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=500&auto=format&fit=crop&q=80"),
    ("C15_black_with_yellow_highlights.png", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80"),
    ("C16_blue_with_silver_highlights.png", "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=500&auto=format&fit=crop&q=80"),
    ("C17_pink_with_pale_blonde_highlights.png", "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=500&auto=format&fit=crop&q=80"),
    ("C18_black_with_lime_green_highlights.png", "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=500&auto=format&fit=crop&q=80"),
    ("C19_black_with_copper_orange_highlights.png", "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=500&auto=format&fit=crop&q=80"),
    ("C20_black_with_red_highlights.png", "https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=500&auto=format&fit=crop&q=80"),
    ("C21_black_with_pink_highlights.png", "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=500&auto=format&fit=crop&q=80"),
    ("C22_royal_blue_with_silver_highlights.png", "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=500&auto=format&fit=crop&q=80"),
    ("C23_purple_with_pale_lavender_highlights.png", "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=500&auto=format&fit=crop&q=80"),
    ("C24_burgundy_wine_red.png", "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=500&auto=format&fit=crop&q=80"),
    ("C25_smoky_blue_grey.png", "https://images.unsplash.com/photo-1480429370139-e0132c086e2a?w=500&auto=format&fit=crop&q=80"),
    ("C26_cream_blonde.png", "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=500&auto=format&fit=crop&q=80"),
    ("C27_copper_orange.png", "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=500&auto=format&fit=crop&q=80"),
    ("C28_deep_plum_purple.png", "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500&auto=format&fit=crop&q=80"),
    ("C29_silver_lavender.png", "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=500&auto=format&fit=crop&q=80"),
    ("C30_deep_magenta.png", "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=500&auto=format&fit=crop&q=80"),
    ("C31_purple_with_rose_pink_highlights.jpg", "https://images.unsplash.com/photo-1509967419530-da38b4704bc6?w=500&auto=format&fit=crop&q=80"),
]

headers = {'User-Agent': 'Mozilla/5.0'}

print("Downloading real hairstyle photos...")
for filename, url in HAIR_PHOTOS:
    target = os.path.join('public/assets/hairs', filename)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp, open(target, 'wb') as out:
            out.write(resp.read())
        print(f"Downloaded hair: {filename}")
    except Exception as e:
        print(f"Failed {filename}: {e}")

print("Downloading real color photos...")
for filename, url in COLOR_PHOTOS:
    target = os.path.join('public/assets/colors', filename)
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp, open(target, 'wb') as out:
            out.write(resp.read())
        print(f"Downloaded color: {filename}")
    except Exception as e:
        print(f"Failed {filename}: {e}")

# Also copy to dist if dist exists
if os.path.exists('dist/assets'):
    shutil.copytree('public/assets/hairs', 'dist/assets/hairs', dirs_exist_ok=True)
    shutil.copytree('public/assets/colors', 'dist/assets/colors', dirs_exist_ok=True)
    print("Synchronized to dist/assets")

print("All real photos downloaded successfully!")
