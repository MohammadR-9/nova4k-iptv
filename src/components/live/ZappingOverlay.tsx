import React from 'react';
import { LiveChannel } from '../../types/iptv.types';
import { Clock, Volume2, Shield } from 'lucide-react';

interface ZappingOverlayProps {
  channel: LiveChannel | null;
  isVisible: boolean;
}

export const ZappingOverlay: React.FC<ZappingOverlayProps> = ({ channel, isVisible }) => {
  if (!isVisible || !channel) return null;

  const currentProg = channel.currentProgram;
  const nextProg = channel.nextProgram;

  return (
    <div className="absolute bottom-10 left-8 right-8 md:left-16 md:right-16 z-40 bg-[#060a12]/92 border border-white/15 rounded-3xl p-5 md:p-6 shadow-2xl backdrop-blur-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300">
      {/* Left: Channel Number & Logo & EPG */}
      <div className="flex items-center gap-5 w-full md:w-auto">
        <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 p-2 flex items-center justify-center shrink-0 shadow-focus-glow-subtle">
          <img 
            src={channel.stream_icon} 
            alt={channel.name}
            className="w-full h-full object-contain"
            onError={(e) => {
              (e.target as any).src = 'https://images.unsplash.com/photo-1593784991095-a205069470b6?w=100&h=100&fit=crop';
            }}
          />
        </div>

        <div className="flex flex-col flex-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xl md:text-2xl font-black font-mono text-accent-cyan tracking-wider">
              #{channel.num.toString().padStart(3, '0')}
            </span>
            <h2 className="text-xl md:text-2xl font-black text-white">{channel.name}</h2>
            
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black tracking-wider bg-cyan-500/20 text-accent-cyan border border-cyan-500/40 font-mono">
              {channel.resolution || '4K HDR'}
            </span>
            {channel.fps && (
              <span className="text-xs font-mono font-bold text-slate-400">
                {channel.fps} FPS
              </span>
            )}
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              NOVA Fast Buffer
            </span>
          </div>

          {/* Current Program Title & Progress Bar */}
          {currentProg && (
            <div className="w-full md:w-[540px] mt-2">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-extrabold text-slate-200 truncate">{currentProg.title}</span>
                <span className="font-mono text-accent-cyan shrink-0 ml-2 font-bold">
                  {currentProg.start} - {currentProg.end}
                </span>
              </div>
              {/* Progress Track */}
              <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden p-0.5">
                <div 
                  className="h-full bg-gradient-to-r from-nova-cyan via-cyan-400 to-blue-500 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${currentProg.progressPercentage}%` }}
                ></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right: Next Program & Audio Badges */}
      <div className="flex flex-col items-start md:items-end gap-2.5 text-right w-full md:w-auto md:border-r md:border-white/10 md:pr-6">
        {nextProg && (
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
              <Clock className="w-3 h-3 text-accent-gold" />
              البرنامج التالي: ({nextProg.start})
            </span>
            <span className="text-xs font-semibold text-slate-300 truncate max-w-xs mt-0.5">
              {nextProg.title}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5 text-xs text-slate-200 bg-white/5 px-3 py-1 rounded-xl border border-white/10 font-mono">
            <Volume2 className="w-3.5 h-3.5 text-accent-cyan" />
            <span>5.1 Dolby Digital</span>
          </div>
          <div className="flex items-center gap-1 text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-xl border border-emerald-500/30 font-bold">
            <Shield className="w-3.5 h-3.5" />
            <span>Anti-Freeze Engine</span>
          </div>
        </div>
      </div>

    </div>
  );
};
