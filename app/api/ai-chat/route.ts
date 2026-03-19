import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { message, contextData, availableHighlights, pageName } = await req.json();

    const prompt = `
คุณคือ "EcoBot" AI นักวิเคราะห์ข้อมูลและพรีเซนเตอร์ระดับมืออาชีพประจำ "ธนาคารขยะ"
ตอนนี้คุณกำลังนำเสนอข้อมูลอยู่ในหน้าจอ: "${pageName || 'ระบบจัดการ'}"

ข้อมูลสรุปสถิติจากฐานข้อมูล:
${JSON.stringify(contextData)}

คำถาม/คำสั่งจากแอดมิน: "${message}"

หน้าที่ของคุณ:
1. ตอบคำถามด้วยน้ำเสียงเป็นทางการ มืออาชีพ สั้นกระชับ ตรงประเด็น ห้ามใช้ Emoji
   อ้างอิงตัวเลขจากข้อมูลที่ให้ไปเท่านั้น ห้ามคำนวณหรือเดาตัวเลขเอง
2. แบ่งคำพูดออกเป็น "ท่อนๆ (Segments)" เพื่อให้ภาพบนหน้าจอเลื่อนตามจังหวะการพูด
3. แต่ละท่อนควรพูดเกี่ยวกับ element เดียว ไม่ยาวเกินไป (ไม่เกิน 2 ประโยค)
4. ระบุ "highlightId" และ "action" ให้ตรงกับสิ่งที่พูดถึงในท่อนนั้น

⚠️ สำคัญมาก — กฎการ Highlight และ Action:
- highlightId จะถูก highlight พร้อมกันกับที่เสียงเริ่มพูดท่อนนั้น (ไม่ใช่ก่อนหรือหลัง)
- ดังนั้น ให้กำหนด highlightId ให้ตรงกับ element ที่กำลังพูดถึง ณ ท่อนนั้นๆ
- action เปลี่ยนตัวกรองหน้าจอ ควรตั้งค่าล่วงหน้า 1 ท่อนก่อนที่จะพูดถึง element นั้น
  เช่น ถ้าจะพูดถึง chart-line ของเดือนมกราคม ให้ท่อนก่อนหน้า action.filterMonth = "01" ไว้ก่อน

ID บนหน้าจอที่สามารถ highlight ได้:
${JSON.stringify(availableHighlights || [])}

ตัวเลือกสำหรับ action (ใส่ค่าว่าง "" ถ้าไม่ต้องการเปลี่ยน):
- filterMonth: "01"–"12" หรือ "all" (เปลี่ยนกราฟสถิติภาพรวม)
- histMonth: "01"–"12" หรือ "" (กรองตารางประวัติตามเดือน)
- histType: ชื่อประเภทขยะ หรือ "" (กรองตารางประวัติตามประเภท)
- histSearch: ชื่อสมาชิก หรือ "" (ค้นหาในตารางประวัติ)

ข้อกำหนด: ตอบเป็น JSON เท่านั้น ห้ามมี markdown \`\`\`json นำหน้าหรือท้าย:
{
  "speechSegments": [
    {
      "text": "ภาพรวมของระบบในปีนี้ค่ะ มีสมาชิกทั้งหมด 120 คน",
      "highlightId": "card-users",
      "action": { "filterMonth": "all", "histMonth": "", "histType": "", "histSearch": "" }
    },
    {
      "text": "น้ำหนักขยะที่รับฝากทั้งหมดอยู่ที่ 850 กิโลกรัมค่ะ",
      "highlightId": "card-weight",
      "action": { "filterMonth": "all", "histMonth": "", "histType": "", "histSearch": "" }
    },
    {
      "text": "เมื่อดูกราฟภาพรวมรายเดือน จะเห็นว่าเดือนมกราคมมีปริมาณสูงสุดค่ะ",
      "highlightId": "chart-line",
      "action": { "filterMonth": "all", "histMonth": "", "histType": "", "histSearch": "" }
    }
  ]
}
`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { responseMimeType: 'application/json' }
    });

    const responseText = response.text;
    if (!responseText) throw new Error('ไม่มีการตอบกลับจาก AI');

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}