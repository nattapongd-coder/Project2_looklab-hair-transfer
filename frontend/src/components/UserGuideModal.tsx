import { useState } from "react";
import {
  X,
  BookOpen,
  Camera,
  Scissors,
  Palette,
  Sparkles,
  Download,
  Split,
  Lightbulb,
  CheckCircle2,
  HelpCircle,
  Maximize2,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  UserCheck,
  Smartphone,
  Upload,
  ArrowRight,
  Layers,
  Heart,
  Eye,
  Sun,
  Target,
  Check,
  Smile,
  Image,
  Share2,
  Sliders,
} from "lucide-react";

interface UserGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetDontShowAgain?: (dontShow: boolean) => void;
}

export default function UserGuideModal({
  isOpen,
  onClose,
  onSetDontShowAgain,
}: UserGuideModalProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [activeTab, setActiveTab] = useState<"quick-start" | "photo-tips" | "styles-colors" | "tools-faq">("quick-start");
  const [activeFaceShape, setActiveFaceShape] = useState<"Oval" | "Round" | "Square" | "Heart" | "Diamond">("Oval");
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  if (!isOpen) return null;

  const handleClose = () => {
    if (onSetDontShowAgain) {
      onSetDontShowAgain(dontShowAgain);
    }
    onClose();
  };

  // 1. Quick Start 4 Simple Steps
  const quickSteps = [
    {
      step: 1,
      badge: "ขั้นตอนที่ 1",
      icon: <Camera className="w-5 h-5 text-[#F27D68]" />,
      title: "เตรียมรูปถ่ายหน้าตรง หรือเปิดกล้องสด",
      summary: "เลือกวิธีป้อนภาพใบหน้าของคุณเพื่อจำลองทรงผม",
      points: [
        "โหมดอัปโหลดรูป (แนะนำเพื่อความคมชัดสูงสุด): คลิก 'อัปโหลดรูป' เลือกรูปหน้าตรงชัดๆ หรือกดเลือกจาก 'รูปตัวอย่าง' นายแบบ/นางแบบ เพื่อทดลองระบบได้ทันที",
        "โหมดเปิดกล้องสด: คลิก 'เปิดกล้อง' ส่องหน้าตรงให้อยู่ในกรอบ ระบบจะนับถอยหลัง 5 วินาที หรือกดปุ่มเปิด/ปิดวงกลมเพื่อดูทรงผมขยับตามใบหน้าแบบเรียลไทม์",
      ],
      tip: "รูปถ่ายที่ดีที่สุด: ควรถ่ายหน้าตรง แสงสว่างสม่ำเสมอ รวบผมเปิดหน้าผากและกรอบหน้าให้ชัดเจน",
    },
    {
      step: 2,
      badge: "ขั้นตอนที่ 2",
      icon: <Scissors className="w-5 h-5 text-[#F27D68]" />,
      title: "เลือกทรงผมที่อยากลอง (หรือคงทรงเดิมไว้)",
      summary: "มีทั้งทรงผมยอดนิยมครบสไตล์ และตัวเลือกคงทรงเดิม",
      points: [
        "เลือกทรงผมใหม่: เลือกดูได้ตามตัวกรอง 'ทั้งหมด', 'ผู้หญิง', 'ผู้ชาย' หรือ 'Unisex' เพื่อหาทรงผมที่เข้ากับตัวคุณได้รวดเร็ว",
        "เลือก 'ทรงผมต้นฉบับ' (ทรงเดิม): สำหรับคนที่ชอบทรงผมเดิมอยู่แล้ว แต่อยากทดลองเปลี่ยนเฉพาะ 'สีผมใหม่' ระบบจะคงทรงผมจริงของคุณไว้ 100%",
        "ปุ่ม 'สุ่มทรงแนะนำ': หากยังไม่แน่ใจว่าจะลองทรงไหน กดปุ่มนี้เพื่อให้ระบบสุ่มทรงผมยอดนิยมให้ลองสวมได้ทันที",
      ],
      tip: "มีทรงผมให้เลือก 23 แบบยอดนิยม (พร้อมทรงผมต้นฉบับ รวม 24 สไตล์) ทั้งสไตล์เกาหลี บ็อบสั้น ลอนคลื่น ทูบล็อค วูล์ฟคัต และควิฟฟ์",
    },
    {
      step: 3,
      badge: "ขั้นตอนที่ 3",
      icon: <Palette className="w-5 h-5 text-[#F27D68]" />,
      title: "เลือกเฉดสีผม (หรือคงสีผมธรรมชาติเดิม)",
      summary: "มีให้เลือกถึง 21 เฉดสียอดนิยม หรือคงสีผมธรรมชาติจริงของคุณ",
      points: [
        "เลือกเฉดสีผมใหม่: มีครบทั้งโทนอุ่น (คาราเมล, ชานม, ส้มคอปเปอร์เข้ม, ดัสตี้โรสโกลด์), โทนเย็นหม่นแอช (ดำธรรมชาติ, บลอนด์เบจแอช, ดีปทีล, เทาหม่นประกายม่วง), และโทนแฟชั่นสดใส (ชมพูกุหลาบ, แดงเชอร์รี่, เหลืองทอง, ม่วงไวโอเล็ต, ไฮไลต์โรสพิงก์)",
        "เลือก 'สีธรรมชาติ' (สีเดิม): หากต้องการดูแค่ทรงผมใหม่โดยไม่เปลี่ยนสีผม ให้เลือกสีธรรมชาติ ระบบจะดึงสีผมจริงจากรูปถ่ายของคุณมาใช้ 100%",
      ],
      tip: "คลิกที่วงกลมสีเพื่อเปลี่ยนสีผม หรือคลิกซ้ำที่สีเดิมเพื่อคืนค่ากลับมาเป็น 'สีธรรมชาติ'",
    },
    {
      step: 4,
      badge: "ขั้นตอนที่ 4",
      icon: <Sparkles className="w-5 h-5 text-[#F27D68]" />,
      title: "กด 'สร้างลุคใหม่ของคุณ' & บันทึกภาพ",
      summary: "รับภาพจำลองทรงผมคุณภาพสูง พร้อมเปรียบเทียบ Before/After",
      points: [
        "กดปุ่มสีส้ม 'สร้างลุคใหม่ของคุณ': ระบบจะเริ่มผสานทรงผมและสีผมเข้ากับรูปหน้าของคุณทันที พร้อมตัวจับเวลานับเวลาจริง",
        "สไลเดอร์ Before / After: เลื่อนแถบกึ่งกลางซ้าย-ขวาเพื่อเปรียบเทียบภาพก่อนและหลังเปลี่ยนทรงผมได้อย่างชัดเจน",
        "บันทึกภาพผลลัพธ์: กดปุ่ม 'บันทึกภาพผลลัพธ์' เพื่อเซฟรูปความละเอียดสูงลงเครื่อง สำหรับเก็บเป็นไอเดียส่วนตัว แชร์ให้เพื่อนช่วยเลือก หรือนำไปใช้ในโซเชียลมีเดีย (เลือกเปิดหรือปิดลายน้ำ LOOKLAB ได้ตามต้องการ)",
      ],
      tip: "ในโหมดกล้องสด มีปุ่ม 'บันทึกภาพนิ่ง' มุมขวาล่างสำหรับถ่ายภาพสะอาดตาได้ในคลิกเดียว",
    },
  ];

  // 2. Photo Tips for Best Results (8 Highly Practical Tips)
  const photoTips = [
    {
      icon: <Sun size={18} className="text-[#F27D68]" />,
      title: "แสงสว่างสม่ำเสมอจากด้านหน้า (Front Soft Lighting)",
      desc: "ควรยืนหันหน้าเข้าหาหน้าต่างหรือแหล่งกำเนิดแสงธรรมชาติ หลีกเลี่ยงแสงย้อนจากด้านหลัง (Backlight) หรือแสงด้านข้างที่ทำให้เกิดเงาพาดผ่านแก้ม เพราะจะทำให้ระบบวิเคราะห์สีผมและกรอบหน้าคลาดเคลื่อน",
    },
    {
      icon: <UserCheck size={18} className="text-[#F27D68]" />,
      title: "รวบผมเปิดหน้าผากและใบหูให้ชัดเจน (Hair Tied Back)",
      desc: "ข้อนี้สำคัญที่สุด! แนะนำให้รวบผมไปด้านหลัง ทัดหู หรือใช้กิ๊บเก็บปอยผมด้านหน้าให้เรียบร้อย จะช่วยให้ระบบวางทรงผมใหม่ลงบนศีรษะได้แนบเนียน 100% ไม่มีเส้นผมเดิมโผล่มาทับซ้อน",
    },
    {
      icon: <Target size={18} className="text-[#F27D68]" />,
      title: "กล้องหน้าตรงระดับสายตา (Eye-Level Camera Angle)",
      desc: "ถือโทรศัพท์หรือตั้งกล้องให้อยู่ในระดับสายตาตรงๆ ระยะห่างประมาณ 40-60 เซนติเมตร หลีกเลี่ยงการก้มหน้าหรือเงยคาง เพื่อให้โครงสร้างใบหน้า ตา จมูก และคาง มีสัดส่วนสมจริงตามธรรมชาติ",
    },
    {
      icon: <Eye size={18} className="text-[#F27D68]" />,
      title: "ถอดแว่นตากรอบหนาและสิ่งบดบัง (Clear Face)",
      desc: "ถอดแว่นตากรอบหนา หมวก ที่คาดผม หรือหน้ากากอนามัยออกชั่วคราว เพื่อให้ระบบตรวจจับสัดส่วนโหนกแก้ม หัวคิ้ว และแนวไรผมได้อย่างครบถ้วนและแม่นยำสูงสุด",
    },
    {
      icon: <Smile size={18} className="text-[#F27D68]" />,
      title: "แสดงสีหน้าเป็นธรรมชาติและผ่อนคลาย (Neutral Expression)",
      desc: "มองตรงเข้าที่เลนส์กล้อง ยิ้มอ่อนๆ หรือทำหน้าตรงอย่างผ่อนคลาย หลีกเลี่ยงการเอียงศีรษะ หลับตา หรือทำปากจู๋ เพื่อให้แนวเส้นผมใหม่วางสมดุลซ้าย-ขวาอย่างสมบูรณ์แบบ",
    },
    {
      icon: <Image size={18} className="text-[#F27D68]" />,
      title: "ฉากหลังเรียบ ไม่กลืนกับสีผมเดิม (Clean Neutral Background)",
      desc: "ยืนถ่ายกับผนังสีเรียบ เช่น สีขาว สีครีม หรือสีเทาอ่อน หลีกเลี่ยงฉากหลังที่มีลวดลายหรือสีมืดที่กลืนกับผมเดิม เพื่อให้ระบบแยกแยะขอบศีรษะออกจากพื้นหลังได้อย่างคมกริบ",
    },
    {
      icon: <Maximize2 size={18} className="text-[#F27D68]" />,
      title: "ถ่ายระยะเห็นศีรษะถึงหัวไหล่ (Head & Shoulders Framing)",
      desc: "จัดองค์ประกอบภาพให้เห็นตั้งแต่ช่วงศีรษะ ใบหน้า ลำคอ ไปจนถึงช่วงบนของหัวไหล่ (Portrait Shot) ซึ่งเป็นระยะที่เหมาะสมที่สุดในการลองทรงผมทั้งผมสั้น ประบ่า และผมยาว",
    },
    {
      icon: <Sliders size={18} className="text-[#F27D68]" />,
      title: "ภาพถ่ายคมชัด ไม่ผ่านฟิลเตอร์บีบหน้า (High Resolution)",
      desc: "เลือกใช้ภาพถ่ายต้นฉบับที่มีความคมชัด ไม่เบลอ และไม่ผ่านฟิลเตอร์ที่ดัดรูปหน้าหรือสัดส่วน ภาพที่คมชัดจะช่วยให้เส้นผม ลอนคลื่น และเฉดสีใหม่ที่สร้างขึ้นมีความสมจริงระดับพรีเมียม",
    },
  ];

  // 3. Face Shape Recommendations
  const faceShapes = {
    Oval: {
      name: "หน้ารูปไข่ (Oval)",
      highlight: "ทรงสมดุล สวมได้เกือบทุกทรง",
      desc: "หน้าผากกว้างกว่าคางเล็กน้อย โหนกแก้มไม่เด่นเกินไป กรอบหน้าโค้งมนได้สัดส่วนทองคำ",
      recommendedStyles: ["ลอนยาวหน้าม้าเคอร์เทน", "บ็อบ C-Curve แสกข้าง", "ทูบล็อคหน้าม้าตรง", "แสกกลางคลาสสิก"],
      avoidTips: "หลีกเลี่ยงหน้าม้าหนาเตอะที่ปิดหน้าผากมิดชิดเกินไป เพราะจะบดบังกรอบหน้าที่ได้รูปอย่างเป็นธรรมชาติ",
    },
    Round: {
      name: "หน้ากลม (Round)",
      highlight: "เน้นทรงเพิ่มความยาว & พรางแก้ม",
      desc: "ความกว้างและความยาวใบหน้าใกล้เคียงกัน แก้มอิ่ม คางมน กรอบหน้าไม่มีเหลี่ยมมุมที่คมชัด",
      recommendedStyles: ["วูล์ฟคัตสั้นหน้าม้า", "เคอร์เทนสไตล์เกาหลี", "ควิฟฟ์แสกข้าง", "ล็อบลอนแสกกลาง"],
      avoidTips: "หลีกเลี่ยงบ็อบตัดตรงระดับคางและหน้าม้าทึบตัดตรง เพราะจะทำให้ใบหน้าดูกลมและสั้นลงกว่าเดิม",
    },
    Square: {
      name: "หน้าเหลี่ยม (Square)",
      highlight: "เน้นลอนคลื่นนุ่มช่วยลดความคมของกราม",
      desc: "หน้าผาก โหนกแก้ม และแนวกรามกว้างใกล้เคียงกัน สันกรามคมชัด มีโครงหน้าที่มั่นใจและโดดเด่น",
      recommendedStyles: ["ลอน S-Waves ประบ่าหน้าม้าเคอร์เทน", "ลอนวอลลุ่มแสกข้าง", "บ็อบลอนแสกข้าง", "ลอนคลายเลเยอร์ยาว"],
      avoidTips: "หลีกเลี่ยงผมบ็อบตัดตรงทื่อระดับสันกราม เพราะจะยิ่งเน้นเหลี่ยมมุมของกรามให้ดูเด่นชัดเกินไป",
    },
    Heart: {
      name: "หน้ารูปหัวใจ (Heart)",
      highlight: "เน้นเพิ่มวอลลุ่มช่วงคางให้รับกับหน้าผาก",
      desc: "หน้าผากกว้าง โหนกแก้มชัดเจน คางเรียวแหลมและแคบกว่าส่วนบนของใบหน้า",
      recommendedStyles: ["บ็อบ C-Curve แสกข้าง", "บ็อบตรงหน้าม้าซีทรู", "บ็อบตัดตรงแสกกลาง", "ล็อบลอนแสกกลาง"],
      avoidTips: "หลีกเลี่ยงการเซ็ตยกโคนผมด้านบนสูงเกินไป เพราะจะทำให้หน้าผากดูกว้างและคางดูแคบลง",
    },
    Diamond: {
      name: "หน้ารูปเพชร (Diamond)",
      highlight: "เน้นเปิดกรอบหน้า & ทรงมีเลเยอร์",
      desc: "โหนกแก้มกว้างและเด่นชัดที่สุด หน้าผากและคางเรียวแคบ มีเสน่ห์เฉพาะตัวที่คมชัด",
      recommendedStyles: ["บ็อบสั้นตัดตรงหน้าม้าบาง", "สลิคแสกข้างเรียบหรู", "ควิฟฟ์เท็กซ์เจอร์ปัดข้าง", "ล็อบตัดตรง"],
      avoidTips: "หลีกเลี่ยงการรวบผมตึงเปรี๊ยะ ควรมีปอยผมหวานหรือเลเยอร์ข้างแก้มเพื่อช่วยพรางโหนกแก้มให้ดูละมุนขึ้น",
    },
  };

  // 4. Hair Color Selection by Undertone
  const undertoneTips = [
    {
      tone: "ผิวโทนอุ่น (Warm Undertone)",
      skinDesc: "เส้นเลือดที่ข้อมือเป็นสีเขียว ผิวขาวเหลืองหรือผิวสองสี",
      bestColors: "น้ำตาลคาราเมล (Caramel Brown), น้ำตาลชานม (Milk Tea Brown), ส้มคอปเปอร์เข้ม (Deep Copper Orange), น้ำตาลไฮไลต์เบจ, ดัสตี้โรสโกลด์",
      why: "ช่วยขับผิวให้ดูเปล่งปลั่ง สดใส ไม่ซีดเซียว และให้ลุคอบอุ่นเป็นธรรมชาติ",
    },
    {
      tone: "ผิวโทนเย็น (Cool Undertone)",
      skinDesc: "เส้นเลือดที่ข้อมือเป็นสีม่วงหรือน้ำเงิน ผิวขาวอมชมพูหรือผิวเข้มคม",
      bestColors: "ดำธรรมชาติ (Natural Black), บลอนด์เบจแอช (Ash Beige Blonde), ดีปทีลเขียวอมฟ้า (Deep Teal), เขียวมรกตเข้ม, เทาหม่นประกายม่วง, ฟ้าซิลเวอร์บลู",
      why: "ช่วยขับออร่าให้ผิวดูผ่องสว่างตา และขับให้ใบหน้าดูคมชัดมีมิติ",
    },
    {
      tone: "ผิวโทนกลาง (Neutral Undertone)",
      skinDesc: "เส้นเลือดมีทั้งสีเขียวและน้ำเงิน ผิวผสมที่ปรับตัวได้ง่าย",
      bestColors: "เข้าได้กับทุกเฉดสี ทั้งชมพูกุหลาบ (Rose Pink), แดงเชอร์รี่สด (Cherry Red), ม่วงไวโอเล็ต, ดัสตี้พิงก์, เหลืองทองสดใส, ฟ้าพาสเทล, ม่วงไฮไลต์โรสพิงก์",
      why: "สนุกกับการลองเปลี่ยนสีผมได้หลากหลายเฉดโดยไม่ต้องกังวลเรื่องสีผิวตัดกันเกินไป",
    },
  ];

  // 5. Frequently Asked Questions
  const faqs = [
    {
      q: "ถ้าอยากลองแค่เปลี่ยนสีผม โดยคงทรงผมเดิมของตัวเองไว้ ต้องทำอย่างไร?",
      a: "ทำได้ง่ายมาก! ให้เลือก 'ทรงผมต้นฉบับ' (ทรงเดิม) ในช่องเลือกทรงผม แล้วเลือกเฉดสีผมใหม่ที่ต้องการ จากนั้นกด 'สร้างลุคใหม่ของคุณ' ระบบจะคงทรงผมจริงจากรูปถ่ายของคุณไว้ 100% แล้วเปลี่ยนเฉพาะสีผมให้สวยเนียนตา",
    },
    {
      q: "ถ้าอยากลองแค่ทรงผมใหม่ โดยใช้สีผมจริงของตัวเอง ต้องทำอย่างไร?",
      a: "ให้เลือกทรงผมที่ชอบในช่องทรงผม แล้วในช่องสีผมให้เลือก 'สีธรรมชาติ' (รูปต้นฉบับของคุณ) ระบบจะดึงเฉดสีผมจริงของคุณมาสวมใส่ลงบนทรงผมใหม่ให้โดยอัตโนมัติ",
    },
    {
      q: "ทำไมระบบถึงเตือนว่า 'ไม่พบใบหน้า' หรือวางทรงผมไม่ตรงตำแหน่ง?",
      a: "มักเกิดจากรูปถ่ายมืดเกินไป ย้อนแสง หน้าเอียง หรือมีผมปรกหน้าผากและตา วิธีแก้: ถ่ายรูปหน้าตรงในที่สว่าง รวบผมเปิดหน้าผากและกรอบหน้าให้ชัดเจน ถอดแว่นตากรอบหนาออก แล้วอัปโหลดใหม่อีกครั้ง",
    },
    {
      q: "สามารถเซฟรูปภาพผลลัพธ์ไปแชร์หรือเก็บไว้เปรียบเทียบหลายๆ ลุคได้ไหม?",
      a: "ทำได้อย่างอิสระ! เมื่อได้ผลลัพธ์แล้ว สามารถกดปุ่ม 'บันทึกภาพผลลัพธ์' เพื่อเซฟภาพความละเอียดสูงลงเครื่องไว้เปรียบเทียบลุคต่างๆ หรือแชร์ให้เพื่อนๆ ช่วยออกความคิดเห็น และยังสามารถเลือกเปิดหรือปิดลายน้ำ LOOKLAB ได้ตามใจชอบ",
    },
    {
      q: "ปุ่ม 'บันทึกภาพนิ่ง' ในโหมดกล้องสดทำงานอย่างไร?",
      a: "ปุ่มบันทึกภาพนิ่งที่มุมขวาล่างของกล้อง จะบันทึกภาพถ่ายความละเอียดสูงจากกล้องสดของคุณในเสี้ยววินาที โดยจะได้ภาพถ่ายที่สะอาดตา คมชัด และไม่ติดวงกลมตรวจจับใบหน้าลงไปในรูปภาพ",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto bg-black/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-3xl bg-white rounded-[28px] border border-[#EFDCD3] shadow-2xl overflow-hidden text-[#432B25] my-auto flex flex-col max-h-[92vh]">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-[#FFF1E9] via-[#FFE3D5] to-[#FFF1E9] px-5 sm:px-6 py-4 sm:py-5 border-b border-[#EFDCD3] shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-[#F27D68] text-white flex items-center justify-center shadow-md shrink-0">
                <BookOpen size={20} className="stroke-[2.2]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-[#F27D68] uppercase tracking-wider bg-white/90 px-2.5 py-0.5 rounded-full border border-[#EFDCD3]">
                    LOOKLAB GUIDE
                  </span>
                  <span className="text-[11px] font-medium text-[#80665D] hidden sm:inline">
                    คู่มือการใช้งาน & เคล็ดลับลุคสวย
                  </span>
                </div>
                <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-[#432B25] mt-0.5">
                  คู่มือใช้งาน LOOKLAB ให้ได้รูปสวยเป๊ะสมจริง
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-white/90 hover:bg-white text-[#80665D] hover:text-[#432B25] border border-[#EFDCD3] flex items-center justify-center transition cursor-pointer shadow-xs active:scale-95 shrink-0"
              aria-label="ปิดหน้าต่างคู่มือ"
            >
              <X size={17} />
            </button>
          </div>

          {/* 4 Clean Main Category Tabs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 mt-3.5 bg-white/80 p-1.5 rounded-2xl border border-[#EFDCD3]">
            <button
              type="button"
              onClick={() => setActiveTab("quick-start")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "quick-start"
                  ? "bg-[#F27D68] text-white shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFF1E9]"
              }`}
            >
              <Sparkles size={13} />
              <span className="truncate">4 ขั้นตอนเริ่มใช้</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("photo-tips")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "photo-tips"
                  ? "bg-[#F27D68] text-white shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFF1E9]"
              }`}
            >
              <Camera size={13} />
              <span className="truncate">เทคนิคเตรียมรูป</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("styles-colors")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "styles-colors"
                  ? "bg-[#F27D68] text-white shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFF1E9]"
              }`}
            >
              <Scissors size={13} />
              <span className="truncate">ทรงผม & สีผม</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("tools-faq")}
              className={`py-2 px-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "tools-faq"
                  ? "bg-[#F27D68] text-white shadow-xs"
                  : "text-[#80665D] hover:text-[#432B25] hover:bg-[#FFF1E9]"
              }`}
            >
              <HelpCircle size={13} />
              <span className="truncate">ฟังก์ชัน & คำถาม</span>
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 custom-scrollbar-y flex-1">
          
          {/* TAB 1: QUICK START 4 STEPS */}
          {activeTab === "quick-start" && (
            <div className="space-y-3.5">
              <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-3.5 flex items-start gap-2.5">
                <Lightbulb size={18} className="text-[#F27D68] shrink-0 mt-0.5" />
                <div className="text-xs text-[#80665D] leading-relaxed">
                  <strong className="text-[#432B25]">เริ่มต้นใช้งานง่ายๆ ใน 4 ขั้นตอน:</strong> สวมทรงผมหรือเปลี่ยนสีผมได้ทันที พร้อมเปรียบเทียบ Before/After ก่อนตัดสินใจตัดหรือทำสีผมจริง
                </div>
              </div>

              <div className="space-y-3">
                {quickSteps.map((step) => (
                  <div
                    key={step.step}
                    className="bg-white border border-[#EFDCD3] rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition space-y-2.5"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FFF1E9] border border-[#EFDCD3] flex items-center justify-center shrink-0">
                        {step.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-[#F27D68] uppercase bg-[#FFE3D5] px-2 py-0.5 rounded-full">
                            {step.badge}
                          </span>
                          <span className="text-[11px] text-[#80665D] hidden sm:inline">{step.summary}</span>
                        </div>
                        <h4 className="text-xs sm:text-sm font-bold text-[#432B25] mt-0.5 truncate">
                          {step.title}
                        </h4>
                      </div>
                    </div>

                    <div className="space-y-1.5 pl-1 sm:pl-2 text-xs text-[#432B25]">
                      {step.points.map((pt, pIdx) => (
                        <div key={pIdx} className="flex items-start gap-2 bg-[#FAF7F4] p-2 rounded-xl border border-[#EFDCD3]/60 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F27D68] mt-1.5 shrink-0" />
                          <span>{pt}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-[11px] text-[#80665D] bg-[#FFF8F4] px-3 py-1.5 rounded-lg border border-[#EFDCD3] flex items-center gap-1.5">
                      <span className="text-[#F27D68] font-bold shrink-0 flex items-center gap-1">
                        <Lightbulb size={12} className="stroke-[2.5]" />
                        <span>คำแนะนำ:</span>
                      </span>
                      <span>{step.tip}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PHOTO TIPS */}
          {activeTab === "photo-tips" && (
            <div className="space-y-4">
              <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-4">
                <h4 className="text-xs sm:text-sm font-bold text-[#432B25] flex items-center gap-2 mb-1">
                  <Camera size={16} className="text-[#F27D68]" />
                  <span>8 เคล็ดลับถ่ายภาพ & เตรียมตัว เพื่อผลลัพธ์เนียนสมจริงที่สุด</span>
                </h4>
                <p className="text-xs text-[#80665D] leading-relaxed">
                  ความคมชัด ทิศทางแสง และตำแหน่งของใบหน้าในรูปถ่ายต้นฉบับ คือหัวใจสำคัญที่สุดที่จะช่วยให้ทรงผมใหม่และเฉดสีผสานเข้ากับกรอบหน้าของคุณได้อย่างแนบเนียนเป็นธรรมชาติ
                </p>
              </div>

              {/* 8 Practical Photo Tips Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {photoTips.map((tip, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-[#EFDCD3] rounded-2xl p-4 shadow-2xs space-y-2 hover:shadow-xs transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FFF1E9] border border-[#EFDCD3] flex items-center justify-center shrink-0">
                        {tip.icon}
                      </div>
                      <h5 className="text-xs sm:text-sm font-bold text-[#432B25] leading-tight">
                        {tip.title}
                      </h5>
                    </div>
                    <p className="text-xs text-[#80665D] leading-relaxed pl-10.5">
                      {tip.desc}
                    </p>
                  </div>
                ))}
              </div>

              {/* Quick 4-Step Checklist Banner */}
              <div className="bg-white border border-[#EFDCD3] rounded-2xl p-4 space-y-2.5 shadow-2xs">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#432B25]">
                  <CheckCircle2 size={16} className="text-[#F27D68]" />
                  <span>เช็กลิสต์ความพร้อมก่อนกดอัปโหลดรูป (Pre-Upload Checklist)</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-[#432B25]">
                  <div className="bg-[#FFF8F4] p-2.5 rounded-xl border border-[#EFDCD3]/70 flex items-center gap-2">
                    <Check size={13} className="text-[#F27D68] shrink-0 stroke-[2.5]" />
                    <span className="font-medium">แสงสว่างหน้าตรง</span>
                  </div>
                  <div className="bg-[#FFF8F4] p-2.5 rounded-xl border border-[#EFDCD3]/70 flex items-center gap-2">
                    <Check size={13} className="text-[#F27D68] shrink-0 stroke-[2.5]" />
                    <span className="font-medium">รวบผมเปิดหน้าผาก</span>
                  </div>
                  <div className="bg-[#FFF8F4] p-2.5 rounded-xl border border-[#EFDCD3]/70 flex items-center gap-2">
                    <Check size={13} className="text-[#F27D68] shrink-0 stroke-[2.5]" />
                    <span className="font-medium">หน้าตรงระดับสายตา</span>
                  </div>
                  <div className="bg-[#FFF8F4] p-2.5 rounded-xl border border-[#EFDCD3]/70 flex items-center gap-2">
                    <Check size={13} className="text-[#F27D68] shrink-0 stroke-[2.5]" />
                    <span className="font-medium">ถอดแว่นกรอบหนา</span>
                  </div>
                </div>
              </div>

              {/* Practical User Value Card */}
              <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs sm:text-sm font-bold text-[#432B25]">
                  <Sparkles size={16} className="text-[#F27D68]" />
                  <span>สิ่งที่คุณทำได้เต็มที่เมื่อได้ภาพทรงผมใหม่</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-[#80665D]">
                  <div className="bg-white p-3 rounded-xl border border-[#EFDCD3] space-y-1 shadow-2xs">
                    <span className="font-bold text-[#432B25] block">เปรียบเทียบลุค Before/After</span>
                    <p className="text-[11px] leading-relaxed">สไลด์ดูความแตกต่างเพื่อความมั่นใจ 100% ก่อนตัดสินใจเปลี่ยนลุคจริง</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EFDCD3] space-y-1 shadow-2xs">
                    <span className="font-bold text-[#432B25] block">แชร์ถามความเห็นเพื่อน</span>
                    <p className="text-[11px] leading-relaxed">บันทึกรูปส่งต่อให้เพื่อนๆ ในกลุ่มช่วยโหวตเลือกทรงที่เข้ากับบุคลิกที่สุด</p>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-[#EFDCD3] space-y-1 shadow-2xs">
                    <span className="font-bold text-[#432B25] block">ทดลองสีผมแฟชั่นสุดชิค</span>
                    <p className="text-[11px] leading-relaxed">สัมผัสสีผมในฝันได้ทันทีโดยไม่ต้องเสี่ยงผมเสียหรือผ่านการฟอกเคมีจริง</p>
                  </div>
                </div>
              </div>

              {/* Sample Models Info Banner */}
              <div className="bg-gradient-to-r from-[#FFF1E9] to-[#FFE3D5]/50 border border-[#EFDCD3] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <h5 className="text-xs sm:text-sm font-bold text-[#432B25] flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#F27D68]" />
                    <span>ยังไม่สะดวกถ่ายรูปตอนนี้?</span>
                  </h5>
                  <p className="text-xs text-[#80665D]">
                    คุณสามารถกดเลือกจาก <strong>"รูปตัวอย่างนายแบบ-นางแบบ"</strong> ในหน้าอัปโหลดรูป เพื่อทดลองสลับทรงผมและสีผมต่างๆ ได้ทันทีในคลิกเดียว
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STYLES & COLOR RECOMMENDATIONS */}
          {activeTab === "styles-colors" && (
            <div className="space-y-4">
              {/* Special Mode Highlight Card (ทรงเดิม & สีธรรมชาติ) */}
              <div className="bg-white border-2 border-[#F27D68]/40 rounded-2xl p-4 shadow-xs space-y-3">
                <h4 className="text-xs sm:text-sm font-bold text-[#432B25] flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#F27D68] animate-pulse" />
                  <span>2 โหมดพิเศษยอดนิยมสำหรับคนที่อยากเปลี่ยนแค่จุดเดียว</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#FFF8F4] p-3 rounded-xl border border-[#EFDCD3] space-y-1">
                    <span className="text-xs font-bold text-[#F27D68] flex items-center gap-1.5">
                      <Scissors size={13} />
                      <span>โหมด "ทรงผมต้นฉบับ" (ทรงเดิม):</span>
                    </span>
                    <p className="text-[11px] text-[#80665D] leading-relaxed">
                      เหมาะสำหรับคนที่ชอบทรงผมเดิมอยู่แล้ว และอยากลองเปลี่ยนเฉพาะ <strong>สีผมใหม่</strong> ระบบจะคงทรงผมจริงของคุณไว้ 100% แล้วเปลี่ยนเฉพาะสีผม
                    </p>
                  </div>
                  <div className="bg-[#FFF8F4] p-3 rounded-xl border border-[#EFDCD3] space-y-1">
                    <span className="text-xs font-bold text-[#F27D68] flex items-center gap-1.5">
                      <Palette size={13} />
                      <span>โหมด "สีธรรมชาติ" (สีเดิม):</span>
                    </span>
                    <p className="text-[11px] text-[#80665D] leading-relaxed">
                      เหมาะสำหรับคนที่อยากลอง <strong>ทรงผมใหม่</strong> โดยใช้สีผมจริงของตัวเอง ระบบจะดึงสีผมจริงจากรูปถ่ายของคุณมาใส่ลงบนทรงผมใหม่
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 1: Hairstyle by Face Shape */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-bold text-[#432B25] flex items-center gap-1.5">
                    <UserCheck size={16} className="text-[#F27D68]" />
                    <span>คำแนะนำทรงผมตามรูปหน้า (Face Shapes)</span>
                  </h4>
                </div>

                {/* Face Shape Tabs */}
                <div className="flex items-center gap-1 bg-[#FFF1E9] p-1 rounded-2xl border border-[#EFDCD3] overflow-x-auto custom-scrollbar-x">
                  {(Object.keys(faceShapes) as Array<keyof typeof faceShapes>).map((shapeKey) => (
                    <button
                      key={shapeKey}
                      type="button"
                      onClick={() => setActiveFaceShape(shapeKey)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                        activeFaceShape === shapeKey
                          ? "bg-[#F27D68] text-white shadow-xs"
                          : "text-[#80665D] hover:text-[#432B25] hover:bg-white/60"
                      }`}
                    >
                      {faceShapes[shapeKey].name.split(" ")[0]}
                    </button>
                  ))}
                </div>

                {/* Active Face Shape Card */}
                <div className="bg-[#FAF7F4] border border-[#EFDCD3] rounded-2xl p-4 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h5 className="text-xs sm:text-sm font-bold text-[#432B25]">
                      {faceShapes[activeFaceShape].name}
                    </h5>
                    <span className="text-[11px] font-bold text-[#F27D68] bg-[#FFE3D5] px-2.5 py-0.5 rounded-full border border-[#EFDCD3]">
                      {faceShapes[activeFaceShape].highlight}
                    </span>
                  </div>

                  <p className="text-xs text-[#80665D] leading-relaxed">
                    {faceShapes[activeFaceShape].desc}
                  </p>

                  <div className="space-y-1.5 pt-1">
                    <span className="text-xs font-bold text-[#432B25] block">ทรงผมแนะนำใน LOOKLAB:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {faceShapes[activeFaceShape].recommendedStyles.map((styleName, sIdx) => (
                        <span
                          key={sIdx}
                          className="bg-white border border-[#EFDCD3] text-[#432B25] px-2.5 py-1 rounded-lg text-xs font-medium shadow-2xs flex items-center gap-1.5"
                        >
                          <Check size={11} className="text-[#F27D68] stroke-[2.5]" />
                          <span>{styleName}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#80665D] bg-white p-2.5 rounded-xl border border-[#EFDCD3]">
                    <span className="font-bold text-[#F27D68]">คำแนะนำ: </span>
                    {faceShapes[activeFaceShape].avoidTips}
                  </div>
                </div>
              </div>

              {/* Section 2: Hair Color by Undertone */}
              <div className="space-y-3 pt-2 border-t border-[#EFDCD3]">
                <h4 className="text-xs sm:text-sm font-bold text-[#432B25] flex items-center gap-1.5">
                  <Palette size={16} className="text-[#F27D68]" />
                  <span>คำแนะนำการเลือกสีผมตามโทนสีผิว (Skin Undertones)</span>
                </h4>

                <div className="space-y-2.5">
                  {undertoneTips.map((item, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-[#EFDCD3] rounded-2xl p-3.5 space-y-1.5 shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <span className="text-xs font-bold text-[#432B25]">{item.tone}</span>
                        <span className="text-[10px] text-[#80665D] bg-[#FFF1E9] px-2 py-0.5 rounded-full">{item.skinDesc}</span>
                      </div>
                      <div className="text-xs text-[#F27D68] font-bold">
                        เฉดสีที่เหมาะ: <span className="text-[#432B25] font-medium">{item.bestColors}</span>
                      </div>
                      <p className="text-[11px] text-[#80665D] leading-relaxed">
                        {item.why}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: TOOLS & FAQ */}
          {activeTab === "tools-faq" && (
            <div className="space-y-4">
              {/* Feature Highlights Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#432B25]">
                    <Split size={14} className="text-[#F27D68]" />
                    <span>สไลเดอร์ Before / After</span>
                  </div>
                  <p className="text-[11px] text-[#80665D] leading-relaxed">
                    เลื่อนแถบกึ่งกลางซ้าย-ขวาเพื่อเปรียบเทียบใบหน้าก่อนและหลังเปลี่ยนทรงผมได้อย่างชัดเจน
                  </p>
                </div>

                <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#432B25]">
                    <ShieldCheck size={14} className="text-[#F27D68]" />
                    <span>เปิด/ปิด ลายน้ำ LOOKLAB</span>
                  </div>
                  <p className="text-[11px] text-[#80665D] leading-relaxed">
                    มีปุ่มสลับเลือกใส่ลายน้ำหรูหรา หรือปิดลายน้ำเพื่อรับภาพถ่ายที่สะอาดตาเก็บไว้แชร์หรือใช้งานต่อได้ทันที
                  </p>
                </div>

                <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#432B25]">
                    <Maximize2 size={14} className="text-[#F27D68]" />
                    <span>ขยายภาพดูแบบเต็มจอ</span>
                  </div>
                  <p className="text-[11px] text-[#80665D] leading-relaxed">
                    คลิกที่รูปภาพผลลัพธ์เพื่อเปิดดูแบบเต็มหน้าจอ เช็กความคมชัดและรายละเอียดเส้นผมได้ทุกมุม
                  </p>
                </div>

                <div className="bg-[#FFF8F4] border border-[#EFDCD3] rounded-2xl p-3 space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#432B25]">
                    <Camera size={14} className="text-[#F27D68]" />
                    <span>ปุ่มบันทึกภาพนิ่งจากกล้อง</span>
                  </div>
                  <p className="text-[11px] text-[#80665D] leading-relaxed">
                    ในโหมดกล้องสด กดปุ่ม 'บันทึกภาพนิ่ง' มุมขวาล่างเพื่อแคปภาพสะอาดตาแบบไม่ติดวงกลมตรวจจับ
                  </p>
                </div>
              </div>

              {/* FAQ Section */}
              <div className="space-y-2 pt-2 border-t border-[#EFDCD3]">
                <h4 className="text-xs sm:text-sm font-bold text-[#432B25] flex items-center gap-1.5 mb-2">
                  <HelpCircle size={16} className="text-[#F27D68]" />
                  <span>คำถามที่พบบ่อย (FAQ)</span>
                </h4>

                <div className="space-y-2">
                  {faqs.map((faq, idx) => {
                    const isOpen = openFaqIdx === idx;
                    return (
                      <div
                        key={idx}
                        className="bg-white border border-[#EFDCD3] rounded-2xl overflow-hidden shadow-2xs transition"
                      >
                        <button
                          type="button"
                          onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                          className="w-full px-4 py-3 text-left flex items-center justify-between gap-3 text-xs sm:text-sm font-bold text-[#432B25] hover:bg-[#FFF8F4] cursor-pointer transition"
                        >
                          <span className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#FFE3D5] text-[#F27D68] text-[11px] font-extrabold flex items-center justify-center shrink-0">
                              Q
                            </span>
                            <span>{faq.q}</span>
                          </span>
                          {isOpen ? (
                            <ChevronDown size={16} className="text-[#F27D68] shrink-0" />
                          ) : (
                            <ChevronRight size={16} className="text-[#80665D] shrink-0" />
                          )}
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-3.5 pt-1 text-xs text-[#80665D] leading-relaxed border-t border-[#EFDCD3]/50 bg-[#FAF7F4] flex items-start gap-2 animate-fade-in">
                            <span className="w-5 h-5 rounded-full bg-[#47735C]/15 text-[#47735C] text-[11px] font-extrabold flex items-center justify-center shrink-0 mt-0.5">
                              A
                            </span>
                            <span>{faq.a}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with "Don't show again" Checkbox and Close Button */}
        <div className="px-5 sm:px-6 py-3.5 sm:py-4 bg-[#FFF1E9]/80 border-t border-[#EFDCD3] flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-[#80665D] hover:text-[#432B25]">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="w-4 h-4 rounded border-[#EFDCD3] text-[#F27D68] focus:ring-[#F27D68] cursor-pointer accent-[#F27D68]"
            />
            <span className="font-medium">ไม่ต้องแสดงคู่มือนี้อีกในครั้งต่อไป</span>
          </label>

          <button
            type="button"
            onClick={handleClose}
            className="w-full sm:w-auto px-6 py-2.5 rounded-full bg-[#F27D68] hover:bg-[#E96A55] active:bg-[#D85B48] text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition cursor-pointer active:scale-95 flex items-center justify-center gap-2"
          >
            <span>เข้าใจแล้ว • เริ่มทดลองลุคใหม่</span>
            <ArrowRight size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
