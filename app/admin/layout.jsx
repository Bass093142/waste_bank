"use client";
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation'; // 🟢 เพิ่ม useRouter
import { Sidebar } from '@/app/components/layout/Sidebar';
import { Header } from '@/app/components/layout/Header';
import { supabase } from '@/lib/supabase';

export default function AdminLayout({ children }) {
  const pathname = usePathname();
  const router = useRouter(); // 🟢 เรียกใช้งาน Router
  
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isAuthorized, setIsAuthorized] = useState(false); // 🟢 State สำหรับเช็คสิทธิ์

  // 🟢 1. ระบบตรวจสอบสิทธิ์ (Route Guard)
  useEffect(() => {
    const checkAuth = () => {
      const userDataStr = localStorage.getItem('waste_bank_user');
      
      // ถ้าไม่มีข้อมูลแปลว่ายังไม่ได้ Login
      if (!userDataStr) {
        router.push('/'); // เด้งกลับหน้า Login (หรือหน้า Home)
        return;
      }

      try {
        const user = JSON.parse(userDataStr);
        // ถ้าล็อกอินแล้ว แต่ไม่ใช่ Admin
        if (user.role !== 'admin') {
          router.push('/user'); // เด้งไปหน้า User
          return;
        }
        
        // ถ้าเป็น Admin ให้ผ่านได้
        setIsAuthorized(true);
      } catch (error) {
        // กรณีข้อมูลใน LocalStorage พัง
        localStorage.removeItem('waste_bank_user');
        router.push('/');
      }
    };

    checkAuth();
  }, [router]);

  const fetchUnreadCount = async () => {
    const { count } = await supabase
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .eq('sender_type', 'user')
      .eq('is_read', false);
    setUnreadTotal(count || 0);
  };

  useEffect(() => {
    if (isAuthorized) { // ดึงข้อมูลก็ต่อเมื่อมีสิทธิ์แล้วเท่านั้น
      fetchUnreadCount();
    }
  }, [pathname, isAuthorized]);

  const getPageTitle = () => {
    if (pathname.includes('/users')) return 'จัดการข้อมูลผู้ใช้งาน';
    if (pathname.includes('/waste-types')) return 'ประเภทขยะรีไซเคิล';
    if (pathname.includes('/rewards')) return 'จัดการของรางวัล';
    if (pathname.includes('/finance')) return 'จัดการการเงินและกองทุน';
    if (pathname.includes('/reports')) return 'สถิติและการส่งออกข้อมูล';
    if (pathname.includes('/chat')) return 'ระบบข้อความ (Chat)';
    return 'ภาพรวมระบบ (Dashboard)';
  };

  // 🟢 2. ป้องกันหน้าจอกระพริบก่อนที่จะเด้งออก
  if (!isAuthorized) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="animate-pulse font-bold text-muted-foreground">กำลังตรวจสอบสิทธิ์...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden font-sans">
      <Sidebar userRole="admin" isCollapsed={isCollapsed} />
      <div className="flex flex-col flex-1 overflow-hidden relative">
        <Header 
          title={getPageTitle()} 
          userName="Administrator" 
          unreadMessages={unreadTotal}
          onToggleSidebar={() => setIsCollapsed(!isCollapsed)} 
        />
        <main className="flex-1 overflow-y-auto bg-muted/30 p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}