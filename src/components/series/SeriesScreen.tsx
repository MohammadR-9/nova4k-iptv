import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Clapperboard, Star, Play, ArrowLeft, 
  X, Search, Sparkles, Filter, RotateCcw, Clock, ChevronLeft, Folder, Flame,
  Heart
} from 'lucide-react';
import { SeriesItem, SeriesEpisode } from '../../types/iptv.types';
import { XtreamService } from '../../services/xtream.service';
import { VodResumeService, ResumePoint } from '../../services/vodResume.service';
import { spatialNav } from '../../navigation/spatialNav';
import { TV_KEYS } from '../../navigation/keycodes';
import { AiMovieAdvisorModal } from '../vod/AiMovieAdvisorModal';
import { isMobileDevice } from '../../utils/device';

export interface SeriesScreenProps {
  onBackToHome: () => void;
  onPlayEpisode: (episode: SeriesEpisode, series: SeriesItem) => void;
}

export const SeriesScreen: React.FC<SeriesScreenProps> = ({ onBackToHome, onPlayEpisode }) => {
  const [categories, setCategories] = useState<{ category_id: string; category_name: string }[]>([]);
  const [selectedCatId, setSelectedCatId] = useState<string>('all');
  const [allSeries, setAllSeries] = useState<SeriesItem[]>([]);
  const [focusedSeries, setFocusedSeries] = useState<SeriesItem | null>(null);
  const [isMobile, setIsMobile] = useState<boolean>(isMobileDevice);

  useEffect(() => {
    const handleResize = () => setIsMobile(isMobileDevice());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [searchQuery, setSearchQuery] = useState('');
  const [catSearchQuery, setCatSearchQuery] = useState('');
  const [quickFilter, setQuickFilter] = useState<'all' | 'trending' | 'latest' | 'top_rated' | 'arabic'>('all');

  // Advanced Filters
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [ratingFilter, setRatingFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('default');
  const [isFilterBarOpen, setIsFilterBarOpen] = useState<boolean>(false);

  // Favorites
  const [favorites, setFavorites] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem('iptv_series_favorites');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // AI Advisor Modal
  const [isAiAdvisorOpen, setIsAiAdvisorOpen] = useState<boolean>(false);

  // Continue Watching Shelf
  const [continueWatchingList, setContinueWatchingList] = useState<{ series: SeriesItem; episode: SeriesEpisode; resume: ResumePoint }[]>([]);

  // Loading states
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEpisodesLoading, setIsEpisodesLoading] = useState<boolean>(false);

  // Global search across all 10,008 series
  const [masterSearchResults, setMasterSearchResults] = useState<SeriesItem[] | null>(null);
  const [isSearchingGlobally, setIsSearchingGlobally] = useState<boolean>(false);

  // Modal / Detail state for Season & Episode selection
  const [selectedSeries, setSelectedSeries] = useState<SeriesItem | null>(null);
  const [activeSeasonNum, setActiveSeasonNum] = useState<number>(1);

  // Active category ref
  const activeCategoryRef = useRef<HTMLButtonElement | null>(null);

  const toggleFavorite = (seriesId: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setFavorites(prev => {
      const updated = prev.includes(seriesId) ? prev.filter(id => id !== seriesId) : [...prev, seriesId];
      try {
        localStorage.setItem('iptv_series_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // 1. Load Categories and Series
  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const cats = await XtreamService.getSeriesCategories();
        setCategories(cats);
        const list = await XtreamService.getSeriesList('all');
        setAllSeries(list);
        if (list.length > 0) {
          setFocusedSeries(list[0]);
        }

        // Preload complete master catalog in background for instant global search across all 10,008 series
        XtreamService.getAllSeriesMaster().catch(() => {});

        // Populate Continue Watching from stored resume points
        const resumeMap = VodResumeService.getAllResumePoints();
        const inProgress: { series: SeriesItem; episode: SeriesEpisode; resume: ResumePoint }[] = [];
        list.forEach(s => {
          s.seasons?.forEach(season => {
            season.episodes?.forEach(ep => {
              const r = resumeMap[String(ep.id)];
              if (r && r.percent > 2 && r.percent < 95) {
                inProgress.push({ series: s, episode: ep, resume: r });
              }
            });
          });
        });
        setContinueWatchingList(inProgress);
      } catch (e) {
        console.error('Error loading series:', e);
      } finally {
        setIsLoading(false);
      }
    };
    load();

    setTimeout(() => {
      spatialNav.setFocus('series-cat-item-0');
    }, 200);
  }, []);

  // Debounced global search across all 10,008 series
  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setMasterSearchResults(null);
      setIsSearchingGlobally(false);
      return;
    }

    let isCurrent = true;
    setIsSearchingGlobally(true);
    const timer = setTimeout(async () => {
      try {
        const res = await XtreamService.searchSeriesGlobally(q);
        if (isCurrent) {
          setMasterSearchResults(res);
          setIsSearchingGlobally(false);
        }
      } catch (e) {
        if (isCurrent) setIsSearchingGlobally(false);
      }
    }, 150);

    return () => {
      isCurrent = false;
      clearTimeout(timer);
    };
  }, [searchQuery]);

  // 2. Filter Category
  const handleSelectCategory = async (catId: string) => {
    if (selectedCatId === catId) return;
    setSelectedCatId(catId);
    setIsLoading(true);
    try {
      const filtered = await XtreamService.getSeriesList(catId);
      setAllSeries(filtered);
      if (filtered.length > 0) {
        setFocusedSeries(filtered[0]);
        setTimeout(() => spatialNav.setFocus('series-card-0'), 100);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const hasActiveFilters = yearFilter !== 'all' || ratingFilter !== 'all' || sortBy !== 'default' || quickFilter !== 'all';

  const resetFilters = () => {
    setYearFilter('all');
    setRatingFilter('all');
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

  // 3. Search & Filter Multi-Attributes (uses master global search across all 10,008 series when searching)
  const filteredSeries = useMemo(() => {
    const isSearching = !!searchQuery.trim();
    const sourcePool = (isSearching && masterSearchResults !== null) ? masterSearchResults : allSeries;

    let result = sourcePool.filter(s => {
      // Text Search (if master search results are still resolving, filter active pool as quick fallback)
      if (isSearching && masterSearchResults === null) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = s.name?.toLowerCase().includes(q) || false;
        const matchCast = s.cast?.toLowerCase().includes(q) || false;
        const matchGenre = s.genre?.toLowerCase().includes(q) || false;
        if (!matchName && !matchCast && !matchGenre) return false;
      }

      // Quick Top Filter
      if (quickFilter === 'trending') {
        const r = parseFloat(String(s.rating || '0'));
        if (r < 7.5) return false;
      } else if (quickFilter === 'latest') {
        const y = parseInt(String(s.releaseDate || '0'), 10);
        if (y < 2024) return false;
      } else if (quickFilter === 'top_rated') {
        const r = parseFloat(String(s.rating || '0'));
        if (r < 8.2) return false;
      } else if (quickFilter === 'arabic') {
        const isAr = s.name?.includes('مسلسل') || s.genre?.includes('عربي') || s.name?.match(/[\u0600-\u06FF]/);
        if (!isAr) return false;
      }

      // Year Filter
      if (yearFilter !== 'all') {
        const y = parseInt(String(s.releaseDate || '0'), 10);
        if (yearFilter === '2025' && y !== 2025) return false;
        if (yearFilter === '2024' && y !== 2024) return false;
        if (yearFilter === '2023' && y !== 2023) return false;
        if (yearFilter === 'classic' && (y >= 2020 || y === 0)) return false;
      }

      // Rating Filter
      if (ratingFilter !== 'all') {
        const r = parseFloat(String(s.rating || '0'));
        const minRating = parseFloat(ratingFilter);
        if (isNaN(r) || r < minRating) return false;
      }

      return true;
    });

    // Sorting
    if (sortBy === 'top_rated') {
      result.sort((a, b) => (parseFloat(String(b.rating || '0')) || 0) - (parseFloat(String(a.rating || '0')) || 0));
    } else if (sortBy === 'newest') {
      result.sort((a, b) => (parseInt(String(b.releaseDate || '0'), 10) || 0) - (parseInt(String(a.releaseDate || '0'), 10) || 0));
    } else if (sortBy === 'alphabetical') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    return result;
  }, [allSeries, masterSearchResults, searchQuery, quickFilter, yearFilter, ratingFilter, sortBy]);

  // 4. Open Series Details & Seasons Modal
  const handleOpenSeries = async (series: SeriesItem) => {
    setSelectedSeries(series);
    setActiveSeasonNum(1);
    setIsEpisodesLoading(true);

    try {
      if (!series.seasons || series.seasons.length === 0) {
        const fullSeries = await XtreamService.getSeriesInfo(series.series_id);
        if (fullSeries && fullSeries.seasons && fullSeries.seasons.length > 0) {
          setSelectedSeries(fullSeries);
          setActiveSeasonNum(fullSeries.seasons[0].season_number || 1);
        }
      }
    } catch (err) {
      console.warn('Failed to load series episodes:', err);
    } finally {
      setIsEpisodesLoading(false);
      setTimeout(() => {
        spatialNav.setFocus('btn-season-1');
      }, 150);
    }
  };

  // 5. Close Series Details Modal
  const handleCloseModal = () => {
    setSelectedSeries(null);
    setTimeout(() => {
      const idx = allSeries.findIndex(s => s.series_id === focusedSeries?.series_id);
      spatialNav.setFocus(`series-card-${Math.max(0, idx)}`);
    }, 150);
  };

  // 6. Handle Keyboard & Remote back button
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.keyCode === TV_KEYS.RETURN || e.keyCode === TV_KEYS.WEBOS_BACK || e.keyCode === TV_KEYS.ESCAPE) {
        if (selectedSeries) {
          e.preventDefault();
          handleCloseModal();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedSeries, focusedSeries, allSeries]);

  const currentCategoryName = useMemo(() => {
    if (selectedCatId === 'all') return 'جميع المسلسلات';
    const found = categories.find(c => c.category_id === selectedCatId);
    return found ? found.category_name : 'المسلسلات';
  }, [categories, selectedCatId]);

  // Active Season episodes
  const currentSeason = selectedSeries?.seasons?.find(s => s.season_number === activeSeasonNum) || selectedSeries?.seasons?.[0];

  return (
    <div className="relative w-screen h-screen bg-[#06080e] text-slate-100 flex flex-col overflow-hidden select-none font-sans">
      
      {/* Ambient Glow */}
      <div className="absolute top-0 right-1/4 w-96 h-96 bg-nova-emerald/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-nova-cyan/8 rounded-full blur-[140px] pointer-events-none" />

      {/* =========================================================================
          1. TOP NAVIGATION & SEARCH BAR (Look4k V2 Series Header)
         ========================================================================= */}
      <header className="h-16 px-6 border-b border-white/10 bg-slate-950/85 backdrop-blur-2xl flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <button 
            data-nav-id="btn-series-back"
            onClick={onBackToHome}
            className="tv-focusable p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
            title="العودة للرئيسية (Back)"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 via-teal-600 to-nova-cyan flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/25">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base md:text-lg font-black text-white tracking-wide">مكتبة المسلسلات (NOVA 4K ULTRA)</h1>
                <span className="text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-bold">
                  {searchQuery.trim() ? `${filteredSeries.length} نتيجة بحث` : `${filteredSeries.length} مسلسل`}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Header Action Tools */}
        <div className="flex items-center gap-2.5">
          {/* AI Advisor Button */}
          <button
            data-nav-id="btn-series-ai-advisor"
            onClick={() => setIsAiAdvisorOpen(true)}
            className="tv-focusable h-9 px-3.5 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-600 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/30 border border-emerald-400/40 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">مستشار المسلسلات (AI)</span>
          </button>

          {/* Filter Bar Toggle Button */}
          <button
            data-nav-id="btn-series-filters-toggle"
            onClick={() => setIsFilterBarOpen(prev => !prev)}
            className={`tv-focusable h-9 px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isFilterBarOpen || hasActiveFilters
                ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300'
                : 'bg-surface-elevated border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصفية متقدمة</span>
            {hasActiveFilters && (
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
            )}
          </button>

          {/* Series Global Search Input */}
          <div className="relative w-52 md:w-72">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث شامل في كل المسلسلات (10,000)..."
              className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
            />
            {isSearchingGlobally ? (
              <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin absolute right-2.5 top-2.5" />
            ) : (
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            )}
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2.5 text-slate-400 hover:text-white"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* =========================================================================
          2. QUICK TOP FILTER BAR
         ========================================================================= */}
      <div className="w-full px-6 py-2.5 bg-slate-950/60 border-b border-white/5 backdrop-blur-md flex items-center justify-between gap-3 shrink-0 z-20 overflow-x-auto">
        <div className="flex items-center gap-2">
          {[
            { id: 'all', label: 'الكل' },
            { id: 'trending', label: 'الأكثر تداولاً 🔥' },
            { id: 'latest', label: 'مواسم 2025 ⚡' },
            { id: 'top_rated', label: 'أعلى تقييم IMDb ⭐' },
            { id: 'arabic', label: 'مسلسلات عربية 🌙' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setQuickFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                quickFilter === tab.id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md shadow-emerald-500/30 border border-emerald-400/40'
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
        <div className="w-full px-6 py-3 bg-slate-900/95 border-b border-emerald-500/20 flex flex-wrap items-center justify-between gap-4 z-20 backdrop-blur-md">
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
                      yearFilter === item.id ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
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
                      ratingFilter === item.id ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
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
                      sortBy === item.id ? 'bg-emerald-500 text-slate-950 font-black shadow-sm' : 'text-slate-400 hover:text-white'
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
          3. MAIN BODY (Mobile Horizontal Bar / TV 2-Column with Sidebar)
         ========================================================================= */}
      {/* MOBILE HORIZONTAL CATEGORIES BAR */}
      {isMobile && (
        <div className="w-full px-3 py-2 bg-slate-950/90 border-b border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0 z-10">
          <button
            onClick={() => handleSelectCategory('all')}
            className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedCatId === 'all'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md'
                : 'bg-white/5 border border-white/5 text-slate-300'
            }`}
          >
            الكل ({allSeries.length})
          </button>
          {categories.map((cat) => (
            <button
              key={cat.category_id}
              onClick={() => handleSelectCategory(cat.category_id)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all truncate ${
                selectedCatId === cat.category_id
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md'
                  : 'bg-white/5 border border-white/5 text-slate-300'
              }`}
            >
              {cat.category_name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 flex flex-row overflow-hidden">
        
        {/* RIGHT SIDEBAR: VERTICAL CATEGORIES (Smart TV Only) */}
        {!isMobile && (
        <aside className="w-72 md:w-80 h-full border-l border-white/10 bg-slate-950/70 backdrop-blur-xl flex flex-col shrink-0">
          
          {/* Category Search Header */}
          <div className="p-3 border-b border-white/10 bg-black/20">
            <div className="relative">
              <input
                type="text"
                value={catSearchQuery}
                onChange={(e) => setCatSearchQuery(e.target.value)}
                placeholder="بحث في باقات المسلسلات..."
                className="w-full h-8 bg-surface-elevated/80 border border-white/10 rounded-lg px-7 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
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
            {/* All Series Button */}
            <button
              data-nav-id="series-cat-item-0"
              onClick={() => handleSelectCategory('all')}
              className={`tv-focusable w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                selectedCatId === 'all'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md shadow-emerald-500/30 border border-emerald-400/30'
                  : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 truncate">
                <Flame className={`w-4 h-4 shrink-0 ${selectedCatId === 'all' ? 'text-amber-300' : 'text-emerald-400'}`} />
                <span className="truncate">جميع المسلسلات (All Series)</span>
              </div>
              <ChevronLeft className={`w-3.5 h-3.5 shrink-0 opacity-60 ${selectedCatId === 'all' ? 'text-slate-950' : 'text-slate-500'}`} />
            </button>

            {filteredCategories.map((cat, idx) => {
              const isSelected = selectedCatId === cat.category_id;
              return (
                <button
                  key={cat.category_id}
                  ref={isSelected ? activeCategoryRef : null}
                  data-nav-id={`series-cat-item-${idx + 1}`}
                  onClick={() => handleSelectCategory(cat.category_id)}
                  className={`tv-focusable w-full p-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer text-right ${
                    isSelected
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-md shadow-emerald-500/30 border border-emerald-400/30'
                      : 'text-slate-300 hover:text-white hover:bg-white/5 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2.5 truncate">
                    <Folder className={`w-4 h-4 shrink-0 ${isSelected ? 'text-slate-950' : 'text-slate-500'}`} />
                    <span className="truncate">{cat.category_name}</span>
                  </div>
                  <ChevronLeft className={`w-3.5 h-3.5 shrink-0 opacity-60 ${isSelected ? 'text-slate-950' : 'text-slate-500'}`} />
                </button>
              );
            })}
          </div>

          {/* Sidebar Footer Info */}
          <div className="p-3 border-t border-white/10 bg-black/40 text-center text-[10px] text-slate-500 font-mono">
            {categories.length} باقة وتصنيف
          </div>
        </aside>
        )}

        {/* LEFT COLUMN: MAIN POSTERS GRID */}
        <main className="flex-1 h-full overflow-y-auto p-4 md:p-6 flex flex-col space-y-4 scrollbar-thin scrollbar-thumb-white/10">
          
          {/* Continue Watching Shelf */}
          {continueWatchingList.length > 0 && (
            <div className="w-full p-4 bg-surface-elevated/80 border border-white/10 rounded-2xl shrink-0 backdrop-blur-md shadow-xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-xs font-black text-white">متابعة الحلقات (Continue Series)</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">{continueWatchingList.length} حلقة</span>
              </div>

              <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10">
                {continueWatchingList.map(({ series, episode, resume }) => (
                  <div
                    key={episode.id}
                    onClick={() => onPlayEpisode(episode, series)}
                    className="relative w-48 shrink-0 h-28 bg-slate-900 rounded-xl overflow-hidden border border-white/10 hover:border-emerald-400 cursor-pointer group shadow-lg"
                  >
                    <img 
                      src={episode.stream_icon || series.cover} 
                      alt={episode.title} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent p-2.5 flex flex-col justify-end">
                      <span className="text-[11px] font-bold text-white truncate">{series.name}</span>
                      <span className="text-[10px] text-emerald-400 truncate">Ep {episode.episode_num}: {episode.title}</span>
                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono mt-0.5">
                        <span>متبقي {Math.max(1, Math.round((resume.durationSec - resume.currentTimeSec) / 60))} د</span>
                        <span>{resume.percent}%</span>
                      </div>
                    </div>
                    <div className="absolute bottom-0 inset-x-0 h-1 bg-white/20">
                      <div className="h-full bg-gradient-to-r from-emerald-400 to-teal-400" style={{ width: `${resume.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Category / Search Header Bar */}
          <div className="flex items-center justify-between pt-1">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <span className={`w-1.5 h-4 rounded-full ${searchQuery.trim() ? 'bg-cyan-400' : 'bg-emerald-500'} inline-block`} />
              <span>
                {searchQuery.trim() 
                  ? (isSearchingGlobally ? 'جاري البحث الشامل في كافة مكتبة المسلسلات...' : `نتائج البحث الشامل عن: "${searchQuery}"`)
                  : currentCategoryName}
              </span>
            </h3>
            <span className="text-xs text-slate-400 font-mono font-bold">
              {filteredSeries.length} مسلسل {searchQuery.trim() ? '(بحث شامل)' : ''}
            </span>
          </div>

          {/* 3D Series Posters Grid */}
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-300">جاري تحميل باقة المسلسلات...</p>
            </div>
          ) : filteredSeries.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-center gap-2">
              <Search className="w-10 h-10 text-slate-600 mb-1" />
              <p className="text-sm font-bold text-slate-300">لا يوجد مسلسل مطابق لبحثك في هذا التصنيف</p>
              <button 
                onClick={resetFilters}
                className="text-xs text-emerald-400 hover:underline mt-2 font-bold cursor-pointer"
              >
                إعادة ضبط جميع الفلاتر
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-2 sm:gap-3.5 pb-24">
              {filteredSeries.map((series, idx) => {
                const isFav = favorites.includes(series.series_id);
                const seasonCount = series.seasons?.length || 1;
                return (
                  <div
                    key={series.series_id}
                    data-nav-id={`series-card-${idx}`}
                    data-nav-group="series-cards"
                    onClick={() => handleOpenSeries(series)}
                    onMouseEnter={() => setFocusedSeries(series)}
                    className="tv-focusable relative aspect-[2/3] bg-surface-elevated rounded-2xl overflow-hidden border-2 border-white/10 hover:border-emerald-400 cursor-pointer shadow-lg hover:shadow-emerald-500/30 group transition-all transform hover:-translate-y-1"
                  >
                    <img 
                      src={series.cover} 
                      alt={series.name} 
                      loading="lazy"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />

                    {/* Top Badges */}
                    <div className="absolute top-2 inset-x-2 flex items-center justify-between z-10">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-black/75 backdrop-blur-md text-emerald-300 border border-emerald-500/30 font-mono shadow-sm">
                        {seasonCount} {seasonCount > 1 ? 'مواسم' : 'موسم'}
                      </span>
                      <button
                        onClick={(e) => toggleFavorite(series.series_id, e)}
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
                        <span>{series.rating || '8.3'}</span>
                        <span className="text-slate-400">• {series.releaseDate || '2024'}</span>
                      </div>
                      <h4 className="text-xs font-extrabold text-white truncate leading-tight">{series.name}</h4>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </main>
      </div>

      {/* =========================================================================
          4. INTERACTIVE SEASONS & EPISODES EXPLORER (Look4k V2 Architecture)
         ========================================================================= */}
      {selectedSeries && (
        <div className="fixed inset-0 z-50 bg-[#060910]/95 backdrop-blur-2xl p-4 md:p-8 flex flex-col justify-between overflow-hidden animate-in fade-in duration-200">
          
          {/* Modal Header Bar */}
          <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-3">
              <button
                data-nav-id="btn-close-series-modal"
                onClick={handleCloseModal}
                className="tv-focusable p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 hover:text-white border border-white/15 cursor-pointer"
                title="رجوع للمكتبة (Back)"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-base md:text-xl font-black text-white flex items-center gap-2">
                  <span>{selectedSeries.name}</span>
                  <span className="text-xs text-emerald-400 font-mono bg-emerald-500/20 px-2.5 py-0.5 rounded-full font-bold">
                    {selectedSeries.releaseDate || '2024'}
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs sm:max-w-md">{selectedSeries.genre}</p>
              </div>
            </div>

            <button
              onClick={handleCloseModal}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 cursor-pointer"
            >
              <span>إغلاق (Back)</span>
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Modal Body */}
          {isEpisodesLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-3">
              <div className="w-10 h-10 border-4 border-emerald-500/20 border-t-emerald-400 rounded-full animate-spin" />
              <p className="text-xs font-bold text-slate-300">جاري فحص وتجهيز حلقات المسلسل...</p>
            </div>
          ) : (
            <>
              {/* Season Selector Tabs */}
              <div className="w-full py-3 flex items-center gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10 border-b border-white/5 shrink-0">
                <span className="text-xs font-bold text-slate-400 ml-2">المواسم:</span>
                {selectedSeries.seasons?.map((season) => {
                  const isSeasonActive = activeSeasonNum === season.season_number;
                  const epCount = season.episode_count || season.episodes?.length || 0;
                  return (
                    <button
                      key={season.season_number}
                      data-nav-id={`btn-season-${season.season_number}`}
                      onClick={() => setActiveSeasonNum(season.season_number)}
                      className={`tv-focusable px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                        isSeasonActive
                          ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-slate-950 font-black shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
                      }`}
                    >
                      {season.name || `الموسم ${season.season_number}`} ({epCount} حلقة)
                    </button>
                  );
                })}
              </div>

              {/* Episodes Grid/List */}
              <div className="flex-1 overflow-y-auto py-4 space-y-2.5 scrollbar-thin scrollbar-thumb-white/10">
                {!currentSeason || !currentSeason.episodes || currentSeason.episodes.length === 0 ? (
                  <div className="h-48 flex flex-col items-center justify-center text-slate-500">
                    <p className="text-xs">لم يتم العثور على حلقات لهذا الموسم</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-8">
                    {currentSeason.episodes.map((ep, idx) => (
                      <div
                        key={ep.id}
                        data-nav-id={`ep-item-${idx}`}
                        data-nav-group="episodes-list"
                        onClick={() => onPlayEpisode(ep, selectedSeries)}
                        className="tv-focusable p-3 rounded-2xl bg-surface-elevated/90 border border-white/10 hover:border-emerald-400 flex items-center justify-between cursor-pointer group transition-all"
                      >
                        <div className="flex items-center gap-3 overflow-hidden">
                          {/* Episode Thumbnail */}
                          <div className="relative w-28 md:w-36 h-20 rounded-xl overflow-hidden bg-black shrink-0 border border-white/10">
                            <img 
                              src={ep.stream_icon || selectedSeries.cover} 
                              alt={ep.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play className="w-6 h-6 text-emerald-400 fill-emerald-400" />
                            </div>
                            {ep.duration && (
                              <span className="absolute bottom-1 right-1 text-[9px] font-mono font-bold bg-black/85 px-1.5 py-0.2 rounded text-slate-200">
                                {ep.duration}
                              </span>
                            )}
                          </div>

                          {/* Episode Title & Overview */}
                          <div className="flex flex-col overflow-hidden text-right">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded shrink-0">
                                Ep {ep.episode_num}
                              </span>
                              <h4 className="text-xs font-extrabold text-white truncate">{ep.title}</h4>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                              {ep.overview || selectedSeries.plot || 'حلقة مميزة مليئة بالإثارة والتشويق.'}
                            </p>
                          </div>
                        </div>

                        {/* Play Button */}
                        <div className="shrink-0 mr-2">
                          <button 
                            className="p-2.5 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500 text-emerald-400 group-hover:text-slate-950 transition-colors shadow-sm cursor-pointer"
                            title="تشغيل الحلقة الآن"
                          >
                            <Play className="w-4 h-4 fill-current" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          {/* Modal Footer */}
          <div className="w-full pt-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono shrink-0">
            <span className="font-sans">اختر حلقة للبدء فوراً بجودة 4K UHD</span>
            <span>NOVA 4K ULTRA Series Engine</span>
          </div>

        </div>
      )}

      {/* AI Advisor Modal */}
      <AiMovieAdvisorModal
        isOpen={isAiAdvisorOpen}
        onClose={() => setIsAiAdvisorOpen(false)}
        onSearchInCatalog={(q) => setSearchQuery(q)}
      />

    </div>
  );
};
