import React, { useState, useEffect } from 'react';
import { 
  KeyRound, User, Lock, Sparkles, ShieldCheck, 
  AlertCircle, Wrench, Globe, ChevronDown, ChevronUp, Info, Copy
} from 'lucide-react';
import { ActivationService } from '../../services/activation.service';
import { XtreamService } from '../../services/xtream.service';
import { UserAccount } from '../../types/iptv.types';
import { SERVER_CONFIG } from '../../config/server.config';
import { spatialNav } from '../../navigation/spatialNav';

interface ActivationLoginProps {
  onLoginSuccess: (account: UserAccount) => void;
  onOpenDevPortal: () => void;
  onOpenAdminPortal?: () => void;
}

export const ActivationLogin: React.FC<ActivationLoginProps> = ({ 
  onLoginSuccess, 
  onOpenDevPortal,
  onOpenAdminPortal 
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'credentials'>('code');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [serverUrl, setServerUrl] = useState('');
  
  const [showAdvancedServer, setShowAdvancedServer] = useState(false);
  const [showDemoCodesHelp, setShowDemoCodesHelp] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [logoClicks, setLogoClicks] = useState(0);

  // Live Server Health State
  const [serverHealth, setServerHealth] = useState<{
    ok: boolean;
    latencyMs: number;
    status: number;
    serverHost: string;
  } | null>(null);
  const [isCheckingServer, setIsCheckingServer] = useState(false);

  const runServerTest = async () => {
    setIsCheckingServer(true);
    const target = serverUrl.trim() || SERVER_CONFIG.DEFAULT_PORTAL_URL;
    const res = await XtreamService.checkServerHealth(target);
    setServerHealth(res);
    setIsCheckingServer(false);
  };

  useEffect(() => {
    runServerTest();
  }, [serverUrl]);

  useEffect(() => {
    // Initial focus on first interactive input
    setTimeout(() => {
      spatialNav.setFocus('btn-tab-code');
    }, 150);
  }, []);

  const handleLogoClick = () => {
    const nextClicks = logoClicks + 1;
    setLogoClicks(nextClicks);
    if (nextClicks >= SERVER_CONFIG.DEV_TRIGGER_CLICKS) {
      setLogoClicks(0);
      onOpenDevPortal();
    }
  };

  const handleCodeLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const account = await ActivationService.activateByCode(code, serverUrl.trim() || undefined);
      onLoginSuccess(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'كود التفعيل غير مسجل أو منتهي الصلاحية');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCredentialsLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const account = await ActivationService.activateByCredentials(username, password, serverUrl.trim() || undefined);
      onLoginSuccess(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCode = (demoCode: string) => {
    setCode(demoCode);
    setErrorMsg(null);
    setTimeout(() => spatialNav.setFocus('btn-submit-code'), 100);
  };

  const fillDemoCreds = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
    setTimeout(() => spatialNav.setFocus('btn-submit-creds'), 100);
  };

  return (
    <div className="relative w-full h-full flex items-center justify-center bg-radial-vignette overflow-y-auto px-4 py-8 select-none">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-gold/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-xl bg-surface-primary/95 border border-white/10 rounded-3xl p-6 md:p-10 shadow-2xl backdrop-blur-2xl flex flex-col items-center my-auto">
        
        {/* Admin Portal Direct Trigger */}
        {onOpenAdminPortal && (
          <button
            type="button"
            onClick={onOpenAdminPortal}
            className="absolute top-4 left-4 p-2 rounded-xl bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-300 border border-white/10 transition-all cursor-pointer flex items-center gap-1 text-[11px]"
            title="بوابة المدير (Master Admin Portal) - رمز PIN"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold">Admin</span>
          </button>
        )}

        {/* App Logo & Secret Developer Portal Trigger */}
        <div 
          onClick={handleLogoClick}
          className="flex flex-col items-center cursor-pointer group mb-6 transition-transform active:scale-95"
          title="انقر 5 مرات لفتح بوابة المطور"
        >
          <div className="flex items-center gap-3.5">
            <div className="relative w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-gradient-to-tr from-nova-cyan via-purple-600 to-nova-purple p-0.5 shadow-nova-glow group-hover:scale-105 transition-all">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-7 h-7 md:w-9 md:h-9 text-nova-cyan" />
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2">
                <h1 className="text-3xl md:text-4xl font-black tracking-wider bg-gradient-to-r from-white via-cyan-100 to-nova-cyan bg-clip-text text-transparent">
                  NOVA <span className="text-nova-cyan">4K</span>
                </h1>
                <span className="text-xs font-black px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 text-white font-mono shadow-sm">
                  ULTRA
                </span>
              </div>
              <p className="text-[10px] md:text-xs font-bold text-nova-cyan tracking-widest font-mono">
                OFFICIAL SMART TV & OTT SUITE
              </p>
            </div>
          </div>
          {logoClicks > 1 && (
            <span className="text-[10px] text-amber-400 mt-2 font-mono flex items-center gap-1">
              <Wrench className="w-3 h-3" />
              المتبقي لفتح بوابة المطور: {SERVER_CONFIG.DEV_TRIGGER_CLICKS - logoClicks}
            </span>
          )}
        </div>

        {/* Live Look4k Server Connectivity Status Bar */}
        <div className="w-full flex items-center justify-between px-4 py-2.5 mb-4 bg-surface-elevated/80 border border-white/5 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <span className={`w-2.5 h-2.5 rounded-full ${
              serverHealth?.ok 
                ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' 
                : isCheckingServer 
                  ? 'bg-amber-400 animate-ping' 
                  : 'bg-rose-500'
            }`} />
            <div className="text-right">
              <span className="text-slate-400 text-[10px] block leading-tight">بوابة سيرفر NOVA 4K ULTRA الرسمية:</span>
              <span className="font-mono text-accent-cyan text-xs font-bold">
                {(serverUrl.trim() || SERVER_CONFIG.DEFAULT_PORTAL_URL).replace(/^https?:\/\//, '')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isCheckingServer ? (
              <span className="text-slate-400 font-mono text-[11px]">جاري الفحص...</span>
            ) : serverHealth?.ok ? (
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                <span className="font-sans font-bold text-[11px]">متصل</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[10px]">
                  {serverHealth.latencyMs}ms
                </span>
              </div>
            ) : (
              <span className="text-rose-400 font-sans text-[11px]">غير متاح</span>
            )}

            <button
              type="button"
              onClick={runServerTest}
              disabled={isCheckingServer}
              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-lg text-[10px] transition-all cursor-pointer"
              title="إعادة فحص استجابة السيرفر"
            >
              فحص
            </button>
          </div>
        </div>

        {/* Auth Mode Tabs (Code vs Credentials) */}
        <div className="w-full grid grid-cols-2 gap-2 p-1 bg-surface-elevated rounded-2xl mb-5 border border-white/5">
          <button
            data-nav-id="btn-tab-code"
            data-nav-group="auth-tabs"
            onClick={() => { setActiveTab('code'); spatialNav.setFocus('input-code'); setErrorMsg(null); }}
            className={`tv-focusable flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm md:text-base transition-all ${
              activeTab === 'code' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-accent-cyan border border-accent-cyan/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4 md:w-5 md:h-5" />
            <span>كود التفعيل</span>
          </button>

          <button
            data-nav-id="btn-tab-creds"
            data-nav-group="auth-tabs"
            onClick={() => { setActiveTab('credentials'); spatialNav.setFocus('input-user'); setErrorMsg(null); }}
            className={`tv-focusable flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm md:text-base transition-all ${
              activeTab === 'credentials' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-accent-cyan border border-accent-cyan/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4 md:w-5 md:h-5" />
            <span>اسم المستخدم والرمز</span>
          </button>
        </div>

        {/* Error Notification Banner */}
        {errorMsg && (
          <div className="w-full flex items-start gap-3 p-3.5 mb-4 bg-rose-950/70 border border-rose-500/50 rounded-2xl text-rose-200 text-xs md:text-sm font-semibold animate-in fade-in zoom-in duration-150">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-right">
              <span>{errorMsg}</span>
            </div>
          </div>
        )}

        {/* TAB 1: Activation Code Mode */}
        {activeTab === 'code' && (
          <div className="w-full flex flex-col items-center gap-4">
            <div className="w-full">
              <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-2 text-right">
                أدخل كود التفعيل المعتمد لاشتراكك:
              </label>
              <div className="relative">
                <input
                  data-nav-id="input-code"
                  type="text"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setErrorMsg(null); }}
                  placeholder="مثال: 882419"
                  className="tv-focusable w-full h-14 md:h-16 bg-surface-elevated/90 border-2 border-white/10 rounded-2xl px-6 text-center text-2xl md:text-3xl font-mono tracking-widest text-accent-cyan placeholder:text-slate-600 focus:outline-none focus:border-accent-cyan"
                />
                <KeyRound className="absolute right-4 top-4 md:top-5 w-5 h-5 text-slate-500" />
              </div>
              <p className="text-[11px] text-slate-500 mt-2 text-right leading-relaxed">
                * يتم التحقق الصارم من الكود، ولن يقبل النظام أي أرقام عشوائية غير مفعلة.
              </p>
            </div>

            {/* Demo Codes Helper Toggle (To let tester test real authorized codes) */}
            <div className="w-full">
              <button
                type="button"
                onClick={() => setShowDemoCodesHelp(!showDemoCodesHelp)}
                className="w-full text-right text-xs text-accent-cyan hover:underline flex items-center justify-between py-1 px-1"
              >
                <span className="flex items-center gap-1.5 font-bold">
                  <Info className="w-3.5 h-3.5" />
                  <span>عرض الأكواد المعتمدة في النظام للتجربة</span>
                </span>
                {showDemoCodesHelp ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>

              {showDemoCodesHelp && (
                <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10 space-y-2 text-right text-xs">
                  <div 
                    onClick={() => fillDemoCode('NOVA-4K')}
                    className="p-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-mono font-bold text-nova-cyan">NOVA-4K</div>
                      <div className="text-[11px] text-slate-300">باقة NOVA 4K ULTRA الملكية (365 يوم)</div>
                    </div>
                    <Copy className="w-4 h-4 text-nova-cyan" />
                  </div>

                  <div 
                    onClick={() => fillDemoCode('NOVA-ULTRA')}
                    className="p-2.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-mono font-bold text-purple-300">NOVA-ULTRA</div>
                      <div className="text-[11px] text-slate-300">باقة NOVA 4K Ultra سينما ورياضة (180 يوم)</div>
                    </div>
                    <Copy className="w-4 h-4 text-purple-300" />
                  </div>

                  <div 
                    onClick={() => fillDemoCode('882419')}
                    className="p-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-mono font-bold text-sky-400">882419</div>
                      <div className="text-[11px] text-slate-300">كود الدخول السريع VIP (365 يوم)</div>
                    </div>
                    <Copy className="w-4 h-4 text-sky-400" />
                  </div>

                  <div 
                    onClick={() => fillDemoCode('DEMO-2026')}
                    className="p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 flex items-center justify-between cursor-pointer"
                  >
                    <div>
                      <div className="font-mono font-bold text-amber-400">DEMO-2026</div>
                      <div className="text-[11px] text-slate-300">حساب تجريبي رسمي (48 ساعة)</div>
                    </div>
                    <Copy className="w-4 h-4 text-amber-400" />
                  </div>
                </div>
              )}
            </div>

            {/* Optional Advanced Server Toggle (Hidden if Admin enforces Unified DNS) */}
            {!SERVER_CONFIG.isServerUrlHidden() && (
              <div className="w-full">
                <button
                  data-nav-id="btn-toggle-advanced-server-code"
                  type="button"
                  onClick={() => setShowAdvancedServer(!showAdvancedServer)}
                  className="tv-focusable text-xs text-slate-400 hover:text-accent-cyan flex items-center gap-1.5 py-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>إعدادات خادم مخصص (اختياري لسيرفرات Xtream الخارجية)</span>
                  {showAdvancedServer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvancedServer && (
                  <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">عنوان خادم IPTV (Server URL):</label>
                    <input
                      data-nav-id="input-server-url-code"
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://my-iptv-server.com:8080"
                      className="tv-focusable w-full h-11 bg-black/50 border border-white/10 rounded-xl px-4 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-accent-cyan"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              data-nav-id="btn-submit-code"
              onClick={handleCodeLogin}
              disabled={isLoading || !code.trim()}
              className="tv-focusable w-full h-13 md:h-14 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base md:text-lg rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all mt-1 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                  <span>تفعيل الدخول والبدء</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* TAB 2: Username & Password Mode */}
        {activeTab === 'credentials' && (
          <div className="w-full flex flex-col gap-3.5">
            <div>
              <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1 text-right">اسم المستخدم (Username)</label>
              <div className="relative">
                <input
                  data-nav-id="input-user"
                  type="text"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrorMsg(null); }}
                  placeholder="Username"
                  className="tv-focusable w-full h-12 md:h-13 bg-surface-elevated border-2 border-white/10 rounded-2xl px-5 text-sm md:text-base font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-accent-cyan text-right"
                />
                <User className="absolute left-4 top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-500" />
              </div>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-semibold text-slate-300 mb-1 text-right">كلمة المرور (Password)</label>
              <div className="relative">
                <input
                  data-nav-id="input-pass"
                  type="password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                  placeholder="••••••••"
                  className="tv-focusable w-full h-12 md:h-13 bg-surface-elevated border-2 border-white/10 rounded-2xl px-5 text-sm md:text-base font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-accent-cyan text-right"
                />
                <Lock className="absolute left-4 top-3.5 w-4 h-4 md:w-5 md:h-5 text-slate-500" />
              </div>
            </div>

            {/* Quick Demo Credential Button */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => fillDemoCreds('vip_user', 'pass7788')}
                className="text-xs text-accent-cyan hover:underline inline-flex items-center gap-1 font-bold"
              >
                <Info className="w-3 h-3" />
                <span>تجربة حساب VIP الافتراضي (vip_user / pass7788)</span>
              </button>
            </div>

            {/* Optional Advanced Server Toggle for Credentials (Hidden if Admin enforces Unified DNS) */}
            {!SERVER_CONFIG.isServerUrlHidden() && (
              <div>
                <button
                  data-nav-id="btn-toggle-advanced-server-creds"
                  type="button"
                  onClick={() => setShowAdvancedServer(!showAdvancedServer)}
                  className="tv-focusable text-xs text-slate-400 hover:text-accent-cyan flex items-center gap-1.5 py-1"
                >
                  <Globe className="w-3.5 h-3.5" />
                  <span>إعدادات خادم مخصص (Server URL)</span>
                  {showAdvancedServer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>

                {showAdvancedServer && (
                  <div className="mt-2 p-3 rounded-2xl bg-white/5 border border-white/10">
                    <label className="block text-xs font-semibold text-slate-300 mb-1 text-right">عنوان خادم Xtream (Portal URL):</label>
                    <input
                      data-nav-id="input-server-url-creds"
                      type="text"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://my-iptv-server.com:8080"
                      className="tv-focusable w-full h-11 bg-black/50 border border-white/10 rounded-xl px-4 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-accent-cyan text-left"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              data-nav-id="btn-submit-creds"
              onClick={handleCredentialsLogin}
              disabled={isLoading || !username.trim() || !password.trim()}
              className="tv-focusable w-full h-13 md:h-14 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-base md:text-lg rounded-2xl flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 active:scale-95 disabled:opacity-50 transition-all mt-1 cursor-pointer"
            >
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 md:w-6 md:h-6" />
                  <span>تسجيل الدخول</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer Info */}
        <div className="w-full mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-500 font-mono">
          <span>{SERVER_CONFIG.APP_NAME} v{SERVER_CONFIG.APP_VERSION}</span>
          <span className="flex items-center gap-1.5 text-accent-cyan/90 font-sans">
            <span className="w-2 h-2 rounded-full bg-accent-cyan animate-pulse"></span>
            نظام التشفير والتحقق الصارم نشط
          </span>
        </div>
      </div>
    </div>
  );
};
