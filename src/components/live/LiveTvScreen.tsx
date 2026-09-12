import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  Tv, Star, Maximize2, Minimize2,
  Volume2, VolumeX, ShieldCheck, ArrowLeft, Search, X,
  Layers, Camera, Video, Settings2, Subtitles,
  ChevronLeft, ChevronRight
} from 'lucide-react';
import { LiveCategory, LiveChannel } from '../../types/iptv.types';
import { XtreamService } from '../../services/xtream.service';
import { PlayerManager } from '../../player/PlayerManager';
import { 
  PlayerEngineType, 
  BufferProfile, 
  AspectRatioMode, 
  PlayerAudioTrack, 
  PlayerSubtitleTrack,
  ScreenshotResult, 
  RecordingResult, 
  RecordingState 
} from '../../player/types';
import { ScreenshotModal } from './ScreenshotModal';
import { DvrRecordingBar } from './DvrRecordingBar';
import { AudioSettingsModal } from './AudioSettingsModal';
import { SubtitleDubbingModal } from './SubtitleDubbingModal';
import { ChannelReorderModal } from './ChannelReorderModal';
import { isMobileDevice } from '../../utils/device';
import { ScreenOrientationManager } from '../../utils/orientation';
import { matchesSearch, matchesItemMetadata } from '../../utils/searchHelper';

interface LiveTvScreenProps {
  onBackToHome: () => void;
  onOpenDiagnostics: () => void;
  externalTriggerKey?: number | null;
}

