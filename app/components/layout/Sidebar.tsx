"use client";
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useTheme } from 'next-themes'; 
import { useLanguage } from '@/app/contexts/LanguageContext';
import { 
  LayoutDashboard, Users, Trash2, DollarSign, Gift, Settings, 
  Trophy, Home, History, ShoppingBag, LogOut, Leaf, BarChart3, MessageCircle,
  Sun, Moon, Languages
} from 'lucide-react';

interface SidebarProps {
  userRole: 'admin' | 'user';
  isCollapsed: boolean;
}

interface MenuItem {
  icon: any;
  label: string;
  path: string;
  badge?: number | null;
}

export function Sidebar({ userRole, isCollapsed }: SidebarProps) {
  const pathname = usePathname();
  const [unreadTotal, setUnreadTotal] = useState<number>(0);
  
  const { theme, setTheme } = useTheme();
  const { lang, toggleLang, t } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  const adminMenuItems: MenuItem[] = [
    { icon: LayoutDashboard, label: t('overview'), path: '/admin' },
    { icon: Users, label: t('manageUsers'), path: '/admin/users' },
    { icon: Trash2, label: t('wasteTypes'), path: '/admin/waste-types' },
    { icon: DollarSign, label: t('finance'), path: '/admin/finance' },
    { icon: BarChart3, label: t('reports'), path: '/admin/reports' },
    { icon: MessageCircle, label: t('messages'), path: '/admin/chat', badge: unreadTotal > 0 ? unreadTotal : null },
    { icon: Gift, label: t('rewards'), path: '/admin/rewards' },
    { icon: Settings, label: t('settings'), path: '/admin/settings' },
  ];

  const userMenuItems: MenuItem[] = [
    { icon: Home, label: t('home'), path: '/user' },
    { icon: Trophy, label: t('leaderboard'), path: '/user/leaderboard' },
    { icon: ShoppingBag, label: t('redeem'), path: '/user/rewards' },
    { icon: History, label: t('history'), path: '/user/history' },
  ];

  const menuItems = userRole === 'admin' ? adminMenuItems : userMenuItems;
  const isActive = (path: string) => path === '/admin' || path === '/user' ? pathname === path : pathname?.startsWith(path);

  return (
    <div className={`${isCollapsed ? 'w-20' : 'w-64'} h-screen bg-sidebar text-sidebar-foreground flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
      <div className="p-6 border-b border-sidebar-border overflow-hidden shrink-0">
        <Link href={userRole === 'admin' ? '/admin' : '/user'} className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center shrink-0">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          {!isCollapsed && (
            <div className="whitespace-nowrap transition-opacity duration-300">
              <h1 className="font-semibold text-lg text-slate-800 dark:text-white">{t('wasteBank')}</h1>
              <p className="text-xs text-sidebar-foreground/70">{userRole === 'admin' ? t('adminSys') : t('userSys')}</p>
            </div>
          )}
        </Link>
      </div>

      {/* 🟢 แก้ไขตรงนี้: เพิ่มคลาสซ่อน Scrollbar */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {menuItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              href={item.path}
              title={isCollapsed ? item.label : ''} 
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                isActive(item.path) ? 'bg-primary text-primary-foreground shadow-sm font-bold' : 'hover:bg-sidebar-accent text-sidebar-foreground/90'
              }`}
            >
              <Icon className="w-5 h-5 shrink-0" />
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

      <div className="p-4 border-t border-sidebar-border overflow-hidden space-y-2 shrink-0">
        {mounted && (
          <button 
            onClick={toggleLang}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/90 transition-colors font-bold"
            title="Switch Language"
          >
            <Languages className="w-5 h-5 shrink-0 text-blue-400" />
            {!isCollapsed && (
              <span className="whitespace-nowrap">{lang === 'th' ? 'English' : 'ภาษาไทย'}</span>
            )}
          </button>
        )}

        {mounted && (
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-sidebar-accent text-sidebar-foreground/90 transition-colors font-bold"
            title="Toggle Theme"
          >
            {theme === 'dark' ? <Sun className="w-5 h-5 shrink-0 text-amber-400" /> : <Moon className="w-5 h-5 shrink-0 text-slate-400" />}
            {!isCollapsed && (
              <span className="whitespace-nowrap">{theme === 'dark' ? t('lightMode') : t('darkMode')}</span>
            )}
          </button>
        )}

        <button 
          onClick={() => {
            localStorage.removeItem('waste_bank_user'); 
            window.location.href = '/'; 
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-500/10 text-red-500 transition-colors font-black"
          title="Logout"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          {!isCollapsed && <span className="whitespace-nowrap">{t('logout')}</span>}
        </button>
      </div>
    </div>
  );
}