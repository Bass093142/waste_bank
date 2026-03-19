import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

// เริ่มต้นใช้งาน SDK ตัวใหม่
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function POST(req: NextRequest) {
  try {
    const { image } = await req.json();
    if (!image) return NextResponse.json({ error: 'No image provided' }, { status: 400 });

    // ตัด Header ของ Base64 ออกเพื่อให้ Gemini อ่านได้
    const base64Data = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

    // 🟢 คำสั่ง Prompt แบบใหม่ (บังคับให้ฉลาดขึ้น ไม่ยัดเยียดหมวดหมู่)
    const prompt = `
    คุณคือ AI ผู้เชี่ยวชาญด้านการคัดแยกขยะรีไซเคิล
    ให้วิเคราะห์รูปภาพที่แนบมา ว่าวัตถุหลักในภาพคืออะไร และสามารถจัดให้อยู่ใน 8 ประเภทขยะนี้ได้หรือไม่:
    1. ขวดพลาสติกใส (PET)
    2. กระป๋องอลูมิเนียม
    3. กระดาษลัง / กล่องพัสดุ
    4. ขวดแก้ว
    5. พลาสติกขุ่น (HDPE)
    6. กระดาษขาวดำ / A4
    7. เศษเหล็ก / สังกะสี
    8. พลาสติกรวม / ถุงพลาสติก

    กฎการตอบที่ต้องทำตามอย่างเคร่งครัด:
    - หากรูปภาพเป็นขยะที่เข้าข่าย 1 ใน 8 ประเภทนี้ชัดเจน ให้ตอบ isMatch: true และระบุ category ให้ตรงกับชื่อ 1 ใน 8 ข้อเป๊ะๆ
    - หากรูปภาพ "ไม่ใช่ขยะใน 8 ประเภทนี้" (เช่น เป็นแก้วพลาสติกแบบใช้แล้วทิ้ง, เศษอาหาร, คน, สัตว์, หรือสิ่งของอื่นๆ) ห้ามพยายามเดาหรือยัดเยียดให้ตรง ให้ตอบ isMatch: false ทันที และบอกว่าคุณเห็นเป็นอะไรใน detectedItem

    ตอบกลับมาเป็น JSON เท่านั้น ตามโครงสร้างนี้เป๊ะๆ:
    {
      "isMatch": boolean,
      "category": "ชื่อประเภทจาก 1 ใน 8 ข้อ (ถ้า isMatch เป็น false ให้ปล่อยเป็นสตริงว่าง '')",
      "detectedItem": "สิ่งที่คุณมองเห็นในภาพคืออะไร (เช่น 'ขวดน้ำดื่ม', 'โทรศัพท์มือถือ', 'แก้วชานมไข่มุก', 'สุนัข')",
      "message": "ข้อความอธิบาย เช่น 'พบขวดพลาสติกใส (PET) ตรงกับประเภทในระบบ' หรือ 'จากภาพน่าจะเป็น แก้วชานมไข่มุก ซึ่งยังไม่มีในประเภทที่ระบบรับฝาก'"
    }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType: 'image/jpeg' } }
        ]}
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    // ✅ ดึง text จาก candidates โดยตรง ไม่ใช้ .text หรือ .text()
    const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) throw new Error("No response from AI");

    // ทำความสะอาด JSON ก่อน parse (กัน markdown code block หลุดมา)
    const cleaned = text.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
    const result = JSON.parse(cleaned);

    // ✅ ตรวจสอบว่า field ครบก่อน return
    return NextResponse.json({
      isMatch: result.isMatch ?? false,
      category: result.category ?? '',
      detectedItem: result.detectedItem ?? 'ไม่ทราบ',
      message: result.message ?? '',
    });
  } catch (error: any) {
    console.error('AI Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}