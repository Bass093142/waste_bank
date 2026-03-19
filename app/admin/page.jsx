"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Skeleton } from "@/app/components/ui/skeleton";
import { 
  Users, Scale, Wallet, AlertCircle, TrendingUp, Gift, Activity,
  Calendar, FilterX, Bot, X, Mic, Send, Loader2, MessageSquareText,
  Square, Menu, Plus, Search, Trash2, RotateCcw, CheckCircle2,
  Info, RotateCw
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const THAI_MONTHS = [
  { val: '01', label: 'มกราคม', short: 'ม.ค.' }, { val: '02', label: 'กุมภาพันธ์', short: 'ก.พ.' },
  { val: '03', label: 'มีนาคม', short: 'มี.ค.' }, { val: '04', label: 'เมษายน', short: 'เม.ย.' },
  { val: '05', label: 'พฤษภาคม', short: 'พ.ค.' }, { val: '06', label: 'มิถุนายน', short: 'มิ.ย.' },
  { val: '07', label: 'กรกฎาคม', short: 'ก.ค.' }, { val: '08', label: 'สิงหาคม', short: 'ส.ค.' },
  { val: '09', label: 'กันยายน', short: 'ก.ย.' }, { val: '10', label: 'ตุลาคม', short: 'ต.ค.' },
  { val: '11', label: 'พฤศจิกายน', short: 'พ.ย.' }, { val: '12', label: 'ธันวาคม', short: 'ธ.ค.' },
];

/* ─── StatCard ───────────────────────────────────────────── */
function StatCard({ id, highlightId, title, value, unit, icon, color, loading }) {
  const isHighlighted = highlightId === id;
  const colorMap = {
    blue:   "border-blue-500   text-blue-600   bg-blue-50   dark:bg-blue-500/10   dark:text-blue-400",
    green:  "border-green-500  text-green-600  bg-green-50  dark:bg-green-500/10  dark:text-green-400",
    orange: "border-orange-500 text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400",
    red:    "border-red-500    text-red-600    bg-red-50    dark:bg-red-500/10    dark:text-red-400",
  };
  const [borderColor, ...iconColors] = colorMap[color].split(' ');
  return (
    <div
      id={id}
      className={`bg-white dark:bg-slate-900 border-l-4 ${borderColor} border-y border-r border-slate-100 dark:border-slate-800 p-5 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm transition-all duration-700 ease-in-out
        ${isHighlighted ? 'ring-[6px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-900 scale-[1.06] z-30 relative shadow-[0_0_40px_rgba(99,102,241,0.45)] bg-indigo-50/50 dark:bg-indigo-900/20' : 'scale-100 z-0'}`}
    >
      <div className="flex items-center gap-4 sm:block">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-0 sm:mb-4 shrink-0 ${iconColors.join(' ')}`}>
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-muted-foreground font-bold text-[10px] md:text-xs uppercase tracking-widest">{title}</p>
          <h3 className="text-xl md:text-2xl font-black mt-1 text-slate-800 dark:text-white">
            {loading ? <Skeleton className="h-6 w-20" /> : <>{value} <span className="text-sm text-slate-400">{unit}</span></>}
          </h3>
        </div>
      </div>
    </div>
  );
}

/* ─── ActivityList ───────────────────────────────────────── */
function ActivityList({ id, highlightId, title, data, loading, type, unit, emptyText }) {
  const isHighlighted = highlightId === id;
  return (
    <div
      id={id}
      className={`bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full transition-all duration-700 ease-in-out
        ${isHighlighted ? 'ring-[6px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-900 scale-[1.02] z-30 relative shadow-[0_0_40px_rgba(99,102,241,0.4)]' : 'scale-100 z-0'}`}
    >
      <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 font-black text-base md:text-lg flex items-center gap-2 text-slate-800 dark:text-white transition-colors">
        {type === 'deposit' ? <TrendingUp className="w-5 h-5 text-green-500" /> : <Gift className="w-5 h-5 text-orange-500" />}
        {title}
      </div>
      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)
          : data.length === 0
            ? <p className="text-center py-10 text-muted-foreground font-medium text-sm">{emptyText}</p>
            : data.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-3 md:p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl md:rounded-2xl border border-transparent hover:border-slate-200 dark:hover:border-slate-700 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-white dark:bg-slate-700 flex items-center justify-center shadow-sm font-bold shrink-0 text-xs md:text-sm text-slate-800 dark:text-white">
                    {item.users?.firstname?.charAt(0) || 'U'}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs md:text-sm font-black truncate text-slate-800 dark:text-white">{item.users?.firstname || 'สมาชิก'}</p>
                    <p className="text-[10px] md:text-xs text-muted-foreground truncate">{type === 'deposit' ? item.waste_type : item.rewards?.name}</p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-2">
                  <p className={`text-xs md:text-sm font-black ${type === 'deposit' ? 'text-green-600 dark:text-green-400' : 'text-orange-500 dark:text-orange-400'}`}>
                    {type === 'deposit' ? `+${item.weight_kg} ${unit}` : `-${item.points_used} ${unit}`}
                  </p>
                  <p className="text-[9px] md:text-[10px] font-medium text-muted-foreground">
                    {new Date(item.created_at || item.deposit_date).toLocaleDateString('th-TH')}
                  </p>
                </div>
              </div>
            ))
        }
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────── */
export default function AdminDashboard() {
  const { t, lang } = useLanguage();
  const currentYear = new Date().getFullYear().toString();
  
  const [loading, setLoading]   = useState(true);
  const [stats, setStats]       = useState({ totalUsers: 0, totalBalance: 0, totalWasteStock: 0, pendingRedemptions: 0 });
  const [deposits, setDeposits] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  
  const [filterYear, setFilterYear]   = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState('all');

  /* ── AI Chatbot States ── */
  const [isChatOpen, setIsChatOpen]     = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput]       = useState('');
  const [isTyping, setIsTyping]         = useState(false);
  const [isListening, setIsListening]   = useState(false);
  const [isSpeaking, setIsSpeaking]     = useState(false);
  const [highlightId, setHighlightId]   = useState('');
  const [botStatus, setBotStatus]       = useState('idle'); // idle | thinking | speaking
  const [chatAlerts, setChatAlerts]     = useState([]);
  const chatEndRef     = useRef(null);
  const stopSpeakingRef = useRef(false);

  /* ── Chat History States ── */
  const [currentChatId, setCurrentChatId] = useState(null);
  const [chatList, setChatList]           = useState([]);
  const [isChatMenuOpen, setIsChatMenuOpen] = useState(false);
  const [chatSearch, setChatSearch]       = useState('');

  /* ── Fetch chat list from DB ── */
  const fetchChatList = async () => {
    const { data } = await supabase
      .from('ecobot_chats')
      .select('id, title, created_at')
      .order('created_at', { ascending: false });
    if (data) setChatList(data);
  };

  useEffect(() => {
    fetchDashboardData();
    fetchChatList();
    setChatMessages([{ id: 'welcome-msg', role: 'ai', text: 'สวัสดีค่ะ ดิฉัน EcoBot พร้อมให้ข้อมูลสรุปภาพรวม Dashboard แล้วค่ะ' }]);
  }, []);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  /* ── Chat session management ── */
  const startNewChat = () => {
    setCurrentChatId(null);
    setChatMessages([{ id: Date.now().toString(), role: 'ai', text: 'สวัสดีค่ะ ดิฉัน EcoBot พร้อมให้ข้อมูลสรุปภาพรวม Dashboard แล้วค่ะ' }]);
    setIsChatMenuOpen(false);
  };

  const loadChat = async (id) => {
    setIsChatMenuOpen(false);
    setCurrentChatId(id);
    const { data } = await supabase.from('ecobot_chats').select('messages').eq('id', id).single();
    if (data?.messages) {
      const withIds = data.messages.map((m, i) => m.id ? m : { ...m, id: Date.now().toString() + i });
      setChatMessages(withIds);
    }
  };

  const deleteChatGroup = async (id, e) => {
    e.stopPropagation();
    if (!confirm('ต้องการลบประวัติการสนทนานี้ใช่หรือไม่?')) return;
    await supabase.from('ecobot_chats').delete().eq('id', id);
    if (currentChatId === id) startNewChat();
    fetchChatList();
    toast.success('ลบประวัติสำเร็จ');
  };

  const deleteSingleMessage = async (msgId) => {
    if (!confirm('ต้องการลบข้อความนี้ใช่หรือไม่?')) return;
    const newMessages = chatMessages.filter(m => m.id !== msgId);
    setChatMessages(newMessages);
    if (currentChatId) {
      await supabase.from('ecobot_chats').update({ messages: newMessages }).eq('id', currentChatId);
    }
  };

  /* ── Fetch dashboard data ── */
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user');
      const { data: funds } = await supabase.from('funds').select('amount, type');
      const balance = funds?.reduce((acc, curr) => curr.type === 'income' ? acc + Number(curr.amount) : acc - Number(curr.amount), 0) || 0;
      const { data: stock } = await supabase.from('waste_stock').select('current_weight');
      const totalWaste = stock?.reduce((acc, curr) => acc + Number(curr.current_weight), 0) || 0;
      const { count: pendingCount } = await supabase.from('redemptions').select('*', { count: 'exact', head: true }).eq('status', 'pending');
      setStats({ totalUsers: userCount || 0, totalBalance: balance, totalWasteStock: totalWaste, pendingRedemptions: pendingCount || 0 });
      const { data: deps } = await supabase.from('deposit_stats').select('*, users(firstname, lastname)').order('deposit_date', { ascending: false }).limit(200);
      setDeposits(deps || []);
      const { data: redems } = await supabase.from('redemptions').select('*, users(firstname, lastname), rewards(name)').order('created_at', { ascending: false }).limit(200);
      setRedemptions(redems || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const filteredDeposits = useMemo(() => deposits.filter(dep => {
    const d = new Date(dep.deposit_date || dep.created_at);
    if (filterYear && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== filterMonth) return false;
    return true;
  }), [deposits, filterYear, filterMonth]);

  const filteredRedemptions = useMemo(() => redemptions.filter(redem => {
    const d = new Date(redem.created_at);
    if (filterYear && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== filterMonth) return false;
    return true;
  }), [redemptions, filterYear, filterMonth]);

  const availableYears = useMemo(() => {
    const years = [...new Set([...deposits, ...redemptions].map(d => new Date(d.deposit_date || d.created_at).getFullYear().toString()))].sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [deposits, redemptions, currentYear]);

  /* ── Grouped chat history ── */
  const groupedChats = useMemo(() => {
    const today     = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86400000).toDateString();
    return chatList
      .filter(c => c.title.toLowerCase().includes(chatSearch.toLowerCase()))
      .reduce((acc, chat) => {
        const d = new Date(chat.created_at).toDateString();
        if (d === today) acc.today.push(chat);
        else if (d === yesterday) acc.yesterday.push(chat);
        else acc.older.push(chat);
        return acc;
      }, { today: [], yesterday: [], older: [] });
  }, [chatList, chatSearch]);

  /* ── AI voice helpers ── */
  const stopAiSpeech = () => {
    stopSpeakingRef.current = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setBotStatus('idle');
    setHighlightId('');
  };

  /* ── speakSegments — highlight fires AFTER TTS starts speaking ── */
  const speakSegments = async (segments) => {
    stopSpeakingRef.current = false;
    setIsSpeaking(true);
    setBotStatus('speaking');

    /* Load voices first */
    const getVoices = () => new Promise(resolve => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) return resolve(v);
      window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
    });
    const allVoices   = await getVoices();
    const femaleVoice =
      allVoices.find(v => v.lang === 'th-TH' && /premwadee|kanya|female|woman|หญิง/i.test(v.name)) ||
      allVoices.find(v => v.lang === 'th-TH' && /google/i.test(v.name)) ||
      allVoices.find(v => v.lang === 'th-TH') || null;

    for (const segment of segments) {
      if (stopSpeakingRef.current) break;

      /* ── Apply UI filter changes BEFORE speaking ── */
      if (segment.action) {
        if (segment.action.filterMonth !== undefined) setFilterMonth(segment.action.filterMonth);
        /* await one tick so React can re-render filters */
        await new Promise(r => setTimeout(r, 80));
      }

      await new Promise((resolve) => {
        let resolved = false;
        const safeResolve = () => { if (!resolved) { resolved = true; resolve(); } };

        const utterance = new SpeechSynthesisUtterance(segment.text);
        utterance.lang   = 'th-TH';
        utterance.rate   = 0.92;   // ชัดเจนขึ้น
        utterance.pitch  = femaleVoice ? 1.0 : 1.3;
        utterance.volume = 1;
        if (femaleVoice) utterance.voice = femaleVoice;

        /* ── Highlight & scroll fires when TTS actually STARTS ── */
        utterance.onstart = () => {
          if (segment.highlightId) {
            setHighlightId(segment.highlightId);
            const el = document.getElementById(segment.highlightId);
            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else {
            setHighlightId('');
          }
        };

        utterance.onend   = safeResolve;
        utterance.onerror = safeResolve;
        window.speechSynthesis.speak(utterance);

        /* Safety timeout: chars × 90ms, min 2s */
        setTimeout(safeResolve, Math.max(2000, segment.text.length * 90));
      });
    }

    if (!stopSpeakingRef.current) {
      setIsSpeaking(false);
      setBotStatus('idle');
      setHighlightId('');
    }
  };

  const closeChatWindow = () => {
    setIsChatOpen(false);
    stopAiSpeech();
  };

  const startListening = () => {
    stopAiSpeech();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('เบราว์เซอร์ไม่รองรับ กรุณาใช้ Chrome'); return; }
    const rec = new SR();
    rec.lang = 'th-TH';
    rec.onstart  = () => setIsListening(true);
    rec.onresult = (e) => setChatInput(e.results[0][0].transcript);
    rec.onerror  = () => setIsListening(false);
    rec.onend    = () => setIsListening(false);
    rec.start();
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    stopAiSpeech();

    const userMessage   = chatInput;
    const userMsgObj    = { id: Date.now().toString() + '-user', role: 'user', text: userMessage };
    const updatedMessages = [...chatMessages, userMsgObj];

    setChatMessages(updatedMessages);
    setChatInput('');
    setIsTyping(true);
    setBotStatus('thinking');

    try {
      /* Build context — same pattern as Reports page */
      const contextPayload = {
        totalUsers:          stats.totalUsers,
        totalBalance:        stats.totalBalance,
        totalWasteStock:     stats.totalWasteStock,
        pendingRedemptions:  stats.pendingRedemptions,
        filterYear,
        filterMonth,
        recentDeposits: filteredDeposits.slice(0, 8).map(d => ({
          date: d.deposit_date, name: d.users?.firstname,
          type: d.waste_type, kg: d.weight_kg
        })),
        recentRedemptions: filteredRedemptions.slice(0, 8).map(r => ({
          date: r.created_at, name: r.users?.firstname,
          reward: r.rewards?.name, points: r.points_used
        })),
        monthlySummary: THAI_MONTHS.map(m => {
          const mDeps = deposits.filter(d => {
            const dd = new Date(d.deposit_date || d.created_at);
            return dd.getFullYear().toString() === filterYear &&
                   String(dd.getMonth() + 1).padStart(2, '0') === m.val;
          });
          return {
            month: m.label,
            deposits: mDeps.length,
            weight_kg: mDeps.reduce((s, d) => s + Number(d.weight_kg), 0).toFixed(2)
          };
        }).filter(m => Number(m.weight_kg) > 0)
      };

      const recentHistory = updatedMessages.slice(-6).map(m => `${m.role === 'ai' ? 'EcoBot' : 'Admin'}: ${m.text}`).join('\n');
      const finalPrompt   = `[ประวัติการสนทนาล่าสุด]\n${recentHistory}\n\n[คำสั่งใหม่จาก Admin]\n${userMessage}`;

      const availableHighlights = [
        { id: "card-users",        description: "จำนวนสมาชิกทั้งหมดในระบบ" },
        { id: "card-balance",      description: "ยอดเงินคงเหลือในกองทุน" },
        { id: "card-stock",        description: "สต๊อกขยะที่รับฝากรวม" },
        { id: "card-pending",      description: "รายการรออนุมัติแลกรางวัล" },
        { id: "list-deposits",     description: "ตารางการฝากขยะล่าสุด" },
        { id: "list-redemptions",  description: "ตารางการแลกรางวัลล่าสุด" },
      ];

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: finalPrompt,
          contextData: contextPayload,
          availableHighlights,
          pageName: "หน้า Dashboard สรุปภาพรวมหลัก"
        })
      });

      const data = await res.json();

      if (data.speechSegments?.length > 0) {
        const fullReply = data.speechSegments.map(s => s.text).join(' ');
        const aiMsgObj  = {
          id:       Date.now().toString() + '-ai',
          role:     'ai',
          text:     fullReply,
          segments: data.speechSegments,
        };
        const finalMessages = [...updatedMessages, aiMsgObj];
        setChatMessages(finalMessages);

        /* Save to DB */
        if (!currentChatId) {
          const title = userMessage.slice(0, 35) + (userMessage.length > 35 ? '...' : '');
          const { data: inserted } = await supabase
            .from('ecobot_chats')
            .insert([{ title, messages: finalMessages }])
            .select('id').single();
          if (inserted) { setCurrentChatId(inserted.id); fetchChatList(); }
        } else {
          await supabase.from('ecobot_chats').update({ messages: finalMessages }).eq('id', currentChatId);
        }

        speakSegments(data.speechSegments);
      } else {
        throw new Error('No valid response from AI');
      }
    } catch (err) {
      toast.error('ระบบ AI ขัดข้อง โปรดลองใหม่');
      setChatAlerts(prev => [...prev, { id: Date.now(), type: 'error', text: 'เชื่อมต่อ AI ไม่ได้ กรุณาลองใหม่' }]);
    } finally {
      setIsTyping(false);
      setBotStatus(isSpeaking ? 'speaking' : 'idle');
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
    }
  }, []);

  /* ════ JSX ════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col gap-4 md:gap-6 max-w-7xl mx-auto p-4 md:p-6 lg:p-8 overflow-x-hidden relative">

      {/* ── Banner & Filters ── */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="bg-gradient-to-r from-green-600 to-green-500 dark:from-emerald-800 dark:to-teal-900 rounded-2xl md:rounded-[2rem] p-6 md:p-8 text-white shadow-lg relative overflow-hidden flex-1 w-full">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-black mb-1 md:mb-2">{t('welcomeAdmin')}</h1>
            <p className="text-sm md:text-base font-medium opacity-90">{t('adminDesc')}</p>
          </div>
          <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/4 w-32 h-32 md:w-64 md:h-64 bg-white/10 dark:bg-white/5 rounded-full blur-3xl" />
        </div>

        <div className="flex flex-wrap items-center gap-2 bg-white dark:bg-slate-900 p-2.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm w-full xl:w-auto shrink-0 transition-colors">
          <Calendar className="w-5 h-5 text-slate-400 hidden sm:block ml-2" />
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex-1 sm:flex-none transition-colors">
            <option value="all">{t('allYear')}</option>
            {THAI_MONTHS.map(m => <option key={m.val} value={m.val}>{lang === 'th' ? m.label : m.val}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl outline-none bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex-1 sm:flex-none transition-colors">
            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {filterMonth !== 'all' && (
            <button onClick={() => setFilterMonth('all')} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-colors">
              <FilterX className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard id="card-users"   highlightId={highlightId} title={t('totalMembersDash')}    value={stats.totalUsers}                           unit={t('unitPerson')} icon={<Users />}       color="blue"   loading={loading} />
        <StatCard id="card-balance" highlightId={highlightId} title={t('totalBalance')}         value={`฿${stats.totalBalance.toLocaleString()}`}  unit=""                icon={<Wallet />}      color="green"  loading={loading} />
        <StatCard id="card-stock"   highlightId={highlightId} title={t('totalWasteStock')}      value={stats.totalWasteStock}                      unit={t('unitKg')}     icon={<Scale />}       color="orange" loading={loading} />
        <StatCard id="card-pending" highlightId={highlightId} title={t('pendingRedemptions')}   value={stats.pendingRedemptions}                   unit={t('unitItems')}  icon={<AlertCircle />} color="red"    loading={loading} />
      </div>

      {/* ── Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-10">
        <ActivityList id="list-deposits"    highlightId={highlightId} title={t('recentDeposits')}    data={filteredDeposits.slice(0, 5)}    loading={loading} type="deposit"    unit={t('unitKg')}     emptyText={t('noRecentItems')} />
        <ActivityList id="list-redemptions" highlightId={highlightId} title={t('recentRedemptions')} data={filteredRedemptions.slice(0, 5)} loading={loading} type="redemption" unit={t('unitPoints')} emptyText={t('noRecentItems')} />
      </div>

      {/* ══════════════════════════════════════════════════════
          🤖 AI Chatbot — same style as Reports page
      ══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes borderPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,0.7),0 25px 50px -12px rgba(0,0,0,0.25); }
          50%      { box-shadow:0 0 0 6px rgba(99,102,241,0),0 25px 50px -12px rgba(0,0,0,0.25); }
        }
        .speaking-border { animation:borderPulse 1.4s ease-in-out infinite; border:2px solid #6366f1 !important; }
        @keyframes floatPulse {
          0%,100% { box-shadow:0 0 0 0 rgba(99,102,241,0.8),0 10px 25px rgba(0,0,0,0.3); }
          50%      { box-shadow:0 0 0 10px rgba(99,102,241,0),0 10px 25px rgba(0,0,0,0.3); }
        }
        .speaking-float { animation:floatPulse 1.4s ease-in-out infinite; }
      `}</style>

      {/* Chat Window */}
      {isChatOpen && (
        <div
          className={`fixed z-50 bottom-24 right-6 w-[320px] sm:w-[380px] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${isSpeaking ? 'speaking-border' : 'border border-slate-200 dark:border-slate-800'}`}
          style={{ height: '500px' }}
        >
          {/* ── History sidebar ── */}
          <AnimatePresence>
            {isChatMenuOpen && (
              <motion.div
                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                transition={{ type: 'tween', duration: 0.2 }}
                className="absolute inset-0 z-30 bg-white dark:bg-slate-900 flex flex-col shadow-[4px_0_15px_rgba(0,0,0,0.1)]"
              >
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                  <button onClick={startNewChat} className="flex-1 mr-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> แชทใหม่
                  </button>
                  <button onClick={() => setIsChatMenuOpen(false)} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder="ค้นหาประวัติ..." value={chatSearch} onChange={e => setChatSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-200" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-4">
                  {[
                    { key: 'today', label: 'วันนี้' },
                    { key: 'yesterday', label: 'เมื่อวาน' },
                    { key: 'older', label: 'เก่ากว่า' },
                  ].map(({ key, label }) =>
                    groupedChats[key].length > 0 && (
                      <div key={key}>
                        <p className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1.5">{label}</p>
                        <div className="space-y-1">
                          {groupedChats[key].map(chat => (
                            <div
                              key={chat.id}
                              onClick={() => loadChat(chat.id)}
                              className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${currentChatId === chat.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}
                            >
                              <p className="text-xs font-bold truncate pr-6">{chat.title}</p>
                              <button
                                onClick={(e) => deleteChatGroup(chat.id, e)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  {chatList.length === 0 && (
                    <p className="text-center text-xs text-slate-400 mt-10">ยังไม่มีประวัติการสนทนา</p>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Chat Header ── */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-950 dark:to-slate-900 px-3 py-3 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsChatMenuOpen(true)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors">
                <Menu className="w-4 h-4" />
              </button>
              <div className="relative ml-1">
                <div className="bg-white/20 p-1.5 rounded-xl"><Bot className="w-4 h-4" /></div>
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-800 dark:border-slate-950 ${botStatus === 'thinking' ? 'bg-amber-400 animate-pulse' : botStatus === 'speaking' ? 'bg-green-400 animate-ping' : 'bg-slate-400'}`} />
              </div>
              <div>
                <h3 className="font-black text-sm leading-tight">EcoBot Analyst</h3>
                <p className="text-[10px] text-slate-300 leading-none mt-0.5">
                  {botStatus === 'thinking' ? 'กำลังวิเคราะห์...' : botStatus === 'speaking' ? 'กำลังนำเสนอ...' : 'พร้อมให้บริการ'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isSpeaking && (
                <button onClick={stopAiSpeech} className="p-1.5 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white rounded-lg transition-colors" title="หยุดพูด">
                  <Square className="w-3.5 h-3.5 fill-current" />
                </button>
              )}
              <button onClick={closeChatWindow} className="p-1.5 hover:bg-red-500/80 rounded-lg transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* ── Alerts ── */}
          {chatAlerts.length > 0 && (
            <div className="px-3 pt-2 pb-1 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 space-y-1.5 max-h-28 overflow-y-auto shrink-0">
              {chatAlerts.slice(-3).map(alert => (
                <div key={alert.id} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${
                  alert.type === 'success' ? 'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400' :
                  alert.type === 'error'   ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400' :
                  'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                }`}>
                  {alert.type === 'success' ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : alert.type === 'error' ? <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> : <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                  <span>{alert.text}</span>
                  <button onClick={() => setChatAlerts(prev => prev.filter(a => a.id !== alert.id))} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          {/* ── Messages ── */}
          <div className="flex-1 p-3 overflow-y-auto bg-slate-50 dark:bg-slate-950 space-y-4 scrollbar-hide">
            {chatMessages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && (
                  <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mr-2 mt-1">
                    <MessageSquareText className="w-3.5 h-3.5" />
                  </div>
                )}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className={`p-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-slate-800 dark:bg-emerald-600 text-white rounded-2xl rounded-br-sm font-medium'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-sm shadow-sm'
                  }`}>
                    {msg.text}
                  </div>
                  {/* Action buttons */}
                  <div className={`flex items-center gap-2 mt-0.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && msg.segments?.length > 0 && (
                      <button
                        onClick={() => { if (!isSpeaking) speakSegments(msg.segments); }}
                        disabled={isSpeaking}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <RotateCcw className="w-3 h-3" /> เล่นซ้ำ
                      </button>
                    )}
                    {msg.id && msg.id !== 'welcome-msg' && (
                      <button
                        onClick={() => deleteSingleMessage(msg.id)}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                      >
                        <Trash2 className="w-3 h-3" /> ลบ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mr-2 mt-1">
                  <MessageSquareText className="w-3.5 h-3.5" />
                </div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  <span className="text-[10px] text-slate-400 font-medium ml-1">กำลังวิเคราะห์...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* ── Input ── */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <button
              onClick={startListening}
              className={`p-2 rounded-full shrink-0 transition-all ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
              title="สั่งงานด้วยเสียง"
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSendChat()}
              placeholder={isListening ? 'กำลังฟังคำสั่ง...' : 'พิมพ์คำสั่งเพื่อวิเคราะห์...'}
              className="flex-1 text-xs sm:text-sm bg-transparent outline-none px-1 font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || isTyping}
              className="p-2 bg-slate-800 dark:bg-emerald-600 text-white rounded-full shrink-0 hover:bg-slate-700 dark:hover:bg-emerald-500 disabled:opacity-40 transition-all"
            >
              {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* ── Floating Toggle Button ── */}
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => isChatOpen ? closeChatWindow() : setIsChatOpen(true)}
          className={`relative p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 border-4 border-white dark:border-slate-800 hover:scale-110 active:scale-95 ${isChatOpen ? 'bg-slate-600 dark:bg-slate-700 hover:bg-slate-500' : 'bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700'} text-white ${isSpeaking ? 'speaking-float' : ''}`}
          title={isChatOpen ? 'ปิด EcoBot' : 'เปิด EcoBot'}
        >
          {isChatOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
          {!isChatOpen && (
            <span className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${
              botStatus === 'thinking' ? 'bg-amber-400 animate-pulse' :
              botStatus === 'speaking' ? 'bg-green-400 animate-ping' : 'bg-slate-400'
            }`} />
          )}
        </button>
      </div>

    </div>
  );
}