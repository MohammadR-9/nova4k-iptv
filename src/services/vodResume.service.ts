/**
 * VOD & Series Local Resume Point Service
 * Stores and manages playback progress for movies and episodes
 */

export interface ResumePoint {
  id: string | number;
  currentTimeSec: number;
  durationSec: number;
  percent: number;
  timestamp: number;
  formattedTime: string;
}

const STORAGE_PREFIX = 'tizen_vod_resume_';

export class VodResumeService {
  /**
   * Save playback progress locally.
   * If less than 10 seconds or near the end (last 30 seconds), clear or ignore.
   */
  public static saveResumePoint(id: string | number, currentTimeSec: number, durationSec: number): void {
    if (!id || typeof window === 'undefined' || !window.localStorage) return;

    // Don't save if watched less than 5 seconds
    if (currentTimeSec < 5) {
      return;
    }

    // If watched over 95% or within 30s of completion, consider finished and clear
    if (durationSec > 0 && (currentTimeSec >= durationSec - 30 || (currentTimeSec / durationSec) > 0.95)) {
      this.clearResumePoint(id);
      return;
    }

    const percent = durationSec > 0 ? Math.min(100, Math.round((currentTimeSec / durationSec) * 100)) : 0;
    const record: ResumePoint = {
      id,
      currentTimeSec: Math.floor(currentTimeSec),
      durationSec: Math.floor(durationSec),
      percent,
      timestamp: Date.now(),
      formattedTime: this.formatTime(currentTimeSec)
    };

    try {
      localStorage.setItem(`${STORAGE_PREFIX}${id}`, JSON.stringify(record));
    } catch (e) {
      console.warn('[VodResumeService] Failed to write to localStorage:', e);
    }
  }

  /**
   * Retrieve saved resume point for movie or episode
   */
  public static getResumePoint(id: string | number): ResumePoint | null {
    if (!id || typeof window === 'undefined' || !window.localStorage) return null;

    try {
      const data = localStorage.getItem(`${STORAGE_PREFIX}${id}`);
      if (!data) return null;
      const parsed: ResumePoint = JSON.parse(data);
      if (parsed && typeof parsed.currentTimeSec === 'number' && parsed.currentTimeSec >= 5) {
        return parsed;
      }
    } catch (e) {
      console.warn('[VodResumeService] Failed to read resume point:', e);
    }
    return null;
  }

  /**
   * Remove resume point (e.g. after finish or manual restart)
   */
  public static clearResumePoint(id: string | number): void {
    if (!id || typeof window === 'undefined' || !window.localStorage) return;
    try {
      localStorage.removeItem(`${STORAGE_PREFIX}${id}`);
    } catch {}
  }

  /**
   * Get all saved resume points mapped by id
   */
  public static getAllResumePoints(): Record<string, ResumePoint> {
    const map: Record<string, ResumePoint> = {};
    if (typeof window === 'undefined' || !window.localStorage) return map;

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const itemId = key.replace(STORAGE_PREFIX, '');
            map[itemId] = parsed;
          }
        }
      }
    } catch {}
    return map;
  }

  /**
   * Format seconds to HH:MM:SS or MM:SS
   */
  public static formatTime(seconds: number): string {
    if (isNaN(seconds) || seconds < 0) return '00:00:00';
    const total = Math.floor(seconds);
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;

    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
}
