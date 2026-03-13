"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings, Store, Shield, Save, Clock, Banknote, Bell, CheckCircle2 
} from 'lucide-react';

export default function AdminSettings() {
  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  // 🟢 States จำลองสำหรับการตั้งค่า (นำไปเชื่อมต่อ DB ภายหลังได้)
  const [settings, setSettings] = useState({
    bankName: 'ธนาคารขยะรีไซเคิล วิทยาลัย...',
    isOpen: true,
    openTime: '08:00',
    closeTime: '16:30',
    pointRate: 1,
    minRedeemPoints: 100,
    emailNotifications: true,
  });

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    // จำลองการบันทึกข้อมูล (หน่วงเวลา 1 วินาที)
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000); // ซ่อนข้อความสำเร็จหลัง 3 วินาที
    }, 1000);
  };

  const tabs = [
    { id: 'general', label: 'ทั่วไปและเวลาทำการ', icon: Store },
    { id: 'finance', label: 'คะแนนและการเงิน', icon: Banknote },
    { id: 'notifications', label: 'การแจ้งเตือน', icon: Bell },
    { id: 'security', label: 'ความปลอดภัย', icon: Shield },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10">
      
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 flex items-center gap-3">
            <Settings className="w-8 h-8 text-primary" />
            ตั้งค่าระบบ
          </h1>
          <p className="text-slate-500 font-medium mt-1">ปรับแต่งการทำงานของระบบธนาคารขยะของคุณ</p>
        </div>
        
        <button 
          onClick={handleSave} 
          disabled={isSaving}
          className="px-6 py-3 bg-primary text-white rounded-xl font-black hover:bg-primary/90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 min-w-[140px]"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Save className="w-5 h-5" /> บันทึกการตั้งค่า</>
          )}
        </button>
      </div>

      {/* แจ้งเตือนบันทึกสำเร็จ */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-sm"
          >
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-8">
        
        {/* 🟢 เมนูด้านซ้าย (Tabs) */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all ${
                  isActive 
                    ? 'bg-primary text-white shadow-md' 
                    : 'bg-white text-slate-600 hover:bg-slate-50 hover:text-primary border border-slate-100'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* 🟢 พื้นที่ตั้งค่าด้านขวา */}
        <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-xl overflow-hidden p-6 md:p-8">
          <AnimatePresence mode="wait">
            
            {/* --- TAB: ทั่วไป --- */}
            {activeTab === 'general' && (
              <motion.div key="general" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-xl font-black text-slate-800">ข้อมูลทั่วไปและเวลาทำการ</h3>
                  <p className="text-sm text-slate-500 font-medium">จัดการชื่อระบบและการเปิด/ปิดรับฝากขยะ</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">ชื่อระบบ / ชื่อธนาคารขยะ</label>
                    <input 
                      type="text" 
                      value={settings.bankName} 
                      onChange={e => setSettings({...settings, bankName: e.target.value})}
                      className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all" 
                    />
                  </div>

                  <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-slate-800 flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> สถานะการเปิดรับฝากขยะ</p>
                      <p className="text-xs text-slate-500 mt-1">หากปิดระบบ สมาชิกจะไม่สามารถทำรายการฝากหรือแลกได้</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.isOpen} onChange={e => setSettings({...settings, isOpen: e.target.checked})} />
                      <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500"></div>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Clock className="w-4 h-4" /> เวลาเปิดทำการ</label>
                      <input type="time" value={settings.openTime} onChange={e => setSettings({...settings, openTime: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-bold transition-all" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-slate-700 flex items-center gap-2"><Clock className="w-4 h-4" /> เวลาปิดทำการ</label>
                      <input type="time" value={settings.closeTime} onChange={e => setSettings({...settings, closeTime: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-bold transition-all" />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TAB: การเงินและคะแนน --- */}
            {activeTab === 'finance' && (
              <motion.div key="finance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-xl font-black text-slate-800">คะแนนและการเงิน</h3>
                  <p className="text-sm text-slate-500 font-medium">ตั้งค่าเรทราคาและเงื่อนไขการแลกของรางวัล</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">ตัวคูณคะแนนพิเศษ (Event Multiplier)</label>
                    <div className="flex items-center gap-4">
                      <input type="number" step="0.1" value={settings.pointRate} onChange={e => setSettings({...settings, pointRate: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-bold transition-all" />
                      <span className="font-bold text-slate-400">เท่า (X)</span>
                    </div>
                    <p className="text-xs text-slate-500">ค่าเริ่มต้นคือ 1 หากตั้งเป็น 2 สมาชิกจะได้แต้ม 2 เท่าเมื่อฝากขยะ</p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-bold text-slate-700">ขั้นต่ำในการแลกของรางวัล</label>
                    <div className="flex items-center gap-4">
                      <input type="number" value={settings.minRedeemPoints} onChange={e => setSettings({...settings, minRedeemPoints: e.target.value})} className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-bold transition-all" />
                      <span className="font-bold text-slate-400">แต้ม</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* --- TAB: การแจ้งเตือน --- */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-xl font-black text-slate-800">การแจ้งเตือน</h3>
                  <p className="text-sm text-slate-500 font-medium">จัดการการแจ้งเตือนในระบบและอีเมล</p>
                </div>

                <div className="p-5 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-800 flex items-center gap-2">รับการแจ้งเตือนเมื่อมีแชทใหม่</p>
                    <p className="text-xs text-slate-500 mt-1">แสดงจุดแดงแจ้งเตือนเมื่อสมาชิกส่งข้อความมาหา</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-14 h-7 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary"></div>
                  </label>
                </div>
              </motion.div>
            )}

            {/* --- TAB: ความปลอดภัย --- */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-xl font-black text-slate-800">ความปลอดภัยและรหัสผ่าน</h3>
                  <p className="text-sm text-slate-500 font-medium">เปลี่ยนรหัสผ่านเพื่อความปลอดภัยของบัญชีผู้ดูแล</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">รหัสผ่านปัจจุบัน</label>
                    <input type="password" placeholder="••••••••" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">รหัสผ่านใหม่</label>
                    <input type="password" placeholder="••••••••" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700">ยืนยันรหัสผ่านใหม่</label>
                    <input type="password" placeholder="••••••••" className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all" />
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </div>
    </div>
  );
}