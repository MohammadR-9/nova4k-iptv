import React, { useState, useEffect } from 'react';
import { 
  Users, Plus, Trash2, Edit3, Check, X, 
  Play, ShieldCheck, Key, Globe, Calendar, AlertTriangle, Loader2, Keyboard 
} from 'lucide-react';
import { UserAccount, UserProfile } from '../../types/iptv.types';
import { ProfileService } from '../../services/profile.service';
import { ActivationService } from '../../services/activation.service';
import { SERVER_CONFIG } from '../../config/server.config';
import { VirtualKeyboardModal } from '../common/VirtualKeyboardModal';

interface ProfilesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: UserAccount | null;
  onSwitchAccount: (newAccount: UserAccount) => void;
  onLogout: () => void;
}

export const ProfilesModal: React.FC<ProfilesModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  onSwitchAccount,
  onLogout
}) => {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<'list' | 'add'>('list');
  const [addMode, setAddMode] = useState<'code' | 'credentials'>('code');

  // Add form states
  const [newCode, setNewCode] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newServerUrl, setNewServerUrl] = useState(SERVER_CONFIG.DEFAULT_PORTAL_URL);
  const [newProfileName, setNewProfileName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Edit profile name state
  const [editingProfileId, setEditingProfileId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Delete confirm state
  const [profileToDelete, setProfileToDelete] = useState<UserProfile | null>(null);

  // Virtual Keyboard state
  const [activeKeyboardField, setActiveKeyboardField] = useState<{
    id: 'name' | 'server' | 'code' | 'user' | 'pass' | 'rename';
    title: string;
    placeholder: string;
    isPassword?: boolean;
    initialValue: string;
  } | null>(null);

  const openVirtualKeyboard = (
    fieldId: 'name' | 'server' | 'code' | 'user' | 'pass' | 'rename',
    title: string,
    placeholder: string,
    initialValue: string,
    isPassword = false
  ) => {
    setActiveKeyboardField({ id: fieldId, title, placeholder, initialValue, isPassword });
  };

  const handleKeyboardSubmit = (val: string) => {
    if (!activeKeyboardField) return;
    if (activeKeyboardField.id === 'name') setNewProfileName(val);
    else if (activeKeyboardField.id === 'server') setNewServerUrl(val);
    else if (activeKeyboardField.id === 'code') setNewCode(val);
    else if (activeKeyboardField.id === 'user') setNewUsername(val);
    else if (activeKeyboardField.id === 'pass') setNewPassword(val);
    else if (activeKeyboardField.id === 'rename') setEditingName(val);
    setActiveKeyboardField(null);
  };

  // Load profiles on mount or when opened
  const reloadProfiles = () => {
    const list = ProfileService.getProfiles();
    setProfiles(list);
  };

  useEffect(() => {
    if (isOpen) {
      reloadProfiles();
      setActiveTab('list');
      setErrorMessage('');
      setProfileToDelete(null);
      setEditingProfileId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle switching to a profile
  const handleSelectProfile = async (prof: UserProfile) => {
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      let acc: UserAccount;
      if (prof.authType === 'code' && (prof.code || prof.username)) {
        acc = await ActivationService.activateByCode(
          (prof.code || prof.username)!, 
          prof.serverUrl || SERVER_CONFIG.DEFAULT_PORTAL_URL
        );
      } else if (prof.username && prof.password) {
        acc = await ActivationService.activateByCredentials(
          prof.username,
          prof.password,
          prof.serverUrl || SERVER_CONFIG.DEFAULT_PORTAL_URL
        );
      } else {
        throw new Error('بيانات هذا البروفايل غير مكتملة.');
      }

      ProfileService.touchProfile(prof.id);
      onSwitchAccount(acc);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل تسجيل الدخول بهذا البروفايل.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle saving new profile
  const handleAddNewProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMessage('');
    try {
      let acc: UserAccount;
      if (addMode === 'code') {
        if (!newCode.trim()) {
          throw new Error('يرجى إدخال كود التفعيل.');
        }
        acc = await ActivationService.activateByCode(newCode.trim(), newServerUrl.trim());
        ProfileService.autoSaveAccount(acc, {
          code: newCode.trim(),
          serverUrl: newServerUrl.trim(),
          name: newProfileName.trim() || undefined
        });
      } else {
        if (!newUsername.trim() || !newPassword.trim()) {
          throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور.');
        }
        acc = await ActivationService.activateByCredentials(
          newUsername.trim(),
          newPassword.trim(),
          newServerUrl.trim()
        );
        ProfileService.autoSaveAccount(acc, {
          username: newUsername.trim(),
          password: newPassword.trim(),
          serverUrl: newServerUrl.trim(),
          name: newProfileName.trim() || undefined
        });
      }

      // Reset form
      setNewCode('');
      setNewUsername('');
      setNewPassword('');
      setNewProfileName('');

      onSwitchAccount(acc);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'فشل تفعيل الاشتراك الجديد.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle rename
  const handleStartRename = (prof: UserProfile) => {
    setEditingProfileId(prof.id);
    setEditingName(prof.name);
  };

  const handleSaveRename = (id: string) => {
    if (editingName.trim()) {
      ProfileService.renameProfile(id, editingName.trim());
      reloadProfiles();
    }
    setEditingProfileId(null);
  };

  // Handle delete
  const handleConfirmDelete = () => {
    if (!profileToDelete) return;
    ProfileService.deleteProfile(profileToDelete.id);
    const updated = ProfileService.getProfiles();
    setProfiles(updated);
    
    // If deleted the current active profile
    const isCurrent = currentAccount && (
      profileToDelete.username?.toLowerCase() === currentAccount.username?.toLowerCase() ||
      profileToDelete.code?.toUpperCase() === currentAccount.password?.toUpperCase()
    );

    setProfileToDelete(null);

    if (isCurrent) {
      onLogout();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-3 sm:p-6 select-none animate-in fade-in duration-200">
      
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[90vh] bg-surface-primary border border-white/15 rounded-3xl p-4 sm:p-6 shadow-2xl flex flex-col justify-between overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-slate-950/80 rounded-[14px] flex items-center justify-center text-nova-cyan">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black text-white">البروفايلات والاشتراكات</h2>
                <span className="px-2 py-0.5 rounded-full bg-nova-purple/20 text-nova-purple border border-nova-purple/30 text-xs font-mono font-black">
                  {profiles.length} محفوظ
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                إدارة كافة اشتراكاتك والتبديل الفوري بينها بنقرة واحدة
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Tabs: Saved Profiles vs Add New */}
        <div className="flex items-center gap-2 my-3 shrink-0">
          <button
            type="button"
            onClick={() => { setActiveTab('list'); setErrorMessage(''); }}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'list'
                ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-nova-cyan text-white shadow-sm'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>الاشتراكات المحفوظة ({profiles.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('add'); setErrorMessage(''); }}
            className={`flex-1 py-2 px-3 rounded-xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'add'
                ? 'bg-gradient-to-r from-purple-600/30 to-cyan-500/20 border border-nova-cyan text-white shadow-sm'
                : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>إضافة اشتراك جديد</span>
          </button>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="mb-3 p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-bold flex items-center gap-2 shrink-0 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span className="flex-1">{errorMessage}</span>
          </div>
        )}

        {/* TAB 1: PROFILES LIST */}
        {activeTab === 'list' && (
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 my-1">
            {profiles.length === 0 ? (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-500 mb-3">
                  <Users className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-300 mb-1">لا توجد بروفايلات محفوظة حتى الآن</h3>
                <p className="text-xs text-slate-500 max-w-sm mb-4">
                  أي اشتراك تقوم بتسجيل الدخول به سيتم حفظه هنا تلقائياً لتبديل سهل وسريع
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('add')}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-nova-cyan to-blue-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة اشتراكك الآن</span>
                </button>
              </div>
            ) : (
              profiles.map((prof) => {
                const isCurrent = currentAccount && (
                  prof.username?.toLowerCase() === currentAccount.username?.toLowerCase() ||
                  prof.code?.toUpperCase() === currentAccount.password?.toUpperCase()
                );

                const isEditing = editingProfileId === prof.id;

                return (
                  <div
                    key={prof.id}
                    className={`relative p-3.5 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-cyan-950/40 border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                        : 'bg-surface-elevated/70 border-white/10 hover:border-white/20'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      
                      {/* Profile Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {isEditing ? (
                            <div className="flex items-center gap-1.5 flex-1 max-w-xs">
                              <input
                                type="text"
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="w-full px-2 py-1 bg-black/60 border border-nova-cyan rounded-lg text-xs text-white focus:outline-none"
                                autoFocus
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveRename(prof.id);
                                  if (e.key === 'Escape') setEditingProfileId(null);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => handleSaveRename(prof.id)}
                                className="p-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProfileId(null)}
                                className="p-1 rounded-lg bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                                <span>{prof.name}</span>
                              </h3>
                              <button
                                type="button"
                                onClick={() => handleStartRename(prof)}
                                className="p-1 text-slate-400 hover:text-nova-cyan transition-colors cursor-pointer"
                                title="تعديل الاسم"
                              >
                                <Edit3 className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Auth Type Badge */}
                          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[10px] text-slate-300 font-mono flex items-center gap-1">
                            <Key className="w-2.5 h-2.5 text-nova-cyan" />
                            <span>{prof.authType === 'code' ? 'كود تفعيل' : 'سيرفر Xtream'}</span>
                          </span>

                          {/* Active / Expiry Status */}
                          {isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 text-[10px] font-bold flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span>النشط حالياً</span>
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-400 text-[10px] font-mono">
                              {prof.daysRemaining ? `${prof.daysRemaining} يوم متبقي` : 'نشط'}
                            </span>
                          )}
                        </div>

                        {/* Details (Server & Credentials) */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono flex-wrap">
                          <span className="flex items-center gap-1 text-slate-300">
                            <Globe className="w-3 h-3 text-slate-400" />
                            <span>{(prof.serverUrl || SERVER_CONFIG.DEFAULT_PORTAL_URL).replace(/^https?:\/\//, '')}</span>
                          </span>
                          {prof.username && (
                            <span className="text-slate-400">
                              مستخدم: <strong className="text-slate-200">{prof.username}</strong>
                            </span>
                          )}
                          {prof.expDate && (
                            <span className="flex items-center gap-1 text-slate-400">
                              <Calendar className="w-3 h-3" />
                              <span>{prof.expDate}</span>
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        {!isCurrent && (
                          <button
                            type="button"
                            onClick={() => handleSelectProfile(prof)}
                            disabled={isSubmitting}
                            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-nova-cyan to-blue-600 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-sm active:scale-95 hover:brightness-110 transition-all cursor-pointer disabled:opacity-50"
                          >
                            {isSubmitting ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Play className="w-3.5 h-3.5 fill-current" />
                            )}
                            <span>دخول / تبديل</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => setProfileToDelete(prof)}
                          className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 active:scale-95 transition-all cursor-pointer"
                          title="حذف هذا البروفايل"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: ADD NEW SUBSCRIPTION FORM */}
        {activeTab === 'add' && (
          <form onSubmit={handleAddNewProfile} className="flex-1 overflow-y-auto space-y-3 pr-1 my-1">
            {/* Choose Auth Method */}
            <div className="flex items-center gap-2 p-1 bg-white/5 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => setAddMode('code')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  addMode === 'code'
                    ? 'bg-nova-cyan text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                كود التفعيل (Activation Code)
              </button>
              <button
                type="button"
                onClick={() => setAddMode('credentials')}
                className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  addMode === 'credentials'
                    ? 'bg-nova-cyan text-slate-950 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                اسم المستخدم وكلمة المرور
              </button>
            </div>

            {/* Profile Label Name */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                اسم البروفايل (اختياري لتسهيل تمييزه):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="مثال: اشتراك المجلس، Look4k VIP"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-nova-cyan"
                />
                <button
                  type="button"
                  onClick={() => openVirtualKeyboard('name', 'اسم البروفايل', 'مثال: اشتراك المجلس', newProfileName, false)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-nova-cyan/20 border border-white/15 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title="لوحة المفاتيح"
                >
                  <Keyboard className="w-3.5 h-3.5 text-nova-cyan" />
                  <span>كيبورد</span>
                </button>
              </div>
            </div>

            {/* Server Portal URL */}
            <div>
              <label className="block text-[11px] font-bold text-slate-300 mb-1">
                رابط سيرفر البث (Portal URL):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newServerUrl}
                  onChange={(e) => setNewServerUrl(e.target.value)}
                  className="flex-1 px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-nova-cyan"
                  placeholder="http://look.5g.in:8080"
                />
                <button
                  type="button"
                  onClick={() => openVirtualKeyboard('server', 'رابط السيرفر (Portal URL)', 'http://...', newServerUrl, false)}
                  className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-nova-cyan/20 border border-white/15 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                  title="لوحة المفاتيح"
                >
                  <Keyboard className="w-3.5 h-3.5 text-nova-cyan" />
                  <span>كيبورد</span>
                </button>
              </div>
            </div>

            {/* Code Inputs */}
            {addMode === 'code' ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  كود التفعيل:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="أدخل كود التفعيل المكون من أرقام وحروف"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="flex-1 px-3 py-2.5 bg-black/40 border border-white/15 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-nova-cyan"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => openVirtualKeyboard('code', 'كود التفعيل', 'كود التفعيل', newCode, false)}
                    className="px-2.5 py-2 rounded-xl bg-white/10 hover:bg-nova-cyan/20 border border-white/15 text-slate-300 hover:text-white text-xs font-bold flex items-center gap-1 transition-all cursor-pointer shrink-0"
                    title="لوحة المفاتيح"
                  >
                    <Keyboard className="w-3.5 h-3.5 text-nova-cyan" />
                    <span>كيبورد</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    اسم المستخدم:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="text"
                      placeholder="Username"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-nova-cyan"
                    />
                    <button
                      type="button"
                      onClick={() => openVirtualKeyboard('user', 'اسم المستخدم', 'Username', newUsername, false)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-nova-cyan/20 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                      title="لوحة المفاتيح"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-nova-cyan" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 mb-1">
                    كلمة المرور:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="password"
                      placeholder="Password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="flex-1 px-3 py-2 bg-black/40 border border-white/15 rounded-xl text-xs text-white font-mono placeholder-slate-500 focus:outline-none focus:border-nova-cyan"
                    />
                    <button
                      type="button"
                      onClick={() => openVirtualKeyboard('pass', 'كلمة المرور', '••••••••', newPassword, true)}
                      className="p-2 rounded-xl bg-white/10 hover:bg-nova-cyan/20 border border-white/15 text-slate-300 hover:text-white transition-all cursor-pointer shrink-0"
                      title="لوحة المفاتيح"
                    >
                      <Keyboard className="w-3.5 h-3.5 text-nova-cyan" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-nova-cyan to-blue-600 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center gap-2 shadow-nova-glow hover:brightness-110 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحقق والاتصال بالسيرفر...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>تفعيل وحفظ الاشتراك الجديد</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span className="text-[11px] sm:text-xs">يتم حفظ الاشتراكات في التخزين الآمن لجهازك</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 font-bold active:scale-95 transition-all cursor-pointer"
          >
            إغلاق
          </button>
        </div>

      </div>

      {/* Delete Confirmation Sub-Modal */}
      {profileToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90 p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-surface-primary border border-red-500/40 rounded-3xl p-5 shadow-2xl text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-black text-white mb-1">تأكيد حذف البروفايل</h3>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              هل أنت متأكد من حذف بروفايل <span className="text-red-400 font-bold">"{profileToDelete.name}"</span>؟
              <br />
              <span className="text-[11px] text-slate-400">لن يمكنك استعادته إلا بإعادة إدخال الكود أو بيانات الاشتراك.</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setProfileToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-white/10 text-slate-300 hover:bg-white/20 font-bold text-xs cursor-pointer"
              >
                إلغاء
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg active:scale-95 cursor-pointer"
              >
                نعم، احذف البروفايل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Virtual Keyboard Modal */}
      {activeKeyboardField && (
        <VirtualKeyboardModal
          isOpen={Boolean(activeKeyboardField)}
          title={activeKeyboardField.title}
          placeholder={activeKeyboardField.placeholder}
          initialValue={activeKeyboardField.initialValue}
          isPassword={activeKeyboardField.isPassword}
          onSubmit={handleKeyboardSubmit}
          onClose={() => setActiveKeyboardField(null)}
        />
      )}

    </div>
  );
};
