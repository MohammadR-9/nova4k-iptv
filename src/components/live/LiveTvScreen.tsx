import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, Star, Maximize2,
  Volume2, ShieldCheck, ArrowLeft, Search, X,
  Layers, Camera, Video, Settings2, Subtitles
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
import { FullscreenUtil } from '../../utils/fullscreen';
import { ZappingOverlay } from './ZappingOverlay';
import { ScreenshotModal } from './ScreenshotModal';
import { DvrRecordingBar } from './DvrRecordingBar';
import { AudioSettingsModal } from './AudioSettingsModal';
import { SubtitleDubbingModal } from './SubtitleDubbingModal';
import { ChannelReorderModal } from './ChannelReorderModal';

interface LiveTvScreenProps {
  onBackToHome: () => void;
  onOpenDiagnostics: () => void;
  externalTriggerKey?: number | null;
}

export const LiveTvScreen: React.FC<LiveTvScreenProps> = ({ onBackToHome, onOpenDiagnostics, externalTriggerKey }) => {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [allChannels, setAllChannels] = useState<LiveChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(null);

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
  const [isDrawerOpen, setIsDrawerOpen] = useState(true);
  const [showZappingOverlay, setShowZappingOverlay] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  // Debounce ref: only show spinner after 1.2s of continuous buffering
  const bufferingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [zappingTimeout, setZappingTimeout] = useState<any>(null);
  const [visibleCount, setVisibleCount] = useState<number>(40); // Virtual limit to prevent DOM freezing

  // Engine & Anti-Freeze State (Retrieved from global SettingsModal preferences)
  const [activeEngine] = useState<PlayerEngineType>(() => {
    return (localStorage.getItem('nova_default_engine') as PlayerEngineType) || 'exoplayer';
  });
  const [bufferProfile] = useState<BufferProfile>(() => {
    const preset = localStorage.getItem('nova_buffer_preset') || 'BALANCED';
    return preset === 'FAST' ? 'turbo' : preset === 'STABLE' ? 'anti-freeze' : 'balanced';
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>(() => {
    return (localStorage.getItem('nova_default_aspect_ratio') as AspectRatioMode) || 'fill';
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

  // 1. Instant hydration & background sync to eliminate freezing completely
  useEffect(() => {
    let isMounted = true;

    // A. INSTANT HYDRATION (0ms): Load cached/curated data immediately so UI never hangs or displays empty
    const quickCats = [
      { category_id: 'all', category_name: '★ جميع القنوات المباشرة' },
      { category_id: 'sports', category_name: '⚽ باقة الرياضة العالمية (Sports 4K)' },
      { category_id: 'news', category_name: '🌍 باقة الأخبار والأحداث المباشرة (News)' },
      { category_id: 'entertainment', category_name: '🎬 القنوات الترفيهية والسينمائية (Cinema)' },
      { category_id: 'documentary', category_name: '🦁 القنوات الوثائقية والطبيعة (Doc 4K)' },
      { category_id: 'kids', category_name: '👶 باقة الأطفال والرسوم المتحركة (Kids)' }
    ];
    setCategories(quickCats);

    const init = async () => {
      try {
        let cats = await XtreamService.getLiveCategories();
        let chs = await XtreamService.getLiveChannels('all');

        if (!isMounted) return;

        // Load saved custom order if present
        try {
          const savedChOrder = localStorage.getItem('iptv_custom_channel_order');
          if (savedChOrder && chs.length > 0) {
            const ids: number[] = JSON.parse(savedChOrder);
            const map = new Map(chs.map(c => [c.stream_id, c]));
            const reordered: LiveChannel[] = [];
            ids.forEach(id => {
              const item = map.get(id);
              if (item) {
                reordered.push(item);
                map.delete(id);
              }
            });
            map.forEach(item => reordered.push(item));
            chs = reordered;
          }

          const savedCatOrder = localStorage.getItem('iptv_custom_category_order');
          if (savedCatOrder && cats.length > 0) {
            const catIds: string[] = JSON.parse(savedCatOrder);
            const catMap = new Map(cats.map(c => [c.category_id, c]));
            const reorderedCats: LiveCategory[] = [];
            catIds.forEach(id => {
              const item = catMap.get(id);
              if (item) {
                reorderedCats.push(item);
                catMap.delete(id);
              }
            });
            catMap.forEach(item => reorderedCats.push(item));
            cats = reorderedCats;
          }
        } catch (e) {
          console.warn('[LiveTvScreen] Error loading custom order:', e);
        }

        if (isMounted) {
          setCategories(cats);
          setAllChannels(chs);
          if (chs.length > 0) {
            setActiveChannel(prev => prev || chs[0]);
          }
        }
      } catch (err) {
        console.error('[LiveTvScreen] Init error:', err);
      }
    };

    init();

    return () => {
      isMounted = false;
      PlayerManager.stopAll();
    };
  }, []);

  // 2. Initialize video player in Full-Bleed container
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
        },
        onBuffering: (buffering) => {
          if (buffering) {
            // Only show spinner after 2.0s of continuous buffering — absorbs micro-stalls & network jitter
            if (!bufferingDebounceRef.current) {
              bufferingDebounceRef.current = setTimeout(() => {
                bufferingDebounceRef.current = null;
                setIsBuffering(true);
              }, 2000);
            }
          } else {
            // Buffering ended — cancel pending spinner and hide immediately
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
    }

    return () => {
      if (bufferingDebounceRef.current) {
        clearTimeout(bufferingDebounceRef.current);
        bufferingDebounceRef.current = null;
      }
      PlayerManager.stopAll();
    };
  }, []);

  // 3. Play active channel stream with Fast Zapping Debounce (150ms)
  const channelDebounceTimer = useRef<any>(null);
  useEffect(() => {
    if (activeChannel) {
      // Immediate feedback: clear previous stream info, trigger OSD
      triggerZappingBanner();

      if (channelDebounceTimer.current) {
        clearTimeout(channelDebounceTimer.current);
      }

      channelDebounceTimer.current = setTimeout(() => {
        const streamType = activeChannel.direct_source.includes('.ts') ? 'MPEG-TS' : 'HLS';
        PlayerManager.cacheStreamInfo(activeChannel.direct_source, streamType);
        player.current.loadStream(activeChannel.direct_source, streamType);
      }, 120);
    }

    return () => {
      if (channelDebounceTimer.current) {
        clearTimeout(channelDebounceTimer.current);
      }
    };
  }, [activeChannel]);

  const triggerZappingBanner = () => {
    setShowZappingOverlay(true);
    if (zappingTimeout) clearTimeout(zappingTimeout);
    const timeout = setTimeout(() => {
      setShowZappingOverlay(false);
    }, 3500);
    setZappingTimeout(timeout);
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
    return categories.filter(c => c.category_name.toLowerCase().includes(categorySearch.toLowerCase().trim()));
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
    if (selectedCatId === 'favorites') return;

    const loadCategoryChannels = async () => {
      try {
        const chs = await XtreamService.getLiveChannels(selectedCatId);
        if (isMounted && chs.length > 0) {
          setAllChannels(chs);
          setActiveChannel(prev => {
            if (prev && chs.some(c => c.stream_id === prev.stream_id)) return prev;
            return chs[0];
          });
        }
      } catch (err) {
        console.warn('[LiveTvScreen] Failed to load channels for category:', selectedCatId, err);
      }
    };

    loadCategoryChannels();
    return () => { isMounted = false; };
  }, [selectedCatId]);

  // Filtered Channels computation
  const filteredChannels = useMemo(() => {
    return allChannels.filter(ch => {
      if (selectedCatId === 'favorites' && !favorites.includes(ch.stream_id)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchName = ch.name.toLowerCase().includes(query);
        const matchNum = ch.num.toString().includes(query);
        const matchShow = ch.currentProgram?.title.toLowerCase().includes(query) || false;
        if (!matchName && !matchNum && !matchShow) return false;
      }
      return true;
    });
  }, [allChannels, selectedCatId, searchQuery, favorites]);

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

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      
      {/* =========================================================================
          1. FULL-BLEED BACKGROUND CINEMA VIDEO (100vw x 100vh - NO UGLY CORNER BOX!)
         ========================================================================= */}
      <div 
        ref={videoContainerRef} 
        onClick={() => setIsDrawerOpen(prev => !prev)}
        className="fixed inset-0 w-full h-full z-0 bg-black cursor-pointer overflow-hidden"
      >
        {/* Subtle Ambient Vignette Overlay to enhance contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 pointer-events-none z-10" />

        {/* Live Subtitle Cues Rendering Overlay */}
        {subtitleCueText && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 max-w-2xl px-6 py-2 rounded-2xl bg-black/75 border border-white/10 backdrop-blur-md text-center pointer-events-none">
            <span className="text-xl md:text-2xl font-bold text-amber-300 drop-shadow-md font-sans leading-relaxed">
              {subtitleCueText}
            </span>
          </div>
        )}

        {/* Buffering Spinner */}
        {isBuffering && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-accent-cyan border-t-transparent rounded-full animate-spin"></div>
            <span className="text-xs font-bold text-accent-cyan mt-3 tracking-wider font-mono">
              جاري تجهيز البث ({activeEngine.toUpperCase()})...
            </span>
          </div>
        )}
      </div>

      {/* Auto-Recovery Toast Notification */}
      {recoveryToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-950/90 border border-emerald-500/50 text-emerald-300 text-xs font-bold shadow-2xl backdrop-blur-md animate-in fade-in zoom-in duration-200">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>{recoveryToast}</span>
        </div>
      )}

      {/* Zapping HUD Banner */}
      <ZappingOverlay 
        channel={activeChannel} 
        isVisible={showZappingOverlay && !isDrawerOpen} 
      />

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

      {/* =========================================================================
          2. SLIDING GLASSMORPHIC 2-COLUMN DRAWER (Look4k & Shamna TV Style)
         ========================================================================= */}
      <aside 
        className={`fixed top-0 right-0 h-full w-full sm:w-[600px] md:w-[680px] lg:w-[740px] z-30 bg-slate-950/90 backdrop-blur-3xl border-l border-white/10 shadow-2xl flex flex-col transition-transform duration-300 ease-out ${
          isDrawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onBackToHome}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
              title="العودة للرئيسية"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Tv className="w-5 h-5 text-nova-cyan" />
                <span>دليل البث المباشر (NOVA 4K ULTRA)</span>
              </h2>
              <span className="text-[10px] text-slate-400 font-mono">
                {filteredChannels.length} قناة متاحة في التصنيف
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Reorder Button */}
            <button
              onClick={() => setReorderModalOpen(true)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-accent-cyan transition-all"
              title="إعادة ترتيب القنوات"
            >
              <Layers className="w-4 h-4" />
            </button>

            {/* Close Drawer Button */}
            <button
              onClick={() => setIsDrawerOpen(false)}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-all"
              title="إخفاء القائمة للمشاهدة الكاملة"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 2-Column Split: Right Sidebar (Categories) & Left Main Pane (Channels) */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* =========================================================================
              Sub-column 1 (Right): Vertical Category Sidebar (Look4k / Shamna style)
             ========================================================================= */}
          <div className="w-48 sm:w-56 border-l border-white/10 flex flex-col bg-slate-900/60 shrink-0">
            {/* Category Search Input */}
            <div className="p-2.5 border-b border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={categorySearch}
                  onChange={(e) => setCategorySearch(e.target.value)}
                  placeholder="بحث باقات..."
                  className="w-full h-8 bg-surface-elevated/90 border border-white/10 rounded-lg px-7 text-[11px] text-white placeholder:text-slate-500 focus:outline-none focus:border-accent-cyan"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                {categorySearch && (
                  <button
                    onClick={() => setCategorySearch('')}
                    className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>

            {/* Vertical Category Items */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1.5 scrollbar-thin scrollbar-thumb-white/10">
              {/* All Channels */}
              <button
                onClick={() => setSelectedCatId('all')}
                className={`w-full p-2.5 rounded-xl text-right font-bold text-xs flex items-center justify-between transition-all ${
                  selectedCatId === 'all'
                    ? 'bg-accent-cyan/20 border border-accent-cyan/50 text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Tv className="w-4 h-4 shrink-0 text-accent-cyan" />
                  <span className="truncate">كل القنوات</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-300">
                  {allChannels.length}
                </span>
              </button>

              {/* Favorites */}
              <button
                onClick={() => setSelectedCatId('favorites')}
                className={`w-full p-2.5 rounded-xl text-right font-bold text-xs flex items-center justify-between transition-all ${
                  selectedCatId === 'favorites'
                    ? 'bg-amber-500/25 border border-amber-500/60 text-amber-300 shadow-focus-glow-subtle'
                    : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <Star className="w-4 h-4 shrink-0 text-amber-400 fill-amber-400" />
                  <span className="truncate">المفضلة</span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-amber-300">
                  {favorites.length}
                </span>
              </button>

              {/* Dynamic Categories */}
              {filteredCategories.filter(c => c.category_id !== 'all').map((cat) => {
                const count = cat.stream_count !== undefined ? cat.stream_count : (categoryCounts[cat.category_id] || 0);
                const isSelected = selectedCatId === cat.category_id;
                return (
                  <button
                    key={cat.category_id}
                    onClick={() => setSelectedCatId(cat.category_id)}
                    className={`w-full p-2.5 rounded-xl text-right font-bold text-xs flex items-center justify-between transition-all ${
                      isSelected
                        ? 'bg-accent-cyan/20 border border-accent-cyan/50 text-white shadow-focus-glow-subtle'
                        : 'bg-white/5 border border-white/5 text-slate-400 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <span className="truncate">{cat.category_name}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 shrink-0 mr-1">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* =========================================================================
              Sub-column 2 (Left): Channels List with EPG & Channel Search
             ========================================================================= */}
          <div className="flex-1 flex flex-col bg-transparent overflow-hidden">
            {/* Channel Search Bar */}
            <div className="p-3 border-b border-white/10">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="بحث برقم القناة أو اسمها أو البرنامج..."
                  className="w-full h-9 bg-surface-elevated/90 border border-white/10 rounded-xl px-9 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-accent-cyan"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-3 top-2.5 pointer-events-none" />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute left-3 top-2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Channels Scroll Area with Virtual Lazy Loading */}
            <div 
              onScroll={(e) => {
                const target = e.currentTarget;
                if (target.scrollTop + target.clientHeight >= target.scrollHeight - 100) {
                  setVisibleCount(prev => Math.min(prev + 40, filteredChannels.length));
                }
              }}
              className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin scrollbar-thumb-white/10"
            >
              {filteredChannels.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center p-4">
                  <Search className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-xs">لم يتم العثور على قنوات تطابق البحث</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCatId('all'); }}
                    className="mt-2 text-accent-cyan text-xs hover:underline"
                  >
                    إلغاء الفلترة والبحث
                  </button>
                </div>
              ) : (
                filteredChannels.slice(0, visibleCount).map((ch, idx) => {
                  const isActive = activeChannel?.stream_id === ch.stream_id;
                  const isFav = favorites.includes(ch.stream_id);

                  return (
                    <div
                      key={ch.stream_id}
                      data-nav-id={`live-channel-${idx}`}
                      onClick={() => {
                        if (activeChannel?.stream_id !== ch.stream_id) {
                          setActiveChannel(ch);
                        }
                      }}
                      className={`group relative p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                        isActive
                          ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                          : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {/* Left: Star Favorite & Resolution */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => toggleFavorite(ch.stream_id, e)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-all"
                          title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                        >
                          <Star
                            className={`w-4 h-4 ${
                              isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500 group-hover:text-slate-300'
                            }`}
                          />
                        </button>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                          {ch.resolution || 'FHD'}
                        </span>
                      </div>

                      {/* Right: Channel Name, Program & Icon */}
                      <div className="flex items-center gap-3 text-right overflow-hidden mr-auto">
                        <div className="overflow-hidden">
                          <div className="flex items-center gap-1.5 justify-end">
                            <span className="font-extrabold text-xs text-white truncate">{ch.name}</span>
                            <span className="font-mono text-[10px] text-accent-cyan">#{ch.num}</span>
                          </div>
                          {ch.currentProgram && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5 max-w-[220px]">
                              {ch.currentProgram.title}
                            </p>
                          )}
                        </div>

                        <img
                          src={ch.stream_icon}
                          alt={ch.name}
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 bg-black shrink-0"
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
        </div>

        {/* Drawer Bottom Info */}
        <div className="p-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 bg-slate-950/90">
          <span>المحرك: <b className="text-accent-cyan font-mono">{activeEngine.toUpperCase()}</b></span>
          <span>التخزين: <b className="text-emerald-400 font-mono">{bufferProfile.toUpperCase()}</b></span>
          <span>القنوات المعروضة: <b className="text-white font-mono">{filteredChannels.length}</b></span>
        </div>
      </aside>

      {/* =========================================================================
          3. FLOATING OSD ACTION TOOLBAR (Bottom Centered Pill Bar)
         ========================================================================= */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 p-2 px-4 bg-slate-950/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-bottom-4 duration-300">
        
        {/* Toggle Channel Drawer */}
        <button
          onClick={() => setIsDrawerOpen(prev => !prev)}
          className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
            isDrawerOpen
              ? 'bg-cyan-500/20 border-accent-cyan text-white'
              : 'bg-white/5 border-white/10 text-slate-300 hover:text-white'
          }`}
          title="عرض / إخفاء قائمة القنوات"
        >
          <Tv className="w-4 h-4 text-accent-cyan" />
          <span className="hidden sm:inline">القنوات</span>
        </button>

        <div className="h-4 w-px bg-white/10" />

        {/* Direct Fullscreen Button (Requested for Web & Smart TVs) */}
        <button
          onClick={async () => {
            const fs = await FullscreenUtil.toggleFullscreen(videoContainerRef.current);
            setIsFullscreen(fs);
          }}
          className={`p-2 px-3 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
            isFullscreen
              ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
              : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-200 hover:text-white'
          }`}
          title="تبديل ملء الشاشة بالكامل (Fullscreen)"
        >
          <Maximize2 className="w-4 h-4 text-nova-cyan" />
          <span className="hidden sm:inline">{isFullscreen ? 'تصغير' : 'ملء الشاشة'}</span>
        </button>

        <div className="h-4 w-px bg-white/10" />

        {/* Aspect Ratio Quick Toggle */}
        <button
          onClick={handleCycleAspectRatio}
          className="p-2 px-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 transition-all"
          title="تغيير أبعاد الشاشة (ملء الشاشة، سينمائي، كلاسيكي 4:3)"
        >
          <span className="text-[11px] text-nova-cyan">الأبعاد:</span>
          <span>
            {aspectRatio === 'fit' ? 'FIT' : 
             aspectRatio === 'fill' ? 'ملء الشاشة' : 
             aspectRatio === 'stretch' ? 'تمديد' : 
             aspectRatio === 'cinema' ? 'سينما 21:9' : 
             aspectRatio === '16:9' ? '16:9' : 
             aspectRatio === '4:3' ? 'سواد 4:3' : 
             aspectRatio === 'letterbox' ? 'سواد سينما' : 
             aspectRatio === 'zoom-120' ? '120%' : '150%'}
          </span>
        </button>

        {/* Subtitles & Dubbing Selector */}
        <button
          onClick={() => setSubtitleModalOpen(true)}
          className="p-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-purple-400 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
          title="ترجمة ودبلجة البث المباشر (Subtitles & Dubbing)"
        >
          <Subtitles className="w-4 h-4 text-purple-400" />
          <span className="hidden sm:inline">الترجمة والدبلجة</span>
        </button>

        {/* Audio Tracks & Volume Settings */}
        <button
          onClick={() => setAudioSettingsOpen(true)}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-accent-cyan transition-all cursor-pointer"
          title="إعدادات الصوت والمعلقين ومضخم الصوت"
        >
          <Volume2 className="w-4 h-4" />
        </button>

        {/* 4K Screenshot Capture */}
        <button
          onClick={handleTakeScreenshot}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-cyan-400 transition-all"
          title="التقاط لقطة شاشة بدقة 4K"
        >
          <Camera className="w-4 h-4" />
        </button>

        {/* Live DVR Recording */}
        <button
          onClick={handleToggleRecording}
          className={`p-2 rounded-xl border flex items-center gap-1.5 text-xs font-bold transition-all ${
            recordingState === 'recording'
              ? 'bg-red-500/20 border-red-500 text-red-400 animate-pulse'
              : 'bg-white/5 border-white/10 text-slate-200 hover:text-red-400'
          }`}
          title="تسجيل البث الحي المباشر (DVR)"
        >
          <Video className="w-4 h-4 text-red-500" />
          <span className="hidden sm:inline">تسجيل</span>
        </button>

        {/* Diagnostics HUD Toggle */}
        <button
          onClick={onOpenDiagnostics}
          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 hover:text-accent-cyan transition-all"
          title="لوحة تشخيص البث"
        >
          <Settings2 className="w-4 h-4" />
        </button>

      </div>

      {/* =========================================================================
          4. COMPANION MODALS
         ========================================================================= */}
      
      {/* Screenshot Modal with QR Share */}
      <ScreenshotModal
        isOpen={screenshotModalOpen}
        onClose={() => setScreenshotModalOpen(false)}
        screenshot={activeScreenshot}
        channelName={activeChannel?.name}
      />

      {/* Audio Settings & Output Devices Modal */}
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

      {/* Subtitles & Dubbing Modal */}
      <SubtitleDubbingModal
        isOpen={subtitleModalOpen}
        onClose={() => setSubtitleModalOpen(false)}
        subtitleTracks={subtitleTracks.length > 0 ? subtitleTracks : player.current.getSubtitleTracks()}
        onSelectSubtitle={(id) => player.current.setSubtitleTrack(id)}
        audioTracks={audioTracks.length > 0 ? audioTracks : player.current.getAudioTracks()}
        onSelectAudio={(id) => player.current.setAudioTrack(id)}
      />

      {/* Channel & Category Reorder Modal */}
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
