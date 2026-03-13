"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  BarChart3, Leaf, Calendar, FilterX, Download,
  Users, Weight, Trophy, Search, X
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';

const THAI_MONTHS = [
  { val: '01', label: 'มกราคม', short: 'ม.ค.' },
  { val: '02', label: 'กุมภาพันธ์', short: 'ก.พ.' },
  { val: '03', label: 'มีนาคม', short: 'มี.ค.' },
  { val: '04', label: 'เมษายน', short: 'เม.ย.' },
  { val: '05', label: 'พฤษภาคม', short: 'พ.ค.' },
  { val: '06', label: 'มิถุนายน', short: 'มิ.ย.' },
  { val: '07', label: 'กรกฎาคม', short: 'ก.ค.' },
  { val: '08', label: 'สิงหาคม', short: 'ส.ค.' },
  { val: '09', label: 'กันยายน', short: 'ก.ย.' },
  { val: '10', label: 'ตุลาคม', short: 'ต.ค.' },
  { val: '11', label: 'พฤศจิกายน', short: 'พ.ย.' },
  { val: '12', label: 'ธันวาคม', short: 'ธ.ค.' },
];

const PIE_COLORS = ['#f59e0b','#3b82f6','#10b981','#06b6d4','#ef4444','#8b5cf6','#f97316','#14b8a6'];
const HIST_LIMIT = 10;

