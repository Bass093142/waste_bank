import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// เริ่มต้นใช้งาน SDK ตัวใหม่
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { message, contextData, availableHighlights, pageName } = await req.json();

    const prompt = `
    คุณคือ "EcoBot" AI นักวิเคราะห์ข้อมูลและพรีเซนเตอร์ระดับมืออาชีพประจำ "ธนาคารขยะ"
    ตอนนี้คุณกำลังนำเสนอข้อมูลอยู่ในหน้าจอ: "${pageName || 'ระบบจัดการ'}"
    
    ข้อมูลสรุปสถิติจากฐานข้อมูล (คำนวณค่า CO2 จาก น้ำหนัก x ค่าสัมประสิทธิ์คาร์บอน ของขยะแต่ละประเภทมาให้แล้ว):
    ${JSON.stringify(contextData)}

    คำถาม/คำสั่งจากแอดมิน: "${message}"

    หน้าที่ของคุณ:
    1. ตอบคำถามด้วยน้ำเสียงเป็นทางการ มืออาชีพ สั้นกระชับ ตรงประเด็น ห้ามใช้ Emoji โดยอ้างอิงตัวเลขจากข้อมูลที่ให้ไปเท่านั้น ห้ามคำนวณหรือเดาตัวเลขเอง
    2. ให้แบ่งคำพูดของคุณออกเป็น "ท่อนๆ (Segments)" เพื่อให้ภาพบนหน้าจอเลื่อนตามจังหวะการพูดของคุณ
    3. ในแต่ละท่อน (Segment) หากคุณกำลังพูดถึงข้อมูลเดือนไหน หรือกล่องข้อมูลไหน ให้คุณกำหนด "highlightId" และ "action" ประจำท่อนนั้นๆ เพื่อให้หน้าเว็บเปลี่ยนกราฟหรือตัวกรองไปพร้อมกับเสียงพูดของคุณ

    ID บนหน้าจอที่คุณสามารถชี้ไฮไลท์ได้:
    ${JSON.stringify(availableHighlights || [])}
    
    ตัวเลือกสำหรับ action ในแต่ละ Segment (หากไม่ต้องการเปลี่ยนหน้าจอ ให้ใส่ค่าว่าง ""):
    - filterMonth: "01" ถึง "12" หรือ "all" (เพื่อเปลี่ยนกราฟสถิติภาพรวม)
    - histMonth: "01" ถึง "12" หรือ "" (เพื่อกรองตารางประวัติ)
    - histType: ชื่อประเภทขยะ หรือ "" (เพื่อกรองตารางประวัติตามประเภทขยะ)
    - histSearch: ข้อความค้นหาชื่อสมาชิก หรือ "" (หากต้องการหาคนใดคนหนึ่งในตาราง)

    ข้อกำหนด: ตอบเป็น JSON เท่านั้น โครงสร้างเป๊ะๆ ตามนี้ (ห้ามมี markdown \`\`\`json นำหน้าหรือตามหลัง):
    {
      "speechSegments": [
        { 
          "text": "สวัสดีค่ะ เรามาดูภาพรวมของเดือนมกราคมกันนะคะ", 
          "highlightId": "chart-line",
          "action": { "filterMonth": "01", "histMonth": "01", "histType": "", "histSearch": "" }
        },
        { 
          "text": "จะเห็นว่าสัดส่วนขยะพลาสติกมีเยอะที่สุดค่ะ ตามกราฟวงกลมนี้", 
          "highlightId": "chart-pie",
          "action": { "filterMonth": "01", "histMonth": "01", "histType": "ขวดพลาสติกใส (PET)", "histSearch": "" }
        },
        { 
          "text": "ส่วนนี่คือรายการสมาชิกที่ฝากขยะในเดือนมกราคมค่ะ", 
          "highlightId": "history-table",
          "action": { "filterMonth": "01", "histMonth": "01", "histType": "", "histSearch": "" }
        }
      ]
    }
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: "application/json"
        }
    });

    const responseText = response.text;
    
    if (!responseText) {
        throw new Error("ไม่มีการตอบกลับจาก AI");
    }

    const data = JSON.parse(responseText);
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}