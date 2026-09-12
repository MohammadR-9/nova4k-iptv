import React, { useEffect, useState } from 'react';
import { LogOut, Play, Power, X } from 'lucide-react';
import { SERVER_CONFIG } from '../../config/server.config';
import { TV_KEYS } from '../../navigation/keycodes';
import { spatialNav } from '../../navigation/spatialNav';

export type ExitModalMode = 'account-logout' | 'app-exit';

interface ExitConfirmModalProps {
  isOpen: boolean;
  mode?: ExitModalMode;
  onCancel: () => void;
  onConfirmLogout: () => void;
  onConfirmAppExit?: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  mode = 'account-logout',
  onCancel,
  onConfirmLogout,
  onConfirmAppExit
}) => {
  const isLogoutMode = mode === 'account-logout';
  const [selectedBtn, setSelectedBtn] = useState<'cancel' | 'confirm' | 'kill'>('cancel');

  useEffect(() => {
    if (!isOpen) return;

    // Focus cancel button by default so accidental Enter doesn't exit
    setSelectedBtn('cancel');
    const timer = setTimeout(() => {
      spatialNav.setFocus('exit-btn-cancel');
    }, 50);

    const handleModalKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode || e.which;

      // Escape / Back: Close modal smoothly
      if (
        code === TV_KEYS.ESCAPE || 
        code === TV_KEYS.RETURN || 
        code === TV_KEYS.WEBOS_BACK || 
        e.key === 'Escape' || 
        e.key === 'Back' || 
        e.key === 'GoBack'
      ) {
        e.preventDefault();
        e.stopPropagation();
        onCancel();
        return;
      }

      // Left Arrow
      if (code === TV_KEYS.LEFT || e.key === 'ArrowLeft') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedBtn(prev => {
          const next = prev === 'cancel' ? 'confirm' : 'cancel';
          spatialNav.setFocus(next === 'cancel' ? 'exit-btn-cancel' : 'exit-btn-confirm');
          return next;
        });
        return;
      }

      // Right Arrow
      if (code === TV_KEYS.RIGHT || e.key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        setSelectedBtn(prev => {
          const next = prev === 'confirm' ? 'cancel' : 'confirm';
          spatialNav.setFocus(next === 'cancel' ? 'exit-btn-cancel' : 'exit-btn-confirm');
          return next;
        });
        return;
      }

      // Down Arrow: Move to kill button if present
      if (code === TV_KEYS.DOWN || e.key === 'ArrowDown') {
        if (isLogoutMode && onConfirmAppExit) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedBtn('kill');
          spatialNav.setFocus('exit-btn-kill');
        }
        return;
      }

      // Up Arrow: Return from kill button
      if (code === TV_KEYS.UP || e.key === 'ArrowUp') {
        if (selectedBtn === 'kill') {
          e.preventDefault();
          e.stopPropagation();
          setSelectedBtn('cancel');
          spatialNav.setFocus('exit-btn-cancel');
        }
        return;
      }

      // Enter / OK: Execute selected action
      if (code === TV_KEYS.ENTER || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        if (selectedBtn === 'cancel') {
          onCancel();
        } else if (selectedBtn === 'confirm') {
          if (isLogoutMode) {
            onConfirmLogout();
          } else {
            if (onConfirmAppExit) onConfirmAppExit();
            else onCancel();
          }
        } else if (selectedBtn === 'kill') {
          if (onConfirmAppExit) onConfirmAppExit();
        }
        return;
      }
    };

    window.addEventListener('keydown', handleModalKeyDown, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleModalKeyDown, true);
    };
  }, [isOpen, isLogoutMode, selectedBtn, onCancel, onConfirmLogout, onConfirmAppExit]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-xl p-4 sm:p-6 select-none animate-in fade-in zoom-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div className="relative w-full max-w-lg bg-surface-primary border-2 border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col items-center text-center gap-5">
        
        {/* Close Corner Button */}
        <button
          type="button"
          onClick={onCancel}
          className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white transition-all cursor-pointer"
          title="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Icon */}
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${
          isLogoutMode 
            ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400 shadow-amber-500/10' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400 shadow-red-500/10'
        }`}>
          {isLogoutMode ? <LogOut className="w-8 h-8" /> : <Power className="w-8 h-8" />}
        </div>

        <div>
          <h3 className="text-xl sm:text-2xl font-black text-white mb-2">
            {isLogoutMode ? 'هل ترغب في الخروج من الحساب؟' : 'هل ترغب في إغلاق التطبيق والخروج؟'}
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
            {isLogoutMode 
              ? `سيتم تسجيل الخروج من الحساب الحالي والعودة إلى شاشة تفعيل الاشتراك في ${SERVER_CONFIG.APP_NAME}.`
              : `هل أنت متأكد من رغبتك في إغلاق تطبيق ${SERVER_CONFIG.APP_NAME} بشكل كامل؟`}
          </p>
        </div>

        {/* Remote D-Pad Navigation Buttons */}
        <div className="w-full flex flex-col gap-3 pt-2">
          <div className="w-full grid grid-cols-2 gap-3">
            {/* Cancel Button */}
            <button
              data-nav-id="exit-btn-cancel"
              type="button"
              onClick={onCancel}
              onMouseEnter={() => setSelectedBtn('cancel')}
              className={`tv-focusable py-4 px-4 rounded-2xl font-black text-sm sm:text-base flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-95 ${
                selectedBtn === 'cancel'
                  ? 'bg-gradient-to-r from-nova-cyan to-blue-600 text-slate-950 shadow-nova-glow ring-2 ring-white scale-102'
                  : 'bg-white/10 text-white hover:bg-white/15'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isLogoutMode ? 'البقاء في الحساب' : 'إلغاء والعودة'}</span>
            </button>

            {/* Confirm Exit / Logout Button */}
            <button
              data-nav-id="exit-btn-confirm"
              type="button"
              onClick={isLogoutMode ? onConfirmLogout : onConfirmAppExit}
              onMouseEnter={() => setSelectedBtn('confirm')}
              className={`tv-focusable py-4 px-4 rounded-2xl font-black text-sm sm:text-base border transition-all cursor-pointer flex items-center justify-center gap-2.5 active:scale-95 ${
                selectedBtn === 'confirm'
                  ? isLogoutMode
                    ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-lg shadow-amber-500/30 scale-102 font-black'
                    : 'bg-red-600 text-white ring-2 ring-red-300 shadow-lg shadow-red-600/30 scale-102 font-black'
                  : isLogoutMode
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
                    : 'bg-red-500/15 border-red-500/40 text-red-300 hover:bg-red-500/25'
              }`}
            >
              {isLogoutMode ? <LogOut className="w-4 h-4" /> : <Power className="w-4 h-4" />}
              <span>{isLogoutMode ? 'تبديل البروفايل / خروج' : 'تأكيد الخروج'}</span>
            </button>
          </div>

          {/* Optional Direct Full App Shutdown when inside account */}
          {isLogoutMode && onConfirmAppExit && (
            <button
              data-nav-id="exit-btn-kill"
              type="button"
              onClick={onConfirmAppExit}
              onMouseEnter={() => setSelectedBtn('kill')}
              className={`tv-focusable w-full py-3 rounded-xl border text-xs sm:text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-95 ${
                selectedBtn === 'kill'
                  ? 'bg-red-600/30 border-red-500 text-red-200 ring-2 ring-red-400'
                  : 'bg-white/5 hover:bg-red-500/20 border-white/10 text-slate-400 hover:text-red-300'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>إغلاق التطبيق بالكامل (Shutdown App)</span>
            </button>
          )}
        </div>

        {/* TV Remote Tip Footer */}
        <div className="pt-2 text-[11px] text-slate-400 flex items-center justify-center gap-2">
          <span>استخدم أسهم الريموت ⬅️ ➡️ للتنقل، وزر OK للتأكيد، وزر العودة 🔙 للإلغاء</span>
        </div>

      </div>
    </div>
  );
};
