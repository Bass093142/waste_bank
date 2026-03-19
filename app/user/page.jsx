"use client";
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { Pagination } from '@/app/components/ui/Pagination';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/app/contexts/LanguageContext'; 
import { useTheme } from 'next-themes'; // 🟢 นำเข้าระบบเปลี่ยนธีม
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell
} from 'recharts';
import { 
  Trophy, Leaf, Gift, History, Search, ArrowRight, Cloud, Scale, Star, Package, MessageCircle, X, Send,
  Edit2, Camera, User as UserIcon, Phone, QrCode, Download, RefreshCw, Sun, Moon, Languages, LogOut
} from 'lucide-react';

export default function UserDashboard() {
  const router = useRouter();
  const { t, lang, toggleLang } = useLanguage(); 
  const { theme, setTheme } = useTheme(); 
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  const [stats, setStats] = useState({ totalKg: 0, totalCo2: 0, rank: 0, totalMembers: 0 });
  const [topUsers, setTopUsers] = useState([]);
  const [co2ChartData, setCo2ChartData] = useState([]);

  const [rewards, setRewards] = useState([]);
  const [rPage, setRPage] = useState(1);
  const [rTotal, setRTotal] = useState(0);
  const rLimit = 6;
  const [qReward, setQReward] = useState('');
  const [fPoint, setFPoint] = useState('');

  const [history, setHistory] = useState([]);
  const [hPage, setHPage] = useState(1);
  const [hTotal, setHTotal] = useState(0);
  const hLimit = 5;

  const [selectedReward, setSelectedReward] = useState(null);
  const [isRedeeming, setIsRedeeming] = useState(false);

  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({ firstname: '', lastname: '', phone: '', profile_image: '' });
  const [newlyUploadedImageUrl, setNewlyUploadedImageUrl] = useState(null); 

  const [isQrOpen, setIsQrOpen] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [qrLoading, setQrLoading] = useState(false);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [newChatMessage, setNewChatMessage] = useState('');
  const [unreadAdminMessages, setUnreadAdminMessages] = useState(0);
  const chatEndRef = useRef(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [rPage, hPage, qReward, fPoint]);

  useEffect(() => {
    if (isChatOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isChatOpen]);

  useEffect(() => {
    if (currentUser && isChatOpen) fetchChatMessages();
  }, [isChatOpen, currentUser]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const userDataStr = localStorage.getItem('waste_bank_user');
      if (!userDataStr) { router.push('/'); return; }
      const localUser = JSON.parse(userDataStr);
      if (localUser.role !== 'user') { router.push('/admin'); return; }

      const { data: user } = await supabase.from('users').select('*').eq('id', localUser.id).single();
      if (!user || user.status === 'banned') { localStorage.removeItem('waste_bank_user'); router.push('/'); return; }
      setCurrentUser(user);

      const { count: unreadCount } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id).eq('sender_type', 'admin').eq('is_read', false);
      setUnreadAdminMessages(unreadCount || 0);

      const { data: deposits } = await supabase.from('deposit_stats').select('weight_kg, created_at, waste_type').eq('user_id', user.id);
      const { data: wasteTypes } = await supabase.from('waste_types').select('name, co2_factor');
      
      let totalKg = 0; let totalCo2 = 0; const chartMap = {};

      if (deposits && wasteTypes) {
        deposits.forEach(dep => {
          totalKg += Number(dep.weight_kg);
          const typeInfo = wasteTypes.find(t => t.name === dep.waste_type);
          const co2 = typeInfo ? Number(dep.weight_kg) * Number(typeInfo.co2_factor) : 0;
          totalCo2 += co2;
          const d = new Date(dep.created_at);
          const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
          chartMap[monthKey] = (chartMap[monthKey] || 0) + co2;
        });
      }

      const last5Months = Array.from({length: 5}, (_, i) => {
        const d = new Date(); d.setMonth(d.getMonth() - i);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      }).reverse();

      setCo2ChartData(last5Months.map(m => ({
        label: new Date(m + '-01').toLocaleDateString('th-TH', { month: 'short' }),
        co2: Number((chartMap[m] || 0).toFixed(2))
      })));

      const { data: allDeposits } = await supabase.from('deposit_stats').select('user_id, weight_kg');
      const { count: totalMembers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('role', 'user');
      
      const userTotals = {};
      if (allDeposits) { allDeposits.forEach(d => { userTotals[d.user_id] = (userTotals[d.user_id] || 0) + Number(d.weight_kg); }); }
      
      const sortedUsers = Object.entries(userTotals).sort((a, b) => b[1] - a[1]);
      const myRankIndex = sortedUsers.findIndex(u => u[0] === user.id.toString());
      const rank = myRankIndex === -1 ? totalMembers : myRankIndex + 1;
      
      setStats({ totalKg, totalCo2, rank, totalMembers: totalMembers || 0 });

      const top5Ids = sortedUsers.slice(0, 5).map(u => u[0]);
      if (top5Ids.length > 0) {
        const { data: topUserData } = await supabase.from('users').select('id, firstname, lastname, username, profile_image').in('id', top5Ids);
        const top5Formatted = top5Ids.map(id => {
          const u = topUserData?.find(x => x.id.toString() === id);
          return { ...u, total_weight: userTotals[id] };
        }).filter(u => u.firstname);
        setTopUsers(top5Formatted);
      }

      let rQuery = supabase.from('rewards').select('*', { count: 'exact' }).eq('active', true).gt('stock', 0);
      if (qReward) rQuery = rQuery.ilike('name', `%${qReward}%`);
      if (fPoint) {
        if (fPoint === 'can_redeem') rQuery = rQuery.lte('points_required', user.points);
        if (fPoint === 'under_500') rQuery = rQuery.lt('points_required', 500);
        if (fPoint === '500_1000') rQuery = rQuery.gte('points_required', 500).lte('points_required', 1000);
        if (fPoint === 'over_1000') rQuery = rQuery.gt('points_required', 1000);
      }
      rQuery = rQuery.order('points_required', { ascending: true }).range((rPage - 1) * rLimit, rPage * rLimit - 1);
      
      const { data: rwData, count: rwCount } = await rQuery;
      setRewards(rwData || []); setRTotal(rwCount || 0);

      const { data: hData, count: hCount } = await supabase
        .from('redemptions').select('*, rewards(name)', { count: 'exact' })
        .eq('user_id', user.id).order('created_at', { ascending: false }).range((hPage - 1) * hLimit, hPage * hLimit - 1);
      setHistory(hData || []); setHTotal(hCount || 0);

    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const getFileNameFromUrl = (url) => (url && url !== 'null' && !url.includes('default.png') ? url.split('/').pop() : null);

  const handleOpenEditProfile = () => {
    setEditFormData({
      firstname: currentUser.firstname || '',
      lastname: currentUser.lastname || '',
      phone: currentUser.phone || '',
      profile_image: currentUser.profile_image || ''
    });
    setNewlyUploadedImageUrl(null);
    setIsEditProfileOpen(true);
  };

  const handleProfileImageUpload = async (e) => {
    try {
      setUploadingProfile(true);
      const file = e.target.files[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('profile_images').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('profile_images').getPublicUrl(fileName);
      
      if (newlyUploadedImageUrl) {
        const tempName = getFileNameFromUrl(newlyUploadedImageUrl);
        if (tempName) await supabase.storage.from('profile_images').remove([tempName]);
      }

      setNewlyUploadedImageUrl(data.publicUrl);
      setEditFormData({ ...editFormData, profile_image: data.publicUrl });
    } catch (error) {
      alert('อัปโหลดรูปล้มเหลว: ' + error.message);
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setUploadingProfile(true);
    try {
      const { error } = await supabase.from('users').update({
        firstname: editFormData.firstname,
        lastname: editFormData.lastname,
        phone: editFormData.phone,
        profile_image: editFormData.profile_image
      }).eq('id', currentUser.id);

      if (error) throw error;

      if (newlyUploadedImageUrl && currentUser.profile_image && !currentUser.profile_image.includes('default.png')) {
        const oldFileName = getFileNameFromUrl(currentUser.profile_image);
        if (oldFileName) await supabase.storage.from('profile_images').remove([oldFileName]);
      }

      const updatedUser = { ...currentUser, ...editFormData };
      setCurrentUser(updatedUser);
      localStorage.setItem('waste_bank_user', JSON.stringify(updatedUser));
      
      setIsEditProfileOpen(false);
      setNewlyUploadedImageUrl(null);
    } catch (error) {
      alert('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleCancelEditProfile = async () => {
    if (newlyUploadedImageUrl) {
      const tempName = getFileNameFromUrl(newlyUploadedImageUrl);
      if (tempName) await supabase.storage.from('profile_images').remove([tempName]);
    }
    setNewlyUploadedImageUrl(null);
    setIsEditProfileOpen(false);
  };

  const generateQrCode = async (user) => {
    setQrLoading(true);
    try {
      const QRCode = (await import('qrcode')).default;
      const payload = JSON.stringify({
        uid: user.id,
        name: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
        ts: Date.now(),
      });
      const url = await QRCode.toDataURL(payload, {
        width: 260,
        margin: 2,
        color: { dark: '#166534', light: '#ffffff' },
      });
      setQrDataUrl(url);
    } catch (err) {
      alert('สร้าง QR ไม่สำเร็จ: ' + err.message);
    } finally {
      setQrLoading(false);
    }
  };

  const handleOpenQr = async () => {
    setIsQrOpen(true);
    if (currentUser) await generateQrCode(currentUser);
  };

  const handleRefreshQr = async () => {
    if (currentUser) await generateQrCode(currentUser);
  };

  const handleDownloadQr = () => {
    if (!qrDataUrl) return;
    const a = document.createElement('a');
    a.href = qrDataUrl;
    a.download = `waste-bank-qr-${currentUser?.id}.png`;
    a.click();
  };

  const fetchChatMessages = async () => {
    if (!currentUser) return;
    const { data } = await supabase.from('chat_messages').select('*').eq('user_id', currentUser.id).order('created_at', { ascending: true });
    setChatMessages(data || []);
  };

  const handleOpenChat = async () => {
    setIsChatOpen(true);
    setUnreadAdminMessages(0);
    if (currentUser) {
      await supabase.from('chat_messages').update({ is_read: true }).eq('user_id', currentUser.id).eq('sender_type', 'admin').eq('is_read', false);
      fetchChatMessages();
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newChatMessage.trim() || !currentUser) return;
    const newMsgObj = { user_id: currentUser.id, sender_type: 'user', message: newChatMessage.trim(), is_read: false };
    const { data } = await supabase.from('chat_messages').insert([newMsgObj]).select();
    if (data) {
      setChatMessages([...chatMessages, data[0]]);
      setNewChatMessage('');
    }
  };

  // 🟢 ฟังก์ชันออกจากระบบ
  const handleLogout = () => {
    localStorage.removeItem('waste_bank_user');
    router.push('/');
  };

  const getLevelInfo = (kg) => {
    if (kg >= 100) return { name: 'ระดับสูงสุด (Legend)', icon: '👑', color: 'bg-yellow-500', bg: 'bg-yellow-100 text-yellow-700', target: 100, progress: 100 };
    if (kg >= 50) return { name: 'ระดับเชี่ยวชาญ (Expert)', icon: '💎', color: 'bg-emerald-500', bg: 'bg-emerald-100 text-emerald-700', target: 100, progress: (kg/100)*100 };
    if (kg >= 10) return { name: 'ระดับมือโปร (Pro)', icon: '⭐', color: 'bg-blue-500', bg: 'bg-blue-100 text-blue-700', target: 50, progress: (kg/50)*100 };
    return { name: 'ผู้เริ่มต้น', icon: '🌱', color: 'bg-slate-500', bg: 'bg-slate-100 text-slate-700', target: 10, progress: (kg/10)*100 };
  };
  const levelInfo = getLevelInfo(stats.totalKg);

  const confirmRedeem = async () => {
    if (!selectedReward || !currentUser) return;
    setIsRedeeming(true);
    try {
      if (currentUser.points < selectedReward.points_required) throw new Error(t('notEnoughPoints'));
      const { data: currentReward } = await supabase.from('rewards').select('stock').eq('id', selectedReward.id).single();
      if (!currentReward || currentReward.stock <= 0) throw new Error('ของรางวัลหมดแล้ว');

      const newPoints = currentUser.points - selectedReward.points_required;
      await supabase.from('users').update({ points: newPoints }).eq('id', currentUser.id);
      await supabase.from('rewards').update({ stock: currentReward.stock - 1 }).eq('id', selectedReward.id);
      await supabase.from('redemptions').insert([{ user_id: currentUser.id, reward_id: selectedReward.id, points_used: selectedReward.points_required, status: 'pending' }]);

      alert('แลกรางวัลสำเร็จ! กรุณาติดต่อรับของรางวัลที่ธนาคารขยะ');
      setSelectedReward(null);
      fetchDashboardData(); 
    } catch (error) { alert(error.message); } finally { setIsRedeeming(false); }
  };

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-800 text-white text-xs font-bold p-3 rounded-xl shadow-xl border border-slate-700">
          <p className="mb-1 text-slate-400">{label}</p>
          <p className="text-sky-400 text-sm">ลด CO2: {payload[0].value} kg</p>
        </div>
      );
    }
    return null;
  };

  if (loading && !currentUser) return <div className="p-10 text-center font-bold animate-pulse text-primary min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-[#0a1a0f] dark:via-[#0d2015] dark:to-[#071510]">กำลังโหลดข้อมูล...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-[#0a1a0f] dark:via-[#0d2015] dark:to-[#071510] transition-colors duration-500">
      
      {/* 🟢 Navbar ด้านบนสุด (Responsive) */}
      <nav className="sticky top-0 z-40 w-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl border-b border-white/50 dark:border-slate-800 px-4 py-3 flex items-center justify-between transition-colors duration-500 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-green-500 dark:bg-green-400 flex items-center justify-center shrink-0">
            <Leaf className="w-4 h-4 text-white dark:text-black" />
          </div>
          <span className="font-black text-slate-800 dark:text-white text-lg hidden sm:block tracking-tight">{t('wasteBank')}</span>
        </div>
        <div className="flex items-center gap-1 sm:gap-3">
          {mounted && (
            <button
              onClick={toggleLang}
              className="p-2 rounded-full text-slate-600 dark:text-green-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors flex items-center gap-1 font-bold text-sm"
              title="Switch Language"
            >
              <Languages className="w-5 h-5" />
              <span className="hidden sm:inline">{lang === 'th' ? 'EN' : 'TH'}</span>
            </button>
          )}
          {mounted && (
            <button
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-full text-slate-600 dark:text-green-300 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
          <button 
            onClick={handleLogout} 
            className="flex items-center gap-2 px-3 py-2 sm:px-4 sm:py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors text-sm font-bold ml-1 sm:ml-2"
          >
            <LogOut className="w-4 h-4 shrink-0" /> <span className="hidden sm:inline">{t('logout')}</span>
          </button>
        </div>
      </nav>

      {/* 🟢 พื้นที่เนื้อหาหลัก */}
      <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-6 pb-24 relative">
        
        {/* การ์ดต้อนรับ & เลเวล */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="bg-gradient-to-br from-emerald-600 via-teal-500 to-green-500 rounded-[2rem] p-6 md:p-8 text-white shadow-xl relative overflow-hidden border border-white/10 dark:border-white/5">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
          
          <div className="flex flex-col md:flex-row gap-6 items-center md:items-start relative z-10">
            <div className="relative group">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-white/20 p-2 shrink-0 backdrop-blur-sm border border-white/20 shadow-2xl overflow-hidden">
                <img src={(currentUser?.profile_image && !currentUser.profile_image.includes('default.png')) ? currentUser.profile_image : '/default-avatar.png'} alt="Profile" className="w-full h-full object-cover rounded-full" />
              </div>
              <button onClick={handleOpenEditProfile} className="absolute bottom-0 right-0 w-8 h-8 md:w-10 md:h-10 bg-white text-emerald-600 rounded-full flex items-center justify-center shadow-lg border border-emerald-100 hover:bg-emerald-50 transition-colors group-hover:scale-110">
                <Edit2 className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl md:text-4xl font-black mb-2 tracking-tight drop-shadow-md">{t('helloUser')} {currentUser?.firstname} {currentUser?.lastname} 👋</h1>
              <p className="opacity-90 font-medium text-sm md:text-base flex items-center justify-center md:justify-start gap-2 bg-black/10 w-fit mx-auto md:mx-0 px-4 py-1.5 rounded-full backdrop-blur-sm">
                <Star className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                {t('accumulatedPoints')} <span className="font-black text-lg text-yellow-300">{currentUser?.points?.toLocaleString()}</span>
              </p>
              
              <button
                onClick={handleOpenQr}
                className="mt-3 inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white rounded-2xl font-black text-sm transition-all active:scale-95 shadow-md"
              >
                <QrCode className="w-4 h-4" /> {t('showQrCode')}
              </button>
              
              <div className="mt-6 bg-black/20 p-5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
                <div className="flex justify-between items-end mb-3">
                  <div>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] uppercase tracking-widest font-black shadow-sm ${levelInfo.bg}`}>
                      {levelInfo.icon} {levelInfo.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{t('nextGoal')}</span>
                    <p className="font-black text-sm md:text-base">{stats.totalKg.toLocaleString()} <span className="text-xs font-medium text-slate-300">/ {levelInfo.target} {t('unitKg')}</span></p>
                  </div>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-4 overflow-hidden shadow-inner border border-white/5">
                  <motion.div 
                    initial={{ width: 0 }} animate={{ width: `${levelInfo.progress}%` }} transition={{ duration: 1.2, ease: "easeOut" }}
                    className={`h-full rounded-full ${levelInfo.color} relative overflow-hidden`}
                  >
                    <div className="absolute inset-0 bg-white/20 w-full h-full animate-[shimmer_2s_infinite]" />
                  </motion.div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* คอลัมน์ซ้าย (ใหญ่) */}
          <div className="lg:col-span-2 space-y-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-800 p-6 md:p-8 shadow-sm">
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white"><Cloud className="text-sky-500 w-6 h-6" /> {t('ecoStats')}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('co2Reduced')} <span className="text-sky-600 dark:text-sky-400 font-black">{stats.totalCo2.toFixed(2)} kgCO2e</span></p>
                </div>
                <div className="w-14 h-14 bg-sky-50 dark:bg-sky-500/10 text-sky-500 rounded-2xl flex items-center justify-center shadow-inner"><Leaf className="w-7 h-7" /></div>
              </div>
              
              <div className="h-[250px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={co2ChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.3} />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12, fontWeight: 600 }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                    <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: '#f1f5f9', opacity: 0.1 }} />
                    <Bar dataKey="co2" radius={[6, 6, 0, 0]} animationDuration={1500}>
                      {co2ChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === co2ChartData.length - 1 ? '#0ea5e9' : '#7dd3fc'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            {/* ร้านค้าของรางวัล */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-800 p-6 md:p-8 shadow-sm flex flex-col h-[650px]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 shrink-0">
                <div>
                  <h3 className="text-xl font-black flex items-center gap-2 text-slate-800 dark:text-white"><Gift className="text-orange-500 w-6 h-6" /> {t('redeem')}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-1">{t('chooseRewards')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                  <div className="relative flex-1 sm:w-56">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input type="text" placeholder={t('searchRewards')} value={qReward} onChange={e => {setQReward(e.target.value); setRPage(1);}} className="w-full pl-9 pr-3 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all" />
                  </div>
                  <select value={fPoint} onChange={e => {setFPoint(e.target.value); setRPage(1);}} className="py-2.5 px-3 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 focus:bg-white dark:focus:bg-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer">
                    <option value="">{t('allPoints')}</option>
                    <option value="can_redeem">{t('canRedeemNow')}</option>
                    <option value="under_500">{t('under500')}</option>
                    <option value="500_1000">{t('from500to1000')}</option>
                    <option value="over_1000">{t('over1000')}</option>
                  </select>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto scrollbar-hide px-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {rewards.length === 0 ? (
                    <div className="col-span-full text-center py-16 opacity-40"><Package className="w-16 h-16 mx-auto mb-3 text-slate-400" /><p className="font-bold text-slate-500">{t('noRewards')}</p></div>
                  ) : (
                    rewards.map(reward => {
                      const canRedeem = currentUser?.points >= reward.points_required;
                      return (
                        <motion.div whileHover={{ y: -5 }} key={reward.id} className="border border-slate-100 dark:border-slate-800 rounded-[1.5rem] p-4 flex flex-col shadow-sm hover:shadow-xl hover:border-primary/20 transition-all group bg-white dark:bg-slate-800/50 relative overflow-hidden">
                          <div className="aspect-square bg-slate-50 dark:bg-slate-800 rounded-xl mb-4 overflow-hidden relative">
                            {reward.image ? <img src={reward.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" /> : <div className="w-full h-full flex items-center justify-center"><Gift className="text-slate-300 dark:text-slate-600 w-12 h-12" /></div>}
                            {!canRedeem && <div className="absolute inset-0 bg-white/40 dark:bg-slate-900/40 backdrop-blur-[2px]" />}
                          </div>
                          <h4 className="font-black text-sm truncate mb-1 text-slate-800 dark:text-white">{reward.name}</h4>
                          <div className="flex justify-between items-center mt-auto pt-3 border-t border-slate-50 dark:border-slate-700/50">
                            <span className={`text-sm font-black ${canRedeem ? 'text-primary' : 'text-slate-400'}`}>{reward.points_required.toLocaleString()} {t('unitPoints')}</span>
                            <button 
                              onClick={() => setSelectedReward(reward)}
                              disabled={!canRedeem} 
                              className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${canRedeem ? 'bg-primary text-white hover:bg-primary/90 shadow-[0_4px_12px_rgba(var(--primary-rgb),0.3)] active:scale-95' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed'}`}
                            >
                              {canRedeem ? t('redeemNowBtn') : t('notEnoughPoints')}
                            </button>
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </div>
              </div>
              
              {rTotal > rLimit && (
                <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 shrink-0">
                  <Pagination currentPage={rPage} totalPages={Math.ceil(rTotal / rLimit)} onPageChange={setRPage} />
                </div>
              )}
            </motion.div>
          </div>

          {/* คอลัมน์ขวา (เล็ก) */}
          <div className="space-y-6">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-800 p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-black flex items-center gap-2 mb-6 text-slate-800 dark:text-white"><Trophy className="text-yellow-500 w-5 h-5" /> {t('leaderboardBoard')}</h3>
              
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white mb-6 relative overflow-hidden shadow-xl border border-slate-700">
                <Trophy className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{t('yourRank')}</p>
                <div className="flex items-end gap-2">
                  <h2 className="text-5xl font-black text-yellow-400 drop-shadow-md">#{stats.rank}</h2>
                  <span className="text-sm font-medium text-slate-400 mb-1">/ {stats.totalMembers}</span>
                </div>
                <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-300"><Scale className="w-3.5 h-3.5 inline mr-1 opacity-70" /> {t('totalWeight')}</p>
                  <p className="text-sm font-black text-green-400">{stats.totalKg.toLocaleString()} {t('unitKg')}</p>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 px-1">{t('top5')}</h4>
                {topUsers.map((user, idx) => (
                  <div key={user.id} className="flex items-center gap-3 p-3 bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700/50 hover:bg-slate-50 dark:hover:bg-slate-800 hover:shadow-md transition-all">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm text-white shrink-0 shadow-inner ${idx === 0 ? 'bg-gradient-to-br from-yellow-300 to-yellow-500 shadow-yellow-500/30' : idx === 1 ? 'bg-gradient-to-br from-slate-300 to-slate-400' : idx === 2 ? 'bg-gradient-to-br from-amber-500 to-amber-700' : 'bg-slate-800 dark:bg-slate-700'}`}>
                      #{idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black truncate text-slate-800 dark:text-white">{user.firstname} {user.lastname?.charAt(0)}.</p>
                    </div>
                    <div className="text-right bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded-lg border border-slate-100 dark:border-slate-700">
                      <p className="text-xs font-black text-green-600 dark:text-green-400">{user.total_weight.toLocaleString()} <span className="text-[10px] text-slate-400 font-bold">{t('unitKg')}</span></p>
                    </div>
                  </div>
                ))}
              </div>
              
              <Link href="/user/leaderboard">
                <button className="w-full mt-6 py-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-primary/30 hover:bg-primary/5 text-slate-600 dark:text-slate-300 hover:text-primary dark:hover:text-primary font-black text-sm rounded-xl transition-all flex items-center justify-center gap-2 group">
                  {t('seeAllRanks')} <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.4 }} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-[2rem] border border-white/50 dark:border-slate-800 p-6 md:p-8 shadow-sm">
              <h3 className="text-lg font-black flex items-center gap-2 mb-6 text-slate-800 dark:text-white"><History className="text-primary w-5 h-5" /> {t('history')}</h3>
              <div className="space-y-4 mb-6">
                {history.length === 0 ? (
                  <p className="text-center py-8 text-sm font-bold text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl">{t('noHistory')}</p>
                ) : (
                  history.map(h => (
                    <div key={h.id} className="flex justify-between items-center p-3 bg-white dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700 transition-colors">
                      <div className="min-w-0 pr-2">
                        <p className="text-sm font-black text-slate-800 dark:text-white truncate">{h.rewards?.name}</p>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5">{new Date(h.created_at).toLocaleDateString('th-TH')} • {new Date(h.created_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-red-500 dark:text-red-400 mb-1">-{h.points_used}</p>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-md uppercase tracking-wider ${h.status === 'completed' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : h.status === 'cancelled' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}`}>
                          {h.status === 'completed' ? t('received') : h.status === 'cancelled' ? t('cancelled') : t('pendingStatus')}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {hTotal > hLimit && (
                <div className="pt-2">
                  <Pagination currentPage={hPage} totalPages={Math.ceil(hTotal / hLimit)} onPageChange={setHPage} />
                </div>
              )}
            </motion.div>

          </div>
        </div>

        {/* 🟢 Modal QR Code */}
        <AnimatePresence>
          {isQrOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm shadow-2xl overflow-hidden border dark:border-slate-800"
              >
                <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-5 text-white flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-lg flex items-center gap-2"><QrCode className="w-5 h-5" /> {t('qrTitle')}</h3>
                    <p className="text-green-100 text-xs mt-0.5 font-medium">{t('qrSubtitle')}</p>
                  </div>
                  <button onClick={() => setIsQrOpen(false)} className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="px-6 pt-5 pb-3 flex items-center gap-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 overflow-hidden flex items-center justify-center shrink-0">
                    {(currentUser?.profile_image && !currentUser.profile_image.includes('default.png'))
                      ? <img src={currentUser.profile_image} className="w-full h-full object-cover" />
                      : <UserIcon className="w-6 h-6 text-green-600 dark:text-green-400" />
                    }
                  </div>
                  <div className="min-w-0">
                    <p className="font-black text-slate-800 dark:text-white truncate">{currentUser?.firstname} {currentUser?.lastname}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">@{currentUser?.username}</p>
                  </div>
                  <div className="ml-auto text-right shrink-0">
                    <p className="text-xs text-slate-400 font-bold">{t('points')}</p>
                    <p className="font-black text-yellow-500 text-lg">{currentUser?.points?.toLocaleString()}</p>
                  </div>
                </div>

                <div className="px-6 py-5 flex flex-col items-center">
                  {qrLoading ? (
                    <div className="w-52 h-52 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border-4 border-green-100 dark:border-slate-700">
                      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : qrDataUrl ? (
                    <div className="p-3 border-4 border-green-100 dark:border-slate-700 rounded-2xl bg-white shadow-inner">
                      <img src={qrDataUrl} alt="QR Code" className="w-52 h-52 rounded-lg" />
                    </div>
                  ) : (
                    <div className="w-52 h-52 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center border-4 border-slate-100 dark:border-slate-700">
                      <p className="text-slate-400 text-sm font-bold">Error generating QR</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 font-medium text-center mt-3 leading-relaxed whitespace-pre-line">
                    {t('qrInstruction')}
                  </p>
                </div>

                <div className="px-6 pb-6 grid grid-cols-2 gap-3">
                  <button onClick={handleRefreshQr} disabled={qrLoading}
                    className="flex items-center justify-center gap-2 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-95 disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${qrLoading ? 'animate-spin' : ''}`} /> {t('refresh')}
                  </button>
                  <button onClick={handleDownloadQr} disabled={!qrDataUrl || qrLoading}
                    className="flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-2xl font-black text-sm hover:bg-green-700 transition-all active:scale-95 shadow-lg disabled:opacity-50">
                    <Download className="w-4 h-4" /> {t('saveImage')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 🟢 Modal แก้ไขโปรไฟล์ */}
        <AnimatePresence>
          {isEditProfileOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-md p-6 md:p-8 shadow-2xl relative overflow-hidden border dark:border-slate-800">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white">{t('editProfile')}</h3>
                  <button onClick={handleCancelEditProfile} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSaveProfile} className="space-y-5">
                  <div className="flex flex-col items-center justify-center mb-6">
                    <label className="relative w-28 h-28 rounded-full border-4 border-dashed border-primary/20 cursor-pointer hover:border-primary/50 transition-all overflow-hidden group">
                      {(editFormData.profile_image && !editFormData.profile_image.includes('default.png')) ? (
                        <img src={editFormData.profile_image} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800 text-slate-400 group-hover:text-primary transition-all">
                          <Camera className="w-6 h-6 mb-1" />
                          <span className="text-[9px] font-black uppercase tracking-widest">{t('upload')}</span>
                        </div>
                      )}
                      <input type="file" className="hidden" accept="image/*" onChange={handleProfileImageUpload} />
                      {uploadingProfile && <div className="absolute inset-0 bg-white/70 dark:bg-slate-900/70 flex items-center justify-center"><div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" /></div>}
                    </label>
                    <p className="text-xs font-bold text-slate-400 mt-3">{t('clickToChangeProfile')}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t('firstName')}</span>
                      <div className="relative">
                        <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input type="text" value={editFormData.firstname} onChange={e => setEditFormData({...editFormData, firstname: e.target.value})} className="w-full pl-9 pr-3 py-3 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-white" required />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t('lastName')}</span>
                      <input type="text" value={editFormData.lastname} onChange={e => setEditFormData({...editFormData, lastname: e.target.value})} className="w-full px-3 py-3 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-white" required />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{t('phone')}</span>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="tel" value={editFormData.phone} onChange={e => setEditFormData({...editFormData, phone: e.target.value})} className="w-full pl-9 pr-3 py-3 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 focus:bg-white dark:focus:bg-slate-800 outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-800 dark:text-white" required />
                    </div>
                  </div>

                  <button type="submit" disabled={uploadingProfile} className="w-full py-4 bg-primary text-white rounded-xl font-black hover:bg-primary/90 transition-all shadow-[0_8px_20px_rgba(var(--primary-rgb),0.3)] active:scale-95 disabled:opacity-50 mt-4">
                    {uploadingProfile ? '...' : t('saveChanges')}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 🟢 Modal ยืนยันการแลกรางวัล */}
        <AnimatePresence>
          {selectedReward && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
              <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white dark:bg-slate-900 rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative overflow-hidden text-center border dark:border-slate-800">
                <div className="w-24 h-24 bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border border-green-200/50 dark:border-green-800">
                  <Gift className="w-12 h-12" />
                </div>
                <h3 className="text-2xl font-black mb-2 text-slate-800 dark:text-white">{t('confirmRedeemTitle')}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mb-8">{t('youWillUse')} <strong className="text-red-500 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-md">{selectedReward.points_required.toLocaleString()} {t('unitPoints')}</strong><br/>{t('toRedeem')} <span className="font-bold text-slate-700 dark:text-slate-300">"{selectedReward.name}"</span> {t('yesOrNo')}</p>
                
                <div className="flex gap-3">
                  <button disabled={isRedeeming} onClick={() => setSelectedReward(null)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">{t('cancel')}</button>
                  <button disabled={isRedeeming} onClick={confirmRedeem} className="flex-1 py-3.5 bg-primary text-white rounded-xl font-black hover:bg-primary/90 transition-all shadow-[0_8px_20px_rgba(var(--primary-rgb),0.3)] active:scale-95 disabled:opacity-50">
                    {isRedeeming ? '...' : t('confirmRedeemBtn')}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 💬 ระบบแชทลอยตัว */}
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
          <AnimatePresence>
            {isChatOpen && (
              <motion.div initial={{ opacity: 0, y: 20, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.9 }} transition={{ duration: 0.2 }} className="w-[calc(100vw-3rem)] sm:w-[340px] h-[450px] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 mb-4 flex flex-col overflow-hidden">
                <div className="bg-primary p-4 flex items-center justify-between text-white shrink-0 shadow-md z-10">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm border border-white/20">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-black text-sm">{t('contactAdmin')}</h4>
                      <p className="text-[10px] text-primary-foreground/80 font-bold">{t('askOrReport')}</p>
                    </div>
                  </div>
                  <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors"><X className="w-5 h-5" /></button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50 dark:bg-slate-900/50 scrollbar-hide">
                  {chatMessages.length === 0 ? (
                    <p className="text-center text-xs font-bold text-slate-400 dark:text-slate-500 mt-10 bg-slate-100 dark:bg-slate-800 p-4 rounded-2xl mx-4 border border-slate-200 dark:border-slate-700 whitespace-pre-line">{t('noMessages')}</p>
                  ) : (
                    chatMessages.map((msg, idx) => {
                      const isMe = msg.sender_type === 'user';
                      return (
                        <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                          <div className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium break-words whitespace-pre-wrap ${isMe ? 'bg-primary text-white rounded-tr-sm shadow-md' : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-sm border border-slate-200 dark:border-slate-700 shadow-sm'}`}>
                            {msg.message}
                          </div>
                          <span className="text-[9px] font-bold text-slate-400 mt-1 px-1">{new Date(msg.created_at).toLocaleTimeString('th-TH', {hour:'2-digit', minute:'2-digit'})}</span>
                        </div>
                      );
                    })
                  )}
                  <div ref={chatEndRef} />
                </div>

                <div className="p-3 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800">
                  <form onSubmit={handleSendMessage} className="flex gap-2 relative">
                    <input type="text" value={newChatMessage} onChange={e => setNewChatMessage(e.target.value)} placeholder={t('typeHere')} className="flex-1 bg-slate-100 dark:bg-slate-800 border-none rounded-full pl-5 pr-12 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20 transition-all text-slate-700 dark:text-slate-200" />
                    <button type="submit" disabled={!newChatMessage.trim()} className="absolute right-1 top-1 w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center hover:bg-primary/90 transition-all disabled:opacity-50 shadow-md">
                      <Send className="w-4 h-4 ml-0.5" />
                    </button>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!isChatOpen && (
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={handleOpenChat} className="w-14 h-14 sm:w-16 sm:h-16 bg-primary text-white rounded-full shadow-[0_10px_25px_rgba(var(--primary-rgb),0.4)] flex items-center justify-center relative border-2 border-white dark:border-slate-800">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8" />
              {unreadAdminMessages > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 bg-red-500 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-black border-2 border-white dark:border-slate-800 animate-bounce shadow-sm">
                  {unreadAdminMessages > 9 ? '9+' : unreadAdminMessages}
                </span>
              )}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
}