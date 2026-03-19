"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import {
  Edit2, Upload, User, ShieldCheck, Ban, Star, Search,
  QrCode, Weight, ChevronDown, Loader2, CheckCircle2,
  Leaf, X, Camera, Plus, Send, ScanLine
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminUsers() {
  const { t, lang } = useLanguage();
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // ── Filter States ──
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGender, setFilterGender] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');

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
  const [depositStep, setDepositStep] = useState('scan'); 
  const [scanning, setScanning] = useState(false);
  const [depositUser, setDepositUser] = useState(null);
  const [wasteTypes, setWasteTypes] = useState([]);
  const [selectedType, setSelectedType] = useState('');
  const [weightKg, setWeightKg] = useState('');
  const [manualUserId, setManualUserId] = useState('');
  const [saving, setSaving] = useState(false);
  const [depositResult, setDepositResult] = useState(null);
  const [lineStatus, setLineStatus] = useState('');
  const html5QrRef = useRef(null);

  // ── AI Waste Classifier State (Real-time Camera) ──
  const [isAiCameraOpen, setIsAiCameraOpen] = useState(false);
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null); 
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

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

  const filteredUsers = useMemo(() => {
    return userList.filter((user) => {
      const searchMatch = `${user.firstname || ''} ${user.lastname || ''} ${user.username || ''}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const genderMatch = filterGender === 'all' || user.gender === filterGender;
      const statusMatch = filterStatus === 'all' || user.status === filterStatus;
      return searchMatch && genderMatch && statusMatch;
    });
  }, [userList, searchTerm, filterGender, filterStatus]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterGender, filterStatus]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedUsers = filteredUsers.slice(startIndex, startIndex + itemsPerPage);

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
    } catch (error) { toast.error('อัปโหลดรูปภาพไม่สำเร็จ'); }
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
      toast.success('บันทึกข้อมูลสมาชิกเรียบร้อย');
    } catch { toast.error('บันทึกข้อมูลไม่สำเร็จ'); }
  };

  const openForm = (user) => {
    if (user) {
      setFormData(user);
      setOldImageUrl(user.profile_image);
      setIsEditing(true);
      setIsDialogOpen(true);
    }
  };

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
    stopAiCamera();
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
        (decoded) => { stopScanner(); handleQrDecoded(decoded); },
        () => {}
      );
    } catch (err) {
      setScanning(false);
      toast.error('ไม่สามารถเปิดกล้องได้ โปรดตรวจสอบการอนุญาตใช้งานกล้อง');
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
    } catch { toast.error('QR Code ไม่ถูกต้อง กรุณาใช้ QR จากแอปเท่านั้น'); }
  };

  const fetchDepositUser = async (uid) => {
    const { data, error } = await supabase
      .from('users').select('id, firstname, lastname, username, points, profile_image, phone')
      .eq('id', uid).single();
    if (error || !data) { toast.error(`ไม่พบสมาชิก ID: ${uid}`); return; }
    setDepositUser(data);
    setDepositStep('form');
  };

  const startAiCamera = async () => {
    setIsAiCameraOpen(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) { videoRef.current.srcObject = stream; }
    } catch (err) {
      toast.error('ไม่สามารถเปิดกล้องได้ โปรดอนุญาตการใช้กล้อง');
      setIsAiCameraOpen(false);
    }
  };

  const stopAiCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(track => track.stop());
    }
    setIsAiCameraOpen(false);
    setAiResult(null);
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setIsAiAnalyzing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);

    try {
      const res = await fetch('/api/classify-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64Image }),
      });

      const data = await res.json();
      setAiResult(data);

      if (data.isMatch) {
        const matchedType = wasteTypes.find(w => w.name.includes(data.category) || data.category.includes(w.name));
        if (matchedType) { setSelectedType(matchedType.name); stopAiCamera(); } 
        else { setSelectedType(''); }
      } else { setSelectedType(''); }
    } catch (err) {
      toast.error('เชื่อมต่อ AI ไม่สำเร็จ กรุณาลองใหม่');
    } finally { setIsAiAnalyzing(false); }
  };

  const selectedWasteType = wasteTypes.find(w => w.name === selectedType);
  const estimatedPoints = selectedWasteType && weightKg ? Math.round(Number(weightKg) * selectedWasteType.points_per_kg) : 0;
  const estimatedCo2 = selectedWasteType && weightKg ? (Number(weightKg) * Number(selectedWasteType.co2_factor)).toFixed(3) : '0';

  const handleSaveDeposit = async () => {
    if (!depositUser || !selectedType || !weightKg || Number(weightKg) <= 0) { toast.warning('กรุณากรอกข้อมูลให้ครบและถูกต้อง'); return; }
    setSaving(true);
    try {
      const wt = wasteTypes.find(w => w.name === selectedType);
      const pointsEarned = Math.round(Number(weightKg) * (wt?.points_per_kg || 0));
      const co2Reduced = (Number(weightKg) * Number(wt?.co2_factor || 0)).toFixed(3);
      const newTotal = depositUser.points + pointsEarned;

      await supabase.from('deposit_stats').insert([{ user_id: depositUser.id, deposit_date: new Date().toISOString().split('T')[0], weight_kg: Number(weightKg), waste_type: selectedType }]);
      await supabase.from('point_history').insert([{ user_id: depositUser.id, points: pointsEarned, type: 'add', description: `ฝากขยะ ${selectedType} ${weightKg} กก.` }]);
      await supabase.from('users').update({ points: newTotal }).eq('id', depositUser.id);

      setDepositResult({ pointsEarned, newTotal, co2Reduced, wasteType: selectedType, weightKg: Number(weightKg) });
      setDepositStep('done');

      setLineStatus('sending');
      try {
        const res = await fetch('/api/notify-line', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: depositUser.id, name: `${depositUser.firstname} ${depositUser.lastname}`, wasteType: selectedType, weightKg: Number(weightKg), pointsEarned, totalPoints: newTotal, co2Reduced }),
        });
        setLineStatus(res.ok ? 'sent' : 'failed');
      } catch { setLineStatus('failed'); }

      fetchUsers(); 
    } catch (err) { toast.error('บันทึกไม่สำเร็จ โปรดลองอีกครั้ง'); } 
    finally { setSaving(false); }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-card rounded-2xl md:rounded-[2rem] border shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 md:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/50 dark:bg-slate-900/50 backdrop-blur-md gap-4 transition-colors">
          <div className="space-y-1">
            <h3 className="font-black text-lg md:text-xl leading-tight text-slate-800 dark:text-white">{t('allMembersAccount')}</h3>
            <p className="text-xs md:text-sm text-muted-foreground font-medium opacity-70">
              {t('registeredMembers1')}{userList.length}{t('registeredMembers2')}
            </p>
          </div>
          <button
            onClick={openDepositModal}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 bg-green-600 text-white rounded-xl sm:rounded-2xl font-black text-sm hover:bg-green-700 transition-all active:scale-95 shadow-lg"
          >
            <QrCode className="w-5 h-5" /> {t('scanQrDeposit')}
          </button>
        </div>

        {/* Filters */}
        <div className="px-5 md:px-8 py-4 bg-slate-50/50 dark:bg-slate-950/30 border-b border-border flex flex-col md:flex-row gap-3 transition-colors">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('searchUsersPlaceholder')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {/* Gender + Status dropdowns — เปลี่ยนภาษาตาม lang */}
          <div className="flex gap-2">
            <select
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
              className="px-3 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-800 rounded-xl outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <option value="all">{t('allGenders')}</option>
              <option value="male">{t('male')}</option>
              <option value="female">{t('female')}</option>
              <option value="not_specified">{t('notSpecified')}</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2.5 text-sm font-bold border border-slate-200 dark:border-slate-800 rounded-xl outline-none bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 cursor-pointer transition-colors"
            >
              <option value="all">{t('allStatuses')}</option>
              <option value="active">{t('activeStatus')}</option>
              <option value="banned">{t('bannedStatus')}</option>
            </select>
          </div>
        </div>

        {/* User Grid */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto scrollbar-hide bg-white dark:bg-slate-900 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 md:gap-6">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 border dark:border-slate-800 rounded-2xl">
                  <Skeleton className="w-12 h-12 md:w-16 md:h-16 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-3/4 rounded-lg" />
                    <Skeleton className="h-3 w-1/2 rounded-lg" />
                  </div>
                </div>
              ))
            ) : displayedUsers.length === 0 ? (
              <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
                <p className="font-bold">{t('noDataFound')}</p>
                <p className="text-sm">{t('tryChangeFilter')}</p>
              </div>
            ) : (
              displayedUsers.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center gap-4 p-4 bg-background border rounded-2xl relative group hover:shadow-lg transition-all duration-300 border-border/50 ${user.status === 'banned' ? 'bg-red-50/50 dark:bg-red-900/10 border-red-200 dark:border-red-900 opacity-80' : ''}`}
                >
                  <div className="absolute top-3 right-3 flex gap-1.5 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={() => { setDepositUser(user); setDepositStep('form'); setSelectedType(''); setWeightKg(''); setDepositResult(null); setLineStatus(''); setIsDepositOpen(true); }}
                      className="p-2 bg-white dark:bg-slate-800 shadow-md border dark:border-slate-700 rounded-lg text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
                      title={t('addPointsTitle')}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button onClick={() => openForm(user)} className="p-2 bg-white dark:bg-slate-800 shadow-md border dark:border-slate-700 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors" title={t('editTitle')}>
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted overflow-hidden border-2 border-primary/20 shrink-0">
                    {user.profile_image && !user.profile_image.includes('default.png') ? (
                      <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <User className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    )}
                  </div>

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
                      <span className="inline-flex items-center gap-1 text-[9px] md:text-[10px] font-bold px-2 py-0.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 rounded-md">
                        <Star className="w-2.5 h-2.5" /> {user.points.toLocaleString()}
                      </span>
                      <span className={`inline-flex items-center text-[9px] md:text-[10px] font-bold px-2 py-0.5 rounded-md ${user.status === 'active' ? 'bg-green-500/10 text-green-700 dark:text-green-400' : 'bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                        {user.status === 'active' ? t('normalBadge') : t('bannedBadge')}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-4 md:p-6 border-t bg-muted/10 shrink-0">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredUsers.length} />
        </div>
      </div>

      <Dialog open={isDepositOpen} onOpenChange={(open) => { if (!open) closeDepositModal(); }}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90dvh] overflow-y-auto scrollbar-hide rounded-2xl md:rounded-[2rem] p-0 border-none shadow-2xl [&>button:last-child]:hidden bg-white dark:bg-slate-900 transition-colors">
          
          <DialogHeader className="hidden">
            <DialogTitle>{t('wasteDepositSystem')}</DialogTitle>
          </DialogHeader>

          {/* ── Step: scan ── */}
          {depositStep === 'scan' && (
            <div>
              <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-5 text-white flex items-center justify-between rounded-t-2xl md:rounded-t-[2rem]">
                <div>
                  <h3 className="font-black text-lg flex items-center gap-2"><QrCode className="w-5 h-5" /> {t('scanCustomerQr')}</h3>
                </div>
                <button onClick={closeDepositModal} className="p-2 bg-white/20 hover:bg-white/30 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {!scanning ? (
                  <button onClick={startScanner}
                    className="w-full py-4 bg-green-600 text-white rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-green-700 active:scale-95 transition-all shadow-lg">
                    <Camera className="w-5 h-5" /> {t('openCameraScanQr')}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div id="admin-qr-reader" className="w-full rounded-2xl overflow-hidden border-4 border-green-100" />
                    <button onClick={stopScanner}
                      className="w-full py-3 bg-red-50 text-red-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-red-100">
                      <X className="w-4 h-4" /> {t('cancelScan')}
                    </button>
                  </div>
                )}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text" placeholder={t('userIdPlaceholder')} value={manualUserId}
                      onChange={e => setManualUserId(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && fetchDepositUser(manualUserId)}
                      className="flex-1 p-3 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-colors"
                    />
                    <button onClick={() => fetchDepositUser(manualUserId)}
                      className="px-4 py-3 bg-slate-800 dark:bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-slate-700 dark:hover:bg-emerald-500 active:scale-95 transition-all">
                      {t('searchBtn')}
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
                  <h3 className="font-black text-lg flex items-center gap-2"><Weight className="w-5 h-5" /> {t('recordWasteDeposit')}</h3>
                </div>
                <button onClick={closeDepositModal} className="p-2 bg-white/20 hover:bg-white/30 rounded-full">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-3 border border-slate-100 dark:border-slate-700 transition-colors">
                  <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/50 overflow-hidden flex items-center justify-center shrink-0">
                    {depositUser.profile_image && !depositUser.profile_image.includes('default.png')
                      ? <img src={depositUser.profile_image} className="w-full h-full object-cover" />
                      : <User className="w-6 h-6 text-green-600 dark:text-green-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-slate-800 dark:text-white truncate">{depositUser.firstname} {depositUser.lastname}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-black text-yellow-500">{Number(depositUser.points).toLocaleString('th-TH')}</p>
                  </div>
                </div>

                {/* --- AI Real-time Camera Section --- */}
                <div className="pt-2 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-slate-50 dark:bg-slate-800/30 transition-colors">
                  {!isAiCameraOpen ? (
                    <button 
                      onClick={startAiCamera}
                      className="w-full py-4 flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
                    >
                      <Camera className="w-5 h-5" /> {t('openAiCamera')}
                    </button>
                  ) : (
                    <div className="space-y-3 p-3">
                      <div className="relative rounded-lg overflow-hidden bg-black aspect-video flex items-center justify-center">
                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                        
                        <div className="absolute inset-0 border-2 border-indigo-500/50 m-4 rounded-xl pointer-events-none">
                          <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-400 rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-400 rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-400 rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-400 rounded-br-lg"></div>
                        </div>
                      </div>
                      
                      <canvas ref={canvasRef} className="hidden" />

                      <div className="flex gap-2">
                        <button 
                          onClick={captureAndAnalyze}
                          disabled={isAiAnalyzing}
                          className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
                        >
                          {isAiAnalyzing ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('thinking')}</> : <><ScanLine className="w-5 h-5" /> {t('analyzeImage')}</>}
                        </button>
                        <button 
                          onClick={stopAiCamera}
                          className="px-4 py-3 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors"
                        >
                          {t('closeCamera')}
                        </button>
                      </div>

                      {isAiAnalyzing && (
                        <div className="flex items-center gap-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl px-4 py-3">
                          <Loader2 className="w-5 h-5 text-indigo-500 dark:text-indigo-400 animate-spin shrink-0" />
                          <p className="text-sm font-bold text-indigo-700 dark:text-indigo-300">{t('aiAnalyzing')}</p>
                        </div>
                      )}

                      {!isAiAnalyzing && aiResult && (
                        <div className={`rounded-xl border px-4 py-3 space-y-1.5 ${
                          aiResult.isMatch
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                        }`}>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{aiResult.isMatch ? '✅' : '❌'}</span>
                            <p className={`text-sm font-black ${aiResult.isMatch ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>
                              {aiResult.isMatch
                                ? `${t('foundWaste')} ${aiResult.category}`
                                : `${t('detectedItemPrefix')} ${aiResult.detectedItem || t('alienObject')}`
                              }
                            </p>
                          </div>
                          <p className={`text-xs font-medium leading-relaxed ${aiResult.isMatch ? 'text-green-600 dark:text-green-500' : 'text-red-500 dark:text-red-400'}`}>
                            {aiResult.message}
                          </p>
                          {!aiResult.isMatch && (
                            <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 pt-0.5">
                              {t('notInSystemScanAgain')}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{t('wasteTypeLabel')}</span>
                  <div className="relative">
                    <select
                      value={selectedType}
                      onChange={e => setSelectedType(e.target.value)}
                      className="w-full p-3 pr-8 text-sm font-bold border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 appearance-none transition-colors"
                    >
                      <option value="" className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">{t('selectWasteType')}</option>
                      {wasteTypes.map(w => (
                        <option key={w.id} value={w.name} className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white">
                          {w.name} — {w.points_per_kg} {t('ptsPerKg')}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-1 pt-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 ml-1">{t('weightLabel')}</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number" step="0.01" min="0.01" placeholder="0.00"
                      value={weightKg} onChange={e => setWeightKg(e.target.value)}
                      className="flex-1 p-3 text-xl font-black border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center transition-colors"
                    />
                    <span className="text-base font-black text-slate-400">{t('kg')}</span>
                  </div>
                </div>

                {/* Preview */}
                {estimatedPoints > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl px-4 py-3 transition-colors">
                      <span className="text-sm font-bold text-green-700 dark:text-green-400">{t('pointsToReceive')}</span>
                      <span className="text-xl font-black text-green-600 dark:text-green-300">+{estimatedPoints.toLocaleString('th-TH')}</span>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSaveDeposit}
                  disabled={saving || !selectedType || !weightKg || Number(weightKg) <= 0 || isAiAnalyzing}
                  className="w-full py-4 mt-2 bg-green-600 text-white rounded-2xl font-black text-base hover:bg-green-700 flex items-center justify-center gap-3 active:scale-95 transition-all shadow-lg disabled:opacity-50"
                >
                  {saving
                    ? <><Loader2 className="w-5 h-5 animate-spin" /> {t('saving')}</>
                    : <><Send className="w-5 h-5" /> {t('saveAndNotifyLine')}</>
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
                <h3 className="font-black text-2xl">{t('saveSuccess')}</h3>
              </div>
              <div className="p-5 space-y-3">
                <div className="flex justify-between items-center py-3 border-b border-slate-100 dark:border-slate-800">
                  <span className="font-bold text-slate-500 dark:text-slate-400 text-sm">{t('typeWeight')}</span>
                  <span className="font-black text-slate-700 dark:text-white">{depositResult.wasteType} {depositResult.weightKg} {t('kg')}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    onClick={() => { setDepositUser(null); setDepositStep('scan'); setDepositResult(null); setLineStatus(''); setSelectedType(''); setWeightKg(''); }}
                    className="py-3 bg-green-600 text-white rounded-2xl font-black text-sm hover:bg-green-700 active:scale-95 transition-all"
                  >
                    {t('nextDeposit')}
                  </button>
                  <button onClick={closeDepositModal}
                    className="py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-2xl font-black text-sm hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all">
                    {t('closeBtn')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}