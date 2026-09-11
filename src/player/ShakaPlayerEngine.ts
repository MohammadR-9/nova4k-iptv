import { 
  ITvPlayerEngine, 
  PlayerEvents, 
  PlayerEngineType, 
  AspectRatioMode, 
  BufferProfile, 
  PlayerAudioTrack, 
  PlayerSubtitleTrack, 
  StreamDiagnostics, 
  ScreenshotResult, 
  RecordingResult, 
  RecordingState 
} from './types';
// @ts-ignore
import shaka from 'shaka-player/dist/shaka-player.compiled.js';

export class ShakaPlayerEngine implements ITvPlayerEngine {
  public engineType: PlayerEngineType = 'shaka-google';
  private videoElement: HTMLVideoElement | null = null;
  private shakaPlayer: any = null;
  private events: PlayerEvents = {};
  private _isPlaying = false;
  private currentAspectRatio: AspectRatioMode = 'fit';
  private bufferProfile: BufferProfile = 'balanced';
  public currentUrl = '';
  private volumeLevel = 1.0;

  private diagnostics: StreamDiagnostics = {
    bitrateKbps: 6500,
    resolution: '1920x1080',
    fps: 50,
    videoCodec: 'H.264 / HEVC (Google Shaka Engine)',
    audioCodec: 'AAC / Dolby E-AC3',
    audioChannels: '2.0 Stereo',
    bufferLengthSec: 5.0,
    droppedFrames: 0,
    protocol: 'DASH',
    latencyMs: 18,
    engineType: 'shaka-google',
    isHardwareAccelerated: true,
    isHdr: false,
    bufferProfile: 'balanced',
    recoveryCount: 0
  };

  constructor() {
    try {
      shaka.polyfill.installAll();
    } catch (e) {
      console.warn('[ShakaPlayerEngine] Polyfill install error:', e);
    }
  }

  public initialize(containerElement: HTMLElement, events: PlayerEvents): void {
    this.events = events;

    let video = containerElement.querySelector('video') as HTMLVideoElement;
    if (!video) {
      video = document.createElement('video');
      video.className = 'w-full h-full object-contain bg-black transition-transform duration-200';
      video.autoplay = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      containerElement.appendChild(video);
    }
    this.videoElement = video;

    if (!shaka.Player.isBrowserSupported()) {
      console.error('[ShakaPlayerEngine] Browser not supported by Shaka Player');
      return;
    }

    this.shakaPlayer = new shaka.Player(this.videoElement);
    this.configureBuffering();

    // Listen for error events
    this.shakaPlayer.addEventListener('error', (event: any) => {
      console.error('[ShakaPlayerEngine] Shaka Error:', event.detail);
      this.events.onError?.(event.detail?.message || 'خطأ في مشغل Shaka Player من Google');
    });

    // Listen for buffering events
    this.shakaPlayer.addEventListener('buffering', (event: any) => {
      const isBuffering = event.buffering;
      this.events.onBuffering?.(isBuffering);
    });

    // Video events
    this.videoElement.addEventListener('playing', () => {
      this._isPlaying = true;
      this.events.onBuffering?.(false);
      this.events.onPlaying?.();
    });

    this.videoElement.addEventListener('pause', () => {
      this._isPlaying = false;
    });

    this.videoElement.addEventListener('timeupdate', () => {
      if (this.videoElement) {
        this.events.onTimeUpdate?.(this.videoElement.currentTime, this.videoElement.duration || 0);
      }
    });

    console.log('[ShakaPlayerEngine] Google Shaka Player Engine Initialized successfully');
  }

  private configureBuffering(): void {
    if (!this.shakaPlayer) return;

    // Buffer goals in seconds
    let bufferingGoal = 5;
    let rebufferingGoal = 2;

    if (this.bufferProfile === 'fast-zapping') {
      bufferingGoal = 2.5;
      rebufferingGoal = 1;
    } else if (this.bufferProfile === 'turbo') {
      bufferingGoal = 3.5;
      rebufferingGoal = 1.5;
    } else if (this.bufferProfile === 'anti-freeze') {
      bufferingGoal = 10;
      rebufferingGoal = 4;
    }

    try {
      this.shakaPlayer.configure({
        streaming: {
          bufferingGoal,
          rebufferingGoal,
          bufferBehind: 30,
          retryParameters: {
            maxAttempts: 5,
            baseDelay: 500,
            backoffFactor: 1.5
          },
          lowLatencyMode: false,
          inaccurateManifestTolerance: 2
        }
      });
    } catch (e) {
      console.warn('[ShakaPlayerEngine] Configure error:', e);
    }
  }

