import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Film, Star, Play, ArrowLeft, Clock, Search, X, 
  Sparkles, Filter, RotateCcw, ChevronLeft, Folder, Flame,
  Heart
} from 'lucide-react';
import { VodItem } from '../../types/iptv.types';
import { XtreamService } from '../../services/xtream.service';
import { VodResumeService, ResumePoint } from '../../services/vodResume.service';
import { spatialNav } from '../../navigation/spatialNav';
import { AiMovieAdvisorModal } from './AiMovieAdvisorModal';

interface VodScreenProps {
  onBackToHome: () => void;
  onPlayMovie: (movie: VodItem) => void;
}

export const VodScreen: React.FC<VodScreenProps> = ({ onBackToHome, onPlayMovie }) => {
  const [categories, setCategories] = useState<{ category_id: string; category_name: string }[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [allMovies, setAllMovies] = useState<VodItem[]>([]);
  const [selectedDetailsMovie, setSelectedDetailsMovie] = useState<VodItem | null>(null);
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'trending' | 'latest' | 'top_rated' | '4k_hdr'>('all');
  
  // Advanced filter toggles
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState<boolean>(false);

  // Favorites (Stored in localStorage)
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_vod_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // AI Advisor Modal
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);

  // Continue Watching shelf
  const [continueWatchingList, setContinueWatchingList] = useState<{ movie: VodItem; resume: ResumePoint }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Sidebar ref
  const activeCategoryRef = useRef<HTMLButtonElement | null>(null);

  const toggleFavorite = (streamId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(streamId) ? prev.filter(id => id !== streamId) : [...prev, streamId];
      try {
        localStorage.setItem('iptv_vod_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const cats = await XtreamService.getVodCategories();
        setCategories(cats);
        const list = await XtreamService.getVodMovies('all');
        setAllMovies(list);

        // Check resume points for continue watching shelf
        const resumeMap = VodResumeService.getAllResumePoints();
        const inProgress: { movie: VodItem; resume: ResumePoint }[] = [];
        list.forEach(m => {
          const r = resumeMap[String(m.stream_id)];
          if (r && r.percent > 2 && r.percent < 95) {
            inProgress.push({ movie: m, resume: r });
          }
        });
        setContinueWatchingList(inProgress);
      } catch (e) {
        console.error('Error loading VOD movies:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    setTimeout(() => {
      spatialNav.setFocus('vod-cat-item-0');
    }, 200);
  }, []);

  const handleSelectCategory = async (catId: string) => {
    if (selectedCatId === catId) return;
    setSelectedCatId(catId);
    setIsLoading(true);
    try {
      const filtered = await XtreamService.getVodMovies(catId);
      setAllMovies(filtered);
      if (filtered.length > 0) {
        setTimeout(() => spatialNav.setFocus('vod-card-0'), 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters = yearFilter !== 'all' || ratingFilter !== 'all' || qualityFilter !== 'all' || sortBy !== 'default' || quickFilter !== 'all';

  const resetFilters = () => {
    setYearFilter('all');
    setRatingFilter('all');
    setQualityFilter('all');
    setSortBy('default');
    setQuickFilter('all');
    setSearchQuery('');
  };

  // Filter Categories by catSearchQuery
  const filteredCategories = useMemo(() => {
    if (!catSearchQuery.trim()) return categories;
    const q = catSearchQuery.toLowerCase().trim();
    return categories.filter(c => c.category_name.toLowerCase().includes(q));
  }, [categories, catSearchQuery]);

  // Filter and Sort Movies
  const filteredMovies = useMemo(() => {
    let result = allMovies.filter(m => {
      // 1. Text Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = m.name?.toLowerCase().includes(q) || false;
        const matchCast = m.cast?.toLowerCase().includes(q) || false;
        const matchDirector = m.director?.toLowerCase().includes(q) || false;
        if (!matchName && !matchCast && !matchDirector) return false;
      }

      // 2. Quick Top Filter
      if (quickFilter === 'trending') {
        const ratingVal = parseFloat(String(m.rating || '0'));
        if (ratingVal < 7.0) return false;
      } else if (quickFilter === 'latest') {
        const yr = parseInt(String(m.year || '0'), 10);
        if (yr < 2024) return false;
      } else if (quickFilter === 'top_rated') {
        const ratingVal = parseFloat(String(m.rating || '0'));
        if (ratingVal < 8.0) return false;
      } else if (quickFilter === '4k_hdr') {
        const is4k = m.name?.toLowerCase().includes('4k') || m.container_extension?.toLowerCase().includes('mkv');
        if (!is4k) return false;
      }

      // 3. Year Filter
      if (yearFilter !== 'all') {
        const yr = parseInt(String(m.year || '0'), 10);
        if (yearFilter === '2025' && yr !== 2025) return false;
        if (yearFilter === '2024' && yr !== 2024) return false;
        if (yearFilter === '2023' && yr !== 2023) return false;
        if (yearFilter === 'classic' && yr >= 2020) return false;
      }

      // 4. Rating Filter
      if (ratingFilter !== 'all') {
        const r = parseFloat(String(m.rating || '0'));
        const threshold = parseFloat(ratingFilter);
        if (isNaN(r) || r < threshold) return false;
      }

      // 5. Quality Filter
      if (qualityFilter !== 'all') {
        const is4k = m.name?.toLowerCase().includes('4k') || m.container_extension?.toLowerCase() === 'mkv';
        if (qualityFilter === '4k' && !is4k) return false;
        if (qualityFilter === 'fhd' && is4k) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'top_rated') {
      result.sort((a, b) => parseFloat(String(b.rating || '0')) - parseFloat(String(a.rating || '0')));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => parseInt(String(b.year || '0'), 10) - parseInt(String(a.year || '0'), 10));
    } else if (sortBy === 'alphabetical') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ar'));
    }

    return result;
  }, [allMovies, searchQuery, quickFilter, yearFilter, ratingFilter, qualityFilter, sortBy]);

  const currentCategoryName = useMemo(() => {
    if (selectedCatId === 'all') return 'جميع الأفلام السينمائية';
    const found = categories.find(c => c.category_id === selectedCatId);
    return found ? found.category_name : 'الأفلام';
  }, [categories, selectedCatId]);

  return (
    <div className="relative w-screen h-screen bg-[#06080e] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* Ambient Glows */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-nova-purple/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-nova-cyan/8 rounded-full blur-[140px] pointer-events-none" />

      {/* =========================================================================
          1. TOP NAVIGATION & SEARCH BAR (Look4k V2 Signature)
         ========================================================================= */}
      <header className="h-16 px-6 border-b border-white/10 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            data-nav-id="btn-vod-back"
            onClick={onBackToHome}
            className="tv-focusable p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="العودة للرئيسية (Back)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-nova-cyan flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
              <Film className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black text-white tracking-wide">مكتبة الأفلام (NOVA 4K ULTRA)</h1>
                <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {filteredMovies.length} فيلم
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2.5">
          {/* AI Advisor Button */}
          <button
            data-nav-id="btn-vod-ai-advisor"
            onClick={() => setIsAiAdvisorOpen(true)}
            className="tv-focusable h-9 px-3.5 rounded-xl bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-purple-600/30 border border-purple-400/40 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">مستشار السهرة (AI)</span>
          </button>

          {/* Filter Bar Toggle Button */}
          <button
            data-nav-id="btn-vod-filters-toggle"
            onClick={() => setIsFilterBarOpen(prev => !prev)}
            className={`tv-focusable h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isFilterBarOpen || hasActiveFilters
                ? 'bg-purple-500/20 border-purple-400 text-purple-300'
                : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصفية متقدمة</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-purple-400" />
            )}
          </button>

          {/* Movie Search Input */}
          <div className="relative w-48 md:w-64">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث عن فيلم، ممثل..."
              className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. QUICK TOP FILTER BAR (Look4k V2 Quick Tabs)
         ========================================================================= */}
      <div className="w-full px-6 py-2.5 bg-slate-950/60 border-b border-white/5 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-20 overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'trending', label: 'الأكثر مشاهدة 🔥' },
            { id: 'latest', label: 'أحدث الإضافات 2025 ⚡' },
            { id: 'top_rated', label: 'أعلى تقييم IMDb ⭐' },
            { id: '4k_hdr', label: 'جودة 4K UHD 🎬' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setQuickFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-600/30 border border-purple-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-rose-400 hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>إلغاء الفلاتر</span>
          </button>
        )}
      </div>

      {/* Advanced Filter Collapsible Bar */}
      {isFilterBarOpen && (
        <div className="w-full px-6 py-3 bg-slate-900/95 border-b border-purple-500/20 flex flex-wrap items-center justify-between gap-4 z-20 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            {/* Year Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">السنة:</span>
              <div className="flex items-center gap-1 bg-surface-elevated p-0.5 rounded-lg border border-white/10">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: '2025', label: '2025' },
                  { id: '2024', label: '2024' },
                  { id: '2023', label: '2023' },
                  { id: 'classic', label: 'كلاسيكيات' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setYearFilter(item.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      yearFilter === item.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Rating Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">التقييم:</span>
              <div className="flex items-center gap-1 bg-surface-elevated p-0.5 rounded-lg border border-white/10">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: '8.5', label: '⭐ 8.5+' },
                  { id: '7.5', label: '⭐ 7.5+' },
                  { id: '6.0', label: '⭐ 6.0+' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setRatingFilter(item.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold font-mono transition-all ${
                      ratingFilter === item.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Quality Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">الجودة:</span>
              <div className="flex items-center gap-1 bg-surface-elevated p-0.5 rounded-lg border border-white/10">
                {[
                  { id: 'all', label: 'الكل' },
                  { id: '4k', label: '4K UHD' },
                  { id: 'fhd', label: 'FHD 1080p' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setQualityFilter(item.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      qualityFilter === item.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold">الترتيب:</span>
              <div className="flex items-center gap-1 bg-surface-elevated p-0.5 rounded-lg border border-white/10">
                {[
                  { id: 'default', label: 'افتراضي' },
                  { id: 'top_rated', label: 'الأعلى تقييماً' },
                  { id: 'newest', label: 'الأحدث' },
                  { id: 'alphabetical', label: 'أبجدي (A-Z)' },
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => setSortBy(item.id)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      sortBy === item.id ? 'bg-purple-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          3. MAIN 2-COLUMN BODY (Categories Sidebar & 3D Posters Grid)
         ========================================================================= */}
      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* RIGHT SIDEBAR: VERTICAL CATEGORIES (Look4k V2 Architecture) */}
        <aside className="w-72 md:w-80 h-full border-l border-white/10 bg-slate-950/70 backdrop-blur-xl flex flex-col shrink-0">
          
          {/* Category Search Header */}
          <div className="p-3 border-b border-white/10 bg-black/20">
            <div className="relative">
              <input
                type="text"
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                placeholder="بحث في التصنيفات..."
                className="w-full h-8 bg-surface-elevated/80 border border-white/10 rounded-lg px-7 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-400"
              />
              <Search className="w-3 h-3 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
              {catSearchQuery && (
                <button
                  onClick={() => setCatSearchQuery('')}
                  className="absolute left-2.5 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Categories List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
            {/* All Movies Button */}
            <button
              data-nav-id="vod-cat-item-0"
              onClick={() => handleSelectCategory('all')}
              className={`tv-focusable w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                selectedCatId === 'all'
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold shadow-md shadow-purple-600/30 border border-purple-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Flame className={`w-4 h-4 shrink-0 ${selectedCatId === 'all' ? 'text-amber-300' : 'text-purple-400'}`} />
                <span className="truncate">جميع الأفلام (All Movies)</span>
              </div>
              <ChevronLeft className={`w-3.5 h-3.5 shrink-0 opacity-60 ${selectedCatId === 'all' ? 'text-white' : 'text-slate-500'}`} />
            </button>

            {filteredCategories.map((cat, idx) => {
              const isSelected = selectedCatId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  ref={isSelected ? activeCategoryRef : null}
                  data-nav-id={`vod-cat-item-${idx + 1}`}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`tv-focusable w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-right ${
                    isSelected
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-extrabold shadow-md shadow-purple-600/30 border border-purple-400/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    <span className="truncate">{cat.category_name}</span>
                  </div>
                  <ChevronLeft className={`w-3.5 h-3.5 shrink-0 opacity-60 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 border-t border-white/10 bg-black/40 text-center text-[10px] text-slate-500 font-mono">
            {categories.length} باقة وتصنيف
          </div>
        </aside>

        {/* LEFT COLUMN: MAIN POSTERS GRID & SPOTLIGHT */}
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 flex flex-col space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* Continue Watching Shelf */}
          {continueWatchingList.length > 0 && (
            <div className="w-full p-4 bg-surface-elevated/80 border border-white/10 rounded-2xl shrink-0 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-purple-400" />
                  <h3 className="text-xs font-black text-white">متابعة المشاهدة (Continue Watching)</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{continueWatchingList.length} فيلم</span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                {continueWatchingList.map(({ movie, resume }) => (
                  <div
                    key={movie.stream_id}
                    onClick={() => setSelectedDetailsMovie(movie)}
                    className="relative w-44 shrink-0 h-26 bg-slate-900 rounded-xl overflow-hidden border border-white/10 hover:border-purple-400 cursor-pointer group shadow-lg"
                  >
                    <img 
                      src={movie.backdrop || movie.stream_icon} 
                      alt={movie.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-2.5 flex flex-col justify-end">
                      <span className="text-[11px] font-bold text-white truncate">{movie.name}</span>
                      <div className="flex items-center justify-between text-[9px] text-purple-300 font-mono mt-0.5">
                        <span>متبقي {Math.max(1, Math.round((resume.durationSec - resume.currentTimeSec) / 60))} د</span>
                        <span>{resume.percent}%</span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                      <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500" style={{ width: `${resume.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category Header Bar */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span className="w-1.5 h-4 rounded-full bg-purple-500 inline-block" />
              <span>{currentCategoryName}</span>
            </h3>
            <span className="text-xs text-slate-500 font-mono font-bold">{filteredMovies.length} فيلم</span>
          </div>

          {/* 3D Posters Grid */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-400 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-300">جاري تحميل باقة الأفلام...</p>
            </div>
          ) : filteredMovies.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-center gap-2">
              <Search className="w-10 h-10 text-slate-600 mb-1" />
              <p className="text-sm font-bold text-slate-300">لا يوجد فيلم مطابق لبحثك في هذا التصنيف</p>
              <button 
                onClick={resetFilters}
                className="text-xs text-purple-400 hover:underline mt-2 font-bold cursor-pointer"
              >
                إعادة ضبط جميع الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3.5 md:gap-4 pb-12">
              {filteredMovies.map((movie, idx) => {
                const isFav = favorites.includes(movie.stream_id);
                return (
                  <div
                    key={movie.stream_id}
                    data-nav-id={`vod-card-${idx}`}
                    data-nav-group="vod-cards"
                    onClick={() => {
                      setSelectedDetailsMovie(movie);
                    }}
                    className="tv-focusable relative aspect-[2/3] bg-surface-elevated rounded-2xl overflow-hidden border-2 border-white/10 hover:border-purple-400 cursor-pointer shadow-lg hover:shadow-purple-500/30 group transition-all transform hover:-translate-y-1"
                  >
                    <img 
                      src={movie.stream_icon} 
                      alt={movie.name} 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Top Badges (Resolution & Favorite) */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-purple-300 border border-purple-500/30 font-mono shadow-sm">
                        4K UHD
                      </span>
                      <button
                        onClick={(e) => toggleFavorite(movie.stream_id, e)}
                        className={`p-1.5 rounded-full backdrop-blur-md transition-transform active:scale-90 ${
                          isFav ? 'bg-rose-600 text-white' : 'bg-black/60 text-slate-300 hover:text-rose-400'
                        }`}
                        title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                      >
                        <Heart className={`w-3 h-3 ${isFav ? 'fill-current' : ''}`} />
                      </button>
                    </div>

                    {/* Bottom Info Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-3 flex flex-col justify-end z-10">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-accent-gold mb-0.5 font-mono">
                        <Star className="w-3 h-3 fill-current" />
                        <span>{movie.rating || '8.2'}</span>
                        <span className="text-slate-400">• {movie.year || '2025'}</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-white truncate leading-tight">{movie.name}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      {/* =========================================================================
          4. RICH MOVIE DETAILS MODAL (نافذة منبثقة غنية بتفاصيل الفيلم)
         ========================================================================= */}
      {selectedDetailsMovie && (
        <div 
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-xl flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
          onClick={() => setSelectedDetailsMovie(null)}
        >
          <div 
            className="relative w-full max-w-4xl bg-slate-950 border border-white/15 rounded-3xl overflow-hidden shadow-2xl flex flex-col md:flex-row"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Background Ambient Poster Banner */}
            <div 
              className="absolute inset-0 bg-cover bg-center opacity-15 filter blur-2xl pointer-events-none"
              style={{ backgroundImage: `url(${selectedDetailsMovie.backdrop || selectedDetailsMovie.stream_icon})` }}
            />

            {/* Close Button */}
            <button
              onClick={() => setSelectedDetailsMovie(null)}
              className="absolute top-4 left-4 z-30 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Poster Column */}
            <div className="relative z-10 w-full md:w-72 aspect-[2/3] shrink-0 p-6 flex items-center justify-center">
              <div className="w-full h-full rounded-2xl overflow-hidden shadow-2xl border border-white/20">
                <img 
                  src={selectedDetailsMovie.stream_icon} 
                  alt={selectedDetailsMovie.name} 
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            {/* Details Content Column */}
            <div className="relative z-10 flex-1 p-6 md:p-8 flex flex-col justify-between text-right">
              <div>
                {/* Tech Specs & Badges */}
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-md bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold font-mono">
                    4K ULTRA HD
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-xs font-bold font-mono">
                    HDR10+
                  </span>
                  <span className="px-2 py-0.5 rounded-md bg-white/10 text-slate-200 text-xs font-bold font-mono">
                    DOLBY 5.1
                  </span>
                  <span className="flex items-center gap-1 bg-amber-500/20 text-accent-gold text-xs font-bold px-2 py-0.5 rounded-md border border-amber-500/30 font-mono">
                    <Star className="w-3 h-3 fill-current" />
                    <span>{selectedDetailsMovie.rating || '8.5'} / 10 IMDb</span>
                  </span>
                  <span className="text-xs font-mono text-slate-300 font-bold">
                    {selectedDetailsMovie.year || '2025'}
                  </span>
                  {selectedDetailsMovie.duration && (
                    <span className="text-xs font-mono text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{selectedDetailsMovie.duration}</span>
                    </span>
                  )}
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-white mb-2 leading-tight">
                  {selectedDetailsMovie.name}
                </h2>

                {/* Synopsis */}
                <p className="text-xs md:text-sm text-slate-300 leading-relaxed mb-5 max-h-36 overflow-y-auto">
                  {selectedDetailsMovie.plot || 'استمتع بتجربة سينمائية فريدة مع هذا الفيلم الرائع بدقة 4K فائقة الوضوح وصوت محيطي نقي.'}
                </p>

                {/* Cast & Director */}
                {(selectedDetailsMovie.cast || selectedDetailsMovie.director) && (
                  <div className="space-y-1 mb-5 text-xs text-slate-400 border-t border-white/10 pt-3">
                    {selectedDetailsMovie.director && (
                      <div><strong className="text-white">المخرج:</strong> {selectedDetailsMovie.director}</div>
                    )}
                    {selectedDetailsMovie.cast && (
                      <div className="truncate"><strong className="text-white">طاقم التمثيل:</strong> {selectedDetailsMovie.cast}</div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-white/10 flex-wrap">
                <button
                  onClick={() => {
                    const m = selectedDetailsMovie;
                    setSelectedDetailsMovie(null);
                    onPlayMovie(m);
                  }}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-nova-cyan hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm rounded-2xl flex items-center gap-2.5 shadow-lg shadow-purple-600/30 cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>تشغيل الفيلم الآن (Play)</span>
                </button>

                <button
                  onClick={() => toggleFavorite(selectedDetailsMovie.stream_id)}
                  className={`px-4 py-3 rounded-2xl border text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
                    favorites.includes(selectedDetailsMovie.stream_id)
                      ? 'bg-rose-600/20 border-rose-500 text-rose-300'
                      : 'bg-white/5 hover:bg-white/10 border-white/15 text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorites.includes(selectedDetailsMovie.stream_id) ? 'fill-current text-rose-400' : ''}`} />
                  <span>{favorites.includes(selectedDetailsMovie.stream_id) ? 'في المفضلة' : 'إضافة للمفضلة'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Movie Advisor Modal */}
      <AiMovieAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        availableMovies={allMovies}
        onPlayMovie={onPlayMovie}
        onSearchInCatalog={(q) => setSearchQuery(q)}
      />

    </div>
  );
};
