// app/page.tsx  — Server Component ดึงข้อมูลจาก Supabase จริง
import { createClient } from '@supabase/supabase-js';
import LandingClient from './LandingClient';

const DEFAULT_STATS = {
  totalMembers: 0,
  totalWeight: 0,
  totalCo2: 0,
  totalRewards: 0,
};

async function getStats() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return DEFAULT_STATS;

    const supabase = createClient(url, key);

    const [membersRes, depositsRes, rewardsRes, wasteTypesRes] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user'),
      supabase.from('deposit_stats').select('weight_kg, waste_type'),
      supabase.from('rewards').select('id', { count: 'exact', head: true }).eq('active', true),
      supabase.from('waste_types').select('name, co2_factor'),
    ]);

    // สร้าง co2 map จาก waste_types จริง
    const co2Map: Record<string, number> = {};
    (wasteTypesRes.data ?? []).forEach((t: { name: string; co2_factor: number }) => {
      co2Map[t.name] = Number(t.co2_factor) || 0;
    });

    const deposits = depositsRes.data ?? [];
    const totalWeight = deposits.reduce((s: number, d: { weight_kg: number; waste_type: string }) => s + (Number(d.weight_kg) || 0), 0);
    const totalCo2 = deposits.reduce((s: number, d: { weight_kg: number; waste_type: string }) => {
      const factor = co2Map[d.waste_type] ?? 2.5; // fallback 2.5 ถ้าไม่มีใน waste_types
      return s + (Number(d.weight_kg) || 0) * factor;
    }, 0);

    return {
      totalMembers: membersRes.count ?? 0,
      totalWeight: Math.round(totalWeight),
      totalCo2: Math.round(totalCo2),
      totalRewards: rewardsRes.count ?? 0,
    };
  } catch (e) {
    console.error('[Landing] getStats error:', e);
    return DEFAULT_STATS;
  }
}

export default async function Landing() {
  const stats = await getStats();
  return <LandingClient stats={stats} />;
}