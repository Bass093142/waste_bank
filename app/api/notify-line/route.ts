// app/api/notify-line/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const {
      userId, name, wasteType, weightKg,
      pointsEarned, totalPoints, co2Reduced
    } = await req.json();

    const { data: user } = await supabase
      .from('users')
      .select('line_user_id')
      .eq('id', userId)
      .single();

    if (!user?.line_user_id) {
      return NextResponse.json({ ok: false, reason: 'no_line_user_id' });
    }

    const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
      body: JSON.stringify({
        to: user.line_user_id,
        messages: [buildFlexMessage({ name, wasteType, weightKg, pointsEarned, totalPoints, co2Reduced })],
      }),
    });

    const result = await lineRes.json();
    return NextResponse.json({ ok: lineRes.ok, result });
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 });
  }
}

function buildFlexMessage({ name, wasteType, weightKg, pointsEarned, totalPoints, co2Reduced }: {
  name: string; wasteType: string; weightKg: number;
  pointsEarned: number; totalPoints: number; co2Reduced: string;
}) {
  return {
    type: 'flex',
    altText: `✅ รับฝากขยะสำเร็จ! +${pointsEarned.toLocaleString('th-TH')} แต้ม รวม ${totalPoints.toLocaleString('th-TH')} แต้ม`,
    contents: {
      type: 'bubble',
      size: 'mega',
      header: {
        type: 'box', layout: 'vertical',
        backgroundColor: '#166534', paddingAll: '20px',
        contents: [
          {
            type: 'box', layout: 'horizontal',
            contents: [
              { type: 'text', text: '🌿 ธนาคารขยะ', color: '#ffffff', weight: 'bold', size: 'lg', flex: 1 },
              { type: 'text', text: '✅ รับฝากแล้ว', color: '#86efac', size: 'sm', align: 'end', weight: 'bold' },
            ],
          },
          { type: 'text', text: `สวัสดีคุณ ${name}`, color: '#d1fae5', size: 'sm', margin: 'sm' },
        ],
      },
      body: {
        type: 'box', layout: 'vertical', paddingAll: '20px', spacing: 'md',
        contents: [
          { type: 'text', text: 'รายละเอียดการรับฝาก', weight: 'bold', color: '#374151', size: 'sm' },
          {
            type: 'box', layout: 'vertical', backgroundColor: '#f9fafb',
            cornerRadius: '12px', paddingAll: '16px', spacing: 'sm',
            contents: [
              row('ประเภทขยะ', wasteType),
              row('น้ำหนัก', `${weightKg} กก.`),
              row('ลด CO₂', `${co2Reduced} kgCO2e`),
            ],
          },
          { type: 'separator' },
          {
            type: 'box', layout: 'horizontal',
            contents: [
              { type: 'text', text: 'คะแนนที่ได้รับ', color: '#6b7280', size: 'sm', flex: 1, weight: 'bold' },
              { type: 'text', text: `+${pointsEarned.toLocaleString('th-TH')} แต้ม`, color: '#16a34a', size: 'xl', weight: 'bold', align: 'end', flex: 2 },
            ],
          },
          {
            type: 'box', layout: 'vertical', backgroundColor: '#fefce8',
            cornerRadius: '12px', paddingAll: '16px',
            contents: [{
              type: 'box', layout: 'horizontal',
              contents: [
                { type: 'text', text: '⭐ คะแนนสะสมทั้งหมด', color: '#92400e', size: 'sm', weight: 'bold', flex: 1 },
                { type: 'text', text: `${totalPoints.toLocaleString('th-TH')} แต้ม`, color: '#b45309', size: 'lg', weight: 'bold', align: 'end' },
              ],
            }],
          },
        ],
      },
      footer: {
        type: 'box', layout: 'vertical', backgroundColor: '#f0fdf4', paddingAll: '16px',
        contents: [
          { type: 'text', text: '🌱 ขอบคุณที่ร่วมรักษ์โลกกับเรา!', color: '#15803d', size: 'sm', align: 'center', weight: 'bold' },
        ],
      },
    },
  };
}

function row(label: string, value: string) {
  return {
    type: 'box', layout: 'horizontal',
    contents: [
      { type: 'text', text: label, color: '#6b7280', size: 'sm', flex: 2 },
      { type: 'text', text: value, color: '#111827', size: 'sm', weight: 'bold', flex: 3, align: 'end' },
    ],
  };
}