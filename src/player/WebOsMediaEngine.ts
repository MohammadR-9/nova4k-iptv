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

export class WebOsMediaEngine implements ITvPlayerEngine {
  public engineType: PlayerEngineType = 'webos-luna';
  private videoElement: HTMLVideoElement | null = null;
  private events: PlayerEvents = {};
  private _isPlaying = false;
  private currentAspectRatio: AspectRatioMode = 'fit';
  private bufferProfile: BufferProfile = 'balanced';
  public currentUrl = '';
  private volumeLevel = 1.0;

  private diagnostics: StreamDiagnostics = {
    bitrateKbps: 8000,
    resolution: '3840x2160',
    fps: 60,
    videoCodec: 'HEVC / H.264 (LG webOS Hardware Pipeline)',
    audioCodec: 'Dolby Digital / AAC',
    audioChannels: '5.1 Surround',
    bufferLengthSec: 5.0,
    droppedFrames: 0,
    protocol: 'HLS',
    latencyMs: 12,
    engineType: 'webos-luna',
    isHardwareAccelerated: true,
    isHdr: true,
    bufferProfile: 'balanced',
    recoveryCount: 0
  };

  public initialize(containerElement: HTMLElement, events: PlayerEvents): void {
    this.events = events;

    let video = containerElement.querySelector('video') as HTMLVideoElement;
    if (!video) {
      video = document.createElement('video');
      video.className = 'w-full h-full object-cover bg-black';
      video.autoplay = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      containerElement.appendChild(video);
    }
    this.videoElement = video;

    // Attach LG webOS specific media attributes
    try {
      this.videoElement.setAttribute('webos-media', 'true');
      this.videoElement.setAttribute('x-palm-cache', 'true');
    } catch {}

    this.videoElement.addEventListener('playing', () => {
      this._isPlaying = true;
      this.events.onBuffering?.(false);
      this.events.onPlaying?.();
    });

    this.videoElement.addEventListener('waiting', () => {
      this.events.onBuffering?.(true);
    });

    this.videoElement.addEventListener('pause', () => {
      this._isPlaying = false;
    });

    this.videoElement.addEventListener('timeupdate', () => {
      if (this.videoElement) {
        this.events.onTimeUpdate?.(this.videoElement.currentTime, this.videoElement.duration || 0);
      }
    });

    this.videoElement.addEventListener('error', (e) => {
      console.error('[WebOsMediaEngine] Video element error:', e);
      this.events.onError?.('خطأ في معالج وسائط LG webOS');
      this.events.onBuffering?.(false);
    });

    console.log('[WebOsMediaEngine] Initialized LG webOS Luna Hardware Media Pipeline');
  }

  public async loadStream(url: string, streamType: 'HLS' | 'MPEG-TS' | 'MP4' = 'HLS', _startPosition?: number): Promise<void> {
    this.currentUrl = url;
    this.diagnostics.protocol = streamType;

    if (!this.videoElement) throw new Error('Video element not found');

    this.events.onBuffering?.(true);

    try {
      // Configure webOS custom media option for hardware decoding & buffer
      const bufferSeconds = this.bufferProfile === 'anti-freeze' ? 10 : this.bufferProfile === 'turbo' ? 3 : 5;
      const mediaOption = JSON.stringify({
        mediaTransportType: 'URI',
        adaptiveStreaming: {
          initBuffer: bufferSeconds * 1000,
          maxBuffer: 15000,
          seamless: true
        }
      });

      // Pass media option via source tag or attribute if on LG webOS
      this.videoElement.setAttribute('mediaOption', mediaOption);
      this.videoElement.src = url;
      this.applyAspectRatioTransform();

      await this.videoElement.play();
      this.events.onBuffering?.(false);
      this.events.onAudioTracksUpdated?.(this.getAudioTracks());
      this.events.onSubtitleTracksUpdated?.(this.getSubtitleTracks());
    } catch (err: any) {
      console.warn('[WebOsMediaEngine] Play error:', err);
      if (this.videoElement) {
        this.videoElement.muted = true;
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
    // Handled by webOS CSS transform & objectFit
  }

  private applyAspectRatioTransform(): void {
    if (!this.videoElement) return;
    this.videoElement.style.objectFit = 
      this.currentAspectRatio === 'fit' ? 'contain' :
      this.currentAspectRatio === 'fill' ? 'cover' :
      this.currentAspectRatio === 'stretch' ? 'fill' : 'cover';
  }

  public setBufferProfile(profile: BufferProfile): void {
    this.bufferProfile = profile;
    this.diagnostics.bufferProfile = profile;
  }

  public getBufferProfile(): BufferProfile {
    return this.bufferProfile;
  }

  public getAudioTracks(): PlayerAudioTrack[] {
    return [
      { id: 0, language: 'und', label: 'المسار الصوتي الأساسي (Default Audio)', channels: '2.0 Stereo', codec: 'AAC', isActive: true }
    ];
  }

  public setAudioTrack(_trackId: number): void {}
  public getActiveAudioTrack(): PlayerAudioTrack | null {
    return this.getAudioTracks()[0];
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
    return [
      { id: -1, language: 'off', label: 'إيقاف الترجمة (Off)', isActive: true }
    ];
  }

  public setSubtitleTrack(_trackId: number): void {}
  public getActiveSubtitleTrack(): PlayerSubtitleTrack | null {
    return null;
  }

  public async captureScreenshot(): Promise<ScreenshotResult> {
    if (!this.videoElement) throw new Error('Video element not available');
    const canvas = document.createElement('canvas');
    canvas.width = 1920;
    canvas.height = 1080;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context error');
    ctx.drawImage(this.videoElement, 0, 0, canvas.width, canvas.height);
    return {
      dataUrl: canvas.toDataURL('image/jpeg', 0.95),
      width: 1920,
      height: 1080,
      format: 'image/jpeg',
      timestamp: new Date().toLocaleTimeString('en-GB')
    };
  }

  public async startRecording(): Promise<void> {}
  public pauseRecording(): void {}
  public resumeRecording(): void {}
  public async stopRecording(): Promise<RecordingResult> {
    throw new Error('Recording not supported on LG webOS Engine');
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
  }
}
