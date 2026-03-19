"use client";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import { Plus, Edit2, Trash2 as DeleteIcon, Package, Upload, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/app/contexts/LanguageContext';

// ── i18n keys เพิ่มเติมที่ใช้ในหน้านี้ (เพิ่มใน LanguageContext ด้วย) ──
// rewardsList, rewardCount, addReward, editReward, noRewards
// rewardName, rewardPoints, rewardStock, rewardDesc, uploadImage
// uploading, saveData, rewardPointsUnit, rewardStockLabel, confirmDeleteReward

export default function AdminRewards() {
  const { t, lang } = useLanguage();

  const [rewards, setRewards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldImageUrl, setOldImageUrl] = useState(null);

  const [formData, setFormData] = useState({
    id: null, name: '', points_required: 0, description: '', stock: 0, image: '',
  });

  // ── Text fallbacks (ถ้า LanguageContext ยังไม่มี key เหล่านี้) ──
  const tx = {
    rewardsList:    lang === 'th' ? 'รายการของรางวัล'      : 'Rewards List',
    rewardCount:    lang === 'th' ? 'รายการในระบบ'          : 'items in system',
    addReward:      lang === 'th' ? 'เพิ่มของรางวัลใหม่'    : 'Add Reward',
    editReward:     lang === 'th' ? 'แก้ไขของรางวัล'        : 'Edit Reward',
    noRewards:      lang === 'th' ? 'ไม่พบรายการของรางวัล'  : 'No rewards found',
    rewardName:     lang === 'th' ? 'ชื่อของรางวัล'         : 'Reward Name',
    rewardPoints:   lang === 'th' ? 'แต้มที่ใช้'            : 'Points Required',
    rewardStock:    lang === 'th' ? 'จำนวนในคลัง'           : 'Stock',
    rewardDesc:     lang === 'th' ? 'รายละเอียด'            : 'Description',
    uploadImage:    lang === 'th' ? 'เลือกรูปภาพ'           : 'Select Image',
    uploadingText:  lang === 'th' ? 'กำลังอัปโหลด...'       : 'Uploading...',
    saveData:       lang === 'th' ? 'บันทึกข้อมูล'          : 'Save',
    pointsUnit:     lang === 'th' ? 'แต้ม'                  : 'pts',
    stockLabel:     lang === 'th' ? 'คลัง'                  : 'Stock',
    confirmDelete:  lang === 'th' ? 'คุณต้องการลบ'          : 'Delete',
    specifyName:    lang === 'th' ? 'ระบุชื่อ...'           : 'Enter name...',
    specifyDetails: lang === 'th' ? 'ระบุข้อมูลเพิ่มเติม...' : 'Additional details...',
    saveFailed:     lang === 'th' ? 'บันทึกไม่สำเร็จ'       : 'Save failed',
  };

  const fetchRewards = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('rewards').select('*').order('id', { ascending: false });
    if (!error) setRewards(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchRewards(); }, []);

  const getFileNameFromUrl = (url) => (url && url !== 'null' ? url.split('/').pop() : null);

  const deleteImageFromStorage = async (url) => {
    const fileName = getFileNameFromUrl(url);
    if (fileName) await supabase.storage.from('rewards_images').remove([fileName]);
  };

  const handleImageUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;
      if (formData.image && formData.image !== oldImageUrl) {
        await deleteImageFromStorage(formData.image);
      }
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('rewards_images').upload(fileName, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('rewards_images').getPublicUrl(fileName);
      setFormData({ ...formData, image: data.publicUrl });
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseForm = async () => {
    if (formData.image && formData.image !== oldImageUrl) {
      await deleteImageFromStorage(formData.image);
    }
    setIsDialogOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && oldImageUrl && oldImageUrl !== formData.image) {
        await deleteImageFromStorage(oldImageUrl);
      }
      if (isEditing) {
        await supabase.from('rewards').update(formData).eq('id', formData.id);
      } else {
        await supabase.from('rewards').insert([formData]);
      }
      setIsDialogOpen(false);
      fetchRewards();
    } catch (err) { alert(tx.saveFailed); }
  };

  const handleDelete = async (reward) => {
    if (confirm(`${tx.confirmDelete} "${reward.name}"?`)) {
      await supabase.from('rewards').delete().eq('id', reward.id);
      if (reward.image) await deleteImageFromStorage(reward.image);
      fetchRewards();
    }
  };

  const openForm = (reward = null) => {
    if (reward) {
      setFormData(reward);
      setOldImageUrl(reward.image);
      setIsEditing(true);
    } else {
      setFormData({ id: null, name: '', points_required: 0, description: '', stock: 0, image: '' });
      setOldImageUrl(null);
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const totalPages = Math.ceil(rewards.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedRewards = rewards.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-card rounded-2xl md:rounded-[2rem] border border-border shadow-xl flex flex-col overflow-hidden transition-colors">

        {/* ── Header ── */}
        <div className="p-5 md:p-8 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card/80 backdrop-blur-md gap-4 transition-colors">
          <div className="space-y-1">
            <h3 className="font-black text-lg md:text-xl leading-tight text-foreground">{tx.rewardsList}</h3>
            <p className="text-xs md:text-sm text-muted-foreground font-medium opacity-70">
              {lang === 'th'
                ? `มีทั้งหมด ${rewards.length} ${tx.rewardCount}`
                : `${rewards.length} ${tx.rewardCount}`}
            </p>
          </div>
          <button
            onClick={() => openForm()}
            className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl md:rounded-2xl hover:bg-primary/90 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg font-black shrink-0"
          >
            <Plus className="w-5 h-5 md:w-6 md:h-6" /> {tx.addReward}
          </button>
        </div>

        {/* ── Content Grid ── */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto scrollbar-hide bg-background/30 dark:bg-background/10 transition-colors">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4 border border-border rounded-2xl p-4 bg-card">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg" />
                </div>
              ))
            ) : rewards.length === 0 ? (
              <div className="col-span-full text-center py-20 text-muted-foreground/30">
                <Search className="w-16 h-16 mx-auto mb-4" />
                <p className="font-bold">{tx.noRewards}</p>
              </div>
            ) : (
              displayedRewards.map((reward) => (
                <div
                  key={reward.id}
                  className="bg-card border border-border/50 rounded-2xl md:rounded-[2rem] p-4 md:p-5 relative group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1"
                >
                  {/* ปุ่มแก้ไข/ลบ */}
                  <div className="absolute top-3 right-3 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={() => openForm(reward)}
                      className="p-2 bg-card/90 dark:bg-slate-800/90 shadow-md border border-border rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(reward)}
                      className="p-2 bg-card/90 dark:bg-slate-800/90 shadow-md border border-border rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <DeleteIcon className="w-4 h-4" />
                    </button>
                  </div>

                  {/* รูปภาพ */}
                  <div className="aspect-square w-full rounded-xl md:rounded-2xl bg-muted mb-4 overflow-hidden border border-border/30 shadow-inner">
                    {reward.image ? (
                      <img src={reward.image} alt={reward.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="text-muted-foreground/10 w-12 h-12 md:w-20 md:h-20" />
                      </div>
                    )}
                  </div>

                  <h4 className="font-black text-base md:text-xl truncate text-foreground mb-3 leading-tight">{reward.name}</h4>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-primary font-black px-3 py-1.5 bg-primary/10 rounded-xl text-sm md:text-base">
                      {reward.points_required.toLocaleString()} {tx.pointsUnit}
                    </span>
                    <span className="text-muted-foreground font-bold text-[10px] md:text-sm bg-muted px-2.5 py-1 rounded-lg">
                      {tx.stockLabel}: {reward.stock}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        <div className="p-4 md:p-6 border-t border-border bg-muted/10 shrink-0">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={rewards.length} />
        </div>
      </div>

      {/* ── Dialog เพิ่ม/แก้ไข ── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <DialogContent className="w-[95%] max-w-[450px] max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl md:rounded-[2rem] p-5 md:p-8 border border-border shadow-2xl bg-card text-foreground transition-colors">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
              {isEditing ? tx.editReward : tx.addReward}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Upload รูป */}
            <label className="flex flex-col items-center justify-center w-full min-h-[140px] max-h-[220px] border-4 border-dashed border-primary/20 dark:border-primary/30 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all overflow-hidden relative group bg-muted/20">
              {formData.image ? (
                <img src={formData.image} alt="Preview" className="max-h-full w-auto object-contain" />
              ) : (
                <div className="text-center text-muted-foreground group-hover:text-primary transition-all p-4">
                  <Upload className="mx-auto mb-2 w-8 h-8" />
                  <p className="text-[10px] font-black uppercase tracking-wider">{tx.uploadImage}</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>

            <div className="space-y-4">
              {/* ชื่อ */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{tx.rewardName}</span>
                <input
                  type="text"
                  placeholder={tx.specifyName}
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  required
                />
              </div>

              {/* แต้ม + สต๊อก */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{tx.rewardPoints}</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.points_required}
                    onChange={e => setFormData({ ...formData, points_required: e.target.value })}
                    className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{tx.rewardStock}</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={formData.stock}
                    onChange={e => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>

              {/* รายละเอียด */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{tx.rewardDesc}</span>
                <textarea
                  placeholder={tx.specifyDetails}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground h-24 resize-none outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-4 bg-primary text-primary-foreground rounded-xl font-black text-sm md:text-base hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {uploading ? tx.uploadingText : tx.saveData}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}