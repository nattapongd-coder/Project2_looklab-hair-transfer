import { Hairstyle, HairColor } from "./types";

// Helper function to normalize strings for robust matching across spaces, hyphens, and underscores
export function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[-_]/g, " ").replace(/\s+/g, " ").trim();
}

// Layout configurations for hairstyles (h01 to h23)
export const HAIR_LAYOUT_CONFIGS: Record<string, { scaleX: number; scaleY: number; offsetX: number; offsetY: number; isFlipped?: boolean }> = {
  "h01": { scaleX: 3.2, scaleY: 2.8, offsetX: 0.05, offsetY: 0.45, isFlipped: true },
  "h02": { scaleX: 2.8, scaleY: 2.3, offsetX: 0.04, offsetY: 0.35, isFlipped: true },
  "h03": { scaleX: 2.6, scaleY: 2.1, offsetX: 0.02, offsetY: 0.25, isFlipped: true },
  "h04": { scaleX: 2.5, scaleY: 2.0, offsetX: 0.03, offsetY: 0.15, isFlipped: true },
  "h05": { scaleX: 2.7, scaleY: 2.2, offsetX: 0.03, offsetY: 0.25, isFlipped: true },
  "h06": { scaleX: 3.2, scaleY: 2.8, offsetX: 0.05, offsetY: 0.48, isFlipped: true },
  "h07": { scaleX: 2.6, scaleY: 2.1, offsetX: 0.03, offsetY: 0.22, isFlipped: true },
  "h08": { scaleX: 3.2, scaleY: 2.8, offsetX: 0.05, offsetY: 0.45, isFlipped: true },
  "h09": { scaleX: 2.7, scaleY: 2.2, offsetX: 0.04, offsetY: 0.30, isFlipped: true },
  "h10": { scaleX: 2.5, scaleY: 2.0, offsetX: 0.02, offsetY: 0.20, isFlipped: true },
  "h11": { scaleX: 2.4, scaleY: 1.9, offsetX: 0.02, offsetY: 0.12, isFlipped: true },
  "h12": { scaleX: 2.8, scaleY: 2.3, offsetX: 0.04, offsetY: 0.35, isFlipped: true },
  "h13": { scaleX: 3.2, scaleY: 2.8, offsetX: 0.06, offsetY: 0.46, isFlipped: true },
  "h14": { scaleX: 2.9, scaleY: 2.4, offsetX: 0.04, offsetY: 0.38, isFlipped: true },
  "h15": { scaleX: 2.8, scaleY: 2.3, offsetX: 0.04, offsetY: 0.34, isFlipped: true },
  "h16": { scaleX: 2.7, scaleY: 2.2, offsetX: 0.04, offsetY: 0.32, isFlipped: true },
  "h17": { scaleX: 2.8, scaleY: 2.3, offsetX: 0.03, offsetY: 0.28, isFlipped: true },
  "h18": { scaleX: 2.6, scaleY: 2.1, offsetX: 0.02, offsetY: 0.20, isFlipped: true },
  "h19": { scaleX: 2.5, scaleY: 2.0, offsetX: 0.03, offsetY: 0.15, isFlipped: true },
  "h20": { scaleX: 3.0, scaleY: 2.5, offsetX: 0.04, offsetY: 0.40, isFlipped: true },
  "h21": { scaleX: 2.4, scaleY: 1.9, offsetX: 0.02, offsetY: 0.12, isFlipped: true },
  "h22": { scaleX: 3.1, scaleY: 2.7, offsetX: 0.05, offsetY: 0.44, isFlipped: true },
  "h23": { scaleX: 2.5, scaleY: 2.0, offsetX: 0.02, offsetY: 0.15, isFlipped: true },
};

export function getHairLayoutConfig(key: string) {
  const normKey = normalizeKey(key);
  for (const [configKey, value] of Object.entries(HAIR_LAYOUT_CONFIGS)) {
    if (normalizeKey(configKey) === normKey || normKey.startsWith(configKey)) {
      return value;
    }
  }
  return { scaleX: 2.8, scaleY: 2.3, offsetX: 0.04, offsetY: 0.35, isFlipped: true };
}

// Original Natural Hairstyle option (Keep original hairstyle, only change hair color)
export const ORIGINAL_HAIRSTYLE: Hairstyle = {
  id: "original_style",
  name: "ทรงผมต้นฉบับ",
  englishName: "Original Hairstyle",
  description: "คงรูปทรงผมเดิมจากรูปถ่ายหรือกล้องของคุณ สำหรับผู้ที่ต้องการทดลองเปลี่ยนเฉพาะเฉดสีผมใหม่",
  gender: "unisex",
  tags: ["Original", "Natural", "ColorOnly"],
  isTrending: false,
  thumbnail: "",
  shapeReference: "original",
  previewOverlay: "",
  scaleX: 1,
  scaleY: 1,
  offsetX: 0,
  offsetY: 0,
};

