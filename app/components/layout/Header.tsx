"use client";
import { Bell, User, PanelLeft } from 'lucide-react'; // 🟢 เพิ่ม PanelLeft
import Link from 'next/link';

interface HeaderProps {
  title: string;
  userName?: string;
  userPoints?: number;
  unreadMessages?: number;
  onToggleSidebar?: () => void; // 🟢 เพิ่ม Prop สำหรับสั่งพับ
}

export function Header({ title, userName, userPoints, unreadMessages, onToggleSidebar }: HeaderProps) {
  return (
    <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* 🟢 เพิ่มปุ่มกดพับ Sidebar */}
        <button 
          onClick={onToggleSidebar}
          className="p-2 hover:bg-accent rounded-lg transition-colors text-muted-foreground"
        >
          <PanelLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-semibold">{title}</h2>
      </div>
      
      <div className="flex items-center gap-4">
        {userPoints !== undefined && (
          <div className="px-4 py-2 bg-primary/10 text-primary rounded-lg">
            <span className="font-semibold">{userPoints.toLocaleString()}</span>
            <span className="ml-1 text-sm">คะแนน</span>
          </div>
        )}
        
        <Link href="/admin/chat">
          <button className="p-2 hover:bg-accent rounded-lg transition-colors relative">
            <Bell className="w-5 h-5" />
            {unreadMessages !== undefined && unreadMessages > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full px-1 border-2 border-white">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </button>
        </Link>
        
        <div className="flex items-center gap-2 pl-4 border-l border-border">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-white" />
          </div>
          {userName && <span className="text-sm font-medium">{userName}</span>}
        </div>
      </div>
    </header>
  );
}