"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { 
  LayoutDashboard, Users, Trash2, DollarSign, Gift, Settings, 
  Trophy, Home, History, ShoppingBag, LogOut, Leaf, BarChart3, MessageCircle 
} from 'lucide-react';

interface SidebarProps {
  userRole: 'admin' | 'user';
  isCollapsed: boolean; // 🟢 เพิ่ม prop สำหรับเช็คสถานะหุบ
}

export function Sidebar({ userRole, isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [unreadTotal, setUnreadTotal] = useState<number>(0);

  useEffect(() => {
    if (userRole === 'admin') {
      const fetchUnreadCount = async () => {
        const { count } = await supabase
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('sender_type', 'user')
          .eq('is_read', false);
        setUnreadTotal(count || 0);
      };
      fetchUnreadCount();
    }
  }, [userRole, pathname]);

  const adminMenuItems = [
    { icon: LayoutDashboard, label: 'สรุปภาพรวม', path: '/admin' },
    { icon: Users, label: 'จัดการผู้ใช้', path: '/admin/users' },
    { icon: Trash2, label: 'ประเภทขยะ', path: '/admin/waste-types' },
    { icon: DollarSign, label: 'การเงิน', path: '/admin/finance' },
    { icon: BarChart3, label: 'สถิติ/ส่งออก', path: '/admin/reports' },
    { icon: MessageCircle, label: 'ข้อความ', path: '/admin/chat', badge: unreadTotal > 0 ? unreadTotal : null },
    { icon: Gift, label: 'ของรางวัล', path: '/admin/rewards' },
    { icon: Settings, label: 'ตั้งค่า', path: '/admin/settings' },
  ];

  const userMenuItems = [
    { icon: Home, label: 'หน้าหลัก', path: '/user' },
    { icon: Trophy, label: 'อันดับ', path: '/user/leaderboard' },
    { icon: ShoppingBag, label: 'แลกของรางวัล', path: '/user/rewards' },
    { icon: History, label: 'ประวัติการแลก', path: '/user/history' },
  ];

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems;
  const isActive = (path: string) => path === '/admin' || path === '/user' ? pathname === path : pathname?.startsWith(path);

  return (
    // 🟢 ปรับความกว้างตามสถานะ isCollapsed (w-64 หรือ w-20)
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-sidebar text-sidebar-foreground flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border overflow-hidden">
        <Link href={userRole === 'admin' ? '/admin' : '/user'} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          {/* 🟢 ซ่อนตัวหนังสือโลโก้เมื่อหุบ */}
          {!isCollapsed && (
            <div className="whitespace-nowrap transition-opacity duration-300">
              <h1 className="font-semibold text-lg">ธนาคารขยะ</h1>
              <p className="text-xs text-sidebar-foreground/70">{userRole === 'admin' ? 'ระบบผู้ดูแล' : 'ระบบสมาชิก'}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              title={isCollapsed ? item.label : ''} // โชว์ Tooltip เมื่อหุบ
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                isActive(item.path) ? 'bg-primary text-primary-foreground shadow-sm font-bold' : 'hover:bg-sidebar-accent text-sidebar-foreground/90'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {/* 🟢 ซ่อนชื่อเมนูเมื่อหุบ */}
              {!isCollapsed && <span className="whitespace-nowrap transition-opacity duration-300">{item.label}</span>}
              
              {item.badge && (
                <span className={`${isCollapsed ? 'absolute top-2 right-2 px-1' : 'ml-auto px-2'} bg-red-500 text-white text-[10px] font-black py-0.5 rounded-full shadow-sm`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-sidebar-border overflow-hidden">
        <button 
          onClick={() => {
            localStorage.removeItem('waste_bank_user'); // 🟢 ลบข้อมูลสิทธิ์ทิ้ง
            window.location.href = '/'; // 🟢 เด้งกลับหน้า Login
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 text-red-500 transition-colors font-black"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">ออกจากระบบ</span>}
        </button>
      </div>
    </div>
  );
}