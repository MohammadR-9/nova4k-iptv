import React from 'react';
import { LogOut, Play, Power } from 'lucide-react';
import { SERVER_CONFIG } from '../../config/server.config';

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
  if (!isOpen) return null;

  const isLogoutMode = mode === 'account-logout';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none animate-in fade-in zoom-in duration-200">
      <div className="relative w-full max-w-md bg-surface-primary border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5">
        
        {/* Modal Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
          isLogoutMode 
            ? 'bg-amber-500/20 border border-amber-500/30 text-amber-400' 
            : 'bg-red-500/20 border border-red-500/30 text-red-400'
        }`}>
          {isLogoutMode ? <LogOut className="w-7 h-7" /> : <Power className="w-7 h-7" />}
        </div>

        <div>
          <h3 className="text-xl font-black text-white mb-1.5">
            {isLogoutMode ? 'هل ترغب في الخروج من الحساب؟' : 'هل ترغب في الخروج من التطبيق؟'}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            {isLogoutMode 
              ? `سيتم تسجيل الخروج من الحساب الحالي والعودة إلى شاشة تفعيل الاشتراك في ${SERVER_CONFIG.APP_NAME}.`
              : `هل أنت متأكد من رغبتك في إغلاق تطبيق ${SERVER_CONFIG.APP_NAME} بالكامل؟`}
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full flex flex-col gap-2.5 pt-2">
          <div className="w-full flex items-center gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{isLogoutMode ? 'البقاء في الحساب' : 'إلغاء'}</span>
            </button>

            <button
              onClick={isLogoutMode ? onConfirmLogout : onConfirmAppExit}
              className={`flex-1 py-3.5 rounded-xl border text-sm font-bold transition-all cursor-pointer flex items-center justify-center gap-2 ${
                isLogoutMode
                  ? 'bg-amber-500/10 hover:bg-amber-500/20 border-amber-500/30 text-amber-300 hover:text-amber-200'
                  : 'bg-red-500/10 hover:bg-red-500/20 border-red-500/30 text-red-300 hover:text-red-200'
              }`}
            >
              <LogOut className="w-4 h-4" />
              <span>{isLogoutMode ? 'تبديل البروفايل / خروج' : 'خروج من التطبيق'}</span>
            </button>
          </div>

          {/* Optional Full App Exit on TV / Android even when in account */}
          {isLogoutMode && onConfirmAppExit && (
            <button
              onClick={onConfirmAppExit}
              className="w-full py-2.5 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-slate-400 hover:text-red-300 font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Power className="w-3.5 h-3.5" />
              <span>إغلاق التطبيق بالكامل</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
