// app/api/line-webhook/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const events = body.events || [];

    for (const event of events) {
      const lineUserId = event.source?.userId;
      if (!lineUserId) continue;

      // รับ follow event (เพิ่มเพื่อน) หรือ message event (ส่งข้อความ)
      if (event.type === 'follow' || event.type === 'message') {
        // ตอบกลับอัตโนมัติขอ username
        if (event.type === 'follow' && event.replyToken) {
          await replyMessage(event.replyToken, [
            {
              type: 'text',
              text: '👋 สวัสดีครับ! เพื่อผูกบัญชีธนาคารขยะกับ LINE\n\nกรุณาพิมพ์ username ของคุณในระบบธนาคารขยะ เช่น:\n\nผูกบัญชี:your_username'
            }
          ]);
        }

        // รับ message ที่ขึ้นต้นด้วย "ผูกบัญชี:"
        if (event.type === 'message' && event.message?.type === 'text') {
          const text: string = event.message.text.trim();

          if (text.startsWith('ผูกบัญชี:')) {
            const username = text.replace('ผูกบัญชี:', '').trim();

            // หา user จาก username แล้วบันทึก line_user_id
            const { data: user, error } = await supabase
              .from('users')
              .select('id, firstname')
              .eq('username', username)
              .single();

            if (error || !user) {
              // ไม่พบ username
              await replyMessage(event.replyToken, [
                {
                  type: 'text',
                  text: `❌ ไม่พบบัญชี "${username}" ในระบบ\n\nกรุณาตรวจสอบ username และลองใหม่อีกครั้งครับ`
                }
              ]);
            } else {
              // บันทึก line_user_id ลง supabase
              await supabase
                .from('users')
                .update({ line_user_id: lineUserId })
                .eq('id', user.id);

              await replyMessage(event.replyToken, [
                {
                  type: 'text',
                  text: `✅ ผูกบัญชีสำเร็จแล้วครับ!\n\nสวัสดีคุณ ${user.firstname} 🌿\nตอนนี้คุณจะได้รับการแจ้งเตือนคะแนนผ่าน LINE อัตโนมัติเมื่อฝากขยะครับ`
                }
              ]);
            }
          } else {
            // ข้อความอื่นๆ
            await replyMessage(event.replyToken, [
              {
                type: 'text',
                text: '🌿 ธนาคารขยะ\n\nหากต้องการผูกบัญชีเพื่อรับแจ้งเตือนคะแนน\nพิมพ์: ผูกบัญชี:username_ของคุณ'
              }
            ]);
          }
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('webhook error:', err);
    return NextResponse.json({ ok: false }, { status: 200 }); // LINE ต้องการ 200 เสมอ
  }
}

// GET สำหรับ LINE verify webhook
export async function GET() {
  return NextResponse.json({ ok: true });
}

async function replyMessage(replyToken: string, messages: object[]) {
  await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
}