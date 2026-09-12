import React, { useState, useEffect } from 'react';
import { 
  KeyRound, User, Lock, Sparkles, ShieldCheck, 
  AlertCircle, Wrench, Globe, ChevronDown, ChevronUp,
  Users, Trash2, Play, Plus, Shield, Edit3, Check, X
} from 'lucide-react';
import { ActivationService } from '../../services/activation.service';
import { XtreamService } from '../../services/xtream.service';
import { UserAccount, UserProfile } from '../../types/iptv.types';
import { SERVER_CONFIG } from '../../config/server.config';
import { spatialNav } from '../../navigation/spatialNav';
import { UrlHistoryService, SavedServer } from '../../services/urlHistory.service';
import { ProfileService } from '../../services/profile.service';

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
  const [profiles, setProfiles] = useState<UserProfile[]>(() => ProfileService.getProfiles());
  const [activeTab, setActiveTab] = useState<'profiles' | 'code' | 'credentials'>(() => {
    return ProfileService.getProfiles().length > 0 ? 'profiles' : 'code';
  });
  const [loadingProfileId, setLoadingProfileId] = useState<string | null>(null);
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  const [code, setCode] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [urlHistory, setUrlHistory] = useState<SavedServer[]>(() => UrlHistoryService.getHistory());
  
  // Load primary server url from saved history or fallback to master default
  const [serverUrl, setServerUrl] = useState(() => {
    const hist = UrlHistoryService.getHistory();
    return hist[0]?.url || SERVER_CONFIG.getMasterDns();
  });
  
  const [showAdvancedServer, setShowAdvancedServer] = useState(false);

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
      const targetServer = serverUrl.trim() || undefined;
      if (targetServer) {
        UrlHistoryService.saveUrl(targetServer);
        setUrlHistory(UrlHistoryService.getHistory());
      }
      const account = await ActivationService.activateByCode(code, targetServer);
      // Auto-save subscription as profile
      ProfileService.autoSaveAccount(account, {
        code: code.trim().toUpperCase(),
        serverUrl: targetServer
      });
      setProfiles(ProfileService.getProfiles());
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
      const targetServer = serverUrl.trim() || undefined;
      if (targetServer) {
        UrlHistoryService.saveUrl(targetServer);
        setUrlHistory(UrlHistoryService.getHistory());
      }
      const account = await ActivationService.activateByCredentials(username, password, targetServer);
      // Auto-save subscription as profile
      ProfileService.autoSaveAccount(account, {
        username: username.trim(),
        password: password.trim(),
        serverUrl: targetServer
      });
      setProfiles(ProfileService.getProfiles());
      onLoginSuccess(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileLogin = async (prof: UserProfile) => {
    setIsLoading(true);
    setLoadingProfileId(prof.id);
    setErrorMsg(null);
    try {
      let account: UserAccount;
      if (prof.authType === 'code' && prof.code) {
        account = await ActivationService.activateByCode(prof.code, prof.serverUrl);
      } else if (prof.authType === 'credentials' && prof.username && prof.password) {
        account = await ActivationService.activateByCredentials(prof.username, prof.password, prof.serverUrl);
      } else {
        throw new Error('بيانات البروفايل غير مكتملة، يرجى إعادة إدخالها.');
      }
      ProfileService.touchProfile(prof.id);
      setProfiles(ProfileService.getProfiles());
      onLoginSuccess(account);
    } catch (err: any) {
      setErrorMsg(err?.message || 'فشل تسجيل الدخول بهذا البروفايل، يرجى التأكد من صلاحية الاشتراك أو اتصال السيرفر');
    } finally {
      setIsLoading(false);
      setLoadingProfileId(null);
    }
  };

  const handleDeleteProfile = (profileId: string) => {
    ProfileService.deleteProfile(profileId);
    const updated = ProfileService.getProfiles();
    setProfiles(updated);
    setProfileToDelete(null);
    if (updated.length === 0) {
      setActiveTab('code');
    }
  };

  const handleSaveRename = (profileId: string) => {
    if (editingName.trim()) {
      ProfileService.renameProfile(profileId, editingName.trim());
      setProfiles(ProfileService.getProfiles());
    }
    setEditingProfileId(null);
    setEditingName('');
  };

  return (
    <div className="relative w-full max-w-full h-full min-h-[100dvh] flex items-center justify-center bg-radial-vignette overflow-x-hidden overflow-y-auto px-4 sm:px-6 py-6 sm:py-8 select-none touch-pan-y overscroll-x-none">
      {/* Background Ambient Glow (Strictly Clipped) */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-accent-cyan/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent-gold/5 rounded-full blur-3xl pointer-events-none"></div>
      </div>

      {/* Main Login Card */}
      <div className="relative w-full max-w-[92vw] sm:max-w-xl bg-surface-primary/95 border border-white/10 rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-10 shadow-2xl backdrop-blur-2xl flex flex-col items-center my-auto">
        
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

        {/* Auth Mode Tabs (Profiles vs Code vs Credentials) */}
        <div className="w-full grid grid-cols-3 gap-1.5 p-1 bg-surface-elevated rounded-2xl mb-5 border border-white/5">
          <button
            data-nav-id="btn-tab-profiles"
            data-nav-group="auth-tabs"
            onClick={() => { setActiveTab('profiles'); setErrorMsg(null); }}
            className={`tv-focusable flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all ${
              activeTab === 'profiles' 
                ? 'bg-gradient-to-r from-purple-500/25 to-indigo-500/25 text-purple-300 border border-purple-400/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>البروفايلات ({profiles.length})</span>
          </button>

          <button
            data-nav-id="btn-tab-code"
            data-nav-group="auth-tabs"
            onClick={() => { setActiveTab('code'); spatialNav.setFocus('input-code'); setErrorMsg(null); }}
            className={`tv-focusable flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all ${
              activeTab === 'code' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-accent-cyan border border-accent-cyan/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>كود التفعيل</span>
          </button>

          <button
            data-nav-id="btn-tab-creds"
            data-nav-group="auth-tabs"
            onClick={() => { setActiveTab('credentials'); spatialNav.setFocus('input-user'); setErrorMsg(null); }}
            className={`tv-focusable flex items-center justify-center gap-1.5 py-2.5 sm:py-3 rounded-xl font-bold text-xs sm:text-sm md:text-base transition-all ${
              activeTab === 'credentials' 
                ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-accent-cyan border border-accent-cyan/40 shadow-sm' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User className="w-4 h-4" />
            <span>اسم المستخدم</span>
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

        {/* TAB 0: Saved Profiles List */}
        {activeTab === 'profiles' && (
          <div className="w-full flex flex-col gap-3">
            <div className="flex items-center justify-between mb-1 px-1">
              <span className="text-xs text-slate-400 font-bold">اختر بروفايلك للدخول الفوري:</span>
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className="text-[11px] font-bold text-nova-cyan hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>إضافة اشتراك جديد</span>
              </button>
            </div>

            {profiles.length === 0 ? (
              <div className="py-8 px-4 flex flex-col items-center justify-center text-center bg-white/5 border border-white/10 rounded-2xl">
                <div className="w-12 h-12 rounded-2xl bg-nova-purple/20 border border-nova-purple/30 flex items-center justify-center text-nova-purple mb-2.5">
                  <Users className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-white mb-1">لا توجد بروفايلات محفوظة حتى الآن</h4>
                <p className="text-xs text-slate-400 max-w-xs mb-3">
                  سجل الدخول بأي كود أو حساب اشتراك وسيتم حفظه هنا تلقائياً لتبديل سهل وسريع
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('code')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-nova-cyan to-blue-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
                >
                  <KeyRound className="w-4 h-4" />
                  <span>تسجيل الدخول بكود تفعيل</span>
                </button>
              </div>
            ) : (
            <div className="max-h-[350px] overflow-y-auto space-y-2.5 pr-1">
              {profiles.map((prof, idx) => (
                <div
                  key={prof.id}
                  className="group relative w-full bg-surface-elevated/90 hover:bg-white/10 border border-white/10 hover:border-nova-cyan/50 rounded-2xl p-3 sm:p-4 transition-all flex items-center justify-between gap-2.5 shadow-md select-none"
                >
                  {/* Left: Quick Actions (Login Button & Delete) */}
                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                    {/* Delete button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setProfileToDelete(prof);
                      }}
                      className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 hover:border-red-500/40 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                      title="حذف هذا البروفايل"
                    >
                      <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </button>

                    {/* Quick Login Button */}
                    <button
                      data-nav-id={`btn-profile-login-${idx}`}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleProfileLogin(prof)}
                      className="px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                    >
                      {loadingProfileId === prof.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Play className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-current" />
                          <span>دخول</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Right: Profile Info */}
                  <div 
                    onClick={() => handleProfileLogin(prof)} 
                    className="flex items-center gap-2.5 sm:gap-3 cursor-pointer flex-1 text-right justify-end overflow-hidden"
                  >
                    <div className="flex flex-col items-end overflow-hidden flex-1">
                      {editingProfileId === prof.id ? (
                        <div 
                          className="flex items-center gap-1.5 w-full justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={() => handleSaveRename(prof.id)}
                            className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                            title="حفظ الاسم"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditingProfileId(null); setEditingName(''); }}
                            className="p-1 rounded-lg bg-white/10 text-slate-400 hover:text-white"
                            title="إلغاء"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            className="h-8 bg-black/60 border border-nova-cyan/50 rounded-lg px-2 text-xs text-white text-right font-bold focus:outline-none w-36 sm:w-48"
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(prof.id);
                              if (e.key === 'Escape') setEditingProfileId(null);
                            }}
                          />
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 max-w-full justify-end">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingProfileId(prof.id);
                              setEditingName(prof.name);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white transition-opacity"
                            title="تعديل اسم البروفايل"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <span className="text-white font-black text-xs sm:text-sm md:text-base truncate">
                            {prof.name}
                          </span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-cyan-300 font-mono shrink-0">
                            {prof.authType === 'code' ? 'كود' : 'حساب'}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
                        {prof.daysRemaining !== undefined && (
                          <span className="text-nova-gold font-bold">
                            {prof.daysRemaining} يوم
                          </span>
                        )}
                        {prof.serverUrl && (
                          <span className="truncate max-w-[100px] sm:max-w-[160px] text-slate-500">
                            • {prof.serverUrl.replace(/^https?:\/\//, '')}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Profile Avatar Icon */}
                    <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600/30 to-cyan-500/30 border border-white/10 flex items-center justify-center text-nova-cyan shrink-0">
                      <Shield className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}

            {/* Switch to add new profile */}
            <div className="w-full pt-2 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setActiveTab('code')}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <KeyRound className="w-3.5 h-3.5 text-nova-cyan" />
                <span>إضافة بكود تفعيل</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('credentials')}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <User className="w-3.5 h-3.5 text-nova-cyan" />
                <span>إضافة باسم مستخدم</span>
              </button>
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

                    {/* Saved Servers Pills */}
                    <div className="mt-2.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1 text-right">
                        سجل السيرفرات السابقة المحفوظة:
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {urlHistory.map((srv) => (
                          <button
                            key={srv.url}
                            type="button"
                            onClick={() => {
                              setServerUrl(srv.url);
                              UrlHistoryService.saveUrl(srv.url);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                              serverUrl.trim().toLowerCase() === srv.url.toLowerCase()
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {srv.name || srv.url.replace(/^https?:\/\//, '')}
                          </button>
                        ))}
                      </div>
                    </div>
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

                    {/* Saved Servers Pills */}
                    <div className="mt-2.5 pt-2 border-t border-white/5">
                      <span className="text-[10px] text-slate-400 font-bold block mb-1 text-right">
                        سجل السيرفرات السابقة المحفوظة:
                      </span>
                      <div className="flex flex-wrap gap-1.5 justify-end">
                        {urlHistory.map((srv) => (
                          <button
                            key={srv.url}
                            type="button"
                            onClick={() => {
                              setServerUrl(srv.url);
                              UrlHistoryService.saveUrl(srv.url);
                            }}
                            className={`px-2 py-1 rounded-lg text-[10px] font-mono border transition-all ${
                              serverUrl.trim().toLowerCase() === srv.url.toLowerCase()
                                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 font-bold'
                                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                          >
                            {srv.name || srv.url.replace(/^https?:\/\//, '')}
                          </button>
                        ))}
                      </div>
                    </div>
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

      {/* Delete Profile Confirmation Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
          <div className="w-full max-w-sm bg-surface-primary border border-white/10 rounded-3xl p-6 text-center shadow-2xl flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 text-red-400 flex items-center justify-center">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-lg font-black text-white mb-1.5">تأكيد حذف البروفايل</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                هل ترغب فعلاً في حذف بروفايل <span className="text-nova-cyan font-bold">«{profileToDelete.name}»</span>؟ لن يتم إلغاء اشتراكك من السيرفر، ولكن سيتم إزالته من قائمتك السريعة على هذا الجهاز.
              </p>
            </div>
            <div className="w-full flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={() => handleDeleteProfile(profileToDelete.id)}
                className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition-all cursor-pointer shadow-lg shadow-red-600/30 active:scale-95"
              >
                تأكيد الحذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
