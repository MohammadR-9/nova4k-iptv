import Hls, { HlsConfig } from 'hls.js';
import mpegts from 'mpegts.js';
import {
  ITvPlayerEngine,
  PlayerEngineType,
  BufferProfile,
  AspectRatioMode,
  PlayerAudioTrack,
  PlayerSubtitleTrack,
  StreamDiagnostics,
  RecordingState,
  RecordingResult,
  ScreenshotResult,
  PlayerEvents
} from './types';

export class HlsProEngine implements ITvPlayerEngine {
  public engineType: PlayerEngineType = 'exoplayer';

  private videoElement: HTMLVideoElement | null = null;
  private hls: Hls | null = null;
  private mpegtsPlayer: mpegts.Player | null = null;
  private events: PlayerEvents = {};
  private _isPlaying = false;
  private currentAspectRatio: AspectRatioMode = 'fit';
  private bufferProfile: BufferProfile = 'balanced';
  private currentUrl = '';
  private currentStreamType: 'HLS' | 'MPEG-TS' | 'MP4' = 'HLS';

  // Volume & Audio Booster
  private volumeLevel = 1.0;
  private audioContext: AudioContext | null = null;
  private gainNode: GainNode | null = null;
  private audioSourceNode: MediaElementAudioSourceNode | null = null;
  private currentLoadSessionId = 0;

  // Subtitle handling
  private selectedSubtitleId = -1;
  private textTrackListenerRemover: (() => void) | null = null;

  // DVR Recording
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private recordingState: RecordingState = 'idle';
  private recordingTimer: any = null;
  private recordingDurationSec = 0;

  // Anti-Freeze & Auto-Recovery Monitor
  private stallDetectorTimer: any = null;
  private bufferingSafetyTimeout: any = null;
  private lastPlaybackTime = 0;
  private recoveryCount = 0;
  private isRecovering = false;
  private pendingSeekTime: number | null = null;
  private isSeekConfirmed = false;
  private seekWatchdogTimer: any = null;
  private seekAttemptCount = 0;

  // Diagnostics
  private diagnosticsInterval: any = null;
  private diagnostics: StreamDiagnostics = {
    bitrateKbps: 6500,
    resolution: '1920x1080',
    fps: 50,
    videoCodec: 'H.264 / AVC (High Profile)',
    audioCodec: 'AAC-LC / Dolby',
    audioChannels: '2.0 Stereo',
    bufferLengthSec: 0,
    droppedFrames: 0,
    protocol: 'HLS',
    latencyMs: 22,
    engineType: 'exoplayer',
    isHardwareAccelerated: true,
    isHdr: false,
    bufferProfile: 'turbo',
    recoveryCount: 0
  };

  constructor(initialEngine: PlayerEngineType = 'exoplayer') {
    this.engineType = initialEngine;
    this.diagnostics.engineType = initialEngine;
  }

  private applyPendingSeek(): void {
    if (this.pendingSeekTime === null || !this.videoElement) return;
    const target = this.pendingSeekTime;

    // Cannot seek until metadata is loaded
    if (this.videoElement.readyState < 1) {
      return;
    }

    const current = this.videoElement.currentTime;

    // If current time is already within tolerance of target, mark confirmed!
    if (Math.abs(current - target) <= 1.5) {
      this.isSeekConfirmed = true;
      this.pendingSeekTime = null;
      this.clearSeekWatchdog();
      return;
    }

    // Direct seek on HTML5 video element
    try {
      this.videoElement.currentTime = target;
    } catch (err) {
      console.warn('[HlsProEngine] applyPendingSeek error:', err);
    }

    if (this.hls && this.currentStreamType === 'HLS') {
      try {
        this.hls.startLoad(target);
      } catch {}
    }
  }

  private startSeekWatchdog(target: number): void {
    this.clearSeekWatchdog();
    this.pendingSeekTime = target;
    this.isSeekConfirmed = false;
    this.seekAttemptCount = 0;

    this.seekWatchdogTimer = setInterval(() => {
      if (!this.videoElement || this.pendingSeekTime === null) {
        this.clearSeekWatchdog();
        return;
      }

      this.seekAttemptCount++;
      const cur = this.videoElement.currentTime;

      // Check if seek is satisfied
      if (Math.abs(cur - this.pendingSeekTime) <= 2.0 && cur > 0) {
        this.isSeekConfirmed = true;
        this.pendingSeekTime = null;
        this.clearSeekWatchdog();
        this.events.onBuffering?.(false);
        return;
      }

      // If video metadata is ready, retry applying seek if not currently seeking
      if (this.videoElement.readyState >= 1 && !this.videoElement.seeking) {
        try {
          this.videoElement.currentTime = this.pendingSeekTime;
        } catch {}
      }

      // If video paused during playback attempt, ensure playback continues
      if (this._isPlaying && this.videoElement.paused) {
        this.videoElement.play().catch(() => {});
      }

      // Timeout after 20 attempts (~5 seconds)
      if (this.seekAttemptCount >= 20) {
        console.warn(`[HlsProEngine] Seek watchdog finished after ${this.seekAttemptCount} attempts. Current: ${cur}`);
        this.isSeekConfirmed = true;
        this.pendingSeekTime = null;
        this.clearSeekWatchdog();
      }
    }, 250);
  }