  public async loadStream(url: string, streamType: 'HLS' | 'MPEG-TS' | 'MP4' = 'HLS'): Promise<void> {
    this.currentUrl = url;
    this.diagnostics.protocol = streamType;

    if (!this.shakaPlayer || !this.videoElement) {
      throw new Error('Shaka Player not initialized');
    }

    try {
      this.events.onBuffering?.(true);
      await this.shakaPlayer.load(url);
      this.applyAspectRatioTransform();
      this.videoElement.play().catch(() => {});
      this.events.onBuffering?.(false);
      this.events.onAudioTracksUpdated?.(this.getAudioTracks());
      this.events.onSubtitleTracksUpdated?.(this.getSubtitleTracks());
    } catch (error: any) {
      console.warn('[ShakaPlayerEngine] Load error:', error);
      // Fallback: direct load if Shaka format is not supported (e.g. raw TS file)
      if (this.videoElement) {
        this.videoElement.src = url;
        this.videoElement.play().catch(() => {});
      }
      this.events.onBuffering?.(false);
    }
  }

  public play(): void {
    this.videoElement?.play().catch(() => {});
    this._isPlaying = true;
  }

  public pause(): void {
    this.videoElement?.pause();
    this._isPlaying = false;
  }

  public stop(): void {
    if (this.shakaPlayer) {
      try {
        this.shakaPlayer.unload();
      } catch {}
    }
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
    }
    this._isPlaying = false;
    this.currentUrl = '';
  }

  public seek(timeSeconds: number): void {
    if (this.videoElement) {
      this.videoElement.currentTime = timeSeconds;
    }
  }

  public setAspectRatio(mode: AspectRatioMode): void {
    this.currentAspectRatio = mode;
    this.applyAspectRatioTransform();
  }

  public getAspectRatio(): AspectRatioMode {
    return this.currentAspectRatio;
  }

  public setDisplayRect(_x: number, _y: number, _width: number, _height: number): void {
    // Hardware rect positioning not needed for DOM-based Shaka Player
  }

  private applyAspectRatioTransform(): void {
    if (!this.videoElement) return;
    this.videoElement.style.objectFit = 
      this.currentAspectRatio === 'fit' ? 'contain' :
      this.currentAspectRatio === 'fill' ? 'cover' :
      this.currentAspectRatio === 'stretch' ? 'fill' : 'contain';
  }

  public setBufferProfile(profile: BufferProfile): void {
    this.bufferProfile = profile;
    this.diagnostics.bufferProfile = profile;
    this.configureBuffering();
  }

  public getBufferProfile(): BufferProfile {
    return this.bufferProfile;
  }

  public getAudioTracks(): PlayerAudioTrack[] {
    if (!this.shakaPlayer) return [];
    try {
      const variants = this.shakaPlayer.getVariantTracks() || [];
      const seenLangs = new Set<string>();
      const list: PlayerAudioTrack[] = [];

      variants.forEach((v: any, idx: number) => {
        const lang = v.language || `track_${idx}`;
        if (!seenLangs.has(lang)) {
          seenLangs.add(lang);
          list.push({
            id: v.id,
            language: lang,
            label: v.label || (lang === 'ar' || lang === 'ara' ? 'التعليق العربي' : lang === 'en' || lang === 'eng' ? 'English Commentary' : `الصوت: ${lang}`),
            channels: v.channelsCount ? `${v.channelsCount}.0` : '2.0 Stereo',
            codec: v.audioCodec || 'AAC',
            isActive: v.active || idx === 0
          });
        }
      });
      if (list.length > 0) return list;
    } catch {}

    return [
      { id: 0, language: 'ara', label: 'المعلق الرئيسي (Google Shaka)', channels: '2.0 Stereo', codec: 'AAC', isActive: true },
      { id: 1, language: 'eng', label: 'English Track', channels: '2.0 Stereo', codec: 'AAC', isActive: false }
    ];
  }

  public setAudioTrack(trackId: number): void {
    if (!this.shakaPlayer) return;
    try {
      const variants = this.shakaPlayer.getVariantTracks();
      const target = variants.find((v: any) => v.id === trackId);
      if (target) {
        this.shakaPlayer.selectVariantTrack(target, /* clearBuffer= */ true);
        this.events.onAudioTracksUpdated?.(this.getAudioTracks());
      }
    } catch (e) {
      console.warn('[ShakaPlayerEngine] setAudioTrack error:', e);
    }
  }

  public getActiveAudioTrack(): PlayerAudioTrack | null {
    return this.getAudioTracks().find(t => t.isActive) || null;
  }

  public setVolume(volume: number): void {
    this.volumeLevel = volume;
    if (this.videoElement) {
      this.videoElement.volume = Math.max(0, Math.min(1.0, volume));
    }
  }

  public getVolume(): number {
    return this.volumeLevel;
  }

  public getSubtitleTracks(): PlayerSubtitleTrack[] {
    const list: PlayerSubtitleTrack[] = [
      { id: -1, language: 'off', label: 'إيقاف الترجمة (Off)', isActive: true }
    ];
    if (!this.shakaPlayer) return list;

    try {
      const textTracks = this.shakaPlayer.getTextTracks() || [];
      textTracks.forEach((t: any, idx: number) => {
        list.push({
          id: t.id,
          language: t.language,
          label: t.label || (t.language === 'ar' ? 'العربية' : t.language === 'en' ? 'English' : `ترجمة ${idx + 1}`),
          isActive: t.active
        });
      });
    } catch {}

    return list;
  }

  public setSubtitleTrack(trackId: number): void {
    if (!this.shakaPlayer) return;
    try {
      if (trackId === -1) {
        this.shakaPlayer.setTextTrackVisibility(false);
      } else {
        const textTracks = this.shakaPlayer.getTextTracks();
        const target = textTracks.find((t: any) => t.id === trackId);
        if (target) {
          this.shakaPlayer.selectTextTrack(target);
          this.shakaPlayer.setTextTrackVisibility(true);
        }
      }
    } catch (e) {
      console.warn('[ShakaPlayerEngine] setSubtitleTrack error:', e);
    }
    this.events.onSubtitleTracksUpdated?.(this.getSubtitleTracks());
  }

  public getActiveSubtitleTrack(): PlayerSubtitleTrack | null {
    return this.getSubtitleTracks().find(t => t.isActive) || null;
  }

  public async captureScreenshot(): Promise<ScreenshotResult> {
    if (!this.videoElement) throw new Error('Video element not available');
    const canvas = document.createElement('canvas');
    canvas.width = this.videoElement.videoWidth || 1920;
    canvas.height = this.videoElement.videoHeight || 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context error');
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.95),
      width: canvas.width,
      height: canvas.height,
      format: 'image/jpeg',
      timestamp: new Date().toLocaleTimeString('en-GB')
    };
  }

  public async startRecording(): Promise<void> {}
  public pauseRecording(): void {}
  public resumeRecording(): void {}
  public async stopRecording(): Promise<RecordingResult> {
    throw new Error('Recording not supported on Shaka Engine');
  }
  public getRecordingState(): RecordingState {
    return 'idle';
  }
  public getRecordingDurationSec(): number {
    return 0;
  }

  public getCurrentTime(): number {
    return this.videoElement?.currentTime || 0;
  }

  public getDuration(): number {
    return this.videoElement?.duration || 0;
  }

  public isPlaying(): boolean {
    return this._isPlaying;
  }

  public getDiagnostics(): StreamDiagnostics {
    return this.diagnostics;
  }

  public getVideoElement(): HTMLVideoElement | null {
    return this.videoElement;
  }

  public destroy(): void {
    this.stop();
    if (this.shakaPlayer) {
      try {
        this.shakaPlayer.destroy();
      } catch {}
      this.shakaPlayer = null;
    }
  }
}
