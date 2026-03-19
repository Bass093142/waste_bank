"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Skeleton } from "@/app/components/ui/skeleton";
import { 
  Users, Scale, Wallet, AlertCircle, TrendingUp, Gift, Activity, Clock, CheckCircle2,
  Calendar, FilterX, Bot, X, Maximize2, Minus, Square, Mic, Send, Loader2, MessageSquareText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/contexts/LanguageContext';
import { toast } from 'sonner';

const THAI_MONTHS = [
  { val: '01', label: 'มกราคม', short: 'ม.ค.' }, { val: '02', label: 'กุมภาพันธ์', short: 'ก.พ.' },
  { val: '03', label: 'มีนาคม', short: 'มี.ค.' }, { val: '04', label: 'เมษายน', short: 'เม.ย.' },
  { val: '05', label: 'พฤษภาคม', short: 'พ.ค.' }, { val: '06', label: 'มิถุนายน', short: 'มิ.ย.' },
  { val: '07', label: 'กรกฎาคม', short: 'ก.ค.' }, { val: '08', label: 'สิงหาคม', short: 'ส.ค.' },
  { val: '09', label: 'กันยายน', short: 'ก.ย.' }, { val: '10', label: 'ตุลาคม', short: 'ต.ค.' },
  { val: '11', label: 'พฤศจิกายน', short: 'พ.ย.' }, { val: '12', label: 'ธันวาคม', short: 'ธ.ค.' },
];

export default function AdminDashboard() {
  const { t, lang } = useLanguage();
  const currentYear = new Date().getFullYear().toString();
  
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalUsers: 0, totalBalance: 0, totalWasteStock: 0, pendingRedemptions: 0 });
  const [deposits, setDeposits] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  
  // Filters
  const [filterYear, setFilterYear] = useState(currentYear);
  const [filterMonth, setFilterMonth] = useState('all');

  // ── AI Chatbot States ──
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { role: 'ai', text: 'สวัสดีค่ะ ดิฉัน EcoBot พร้อมให้ข้อมูลสรุปภาพรวมหน้า Dashboard แล้วค่ะ' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [botStatus, setBotStatus] = useState('idle');
  const [highlightId, setHighlightId] = useState('');
  const chatEndRef = useRef(null);
  const stopSpeakingRef = useRef(false);

  // ── Drag Logic States ──
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e) => {
    if (!isDragging) return;
    setPosition({ x: e.clientX - dragStartPos.current.x, y: e.clientY - dragStartPos.current.y });
  };
  const handlePointerUp = (e) => {
    setIsDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

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

      // ดึงมาเยอะหน่อยเพื่อมาทำ Filter
      const { data: deps } = await supabase.from('deposit_stats').select(`*, users (firstname, lastname)`).order('deposit_date', { ascending: false }).limit(100);
      setDeposits(deps || []);

      const { data: redems } = await supabase.from('redemptions').select(`*, users (firstname, lastname), rewards (name)`).order('created_at', { ascending: false }).limit(100);
      setRedemptions(redems || []);

    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchDashboardData(); }, []);
  useEffect(() => { if (chatEndRef.current && !isMinimized) chatEndRef.current.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages, isTyping, isMinimized]);

  // Apply Filters
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

  // ── AI Voice Logic ──
  const stopAiSpeech = () => {
    stopSpeakingRef.current = true;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setBotStatus('idle');
    setHighlightId(''); 
  };

  const speakSegments = async (segments) => {
    stopSpeakingRef.current = false;
    setIsSpeaking(true);
    setBotStatus('speaking');

    const getVoices = () => new Promise(resolve => {
      const v = window.speechSynthesis.getVoices();
      if (v.length > 0) return resolve(v);
      window.speechSynthesis.onvoiceschanged = () => resolve(window.speechSynthesis.getVoices());
    });
    const allVoices = await getVoices();
    const femaleVoice = allVoices.find(v => v.lang === 'th-TH' && /premwadee|kanya|female|woman|หญิง/i.test(v.name)) || allVoices.find(v => v.lang === 'th-TH');

    for (const segment of segments) {
      if (stopSpeakingRef.current) break;

      if (segment.highlightId) {
        setHighlightId(segment.highlightId);
        const el = document.getElementById(segment.highlightId);
        if (el && !isMinimized) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        setHighlightId('');
      }

      await new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(segment.text);
        utterance.lang = 'th-TH';
        utterance.rate = 1.0; 
        utterance.pitch = femaleVoice ? 1.0 : 1.4; 
        if (femaleVoice) utterance.voice = femaleVoice;
        
        utterance.onend = () => resolve();
        utterance.onerror = () => resolve();
        window.speechSynthesis.speak(utterance);
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
    setIsMinimized(false);
    stopAiSpeech();
    setPosition({ x: 0, y: 0 });
  };

  const startListening = () => {
    stopAiSpeech(); 
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { toast.error("เบราว์เซอร์ของคุณไม่รองรับการสั่งงานด้วยเสียง"); return; }
    const recognition = new SpeechRecognition();
    recognition.lang = 'th-TH';
    recognition.onstart = () => setIsListening(true);
    recognition.onresult = (event) => setChatInput(event.results[0][0].transcript);
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const handleSendChat = async () => {
    if (!chatInput.trim()) return;
    stopAiSpeech();
    
    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setChatInput('');
    setIsTyping(true);
    setBotStatus('thinking');

    try {
      const contextPayload = {
        totalUsers: stats.totalUsers,
        totalBalance: stats.totalBalance,
        totalWasteStock: stats.totalWasteStock,
        pendingRedemptions: stats.pendingRedemptions,
        recentDeposits: filteredDeposits.slice(0, 5).map(d => ({ date: d.deposit_date, name: d.users?.firstname, type: d.waste_type, kg: d.weight_kg })),
        recentRedemptions: filteredRedemptions.slice(0, 5).map(r => ({ date: r.created_at, name: r.users?.firstname, reward: r.rewards?.name, points: r.points_used }))
      };

      const availableHighlights = [
        { id: "card-users", description: "จำนวนสมาชิกทั้งหมด" },
        { id: "card-balance", description: "ยอดเงินคงเหลือ" },
        { id: "card-stock", description: "สต๊อกขยะรวม" },
        { id: "card-pending", description: "รายการรออนุมัติแลกรางวัล" },
        { id: "list-deposits", description: "ตารางการฝากขยะล่าสุด" },
        { id: "list-redemptions", description: "ตารางการแลกรางวัลล่าสุด" }
      ];

      const res = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: userMessage, 
          contextData: contextPayload,
          availableHighlights: availableHighlights,
          pageName: "หน้า Dashboard สรุปภาพรวมหลัก"
        })
      });

      const data = await res.json();
      
      if (data.speechSegments && data.speechSegments.length > 0) {
        const fullReply = data.speechSegments.map(s => s.text).join(' ');
        setChatMessages(prev => [...prev, { role: 'ai', text: fullReply }]);
        
        if (data.action && data.action.dashboardMonth) {
          setFilterMonth(data.action.dashboardMonth);
        }
        
        speakSegments(data.speechSegments);
      } else {
        throw new Error("No valid response from AI");
      }
    } catch (error) {
      toast.error('ระบบ AI ขัดข้อง โปรดลองใหม่อีกครั้ง');
      console.error(error);
    } finally {
      setIsTyping(false);
      setBotStatus(isSpeaking ? 'speaking' : 'idle');
    }
  };

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

        {/* Filters */}
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
        <StatCard id="card-users" highlightId={highlightId} title={t('totalMembersDash')} value={stats.totalUsers} unit={t('unitPerson')} icon={<Users />} color="blue" loading={loading} />
        <StatCard id="card-balance" highlightId={highlightId} title={t('totalBalance')} value={`฿${stats.totalBalance.toLocaleString()}`} unit="" icon={<Wallet />} color="green" loading={loading} />
        <StatCard id="card-stock" highlightId={highlightId} title={t('totalWasteStock')} value={stats.totalWasteStock} unit={t('unitKg')} icon={<Scale />} color="orange" loading={loading} />
        <StatCard id="card-pending" highlightId={highlightId} title={t('pendingRedemptions')} value={stats.pendingRedemptions} unit={t('unitItems')} icon={<AlertCircle />} color="red" loading={loading} />
      </div>

      {/* ── Recent Activity ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-10">
        <ActivityList id="list-deposits" highlightId={highlightId} title={t('recentDeposits')} data={filteredDeposits.slice(0, 5)} loading={loading} type="deposit" unit={t('unitKg')} emptyText={t('noRecentItems')} />
        <ActivityList id="list-redemptions" highlightId={highlightId} title={t('recentRedemptions')} data={filteredRedemptions.slice(0, 5)} loading={loading} type="redemption" unit={t('unitPoints')} emptyText={t('noRecentItems')} />
      </div>

      {/* ════════════════════════════════════════════
          🤖 AI Draggable & Minimizable Chatbot
      ════════════════════════════════════════════ */}
      {isChatOpen && (
        <div className="fixed z-50 flex flex-col items-end" style={{ bottom: '24px', right: '24px', transform: `translate(${position.x}px, ${position.y}px)` }}>
          <div className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-2xl w-[320px] sm:w-[380px] flex flex-col transition-all duration-300 ease-in-out overflow-hidden ${isMinimized ? 'h-[52px]' : 'h-[450px]'}`}>
            
            {/* Header (Draggable Area) */}
            <div onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} className="bg-slate-800 dark:bg-slate-950 p-3 flex items-center justify-between text-white shrink-0 cursor-grab active:cursor-grabbing select-none h-[52px]">
              <div className="flex items-center gap-2.5 pointer-events-none">
                <div className="relative">
                  <div className="bg-white/20 p-1.5 rounded-xl backdrop-blur-sm"><Bot className="w-4 h-4" /></div>
                  <span className={`absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-slate-800 ${botStatus === 'thinking' ? 'bg-amber-400 animate-pulse' : botStatus === 'speaking' ? 'bg-green-400 animate-ping' : 'bg-slate-400'}`}></span>
                </div>
                <div>
                  <h3 className="font-black text-sm leading-tight">EcoBot Analyst</h3>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {isSpeaking && <button onClick={stopAiSpeech} className="p-1.5 bg-red-500/20 text-red-300 hover:bg-red-500 hover:text-white rounded-lg transition-colors cursor-pointer" title="หยุดพูด"><Square className="w-3.5 h-3.5 fill-current pointer-events-none" /></button>}
                <button onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/20 rounded-lg transition-colors cursor-pointer" title={isMinimized ? "ขยาย" : "พับเก็บ"}>{isMinimized ? <Maximize2 className="w-3.5 h-3.5 pointer-events-none" /> : <Minus className="w-3.5 h-3.5 pointer-events-none" />}</button>
                <button onClick={closeChatWindow} className="p-1.5 hover:bg-red-500/80 rounded-lg transition-colors cursor-pointer" title="ปิดหน้าต่าง"><X className="w-3.5 h-3.5 pointer-events-none" /></button>
              </div>
            </div>

            {/* Messages Body */}
            <div className={`flex-1 flex flex-col min-h-0 ${isMinimized ? 'hidden' : 'block'}`}>
              <div className="flex-1 p-3 overflow-y-auto bg-slate-50 dark:bg-slate-900 space-y-3 transition-colors">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'ai' && (
                       <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mr-2 mt-1">
                         <MessageSquareText className="w-3.5 h-3.5" />
                       </div>
                    )}
                    <div className={`max-w-[80%] p-3 text-xs sm:text-sm whitespace-pre-wrap leading-relaxed ${
                      msg.role === 'user' 
                        ? 'bg-slate-800 dark:bg-emerald-600 text-white rounded-2xl rounded-br-sm font-medium' 
                        : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 rounded-2xl rounded-tl-sm shadow-sm'
                    }`}>
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 flex items-center justify-center shrink-0 mr-2 mt-1"><MessageSquareText className="w-3.5 h-3.5" /></div>
                    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-2.5 rounded-2xl rounded-tl-sm shadow-sm flex items-center gap-2">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></span><span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></span>
                      <span className="text-[10px] text-slate-400 font-medium ml-1">กำลังวิเคราะห์...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="p-2.5 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2 shrink-0 transition-colors">
                <button onClick={startListening} className={`p-2 rounded-full shrink-0 transition-all ${isListening ? 'bg-red-100 text-red-500 animate-pulse' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'}`} title="กดเพื่อพูด"><Mic className="w-4 h-4" /></button>
                <input type="text" value={chatInput} onChange={(e) => setChatInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendChat()} placeholder={isListening ? "กำลังฟังคำสั่ง..." : "พิมพ์คำสั่งเพื่อวิเคราะห์..."} className="flex-1 text-xs sm:text-sm bg-transparent outline-none px-1 font-medium text-slate-700 dark:text-slate-200 placeholder:text-slate-400" />
                <button onClick={handleSendChat} disabled={!chatInput.trim() || isTyping} className="p-2 bg-slate-800 dark:bg-emerald-600 text-white rounded-full shrink-0 hover:bg-slate-700 dark:hover:bg-emerald-500 disabled:opacity-40 transition-all">
                  {isTyping ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Button (โชว์ตอนปิดแชท) */}
      {!isChatOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <button onClick={() => setIsChatOpen(true)} className="bg-slate-800 dark:bg-emerald-600 hover:bg-slate-700 dark:hover:bg-emerald-500 text-white p-4 rounded-full shadow-2xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95 border-4 border-white dark:border-slate-800">
            <Bot className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
}

function StatCard({ id, highlightId, title, value, unit, icon, color, loading }) {
  const isHighlighted = highlightId === id;
  const colors = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-500/10 dark:text-blue-400 border-blue-500",
    green: "text-green-600 bg-green-50 dark:bg-green-500/10 dark:text-green-400 border-green-500",
    orange: "text-orange-600 bg-orange-50 dark:bg-orange-500/10 dark:text-orange-400 border-orange-500",
    red: "text-red-600 bg-red-50 dark:bg-red-500/10 dark:text-red-400 border-red-500",
  };
  return (
    <div id={id} className={`bg-white dark:bg-slate-900 border-l-4 border-y border-r border-slate-100 dark:border-slate-800 ${colors[color].split(' ').pop()} p-5 md:p-6 rounded-2xl md:rounded-[2rem] shadow-sm hover:shadow-md transition-all duration-500 ease-out ${isHighlighted ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.05] z-20 relative shadow-2xl bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}>
      <div className="flex items-center gap-4 sm:block">
        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center mb-0 sm:mb-4 shrink-0 ${colors[color].replace(/border-\w+-500/, '')}`}>{icon}</div>
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

function ActivityList({ id, highlightId, title, data, loading, type, unit, emptyText }) {
  const isHighlighted = highlightId === id;
  return (
    <div id={id} className={`bg-white dark:bg-slate-900 rounded-2xl md:rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col h-full transition-all duration-500 ease-out ${isHighlighted ? 'ring-4 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-[1.02] z-20 relative shadow-2xl' : ''}`}>
      <div className="p-5 md:p-6 border-b border-slate-100 dark:border-slate-800 font-black text-base md:text-lg flex items-center gap-2 text-slate-800 dark:text-white transition-colors">
        {type === 'deposit' ? <TrendingUp className="w-5 h-5 text-green-500" /> : <Gift className="w-5 h-5 text-orange-500" />}
        {title}
      </div>
      <div className="p-4 md:p-6 space-y-3 md:space-y-4">
        {loading ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />) : 
         data.length === 0 ? <p className="text-center py-10 text-muted-foreground font-medium text-sm">{emptyText}</p> :
         data.map((item) => (
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
                <p className="text-[9px] md:text-[10px] font-medium text-muted-foreground">{new Date(item.created_at || item.deposit_date).toLocaleDateString('th-TH')}</p>
             </div>
           </div>
         ))
        }
      </div>
    </div>
  );
}