// Full Hairstyles list matching all 23 files in /public/assets/hairs
export const HAIRSTYLES: Hairstyle[] = [
  ORIGINAL_HAIRSTYLE,
  {
    id: "h01-long-waves-curtain-bangs",
    name: "ลอนยาวหน้าม้าเคอร์เทน",
    englishName: "Long Waves with Curtain Bangs",
    description: "ผมยาวดัดลอนคลื่นนุ่มนวล พร้อมหน้าม้าปัดข้างเคอร์เทน ช่วยพรางกรอบหน้าให้ดูเรียวละมุน มีเสน่ห์หวานละมุน",
    gender: "female",
    tags: ["Long", "Waves", "Curtain"],
    isTrending: true,
    thumbnail: "/assets/hairs/H01_long_waves_with_curtain_bangs.png",
    shapeReference: "/assets/hairs/H01_long_waves_with_curtain_bangs.png",
    previewOverlay: "/assets/hairs/H01_long_waves_with_curtain_bangs.png",
    ...getHairLayoutConfig("h01"),
  },
  {
    id: "h02-side-part-wavy-bob",
    name: "บ็อบลอนแสกข้าง",
    englishName: "Side Part Wavy Bob",
    description: "บ็อบสั้นแสกข้างดัดลอนคลาย มอบลุคสาวมั่นทันสมัย มีเสน่ห์แบบโมเดิร์นคลาสสิก",
    gender: "female",
    tags: ["Bob", "Wavy", "SidePart"],
    isTrending: true,
    thumbnail: "/assets/hairs/H02_side_part_wavy_bob.png",
    shapeReference: "/assets/hairs/H02_side_part_wavy_bob.png",
    previewOverlay: "/assets/hairs/H02_side_part_wavy_bob.png",
    ...getHairLayoutConfig("h02"),
  },
  {
    id: "h03-korean-curtain-hair",
    name: "เคอร์เทนสไตล์เกาหลี",
    englishName: "Korean Curtain Hair",
    description: "ทรงผมแสกกลางปัดเคอร์เทนสไตล์เกาหลี ให้ลุคสุภาพ อบอุ่น และดูดีเป็นธรรมชาติ เหมาะกับทุกเพศ",
    gender: "unisex",
    tags: ["Korean", "Curtain", "Unisex", "Trending"],
    isTrending: true,
    thumbnail: "/assets/hairs/H03_korean_curtain_hair.png",
    shapeReference: "/assets/hairs/H03_korean_curtain_hair.png",
    previewOverlay: "/assets/hairs/H03_korean_curtain_hair.png",
    ...getHairLayoutConfig("h03"),
  },
  {
    id: "h04-side-part-quiff",
    name: "ควิฟฟ์แสกข้าง",
    englishName: "Side Part Quiff",
    description: "เซ็ตผมเสยขึ้นพร้อมแสกข้างคมชัด เสริมบุคลิกให้ดูสมาร์ท มั่นใจ สง่างาม และเป็นมืออาชีพ",
    gender: "male",
    tags: ["Quiff", "SidePart", "Smart"],
    isTrending: false,
    thumbnail: "/assets/hairs/H04_side_part_quiff.jpg",
    shapeReference: "/assets/hairs/H04_side_part_quiff.jpg",
    previewOverlay: "/assets/hairs/H04_side_part_quiff.jpg",
    ...getHairLayoutConfig("h04"),
  },
  {
    id: "h05-straight-bob-see-through-bangs",
    name: "บ็อบตรงหน้าม้าซีทรู",
    englishName: "Straight Bob with See-Through Bangs",
    description: "บ็อบสั้นตัดตรงปลายงุ้มเล็กน้อย พร้อมหน้าม้าซีทรูสไตล์เกาหลี ช่วยลดอายุให้ดูสดใสอ่อนเยาว์",
    gender: "female",
    tags: ["Bob", "Straight", "Bangs"],
    isTrending: true,
    thumbnail: "/assets/hairs/H05_straight_bob_with_see_through_bangs.jpg",
    shapeReference: "/assets/hairs/H05_straight_bob_with_see_through_bangs.jpg",
    previewOverlay: "/assets/hairs/H05_straight_bob_with_see_through_bangs.jpg",
    ...getHairLayoutConfig("h05"),
  },
  {
    id: "h06-long-layered-loose-waves",
    name: "ลอนคลายเลเยอร์ยาว",
    englishName: "Long Layered Loose Waves",
    description: "ผมยาวสไลด์เลเยอร์ทิ้งลอนคลาย พลิ้วสวย เพิ่มมิติและการเคลื่อนไหวให้เส้นผมดูหนานุ่มสุขภาพดี",
    gender: "female",
    tags: ["Long", "Layered", "Waves"],
    isTrending: true,
    thumbnail: "/assets/hairs/H06_long_layered_loose_waves.png",
    shapeReference: "/assets/hairs/H06_long_layered_loose_waves.png",
    previewOverlay: "/assets/hairs/H06_long_layered_loose_waves.png",
    ...getHairLayoutConfig("h06"),
  },
  {
    id: "h07-short-curtain-perm",
    name: "ดัดเพิร์มสั้นหน้าม้าเคอร์เทน",
    englishName: "Short Curtain Perm",
    description: "ดัดลอนเพิร์มผมสั้นมีเท็กซ์เจอร์ พร้อมแสกข้างเคอร์เทน ดูสบายๆ สไตล์มินิมอลหนุ่มคาเฟ่",
    gender: "male",
    tags: ["Perm", "Short", "Curtain"],
    isTrending: false,
    thumbnail: "/assets/hairs/H07_short_curtain_perm.png",
    shapeReference: "/assets/hairs/H07_short_curtain_perm.png",
    previewOverlay: "/assets/hairs/H07_short_curtain_perm.png",
    ...getHairLayoutConfig("h07"),
  },
  {
    id: "h08-side-part-voluminous-curls",
    name: "ลอนวอลลุ่มแสกข้าง",
    englishName: "Side Part Voluminous Curls",
    description: "ลอนดัดวอลลุ่มใหญ่แน่นแสกข้าง เพิ่มความหรูหราอลังการดุจดาราฮอลลีวูดออกงานราตรี",
    gender: "female",
    tags: ["Volume", "Curls", "Glamour"],
    isTrending: false,
    thumbnail: "/assets/hairs/H08_side_part_voluminous_curls.png",
    shapeReference: "/assets/hairs/H08_side_part_voluminous_curls.png",
    previewOverlay: "/assets/hairs/H08_side_part_voluminous_curls.png",
    ...getHairLayoutConfig("h08"),
  },
  {
    id: "h09-short-curly-bob",
    name: "บ็อบสั้นดัดลอน",
    englishName: "Short Curly Bob",
    description: "บ็อบสั้นดัดลอนสปริงตัวสวย มอบลุคสาวหวานวินเทจสดใส ขี้เล่นและมีชีวิตชีวา",
    gender: "female",
    tags: ["Bob", "Curly", "Vintage"],
    isTrending: false,
    thumbnail: "/assets/hairs/H09_short_curly_bob.png",
    shapeReference: "/assets/hairs/H09_short_curly_bob.png",
    previewOverlay: "/assets/hairs/H09_short_curly_bob.png",
    ...getHairLayoutConfig("h09"),
  },
  {
    id: "h10-classic-middle-part",
    name: "แสกกลางคลาสสิก",
    englishName: "Classic Middle Part",
    description: "ผมแสกกลางเรียบเท่สไตล์ 90s คลาสสิกเหนือกาลเวลา เข้าได้กับทุกรูปหน้าและทุกลุค",
    gender: "unisex",
    tags: ["MiddlePart", "Classic", "90s", "Unisex"],
    isTrending: false,
    thumbnail: "/assets/hairs/H10_classic_middle_part.jpg",
    shapeReference: "/assets/hairs/H10_classic_middle_part.jpg",
    previewOverlay: "/assets/hairs/H10_classic_middle_part.jpg",
    ...getHairLayoutConfig("h10"),
  },
  {
    id: "h11-textured-crop-swept-fringe",
    name: "ครอปเท็กซ์เจอร์หน้าม้าปัด",
    englishName: "Textured Crop with Swept Fringe",
    description: "ตัดสั้นสไตล์ครอปเท็กซ์เจอร์ดูแลง่าย หน้าม้าปัดสั้นทันสมัย ให้ลุคคมเข้มคล่องตัว",
    gender: "male",
    tags: ["Crop", "Textured", "Fringe"],
    isTrending: true,
    thumbnail: "/assets/hairs/H11_textured_crop_with_swept_fringe.png",
    shapeReference: "/assets/hairs/H11_textured_crop_with_swept_fringe.png",
    previewOverlay: "/assets/hairs/H11_textured_crop_with_swept_fringe.png",
    ...getHairLayoutConfig("h11"),
  },
  {
    id: "h12-middle-part-blunt-bob",
    name: "บ็อบตัดตรงแสกกลาง",
    englishName: "Middle Part Blunt Bob",
    description: "บ็อบตัดตรงปลายเรียบกริบแสกกลาง ให้ความรู้สึกมินิมอล เรียบหรูดูแพง สไตล์ไฮแฟชั่น",
    gender: "female",
    tags: ["BluntBob", "MiddlePart", "Minimal"],
    isTrending: false,
    thumbnail: "/assets/hairs/H12_middle_part_blunt_bob.png",
    shapeReference: "/assets/hairs/H12_middle_part_blunt_bob.png",
    previewOverlay: "/assets/hairs/H12_middle_part_blunt_bob.png",
    ...getHairLayoutConfig("h12"),
  },
  {
    id: "h13-side-swept-hollywood-waves",
    name: "ฮอลลีวูดเวฟปัดข้าง",
    englishName: "Side Swept Hollywood Waves",
    description: "ลอนคลื่นมันวาวแสกข้างแบบพรมแดง เพิ่มความแกลมและสง่างามขั้นสุด ดึงดูดสายตาทุกมุมมอง",
    gender: "female",
    tags: ["Hollywood", "Waves", "RedCarpet"],
    isTrending: false,
    thumbnail: "/assets/hairs/H13_side_swept_hollywood_waves.png",
    shapeReference: "/assets/hairs/H13_side_swept_hollywood_waves.png",
    previewOverlay: "/assets/hairs/H13_side_swept_hollywood_waves.png",
    ...getHairLayoutConfig("h13"),
  },
  {
    id: "h14-straight-blunt-lob",
    name: "ล็อบตัดตรง",
    englishName: "Straight Blunt Lob",
    description: "บ็อบยาวประบ่าตัดตรงคมชัด เรียบร้อยทันสมัย เหมาะสำหรับผู้หญิงยุคใหม่ที่คล่องตัว",
    gender: "female",
    tags: ["Lob", "Blunt", "Straight"],
    isTrending: false,
    thumbnail: "/assets/hairs/H14_straight_blunt_lob.png",
    shapeReference: "/assets/hairs/H14_straight_blunt_lob.png",
    previewOverlay: "/assets/hairs/H14_straight_blunt_lob.png",
    ...getHairLayoutConfig("h14"),
  },
  {
    id: "h15-side-part-c-curve-bob",
    name: "บ็อบ C-Curve แสกข้าง",
    englishName: "Side Part C-Curve Bob",
    description: "บ็อบแสกข้างปลายงุ้มทรง C-Curve ล้อมกรอบหน้าให้ดูหวานซอฟต์ละมุนตา เสริมความน่ารัก",
    gender: "female",
    tags: ["Bob", "CCurve", "Sweet"],
    isTrending: true,
    thumbnail: "/assets/hairs/H15_side_part_c_curve_bob.png",
    shapeReference: "/assets/hairs/H15_side_part_c_curve_bob.png",
    previewOverlay: "/assets/hairs/H15_side_part_c_curve_bob.png",
    ...getHairLayoutConfig("h15"),
  },
  {
    id: "h16-short-blunt-bob-wispy-bangs",
    name: "บ็อบสั้นตัดตรงหน้าม้าบาง",
    englishName: "Short Blunt Bob with Wispy Bangs",
    description: "บ็อบสั้นระดับคางพร้อมหน้าม้าปัดบางๆ ดูชิคและเก๋สไตล์ปารีเซียง เรียบง่ายแต่ดูดี",
    gender: "female",
    tags: ["Bob", "WispyBangs", "Chic"],
    isTrending: true,
    thumbnail: "/assets/hairs/H16_short_blunt_bob_with_wispy_bangs.png",
    shapeReference: "/assets/hairs/H16_short_blunt_bob_with_wispy_bangs.png",
    previewOverlay: "/assets/hairs/H16_short_blunt_bob_with_wispy_bangs.png",
    ...getHairLayoutConfig("h16"),
  },
  {
    id: "h17-short-wolf-cut-fringe",
    name: "วูล์ฟคัตสั้นหน้าม้า",
    englishName: "Short Wolf Cut with Fringe",
    description: "วูล์ฟคัตสั้นเลเยอร์ฟุ้งซ่า พร้อมหน้าม้าดูเท่ไม่ซ้ำใคร สไตล์ Unisex สุดฮิตของวัยรุ่นยุคนี้",
    gender: "unisex",
    tags: ["WolfCut", "Short", "Edgy", "Unisex"],
    isTrending: true,
    thumbnail: "/assets/hairs/H17_short_wolf_cut_with_fringe.png",
    shapeReference: "/assets/hairs/H17_short_wolf_cut_with_fringe.png",
    previewOverlay: "/assets/hairs/H17_short_wolf_cut_with_fringe.png",
    ...getHairLayoutConfig("h17"),
  },
  {
    id: "h18-wavy-middle-part-lifted-fringe",
    name: "เวฟแสกกลางยกโคน",
    englishName: "Wavy Middle Part with Lifted Fringe",
    description: "แสกกลางดัดลอนคลื่นพร้อมยกโคนผมด้านหน้า ให้ความรู้สึกสบายและมีวอลลุ่มอย่างเป็นธรรมชาติ",
    gender: "male",
    tags: ["MiddlePart", "Wavy", "Casual"],
    isTrending: true,
    thumbnail: "/assets/hairs/H18_wavy_middle_part_with_lifted_fringe.png",
    shapeReference: "/assets/hairs/H18_wavy_middle_part_with_lifted_fringe.png",
    previewOverlay: "/assets/hairs/H18_wavy_middle_part_with_lifted_fringe.png",
    ...getHairLayoutConfig("h18"),
  },
  {
    id: "h19-textured-side-swept-quiff",
    name: "ควิฟฟ์เท็กซ์เจอร์ปัดข้าง",
    englishName: "Textured Side Swept Quiff",
    description: "เสยผมปัดข้างเพิ่มเท็กซ์เจอร์ เหมาะกับลุคหนุ่มทำงานและสตรีทแฟชั่นสุดเท่",
    gender: "male",
    tags: ["Quiff", "Textured", "Men"],
    isTrending: false,
    thumbnail: "/assets/hairs/H19_textured_side_swept_quiff.png",
    shapeReference: "/assets/hairs/H19_textured_side_swept_quiff.png",
    previewOverlay: "/assets/hairs/H19_textured_side_swept_quiff.png",
    ...getHairLayoutConfig("h19"),
  },
  {
    id: "h20-middle-part-wavy-lob",
    name: "ล็อบลอนแสกกลาง",
    englishName: "Middle Part Wavy Lob",
    description: "บ็อบยาวแสกกลางดัดลอนคลาย สวยเป็นธรรมชาติแบบไม่ต้องเซ็ตเยอะ เข้ากับทุกลุค",
    gender: "female",
    tags: ["Lob", "Wavy", "Effortless"],
    isTrending: true,
    thumbnail: "/assets/hairs/H20_middle_part_wavy_lob.png",
    shapeReference: "/assets/hairs/H20_middle_part_wavy_lob.png",
    previewOverlay: "/assets/hairs/H20_middle_part_wavy_lob.png",
    ...getHairLayoutConfig("h20"),
  },
  {
    id: "h21-slicked-side-part",
    name: "สลิคแสกข้างเรียบหรู",
    englishName: "Slicked Side Part",
    description: "หวีเสยเรียบแสกข้างเนี๊ยบกริบ ให้ความรู้สึกเป็นทางการ สุภาพ และภูมิฐานแบบสุภาพบุรุษ",
    gender: "male",
    tags: ["Slicked", "Gentleman", "Formal"],
    isTrending: false,
    thumbnail: "/assets/hairs/H21_slicked_side_part.jpg",
    shapeReference: "/assets/hairs/H21_slicked_side_part.jpg",
    previewOverlay: "/assets/hairs/H21_slicked_side_part.jpg",
    ...getHairLayoutConfig("h21"),
  },
  {
    id: "h22-medium-s-waves-curtain-bangs",
    name: "ลอน S-Waves ประบ่าหน้าม้าเคอร์เทน",
    englishName: "Medium Long S-Waves with Curtain Bangs",
    description: "ลอนคลื่นทรง S-Wave อ่อนช้อยรับกับหน้าม้าเคอร์เทน ให้ลุคเกาหลีละมุนตา พรางกรอบหน้าได้ดีเยี่ยม",
    gender: "female",
    tags: ["SWaves", "Korean", "Curtain"],
    isTrending: true,
    thumbnail: "/assets/hairs/H22_medium_long_s_waves_with_curtain_bangs.png",
    shapeReference: "/assets/hairs/H22_medium_long_s_waves_with_curtain_bangs.png",
    previewOverlay: "/assets/hairs/H22_medium_long_s_waves_with_curtain_bangs.png",
    ...getHairLayoutConfig("h22"),
  },
  {
    id: "h23-two-block-straight-fringe",
    name: "ทูบล็อคหน้าม้าตรง",
    englishName: "Two-Block with Straight Fringe",
    description: "ทูบล็อคไถข้างสั้น ด้านบนปล่อยหน้าม้าตรงสไตล์ไอดอลเคป๊อป ทรงยอดฮิตตลอดกาล",
    gender: "male",
    tags: ["TwoBlock", "KPop", "Fringe"],
    isTrending: true,
    thumbnail: "/assets/hairs/H23_two_block_with_straight_fringe.png",
    shapeReference: "/assets/hairs/H23_two_block_with_straight_fringe.png",
    previewOverlay: "/assets/hairs/H23_two_block_with_straight_fringe.png",
    ...getHairLayoutConfig("h23"),
  },
];

