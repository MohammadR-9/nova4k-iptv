import React, { useState } from 'react';
import { 
  Tv, Film, Home, Settings, Sparkles, LogOut, ShieldCheck, 
  X, User
} from 'lucide-react';
import { UserAccount, VodPlaybackItem } from '../../types/iptv.types';
import { ActivationService } from '../../services/activation.service';
import { MobileLogin } from './MobileLogin';
import { MobileLiveScreen } from './MobileLiveScreen';
import { MobileVodScreen } from './MobileVodScreen';

interface MobileAppProps {
  onSwitchToTvMode: () => void;
  onOpenAdminPortal?: () => void;
}

export const MobileApp: React.FC<MobileAppProps> = ({ 
  onSwitchToTvMode,
  onOpenAdminPortal
}) => {
  const [account, setAccount] = useState<UserAccount | null>(() => ActivationService.getSavedAccount());
  const [activeTab, setActiveTab] = useState<'home' | 'live' | 'vod' | 'settings'>('live');
  const [playingItem, setPlayingItem] = useState<VodPlaybackItem | null>(null);

  const handleLoginSuccess = (acc: UserAccount) => {
    setAccount(acc);
    setActiveTab('live');
  };

  const handleLogout = () => {
    ActivationService.logout();
    setAccount(null);
  };

  // If not logged in -> Render Mobile Login Screen
  if (!account) {
    return (
      <MobileLogin
        onLoginSuccess={handleLoginSuccess}
        onOpenAdminPortal={onOpenAdminPortal}
        onSwitchToTvMode={onSwitchToTvMode}
      />
    );
  }

  return (
    <div className="relative w-full h-full min-h-screen bg-[#07090e] text-white flex flex-col justify-between overflow-hidden">
      {/* ── Top Mobile App Bar ────────────────────────────── */}
      <header className="sticky top-0 z-40 w-full px-4 py-2.5 bg-[#0c1017]/90 backdrop-blur-xl border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-400 to-purple-600 p-0.5 shadow-md shadow-cyan-500/20">
            <div className="w-full h-full bg-[#0c1017] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-cyan-400" />
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="font-black text-sm tracking-wider">
              NOVA <span className="text-cyan-400">4K</span>
            </span>
            <span className="text-[9px] font-black px-1.5 py-0.2 rounded bg-purple-600/60 text-white font-mono">
              MOBILE
            </span>
          </div>
        </div>

        {/* Switch to TV Mode pill */}
        <button
          type="button"
          onClick={onSwitchToTvMode}
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[11px] font-bold text-cyan-300 active:scale-95 transition-all"
          title="تبديل لواجهة الشاشات الكبيرة"
        >
          <Tv className="w-3.5 h-3.5" />
          <span>واجهة TV</span>
        </button>
      </header>

      {/* ── Active Tab View ──────────────────────────────── */}
      <main className="flex-1 w-full overflow-hidden flex flex-col">
        {activeTab === 'live' && (
          <MobileLiveScreen onOpenSettings={() => setActiveTab('settings')} />
        )}

        {activeTab === 'vod' && (
          <MobileVodScreen onPlayItem={(item) => setPlayingItem(item)} />
        )}

        {activeTab === 'home' && (
          <div className="w-full h-full flex flex-col items-center justify-center px-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4">
              <Tv className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
            <h2 className="text-lg font-black text-white mb-1">مرحباً بك في NOVA 4K ULTRA</h2>
            <p className="text-xs text-slate-400 mb-6 max-w-xs">
              اختر قسم القنوات المباشرة أو مكتبة السينما والمسلسلات للبدء بالمشاهدة
            </p>
            <div className="flex flex-col gap-2.5 w-full max-w-xs">
              <button
                type="button"
                onClick={() => setActiveTab('live')}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-95"
              >
                <Tv className="w-4 h-4" />
                <span>مشاهدة القنوات المباشرة</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('vod')}
                className="w-full h-12 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-white/10 active:scale-95"
              >
                <Film className="w-4 h-4 text-purple-400" />
                <span>مكتبة الأفلام والمسلسلات</span>
              </button>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="w-full h-full overflow-y-auto px-4 py-6 flex flex-col gap-4 pb-28">
            <h2 className="text-base font-black text-right">إعدادات الحساب والتطبيق</h2>

            {/* Account Info Card */}
            <div className="w-full p-4 rounded-2xl bg-white/5 border border-white/10 flex flex-col gap-3 text-right text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold text-[10px]">
                  نشط ومفعل
                </span>
                <span className="font-bold text-white flex items-center gap-1.5">
                  <User className="w-4 h-4 text-cyan-400" />
                  <span>معلومات الحساب</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-cyan-300 font-bold">{account.username}</span>
                <span className="text-slate-400">اسم المستخدم:</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-300">{account.status || 'Active VIP'}</span>
                <span className="text-slate-400">حالة الاشتراك:</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-mono text-slate-300">
                  {account.expDate ? new Date(Number(account.expDate) * 1000).toLocaleDateString('ar-EG') : '365 يوم'}
                </span>
                <span className="text-slate-400">تاريخ الانتهاء:</span>
              </div>
            </div>

            {/* Switch to TV UI Option */}
            <div 
              onClick={onSwitchToTvMode}
              className="w-full p-3.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
            >
              <Tv className="w-5 h-5 text-cyan-400" />
              <div className="text-right">
                <span className="font-bold text-xs text-white block">التبديل إلى واجهة التلفاز (TV Mode)</span>
                <span className="text-[10px] text-slate-400">واجهة مخصصة للشاشات الكبيرة والتحكم بالريموت</span>
              </div>
            </div>

            {/* Admin Portal */}
            {onOpenAdminPortal && (
              <div 
                onClick={onOpenAdminPortal}
                className="w-full p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between cursor-pointer active:scale-98 transition-all"
              >
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <div className="text-right">
                  <span className="font-bold text-xs text-white block">بوابة المدير (Master Admin)</span>
                  <span className="text-[10px] text-slate-400">تعديل الـ DNS الموحد وإعدادات التطبيق</span>
                </div>
              </div>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={handleLogout}
              className="w-full h-11 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 mt-4 active:scale-95"
            >
              <LogOut className="w-4 h-4" />
              <span>تسجيل الخروج من هذا الجهاز</span>
            </button>
          </div>
        )}
      </main>

      {/* ── Fullscreen VOD Movie Player Modal ─────────────── */}
      {playingItem && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          <div className="w-full p-3 bg-black/80 backdrop-blur-md flex items-center justify-between text-white border-b border-white/10">
            <span className="text-xs font-bold truncate max-w-[80%] text-right">
              {playingItem.title}
            </span>
            <button
              type="button"
              onClick={() => setPlayingItem(null)}
              className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 w-full bg-black flex items-center justify-center">
            <video
              src={playingItem.streamUrl}
              controls
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          </div>
        </div>
      )}

      {/* ── Mobile Bottom Navigation Bar (Fixed 4 Tabs) ──── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c1017]/95 backdrop-blur-2xl border-t border-white/10 px-4 py-2 flex items-center justify-around select-none shadow-[0_-8px_24px_rgba(0,0,0,0.8)]">
        {[
          { id: 'live', label: 'القنوات المباشرة', icon: Tv },
          { id: 'vod', label: 'السينما والمسلسلات', icon: Film },
          { id: 'home', label: 'الرئيسية', icon: Home },
          { id: 'settings', label: 'الإعدادات', icon: Settings },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all ${
                isActive ? 'text-cyan-400 scale-105 font-black' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-cyan-500/15' : ''}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] mt-0.5">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};
