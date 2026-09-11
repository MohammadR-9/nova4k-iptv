import React from 'react';
import { LogOut, Play } from 'lucide-react';
import { SERVER_CONFIG } from '../../config/server.config';

interface ExitConfirmModalProps {
  isOpen: boolean;
  onCancel: () => void;
  onConfirmExit: () => void;
}

export const ExitConfirmModal: React.FC<ExitConfirmModalProps> = ({
  isOpen,
  onCancel,
  onConfirmExit
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none animate-in fade-in zoom-in duration-200">
      <div className="relative w-full max-w-md bg-surface-primary border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col items-center text-center gap-5">
        
        {/* Warning Icon */}
        <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
          <LogOut className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-xl font-black text-white mb-1.5">هل ترغب في الخروج من التطبيق؟</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            سيتم حفظ آخر قناة ومكان توقفك في الأفلام لتستأنف المشاهدة فور عودتك إلى {SERVER_CONFIG.APP_NAME}.
          </p>
        </div>

        {/* Buttons */}
        <div className="w-full flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>متابعة المشاهدة</span>
          </button>

          <button
            onClick={onConfirmExit}
            className="flex-1 py-3.5 rounded-xl bg-white/10 hover:bg-red-600/30 hover:border-red-500/40 border border-white/10 text-slate-300 hover:text-red-300 font-bold text-sm transition-all cursor-pointer"
          >
            خروج من التطبيق
          </button>
        </div>

      </div>
    </div>
  );
};
