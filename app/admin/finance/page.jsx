"use client";
import { useState, useEffect, useRef, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/app/components/ui/dialog";
import { Skeleton } from "@/app/components/ui/skeleton";
import { Pagination } from '@/app/components/ui/Pagination';
import { Plus, PackageMinus, Download, ArrowDownRight, ArrowUpRight, Wallet, FileText, FilterX, Calendar } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { useLanguage } from '@/app/contexts/LanguageContext';

export default function AdminFinance() {
  const { lang } = useLanguage();

  const [funds, setFunds] = useState([]);
  const [wasteStock, setWasteStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  const [filterYear, setFilterYear] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterDay, setFilterDay] = useState('');

  const [isTransactionDialogOpen, setIsTransactionDialogOpen] = useState(false);
  const [isSellDialogOpen, setIsSellDialogOpen] = useState(false);
  const [processing, setProcessing] = useState(false);

  const [txData, setTxData] = useState({ amount: '', type: 'income', description: '' });
  const [sellData, setSellData] = useState({ waste_type_id: '', weight: '', total_price: '' });

  const reportRef = useRef(null);

  // ── i18n ──
  const tx = {
    title:          lang === 'th' ? 'การเงิน'                         : 'Finance',
    subtitle:       lang === 'th' ? 'บัญชีรับ-จ่ายของโครงการ'          : 'Project income & expenses',
    exportPdf:      lang === 'th' ? 'พิมพ์ PDF'                        : 'Export PDF',
    addTx:          lang === 'th' ? 'บันทึกรายการ'                     : 'Add Transaction',
    sellWaste:      lang === 'th' ? 'ขายขยะ'                           : 'Sell Waste',
    income:         lang === 'th' ? 'รายรับ'                           : 'Income',
    expense:        lang === 'th' ? 'รายจ่าย'                          : 'Expense',
    balance:        lang === 'th' ? 'คงเหลือสุทธิ'                     : 'Net Balance',
    reportTitle:    lang === 'th' ? 'รายงานสรุปการเงิน'                : 'Finance Summary Report',
    reportProject:  lang === 'th' ? 'โครงการธนาคารขยะ'                 : 'Waste Bank Project',
    printedAt:      lang === 'th' ? 'พิมพ์เมื่อ'                       : 'Printed at',
    colDate:        lang === 'th' ? 'วันที่รายการ'                     : 'Date',
    colDesc:        lang === 'th' ? 'รายละเอียด'                       : 'Description',
    colIncome:      lang === 'th' ? 'รายรับ (฿)'                       : 'Income (฿)',
    colExpense:     lang === 'th' ? 'รายจ่าย (฿)'                      : 'Expense (฿)',
    noData:         lang === 'th' ? 'ไม่มีข้อมูลการทำรายการในวันที่ระบุ' : 'No transactions found',
    allDays:        lang === 'th' ? '-- ทุกวัน --'                     : '-- All Days --',
    allMonths:      lang === 'th' ? '-- ทุกเดือน --'                   : '-- All Months --',
    allYears:       lang === 'th' ? '-- ทุกปี --'                      : '-- All Years --',
    dataFor:        lang === 'th' ? 'ข้อมูลประจำ'                      : 'Data for',
    day:            lang === 'th' ? 'วันที่'                           : 'Day',
    monthLabel:     lang === 'th' ? 'เดือน'                            : 'Month',
    yearLabel:      lang === 'th' ? 'ปี'                               : 'Year',
    amountPlaceholder: lang === 'th' ? 'จำนวนเงิน (บาท)'              : 'Amount (THB)',
    descPlaceholder:   lang === 'th' ? 'รายละเอียด...'                 : 'Description...',
    saveBtn:        lang === 'th' ? 'บันทึกรายการ'                     : 'Save Transaction',
    saving:         lang === 'th' ? 'กำลังบันทึก...'                   : 'Saving...',
    addTxTitle:     lang === 'th' ? 'เพิ่มรายการบัญชีใหม่'             : 'New Transaction',
    sellTitle:      lang === 'th' ? 'ระบบจำหน่ายขยะรีไซเคิล'           : 'Sell Recycled Waste',
    selectWaste:    lang === 'th' ? '-- เลือกประเภทขยะ --'             : '-- Select Waste Type --',
    weightPlaceholder: lang === 'th' ? 'น้ำหนัก (กก.)'                : 'Weight (kg)',
    pricePlaceholder:  lang === 'th' ? 'ราคาขาย (บาท)'                : 'Sale Price (THB)',
    confirmSell:    lang === 'th' ? 'ยืนยันการขาย'                     : 'Confirm Sale',
    stockExceeded:  lang === 'th' ? 'น้ำหนักที่ระบุ มากกว่าสต๊อกที่มีอยู่!' : 'Weight exceeds available stock!',
    sellSuccess:    lang === 'th' ? 'บันทึกการขายและอัปเดตสต๊อกสำเร็จ!' : 'Sale recorded and stock updated!',
    saveError:      lang === 'th' ? 'บันทึกไม่สำเร็จ'                  : 'Save failed',
    sellWasteLabel: lang === 'th' ? 'ขายขยะ:'                          : 'Sold:',
    kg:             lang === 'th' ? 'กก.'                              : 'kg',
    stock:          lang === 'th' ? 'คลัง:'                            : 'Stock:',
  };

  const thaiMonths = lang === 'th'
    ? [
        { val: '01', label: 'มกราคม' }, { val: '02', label: 'กุมภาพันธ์' },
        { val: '03', label: 'มีนาคม' }, { val: '04', label: 'เมษายน' },
        { val: '05', label: 'พฤษภาคม' }, { val: '06', label: 'มิถุนายน' },
        { val: '07', label: 'กรกฎาคม' }, { val: '08', label: 'สิงหาคม' },
        { val: '09', label: 'กันยายน' }, { val: '10', label: 'ตุลาคม' },
        { val: '11', label: 'พฤศจิกายน' }, { val: '12', label: 'ธันวาคม' },
      ]
    : [
        { val: '01', label: 'January' }, { val: '02', label: 'February' },
        { val: '03', label: 'March' }, { val: '04', label: 'April' },
        { val: '05', label: 'May' }, { val: '06', label: 'June' },
        { val: '07', label: 'July' }, { val: '08', label: 'August' },
        { val: '09', label: 'September' }, { val: '10', label: 'October' },
        { val: '11', label: 'November' }, { val: '12', label: 'December' },
      ];

  const fetchFinanceData = async () => {
    setLoading(true);
    const { data: fundsData } = await supabase.from('funds').select('*').order('created_at', { ascending: false });
    if (fundsData) setFunds(fundsData);
    const { data: stockData } = await supabase.from('waste_stock').select(`id, current_weight, waste_type_id, waste_types (name)`).gt('current_weight', 0);
    if (stockData) setWasteStock(stockData);
    setLoading(false);
  };

  useEffect(() => { fetchFinanceData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [filterYear, filterMonth, filterDay]);

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
  const totalPages = Math.ceil(filteredFunds.length / itemsPerPage) || 1;
  const displayedFunds = filteredFunds.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleSaveTransaction = async (e) => {
    e.preventDefault();
    setProcessing(true);
    try {
      await supabase.from('funds').insert([{ amount: Number(txData.amount), type: txData.type, description: txData.description }]);
      setIsTransactionDialogOpen(false);
      setTxData({ amount: '', type: 'income', description: '' });
      fetchFinanceData();
    } catch (error) {
      alert(`${tx.saveError}: ${error.message}`);
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
        alert(tx.stockExceeded);
        setProcessing(false);
        return;
      }
      const newWeight = selectedStock.current_weight - weightToSell;
      await supabase.from('waste_stock').update({ current_weight: newWeight }).eq('waste_type_id', selectedStock.waste_type_id);
      await supabase.from('funds').insert([{
        amount: Number(sellData.total_price),
        type: 'income',
        description: `${tx.sellWasteLabel} ${selectedStock.waste_types.name} ${weightToSell} ${tx.kg}`
      }]);
      setIsSellDialogOpen(false);
      setSellData({ waste_type_id: '', weight: '', total_price: '' });
      fetchFinanceData();
      alert(tx.sellSuccess);
    } catch (error) {
      alert(`${tx.saveError}: ${error.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    try {
      setProcessing(true);
      const dataUrl = await toPng(reportRef.current, { cacheBust: true, backgroundColor: '#ffffff', pixelRatio: 2 });
      const img = new Image();
      img.src = dataUrl;
      await new Promise((resolve) => { img.onload = resolve; });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (img.height * pdfWidth) / img.width;
      pdf.addImage(dataUrl, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`finance-report-${Date.now()}.pdf`);
    } catch (err) {
      alert(err.message);
    } finally {
      setProcessing(false);
    }
  };

  // ── Summary Card ──
  const SummaryCard = ({ label, value, icon: Icon, color }) => (
    <div className={`bg-card border border-border rounded-2xl p-4 md:p-6 flex items-center gap-4 shadow-sm transition-colors`}>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-bold text-muted-foreground mb-0.5">{label}</p>
        <p className="font-black text-lg md:text-xl text-foreground truncate">{value}</p>
      </div>
    </div>
  );

  const fmt = (n) => n.toLocaleString(lang === 'th' ? 'th-TH' : 'en-US', { minimumFractionDigits: 2 });

  return (
    <div className="space-y-4 md:space-y-6 transition-colors">

      {/* ── Summary Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <SummaryCard label={tx.income}  value={`+${fmt(totalIncome)}`} icon={ArrowDownRight} color="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400" />
        <SummaryCard label={tx.expense} value={`-${fmt(totalExpense)}`} icon={ArrowUpRight}  color="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
        <SummaryCard label={tx.balance} value={fmt(balance)} icon={Wallet} color={balance >= 0 ? "bg-primary/10 text-primary" : "bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400"} />
      </div>

      <div className="bg-card rounded-2xl md:rounded-[2rem] border border-border shadow-xl flex flex-col overflow-hidden transition-colors">

        {/* ── Toolbar ── */}
        <div className="p-5 md:p-8 border-b border-border flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 bg-card/80 backdrop-blur-md transition-colors">
          <div className="flex flex-wrap items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />

            <select value={filterDay} onChange={e => setFilterDay(e.target.value)}
              className="px-3 py-2 text-sm font-bold border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 bg-card text-foreground transition-colors">
              <option value="">{tx.allDays}</option>
              {Array.from({ length: 31 }, (_, i) => (i + 1).toString().padStart(2, '0')).map(d => <option key={d} value={d}>{d}</option>)}
            </select>

            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
              className="px-3 py-2 text-sm font-bold border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 bg-card text-foreground transition-colors">
              <option value="">{tx.allMonths}</option>
              {thaiMonths.map(m => <option key={m.val} value={m.val}>{m.label}</option>)}
            </select>

            <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
              className="px-3 py-2 text-sm font-bold border border-border rounded-xl outline-none focus:ring-2 focus:ring-primary/20 bg-card text-foreground transition-colors">
              <option value="">{tx.allYears}</option>
              {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {(filterYear || filterMonth || filterDay) && (
              <button onClick={() => { setFilterYear(''); setFilterMonth(''); setFilterDay(''); }} className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all">
                <FilterX className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-3">
            <button onClick={exportPDF} disabled={processing}
              className="px-5 py-2.5 bg-foreground text-background rounded-xl hover:opacity-80 flex items-center gap-2 font-bold transition-all shadow-md text-sm">
              <Download className="w-4 h-4" /> {tx.exportPdf}
            </button>
            <button onClick={() => setIsTransactionDialogOpen(true)}
              className="px-5 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-xl hover:bg-primary/20 flex items-center gap-2 font-bold transition-all text-sm">
              <Plus className="w-4 h-4" /> {tx.addTx}
            </button>
            <button onClick={() => setIsSellDialogOpen(true)}
              className="px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 flex items-center gap-2 font-bold transition-all shadow-lg text-sm">
              <PackageMinus className="w-4 h-4" /> {tx.sellWaste}
            </button>
          </div>
        </div>

        {/* ── Table (export area) ── */}
        <div className="p-5 md:p-8 bg-muted/20 dark:bg-muted/10 transition-colors">
          <div ref={reportRef} className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm">
            <div className="text-center mb-8 pb-4 border-b-2 border-dashed border-gray-200">
              <h2 className="text-2xl font-black text-slate-800 mb-1">{tx.reportTitle}</h2>
              <p className="text-sm font-bold text-slate-500">{tx.reportProject}</p>
              {(filterYear || filterMonth || filterDay) && (
                <p className="text-sm font-bold text-primary mt-2">
                  {tx.dataFor}: {filterDay ? `${tx.day} ${filterDay} ` : ''}{filterMonth ? `${tx.monthLabel} ${thaiMonths.find(m => m.val === filterMonth)?.label} ` : ''}{filterYear ? `${tx.yearLabel} ${filterYear}` : ''}
                </p>
              )}
              <p suppressHydrationWarning className="text-xs font-bold text-slate-400 mt-2">
                {tx.printedAt}: {new Date().toLocaleString(lang === 'th' ? 'th-TH' : 'en-US')}
              </p>
            </div>

            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-100">
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase">{tx.colDate}</th>
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase">{tx.colDesc}</th>
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase text-right">{tx.colIncome}</th>
                  <th className="py-4 px-4 font-black text-sm text-slate-500 uppercase text-right">{tx.colExpense}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td colSpan="4" className="p-4"><Skeleton className="h-8 w-full rounded-xl" /></td>
                    </tr>
                  ))
                ) : displayedFunds.length === 0 ? (
                  <tr><td colSpan="4" className="text-center py-12 text-slate-400 font-bold">{tx.noData}</td></tr>
                ) : (
                  displayedFunds.map((item) => (
                    <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-4 text-sm font-bold text-slate-600">
                        {new Date(item.created_at).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-4 px-4 text-sm font-bold text-slate-800">{item.description || '-'}</td>
                      <td className="py-4 px-4 text-sm font-black text-right text-green-600">
                        {item.type === 'income' ? `+${fmt(Number(item.amount))}` : '-'}
                      </td>
                      <td className="py-4 px-4 text-sm font-black text-right text-red-500">
                        {item.type === 'expense' ? `-${fmt(Number(item.amount))}` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="p-4 md:p-6 border-t border-border bg-muted/10 shrink-0">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} itemsPerPage={itemsPerPage} totalItems={filteredFunds.length} />
        </div>
      </div>

      {/* ── Dialog: บันทึกรายการ ── */}
      <Dialog open={isTransactionDialogOpen} onOpenChange={setIsTransactionDialogOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-[2rem] p-8 border border-border shadow-2xl bg-card text-foreground transition-colors">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black tracking-tight text-foreground">{tx.addTxTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveTransaction} className="space-y-4">
            <div className="grid grid-cols-2 gap-3 mb-6">
              <button type="button" onClick={() => setTxData({ ...txData, type: 'income' })}
                className={`p-4 rounded-2xl font-black border-2 transition-all ${txData.type === 'income' ? 'bg-green-500/10 border-green-500 text-green-700 dark:text-green-400' : 'bg-muted border-transparent text-muted-foreground'}`}>
                {tx.income}
              </button>
              <button type="button" onClick={() => setTxData({ ...txData, type: 'expense' })}
                className={`p-4 rounded-2xl font-black border-2 transition-all ${txData.type === 'expense' ? 'bg-red-500/10 border-red-500 text-red-700 dark:text-red-400' : 'bg-muted border-transparent text-muted-foreground'}`}>
                {tx.expense}
              </button>
            </div>
            <div className="space-y-3">
              <input type="number" step="0.01" placeholder={tx.amountPlaceholder} value={txData.amount} onChange={e => setTxData({ ...txData, amount: e.target.value })}
                className="w-full p-4 text-2xl font-black border border-border rounded-2xl bg-muted/30 text-foreground outline-none focus:ring-4 focus:ring-primary/20 text-center transition-colors" required />
              <input type="text" placeholder={tx.descPlaceholder} value={txData.description} onChange={e => setTxData({ ...txData, description: e.target.value })}
                className="w-full p-4 text-sm font-bold border border-border rounded-2xl bg-muted/30 text-foreground outline-none focus:ring-4 focus:ring-primary/20 transition-colors" required />
            </div>
            <DialogFooter className="mt-8">
              <button type="submit" disabled={processing}
                className="w-full py-4 bg-primary text-primary-foreground rounded-[1.2rem] font-black hover:bg-primary/90 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {processing ? tx.saving : tx.saveBtn}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Dialog: ขายขยะ ── */}
      <Dialog open={isSellDialogOpen} onOpenChange={setIsSellDialogOpen}>
        <DialogContent className="sm:max-w-[450px] rounded-[2.5rem] p-8 border border-border shadow-2xl bg-card text-foreground transition-colors">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-xl font-black tracking-tight text-green-600 dark:text-green-400">{tx.sellTitle}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSellWaste} className="space-y-5">
            <select value={sellData.waste_type_id} onChange={e => setSellData({ ...sellData, waste_type_id: e.target.value })}
              className="w-full p-4 text-sm font-bold border border-border rounded-2xl bg-muted/30 text-foreground outline-none focus:ring-4 focus:ring-green-500/20 transition-colors" required>
              <option value="" disabled>{tx.selectWaste}</option>
              {wasteStock.map(stock => (
                <option key={stock.id} value={stock.waste_type_id}>
                  {stock.waste_types.name} ({tx.stock} {stock.current_weight} {tx.kg})
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input type="number" step="0.01" placeholder={tx.weightPlaceholder} value={sellData.weight} onChange={e => setSellData({ ...sellData, weight: e.target.value })}
                className="w-full p-4 text-lg font-black border border-border rounded-2xl bg-muted/30 text-foreground outline-none focus:ring-4 focus:ring-red-500/20 transition-colors" required />
              <input type="number" step="0.01" placeholder={tx.pricePlaceholder} value={sellData.total_price} onChange={e => setSellData({ ...sellData, total_price: e.target.value })}
                className="w-full p-4 text-lg font-black border border-border rounded-2xl bg-muted/30 text-green-600 dark:text-green-400 outline-none focus:ring-4 focus:ring-green-500/20 transition-colors" required />
            </div>
            <DialogFooter className="mt-8">
              <button type="submit" disabled={processing}
                className="w-full py-4 bg-green-600 text-white rounded-[1.2rem] font-black hover:bg-green-700 transition-all shadow-lg active:scale-95 disabled:opacity-50">
                {processing ? tx.saving : tx.confirmSell}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}