import { UserProfile, UserAccount } from '../types/iptv.types';

export class ProfileService {
  private static readonly STORAGE_KEY = 'nova_saved_profiles';

  /**
   * Retrieves all saved profiles sorted by last used timestamp (most recent first)
   */
  public static getProfiles(): UserProfile[] {
    try {
      const raw = localStorage.getItem(this.STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.sort((a, b) => (b.lastUsedAt || 0) - (a.lastUsedAt || 0));
      }
    } catch (e) {
      console.error('[ProfileService] Failed to load profiles from localStorage:', e);
    }
    return [];
  }

  /**
   * Get single profile by ID
   */
  public static getProfileById(id: string): UserProfile | null {
    const profiles = this.getProfiles();
    return profiles.find(p => p.id === id) || null;
  }

  /**
   * Saves or updates a profile in localStorage
   */
  public static saveOrUpdateProfile(data: {
    id?: string;
    name?: string;
    authType: 'code' | 'credentials';
    code?: string;
    username?: string;
    password?: string;
    serverUrl?: string;
    serverName?: string;
    status?: 'Active' | 'Expired' | 'Trial';
    expDate?: string;
    daysRemaining?: number;
    maxConnections?: number;
  }): UserProfile {
    const profiles = this.getProfiles();
    const now = Date.now();

    // Look for existing profile matching ID or matching credentials
    let existingIndex = -1;
    if (data.id) {
      existingIndex = profiles.findIndex(p => p.id === data.id);
    }

    if (existingIndex === -1) {
      if (data.authType === 'code' && data.code) {
        existingIndex = profiles.findIndex(p => 
          p.authType === 'code' && 
          p.code?.toUpperCase() === data.code?.toUpperCase() &&
          (p.serverUrl || '').trim() === (data.serverUrl || '').trim()
        );
      } else if (data.authType === 'credentials' && data.username) {
        existingIndex = profiles.findIndex(p => 
          p.authType === 'credentials' && 
          p.username?.toLowerCase() === data.username?.toLowerCase() &&
          (p.serverUrl || '').trim() === (data.serverUrl || '').trim()
        );
      }
    }

    let defaultName = data.name;
    if (!defaultName) {
      if (data.authType === 'code') {
        defaultName = `اشتراك كود: ${data.code}`;
      } else {
        defaultName = data.username ? `اشتراك: ${data.username}` : 'اشتراك IPTV';
      }
    }

    let savedProfile: UserProfile;

    if (existingIndex >= 0) {
      const existing = profiles[existingIndex];
      savedProfile = {
        ...existing,
        ...data,
        id: existing.id,
        name: data.name || existing.name || defaultName,
        lastUsedAt: now,
        createdAt: existing.createdAt || now
      };
      profiles[existingIndex] = savedProfile;
    } else {
      const newId = `prof_${now}_${Math.random().toString(36).substring(2, 7)}`;
      savedProfile = {
        id: newId,
        name: defaultName,
        authType: data.authType,
        code: data.code,
        username: data.username,
        password: data.password,
        serverUrl: data.serverUrl,
        serverName: data.serverName,
        status: data.status || 'Active',
        expDate: data.expDate,
        daysRemaining: data.daysRemaining,
        maxConnections: data.maxConnections,
        lastUsedAt: now,
        createdAt: now
      };
      profiles.unshift(savedProfile);
    }

    this.persistProfiles(profiles);
    return savedProfile;
  }

  /**
   * Automatically saves or updates the profile when any account logs in successfully
   */
  public static autoSaveAccount(
    account: UserAccount,
    credentials?: { code?: string; username?: string; password?: string; serverUrl?: string; name?: string }
  ): UserProfile {
    const authType = account.authType || (credentials?.code ? 'code' : 'credentials');
    const name = credentials?.name || (
      authType === 'code' 
        ? `اشتراك كود (${credentials?.code || account.username})` 
        : `حساب (${account.username})`
    );

    return this.saveOrUpdateProfile({
      name,
      authType,
      code: credentials?.code || (authType === 'code' ? account.password || account.username : undefined),
      username: account.username,
      password: credentials?.password || account.password,
      serverUrl: credentials?.serverUrl || account.serverUrl,
      serverName: account.serverName,
      status: account.status,
      expDate: account.expDate,
      daysRemaining: account.daysRemaining,
      maxConnections: account.maxConnections
    });
  }

  /**
   * Deletes a profile by ID
   */
  public static deleteProfile(id: string): boolean {
    const profiles = this.getProfiles();
    const filtered = profiles.filter(p => p.id !== id);
    if (filtered.length !== profiles.length) {
      this.persistProfiles(filtered);
      return true;
    }
    return false;
  }

  /**
   * Renames a profile
   */
  public static renameProfile(id: string, newName: string): boolean {
    const cleanName = newName.trim();
    if (!cleanName) return false;
    const profiles = this.getProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.name = cleanName;
      this.persistProfiles(profiles);
      return true;
    }
    return false;
  }

  /**
   * Updates last used timestamp
   */
  public static touchProfile(id: string): void {
    const profiles = this.getProfiles();
    const profile = profiles.find(p => p.id === id);
    if (profile) {
      profile.lastUsedAt = Date.now();
      this.persistProfiles(profiles);
    }
  }

  private static persistProfiles(profiles: UserProfile[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.error('[ProfileService] Failed to persist profiles to localStorage:', e);
    }
  }
}
