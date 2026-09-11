import React, { useState, useEffect, useCallback } from 'react';
import {
  Star, Tv, Film, Clapperboard, Trash2, Play,
  Heart, ChevronLeft, Search, X, Clock
} from 'lucide-react';
import { FavoritesService, FavoriteEntry, FavoriteType } from '../../services/favorites.service';
import { spatialNav } from '../../navigation/spatialNav';
import { VodItem, LiveChannel } from '../../types/iptv.types';

interface FavoritesScreenProps {
  onBackToHome: () => void;
  onPlayChannel?: (channel: LiveChannel) => void;
  onPlayMovie?: (movie: VodItem) => void;
}

type FilterTab = 'all' | 'channel' | 'movie' | 'series';

export const FavoritesScreen: React.FC<FavoritesScreenProps> = ({
  onBackToHome,
  onPlayMovie,
}) => {
  const [favorites, setFavorites] = useState<FavoriteEntry[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [removingId, setRemovingId] = useState<string | null>(null);

  const reload = useCallback(() => {
    setFavorites(FavoritesService.getAll());
  }, []);

  useEffect(() => {
    reload();
    const timer = setTimeout(() => spatialNav.setFocus('fav-back'), 100);
    return () => clearTimeout(timer);
  }, [reload]);

  const filtered = favorites.filter(f => {
    const matchTab = activeTab === 'all' || f.type === activeTab;
    const matchSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchTab && matchSearch;
  });

  const handleRemove = (entry: FavoriteEntry) => {
    setRemovingId(entry.id);
    setTimeout(() => {
      FavoritesService.remove(entry.type, entry.stream_id);
      reload();
      setRemovingId(null);
    }, 300);
  };

  const handlePlay = (entry: FavoriteEntry) => {
    if (entry.type === 'movie' && onPlayMovie && entry.direct_source) {
      const movie: VodItem = {
        num: 1,
        name: entry.name,
        stream_type: 'movie',
        stream_id: entry.stream_id,
        stream_icon: entry.icon,
        rating: 0,
        year: '',
        duration: '',
        durationSec: 7200,
        category_id: entry.category_id || 'all',
        direct_source: entry.direct_source,
        container_extension: entry.container_extension || 'mkv',
      };
      onPlayMovie(movie);
    } else if (entry.type === 'channel') {
      // Navigate to live TV — channel selection handled there
      onBackToHome();
    }
  };

  const typeIcon = (type: FavoriteType) => {
    if (type === 'channel') return <Tv className="w-3.5 h-3.5" />;
    if (type === 'movie')   return <Film className="w-3.5 h-3.5" />;
    return                         <Clapperboard className="w-3.5 h-3.5" />;
  };

  const typeColor = (type: FavoriteType) => {
    if (type === 'channel') return 'text-nova-cyan border-nova-cyan/40 bg-nova-cyan/10';
    if (type === 'movie')   return 'text-nova-purple border-nova-purple/40 bg-nova-purple/10';
    return                         'text-nova-emerald border-nova-emerald/40 bg-nova-emerald/10';
  };

  const typeLabel = (type: FavoriteType) => {
    if (type === 'channel') return 'قناة';
    if (type === 'movie')   return 'فيلم';
    return                         'مسلسل';
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString('ar-SA', { day: '2-digit', month: 'short' });
  };

  const tabs: { id: FilterTab; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'all',     label: `الكل (${favorites.length})`,                       icon: <Heart className="w-4 h-4" />,       color: 'from-nova-gold to-amber-600' },
    { id: 'channel', label: `قنوات (${FavoritesService.getByType('channel').length})`, icon: <Tv className="w-4 h-4" />,    color: 'from-nova-cyan to-blue-600' },
    { id: 'movie',   label: `أفلام (${FavoritesService.getByType('movie').length})`,   icon: <Film className="w-4 h-4" />,  color: 'from-nova-purple to-purple-700' },
    { id: 'series',  label: `مسلسلات (${FavoritesService.getByType('series').length})`,icon: <Clapperboard className="w-4 h-4" />, color: 'from-nova-emerald to-emerald-700' },
  ];

  return (
    <div className="relative w-full h-full flex flex-col bg-oled overflow-hidden text-white font-sans select-none">

      {/* Background Glows */}
      <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-nova-gold/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-24 -left-24 w-[400px] h-[400px] bg-nova-purple/10 rounded-full blur-[100px] pointer-events-none" />

      {/* HEADER */}
      <header className="relative z-10 flex items-center gap-4 px-6 py-4 border-b border-white/10 bg-surface-elevated/80 backdrop-blur-xl shrink-0">
        <button
          data-nav-id="fav-back"
          onClick={onBackToHome}
          className="tv-focusable flex items-center gap-2 px-4 py-2 rounded-xl bg-white/8 hover:bg-white/12 border border-white/15 text-slate-300 hover:text-white transition-all text-sm font-semibold cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>رجوع</span>
        </button>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-nova-gold to-amber-500 flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)]">
            <Star className="w-5 h-5 text-white fill-white" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white">المفضلة السريعة</h1>
            <p className="text-xs text-slate-400 font-mono">{favorites.length} عنصر محفوظ</p>
          </div>
        </div>

        {/* Search */}
        <div className="flex-1 max-w-sm mr-auto">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="ابحث في المفضلة..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white/8 border border-white/15 rounded-xl pr-9 pl-8 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-nova-gold/50 transition-all"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* FILTER TABS */}
      <div className="relative z-10 flex items-center gap-3 px-6 py-3 border-b border-white/8 bg-black/30 backdrop-blur-sm shrink-0 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            data-nav-id={`fav-tab-${tab.id}`}
            onClick={() => setActiveTab(tab.id)}
            className={`tv-focusable flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition-all cursor-pointer border ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${tab.color} text-white border-transparent shadow-md`
                : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white'
            }`}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* CONTENT */}
      <div className="relative z-10 flex-1 overflow-y-auto px-6 py-4">
        {filtered.length === 0 ? (
          /* Empty State */
          <div className="flex flex-col items-center justify-center h-full gap-5 text-center">
            <div className="w-24 h-24 rounded-3xl bg-nova-gold/10 border border-nova-gold/20 flex items-center justify-center">
              <Star className="w-12 h-12 text-nova-gold/40" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white/60 mb-2">
                {searchQuery ? 'لا نتائج للبحث' : 'المفضلة فارغة'}
              </h2>
              <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
                {searchQuery
                  ? 'جرّب كلمة بحث مختلفة'
                  : 'اضغط على ⭐ في أي قناة أو فيلم أو مسلسل لإضافته هنا للوصول السريع'
                }
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filtered.map((entry, idx) => (
              <div
                key={entry.id}
                data-nav-id={`fav-item-${idx}`}
                className={`tv-focusable group relative rounded-2xl overflow-hidden border border-white/10 bg-surface-elevated/60 hover:border-white/25 cursor-pointer transition-all duration-300 ${
                  removingId === entry.id ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
                onClick={() => handlePlay(entry)}
              >
                {/* Thumbnail */}
                <div className="relative aspect-[2/3] overflow-hidden bg-black/40">
                  <img
                    src={entry.icon}
                    alt={entry.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={e => {
                      (e.target as HTMLImageElement).src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 150"><rect fill="%23111827" width="100" height="150"/><text fill="%23374151" font-size="40" text-anchor="middle" x="50" y="85">📺</text></svg>';
                    }}
                  />

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                      <Play className="w-5 h-5 text-white fill-white" />
                    </div>
                  </div>

                  {/* Type badge */}
                  <div className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-bold border ${typeColor(entry.type)}`}>
                    {typeIcon(entry.type)}
                    <span>{typeLabel(entry.type)}</span>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={e => { e.stopPropagation(); handleRemove(entry); }}
                    className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-red-600/80 hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all cursor-pointer border border-red-400/30"
                    title="إزالة من المفضلة"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>

                {/* Info */}
                <div className="p-2.5">
                  <p className="text-xs font-bold text-white line-clamp-2 leading-tight mb-1.5">{entry.name}</p>
                  <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(entry.addedAt)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FOOTER */}
      {favorites.length > 0 && (
        <footer className="relative z-10 px-6 py-3 border-t border-white/8 bg-black/30 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <span>{filtered.length} عنصر من أصل {favorites.length}</span>
          <button
            onClick={() => { FavoritesService.clearAll(); reload(); }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/20 transition-all cursor-pointer font-semibold"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>مسح الكل</span>
          </button>
        </footer>
      )}
    </div>
  );
};
