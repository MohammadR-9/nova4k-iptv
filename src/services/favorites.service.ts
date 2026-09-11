/**
 * FavoritesService — NOVA 4K ULTRA
 * Persistent favorites for Live Channels, Movies (VOD), and Series.
 * Stored in localStorage under 'nova_favorites_v1'.
 */

import { LiveChannel, VodItem, SeriesItem } from '../types/iptv.types';

export type FavoriteType = 'channel' | 'movie' | 'series';

export interface FavoriteEntry {
  id: string;           // Unique key: `${type}_${stream_id}`
  type: FavoriteType;
  stream_id: number;
  name: string;
  icon: string;
  addedAt: number;      // timestamp ms
  // Optional extra metadata for display
  category_id?: string;
  direct_source?: string;
  container_extension?: string;
  series_id?: number;
}

const STORAGE_KEY = 'nova_favorites_v1';

export class FavoritesService {
  // ─── Internal cache ────────────────────────────────────────────────────────
  private static _cache: Map<string, FavoriteEntry> | null = null;

  private static get store(): Map<string, FavoriteEntry> {
    if (!this._cache) {
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const arr: FavoriteEntry[] = raw ? JSON.parse(raw) : [];
        this._cache = new Map(arr.map(e => [e.id, e]));
      } catch {
        this._cache = new Map();
      }
    }
    return this._cache;
  }

  private static persist(): void {
    try {
      const arr = Array.from(this.store.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
    } catch {/* storage full — ignore */ }
  }

  private static makeId(type: FavoriteType, stream_id: number): string {
    return `${type}_${stream_id}`;
  }

  // ─── Query ─────────────────────────────────────────────────────────────────

  /** Returns all favorites sorted newest first */
  public static getAll(): FavoriteEntry[] {
    return Array.from(this.store.values()).sort((a, b) => b.addedAt - a.addedAt);
  }

  /** Returns favorites of a specific type */
  public static getByType(type: FavoriteType): FavoriteEntry[] {
    return this.getAll().filter(f => f.type === type);
  }

  public static isFavorite(type: FavoriteType, stream_id: number): boolean {
    return this.store.has(this.makeId(type, stream_id));
  }

  public static count(): number {
    return this.store.size;
  }

  // ─── Mutate ────────────────────────────────────────────────────────────────

  public static toggleChannel(ch: LiveChannel): boolean {
    const id = this.makeId('channel', ch.stream_id);
    if (this.store.has(id)) {
      this.store.delete(id);
      this.persist();
      return false;
    }
    this.store.set(id, {
      id,
      type: 'channel',
      stream_id: ch.stream_id,
      name: ch.name,
      icon: ch.stream_icon,
      addedAt: Date.now(),
      category_id: ch.category_id,
      direct_source: ch.direct_source,
    });
    this.persist();
    return true;
  }

  public static toggleMovie(movie: VodItem): boolean {
    const id = this.makeId('movie', movie.stream_id);
    if (this.store.has(id)) {
      this.store.delete(id);
      this.persist();
      return false;
    }
    this.store.set(id, {
      id,
      type: 'movie',
      stream_id: movie.stream_id,
      name: movie.name,
      icon: movie.stream_icon,
      addedAt: Date.now(),
      category_id: movie.category_id,
      direct_source: movie.direct_source,
      container_extension: movie.container_extension,
    });
    this.persist();
    return true;
  }

  public static toggleSeries(series: SeriesItem): boolean {
    const id = this.makeId('series', series.series_id);
    if (this.store.has(id)) {
      this.store.delete(id);
      this.persist();
      return false;
    }
    this.store.set(id, {
      id,
      type: 'series',
      stream_id: series.series_id,
      name: series.name,
      icon: series.cover,
      addedAt: Date.now(),
      series_id: series.series_id,
    });
    this.persist();
    return true;
  }

  public static remove(type: FavoriteType, stream_id: number): void {
    this.store.delete(this.makeId(type, stream_id));
    this.persist();
  }

  public static clearAll(): void {
    this.store.clear();
    this.persist();
  }
}
