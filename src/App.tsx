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
import { ExitConfirmModal } from './components/common/ExitConfirmModal';
import { AdminPortalScreen } from './components/admin/AdminPortalScreen';
import { DeviceDetector, DeviceMode } from './utils/device';
import { MobileApp } from './components/mobile/MobileApp';

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
  const [isDevUnlocked, setIsDevUnlocked] = useState(false);
  
  const [colorSequence, setColorSequence] = useState<number[]>([]);
  const [lastRemoteKey, setLastRemoteKey] = useState<number | null>(null);

  // Device Mode detection (TV vs Mobile/Tablet)
  const [deviceMode, setDeviceMode] = useState<DeviceMode>(() => DeviceDetector.getDeviceMode());

  useEffect(() => {
    const handleDeviceChange = () => {
      setDeviceMode(DeviceDetector.getDeviceMode());
    };
    window.addEventListener('device-mode-changed', handleDeviceChange);
    window.addEventListener('resize', handleDeviceChange);
    return () => {
      window.removeEventListener('device-mode-changed', handleDeviceChange);
      window.removeEventListener('resize', handleDeviceChange);
    };
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
      const code = e.keyCode;
      setLastRemoteKey(code);

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
        if (code === TV_KEYS.RETURN || code === TV_KEYS.WEBOS_BACK || code === TV_KEYS.BACKSPACE || code === TV_KEYS.ESCAPE) {
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

        // Return / Back (Tizen 10009, LG webOS 461, PC Esc/Backspace)
        case TV_KEYS.RETURN:
        case TV_KEYS.WEBOS_BACK:
        case TV_KEYS.BACKSPACE:
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
    if (currentScreen === 'live') {
      PlayerManager.stopAll();
    }
    if (currentScreen === 'home') {
      setIsExitModalOpen(true);
      return;
    }
    if (screenHistory.length > 0) {
      const prev = screenHistory[screenHistory.length - 1];
      setScreenHistory(h => h.slice(0, -1));
      setCurrentScreen(prev);
    } else {
      setCurrentScreen('home');
    }
  };

  const handleConfirmExit = () => {
    setIsExitModalOpen(false);
    PlayerManager.killActiveStreams();
    if (typeof window !== 'undefined' && (window as any).tizen) {
      try {
        (window as any).tizen.application.getCurrentApplication().exit();
      } catch (e) {
        console.log('[Tizen] Application exit error:', e);
      }
    } else {
      handleLogout();
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
    <main className="relative w-screen h-screen overflow-hidden bg-oled select-none">
      
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

      {/* SAMSUNG TV EXIT CONFIRMATION MODAL */}
      <ExitConfirmModal
        isOpen={isExitModalOpen}
        onCancel={() => setIsExitModalOpen(false)}
        onConfirmExit={handleConfirmExit}
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

      {/* 📱 MOBILE / TABLET DEDICATED APP EXPERIENCE */}
      {deviceMode === 'mobile' && currentScreen !== 'admin' && (
        <MobileApp
          onSwitchToTvMode={() => DeviceDetector.setDeviceModeOverride('tv')}
          onOpenAdminPortal={() => {
            window.location.hash = '#admin';
            setCurrentScreen('admin');
          }}
        />
      )}

      {/* 📺 SMART TV DEDICATED APP EXPERIENCE */}
      {deviceMode === 'tv' && currentScreen === 'auth' && (
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

      {deviceMode === 'tv' && currentScreen === 'home' && account && (
        <HomeDashboard
          account={account}
          onNavigate={navigateTo}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
        />
      )}

      {deviceMode === 'tv' && currentScreen === 'live' && (
        <LiveTvScreen
          onBackToHome={handleBackPress}
          onOpenDiagnostics={() => setIsDiagnosticsOpen(true)}
          externalTriggerKey={lastRemoteKey}
        />
      )}

      {deviceMode === 'tv' && currentScreen === 'vod' && (
        <VodScreen
          onBackToHome={handleBackPress}
          onPlayMovie={handlePlayMovie}
        />
      )}

      {deviceMode === 'tv' && currentScreen === 'series' && (
        <SeriesScreen
          onBackToHome={handleBackPress}
          onPlayEpisode={handlePlayEpisode}
        />
      )}

      {deviceMode === 'tv' && currentScreen === 'favorites' && (
        <FavoritesScreen
          onBackToHome={handleBackPress}
          onPlayMovie={handlePlayMovie}
        />
      )}

      {deviceMode === 'tv' && currentScreen === 'vod-player' && vodPlaybackItem && (
        <VodPlayer
          item={vodPlaybackItem}
          onBack={handleBackPress}
          externalTriggerKey={lastRemoteKey}
        />
      )}

      {/* Floating UI Mode Switcher (visible in TV mode on desktop/emulator) */}
      {deviceMode === 'tv' && (
        <button
          type="button"
          onClick={() => DeviceDetector.setDeviceModeOverride('mobile')}
          className="fixed top-3 right-3 z-50 px-2.5 py-1 rounded-full bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[10px] font-bold text-cyan-300 backdrop-blur-md shadow-md active:scale-95 transition-all"
          title="التبديل إلى واجهة الموبايل"
        >
          📱 تجربة واجهة الموبايل
        </button>
      )}

    </main>
  );
};