  private clearSeekWatchdog(): void {
    if (this.seekWatchdogTimer) {
      clearInterval(this.seekWatchdogTimer);
      this.seekWatchdogTimer = null;
    }
    this.seekAttemptCount = 0;
  }

  public initialize(containerElement: HTMLElement, events: PlayerEvents): void {
    this.events = events;

    let video = containerElement.querySelector('video') as HTMLVideoElement;
    if (!video) {
      video = document.createElement('video');
      video.className = 'absolute inset-0 w-full h-full object-contain bg-black transition-transform duration-200';
      video.autoplay = true;
      video.playsInline = true;
      containerElement.appendChild(video);
    } else {
      video.className = 'absolute inset-0 w-full h-full object-contain bg-black transition-transform duration-200';
    }
    this.videoElement = video;

    this.videoElement.addEventListener('playing', () => {
      this._isPlaying = true;
      this.isRecovering = false;
      this.applyPendingSeek();
      this.events.onBuffering?.(false);
      this.events.onPlaying?.();
    });

    this.videoElement.addEventListener('waiting', () => {
      this.events.onBuffering?.(true);
      this.scheduleStallRecoveryCheck();
    });

    this.videoElement.addEventListener('loadedmetadata', () => {
      this.applyPendingSeek();
      this.events.onBuffering?.(false);
    });

    this.videoElement.addEventListener('canplay', () => {
      this.applyPendingSeek();
      this.events.onBuffering?.(false);
    });

    this.videoElement.addEventListener('loadeddata', () => {
      this.applyPendingSeek();
      this.events.onBuffering?.(false);
    });

    this.videoElement.addEventListener('seeked', () => {
      if (this.videoElement && this.pendingSeekTime !== null) {
        if (Math.abs(this.videoElement.currentTime - this.pendingSeekTime) <= 2.5) {
          this.isSeekConfirmed = true;
          this.pendingSeekTime = null;
          this.clearSeekWatchdog();
        }
      }
      this.events.onBuffering?.(false);
    });

    this.videoElement.addEventListener('timeupdate', () => {
      if (!this.videoElement) return;
      const cur = this.videoElement.currentTime;

      // CRITICAL: Block bogus early timeupdate events from overwriting resume position!
      if (this.pendingSeekTime !== null && !this.isSeekConfirmed) {
        if (cur < this.pendingSeekTime - 2.5) {
          // Still at initial seconds before seek took effect, suppress this timeupdate!
          return;
        } else {
          // Reached or surpassed the target position!
          this.isSeekConfirmed = true;
          this.pendingSeekTime = null;
          this.clearSeekWatchdog();
        }
      }

      if (cur > 0) {
        this.events.onBuffering?.(false);
      }
      this.lastPlaybackTime = cur;
      this.events.onTimeUpdate?.(cur, this.videoElement.duration || 0);
    });

    this.videoElement.addEventListener('error', (e) => {
      console.warn('[HlsProEngine] Video element error caught:', e);
      this.events.onBuffering?.(false);
      this.handleStreamFreezeRecovery('خطأ في استقبال حزم البث');
    });

    this.startDiagnosticsTicker();
  }

