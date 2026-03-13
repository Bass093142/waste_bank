"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { 
  MessageCircle, Send, User as UserIcon, Calendar, FilterX, Search, CheckCircle2, Clock, ChevronLeft 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminChat() {
  const [conversations, setConversations] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [isMobileView, setIsMobileView] = useState(false); // ควบคุมการแสดงผลบนมือถือ

  // --- States สำหรับตัวกรอง ---
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const messagesEndRef = useRef(null);

  const fetchConversations = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('chat_messages')
      .select('*, users(id, firstname, lastname, profile_image, username)')
      .order('created_at', { ascending: false });
    
    if (!data) {
      setLoading(false);
      return;
    }

    const convos = [];
    const userMap = new Set();
    
    data.forEach(msg => {
      if (!userMap.has(msg.user_id)) {
        userMap.add(msg.user_id);
        convos.push({
          user_id: msg.user_id,
          user: msg.users,
          latest_message: msg.message,
          latest_time: msg.created_at,
          latest_sender: msg.sender_type,
          unread_count: data.filter(m => m.user_id === msg.user_id && m.sender_type === 'user' && !m.is_read).length
        });
      }
    });
    
    setConversations(convos);
    setLoading(false);
  };

  useEffect(() => { fetchConversations(); }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const filteredConversations = useMemo(() => {
    return conversations.filter(c => {
      const date = new Date(c.latest_time);
      const cYear = date.getFullYear().toString();
      const cMonth = (date.getMonth() + 1).toString().padStart(2, '0');
      const cDay = date.getDate().toString().padStart(2, '0');

      if (filterYear && cYear !== filterYear) return false;
      if (filterMonth && cMonth !== filterMonth) return false;
      if (filterDay && cDay !== filterDay) return false;
      if (filterStatus === 'new' && c.unread_count === 0) return false;
      if (filterStatus === 'replied' && (c.latest_sender !== 'admin' || c.unread_count > 0)) return false;

      return true;
    });
  }, [conversations, filterYear, filterMonth, filterDay, filterStatus]);

  const handleSelectUser = async (user_id, user_data) => {
    setSelectedUser(user_data);
    setIsMobileView(true); // เมื่อเลือกคนแชท ให้สลับหน้าบนมือถือไปที่ห้องแชท
    await supabase.from('chat_messages').update({ is_read: true }).eq('user_id', user_id).eq('sender_type', 'user').eq('is_read', false);
    const { data } = await supabase.from('chat_messages').select('*').eq('user_id', user_id).order('created_at', { ascending: true });
    setMessages(data || []);
    fetchConversations(); 
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedUser) return;
    const newMsgObj = { user_id: selectedUser.id, sender_type: 'admin', message: newMessage.trim(), is_read: true };
    const { data } = await supabase.from('chat_messages').insert([newMsgObj]).select();
    if (data) {
      setMessages([...messages, data[0]]);
      setNewMessage('');
      fetchConversations();
    }
  };

  const availableYears = [...new Set(conversations.map(c => new Date(c.latest_time).getFullYear().toString()))].sort((a, b) => b - a);
  const thaiMonths = [
    { val: '01', label: 'มกราคม' }, { val: '02', label: 'กุมภาพันธ์' }, { val: '03', label: 'มีนาคม' },
    { val: '04', label: 'เมษายน' }, { val: '05', label: 'พฤษภาคม' }, { val: '06', label: 'มิถุนายน' },
    { val: '07', label: 'กรกฎาคม' }, { val: '08', label: 'สิงหาคม' }, { val: '09', label: 'กันยายน' },
    { val: '10', label: 'ตุลาคม' }, { val: '11', label: 'พฤศจิกายน' }, { val: '12', label: 'ธันวาคม' }
  ];

  return (
    <div className="flex h-[calc(100vh-140px)] md:h-[calc(100vh-120px)] bg-card rounded-2xl md:rounded-[2rem] border shadow-xl overflow-hidden relative">
      
      {/* --- ฝั่งซ้าย: รายชื่อคนแชท (จะถูกซ่อนบนมือถือเมื่อกำลังเปิดห้องแชท) --- */}
      <div className={`w-full md:w-80 lg:w-96 border-r flex flex-col bg-slate-50/50 ${isMobileView ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-6 bg-white border-b space-y-3">
          <h3 className="font-black text-lg md:text-xl">กล่องข้อความ</h3>
          
          {/* ตัวกรองสถานะ */}
          <div className="flex bg-muted p-1 rounded-lg gap-1">
            <button onClick={() => setFilterStatus('all')} className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-md transition-all ${filterStatus === 'all' ? 'bg-white shadow-sm text-primary' : 'text-muted-foreground'}`}>ทั้งหมด</button>
            <button onClick={() => setFilterStatus('new')} className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-md transition-all ${filterStatus === 'new' ? 'bg-red-50 text-red-600 shadow-sm' : 'text-muted-foreground'}`}>ใหม่</button>
            <button onClick={() => setFilterStatus('replied')} className={`flex-1 py-1.5 text-[10px] md:text-xs font-bold rounded-md transition-all ${filterStatus === 'replied' ? 'bg-green-50 text-green-600 shadow-sm' : 'text-muted-foreground'}`}>ตอบแล้ว</button>
          </div>

          {/* ตัวกรองวันที่ */}
          <div className="grid grid-cols-3 gap-1.5">
            <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="text-[9px] md:text-[10px] font-bold border rounded-md p-1 bg-white outline-none">
              <option value="">วันที่</option>
              {Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="text-[9px] md:text-[10px] font-bold border rounded-md p-1 bg-white outline-none">
              <option value="">เดือน</option>
              {thaiMonths.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>
            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="text-[9px] md:text-[10px] font-bold border rounded-md p-1 bg-white outline-none">
              <option value="">ปี</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {(filterYear || filterMonth || filterDay || filterStatus !== 'all') && (
            <button onClick={() => {setFilterYear(''); setFilterMonth(''); setFilterDay(''); setFilterStatus('all');}} className="w-full py-1 text-[9px] font-bold text-red-500 flex items-center justify-center gap-1 hover:bg-red-50 rounded-md transition-all">
              <FilterX className="w-3 h-3" /> ล้างตัวกรอง
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 md:p-4 space-y-2 scrollbar-hide">
          {loading ? (
            <div className="space-y-4 p-4">
              {[1,2,3].map(i => <div key={i} className="h-16 bg-white animate-pulse rounded-xl" />)}
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="text-center py-10 opacity-30">
              <Search className="w-10 h-10 mx-auto mb-2" />
              <p className="text-xs font-bold">ไม่พบข้อความ</p>
            </div>
          ) : (
            filteredConversations.map((c) => (
              <div 
                key={c.user_id} 
                onClick={() => handleSelectUser(c.user_id, c.user)}
                className={`flex items-center gap-3 p-3 md:p-4 rounded-xl md:rounded-2xl cursor-pointer transition-all border ${selectedUser?.id === c.user_id ? 'bg-primary/10 border-primary/30 shadow-sm' : 'bg-white hover:bg-slate-100 border-transparent'}`}
              >
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-muted overflow-hidden shrink-0 border relative">
                  {(c.user?.profile_image && !c.user.profile_image.includes('default.png')) ? (
                    <img src={c.user.profile_image} className="w-full h-full object-cover" />
                  ) : (<div className="w-full h-full flex items-center justify-center text-muted-foreground bg-slate-200"><UserIcon className="w-6 h-6" /></div>)}
                  {c.unread_count > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-[10px] text-white font-black border-2 border-white animate-pulse">{c.unread_count}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <h4 className="font-black text-xs md:text-sm text-slate-800 truncate">{c.user?.firstname || c.user?.username || 'สมาชิก'}</h4>
                    <span className="text-[9px] font-bold text-slate-400">{new Date(c.latest_time).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[10px] md:text-xs truncate flex-1 ${c.unread_count > 0 ? 'font-black text-slate-800' : 'font-medium text-slate-500'}`}>{c.latest_message}</p>
                    {c.latest_sender === 'admin' && c.unread_count === 0 && <CheckCircle2 className="w-3 h-3 text-green-500 shrink-0" />}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* --- ฝั่งขวา: ห้องแชท --- */}
      <div className={`flex-1 flex flex-col bg-white ${isMobileView ? 'flex' : 'hidden md:flex'}`}>
        {selectedUser ? (
          <>
            {/* Chat Header */}
            <div className="p-3 md:p-6 border-b bg-white/80 backdrop-blur-md flex items-center justify-between shrink-0 z-10">
              <div className="flex items-center gap-3 md:gap-4">
                {/* ปุ่มย้อนกลับบนมือถือ */}
                <button onClick={() => setIsMobileView(false)} className="p-2 md:hidden hover:bg-slate-100 rounded-full">
                  <ChevronLeft className="w-6 h-6 text-slate-600" />
                </button>
                <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden border shrink-0">
                  {(selectedUser.profile_image && !selectedUser.profile_image.includes('default.png')) ? (
                    <img src={selectedUser.profile_image} className="w-full h-full object-cover" />
                  ) : (<div className="w-full h-full flex items-center justify-center bg-slate-200"><UserIcon className="text-muted-foreground w-5 h-5" /></div>)}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-sm md:text-lg leading-tight truncate">{selectedUser.firstname || selectedUser.username}</h3>
                  <p className="text-[10px] md:text-xs font-bold text-green-500 flex items-center gap-1"><Clock className="w-3 h-3" /> ออนไลน์</p>
                </div>
              </div>
            </div>

            {/* Chat Messages - เพิ่มเทคนิค Break Words ให้ข้อความไม่ล้น */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/50 scrollbar-hide">
              {messages.map((msg, idx) => {
                const isAdmin = msg.sender_type === 'admin';
                return (
                  <div key={idx} className={`flex flex-col ${isAdmin ? 'items-end' : 'items-start'}`}>
                    <div className={`max-w-[85%] md:max-w-[75%] p-3 md:p-4 rounded-2xl shadow-sm ${isAdmin ? 'bg-primary text-white rounded-tr-sm' : 'bg-white border rounded-tl-sm text-slate-800'}`}>
                      {/* ส่วนสำคัญ: break-words whitespace-pre-wrap ป้องกันข้อความตกหล่นหรือล้น */}
                      <p className="text-xs md:text-sm font-medium break-words whitespace-pre-wrap leading-relaxed">
                        {msg.message}
                      </p>
                    </div>
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 mt-1 px-1">
                      {new Date(msg.created_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input */}
            <div className="p-3 md:p-4 border-t bg-white">
              <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-3">
                <input 
                  type="text" 
                  placeholder="พิมพ์ข้อความ..." 
                  value={newMessage}
                  onChange={e => setNewMessage(e.target.value)}
                  className="flex-1 bg-muted/50 border rounded-full px-4 md:px-6 py-2 md:py-3 text-xs md:text-sm font-bold outline-none focus:ring-2 focus:ring-primary/30 transition-all"
                />
                <button type="submit" disabled={!newMessage.trim()} className="w-10 h-10 md:w-12 md:h-12 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md shrink-0">
                  <Send className="w-4 h-4 md:w-5 md:h-5 ml-1" />
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-slate-50/50 p-6 text-center">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full flex items-center justify-center shadow-inner mb-4">
              <MessageCircle className="w-10 h-10 md:w-12 md:h-12 opacity-20" />
            </div>
            <p className="font-black text-base md:text-lg">เลือกห้องแชทเพื่อเริ่มสนทนา</p>
            <p className="text-[10px] md:text-xs font-medium">ใช้ตัวกรองด้านซ้ายเพื่อค้นหาแชทที่ต้องการ</p>
          </div>
        )}
      </div>
    </div>
  );
}