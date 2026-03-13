"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Mail, Lock, ArrowLeft, ShieldQuestion, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion, AnimatePresence } from 'framer-motion'; // 🟢 เครื่องมือทำแอนิเมชันนุ่มนิ่ม

// 🟢 ฟังก์ชันเข้ารหัสผ่าน (SHA-256) เพื่อความปลอดภัย ไม่เก็บรหัสผ่านเป็น Text ธรรมดา
const hashPassword = async (text) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function Login() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // States สำหรับ Login
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // States สำหรับ กู้คืนรหัสผ่าน (Forgot Password)
  const [view, setView] = useState('login'); // 'login' | 'forgot_email' | 'forgot_question' | 'forgot_reset'
  const [recoveryUser, setRecoveryUser] = useState(null);
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // 🟢 ฟังก์ชันเข้าสู่ระบบและแยกสิทธิ์อัตโนมัติ
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const hashedPassword = await hashPassword(password);

      // ค้นหาผู้ใช้จากอีเมล
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

      if (error || !user) {
        throw new Error('ไม่พบบัญชีผู้ใช้นี้ในระบบ');
      }

      if (user.password !== hashedPassword) {
        throw new Error('รหัสผ่านไม่ถูกต้อง');
      }

      if (user.status === 'banned') {
        throw new Error('บัญชีนี้ถูกระงับการใช้งาน');
      }

      // บันทึก Session (แบบจำลองใน LocalStorage)
      localStorage.setItem('waste_bank_user', JSON.stringify(user));

      // 🟢 แยกสิทธิ์อัตโนมัติ
      if (user.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/user');
      }

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  // --- ฟังก์ชันสำหรับระบบกู้คืนรหัสผ่าน ---
  const handleCheckEmail = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    const { data: user } = await supabase.from('users').select('*').eq('email', email).single();
    
    if (user && user.security_question) {
      setRecoveryUser(user);
      setView('forgot_question');
    } else {
      setErrorMsg('ไม่พบอีเมลนี้ หรือไม่ได้ตั้งคำถามความปลอดภัยไว้');
    }
    setLoading(false);
  };

  const handleCheckAnswer = (e) => {
    e.preventDefault();
    if (securityAnswer.trim() === recoveryUser.security_answer) {
      setView('forgot_reset');
      setErrorMsg('');
    } else {
      setErrorMsg('คำตอบไม่ถูกต้อง ลองใหม่อีกครั้ง');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const newHashedPassword = await hashPassword(newPassword);
      await supabase.from('users').update({ password: newHashedPassword }).eq('id', recoveryUser.id);
      
      alert('เปลี่ยนรหัสผ่านสำเร็จ! กรุณาเข้าสู่ระบบด้วยรหัสผ่านใหม่');
      setView('login');
      setPassword('');
      setNewPassword('');
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการเปลี่ยนรหัสผ่าน');
    } finally {
      setLoading(false);
    }
  };

  // Animation Variants
  const fadeVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.4, ease: "easeOut" } },
    exit: { opacity: 0, x: -20, transition: { duration: 0.3 } }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex items-center justify-center p-4">
      
      {/* วงกลมตกแต่งฉากหลัง */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-0 right-0 w-64 h-64 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute -bottom-8 left-20 w-64 h-64 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="bg-white/80 backdrop-blur-xl rounded-[2.5rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] w-full max-w-md p-8 border border-white/50 relative z-10 overflow-hidden"
      >
        <AnimatePresence mode="wait">
          
          {/* ================= VIEW: LOGIN ================= */}
          {view === 'login' && (
            <motion.div key="login" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <div className="text-center mb-8">
                <motion.div 
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-tr from-primary to-green-400 rounded-[1.5rem] mb-6 shadow-lg shadow-primary/30"
                >
                  <Leaf className="w-10 h-10 text-white" />
                </motion.div>
                <h1 className="text-3xl font-black text-slate-800 tracking-tight">ยินดีต้อนรับ!</h1>
                <p className="text-slate-500 mt-2 font-medium">เข้าสู่ระบบธนาคารขยะรีไซเคิล</p>
              </div>

              {errorMsg && <p className="text-red-500 text-sm font-bold text-center mb-4 bg-red-50 p-3 rounded-xl">{errorMsg}</p>}

              <form onSubmit={handleLogin} className="space-y-5">
                <div>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium text-slate-700" placeholder="อีเมลของคุณ" required />
                  </div>
                </div>

                <div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50/50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-primary/20 focus:border-primary focus:bg-white transition-all font-medium text-slate-700" placeholder="รหัสผ่านของคุณ" required />
                  </div>
                  <div className="flex justify-end mt-2">
                    <button type="button" onClick={() => {setView('forgot_email'); setErrorMsg('');}} className="text-sm text-primary hover:text-green-700 font-bold transition-colors">
                      ลืมรหัสผ่าน?
                    </button>
                  </div>
                </div>

                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-black text-lg hover:bg-primary/90 transition-all shadow-[0_10px_20px_rgba(var(--primary-rgb),0.3)] disabled:opacity-70 mt-4">
                  {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
                </motion.button>
              </form>

              <div className="mt-8 text-center">
                <p className="text-slate-500 font-medium">
                  ยังไม่มีบัญชี?{' '}
                  <Link href="/register" className="text-primary hover:text-green-700 font-black transition-colors">
                    สมัครสมาชิกที่นี่
                  </Link>
                </p>
              </div>
            </motion.div>
          )}

          {/* ================= VIEW: FORGOT PASSWORD (STEP 1) ================= */}
          {view === 'forgot_email' && (
            <motion.div key="forgot_email" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <button onClick={() => setView('login')} className="flex items-center text-slate-400 hover:text-slate-700 font-bold mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
              </button>
              <h2 className="text-2xl font-black text-slate-800 mb-2">กู้คืนรหัสผ่าน</h2>
              <p className="text-slate-500 text-sm font-medium mb-6">กรอกอีเมลบัญชีของคุณเพื่อค้นหาคำถามความปลอดภัย</p>
              
              {errorMsg && <p className="text-red-500 text-sm font-bold text-center mb-4 bg-red-50 p-3 rounded-xl">{errorMsg}</p>}

              <form onSubmit={handleCheckEmail} className="space-y-5">
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium" placeholder="อีเมลของคุณ" required />
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-slate-700 transition-all">
                  {loading ? 'กำลังค้นหา...' : 'ดำเนินการต่อ'}
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ================= VIEW: FORGOT PASSWORD (STEP 2) ================= */}
          {view === 'forgot_question' && (
            <motion.div key="forgot_question" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <button onClick={() => setView('forgot_email')} className="flex items-center text-slate-400 hover:text-slate-700 font-bold mb-6 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> ย้อนกลับ
              </button>
              <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-4">
                <ShieldQuestion className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">คำถามความปลอดภัย</h2>
              <p className="text-primary font-black bg-primary/10 p-4 rounded-xl mb-6">Q: {recoveryUser?.security_question}</p>
              
              {errorMsg && <p className="text-red-500 text-sm font-bold text-center mb-4 bg-red-50 p-3 rounded-xl">{errorMsg}</p>}

              <form onSubmit={handleCheckAnswer} className="space-y-5">
                <input type="text" value={securityAnswer} onChange={(e) => setSecurityAnswer(e.target.value)} className="w-full px-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium" placeholder="คำตอบของคุณ..." required />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" className="w-full bg-slate-800 text-white py-4 rounded-2xl font-black hover:bg-slate-700 transition-all">
                  ตรวจสอบคำตอบ
                </motion.button>
              </form>
            </motion.div>
          )}

          {/* ================= VIEW: FORGOT PASSWORD (STEP 3) ================= */}
          {view === 'forgot_reset' && (
            <motion.div key="forgot_reset" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
              <div className="w-16 h-16 bg-green-50 text-green-500 rounded-2xl flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-black text-slate-800 mb-2">ตั้งรหัสผ่านใหม่</h2>
              <p className="text-slate-500 text-sm font-medium mb-6">กรุณาตั้งรหัสผ่านใหม่สำหรับบัญชีของคุณ</p>
              
              {errorMsg && <p className="text-red-500 text-sm font-bold text-center mb-4 bg-red-50 p-3 rounded-xl">{errorMsg}</p>}

              <form onSubmit={handleResetPassword} className="space-y-5">
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary" />
                  <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-primary/20 focus:border-primary transition-all font-medium" placeholder="รหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)" required minLength={6} />
                </div>
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" disabled={loading} className="w-full bg-primary text-white py-4 rounded-2xl font-black hover:bg-primary/90 transition-all shadow-[0_10px_20px_rgba(var(--primary-rgb),0.3)]">
                  {loading ? 'กำลังบันทึก...' : 'บันทึกรหัสผ่านใหม่'}
                </motion.button>
              </form>
            </motion.div>
          )}

        </AnimatePresence>
      </motion.div>
    </div>
  );
}