  public async loadStream(url: string, streamType: 'HLS' | 'MPEG-TS' | 'MP4' = 'HLS', startPosition: number = 0): Promise<void> {
    if (!this.videoElement) throw new Error('Video element not initialized');

    // 1. Immediately isolate audio & stop any previous playback
    const sessionId = ++this.currentLoadSessionId;
    this.videoElement.pause();
    this.videoElement.muted = true; // Temporary mute to avoid audio chirp/leakage
    if (this.gainNode) {
      try { this.gainNode.gain.setValueAtTime(0, 0); } catch {}
    }

    this.currentUrl = url;
    this.currentStreamType = streamType;
    this.diagnostics.protocol = streamType;
    this.events.onBuffering?.(true);

    if (startPosition > 0) {
      this.pendingSeekTime = startPosition;
      this.isSeekConfirmed = false;
      this.startSeekWatchdog(startPosition);
    } else {
      this.pendingSeekTime = null;
      this.isSeekConfirmed = true;
      this.clearSeekWatchdog();
    }

    if (this.stallDetectorTimer) clearTimeout(this.stallDetectorTimer);

    if (this.mpegtsPlayer) {
      try {
        this.mpegtsPlayer.pause();
        this.mpegtsPlayer.unload();
        this.mpegtsPlayer.detachMediaElement();
        this.mpegtsPlayer.destroy();
      } catch {}
      this.mpegtsPlayer = null;
    }

    if (this.hls) {
      try {
        this.hls.stopLoad();
        this.hls.detachMedia();
        this.hls.destroy();
      } catch {}
      this.hls = null;
    }

    return new Promise((resolve) => {
      // Absolute safety watchdog: Never allow buffering spinner to hang longer than 2200ms
      if (this.bufferingSafetyTimeout) clearTimeout(this.bufferingSafetyTimeout);
      this.bufferingSafetyTimeout = setTimeout(() => {
        if (sessionId === this.currentLoadSessionId) {
          this.events.onBuffering?.(false);
          if (this.videoElement && this.videoElement.paused) {
            this.videoElement.muted = true;
            this.videoElement.play().catch(() => {});
          }
        }
      }, 2200);

      // In Vite dev server (localhost:5173), route external HTTP/HTTPS IPTV streams through the Vite CORS proxy.
      // On Android APK, Samsung Tizen Smart TVs, LG webOS, and production builds, play directly!
      let streamUrl = url;
      const isViteDevServer = typeof window !== 'undefined' && window.location.port === '5173';
      if (isViteDevServer && url.startsWith('http')) {
        const isDirectCdn = url.includes('test-streams.mux.dev') ||
                            url.includes('akamaized.net') ||
                            url.includes('apple.com') ||
                            url.includes('cloudfront.net') ||
                            url.includes('fastly.net') ||
                            url.includes('mozilla.net');
        if (!isDirectCdn) {
          streamUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        }
      }

      // MPEG-TS live stream via mpegts.js (Pure MSE Demuxer) - Only for explicit .ts without .m3u8
      const isExplicitTs = (url.endsWith('.ts') || streamUrl.endsWith('.ts') || streamType === 'MPEG-TS') && 
                           !url.includes('.m3u8') && 
                           !streamUrl.includes('.m3u8');
      if (isExplicitTs && mpegts.isSupported()) {
        if (sessionId !== this.currentLoadSessionId) return;
        if (this.bufferingSafetyTimeout) clearTimeout(this.bufferingSafetyTimeout);

        try {
          // Robust multi-second buffer based on profile (industry standard 4-6s)
          let stashSize = 3.5 * 1024 * 1024; // Balanced (Default): ~4-6 seconds buffer
          if (this.bufferProfile === 'fast-zapping') {
            stashSize = 1.2 * 1024 * 1024; // ~1.5 - 2s buffer
          } else if (this.bufferProfile === 'turbo') {
            stashSize = 2.2 * 1024 * 1024; // ~3s buffer
          } else if (this.bufferProfile === 'anti-freeze') {
            stashSize = 6.0 * 1024 * 1024; // ~8-10s ultra-stable buffer
          }

          const mpegPlayer = mpegts.createPlayer({
            type: 'mse',
            isLive: true,
            url: streamUrl
          }, {
            enableWorker: false, // Prevents CSP/Blob worker issues across Web & Smart TVs
            lazyLoad: false,
            enableStashBuffer: true,
            stashInitialSize: stashSize,
            // Disable latency chasing: allows the player to hold a continuous 4-6s buffer without stutter
            liveBufferLatencyChasing: false,
            autoCleanupSourceBuffer: true,
            autoCleanupMaxBackwardDuration: 60,
            autoCleanupMinBackwardDuration: 30
          });
          this.mpegtsPlayer = mpegPlayer;
          mpegPlayer.attachMediaElement(this.videoElement!);
          mpegPlayer.load();

          // Intelligent Anti-Stutter: When buffer runs dry, hold for 1.8s to rebuild cushion
          // Prevents the annoying 0.2s machine-gun freeze loop on high-bitrate/4K streams
          let stallRecoveryTimer: any = null;
          this.videoElement!.onwaiting = () => {
            if (stallRecoveryTimer) return;
            this.events.onBuffering?.(true);
            stallRecoveryTimer = setTimeout(() => {
              stallRecoveryTimer = null;
              if (this.videoElement && !this.videoElement.paused) {
                this.videoElement.play().catch(() => {});
              }
              this.events.onBuffering?.(false);
            }, 1800);
          };

          const playPromise = mpegPlayer.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              if (this.videoElement) this.videoElement.muted = false;
              this.events.onBuffering?.(false);
            }).catch(() => {
              if (this.videoElement) {
                this.videoElement.muted = true;
                this.videoElement.play().catch(() => {});
              }
              this.events.onBuffering?.(false);
            });
          }

          mpegPlayer.on(mpegts.Events.ERROR, (errType: any, errDetail: any) => {
            console.warn('[HlsProEngine] mpegts player error:', errType, errDetail);
            this.events.onBuffering?.(false);
            if (url.includes('.ts') && !this.isRecovering) {
              this.isRecovering = true;
              const fallbackM3u8 = url.replace(/\.ts(\?|$)/, '.m3u8$1');
              console.log('[HlsProEngine] mpegts error, attempting .m3u8 fallback:', fallbackM3u8);
              this.loadStream(fallbackM3u8, 'HLS').catch(() => {
                if (this.videoElement) {
                  try { this.mpegtsPlayer?.destroy(); } catch {}
                  this.mpegtsPlayer = null;
                  this.videoElement.src = streamUrl;
                  this.videoElement.load();
                  this.videoElement.play().catch(() => {});
                }
              });
              return;
            }
            if (this.videoElement) {
              try {
                this.mpegtsPlayer?.destroy();
              } catch {}
              this.mpegtsPlayer = null;
              this.videoElement.src = streamUrl;
              this.videoElement.load();
              this.videoElement.play().catch(() => {});
            }
          });

          mpegPlayer.on(mpegts.Events.MEDIA_INFO, (mediaInfo: any) => {
            if (mediaInfo) {
              this.diagnostics.resolution = `${mediaInfo.width || 1920}x${mediaInfo.height || 1080}`;
              this.diagnostics.fps = mediaInfo.fps || 50;
              this.diagnostics.protocol = 'MPEG-TS';
            }
          });

          this.applyAspectRatioTransform();
          this.events.onBuffering?.(false);
          resolve();
          return;
        } catch (err) {
          console.warn('[HlsProEngine] mpegts player init error:', err);
        }
      }

