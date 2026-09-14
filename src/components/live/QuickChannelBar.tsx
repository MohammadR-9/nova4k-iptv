import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Tv, Star, Search, X, Radio
} from 'lucide-react';
import { LiveChannel } from '../../types/iptv.types';
import { matchesItemMetadata } from '../../utils/searchHelper';

interface QuickCategory {
  id: string;
  name: string;
  count: number;
}

interface QuickChannelBarProps {
  isOpen: boolean;
  onClose: () => void;
  channels: LiveChannel[];
  categories: QuickCategory[];
  selectedCatId: string;
  onSelectCategory: (catId: string) => void;
  activeChannel: LiveChannel | null;
  onSelectChannel: (channel: LiveChannel) => void;
  favorites: number[];
  onToggleFavorite: (channelId: number, e: React.MouseEvent) => void;
}

export const QuickChannelBar: React.FC<QuickChannelBarProps> = ({
  isOpen,
  onClose,
  channels,
  categories,
  selectedCatId,
  onSelectCategory,
  activeChannel,
  onSelectChannel,
  favorites,
  onToggleFavorite,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [focusedSection, setFocusedSection] = useState<'channels' | 'categories'>('channels');
  const [catFocusedIndex, setCatFocusedIndex] = useState<number>(0);
  const listContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Filter channels based on Category & Search
  const filteredChannels = useMemo(() => {
    return channels.filter(ch => {
      if (selectedCatId === 'favorites' && !favorites.includes(ch.stream_id)) {
        return false;
      }
      if (selectedCatId !== 'all' && selectedCatId !== 'favorites') {
        if (String(ch.category_id) !== String(selectedCatId)) return false;
      }
      if (searchQuery.trim()) {
        const itemObj = {
          name: ch.name,
          num: ch.num,
          epg_channel_id: ch.epg_channel_id,
          plot: ch.currentProgram?.title,
        };
        if (!matchesItemMetadata(itemObj, searchQuery)) return false;
      }
      return true;
    });
  }, [channels, selectedCatId, searchQuery, favorites]);

  // When drawer opens, initialize focus to active channel
  useEffect(() => {
    if (isOpen) {
      if (activeChannel) {
        const idx = filteredChannels.findIndex(c => c.stream_id === activeChannel.stream_id);
        setFocusedIndex(idx >= 0 ? idx : 0);
      } else {
        setFocusedIndex(0);
      }
      const cIdx = categories.findIndex(c => c.id === selectedCatId);
      setCatFocusedIndex(cIdx >= 0 ? cIdx : 0);
      setFocusedSection('channels');
    } else {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Ensure focused index stays in range
  useEffect(() => {
    if (focusedIndex >= filteredChannels.length && filteredChannels.length > 0) {
      setFocusedIndex(filteredChannels.length - 1);
    }
  }, [filteredChannels.length, focusedIndex]);

  // Auto-scroll focused channel into view
  useEffect(() => {
    if (isOpen && focusedSection === 'channels') {
      const el = document.getElementById(`quick-ch-item-${focusedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex, isOpen, focusedSection]);

  // Auto-scroll focused category chip into view
  useEffect(() => {
    if (isOpen && focusedSection === 'categories') {
      const el = document.getElementById(`quick-cat-chip-${catFocusedIndex}`);
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
      }
    }
  }, [catFocusedIndex, isOpen, focusedSection]);

  // Keyboard navigation inside Quick Channel Bar
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture keys if typing in search input, except Escape & Enter
      if (document.activeElement === searchInputRef.current) {
        if (e.key === 'Escape' || e.keyCode === 27) {
          searchInputRef.current?.blur();
          e.preventDefault();
        } else if (e.key === 'Enter' || e.keyCode === 13) {
          searchInputRef.current?.blur();
          e.preventDefault();
        }
        return;
      }

      // 1. Close on Escape, Remote Back (10009), or ArrowLeft (in RTL)
      if (e.keyCode === 10009 || e.key === 'Escape' || e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        onClose();
        return;
      }

      if (focusedSection === 'channels') {
        if (e.key === 'ArrowUp' || e.keyCode === 38) {
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex(prev => {
            if (prev === 0) {
              setFocusedSection('categories');
              return 0;
            }
            return Math.max(0, prev - 1);
          });
          return;
        }

        if (e.key === 'ArrowDown' || e.keyCode === 40) {
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex(prev => Math.min(filteredChannels.length - 1, prev + 1));
          return;
        }

        if (e.key === 'PageUp' || e.keyCode === 427) {
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex(prev => Math.max(0, prev - 5));
          return;
        }

        if (e.key === 'PageDown' || e.keyCode === 428) {
          e.preventDefault();
          e.stopPropagation();
          setFocusedIndex(prev => Math.min(filteredChannels.length - 1, prev + 5));
          return;
        }

        if (e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          const target = filteredChannels[focusedIndex];
          if (target) {
            onSelectChannel(target);
          }
          return;
        }

        // Left/Right switches to categories or closes
        if (e.key === 'ArrowRight' || e.keyCode === 39) {
          e.preventDefault();
          e.stopPropagation();
          setFocusedSection('categories');
          return;
        }
      } else if (focusedSection === 'categories') {
        if (e.key === 'ArrowLeft' || e.keyCode === 37) {
          e.preventDefault();
          e.stopPropagation();
          setCatFocusedIndex(prev => {
            const next = Math.min(categories.length - 1, prev + 1);
            const cat = categories[next];
            if (cat) onSelectCategory(cat.id);
            return next;
          });
          return;
        }

        if (e.key === 'ArrowRight' || e.keyCode === 39) {
          e.preventDefault();
          e.stopPropagation();
          setCatFocusedIndex(prev => {
            const next = Math.max(0, prev - 1);
            const cat = categories[next];
            if (cat) onSelectCategory(cat.id);
            return next;
          });
          return;
        }

        if (e.key === 'ArrowDown' || e.keyCode === 40 || e.key === 'Enter' || e.keyCode === 13) {
          e.preventDefault();
          e.stopPropagation();
          const cat = categories[catFocusedIndex];
          if (cat) onSelectCategory(cat.id);
          setFocusedSection('channels');
          setFocusedIndex(0);
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, focusedSection, focusedIndex, catFocusedIndex, filteredChannels, categories, onSelectChannel, onSelectCategory, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Semi-transparent Backdrop: Clicking it closes the drawer */}
      <div 
        onClick={onClose}
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
      />

      {/* Quick Channels Side Drawer */}
      <aside 
        role="dialog"
        aria-label="شريط القنوات السريع"
        className="fixed top-0 bottom-0 right-0 w-[420px] max-w-[90vw] z-50 bg-[#080C16]/95 backdrop-blur-2xl border-l border-white/15 shadow-[-20px_0_50px_rgba(0,0,0,0.85)] flex flex-col animate-in slide-in-from-right duration-300 select-none"
      >
        {/* 1. Header: Title & Close Button */}
        <div className="p-4 border-b border-white/10 bg-[#0A1020]/80 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-nova-cyan">
              <Tv className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white tracking-wide">
                  شريط القنوات السريع
                </h3>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              </div>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                تصفح وبدل القنوات فورا أثناء البث
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono font-bold text-nova-cyan px-2 py-0.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30">
              {filteredChannels.length} قناة
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer border border-white/10"
              title="إغلاق الشريط [ESC]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 2. Fast Search Bar */}
        <div className="p-3 border-b border-white/10 bg-[#080D1A]/50 shrink-0">
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث بالاسم أو الرقم أو البرنامج..."
              className="w-full h-9 bg-white/5 border border-white/10 rounded-xl pr-9 pl-8 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-nova-cyan focus:ring-1 focus:ring-nova-cyan transition-all text-right"
            />
            <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute left-2.5 top-2 p-0.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 3. Horizontal Category Chips (Quick Filter) */}
        <div className="px-3 py-2 border-b border-white/10 bg-[#060913]/60 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
          {categories.map((cat, idx) => {
            const isSelected = selectedCatId === cat.id;
            const isFocused = focusedSection === 'categories' && catFocusedIndex === idx;
            return (
              <button
                key={cat.id}
                id={`quick-cat-chip-${idx}`}
                type="button"
                onClick={() => {
                  onSelectCategory(cat.id);
                  setCatFocusedIndex(idx);
                  setFocusedSection('channels');
                  setFocusedIndex(0);
                }}
                className={`shrink-0 px-2.5 py-1 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isFocused
                    ? 'ring-2 ring-nova-cyan bg-cyan-500/30 text-white shadow-focus-glow-subtle'
                    : isSelected
                    ? 'bg-gradient-to-r from-nova-cyan to-blue-500 text-slate-950 font-black shadow-md shadow-cyan-500/20'
                    : 'bg-white/5 border border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                {cat.id === 'favorites' ? (
                  <Star className="w-3 h-3 text-amber-300 fill-amber-300" />
                ) : cat.id === 'all' ? (
                  <Tv className="w-3 h-3" />
                ) : null}
                <span className="truncate max-w-[130px]">{cat.name}</span>
                <span className={`text-[9px] font-mono px-1 rounded ${isSelected ? 'bg-black/30 text-slate-900 font-bold' : 'bg-black/40 text-slate-400'}`}>
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* 4. Channels Scrollable List */}
        <div 
          ref={listContainerRef}
          className="flex-1 overflow-y-auto p-2.5 space-y-1.5 scrollbar-thin scrollbar-thumb-white/15"
        >
          {filteredChannels.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-center p-4">
              <Search className="w-8 h-8 mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-bold text-slate-400">لم يتم العثور على أي قنوات</p>
              <p className="text-[10px] text-slate-500 mt-1">جرب البحث بكلمة أخرى أو تغيير الباقة</p>
            </div>
          ) : (
            filteredChannels.map((ch, idx) => {
              const isActive = activeChannel?.stream_id === ch.stream_id;
              const isFocused = focusedSection === 'channels' && focusedIndex === idx;
              const isFav = favorites.includes(ch.stream_id);

              return (
                <div
                  key={ch.stream_id}
                  id={`quick-ch-item-${idx}`}
                  data-quick-idx={idx}
                  onClick={() => {
                    setFocusedIndex(idx);
                    onSelectChannel(ch);
                  }}
                  className={`group relative p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition-all ${
                    isFocused
                      ? 'ring-2 ring-nova-cyan bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_20px_rgba(0,242,254,0.25)] scale-[1.01]'
                      : isActive
                      ? 'bg-cyan-950/40 border-cyan-500/60 text-white shadow-focus-glow-subtle'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:border-white/15'
                  }`}
                >
                  {/* Left Controls: Favorite & Resolution & Active Tag */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => onToggleFavorite(ch.stream_id, e)}
                      className="p-1 rounded-lg hover:bg-white/10 transition-all cursor-pointer"
                      title={isFav ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
                    >
                      <Star className={`w-3.5 h-3.5 ${isFav ? 'text-amber-400 fill-amber-400' : 'text-slate-500 hover:text-amber-300'}`} />
                    </button>

                    {isActive ? (
                      <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-400 text-[9px] font-bold">
                        <Radio className="w-2.5 h-2.5 animate-pulse" />
                        <span>شغال</span>
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-black/40 text-slate-400 border border-white/5">
                        {ch.resolution || 'FHD'}
                      </span>
                    )}
                  </div>

                  {/* Right: Channel Name, Info & Logo */}
                  <div className="flex items-center gap-2.5 text-right overflow-hidden mr-auto pl-2">
                    <div className="overflow-hidden">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className={`font-extrabold text-xs truncate max-w-[190px] ${isActive ? 'text-nova-cyan' : 'text-white'}`}>
                          {ch.name}
                        </span>
                        <span className="font-mono text-[10px] text-nova-cyan bg-cyan-950/40 px-1 rounded">
                          #{ch.num || ch.stream_id}
                        </span>
                      </div>
                      {ch.currentProgram ? (
                        <p className="text-[10px] text-slate-400 truncate mt-0.5 max-w-[190px]">
                          {ch.currentProgram.title}
                        </p>
                      ) : (
                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                          بث مباشر عالي الدقة
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

        {/* 5. Footer: Remote Navigation Shortcuts */}
        <div className="p-3 border-t border-white/10 bg-[#0A1020]/90 flex items-center justify-between text-[11px] text-slate-400 font-medium shrink-0">
          <div className="flex items-center gap-2 text-slate-300">
            <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-nova-cyan">[OK]</span>
            <span>تشغيل فوري</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">[▲/▼]</span>
            <span>تنقل</span>
          </div>
          <div className="flex items-center gap-2 text-slate-400">
            <span className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px]">[ESC/عودة]</span>
            <span>إغلاق</span>
          </div>
        </div>
      </aside>
    </>
  );
};