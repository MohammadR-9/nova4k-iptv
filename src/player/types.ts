/**
 * Player Engine Architecture Types & Interfaces
 * Supporting ExoPlayer, VLC Universal, and Samsung MX Hardware+ engines.
 */

export type PlayerEngineType = 
  | 'exoplayer' 
  | 'vlc' 
  | 'mx-hardware' 
  | 'mpv-cinema' 
  | 'shaka-google' 
  | 'webos-luna' 
  | 'wasm-ffmpeg' 
  | 'auto';

export type BufferProfile = 'fast-zapping' | 'turbo' | 'balanced' | 'anti-freeze';

export type AspectRatioMode = 
  | 'fit' 
  | 'fill' 
  | 'stretch' 
  | 'cinema' 
  | '16:9' 
  | '4:3' 
  | 'letterbox' 
  | 'zoom-120' 
  | 'zoom-150';

export interface PlayerAudioTrack {
  id: number;
  language: string;
  label: string;
  channels?: string; // '5.1 Surround', '2.0 Stereo'
  codec?: string;    // 'AC3', 'E-AC3', 'AAC', 'MP3'
  bitrate?: number;
  isActive: boolean;
}

export interface PlayerSubtitleTrack {
  id: number;
  language: string;
  label: string;
  kind?: 'subtitles' | 'captions';
  isEmbedded?: boolean;
  isActive: boolean;
}

export interface SubtitleCue {
  id?: string;
  startTime: number;
  endTime: number;
  text: string;
}

export interface AudioOutputDevice {
  deviceId: string;
  label: string;
  kind: 'audiooutput';
  isDefault: boolean;
}

export interface StreamDiagnostics {
  bitrateKbps: number;
  resolution: string;
  fps: number;
  videoCodec: string;
  audioCodec: string;
  audioChannels: string;
  bufferLengthSec: number;
  droppedFrames: number;
  protocol: 'MPEG-TS' | 'HLS' | 'DASH' | 'MP4';
  latencyMs: number;
  engineType: PlayerEngineType;
  isHardwareAccelerated: boolean;
  isHdr: boolean;
  bufferProfile: BufferProfile;
  recoveryCount: number;
}

export type RecordingState = 'idle' | 'recording' | 'paused' | 'processing' | 'error';

export interface RecordingResult {
  blob: Blob;
  blobUrl: string;
  durationSec: number;
  fileSizeMb: number;
  mimeType: string;
  timestamp: string;
}

export interface ScreenshotResult {
  dataUrl: string;
  width: number;
  height: number;
  timestamp: string;
  format: 'image/png' | 'image/jpeg';
}

export interface PlayerEvents {
  onPlaying?: () => void;
  onBuffering?: (isBuffering: boolean) => void;
  onError?: (errorMessage: string) => void;
  onTimeUpdate?: (currentTimeSec: number, durationSec: number) => void;
  onDiagnosticsUpdate?: (stats: StreamDiagnostics) => void;
  onAudioTracksUpdated?: (tracks: PlayerAudioTrack[]) => void;
  onSubtitleTracksUpdated?: (tracks: PlayerSubtitleTrack[]) => void;
  onSubtitleCue?: (cue: SubtitleCue | null) => void;
  onRecordingStatusChange?: (state: RecordingState, durationSec: number) => void;
  onEngineChanged?: (engine: PlayerEngineType) => void;
  onAutoRecovered?: (message: string) => void;
}

export interface ITvPlayerEngine {
  readonly engineType: PlayerEngineType;
  initialize(containerElement: HTMLElement, events: PlayerEvents): void;
  loadStream(url: string, streamType?: 'HLS' | 'MPEG-TS' | 'MP4', startPosition?: number): Promise<void>;
  play(): void;
  pause(): void;
  stop(): void;
  seek(timeInSec: number): void;
  destroy(): void;
  isPlaying(): boolean;

  // Aspect Ratio & Zoom
  setAspectRatio(mode: AspectRatioMode): void;
  getAspectRatio(): AspectRatioMode;
  setDisplayRect(x: number, y: number, width: number, height: number): void;

  // Buffer & Anti-Freeze
  setBufferProfile(profile: BufferProfile): void;
  getBufferProfile(): BufferProfile;

  // Audio Tracks & Volume
  getAudioTracks(): PlayerAudioTrack[];
  setAudioTrack(trackId: number): void;
  getActiveAudioTrack(): PlayerAudioTrack | null;
  setVolume(volume: number): void; // 0.0 - 1.5 (with booster)
  getVolume(): number;

  // Subtitles
  getSubtitleTracks(): PlayerSubtitleTrack[];
  setSubtitleTrack(trackId: number): void;
  getActiveSubtitleTrack(): PlayerSubtitleTrack | null;

  // Time & Diagnostics
  getCurrentTime(): number;
  getDuration(): number;
  getDiagnostics(): StreamDiagnostics;
  getVideoElement(): HTMLVideoElement | null;

  // Screenshot & DVR
  captureScreenshot(format?: 'image/png' | 'image/jpeg', quality?: number): Promise<ScreenshotResult>;
  startRecording(): Promise<void>;
  pauseRecording(): void;
  resumeRecording(): void;
  stopRecording(): Promise<RecordingResult>;
  getRecordingState(): RecordingState;
}
