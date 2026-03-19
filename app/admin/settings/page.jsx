"use client";
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, Store, Shield, Save, Clock, Banknote, Bell, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminSettings() {
  const { lang } = useLanguage();

  const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const [settings, setSettings] = useState({
    bankName: lang === 'th' ? 'ธนาคารขยะรีไซเคิล วิทยาลัย...' : 'EcoBit Exchange - Campus',
    isOpen: true,
    openTime: '08:00',
    closeTime: '16:30',
    pointRate: 1,
    minRedeemPoints: 100,
    emailNotifications: true,
  });

  // ── i18n ──
  const tx = {
    pageTitle:        lang === 'th' ? 'ตั้งค่าระบบ'                               : 'System Settings',
    pageDesc:         lang === 'th' ? 'ปรับแต่งการทำงานของระบบธนาคารขยะของคุณ'    : 'Customize your waste bank system',
    saveBtn:          lang === 'th' ? 'บันทึกการตั้งค่า'                           : 'Save Settings',
    saveSuccess:      lang === 'th' ? 'บันทึกการตั้งค่าระบบเรียบร้อยแล้ว!'         : 'Settings saved successfully!',

    tabGeneral:       lang === 'th' ? 'ทั่วไปและเวลาทำการ'       : 'General & Hours',
    tabFinance:       lang === 'th' ? 'คะแนนและการเงิน'           : 'Points & Finance',
    tabNotifications: lang === 'th' ? 'การแจ้งเตือน'              : 'Notifications',
    tabSecurity:      lang === 'th' ? 'ความปลอดภัย'               : 'Security',

    // General tab
    generalTitle:     lang === 'th' ? 'ข้อมูลทั่วไปและเวลาทำการ'                     : 'General Info & Hours',
    generalDesc:      lang === 'th' ? 'จัดการชื่อระบบและการเปิด/ปิดรับฝากขยะ'        : 'Manage system name and open/close status',
    fieldBankName:    lang === 'th' ? 'ชื่อระบบ / ชื่อธนาคารขยะ'                     : 'System Name / Bank Name',
    fieldStatus:      lang === 'th' ? 'สถานะการเปิดรับฝากขยะ'                        : 'Waste Deposit Status',
    fieldStatusDesc:  lang === 'th' ? 'หากปิดระบบ สมาชิกจะไม่สามารถทำรายการฝากหรือแลกได้' : 'If closed, members cannot deposit or redeem',
    fieldOpenTime:    lang === 'th' ? 'เวลาเปิดทำการ'             : 'Opening Time',
    fieldCloseTime:   lang === 'th' ? 'เวลาปิดทำการ'              : 'Closing Time',

    // Finance tab
    financeTitle:     lang === 'th' ? 'คะแนนและการเงิน'                          : 'Points & Finance',
    financeDesc:      lang === 'th' ? 'ตั้งค่าเรทราคาและเงื่อนไขการแลกของรางวัล'  : 'Configure point rates and redemption conditions',
    fieldMultiplier:  lang === 'th' ? 'ตัวคูณคะแนนพิเศษ (Event Multiplier)'       : 'Event Points Multiplier',
    multiplierUnit:   lang === 'th' ? 'เท่า (X)'                                  : 'times (X)',
    multiplierDesc:   lang === 'th' ? 'ค่าเริ่มต้นคือ 1 หากตั้งเป็น 2 สมาชิกจะได้แต้ม 2 เท่าเมื่อฝากขยะ' : 'Default is 1. Setting to 2 gives members double points.',
    fieldMinRedeem:   lang === 'th' ? 'ขั้นต่ำในการแลกของรางวัล'                   : 'Minimum Points to Redeem',
    minRedeemUnit:    lang === 'th' ? 'แต้ม'                                      : 'points',

    // Notifications tab
    notiTitle:        lang === 'th' ? 'การแจ้งเตือน'                           : 'Notifications',
    notiDesc:         lang === 'th' ? 'จัดการการแจ้งเตือนในระบบและอีเมล'       : 'Manage system and email notifications',
    notiChat:         lang === 'th' ? 'รับการแจ้งเตือนเมื่อมีแชทใหม่'          : 'Notify on new chat message',
    notiChatDesc:     lang === 'th' ? 'แสดงจุดแดงแจ้งเตือนเมื่อสมาชิกส่งข้อความมาหา' : 'Show red dot when members send messages',

    // Security tab
    securityTitle:    lang === 'th' ? 'ความปลอดภัยและรหัสผ่าน'                             : 'Security & Password',
    securityDesc:     lang === 'th' ? 'เปลี่ยนรหัสผ่านเพื่อความปลอดภัยของบัญชีผู้ดูแล'   : 'Change password to secure your admin account',
    fieldCurrentPw:   lang === 'th' ? 'รหัสผ่านปัจจุบัน'  : 'Current Password',
    fieldNewPw:       lang === 'th' ? 'รหัสผ่านใหม่'       : 'New Password',
    fieldConfirmPw:   lang === 'th' ? 'ยืนยันรหัสผ่านใหม่' : 'Confirm New Password',
  };

  const tabs = [
    { id: 'general',       label: tx.tabGeneral,       icon: Store    },
    { id: 'finance',       label: tx.tabFinance,        icon: Banknote },
    { id: 'notifications', label: tx.tabNotifications,  icon: Bell     },
    { id: 'security',      label: tx.tabSecurity,       icon: Shield   },
  ];

  const handleSave = (e) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    }, 1000);
  };

  // ── Reusable input styles ──
  const inputCls = "w-full p-4 border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground focus:bg-background outline-none focus:ring-2 focus:ring-primary/30 font-medium transition-all";
  const labelCls = "text-sm font-bold text-foreground";

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-10 transition-colors">

      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-foreground flex items-center gap-3">
            <Settings className="w-7 h-7 md:w-8 md:h-8 text-primary" />
            {tx.pageTitle}
          </h1>
          <p className="text-muted-foreground font-medium mt-1 text-sm">{tx.pageDesc}</p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="px-6 py-3 bg-primary text-primary-foreground rounded-xl font-black hover:bg-primary/90 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 min-w-[160px]"
        >
          {isSaving ? (
            <div className="w-5 h-5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
          ) : (
            <><Save className="w-5 h-5" /> {tx.saveBtn}</>
          )}
        </button>
      </div>

      {/* ── Success Toast ── */}
      <AnimatePresence>
        {showSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 px-6 py-4 rounded-2xl flex items-center gap-3 font-bold shadow-sm transition-colors"
          >
            <CheckCircle2 className="w-6 h-6 text-green-500" />
            {tx.saveSuccess}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-8">

        {/* ── Tab Menu ── */}
        <div className="w-full lg:w-72 shrink-0 space-y-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl font-bold transition-all text-left ${
                  isActive
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'bg-card text-muted-foreground hover:bg-muted hover:text-foreground border border-border'
                }`}
              >
                <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
                <span className="text-sm">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ── Content Panel ── */}
        <div className="flex-1 bg-card rounded-[2rem] border border-border shadow-xl overflow-hidden p-6 md:p-8 transition-colors">
          <AnimatePresence mode="wait">

            {/* TAB: ทั่วไป */}
            {activeTab === 'general' && (
              <motion.div key="general" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-border pb-4 mb-6">
                  <h3 className="text-xl font-black text-foreground">{tx.generalTitle}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{tx.generalDesc}</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className={labelCls}>{tx.fieldBankName}</label>
                    <input type="text" value={settings.bankName} onChange={e => setSettings({ ...settings, bankName: e.target.value })} className={inputCls} />
                  </div>

                  <div className="p-5 bg-muted/30 dark:bg-muted/20 border border-border rounded-2xl flex items-center justify-between transition-colors">
                    <div>
                      <p className="font-bold text-foreground flex items-center gap-2"><Store className="w-4 h-4 text-primary" /> {tx.fieldStatus}</p>
                      <p className="text-xs text-muted-foreground mt-1">{tx.fieldStatusDesc}</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" checked={settings.isOpen} onChange={e => setSettings({ ...settings, isOpen: e.target.checked })} />
                      <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-green-500" />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className={`${labelCls} flex items-center gap-2`}><Clock className="w-4 h-4" /> {tx.fieldOpenTime}</label>
                      <input type="time" value={settings.openTime} onChange={e => setSettings({ ...settings, openTime: e.target.value })} className={inputCls} />
                    </div>
                    <div className="space-y-2">
                      <label className={`${labelCls} flex items-center gap-2`}><Clock className="w-4 h-4" /> {tx.fieldCloseTime}</label>
                      <input type="time" value={settings.closeTime} onChange={e => setSettings({ ...settings, closeTime: e.target.value })} className={inputCls} />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: การเงิน */}
            {activeTab === 'finance' && (
              <motion.div key="finance" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-border pb-4 mb-6">
                  <h3 className="text-xl font-black text-foreground">{tx.financeTitle}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{tx.financeDesc}</p>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className={labelCls}>{tx.fieldMultiplier}</label>
                    <div className="flex items-center gap-4">
                      <input type="number" step="0.1" value={settings.pointRate} onChange={e => setSettings({ ...settings, pointRate: e.target.value })} className={inputCls} />
                      <span className="font-bold text-muted-foreground whitespace-nowrap">{tx.multiplierUnit}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">{tx.multiplierDesc}</p>
                  </div>

                  <div className="space-y-2 mt-4">
                    <label className={labelCls}>{tx.fieldMinRedeem}</label>
                    <div className="flex items-center gap-4">
                      <input type="number" value={settings.minRedeemPoints} onChange={e => setSettings({ ...settings, minRedeemPoints: e.target.value })} className={inputCls} />
                      <span className="font-bold text-muted-foreground whitespace-nowrap">{tx.minRedeemUnit}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* TAB: การแจ้งเตือน */}
            {activeTab === 'notifications' && (
              <motion.div key="notifications" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-border pb-4 mb-6">
                  <h3 className="text-xl font-black text-foreground">{tx.notiTitle}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{tx.notiDesc}</p>
                </div>

                <div className="p-5 bg-muted/30 dark:bg-muted/20 border border-border rounded-2xl flex items-center justify-between transition-colors">
                  <div>
                    <p className="font-bold text-foreground">{tx.notiChat}</p>
                    <p className="text-xs text-muted-foreground mt-1">{tx.notiChatDesc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked />
                    <div className="w-14 h-7 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary" />
                  </label>
                </div>
              </motion.div>
            )}

            {/* TAB: ความปลอดภัย */}
            {activeTab === 'security' && (
              <motion.div key="security" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                <div className="border-b border-border pb-4 mb-6">
                  <h3 className="text-xl font-black text-foreground">{tx.securityTitle}</h3>
                  <p className="text-sm text-muted-foreground font-medium">{tx.securityDesc}</p>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className={labelCls}>{tx.fieldCurrentPw}</label>
                    <input type="password" placeholder="••••••••" className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>{tx.fieldNewPw}</label>
                    <input type="password" placeholder="••••••••" className={inputCls} />
                  </div>
                  <div className="space-y-2">
                    <label className={labelCls}>{tx.fieldConfirmPw}</label>
                    <input type="password" placeholder="••••••••" className={inputCls} />
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