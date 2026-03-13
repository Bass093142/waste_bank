"use client";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export function Pagination({ currentPage, totalPages, onPageChange, itemsPerPage, totalItems }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-card">
      <div className="text-sm text-muted-foreground">
        แสดง {((currentPage - 1) * itemsPerPage) + 1} ถึง {Math.min(currentPage * itemsPerPage, totalItems)} จากทั้งหมด {totalItems} รายการ
      </div>
      
      <div className="flex gap-1.5">
        {/* ปุ่มหน้าแรกสุด */}
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent transition-colors"
          title="หน้าแรก"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>
        
        {/* ปุ่มหน้าก่อนหน้า */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <div className="flex items-center px-4 font-medium text-sm text-foreground bg-accent/50 rounded-lg">
          หน้า {currentPage} / {totalPages}
        </div>

        {/* ปุ่มหน้าถัดไป */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        
        {/* ปุ่มหน้าสุดท้าย */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="p-2 border border-border rounded-lg disabled:opacity-50 hover:bg-accent transition-colors"
          title="หน้าสุดท้าย"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}