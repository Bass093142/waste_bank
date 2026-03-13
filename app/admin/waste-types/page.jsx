"use client";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import { 
  Trash2, Plus, Edit2, Trash2 as DeleteIcon, Upload, Weight, Cloud 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminWasteTypes() {
  const [wasteTypes, setWasteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldImageUrl, setOldImageUrl] = useState(null);

  const [formData, setFormData] = useState({
    id: null, name: '', points_per_kg: 0, co2_factor: 0.00, description: '', image: '', active: true
  });

  // Adjust items per page based on screen size
  useEffect(() => {
    const updateItemsPerPage = () => {
      const width = window.innerWidth;
      if (width < 640) setItemsPerPage(4);       // mobile: 1 col × 4
      else if (width < 1024) setItemsPerPage(6); // tablet: 2 col × 3
      else if (width < 1280) setItemsPerPage(6); // lg: 3 col × 2
      else setItemsPerPage(8);                   // xl+: 4 col × 2
    };
    updateItemsPerPage();
    window.addEventListener('resize', updateItemsPerPage);
    return () => window.removeEventListener('resize', updateItemsPerPage);
  }, []);

  const fetchWasteTypes = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('waste_types').select('*').order('id', { ascending: false });
    if (!error) setWasteTypes(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchWasteTypes(); }, []);

  const getFileNameFromUrl = (url) => (url && url !== 'null' ? url.split('/').pop() : null);

  const deleteImageFromStorage = async (url) => {
    const fileName = getFileNameFromUrl(url);
    if (fileName) await supabase.storage.from('waste_images').remove([fileName]);
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
      const { error: uploadError } = await supabase.storage.from('waste_images').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('waste_images').getPublicUrl(fileName);
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
        await supabase.from('waste_types').update(formData).eq('id', formData.id);
      } else {
        await supabase.from('waste_types').insert([formData]);
      }
      setIsDialogOpen(false);
      fetchWasteTypes();
    } catch (err) { alert('บันทึกไม่สำเร็จ'); }
  };

  const handleDelete = async (waste) => {
    if (confirm(`คุณต้องการลบ "${waste.name}" ใช่หรือไม่? ข้อมูลนี้อาจส่งผลต่อประวัติการฝากขยะ`)) {
      await supabase.from('waste_types').delete().eq('id', waste.id);
      if (waste.image) await deleteImageFromStorage(waste.image);
      fetchWasteTypes();
    }
  };

  const openForm = (waste = null) => {
    if (waste) {
      setFormData(waste);
      setOldImageUrl(waste.image);
      setIsEditing(true);
    } else {
      setFormData({ id: null, name: '', points_per_kg: 0, co2_factor: 0.00, description: '', image: '', active: true });
      setOldImageUrl(null);
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const totalPages = Math.ceil(wasteTypes.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedWasteTypes = wasteTypes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0">
      <div className="bg-card rounded-2xl sm:rounded-[2rem] border shadow-xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="p-4 sm:p-6 lg:p-8 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 bg-white/50 backdrop-blur-md shrink-0">
          <div className="space-y-0.5 sm:space-y-1">
            <h3 className="font-black text-lg sm:text-xl leading-tight">หมวดหมู่ขยะที่รับฝาก</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium opacity-70">
              มีทั้งหมด {wasteTypes.length} ประเภทในระบบ
            </p>
          </div>
          <button 
            onClick={() => openForm()} 
            className="w-full sm:w-auto px-5 sm:px-8 py-2.5 sm:py-3 bg-green-600 text-white rounded-xl sm:rounded-2xl hover:bg-green-700 flex items-center justify-center gap-2 sm:gap-3 transition-all active:scale-95 shadow-lg font-black text-sm sm:text-base shrink-0"
          >
            <Plus className="w-5 h-5 sm:w-6 sm:h-6" /> เพิ่มประเภทขยะ
          </button>
        </div>

        {/* Grid */}
        <div className="p-4 sm:p-6 lg:p-8 flex-1 overflow-y-auto scrollbar-hide">
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
            {loading ? (
              Array.from({ length: itemsPerPage }).map((_, i) => (
                <div key={i} className="space-y-3 sm:space-y-4">
                  <Skeleton className="aspect-square w-full rounded-2xl sm:rounded-3xl" />
                  <Skeleton className="h-5 sm:h-6 w-3/4 rounded-lg" />
                  <Skeleton className="h-3 sm:h-4 w-1/2 rounded-lg" />
                </div>
              ))
            ) : (
              displayedWasteTypes.map((waste) => (
                <div 
                  key={waste.id} 
                  className={`bg-background border rounded-2xl sm:rounded-[2rem] p-3 sm:p-5 relative group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1 sm:hover:-translate-y-2 border-border/50 ${!waste.active ? 'opacity-50 grayscale' : ''}`}
                >
                  {/* Action buttons — always visible on mobile, hover on larger screens */}
                  <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all z-10 scale-100 sm:scale-90 sm:group-hover:scale-100">
                    <button 
                      onClick={() => openForm(waste)} 
                      className="p-2 sm:p-3 bg-white/90 shadow-lg border rounded-xl sm:rounded-2xl text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <Edit2 className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(waste)} 
                      className="p-2 sm:p-3 bg-white/90 shadow-lg border rounded-xl sm:rounded-2xl text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <DeleteIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                  </div>

                  {/* Image */}
                  <div className="aspect-square w-full rounded-xl sm:rounded-2xl bg-muted mb-3 sm:mb-5 overflow-hidden border border-border/30 shadow-inner">
                    {waste.image ? (
                      <img 
                        src={waste.image} 
                        alt={waste.name} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Trash2 className="text-muted-foreground/10 w-12 h-12 sm:w-20 sm:h-20" />
                      </div>
                    )}
                  </div>

                  {/* Name */}
                  <h4 className="font-black text-base sm:text-xl truncate text-foreground mb-2 sm:mb-4 leading-tight">
                    {waste.name}
                  </h4>

                  {/* Stats */}
                  <div className="flex flex-col gap-1.5 sm:gap-2">
                    <div className="flex items-center justify-between bg-green-500/10 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-green-700">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Weight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm font-bold">แต้มที่ได้</span>
                      </div>
                      <span className="font-black text-xs sm:text-sm">{waste.points_per_kg} แต้ม/กก.</span>
                    </div>
                    <div className="flex items-center justify-between bg-sky-500/10 px-2.5 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-sky-700">
                      <div className="flex items-center gap-1.5 sm:gap-2">
                        <Cloud className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="text-xs sm:text-sm font-bold">ลด CO2</span>
                      </div>
                      <span className="font-black text-xs sm:text-sm">{waste.co2_factor} kgCO2e</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pagination */}
        <div className="p-3 sm:p-4 lg:p-6 border-t bg-muted/10 shrink-0">
          <Pagination 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={setCurrentPage} 
            itemsPerPage={itemsPerPage} 
            totalItems={wasteTypes.length} 
          />
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[450px] max-h-[90dvh] overflow-y-auto scrollbar-hide rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border-none shadow-2xl mx-auto">
          <DialogHeader className="mb-3 sm:mb-4">
            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight">
              {isEditing ? 'แก้ไขประเภทขยะ' : 'เพิ่มประเภทขยะใหม่'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-3 sm:space-y-4">
            {/* Image Upload */}
            <label className="flex flex-col items-center justify-center w-full min-h-[100px] sm:min-h-[120px] max-h-[200px] sm:max-h-[250px] border-4 border-dashed border-primary/10 rounded-xl sm:rounded-[1.5rem] cursor-pointer hover:bg-primary/5 transition-all overflow-hidden relative group">
              {formData.image ? (
                <img src={formData.image} alt="Preview" className="max-h-[200px] sm:max-h-[250px] w-auto object-contain transition-transform" />
              ) : (
                <div className="text-center text-muted-foreground group-hover:text-primary transition-all p-4">
                  <Upload className="mx-auto mb-2 w-7 h-7 sm:w-8 sm:h-8" />
                  <p className="text-[10px] font-black uppercase tracking-wider">เลือกรูปภาพขยะ</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
            
            <div className="space-y-2 sm:space-y-3">
              {/* Name */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">ชื่อประเภทขยะ</span>
                <input 
                  type="text" 
                  placeholder="เช่น ขวดพลาสติกใส (PET)" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 focus:bg-background transition-all outline-none focus:ring-4 focus:ring-green-500/20 border-transparent focus:border-green-500" 
                  required 
                />
              </div>
              
              {/* Points & CO2 */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-600 ml-2">แต้มต่อ 1 กก.</span>
                  <input 
                    type="number" 
                    placeholder="0" 
                    value={formData.points_per_kg} 
                    onChange={e => setFormData({...formData, points_per_kg: e.target.value})} 
                    className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-4 focus:ring-green-500/20 border-transparent focus:border-green-500" 
                    required 
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 ml-2 leading-tight block">ค่าลดคาร์บอน</span>
                  <input 
                    type="number" 
                    step="0.01" 
                    placeholder="0.00" 
                    value={formData.co2_factor} 
                    onChange={e => setFormData({...formData, co2_factor: e.target.value})} 
                    className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 outline-none focus:ring-4 focus:ring-sky-500/20 border-transparent focus:border-sky-500" 
                    required 
                  />
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">รายละเอียด (ตัวเลือก)</span>
                <textarea 
                  placeholder="เช่น ต้องแกะฉลากและฝาออกก่อนนำมาฝาก..." 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  className="w-full p-3 text-sm font-bold border rounded-xl bg-muted/30 h-16 sm:h-20 resize-none outline-none focus:ring-4 focus:ring-primary/20 border-transparent focus:border-primary" 
                />
              </div>
              
              {/* Active toggle */}
              <div className="flex items-center gap-2 px-2">
                <input 
                  type="checkbox" 
                  id="active" 
                  checked={formData.active} 
                  onChange={e => setFormData({...formData, active: e.target.checked})} 
                  className="w-4 h-4 text-green-600 bg-muted border-gray-300 rounded focus:ring-green-500" 
                />
                <label htmlFor="active" className="text-sm font-bold text-muted-foreground">
                  เปิดรับฝากขยะประเภทนี้
                </label>
              </div>
            </div>

            <DialogFooter className="mt-3 sm:mt-4">
              <button 
                type="submit" 
                disabled={uploading} 
                className="w-full py-3 sm:py-4 bg-green-600 text-white rounded-xl sm:rounded-[1.2rem] font-black text-sm sm:text-base hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50"
              >
                {uploading ? 'กำลังอัปโหลด...' : 'บันทึกประเภทขยะ'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}