// Full 21 Hair Colors matching all files in /public/assets/colors
export const HAIR_COLORS: HairColor[] = [
  {
    id: "c01-deep-teal",
    name: "สีดีปทีลเขียวอมฟ้า (Deep Teal)",
    value: "#0d5c75",
    colorReference: "/assets/colors/C01_deep_teal.png",
    swatchImage: "/assets/colors/C01_deep_teal.png",
    category: "cool",
  },
  {
    id: "c02-caramel-brown",
    name: "สีน้ำตาลคาราเมล (Caramel Brown)",
    value: "#854d27",
    colorReference: "/assets/colors/C02_caramel_brown.png",
    swatchImage: "/assets/colors/C02_caramel_brown.png",
    category: "warm",
  },
  {
    id: "c03-muted-mint-green",
    name: "สีเขียวมินต์หม่น (Muted Mint Green)",
    value: "#6a9a8b",
    colorReference: "/assets/colors/C03_muted_mint_green.png",
    swatchImage: "/assets/colors/C03_muted_mint_green.png",
    category: "cool",
  },
  {
    id: "c04-ash-beige-blonde",
    name: "สีบลอนด์เบจแอช (Ash Beige Blonde)",
    value: "#c2b29d",
    colorReference: "/assets/colors/C04_ash_beige_blonde.png",
    swatchImage: "/assets/colors/C04_ash_beige_blonde.png",
    category: "natural",
  },
  {
    id: "c05-rose-pink",
    name: "สีชมพูกุหลาบ (Rose Pink)",
    value: "#d16682",
    colorReference: "/assets/colors/C05_rose_pink.png",
    swatchImage: "/assets/colors/C05_rose_pink.png",
    category: "fashion",
  },
  {
    id: "c06-cherry-red",
    name: "สีแดงเชอร์รี่สด (Cherry Red)",
    value: "#9e1b32",
    colorReference: "/assets/colors/C06_cherry_red.png",
    swatchImage: "/assets/colors/C06_cherry_red.png",
    category: "fashion",
  },
  {
    id: "c07-dusty-rose-gold",
    name: "สีดัสตี้โรสโกลด์ (Dusty Rose Gold)",
    value: "#b76e79",
    colorReference: "/assets/colors/C07_dusty_rose_gold.png",
    swatchImage: "/assets/colors/C07_dusty_rose_gold.png",
    category: "warm",
  },
  {
    id: "c08-milk-tea-brown",
    name: "สีน้ำตาลชานม (Milk Tea Brown)",
    value: "#b88665",
    colorReference: "/assets/colors/C08_milk_tea_brown.png",
    swatchImage: "/assets/colors/C08_milk_tea_brown.png",
    category: "warm",
  },
  {
    id: "c09-silver-blue",
    name: "สีฟ้าซิลเวอร์บลู (Silver Blue)",
    value: "#8fa9ba",
    colorReference: "/assets/colors/C09_silver_blue.png",
    swatchImage: "/assets/colors/C09_silver_blue.png",
    category: "cool",
  },
  {
    id: "c10-brown-beige-highlights",
    name: "สีน้ำตาลไฮไลต์เบจ (Brown with Beige Highlights)",
    value: "#6e473b",
    colorReference: "/assets/colors/C10_brown_with_beige_highlights.png",
    swatchImage: "/assets/colors/C10_brown_with_beige_highlights.png",
    category: "warm",
  },
  {
    id: "c11-natural-black",
    name: "สีดำธรรมชาติ (Natural Black)",
    value: "#1a1a1a",
    colorReference: "/assets/colors/C11_natural_black.jpg",
    swatchImage: "/assets/colors/C11_natural_black.jpg",
    category: "natural",
  },
  {
    id: "c12-deep-emerald-green",
    name: "สีเขียวมรกตเข้ม (Deep Emerald Green)",
    value: "#095238",
    colorReference: "/assets/colors/C12_deep_emerald_green.png",
    swatchImage: "/assets/colors/C12_deep_emerald_green.png",
    category: "cool",
  },
  {
    id: "c13-violet-ash-grey",
    name: "สีเทาหม่นประกายม่วง (Violet Ash Grey)",
    value: "#746d82",
    colorReference: "/assets/colors/C13_violet_ash_grey.png",
    swatchImage: "/assets/colors/C13_violet_ash_grey.png",
    category: "cool",
  },
  {
    id: "c14-burgundy-wine-red",
    name: "สีแดงไวน์เบอร์กันดี (Burgundy Wine Red)",
    value: "#6e1a24",
    colorReference: "/assets/colors/C14_burgundy_wine_red.png",
    swatchImage: "/assets/colors/C14_burgundy_wine_red.png",
    category: "warm",
  },
  {
    id: "c15-smoky-blue-grey",
    name: "สีเทาควันบุหรี่อมฟ้า (Smoky Blue Grey)",
    value: "#5e6d7a",
    colorReference: "/assets/colors/C15_smoky_blue_grey.png",
    swatchImage: "/assets/colors/C15_smoky_blue_grey.png",
    category: "cool",
  },
  {
    id: "c16-cream-blonde",
    name: "สีครีมบลอนด์สว่าง (Cream Blonde)",
    value: "#e8dcbe",
    colorReference: "/assets/colors/C16_cream_blonde.png",
    swatchImage: "/assets/colors/C16_cream_blonde.png",
    category: "natural",
  },
  {
    id: "c17-bright-copper-orange",
    name: "สีส้มคอปเปอร์สว่าง (Bright Copper Orange)",
    value: "#d35f29",
    colorReference: "/assets/colors/C17_bright_copper_orange.png",
    swatchImage: "/assets/colors/C17_bright_copper_orange.png",
    category: "warm",
  },
  {
    id: "c18-deep-plum-purple",
    name: "สีม่วงพลัมเข้ม (Deep Plum Purple)",
    value: "#4a1936",
    colorReference: "/assets/colors/C18_deep_plum_purple.png",
    swatchImage: "/assets/colors/C18_deep_plum_purple.png",
    category: "fashion",
  },
  {
    id: "c19-silver-lavender",
    name: "สีเงินประกายลาเวนเดอร์ (Silver Lavender)",
    value: "#b8b2cb",
    colorReference: "/assets/colors/C19_silver_lavender.png",
    swatchImage: "/assets/colors/C19_silver_lavender.png",
    category: "cool",
  },
  {
    id: "c20-deep-magenta",
    name: "สีชมพูมาเจนต้าเข้ม (Deep Magenta)",
    value: "#991b5c",
    colorReference: "/assets/colors/C20_deep_magenta.png",
    swatchImage: "/assets/colors/C20_deep_magenta.png",
    category: "fashion",
  },
  {
    id: "c21-purple-rose-pink-highlights",
    name: "สีม่วงไฮไลต์โรสพิงก์ (Purple with Rose Pink Highlights)",
    value: "#6b355e",
    colorReference: "/assets/colors/C21_purple_with_rose_pink_highlights.jpg",
    swatchImage: "/assets/colors/C21_purple_with_rose_pink_highlights.jpg",
    category: "fashion",
  },
  {
    id: "c22-violet-purple",
    name: "สีม่วงไวโอเล็ต (Violet Purple)",
    value: "#602882",
    colorReference: "/assets/colors/C22_violet_purple.png",
    swatchImage: "/assets/colors/C22_violet_purple.png",
    category: "fashion",
  },
  {
    id: "c23-deep-dusty-pink",
    name: "สีดัสตี้พิงก์เข้ม (Deep Dusty Pink)",
    value: "#9e4770",
    colorReference: "/assets/colors/C23_deep_dusty_pink.png",
    swatchImage: "/assets/colors/C23_deep_dusty_pink.png",
    category: "fashion",
  },
  {
    id: "c24-bright-rose-pink",
    name: "สีชมพูไบรท์โรส (Bright Rose Pink)",
    value: "#e05285",
    colorReference: "/assets/colors/C24_bright_rose_pink.png",
    swatchImage: "/assets/colors/C24_bright_rose_pink.png",
    category: "fashion",
  },
  {
    id: "c25-vivid-golden-yellow",
    name: "สีเหลืองทองสดใส (Vivid Golden Yellow)",
    value: "#e6a817",
    colorReference: "/assets/colors/C25_vivid_golden_yellow.png",
    swatchImage: "/assets/colors/C25_vivid_golden_yellow.png",
    category: "fashion",
  },
  {
    id: "c26-pastel-blue",
    name: "สีฟ้าพาสเทล (Pastel Blue)",
    value: "#8ec5fc",
    colorReference: "/assets/colors/C26_pastel_blue.png",
    swatchImage: "/assets/colors/C26_pastel_blue.png",
    category: "cool",
  },
  {
    id: "c27-lavender-purple",
    name: "สีม่วงลาเวนเดอร์ (Lavender Purple)",
    value: "#9f84bd",
    colorReference: "/assets/colors/C27_lavender_purple.png",
    swatchImage: "/assets/colors/C27_lavender_purple.png",
    category: "cool",
  },
  {
    id: "c28-deep-copper-orange",
    name: "สีส้มคอปเปอร์เข้ม (Deep Copper Orange)",
    value: "#c25325",
    colorReference: "/assets/colors/C28_deep_copper_orange.png",
    swatchImage: "/assets/colors/C28_deep_copper_orange.png",
    category: "warm",
  },
];

