import React, { useState, useEffect, useMemo } from 'react';
import { Film, Clapperboard, Star, Search, X, Play, Sparkles } from 'lucide-react';
import { VodItem, SeriesItem, VodPlaybackItem } from '../../types/iptv.types';
import { XtreamService } from '../../services/xtream.service';

interface MobileVodScreenProps {
  onPlayItem: (item: VodPlaybackItem) => void;
}

export const MobileVodScreen: React.FC<MobileVodScreenProps> = ({ onPlayItem }) => {
  const [activeTab, setActiveTab] = useState<'vod' | 'series'>('vod');
  const [movies, setMovies] = useState<VodItem[]>([]);
  const [series, setSeries] = useState<SeriesItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load Movies & Series
  useEffect(() => {
    let isMounted = true;
    const loadContent = async () => {
      setIsLoading(true);
      try {
        const [movieList, seriesList] = await Promise.all([
          XtreamService.getVodMovies('all'),
          XtreamService.getSeriesList('all')
        ]);
        if (isMounted) {
          setMovies(movieList);
          setSeries(seriesList);
        }
      } catch (err) {
        console.error('Failed to load VOD:', err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };
    loadContent();
    return () => { isMounted = false; };
  }, []);

  // Filtered lists
  const filteredMovies = useMemo(() => {
    if (!searchQuery.trim()) return movies;
    const q = searchQuery.toLowerCase().trim();
    return movies.filter(m => m.name.toLowerCase().includes(q));
  }, [movies, searchQuery]);

  const filteredSeries = useMemo(() => {
    if (!searchQuery.trim()) return series;
    const q = searchQuery.toLowerCase().trim();
    return series.filter(s => s.name.toLowerCase().includes(q));
  }, [series, searchQuery]);

  // Featured Hero Item (First item of current tab)
  const heroMovie = movies[0];
  const heroSeries = series[0];
  const activeHero = activeTab === 'vod' ? heroMovie : heroSeries;

  const handlePlayHero = () => {
    if (activeTab === 'vod' && heroMovie) {
      onPlayItem({
        id: heroMovie.stream_id,
        title: heroMovie.name,
        streamType: 'movie',
        streamUrl: heroMovie.direct_source || '',
        posterUrl: heroMovie.stream_icon,
        rating: heroMovie.rating
      });
    } else if (activeTab === 'series' && heroSeries) {
      onPlayItem({
        id: heroSeries.series_id,
        title: `${heroSeries.name} - الحلقة 1`,
        streamType: 'episode',
        streamUrl: heroSeries.seasons?.[0]?.episodes?.[0]?.direct_source || '',
        posterUrl: heroSeries.cover,
        rating: heroSeries.rating
      });
    }
  };

  return (
    <div className="w-full h-full flex flex-col bg-[#07090e] text-white select-none pb-24 overflow-y-auto">
      {/* ── Top Header & Tab Switcher ─────────────────────── */}
      <div className="sticky top-0 z-30 w-full px-4 pt-4 pb-3 bg-[#0c1017]/95 backdrop-blur-xl border-b border-white/5 flex flex-col gap-3">
        <div className="w-full flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-black tracking-wider">
              مكتبة <span className="text-cyan-400">السينما & المسلسلات</span>
            </h2>
          </div>

          {/* Switcher Tabs */}
          <div className="flex items-center p-1 bg-white/5 rounded-xl border border-white/10 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('vod')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'vod'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>الأفلام</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('series')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                activeTab === 'series'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Clapperboard className="w-3.5 h-3.5" />
              <span>المسلسلات</span>
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={activeTab === 'vod' ? 'بحث عن فيلم...' : 'بحث عن مسلسل...'}
            className="w-full h-10 bg-white/5 border border-white/10 rounded-xl pr-9 pl-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-right"
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
      </div>

      {/* ── Featured Hero Banner (If no search) ────────────── */}
      {!searchQuery && activeHero && (
        <div className="relative w-full h-56 md:h-72 overflow-hidden bg-slate-900 shrink-0">
          {/* Background Poster */}
          <img
            src={(activeHero as any).stream_icon || (activeHero as any).cover}
            alt={activeHero.name}
            className="w-full h-full object-cover opacity-40 blur-sm scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#07090e] via-[#07090e]/60 to-transparent" />

          {/* Hero Content */}
          <div className="absolute bottom-4 right-4 left-4 flex flex-col items-start gap-2">
            <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-[10px] font-bold text-cyan-300">
              {activeTab === 'vod' ? 'أحدث الأفلام' : 'أقوى المسلسلات'}
            </span>
            <h3 className="text-lg md:text-xl font-black text-white truncate max-w-full text-right">
              {activeHero.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <span className="flex items-center gap-1 text-amber-400 font-bold">
                <Star className="w-3.5 h-3.5 fill-current" />
                <span>{activeHero.rating || '4.8'}</span>
              </span>
              <span className="text-slate-400">• 4K Ultra HD</span>
            </div>

            <button
              type="button"
              onClick={handlePlayHero}
              className="mt-1 px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:brightness-110 active:scale-95 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/25"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>مشاهدة الآن</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Grid of Posters (2 columns on mobile, 3 on tablet) ─ */}
      <div className="px-3 pt-4">
        <h3 className="text-xs font-bold text-slate-400 mb-3 text-right">
          {activeTab === 'vod' ? `جميع الأفلام (${filteredMovies.length})` : `جميع المسلسلات (${filteredSeries.length})`}
        </h3>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
            <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">جاري تحميل المحتوى السينمائي...</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {activeTab === 'vod' ? (
              filteredMovies.map((movie) => (
                <div
                  key={movie.stream_id}
                  onClick={() => onPlayItem({
                    id: movie.stream_id,
                    title: movie.name,
                    streamType: 'movie',
                    streamUrl: movie.direct_source || '',
                    posterUrl: movie.stream_icon,
                    rating: movie.rating
                  })}
                  className="group relative flex flex-col bg-white/5 border border-white/5 rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-all hover:border-cyan-400/40"
                >
                  {/* Poster Image */}
                  <div className="relative aspect-[2/3] w-full bg-slate-900 overflow-hidden">
                    {movie.stream_icon ? (
                      <img
                        src={movie.stream_icon}
                        alt={movie.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-90 transition-opacity" />
                    
                    {/* Rating Badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-amber-400">
                      <Star className="w-3 h-3 fill-current" />
                      <span>{movie.rating || '4.5'}</span>
                    </div>

                    {/* Play Hover Pill */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-cyan-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-400/50">
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </div>
                    </div>
                  </div>

                  {/* Title & Info */}
                  <div className="p-2.5 flex flex-col text-right">
                    <span className="text-xs font-bold text-white truncate">
                      {movie.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                      فيلم • 4K
                    </span>
                  </div>
                </div>
              ))
            ) : (
              filteredSeries.map((s) => (
                <div
                  key={s.series_id}
                  onClick={() => onPlayItem({
                    id: s.series_id,
                    title: `${s.name} - الحلقة 1`,
                    streamType: 'episode',
                    streamUrl: s.seasons?.[0]?.episodes?.[0]?.direct_source || '',
                    posterUrl: s.cover,
                    rating: s.rating
                  })}
                  className="group relative flex flex-col bg-white/5 border border-white/5 rounded-2xl overflow-hidden cursor-pointer active:scale-95 transition-all hover:border-purple-400/40"
                >
                  <div className="relative aspect-[2/3] w-full bg-slate-900 overflow-hidden">
                    {s.cover ? (
                      <img
                        src={s.cover}
                        alt={s.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Clapperboard className="w-8 h-8 text-slate-600" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-60" />

                    <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/70 backdrop-blur-md text-[10px] font-bold text-purple-300">
                      <span>مسلسل</span>
                    </div>
                  </div>

                  <div className="p-2.5 flex flex-col text-right">
                    <span className="text-xs font-bold text-white truncate">
                      {s.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                      مواسم كاملة
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
};
