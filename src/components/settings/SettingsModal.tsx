import React, { useState, useEffect } from 'react';
import { Settings, Zap, Volume2, LogOut, X, Wrench, Check, Maximize2, Monitor, Cpu, Users } from 'lucide-react';
import { UserAccount } from '../../types/iptv.types';
import { SERVER_CONFIG } from '../../config/server.config';
import { PlayerEngineType, AspectRatioMode } from '../../player/types';
import { FullscreenUtil } from '../../utils/fullscreen';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  account: UserAccount;
  onLogout: () => void;
  isDevUnlocked: boolean;
  onOpenProfiles?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  account, 
  onLogout,
  isDevUnlocked,
  onOpenProfiles
}) => {
  const [playerEngine, setPlayerEngine] = useState<PlayerEngineType>(() => {
    return (localStorage.getItem('nova_default_engine') as PlayerEngineType) || 'exoplayer';
  });
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>(() => {
    return (localStorage.getItem('nova_default_aspect_ratio') as AspectRatioMode) || 'fill';
  });
  const [bufferPreset, setBufferPreset] = useState<'FAST' | 'BALANCED' | 'STABLE'>(() => {
    return (localStorage.getItem('nova_buffer_preset') as any) || 'BALANCED';
  });
  const [audioLang, setAudioLang] = useState<'ara' | 'eng'>(() => {
    return (localStorage.getItem('nova_audio_lang') as any) || 'ara';
  });
  const [uiMode, setUiMode] = useState<'auto' | 'tv' | 'mobile'>(() => {
    return (localStorage.getItem('nova_ui_mode') as any) || 'auto';
  });
  const [isFullscreen, setIsFullscreen] = useState(FullscreenUtil.isFullscreen());
  const [customServerUrl, setCustomServerUrl] = useState(SERVER_CONFIG.DEFAULT_PORTAL_URL);

  const handleUiModeChange = (mode: 'auto' | 'tv' | 'mobile') => {
    setUiMode(mode);
    localStorage.setItem('nova_ui_mode', mode);
    if (mode === 'tv') {
      document.documentElement.setAttribute('data-device', 'tv');
    } else if (mode === 'mobile') {
      document.documentElement.setAttribute('data-device', 'mobile');
    } else {
      document.documentElement.removeAttribute('data-device');
    }
    window.dispatchEvent(new Event('resize'));
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(FullscreenUtil.isFullscreen());
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  const handleEngineChange = (engine: PlayerEngineType) => {
    setPlayerEngine(engine);
    localStorage.setItem('nova_default_engine', engine);
  };

  const handleAspectRatioChange = (ratio: AspectRatioMode) => {
    setAspectRatio(ratio);
    localStorage.setItem('nova_default_aspect_ratio', ratio);
  };

  const handleBufferChange = (preset: 'FAST' | 'BALANCED' | 'STABLE') => {
    setBufferPreset(preset);
    localStorage.setItem('nova_buffer_preset', preset);
  };

  const handleAudioChange = (lang: 'ara' | 'eng') => {
    setAudioLang(lang);
    localStorage.setItem('nova_audio_lang', lang);
  };

  const handleToggleFullscreen = async () => {
    const newState = await FullscreenUtil.toggleFullscreen();
    setIsFullscreen(newState);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xl p-16 select-none animate-in fade-in duration-200">
      
      <div className="relative w-[850px] bg-surface-primary border border-white/10 rounded-3xl p-8 shadow-2xl flex flex-col justify-between">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-accent-cyan">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-white">إعدادات التطبيق والمشغل</h2>
              <p className="text-xs text-slate-400">تخصيص أداء البث والصوت ومحرك سامسونج</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Options Body */}
        <div className="space-y-6 overflow-y-auto max-h-[520px] pr-2">

          {/* Section 0: Fullscreen Display Control (Requested for browsers & Smart TVs) */}
          <div className="bg-surface-elevated/70 border border-cyan-500/20 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Maximize2 className="w-5 h-5 text-nova-cyan" />
                <div>
                  <h3 className="text-base font-extrabold text-white">وضع الشاشة الكاملة (Full Screen)</h3>
                  <p className="text-xs text-slate-400">تكبير التطبيق ومقاطع الفيديو لملء الشاشة بالكامل بدون حواف</p>
                </div>
              </div>
              <button
                onClick={handleToggleFullscreen}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 border transition-all ${
                  isFullscreen
                    ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 shadow-sm'
                    : 'bg-cyan-500/20 hover:bg-cyan-500/30 border-cyan-400 text-nova-cyan'
                }`}
              >
                <Maximize2 className="w-4 h-4" />
                <span>{isFullscreen ? 'الخروج من ملء الشاشة' : 'تفعيل ملء الشاشة الآن'}</span>
              </button>
            </div>
          </div>

          {/* Section 0.5: Display UI Mode (Smart TV vs Mobile vs Auto) */}
          <div className="bg-surface-elevated/70 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-5 h-5 text-nova-cyan" />
              <h3 className="text-base font-extrabold text-white">نمط واجهة العرض (Display UI Mode)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              اختر شكل الواجهة المناسب لجهازك (الوضع السينمائي يوفر واجهة ثلاثية الأعمدة مماثلة لـ TiviMate و Smarters Pro لأجهزة التلفاز و TV Box):
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => handleUiModeChange('auto')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  uiMode === 'auto'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">⚡ تلقائي (Auto)</span>
                  {uiMode === 'auto' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">كشف تلقائي حسب عتاد الجهاز واللمس</span>
              </button>

              <button
                type="button"
                onClick={() => handleUiModeChange('tv')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  uiMode === 'tv'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">🖥️ سينما التلفاز (Smart TV)</span>
                  {uiMode === 'tv' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">واجهة ثلاثية الأعمدة للتلفاز والريموت</span>
              </button>

              <button
                type="button"
                onClick={() => handleUiModeChange('mobile')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  uiMode === 'mobile'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">📱 شاشة الموبايل (Mobile)</span>
                  {uiMode === 'mobile' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">واجهة مصممة للمس والهواتف المحمولة</span>
              </button>
            </div>
          </div>

          {/* Section 1: Default Player Engine */}
          <div className="bg-surface-elevated/70 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Cpu className="w-5 h-5 text-nova-cyan" />
              <h3 className="text-base font-extrabold text-white">محرك تشغيل الفيديو الافتراضي</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              اختر المحرك المناسب لجهازك لمنع التجميد والتقطيع (يتم حفظه مركزياً ولا يزعجك أثناء المشاهدة):
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => handleEngineChange('exoplayer')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  playerEngine === 'exoplayer'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">ExoPlayer v3 Turbo</span>
                  {playerEngine === 'exoplayer' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">الافتراضي الأسرع (مانع التجميد)</span>
              </button>

              <button
                onClick={() => handleEngineChange('shaka-google')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  playerEngine === 'shaka-google'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Google Shaka Engine</span>
                  {playerEngine === 'shaka-google' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">محرك Google لثبات البث و DRM</span>
              </button>

              <button
                onClick={() => handleEngineChange('mx-hardware')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  playerEngine === 'mx-hardware'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">Samsung Tizen AVPlay</span>
                  {playerEngine === 'mx-hardware' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">تسريع العتاد 4K لشاشات سامسونج</span>
              </button>

              <button
                onClick={() => handleEngineChange('webos-luna')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  playerEngine === 'webos-luna'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">LG webOS Hardware</span>
                  {playerEngine === 'webos-luna' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">تسريع العتاد لشاشات LG webOS</span>
              </button>

              <button
                onClick={() => handleEngineChange('vlc')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  playerEngine === 'vlc'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">VLC Universal</span>
                  {playerEngine === 'vlc' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">مخزن استرجاع عميق للبث المباشر</span>
              </button>

              <button
                onClick={() => handleEngineChange('wasm-ffmpeg')}
                className={`p-3 rounded-xl border text-right transition-all cursor-pointer ${
                  playerEngine === 'wasm-ffmpeg'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">WASM / DSP Booster</span>
                  {playerEngine === 'wasm-ffmpeg' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">مضخم الصوت والتوافق البرمجي</span>
              </button>
            </div>
          </div>

          {/* Section 2: Default Aspect Ratio Mode */}
          <div className="bg-surface-elevated/70 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Monitor className="w-5 h-5 text-nova-purple" />
              <h3 className="text-base font-extrabold text-white">نسبة أبعاد الشاشة الافتراضية</h3>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              اختر وضع العرض التلقائي المفضل لجميع القنوات ومقاطع الفيديو:
            </p>

            <div className="grid grid-cols-4 gap-2.5">
              <button
                onClick={() => handleAspectRatioChange('fill')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  aspectRatio === 'fill'
                    ? 'bg-purple-500/20 border-nova-purple text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="font-bold text-xs block mb-0.5">ملء الشاشة الكامل</span>
                <span className="text-[10px] text-slate-400">Fill (16:9 بدون حواف)</span>
              </button>

              <button
                onClick={() => handleAspectRatioChange('fit')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  aspectRatio === 'fit'
                    ? 'bg-purple-500/20 border-nova-purple text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="font-bold text-xs block mb-0.5">النسبة الأصلية</span>
                <span className="text-[10px] text-slate-400">Fit (الأبعاد الطبيعية)</span>
              </button>

              <button
                onClick={() => handleAspectRatioChange('zoom-120')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  aspectRatio === 'zoom-120'
                    ? 'bg-purple-500/20 border-nova-purple text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="font-bold text-xs block mb-0.5">تكبير سينمائي</span>
                <span className="text-[10px] text-slate-400">Zoom 120%</span>
              </button>

              <button
                onClick={() => handleAspectRatioChange('stretch')}
                className={`p-2.5 rounded-xl border text-center transition-all ${
                  aspectRatio === 'stretch'
                    ? 'bg-purple-500/20 border-nova-purple text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                <span className="font-bold text-xs block mb-0.5">تمديد كامل</span>
                <span className="text-[10px] text-slate-400">Stretch 100%</span>
              </button>
            </div>
          </div>

          {/* Section 3: Buffer Presets */}
          <div className="bg-surface-elevated/70 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-accent-cyan" />
              <h3 className="text-base font-extrabold text-white">نمط التخزين المؤقت وسرعة التقليب (Zapping)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              اختر وضع "تقليب فائق السرعة" للحصول على انتقال فوري بين القنوات، أو "وضع الاستقرار" إذا كان اتصالك بالإنترنت متذبذباً.
            </p>

            <div className="grid grid-cols-3 gap-3">
              <button
                data-nav-id="btn-buf-fast"
                onClick={() => handleBufferChange('FAST')}
                className={`tv-focusable p-3 rounded-xl border text-right transition-all ${
                  bufferPreset === 'FAST'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">تقليب سريع</span>
                  {bufferPreset === 'FAST' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">مخزن 2 - 3 ثوانٍ (تقليب فوري)</span>
              </button>

              <button
                data-nav-id="btn-buf-balanced"
                onClick={() => handleBufferChange('BALANCED')}
                className={`tv-focusable p-3 rounded-xl border text-right transition-all ${
                  bufferPreset === 'BALANCED'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">وضع متوازن (موصى به)</span>
                  {bufferPreset === 'BALANCED' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">مخزن 5 ثوانٍ (سلاسة تامة)</span>
              </button>

              <button
                data-nav-id="btn-buf-stable"
                onClick={() => handleBufferChange('STABLE')}
                className={`tv-focusable p-3 rounded-xl border text-right transition-all ${
                  bufferPreset === 'STABLE'
                    ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                    : 'bg-white/5 border-white/5 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-sm">أقصى استقرار (مانع التقطيع)</span>
                  {bufferPreset === 'STABLE' && <Check className="w-4 h-4 text-accent-cyan" />}
                </div>
                <span className="text-[11px] text-slate-400">مخزن 10 ثوانٍ (للإنترنت الضعيف)</span>
              </button>
            </div>
          </div>

          {/* Section 2: Audio Language */}
          <div className="bg-surface-elevated/70 border border-white/5 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-3">
              <Volume2 className="w-5 h-5 text-accent-gold" />
              <h3 className="text-base font-extrabold text-white">لغة التعليق والصوت الافتراضية</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button
                data-nav-id="btn-audio-ara"
                onClick={() => handleAudioChange('ara')}
                className={`tv-focusable p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                  audioLang === 'ara'
                    ? 'bg-amber-500/20 border-accent-gold text-white'
                    : 'bg-white/5 border-white/5 text-slate-300'
                }`}
              >
                <span className="font-bold text-sm">اللغة العربية (Dolby Digital)</span>
                {audioLang === 'ara' && <Check className="w-4 h-4 text-accent-gold" />}
              </button>

              <button
                data-nav-id="btn-audio-eng"
                onClick={() => handleAudioChange('eng')}
                className={`tv-focusable p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                  audioLang === 'eng'
                    ? 'bg-amber-500/20 border-accent-gold text-white'
                    : 'bg-white/5 border-white/5 text-slate-300'
                }`}
              >
                <span className="font-bold text-sm">English (Original Audio)</span>
                {audioLang === 'eng' && <Check className="w-4 h-4 text-accent-gold" />}
              </button>
            </div>
          </div>

          {/* Section 3: Hidden Developer Portal (Only visible if unlocked) */}
          {isDevUnlocked && (
            <div className="bg-red-950/30 border-2 border-red-500/40 rounded-2xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Wrench className="w-5 h-5 text-red-400" />
                <h3 className="text-base font-black text-red-400">بوابة المطور السرية (DEVELOPER PORTAL)</h3>
              </div>
              <p className="text-xs text-red-200/80 mb-3">
                تم إلغاء قفل بوابة المطورين بنجاح. تتيح لك هذه الشاشة تعديل رابط الخادم مباشرة لأغراض الصيانة والاختبار.
              </p>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Server Portal URL Override:</label>
                <input 
                  type="text"
                  value={customServerUrl}
                  onChange={(e) => setCustomServerUrl(e.target.value)}
                  className="w-full h-11 bg-black/60 border border-red-500/40 rounded-xl px-4 font-mono text-sm text-red-300 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Section 4: Account & Logout */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-elevated/70 border border-white/5 rounded-2xl p-5">
            <div>
              <span className="text-xs text-slate-400 block mb-1">الحساب النشط:</span>
              <span className="text-base font-black text-white font-mono">{account.username}</span>
              <span className="text-xs text-accent-gold mr-3">متبقي {account.daysRemaining} يوم</span>
            </div>

            <div className="flex items-center gap-2">
              {onOpenProfiles && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenProfiles();
                  }}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600/30 to-cyan-500/20 hover:border-nova-cyan border border-nova-purple/40 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  <Users className="w-4 h-4 text-nova-cyan" />
                  <span>البروفايلات المحفوظة</span>
                </button>
              )}

              <button
                data-nav-id="btn-logout"
                onClick={onLogout}
                className="tv-focusable px-4 py-2.5 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 text-red-400 hover:text-red-300 rounded-xl font-bold text-sm flex items-center gap-2 transition-all cursor-pointer active:scale-95"
              >
                <LogOut className="w-4 h-4" />
                <span>تبديل البروفايل / خروج</span>
              </button>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-xs text-slate-500 mt-4">
          <span>{SERVER_CONFIG.APP_NAME} • إصدار شاشات سامسونج تايزن {SERVER_CONFIG.APP_VERSION}</span>
          <button 
            onClick={onClose}
            className="px-6 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold text-xs"
          >
            حفظ وإغلاق
          </button>
        </div>

      </div>

    </div>
  );
};