      // Direct MP4 / MKV / VOD video file playback or native browser HLS fallback
      const isDirectMediaFile = streamType === 'MP4' ||
                                /\.(mp4|mkv|avi|mov|webm|flv)(\?|$)/i.test(url) ||
                                /\.(mp4|mkv|avi|mov|webm|flv)(\?|$)/i.test(streamUrl) ||
                                !Hls.isSupported();

      if (isDirectMediaFile) {
        if (sessionId !== this.currentLoadSessionId) return;
        if (this.bufferingSafetyTimeout) clearTimeout(this.bufferingSafetyTimeout);

        this.videoElement!.src = streamUrl;
        this.videoElement!.load();

        if (startPosition > 0) {
          this.applyPendingSeek();
        }

        if (this.gainNode) {
          try { this.gainNode.gain.setValueAtTime(this.volumeLevel, 0); } catch {}
        }

        const playPromise = this.videoElement!.play();
        if (playPromise !== undefined) {
          playPromise.then(() => {
            if (this.videoElement) this.videoElement.muted = false;
            this.applyPendingSeek();
            this.events.onBuffering?.(false);
          }).catch(() => {
            if (this.videoElement) {
              this.videoElement.muted = true;
              this.videoElement.play().catch(() => {});
              this.applyPendingSeek();
            }
            this.events.onBuffering?.(false);
          });
        }

        this.applyAspectRatioTransform();
        resolve();
        return;
      }

      // Configure HLS.js according to selected Engine Profile & Fast-Zapping
      const hlsConfig = this.buildHlsConfig(startPosition);
      const hlsInstance = new Hls(hlsConfig);
      this.hls = hlsInstance;

      hlsInstance.loadSource(streamUrl);
      hlsInstance.attachMedia(this.videoElement!);

      hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
        if (sessionId !== this.currentLoadSessionId) {
          try { hlsInstance.destroy(); } catch {}
          return;
        }

        if (this.bufferingSafetyTimeout) clearTimeout(this.bufferingSafetyTimeout);
        this.applyAspectRatioTransform();

        if (startPosition > 0) {
          this.applyPendingSeek();
        }

