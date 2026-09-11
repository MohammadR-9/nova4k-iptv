import React, { useState } from 'react';
import { 
  ChevronUp, ChevronDown, ChevronLeft, ChevronRight, 
  RotateCcw, Play, Pause, Info, 
  Tv, Volume2, ArrowUpCircle, ArrowDownCircle,
  Eye, EyeOff
} from 'lucide-react';
import { spatialNav } from '../../navigation/spatialNav';
import { TV_KEYS } from '../../navigation/keycodes';

interface RemoteSimulatorProps {
  onKeyPress: (keyCode: number) => void;
  currentScreen: string;
}

export const RemoteSimulator: React.FC<RemoteSimulatorProps> = ({ onKeyPress, currentScreen }) => {
  // Always start collapsed as a subtle floating button so it never obstructs the TV layout
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  // If running on actual Samsung Smart TV hardware, don't render virtual remote
  if (typeof window !== 'undefined' && (window as any).tizen) {
    return null;
  }

  const handleDirection = (dir: 'UP' | 'DOWN' | 'LEFT' | 'RIGHT', code: number) => {
    spatialNav.navigate(dir);
    onKeyPress(code);
  };

  const handleSelect = () => {
    spatialNav.triggerClick();
    onKeyPress(TV_KEYS.ENTER);
  };

  const handleBack = () => {
    onKeyPress(TV_KEYS.RETURN);
  };

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
    onKeyPress(TV_KEYS.PLAY_PAUSE);
  };

  if (isCollapsed) {
    return (
      <button 
        onClick={() => setIsCollapsed(false)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-2.5 bg-surface-elevated/90 hover:bg-surface-elevated border border-accent-cyan/40 text-accent-cyan rounded-full shadow-lg backdrop-blur-md transition-all scale-100 hover:scale-105"
        title="إظهار ريموت المحاكي"
      >
        <Tv className="w-5 h-5 text-accent-cyan" />
        <span className="text-sm font-bold">ريموت سامسونج</span>
        <Eye className="w-4 h-4 ml-1" />
      </button>
    );
  }

  return (
    <aside className="fixed top-4 left-4 z-50 flex flex-col items-center w-72 bg-[#0c1017]/95 border border-white/10 rounded-3xl p-4 shadow-2xl backdrop-blur-xl transition-all duration-300 select-none">
      {/* Remote Header */}
      <div className="w-full flex items-center justify-between pb-3 border-b border-white/10 mb-3">
        <div className="flex items-center gap-2">
          <Tv className="w-5 h-5 text-accent-cyan" />
          <span className="text-xs font-bold tracking-wider text-slate-300">SAMSUNG ONE REMOTE</span>
        </div>
        <button 
          onClick={() => setIsCollapsed(true)} 
          className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-white/10"
          title="تصغير الريموت"
        >
          <EyeOff className="w-4 h-4" />
        </button>
      </div>

      <div className="w-full flex items-center justify-between px-2 mb-2 text-[10px] text-slate-400">
        <span>الشاشة الحالية: <strong className="text-accent-cyan">{currentScreen.toUpperCase()}</strong></span>
        <span className="flex items-center gap-1 text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Simulator Active
        </span>
      </div>

      {/* Color Keys Row (Red, Green, Yellow, Blue) */}
      <div className="w-full grid grid-cols-4 gap-2 mb-4 px-1">
        <button 
          onClick={() => onKeyPress(TV_KEYS.COLOR_RED)}
          className="h-7 bg-red-600/90 hover:bg-red-500 rounded-md text-[10px] font-bold text-white shadow-md active:scale-95 transition-transform flex items-center justify-center"
          title="الزر الأحمر (Red)"
        >
          A
        </button>
        <button 
          onClick={() => onKeyPress(TV_KEYS.COLOR_GREEN)}
          className="h-7 bg-emerald-600/90 hover:bg-emerald-500 rounded-md text-[10px] font-bold text-white shadow-md active:scale-95 transition-transform flex items-center justify-center"
          title="الزر الأخضر (Green)"
        >
          B
        </button>
        <button 
          onClick={() => onKeyPress(TV_KEYS.COLOR_YELLOW)}
          className="h-7 bg-amber-500/90 hover:bg-amber-400 rounded-md text-[10px] font-bold text-slate-900 shadow-md active:scale-95 transition-transform flex items-center justify-center"
          title="الزر الأصفر (Yellow)"
        >
          C
        </button>
        <button 
          onClick={() => onKeyPress(TV_KEYS.COLOR_BLUE)}
          className="h-7 bg-sky-600/90 hover:bg-sky-500 rounded-md text-[10px] font-bold text-white shadow-md active:scale-95 transition-transform flex items-center justify-center"
          title="الزر الأزرق (Blue)"
        >
          D
        </button>
      </div>

      {/* D-Pad Circular Controller */}
      <div className="relative w-44 h-44 my-2 flex items-center justify-center">
        {/* Outer Ring */}
        <div className="absolute inset-0 rounded-full border-2 border-white/10 bg-[#161c27] shadow-inner"></div>

        {/* Up Button */}
        <button 
          onClick={() => handleDirection('UP', TV_KEYS.UP)}
          className="absolute top-1 w-16 h-12 flex items-center justify-center text-slate-300 hover:text-accent-cyan active:scale-95 transition-all"
          title="أعلى (Up Arrow)"
        >
          <ChevronUp className="w-7 h-7" />
        </button>

        {/* Down Button */}
        <button 
          onClick={() => handleDirection('DOWN', TV_KEYS.DOWN)}
          className="absolute bottom-1 w-16 h-12 flex items-center justify-center text-slate-300 hover:text-accent-cyan active:scale-95 transition-all"
          title="أسفل (Down Arrow)"
        >
          <ChevronDown className="w-7 h-7" />
        </button>

        {/* Right Button (In RTL, right is forward) */}
        <button 
          onClick={() => handleDirection('RIGHT', TV_KEYS.RIGHT)}
          className="absolute right-1 w-12 h-16 flex items-center justify-center text-slate-300 hover:text-accent-cyan active:scale-95 transition-all"
          title="يمين (Right Arrow)"
        >
          <ChevronRight className="w-7 h-7" />
        </button>

        {/* Left Button */}
        <button 
          onClick={() => handleDirection('LEFT', TV_KEYS.LEFT)}
          className="absolute left-1 w-12 h-16 flex items-center justify-center text-slate-300 hover:text-accent-cyan active:scale-95 transition-all"
          title="يسار (Left Arrow)"
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        {/* Center OK / Enter Button */}
        <button 
          onClick={handleSelect}
          className="relative w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 border border-white/20 hover:border-accent-cyan text-white hover:text-accent-cyan font-bold text-sm flex items-center justify-center shadow-lg active:scale-90 transition-all z-10"
          title="موافق (OK / Enter)"
        >
          OK
        </button>
      </div>

      {/* Navigation Control Bar (Back, Home, Play/Pause) */}
      <div className="w-full grid grid-cols-3 gap-3 my-3">
        <button 
          onClick={handleBack}
          className="flex flex-col items-center justify-center h-12 bg-white/5 hover:bg-white/10 hover:text-accent-cyan rounded-xl border border-white/10 active:scale-95 transition-all"
          title="رجوع (Return / Back)"
        >
          <RotateCcw className="w-5 h-5 text-slate-300" />
          <span className="text-[9px] text-slate-400 mt-0.5">رجوع</span>
        </button>

        <button 
          onClick={() => onKeyPress(TV_KEYS.INFO)}
          className="flex flex-col items-center justify-center h-12 bg-white/5 hover:bg-white/10 hover:text-accent-cyan rounded-xl border border-white/10 active:scale-95 transition-all"
          title="معلومات التشخيص (Info / HUD)"
        >
          <Info className="w-5 h-5 text-slate-300" />
          <span className="text-[9px] text-slate-400 mt-0.5">INFO</span>
        </button>

        <button 
          onClick={handlePlayPause}
          className="flex flex-col items-center justify-center h-12 bg-white/5 hover:bg-white/10 hover:text-accent-cyan rounded-xl border border-white/10 active:scale-95 transition-all"
          title="تشغيل / إيقاف مؤقت (Play/Pause)"
        >
          {isPlaying ? <Pause className="w-5 h-5 text-slate-300" /> : <Play className="w-5 h-5 text-accent-cyan" />}
          <span className="text-[9px] text-slate-400 mt-0.5">تشغيل</span>
        </button>
      </div>

      {/* Channel & Volume Rockers */}
      <div className="w-full grid grid-cols-2 gap-3 mt-1">
        {/* Volume */}
        <div className="flex flex-col items-center bg-white/5 rounded-xl p-1.5 border border-white/10">
          <Volume2 className="w-4 h-4 text-slate-400 mb-1" />
          <span className="text-[10px] font-bold text-slate-300">VOL</span>
        </div>

        {/* Channel Up / Down */}
        <div className="flex flex-col items-center bg-white/5 rounded-xl p-1.5 border border-white/10">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onKeyPress(TV_KEYS.CHANNEL_UP)} 
              className="p-1 text-slate-300 hover:text-accent-cyan active:scale-95"
              title="القناة التالية (CH +)"
            >
              <ArrowUpCircle className="w-4 h-4" />
            </button>
            <button 
              onClick={() => onKeyPress(TV_KEYS.CHANNEL_DOWN)} 
              className="p-1 text-slate-300 hover:text-accent-cyan active:scale-95"
              title="القناة السابقة (CH -)"
            >
              <ArrowDownCircle className="w-4 h-4" />
            </button>
          </div>
          <span className="text-[10px] font-bold text-slate-300 mt-0.5">CH</span>
        </div>
      </div>

      {/* Footer Helper */}
      <div className="w-full mt-3 pt-2 border-t border-white/10 text-center">
        <p className="text-[10px] text-slate-500">
          يمكنك أيضاً استخدام أسهم الكيبورد و Enter و Backspace.
        </p>
      </div>
    </aside>
  );
};
