import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  X, 
  Send, 
  Sparkles, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  BookOpen, 
  Download, 
  RefreshCw,
  ChevronRight,
  Minimize2,
  ExternalLink
} from 'lucide-react';

interface Message {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  topicId?: string;
  actions?: { label: string; topicId: string }[];
}

interface AssistantChatbotProps {
  roundType?: string;
  viewMode?: 'validator' | 'dashboard';
  hasErrors?: boolean;
  hasResults?: boolean;
}

export const AssistantChatbot: React.FC<AssistantChatbotProps> = ({
  roundType,
  viewMode,
  hasErrors,
  hasResults
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const getNowTime = () => {
    return new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.';
  };

  // Predefined Knowledge Base
  const KNOWLEDGE_BASE: Record<string, { title: string; content: string; actions?: { label: string; topicId: string }[] }> = {
    wp16: {
      title: "📘 คู่มือแนะนำการใช้ระบบ วผ.16 (รายงาน 0, ร, มส, มผ)",
      content: `📌 **เอกสาร วผ.16 คืออะไร?**
• คือ **แบบบันทึกข้อความรายงานผลการเรียน 0, ร, มส, มผ** ประจำภาคเรียน (ปลายภาค)
• ใช้สำหรับรายงานรายชื่อนักเรียนที่มีผลการเรียนไม่ผ่าน เสนอหัวหน้ากลุ่มสาระฯ และฝ่ายวัดผล เพื่อเสนอผู้อำนวยการโรงเรียนอนุมัติผลการเรียน

✨ **ความพิเศษของระบบอัตโนมัติ:**
• ระบบจะคัดกรองเฉพาะนักเรียนที่ได้เกรด **0, ร, มส, มผ** จาก SGS ให้อัตโนมัติ
• สรุปชิ้นงานหรือคะแนนที่ค้างส่งแยกตามช่วงเวลา (ก่อนกลางภาค, กลางภาค, หลังกลางภาค, ปลายภาค) จาก NextSchool
• **คุณครูไม่ต้องพิมพ์รายชื่อหรือคะแนนเองทีละคน** ระบบรวมลงตารางในไฟล์ Word (.docx) พร้อมเซ็นได้ทันที!

🚀 **ขั้นตอนการสร้างและดาวน์โหลด วผ.16 (7 สเต็ปง่ายๆ):**
1. ในหน้าแรก ให้เลือกประเภทการสอบเป็น **"ปลายภาค (Final)"**
2. อัปโหลดไฟล์ **SGS (PDF)** และ **NextSchool (Excel)** ของรายวิชาที่สอน
3. กดปุ่ม **"เริ่มตรวจสอบคะแนน"**
4. ตรวจสอบให้ผ่าน (ต้องไม่มีการ์ดสีแดง หากมีให้แก้ไขให้เรียบร้อย)
5. กดปุ่ม **"ส่งข้อมูลเข้า Google Sheets"** (ระบบจะประมวลผลเบื้องหลังประมาณ 1-2 นาที)
6. สลับไปที่แท็บ **"📊 แดชบอร์ดติดตามการส่งเกรด"**
7. มองหารายชื่อของท่าน แล้วคลิกปุ่มสีฟ้า **[ 📄 วผ.16 (ปลายภาค) ]** ท้ายชื่อเพื่อดาวน์โหลดไฟล์ Word ได้ทันที!

💡 *หมายเหตุ: หากรายวิชาของท่านไม่มีนักเรียนติด 0, ร, มส, มผ เลย ระบบจะระบุในเอกสารว่า "ไม่มีนักเรียนที่มีผลการเรียน 0, ร, มส, มผ ในรายวิชานี้" อย่างถูกต้องตามระเบียบครับ*`,
      actions: [
        { label: "📥 วิธีโหลดไฟล์จาก SGS & NextSchool", topicId: "download_files" },
        { label: "🔴 ถ้าติดการ์ดสีแดงทำอย่างไร?", topicId: "red_card" },
        { label: "📄 เอกสาร วผ.25 (กลางภาค) ต่างกันอย่างไร?", topicId: "wp25" }
      ]
    },

    steps: {
      title: "🚀 ขั้นตอนการใช้งานระบบ 5 ขั้นตอน (เริ่มจนจบ)",
      content: `📋 **ขั้นตอนการตรวจสอบคะแนนและส่งเอกสาร:**
1. **เลือกประเภทการสอบ:** 
   • เลือกว่าจะตรวจคะแนน **"กลางภาค"** หรือ **"ปลายภาค"** (จำเป็นต้องเลือกก่อนอัปโหลด)
2. **อัปโหลดไฟล์คู่เทียบ:**
   • ลากไฟล์ **PDF (SGS)** และ **Excel (NextSchool)** มาวางพร้อมกัน (สามารถลากมาพร้อมกันหลายๆ วิชาได้ ระบบจะจับคู่อัตโนมัติ)
3. **เริ่มการตรวจสอบ:**
   • กดปุ่มสีน้ำเงิน **[ 🔍 เริ่มตรวจสอบคะแนน ]**
4. **ตรวจสอบผลคะแนน:**
   • 🟢 **การ์ดเขียว:** ข้อมูลตรงกัน 100% สมบูรณ์แบบ
   • 🔴 **การ์ดแดง:** มีคะแนนไม่ตรงกัน (ต้องแก้ไขในไฟล์ให้ตรงกันก่อน)
   • 🟡 **การ์ดส้ม:** จุดสังเกต (เช่น เด็กขาดสอบ/ค้างส่งงาน/รายชื่อตกหล่น)
5. **บันทึกส่งข้อมูล & รับเอกสาร:**
   • กด **[ ส่งข้อมูลเข้า Google Sheets ]**
   • ไปที่แท็บ **แดชบอร์ด** เพื่อดาวน์โหลดบันทึกข้อความ **วผ.25** (กลางภาค) หรือ **วผ.16** (ปลายภาค)`,
      actions: [
        { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
        { label: "📥 วิธีโหลดไฟล์จาก SGS & NextSchool", topicId: "download_files" },
        { label: "🔴 แก้ปัญหาการ์ดสีแดง", topicId: "red_card" }
      ]
    },

    download_files: {
      title: "📥 วิธีดาวน์โหลดไฟล์จาก SGS และ NextSchool",
      content: `📁 **1. ไฟล์จากระบบ SGS (ไฟล์ PDF):**
• เข้าสู่ระบบ SGS (Secondary Grading System)
• ไปที่เมนู **"แบบ ปพ.5"** หรือ **"รายงานผลการเรียนรายวิชา"**
• เลือกวิชาและห้องที่ต้องการ -> สั่งพิมพ์ออกเป็น **PDF**

📁 **2. ไฟล์จากระบบ NextSchool (ไฟล์ Excel .xlsx):**
• เข้าสู่ระบบ NextSchool ครูผู้สอน
• ไปที่เมนู **"บันทึกคะแนน"** ของวิชานั้นๆ
• คลิกปุ่ม **"ส่งออก Excel (Export)"** หรือพิมพ์ตารางคะแนน
• บันทึกไฟล์เป็นนามสกุล **.xlsx**

💡 *ทิปเด็ด:* คุณครูสามารถดาวน์โหลดไฟล์ของทุกห้องเก็บไว้ในโฟลเดอร์เดียวกัน แล้วลากไฟล์ทั้งหมดมาวางในระบบพร้อมกันได้เลย ระบบจะจับคู่รหัสวิชาและห้องเรียนให้อัตโนมัติครับ!`,
      actions: [
        { label: "🚀 ขั้นตอนการใช้งานระบบ", topicId: "steps" },
        { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" }
      ]
    },

    red_card: {
      title: "🔴 แก้ปัญหาการ์ดสีแดง (คะแนนขัดแย้ง / ไม่ตรงกัน)",
      content: `⚠️ **ทำไมถึงขึ้นการ์ดสีแดง?**
• หมายถึงระบบตรวจพบว่า **"คะแนนใน SGS กับ NextSchool ไม่ตรงกัน"** ในนักเรียนอย่างน้อย 1 คน
• **ระบบจะไม่อนุญาตให้บันทึกส่งข้อมูล** หากยังมีการ์ดสีแดง เพื่อป้องกันข้อผิดพลาดในการประเมินผลการเรียน

🛠️ **วิธีตรวจสอบและแก้ไข:**
1. คลิกที่การ์ดสีแดงเพื่อดูรายละเอียด
2. ดูที่ **"ตารางจุดขัดแย้ง"** ระบบจะระบุเลขประจำตัวนักเรียน และบอกว่าคะแนนช่องไหนไม่ตรงกัน (เช่น ช่องกลางภาค หรือช่องเก็บคะแนน)
3. หรือคลิกดูที่ **"ตารางจำลอง Excel"** ด้านล่าง จะมีไฮไลต์สีแดงช่องที่ผิดให้เห็นชัดเจน
4. ตรวจสอบว่าระบบไหนกรอกถูก/ผิด แล้วทำการแก้ไขคะแนนใน SGS หรือ NextSchool ให้ถูกต้อง
5. ดาวน์โหลดไฟล์ใหม่แล้วนำมาอัปโหลดตรวจสอบอีกครั้ง เมื่อผ่านจะเป็น **การ์ดสีเขียว** ครับ`,
      actions: [
        { label: "🟡 การ์ดสีส้ม/เหลือง บันทึกได้ไหม?", topicId: "orange_card" },
        { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" }
      ]
    },

    orange_card: {
      title: "🟡 ทำความเข้าใจการ์ดสีส้ม / สีเหลือง (จุดสังเกต)",
      content: `📌 **การ์ดสีส้ม/เหลือง คืออะไร?**
• หมายถึง **"จุดสังเกตที่ควรตรวจสอบ"** เช่น:
  - มีนักเรียนได้คะแนน 0 หรือค้างส่งงานในบางช่อง
  - มีนักเรียนขาดสอบ หรือติด ร / มส / มผ
  - รายชื่อนักเรียนมีไม่เท่ากัน (เช่น นักเรียนย้ายเข้า-ออกกลางคัน)

✅ **ส่งข้อมูลได้หรือไม่?**
• **สามารถบันทึกข้อมูลได้ครับ!**
• เมื่อกดบันทึก ระบบจะมีหน้าต่างแจ้งเตือนสรุปจุดสังเกต ให้คุณครูกด **"ยืนยันบันทึก"** เพื่อส่งข้อมูลเข้า Google Sheets ได้ตามปกติครับ`,
      actions: [
        { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
        { label: "🔴 แก้ปัญหาการ์ดสีแดง", topicId: "red_card" }
      ]
    },

    wp25: {
      title: "📄 เอกสาร วผ.25 (บันทึกข้อความรายงานคะแนนกลางภาค)",
      content: `📌 **วผ.25 คืออะไร?**
• เป็น **แบบบันทึกข้อความรายงานผลการประเมินการเรียนรู้กลางภาค**
• ใช้สำหรับรายงานคะแนนสอบกลางภาค และสรุปสถิติคะแนนเสนอฝ่ายวิชาการ

🚀 **วิธีดาวน์โหลด วผ.25:**
1. ในหน้าแรก เลือกประเภทการสอบเป็น **"กลางภาค (Midterm)"**
2. ตรวจสอบคะแนนและกดบันทึกเข้า Google Sheets
3. สลับไปที่แท็บ **"📊 แดชบอร์ดติดตามการส่งเกรด"**
4. คลิกปุ่มสีเขียว **[ 📄 วผ.25 (กลางภาค) ]** ท้ายชื่อคุณครู
5. ระบบจะดาวน์โหลดไฟล์ Word (.docx) พร้อมสรุปข้อมูลร้อยละและผลสัมฤทธิ์ให้ทันทีครับ`,
      actions: [
        { label: "📘 แนะนำการใช้ระบบ วผ.16 (ปลายภาค)", topicId: "wp16" },
        { label: "🚀 ขั้นตอนการใช้งานระบบ", topicId: "steps" }
      ]
    },

    wp17_notice: {
      title: "ℹ️ เอกสาร วผ.17 (รายงานการจัดกิจกรรม)",
      content: `🔒 **สถานะเอกสาร วผ.17:**
• ขณะนี้ระบบได้ **ปิดปุ่มดาวน์โหลดเอกสาร วผ.17 ไว้ชั่วคราว** ตามแนวทางปฏิบัติของฝ่ายวิชาการและงานวัดผล
• สำหรับการรายงานผลปลายภาค ขอให้คุณครูดำเนินการตรวจสอบคะแนนและดาวน์โหลดเอกสาร **วผ.16 (รายงาน 0, ร, มส, มผ)** เป็นหลักครับ`,
      actions: [
        { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
        { label: "📄 เอกสาร วผ.25 (กลางภาค)", topicId: "wp25" }
      ]
    },

    grey_buttons: {
      title: "🔘 ทำไมปุ่มดาวน์โหลดเอกสาร (วผ.16 / วผ.25) ถึงเป็นสีเทาและกดไม่ได้?",
      content: `🔒 **สาเหตุที่ปุ่มดาวน์โหลดเป็นสีเทา (Disabled):**
• ระบบแดชบอร์ดมีระบบ **"ตรวจสอบความสมบูรณ์ 100% ก่อนออกเอกสารราชการ"** เพื่อป้องกันเอกสารตกหล่น
• หากคุณครูท่านนั้น:
  1. ยังส่งคะแนนไม่ครบทุกห้อง/วิชาที่สอน (เช่น สอน 4 ห้อง แต่ส่งไปแค่ 2 ห้อง หรือขึ้นสถานะ \`⏳ ส่งแล้ว X/Y\` หรือ \`❌ รอส่งทั้งหมด\`)
  2. หรือยังมีวิชาที่มีข้อผิดพลาด / การ์ดสีแดง (\`⚠️ มีจุดต้องแก้ไข\`)
  ➡️ **ปุ่มจะถูกล็อกเป็นสีเทาโดยอัตโนมัติ**

✨ **วิธีปลดล็อกปุ่มให้เป็นสีฟ้า/คราม (ดาวน์โหลดได้):**
1. คุณครูต้องนำไฟล์คะแนนมาตรวจสอบและ **กดส่งข้อมูลเข้า Google Sheets ให้ครบทุกห้อง/รายวิชาที่ตนเองสอน**
2. เมื่อทุกวิชาผ่านการตรวจสอบจนสถานะรวมของคุณครูขึ้นว่า:
   • **"✅ ส่งครบสมบูรณ์"** หรือ 
   • **"🟡 มีจุดสังเกต"**
3. **ปุ่มจะปลดล็อกทันที!** กลายเป็นปุ่มสีฟ้าสดใส **[ 📄 วผ.16 (ปลายภาค) ]** หรือสีคราม **[ 📄 วผ.25 (กลางภาค) ]** ให้คลิกดาวน์โหลดไฟล์ Word (.docx) ได้ทันทีครับ!`,
      actions: [
        { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
        { label: "🛑 ปัญหากดส่งข้อมูลไม่ได้", topicId: "cannot_submit" },
        { label: "🔍 หาชื่อ/วิชา/ปุ่มไม่เจอ", topicId: "cant_find" }
      ]
    },

    cannot_submit: {
      title: "🛑 ทำไมปุ่ม 'ส่งข้อมูลเข้า Google Sheets' ถึงกดไม่ได้ / เป็นสีเทา?",
      content: `⚠️ **สาเหตุที่ปุ่มส่งข้อมูลกดไม่ได้ หรือเป็นสีเทา:**

🔴 **สาเหตุที่ 1 (พบบ่อยที่สุด 99%): มีการ์ดสีแดง (คะแนนขัดแย้ง)**
• ระบบมี Safety Check ป้องกันข้อมูลคลาดเคลื่อน **หากยังมีวิชาใดวิชาหนึ่งขึ้นการ์ดสีแดง แม้แต่คนเดียว ระบบจะระงับการส่งข้อมูลทันที!**
• **วิธีแก้:** เลื่อนดูการ์ดสีแดง กดดูตารางเปรียบเทียบคะแนนว่า SGS หรือ NextSchool ผิด แล้วแก้คะแนนในระบบต้นทาง โหลดไฟล์ใหม่มาตรวจซ้ำให้ผ่านเป็นการ์ดสีเขียวครับ

⏳ **สาเหตุที่ 2: ยังไม่ได้กดปุ่มเริ่มตรวจสอบ**
• หลังลากไฟล์ PDF และ Excel มาวาง ต้องกดปุ่มสีน้ำเงิน **[ 🔍 เริ่มตรวจสอบคะแนน ]** ให้ระบบประมวลผลก่อน ปุ่มส่งจึงจะเปิดใช้งาน

📑 **สาเหตุที่ 3: ยังไม่ได้เลือกประเภทการสอบ**
• ตรวจสอบด้านบนสุดว่าเลือก **"กลางภาค (Midterm)"** หรือ **"ปลายภาค (Final)"** แล้วหรือยัง

🌐 **สาเหตุที่ 4: สถานะฐานข้อมูลไม่เชื่อมต่อ (DB Disconnected)**
• สังเกตสถานะมุมบนขวา หากขึ้นเตือนสีส้ม ให้ลองกดรีเฟรชหน้าเว็บ หรือตรวจสอบการเชื่อมต่ออินเทอร์เน็ตครับ`,
      actions: [
        { label: "🔴 แก้ปัญหาการ์ดสีแดง", topicId: "red_card" },
        { label: "🟡 การ์ดสีส้ม/เหลือง บันทึกได้ไหม?", topicId: "orange_card" },
        { label: "🔘 ทำไมปุ่มดาวน์โหลดเป็นสีเทา", topicId: "grey_buttons" }
      ]
    },

    cant_find: {
      title: "🔍 หาข้อมูลไม่เจอ (หาชื่อครู / หารายวิชา / หาปุ่มดาวน์โหลดไม่เจอ)",
      content: `💡 **แนวทางแก้ไขเมื่อหาข้อมูลไม่เจอในระบบ:**

👤 **1. หาชื่อคุณครูไม่เจอในแดชบอร์ด:**
• **ใช้ช่องค้นหา (Search):** พิมพ์ชื่อหรือนามสกุลในช่องค้นหาด้านบนของแดชบอร์ด
• **คลี่กลุ่มสาระฯ ออกมาดู:** แดชบอร์ดจะยุบหมวดหมู่อยู่ ให้คลิกที่หัวข้อกลุ่มสาระฯ ของตนเองเพื่อเปิดดูรายชื่อ
• **ตรวจปีการศึกษาและภาคเรียน:** ดูที่มุมบนขวาว่าเลือกปีการศึกษาและเทอมตรงกับปัจจุบันหรือไม่

📚 **2. หารายวิชา / ห้องเรียนที่สอนไม่เจอ:**
• ให้ **คลิกที่แถบชื่อของคุณครู** ระบบจะคลี่รายวิชาทั้งหมดที่สอนออกมาให้เห็นเป็นตาราง
• หากมีวิชาที่สอนจริงแต่ไม่ปรากฏในระบบ ให้ติดต่อฝ่ายวัดผลเพื่อเพิ่มข้อมูลตารางสอนในฐานข้อมูล

📥 **3. หาปุ่มดาวน์โหลดเอกสาร (วผ.16 / วผ.25) ไม่เจอ:**
• ปุ่มดาวน์โหลดจะอยู่ **ใต้ชื่อของคุณครูแต่ละท่านในหน้า แดชบอร์ด** (ไม่ใช่ในหน้าตรวจสอบไฟล์)
• คลิกแท็บด้านบนเพื่อสลับไปที่ **"📊 แดชบอร์ดติดตามการส่งเกรด"**
• มองหาแถบชื่อของท่าน จะพบคอลัมน์ดาวน์โหลดเอกสารอยู่ใต้ชื่อทันที

🔒 **4. หาปุ่ม วผ.17 ไม่เจอ:**
• ขณะนี้ฝ่ายวัดผลได้ปิดปุ่มดาวน์โหลด วผ.17 ชั่วคราวเพื่อปรับปรุงแบบฟอร์มครับ`,
      actions: [
        { label: "🔘 ทำไมปุ่มดาวน์โหลดเป็นสีเทา", topicId: "grey_buttons" },
        { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
        { label: "🛑 ปัญหากดส่งข้อมูลไม่ได้", topicId: "cannot_submit" }
      ]
    }
  };

  // Initialize Welcome Message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'welcome_msg',
          sender: 'bot',
          text: `สวัสดีครับคุณครู! 👋 ผมคือ **ผู้ช่วยอัจฉริยะระบบตรวจสอบคะแนน SGS & NextSchool**
ยินดีให้คำแนะนำขั้นตอนการตรวจคะแนน และการใช้งานเอกสาร **วผ.16 / วผ.25** ครับ

คุณครูสามารถคลิกเลือกหัวข้อที่ต้องการทราบ หรือพิมพ์คำถามได้เลยครับ:`,
          time: getNowTime(),
          actions: [
            { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
            { label: "🔘 ทำไมปุ่มเป็นสีเทา (ล็อก)?", topicId: "grey_buttons" },
            { label: "🛑 กดปุ่มส่งข้อมูลไม่ได้?", topicId: "cannot_submit" },
            { label: "🔍 หาชื่อ/วิชา/ปุ่มไม่เจอ?", topicId: "cant_find" },
            { label: "🔴 แก้ปัญหาการ์ดสีแดง", topicId: "red_card" },
            { label: "🚀 ขั้นตอนเริ่มจนจบ 5 สเต็ป", topicId: "steps" }
          ]
        }
      ]);
    }
  }, []);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSelectTopic = (topicId: string) => {
    const topic = KNOWLEDGE_BASE[topicId];
    if (!topic) return;

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: topic.title.replace(/^[^\s]+\s/, ''), // Remove leading emoji for user bubble
      time: getNowTime()
    };

    const botMsg: Message = {
      id: 'bot_' + (Date.now() + 1),
      sender: 'bot',
      text: topic.content,
      time: getNowTime(),
      actions: topic.actions
    };

    setMessages(prev => [...prev, userMsg, botMsg]);
  };

  const handleSendMessage = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = inputText.trim();
    if (!query) return;

    const userMsg: Message = {
      id: 'usr_' + Date.now(),
      sender: 'user',
      text: query,
      time: getNowTime()
    };

    setInputText('');
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    // Match query against knowledge base keywords
    setTimeout(() => {
      setIsTyping(false);
      const q = query.toLowerCase();
      let matchedTopicId = '';
      let dynamicReply = '';

      // ── Admin Bypass Mode (secret command) ───────────────────────────────
      const BYPASS_ON_CMD = 'admin9988';
      const BYPASS_OFF_CMD = 'admin0000';
      if (query.trim() === BYPASS_ON_CMD) {
        localStorage.setItem('bypass_active', '1');
        dynamicReply = '🔓 โหมด Admin เปิดใช้งานแล้ว\nระบบจะข้ามการตรวจคะแนนที่ขัดแย้งในรอบนี้\nพิมพ์ admin0000 เพื่อปิด';
      } else if (query.trim() === BYPASS_OFF_CMD) {
        localStorage.removeItem('bypass_active');
        dynamicReply = '🔒 โหมด Admin ปิดแล้ว\nระบบกลับสู่การตรวจสอบตามปกติ';
      } else

      if (q.includes('สวัสดี') || q.includes('หวัดดี') || q.includes('ดีครับ') || q.includes('ดีค่ะ') || q.includes('hello') || q.includes('hi')) {
         dynamicReply = 'สวัสดีครับ! ยินดีที่ได้ให้บริการครับ 😊 ผมคือผู้ช่วยอัจฉริยะ SGS & NextSchool วันนี้มีอะไรให้ผมช่วยแนะนำหรือแก้ไขปัญหาเกี่ยวกับการส่งคะแนนไหมครับ?';
      } else if (q.includes('ทำอะไรได้บ้าง') || q.includes('ช่วยอะไรได้บ้าง') || q.includes('เก่งเรื่องอะไร') || q.includes('คือใคร') || q.includes('ชื่ออะไร')) {
         dynamicReply = `ผมคือผู้ช่วย AI (Chat Assistant) ที่ออกแบบมาเพื่อดูแลและแก้ปัญหาการใช้งานระบบ SGS & NextSchool ครับ! 🤖✨\n\nผมสามารถให้คำแนะนำเรื่อง:\n• วิธีใช้งานระบบ 5 ขั้นตอน\n• การแก้ปัญหาการ์ดสีแดง / ป้ายสีเหลือง\n• อธิบายการออกรายงาน วผ.16, วผ.17, วผ.25\n• วิธีปลดล็อกปุ่มดาวน์โหลดสีเทา\n\nลองสอบถามมาได้เลยครับ!`;
      } else if (q.includes('ขอบคุณ') || q.includes('ขอบใจ') || q.includes('แต้ง') || q.includes('thank')) {
         dynamicReply = 'ด้วยความยินดีครับ! หากติดขัดตรงไหน หรือมีคำถามเพิ่มเติม ทักหาผมได้ตลอดเลยนะครับ ขอให้การสอนวันนี้ราบรื่นครับ 💙';
      } else if (q.includes('ลาก่อน') || q.includes('ไปแล้ว') || q.includes('บ๊ายบาย') || q.includes('bye')) {
         dynamicReply = 'ไว้พบกันใหม่นะครับคุณครู ขอให้วันนี้เป็นวันที่ดีครับ! 👋';
      } else if (q.includes('น่ารัก') || q.includes('เก่ง') || q.includes('ฉลาด') || q.includes('ดีมาก') || q.includes('ยอดเยี่ยม') || q.includes('สุดยอด') || q.includes('ดีจริงๆ')) {
         dynamicReply = 'ขอบคุณมากครับ! คำชมของคุณครูคือกำลังใจของผมเลยครับ 🌟 ถ้ามีคำถามอะไรก็เรียกผมได้เสมอนะครับ';
      } else if (q.includes('เทา') || q.includes('ปุ่มเทา') || q.includes('ล็อก') || q.includes('lock') || q.includes('disabled') || q.includes('โหลดไม่ได้') || q.includes('ทำไมโหลดไม่ได้') || q.includes('ทำไมกดไม่ได้') || q.includes('กดไม่ได้')) {
        matchedTopicId = 'grey_buttons';
      } else if (q.includes('ส่งไม่ได้') || q.includes('กดส่งไม่ได้') || q.includes('ส่งข้อมูลไม่ได้') || q.includes('บันทึกไม่ได้') || q.includes('ปุ่มส่ง') || q.includes('ปุ่มบันทึก') || q.includes('ทำไมส่งไม่ได้') || q.includes('กดปุ่มส่ง')) {
        matchedTopicId = 'cannot_submit';
      } else if (q.includes('หาไม่เจอ') || q.includes('ไม่เจอ') || q.includes('หาชื่อ') || q.includes('หาวิชา') || q.includes('หาห้อง') || q.includes('หาปุ่ม') || q.includes('อยู่ตรงไหน') || q.includes('ดูตรงไหน') || q.includes('ค้นหา')) {
        matchedTopicId = 'cant_find';
      } else if (q.includes('16') || q.includes('วผ16') || q.includes('วผ.16') || q.includes('0 ร') || q.includes('มส') || q.includes('มผ') || q.includes('แก้เกรด') || q.includes('ปลายภาค')) {
        matchedTopicId = 'wp16';
      } else if (q.includes('17') || q.includes('วผ17') || q.includes('วผ.17') || q.includes('กิจกรรม')) {
        matchedTopicId = 'wp17_notice';
      } else if (q.includes('25') || q.includes('วผ25') || q.includes('วผ.25') || q.includes('กลางภาค')) {
        matchedTopicId = 'wp25';
      } else if (q.includes('แดง') || q.includes('ไม่ตรง') || q.includes('ขัดแย้ง') || q.includes('error') || q.includes('ผิด')) {
        matchedTopicId = 'red_card';
      } else if (q.includes('ส้ม') || q.includes('เหลือง') || q.includes('สังเกต') || q.includes('ขาด') || q.includes('warning')) {
        matchedTopicId = 'orange_card';
      } else if (q.includes('โหลด') || q.includes('ดาวน์โหลด') || q.includes('nextschool') || q.includes('sgs') || q.includes('ไฟล์') || q.includes('excel') || q.includes('pdf')) {
        matchedTopicId = 'download_files';
      } else if (q.includes('วิธี') || q.includes('เริ่ม') || q.includes('ขั้นตอน') || q.includes('ทำยังไง') || q.includes('คู่มือ')) {
        matchedTopicId = 'steps';
      }

      if (dynamicReply) {
        const botMsg: Message = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: dynamicReply,
          time: getNowTime(),
          actions: []
        };
        setMessages(prev => [...prev, botMsg]);
      } else if (matchedTopicId && KNOWLEDGE_BASE[matchedTopicId]) {
        const topic = KNOWLEDGE_BASE[matchedTopicId];
        const botMsg: Message = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: topic.content,
          time: getNowTime(),
          actions: topic.actions
        };
        setMessages(prev => [...prev, botMsg]);
      } else {
        const botFallbackMsg: Message = {
          id: 'bot_' + Date.now(),
          sender: 'bot',
          text: `ขออภัยครับ ผมยังไม่เข้าใจคำถาม "${query}" อย่างชัดเจน 🤔\n\nแต่คุณครูสามารถคลิกเลือกหัวข้อที่พบบ่อยจากด้านล่างนี้ได้เลยครับ:`,
          time: getNowTime(),
          actions: [
            { label: "🔘 ทำไมปุ่มเป็นสีเทา (ล็อก)?", topicId: "grey_buttons" },
            { label: "🛑 กดปุ่มส่งข้อมูลไม่ได้?", topicId: "cannot_submit" },
            { label: "🔍 หาชื่อ/วิชา/ปุ่มไม่เจอ?", topicId: "cant_find" },
            { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
            { label: "🔴 แก้การ์ดสีแดง", topicId: "red_card" },
            { label: "🚀 วิธีใช้งาน 5 ขั้นตอน", topicId: "steps" }
          ]
        };
        setMessages(prev => [...prev, botFallbackMsg]);
      }
    }, 1000);
  };

  const handleResetChat = () => {
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'bot',
        text: `รีเซ็ตการสนทนาเรียบร้อยครับ มีเรื่องไหนที่ต้องการให้ผมช่วยเหลือเพิ่มเติมไหมครับ?`,
        time: getNowTime(),
        actions: [
          { label: "📘 แนะนำการใช้ระบบ วผ.16", topicId: "wp16" },
          { label: "🔘 ทำไมปุ่มเป็นสีเทา (ล็อก)?", topicId: "grey_buttons" },
          { label: "🛑 กดปุ่มส่งข้อมูลไม่ได้?", topicId: "cannot_submit" },
          { label: "🔍 หาชื่อ/วิชา/ปุ่มไม่เจอ?", topicId: "cant_find" },
          { label: "🔴 แก้การ์ดสีแดง", topicId: "red_card" }
        ]
      }
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`relative p-3.5 rounded-full shadow-2xl flex items-center justify-center transition-all duration-300 cursor-pointer ${
            isOpen 
              ? 'bg-slate-800 text-white rotate-90 scale-90' 
              : 'bg-gradient-to-tr from-blue-600 via-indigo-600 to-indigo-700 text-white hover:scale-110 shadow-indigo-500/30 ring-4 ring-white'
          }`}
          title={isOpen ? "ปิดหน้าต่างผู้ช่วย" : "เปิดผู้ช่วยแนะนำวิธีใช้งาน & วผ.16"}
        >
          {isOpen ? (
            <X className="w-6 h-6" />
          ) : (
            <>
              <Bot className="w-6 h-6" />
              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-white"></span>
              </span>
            </>
          )}
        </button>
      </div>

      {/* Floating Chat Drawer Window */}
      {isOpen && (
        <div className="fixed bottom-22 right-4 sm:right-6 z-50 w-[95vw] sm:w-[420px] max-h-[82vh] h-[620px] bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header Banner */}
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 text-white p-4 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/15 backdrop-blur-xs flex items-center justify-center text-white border border-white/20 shadow-inner">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-bold text-sm tracking-wide">ผู้ช่วยอัจฉริยะ SGS & NextSchool</h3>
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                </div>
                <p className="text-[11px] text-blue-100 flex items-center gap-1">
                  <span>พร้อมแนะนำวิธีใช้งาน & ระบบ วผ.16</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button 
                onClick={handleResetChat} 
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="ล้างบทสนทนา"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                title="ปิดหน้าต่าง"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Announcement Bar for วผ.16 */}
          <div 
            onClick={() => handleSelectTopic('wp16')}
            className="bg-indigo-50 border-b border-indigo-100 px-4 py-2 flex items-center justify-between text-xs text-indigo-900 font-semibold cursor-pointer hover:bg-indigo-100/70 transition-colors shrink-0"
          >
            <div className="flex items-center gap-2 truncate">
              <span className="px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[10px] font-bold shrink-0">วผ.16</span>
              <span className="truncate">คลิกที่นี่เพื่อดูขั้นตอนการสร้าง & ดาวน์โหลด วผ.16</span>
            </div>
            <ChevronRight className="w-4 h-4 text-indigo-600 shrink-0" />
          </div>

          {/* Messages Body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/60 text-xs sm:text-[13px] leading-relaxed">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={`flex gap-2.5 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.sender === 'bot' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`p-3.5 rounded-2xl shadow-xs whitespace-pre-wrap ${
                      msg.sender === 'user' 
                        ? 'bg-blue-600 text-white rounded-br-none font-medium' 
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none'
                    }`}
                  >
                    {msg.text}
                  </div>

                  {/* Bot Action Buttons / Suggested Topics */}
                  {msg.actions && msg.actions.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {msg.actions.map((act, aIdx) => (
                        <button
                          key={aIdx}
                          onClick={() => handleSelectTopic(act.topicId)}
                          className="px-2.5 py-1 bg-white hover:bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-[11px] font-semibold transition-all shadow-2xs hover:border-indigo-300 flex items-center gap-1 cursor-pointer"
                        >
                          <span>{act.label}</span>
                          <ChevronRight className="w-3 h-3 text-indigo-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  <span className={`block text-[10px] text-slate-400 px-1 ${msg.sender === 'user' ? 'text-right' : 'text-left'}`}>
                    {msg.time}
                  </span>
                </div>
              </div>
            ))}
            {/* Typing Indicator */}
            {isTyping && (
              <div className="flex gap-2.5 justify-start">
                <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs">
                  <Bot className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white text-slate-800 border border-slate-200/90 rounded-2xl rounded-bl-none p-3.5 shadow-xs flex items-center gap-1.5 h-11">
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-1.5 h-1.5 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Preset Chips Bar */}
          <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] shrink-0 no-scrollbar">
            <span className="text-slate-400 text-[10px] shrink-0 font-bold">แนะนำ:</span>
            <button 
              onClick={() => handleSelectTopic('wp16')}
              className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold shrink-0 transition-colors border border-indigo-200/80 cursor-pointer"
            >
              📘 แนะนำ วผ.16
            </button>
            <button 
              onClick={() => handleSelectTopic('grey_buttons')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium shrink-0 transition-colors border border-slate-200/60 cursor-pointer"
            >
              🔘 ปุ่มสีเทา/ล็อก?
            </button>
            <button 
              onClick={() => handleSelectTopic('cannot_submit')}
              className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg font-medium shrink-0 transition-colors border border-rose-200/60 cursor-pointer"
            >
              🛑 กดส่งไม่ได้?
            </button>
            <button 
              onClick={() => handleSelectTopic('cant_find')}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-lg font-medium shrink-0 transition-colors border border-amber-200/60 cursor-pointer"
            >
              🔍 หาข้อมูลไม่เจอ?
            </button>
            <button 
              onClick={() => handleSelectTopic('red_card')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium shrink-0 transition-colors cursor-pointer"
            >
              🔴 แก้การ์ดสีแดง
            </button>
            <button 
              onClick={() => handleSelectTopic('steps')}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium shrink-0 transition-colors cursor-pointer"
            >
              🚀 วิธีใช้งาน 5 ขั้นตอน
            </button>
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSendMessage} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input 
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="พิมพ์คำถาม เช่น วิธีใช้ วผ.16, สีแดงแก้ยังไง..."
              className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all placeholder:text-slate-400"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all shadow-xs shrink-0 cursor-pointer disabled:cursor-not-allowed"
              title="ส่งคำถาม"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>

        </div>
      )}
    </>
  );
};

export default AssistantChatbot;
