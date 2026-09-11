import React, { useState } from 'react';
import { Subtitles, Volume2, Check, X, Globe, Sparkles, AlertCircle } from 'lucide-react';
import { PlayerSubtitleTrack, PlayerAudioTrack } from '../../player/types';

interface SubtitleDubbingModalProps {
  isOpen: boolean;
  onClose: () => void;
  subtitleTracks: PlayerSubtitleTrack[];
  onSelectSubtitle: (trackId: number) => void;
  audioTracks: PlayerAudioTrack[];
  onSelectAudio: (trackId: number) => void;
}

export const SubtitleDubbingModal: React.FC<SubtitleDubbingModalProps> = ({
  isOpen,
  onClose,
  subtitleTracks,
  onSelectSubtitle,
  audioTracks,
  onSelectAudio
}) => {
  const [activeTab, setActiveTab] = useState<'subtitles' | 'dubbing'>('subtitles');

  if (!isOpen) return null;

  const activeSub = subtitleTracks.find(t => t.isActive) || subtitleTracks[0];
  const activeAudio = audioTracks.find(t => t.isActive) || audioTracks[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-2xl p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-surface-primary border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              {activeTab === 'subtitles' ? <Subtitles className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="text-lg font-black text-white">الترجمة والدبلجة (Subtitles & Dubbing)</h3>
              <p className="text-xs text-slate-400">تخصيص لغة الترجمة والمسار الصوتي للبث الحالي</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="إغلاق"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 p-1 bg-black/40 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('subtitles')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'subtitles'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Subtitles className="w-4 h-4" />
            <span>لغة الترجمة (CC)</span>
          </button>

          <button
            onClick={() => setActiveTab('dubbing')}
            className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'dubbing'
                ? 'bg-cyan-600 text-white shadow-lg'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Volume2 className="w-4 h-4" />
            <span>الدبلجة والتعليق الصوتي</span>
          </button>
        </div>

        {/* Tab Content: Subtitles */}
        {activeTab === 'subtitles' && (
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
            {subtitleTracks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center flex flex-col items-center gap-3 my-2">
                <AlertCircle className="w-8 h-8 text-amber-400/70" />
                <p className="text-xs text-slate-300 font-semibold leading-relaxed">
                  لا تتوفر ملفات ترجمة نصية مرفقة مع هذا البث الحي المباشر حالياً.
                </p>
                <span className="text-[11px] text-slate-500 font-mono">
                  البثوث المباشرة تبث صوتاً وصورة حية من المصدر
                </span>
              </div>
            ) : (
              subtitleTracks.map((sub) => {
                const isSelected = sub.id === (activeSub?.id ?? -1);
                return (
                  <button
                    key={sub.id}
                    onClick={() => onSelectSubtitle(sub.id)}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer text-right ${
                      isSelected
                        ? 'bg-purple-500/20 border-purple-500 text-white shadow-sm'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Globe className="w-4 h-4 text-purple-400" />
                      <span className="text-xs font-bold">{sub.label}</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-purple-400" />}
                  </button>
                );
              })
            )}

            <div className="mt-2 p-3 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center gap-2 text-[11px] text-purple-300">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>يتم تطبيق خط الترجمة العربي الواضح عالي التباين تلقائياً على الشاشة.</span>
            </div>
          </div>
        )}

        {/* Tab Content: Dubbing & Audio Tracks */}
        {activeTab === 'dubbing' && (
          <div className="flex flex-col gap-2.5 max-h-72 overflow-y-auto pr-1">
            {audioTracks.length === 0 ? (
              <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center flex flex-col items-center gap-3 my-2">
                <AlertCircle className="w-8 h-8 text-cyan-400/70" />
                <p className="text-xs text-slate-300 font-semibold">
                  المسار الصوتي الافتراضي نشط ويعمل حالياً.
                </p>
              </div>
            ) : (
              audioTracks.map((track) => {
                const isSelected = track.id === (activeAudio?.id ?? 0);
                return (
                  <button
                    key={track.id}
                    onClick={() => onSelectAudio(track.id)}
                    className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all cursor-pointer text-right ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-500 text-white shadow-sm'
                        : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                    }`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white">{track.label}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                        <span>{track.channels || '2.0 Stereo'}</span>
                        <span>•</span>
                        <span>{track.codec || 'AAC'}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-cyan-400" />}
                  </button>
                );
              })
            )}

            <div className="mt-2 p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-2 text-[11px] text-cyan-300">
              <Sparkles className="w-3.5 h-3.5 shrink-0" />
              <span>التبديل اللحظي بين المعلقين الرياضيين ومسارات الصوت الاستوديو دون انقطاع البث.</span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-slate-400">
          <span>الحالة: <b className="text-white font-mono">{activeSub?.label || 'إيقاف'}</b> | <b className="text-cyan-400 font-mono">{activeAudio?.label || 'الافتراضي'}</b></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