export function parseScannedAssets(scanned: { overlays?: string[]; hairs?: string[]; colors?: string[] }) {
  const { hairs, colors } = scanned;

  let hairstylesList: Hairstyle[] = [...HAIRSTYLES];
  if (hairs && hairs.length > 0) {
    const dynamicHairs: Hairstyle[] = [];
    hairs.forEach((hairFile) => {
      const existing = HAIRSTYLES.find(
        (h) => h.thumbnail.split("/").pop() === hairFile || normalizeKey(h.name) === normalizeKey(hairFile.replace(/\.[^.]+$/, ""))
      );
      if (existing) {
        dynamicHairs.push(existing);
      } else {
        const cleanName = hairFile.replace(/\.[^.]+$/, "").replace(/^H\d+_/i, "").replace(/_/g, " ");
        dynamicHairs.push({
          id: normalizeKey(hairFile).replace(/\s+/g, "-"),
          name: cleanName,
          englishName: cleanName,
          description: "ทรงผมยอดนิยม สวมใส่ง่ายเข้ากับทุกรูปหน้า",
          gender: "unisex",
          tags: ["Style"],
          isTrending: true,
          thumbnail: `/assets/hairs/${hairFile}`,
          shapeReference: `/assets/hairs/${hairFile}`,
          previewOverlay: `/assets/hairs/${hairFile}`,
          ...getHairLayoutConfig(hairFile),
        });
      }
    });
    if (dynamicHairs.length > 0) {
      hairstylesList = [ORIGINAL_HAIRSTYLE, ...dynamicHairs];
    }
  }

  let hairColorsList: HairColor[] = [...HAIR_COLORS];
  if (colors && colors.length > 0) {
    const dynamicColors: HairColor[] = [];
    colors.forEach((colorFile) => {
      const fileLower = colorFile.toLowerCase();
      const existing = HAIR_COLORS.find(
        (c) =>
          c.colorReference.split("/").pop()?.toLowerCase() === fileLower ||
          c.id.replace(/-/g, "_").toLowerCase() === colorFile.replace(/\.[^.]+$/, "").toLowerCase() ||
          normalizeKey(c.name) === normalizeKey(colorFile.replace(/\.[^.]+$/, ""))
      );
      if (existing) {
        dynamicColors.push(existing);
      } else {
        const cleanName = colorFile.replace(/\.[^.]+$/, "").replace(/^C\d+_/i, "").replace(/_/g, " ");
        let hash = 0;
        for (let i = 0; i < colorFile.length; i++) {
          hash = colorFile.charCodeAt(i) + ((hash << 5) - hash);
        }
        const cHex = (Math.abs(hash) & 0x00ffffff).toString(16).padStart(6, "0");
        dynamicColors.push({
          id: normalizeKey(colorFile).replace(/\s+/g, "-"),
          name: cleanName,
          value: `#${cHex}`,
          colorReference: `/assets/colors/${colorFile}`,
          swatchImage: `/assets/colors/${colorFile}`,
          category: "fashion",
        });
      }
    });
    if (dynamicColors.length > 0) {
      hairColorsList = dynamicColors;
    }
  }

  return {
    hairstyles: hairstylesList,
    hairColors: hairColorsList,
  };
}

export interface SampleModel {
  id: string;
  name: string;
  gender: string;
  image: string;
}

export const SAMPLE_MODELS: SampleModel[] = [
  {
    id: "woman",
    name: "ผู้หญิง",
    gender: "หญิง",
    image: "/assets/example/women.png",
  },
  {
    id: "boy",
    name: "ผู้ชาย",
    gender: "ชาย",
    image: "/assets/example/boy.png",
  },
];
