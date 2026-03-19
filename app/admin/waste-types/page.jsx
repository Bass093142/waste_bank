"use client";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import { Plus, Edit2, Trash2 as DeleteIcon, Upload, Weight, Cloud, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminWasteTypes() {
  const { lang } = useLanguage();

  const [wasteTypes, setWasteTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(8);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldImageUrl, setOldImageUrl] = useState(null);

  const [formData, setFormData] = useState({
    id: null, name: '', points_per_kg: '', co2_factor: '', description: '', image: '', active: true
  });

  // ── i18n text ──
  const tx = {
    title:          lang === 'th' ? 'ประเภทขยะ'                    : 'Waste Types',
    subtitle:       lang === 'th' ? 'รายการในระบบ'                  : 'items in system',
    addNew:         lang === 'th' ? 'เพิ่มประเภทขยะใหม่'            : 'Add Waste Type',
    editTitle:      lang === 'th' ? 'แก้ไขประเภทขยะ'               : 'Edit Waste Type',
    noData:         lang === 'th' ? 'ไม่พบข้อมูลประเภทขยะ'          : 'No waste types found',
    fieldName:      lang === 'th' ? 'ชื่อประเภทขยะ'                 : 'Waste Type Name',
    fieldPts:       lang === 'th' ? 'แต้มต่อ 1 กก.'                 : 'Points / kg',
    fieldCo2:       lang === 'th' ? 'ค่าลดคาร์บอน'                  : 'CO2 Factor',
    fieldDesc:      lang === 'th' ? 'รายละเอียด (ตัวเลือก)'          : 'Description (optional)',
    fieldActive:    lang === 'th' ? 'เปิดรับฝากขยะประเภทนี้'        : 'Accept this waste type',
    uploadImg:      lang === 'th' ? 'อัปโหลดรูปภาพขยะ'              : 'Upload Waste Image',
    processing:     lang === 'th' ? 'กำลังประมวลผล...'              : 'Processing...',
    save:           lang === 'th' ? 'บันทึกประเภทขยะ'               : 'Save Waste Type',
    ptsPerKg:       lang === 'th' ? 'แต้ม/กก.'                      : 'pts/kg',
    ptsCo2:         lang === 'th' ? 'kgCO2'                         : 'kgCO2',
    ptsLabel:       lang === 'th' ? 'แต้มที่ได้'                    : 'Points',
    co2Label:       lang === 'th' ? 'ลด CO2'                        : 'CO2 Saved',
    confirmDelete:  lang === 'th' ? 'คุณต้องการลบ'                  : 'Delete',
    confirmWarning: lang === 'th' ? 'ข้อมูลนี้อาจส่งผลต่อประวัติการฝากขยะ' : 'This may affect deposit history',
    deleteError:    lang === 'th' ? 'ไม่สามารถลบได้ เนื่องจากมีการใช้งานอยู่' : 'Cannot delete: item in use',
    toastAdd:       lang === 'th' ? 'เพิ่มประเภทขยะใหม่สำเร็จ'       : 'Waste type added',
    toastEdit:      lang === 'th' ? 'แก้ไขข้อมูลสำเร็จ'              : 'Updated successfully',
    toastDelete:    lang === 'th' ? 'ลบประเภทขยะสำเร็จ'              : 'Deleted successfully',
    toastUploadErr: lang === 'th' ? 'อัปโหลดรูปไม่สำเร็จ'            : 'Upload failed',
    toastSaveErr:   lang === 'th' ? 'บันทึกไม่สำเร็จ'                : 'Save failed',
    namePlaceholder:lang === 'th' ? 'เช่น ขวดพลาสติกใส (PET)'        : 'e.g. Clear PET Bottle',
    descPlaceholder:lang === 'th' ? 'เช่น ต้องแกะฉลากและฝาออกก่อนนำมาฝาก...' : 'e.g. Remove label and cap before depositing...',
  };

  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 640) setItemsPerPage(4);
      else if (w < 1280) setItemsPerPage(6);
      else setItemsPerPage(8);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
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
      toast.error(`${tx.toastUploadErr}: ${error.message}`);
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
    setUploading(true);
    try {
      if (isEditing && oldImageUrl && oldImageUrl !== formData.image) {
        await deleteImageFromStorage(oldImageUrl);
      }
      const payload = {
        name: formData.name,
        points_per_kg: Number(formData.points_per_kg),
        co2_factor: Number(formData.co2_factor),
        description: formData.description,
        image: formData.image,
        active: formData.active
      };
      if (isEditing) {
        const { error } = await supabase.from('waste_types').update(payload).eq('id', formData.id);
        if (error) throw error;
        toast.success(tx.toastEdit);
      } else {
        const { error } = await supabase.from('waste_types').insert([payload]);
        if (error) throw error;
        toast.success(tx.toastAdd);
      }
      setIsDialogOpen(false);
      fetchWasteTypes();
    } catch (err) {
      toast.error(`${tx.toastSaveErr}: ${err.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (waste) => {
    if (confirm(`${tx.confirmDelete} "${waste.name}"? ${tx.confirmWarning}`)) {
      const { error } = await supabase.from('waste_types').delete().eq('id', waste.id);
      if (error) {
        toast.error(tx.deleteError);
      } else {
        if (waste.image) await deleteImageFromStorage(waste.image);
        toast.success(tx.toastDelete);
        fetchWasteTypes();
      }
    }
  };

  const openForm = (waste = null) => {
    if (waste) {
      setFormData(waste);
      setOldImageUrl(waste.image);
      setIsEditing(true);
    } else {
      setFormData({ id: null, name: '', points_per_kg: '', co2_factor: '', description: '', image: '', active: true });
      setOldImageUrl(null);
      setIsEditing(false);
    }
    setIsDialogOpen(true);
  };

  const totalPages = Math.ceil(wasteTypes.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedWasteTypes = wasteTypes.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 sm:space-y-6 p-2 sm:p-0 transition-colors">
      <div className="bg-card rounded-2xl sm:rounded-[2rem] border border-border shadow-xl flex flex-col overflow-hidden transition-colors">

        {/* ── Header ── */}
        <div className="p-4 sm:p-6 lg:p-8 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between bg-card/80 backdrop-blur-md gap-4 transition-colors">
          <div className="space-y-1">
            <h3 className="font-black text-lg sm:text-xl leading-tight text-foreground">{tx.title}</h3>
            <p className="text-xs sm:text-sm text-muted-foreground font-medium opacity-70">
              {lang === 'th'
                ? `มีทั้งหมด ${wasteTypes.length} ${tx.subtitle}`
                : `${wasteTypes.length} ${tx.subtitle}`}
            </p>
          </div>
          <button
            onClick={() => openForm()}
            className="w-full sm:w-auto px-5 sm:px-6 py-3 bg-primary text-primary-foreground rounded-xl sm:rounded-2xl hover:bg-primary/90 flex items-center justify-center gap-2 sm:gap-3 transition-all active:scale-95 shadow-lg font-black shrink-0 text-sm sm:text-base"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> {tx.addNew}
          </button>
        </div>

        {/* ── Grid ── */}
        <div className="p-3 sm:p-5 lg:p-8 flex-1 overflow-y-auto scrollbar-hide bg-background/30 dark:bg-background/10 transition-colors">
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {loading ? (
              Array.from({ length: itemsPerPage }).map((_, i) => (
                <div key={i} className="space-y-3 border border-border rounded-2xl p-3 sm:p-4 bg-card">
                  <Skeleton className="aspect-square w-full rounded-xl" />
                  <Skeleton className="h-5 w-3/4 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                </div>
              ))
            ) : wasteTypes.length === 0 ? (
              <div className="col-span-full text-center py-16 sm:py-20 text-muted-foreground/30">
                <ImageIcon className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4" />
                <p className="font-bold text-sm sm:text-base">{tx.noData}</p>
              </div>
            ) : (
              displayedWasteTypes.map((waste) => (
                <div
                  key={waste.id}
                  className="bg-card border border-border/50 rounded-2xl sm:rounded-[2rem] p-3 sm:p-4 lg:p-5 relative group hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-1"
                >
                  {/* ปุ่มแก้ไข/ลบ */}
                  <div className="absolute top-2 right-2 sm:top-3 sm:right-3 flex gap-1.5 sm:gap-2 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button
                      onClick={() => openForm(waste)}
                      className="p-1.5 sm:p-2 bg-card/90 dark:bg-slate-800/90 shadow-md border border-border rounded-lg text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                    >
                      <Edit2 className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(waste)}
                      className="p-1.5 sm:p-2 bg-card/90 dark:bg-slate-800/90 shadow-md border border-border rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                    >
                      <DeleteIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>

                  {/* Badge สถานะ */}
                  <div className={`absolute top-2 left-2 sm:top-3 sm:left-3 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-black border z-10 ${waste.active ? 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20' : 'bg-slate-500/10 text-slate-500 dark:text-slate-400 border-slate-500/20'}`}>
                    {waste.active ? '● Open' : '○ Closed'}
                  </div>

                  {/* รูปภาพ */}
                  <div className="aspect-square w-full rounded-xl sm:rounded-2xl bg-muted mb-3 sm:mb-4 overflow-hidden border border-border/30 shadow-inner flex items-center justify-center mt-5 sm:mt-6">
                    {waste.image ? (
                      <img src={waste.image} alt={waste.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    ) : (
                      <ImageIcon className="text-muted-foreground/20 w-10 h-10 sm:w-16 sm:h-16" />
                    )}
                  </div>

                  <h4 className="font-black text-sm sm:text-base lg:text-xl truncate text-foreground mb-2 sm:mb-3 leading-tight">
                    {waste.name}
                  </h4>

                  {/* Stats */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between bg-green-50 dark:bg-green-900/20 px-2.5 py-1.5 rounded-lg text-green-700 dark:text-green-400 border border-transparent dark:border-green-800/30 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <Weight className="w-3.5 h-3.5" />
                        <span className="text-[10px] sm:text-xs font-bold">{tx.ptsLabel}</span>
                      </div>
                      <span className="font-black text-[10px] sm:text-xs">{waste.points_per_kg} {tx.ptsPerKg}</span>
                    </div>
                    <div className="flex items-center justify-between bg-sky-50 dark:bg-sky-900/20 px-2.5 py-1.5 rounded-lg text-sky-700 dark:text-sky-400 border border-transparent dark:border-sky-800/30 transition-colors">
                      <div className="flex items-center gap-1.5">
                        <Cloud className="w-3.5 h-3.5" />
                        <span className="text-[10px] sm:text-xs font-bold">{tx.co2Label}</span>
                      </div>
                      <span className="font-black text-[10px] sm:text-xs">{waste.co2_factor} {tx.ptsCo2}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* ── Pagination ── */}
        {wasteTypes.length > 0 && (
          <div className="p-3 sm:p-4 lg:p-6 border-t border-border bg-muted/10 shrink-0 transition-colors">
            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={wasteTypes.length} />
          </div>
        )}
      </div>

      {/* ── Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCloseForm(); }}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[450px] max-h-[90dvh] overflow-y-auto scrollbar-hide rounded-2xl sm:rounded-[2rem] p-4 sm:p-6 border border-border bg-card text-foreground shadow-2xl mx-auto transition-colors [&>button:last-child]:text-muted-foreground">
          <DialogHeader className="mb-3 sm:mb-4">
            <DialogTitle className="text-lg sm:text-xl font-black tracking-tight text-foreground">
              {isEditing ? tx.editTitle : tx.addNew}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSave} className="space-y-4">
            {/* Upload */}
            <label className="flex flex-col items-center justify-center w-full min-h-[100px] sm:min-h-[120px] max-h-[200px] sm:max-h-[250px] border-4 border-dashed border-green-500/20 dark:border-green-500/30 rounded-xl sm:rounded-[1.5rem] cursor-pointer hover:bg-green-50 dark:hover:bg-muted/30 transition-all overflow-hidden relative group bg-muted/20">
              {formData.image ? (
                <img src={formData.image} alt="Preview" className="max-h-[200px] sm:max-h-[250px] w-auto object-contain" />
              ) : (
                <div className="text-center text-muted-foreground group-hover:text-green-600 transition-all p-4">
                  <Upload className="mx-auto mb-2 w-7 h-7 sm:w-8 sm:h-8" />
                  <p className="text-[10px] font-black uppercase tracking-wider">{tx.uploadImg}</p>
                </div>
              )}
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
              {uploading && (
                <div className="absolute inset-0 bg-card/70 flex items-center justify-center">
                  <div className="w-6 h-6 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </label>

            <div className="space-y-3 sm:space-y-4">
              {/* ชื่อ */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{tx.fieldName}</span>
                <input type="text" placeholder={tx.namePlaceholder} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground transition-all outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" required />
              </div>

              {/* แต้ม + CO2 */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400 ml-2">{tx.fieldPts}</span>
                  <input type="number" placeholder="0" value={formData.points_per_kg} onChange={e => setFormData({ ...formData, points_per_kg: e.target.value })}
                    className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground transition-all outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" required />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-sky-600 dark:text-sky-400 ml-2 leading-tight block">{tx.fieldCo2}</span>
                  <input type="number" step="0.01" placeholder="0.00" value={formData.co2_factor} onChange={e => setFormData({ ...formData, co2_factor: e.target.value })}
                    className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground transition-all outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500" required />
                </div>
              </div>

              {/* รายละเอียด */}
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">{tx.fieldDesc}</span>
                <textarea placeholder={tx.descPlaceholder} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full p-3 text-sm font-bold border border-border rounded-xl bg-muted/30 dark:bg-muted/20 text-foreground h-20 resize-none transition-all outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500" />
              </div>

              {/* Checkbox เปิด/ปิด */}
              <div className="flex items-center gap-2 px-2">
                <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })}
                  className="w-4 h-4 text-green-600 bg-card border-border rounded focus:ring-green-500" />
                <label htmlFor="active" className="text-sm font-bold text-foreground cursor-pointer">{tx.fieldActive}</label>
              </div>
            </div>

            <DialogFooter className="mt-4 sm:mt-6">
              <button type="submit" disabled={uploading}
                className="w-full py-3 sm:py-4 bg-green-600 text-white rounded-xl sm:rounded-[1.2rem] font-black text-sm sm:text-base hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 active:scale-95 disabled:opacity-50">
                {uploading ? tx.processing : tx.save}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}