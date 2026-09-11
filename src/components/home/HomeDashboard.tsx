import React, { useState, useEffect } from 'react';
import { 
  Tv, Film, Clapperboard, Star, 
  Settings, Wifi, Clock, Calendar, 
  Play, Sparkles, Shield, User, Crown,
  Activity, Radio, ChevronLeft, Zap
} from 'lucide-react';
import { UserAccount, ScreenType } from '../../types/iptv.types';
import { spatialNav } from '../../navigation/spatialNav';
import { FavoritesService } from '../../services/favorites.service';
import { XtreamService } from '../../services/xtream.service';

interface HomeDashboardProps {
  account: UserAccount;
  onNavigate: (screen: ScreenType) => void;
  onOpenSettings: () => void;
  onOpenDiagnostics: () => void;
}


export const HomeDashboard: React.FC<HomeDashboardProps> = ({ 
  account, 
  onNavigate, 
  onOpenSettings,
  onOpenDiagnostics
}) => {
  const [currentTime, setCurrentTime] = useState('');
  const [activeEventIndex, setActiveEventIndex] = useState(0);
  const [favsCount, setFavsCount] = useState(0);
  const [liveCategories, setLiveCategories] = useState<{ category_id: string; category_name: string }[]>([]);
  const [vodCategories, setVodCategories] = useState<{ category_id: string; category_name: string }[]>([]);

  // Fetch real categories from server for ticker
  useEffect(() => {
    setFavsCount(FavoritesService.count());
    XtreamService.getLiveCategories().then(cats => {
      setLiveCategories(cats.slice(0, 6));
    }).catch(() => {});
    XtreamService.getVodCategories().then(cats => {
      setVodCategories(cats.slice(0, 4));
    }).catch(() => {});
  }, []);

  // Build dynamic ticker items from real server data (or fallback)
  const tickerEvents = liveCategories.length > 1
    ? liveCategories.slice(1).map((cat, i) => ({
        id: `cat-${i}`,
        title: cat.category_name,
        category: 'بث مباشر',
        badge: 'LIVE',
        time: '',
        channel: `${account.serverName || 'look.5g.in'}`,
        score: undefined
      }))
    : [
        { id: 'f1', title: 'البث المباشر — اضغط للدخول', category: 'Live TV', badge: 'LIVE', time: '', channel: 'Nova 4K', score: undefined },
        { id: 'f2', title: 'مكتبة الأفلام — أكثر من 19,000 فيلم', category: 'VOD', badge: 'NEW', time: '', channel: 'Nova 4K', score: undefined },
      ];

  const currentEvent = tickerEvents[activeEventIndex % Math.max(tickerEvents.length, 1)];
  // Pick a real VOD category name for hero, or use fallback
  const heroTitle = vodCategories.length > 1
    ? vodCategories[1].category_name
    : 'اختر فئة لاستعراض أحدث الأفلام';
  const heroSub = vodCategories.length > 1
    ? `${vodCategories.length} فئة سينمائية • جودة 4K UHD • مع الترجمة`
    : 'تجربة مشاهدة سينمائية فائقة الدقة على NOVA 4K ULTRA';

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Strictly Latin numerals 0-9 with 24-hour format
      setCurrentTime(now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Auto-rotate ticker items
  useEffect(() => {
    if (tickerEvents.length <= 1) return;
    const tickerInterval = setInterval(() => {
      setActiveEventIndex(prev => (prev + 1) % tickerEvents.length);
    }, 6000);
    return () => clearInterval(tickerInterval);
  }, [tickerEvents.length]);

  useEffect(() => {
    // Initial spatial focus on Live TV Grand Portal
    const timer = setTimeout(() => {
      spatialNav.setFocus('portal-live');
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-row bg-oled bg-radial-vignette overflow-hidden select-none font-sans text-white">
      
      {/* Background Ambient Glows (Supernova Cyan, Nebula Purple, Aurora Emerald) */}
      <div className="absolute -top-32 -right-32 w-[650px] h-[650px] bg-nova-cyan/12 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-1/3 -left-32 w-[550px] h-[550px] bg-nova-purple/14 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 right-1/3 w-[500px] h-[500px] bg-nova-emerald/10 rounded-full blur-[140px] pointer-events-none" />

      {/* =========================================================================
          1. LUXURY SIDE NAVIGATION DOCK (Quick Dock - Look4k V2 Signature)
         ========================================================================= */}
      <aside className="relative z-20 w-20 md:w-24 h-full bg-slate-950/80 backdrop-blur-2xl border-l border-white/10 flex flex-col items-center justify-between py-6 shrink-0 shadow-2xl">
        
        {/* Top Logo Icon */}
        <div 
          data-nav-id="dock-logo"
          onClick={() => onNavigate('home')}
          className="relative w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 via-purple-600 to-nova-cyan p-0.5 shadow-nova-glow cursor-pointer hover:scale-105 transition-transform"
          title="NOVA 4K ULTRA"
        >
          <div className="w-full h-full bg-slate-950/90 rounded-[14px] flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-nova-cyan animate-pulse" />
          </div>
          <Crown className="w-3.5 h-3.5 text-nova-gold absolute -top-1.5 -right-1.5 drop-shadow-md" />
        </div>

        {/* Navigation Quick Dock Buttons */}
        <nav className="flex flex-col items-center gap-4 w-full px-2">
          {/* Live TV Button */}
          <button
            data-nav-id="dock-live"
            data-nav-group="quick-dock"
            onClick={() => onNavigate('live')}
            className="tv-focusable w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-nova-cyan hover:bg-nova-cyan/10 border border-transparent hover:border-nova-cyan/40 transition-all cursor-pointer group"
            title="القنوات المباشرة (Live TV)"
          >
            <Tv className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold">بث مباشر</span>
          </button>

          {/* Movies VOD Button */}
          <button
            data-nav-id="dock-vod"
            data-nav-group="quick-dock"
            onClick={() => onNavigate('vod')}
            className="tv-focusable w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-nova-purple hover:bg-nova-purple/10 border border-transparent hover:border-nova-purple/40 transition-all cursor-pointer group"
            title="مكتبة الأفلام (Movies)"
          >
            <Film className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold">الأفلام</span>
          </button>

          {/* Series Button */}
          <button
            data-nav-id="dock-series"
            data-nav-group="quick-dock"
            onClick={() => onNavigate('series')}
            className="tv-focusable w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-nova-emerald hover:bg-nova-emerald/10 border border-transparent hover:border-nova-emerald/40 transition-all cursor-pointer group"
            title="المسلسلات (Series)"
          >
            <Clapperboard className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold">المسلسلات</span>
          </button>

          {/* Favorites Button */}
          <button
            data-nav-id="dock-favs"
            data-nav-group="quick-dock"
            onClick={() => onNavigate('favorites')}
            className="tv-focusable relative w-13 h-13 rounded-2xl flex flex-col items-center justify-center gap-1 text-slate-400 hover:text-nova-gold hover:bg-nova-gold/10 border border-transparent hover:border-nova-gold/40 transition-all cursor-pointer group"
            title="المفضلة (Favorites)"
          >
            <Star className="w-5 h-5 group-hover:scale-110 transition-transform" />
            <span className="text-[9px] font-bold">المفضلة</span>
            {favsCount > 0 && (
              <span className="absolute -top-1 -left-1 w-4 h-4 rounded-full bg-nova-gold text-black text-[9px] font-black flex items-center justify-center">
                {favsCount > 9 ? '9+' : favsCount}
              </span>
            )}
          </button>
        </nav>

        {/* Bottom Utility Tools */}
        <div className="flex flex-col items-center gap-3 w-full px-2">
          {/* Diagnostics HUD Button */}
          <button
            data-nav-id="dock-diag"
            data-nav-group="quick-dock"
            onClick={onOpenDiagnostics}
            className="tv-focusable p-3 rounded-xl text-slate-400 hover:text-amber-400 hover:bg-amber-400/10 border border-transparent hover:border-amber-400/30 transition-all cursor-pointer"
            title="التشخيص ومحرك البث (HUD)"
          >
            <Activity className="w-5 h-5" />
          </button>

          {/* Settings Button */}
          <button
            data-nav-id="dock-settings"
            data-nav-group="quick-dock"
            onClick={onOpenSettings}
            className="tv-focusable p-3 rounded-xl text-slate-400 hover:text-nova-cyan hover:bg-nova-cyan/10 border border-transparent hover:border-nova-cyan/30 transition-all cursor-pointer"
            title="الإعدادات"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      </aside>

      {/* =========================================================================
          2. MAIN SCROLLABLE DASHBOARD CANVAS
         ========================================================================= */}
      <div className="relative z-10 flex-1 h-full flex flex-col justify-between p-4 md:p-8 lg:p-9 overflow-y-auto overflow-x-hidden">
        
        {/* TOP STATUS & BRANDING HEADER */}
        <header className="w-full flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10 shrink-0">
          {/* Brand Titles */}
          <div className="flex items-center gap-3.5">
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl md:text-3xl font-black tracking-wider text-white">
                  NOVA <span className="text-nova-cyan">4K</span>
                </h1>
                <span className="text-[11px] md:text-xs font-black px-3 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-mono tracking-wider shadow-sm">
                  ULTRA V2
                </span>
                <span className="hidden sm:inline-block px-2.5 py-0.5 text-[10px] font-bold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-full font-mono">
                  LOOK4K ENGINE 3.0
                </span>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-nova-cyan tracking-widest font-mono mt-0.5">
                ROYAL SMART TV & CINEMATIC OTT PANEL
              </p>
            </div>
          </div>

          {/* Top Live Metrics */}
          <div className="flex items-center gap-2.5 md:gap-3 flex-wrap">
            {/* Account Badge */}
            <div className="flex items-center gap-2 px-3.5 py-1.5 bg-surface-elevated/90 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 shadow-sm">
              <User className="w-3.5 h-3.5 text-nova-cyan" />
              <span className="font-mono">{account.username}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-emerald-400 font-bold hidden sm:inline">Active VIP</span>
            </div>

            {/* Server Ping */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated/90 border border-white/10 rounded-xl text-xs font-semibold text-emerald-400 font-mono shadow-sm">
              <Wifi className="w-3.5 h-3.5" />
              <span>18ms</span>
            </div>

            {/* Days Remaining (Latin 0-9) */}
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-elevated/90 border border-white/10 rounded-xl text-xs font-semibold text-slate-200 shadow-sm">
              <Calendar className="w-3.5 h-3.5 text-nova-gold" />
              <span className="hidden sm:inline">الصلاحية:</span>
              <span className="text-nova-gold font-bold font-mono">{account.daysRemaining} days</span>
            </div>

            {/* System Clock (Strict Latin 0-9) */}
            <div className="flex items-center gap-2 px-4 py-1.5 bg-white/5 border border-white/10 rounded-xl text-sm md:text-base font-black font-mono text-white tracking-widest">
              <Clock className="w-4 h-4 text-nova-cyan" />
              <span>{currentTime}</span>
            </div>
          </div>
        </header>

        {/* =========================================================================
            3. LIVE MATCH / EVENT TICKER BAR (Look4k V2 Feature)
           ========================================================================= */}
        <div className="w-full my-3 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-surface-elevated/95 via-surface-elevated/70 to-surface-elevated/90 border border-white/10 backdrop-blur-md flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent-live/20 border border-accent-live/40 text-accent-live text-[11px] font-black shrink-0 font-mono">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{currentEvent.badge}</span>
            </div>

            <div className="flex items-center gap-2 text-xs truncate">
              <span className="font-extrabold text-white truncate">{currentEvent.title}</span>
              {currentEvent.score && (
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold text-[11px] border border-emerald-500/30 shrink-0">
                  {currentEvent.score} ({currentEvent.time})
                </span>
              )}
              <span className="text-slate-400 font-mono text-[11px] hidden md:inline shrink-0">
                • {currentEvent.channel}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => onNavigate('live')}
              className="px-3 py-1 bg-nova-cyan/20 hover:bg-nova-cyan/30 border border-nova-cyan/40 text-nova-cyan rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <span>انتقال للبث</span>
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* =========================================================================
            4. CENTER HERO BILLBOARD (Live Cinema Match Preview & Spotlight)
           ========================================================================= */}
        <div className="w-full my-2 bg-gradient-to-r from-surface-elevated/95 via-surface-elevated/80 to-transparent border border-white/10 rounded-3xl p-5 md:p-7 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-card-elevated backdrop-blur-md shrink-0">
          <div className="max-w-2xl text-right">
            <div className="flex items-center gap-2 mb-2.5">
              <span className="px-2.5 py-0.5 bg-nova-cyan/20 border border-nova-cyan/40 text-nova-cyan text-xs font-extrabold rounded-lg flex items-center gap-1.5 font-mono">
                <span className="w-2 h-2 rounded-full bg-nova-cyan animate-pulse" />
                NOVA 4K ULTRA
              </span>
              <span className="text-xs font-bold text-slate-300 font-mono">{account.serverName || 'look.5g.in'}</span>
              <span className="text-xs font-semibold text-nova-cyan font-mono">• {account.daysRemaining} يوم متبقي</span>
            </div>

            <h2 className="text-xl md:text-3xl font-black text-white mb-2 leading-tight">
              {heroTitle}
            </h2>
            <p className="text-xs md:text-sm text-slate-300 line-clamp-2 leading-relaxed mb-4">
              {heroSub}
            </p>

            <div className="flex items-center gap-3">
              <button
                data-nav-id="btn-resume-live"
                onClick={() => onNavigate('live')}
                className="tv-focusable px-8 py-3 bg-gradient-to-r from-nova-cyan via-cyan-400 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-slate-950 font-black text-sm md:text-base rounded-2xl flex items-center gap-2.5 shadow-nova-glow transition-all cursor-pointer"
              >
                <Play className="w-5 h-5 fill-current" />
                <span>البث المباشر</span>
              </button>

              <button
                data-nav-id="btn-hero-vod"
                onClick={() => onNavigate('vod')}
                className="tv-focusable px-5 py-3 bg-white/10 hover:bg-white/15 border border-white/15 text-white font-bold text-sm rounded-2xl flex items-center gap-2 transition-all cursor-pointer"
              >
                <Film className="w-4 h-4 text-nova-purple" />
                <span>مكتبة الأفلام</span>
              </button>
            </div>
          </div>

          {/* Quick Technical Engine Badges */}
          <div className="hidden lg:flex flex-col items-end gap-2.5 text-right shrink-0">
            <div className="flex items-center gap-2 text-xs font-bold bg-white/5 border border-white/10 px-4 py-2 rounded-xl text-slate-300">
              <Shield className="w-4 h-4 text-emerald-400" />
              <span>NOVA Anti-Freeze Engine 3.0</span>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              4K UHD • 60 FPS • Dolby 5.1 Surround Sound
            </div>
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
              <Zap className="w-3.5 h-3.5" />
              <span>Fast Zapping Response: &lt; 400ms</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            5. GRAND PORTALS (Look4k V2 3D Neon Cinematic Cards with Live Stats)
           ========================================================================= */}
        <div className="w-full grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 my-2 shrink-0">
          {/* PORTAL 1: LIVE TV (Supernova Cyan) */}
          <div
            data-nav-id="portal-live"
            data-nav-group="main-portals"
            onClick={() => onNavigate('live')}
            className="tv-focusable relative h-44 md:h-52 bg-gradient-to-br from-[#081a2e] via-[#05111f] to-[#02070e] border-2 border-nova-cyan/40 hover:border-nova-cyan rounded-3xl p-5 flex flex-col justify-between cursor-pointer overflow-hidden shadow-card-elevated group transition-all"
          >
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-nova-cyan/20 rounded-full blur-2xl group-hover:bg-nova-cyan/35 transition-all" />
            
            <div className="flex items-center justify-between z-10">
              <div className="w-12 h-12 rounded-2xl bg-nova-cyan/20 border border-nova-cyan/40 flex items-center justify-center text-nova-cyan shadow-sm group-hover:scale-105 transition-transform">
                <Tv className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black text-nova-cyan bg-nova-cyan/10 px-3 py-0.5 rounded-full border border-nova-cyan/30 font-mono">
                8,450+ CHANNELS
              </span>
            </div>

            <div className="z-10">
              <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-nova-cyan transition-colors">
                القنوات المباشرة
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-sans">باقات الرياضة، الأخبار، والترفيه 4K UHD</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-nova-cyan/90 font-mono">
                <span>Fast Zapping</span> • <span>EPG Guide</span> • <span>Catchup DVR</span>
              </div>
            </div>
          </div>

          {/* PORTAL 2: MOVIES (Nebula Purple) */}
          <div
            data-nav-id="portal-vod"
            data-nav-group="main-portals"
            onClick={() => onNavigate('vod')}
            className="tv-focusable relative h-44 md:h-52 bg-gradient-to-br from-[#201132] via-[#140a20] to-[#0a0510] border-2 border-nova-purple/40 hover:border-nova-purple rounded-3xl p-5 flex flex-col justify-between cursor-pointer overflow-hidden shadow-card-elevated group transition-all"
          >
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-nova-purple/20 rounded-full blur-2xl group-hover:bg-nova-purple/35 transition-all" />
            
            <div className="flex items-center justify-between z-10">
              <div className="w-12 h-12 rounded-2xl bg-nova-purple/20 border border-nova-purple/40 flex items-center justify-center text-nova-purple shadow-sm group-hover:scale-105 transition-transform">
                <Film className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black text-nova-purple bg-nova-purple/10 px-3 py-0.5 rounded-full border border-nova-purple/30 font-mono">
                19,200+ MOVIES
              </span>
            </div>

            <div className="z-10">
              <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-nova-purple transition-colors">
                مكتبة الأفلام
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-sans">أحدث أفلام السينما العالمية 2025 مع الترجمة</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-purple-300/90 font-mono">
                <span>4K HDR</span> • <span>Multi-Audio</span> • <span>IMDB 8.5+</span>
              </div>
            </div>
          </div>

          {/* PORTAL 3: SERIES (Aurora Emerald) */}
          <div
            data-nav-id="portal-series"
            data-nav-group="main-portals"
            onClick={() => onNavigate('series')}
            className="tv-focusable relative h-44 md:h-52 bg-gradient-to-br from-[#0c231a] via-[#071711] to-[#040c09] border-2 border-nova-emerald/40 hover:border-nova-emerald rounded-3xl p-5 flex flex-col justify-between cursor-pointer overflow-hidden shadow-card-elevated group transition-all"
          >
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-nova-emerald/20 rounded-full blur-2xl group-hover:bg-nova-emerald/35 transition-all" />
            
            <div className="flex items-center justify-between z-10">
              <div className="w-12 h-12 rounded-2xl bg-nova-emerald/20 border border-nova-emerald/40 flex items-center justify-center text-nova-emerald shadow-sm group-hover:scale-105 transition-transform">
                <Clapperboard className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black text-nova-emerald bg-nova-emerald/10 px-3 py-0.5 rounded-full border border-nova-emerald/30 font-mono">
                4,350+ SERIES
              </span>
            </div>

            <div className="z-10">
              <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-nova-emerald transition-colors">
                المسلسلات
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-sans">مواسم كاملة مع استئناف المشاهدة التلقائي</p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-emerald-300/90 font-mono">
                <span>Full Seasons</span> • <span>Smart Resume</span> • <span>Autoplay</span>
              </div>
            </div>
          </div>

          {/* PORTAL 4: FAVORITES (Cosmic Gold) */}
          <div
            data-nav-id="portal-favs"
            data-nav-group="main-portals"
            onClick={() => onNavigate('favorites')}
            className="tv-focusable relative h-44 md:h-52 bg-gradient-to-br from-[#2a1d0a] via-[#1a1205] to-[#0d0902] border-2 border-nova-gold/40 hover:border-nova-gold rounded-3xl p-5 flex flex-col justify-between cursor-pointer overflow-hidden shadow-card-elevated group transition-all"
          >
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-nova-gold/20 rounded-full blur-2xl group-hover:bg-nova-gold/35 transition-all" />
            
            <div className="flex items-center justify-between z-10">
              <div className="w-12 h-12 rounded-2xl bg-nova-gold/20 border border-nova-gold/40 flex items-center justify-center text-nova-gold shadow-sm group-hover:scale-105 transition-transform">
                <Star className="w-6 h-6" />
              </div>
              <span className="text-[11px] font-black text-nova-gold bg-nova-gold/10 px-3 py-0.5 rounded-full border border-nova-gold/30 font-mono">
                {favsCount > 0 ? `${favsCount} محفوظ` : 'MY FAVORITES'}
              </span>
            </div>

            <div className="z-10">
              <h3 className="text-xl md:text-2xl font-black text-white group-hover:text-nova-gold transition-colors">
                المفضلة السريعة
              </h3>
              <p className="text-xs text-slate-300 mt-1 font-sans">
                {favsCount > 0 ? `${favsCount} قناة وفيلم ومسلسل محفوظ` : 'اضغط ⭐ لحفظ القنوات والأفلام والمسلسلات'}
              </p>
              <div className="flex items-center gap-2 mt-2 text-[10px] text-amber-300/90 font-mono">
                <span>Quick Access</span> • <span>DVR Records</span> • <span>Custom Order</span>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            6. BOTTOM STATUS & SHORTCUTS LEGEND (Look4k V2 Signature Footer)
           ========================================================================= */}
        <footer className="w-full pt-3.5 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400 shrink-0">
          {/* Remote Color Key Shortcuts */}
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 shadow-sm shadow-red-500/50" />
              <span>البحث السريع</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" />
              <span>المفضلة</span>
            </div>
            <div 
              onClick={onOpenDiagnostics}
              className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
              <span>التشخيص والمحرك (INFO)</span>
            </div>
            <div 
              onClick={onOpenSettings}
              className="flex items-center gap-2 cursor-pointer hover:text-white transition-colors"
            >
              <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm shadow-sky-500/50" />
              <span>الإعدادات المتقدمة</span>
            </div>
          </div>

          {/* Engine & Device Status */}
          <div className="flex items-center gap-4 text-[11px] text-slate-400 font-mono">
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Turbo Buffer 100%</span>
            </span>
            <span>•</span>
            <span>Tizen / webOS Spatial D-Pad Active</span>
          </div>
        </footer>

      </div>
    </div>
  );
};
