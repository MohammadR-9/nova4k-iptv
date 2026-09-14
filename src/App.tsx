import React, { useState, useEffect, useRef } from 'react';
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
import { ProfilesModal } from './components/profile/ProfilesModal';
import { ProfileService } from './services/profile.service';
import { isMobileDevice } from './utils/device';
import { ScreenOrientationManager } from './utils/orientation';
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
  const [isProfilesModalOpen, setIsProfilesModalOpen] = useState(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState(false);
  const [exitModalMode, setExitModalMode] = useState<ExitModalMode>('account-logout');
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  
  const [colorSequence, setColorSequence] = useState<number[]>([]);
  const [lastRemoteKey, setLastRemoteKey] = useState<number | null>(null);

  // Automatic Device Detection (Mobile/Tablet vs Smart TV)
  const [isMobile, setIsMobile] = useState<boolean>(isMobileDevice);

  // Ensure current active account is saved as a profile
  useEffect(() => {
    const saved = ActivationService.getSavedAccount();
    if (saved) {
      ProfileService.autoSaveAccount(saved);
    }
  }, []);

  useEffect(() => {
    const handleDeviceMode = () => {
      const mob = isMobileDevice();
      setIsMobile(mob);
      document.documentElement.setAttribute('data-device', mob ? 'mobile' : 'tv');
    };
    handleDeviceMode();
    window.addEventListener('resize', handleDeviceMode);
    return () => window.removeEventListener('resize', handleDeviceMode);
  }, []);

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
      const code = e.keyCode || (e.key === 'Escape' ? 27 : 0);
      setLastRemoteKey(code);

      // If ExitConfirmModal is open, let ExitConfirmModal handle all navigation and actions
      if (isExitModalOpen) {
        return;
      }

      // Check if user is actively typing in any input, textarea or editable element
      const target = e.target as HTMLElement | null;
      const isInputFocused = Boolean(target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        (target as any).isContentEditable
      ));

      // If typing in an input field, handle input keys and block global shortcut hijacking
      if (isInputFocused) {
        // Escape blurs the input without navigating back
        if (e.key === 'Escape' || code === TV_KEYS.ESCAPE) {
          target?.blur();
          return;
        }

        // Backspace: allow native character deletion
        if (code === TV_KEYS.BACKSPACE) {
          return;
        }

        // Horizontal arrows: allow caret cursor movement
        if ([TV_KEYS.LEFT, TV_KEYS.RIGHT].includes(code)) {
          return;
        }

        // Vertical arrows: on non-TV devices, blur input to navigate up/down.
        // On TVs, keep focus in input — TV virtual keyboards use arrows internally!
        if ([TV_KEYS.UP, TV_KEYS.DOWN].includes(code)) {
          const isTvDevice = document.documentElement.getAttribute('data-device') === 'tv';
          if (isTvDevice) {
            // Let the TV system keyboard handle vertical navigation
            return;
          }
          target?.blur();
          // proceed to spatial navigation below
        } else {
          // All other keys (letters A-Z, a-z, digits, symbols, space, Enter, etc.):
          // Let native browser input receive the key — NEVER hijack shortcuts (b, g, y, i, etc.)!
          return;
        }
      }

      // Dedicated Escape/Back key handler (when NOT focused on an input)
      if (e.key === 'Escape' || e.key === 'Back' || e.key === 'GoBack') {
        if (currentScreen === 'vod-player' || currentScreen === 'live') {
          // Handled by dedicated screen component
          return;
        }
        handleBackPress();
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

      // If user is inside VodPlayer or LiveTV, let the screen component handle its own arrow/key controls!
      // Dual handlers (spatialNav + component keydown) cause erratic focus jumping on TV CPUs.
      if (currentScreen === 'vod-player' || currentScreen === 'live') {
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
        case TV_KEYS.ANDROID_DPAD_CENTER:
          spatialNav.triggerClick();
          break;

        // Return / Back (Tizen 10009, LG webOS 461, PC Esc, Android 4)
        case TV_KEYS.RETURN:
        case TV_KEYS.WEBOS_BACK:
        case TV_KEYS.ESCAPE:
        case TV_KEYS.ANDROID_BACK:
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

    const handleAndroidBack = () => {
      if (currentScreen === 'vod-player' || currentScreen === 'live') {
        return;
      }
      handleBackPress();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('android-back-button', handleAndroidBack);
    window.addEventListener('backbutton', handleAndroidBack);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('android-back-button', handleAndroidBack);
      window.removeEventListener('backbutton', handleAndroidBack);
    };
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

  const lastBackPressTimeRef = useRef(0);

  const handleBackPress = () => {
    const now = Date.now();
    if (now - lastBackPressTimeRef.current < 400) {
      return;
    }
    lastBackPressTimeRef.current = now;

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
      ScreenOrientationManager.exitLandscapeImmersive();
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
      // 1. Android Native via JavascriptInterface (Direct WebView Bridge)
      if ((window as any).AndroidNative && typeof (window as any).AndroidNative.exitApp === 'function') {
        try {
          (window as any).AndroidNative.exitApp();
          return;
        } catch (e) {
          console.warn('[AndroidNative] exitApp failed:', e);
        }
      }

      // 2. Android Native via Capacitor Plugin
      const cap = (window as any).Capacitor;
      if (cap?.Plugins?.AndroidNative && typeof cap.Plugins.AndroidNative.exitApp === 'function') {
        try {
          cap.Plugins.AndroidNative.exitApp();
          return;
        } catch (e) {
          console.warn('[Capacitor] AndroidNative.exitApp failed:', e);
        }
      }

      if (cap?.Plugins?.App && typeof cap.Plugins.App.exitApp === 'function') {
        try {
          cap.Plugins.App.exitApp();
          return;
        } catch (e) {
          console.warn('[Capacitor] App.exitApp failed:', e);
        }
      }

      // 3. Samsung Tizen Smart TV
      if ((window as any).tizen) {
        try {
          (window as any).tizen.application.getCurrentApplication().exit();
          return;
        } catch (e) {
          console.log('[Tizen] Application exit error:', e);
        }
      }

      // 4. LG webOS Smart TV
      if ((window as any).webOS && typeof (window as any).webOS.platformBack === 'function') {
        try {
          (window as any).webOS.platformBack();
          return;
        } catch {}
      }

      // 5. Cordova legacy
      if ((window as any).navigator?.app?.exitApp) {
        try {
          (window as any).navigator.app.exitApp();
          return;
        } catch {}
      }

      // 6. Browser / Electron fallback
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

  const handleSwitchAccount = (newAccount: UserAccount) => {
    setAccount(newAccount);
    setScreenHistory([]);
    setCurrentScreen('home');
    setIsProfilesModalOpen(false);
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
    <div className="w-full max-w-full h-full min-h-screen bg-oled overflow-x-hidden overflow-y-hidden">
      <main className="relative w-full max-w-full h-full min-h-screen overflow-x-hidden bg-oled select-none touch-pan-y overscroll-x-none">
      
      {/* VIRTUAL REMOTE SIMULATOR FOR PC DEV PREVIEW ONLY (Never on Mobile or Production) */}
      {!isMobile && typeof window !== 'undefined' && window.location.port === '5173' && (
        <RemoteSimulator 
          onKeyPress={handleRemoteSimulatorKey} 
          currentScreen={currentScreen} 
        />
      )}

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
          onOpenProfiles={() => setIsProfilesModalOpen(true)}
        />
      )}

      {/* SAVED PROFILES & SUBSCRIPTION MANAGER MODAL */}
      <ProfilesModal
        isOpen={isProfilesModalOpen}
        onClose={() => setIsProfilesModalOpen(false)}
        currentAccount={account}
        onSwitchAccount={handleSwitchAccount}
        onLogout={handleLogout}
      />

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
          onOpenProfiles={() => setIsProfilesModalOpen(true)}
          onRequestExit={() => {
            setExitModalMode('account-logout');
            setIsExitModalOpen(true);
          }}
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
      {isMobile && account && currentScreen !== 'auth' && currentScreen !== 'vod-player' && (
        <MobileBottomNav
          currentScreen={currentScreen}
          onNavigate={navigateTo}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenProfiles={() => setIsProfilesModalOpen(true)}
        />
      )}

      </main>
    </div>
  );
};
