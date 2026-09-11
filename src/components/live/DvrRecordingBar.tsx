import React from 'react';
import { Circle, Pause, Play, Square, Download, Video } from 'lucide-react';
import { RecordingState, RecordingResult } from '../../player/types';

interface DvrRecordingBarProps {
  recordingState: RecordingState;
  durationSec: number;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  lastResult?: RecordingResult | null;
  onCloseResult?: () => void;
}

export const DvrRecordingBar: React.FC<DvrRecordingBarProps> = ({
  recordingState,
  durationSec,
  onPause,
  onResume,
  onStop,
  lastResult,
  onCloseResult
}) => {
  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // 1. Result Popup when recording stops
  if (lastResult) {
    const handleDownload = () => {
      const a = document.createElement('a');
      a.href = lastResult.blobUrl;
      a.download = `IPTV_Live_DVR_${Date.now()}.webm`;
      a.click();
    };

    return (
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-4 p-4 px-6 bg-slate-950/95 border border-emerald-500/40 rounded-2xl shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300">
        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Video className="w-5 h-5" />
        </div>
        <div className="text-right">
          <div className="text-sm font-bold text-white flex items-center gap-2">
            <span>تم اكتمال تسجيل البث الحي</span>
            <span className="text-[11px] font-mono text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10">
              {lastResult.fileSizeMb} MB
            </span>
          </div>
          <p className="text-xs text-slate-400">
            المدة: {formatDuration(lastResult.durationSec)} • {lastResult.timestamp}
          </p>
        </div>
        <div className="flex items-center gap-2 mr-2">
          <button
            onClick={handleDownload}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>حفظ التسجيل</span>
          </button>
          <button
            onClick={onCloseResult}
            className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs transition-all"
          >
            إغلاق
          </button>
        </div>
      </div>
    );
  }

  // 2. Floating Recording HUD during active recording
  if (recordingState === 'idle') return null;

  return (
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3.5 p-2.5 px-5 bg-black/85 border border-red-500/40 rounded-2xl shadow-2xl backdrop-blur-xl select-none animate-in fade-in zoom-in duration-200">
      {/* Blinking Recording Dot */}
      <div className="flex items-center gap-2">
        <Circle
          className={`w-3.5 h-3.5 text-red-500 fill-red-500 ${
            recordingState === 'recording' ? 'animate-pulse' : 'opacity-60'
          }`}
        />
        <span className="text-xs font-black tracking-wider text-red-400 font-mono">
          {recordingState === 'recording' ? 'REC' : 'PAUSED'}
        </span>
      </div>

      <div className="h-4 w-px bg-white/20" />

      {/* Live Duration Counter */}
      <span className="font-mono text-sm font-bold text-white tracking-widest">
        {formatDuration(durationSec)}
      </span>

      <div className="h-4 w-px bg-white/20" />

      {/* Controls: Pause / Resume & Stop */}
      <div className="flex items-center gap-1.5">
        {recordingState === 'recording' ? (
          <button
            onClick={onPause}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all"
            title="إيقاف مؤقت"
          >
            <Pause className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            onClick={onResume}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-emerald-400 hover:text-emerald-300 transition-all"
            title="استئناف التسجيل"
          >
            <Play className="w-3.5 h-3.5" />
          </button>
        )}

        <button
          onClick={onStop}
          className="px-3 py-1.5 rounded-lg bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-300 hover:text-white font-bold text-xs flex items-center gap-1 transition-all"
          title="إنهاء وحفظ التسجيل"
        >
          <Square className="w-3 h-3 fill-current" />
          <span>إنهاء وحفظ</span>
        </button>
      </div>
    </div>
  );
};
