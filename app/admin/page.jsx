"use client";
import { useState, useEffect } from 'react';
import { Skeleton } from "@/app/components/ui/skeleton";
import { 
  Users, Scale, Wallet, AlertCircle, TrendingUp, Gift, Activity, Clock, CheckCircle2
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0, totalBalance: 0, totalWasteStock: 0, pendingRedemptions: 0
  });
  const [recentDeposits, setRecentDeposits] = useState([]);
  const [recentRedemptions, setRecentRedemptions] = useState([]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user');
      const { data: funds } = await supabase.from('funds').select('amount, type');
      const balance = funds?.reduce((acc, curr) => curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0) || 0;
      const { data: stock } = await supabase.from('waste_stock').select('current_weight');
      const totalWaste = stock?.reduce((acc, curr) => acc + Number(curr.current_weight), 0) || 0;
      const { count: pendingCount } = await supabase.from('redemptions').select('*', { count: 'exact', head: true }).eq('status', 'pending');

      setStats({
        totalUsers: userCount || 0,
        totalBalance: balance,
        totalWasteStock: totalWaste,
        pendingRedemptions: pendingCount || 0
      });

      const { data: deposits } = await supabase.from('deposit_stats').select(`*, users (firstname, lastname)`).order('created_at', { ascending: false }).limit(5);
      setRecentDeposits(deposits || []);

      const { data: redems } = await supabase.from('redemptions').select(`*, users (firstname, lastname), rewards (name)`).order('created_at', { ascending: false }).limit(5);
      setRecentRedemptions(redems || []);

    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboardData(); }, []);

  return (
    // ปรับ Padding ให้เหมาะสมตามขนาดหน้าจอ (p-4 บนมือถือ, p-6 บนแท็บเล็ต, p-8 บนคอมพิวเตอร์)
    <div className="flex flex-col gap-4 md:gap-8 max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
      
      {/* Banner - ปรับความโค้งและขนาดตัวอักษรให้ดูดีบนมือถือ */}
      <div className="bg-gradient-to-r from-green-600 to-green-400 rounded-2xl md:rounded-[2rem] p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-2xl md:text-3xl font-black mb-1 md:mb-2">ภาพรวมระบบธนาคารขยะ 👋</h1>
          <p className="text-sm md:text-base font-medium opacity-90">ตรวจสอบความเคลื่อนไหวล่าสุดประจำวัน</p>
        </div>
        {/* เพิ่มตกแต่งพื้นหลังเล็กน้อย */}
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 md:w-64 md:h-64 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* KPI Cards - ปรับ Grid เป็น 1 คอลัมน์บนมือถือ, 2 คอลัมน์บนแท็บเล็ต และ 4 บนคอมพิวเตอร์ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard title="สมาชิกทั้งหมด" value={`${stats.totalUsers} คน`} icon={<Users />} color="blue" loading={loading} />
        <StatCard title="ยอดคงเหลือ" value={`฿${stats.totalBalance.toLocaleString()}`} icon={<Wallet />} color="green" loading={loading} />
        <StatCard title="สต๊อกขยะรวม" value={`${stats.totalWasteStock} กก.`} icon={<Scale />} color="orange" loading={loading} />
        <StatCard title="รออนุมัติแลกรางวัล" value={`${stats.pendingRedemptions} รายการ`} icon={<AlertCircle />} color="red" loading={loading} />
      </div>

      {/* Recent Activity - ปรับจาก 1 คอลัมน์บนมือถือ เป็น 2 คอลัมน์ในจอใหญ่ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-10">
        <ActivityList title="การฝากขยะล่าสุด" data={recentDeposits} loading={loading} type="deposit" />
        <ActivityList title="การแลกรางวัลล่าสุด" data={recentRedemptions} loading={loading} type="redemption" />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, loading }) {
  const colors = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    orange: "text-orange-600 bg-orange-50",
    red: "text-red-600 bg-red-50",
  };
  return (
    <div className="bg-card border p-5 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm hover:shadow-md transition-all">
      <div className="flex items-center gap-4 sm:block">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-0 sm:mb-4 shrink-0 ${colors[color]}`}>{icon}</div>
        <div className="flex-1">
          <p className="text-muted-foreground font-bold text-[10px] md:text-xs uppercase tracking-widest">{title}</p>
          <h3 className="text-xl md:text-2xl font-black mt-1">{loading ? <Skeleton className="h-6 w-20" /> : value}</h3>
        </div>
      </div>
    </div>
  );
}

function ActivityList({ title, data, loading, type }) {
  return (
    <div className="bg-card rounded-2xl md:rounded-[2rem] border shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-5 md:p-6 border-b font-black text-base md:text-lg flex items-center gap-2">
        {type === 'deposit' ? <TrendingUp className="w-5 h-5 text-green-500" /> : <Gift className="w-5 h-5 text-orange-500" />}
        {title}
      </div>
      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />) : 
         data.length === 0 ? <p className="text-center py-10 text-muted-foreground font-medium text-sm">ไม่มีรายการล่าสุด</p> :
         data.map((item) => (
           <div key={item.id} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 rounded-xl md:rounded-2xl border border-transparent hover:border-slate-200 transition-colors">
             <div className="flex items-center gap-3 min-w-0">
               <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white flex items-center justify-center shadow-sm font-bold shrink-0 text-xs md:text-sm">
                 {item.users?.firstname?.charAt(0) || 'U'}
               </div>
               <div className="min-w-0">
                 <p className="text-xs md:text-sm font-black truncate">{item.users?.firstname || 'สมาชิก'}</p>
                 <p className="text-[10px] md:text-xs text-muted-foreground truncate">{type === 'deposit' ? item.waste_type : item.rewards?.name}</p>
               </div>
             </div>
             <div className="text-right shrink-0 ml-2">
                <p className={`text-xs md:text-sm font-black ${type === 'deposit' ? 'text-green-600' : 'text-orange-500'}`}>
                  {type === 'deposit' ? `+${item.weight_kg} กก.` : `-${item.points_used} แต้ม`}
                </p>
                <p className="text-[9px] md:text-[10px] font-medium text-muted-foreground">{new Date(item.created_at).toLocaleDateString('th-TH')}</p>
             </div>
           </div>
         ))
        }
      </div>
    </div>
  );
}