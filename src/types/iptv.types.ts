export type ScreenType = 'auth' | 'home' | 'live' | 'vod' | 'series' | 'favorites' | 'settings' | 'vod-player' | 'admin';

export interface UserAccount {
  username: string;
  password?: string;
  authType: 'code' | 'credentials';
  status: 'Active' | 'Expired' | 'Trial';
  expDate: string; // Timestamp or human date
  daysRemaining: number;
  maxConnections: number;
  activeConnections: number;
  serverUrl?: string; // Kept internal, hidden from user
  isLiveServer?: boolean; // true if authenticated against live Xtream server (e.g. look4k.net)
  serverName?: string;
  serverPingMs?: number;
  profileId?: string;
}

export interface UserProfile {
  id: string;
  name: string;
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
  lastUsedAt: number;
  createdAt: number;
}

export interface LiveCategory {
  category_id: string;
  category_name: string;
  parent_id?: number;
  stream_count?: number;
}

export interface LiveChannel {
  num: number;
  name: string;
  stream_type: string;
  stream_id: number;
  stream_icon: string;
  epg_channel_id: string | null;
  category_id: string;
  added: string;
  custom_sid: string | null;
  tv_archive: number;
  direct_source: string;
  resolution?: '4K UHD' | 'FHD' | 'HD' | 'SD';
  fps?: number;
  currentProgram?: EpgProgram;
  nextProgram?: EpgProgram;
  isFavorite?: boolean;
}

export interface EpgProgram {
  id: string;
  title: string;
  start: string; // 'HH:mm'
  end: string;   // 'HH:mm'
  startTimeStamp: number;
  endTimeStamp: number;
  description: string;
  progressPercentage: number;
}

export interface VodItem {
  num: number;
  name: string;
  stream_type: 'movie' | 'series';
  stream_id: number;
  stream_icon: string;
  backdrop?: string;
  rating: number;
  year: string;
  duration?: string;
  durationSec?: number;
  category_id: string;
  plot?: string;
  director?: string;
  cast?: string;
  direct_source?: string;
  container_extension?: string;
}

export interface SeriesEpisode {
  id: string | number;
  episode_num: number;
  season_num: number;
  title: string;
  overview?: string;
  duration?: string;
  durationSec?: number;
  stream_id: number;
  stream_icon?: string;
  direct_source: string;
  rating?: number;
  release_date?: string;
}

export interface SeriesSeason {
  season_number: number;
  name: string;
  episode_count: number;
  episodes: SeriesEpisode[];
}

export interface SeriesItem {
  series_id: number;
  name: string;
  cover: string;
  backdrop?: string;
  plot: string;
  cast?: string;
  director?: string;
  genre?: string;
  releaseDate?: string;
  rating: number;
  category_id: string;
  seasonsCount: number;
  seasons: SeriesSeason[];
}

export interface VodPlaybackItem {
  id: string | number;
  title: string;
  subtitle?: string; // e.g. "الموسم 1 - الحلقة 3" or "4K HDR • 2025"
  streamUrl: string;
  posterUrl: string;
  backdropUrl?: string;
  durationSec?: number;
  streamType: 'movie' | 'episode';
  plot?: string;
  rating?: number;
  year?: string;
  director?: string;
  cast?: string;
  seriesId?: number;
  seasonNum?: number;
  episodeNum?: number;
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
}

export interface PlayerTrack {
  id: number;
  type: 'audio' | 'subtitle';
  language: string;
  label: string;
  isActive: boolean;
}
