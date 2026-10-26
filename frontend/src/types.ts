export interface Hairstyle {
  id: string;
  name: string;
  englishName?: string;
  description?: string;
  gender?: "female" | "male" | "unisex";
  tags?: string[];
  category?: string;
  isTrending?: boolean;
  thumbnail: string;
  previewOverlay: string;
  shapeReference: string;
  scaleX: number;
  scaleY: number;
  offsetX: number; // relative to face width (-0.5 to 0.5)
  offsetY: number; // relative to face height/width
  isFlipped?: boolean; // Flip horizontally (สลับซ้าย-ขวา)
  enableFaceMask?: boolean; // Whether to erase face center
  suitableFaceShapes?: string[]; // รูปหน้าที่เหมาะสม เช่น ["หน้ารูปไข่", "หน้ากลม"]
  highlight?: string;            // ประโยชน์เด่น เช่น "ช่วยพรางแก้ม ให้หน้าดูเรียวละมุน"
  salonKeyword?: string;         // คำแนะนำสำหรับบอกช่างทำผม
  bestWithColor?: string;        // แนะนำสีผมคู่กัน
}

export interface HairColor {
  id: string;
  name: string;
  value: string; // UI hex color representation
  colorReference: string;
  swatchImage?: string; // Real hair texture swatch cropped for circular preview
  category?: "natural" | "warm" | "cool" | "fashion" | "pastel" | "ombre";
}

export type FaceShapeType = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong";

export interface FaceShapeAnalysisResult {
  shape: FaceShapeType;
  shapeNameThai: string;
  shapeNameEnglish: string;
  description: string;
  keyFeatures: string[];
  lengthToWidthRatio: number;
  foreheadToJawRatio: number;
  cheekToJawRatio: number;
  recommendedHairstyleIds: string[];
  recommendedColorIds: string[];
  stylingTips: string;
  colorTips: string;
}

export interface FaceTrackingData {
  centerX: number;      // 0 to 1
  centerY: number;      // 0 to 1
  width: number;        // 0 to 1 relative to video width
  height: number;       // 0 to 1 relative to video height
  roll: number;         // in degrees
  foreheadY: number;    // 0 to 1
  isFaceValid: boolean;
  message: string;      // Guide messages: 'ไม่พบใบหน้า', 'กรุณาจัดใบหน้าให้อยู่กลางกรอบ', etc.
  faceShape?: FaceShapeType;
  shapeAnalysis?: FaceShapeAnalysisResult;
  rawLandmarks?: Array<{ x: number; y: number; z?: number }>; // MediaPipe normalized landmarks of the live face
}

export interface SavedImageSnapshot {
  id: string;
  imageUrl: string;
  timestamp: string;
  hairstyleName: string;
  colorName: string;
  colorHex: string;
  mode: "camera" | "upload";
}
