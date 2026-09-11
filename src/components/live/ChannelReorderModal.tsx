import React, { useState } from 'react';
import { ArrowUp, ArrowDown, Pin, X, Save, Layers, Tv } from 'lucide-react';
import { LiveChannel, LiveCategory } from '../../types/iptv.types';

interface ChannelReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  channels: LiveChannel[];
  categories: LiveCategory[];
  onSaveOrder: (reorderedChannels: LiveChannel[], reorderedCategories: LiveCategory[]) => void;
}

export const ChannelReorderModal: React.FC<ChannelReorderModalProps> = ({
  isOpen,
  onClose,
  channels,
  categories,
  onSaveOrder
}) => {
  const [activeTab, setActiveTab] = useState<'channels' | 'categories'>('channels');
  const [channelList, setChannelList] = useState<LiveChannel[]>([...channels]);
  const [categoryList, setCategoryList] = useState<LiveCategory[]>([...categories]);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  if (!isOpen) return null;

  // Move channel up/down/pin
  const moveChannel = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= channelList.length) return;

    const copy = [...channelList];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setChannelList(copy);
  };

  const pinChannelToTop = (index: number) => {
    if (index === 0) return;
    const copy = [...channelList];
    const [item] = copy.splice(index, 1);
    copy.unshift(item);
    setChannelList(copy);
  };

  // Move category up/down
  const moveCategory = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categoryList.length) return;

    const copy = [...categoryList];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;
    setCategoryList(copy);
  };

  const handleSave = () => {
    onSaveOrder(channelList, categoryList);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl bg-surface-primary border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-accent-cyan">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">إعادة ترتيب القنوات والمجموعات</h3>
              <p className="text-xs text-slate-400">خصص ترتيب القنوات والباقات وثبت قنواتك المفضلة في القمة</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs: Channels vs Categories */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-surface-elevated rounded-xl border border-white/5">
          <button
            onClick={() => setActiveTab('channels')}
            className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'channels'
                ? 'bg-cyan-500/20 text-accent-cyan border border-accent-cyan/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>ترتيب القنوات ({channelList.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('categories')}
            className={`py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all ${
              activeTab === 'categories'
                ? 'bg-cyan-500/20 text-accent-cyan border border-accent-cyan/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>ترتيب المجموعات والباقات ({categoryList.length})</span>
          </button>
        </div>

        {/* Channels List Reorder Mode */}
        {activeTab === 'channels' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
            {channelList.map((ch, idx) => (
              <div
                key={ch.stream_id}
                onClick={() => setSelectedChannelId(ch.stream_id)}
                className={`p-2.5 px-4 rounded-xl border flex items-center justify-between transition-all ${
                  selectedChannelId === ch.stream_id
                    ? 'bg-cyan-500/15 border-accent-cyan text-white shadow-sm'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {/* Actions: Up, Down, Pin to Top */}
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={(e) => { e.stopPropagation(); moveChannel(idx, 'up'); }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-200"
                    title="تحريك لأعلى"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={idx === channelList.length - 1}
                    onClick={(e) => { e.stopPropagation(); moveChannel(idx, 'down'); }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-200"
                    title="تحريك لأسفل"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); pinChannelToTop(idx); }}
                    className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-400"
                    title="تثبيت في القمة رقم 1"
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                </div>

                {/* Channel Info */}
                <div className="flex items-center gap-3 text-right">
                  <div>
                    <div className="font-bold text-xs text-white">{ch.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      الترتيب الحالي: #{idx + 1} • {ch.resolution || 'FHD'}
                    </div>
                  </div>
                  <img
                    src={ch.stream_icon}
                    alt={ch.name}
                    className="w-9 h-9 rounded-lg object-cover border border-white/10 bg-black"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Categories List Reorder Mode */}
        {activeTab === 'categories' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[420px]">
            {categoryList.map((cat, idx) => (
              <div
                key={cat.category_id}
                onClick={() => setSelectedCatId(cat.category_id)}
                className={`p-3 px-4 rounded-xl border flex items-center justify-between transition-all ${
                  selectedCatId === cat.category_id
                    ? 'bg-cyan-500/15 border-accent-cyan text-white'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center gap-1">
                  <button
                    disabled={idx === 0}
                    onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'up'); }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-200"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={idx === categoryList.length - 1}
                    onClick={(e) => { e.stopPropagation(); moveCategory(idx, 'down'); }}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 text-slate-200"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>

                <div className="text-right">
                  <div className="font-bold text-sm text-white">{cat.category_name}</div>
                  <div className="text-[10px] text-slate-400 font-mono">الترتيب: #{idx + 1}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <p className="text-[11px] text-slate-500">
            * يتم حفظ الترتيب تلقائياً في ذاكرة الشاشة وسيكون ثابتاً دائماً.
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold"
            >
              إلغاء
            </button>
            <button
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الترتيب المخصص</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
