"use client";
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import { Edit2, Upload, User, ShieldCheck, Ban, Star, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function AdminUsers() {
  const [userList, setUserList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [oldImageUrl, setOldImageUrl] = useState(null);

  const [formData, setFormData] = useState({
    id: null, username: '', firstname: '', lastname: '', phone: '', 
    role: 'user', points: 0, status: 'active', profile_image: ''
  });

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
    if (!error) setUserList(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchUsers(); }, []);

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

      if (formData.profile_image && formData.profile_image !== oldImageUrl) {
        await deleteImageFromStorage(formData.profile_image);
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('profile_images').upload(fileName, file);
      if (uploadError) throw uploadError;
      
      const { data } = supabase.storage.from('profile_images').getPublicUrl(fileName);
      setFormData({ ...formData, profile_image: data.publicUrl });
    } catch (error) {
      alert('Error: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleCloseForm = async () => {
    if (formData.profile_image && formData.profile_image !== oldImageUrl) {
      await deleteImageFromStorage(formData.profile_image);
    }
    setIsDialogOpen(false);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      if (isEditing && oldImageUrl && oldImageUrl !== formData.profile_image) {
        await deleteImageFromStorage(oldImageUrl);
      }
      
      const payload = {
        firstname: formData.firstname,
        lastname: formData.lastname,
        phone: formData.phone,
        role: formData.role,
        points: formData.points,
        status: formData.status,
        profile_image: formData.profile_image
      };

      if (isEditing) {
        await supabase.from('users').update(payload).eq('id', formData.id);
      }
      setIsDialogOpen(false);
      fetchUsers();
    } catch (err) { alert('บันทึกไม่สำเร็จ'); }
  };

  const openForm = (user) => {
    if (user) {
      setFormData(user);
      setOldImageUrl(user.profile_image);
      setIsEditing(true);
      setIsDialogOpen(true);
    }
  };

  const totalPages = Math.ceil(userList.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedUsers = userList.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="bg-card rounded-2xl md:rounded-[2rem] border shadow-xl flex flex-col overflow-hidden">
        {/* Header - ปรับ Padding ตามอุปกรณ์ */}
        <div className="p-5 md:p-8 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between bg-white/50 backdrop-blur-md gap-4">
          <div className="space-y-1">
            <h3 className="font-black text-lg md:text-xl leading-tight">บัญชีสมาชิกทั้งหมด</h3>
            <p className="text-xs md:text-sm text-muted-foreground font-medium opacity-70">มีสมาชิกลงทะเบียน {userList.length} บัญชีในระบบ</p>
          </div>
        </div>

        {/* Content Area - ปรับ Grid ให้ยืดหยุ่น */}
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
                  {/* ปุ่มแก้ไข - ปรับขนาดให้กดง่าย */}
                  <div className="absolute top-3 right-3 flex gap-2 sm:opacity-0 group-hover:opacity-100 transition-all z-10">
                    <button onClick={() => openForm(user)} className="p-2 bg-white/90 shadow-md border rounded-lg text-blue-600 hover:bg-blue-50 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* รูปโปรไฟล์ - ย่อขนาดบนมือถือ */}
                  <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-muted overflow-hidden border-2 border-primary/20 shrink-0">
                    {user.profile_image && !user.profile_image.includes('default.png') ? (
                      <img src={user.profile_image} alt={user.username} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary">
                        <User className="w-6 h-6 md:w-8 md:h-8" />
                      </div>
                    )}
                  </div>

                  {/* ข้อมูลผู้ใช้ - ระบบตัดข้อความยาว */}
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
          {/* กรณีไม่มีข้อมูล */}
          {!loading && userList.length === 0 && (
             <div className="text-center py-20 opacity-30">
                <Search className="w-16 h-16 mx-auto mb-4" />
                <p className="font-bold">ไม่พบข้อมูลผู้ใช้งาน</p>
             </div>
          )}
        </div>

        {/* Footer - ปรับขนาด Pagination */}
        <div className="p-4 md:p-6 border-t bg-muted/10 shrink-0">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={userList.length} />
        </div>
      </div>

      {/* Dialog - ปรับให้ Scroll ได้ในแนวตั้งสำหรับจอเตี้ย */}
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