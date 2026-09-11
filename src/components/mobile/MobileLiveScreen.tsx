import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, Star, Search, X, Play, Volume2, VolumeX, Maximize
} from 'lucide-react';
import { LiveCategory, LiveChannel } from '../../types/iptv.types';
import { XtreamService } from '../../services/xtream.service';
import { PlayerManager } from '../../player/PlayerManager';

interface MobileLiveScreenProps {
  onOpenSettings?: () => void;
}

export const MobileLiveScreen: React.FC<MobileLiveScreenProps> = () => {
  const [categories, setCategories] = useState<LiveCategory[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [allChannels, setAllChannels] = useState<LiveChannel[]>([]);
  const [activeChannel, setActiveChannel] = useState<LiveChannel | null>(null);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_favorite_ids');
      return saved ? JSON.parse(saved) : [101, 105, 112];
    } catch {
      return [101, 105, 112];
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleCount, setVisibleCount] = useState(35);

  const videoContainerRef = useRef<HTMLDivElement>(null);
  const player = useRef(PlayerManager.getPlayer('auto'));

  // Anti-freeze watchdog: never let buffering spinner hang longer than 3 seconds
  useEffect(() => {
    let timer: any;
    if (isBuffering) {
      timer = setTimeout(() => setIsBuffering(false), 3000);
    }
    return () => { if (timer) clearTimeout(timer); };
  }, [isBuffering]);

  // 1. Fetch Categories & Channels with Instant Hydration
  useEffect(() => {
    let isMounted = true;
    
    // Instant hydration so UI is never blank
    setCategories([
      { category_id: 'all', category_name: '★ جميع القنوات المباشرة' },
      { category_id: 'sports', category_name: '⚽ باقة الرياضة العالمية' },
      { category_id: 'news', category_name: '🌍 باقة الأخبار والأحداث' },
      { category_id: 'entertainment', category_name: '🎬 القنوات الترفيهية' },
    ]);

    const loadData = async () => {
      setIsLoading(true);
      try {
        const [cats, chs] = await Promise.all([
          XtreamService.getLiveCategories(),
          XtreamService.getLiveChannels('all')
        ]);
        if (isMounted) {
          setCategories(cats);
          setAllChannels(chs);
          if (chs.length > 0) {
            setActiveChannel(chs[0]);
          }
        }
      } catch (err) {
        console.error('Failed to load live TV data:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadData();
    return () => { 
      isMounted = false; 
      PlayerManager.stopAll();
    };
  }, []);

  // 2. Initialize Player on Video Container
  useEffect(() => {
    if (videoContainerRef.current) {
      player.current.initialize(videoContainerRef.current, {
        onPlaying: () => setIsBuffering(false),
        onBuffering: (buffering: boolean) => setIsBuffering(buffering),
        onError: () => setIsBuffering(false)
      });
    }
  }, []);

  // 3. Play active channel
  useEffect(() => {
    if (!activeChannel) return;
    setIsBuffering(true);
    const streamType = activeChannel.direct_source.endsWith('.ts') ? 'MPEG-TS' : 'HLS';
    player.current.loadStream(activeChannel.direct_source, streamType);
  }, [activeChannel]);

  // Toggle Favorite
  const toggleFavorite = (channelId: number, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites(prev => {
      const next = prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId];
      localStorage.setItem('iptv_favorite_ids', JSON.stringify(next));
      return next;
    });
  };

  // Filter channels based on Category, Favorites, and Search
  const filteredChannels = useMemo(() => {
    let result = allChannels;

    if (selectedCatId === 'favorites') {
      result = result.filter(ch => favorites.includes(ch.stream_id));
    } else if (selectedCatId !== 'all') {
      result = result.filter(ch => String(ch.category_id) === String(selectedCatId));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(ch => 
        ch.name.toLowerCase().includes(q) || 
        String(ch.num || '').includes(q)
      );
    }

    return result;
  }, [allChannels, selectedCatId, searchQuery, favorites]);

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!videoContainerRef.current) return;
    if (!document.fullscreenElement) {
      videoContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07090e] text-white select-none pb-20">
      {/* ── 1. Top Video Player (Sticky 16:9 on Mobile) ────── */}
      <div 
        ref={videoContainerRef}
        className={`relative w-full aspect-video bg-black z-30 shadow-lg border-b border-white/10 ${
          isFullscreen ? 'fixed inset-0 z-50 w-screen h-screen aspect-auto' : 'sticky top-0'
        }`}
      >
        {/* Buffering Spinner */}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm pointer-events-none z-20">
            <div className="flex flex-col items-center gap-2">
              <div className="w-10 h-10 border-3 border-cyan-400 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-cyan-300">جاري الاتصال بالبث...</span>
            </div>
          </div>
        )}

        {/* Overlay Badges */}
        <div className="absolute top-2.5 right-2.5 left-2.5 flex items-center justify-between pointer-events-none z-10">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
          </div>

          <div className="flex items-center gap-2 pointer-events-auto">
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:text-cyan-400 active:scale-95"
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              className="p-2 rounded-full bg-black/60 backdrop-blur-md text-white hover:text-cyan-400 active:scale-95"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Channel Name Banner on Video */}
        {activeChannel && (
          <div className="absolute bottom-2 right-2.5 left-2.5 flex items-center justify-between pointer-events-none z-10">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-black/75 backdrop-blur-md border border-white/10 max-w-[80%]">
              <span className="text-xs font-mono font-bold text-cyan-400">
                #{activeChannel.num || activeChannel.stream_id}
              </span>
              <span className="text-xs font-bold truncate text-white">
                {activeChannel.name}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* ── 2. Search & Category Filters Bar ──────────────── */}
      <div className="w-full px-3 pt-3 pb-2 flex flex-col gap-2.5 bg-[#0c1017] border-b border-white/5">
        {/* Search Input */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="بحث عن قناة أو رقم..."
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pr-9 pl-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 transition-all text-right"
          />
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-slate-400" />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="absolute left-2.5 top-2.5 p-0.5 rounded-full hover:bg-white/10 text-slate-400"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 text-xs">
          <button
            type="button"
            onClick={() => setSelectedCatId('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl font-bold transition-all ${
              selectedCatId === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            الكل ({allChannels.length})
          </button>

          <button
            type="button"
            onClick={() => setSelectedCatId('favorites')}
            className={`shrink-0 flex items-center gap-1 px-3 py-1.5 rounded-xl font-bold transition-all ${
              selectedCatId === 'favorites'
                ? 'bg-amber-400 text-slate-950 shadow-md shadow-amber-400/20'
                : 'bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>المفضلة ({favorites.length})</span>
          </button>

          {categories.map((cat) => (
            <button
              key={cat.category_id}
              type="button"
              onClick={() => setSelectedCatId(cat.category_id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl font-bold transition-all ${
                selectedCatId === cat.category_id
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      </div>

      {/* ── 3. Channel List (Touch-Friendly Native List) ────── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1.5">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">جاري تحميل قائمة القنوات...</span>
          </div>
        ) : filteredChannels.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            لا توجد قنوات تطابق هذا البحث
          </div>
        ) : (
          <>
            {filteredChannels.slice(0, visibleCount).map((channel) => {
              const isSelected = activeChannel?.stream_id === channel.stream_id;
              const isFav = favorites.includes(channel.stream_id);

              return (
                <div
                  key={channel.stream_id}
                  onClick={() => setActiveChannel(channel)}
                  className={`w-full flex items-center justify-between p-2.5 rounded-2xl border transition-all cursor-pointer active:scale-[0.99] ${
                    isSelected
                      ? 'bg-cyan-500/15 border-cyan-400/50 shadow-lg shadow-cyan-500/10'
                      : 'bg-white/5 border-white/5 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    {/* Channel Logo / Icon */}
                    <div className="relative w-11 h-11 rounded-xl bg-black/40 border border-white/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {channel.stream_icon ? (
                        <img 
                          src={channel.stream_icon} 
                          alt={channel.name} 
                          className="w-full h-full object-contain"
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Tv className="w-5 h-5 text-cyan-400" />
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 bg-cyan-500/20 flex items-center justify-center">
                          <Play className="w-4 h-4 text-cyan-300 fill-current animate-pulse" />
                        </div>
                      )}
                    </div>

                    {/* Channel Info */}
                    <div className="flex flex-col text-right overflow-hidden">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-white truncate">
                          {channel.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        بث فائق الجودة • 1080p
                      </span>
                    </div>
                  </div>

                  {/* Star Favorite Button */}
                  <button
                    type="button"
                    onClick={(e) => toggleFavorite(channel.stream_id, e)}
                    className="p-2 text-slate-400 hover:text-amber-400 active:scale-90 transition-all shrink-0"
                  >
                    <Star className={`w-4 h-4 ${isFav ? 'text-amber-400 fill-amber-400' : ''}`} />
                  </button>
                </div>
              );
            })}

            {filteredChannels.length > visibleCount && (
              <button
                type="button"
                onClick={() => setVisibleCount(prev => prev + 35)}
                className="w-full py-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-cyan-400 text-center active:scale-98 transition-all my-2"
              >
                تحميل المزيد من القنوات (+35 من أصل {filteredChannels.length})
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
