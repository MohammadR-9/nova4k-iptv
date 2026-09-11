import React, { useState, useEffect } from 'react';
import { UserAccount, ScreenType, VodPlaybackItem, VodItem, SeriesItem, SeriesEpisode } from './types/iptv.types';
import { ActivationService } from './services/activation.service';
import { PlayerManager } from './player/PlayerManager';
import { TV_KEYS, registerTizenHardwareKeys } from './navigation/keycodes';
import { spatialNav } from './navigation/spatialNav';

import { RemoteSimulator } from './components/simulator/RemoteSimulator';
import { ActivationLogin } from './components/auth/ActivationLogin';
import { HomeDashboard } from './components/home/HomeDashboard';
import { LiveTvScreen } from './components/live/LiveTvScreen';
import { VodScreen } from './components/vod/VodScreen';
import { SeriesScreen } from './components/vod/SeriesScreen';
import { VodPlayer } from './components/vod/VodPlayer';
import { FavoritesScreen } from './components/favorites/FavoritesScreen';
import { DiagnosticsHud } from './components/diagnostics/DiagnosticsHud';
import { SettingsModal } from './components/settings/SettingsModal';
import { ExitConfirmModal, ExitModalMode } from './components/common/ExitConfirmModal';
import { AdminPortalScreen } from './components/admin/AdminPortalScreen';
import { MobileBottomNav } from './components/navigation/MobileBottomNav';
import { Smartphone, Monitor, X } from 'lucide-react';

import { webOSAdapter } from './utils/webos.adapter';

