"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { Trophy, Medal, Scale, Star, ArrowLeft, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export default function UserLeaderboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [myRank, setMyRank] = useState(null);

  useEffect(() => {
    fetchLeaderboard();
  }, []);

  const fetchLeaderboard = async () => {
    setLoading(true);
    try {
      // 1. เช็ค User ปัจจุบัน
      const userDataStr = localStorage.getItem('waste_bank_user');
      if (!userDataStr) {
        router.push('/');
        return;
      }
      const localUser = JSON.parse(userDataStr);
      setCurrentUser(localUser);

      // 2. ดึงข้อมูล User ทั้งหมด (เฉพาะ role = user)
      const { data: users } = await supabase
        .from('users')
        .select('id, firstname, lastname, username, profile_image')
        .eq('role', 'user');

      // 3. ดึงข้อมูลการฝากขยะทั้งหมดมาคำนวณ
      const { data: deposits } = await supabase
        .from('deposit_stats')
        .select('user_id, weight_kg');

      const userTotals = {};
      if (deposits) {
        deposits.forEach(d => {
          userTotals[d.user_id] = (userTotals[d.user_id] || 0) + Number(d.weight_kg);
        });
      }

      // 4. นำมารวมกันและจัดเรียงจากมากไปน้อย
      if (users) {
        const ranked = users.map(u => ({
          ...u,
          total_weight: userTotals[u.id] || 0
        })).sort((a, b) => b.total_weight - a.total_weight);

        setLeaderboard(ranked);

        // หาอันดับของตัวเอง
        const myIndex = ranked.findIndex(u => u.id === localUser.id);
        setMyRank(myIndex !== -1 ? myIndex + 1 : ranked.length + 1);
      }

    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Trophy className="w-16 h-16 text-yellow-400 animate-bounce" />
        <p className="font-black text-slate-500 animate-pulse">กำลังโหลดกระดานผู้นำ...</p>
      </div>
    );
  }

  // แยก Top 3 และคนที่เหลือ
  const top3 = leaderboard.slice(0, 3);
  const others = leaderboard.slice(3);

  // แอนิเมชันของ Framer Motion
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: (i) => ({
      opacity: 1, y: 0, transition: { delay: i * 0.1, duration: 0.5, ease: "easeOut" }
    })
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      
      {/* 🟢 Header Section */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-800 flex items-center gap-3">
            <Trophy className="w-10 h-10 text-yellow-500" />
            กระดานผู้นำ
          </h1>
          <p className="text-muted-foreground font-medium mt-2 text-sm md:text-base">
            สุดยอดนักรักษ์โลกที่มีส่วนร่วมมากที่สุด 🌍
          </p>
        </div>
      </div>

      {/* 🟢 Top 3 Podium (แท่นรับรางวัล) */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2rem] p-6 md:p-10 text-white shadow-xl relative overflow-hidden">
        {/* ของตกแต่ง */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/4" />

        <div className="flex items-end justify-center gap-2 md:gap-6 mt-10 relative z-10 h-64">
          
          {/* อันดับ 2 (ซ้าย) */}
          {top3[1] && (
            <motion.div initial="hidden" animate="visible" custom={1} variants={itemVariants} className="flex flex-col items-center w-1/3">
              <div className="relative mb-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-slate-300 bg-slate-200 overflow-hidden shadow-lg z-10 relative">
                  {top3[1].profile_image && !top3[1].profile_image.includes('default.png') ? <img src={top3[1].profile_image} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-4 text-slate-400" />}
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-slate-300 text-slate-800 font-black text-xs px-2 py-0.5 rounded-full z-20 border-2 border-slate-800">2nd</div>
              </div>
              <p className="font-black text-xs md:text-sm truncate w-full text-center">{top3[1].firstname}</p>
              <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1">{top3[1].total_weight.toLocaleString()} กก.</p>
              <div className="w-full bg-slate-700/50 rounded-t-xl h-24 md:h-32 mt-4 backdrop-blur-sm border border-white/5 border-b-0 flex items-end justify-center pb-4">
                <span className="text-4xl font-black text-slate-600/50">2</span>
              </div>
            </motion.div>
          )}

          {/* อันดับ 1 (กลาง) */}
          {top3[0] && (
            <motion.div initial="hidden" animate="visible" custom={0} variants={itemVariants} className="flex flex-col items-center w-1/3 z-20">
              <div className="relative mb-4">
                <Trophy className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 text-yellow-400 animate-bounce" />
                <div className="w-20 h-20 md:w-28 md:h-28 rounded-full border-4 border-yellow-400 bg-slate-200 overflow-hidden shadow-[0_0_30px_rgba(250,204,21,0.4)] z-10 relative">
                  {top3[0].profile_image && !top3[0].profile_image.includes('default.png') ? <img src={top3[0].profile_image} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-4 text-slate-400" />}
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-yellow-400 text-yellow-900 font-black text-xs px-3 py-0.5 rounded-full z-20 border-2 border-yellow-900">1st</div>
              </div>
              <p className="font-black text-sm md:text-base truncate w-full text-center text-yellow-400">{top3[0].firstname}</p>
              <p className="text-[10px] md:text-xs text-slate-300 font-bold mt-1">{top3[0].total_weight.toLocaleString()} กก.</p>
              <div className="w-full bg-yellow-500/20 rounded-t-xl h-32 md:h-40 mt-4 backdrop-blur-sm border border-yellow-500/30 border-b-0 flex items-end justify-center pb-6 shadow-[inset_0_4px_20px_rgba(250,204,21,0.2)]">
                <span className="text-5xl font-black text-yellow-500/30">1</span>
              </div>
            </motion.div>
          )}

          {/* อันดับ 3 (ขวา) */}
          {top3[2] && (
            <motion.div initial="hidden" animate="visible" custom={2} variants={itemVariants} className="flex flex-col items-center w-1/3">
              <div className="relative mb-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border-4 border-amber-600 bg-slate-200 overflow-hidden shadow-lg z-10 relative">
                  {top3[2].profile_image && !top3[2].profile_image.includes('default.png') ? <img src={top3[2].profile_image} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-4 text-slate-400" />}
                </div>
                <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 bg-amber-600 text-white font-black text-xs px-2 py-0.5 rounded-full z-20 border-2 border-slate-800">3rd</div>
              </div>
              <p className="font-black text-xs md:text-sm truncate w-full text-center">{top3[2].firstname}</p>
              <p className="text-[10px] md:text-xs text-slate-400 font-bold mt-1">{top3[2].total_weight.toLocaleString()} กก.</p>
              <div className="w-full bg-slate-700/50 rounded-t-xl h-20 md:h-24 mt-4 backdrop-blur-sm border border-white/5 border-b-0 flex items-end justify-center pb-2">
                <span className="text-4xl font-black text-slate-600/50">3</span>
              </div>
            </motion.div>
          )}

        </div>
      </div>

      {/* 🟢 อันดับ 4 เป็นต้นไป */}
      <div className="bg-card rounded-[2rem] border p-4 md:p-8 shadow-sm">
        <h3 className="font-black text-lg mb-6 px-2">อันดับอื่นๆ</h3>
        <div className="space-y-3">
          {others.map((user, idx) => {
            const rank = idx + 4; // เริ่มที่ 4
            const isMe = currentUser?.id === user.id;

            return (
              <motion.div 
                initial="hidden" whileInView="visible" viewport={{ once: true }} custom={idx} variants={itemVariants}
                key={user.id} 
                className={`flex items-center gap-4 p-4 rounded-2xl transition-all ${isMe ? 'bg-primary/10 border-2 border-primary shadow-sm' : 'bg-slate-50 border hover:bg-slate-100'}`}
              >
                <div className="w-8 font-black text-slate-400 text-center text-lg shrink-0">
                  {rank}
                </div>
                <div className="w-10 h-10 rounded-full bg-white border shadow-sm overflow-hidden shrink-0">
                  {user.profile_image && !user.profile_image.includes('default.png') ? <img src={user.profile_image} className="w-full h-full object-cover" /> : <UserIcon className="w-full h-full p-2 text-slate-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-black text-sm md:text-base truncate ${isMe ? 'text-primary' : 'text-slate-800'}`}>
                    {user.firstname} {user.lastname?.charAt(0)}. {isMe && <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full ml-2">คุณ</span>}
                  </p>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-bold truncate">@{user.username}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-black text-green-600 text-sm md:text-base">{user.total_weight.toLocaleString()} <span className="text-xs">กก.</span></p>
                </div>
              </motion.div>
            )
          })}
          
          {others.length === 0 && (
            <p className="text-center py-10 text-slate-400 font-bold">ยังไม่มีข้อมูลอันดับอื่นๆ</p>
          )}
        </div>
      </div>

      {/* 🟢 แถบลอยแสดงอันดับตัวเองด้านล่างสุด */}
      {currentUser && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 bg-white/80 backdrop-blur-md border-t p-4 z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center font-black text-primary text-xl border-2 border-primary/30">
                #{myRank}
              </div>
              <div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">อันดับปัจจุบันของคุณ</p>
                <p className="font-black text-slate-800">ตามหลังอันดับ {myRank > 1 ? myRank - 1 : '-'} อยู่ไม่ไกล!</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}