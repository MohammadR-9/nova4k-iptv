import React, { useEffect, useState } from 'react';
import { Activity, Cpu, HardDrive, Wifi, Shield, X, Film, Volume2 } from 'lucide-react';
import { PlayerManager } from '../../player/PlayerManager';
import { StreamDiagnostics } from '../../types/iptv.types';

interface DiagnosticsHudProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiagnosticsHud: React.FC<DiagnosticsHudProps> = ({ isOpen, onClose }) => {
  const [stats, setStats] = useState<StreamDiagnostics | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const player = PlayerManager.getPlayer();
    setStats(player.getDiagnostics());

    const interval = setInterval(() => {
      setStats({ ...player.getDiagnostics() });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen || !stats) return null;

  return (
    <div className="fixed top-10 right-16 z-50 w-[460px] bg-[#070a10]/95 border-2 border-accent-cyan/60 rounded-3xl p-6 shadow-focus-glow backdrop-blur-2xl text-white select-none animate-in fade-in duration-200">
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-accent-cyan animate-pulse" />
          <h3 className="text-base font-black tracking-wider text-accent-cyan">
            لوحة تشخيص البث الحي (STREAM HUD)
          </h3>
        </div>
        <button 
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
          title="إغلاق"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        
        {/* Bitrate */}
        <div className="bg-surface-elevated/80 border border-white/5 rounded-2xl p-3 flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
            <Wifi className="w-3.5 h-3.5 text-accent-cyan" />
            معدل البث (Bitrate)
          </span>
          <span className="text-xl font-mono font-black text-white">
            {stats.bitrateKbps} <span className="text-xs font-normal text-slate-400">Kbps</span>
          </span>
        </div>

        {/* Resolution & FPS */}
        <div className="bg-surface-elevated/80 border border-white/5 rounded-2xl p-3 flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
            <Film className="w-3.5 h-3.5 text-accent-gold" />
            الدقة والإطارات (FPS)
          </span>
          <span className="text-lg font-mono font-black text-accent-gold">
            {stats.resolution} <span className="text-xs font-normal text-slate-300">@{stats.fps}fps</span>
          </span>
        </div>

        {/* Video Codec */}
        <div className="bg-surface-elevated/80 border border-white/5 rounded-2xl p-3 flex flex-col col-span-2">
          <span className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            كوديك الفيديو وفك التشفير
          </span>
          <span className="text-sm font-mono font-extrabold text-emerald-400">
            {stats.videoCodec}
          </span>
        </div>

        {/* Audio Codec */}
        <div className="bg-surface-elevated/80 border border-white/5 rounded-2xl p-3 flex flex-col col-span-2">
          <span className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
            <Volume2 className="w-3.5 h-3.5 text-sky-400" />
            كوديك وقنوات الصوت
          </span>
          <span className="text-sm font-mono font-extrabold text-sky-400">
            {stats.audioCodec} ({stats.audioChannels})
          </span>
        </div>

        {/* Buffer Health */}
        <div className="bg-surface-elevated/80 border border-white/5 rounded-2xl p-3 flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5 text-purple-400" />
            حجم الـ Buffer المتبقي
          </span>
          <span className="text-lg font-mono font-black text-purple-300">
            {stats.bufferLengthSec}s
          </span>
        </div>

        {/* Dropped Frames */}
        <div className="bg-surface-elevated/80 border border-white/5 rounded-2xl p-3 flex flex-col">
          <span className="text-[10px] text-slate-400 font-bold mb-1 flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            الإطارات المفقودة (Drops)
          </span>
          <span className="text-lg font-mono font-black text-emerald-400">
            {stats.droppedFrames}
          </span>
        </div>

      </div>

      {/* Footer Info */}
      <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-slate-400 font-mono">
        <span>Protocol: {stats.protocol}</span>
        <span>Latency: {stats.latencyMs}ms</span>
        <span className="text-accent-cyan">Samsung Tizen Engine</span>
      </div>
    </div>
  );
};
