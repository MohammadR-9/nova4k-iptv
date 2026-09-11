import React from 'react';
import { Camera, Download, QrCode, X } from 'lucide-react';
import { ScreenshotResult } from '../../player/types';

interface ScreenshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  screenshot: ScreenshotResult | null;
  channelName?: string;
}

export const ScreenshotModal: React.FC<ScreenshotModalProps> = ({
  isOpen,
  onClose,
  screenshot,
  channelName
}) => {
  if (!isOpen || !screenshot) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = screenshot.dataUrl;
    a.download = `IPTV_Screenshot_${Date.now()}.png`;
    a.click();
  };

  // Generate QR Code URL using a free QR service to share or view
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent('https://look4k.net')}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-surface-primary border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-accent-cyan">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">لقطة شاشة فورية (4K Snapshot)</h3>
              <p className="text-xs text-slate-400">
                {channelName ? `تم التقاط المشهد من: ${channelName}` : 'تم حفظ الإطار الحالي بدقة فائقة'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Image Preview Container */}
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 shadow-lg bg-black flex items-center justify-center">
          <img
            src={screenshot.dataUrl}
            alt="Broadcast Frame"
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-3 right-3 px-3 py-1 rounded-lg bg-black/70 backdrop-blur-md border border-white/10 text-[11px] font-mono text-cyan-400">
            {screenshot.width}x{screenshot.height} • {screenshot.timestamp}
          </div>
        </div>

        {/* Action Controls & QR Code */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          {/* QR Share for Mobile */}
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-2xl p-2.5 px-4 w-full sm:w-auto">
            <img src={qrUrl} alt="QR Code" className="w-12 h-12 rounded-lg bg-white p-1" />
            <div className="text-right">
              <div className="flex items-center gap-1 text-xs font-bold text-slate-200">
                <QrCode className="w-3.5 h-3.5 text-accent-cyan" />
                <span>مسح بالهاتف</span>
              </div>
              <p className="text-[10px] text-slate-400">امسح الكود بكاميرا الموبايل للحفظ</p>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              onClick={handleDownload}
              className="flex-1 sm:flex-initial px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <Download className="w-4 h-4" />
              <span>تحميل الصورة</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
            >
              إغلاق
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
