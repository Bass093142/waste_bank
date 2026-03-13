"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import { 
  Plus, PackageMinus, FileText, Wallet, ArrowDownRight, ArrowUpRight, Calendar, FilterX, Download 
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';

export default function AdminFinance() {
  const [funds, setFunds] = useState([]);
  const [wasteStock, setWasteStock] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;
  
  // 🟢 States สำหรับตัวกรอง วัน/เดือน/ปี
  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [txData, setTxData] = useState({ amount: '', type: 'income', description: '' });
  const [sellData, setSellData] = useState({ waste_type_id: '', weight: '', total_price: '' });

  const reportRef = useRef(null);

  const fetchFinanceData = async () => {
    setLoading(true);
    const { data: fundsData } = await supabase.from('funds').select('*').order('created_at', { ascending: false });
    if (fundsData) setFunds(fundsData);

    const { data: stockData } = await supabase
      .from('waste_stock')
      .select(`id, current_weight, waste_type_id, waste_types (name)`)
      .gt('current_weight', 0);
    if (stockData) setWasteStock(stockData);
    
    setLoading(false);
  };

  useEffect(() => { fetchFinanceData(); }, []);

  useEffect(() => { setCurrentPage(1); }, [filterYear, filterMonth, filterDay]);

  // 🟢 ประมวลผลตัวกรองข้อมูล (รองรับ วัน/เดือน/ปี)
  const filteredFunds = useMemo(() => {
    return funds.filter((tx) => {
      if (!tx.created_at) return false;
      const date = new Date(tx.created_at);
      const txYear = date.getFullYear().toString();
      const txMonth = (date.getMonth() + 1).toString().padStart(2, '0');
      const txDay = date.getDate().toString().padStart(2, '0');

      if (filterYear && txYear !== filterYear) return false;
      if (filterMonth && txMonth !== filterMonth) return false;
      if (filterDay && txDay !== filterDay) return false;
      return true;
    });
  }, [funds, filterYear, filterMonth, filterDay]);

  const totalIncome = filteredFunds.filter(f => f.type === 'income').reduce((sum, f) => sum + Number(f.amount), 0);
  const totalExpense = filteredFunds.filter(f => f.type === 'expense').reduce((sum, f) => sum + Number(f.amount), 0);
  const balance = totalIncome - totalExpense;

  const availableYears = [...new Set(funds.map(f => new Date(f.created_at).getFullYear().toString()))].sort((a, b) => b - a);
  const thaiMonths = [
    { val: '01', label: 'มกราคม' }, { val: '02', label: 'กุมภาพันธ์' }, { val: '03', label: 'มีนาคม' },
    { val: '04', label: 'เมษายน' }, { val: '05', label: 'พฤษภาคม' }, { val: '06', label: 'มิถุนายน' },
    { val: '07', label: 'กรกฎาคม' }, { val: '08', label: 'สิงหาคม' }, { val: '09', label: 'กันยายน' },
    { val: '10', label: 'ตุลาคม' }, { val: '11', label: 'พฤศจิกายน' }, { val: '12', label: 'ธันวาคม' }
  ];

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await supabase.from('funds').insert([{
        amount: Number(txData.amount),
        type: txData.type,
        description: txData.description
      }]);
      setIsTransactionDialogOpen(false);
      setTxData({ amount: '', type: 'income', description: '' });
      fetchFinanceData();
    } catch (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleSellWaste = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const selectedStock = wasteStock.find(s => s.waste_type_id.toString() === sellData.waste_type_id);
      const weightToSell = Number(sellData.weight);

      if (!selectedStock || weightToSell > selectedStock.current_weight) {
        alert('น้ำหนักที่ระบุ มากกว่าสต๊อกที่มีอยู่!');
        setProcessing(false);
        return;
      }

      const newWeight = selectedStock.current_weight - weightToSell;
      await supabase.from('waste_stock').update({ current_weight: newWeight }).eq('waste_type_id', selectedStock.waste_type_id);

      await supabase.from('funds').insert([{
        amount: Number(sellData.total_price),
        type: 'income',
        description: `ขายขยะ: ${selectedStock.waste_types.name} จำนวน ${weightToSell} กก.`
      }]);

      setIsSellDialogOpen(false);
      setSellData({ waste_type_id: '', weight: '', total_price: '' });
      fetchFinanceData();
      alert('บันทึกการขายและอัปเดตสต๊อกสำเร็จ!');
    } catch (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return alert("ไม่พบส่วนของตารางรายงานที่จะพิมพ์");
    try {
      setProcessing(true);
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width; 
      pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
      let fileName = 'รายงานการเงิน';
      if(filterYear) fileName += `_ปี${filterYear}`;
      pdf.save(`${fileName}.pdf`);
    } catch (error) {
      alert(`ไม่สามารถสร้าง PDF ได้: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const totalPages = Math.ceil(filteredFunds.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const displayedFunds = filteredFunds.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="space-y-8 h-auto">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-primary text-white p-6 rounded-[2rem] shadow-lg relative overflow-hidden">
          <Wallet className="absolute -bottom-4 -right-4 w-32 h-32 opacity-10" />
          <p className="text-primary-foreground/80 font-bold uppercase tracking-widest text-sm mb-2">ยอดเงินคงเหลือ</p>
          <h3 className="text-4xl font-black">{balance.toLocaleString('th-TH', { style: 'currency', currency: 'THB' })}</h3>
        </div>
        <div className="bg-card border p-6 rounded-[2rem] shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-green-500/10 rounded-2xl flex items-center justify-center mb-4 text-green-600"><ArrowDownRight className="w-6 h-6" /></div>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm mb-1">รายรับ</p>
          <h3 className="text-3xl font-black text-green-600">+{totalIncome.toLocaleString()} ฿</h3>
        </div>
        <div className="bg-card border p-6 rounded-[2rem] shadow-sm relative overflow-hidden">
          <div className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center mb-4 text-red-600"><ArrowUpRight className="w-6 h-6" /></div>
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm mb-1">รายจ่าย</p>
          <h3 className="text-3xl font-black text-red-600">-{totalExpense.toLocaleString()} ฿</h3>
        </div>
      </div>

      <div className="bg-card rounded-[2rem] border shadow-xl flex flex-col overflow-hidden mb-10">
        <div className="p-8 border-b flex flex-col xl:flex-row items-start xl:items-center justify-between bg-white/50 backdrop-blur-md gap-6">
          <div className="space-y-1">
            <h3 className="font-black text-xl leading-tight">ประวัติการทำรายการ</h3>
            <p className="text-sm text-muted-foreground font-medium opacity-70">พบ {filteredFunds.length} รายการ จากตัวกรองปัจจุบัน</p>
          </div>
          
          {/* 🟢 ตัวกรอง วัน เดือน ปี */}
          <div className="flex flex-wrap items-center gap-3 bg-muted/30 p-2 rounded-2xl border border-border/50">
            <Calendar className="w-4 h-4 ml-2 text-muted-foreground" />
            
            <select value={filterDay} onChange={e => setFilterDay(e.target.value)} className="px-3 py-2 text-sm font-bold border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 bg-white">
              <option value="">-- วันที่ --</option>
              {Array.from({length: 31}, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => (
                <option key={d} value={d}>{d}</option>
              ))}
            </select>

            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="px-3 py-2 text-sm font-bold border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 bg-white">
              <option value="">-- ทุกเดือน --</option>
              {thaiMonths.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>

            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="px-3 py-2 text-sm font-bold border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 bg-white">
              <option value="">-- ทุกปี --</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            
            {(filterYear || filterMonth || filterDay) && (
              <button onClick={() => {setFilterYear(''); setFilterMonth(''); setFilterDay('');}} className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-all">
                <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={exportPDF} disabled={processing} className="px-5 py-2.5 bg-slate-800 text-white rounded-xl hover:bg-slate-700 flex items-center gap-2 font-bold transition-all shadow-md">
              <Download className="w-4 h-4" /> พิมพ์ PDF
            </button>
            <button onClick={() => setIsTransactionDialogOpen(true)} className="px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 flex items-center gap-2 font-bold transition-all">
              <Plus className="w-4 h-4" /> บันทึกรายการ
            </button>
            <button onClick={() => setIsSellDialogOpen(true)} className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 font-bold transition-all shadow-lg">
              <PackageMinus className="w-4 h-4" /> ขายขยะ
            </button>
          </div>
        </div>

        <div className="p-8 bg-slate-50/50">
          <div ref={reportRef} className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm h-auto">
            <div className="text-center mb-8 pb-4 border-b-2 border-dashed border-gray-200">
              <h2 className="text-2xl font-black text-slate-800 mb-1">รายงานสรุปการเงิน</h2>
              <p className="text-sm font-bold text-slate-500">โครงการธนาคารขยะ</p>
              {(filterYear || filterMonth || filterDay) && (
                 <p className="text-sm font-bold text-primary mt-2">
                   ข้อมูลประจำ: {filterDay ? `วันที่ ${filterDay} ` : ''}{filterMonth ? `เดือน ${thaiMonths.find(m=>m.val===filterMonth)?.label} ` : ''}{filterYear ? `ปี ${filterYear}` : ''}
                 </p>
              )}
              <p suppressHydrationWarning className="text-xs font-bold text-slate-400 mt-2">พิมพ์เมื่อ: {new Date().toLocaleString('th-TH')}</p>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase">วันที่รายการ</th>
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase">รายละเอียด</th>
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase text-right">รายรับ (฿)</th>
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase text-right">รายจ่าย (฿)</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50"><td colSpan="4" className="p-4"><Skeleton className="h-8 w-full rounded-xl" /></td></tr>
                  ))
                ) : displayedFunds.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-12 text-muted-foreground font-bold">ไม่มีข้อมูลการทำรายการในวันที่ระบุ</td></tr>
                ) : (
                  displayedFunds.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-sm font-bold text-slate-600">
                        {new Date(tx.created_at).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-800">{tx.description || '-'}</td>
                      <td className="py-4 px-4 text-sm font-black text-right text-green-600">
                        {tx.type === 'income' ? `+${Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm font-black text-right text-red-500">
                        {tx.type === 'expense' ? `-${Number(tx.amount).toLocaleString('th-TH', { minimumFractionDigits: 2 })}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-6 border-t bg-muted/10 shrink-0">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredFunds.length} />
        </div>
      </div>

      {/* Dialog: บันทึกรายการใหม่ */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black tracking-tight">เพิ่มรายการบัญชีใหม่</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button type="button" onClick={() => setTxData({...txData, type: 'income'})} className={`p-4 rounded-2xl font-black border-2 transition-all ${txData.type === 'income' ? 'bg-green-500/10 border-green-500 text-green-700' : 'bg-muted border-transparent text-muted-foreground'}`}>รายรับ</button>
              <button type="button" onClick={() => setTxData({...txData, type: 'expense'})} className={`p-4 rounded-2xl font-black border-2 transition-all ${txData.type === 'expense' ? 'bg-red-500/10 border-red-500 text-red-700' : 'bg-muted border-transparent text-muted-foreground'}`}>รายจ่าย</button>
            </div>
            <div className="space-y-3">
              <input type="number" step="0.01" placeholder="จำนวนเงิน (บาท)" value={txData.amount} onChange={e => setTxData({...txData, amount: e.target.value})} className="w-full p-4 text-2xl font-black border rounded-2xl bg-muted/30 outline-none focus:ring-4 focus:ring-primary/20 text-center" required />
              <input type="text" placeholder="รายละเอียด..." value={txData.description} onChange={e => setTxData({...txData, description: e.target.value})} className="w-full p-4 text-sm font-bold border rounded-2xl bg-muted/30 outline-none focus:ring-4 focus:ring-primary/20" required />
            </div>
            <DialogFooter className="mt-8">
              <button type="submit" disabled={processing} className="w-full py-4 bg-primary text-white rounded-[1.2rem] font-black hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {processing ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: ขายขยะออก */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black tracking-tight text-green-700">ระบบจำหน่ายขยะรีไซเคิล</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSellWaste} className="space-y-5">
            <select value={sellData.waste_type_id} onChange={e => setSellData({...sellData, waste_type_id: e.target.value})} className="w-full p-4 text-sm font-bold border rounded-2xl bg-muted/30 outline-none focus:ring-4 focus:ring-green-500/20" required>
              <option value="" disabled>-- เลือกประเภทขยะ --</option>
              {wasteStock.map(stock => (
                <option key={stock.id} value={stock.waste_type_id}>{stock.waste_types.name} (คลัง: {stock.current_weight} กก.)</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder="น้ำหนัก (กก.)" value={sellData.weight} onChange={e => setSellData({...sellData, weight: e.target.value})} className="w-full p-4 text-lg font-black border rounded-2xl bg-muted/30 outline-none focus:ring-4 focus:ring-red-500/20" required />
              <input type="number" step="0.01" placeholder="ราคาขาย (บาท)" value={sellData.total_price} onChange={e => setSellData({...sellData, total_price: e.target.value})} className="w-full p-4 text-lg font-black border rounded-2xl bg-muted/30 outline-none focus:ring-4 focus:ring-green-500/20 text-green-700" required />
            </div>
            <DialogFooter className="mt-8">
              <button type="submit" disabled={processing} className="w-full py-4 bg-green-600 text-white rounded-[1.2rem] font-black hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {processing ? 'กำลังบันทึก...' : 'ยืนยันการขาย'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}