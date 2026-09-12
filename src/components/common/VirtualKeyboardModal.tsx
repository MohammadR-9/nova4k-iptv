import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Keyboard, Eye, EyeOff, Delete, Check, X, 
  Globe, Hash 
} from 'lucide-react';
import { spatialNav } from '../../navigation/spatialNav';

export interface VirtualKeyboardModalProps {
  isOpen: boolean;
  title: string;
  initialValue?: string;
  placeholder?: string;
  isPassword?: boolean;
  onSubmit: (value: string) => void;
  onClose: () => void;
}

type KeyboardMode = 'en-lower' | 'en-upper' | 'ar' | 'symbols';

export const VirtualKeyboardModal: React.FC<VirtualKeyboardModalProps> = ({
  isOpen,
  title,
  initialValue = '',
  placeholder = 'اكتب هنا...',
  isPassword = false,
  onSubmit,
  onClose,
}) => {
  const [buffer, setBuffer] = useState<string>(initialValue);
  const [showPassword, setShowPassword] = useState<boolean>(!isPassword);
  const [mode, setMode] = useState<KeyboardMode>('en-lower');
  const prevFocusRef = useRef<string | null>(null);

  // Sync buffer on open
  useEffect(() => {
    if (isOpen) {
      setBuffer(initialValue);
      setShowPassword(!isPassword);
      prevFocusRef.current = spatialNav.getCurrentFocus();
      // Focus on virtual keyboard first key
      const timer = setTimeout(() => {
        spatialNav.setFocus('vk-key-0-0');
      }, 100);
      return () => clearTimeout(timer);
    } else {
      if (prevFocusRef.current) {
        spatialNav.setFocus(prevFocusRef.current);
      }
    }
  }, [isOpen, initialValue, isPassword]);

  // Audio feedback for key press
  const playClickSound = useCallback(() => {
    try {
      if (typeof window !== 'undefined' && (window.AudioContext || (window as any).webkitAudioContext)) {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AudioCtx();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(520, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.04);
      }
    } catch {}
  }, []);

  const handleCharInsert = useCallback((char: string) => {
    playClickSound();
    setBuffer(prev => prev + char);
  }, [playClickSound]);

  const handleBackspace = useCallback(() => {
    playClickSound();
    setBuffer(prev => prev.slice(0, -1));
  }, [playClickSound]);

  const handleClear = useCallback(() => {
    playClickSound();
    setBuffer('');
  }, [playClickSound]);

  const handleSubmit = useCallback(() => {
    playClickSound();
    onSubmit(buffer);
    onClose();
  }, [buffer, onSubmit, onClose, playClickSound]);

  // Handle direct physical keyboard typing while modal is open
  useEffect(() => {
    if (!isOpen) return;

    const handlePhysicalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key === 'Enter') {
        // If focused on a vk key button, let spatialNav triggerClick handle it
        const active = document.activeElement as HTMLElement | null;
        if (active && active.getAttribute('data-nav-id')?.startsWith('vk-')) {
          return;
        }
        e.preventDefault();
        handleSubmit();
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        handleBackspace();
        return;
      }
      // Printable single characters
      if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        handleCharInsert(e.key);
      }
    };

    window.addEventListener('keydown', handlePhysicalKeyDown, true);
    return () => window.removeEventListener('keydown', handlePhysicalKeyDown, true);
  }, [isOpen, handleBackspace, handleCharInsert, handleSubmit, onClose]);

  if (!isOpen) return null;

  // Keyboard Layouts
  const numberRow = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '_', '.'];

  const enLowerRows = [
    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '@', '/'],
    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ':', '.'],
    ['z', 'x', 'c', 'v', 'b', 'n', 'm', '?', '!', '=']
  ];

  const enUpperRows = [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', '@', '/'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', ':', '.'],
    ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '?', '!', '=']
  ];

  const arRows = [
    ['ض', 'ص', 'ث', 'ق', 'ف', 'غ', 'ع', 'ه', 'خ', 'ح', 'ج', 'د'],
    ['ش', 'س', 'ي', 'ب', 'ل', 'ا', 'ت', 'ن', 'م', 'ك', 'ط', 'ذ'],
    ['ئ', 'ء', 'ؤ', 'ر', 'لا', 'ى', 'ة', 'و', 'ز', 'ظ']
  ];

  const symbolsRows = [
    ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')', '_', '+'],
    ['~', '`', '{', '}', '[', ']', '|', '\\', ':', ';', '"', '\''],
    ['<', '>', '?', ',', '.', '/', '=', 'http://', '.com', '.net']
  ];

  let currentRows: string[][] = enLowerRows;
  if (mode === 'en-upper') currentRows = enUpperRows;
  else if (mode === 'ar') currentRows = arRows;
  else if (mode === 'symbols') currentRows = symbolsRows;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/85 backdrop-blur-xl select-none animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-white/15 rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(0,242,254,0.15)] flex flex-col gap-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Title & Close */}
        <div className="w-full flex items-center justify-between border-b border-white/10 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl bg-nova-cyan/20 border border-nova-cyan/40 flex items-center justify-center text-nova-cyan">
              <Keyboard className="w-4 h-4" />
            </div>
            <h3 className="text-sm sm:text-base font-black text-white flex items-center gap-2">
              <span>{title}</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/10 text-slate-300">
                لوحة المفاتيح الداخلية
              </span>
            </h3>
          </div>

          <button
            data-nav-id="vk-btn-close"
            type="button"
            onClick={onClose}
            className="tv-focusable p-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
            title="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Text Display Box */}
        <div className="relative w-full bg-black/70 border-2 border-nova-cyan/40 rounded-2xl p-3 sm:p-4 flex items-center justify-between gap-2 shadow-inner">
          <div className="flex-1 flex items-center gap-1 overflow-x-auto text-right font-mono" dir="ltr">
            {buffer ? (
              <span className="text-lg sm:text-2xl font-bold text-white tracking-wider truncate">
                {isPassword && !showPassword ? '•'.repeat(buffer.length) : buffer}
              </span>
            ) : (
              <span className="text-sm sm:text-base text-slate-500 italic">
                {placeholder}
              </span>
            )}
            <span className="w-2 h-6 bg-nova-cyan animate-pulse shrink-0 inline-block" />
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {isPassword && (
              <button
                data-nav-id="vk-btn-toggle-pwd"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="tv-focusable p-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-all cursor-pointer"
                title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            )}

            {buffer.length > 0 && (
              <button
                data-nav-id="vk-btn-clear"
                type="button"
                onClick={handleClear}
                className="tv-focusable px-2.5 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/30 border border-rose-500/30 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                title="مسح الكل"
              >
                <X className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مسح</span>
              </button>
            )}

            <button
              data-nav-id="vk-btn-backspace"
              type="button"
              onClick={handleBackspace}
              className="tv-focusable p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 transition-all cursor-pointer"
              title="حذف حرف (Backspace)"
            >
              <Delete className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Keyboard Keys Layout */}
        <div className="w-full flex flex-col gap-1.5 select-none" dir="ltr">
          {/* Numbers Row */}
          <div className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
            {numberRow.map((num, idx) => (
              <button
                key={`num-${idx}`}
                data-nav-id={`vk-key-num-${idx}`}
                type="button"
                onClick={() => handleCharInsert(num)}
                className="tv-focusable flex-1 min-w-[24px] sm:min-w-[36px] h-9 sm:h-11 rounded-xl bg-surface-elevated/90 hover:bg-nova-cyan/20 active:bg-nova-cyan/40 border border-white/10 hover:border-nova-cyan/50 text-white font-mono font-bold text-sm sm:text-base flex items-center justify-center transition-all cursor-pointer active:scale-95"
              >
                {num}
              </button>
            ))}
          </div>

          {/* Letter / Symbol Rows */}
          {currentRows.map((row, rowIdx) => (
            <div key={`row-${rowIdx}`} className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
              {/* Caps / Shift button on row 2 if english */}
              {rowIdx === 2 && (mode === 'en-lower' || mode === 'en-upper') && (
                <button
                  data-nav-id="vk-btn-shift"
                  type="button"
                  onClick={() => setMode(mode === 'en-lower' ? 'en-upper' : 'en-lower')}
                  className={`tv-focusable px-2 sm:px-3 h-9 sm:h-11 rounded-xl border text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1 ${
                    mode === 'en-upper'
                      ? 'bg-nova-cyan text-slate-950 border-nova-cyan font-black'
                      : 'bg-white/10 text-slate-300 border-white/10 hover:text-white'
                  }`}
                  title="تبديل الحروف الكبيرة والصغيرة"
                >
                  ⇧ {mode === 'en-upper' ? 'CAPS' : 'Caps'}
                </button>
              )}

              {row.map((ch, chIdx) => (
                <button
                  key={`key-${rowIdx}-${chIdx}`}
                  data-nav-id={`vk-key-${rowIdx}-${chIdx}`}
                  type="button"
                  onClick={() => handleCharInsert(ch)}
                  className={`tv-focusable flex-1 ${ch.length > 2 ? 'min-w-[50px] px-2 text-xs' : 'min-w-[24px] sm:min-w-[36px] text-sm sm:text-base'} h-9 sm:h-11 rounded-xl bg-surface-elevated/90 hover:bg-nova-cyan/20 active:bg-nova-cyan/40 border border-white/10 hover:border-nova-cyan/50 text-white font-mono font-bold flex items-center justify-center transition-all cursor-pointer active:scale-95`}
                >
                  {ch}
                </button>
              ))}

              {/* End of row 2: quick backspace */}
              {rowIdx === 2 && (
                <button
                  data-nav-id="vk-btn-row-backspace"
                  type="button"
                  onClick={handleBackspace}
                  className="tv-focusable px-2.5 sm:px-3 h-9 sm:h-11 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <Delete className="w-3.5 h-3.5" />
                  <span>حذف</span>
                </button>
              )}
            </div>
          ))}

          {/* Bottom Action Row: Modes, Space, Done */}
          <div className="flex items-center justify-between gap-1.5 sm:gap-2 pt-1 border-t border-white/10">
            {/* Mode switch: AR / EN */}
            <button
              data-nav-id="vk-btn-mode-lang"
              type="button"
              onClick={() => setMode(mode === 'ar' ? 'en-lower' : 'ar')}
              className={`tv-focusable px-3 py-2 h-10 sm:h-12 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                mode === 'ar'
                  ? 'bg-purple-600/30 border-purple-500 text-purple-200'
                  : 'bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{mode === 'ar' ? 'EN' : 'عربي'}</span>
            </button>

            {/* Mode switch: Symbols */}
            <button
              data-nav-id="vk-btn-mode-symbols"
              type="button"
              onClick={() => setMode(mode === 'symbols' ? 'en-lower' : 'symbols')}
              className={`tv-focusable px-2.5 py-2 h-10 sm:h-12 rounded-xl border text-xs sm:text-sm font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0 ${
                mode === 'symbols'
                  ? 'bg-cyan-500/30 border-cyan-400 text-cyan-200'
                  : 'bg-white/10 border-white/10 text-slate-300 hover:text-white'
              }`}
            >
              <Hash className="w-3.5 h-3.5" />
              <span>{mode === 'symbols' ? 'ABC' : '?123'}</span>
            </button>

            {/* Spacebar */}
            <button
              data-nav-id="vk-btn-space"
              type="button"
              onClick={() => handleCharInsert(' ')}
              className="tv-focusable flex-1 h-10 sm:h-12 rounded-xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer active:scale-98"
            >
              <span>مسافة (Space)</span>
            </button>

            {/* Quick URL Shortcuts */}
            <button
              data-nav-id="vk-btn-dot-com"
              type="button"
              onClick={() => handleCharInsert('.com')}
              className="tv-focusable px-2 sm:px-3 h-10 sm:h-12 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 text-nova-cyan text-xs font-mono font-bold transition-all cursor-pointer shrink-0 hidden xs:flex items-center"
            >
              .com
            </button>

            {/* Confirm / Submit Button */}
            <button
              data-nav-id="vk-btn-submit"
              type="button"
              onClick={handleSubmit}
              className="tv-focusable px-4 sm:px-6 h-10 sm:h-12 rounded-xl bg-gradient-to-r from-nova-cyan to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-nova-glow transition-all cursor-pointer shrink-0 active:scale-95"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>تأكيد (تم)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
