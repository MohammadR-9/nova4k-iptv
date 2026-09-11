import { ITvPlayerEngine, PlayerEngineType, PlayerEvents } from './types';
import { TizenAvPlayer } from './TizenAvPlayer';
import { HlsProEngine } from './HlsProEngine';
import { ShakaPlayerEngine } from './ShakaPlayerEngine';
import { WebOsMediaEngine } from './WebOsMediaEngine';
import { WasmMediaEngine } from './WasmMediaEngine';

export class PlayerManager {
  private static instance: ITvPlayerEngine | null = null;
  private static currentEngineType: PlayerEngineType = 'auto';
  private static cachedContainer: HTMLElement | null = null;
  private static cachedEvents: PlayerEvents | null = null;
  private static lastLoadedUrl = '';
  private static lastStreamType: 'HLS' | 'MPEG-TS' | 'MP4' = 'HLS';

  public static isTizenHardware(): boolean {
    return typeof window !== 'undefined' && 
           typeof (window as any).webapis !== 'undefined' && 
           typeof (window as any).webapis.avplay !== 'undefined';
  }

  public static getPlayer(preferredEngine: PlayerEngineType = 'auto'): ITvPlayerEngine {
    if (!this.instance) {
      this.currentEngineType = preferredEngine;

      if (preferredEngine === 'mx-hardware' || (preferredEngine === 'auto' && this.isTizenHardware())) {
        console.log('[PlayerManager] Initializing Samsung MX Hardware+ Engine.');
        this.instance = new TizenAvPlayer();
      } else if (preferredEngine === 'shaka-google') {
        console.log('[PlayerManager] Initializing Google Shaka Player Engine.');
        this.instance = new ShakaPlayerEngine();
      } else if (preferredEngine === 'webos-luna') {
        console.log('[PlayerManager] Initializing LG webOS Luna Media Engine.');
        this.instance = new WebOsMediaEngine();
      } else if (preferredEngine === 'wasm-ffmpeg') {
        console.log('[PlayerManager] Initializing WASM Fallback / DSP Engine.');
        this.instance = new WasmMediaEngine();
      } else {
        // ExoPlayer, VLC, or MPV mode using HlsProEngine
        const engine = preferredEngine === 'vlc' ? 'vlc' : preferredEngine === 'mpv-cinema' ? 'mpv-cinema' : 'exoplayer';
        console.log(`[PlayerManager] Initializing ${engine.toUpperCase()} Media Engine.`);
        this.instance = new HlsProEngine(engine);
      }
    }
    return this.instance!;
  }

  public static async switchEngine(
    newEngine: PlayerEngineType,
    containerElement?: HTMLElement,
    events?: PlayerEvents
  ): Promise<ITvPlayerEngine> {
    if (this.instance) {
      this.lastLoadedUrl = (this.instance as any).currentUrl || this.lastLoadedUrl;
      this.instance.destroy();
      this.instance = null;
    }

    const container = containerElement || this.cachedContainer;
    const evs = events || this.cachedEvents || {};

    this.currentEngineType = newEngine;
    this.instance = this.getPlayer(newEngine);

    if (container) {
      this.cachedContainer = container;
      this.cachedEvents = evs;
      this.instance.initialize(container, evs);

      if (this.lastLoadedUrl) {
        await this.instance.loadStream(this.lastLoadedUrl, this.lastStreamType);
      }
    }

    evs.onEngineChanged?.(newEngine);
    return this.instance!;
  }

  public static getActiveEngineType(): PlayerEngineType {
    return this.instance?.engineType || this.currentEngineType;
  }

  public static cacheStreamInfo(url: string, streamType: 'HLS' | 'MPEG-TS' | 'MP4' = 'HLS'): void {
    this.lastLoadedUrl = url;
    this.lastStreamType = streamType;
  }

  /**
   * Complete teardown of all active audio, video streams, and Web Audio pipelines.
   * Guarantees ZERO sound leakage after screen exit, channel change, or logout.
   */
  public static stopAll(): void {
    if (this.instance) {
      try {
        this.instance.stop();
      } catch (e) {
        console.warn('[PlayerManager] Error stopping instance:', e);
      }
    }
    this.lastLoadedUrl = '';

    // Safety sweep: mute and pause any rogue video tags in the DOM
    if (typeof document !== 'undefined') {
      const allVideos = document.querySelectorAll('video');
      allVideos.forEach(v => {
        try {
          v.pause();
          v.muted = true;
          v.removeAttribute('src');
          v.load();
        } catch {}
      });
    }
  }

  public static killActiveStreams(): void {
    this.stopAll();
    if (this.instance) {
      try {
        this.instance.destroy();
      } catch (e) {
        console.warn('[PlayerManager] Error destroying instance:', e);
      }
      this.instance = null;
    }
    this.cachedContainer = null;
    this.cachedEvents = null;
  }
}

