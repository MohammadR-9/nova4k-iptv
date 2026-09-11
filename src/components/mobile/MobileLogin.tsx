import React, { useState, useEffect } from 'react';
import { 
  KeyRound, User, Sparkles, ShieldCheck, 
  AlertCircle, Globe, ChevronDown, ChevronUp, Eye, EyeOff,
  Tv, ArrowRight, Zap
} from 'lucide-react';
import { ActivationService } from '../../services/activation.service';
import { XtreamService } from '../../services/xtream.service';
import { UserAccount } from '../../types/iptv.types';
import { SERVER_CONFIG } from '../../config/server.config';

interface MobileLoginProps {
  onLoginSuccess: (account: UserAccount) => void;
  onOpenAdminPortal?: () => void;
  onSwitchToTvMode?: () => void;
}

export const MobileLogin: React.FC<MobileLoginProps> = ({ 
  onLoginSuccess, 
  onOpenAdminPortal,
  onSwitchToTvMode
}) => {
  const [activeTab, setActiveTab] = useState<'code' | 'credentials'>('code');
  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [serverUrl, setServerUrl] = useState('');
  const [showAdvancedServer, setShowAdvancedServer] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Live Server Health
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

  // Handle Login via Code
  const handleCodeLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!code.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const targetServer = serverUrl.trim() || undefined;
      const account = await ActivationService.activateByCode(code.trim(), targetServer);
      onLoginSuccess(account);
    } catch (err: any) {
      setErrorMsg(err.message || 'كود التفعيل غير صحيح أو انتهت صلاحيته');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Login via Credentials
  const handleCredentialsLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setIsLoading(true);
    setErrorMsg(null);

    try {
      const targetServer = serverUrl.trim() || undefined;
      const account = await ActivationService.activateByCredentials(
        username.trim(), 
        password.trim(), 
        targetServer
      );
      onLoginSuccess(account);
    } catch (err: any) {
      setErrorMsg(err.message || 'بيانات الدخول غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCode = (demoCode: string) => {
    setCode(demoCode);
    setErrorMsg(null);
  };

  const fillDemoCreds = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setErrorMsg(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#07090e] text-white flex flex-col justify-between px-4 py-6 overflow-y-auto selection:bg-cyan-500/30">
      {/* Ambient background glows */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10" />
      <div className="fixed bottom-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Top Header Bar */}
      <div className="w-full flex items-center justify-between pb-4">
        {onOpenAdminPortal && (
          <button
            type="button"
            onClick={onOpenAdminPortal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-slate-300 active:scale-95 transition-all"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono font-bold">Admin</span>
          </button>
        )}

        {onSwitchToTvMode && (
          <button
            type="button"
            onClick={onSwitchToTvMode}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-xs text-cyan-300 font-bold active:scale-95 transition-all mr-auto"
            title="تبديل إلى واجهة التلفاز الكبيرة"
          >
            <Tv className="w-3.5 h-3.5" />
            <span>واجهة TV</span>
          </button>
        )}
      </div>

      {/* Center Content / Form */}
      <div className="w-full max-w-md mx-auto my-auto flex flex-col items-center">
        {/* App Logo & Branding */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="relative w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-400 via-blue-600 to-purple-600 p-0.5 shadow-lg shadow-cyan-500/25 mb-3">
            <div className="w-full h-full bg-[#0c1017] rounded-[14px] flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-cyan-400 animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-400 bg-clip-text text-transparent">
              NOVA <span className="text-cyan-400">4K</span>
            </h1>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-gradient-to-r from-purple-600 to-cyan-500 text-white font-mono">
              ULTRA
            </span>
          </div>
          <p className="text-[11px] font-semibold text-cyan-400/80 tracking-wider mt-1">
            مشغل IPTV الذكي للموبايل والشاشات
          </p>
        </div>

        {/* Server Status Pill */}
        <div className="w-full flex items-center justify-between px-3.5 py-2 mb-4 bg-white/5 border border-white/10 rounded-xl text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              serverHealth?.ok ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
            }`} />
            <span className="text-slate-300 font-mono text-[11px] truncate max-w-[200px]">
              {(serverUrl.trim() || SERVER_CONFIG.DEFAULT_PORTAL_URL).replace(/^https?:\/\//, '')}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            {serverHealth?.ok && (
              <span className="text-[10px] text-emerald-400 font-mono">
                {serverHealth.latencyMs}ms
              </span>
            )}
            <button
              type="button"
              onClick={runServerTest}
              disabled={isCheckingServer}
              className="text-[10px] text-cyan-400 hover:underline font-bold px-1"
            >
              {isCheckingServer ? 'فحص...' : 'فحص'}
            </button>
          </div>
        </div>

        {/* Mode Selector (Tabs) */}
        <div className="w-full grid grid-cols-2 p-1 bg-white/5 rounded-xl mb-4 border border-white/10">
          <button
            type="button"
            onClick={() => { setActiveTab('code'); setErrorMsg(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'code' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>كود التفعيل</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('credentials'); setErrorMsg(null); }}
            className={`flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold text-xs transition-all ${
              activeTab === 'credentials' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-400 border border-cyan-500/30 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>اسم المستخدم والرمز</span>
          </button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="w-full flex items-center gap-2.5 p-3 mb-4 bg-rose-950/70 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-semibold animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* TAB 1: Code Login */}
        {activeTab === 'code' && (
          <form onSubmit={handleCodeLogin} className="w-full flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                أدخل كود التفعيل المعتمد:
              </label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="text"
                  autoCapitalize="characters"
                  value={code}
                  onChange={(e) => { setCode(e.target.value); setErrorMsg(null); }}
                  placeholder="مثال: NOVA-4K أو 882419"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-center font-mono font-bold text-lg text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all"
                />
                <KeyRound className="absolute right-3.5 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* Quick Test Codes Pills */}
            <div className="w-full pt-1">
              <span className="text-[10px] text-slate-400 font-bold block mb-1.5 text-right">
                أكواد جاهزة للتجربة الفورية بنقرة واحدة:
              </span>
              <div className="flex flex-wrap gap-1.5 justify-end">
                {[
                  { label: 'NOVA-4K', badge: 'باقة VIP' },
                  { label: '882419', badge: 'كود تجربة' },
                  { label: 'DEMO-2026', badge: 'تجريبي' }
                ].map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => fillDemoCode(item.label)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-[11px] font-mono font-bold text-cyan-300 active:scale-95 transition-all"
                  >
                    <Zap className="w-3 h-3 text-cyan-400" />
                    <span>{item.label}</span>
                    <span className="text-[9px] text-slate-400">({item.badge})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Advanced Server Toggle */}
            {!SERVER_CONFIG.isServerUrlHidden() && (
              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedServer(!showAdvancedServer)}
                  className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-cyan-300 py-1"
                >
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>إعدادات خادم مخصص (Server URL)</span>
                  </span>
                  {showAdvancedServer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showAdvancedServer && (
                  <div className="mt-2 p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <input
                      type="url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://example.com:8080"
                      className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !code.trim()}
              className="w-full h-12 mt-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:brightness-110 active:scale-[0.98] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تفعيل الدخول والبدء</span>
                  <ArrowRight className="w-4 h-4 mr-1" />
                </>
              )}
            </button>
          </form>
        )}

        {/* TAB 2: Credentials Login */}
        {activeTab === 'credentials' && (
          <form onSubmit={handleCredentialsLogin} className="w-full flex flex-col gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                اسم المستخدم (Username)
              </label>
              <div className="relative">
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value); setErrorMsg(null); }}
                  placeholder="Username"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 text-right"
                />
                <User className="absolute left-3.5 top-3.5 w-5 h-5 text-slate-500 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 text-right">
                كلمة المرور (Password)
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(null); }}
                  placeholder="••••••••"
                  className="w-full h-12 bg-white/5 border border-white/10 rounded-xl px-4 text-sm font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-400 text-right"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-3.5 top-3.5 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Quick Demo Credential Pill */}
            <div className="w-full text-right pt-0.5">
              <button
                type="button"
                onClick={() => fillDemoCreds('vip_user', 'pass7788')}
                className="text-[11px] text-cyan-400 hover:underline inline-flex items-center gap-1 font-bold"
              >
                <Zap className="w-3 h-3" />
                <span>تجربة حساب VIP (vip_user / pass7788)</span>
              </button>
            </div>

            {/* Advanced Server Toggle */}
            {!SERVER_CONFIG.isServerUrlHidden() && (
              <div className="w-full pt-1">
                <button
                  type="button"
                  onClick={() => setShowAdvancedServer(!showAdvancedServer)}
                  className="w-full flex items-center justify-between text-[11px] text-slate-400 hover:text-cyan-300 py-1"
                >
                  <span className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5" />
                    <span>عنوان خادم IPTV مخصص (Portal URL)</span>
                  </span>
                  {showAdvancedServer ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
                {showAdvancedServer && (
                  <div className="mt-2 p-2.5 bg-white/5 rounded-xl border border-white/10">
                    <input
                      type="url"
                      value={serverUrl}
                      onChange={(e) => setServerUrl(e.target.value)}
                      placeholder="http://example.com:8080"
                      className="w-full h-10 bg-black/40 border border-white/10 rounded-lg px-3 text-xs font-mono text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 text-left"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading || !username.trim() || !password.trim()}
              className="w-full h-12 mt-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-purple-600 hover:brightness-110 active:scale-[0.98] text-white font-black text-sm rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 disabled:opacity-50 transition-all cursor-pointer"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>تسجيل الدخول</span>
                  <ArrowRight className="w-4 h-4 mr-1" />
                </>
              )}
            </button>
          </form>
        )}
      </div>

      {/* Bottom Safe Area & Version */}
      <div className="w-full text-center pt-4 text-[10px] text-slate-500 font-mono">
        {SERVER_CONFIG.APP_NAME} Mobile Edition • v{SERVER_CONFIG.APP_VERSION}
      </div>
    </div>
  );
};
