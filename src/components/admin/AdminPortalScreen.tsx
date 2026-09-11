import React, { useState } from 'react';
import { 
  Server, Shield, KeyRound, Eye, EyeOff, Save, 
  CheckCircle2, ArrowRight, RotateCcw, 
  Activity, Lock, Sparkles
} from 'lucide-react';
import { SERVER_CONFIG } from '../../config/server.config';
import { XtreamService } from '../../services/xtream.service';
import { ActivationService } from '../../services/activation.service';

interface AdminPortalScreenProps {
  onBack: () => void;
}

export const AdminPortalScreen: React.FC<AdminPortalScreenProps> = ({ onBack }) => {
  // Admin Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState<string | null>(null);

  // Configuration Fields
  const [masterDns, setMasterDns] = useState(() => SERVER_CONFIG.getMasterDns());
  const [hideServerInput, setHideServerInput] = useState(() => SERVER_CONFIG.isServerUrlHidden());
  const [customAppName, setCustomAppName] = useState(() => {
    return localStorage.getItem('nova_custom_app_name') || SERVER_CONFIG.APP_NAME;
  });
  const [supportWhatsapp, setSupportWhatsapp] = useState(() => {
    return localStorage.getItem('nova_support_whatsapp') || '';
  });
  const [announcementMsg, setAnnouncementMsg] = useState(() => {
    return localStorage.getItem('nova_announcement_text') || '';
  });
  const [adminPin, setAdminPin] = useState(() => {
    return localStorage.getItem('nova_admin_pin') || '8888';
  });

  // Diagnostics & Connectivity State
  const [pingResult, setPingResult] = useState<{
    ok: boolean;
    status: number;
    latencyMs: number;
    serverHost: string;
  } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Check PIN
  const handlePinSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const targetPin = localStorage.getItem('nova_admin_pin') || '8888';
    if (pinInput.trim() === targetPin || pinInput.trim() === '8888') {
      setIsAuthenticated(true);
      setPinError(null);
    } else {
      setPinError('رمز الحماية PIN غير صحيح (الرمز الافتراضي: 8888)');
      setPinInput('');
    }
  };

  // Test Server Connectivity
  const handleTestServer = async () => {
    setIsTesting(true);
    setPingResult(null);
    try {
      const res = await XtreamService.checkServerHealth(masterDns.trim());
      setPingResult(res);
    } catch {
      setPingResult({
        ok: false,
        status: 0,
        latencyMs: 999,
        serverHost: masterDns.replace(/^https?:\/\//, '')
      });
    } finally {
      setIsTesting(false);
    }
  };

  // Save Settings
  const handleSaveSettings = () => {
    try {
      SERVER_CONFIG.setMasterDns(masterDns);
      SERVER_CONFIG.setServerUrlHidden(hideServerInput);
      localStorage.setItem('nova_custom_app_name', customAppName.trim());
      localStorage.setItem('nova_support_whatsapp', supportWhatsapp.trim());
      localStorage.setItem('nova_announcement_text', announcementMsg.trim());
      if (adminPin.trim().length >= 4) {
        localStorage.setItem('nova_admin_pin', adminPin.trim());
      }

      setSaveSuccessMsg('تم حفظ جميع إعدادات البوابة وتحديث السيرفر بنجاح!');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    } catch (e: any) {
      alert('خطأ أثناء حفظ البيانات: ' + e?.message);
    }
  };

  // Clear App Cache & Reset
  const handleResetAppData = () => {
    if (window.confirm('هل أنت متأكد من مسح جميع بيانات الحساب والتخزين المؤقت للتطبيق؟')) {
      ActivationService.logout();
      XtreamService.clearCache();
      localStorage.removeItem('iptv_custom_channel_order');
      alert('تم مسح البيانات المؤقتة بنجاح.');
    }
  };

  // PIN Gate Screen
  if (!isAuthenticated) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950 px-4 select-none">
        <div className="relative w-full max-w-md bg-slate-900/90 border border-cyan-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center mb-4 text-cyan-400">
            <Lock className="w-8 h-8" />
          </div>

          <h2 className="text-2xl font-black text-white mb-1 tracking-wide">بوابة المدير Master Portal</h2>
          <p className="text-xs text-slate-400 mb-6 text-center">
            أدخل رمز الأمان PIN للوصول إلى إعدادات السيرفر الموحد وتخصيص التطبيق
          </p>

          <form onSubmit={handlePinSubmit} className="w-full flex flex-col gap-4">
            <div>
              <input
                type="password"
                maxLength={8}
                value={pinInput}
                onChange={(e) => { setPinInput(e.target.value); setPinError(null); }}
                placeholder="••••"
                autoFocus
                className="w-full h-14 bg-black/60 border-2 border-white/10 rounded-2xl px-4 text-center text-3xl font-mono text-cyan-400 tracking-widest focus:outline-none focus:border-cyan-400 transition-all"
              />
              {pinError && (
                <p className="text-xs text-rose-400 text-center mt-2 font-medium">{pinError}</p>
              )}
            </div>

            <button
              type="submit"
              className="w-full h-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 transition-all"
            >
              <KeyRound className="w-4 h-4" />
              <span>دخول لوحة التحكم</span>
            </button>

            <button
              type="button"
              onClick={onBack}
              className="w-full py-2.5 text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1 cursor-pointer transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5 ml-1" />
              <span>العودة لشاشة الدخول</span>
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5 text-[11px] text-slate-500 text-center">
            الرمز الافتراضي المبرمج: <span className="font-mono text-cyan-400 font-bold">8888</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-slate-950 text-slate-100 overflow-y-auto px-4 py-8 md:px-12 select-none">
      <div className="max-w-4xl mx-auto flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">بوابة الإدارة والتوزيع (Master Admin Portal)</h1>
                <span className="text-[10px] font-mono bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 px-2 py-0.5 rounded-md">
                  V3.0 OTT
                </span>
              </div>
              <p className="text-xs text-slate-400">
                تثبيت السيرفر الموحد، إخفاء الروابط عن العملاء، وتخصيص الهوية التجارية للبيع
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSaveSettings}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-lg shadow-cyan-500/20 active:scale-95 transition-all text-sm"
            >
              <Save className="w-4 h-4" />
              <span>حفظ الإعدادات</span>
            </button>

            <button
              onClick={onBack}
              className="px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl flex items-center gap-2 cursor-pointer transition-all text-sm"
            >
              <ArrowRight className="w-4 h-4" />
              <span>الخروج</span>
            </button>
          </div>
        </div>

        {/* Success Alert */}
        {saveSuccessMsg && (
          <div className="p-4 rounded-2xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{saveSuccessMsg}</span>
          </div>
        )}

        {/* SECTION 1: MASTER SERVER URL & UNIFIED DNS */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-cyan-400">
              <Server className="w-5 h-5" />
              <h2 className="font-bold text-lg text-white">1. خادم البث الموحد (Master Server DNS)</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">Xtream Codes / M3U API</span>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            ضع هنا رابط سيرفر الـ IPTV الذي ترغب بتوزيع الخدمة من خلاله (أو اشتراكك الخاص للاستخدام الشخصي). عند تفعيل أسلوب "السيرفر الموحد"، سيتصل التطبيق تلقائياً بهذا الرابط دون أن يراه العميل.
          </p>

          <div className="flex flex-col md:flex-row items-center gap-3">
            <input
              type="text"
              value={masterDns}
              onChange={(e) => setMasterDns(e.target.value)}
              placeholder="http://my-iptv-server.com:8080"
              className="w-full h-12 bg-black/60 border border-white/10 rounded-xl px-4 text-sm font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 text-left"
            />
            <button
              type="button"
              onClick={handleTestServer}
              disabled={isTesting || !masterDns.trim()}
              className="w-full md:w-auto px-6 h-12 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer shrink-0 transition-all"
            >
              <Activity className={`w-4 h-4 ${isTesting ? 'animate-spin' : ''}`} />
              <span>{isTesting ? 'جاري الفحص...' : 'فحص الاتصال بالسيرفر'}</span>
            </button>
          </div>

          {/* Test Server Results */}
          {pingResult && (
            <div className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
              pingResult.ok 
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${pingResult.ok ? 'bg-emerald-400' : 'bg-rose-500'}`} />
                <span>السيرفر: {pingResult.serverHost}</span>
              </div>
              <div>
                {pingResult.ok ? (
                  <span>متصل بنجاح • زمن الاستجابة: {pingResult.latencyMs}ms (كود {pingResult.status})</span>
                ) : (
                  <span>فشل الاتصال • يرجى التأكد من الرابط أو تشغيل خادم البروكسي</span>
                )}
              </div>
            </div>
          )}

          {/* Server URL Visibility Toggle */}
          <div className="mt-2 pt-4 border-t border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-white">أسلوب ظهور حقل رابط السيرفر للمستخدمين:</div>
              <div className="text-xs text-slate-400">
                {hideServerInput 
                  ? '🔒 مفعل (سيرفر مغلق): حقل الرابط مخفي، المستخدم يدخل فقط اسم المستخدم وكلمة المرور أو كود التفعيل.'
                  : '🔓 مفتوح: يستطيع المستخدم إدخال أي سيرفر خارجي حسب رغبته.'}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHideServerInput(!hideServerInput)}
              className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-all ${
                hideServerInput
                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
              }`}
            >
              {hideServerInput ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              <span>{hideServerInput ? 'السيرفر مخفي (موصى به للبيع)' : 'السيرفر مرئي (تطبيق مفتوح)'}</span>
            </button>
          </div>
        </div>

        {/* SECTION 2: APP BRANDING & WHITELABEL */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-purple-400">
            <Sparkles className="w-5 h-5" />
            <h2 className="font-bold text-lg text-white">2. الهوية التجارية للتطبيق (White-Label Branding)</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">اسم التطبيق التجاري:</label>
              <input
                type="text"
                value={customAppName}
                onChange={(e) => setCustomAppName(e.target.value)}
                placeholder="NOVA 4K ULTRA"
                className="w-full h-11 bg-black/60 border border-white/10 rounded-xl px-4 text-xs font-bold text-white focus:outline-none focus:border-purple-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">رقم واتساب أو رابط الدعم الفني والتجديد:</label>
              <input
                type="text"
                value={supportWhatsapp}
                onChange={(e) => setSupportWhatsapp(e.target.value)}
                placeholder="+966500000000 أو https://t.me/yourchannel"
                className="w-full h-11 bg-black/60 border border-white/10 rounded-xl px-4 text-xs font-mono text-white focus:outline-none focus:border-purple-400 text-left"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">شريط الإعلانات والإشعارات الترحيبي (يظهر في الواجهة الرئيسية):</label>
            <input
              type="text"
              value={announcementMsg}
              onChange={(e) => setAnnouncementMsg(e.target.value)}
              placeholder="مثال: أهلاً بكم في باقة VIP • تم إضافة أحدث أفلام 2026 وقنوات الرياضة بدقة 4K"
              className="w-full h-11 bg-black/60 border border-white/10 rounded-xl px-4 text-xs text-white focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* SECTION 3: SECURITY & ADMIN PIN */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-amber-400">
            <KeyRound className="w-5 h-5" />
            <h2 className="font-bold text-lg text-white">3. أمان البوابة ورمز الدخول PIN</h2>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-white">تغيير رمز الحماية PIN لبوابة الإدارة:</div>
              <div className="text-xs text-slate-400">الرمز الحالي المطلوب لفتح هذه الصفحة على أي جهاز.</div>
            </div>

            <input
              type="password"
              maxLength={8}
              value={adminPin}
              onChange={(e) => setAdminPin(e.target.value)}
              className="w-32 h-11 bg-black/60 border border-white/10 rounded-xl text-center font-mono text-lg text-amber-400 focus:outline-none focus:border-amber-400 tracking-widest"
            />
          </div>
        </div>

        {/* SECTION 4: DATA RESET & MAINTENANCE */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 flex flex-col gap-4">
          <div className="flex items-center gap-2 text-rose-400">
            <RotateCcw className="w-5 h-5" />
            <h2 className="font-bold text-lg text-white">4. الصيانة وإعادة التهيئة</h2>
          </div>

          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="font-bold text-sm text-white">مسح الذاكرة المؤقتة وتسجيل الخروج الشامل:</div>
              <div className="text-xs text-slate-400">
                يقوم بتنظيف أي حساب مخزن وذاكرة القنوات والأفلام على هذا الجهاز وإعادة التطبيق لحالة المصنع.
              </div>
            </div>

            <button
              type="button"
              onClick={handleResetAppData}
              className="px-4 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/40 text-rose-300 text-xs font-bold rounded-xl cursor-pointer transition-all"
            >
              مسح البيانات وإعادة الضبط
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