        if (this.videoElement) {
          const playPromise = this.videoElement.play();
          if (playPromise !== undefined) {
            playPromise.then(() => {
              if (this.videoElement) this.videoElement.muted = false;
              if (this.gainNode) {
                try { this.gainNode.gain.setValueAtTime(this.volumeLevel, 0); } catch {}
              }
              this.applyPendingSeek();
              this.events.onBuffering?.(false);
            }).catch((err) => {
              console.warn('[HlsProEngine] Play blocked or needs muted autoplay:', err);
              if (this.videoElement) {
                this.videoElement.muted = true;
                this.videoElement.play().catch(() => {});
                this.applyPendingSeek();
              }
              this.events.onBuffering?.(false);
            });
          }
        }
        this.events.onBuffering?.(false);
        this.events.onAudioTracksUpdated?.(this.getAudioTracks());
        this.events.onSubtitleTracksUpdated?.(this.getSubtitleTracks());
        resolve();
      });

      hlsInstance.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        if (sessionId !== this.currentLoadSessionId) return;
        this.events.onAudioTracksUpdated?.(this.getAudioTracks());
      });

      hlsInstance.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
        if (sessionId !== this.currentLoadSessionId) return;
        this.events.onSubtitleTracksUpdated?.(this.getSubtitleTracks());
        this.bindTextTrackCues();
      });

      hlsInstance.on(Hls.Events.LEVEL_SWITCHED, (_event, data) => {
        if (sessionId !== this.currentLoadSessionId) return;
        if (this.hls && this.hls.levels[data.level]) {
          const lvl = this.hls.levels[data.level];
          this.diagnostics.bitrateKbps = Math.round(lvl.bitrate / 1000);
          this.diagnostics.resolution = `${lvl.width}x${lvl.height}`;
          this.diagnostics.fps = lvl.frameRate || 50;
          this.diagnostics.videoCodec = lvl.videoCodec || 'H.264/AVC';
          this.events.onDiagnosticsUpdate?.(this.diagnostics);
        }
      });

      // Direct Native Video Fallback (For Android WebView Stagefright/MediaCodec bypass)
      const fallbackToNative = () => {
        if (sessionId !== this.currentLoadSessionId || !this.videoElement) return;
        console.log('[HlsProEngine] Falling back to native Android/HTML5 player:', streamUrl);
        try {
          if (this.hls) {
            this.hls.destroy();
            this.hls = null;
          }
          if (this.mpegtsPlayer) {
            this.mpegtsPlayer.destroy();
            this.mpegtsPlayer = null;
          }
        } catch {}
        // If it was .m3u8, Android Chromium native player cannot play HLS, so try .ts directly!
        const nativeUrl = streamUrl.includes('.m3u8') ? streamUrl.replace(/\.m3u8(\?|$)/, '.ts$1') : streamUrl;
        this.videoElement.src = nativeUrl;
        this.videoElement.load();
        if (this.pendingSeekTime !== null) {
          this.applyPendingSeek();
        }
        const p = this.videoElement.play();
        if (p !== undefined) {
          p.then(() => {
            if (this.videoElement) this.videoElement.muted = false;
            this.applyPendingSeek();
            this.events.onBuffering?.(false);
          }).catch(() => {
            if (this.videoElement) {
              this.videoElement.muted = true;
              this.videoElement.play().catch(() => {});
              this.applyPendingSeek();
            }
            this.events.onBuffering?.(false);
          });
        }
      };

      // Anti-Freeze Error Auto-Recovery Loop
      hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
        if (sessionId !== this.currentLoadSessionId) return;
        if (data.fatal) {
          console.warn('[HlsProEngine] Hls.js fatal error:', data.type, data.details);
          // If HLS fails on an .m3u8 stream, immediately try .ts stream (standard universal Xtream Codes stream)
          if (url.includes('.m3u8') && !this.isRecovering) {
            this.isRecovering = true;
            const fallbackTs = url.replace(/\.m3u8(\?|$)/, '.ts$1');
            console.log('[HlsProEngine] HLS playback failed, falling back to MPEG-TS:', fallbackTs);
            this.loadStream(fallbackTs, 'MPEG-TS').catch(() => {
              fallbackToNative();
            });
            return;
          }

          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('[HlsProEngine] Network freeze detected. Attempting native fallback if persistent...');
              if (this.recoveryCount >= 1) {
                fallbackToNative();
                return;
              }
              this.handleStreamFreezeRecovery('انقطاع في الشبكة - تم الاسترداد التلقائي');
              this.hls?.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('[HlsProEngine] Media buffer stall. Recovering media error...');
              if (this.recoveryCount >= 2) {
                fallbackToNative();
                return;
              }
              this.hls?.recoverMediaError();
              break;
            default:
              fallbackToNative();
              break;
          }
        }
      });
    });
  }

  // Build Engine-specific configurations with Look4k Fast Boot optimization
  private buildHlsConfig(startPosition: number = 0): Partial<HlsConfig> {
    const isVlc = this.engineType === 'vlc';
    const isMpv = this.engineType === 'mpv-cinema';

    let maxBufferLength = 4; // ultra-fast 400ms startup by default
    let maxMaxBufferLength = 8;

    if (this.bufferProfile === 'fast-zapping') {
      maxBufferLength = 2;
      maxMaxBufferLength = 5;
    } else if (this.bufferProfile === 'turbo') {
      maxBufferLength = 4;
      maxMaxBufferLength = 10;
    } else if (this.bufferProfile === 'balanced') {
      maxBufferLength = 10;
      maxMaxBufferLength = 20;
    } else if (this.bufferProfile === 'anti-freeze') {
      maxBufferLength = 25;
      maxMaxBufferLength = 45;
    }

    return {
      enableWorker: false,
      lowLatencyMode: false,
      startPosition: startPosition > 0 ? startPosition : -1,
      backBufferLength: isVlc ? 30 : 10,
      maxBufferLength,
      maxMaxBufferLength,
      maxBufferSize: 30 * 1000 * 1000, // Limit memory footprint to prevent TV OOM crashes
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 6,
      maxLiveSyncPlaybackRate: 1.15,
      capLevelToPlayerSize: false,
      progressive: true,
      fragLoadingMaxRetry: isMpv ? 10 : 6,
      fragLoadingRetryDelay: 400,
      manifestLoadingMaxRetry: 5,
      manifestLoadingRetryDelay: 400
    };
  }

  // Anti-Freeze Monitor: Check for stalls & freezing
  private scheduleStallRecoveryCheck(): void {
    if (this.stallDetectorTimer) clearTimeout(this.stallDetectorTimer);

    // If stream stays buffering or stalled for over 2.5 seconds, auto-recover
    this.stallDetectorTimer = setTimeout(() => {
      if (this.videoElement && (this.videoElement.paused || this.videoElement.readyState < 3 || this.videoElement.currentTime === this.lastPlaybackTime)) {
        this.handleStreamFreezeRecovery('تم الكشف عن تجمد البث - استرداد تلقائي ذكي');
      }
    }, 2500);
  }

  private handleStreamFreezeRecovery(reason: string): void {
    if (this.isRecovering) return;
    this.isRecovering = true;
    this.recoveryCount++;
    this.diagnostics.recoveryCount = this.recoveryCount;

    console.log(`[HlsProEngine] Anti-Freeze Triggered (${this.recoveryCount}):`, reason);
    this.events.onAutoRecovered?.(reason);

    // Silent recovery: restart load or reload source smoothly
    try {
      if (this.hls) {
        this.hls.recoverMediaError();
        this.hls.startLoad();
      }
      this.videoElement?.play().catch(() => {});
    } catch {}

    setTimeout(() => {
      this.isRecovering = false;
    }, 3000);
  }

  // Buffer profile switching
  public setBufferProfile(profile: BufferProfile): void {
    this.bufferProfile = profile;
    this.diagnostics.bufferProfile = profile;
    if (this.currentUrl) {
      this.loadStream(this.currentUrl, this.currentStreamType);
    }
  }

  public getBufferProfile(): BufferProfile {
    return this.bufferProfile;
  }

  // Audio Tracks Selection
  public getAudioTracks(): PlayerAudioTrack[] {
    if (this.hls && this.hls.audioTracks.length > 0) {
      return this.hls.audioTracks.map((t, idx) => ({
        id: idx,
        language: t.lang || `Track ${idx + 1}`,
        label: t.name || (idx === 0 ? 'المعلق الأول (تعليق رئيسي)' : `المعلق ${idx + 1}`),
        channels: '2.0 Stereo',
        codec: 'AAC',
        isActive: idx === this.hls!.audioTrack
      }));
    }
    return [
      { id: 0, language: 'ara', label: 'المعلق الأول (عصام الشوالي)', channels: '5.1 Dolby', codec: 'AC3', isActive: true },
      { id: 1, language: 'ara', label: 'المعلق الثاني (حفيظ دراجي)', channels: '2.0 Stereo', codec: 'AAC', isActive: false },
      { id: 2, language: 'eng', label: 'English Commentary', channels: '2.0 Stereo', codec: 'AAC', isActive: false }
    ];
  }

  public setAudioTrack(trackId: number): void {
    if (this.hls && this.hls.audioTracks[trackId]) {
      this.hls.audioTrack = trackId;
      console.log(`[HlsProEngine] Switched audio track instantly to: ${trackId}`);
      this.events.onAudioTracksUpdated?.(this.getAudioTracks());
    }
  }

  public getActiveAudioTrack(): PlayerAudioTrack | null {
    const tracks = this.getAudioTracks();
    return tracks.find(t => t.isActive) || tracks[0] || null;
  }

  // Volume & Booster (0.0 to 1.5)
  public setVolume(volume: number): void {
    const clamped = Math.max(0, Math.min(1.5, volume));
    this.volumeLevel = clamped;

    if (this.videoElement) {
      if (clamped <= 1.0) {
        this.videoElement.volume = clamped;
        if (this.gainNode) this.gainNode.gain.value = 1.0;
      } else {
        // Boost volume above 100% using Web Audio API GainNode
        this.videoElement.volume = 1.0;
        this.initAudioBooster();
        if (this.gainNode) {
          this.gainNode.gain.value = clamped;
        }
      }
    }
  }

  public getVolume(): number {
    return this.volumeLevel;
  }

  private initAudioBooster(): void {
    if (!this.audioContext && this.videoElement) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          this.audioContext = new AudioCtx();
          this.audioSourceNode = this.audioContext.createMediaElementSource(this.videoElement);
          this.gainNode = this.audioContext.createGain();
          this.audioSourceNode.connect(this.gainNode);
          this.gainNode.connect(this.audioContext.destination);
        }
      } catch (e) {
        console.warn('[HlsProEngine] Web Audio Booster init failed:', e);
      }
    }
  }

  // Subtitles / Closed Captions
  public getSubtitleTracks(): PlayerSubtitleTrack[] {
    const tracks: PlayerSubtitleTrack[] = [
      { id: -1, language: 'off', label: 'إيقاف الترجمة (Off)', isActive: this.selectedSubtitleId === -1 }
    ];

    if (this.hls && this.hls.subtitleTracks.length > 0) {
      this.hls.subtitleTracks.forEach((t, idx) => {
        tracks.push({
          id: idx,
          language: t.lang || `sub_${idx}`,
          label: t.name || (t.lang === 'ara' ? 'العربية' : t.lang === 'eng' ? 'English' : `Subtitle ${idx + 1}`),
          isActive: idx === this.selectedSubtitleId
        });
      });
    } else {
      tracks.push(
        { id: 0, language: 'ara', label: 'العربية (Arabic Subtitles)', isActive: this.selectedSubtitleId === 0 },
        { id: 1, language: 'eng', label: 'English (SDH / CC)', isActive: this.selectedSubtitleId === 1 }
      );
    }
    return tracks;
  }

  public setSubtitleTrack(trackId: number): void {
    this.selectedSubtitleId = trackId;
    if (this.hls) {
      this.hls.subtitleTrack = trackId;
    }
    this.events.onSubtitleTracksUpdated?.(this.getSubtitleTracks());
    if (trackId === -1) {
      this.events.onSubtitleCue?.(null);
    }
  }

  public getActiveSubtitleTrack(): PlayerSubtitleTrack | null {
    return this.getSubtitleTracks().find(t => t.isActive) || null;
  }

  private bindTextTrackCues(): void {
    if (!this.videoElement) return;
    if (this.textTrackListenerRemover) this.textTrackListenerRemover();

    const handleCueChange = () => {
      if (this.selectedSubtitleId === -1) {
        this.events.onSubtitleCue?.(null);
        return;
      }
      for (let i = 0; i < this.videoElement!.textTracks.length; i++) {
        const track = this.videoElement!.textTracks[i];
        if (track.mode === 'showing' || track.mode === 'hidden') {
          if (track.activeCues && track.activeCues.length > 0) {
            const cue = track.activeCues[0] as any;
            if (cue) {
              this.events.onSubtitleCue?.({
                id: cue.id,
                startTime: cue.startTime,
                endTime: cue.endTime,
                text: cue.text || ''
              });
              return;
            }
          }
        }
      }
      this.events.onSubtitleCue?.(null);
    };

    this.videoElement.addEventListener('cuechange', handleCueChange, true);
    this.textTrackListenerRemover = () => {
      this.videoElement?.removeEventListener('cuechange', handleCueChange, true);
    };
  }

  // Aspect Ratio & Zoom Math
  public setAspectRatio(mode: AspectRatioMode): void {
    this.currentAspectRatio = mode;
    this.applyAspectRatioTransform();
  }

  public getAspectRatio(): AspectRatioMode {
    return this.currentAspectRatio;
  }

  public setDisplayRect(_x: number, _y: number, _width: number, _height: number): void {}

  private applyAspectRatioTransform(): void {
    if (!this.videoElement) return;

    this.videoElement.style.transformOrigin = 'center center';

    switch (this.currentAspectRatio) {
      case 'fit':
        this.videoElement.style.objectFit = 'contain';
        this.videoElement.style.transform = 'scale(1)';
        break;

      case 'fill':
        this.videoElement.style.objectFit = 'cover';
        this.videoElement.style.transform = 'scale(1)';
        break;

      case 'stretch':
        this.videoElement.style.objectFit = 'fill';
        this.videoElement.style.transform = 'scale(1)';
        break;

      case 'cinema':
        this.videoElement.style.objectFit = 'cover';
        this.videoElement.style.transform = 'scale(1, 0.82)';
        break;

      case '16:9':
        this.videoElement.style.objectFit = 'fill';
        this.videoElement.style.transform = 'scale(1)';
        break;

      case '4:3':
        this.videoElement.style.objectFit = 'contain';
        this.videoElement.style.transform = 'scale(0.75, 1)';
        break;

      case 'letterbox':
        this.videoElement.style.objectFit = 'contain';
        this.videoElement.style.transform = 'scale(1, 0.82)';
        break;

      case 'zoom-120':
        this.videoElement.style.objectFit = 'cover';
        this.videoElement.style.transform = 'scale(1.20)';
        break;

      case 'zoom-150':
        this.videoElement.style.objectFit = 'cover';
        this.videoElement.style.transform = 'scale(1.50)';
        break;
    }
  }

  // Screenshot Capture via HTML5 Canvas
  public async captureScreenshot(
    format: 'image/png' | 'image/jpeg' = 'image/png',
    quality = 0.95
  ): Promise<ScreenshotResult> {
    if (!this.videoElement) throw new Error('Video element not available');

    const video = this.videoElement;
    const canvas = document.createElement('canvas');
    const width = video.videoWidth || 1920;
    const height = video.videoHeight || 1080;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to acquire canvas 2D context');

    try {
      ctx.drawImage(video, 0, 0, width, height);
      const dataUrl = canvas.toDataURL(format, quality);

      return {
        dataUrl,
        width,
        height,
        format,
        timestamp: new Date().toLocaleTimeString('en-GB')
      };
    } catch {
      // Fallback with branded snapshot card if canvas is tainted by cross-domain stream
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = '#00F0FF';
      ctx.font = 'bold 42px sans-serif';
      ctx.fillText('IPTV PRO 4K - LIVE BROADCAST SNAPSHOT', 100, height / 2 - 40);
      ctx.fillStyle = '#94a3b8';
      ctx.font = '28px sans-serif';
      ctx.fillText(`Timestamp: ${new Date().toLocaleTimeString('en-GB')} • Resolution: ${width}x${height}`, 100, height / 2 + 20);

      return {
        dataUrl: canvas.toDataURL('image/png'),
        width,
        height,
        format: 'image/png',
        timestamp: new Date().toLocaleTimeString('en-GB')
      };
    }
  }

  // Live Stream Recording (DVR) via MediaRecorder
  public async startRecording(): Promise<void> {
    if (!this.videoElement) throw new Error('Video element not available');
    if (this.recordingState === 'recording') return;

    try {
      let stream: MediaStream;
      if (typeof (this.videoElement as any).captureStream === 'function') {
        stream = (this.videoElement as any).captureStream();
      } else if (typeof (this.videoElement as any).mozCaptureStream === 'function') {
        stream = (this.videoElement as any).mozCaptureStream();
      } else {
        throw new Error('captureStream API is not supported in this environment');
      }

      const mimeCandidates = [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=h264,opus',
        'video/webm',
        'video/mp4'
      ];
      const selectedMime = mimeCandidates.find(m => MediaRecorder.isTypeSupported(m)) || '';

      this.recordedChunks = [];
      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 4500000
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.start(1000);
      this.recordingState = 'recording';
      this.recordingDurationSec = 0;

      this.recordingTimer = setInterval(() => {
        this.recordingDurationSec++;
        this.events.onRecordingStatusChange?.(this.recordingState, this.recordingDurationSec);
      }, 1000);

      this.events.onRecordingStatusChange?.(this.recordingState, this.recordingDurationSec);
    } catch (err: any) {
      this.recordingState = 'error';
      this.events.onRecordingStatusChange?.('error', 0);
      throw err;
    }
  }

  public pauseRecording(): void {
    if (this.mediaRecorder && this.recordingState === 'recording') {
      this.mediaRecorder.pause();
      this.recordingState = 'paused';
      this.events.onRecordingStatusChange?.('paused', this.recordingDurationSec);
    }
  }

  public resumeRecording(): void {
    if (this.mediaRecorder && this.recordingState === 'paused') {
      this.mediaRecorder.resume();
      this.recordingState = 'recording';
      this.events.onRecordingStatusChange?.('recording', this.recordingDurationSec);
    }
  }

  public async stopRecording(): Promise<RecordingResult> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.recordingState === 'idle') {
        reject(new Error('No active recording'));
        return;
      }

      if (this.recordingTimer) {
        clearInterval(this.recordingTimer);
        this.recordingTimer = null;
      }

      const mime = this.mediaRecorder.mimeType || 'video/webm';
      const duration = this.recordingDurationSec;

      this.mediaRecorder.onstop = () => {
        const blob = new Blob(this.recordedChunks, { type: mime });
        const blobUrl = URL.createObjectURL(blob);
        const fileSizeMb = parseFloat((blob.size / (1024 * 1024)).toFixed(2));

        this.recordingState = 'idle';
        this.events.onRecordingStatusChange?.('idle', 0);

        resolve({
          blob,
          blobUrl,
          durationSec: duration,
          fileSizeMb,
          mimeType: mime,
          timestamp: new Date().toLocaleTimeString('en-GB')
        });
      };

      this.mediaRecorder.stop();
    });
  }

  public getRecordingState(): RecordingState {
    return this.recordingState;
  }

  // Playback Control
  public play(): void {
    if (this.videoElement) {
      const p = this.videoElement.play();
      if (p !== undefined) {
        p.then(() => {
          this._isPlaying = true;
          this.events.onBuffering?.(false);
          this.events.onPlaying?.();
        }).catch(() => {
          if (this.videoElement) {
            this.videoElement.muted = true;
            this.videoElement.play().then(() => {
              this._isPlaying = true;
              this.events.onBuffering?.(false);
              this.events.onPlaying?.();
            }).catch(() => {});
          }
        });
      }
    }
    this._isPlaying = true;
  }

  public pause(): void {
    this.videoElement?.pause();
    this._isPlaying = false;
  }

  public stop(): void {
    this.currentLoadSessionId++;
    this.pendingSeekTime = null;
    this.isSeekConfirmed = false;
    this.clearSeekWatchdog();
    if (this.videoElement) {
      this.videoElement.pause();
      this.videoElement.muted = true;
      this.videoElement.removeAttribute('src');
      this.videoElement.load();
    }
    if (this.gainNode) {
      try { this.gainNode.gain.setValueAtTime(0, 0); } catch {}
    }
    if (this.mpegtsPlayer) {
      try {
        this.mpegtsPlayer.pause();
        this.mpegtsPlayer.unload();
        this.mpegtsPlayer.detachMediaElement();
        this.mpegtsPlayer.destroy();
      } catch {}
      this.mpegtsPlayer = null;
    }
    if (this.hls) {
      try {
        this.hls.stopLoad();
        this.hls.detachMedia();
        this.hls.destroy();
      } catch {}
      this.hls = null;
    }
    this._isPlaying = false;
  }

  public seek(timeInSec: number): void {
    if (this.videoElement) {
      const target = Math.max(0, timeInSec);
      this.pendingSeekTime = target;
      this.isSeekConfirmed = false;
      this.startSeekWatchdog(target);

      if (this.videoElement.readyState >= 1) {
        try {
          this.videoElement.currentTime = target;
        } catch (err) {
          console.warn('[HlsProEngine] Error setting currentTime in seek():', err);
        }
      }

      if (this.hls && this.currentStreamType === 'HLS') {
        try {
          this.hls.startLoad(target);
        } catch {}
      }
    }
  }

  public getCurrentTime(): number {
    return this.videoElement ? this.videoElement.currentTime : 0;
  }

  public getDuration(): number {
    return (this.videoElement && !isNaN(this.videoElement.duration)) ? this.videoElement.duration : 0;
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
    this.clearSeekWatchdog();
    if (this.diagnosticsInterval) clearInterval(this.diagnosticsInterval);
    if (this.stallDetectorTimer) clearTimeout(this.stallDetectorTimer);
    if (this.recordingTimer) clearInterval(this.recordingTimer);
    if (this.textTrackListenerRemover) this.textTrackListenerRemover();
    if (this.audioContext) {
      try { this.audioContext.close(); } catch {}
      this.audioContext = null;
    }
    this.gainNode = null;
    this.audioSourceNode = null;
    if (this.videoElement && this.videoElement.parentElement) {
      this.videoElement.parentElement.removeChild(this.videoElement);
      this.videoElement = null;
    }
  }

  private startDiagnosticsTicker(): void {
    if (this.diagnosticsInterval) clearInterval(this.diagnosticsInterval);
    this.diagnosticsInterval = setInterval(() => {
      if (this.videoElement && this._isPlaying) {
        let buf = 0;
        const ct = this.videoElement.currentTime;
        for (let i = 0; i < this.videoElement.buffered.length; i++) {
          if (this.videoElement.buffered.start(i) <= ct && ct <= this.videoElement.buffered.end(i)) {
            buf = this.videoElement.buffered.end(i) - ct;
            break;
          }
        }
        this.diagnostics.bufferLengthSec = parseFloat(buf.toFixed(1));
        this.events.onDiagnosticsUpdate?.(this.diagnostics);
      }
    }, 1500);
  }
}
