"use client";
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Leaf, Mail, Lock, User, Phone, ShieldQuestion, UserCircle, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

// 🟢 ฟังก์ชันเข้ารหัสผ่าน (SHA-256)
const hashPassword = async (text) => {
  const msgBuffer = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export default function Register() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    title: 'นาย', // Default
    firstname: '',
    lastname: '',
    gender: 'not_specified', // male, female, not_specified
    email: '',
    phone: '',
    pet_name: '' // คำถามความปลอดภัย
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    // 1. ตรวจสอบรหัสผ่านตรงกัน
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('รหัสผ่านและการยืนยันรหัสผ่านไม่ตรงกัน');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setErrorMsg('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร');
      setLoading(false);
      return;
    }

    try {
      // 2. ตรวจสอบว่า Username นี้ถูกใช้ไปแล้วหรือยัง (เพราะใน DB ตั้งค่าเป็น UNIQUE NOT NULL)
      const { data: existingUser } = await supabase.from('users').select('id').eq('username', formData.username).single();
      if (existingUser) {
        throw new Error('ชื่อผู้ใช้งาน (Username) นี้ถูกใช้ไปแล้ว กรุณาเปลี่ยนใหม่');
      }

      // 3. เข้ารหัสรหัสผ่าน
      const hashedPassword = await hashPassword(formData.password);

      // 4. บันทึกข้อมูลลงฐานข้อมูล
      const { error: insertError } = await supabase.from('users').insert([{
        id: Date.now(), // 🟢 สร้างตัวเลข ID อัตโนมัติเพื่อป้องกัน Error Null (BIGINT)
        username: formData.username,
        password: hashedPassword,
        title: formData.title,
        firstname: formData.firstname,
        lastname: formData.lastname,
        gender: formData.gender,
        email: formData.email,
        phone: formData.phone,
        pet_name: formData.pet_name.trim() // บันทึกชื่อสัตว์เลี้ยงเป็นคำตอบความปลอดภัย
      }]);

      if (insertError) throw insertError;

      alert('🎉 สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
      router.push('/login');

    } catch (error) {
      setErrorMsg(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-100 flex items-center justify-center p-4 relative overflow-hidden py-10">
      
      {/* วงกลมแอนิเมชันตกแต่งฉากหลัง */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-green-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob" />
      <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000" />
      <div className="absolute bottom-[-10%] left-[20%] w-80 h-80 bg-emerald-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-[0_20px_50px_rgba(8,_112,_184,_0.07)] w-full max-w-2xl p-6 md:p-8 border border-white/50 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            whileHover={{ scale: 1.1, rotate: 10 }}
            className="inline-flex items-center justify-center w-16 h-16 md:w-20 md:h-20 bg-gradient-to-tr from-primary to-green-400 rounded-2xl md:rounded-[1.5rem] mb-4 shadow-lg shadow-primary/30"
          >
            <Leaf className="w-8 h-8 md:w-10 md:h-10 text-white" />
          </motion.div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">สร้างบัญชีใหม่</h1>
          <p className="text-sm md:text-base text-slate-500 mt-2 font-medium">กรอกข้อมูลเพื่อร่วมเป็นส่วนหนึ่งกับเรา 🌍</p>
        </div>

        {errorMsg && (
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold text-center border border-red-100">
            {errorMsg}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* ส่วนที่ 1: ข้อมูลส่วนตัว */}
          <div className="bg-white/50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">ข้อมูลส่วนตัว</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <select value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700">
                  <option value="นาย">นาย</option>
                  <option value="นาง">นาง</option>
                  <option value="นางสาว">นางสาว</option>
                  <option value="อื่นๆ">อื่นๆ</option>
                </select>
              </div>
              <div className="md:col-span-2 relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input type="text" value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700" placeholder="ชื่อจริง" required />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <input type="text" value={formData.lastname} onChange={e => setFormData({...formData, lastname: e.target.value})} className="w-full px-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700" placeholder="นามสกุล" required />
              </div>
              <div className="relative group">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <select value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700">
                  <option value="not_specified">ไม่ระบุเพศ</option>
                  <option value="male">ชาย (Male)</option>
                  <option value="female">หญิง (Female)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ส่วนที่ 2: ข้อมูลติดต่อ */}
          <div className="bg-white/50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">ข้อมูลติดต่อ</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700" placeholder="เบอร์โทรศัพท์" required />
              </div>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700" placeholder="อีเมลของคุณ" />
              </div>
            </div>
          </div>

          {/* ส่วนที่ 3: ข้อมูลบัญชี */}
          <div className="bg-white/50 p-4 rounded-2xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2">บัญชีผู้ใช้และการเข้าระบบ</h3>
            <div className="relative group">
              <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
              <input type="text" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700" placeholder="ตั้งชื่อผู้ใช้งาน (Username)" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700" placeholder="ตั้งรหัสผ่าน (6 ตัวอักษรขึ้นไป)" required minLength={6} />
              </div>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 group-focus-within:text-primary transition-colors" />
                <input type="password" value={formData.confirmPassword} onChange={e => setFormData({...formData, confirmPassword: e.target.value})} className="w-full pl-12 pr-4 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/50 font-medium text-sm text-slate-700" placeholder="ยืนยันรหัสผ่าน" required minLength={6} />
              </div>
            </div>
          </div>

          {/* ส่วนที่ 4: คำถามความปลอดภัย (อิงตามฟิลด์ pet_name) */}
          <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl mt-4">
            <div className="flex items-center gap-2 mb-3 text-blue-600">
              <ShieldQuestion className="w-5 h-5" />
              <span className="text-xs font-black uppercase tracking-widest">คำถามความปลอดภัย (ลืมรหัสผ่าน)</span>
            </div>
            <div className="space-y-3">
              <p className="px-1 text-sm font-bold text-slate-700">สัตว์เลี้ยงตัวแรกของคุณชื่ออะไร?</p>
              <input type="text" value={formData.pet_name} onChange={e => setFormData({...formData, pet_name: e.target.value})} className="w-full px-4 py-3.5 bg-white border border-blue-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-medium text-sm text-slate-700" placeholder="ตอบชื่อสัตว์เลี้ยงที่นี่ (ใช้สำหรับกู้รหัสผ่าน)" required />
            </div>
          </div>

          <motion.button 
            whileHover={{ scale: 1.01 }} 
            whileTap={{ scale: 0.98 }} 
            type="submit" 
            disabled={loading} 
            className="w-full bg-primary text-white py-4 rounded-xl font-black text-base hover:bg-primary/90 transition-all shadow-lg disabled:opacity-70 mt-6"
          >
            {loading ? 'กำลังสร้างบัญชี...' : 'สมัครสมาชิกเลย!'}
          </motion.button>
        </form>

        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-slate-500 text-sm font-medium mb-2">
            มีบัญชีอยู่แล้วใช่ไหม?{' '}
            <Link href="/login" className="text-primary hover:text-green-700 font-black transition-colors">
              เข้าสู่ระบบที่นี่
            </Link>
          </p>
          <Link href="/" className="text-slate-400 hover:text-slate-700 text-xs font-bold underline transition-colors">
            กลับหน้าหลัก
          </Link>
        </div>
      </motion.div>
    </div>
  );
}