function StatCard({ icon: Icon, label, value, unit, colorClass, bgClass, loading }) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm border-l-4 ${colorClass} p-4 flex items-center justify-between gap-3`}>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 truncate">{label}</p>
        {loading
          ? <Skeleton className="h-8 w-28 rounded-lg" />
          : <p className="text-xl sm:text-2xl font-black text-slate-800">{value} <span className="text-xs sm:text-sm font-bold text-slate-400">{unit}</span></p>
        }
      </div>
      <div className={`${bgClass} p-2.5 sm:p-3 rounded-xl shrink-0`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
}

export default function AdminReports() {
  const currentYear = new Date().getFullYear().toString();

  // Chart filter
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState('all');

  // History filter
  const [histMonth, setHistMonth] = useState('');
  const [histYear, setHistYear] = useState('');
  const [histType, setHistType] = useState('');
  const [histSearch, setHistSearch] = useState('');
  const [histPage, setHistPage] = useState(1);

  // Data
  const [deposits, setDeposits] = useState([]);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [topUsers, setTopUsers] = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  const reportRef = useRef(null);

  const fetchData = async () => {
    setLoading(true);
    const [depRes, typesRes, usersRes, membersRes] = await Promise.all([
      supabase.from('deposit_stats').select('*, users(firstname, lastname)').order('created_at', { ascending: false }),
      supabase.from('waste_types').select('name, co2_factor').order('name'),
      supabase.from('users').select('firstname, points').eq('role', 'user').order('points', { ascending: false }).limit(5),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    ]);
    if (depRes.data) setDeposits(depRes.data);
    if (typesRes.data) setWasteTypes(typesRes.data);
    if (usersRes.data) setTopUsers(usersRes.data);
    if (membersRes.count !== null) setTotalMembers(membersRes.count);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const co2Map = useMemo(() => {
    const m = {};
    wasteTypes.forEach(t => { m[t.name] = Number(t.co2_factor) || 0; });
    return m;
  }, [wasteTypes]);

  const chartDeposits = useMemo(() => deposits.filter(dep => {
    const d = new Date(dep.created_at);
    if (filterYear && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== filterMonth) return false;
    return true;
  }), [deposits, filterYear, filterMonth]);

  const summary = useMemo(() => {
    let totalWeight = 0, totalTx = 0, totalCo2 = 0;
    chartDeposits.forEach(dep => {
      const w = Number(dep.weight_kg) || 0;
      totalWeight += w; totalTx += 1;
      totalCo2 += w * (co2Map[dep.waste_type] || 0);
    });
    return { totalWeight, totalTx, totalCo2 };
  }, [chartDeposits, co2Map]);

  const buildTimeMap = (deps, key) => {
    const map = {};
    deps.forEach(dep => {
      const d = new Date(dep.created_at);
      let label = filterMonth === 'all'
        ? (THAI_MONTHS.find(x => x.val === String(d.getMonth() + 1).padStart(2, '0'))?.short || '')
        : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      map[label] = (map[label] || 0) + key(dep);
    });
    return Object.entries(map).map(([d, v]) => ({ d, v: +Number(v).toFixed(4) }));
  };

  const lineData = useMemo(() =>
    buildTimeMap(chartDeposits, dep => Number(dep.weight_kg) || 0)
      .map(({ d, v }) => ({ d, w: v })),
    [chartDeposits, filterMonth]);

  const co2Data = useMemo(() =>
    buildTimeMap(chartDeposits, dep => (Number(dep.weight_kg) || 0) * (co2Map[dep.waste_type] || 0))
      .map(({ d, v }) => ({ d, co2: v })),
    [chartDeposits, co2Map, filterMonth]);

  const pieData = useMemo(() => {
    const map = {};
    chartDeposits.forEach(dep => { map[dep.waste_type] = (map[dep.waste_type] || 0) + (Number(dep.weight_kg) || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, w]) => ({ name, w: +w.toFixed(2) }));
  }, [chartDeposits]);

  const histFiltered = useMemo(() => deposits.filter(dep => {
    const d = new Date(dep.created_at);
    if (histMonth && String(d.getMonth() + 1).padStart(2, '0') !== histMonth) return false;
    if (histYear && d.getFullYear().toString() !== histYear) return false;
    if (histType && dep.waste_type !== histType) return false;
    if (histSearch) {
      const name = `${dep.users?.firstname || ''} ${dep.users?.lastname || ''}`.toLowerCase();
      if (!name.includes(histSearch.toLowerCase())) return false;
    }
    return true;
  }), [deposits, histMonth, histYear, histType, histSearch]);

  const histTotalPages = Math.ceil(histFiltered.length / HIST_LIMIT);
  const histPageData = histFiltered.slice((histPage - 1) * HIST_LIMIT, histPage * HIST_LIMIT);

  const availableYears = useMemo(() => {
    const years = [...new Set(deposits.map(d => new Date(d.created_at).getFullYear().toString()))].sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [deposits]);

  const wasteTypeNames = useMemo(() => [...new Set(deposits.map(d => d.waste_type))].sort(), [deposits]);

  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      setProcessing(true);
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 });
      const img = new Image();
      img.src = dataUrl;
      await new Promise(resolve => { img.onload = resolve; });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
      const mLabel = filterMonth === 'all' ? 'ทั้งปี' : (THAI_MONTHS.find(m => m.val === filterMonth)?.label || filterMonth);
      pdf.save(`สถิติรับฝากขยะ_${mLabel}_${filterYear}.pdf`);
    } catch { alert('เกิดข้อผิดพลาดในการพิมพ์ PDF'); }
    finally { setProcessing(false); }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="bg-card rounded-2xl sm:rounded-[2rem] border shadow-xl flex flex-col overflow-hidden">

        {/* ── Header ── */}
        <div className="p-4 sm:p-6 lg:p-8 border-b flex flex-col gap-3 bg-white/50 backdrop-blur-md shrink-0">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-lg sm:text-xl leading-tight">รายงานยอดการรับฝากขยะ</h3>
              <p className="text-xs text-muted-foreground font-medium opacity-70 mt-0.5">เลือกช่วงเวลาที่ต้องการดูข้อมูล</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-muted/30 p-2 rounded-xl border border-border/50">
              <Calendar className="w-4 h-4 text-muted-foreground hidden sm:block" />
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                className="px-2 py-1.5 text-xs sm:text-sm font-bold border rounded-lg outline-none bg-white flex-1 sm:flex-none">
                <option value="all">ดูภาพรวมทั้งปี</option>
                {THAI_MONTHS.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                className="px-2 py-1.5 text-xs sm:text-sm font-bold border rounded-lg outline-none bg-white flex-1 sm:flex-none">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {filterMonth !== 'all' && (
                <button onClick={() => setFilterMonth('all')} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg">
                  <FilterX className="w-4 h-4" />
                </button>
              )}
              <button onClick={exportPDF} disabled={processing}
                className="px-3 sm:px-5 py-1.5 sm:py-2 bg-slate-800 text-white rounded-lg sm:rounded-xl hover:bg-slate-700 flex items-center gap-1.5 font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap">
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {processing ? 'กำลังจัดเตรียม...' : 'ออกรายงาน PDF'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Report Body ── */}
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/50">
          <div ref={reportRef} className="space-y-5 sm:space-y-6">

            {/* Title */}
            <div className="bg-white p-4 sm:p-6 rounded-2xl border shadow-sm text-center">
              <h2 className="text-base sm:text-2xl font-black text-slate-800 uppercase tracking-widest mb-1">สถิติยอดรับฝากขยะรีไซเคิล</h2>
              <p className="text-xs sm:text-sm font-bold text-primary mt-1">
                {filterMonth === 'all' ? `ภาพรวมปี ${filterYear}` : `ประจำเดือน ${THAI_MONTHS.find(m => m.val === filterMonth)?.label} ปี ${filterYear}`}
              </p>
              <p suppressHydrationWarning className="text-xs text-slate-400 font-bold mt-1">
                ข้อมูล ณ วันที่ {new Date().toLocaleDateString('th-TH')}
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard icon={Weight} label={`ขยะสะสม (${filterMonth === 'all' ? 'ทั้งปี' : 'เดือนนี้'})`}
                value={summary.totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                unit="กก." colorClass="border-blue-500" bgClass="bg-blue-50 text-blue-500" loading={loading} />
              <StatCard icon={BarChart3} label="ทำรายการ"
                value={summary.totalTx.toLocaleString('th-TH')}
                unit="ครั้ง" colorClass="border-green-500" bgClass="bg-green-50 text-green-600" loading={loading} />
              <StatCard icon={Leaf} label="ลด CO2 รวม"
                value={summary.totalCo2.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                unit="kgCO2e" colorClass="border-cyan-500" bgClass="bg-cyan-50 text-cyan-600" loading={loading} />
              <StatCard icon={Users} label="สมาชิกทั้งหมด"
                value={totalMembers.toLocaleString('th-TH')}
                unit="คน" colorClass="border-amber-500" bgClass="bg-amber-50 text-amber-600" loading={loading} />
            </div>

            {/* Charts Row: Line + Pie */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-blue-600 text-white">
                  <h6 className="font-black text-xs sm:text-sm">ปริมาณขยะ ({filterMonth === 'all' ? 'รายเดือน' : 'รายวัน'})</h6>
                </div>
                <div className="p-3 sm:p-4 h-48 sm:h-64">
                  {loading ? <Skeleton className="w-full h-full rounded-xl" />
                    : lineData.length === 0 ? <div className="flex h-full items-center justify-center text-slate-400 font-bold text-sm">ไม่มีข้อมูล</div>
                    : <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={lineData}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="d" tick={{ fontSize: 10, fontWeight: 700 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={v => [`${v} กก.`, 'น้ำหนัก']} />
                          <Line type="monotone" dataKey="w" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                        </LineChart>
                      </ResponsiveContainer>
                  }
                </div>
              </div>

              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-amber-500 text-white">
                  <h6 className="font-black text-xs sm:text-sm">สัดส่วนประเภทขยะ</h6>
                </div>
                <div className="p-2 sm:p-4 h-48 sm:h-64 flex items-center justify-center">
                  {loading ? <Skeleton className="w-36 h-36 rounded-full" />
                    : pieData.length === 0 ? <div className="text-slate-400 font-bold text-sm">ไม่มีข้อมูล</div>
                    : <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={pieData} dataKey="w" nameKey="name" cx="50%" cy="50%" outerRadius="65%" innerRadius="30%">
                            {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                          </Pie>
                          <Tooltip formatter={v => [`${v} กก.`]} />
                          <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 700 }} />
                        </PieChart>
                      </ResponsiveContainer>
                  }
                </div>
              </div>
            </div>

            {/* CO2 Bar */}
            <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
              <div className="px-4 py-2.5 bg-green-600 text-white">
                <h6 className="font-black text-xs sm:text-sm">การลด CO2 ({filterMonth === 'all' ? 'รายเดือน' : 'รายวัน'}) (kgCO2e)</h6>
              </div>
              <div className="p-3 sm:p-4 h-48 sm:h-64">
                {loading ? <Skeleton className="w-full h-full rounded-xl" />
                  : co2Data.length === 0 ? <div className="flex h-full items-center justify-center text-slate-400 font-bold text-sm">ไม่มีข้อมูล</div>
                  : <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={co2Data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="d" tick={{ fontSize: 10, fontWeight: 700 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip formatter={v => [`${v} kgCO2e`, 'ลด CO2']} />
                        <Bar dataKey="co2" fill="#10b981" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                }
              </div>
            </div>

            {/* Bottom: Top5 + History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">

              {/* Top 5 */}
              <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-amber-500 text-white flex items-center gap-2">
                  <Trophy className="w-4 h-4" />
                  <h6 className="font-black text-xs sm:text-sm">5 อันดับคะแนนสูงสุด</h6>
                </div>
                <div className="divide-y divide-slate-50">
                  {loading ? Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3">
                      <Skeleton className="w-6 h-6 rounded-full shrink-0" />
                      <Skeleton className="h-4 flex-1 rounded-lg" />
                      <Skeleton className="h-4 w-14 rounded-lg" />
                    </div>
                  )) : topUsers.length === 0 ? (
                    <p className="text-center py-8 text-slate-400 font-bold text-sm">ไม่มีข้อมูล</p>
                  ) : topUsers.map((user, i) => (
                    <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors">
                      <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${
                        i===0?'bg-amber-400 text-white':i===1?'bg-slate-300 text-slate-700':i===2?'bg-amber-700 text-white':'bg-slate-100 text-slate-500'
                      }`}>{i+1}</span>
                      <span className="flex-1 text-sm font-bold text-slate-700 truncate">{user.firstname}</span>
                      <span className="text-sm font-black text-amber-500 shrink-0">{Number(user.points||0).toLocaleString('th-TH')}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* History */}
              <div className="lg:col-span-2 bg-white rounded-2xl border shadow-sm overflow-hidden">
                <div className="px-4 py-2.5 bg-cyan-500 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h6 className="font-black text-xs sm:text-sm whitespace-nowrap">
                      ประวัติการฝาก ({histFiltered.length.toLocaleString('th-TH')} รายการ)
                    </h6>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <select value={histMonth} onChange={e => { setHistMonth(e.target.value); setHistPage(1); }}
                        className="px-1.5 py-1 text-xs font-bold border rounded-lg bg-white text-slate-700 outline-none">
                        <option value="">เดือน</option>
                        {THAI_MONTHS.map(m => <option key={m.val} value={m.val}>{m.short}</option>)}
                      </select>
                      <select value={histYear} onChange={e => { setHistYear(e.target.value); setHistPage(1); }}
                        className="px-1.5 py-1 text-xs font-bold border rounded-lg bg-white text-slate-700 outline-none">
                        <option value="">ปี</option>
                        {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                      </select>
                      <select value={histType} onChange={e => { setHistType(e.target.value); setHistPage(1); }}
                        className="px-1.5 py-1 text-xs font-bold border rounded-lg bg-white text-slate-700 outline-none max-w-[90px]">
                        <option value="">ประเภท</option>
                        {wasteTypeNames.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                      <div className="relative flex items-center">
                        <Search className="absolute left-2 w-3 h-3 text-slate-400 pointer-events-none" />
                        <input type="text" placeholder="ค้นชื่อ..." value={histSearch}
                          onChange={e => { setHistSearch(e.target.value); setHistPage(1); }}
                          className="pl-6 pr-2 py-1 text-xs font-bold border rounded-lg bg-white text-slate-700 outline-none w-20" />
                      </div>
                      {(histMonth || histYear || histType || histSearch) && (
                        <button onClick={() => { setHistMonth(''); setHistYear(''); setHistType(''); setHistSearch(''); setHistPage(1); }}
                          className="p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors">
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[340px]">
                    <thead>
                      <tr className="border-b border-slate-100 bg-slate-50">
                        <th className="py-2.5 px-3 sm:px-4 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider">วันที่</th>
                        <th className="py-2.5 px-3 sm:px-4 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider">สมาชิก</th>
                        <th className="py-2.5 px-3 sm:px-4 text-[10px] sm:text-xs font-black text-slate-500 uppercase tracking-wider">ประเภท</th>
                        <th className="py-2.5 px-3 sm:px-4 text-[10px] sm:text-xs font-black text-slate-500 text-right uppercase tracking-wider">กก.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading ? Array.from({ length: 5 }).map((_, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td colSpan="4" className="p-2.5 sm:p-3"><Skeleton className="h-5 w-full rounded-lg" /></td>
                        </tr>
                      )) : histPageData.length === 0 ? (
                        <tr><td colSpan="4" className="text-center py-10 font-bold text-slate-400 text-sm">ไม่พบประวัติการฝาก</td></tr>
                      ) : histPageData.map(dep => (
                        <tr key={dep.id} className="border-b border-slate-50 hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3 sm:px-4 text-xs font-bold text-slate-500 whitespace-nowrap">
                            {new Date(dep.created_at).toLocaleDateString('th-TH')}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 text-xs font-bold text-slate-800 truncate max-w-[100px] sm:max-w-[140px]">
                            {dep.users?.firstname || dep.user_id}
                          </td>
                          <td className="py-2.5 px-3 sm:px-4">
                            <span className="text-[10px] sm:text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg border">{dep.waste_type}</span>
                          </td>
                          <td className="py-2.5 px-3 sm:px-4 text-xs font-black text-blue-600 text-right whitespace-nowrap">
                            +{Number(dep.weight_kg).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {histTotalPages > 1 && (
                  <div className="px-4 py-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold text-slate-400">หน้า {histPage} / {histTotalPages}</p>
                    <div className="flex gap-1 flex-wrap">
                      <button disabled={histPage===1} onClick={() => setHistPage(p=>p-1)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:bg-slate-50 disabled:opacity-40">←</button>
                      {Array.from({ length: Math.min(5, histTotalPages) }, (_, i) => {
                        const start = Math.max(1, Math.min(histPage-2, histTotalPages-4));
                        const page = start + i;
                        return (
                          <button key={page} onClick={() => setHistPage(page)}
                            className={`px-2.5 py-1 text-xs font-bold rounded-lg border transition-colors ${histPage===page?'bg-cyan-500 text-white border-cyan-500':'hover:bg-slate-50'}`}>
                            {page}
                          </button>
                        );
                      })}
                      <button disabled={histPage===histTotalPages} onClick={() => setHistPage(p=>p+1)}
                        className="px-2.5 py-1 text-xs font-bold rounded-lg border hover:bg-slate-50 disabled:opacity-40">→</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}