"use client";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import { 
  Plus, Edit2, Trash2 as DeleteIcon, Package, Upload, Search
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminRewards() {
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

  // 🟢 ฟังก์ชันดึงข้อมูลของรางวัลจากฐานข้อมูล
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

  // 🟢 ฟังก์ชันจัดการอัปโหลดรูปภาพไปยัง Supabase Storage
  const handleImageUpload = async (e) => {
    try {
      setUploading(true);
      const file = e.target.files[0];
      if (!file) return;

      // ลบรูปเก่าออกก่อนถ้ามีการเปลี่ยนรูป
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

  // 🟢 ฟังก์ชันบันทึกข้อมูล (เพิ่มใหม่ หรือ แก้ไข)
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
    } catch (err) { alert('บันทึกไม่สำเร็จ'); }
  };

  // 🟢 ฟังก์ชันลบข้อมูลของรางวัล
  const handleDelete = async (reward) => {
    if (confirm(`คุณต้องการลบ "${reward.name}"?`)) {
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
      <div className="bg-card rounded-2xl md:rounded-[2rem] border shadow-xl flex flex-col overflow-hidden">
        {/* Header - ปรับให้รองรับมือถือ */}
        <div className="p-5 md:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/50 backdrop-blur-md gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-lg md:text-xl leading-tight text-foreground">รายการของรางวัล</h3>
            <p className="text-xs md:text-sm text-muted-foreground font-medium opacity-70">มีทั้งหมด {rewards.length} รายการในระบบ</p>
          </div>
          <button 
            onClick={() => openForm()} 
            className="w-full sm:w-auto px-6 py-3 bg-primary text-primary-foreground rounded-xl md:rounded-2xl hover:bg-primary/90 flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg font-black shrink-0"
          >
            <Plus className="w-5 h-5 md:w-6 md:h-6" /> เพิ่มของรางวัลใหม่
          </button>
        </div>

        {/* Content Area - Grid แบบ Responsive */}
        <div className="p-4 md:p-8 flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-8">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-4 border rounded-2xl p-4">
                  <Skeleton className="aspect-square w-full rounded-2xl" />
                  <Skeleton className="h-6 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-1/2 rounded-lg" />
                </div>
              ))
            ) : rewards.length === 0 ? (
              <div className="col-span-full text-center py-20 opacity-30">
                <Search className="w-16 h-16 mx-auto mb-4" />
                <p className="font-bold">ไม่พบรายการของรางวัล</p>
              </div>
            ) : (
              displayedRewards.map((reward) => (
                <div 
                  key={reward.id} 
                  className="bg-background border rounded-2xl md:rounded-[2rem] p-4 md:p-5 relative group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 border-border/50"
                >
                  {/* ปุ่มจัดการ - ปรับขนาดให้กดง่ายบนทุกหน้าจอ */}
                  <div className="absolute top-3 right-3 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button onClick={() => openForm(reward)} className="p-2 bg-white/90 shadow-md border rounded-lg text-blue-600 hover:bg-blue-50 transition-colors"><Edit2 className="w-4 h-4" /></button>
                    <button onClick={() => handleDelete(reward)} className="p-2 bg-white/90 shadow-md border rounded-lg text-red-600 hover:bg-red-50 transition-colors"><DeleteIcon className="w-4 h-4" /></button>
                  </div>
                  
                  <div className="aspect-square w-full rounded-xl md:rounded-2xl bg-muted mb-4 overflow-hidden border border-border/30 shadow-inner">
                    {reward.image ? (
                      <img src={reward.image} alt={reward.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="text-muted-foreground/10 w-12 h-12 md:w-20 md:h-20" /></div>
                    )}
                  </div>
                  
                  <h4 className="font-black text-base md:text-xl truncate text-foreground mb-3 leading-tight">{reward.name}</h4>
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                    <span className="text-primary font-black px-3 py-1.5 bg-primary/10 rounded-xl text-sm md:text-base">
                      {reward.points_required.toLocaleString()} แต้ม
                    </span>
                    <span className="text-muted-foreground font-bold text-[10px] md:text-sm bg-muted px-2.5 py-1 rounded-lg">
                      คลัง: {reward.stock}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer - ปรับขนาดให้พอดีบนมือถือ */}
        <div className="p-4 md:p-6 border-t bg-muted/10 shrink-0">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={rewards.length} />
        </div>
      </div>

      {/* --- DIALOG - ปรับปรุงให้รองรับหน้าจอมือถือ --- */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <DialogContent className="w-[95%] max-w-[450px] max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl md:rounded-[2rem] p-5 md:p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">
              {isEditing ? 'แก้ไขของรางวัล' : 'เพิ่มของรางวัลใหม่'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4">
            <label className="flex flex-col items-center justify-center w-full min-h-[140px] max-h-[220px] border-4 border-dashed border-primary/10 rounded-2xl cursor-pointer hover:bg-primary/5 transition-all overflow-hidden relative group">
              {formData.image ? (
                <img 
                  src={formData.image} 
                  alt="Preview" 
                  className="max-h-full w-auto object-contain transition-transform" 
                />
              ) : (
                <div className="text-center text-muted-foreground group-hover:text-primary transition-all p-4">
                  <Upload className="mx-auto mb-2 w-8 h-8" />
                  <p className="text-[10px] font-black uppercase tracking-wider">เลือกรูปภาพ</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            
            <div className="space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">ชื่อของรางวัล</span>
                <input type="text" placeholder="ระบุชื่อ..." value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 focus:bg-background outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary" required />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">แต้มที่ใช้</span>
                  <input type="number" placeholder="0" value={formData.points_required} onChange={e => setFormData({...formData, points_required: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary" required />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">จำนวนในคลัง</span>
                  <input type="number" placeholder="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary" required />
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">รายละเอียด</span>
                <textarea placeholder="ระบุข้อมูลเพิ่มเติม..." value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 h-24 resize-none outline-none focus:ring-2 focus:ring-primary/20 border-transparent focus:border-primary" />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <button type="submit" disabled={uploading} className="w-full py-4 bg-primary text-white rounded-xl font-black text-sm md:text-base hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {uploading ? 'กำลังอัปโหลด...' : 'บันทึกข้อมูล'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}