export const App: React.FC = () => {
  const [account, setAccount] = useState<UserAccount | null>(() => ActivationService.getSavedAccount());
  const [currentScreen, setCurrentScreen] = useState<ScreenType>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#admin') {
      return 'admin';
    }
    return ActivationService.getSavedAccount() ? 'home' : 'auth';
  });
  const [screenHistory, setScreenHistory] = useState<ScreenType[]>([]);
  const [vodPlaybackItem, setVodPlaybackItem] = useState<VodPlaybackItem | null>(null);

  // Modals & HUD state
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitModalMode, setExitModalMode] = useState<ExitModalMode>('account-logout');
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  
  const [colorSequence, setColorSequence] = useState<number[]>([]);
  const [lastRemoteKey, setLastRemoteKey] = useState<number | null>(null);

  // Mobile Simulator on PC mode
  const [isMobileSim, setIsMobileSim] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nova_mobile_sim') === 'true';
    } catch {
      return false;
    }
  });

  const [hideSimButton, setHideSimButton] = useState<boolean>(() => {
    try {
      return localStorage.getItem('nova_hide_sim_btn') === 'true';
    } catch {
      return false;
    }
  });

  const isSmartTv = typeof window !== 'undefined' && Boolean((window as any).tizen || (window as any).webapis);

  const toggleMobileSim = () => {
    setIsMobileSim(prev => {
      const next = !prev;
      try {
        localStorage.setItem('nova_mobile_sim', String(next));
      } catch {}
      return next;
    });
  };

  const dismissSimButton = () => {
    setHideSimButton(true);
    try {
      localStorage.setItem('nova_hide_sim_btn', 'true');
    } catch {}
  };

  useEffect(() => {
    document.documentElement.setAttribute('data-device', isMobileSim ? 'mobile' : 'tv');
  }, [isMobileSim]);

  // Hash listener for direct URL navigation (e.g. http://localhost:5173/#admin)
  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#admin') {
        setCurrentScreen('admin');
      }
    };
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // 1. Hardware keys & platform initialization
  useEffect(() => {
    registerTizenHardwareKeys();
    if (webOSAdapter.isWebOS()) {
      console.log('[NOVA 4K ULTRA] Running on LG webOS Smart TV');
    }
  }, []);

  // 2. Global Keydown Router for Remote & Keyboard
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode;
      setLastRemoteKey(code);

      // Check if user is actively typing in any input, textarea or editable element
      const target = e.target as HTMLElement | null;
      const isInputFocused = target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        (target as any).isContentEditable
      );

      // Backspace key (code 8):
      // User rule: "رز backspace اجعله ل حذف النص وليس الرجوع الى الوراء"
      // Never trigger back navigation on Backspace. Allow native text deletion when focused.
      if (code === TV_KEYS.BACKSPACE) {
        if (isInputFocused) {
          // Native browser input character deletion
          return;
        }
        // Outside inputs, do not navigate back
        return;
      }

      // If user is focused on an input, permit horizontal cursor movement without spatialNav hijacking
      if (isInputFocused && [TV_KEYS.LEFT, TV_KEYS.RIGHT].includes(code)) {
        return;
      }

      // Prevent default browser scrolling with arrow keys on TV
      if ([TV_KEYS.UP, TV_KEYS.DOWN, TV_KEYS.LEFT, TV_KEYS.RIGHT].includes(code)) {
        e.preventDefault();
      }

      // Check Secret Color Sequence: RED(403) -> GREEN(404) -> YELLOW(405) -> BLUE(406)
      if ([TV_KEYS.COLOR_RED, TV_KEYS.COLOR_GREEN, TV_KEYS.COLOR_YELLOW, TV_KEYS.COLOR_BLUE].includes(code)) {
        const nextSeq = [...colorSequence, code].slice(-4);
        setColorSequence(nextSeq);
        if (
          nextSeq[0] === TV_KEYS.COLOR_RED &&
          nextSeq[1] === TV_KEYS.COLOR_GREEN &&
          nextSeq[2] === TV_KEYS.COLOR_YELLOW &&
          nextSeq[3] === TV_KEYS.COLOR_BLUE
        ) {
          setIsDevUnlocked(true);
          setIsSettingsOpen(true);
        }
      }

      // If user is inside VodPlayer, let VodPlayer handle its own arrow seeking & controls!
      if (currentScreen === 'vod-player') {
        if (code === TV_KEYS.RETURN || code === TV_KEYS.WEBOS_BACK || code === TV_KEYS.ESCAPE) {
          handleBackPress();
        }
        return;
      }

      switch (code) {
        // Spatial Navigation Arrows
        case TV_KEYS.UP:
          spatialNav.navigate('UP');
          break;
        case TV_KEYS.DOWN:
          spatialNav.navigate('DOWN');
          break;
        case TV_KEYS.LEFT:
          spatialNav.navigate('LEFT');
          break;
        case TV_KEYS.RIGHT:
          spatialNav.navigate('RIGHT');
          break;
        
        // Enter / OK
        case TV_KEYS.ENTER:
          spatialNav.triggerClick();
          break;

        // Return / Back (Tizen 10009, LG webOS 461, PC Esc)
        case TV_KEYS.RETURN:
        case TV_KEYS.WEBOS_BACK:
        case TV_KEYS.ESCAPE:
          handleBackPress();
          break;

        // Info / HUD Toggle
        case TV_KEYS.INFO:
        case TV_KEYS.KEY_I:
          setIsDiagnosticsOpen(prev => !prev);
          break;

        // Color Button Shortcuts
        case TV_KEYS.COLOR_GREEN:
        case TV_KEYS.KEY_G:
          if (account) setCurrentScreen('live');
          break;
        case TV_KEYS.COLOR_YELLOW:
        case TV_KEYS.KEY_Y:
          setIsDiagnosticsOpen(prev => !prev);
          break;
        case TV_KEYS.COLOR_BLUE:
        case TV_KEYS.KEY_B:
          setIsSettingsOpen(prev => !prev);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentScreen, isDiagnosticsOpen, isSettingsOpen, isExitModalOpen, colorSequence, account, screenHistory]);

  const navigateTo = (screen: ScreenType) => {
    if (screen !== currentScreen) {
      // Isolate and stop previous media playback when navigating away
      if (currentScreen === 'live' || currentScreen === 'vod-player') {
        PlayerManager.stopAll();
      }
      setScreenHistory(prev => [...prev, currentScreen]);
      setCurrentScreen(screen);
    }
  };

  const handleBackPress = () => {
    if (isExitModalOpen) {
      setIsExitModalOpen(false);
      return;
    }
    if (isDiagnosticsOpen) {
      setIsDiagnosticsOpen(false);
      return;
    }
    if (isSettingsOpen) {
      setIsSettingsOpen(false);
      return;
    }

    // 1. Outside account on Auth / Login Screen
    // User requested: "انا خارج التطبيق في واجهة الدخول ان ضغط ESC يظهر شاشة سوداء... يجب ان لا يحدث شيء لكن في الاندرويد يتم السؤال للخروج من كل التطبيق"
    if (currentScreen === 'auth') {
      const isAndroid = typeof navigator !== 'undefined' && (
        /Android/i.test(navigator.userAgent) || 
        Boolean((window as any).Capacitor?.isNativePlatform?.())
      );

      if (isAndroid) {
        setExitModalMode('app-exit');
        setIsExitModalOpen(true);
      }
      // On Web, PC, Tizen, etc.: do NOTHING! (Never transition to a black screen!)
      return;
    }

    // 2. Inside VOD Player
    if (currentScreen === 'vod-player') {
      PlayerManager.stopAll();
      if (screenHistory.length > 0) {
        const prev = screenHistory[screenHistory.length - 1];
        setScreenHistory(h => h.slice(0, -1));
        setCurrentScreen(prev);
      } else {
        setCurrentScreen('vod');
      }
      return;
    }

    // 3. Inside Live TV
    if (currentScreen === 'live') {
      PlayerManager.stopAll();
    }

    // 4. Inside Account on Home Screen
    // User requested: "وداخل الحساب يجب ان يظهر تريد الخروج من الحساب"
    if (currentScreen === 'home') {
      setExitModalMode('account-logout');
      setIsExitModalOpen(true);
      return;
    }

    // 5. From other sub-screens (live, vod, series, favorites, admin)
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1];
      setScreenHistory(h => h.slice(0, -1));
      if (prev === 'home' && !account) {
        setCurrentScreen('auth');
      } else {
        setCurrentScreen(prev);
      }
    } else {
      setCurrentScreen(account ? 'home' : 'auth');
    }
  };

  const handleConfirmLogout = () => {
    setIsExitModalOpen(false);
    handleLogout();
  };

  const handleConfirmAppExit = () => {
    setIsExitModalOpen(false);
    PlayerManager.killActiveStreams();
    if (typeof window !== 'undefined') {
      if ((window as any).tizen) {
        try {
          (window as any).tizen.application.getCurrentApplication().exit();
          return;
        } catch (e) {
          console.log('[Tizen] Application exit error:', e);
        }
      }
      if ((window as any).webOS && typeof (window as any).webOS.platformBack === 'function') {
        try {
          (window as any).webOS.platformBack();
          return;
        } catch {}
      }
      if ((window as any).navigator?.app?.exitApp) {
        try {
          (window as any).navigator.app.exitApp();
          return;
        } catch {}
      }
      try {
        window.close();
      } catch {}
    }
  };

  const handleRemoteSimulatorKey = (keyCode: number) => {
    setLastRemoteKey(keyCode);
    const event = new KeyboardEvent('keydown', { keyCode, bubbles: true });
    window.dispatchEvent(event);
  };

  const handleLoginSuccess = (newAccount: UserAccount) => {
    setAccount(newAccount);
    setScreenHistory([]);
    setCurrentScreen('home');
  };

  const handleLogout = () => {
    // Total media wipeout: stops all streams and silences Web Audio completely
    PlayerManager.killActiveStreams();
    ActivationService.logout();
    setAccount(null);
    setScreenHistory([]);
    setCurrentScreen('auth');
    setIsSettingsOpen(false);
  };

  // Launch VOD Movie in Dedicated VodPlayer
  const handlePlayMovie = (movie: VodItem) => {
    const playbackItem: VodPlaybackItem = {
      id: movie.stream_id,
      title: movie.name,
      subtitle: `${movie.year} • ${movie.duration || '4K UHD'} • IMDb ${movie.rating}`,
      streamUrl: movie.direct_source || '',
      posterUrl: movie.stream_icon,
      backdropUrl: movie.backdrop,
      durationSec: movie.durationSec || 7200,
      streamType: 'movie',
      plot: movie.plot,
      rating: movie.rating,
      year: movie.year,
      director: movie.director,
      cast: movie.cast
    };
    setVodPlaybackItem(playbackItem);
    navigateTo('vod-player');
  };

  // Launch Series Episode in Dedicated VodPlayer
  const handlePlayEpisode = (episode: SeriesEpisode, series: SeriesItem) => {
    const playbackItem: VodPlaybackItem = {
      id: episode.id,
      title: series.name,
      subtitle: `الموسم ${episode.season_num} • الحلقة ${episode.episode_num}: ${episode.title} (${episode.duration || ''})`,
      streamUrl: episode.direct_source,
      posterUrl: episode.stream_icon || series.cover,
      backdropUrl: series.backdrop,
      durationSec: episode.durationSec || 3600,
      streamType: 'episode',
      plot: episode.overview || series.plot,
      rating: episode.rating || series.rating,
      year: series.releaseDate,
      seriesId: series.series_id,
      seasonNum: episode.season_num,
      episodeNum: episode.episode_num
    };
    setVodPlaybackItem(playbackItem);
    navigateTo('vod-player');
  };

  return (
    <div className={`w-full h-full min-h-screen ${isMobileSim ? 'bg-[#030712] flex flex-col items-center justify-center p-4' : ''}`}>
      <main className={`relative overflow-hidden bg-oled select-none transition-all duration-300 ${
        isMobileSim
          ? 'w-[390px] h-[844px] max-h-[94vh] rounded-[48px] border-[10px] border-slate-800 shadow-[0_0_60px_rgba(0,242,254,0.35)] flex flex-col'
          : 'w-screen h-screen'
      }`}>
      
      {/* VIRTUAL REMOTE SIMULATOR FOR PC & BROWSER PREVIEW */}
      <RemoteSimulator 
        onKeyPress={handleRemoteSimulatorKey} 
        currentScreen={currentScreen} 
      />

      {/* REAL-TIME DIAGNOSTICS HUD */}
      <DiagnosticsHud 
        isOpen={isDiagnosticsOpen} 
        onClose={() => setIsDiagnosticsOpen(false)} 
      />

      {/* SETTINGS & SECRET DEVELOPER MODAL */}
      {account && (
        <SettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          account={account}
          onLogout={handleLogout}
          isDevUnlocked={isDevUnlocked}
        />
      )}

      {/* EXIT / LOGOUT CONFIRMATION MODAL */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        mode={exitModalMode}
        onCancel={() => setIsExitModalOpen(false)}
        onConfirmLogout={handleConfirmLogout}
        onConfirmAppExit={handleConfirmAppExit}
      />

      {/* PRIMARY SCREEN ROUTER */}
      {currentScreen === 'admin' && (
        <AdminPortalScreen
          onBack={() => {
            window.location.hash = '';
            setCurrentScreen(account ? 'home' : 'auth');
          }}
        />
      )}

      {currentScreen === 'auth' && (
        <ActivationLogin 
          onLoginSuccess={handleLoginSuccess}
          onOpenDevPortal={() => {
            setIsDevUnlocked(true);
            setIsSettingsOpen(true);
          }}
          onOpenAdminPortal={() => {
            window.location.hash = '#admin';
            setCurrentScreen('admin');
          }}
        />
      )}

      {currentScreen === 'home' && account && (
        <HomeDashboard
          account={account}
          onNavigate={navigateTo}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        />
      )}

      {currentScreen === 'live' && (
        <LiveTvScreen
          onBackToHome={handleBackPress}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          externalTriggerKey={lastRemoteKey}
        />
      )}

      {currentScreen === 'vod' && (
        <VodScreen
          onBackToHome={handleBackPress}
          onPlayMovie={handlePlayMovie}
        />
      )}

      {currentScreen === 'series' && (
        <SeriesScreen
          onBackToHome={handleBackPress}
          onPlayEpisode={handlePlayEpisode}
        />
      )}

      {currentScreen === 'favorites' && (
        <FavoritesScreen
          onBackToHome={handleBackPress}
          onPlayMovie={handlePlayMovie}
        />
      )}

      {currentScreen === 'vod-player' && vodPlaybackItem && (
        <VodPlayer
          item={vodPlaybackItem}
          onBack={handleBackPress}
          externalTriggerKey={lastRemoteKey}
        />
      )}

      {/* MOBILE BOTTOM NAVIGATION BAR (Visible on mobile screens when logged in) */}
      {account && currentScreen !== 'auth' && currentScreen !== 'vod-player' && (
        <MobileBottomNav
          currentScreen={currentScreen}
          onNavigate={navigateTo}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {/* Floating PC Mobile Simulator Toggle Button (Hidden on Smart TVs and when dismissed) */}
      {!isSmartTv && !hideSimButton && (
        <div className="fixed top-3 left-3 z-50 flex items-center gap-1.5 backdrop-blur-xl bg-slate-950/70 p-1 rounded-full border border-white/15 shadow-xl">
          <button
            type="button"
            onClick={toggleMobileSim}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/40 text-xs font-bold text-cyan-300 active:scale-95 transition-all cursor-pointer"
            title="التبديل بين شاشة التلفاز ومحاكي الهاتف"
          >
            {isMobileSim ? (
              <>
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                <span>عرض التلفاز (TV View)</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                <span>محاكي الموبايل (Phone View)</span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={dismissSimButton}
            className="p-1 rounded-full bg-white/10 hover:bg-rose-500/30 text-slate-400 hover:text-rose-300 transition-all cursor-pointer"
            title="إخفاء زر المحاكي نهائياً"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      </main>
    </div>
  );
};
