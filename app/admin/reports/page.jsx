"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Skeleton } from "@/app/components/ui/skeleton";
import {
  BarChart3, Leaf, Calendar, FilterX, Download,
  Users, Weight, Trophy, Search, X, Bot, Mic, Send, Loader2, Square,
  AlertCircle, CheckCircle2, Info, MessageSquareText, RotateCcw, Trash2, Menu, Plus
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { toast } from 'sonner';
import {
  LineChart, Line, PieChart, Pie, Cell,
  Tooltip, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend
} from 'recharts';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

const THAI_MONTHS = [
  { val: '01', label: 'มกราคม', short: 'ม.ค.' }, { val: '02', label: 'กุมภาพันธ์', short: 'ก.พ.' },
  { val: '03', label: 'มีนาคม', short: 'มี.ค.' }, { val: '04', label: 'เมษายน', short: 'เม.ย.' },
  { val: '05', label: 'พฤษภาคม', short: 'พ.ค.' }, { val: '06', label: 'มิถุนายน', short: 'มิ.ย.' },
  { val: '07', label: 'กรกฎาคม', short: 'ก.ค.' }, { val: '08', label: 'สิงหาคม', short: 'ส.ค.' },
  { val: '09', label: 'กันยายน', short: 'ก.ย.' }, { val: '10', label: 'ตุลาคม', short: 'ต.ค.' },
  { val: '11', label: 'พฤศจิกายน', short: 'พ.ย.' }, { val: '12', label: 'ธันวาคม', short: 'ธ.ค.' },
];
const PIE_COLORS = ['#f59e0b','#3b82f6','#10b981','#06b6d4','#ef4444','#8b5cf6','#f97316','#14b8a6'];
const HIST_LIMIT = 10;

function StatCard({ id, highlightId, icon: Icon, label, value, unit, colorClass, bgClass, loading }) {
  const isHighlighted = highlightId === id;
  return (
    <div
      id={id}
      className={`bg-white dark:bg-slate-900 rounded-2xl shadow-sm border-l-4 ${colorClass} border-y border-r border-slate-100 dark:border-slate-800 p-4 flex items-center justify-between gap-3 transition-all duration-700 ease-in-out
        ${isHighlighted ? 'ring-[6px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-950 scale-[1.12] z-30 relative shadow-[0_0_40px_rgba(99,102,241,0.5)] bg-indigo-50/80 dark:bg-indigo-900/30' : 'scale-100 z-0'}`}
    >
      <div className="min-w-0">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-wider mb-1 truncate">{label}</p>
        {loading
          ? <Skeleton className="h-8 w-28 rounded-lg dark:bg-slate-800" />
          : <p className={`text-xl sm:text-2xl font-black transition-all duration-700 ${isHighlighted ? 'text-indigo-700 dark:text-indigo-400 scale-105' : 'text-slate-800 dark:text-white'}`}>
              {value} <span className="text-xs sm:text-sm font-bold text-slate-400">{unit}</span>
            </p>
        }
      </div>
      <div className={`${bgClass} p-2.5 sm:p-3 rounded-xl shrink-0 transition-all duration-700 ${isHighlighted ? 'scale-125' : ''}`}>
        <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
      </div>
    </div>
  );
}

export default function AdminReports() {
  const { t, lang } = useLanguage();
  const { theme }   = useTheme();
  const currentYear = new Date().getFullYear().toString();

  const [filterYear,  setFilterYear]  = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState('all');
  const [histMonth,   setHistMonth]   = useState('');
  const [histYear,    setHistYear]    = useState('');
  const [histType,    setHistType]    = useState('');
  const [histSearch,  setHistSearch]  = useState('');
  const [histPage,    setHistPage]    = useState(1);

  const [deposits,     setDeposits]     = useState([]);
  const [wasteTypes,   setWasteTypes]   = useState([]);
  const [topUsers,     setTopUsers]     = useState([]);
  const [totalMembers, setTotalMembers] = useState(0);
  const [loading,      setLoading]      = useState(true);
  const [processing,   setProcessing]   = useState(false);
  const reportRef = useRef(null);

  /* ── AI Chatbot States ── */
  const [isChatOpen,  setIsChatOpen]  = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput,   setChatInput]   = useState('');
  const [isTyping,    setIsTyping]    = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking,  setIsSpeaking]  = useState(false);
  const [highlightId, setHighlightId] = useState('');
  const [chatAlerts,  setChatAlerts]  = useState([]);
  const [botStatus,   setBotStatus]   = useState('idle');
  const chatEndRef      = useRef(null);
  const stopSpeakingRef = useRef(false);

  /* ── Chat History States ── */
  const [currentChatId,   setCurrentChatId]   = useState(null);
  const [chatList,        setChatList]        = useState([]);
  const [isChatMenuOpen,  setIsChatMenuOpen]  = useState(false);
  const [chatSearch,      setChatSearch]      = useState('');

  const fetchChatList = async () => {
    const { data } = await supabase.from('ecobot_chats').select('id, title, created_at').order('created_at', { ascending: false });
    if (data) setChatList(data);
  };

  useEffect(() => {
    fetchData();
    fetchChatList();
    setChatMessages([{ id: 'welcome-msg', role: 'ai', text: t('chatBotReady') }]);
  }, [t]);

  useEffect(() => {
    if (chatEndRef.current) chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isTyping]);

  /* ── Chat session management ── */
  const startNewChat = () => {
    setCurrentChatId(null);
    setChatMessages([{ id: Date.now().toString(), role: 'ai', text: t('chatBotReady') }]);
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
    const newMsgs = chatMessages.filter(m => m.id !== msgId);
    setChatMessages(newMsgs);
    if (currentChatId) {
      await supabase.from('ecobot_chats').update({ messages: newMsgs }).eq('id', currentChatId);
    }
  };

  /* ── Data fetching ── */
  const fetchData = async () => {
    setLoading(true);
    const [depRes, typesRes, usersRes, membersRes] = await Promise.all([
      supabase.from('deposit_stats').select('*, users(firstname, lastname)').order('deposit_date', { ascending: false }),
      supabase.from('waste_types').select('name, co2_factor').order('name'),
      supabase.from('users').select('firstname, points').eq('role', 'user').order('points', { ascending: false }).limit(5),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'user'),
    ]);
    if (depRes.data)     setDeposits(depRes.data);
    if (typesRes.data)   setWasteTypes(typesRes.data);
    if (usersRes.data)   setTopUsers(usersRes.data);
    if (membersRes.count !== null) setTotalMembers(membersRes.count);
    setLoading(false);
  };

  const co2Map = useMemo(() => {
    const m = {};
    wasteTypes.forEach(wt => { m[wt.name] = Number(wt.co2_factor) || 0; });
    return m;
  }, [wasteTypes]);

  const chartDeposits = useMemo(() => deposits.filter(dep => {
    const d = new Date(dep.deposit_date || dep.created_at);
    if (filterYear && d.getFullYear().toString() !== filterYear) return false;
    if (filterMonth !== 'all' && String(d.getMonth() + 1).padStart(2, '0') !== filterMonth) return false;
    return true;
  }), [deposits, filterYear, filterMonth]);

  const summary = useMemo(() => {
    let totalWeight = 0, totalTx = 0, totalCo2 = 0;
    chartDeposits.forEach(dep => {
      const w = Number(dep.weight_kg) || 0;
      totalWeight += w; totalTx++;
      totalCo2 += w * (co2Map[dep.waste_type] || 0);
    });
    return { totalWeight, totalTx, totalCo2 };
  }, [chartDeposits, co2Map]);

  const buildTimeMap = (deps, key) => {
    const map = {};
    deps.forEach(dep => {
      const d = new Date(dep.deposit_date || dep.created_at);
      const label = filterMonth === 'all'
        ? (THAI_MONTHS.find(x => x.val === String(d.getMonth() + 1).padStart(2, '0'))?.short || '')
        : `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}`;
      map[label] = (map[label] || 0) + key(dep);
    });
    return Object.entries(map).map(([d, v]) => ({ d, v: +Number(v).toFixed(4) }));
  };

  const lineData = useMemo(() => buildTimeMap(chartDeposits, dep => Number(dep.weight_kg) || 0).map(({ d, v }) => ({ d, w: v })), [chartDeposits, filterMonth]);
  const pieData  = useMemo(() => {
    const map = {};
    chartDeposits.forEach(dep => { map[dep.waste_type] = (map[dep.waste_type] || 0) + (Number(dep.weight_kg) || 0); });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([name, w]) => ({ name, w: +w.toFixed(2) }));
  }, [chartDeposits]);

  const histFiltered = useMemo(() => deposits.filter(dep => {
    const d = new Date(dep.deposit_date || dep.created_at);
    if (histMonth && String(d.getMonth() + 1).padStart(2, '0') !== histMonth) return false;
    if (histYear  && d.getFullYear().toString() !== histYear) return false;
    if (histType  && dep.waste_type !== histType) return false;
    if (histSearch) {
      const name = `${dep.users?.firstname || ''} ${dep.users?.lastname || ''}`.toLowerCase();
      if (!name.includes(histSearch.toLowerCase())) return false;
    }
    return true;
  }), [deposits, histMonth, histYear, histType, histSearch]);

  const histTotalPages = Math.ceil(histFiltered.length / HIST_LIMIT);
  const histPageData   = histFiltered.slice((histPage - 1) * HIST_LIMIT, histPage * HIST_LIMIT);
  const availableYears = useMemo(() => {
    const years = [...new Set(deposits.map(d => new Date(d.deposit_date || d.created_at).getFullYear().toString()))].sort((a, b) => b - a);
    if (!years.includes(currentYear)) years.unshift(currentYear);
    return years;
  }, [deposits, currentYear]);
  const wasteTypeNames = useMemo(() => [...new Set(deposits.map(d => d.waste_type))].sort(), [deposits]);

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

  /* ── Export PDF ── */
  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      setProcessing(true);
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', pixelRatio: 2 });
      const img = new Image(); img.src = dataUrl;
      await new Promise(r => { img.onload = r; });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pw  = pdf.internal.pageSize.getWidth();
      pdf.addImage(dataUrl, 'PNG', 0, 10, pw, (img.height * pw) / img.width);
      const mLabel = filterMonth === 'all' ? 'ทั้งปี' : (THAI_MONTHS.find(m => m.val === filterMonth)?.label || filterMonth);
      pdf.save(`รายงานสถิติรับฝากขยะ_${mLabel}_${filterYear}.pdf`);
    } catch { toast.error('เกิดข้อผิดพลาดในการพิมพ์ PDF'); }
    finally { setProcessing(false); }
  };

  /* ── AI speech helpers ── */
  const stopAiSpeech = () => {
    stopSpeakingRef.current = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setBotStatus('idle');
    setHighlightId('');
  };

  /* ── KEY FIX: highlight fires on utterance.onstart, NOT before speaking ── */
  const speakSegments = async (segments) => {
    stopSpeakingRef.current = false;
    setIsSpeaking(true);
    setBotStatus('speaking');

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

      /* Apply filter changes BEFORE queuing the utterance (not before highlight) */
      if (segment.action) {
        if (segment.action.filterMonth !== undefined) { setFilterMonth(segment.action.filterMonth); }
        if (segment.action.histMonth   !== undefined) { setHistMonth(segment.action.histMonth); }
        if (segment.action.histType    !== undefined) { setHistType(segment.action.histType); }
        if (segment.action.histSearch  !== undefined) { setHistSearch(segment.action.histSearch); }
        setHistPage(1);
        /* Small pause for React to flush state → DOM before speaking */
        await new Promise(r => setTimeout(r, 120));
      }

      await new Promise((resolve) => {
        let resolved = false;
        const safeResolve = () => { if (!resolved) { resolved = true; resolve(); } };

        const utterance = new SpeechSynthesisUtterance(segment.text);
        utterance.lang   = 'th-TH';
        utterance.rate   = 0.92;  // slightly slower — clearer
        utterance.pitch  = femaleVoice ? 1.0 : 1.3;
        utterance.volume = 1;
        if (femaleVoice) utterance.voice = femaleVoice;

        /* ── HIGHLIGHT fires when TTS actually starts speaking ── */
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

        /* Safety net: if onend/onstart never fires (browser bug) */
        setTimeout(safeResolve, Math.max(2000, segment.text.length * 90));
      });
    }

    if (!stopSpeakingRef.current) {
      setIsSpeaking(false);
      setBotStatus('idle');
      setHighlightId('');
    }
  };

  const closeChatWindow = () => { setIsChatOpen(false); };

  const startListening = () => {
    stopAiSpeech();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error('เบราว์เซอร์ไม่รองรับ แนะนำ Chrome'); return; }
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

    const userMessage    = chatInput;
    const userMsgObj     = { id: Date.now().toString() + '-user', role: 'user', text: userMessage };
    const updatedMessages = [...chatMessages, userMsgObj];

    setChatMessages(updatedMessages);
    setChatInput('');
    setIsTyping(true);
    setBotStatus('thinking');

    try {
      const monthlySummaries = THAI_MONTHS.map(m => {
        const mDeps = deposits.filter(d => {
          const dd = new Date(d.deposit_date || d.created_at);
          return dd.getMonth() + 1 === parseInt(m.val) && dd.getFullYear().toString() === filterYear;
        });
        const w   = mDeps.reduce((s, d) => s + Number(d.weight_kg), 0);
        const co2 = mDeps.reduce((s, d) => s + Number(d.weight_kg) * (co2Map[d.waste_type] || 0), 0);
        return { month: m.label, weight_kg: w.toFixed(2), co2_reduced: co2.toFixed(2), transactions: mDeps.length };
      }).filter(m => Number(m.weight_kg) > 0);

      const wasteTypeSummaries = wasteTypes.map(wt => {
        const tDeps = deposits.filter(d => d.waste_type === wt.name && new Date(d.deposit_date || d.created_at).getFullYear().toString() === filterYear);
        const w = tDeps.reduce((s, d) => s + Number(d.weight_kg), 0);
        return { type: wt.name, co2_factor_per_kg: wt.co2_factor, total_weight_kg: w.toFixed(2), total_co2_reduced: (w * wt.co2_factor).toFixed(2) };
      }).filter(t => Number(t.total_weight_kg) > 0);

      const contextPayload = {
        totalMembers,
        currentYear: filterYear,
        summaryOverall: {
          totalWeight: summary.totalWeight.toFixed(2),
          totalTx:     summary.totalTx,
          totalCo2:    summary.totalCo2.toFixed(2)
        },
        monthlySummaries,
        wasteTypeSummaries
      };

      const recentHistory = updatedMessages.slice(-6).map(m => `${m.role === 'ai' ? 'EcoBot' : 'Admin'}: ${m.text}`).join('\n');
      const finalPrompt   = `[ประวัติการสนทนาล่าสุด]\n${recentHistory}\n\n[คำสั่งใหม่จาก Admin]\n${userMessage}`;

      const availableHighlights = [
        { id: "card-weight",    description: "ข้อมูลขยะสะสมรวม" },
        { id: "card-tx",        description: "จำนวนครั้งการทำรายการรวม" },
        { id: "card-co2",       description: "ปริมาณลด CO2 รวม" },
        { id: "card-users",     description: "จำนวนสมาชิกทั้งหมด" },
        { id: "chart-line",     description: "กราฟแสดงปริมาณขยะ" },
        { id: "chart-pie",      description: "กราฟสัดส่วนประเภทขยะ" },
        { id: "top-users",      description: "5 อันดับคนได้คะแนนสูงสุด" },
        { id: "history-table",  description: "ตารางประวัติการฝากขยะ" },
      ];

      const res  = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: finalPrompt, contextData: contextPayload, availableHighlights, pageName: "หน้ารายงานสถิติ (Reports)" })
      });
      const data = await res.json();

      if (data.speechSegments?.length > 0) {
        const fullReply = data.speechSegments.map(s => s.text).join(' ');
        const aiMsgObj  = { id: Date.now().toString() + '-ai', role: 'ai', text: fullReply, segments: data.speechSegments };
        const finalMessages = [...updatedMessages, aiMsgObj];
        setChatMessages(finalMessages);

        if (!currentChatId) {
          const title = userMessage.slice(0, 35) + (userMessage.length > 35 ? '...' : '');
          const { data: inserted } = await supabase.from('ecobot_chats').insert([{ title, messages: finalMessages }]).select('id').single();
          if (inserted) { setCurrentChatId(inserted.id); fetchChatList(); }
        } else {
          await supabase.from('ecobot_chats').update({ messages: finalMessages }).eq('id', currentChatId);
        }

        speakSegments(data.speechSegments);
      } else {
        throw new Error('No valid response from AI');
      }
    } catch {
      toast.error('ระบบ AI ขัดข้อง โปรดลองใหม่');
      setChatAlerts(prev => [...prev, { id: Date.now(), type: 'error', text: 'เชื่อมต่อ AI ไม่ได้ กรุณาลองใหม่' }]);
    } finally {
      setIsTyping(false);
      setBotStatus(isSpeaking ? 'speaking' : 'idle');
    }
  };

  useEffect(() => {
    if ('speechSynthesis' in window) window.speechSynthesis.onvoiceschanged = () => window.speechSynthesis.getVoices();
  }, []);

  /* ════ JSX ════════════════════════════════════════════════ */
  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0 relative overflow-x-hidden transition-colors">
      <div className="bg-card rounded-2xl sm:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col overflow-hidden transition-colors">

        {/* ── Header ── */}
        <div className="p-4 sm:p-6 lg:p-8 border-b border-slate-100 dark:border-slate-800 flex flex-col gap-3 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md shrink-0 transition-colors">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-lg sm:text-xl leading-tight text-slate-800 dark:text-white">{t('reportsTitle')}</h3>
              <p className="text-xs text-muted-foreground font-medium opacity-70 mt-0.5">{t('reportsSubtitle')}</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 bg-slate-50/80 dark:bg-slate-950/50 p-2 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
              <Calendar className="w-4 h-4 text-slate-400 hidden sm:block" />
              <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-2 py-1.5 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex-1 sm:flex-none transition-colors">
                <option value="all">{t('allYearOverView')}</option>
                {THAI_MONTHS.map(m => <option key={m.val} value={m.val}>{lang === 'th' ? m.label : m.val}</option>)}
              </select>
              <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-2 py-1.5 text-xs sm:text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-lg outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex-1 sm:flex-none transition-colors">
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              {filterMonth !== 'all' && <button onClick={() => setFilterMonth('all')} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"><FilterX className="w-4 h-4" /></button>}
              <button onClick={exportPDF} disabled={processing} className="px-3 sm:px-5 py-1.5 sm:py-2 bg-slate-800 dark:bg-emerald-600 text-white rounded-lg sm:rounded-xl hover:bg-slate-700 dark:hover:bg-emerald-500 flex items-center gap-1.5 font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 text-xs sm:text-sm whitespace-nowrap">
                <Download className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                {processing ? t('preparing') : t('exportPdf')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Report Body ── */}
        <div className="p-4 sm:p-6 lg:p-8 bg-slate-50/50 dark:bg-slate-950 transition-colors">
          <div ref={reportRef} className="space-y-5 sm:space-y-6">

            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <StatCard id="card-weight" highlightId={highlightId} icon={Weight}   label={`${t('cardWeight')} (${filterMonth === 'all' ? t('allYearOverView') : t('monthly')})`} value={summary.totalWeight.toLocaleString('th-TH', { minimumFractionDigits: 2 })} unit={t('colWeight')} colorClass="border-blue-500"  bgClass="bg-blue-50 dark:bg-blue-500/10 text-blue-500 dark:text-blue-400"    loading={loading} />
              <StatCard id="card-tx"     highlightId={highlightId} icon={BarChart3} label={t('cardTx')}                                                                        value={summary.totalTx.toLocaleString('th-TH')}                                               unit="ครั้ง"      colorClass="border-green-500" bgClass="bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400"  loading={loading} />
              <StatCard id="card-co2"   highlightId={highlightId} icon={Leaf}      label={t('cardCo2')}                                                                        value={summary.totalCo2.toLocaleString('th-TH', { minimumFractionDigits: 2 })}               unit="kgCO2e"     colorClass="border-cyan-500"  bgClass="bg-cyan-50 dark:bg-cyan-500/10 text-cyan-600 dark:text-cyan-400"      loading={loading} />
              <StatCard id="card-users" highlightId={highlightId} icon={Users}     label={t('cardUsers')}                                                                      value={totalMembers.toLocaleString('th-TH')}                                                  unit={t('unitPerson')} colorClass="border-amber-500" bgClass="bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400" loading={loading} />
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              <div id="chart-line" className={`lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-700 ease-in-out ${highlightId === 'chart-line' ? 'ring-[6px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-950 scale-[1.04] z-30 relative shadow-[0_0_40px_rgba(99,102,241,0.4)]' : 'scale-100'}`}>
                <div className="px-4 py-2.5 bg-blue-600 text-white"><h6 className="font-black text-xs sm:text-sm">{t('chartLineTitle')} ({filterMonth === 'all' ? t('monthly') : t('daily')})</h6></div>
                <div className="p-3 sm:p-4 h-48 sm:h-64">
                  {loading ? <Skeleton className="w-full h-full rounded-xl dark:bg-slate-800" /> : lineData.length === 0 ? <div className="flex h-full items-center justify-center text-slate-400 font-bold text-sm">{t('noData')}</div> :
                    <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                      <LineChart data={lineData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'dark' ? '#334155' : '#f1f5f9'} />
                        <XAxis dataKey="d" tick={{ fontSize: 10, fontWeight: 700, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                        <YAxis tick={{ fontSize: 10, fill: theme === 'dark' ? '#94a3b8' : '#64748b' }} />
                        <Tooltip formatter={v => [`${v} ${t('colWeight')}`, t('chartLineTitle')]} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0' }} />
                        <Line type="monotone" dataKey="w" stroke="#3b82f6" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  }
                </div>
              </div>

              <div id="chart-pie" className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-700 ease-in-out ${highlightId === 'chart-pie' ? 'ring-[6px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-950 scale-[1.06] z-30 relative shadow-[0_0_40px_rgba(99,102,241,0.4)]' : 'scale-100'}`}>
                <div className="px-4 py-2.5 bg-amber-500 text-white"><h6 className="font-black text-xs sm:text-sm">{t('chartPieTitle')}</h6></div>
                <div className="p-2 sm:p-4 h-48 sm:h-64 flex items-center justify-center">
                  {loading ? <Skeleton className="w-36 h-36 rounded-full dark:bg-slate-800" /> : pieData.length === 0 ? <div className="text-slate-400 font-bold text-sm">{t('noData')}</div> :
                    <ResponsiveContainer width="100%" height="100%" minWidth={1}>
                      <PieChart>
                        <Pie data={pieData} dataKey="w" nameKey="name" cx="50%" cy="50%" outerRadius="65%" innerRadius="30%">
                          {pieData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                        </Pie>
                        <Tooltip formatter={v => [`${v} ${t('colWeight')}`]} contentStyle={{ backgroundColor: theme === 'dark' ? '#1e293b' : '#fff', borderColor: theme === 'dark' ? '#334155' : '#e2e8f0' }} />
                        <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', fontWeight: 700, color: theme === 'dark' ? '#cbd5e1' : '#475569' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  }
                </div>
              </div>
            </div>

            {/* Top5 + History */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
              <div id="top-users" className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-700 ease-in-out ${highlightId === 'top-users' ? 'ring-[6px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-950 scale-[1.04] z-30 relative shadow-[0_0_40px_rgba(99,102,241,0.4)]' : 'scale-100'}`}>
                <div className="px-4 py-2.5 bg-amber-500 text-white flex items-center gap-2"><Trophy className="w-4 h-4" /><h6 className="font-black text-xs sm:text-sm">{t('top5Title')}</h6></div>
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="px-4 py-3 flex items-center gap-3"><Skeleton className="w-6 h-6 rounded-full shrink-0 dark:bg-slate-800" /><Skeleton className="h-4 flex-1 rounded-lg dark:bg-slate-800" /><Skeleton className="h-4 w-14 rounded-lg dark:bg-slate-800" /></div>)
                    : topUsers.map((user, i) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <span className={`w-6 h-6 shrink-0 rounded-full flex items-center justify-center text-xs font-black ${i===0?'bg-amber-400 text-white':i===1?'bg-slate-300 text-slate-700':i===2?'bg-amber-700 text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>{i+1}</span>
                        <span className="flex-1 text-sm font-bold text-slate-700 dark:text-slate-200 truncate">{user.firstname}</span>
                        <span className="text-sm font-black text-amber-500 shrink-0">{Number(user.points||0).toLocaleString('th-TH')}</span>
                      </div>
                    ))
                  }
                </div>
              </div>

              {/* History table */}
              <div id="history-table" className={`lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-700 ease-in-out ${highlightId === 'history-table' ? 'ring-[6px] ring-indigo-500 ring-offset-4 dark:ring-offset-slate-950 scale-[1.02] z-30 relative shadow-[0_0_40px_rgba(99,102,241,0.4)]' : 'scale-100'}`}>
                <div className="px-4 py-2.5 bg-cyan-500 text-white">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <h6 className="font-black text-xs sm:text-sm whitespace-nowrap">{t('historyTableTitle')} ({histFiltered.length.toLocaleString('th-TH')} {t('itemsCount')})</h6>
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <select value={histMonth} onChange={e => { setHistMonth(e.target.value); setHistPage(1); }} className="px-1.5 py-1 text-xs font-bold border border-white/20 rounded-lg bg-white/10 text-white outline-none [&>option]:text-slate-800"><option value="">{t('month')}</option>{THAI_MONTHS.map(m => <option key={m.val} value={m.val}>{lang === 'th' ? m.short : m.val}</option>)}</select>
                      <select value={histYear} onChange={e => { setHistYear(e.target.value); setHistPage(1); }} className="px-1.5 py-1 text-xs font-bold border border-white/20 rounded-lg bg-white/10 text-white outline-none [&>option]:text-slate-800"><option value="">{t('year')}</option>{availableYears.map(y => <option key={y} value={y}>{y}</option>)}</select>
                      <select value={histType} onChange={e => { setHistType(e.target.value); setHistPage(1); }} className="px-1.5 py-1 text-xs font-bold border border-white/20 rounded-lg bg-white/10 text-white outline-none max-w-[90px] [&>option]:text-slate-800"><option value="">{t('colType')}</option>{wasteTypeNames.map(tp => <option key={tp} value={tp}>{tp}</option>)}</select>
                      <div className="relative flex items-center"><Search className="absolute left-2 w-3 h-3 text-white/70 pointer-events-none" /><input type="text" placeholder={t('searchName')} value={histSearch} onChange={e => { setHistSearch(e.target.value); setHistPage(1); }} className="pl-6 pr-2 py-1 text-xs font-bold border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/60 outline-none w-20" /></div>
                      {(histMonth || histYear || histType || histSearch) && <button onClick={() => { setHistMonth(''); setHistYear(''); setHistType(''); setHistSearch(''); setHistPage(1); }} className="p-1 bg-white/20 rounded-lg hover:bg-white/30 transition-colors"><X className="w-3.5 h-3.5 text-white" /></button>}
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse min-w-[340px]">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
                        <th className="py-2.5 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase">{t('colDate')}</th>
                        <th className="py-2.5 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase">{t('colMember')}</th>
                        <th className="py-2.5 px-4 text-xs font-black text-slate-500 dark:text-slate-400 uppercase">{t('colType')}</th>
                        <th className="py-2.5 px-4 text-xs font-black text-slate-500 dark:text-slate-400 text-right uppercase">{t('colWeight')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histPageData.map(dep => (
                        <tr key={dep.id} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                          <td className="py-2.5 px-4 text-xs font-bold text-slate-500 dark:text-slate-400">{new Date(dep.deposit_date || dep.created_at).toLocaleDateString('th-TH')}</td>
                          <td className="py-2.5 px-4 text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[140px]">{dep.users?.firstname || dep.user_id}</td>
                          <td className="py-2.5 px-4"><span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-lg border dark:border-slate-700">{dep.waste_type}</span></td>
                          <td className="py-2.5 px-4 text-xs font-black text-blue-600 dark:text-blue-400 text-right">+{Number(dep.weight_kg).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {histTotalPages > 1 && (
                  <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2 bg-white dark:bg-slate-900">
                    <p className="text-xs font-bold text-slate-400">{t('pageText')} {histPage} / {histTotalPages}</p>
                    <div className="flex gap-1">
                      <button disabled={histPage===1} onClick={() => setHistPage(p=>p-1)} className="px-2.5 py-1 text-xs border dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300">←</button>
                      <button disabled={histPage===histTotalPages} onClick={() => setHistPage(p=>p+1)} className="px-2.5 py-1 text-xs border dark:border-slate-700 rounded hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 text-slate-600 dark:text-slate-300">→</button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          🤖 AI Chatbot
      ══════════════════════════════════════════════════════ */}
      <style>{`
        @keyframes borderPulse { 0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.7),0 25px 50px -12px rgba(0,0,0,0.25);}50%{box-shadow:0 0 0 6px rgba(99,102,241,0),0 25px 50px -12px rgba(0,0,0,0.25);} }
        .speaking-border{animation:borderPulse 1.4s ease-in-out infinite;border:2px solid #6366f1!important;}
        @keyframes floatPulse{0%,100%{box-shadow:0 0 0 0 rgba(99,102,241,0.8),0 10px 25px rgba(0,0,0,0.3);}50%{box-shadow:0 0 0 10px rgba(99,102,241,0),0 10px 25px rgba(0,0,0,0.3);}}
        .speaking-float{animation:floatPulse 1.4s ease-in-out infinite;}
      `}</style>

      {isChatOpen && (
        <div className={`fixed z-50 bottom-24 right-6 w-[320px] sm:w-[380px] bg-white dark:bg-slate-900 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${isSpeaking ? 'speaking-border' : 'border border-slate-200 dark:border-slate-800'}`} style={{ height: '500px' }}>

          {/* History sidebar */}
          <AnimatePresence>
            {isChatMenuOpen && (
              <motion.div initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ type: 'tween', duration: 0.2 }}
                className="absolute inset-0 z-30 bg-white dark:bg-slate-900 flex flex-col shadow-[4px_0_15px_rgba(0,0,0,0.1)]">
                <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-950">
                  <button onClick={startNewChat} className="flex-1 mr-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 hover:bg-indigo-700 transition-colors shadow-sm">
                    <Plus className="w-4 h-4" /> {t('newChat')}
                  </button>
                  <button onClick={() => setIsChatMenuOpen(false)} className="p-2 bg-slate-200 dark:bg-slate-800 rounded-full hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"><X className="w-4 h-4" /></button>
                </div>
                <div className="p-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input type="text" placeholder={t('searchChat')} value={chatSearch} onChange={e => setChatSearch(e.target.value)} className="w-full pl-8 pr-3 py-1.5 text-sm bg-slate-100 dark:bg-slate-800 rounded-lg outline-none text-slate-700 dark:text-slate-200" />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-2 scrollbar-hide space-y-4">
                  {[{ key: 'today', label: 'วันนี้' }, { key: 'yesterday', label: 'เมื่อวาน' }, { key: 'older', label: 'เก่ากว่า' }].map(({ key, label }) =>
                    groupedChats[key].length > 0 && (
                      <div key={key}>
                        <p className="text-[10px] font-black uppercase text-slate-400 ml-2 mb-1.5">{label}</p>
                        <div className="space-y-1">
                          {groupedChats[key].map(chat => (
                            <div key={chat.id} onClick={() => loadChat(chat.id)}
                              className={`group relative p-2 rounded-lg cursor-pointer transition-colors ${currentChatId === chat.id ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                              <p className="text-xs font-bold truncate pr-6">{chat.title}</p>
                              <button onClick={(e) => deleteChatGroup(chat.id, e)}
                                className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 transition-all"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  )}
                  {chatList.length === 0 && <p className="text-center text-xs text-slate-400 mt-10">{t('noChatHistory')}</p>}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Header */}
          <div className="bg-gradient-to-r from-slate-800 to-slate-700 dark:from-slate-950 dark:to-slate-900 px-3 py-3 flex items-center justify-between text-white shrink-0 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <button onClick={() => setIsChatMenuOpen(true)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors"><Menu className="w-4 h-4" /></button>
              <div className="relative ml-1">
                <div className="bg-white/20 p-1.5 rounded-xl"><Bot className="w-4 h-4" /></div>
                <span className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-800 dark:border-slate-950 ${botStatus==='thinking'?'bg-amber-400 animate-pulse':botStatus==='speaking'?'bg-green-400 animate-ping':'bg-slate-400'}`}></span>
              </div>
              <div>
                <h3 className="font-black text-sm leading-tight">EcoBot Analyst</h3>
                <p className="text-[10px] text-slate-300 leading-none mt-0.5">
                  {botStatus==='thinking'?t('chatBotThinking'):botStatus==='speaking'?t('chatBotSpeaking'):t('chatBotReady')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {isSpeaking && <button onClick={stopAiSpeech} className="p-1.5 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white rounded-lg transition-colors"><Square className="w-3.5 h-3.5 fill-current" /></button>}
              <button onClick={closeChatWindow} className="p-1.5 hover:bg-red-500/80 rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
            </div>
          </div>

          {/* Alerts */}
          {chatAlerts.length > 0 && (
            <div className="px-3 pt-2 pb-1 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 space-y-1.5 max-h-28 overflow-y-auto shrink-0">
              {chatAlerts.slice(-3).map(alert => (
                <div key={alert.id} className={`flex items-start gap-2 px-2.5 py-1.5 rounded-lg text-xs font-semibold border ${alert.type==='success'?'bg-green-50 border-green-200 text-green-700 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400':alert.type==='error'?'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400':'bg-blue-50 border-blue-200 text-blue-700 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'}`}>
                  {alert.type==='success'?<CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5"/>:alert.type==='error'?<AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5"/>:<Info className="w-3.5 h-3.5 shrink-0 mt-0.5"/>}
                  <span>{alert.text}</span>
                  <button onClick={() => setChatAlerts(prev => prev.filter(a => a.id !== alert.id))} className="ml-auto shrink-0 opacity-60 hover:opacity-100"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto bg-slate-50 dark:bg-slate-950 space-y-4 scrollbar-hide">
            {chatMessages.map((msg, idx) => (
              <div key={msg.id || idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'ai' && <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mr-2 mt-1"><MessageSquareText className="w-3.5 h-3.5" /></div>}
                <div className="flex flex-col gap-1 max-w-[80%]">
                  <div className={`p-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${msg.role==='user'?'bg-slate-800 dark:bg-emerald-600 text-white rounded-2xl rounded-br-sm font-medium':'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-sm shadow-sm'}`}>
                    {msg.text}
                  </div>
                  <div className={`flex items-center gap-2 mt-0.5 ${msg.role==='user'?'justify-end':'justify-start'}`}>
                    {msg.role==='ai' && msg.segments?.length > 0 && (
                      <button onClick={() => { if (!isSpeaking) speakSegments(msg.segments); }} disabled={isSpeaking}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                        <RotateCcw className="w-3 h-3" /> เล่นซ้ำ
                      </button>
                    )}
                    {msg.id && msg.id !== 'welcome-msg' && (
                      <button onClick={() => deleteSingleMessage(msg.id)}
                        className="flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all">
                        <Trash2 className="w-3 h-3" /> ลบ
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mr-2 mt-1"><MessageSquareText className="w-3.5 h-3.5" /></div>
                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0.2s'}}></span>
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{animationDelay:'0.4s'}}></span>
                  <span className="text-[10px] text-slate-400 font-medium ml-1">{t('chatBotThinking')}</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0">
            <button onClick={startListening} className={`p-2 rounded-full shrink-0 transition-all ${isListening?'bg-red-100 text-red-500 animate-pulse':'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`}><Mic className="w-4 h-4" /></button>
            <input type="text" value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key==='Enter' && handleSendChat()} placeholder={isListening?'กำลังฟังคำสั่ง...':t('typeCommand')} className="flex-1 text-xs sm:text-sm bg-transparent outline-none px-1 font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400" />
            <button onClick={handleSendChat} disabled={!chatInput.trim()||isTyping} className="p-2 bg-slate-800 dark:bg-emerald-600 text-white rounded-full shrink-0 hover:bg-slate-700 dark:hover:bg-emerald-500 disabled:opacity-40 transition-all">
              {isTyping?<Loader2 className="w-4 h-4 animate-spin"/>:<Send className="w-4 h-4"/>}
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <div className="fixed bottom-6 right-6 z-50">
        <button onClick={() => isChatOpen ? closeChatWindow() : setIsChatOpen(true)}
          className={`relative p-4 rounded-full shadow-2xl flex items-center justify-center transition-all duration-200 border-4 border-white dark:border-slate-800 hover:scale-110 active:scale-95 ${isChatOpen?'bg-slate-600 dark:bg-slate-700 hover:bg-slate-500':'bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700'} text-white ${isSpeaking?'speaking-float':''}`}>
          {isChatOpen ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
          {!isChatOpen && <span className={`absolute top-1 right-1 w-3 h-3 rounded-full border-2 border-white dark:border-slate-800 ${botStatus==='thinking'?'bg-amber-400 animate-pulse':botStatus==='speaking'?'bg-green-400 animate-ping':'bg-slate-400'}`}></span>}
        </button>
      </div>

    </div>
  );
}