export const LiveTvScreen: React.FC<LiveTvScreenProps> = ({ onBackToHome, onOpenDiagnostics, externalTriggerKey }) => {
  // 0ms Instant Hydration: Categories & Curated Channels available IMMEDIATELY on mount
  const initialCurated = useMemo(() => XtreamService.getCuratedLiveChannels('all'), []);
  const [categories, setCategories] = useState<LiveCategory[]>([
    { category_id: 'all', category_name: '★ جميع القنوات المباشرة' },
    { category_id: 'sports', category_name: '⚽ باقة الرياضة العالمية (Sports 4K)' },
    { category_id: 'news', category_name: '🌍 باقة الأخبار والأحداث المباشرة (News)' },
    { category_id: 'entertainment', category_name: '🎬 القنوات الترفيهية والسينمائية (Cinema)' },
    { category_id: 'documentary', category_name: '🦁 القنوات الوثائقية والطبيعة (Doc 4K)' },
    { category_id: 'kids', category_name: '👶 باقة الأطفال والرسوم المتحركة (Kids)' }
  ]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [allChannels, setAllChannels] = useState<LiveChannel[]>(initialCurated);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(initialCurated[0] || null);

  // Mobile vs TV Device Mode detection
  const [isMobileMode, setIsMobileMode] = useState<boolean>(isMobileDevice);

  useEffect(() => {
    const checkMode = () => {
      setIsMobileMode(isMobileDevice());
    };
    window.addEventListener('resize', checkMode);
    return () => window.removeEventListener('resize', checkMode);
  }, []);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [categorySearch, setCategorySearch] = useState('');
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_favorite_ids');
      return saved ? JSON.parse(saved) : [101, 105, 112];
    } catch {
      return [101, 105, 112];
    }
  });

  // UI Visibility States
  const [isBuffering, setIsBuffering] = useState(false);
  const bufferingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(40);
  const [isCategoryLoading, setIsCategoryLoading] = useState<boolean>(false);

  // Audio mute & autoplay prompt
  const [isMuted, setIsMuted] = useState(false);
  const [showUnmuteBanner, setShowUnmuteBanner] = useState(false);

  // Engine & Anti-Freeze State
  const [activeEngine] = useState<PlayerEngineType>(() => {
    return (localStorage.getItem('nova_default_engine') as PlayerEngineType) || 'exoplayer';
  });
  const [bufferProfile] = useState<BufferProfile>(() => {
    const preset = localStorage.getItem('nova_buffer_preset') || 'BALANCED';
    return preset === 'FAST' ? 'turbo' : preset === 'STABLE' ? 'anti-freeze' : 'balanced';
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>(() => {
    return (localStorage.getItem('nova_default_aspect_ratio') as AspectRatioMode) || 'fit';
  });
  const [recoveryToast, setRecoveryToast] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Audio & Subtitle State
  const [audioTracks, setAudioTracks] = useState<PlayerAudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<PlayerSubtitleTrack[]>([]);
  const [subtitleModalOpen, setSubtitleModalOpen] = useState(false);
  const [currentVolume, setCurrentVolume] = useState<number>(1.0);
  const [subtitleCueText, setSubtitleCueText] = useState<string | null>(null);

  // DVR & Screenshot Modals
  const [screenshotModalOpen, setScreenshotModalOpen] = useState(false);
  const [activeScreenshot, setActiveScreenshot] = useState<ScreenshotResult | null>(null);

  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [recordingDuration, setRecordingDuration] = useState<number>(0);
  const [lastRecordingResult, setLastRecordingResult] = useState<RecordingResult | null>(null);

  const [audioSettingsOpen, setAudioSettingsOpen] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);

  // 📺 Smart TV Cinema 3-Column States
  const [tvIsFullscreen, setTvIsFullscreen] = useState(false);
  const [tvOsdVisible, setTvOsdVisible] = useState(false);
  const tvOsdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tvFocusedColumn, setTvFocusedColumn] = useState<'categories' | 'channels' | 'preview'>('channels');
  const [tvFocusedCatIndex, setTvFocusedCatIndex] = useState<number>(0);
  const [tvFocusedChannelIndex, setTvFocusedChannelIndex] = useState<number>(0);
  const [tvTimeStr, setTvTimeStr] = useState<string>(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  });

  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setTvTimeStr(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
    }, 10000);
    return () => clearInterval(t);
  }, []);

  const showTvOsd = useCallback(() => {
    setTvOsdVisible(true);
    if (tvOsdTimerRef.current) clearTimeout(tvOsdTimerRef.current);
    tvOsdTimerRef.current = setTimeout(() => {
      setTvOsdVisible(false);
    }, 3500);
  }, []);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const player = useRef(PlayerManager.getPlayer(activeEngine));

  // 0. Watchdog to absolutely guarantee buffering spinner never gets stuck
  useEffect(() => {
    let timer: any;
    if (isBuffering) {
      timer = setTimeout(() => {
        setIsBuffering(false);
      }, 2500);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isBuffering]);

  // 1. Background sync from server (without interrupting current playback)
  useEffect(() => {
    let isMounted = true;

    const syncServerData = async () => {
      try {
        const [cats, chs] = await Promise.all([
          XtreamService.getLiveCategories(),
          XtreamService.getLiveChannels('all')
        ]);

        if (!isMounted) return;

        let reorderedChs = chs;
        let reorderedCats = cats;

        try {
          const savedChOrder = localStorage.getItem('iptv_custom_channel_order');
          if (savedChOrder && chs.length > 0) {
            const ids: number[] = JSON.parse(savedChOrder);
            const map = new Map(chs.map(c => [c.stream_id, c]));
            const list: LiveChannel[] = [];
            ids.forEach(id => {
              const item = map.get(id);
              if (item) { list.push(item); map.delete(id); }
            });
            map.forEach(item => list.push(item));
            reorderedChs = list;
          }

          const savedCatOrder = localStorage.getItem('iptv_custom_category_order');
          if (savedCatOrder && cats.length > 0) {
            const catIds: string[] = JSON.parse(savedCatOrder);
            const catMap = new Map(cats.map(c => [c.category_id, c]));
            const catList: LiveCategory[] = [];
            catIds.forEach(id => {
              const item = catMap.get(id);
              if (item) { catList.push(item); catMap.delete(id); }
            });
            catMap.forEach(item => catList.push(item));
            reorderedCats = catList;
          }
        } catch (e) {
          console.warn('[LiveTvScreen] Error loading custom order:', e);
        }

        if (isMounted) {
          if (reorderedCats.length > 0) {
            setCategories(reorderedCats);
            // Background prefetch prominent categories so user clicks are instant 0ms!
            XtreamService.prefetchLiveCategories(reorderedCats.map(c => c.category_id));
          }
          if (reorderedChs.length > 0) {
            setAllChannels(reorderedChs);
            setActiveChannel(prev => {
              if (prev && reorderedChs.some(c => c.stream_id === prev.stream_id)) return prev;
              return reorderedChs[0];
            });
          }
        }
      } catch (err) {
        console.warn('[LiveTvScreen] Server sync note:', err);
      }
    };

    syncServerData();

    return () => {
      isMounted = false;
    };
  }, []);

  // 2. Initialize video player in Container (Runs on mount & when device mode switches)
  useEffect(() => {
    if (videoContainerRef.current) {
      player.current.setBufferProfile(bufferProfile);
      player.current.initialize(videoContainerRef.current, {
        onPlaying: () => {
          if (bufferingDebounceRef.current) {
            clearTimeout(bufferingDebounceRef.current);
            bufferingDebounceRef.current = null;
          }
          setIsBuffering(false);
          const vid = player.current.getVideoElement();
          const isTvEnvironment = typeof window !== 'undefined' && Boolean((window as any).tizen || (window as any).webapis);
          if (vid && vid.muted && !isMuted && !isTvEnvironment) {
            setShowUnmuteBanner(true);
          } else {
            setShowUnmuteBanner(false);
          }
        },
        onBuffering: (buffering) => {
          if (buffering) {
            if (!bufferingDebounceRef.current) {
              bufferingDebounceRef.current = setTimeout(() => {
                bufferingDebounceRef.current = null;
                setIsBuffering(true);
              }, 2000);
            }
          } else {
            if (bufferingDebounceRef.current) {
              clearTimeout(bufferingDebounceRef.current);
              bufferingDebounceRef.current = null;
            }
            setIsBuffering(false);
          }
        },
        onError: (err) => console.error('[LiveTvScreen] Player error:', err),
        onAudioTracksUpdated: (tracks) => setAudioTracks(tracks),
        onSubtitleTracksUpdated: (tracks) => setSubtitleTracks(tracks),
        onSubtitleCue: (cue) => setSubtitleCueText(cue ? cue.text : null),
        onRecordingStatusChange: (state, sec) => {
          setRecordingState(state);
          setRecordingDuration(sec);
        },
        onAutoRecovered: (msg) => {
          setRecoveryToast(msg);
          setTimeout(() => setRecoveryToast(null), 3500);
        }
      });

      // Load active channel immediately into the initialized container
      if (activeChannel) {
        const streamType = activeChannel.direct_source.includes('.m3u8') ? 'HLS' : activeChannel.direct_source.includes('.ts') ? 'MPEG-TS' : 'HLS';
        PlayerManager.cacheStreamInfo(activeChannel.direct_source, streamType);
        player.current.loadStream(activeChannel.direct_source, streamType);
      }
      // Auto-hide unmute prompt whenever video becomes unmuted
      const vid = player.current.getVideoElement();
      const onVolumeChange = () => {
        if (vid && !vid.muted) {
          setShowUnmuteBanner(false);
        }
      };
      if (vid) {
        vid.addEventListener('volumechange', onVolumeChange);
      }
    }

    return () => {
      const vid = player.current.getVideoElement();
      if (vid) {
        vid.removeEventListener('volumechange', () => {});
      }
      if (bufferingDebounceRef.current) {
        clearTimeout(bufferingDebounceRef.current);
        bufferingDebounceRef.current = null;
      }
      PlayerManager.stopAll();
    };
  }, [isMobileMode]);

  // 3. Play active channel stream when changed
  const channelDebounceTimer = useRef<any>(null);
  useEffect(() => {
    if (activeChannel) {
      if (tvIsFullscreen) {
        showTvOsd();
      }

      if (channelDebounceTimer.current) {
        clearTimeout(channelDebounceTimer.current);
      }

      channelDebounceTimer.current = setTimeout(() => {
        const streamType = activeChannel.direct_source.includes('.m3u8') ? 'HLS' : activeChannel.direct_source.includes('.ts') ? 'MPEG-TS' : 'HLS';
        PlayerManager.cacheStreamInfo(activeChannel.direct_source, streamType);
        player.current.loadStream(activeChannel.direct_source, streamType);
      }, 120);
    }

    return () => {
      if (channelDebounceTimer.current) {
        clearTimeout(channelDebounceTimer.current);
      }
    };
  }, [activeChannel, tvIsFullscreen, showTvOsd]);

  const handleUnmute = () => {
    const vid = player.current.getVideoElement();
    if (vid) {
      vid.muted = false;
      player.current.setVolume(currentVolume || 1.0);
    }
    setIsMuted(false);
    setShowUnmuteBanner(false);
  };

  // Toggle Favorites
  const toggleFavorite = (channelId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(channelId) ? prev.filter(id => id !== channelId) : [...prev, channelId];
      try {
        localStorage.setItem('iptv_favorite_ids', JSON.stringify(next));
      } catch {}
      return next;
    });
  };



  // Cycle Aspect Ratio / Zoom Modes
  const handleCycleAspectRatio = () => {
    const modes: AspectRatioMode[] = [
      'fit',         // تناسب تلقائي
      'fill',        // ملء الشاشة
      'stretch',     // تمديد عريض
      'cinema',      // سينما 21:9
      '16:9',        // عريض قياسي
      '4:3',         // سواد على الجوانب
      'letterbox',   // سواد أعلى وأسفل
      'zoom-120',    // تقريب 120%
      'zoom-150'     // تقريب 150%
    ];
    const idx = modes.indexOf(aspectRatio);
    const next = modes[(idx + 1) % modes.length];
    setAspectRatio(next);
    player.current.setAspectRatio(next);

    const names: Record<AspectRatioMode, string> = {
      'fit': 'تناسب تلقائي (Auto Fit)',
      'fill': 'ملء الشاشة (Cover Fill)',
      'stretch': 'شاشة ممتدة بالكامل (Full Stretch)',
      'cinema': 'سينمائي عريض 21:9 (Cinema Scope)',
      '16:9': 'شاشة عريضة 16:9 (Standard Wide)',
      '4:3': 'شاشة كلاسيكية 4:3 (Pillarbox - سواد على الجوانب)',
      'letterbox': 'شريط سينمائي (Letterbox - سواد أعلى وأسفل)',
      'zoom-120': 'تكبير ذكي 120% (Zoom+)',
      'zoom-150': 'تكبير فائق 150% (Zoom Max)'
    };
    setRecoveryToast(`وضع الشاشة: ${names[next]}`);
    setTimeout(() => setRecoveryToast(null), 2500);
  };

  // Screenshot Capture
  const handleTakeScreenshot = async () => {
    try {
      const res = await player.current.captureScreenshot();
      setActiveScreenshot(res);
      setScreenshotModalOpen(true);
    } catch (err: any) {
      alert(err?.message || 'تعذر التقاط لقطة الشاشة');
    }
  };

  // DVR Recording
  const handleToggleRecording = async () => {
    if (recordingState === 'recording') {
      const res = await player.current.stopRecording();
      setLastRecordingResult(res);
    } else {
      await player.current.startRecording();
    }
  };

  // Save Reordered Channels & Categories
  const handleSaveReorder = (newChs: LiveChannel[], newCats: LiveCategory[]) => {
    setAllChannels(newChs);
    setCategories(newCats);
    try {
      localStorage.setItem('iptv_custom_channel_order', JSON.stringify(newChs.map(c => c.stream_id)));
      localStorage.setItem('iptv_custom_category_order', JSON.stringify(newCats.map(c => c.category_id)));
    } catch {}
  };

  // Filtered Categories based on category search query
  const filteredCategories = useMemo(() => {
    if (!categorySearch.trim()) return categories;
    return categories.filter(c => matchesSearch(c.category_name, categorySearch));
  }, [categories, categorySearch]);

  // Channel counts per category
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const ch of allChannels) {
      counts[ch.category_id] = (counts[ch.category_id] || 0) + 1;
    }
    return counts;
  }, [allChannels]);

  // Category change channel loader (Instant 0ms memory cache in XtreamService)
  useEffect(() => {
    let isMounted = true;
    if (selectedCatId === 'favorites') {
      setIsCategoryLoading(false);
      return;
    }

    const cached = XtreamService.getCachedLiveChannels(selectedCatId);
    if (cached && cached.length > 0) {
      setAllChannels(cached);
      setIsCategoryLoading(false);
      return;
    }

    // Immediately clear previous category channels so they never linger
    setAllChannels([]);
    setIsCategoryLoading(true);

    const loadCategoryChannels = async () => {
      try {
        const chs = await XtreamService.getLiveChannels(selectedCatId);
        if (isMounted) {
          setAllChannels(chs);
        }
      } catch (err) {
        console.warn('[LiveTvScreen] Failed to load channels for category:', selectedCatId, err);
      } finally {
        if (isMounted) {
          setIsCategoryLoading(false);
        }
      }
    };

    loadCategoryChannels();
    return () => { isMounted = false; };
  }, [selectedCatId]);

  // Filtered Channels computation (Arabic & Multilingual Normalized Search)
  const filteredChannels = useMemo(() => {
    return allChannels.filter(ch => {
      if (selectedCatId === 'favorites' && !favorites.includes(ch.stream_id)) return false;

      if (searchQuery.trim()) {
        const itemObj = {
          name: ch.name,
          num: ch.num,
          epg_channel_id: ch.epg_channel_id,
          plot: ch.currentProgram?.title
        };
        if (!matchesItemMetadata(itemObj, searchQuery)) return false;
      }
      return true;
    });
  }, [allChannels, selectedCatId, searchQuery, favorites]);

  // TV Categories List with All & Favorites
  const tvCategoriesList = useMemo(() => {
    const list: { id: string; name: string; count: number }[] = [
      { id: 'all', name: '★ جميع القنوات المباشرة', count: allChannels.length },
      { id: 'favorites', name: '⭐ القنوات المفضلة', count: favorites.length }
    ];
    filteredCategories.filter(c => c.category_id !== 'all').forEach(c => {
      const count = c.stream_count !== undefined ? c.stream_count : (categoryCounts[c.category_id] || 0);
      list.push({
        id: c.category_id,
        name: c.category_name,
        count
      });
    });
    return list;
  }, [filteredCategories, allChannels.length, favorites.length, categoryCounts]);

  // Keep TV focused channel in bounds
  useEffect(() => {
    if (tvFocusedChannelIndex >= filteredChannels.length && filteredChannels.length > 0) {
      setTvFocusedChannelIndex(filteredChannels.length - 1);
    }
  }, [filteredChannels.length, tvFocusedChannelIndex]);

  // Smooth scroll focused elements into view for TV remote navigation
  useEffect(() => {
    if (!isMobileMode && tvFocusedColumn === 'channels') {
      const el = document.querySelector(`[data-tv-ch-idx="${tvFocusedChannelIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [tvFocusedChannelIndex, tvFocusedColumn, isMobileMode]);

  useEffect(() => {
    if (!isMobileMode && tvFocusedColumn === 'categories') {
      const el = document.querySelector(`[data-tv-cat-idx="${tvFocusedCatIndex}"]`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [tvFocusedCatIndex, tvFocusedColumn, isMobileMode]);

  // Channel Up / Down Rockers
  useEffect(() => {
    if (!externalTriggerKey || filteredChannels.length === 0) return;
    if (externalTriggerKey === 427 || externalTriggerKey === 33) {
      const currentIndex = filteredChannels.findIndex(c => c.stream_id === activeChannel?.stream_id);
      const nextIndex = (currentIndex + 1) % filteredChannels.length;
      setActiveChannel(filteredChannels[nextIndex]);
    } else if (externalTriggerKey === 428 || externalTriggerKey === 34) {
      const currentIndex = filteredChannels.findIndex(c => c.stream_id === activeChannel?.stream_id);
      const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
      setActiveChannel(filteredChannels[prevIndex]);
    }
  }, [externalTriggerKey, filteredChannels, activeChannel]);

  // Mobile Fullscreen & Orientation Management
  const [showMobileOverlay, setShowMobileOverlay] = useState<boolean>(true);
  const mobileOverlayTimeoutRef = useRef<any>(null);

  const resetMobileOverlayTimer = useCallback(() => {
    setShowMobileOverlay(true);
    if (mobileOverlayTimeoutRef.current) {
      clearTimeout(mobileOverlayTimeoutRef.current);
    }
    mobileOverlayTimeoutRef.current = setTimeout(() => {
      setShowMobileOverlay(false);
    }, 3500);
  }, []);

  const handleEnterMobileFullscreen = async (channelToPlay?: LiveChannel) => {
    if (channelToPlay && channelToPlay.stream_id !== activeChannel?.stream_id) {
      setActiveChannel(channelToPlay);
    }
    setIsFullscreen(true);
    const preferredRatio = (localStorage.getItem('nova_default_aspect_ratio') as AspectRatioMode) || 'fit';
    setAspectRatio(preferredRatio);
    player.current.setAspectRatio(preferredRatio);
    await ScreenOrientationManager.enterLandscapeImmersive();
    resetMobileOverlayTimer();
  };

  const handleExitMobileFullscreen = async () => {
    setIsFullscreen(false);
    if (mobileOverlayTimeoutRef.current) {
      clearTimeout(mobileOverlayTimeoutRef.current);
    }
    await ScreenOrientationManager.exitLandscapeImmersive();
  };

  const handleNextChannel = () => {
    if (filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex(c => c.stream_id === activeChannel?.stream_id);
    const nextIndex = (currentIndex + 1) % filteredChannels.length;
    setActiveChannel(filteredChannels[nextIndex]);
    resetMobileOverlayTimer();
  };

  const handlePrevChannel = () => {
    if (filteredChannels.length === 0) return;
    const currentIndex = filteredChannels.findIndex(c => c.stream_id === activeChannel?.stream_id);
    const prevIndex = (currentIndex - 1 + filteredChannels.length) % filteredChannels.length;
    setActiveChannel(filteredChannels[prevIndex]);
    resetMobileOverlayTimer();
  };

  // Intercept Android hardware Back & ESC key for multi-level navigation
  useEffect(() => {
    const handleBackAction = () => {
      if (screenshotModalOpen) {
        setScreenshotModalOpen(false);
        return;
      }
      if (audioSettingsOpen) {
        setAudioSettingsOpen(false);
        return;
      }
      if (subtitleModalOpen) {
        setSubtitleModalOpen(false);
        return;
      }
      if (reorderModalOpen) {
        setReorderModalOpen(false);
        return;
      }
      if (tvIsFullscreen) {
        setTvIsFullscreen(false);
        return;
      }
      if (isFullscreen) {
        handleExitMobileFullscreen();
        return;
      }
      if (!isMobileMode && tvFocusedColumn === 'preview') {
        setTvFocusedColumn('channels');
        return;
      }
      if (!isMobileMode && tvFocusedColumn === 'channels') {
        setTvFocusedColumn('categories');
        return;
      }
      // Cleanly exit to Home
      onBackToHome();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Back button (Remote Return, ESC, Tizen 10009)
      if (e.keyCode === 10009 || e.keyCode === 27 || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        handleBackAction();
        return;
      }

      // If user is typing in search input, don't capture navigation keys
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
        if (e.key === 'Escape' || e.keyCode === 27) {
          (document.activeElement as HTMLElement)?.blur();
        }
        return;
      }

      // Modal open? Let modal handle its own keys
      if (screenshotModalOpen || audioSettingsOpen || subtitleModalOpen || reorderModalOpen) {
        return;
      }

      // 2. Fullscreen TV Mode Remote Navigation
      if (tvIsFullscreen) {
        if (e.key === 'ArrowUp' || e.keyCode === 38 || e.keyCode === 427 || e.key === 'PageUp') {
          e.preventDefault();
          handlePrevChannel();
          showTvOsd();
          return;
        }
        if (e.key === 'ArrowDown' || e.keyCode === 40 || e.keyCode === 428 || e.key === 'PageDown') {
          e.preventDefault();
          handleNextChannel();
          showTvOsd();
          return;
        }
        if (e.key === 'Enter' || e.keyCode === 13 || e.key === ' ') {
          e.preventDefault();
          showTvOsd();
          return;
        }
        if (e.key === 'ArrowLeft' || e.keyCode === 37) {
          e.preventDefault();
          setTvIsFullscreen(false);
          return;
        }
        return;
      }

      // 3. 3-Column Cinema TV Guide Remote Navigation (Smart TV Mode)
      if (!isMobileMode) {
        if (tvFocusedColumn === 'categories') {
          if (e.key === 'ArrowUp' || e.keyCode === 38) {
            e.preventDefault();
            setTvFocusedCatIndex(prev => {
              const next = Math.max(0, prev - 1);
              const targetCat = tvCategoriesList[next];
              if (targetCat) setSelectedCatId(targetCat.id);
              return next;
            });
            return;
          }
          if (e.key === 'ArrowDown' || e.keyCode === 40) {
            e.preventDefault();
            setTvFocusedCatIndex(prev => {
              const next = Math.min(tvCategoriesList.length - 1, prev + 1);
              const targetCat = tvCategoriesList[next];
              if (targetCat) setSelectedCatId(targetCat.id);
              return next;
            });
            return;
          }
          // In RTL, ArrowLeft moves focus inwards towards Channels
          if (e.key === 'ArrowLeft' || e.keyCode === 37 || e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            setTvFocusedColumn('channels');
            setTvFocusedChannelIndex(0);
            return;
          }
        } else if (tvFocusedColumn === 'channels') {
          if (e.key === 'ArrowUp' || e.keyCode === 38) {
            e.preventDefault();
            setTvFocusedChannelIndex(prev => Math.max(0, prev - 1));
            return;
          }
          if (e.key === 'ArrowDown' || e.keyCode === 40) {
            e.preventDefault();
            setTvFocusedChannelIndex(prev => Math.min(filteredChannels.length - 1, prev + 1));
            return;
          }
          // In RTL, ArrowRight moves back outwards to Categories
          if (e.key === 'ArrowRight' || e.keyCode === 39) {
            e.preventDefault();
            setTvFocusedColumn('categories');
            return;
          }
          // In RTL, ArrowLeft moves towards Preview / Action buttons
          if (e.key === 'ArrowLeft' || e.keyCode === 37) {
            e.preventDefault();
            setTvFocusedColumn('preview');
            return;
          }
          if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            const ch = filteredChannels[tvFocusedChannelIndex];
            if (ch) {
              if (activeChannel?.stream_id === ch.stream_id) {
                setTvIsFullscreen(true);
                showTvOsd();
              } else {
                setActiveChannel(ch);
              }
            }
            return;
          }
        } else if (tvFocusedColumn === 'preview') {
          // In RTL, ArrowRight moves back to Channels
          if (e.key === 'ArrowRight' || e.keyCode === 39) {
            e.preventDefault();
            setTvFocusedColumn('channels');
            return;
          }
          if (e.key === 'Enter' || e.keyCode === 13) {
            e.preventDefault();
            setTvIsFullscreen(true);
            showTvOsd();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('android-back-button', handleBackAction);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('android-back-button', handleBackAction);
    };
  }, [
    screenshotModalOpen,
    audioSettingsOpen,
    subtitleModalOpen,
    reorderModalOpen,
    tvIsFullscreen,
    isFullscreen,
    isMobileMode,
    tvFocusedColumn,
    tvFocusedCatIndex,
    tvFocusedChannelIndex,
    tvCategoriesList,
    filteredChannels,
    activeChannel,
    onBackToHome,
    showTvOsd,
    handlePrevChannel,
    handleNextChannel
  ]);

  // Clean exit orientation on unmount
  useEffect(() => {
    return () => {
      ScreenOrientationManager.exitLandscapeImmersive();
    };
  }, []);

  return (
    <div className="relative w-full max-w-full h-full min-h-screen bg-black overflow-x-hidden overflow-y-hidden select-none touch-pan-y overscroll-x-none">

      {/* Auto-Recovery Toast Notification */}
      {recoveryToast && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{recoveryToast}</span>
        </div>
      )}

      {/* =========================================================================
          MODE A: 📱 DEDICATED MOBILE & TABLET LAYOUT (Top Player + Channels Below)
         ========================================================================= */}
      {isMobileMode ? (
        <div className="w-full max-w-full h-full min-h-screen flex flex-col bg-[#07090e] text-white overflow-x-hidden touch-pan-y overscroll-x-none">
          
          {/* 1. Mobile Header (Hidden when in fullscreen) */}
          {!isFullscreen && (
            <div className="w-full px-3 py-2.5 bg-slate-950/90 border-b border-white/10 flex items-center justify-between shrink-0 z-30">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
                  title="العودة للرئيسية"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <h1 className="text-xs font-black text-white flex items-center gap-1.5">
                    <Tv className="w-4 h-4 text-cyan-400" />
                    <span>البث المباشر (NOVA 4K)</span>
                  </h1>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {filteredChannels.length} قناة متاحة
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setReorderModalOpen(true)}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400"
                  title="إعادة الترتيب"
                >
                  <Layers className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onOpenDiagnostics}
                  className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-cyan-400"
                  title="لوحة التشخيص"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 2. Top Sticky 16:9 Video Player (Transforms to Fullscreen Landscape Immersive) */}
          <div 
            ref={videoContainerRef}
            data-fullscreen={isFullscreen ? "true" : undefined}
            onClick={() => {
              if (isFullscreen) {
                resetMobileOverlayTimer();
              } else {
                handleEnterMobileFullscreen();
              }
            }}
            className={
              isFullscreen
                ? "fixed inset-0 w-screen h-screen z-[9999] bg-black overflow-hidden select-none cursor-pointer video-fill-screen"
                : "relative w-full aspect-video bg-black z-20 shrink-0 overflow-hidden shadow-2xl border-b border-white/10 cursor-pointer"
            }
          >
            {/* Ambient Vignette */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/30 pointer-events-none z-10" />

            {/* Live Subtitle Cues */}
            {subtitleCueText && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 max-w-[90%] px-3 py-1 rounded-lg bg-black/80 border border-white/10 text-center pointer-events-none">
                <span className="text-xs font-bold text-amber-300">{subtitleCueText}</span>
              </div>
            )}

            {/* Buffering Spinner */}
            {isBuffering && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
                <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[10px] font-bold text-cyan-300 mt-1.5 font-mono">
                  جاري تجهيز البث...
                </span>
              </div>
            )}

            {/* Autoplay Unmute Prompt */}
            {showUnmuteBanner && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleUnmute();
                }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-400 text-slate-950 font-bold text-xs shadow-xl animate-bounce cursor-pointer"
              >
                <Volume2 className="w-4 h-4" />
                <span>انقر لتشغيل الصوت</span>
              </button>
            )}

            {/* Mobile Fullscreen Immersive OSD Overlay */}
            {isFullscreen ? (
              <div 
                className={`absolute inset-0 z-30 flex flex-col justify-between p-4 transition-opacity duration-300 ${
                  showMobileOverlay ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
              >
                {/* Fullscreen Top Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExitMobileFullscreen();
                      }}
                      className="p-2.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white shadow-xl hover:bg-white/20 active:scale-95 transition-all"
                      title="العودة لقائمة القنوات"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    {activeChannel && (
                      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20">
                        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                        <span className="text-sm font-bold text-white max-w-[220px] truncate">{activeChannel.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/30">
                          {activeChannel.resolution || 'FHD 4K'}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCycleAspectRatio();
                        resetMobileOverlayTimer();
                      }}
                      className="px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white text-xs font-bold font-mono"
                      title="أبعاد الفيديو (Fill / Fit / Stretch)"
                    >
                      {aspectRatio.toUpperCase()}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSubtitleModalOpen(true);
                        resetMobileOverlayTimer();
                      }}
                      className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-purple-400 hover:text-white"
                      title="الترجمة"
                    >
                      <Subtitles className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setAudioSettingsOpen(true);
                        resetMobileOverlayTimer();
                      }}
                      className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-cyan-400 hover:text-white"
                      title="المسارات الصوتية والمعلقين"
                    >
                      <Volume2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenDiagnostics();
                        resetMobileOverlayTimer();
                      }}
                      className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-slate-300 hover:text-white"
                      title="تشخيص البث والمشغل"
                    >
                      <Settings2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const vid = player.current.getVideoElement();
                        if (vid) {
                          vid.muted = !isMuted;
                          setIsMuted(!isMuted);
                        }
                        resetMobileOverlayTimer();
                      }}
                      className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white"
                      title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
                    >
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleExitMobileFullscreen();
                      }}
                      className="p-2 rounded-full bg-black/70 backdrop-blur-md border border-white/20 text-white"
                      title="تصغير الشاشة"
                    >
                      <Minimize2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Left & Right Zapping Arrows */}
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevChannel();
                    }}
                    className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-2xl active:scale-90 transition-transform pointer-events-auto"
                    title="القناة السابقة"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextChannel();
                    }}
                    className="p-3 rounded-full bg-black/60 backdrop-blur-md border border-white/20 text-white shadow-2xl active:scale-90 transition-transform pointer-events-auto"
                    title="القناة التالية"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>
                </div>

                {/* Bottom Info Pill */}
                <div className="flex items-center justify-center mb-1">
                  <div className="px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-white/15 text-[10px] text-slate-300 font-bold shadow-lg">
                    ملء الشاشة • انقر لإظهار أو إخفاء عناصر التحكم
                  </div>
                </div>
              </div>
            ) : (
              /* Non-fullscreen standard mobile top controls */
              <div className="absolute top-2 right-2 left-2 flex items-center justify-between pointer-events-none z-20">
                {activeChannel && (
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/70 backdrop-blur-md border border-white/15 max-w-[50%] truncate">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0" />
                    <span className="text-[10px] font-bold text-white truncate">{activeChannel.name}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 pointer-events-auto">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCycleAspectRatio();
                    }}
                    className="p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white text-[9px] font-mono px-2"
                    title="أبعاد الفيديو"
                  >
                    {aspectRatio.toUpperCase()}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSubtitleModalOpen(true);
                    }}
                    className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-purple-400"
                    title="الترجمة"
                  >
                    <Subtitles className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setAudioSettingsOpen(true);
                    }}
                    className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-cyan-400"
                    title="المسار الصوتي والمعلقين"
                  >
                    <Volume2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDiagnostics();
                    }}
                    className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-slate-300"
                    title="تشخيص البث"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const vid = player.current.getVideoElement();
                      if (vid) {
                        vid.muted = !isMuted;
                        setIsMuted(!isMuted);
                      }
                    }}
                    className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white"
                    title={isMuted ? 'إلغاء الكتم' : 'كتم الصوت'}
                  >
                    {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-slate-300" />}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEnterMobileFullscreen();
                    }}
                    className="p-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-white"
                    title="ملء الشاشة"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 3. Horizontal Category Navigation Scroll & Channel List (Hidden when in fullscreen) */}
          {!isFullscreen && (
            <>
              <div className="w-full px-2.5 py-2 bg-slate-900/90 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 z-10">
                <button
              type="button"
              onClick={() => setSelectedCatId('all')}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCatId === 'all'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              الكل ({allChannels.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedCatId('favorites')}
              className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedCatId === 'favorites'
                  ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/25'
                  : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>المفضلة ({favorites.length})</span>
            </button>

            {filteredCategories.filter(c => c.category_id !== 'all').map((cat) => {
              const count = cat.stream_count !== undefined ? cat.stream_count : (categoryCounts[cat.category_id] || 0);
              const isSelected = selectedCatId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  type="button"
                  onClick={() => setSelectedCatId(cat.category_id)}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all truncate ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                      : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <span>{cat.category_name}</span>
                  {count > 0 && <span className="mr-1 opacity-70">({count})</span>}
                </button>
              );
            })}
          </div>

          {/* 4. Search Bar */}
          <div className="w-full px-2.5 py-1.5 bg-slate-950/60 border-b border-white/5 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث برقم القناة أو اسمها..."
                className="w-full h-8 bg-white/5 border border-white/10 rounded-xl pr-8 pl-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* 5. Mobile Channel List */}
          <div 
            onScroll={(e) => {
              const target = e.currentTarget;
              if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
                setVisibleCount(prev => Math.min(prev + 35, filteredChannels.length));
              }
            }}
            className="flex-1 overflow-y-auto px-2.5 py-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10 pb-20"
          >
            {isCategoryLoading ? (
              <div className="p-3 space-y-2 animate-in fade-in duration-200">
                <div className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-cyan-400">
                  <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                  <span>جاري تحميل قنوات الباقة...</span>
                </div>
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-14 rounded-xl bg-white/5 border border-white/5 animate-pulse flex items-center gap-3 px-3">
                    <div className="w-9 h-9 rounded-lg bg-white/10 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="w-3/4 h-3 bg-white/10 rounded-md" />
                      <div className="w-1/2 h-2 bg-white/5 rounded-md" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredChannels.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                <Search className="w-6 h-6 mb-2 opacity-40" />
                <p className="text-xs">لم يتم العثور على قنوات تطابق البحث</p>
              </div>
            ) : (
              filteredChannels.slice(0, visibleCount).map((ch) => {
                const isActive = activeChannel?.stream_id === ch.stream_id;
                const isFav = favorites.includes(ch.stream_id);
                return (
                  <div
                    key={ch.stream_id}
                    onClick={() => {
                      handleEnterMobileFullscreen(ch);
                    }}
                    className={`relative p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                      isActive
                        ? 'bg-cyan-500/20 border-cyan-400/80 shadow-[0_0_15px_rgba(0,242,254,0.25)]'
                        : 'bg-white/5 border-white/5 hover:bg-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => toggleFavorite(ch.stream_id, e)}
                        className="p-1 rounded-lg hover:bg-white/10"
                        title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      >
                        <Star className={`w-4 h-4 ${isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                      </button>
                      <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                        {ch.resolution || 'FHD'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-right overflow-hidden mr-auto">
                      <div className="overflow-hidden">
                        <div className="flex items-center gap-1 justify-end">
                          <span className="font-bold text-xs text-white truncate">{ch.name}</span>
                          <span className="font-mono text-[10px] text-cyan-400">#{ch.num}</span>
                        </div>
                        {ch.currentProgram && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[180px]">
                            {ch.currentProgram.title}
                          </p>
                        )}
                      </div>
                      <img
                        src={ch.stream_icon}
                        alt={ch.name}
                        className="w-8 h-8 rounded-lg object-cover border border-white/10 bg-black shrink-0"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=100&auto=format&fit=crop&q=60';
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
            </>
          )}
        </div>
      ) : (

        /* =========================================================================
            MODE B: 📺 FLAGSHIP SMART TV CINEMA 3-COLUMN & FULLSCREEN LAYOUT
           ========================================================================= */
        <div className="relative w-full h-full min-h-screen bg-[#070A12] text-white flex flex-col select-none overflow-hidden font-sans">
          
          {/* DVR Live Recording Top Bar */}
          <DvrRecordingBar
            recordingState={recordingState}
            durationSec={recordingDuration}
            onPause={() => player.current.pauseRecording()}
            onResume={() => player.current.resumeRecording()}
            onStop={handleToggleRecording}
            lastResult={lastRecordingResult}
            onCloseResult={() => setLastRecordingResult(null)}
          />

          {/* Fullscreen Cinema OSD Overlay (Visible when in TV Fullscreen) */}
          {tvIsFullscreen && (
            <div 
              className={`fixed bottom-0 inset-x-0 z-50 p-6 flex flex-col items-center pointer-events-none transition-all duration-300 ${
                tvOsdVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
              }`}
            >
              <div className="w-full max-w-5xl bg-[#090D18]/95 border border-white/15 rounded-3xl p-5 shadow-2xl pointer-events-auto flex flex-col gap-3">
                {/* OSD Row 1: Channel & Stream Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img
                      src={activeChannel?.stream_icon}
                      alt={activeChannel?.name}
                      className="w-12 h-12 rounded-xl object-cover border border-white/10 bg-black shrink-0"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=100&auto=format&fit=crop&q=60';
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-nova-cyan bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                          #{activeChannel?.num}
                        </span>
                        <h2 className="text-lg font-extrabold text-white truncate max-w-md">
                          {activeChannel?.name}
                        </h2>
                      </div>
                      <p className="text-xs font-semibold text-amber-300 mt-0.5 truncate max-w-lg">
                        {activeChannel?.currentProgram?.title || 'بث مباشر فائق الجودة'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold">
                      {activeChannel?.resolution || '4K UHD'}
                    </span>
                    <span className="px-2 py-1 rounded-lg bg-white/5 border border-white/10 text-slate-300 text-xs font-mono">
                      {activeChannel?.fps || 50} FPS
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-nova-cyan text-xs font-mono font-bold">
                      {tvTimeStr}
                    </span>
                  </div>
                </div>

                {/* OSD Row 2: Live Progress & Synopsis */}
                {activeChannel?.currentProgram && (
                  <div className="space-y-1.5 pt-1 border-t border-white/10">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                      <span>{activeChannel.currentProgram.start}</span>
                      <span className="text-slate-300 font-sans font-medium truncate max-w-xl text-center">
                        {activeChannel.currentProgram.description || 'بث مباشر عبر سيرفر NOVA 4K ULTRA فائق السرعة'}
                      </span>
                      <span>{activeChannel.currentProgram.end}</span>
                    </div>
                    <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full transition-all duration-300"
                        style={{ width: `${activeChannel.currentProgram.progressPercentage || 45}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* OSD Row 3: Remote Control Navigation Hints */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-white/5 font-medium">
                  <div className="flex items-center gap-4">
                    <span>[▲/▼] تقليب القنوات فورياً</span>
                    <span>[OK] إظهار / إخفاء الشريط</span>
                    <span>[عودة / ESC] العودة لدليل القنوات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setAudioSettingsOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-[11px] flex items-center gap-1 border border-white/10 transition-all cursor-pointer"
                    >
                      <Volume2 className="w-3.5 h-3.5 text-nova-cyan" />
                      <span>المعلق الصوتي</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubtitleModalOpen(true)}
                      className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-[11px] flex items-center gap-1 border border-white/10 transition-all cursor-pointer"
                    >
                      <Subtitles className="w-3.5 h-3.5 text-purple-400" />
                      <span>الترجمة</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 1. Cinema Top Header (Hidden when in Fullscreen) */}
          {!tvIsFullscreen && (
            <header className="h-14 px-5 bg-[#090D18] border-b border-white/10 flex items-center justify-between shrink-0 z-20">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={onBackToHome}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-bold cursor-pointer"
                  title="العودة للشاشة الرئيسية [ESC]"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>الرئيسية</span>
                </button>

                <div className="h-4 w-px bg-white/10" />

                <div className="flex items-center gap-2">
                  <span className="text-sm font-black tracking-wider text-white">
                    NOVA <span className="text-nova-cyan">4K</span> ULTRA
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-bold text-nova-cyan">
                    LIVE CINEMA
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-mono text-slate-300 bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
                  <span className="text-nova-cyan">⏰</span>
                  <span>{tvTimeStr}</span>
                </div>

                <button
                  type="button"
                  onClick={() => setReorderModalOpen(true)}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-nova-cyan transition-all cursor-pointer"
                  title="إعادة ترتيب القنوات"
                >
                  <Layers className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={onOpenDiagnostics}
                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-nova-cyan transition-all cursor-pointer"
                  title="تشخيص البث والأداء"
                >
                  <Settings2 className="w-4 h-4" />
                </button>
              </div>
            </header>
          )}

          {/* 2. Cinema 3-Column Guide (Hidden when in Fullscreen) */}
          {!tvIsFullscreen && (
            <div className="flex-1 flex overflow-hidden p-3 gap-3 bg-[#070A12]">
              
              {/* Column 1: Categories List */}
              <div className={`w-64 bg-[#090D18] rounded-2xl border flex flex-col overflow-hidden shrink-0 transition-all ${
                tvFocusedColumn === 'categories' ? 'border-nova-cyan/60 shadow-[0_0_20px_rgba(0,242,254,0.15)]' : 'border-white/10'
              }`}>
                <div className="p-3 border-b border-white/10 bg-[#0B1020]/60">
                  <div className="relative">
                    <input
                      type="text"
                      value={categorySearch}
                      onChange={(e) => setCategorySearch(e.target.value)}
                      placeholder="بحث باقات..."
                      className="w-full h-8 bg-white/5 border border-white/10 rounded-xl pr-8 pl-7 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-nova-cyan"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    {categorySearch && (
                      <button
                        type="button"
                        onClick={() => setCategorySearch('')}
                        className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
                  {tvCategoriesList.map((cat, idx) => {
                    const isSelected = selectedCatId === cat.id;
                    const isFocused = tvFocusedColumn === 'categories' && tvFocusedCatIndex === idx;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        data-tv-cat-idx={idx}
                        data-nav-id={`tv-cat-${cat.id}`}
                        onClick={() => {
                          setSelectedCatId(cat.id);
                          setTvFocusedCatIndex(idx);
                          setTvFocusedColumn('channels');
                          setTvFocusedChannelIndex(0);
                        }}
                        className={`w-full p-2.5 rounded-xl text-right font-bold text-xs flex items-center justify-between transition-all cursor-pointer ${
                          isFocused
                            ? 'ring-2 ring-nova-cyan bg-cyan-500/25 border-cyan-400 text-white shadow-focus-glow-subtle'
                            : isSelected
                            ? 'bg-cyan-500/20 border border-cyan-500/40 text-white'
                            : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          {cat.id === 'all' ? (
                            <Tv className="w-4 h-4 text-nova-cyan shrink-0" />
                          ) : cat.id === 'favorites' ? (
                            <Star className="w-4 h-4 text-amber-400 fill-amber-400 shrink-0" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                          )}
                          <span className="truncate">{cat.name}</span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300 shrink-0 mr-1">
                          {cat.count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Column 2: Channels Guide */}
              <div className={`w-[400px] bg-[#090D18] rounded-2xl border flex flex-col overflow-hidden shrink-0 transition-all ${
                tvFocusedColumn === 'channels' ? 'border-nova-cyan/60 shadow-[0_0_20px_rgba(0,242,254,0.15)]' : 'border-white/10'
              }`}>
                <div className="p-3 border-b border-white/10 bg-[#0B1020]/60 flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="بحث بالقناة أو الرقم أو البرنامج..."
                      className="w-full h-8 bg-white/5 border border-white/10 rounded-xl pr-8 pl-7 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-nova-cyan"
                    />
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <span className="text-[11px] font-mono font-bold text-slate-400 px-2 py-1 bg-black/40 rounded-lg border border-white/5">
                    {filteredChannels.length}
                  </span>
                </div>

                <div 
                  onScroll={(e) => {
                    const target = e.currentTarget;
                    if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
                      setVisibleCount(prev => Math.min(prev + 40, filteredChannels.length));
                    }
                  }}
                  className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10"
                >
                  {isCategoryLoading ? (
                    <div className="p-3 space-y-2 animate-in fade-in duration-200">
                      <div className="flex items-center justify-center gap-2 py-3 text-xs font-bold text-cyan-400">
                        <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                        <span>جاري تحميل قنوات الباقة...</span>
                      </div>
                      {[...Array(6)].map((_, i) => (
                        <div key={i} className="h-14 rounded-xl bg-white/5 border border-white/5 animate-pulse flex items-center gap-3 px-3">
                          <div className="w-9 h-9 rounded-lg bg-white/10 shrink-0" />
                          <div className="flex-1 space-y-1.5">
                            <div className="w-3/4 h-3 bg-white/10 rounded-md" />
                            <div className="w-1/2 h-2 bg-white/5 rounded-md" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : filteredChannels.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                      <Search className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-xs">لم يتم العثور على قنوات تطابق البحث</p>
                    </div>
                  ) : (
                    filteredChannels.slice(0, visibleCount).map((ch, idx) => {
                      const isActive = activeChannel?.stream_id === ch.stream_id;
                      const isFocused = tvFocusedColumn === 'channels' && tvFocusedChannelIndex === idx;
                      const isFav = favorites.includes(ch.stream_id);
                      return (
                        <div
                          key={ch.stream_id}
                          data-tv-ch-idx={idx}
                          data-nav-id={`live-channel-${idx}`}
                          onClick={() => {
                            if (activeChannel?.stream_id !== ch.stream_id) {
                              setActiveChannel(ch);
                              setTvFocusedChannelIndex(idx);
                            } else {
                              setTvIsFullscreen(true);
                              showTvOsd();
                            }
                          }}
                          className={`group relative p-2 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            isFocused
                              ? 'ring-2 ring-nova-cyan bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,242,254,0.3)]'
                              : isActive
                              ? 'bg-cyan-500/20 border-cyan-500/50 text-white shadow-focus-glow-subtle'
                              : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(ch.stream_id, e)}
                              className="p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                              title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                            >
                              <Star className={`w-3.5 h-3.5 ${isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500'}`} />
                            </button>
                            <span className="text-[9px] font-mono px-1 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                              {ch.resolution || 'FHD'}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 text-right overflow-hidden mr-auto">
                            <div className="overflow-hidden">
                              <div className="flex items-center gap-1 justify-end">
                                <span className="font-extrabold text-xs text-white truncate max-w-[180px]">{ch.name}</span>
                                <span className="font-mono text-[10px] text-nova-cyan">#{ch.num}</span>
                              </div>
                              {ch.currentProgram && (
                                <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[180px]">
                                  {ch.currentProgram.title}
                                </p>
                              )}
                            </div>
                            <img
                              src={ch.stream_icon}
                              alt={ch.name}
                              className="w-9 h-9 rounded-lg object-cover border border-white/10 bg-black shrink-0"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?w=100&auto=format&fit=crop&q=60';
                              }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Column 3: Cinema Live Preview & EPG Info Card */}
              <div className={`flex-1 bg-[#090D18] rounded-2xl border flex flex-col p-4 gap-3 overflow-hidden min-w-0 transition-all ${
                tvFocusedColumn === 'preview' ? 'border-nova-cyan/60 shadow-[0_0_20px_rgba(0,242,254,0.15)]' : 'border-white/10'
              }`}>
                
                {/* Live Video Box: Seamlessly switches between Column 3 Preview Box and Fixed 100% Fullscreen */}
                <div 
                  ref={videoContainerRef}
                  onClick={() => {
                    if (!tvIsFullscreen) {
                      setTvIsFullscreen(true);
                      showTvOsd();
                    } else {
                      showTvOsd();
                    }
                  }}
                  className={
                    tvIsFullscreen
                      ? "fixed inset-0 w-full h-full z-40 bg-black cursor-pointer overflow-hidden select-none"
                      : "relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl group cursor-pointer"
                  }
                >
                  {subtitleCueText && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-2xl px-6 py-2 rounded-2xl bg-black/85 border border-white/15 text-center pointer-events-none">
                      <span className="text-xl md:text-2xl font-bold text-amber-300 drop-shadow-md font-sans">
                        {subtitleCueText}
                      </span>
                    </div>
                  )}

                  {isBuffering && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/70">
                      <div className="w-10 h-10 border-4 border-nova-cyan border-t-transparent rounded-full animate-spin" />
                      <span className="text-[11px] font-bold text-nova-cyan mt-2 tracking-wider font-mono">
                        جاري تجهيز البث ({activeEngine.toUpperCase()})...
                      </span>
                    </div>
                  )}

                  {showUnmuteBanner && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUnmute();
                      }}
                      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-400 text-slate-950 font-extrabold text-xs shadow-2xl animate-bounce cursor-pointer"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>انقر لتشغيل الصوت</span>
                    </button>
                  )}

                  {!tvIsFullscreen && (
                    <div className="absolute top-3 right-3 z-10 flex items-center gap-2 pointer-events-none">
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-600/90 text-white font-extrabold text-[10px] shadow-lg animate-pulse">
                        <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                        مباشر {activeChannel?.resolution || '4K'}
                      </span>
                      <span className="px-2 py-0.5 rounded-md bg-black/60 border border-white/10 text-cyan-300 text-[9px] font-mono">
                        {activeEngine.toUpperCase()}
                      </span>
                    </div>
                  )}

                  {!tvIsFullscreen && (
                    <div className="absolute bottom-3 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="px-3 py-1.5 rounded-xl bg-cyan-500 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-xl">
                        <Maximize2 className="w-3.5 h-3.5" />
                        <span>تكبير ملء الشاشة [OK]</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* EPG Program Info Card */}
                <div className="flex-1 bg-white/[0.02] border border-white/5 rounded-2xl p-4 flex flex-col justify-between overflow-hidden">
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-nova-cyan bg-cyan-950/60 px-2 py-0.5 rounded-md border border-cyan-500/30">
                          #{activeChannel?.num}
                        </span>
                        <h3 className="text-base font-black text-white truncate">
                          {activeChannel?.name}
                        </h3>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold">
                        {activeChannel?.resolution || '4K UHD'}
                      </span>
                    </div>

                    <div className="mt-3">
                      <h4 className="text-base font-extrabold text-amber-300 leading-snug">
                        {activeChannel?.currentProgram?.title || 'بث مباشر فائق الجودة'}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1.5 leading-relaxed line-clamp-3">
                        {activeChannel?.currentProgram?.description || 'استمتع بمشاهدة البث المباشر بأعلى دقة وسرعة فائقة من سيرفر NOVA 4K ULTRA الرسمي.'}
                      </p>
                    </div>
                  </div>

                  {activeChannel?.currentProgram && (
                    <div className="pt-3 border-t border-white/5 space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                        <span>{activeChannel.currentProgram.start}</span>
                        <span className="text-[11px] text-cyan-400 font-sans">
                          {activeChannel.nextProgram ? `التالي: ${activeChannel.nextProgram.title}` : 'بث مباشر متواصل'}
                        </span>
                        <span>{activeChannel.currentProgram.end}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 rounded-full"
                          style={{ width: `${activeChannel.currentProgram.progressPercentage || 45}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Quick Action Buttons */}
                <div className="p-2 bg-black/40 rounded-2xl border border-white/10 flex items-center justify-between gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setTvIsFullscreen(true);
                      showTvOsd();
                    }}
                    className="flex-1 py-2 px-2.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-400/50 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-nova-cyan" />
                    <span>ملء الشاشة</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAudioSettingsOpen(true)}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Volume2 className="w-3.5 h-3.5 text-nova-cyan" />
                    <span>المعلق الصوتي</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSubtitleModalOpen(true)}
                    className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Subtitles className="w-3.5 h-3.5 text-purple-400" />
                    <span>الترجمة</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCycleAspectRatio}
                    className="py-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span className="text-nova-cyan text-[10px]">الأبعاد:</span>
                    <span>{aspectRatio.toUpperCase()}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => activeChannel && toggleFavorite(activeChannel.stream_id, e)}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-all cursor-pointer"
                    title="إضافة للمفضلة"
                  >
                    <Star className={`w-4 h-4 ${activeChannel && favorites.includes(activeChannel.stream_id) ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                  </button>

                  <button
                    type="button"
                    onClick={handleTakeScreenshot}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-cyan-400 transition-all cursor-pointer"
                    title="التقاط لقطة شاشة"
                  >
                    <Camera className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    type="button"
                    onClick={handleToggleRecording}
                    className={`p-2 rounded-xl border transition-all cursor-pointer ${
                      recordingState === 'recording'
                        ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
                        : 'bg-white/5 border-white/10 text-slate-200 hover:text-red-400'
                    }`}
                    title="تسجيل حي (DVR)"
                  >
                    <Video className="w-4 h-4 text-red-500" />
                  </button>
                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* =========================================================================
          COMPANION MODALS (Shared across both TV and Mobile)
         ========================================================================= */}
      <ScreenshotModal
        isOpen={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        screenshot={activeScreenshot}
        channelName={activeChannel?.name}
      />

      <AudioSettingsModal
        isOpen={audioSettingsOpen}
        onClose={() => setAudioSettingsOpen(false)}
        audioTracks={audioTracks}
        onSelectTrack={(id) => player.current.setAudioTrack(id)}
        currentVolume={currentVolume}
        onVolumeChange={(vol) => {
          setCurrentVolume(vol);
          player.current.setVolume(vol);
        }}
        videoElement={player.current.getVideoElement()}
      />

      <SubtitleDubbingModal
        isOpen={subtitleModalOpen}
        onClose={() => setSubtitleModalOpen(false)}
        subtitleTracks={subtitleTracks.length > 0 ? subtitleTracks : player.current.getSubtitleTracks()}
        onSelectSubtitle={(id) => player.current.setSubtitleTrack(id)}
        audioTracks={audioTracks.length > 0 ? audioTracks : player.current.getAudioTracks()}
        onSelectAudio={(id) => player.current.setAudioTrack(id)}
      />

      <ChannelReorderModal
        isOpen={reorderModalOpen}
        onClose={() => setReorderModalOpen(false)}
        channels={allChannels}
        categories={categories}
        onSaveOrder={handleSaveReorder}
      />

    </div>
  );
};
