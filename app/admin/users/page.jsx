"use client";
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import {
  Edit2, Upload, User, ShieldCheck, Ban, Star, Search,
  QrCode, Weight, ChevronDown, Loader2, CheckCircle2,
  Leaf, X, Camera, Plus, Send
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminUsers() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Edit user dialog
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldImageUrl, setOldImageUrl] = useState(null);
  const [formData, setFormData] = useState({
    id: null, username: '', firstname: '', lastname: '', phone: '',
    role: 'user', points: 0, status: 'active', profile_image: ''
  });

  // ── Deposit modal (สแกน QR / เพิ่มคะแนน) ──
  const [isDepositOpen, setIsDepositOpen] = useState(false);
  const [depositStep, setDepositStep] = useState('scan'); // scan | form | done
  const [scanning, setScanning] = useState(false);
  const [depositUser, setDepositUser] = useState(null);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [depositResult, setDepositResult] = useState(null);
  const [lineStatus, setLineStatus] = useState(''); // 'sending' | 'sent' | 'failed' | ''
  const html5QrRef = useRef(null);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (!error) setUserList(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

  useEffect(() => {
    supabase.from('waste_types').select('id, name, points_per_kg, co2_factor').eq('active', true).order('name')
      .then(({ data }) => { if (data) setWasteTypes(data); });
  }, []);

  // ── Edit user handlers ──
  const getFileNameFromUrl = (url) => (url && url !== 'null' && !url.includes('default.png') ? url.split('/').pop() : null);
  const deleteImageFromStorage = async (url) => {
    const fileName = getFileNameFromUrl(url);
    if (fileName) await supabase.storage.from('profile_images').remove([fileName]);
  };

  const handleImageUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      if (formData.profile_image && formData.profile_image !== oldImageUrl) await deleteImageFromStorage(formData.profile_image);
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('profile_images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('profile_images').getPublicUrl(fileName);
      setFormData({ ...formData, profile_image: data.publicUrl });
    } catch (error) { alert('Error: ' + error.message); }
    finally { setUploading(false); }
  };

  const handleCloseForm = async () => {
    if (formData.profile_image && formData.profile_image !== oldImageUrl) await deleteImageFromStorage(formData.profile_image);
    setIsDialogOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && oldImageUrl && oldImageUrl !== formData.profile_image) await deleteImageFromStorage(oldImageUrl);
      const payload = {
        firstname: formData.firstname, lastname: formData.lastname,
        phone: formData.phone, role: formData.role,
        points: Number(formData.points), status: formData.status,
        profile_image: formData.profile_image
      };
      if (isEditing) await supabase.from('users').update(payload).eq('id', formData.id);
      setIsDialogOpen(false);
      fetchUsers();
    } catch { alert('บันทึกไม่สำเร็จ'); }
  };

  const openForm = (user) => {
    if (user) {
      setFormData(user);
      setOldImageUrl(user.profile_image);
      setIsEditing(true);
      setIsDialogOpen(true);
    }
  };

  // ── Deposit / QR handlers ──
  const openDepositModal = () => {
    setDepositStep('scan');
    setDepositUser(null);
    setSelectedType('');
    setWeightKg('');
    setManualUserId('');
    setDepositResult(null);
    setLineStatus('');
    setIsDepositOpen(true);
  };

  const closeDepositModal = async () => {
    await stopScanner();
    setIsDepositOpen(false);
  };

  const startScanner = async () => {
    setScanning(true);
    try {
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrRef.current = new Html5Qrcode('admin-qr-reader');
      await html5QrRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        (decoded) => {
          stopScanner();
          handleQrDecoded(decoded);
        },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      alert('ไม่สามารถเปิดกล้องได้: ' + err.message);
    }
  };

  const stopScanner = async () => {
    try { await html5QrRef.current?.stop(); } catch {}
    setScanning(false);
  };

  const handleQrDecoded = async (text) => {
    try {
      const payload = JSON.parse(text);
      if (!payload.uid) throw new Error('invalid');
      await fetchDepositUser(payload.uid);
    } catch {
      alert('QR ไม่ถูกต้อง กรุณาให้ลูกค้าแสดง QR จากแอปธนาคารขยะ');
    }
  };

  const fetchDepositUser = async (uid) => {
    const { data, error } = await supabase
      .from('users').select('id, firstname, lastname, username, points, profile_image, phone')
      .eq('id', uid).single();
    if (error || !data) { alert('ไม่พบสมาชิก ID: ' + uid); return; }
    setDepositUser(data);
    setDepositStep('form');
  };

  // คำนวณ preview คะแนน
  const selectedWasteType = wasteTypes.find(w => w.name === selectedType);
  const estimatedPoints = selectedWasteType && weightKg
    ? Math.round(Number(weightKg) * selectedWasteType.points_per_kg) : 0;
  const estimatedCo2 = selectedWasteType && weightKg
    ? (Number(weightKg) * Number(selectedWasteType.co2_factor)).toFixed(3) : '0';

  const handleSaveDeposit = async () => {
    if (!depositUser || !selectedType || !weightKg || Number(weightKg) <= 0) {
      alert('กรุณากรอกข้อมูลให้ครบ');
      return;
    }
    setSaving(true);
    try {
      const wt = wasteTypes.find(w => w.name === selectedType);
      const pointsEarned = Math.round(Number(weightKg) * (wt?.points_per_kg || 0));
      const co2Reduced = (Number(weightKg) * Number(wt?.co2_factor || 0)).toFixed(3);
      const newTotal = depositUser.points + pointsEarned;

      // 1. บันทึก deposit_stats
      await supabase.from('deposit_stats').insert([{
        user_id: depositUser.id,
        deposit_date: new Date().toISOString().split('T')[0],
        weight_kg: Number(weightKg),
        waste_type: selectedType,
      }]);

      // 2. บันทึก point_history
      await supabase.from('point_history').insert([{
        user_id: depositUser.id,
        points: pointsEarned,
        type: 'add',
        description: `ฝากขยะ ${selectedType} ${weightKg} กก.`,
      }]);

      // 3. อัปเดตคะแนน users
      await supabase.from('users').update({ points: newTotal }).eq('id', depositUser.id);

      setDepositResult({ pointsEarned, newTotal, co2Reduced, wasteType: selectedType, weightKg: Number(weightKg) });
      setDepositStep('done');

      // 4. ส่ง LINE แจ้งเตือน
      setLineStatus('sending');
      try {
        const res = await fetch('/api/notify-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: depositUser.id,
            name: `${depositUser.firstname} ${depositUser.lastname}`,
            wasteType: selectedType,
            weightKg: Number(weightKg),
            pointsEarned,
            totalPoints: newTotal,
            co2Reduced,
          }),
        });
        setLineStatus(res.ok ? 'sent' : 'failed');
      } catch {
        setLineStatus('failed');
      }

      fetchUsers(); // refresh list
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(userList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedUsers = userList.slice(startIndex, startIndex + itemsPerPage);

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-card rounded-2xl md:rounded-[2rem] border shadow-xl flex flex-col overflow-hidden">

        {/* Header */}
        <div className="p-5 md:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/50 backdrop-blur-md gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-lg md:text-xl leading-tight">บัญชีสมาชิกทั้งหมด</h3>
            <p className="text-xs md:text-sm text-muted-foreground font-medium opacity-70">มีสมาชิกลงทะเบียน {userList.length} บัญชีในระบบ</p>
          </div>
          {/* ปุ่มสแกน QR รับฝากขยะ */}
          <button
            onClick={openDepositModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl sm:rounded-2xl font-black text-sm hover:bg-green-700 transition-all active:scale-95 shadow-lg"
          >
            <QrCode className="w-5 h-5" /> สแกน QR รับฝากขยะ
          </button>
        </div>

        {/* User Grid */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border rounded-2xl">
                  <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <Skeleton className="h-3 w-1/2 rounded-lg" />
                  </div>
                </div>
              ))
            ) : (
              displayedUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-4 bg-background border rounded-2xl relative group hover:shadow-lg transition-all duration-300 border-border/50 ${user.status === 'banned' ? 'bg-red-50/50 border-red-100 opacity-80' : ''}`}
                >
                  {/* Action buttons */}
                  <div className="absolute top-3 right-3 flex gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={() => { setDepositUser(user); setDepositStep('form'); setSelectedType(''); setWeightKg(''); setDepositResult(null); setLineStatus(''); setIsDepositOpen(true); }}
                      className="p-2 bg-white/90 shadow-md border rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                      title="เพิ่มคะแนน"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => openForm(user)} className="p-2 bg-white/90 shadow-md border rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Avatar */}
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted overflow-hidden border-2 border-primary/20 shrink-0">
                    {user.profile_image && !user.profile_image.includes('default.png') ? (
                      <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <User className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <h4 className="font-black text-sm md:text-base truncate text-foreground leading-none">
                        {user.firstname || user.username}
                      </h4>
                      {user.role === 'admin' && <ShieldCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />}
                      {user.status === 'banned' && <Ban className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                    </div>
                    <p className="text-[10px] md:text-xs text-muted-foreground font-medium truncate mb-2">@{user.username}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold px-2 py-0.5 bg-yellow-500/10 text-yellow-700 rounded-md">
                        <Star className="w-2.5 h-2.5" /> {user.points.toLocaleString()}
                      </span>
                      <span className={`inline-flex items-center text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-md ${user.status === 'active' ? 'bg-green-500/10 text-green-700' : 'bg-red-500/10 text-red-700'}`}>
                        {user.status === 'active' ? 'ปกติ' : 'ระงับ'}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          {!loading && userList.length === 0 && (
            <div className="text-center py-20 opacity-30">
              <Search className="w-16 h-16 mx-auto mb-4" />
              <p className="font-bold">ไม่พบข้อมูลผู้ใช้งาน</p>
            </div>
          )}
        </div>

        <div className="p-4 md:p-6 border-t bg-muted/10 shrink-0">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={userList.length} />
        </div>
      </div>

      {/* ════════════════════════════════════════════
          DEPOSIT MODAL — สแกน QR / เพิ่มคะแนน
      ════════════════════════════════════════════ */}
      <Dialog open={isDepositOpen} onOpenChange={(open) => { if (!open) closeDepositModal(); }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90dvh] overflow-y-auto scrollbar-hide rounded-2xl md:rounded-[2rem] p-0 border-none shadow-2xl">

          {/* ── Step: scan ── */}
          {depositStep === 'scan' && (
            <div>
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-5 text-white flex items-center justify-between rounded-t-2xl md:rounded-t-[2rem]">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2"><QrCode className="w-5 h-5" /> สแกน QR ลูกค้า</h3>
                  <p className="text-green-100 text-xs mt-0.5">ให้ลูกค้าเปิด QR จากแอป แล้วนำมาสแกน</p>
                </div>
                <button onClick={closeDepositModal} className="p-2 bg-white/20 hover:bg-white/30 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {!scanning ? (
                  <button onClick={startScanner}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-green-700 active:scale-95 transition-all shadow-lg">
                    <Camera className="w-5 h-5" /> เปิดกล้องสแกน QR
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div id="admin-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-green-100" />
                    <button onClick={stopScanner}
                      className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100">
                      <X className="w-4 h-4" /> ยกเลิกสแกน
                    </button>
                  </div>
                )}

                <div className="border-t pt-4 space-y-2">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">หรือกรอก User ID เอง</p>
                  <div className="flex gap-2">
                    <input
                      type="text" placeholder="User ID ของสมาชิก..." value={manualUserId}
                      onChange={e => setManualUserId(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchDepositUser(manualUserId)}
                      className="flex-1 p-3 text-sm font-bold border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                    />
                    <button onClick={() => fetchDepositUser(manualUserId)}
                      className="px-4 py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all">
                      ค้นหา
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ── Step: form ── */}
          {depositStep === 'form' && depositUser && (
            <div>
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-5 text-white flex items-center justify-between rounded-t-2xl md:rounded-t-[2rem]">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2"><Weight className="w-5 h-5" /> บันทึกรับฝากขยะ</h3>
                  <p className="text-green-100 text-xs mt-0.5">กรอกรายละเอียดการรับฝาก</p>
                </div>
                <button onClick={closeDepositModal} className="p-2 bg-white/20 hover:bg-white/30 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {/* User info */}
                <div className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 border border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-green-100 overflow-hidden flex items-center justify-center shrink-0">
                    {depositUser.profile_image && !depositUser.profile_image.includes('default.png')
                      ? <img src={depositUser.profile_image} className="w-full h-full object-cover" />
                      : <User className="w-6 h-6 text-green-600" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 truncate">{depositUser.firstname} {depositUser.lastname}</p>
                    <p className="text-xs text-slate-500">@{depositUser.username}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] text-slate-400 font-bold">คะแนนปัจจุบัน</p>
                    <p className="font-black text-yellow-500">{Number(depositUser.points).toLocaleString('th-TH')}</p>
                  </div>
                  <button onClick={() => { setDepositUser(null); setDepositStep('scan'); }}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors ml-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Waste type */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">ประเภทขยะ</span>
                  <div className="relative">
                    <select
                      value={selectedType}
                      onChange={e => setSelectedType(e.target.value)}
                      className="w-full p-3 pr-8 text-sm font-bold border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none"
                    >
                      <option value="">-- เลือกประเภทขยะ --</option>
                      {wasteTypes.map(w => (
                        <option key={w.id} value={w.name}>
                          {w.name} — {w.points_per_kg} แต้ม/กก.
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Weight */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">น้ำหนัก (กก.)</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0.01" placeholder="0.00"
                      value={weightKg} onChange={e => setWeightKg(e.target.value)}
                      className="flex-1 p-3 text-xl font-black border rounded-xl bg-slate-50 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center"
                    />
                    <span className="text-base font-black text-slate-400">กก.</span>
                  </div>
                </div>

                {/* Preview */}
                {estimatedPoints > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                      <span className="text-sm font-bold text-green-700">คะแนนที่จะได้รับ</span>
                      <span className="text-xl font-black text-green-600">+{estimatedPoints.toLocaleString('th-TH')}</span>
                    </div>
                    <div className="flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                      <span className="text-sm font-bold text-sky-700 flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5" /> ลด CO2</span>
                      <span className="text-sm font-black text-sky-600">{estimatedCo2} kgCO2e</span>
                    </div>
                    <div className="flex items-center justify-between bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
                      <span className="text-sm font-bold text-yellow-700">คะแนนรวมหลังบันทึก</span>
                      <span className="text-sm font-black text-yellow-600">{(depositUser.points + estimatedPoints).toLocaleString('th-TH')}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveDeposit}
                  disabled={saving || !selectedType || !weightKg || Number(weightKg) <= 0}
                  className="w-full py-4 bg-green-600 text-white rounded-2xl font-black text-base hover:bg-green-700 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                >
                  {saving
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> กำลังบันทึก...</>
                    : <><Send className="w-5 h-5" /> บันทึก & แจ้งเตือน LINE</>
                  }
                </button>
              </div>
            </div>
          )}

          {/* ── Step: done ── */}
          {depositStep === 'done' && depositResult && (
            <div>
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-8 text-white text-center rounded-t-2xl md:rounded-t-[2rem]">
                <CheckCircle2 className="w-16 h-16 mx-auto mb-3" />
                <h3 className="font-black text-2xl">บันทึกสำเร็จ!</h3>
                <p className="text-green-100 text-sm mt-1">
                  {lineStatus === 'sending' && 'กำลังส่ง LINE แจ้งเตือน...'}
                  {lineStatus === 'sent' && '✅ ส่ง LINE แจ้งลูกค้าแล้ว'}
                  {lineStatus === 'failed' && '⚠️ ส่ง LINE ไม่สำเร็จ (ไม่มี line_user_id)'}
                </p>
              </div>

              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-500 text-sm">สมาชิก</span>
                  <span className="font-black text-slate-800">{depositUser?.firstname} {depositUser?.lastname}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-500 text-sm">ประเภท / น้ำหนัก</span>
                  <span className="font-black text-slate-700">{depositResult.wasteType} {depositResult.weightKg} กก.</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-500 text-sm">คะแนนที่ได้รับ</span>
                  <span className="font-black text-2xl text-green-600">+{depositResult.pointsEarned.toLocaleString('th-TH')}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                  <span className="font-bold text-slate-500 text-sm">คะแนนรวม</span>
                  <span className="font-black text-xl text-yellow-500">{depositResult.newTotal.toLocaleString('th-TH')}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="font-bold text-slate-500 text-sm flex items-center gap-1.5"><Leaf className="w-3.5 h-3.5 text-sky-500" /> ลด CO2</span>
                  <span className="font-black text-sky-600">{depositResult.co2Reduced} kgCO2e</span>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => { setDepositUser(null); setDepositStep('scan'); setDepositResult(null); setLineStatus(''); setSelectedType(''); setWeightKg(''); }}
                    className="py-3 bg-green-600 text-white rounded-2xl font-black text-sm hover:bg-green-700 active:scale-95 transition-all"
                  >
                    รับฝากรายถัดไป
                  </button>
                  <button onClick={closeDepositModal}
                    className="py-3 bg-slate-100 text-slate-600 rounded-2xl font-black text-sm hover:bg-slate-200 active:scale-95 transition-all">
                    ปิด
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════════════════════════════════════════
          EDIT USER DIALOG
      ════════════════════════════════════════════ */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <DialogContent className="w-[95%] max-w-[450px] max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl md:rounded-[2rem] p-5 md:p-6 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg md:text-xl font-black tracking-tight">แก้ไขข้อมูลสมาชิก</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex justify-center mb-4">
              <label className="relative w-24 h-24 md:w-28 md:h-28 rounded-full border-4 border-dashed border-primary/20 cursor-pointer hover:border-primary/50 transition-all overflow-hidden group">
                {(formData.profile_image && !formData.profile_image.includes('default.png')) ? (
                  <img src={formData.profile_image} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-muted text-muted-foreground group-hover:text-primary transition-all text-center">
                    <Upload className="w-5 h-5 mb-1" />
                    <span className="text-[8px] md:text-[9px] font-black uppercase px-2">เปลี่ยนรูป</span>
                  </div>
                )}
                <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">ชื่อ</span>
                  <input type="text" value={formData.firstname} onChange={e => setFormData({...formData, firstname: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">นามสกุล</span>
                  <input type="text" value={formData.lastname} onChange={e => setFormData({...formData, lastname: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-yellow-600 ml-2">คะแนนสะสม</span>
                  <input type="number" value={formData.points} onChange={e => setFormData({...formData, points: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-yellow-500/20 border-transparent focus:border-yellow-500" required />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">เบอร์ติดต่อ</span>
                  <input type="text" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 ml-2">ระดับผู้ใช้</span>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-blue-500/20 border-transparent focus:border-blue-500">
                    <option value="user">สมาชิกทั่วไป</option>
                    <option value="admin">ผู้ดูแลระบบ</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-red-600 ml-2">สถานะบัญชี</span>
                  <select value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-red-500/20 border-transparent focus:border-red-500">
                    <option value="active">ใช้งานปกติ</option>
                    <option value="banned">ระงับการใช้งาน</option>
                  </select>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button type="submit" disabled={uploading} className="w-full py-4 bg-primary text-white rounded-xl font-black text-sm md:text-base hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {uploading ? 'กำลังบันทึก...' : 'บันทึกข้อมูลผู้ใช้'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}