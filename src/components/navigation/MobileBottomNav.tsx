import React from 'react';
import { Tv, Film, Clapperboard, Home, Settings, Users } from 'lucide-react';
import { ScreenType } from '../../types/iptv.types';

interface MobileBottomNavProps {
  currentScreen: ScreenType;
  onNavigate: (screen: ScreenType) => void;
  onOpenSettings: () => void;
  onOpenProfiles?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentScreen,
  onNavigate,
  onOpenSettings,
  onOpenProfiles
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(() => {
    return typeof document !== 'undefined' && document.documentElement.getAttribute('data-fullscreen') === 'true';
  });

  React.useEffect(() => {
    const checkFs = () => {
      setIsFullscreen(document.documentElement.getAttribute('data-fullscreen') === 'true');
    };
    const observer = new MutationObserver(checkFs);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-fullscreen'] });
    window.addEventListener('resize', checkFs);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', checkFs);
    };
  }, []);

  // Hide bottom nav when in fullscreen video playback or fullscreen mode
  if (currentScreen === 'vod-player' || isFullscreen) {
    return null;
  }

  const navItems = [
    {
      id: 'home' as ScreenType,
      label: 'الرئيسية',
      icon: Home,
      action: () => onNavigate('home'),
      isActive: currentScreen === 'home'
    },
    {
      id: 'live' as ScreenType,
      label: 'القنوات',
      icon: Tv,
      action: () => onNavigate('live'),
      isActive: currentScreen === 'live'
    },
    {
      id: 'vod' as ScreenType,
      label: 'الأفلام',
      icon: Film,
      action: () => onNavigate('vod'),
      isActive: currentScreen === 'vod'
    },
    {
      id: 'series' as ScreenType,
      label: 'المسلسلات',
      icon: Clapperboard,
      action: () => onNavigate('series'),
      isActive: currentScreen === 'series'
    },
    {
      id: 'profiles' as any,
      label: 'البروفايلات',
      icon: Users,
      action: onOpenProfiles || (() => {}),
      isActive: false
    },
    {
      id: 'settings' as ScreenType,
      label: 'الإعدادات',
      icon: Settings,
      action: onOpenSettings,
      isActive: currentScreen === 'settings'
    }
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0c1018]/95 backdrop-blur-2xl border-t border-white/10 px-1.5 py-1.5 flex items-center justify-around select-none shadow-[0_-8px_24px_rgba(0,0,0,0.6)]">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            type="button"
            onClick={item.action}
            className={`flex flex-col items-center justify-center py-0.5 px-1.5 rounded-xl transition-all touch-manipulation cursor-pointer ${
              item.isActive
                ? 'text-accent-cyan scale-105'
                : 'text-slate-400 hover:text-slate-200 active:scale-95'
            }`}
          >
            <div className={`relative p-1.5 rounded-xl transition-all ${
              item.isActive ? 'bg-cyan-500/15' : ''
            }`}>
              <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
              {item.isActive && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
              )}
            </div>
            <span className={`text-[9px] sm:text-[10px] font-bold mt-0.5 tracking-tight ${
              item.isActive ? 'text-accent-cyan font-black' : 'text-slate-400'
            }`}>
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};
