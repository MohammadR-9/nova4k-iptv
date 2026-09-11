import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Play, Pause, RotateCcw, RotateCw, 
  ArrowLeft, Volume2, Subtitles, 
  FastForward, Rewind, 
  Check, Clock, ShieldCheck, Film, AlertCircle,
  Maximize2, Zap 
} from 'lucide-react';
import { VodPlaybackItem } from '../../types/iptv.types';
import { PlayerAudioTrack, PlayerSubtitleTrack, AspectRatioMode, PlayerEngineType } from '../../player/types';
import { PlayerManager } from '../../player/PlayerManager';
import { VodResumeService, ResumePoint } from '../../services/vodResume.service';
import { TV_KEYS } from '../../navigation/keycodes';
import { spatialNav } from '../../navigation/spatialNav';

interface VodPlayerProps {
  item: VodPlaybackItem;
  onBack: () => void;
  externalTriggerKey?: number | null;
}

export const VodPlayer: React.FC<VodPlayerProps> = ({ item, onBack, externalTriggerKey }) => {
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const player = useRef(PlayerManager.getPlayer());

  // Playback state
  const [isPlaying, setIsPlaying] = useState(true);
  const [isBuffering, setIsBuffering] = useState(true);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(item.durationSec || 0);
  const [streamError, setStreamError] = useState<string | null>(null);

  // OSD controls visibility & auto-hide
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<any>(null);

  // Central seek indicator feedback (e.g. +10s, -10s)
  const [seekFeedback, setSeekFeedback] = useState<{
    icon: 'fwd' | 'rwd' | 'play' | 'pause';
    text: string;
    targetTime: number;
  } | null>(null);
  const seekFeedbackTimeoutRef = useRef<any>(null);

  // Audio and Subtitle tracks
  const [audioTracks, setAudioTracks] = useState<PlayerAudioTrack[]>([]);
  const [subtitleTracks, setSubtitleTracks] = useState<PlayerSubtitleTrack[]>([]);
  const [showAudioModal, setShowAudioModal] = useState(false);
  const [showSubtitleModal, setShowSubtitleModal] = useState(false);

  // Resume playback prompt
  const [savedResume, setSavedResume] = useState<ResumePoint | null>(null);
  const [showResumePrompt, setShowResumePrompt] = useState(false);

  // Keep latest times in refs for unmount auto-saving
  const currentTimeRef = useRef(0);
  const durationRef = useRef(0);
  currentTimeRef.current = currentTime;
  // Pending resume: seek to this time on the FIRST onPlaying event
  const pendingResumeRef = useRef<number | null>(null);
  // Debounce: only show spinner after 1.2s of continuous buffering
  const bufferingDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Aspect ratio and player engine
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('fit');
  const [activeEngine, setActiveEngine] = useState<PlayerEngineType>('exoplayer');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Watchdog: guarantee buffering spinner never gets stuck on VOD playback
  useEffect(() => {
    let timer: any;
    if (isBuffering) {
      timer = setTimeout(() => {
        setIsBuffering(false);
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [isBuffering]);

  const handleCycleAspectRatio = () => {
    const modes: AspectRatioMode[] = [
      'fit', 'fill', 'stretch', 'cinema', '16:9', '4:3', 'letterbox', 'zoom-120', 'zoom-150'
    ];
    const idx = modes.indexOf(aspectRatio);
    const next = modes[(idx + 1) % modes.length];
    setAspectRatio(next);
    player.current.setAspectRatio(next);

    const names: Record<AspectRatioMode, string> = {
      'fit': 'تناسب تلقائي (Auto Fit)',
      'fill': 'ملء الشاشة (Cover Fill)',
      'stretch': 'شاشة ممتدة بالكامل (Full Stretch)',
      'cinema': 'سينمائي عريض 21:9 (Cinema Scope)',
      '16:9': 'شاشة عريضة 16:9 (Standard Wide)',
      '4:3': 'شاشة كلاسيكية 4:3 (Pillarbox - سواد على الجوانب)',
      'letterbox': 'شريط سينمائي (Letterbox - سواد أعلى وأسفل)',
      'zoom-120': 'تكبير ذكي 120% (Zoom+)',
      'zoom-150': 'تكبير فائق 150% (Zoom Max)'
    };
    setToastMessage(`وضع الشاشة: ${names[next]}`);
    setTimeout(() => setToastMessage(null), 2500);
    resetControlsTimer();
  };

  const handleEngineSwitch = async (engine: PlayerEngineType) => {
    setActiveEngine(engine);
    if (videoContainerRef.current) {
      const newPlayer = await PlayerManager.switchEngine(engine, videoContainerRef.current, {
        onPlaying: () => {
          setIsBuffering(false);
          setIsPlaying(true);
        },
        onBuffering: (b) => setIsBuffering(b),
        onTimeUpdate: (cur, dur) => {
          setCurrentTime(cur);
          if (dur > 0) setDuration(dur);
        },
        onError: (err) => {
          setStreamError(err || 'خطأ في تشغيل الفيديو');
          setIsBuffering(false);
        }
      });
      player.current = newPlayer;
      player.current.setAspectRatio(aspectRatio);
      setToastMessage(`تم التبديل إلى محرك: ${engine.toUpperCase()}`);
      setTimeout(() => setToastMessage(null), 2500);
      resetControlsTimer();
    }
  };

  // Real-time clock in top right
  const [systemClock, setSystemClock] = useState('');
  useEffect(() => {
    const update = () => {
      const d = new Date();
      setSystemClock(d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }));
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // 1. Reset and manage OSD auto-hide timer
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    // Auto-hide after 4.5 seconds if playing and modals are closed
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying && !showAudioModal && !showSubtitleModal && !showResumePrompt) {
        setShowControls(false);
      }
    }, 4500);
  }, [isPlaying, showAudioModal, showSubtitleModal, showResumePrompt]);

  // 2. Center visual feedback trigger
  const showCenterFeedback = (icon: 'fwd' | 'rwd' | 'play' | 'pause', text: string, targetTime: number) => {
    setSeekFeedback({ icon, text, targetTime });
    if (seekFeedbackTimeoutRef.current) {
      clearTimeout(seekFeedbackTimeoutRef.current);
    }
    seekFeedbackTimeoutRef.current = setTimeout(() => {
      setSeekFeedback(null);
    }, 1300);
  };

  // 3. Seeking relative function (10s, 60s)
  const seekRelative = useCallback((deltaSec: number) => {
    const total = durationRef.current > 0 ? durationRef.current : 7200;
    const current = currentTimeRef.current;
    const target = Math.max(0, Math.min(total, current + deltaSec));

    player.current.seek(target);
    setCurrentTime(target);
    currentTimeRef.current = target;

    const label = deltaSec > 0 ? `+${deltaSec} ثانية` : `${deltaSec} ثانية`;
    showCenterFeedback(deltaSec > 0 ? 'fwd' : 'rwd', label, target);
    resetControlsTimer();
  }, [resetControlsTimer]);

  // 4. Toggle Play / Pause
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      player.current.pause();
      setIsPlaying(false);
      setShowControls(true);
      showCenterFeedback('pause', 'إيقاف مؤقت', currentTimeRef.current);
    } else {
      player.current.play();
      setIsPlaying(true);
      showCenterFeedback('play', 'متابعة التشغيل', currentTimeRef.current);
      resetControlsTimer();
    }
  }, [isPlaying, resetControlsTimer]);

  // 5. Initialize Player & Load stream
  useEffect(() => {
    let isMounted = true;
    setStreamError(null);
    setIsBuffering(true);

    if (videoContainerRef.current) {
      player.current.initialize(videoContainerRef.current, {
        onPlaying: () => {
          if (!isMounted) return;
          if (bufferingDebounceRef.current) {
            clearTimeout(bufferingDebounceRef.current);
            bufferingDebounceRef.current = null;
          }
          setIsBuffering(false);
          setIsPlaying(true);
          setAudioTracks(player.current.getAudioTracks());
          setSubtitleTracks(player.current.getSubtitleTracks());
          // Execute deferred resume seek — video is now actually ready
          if (pendingResumeRef.current !== null) {
            const t = pendingResumeRef.current;
            pendingResumeRef.current = null;
            player.current.seek(t);
            setCurrentTime(t);
            currentTimeRef.current = t;
          }
        },
        onBuffering: (buffering) => {
          if (!isMounted) return;
          if (buffering) {
            // Only show spinner if buffering persists longer than 1.2s
            if (!bufferingDebounceRef.current) {
              bufferingDebounceRef.current = setTimeout(() => {
                bufferingDebounceRef.current = null;
                setIsBuffering(true);
              }, 1200);
            }
          } else {
            // Buffering finished: cancel pending show & clear state
            if (bufferingDebounceRef.current) {
              clearTimeout(bufferingDebounceRef.current);
              bufferingDebounceRef.current = null;
            }
            setIsBuffering(false);
          }
        },
        onTimeUpdate: (cur, dur) => {
          if (!isMounted) return;
          setCurrentTime(cur);
          if (dur > 0 && dur !== durationRef.current) {
            setDuration(dur);
          }
        },
        onError: (err) => {
          if (!isMounted) return;
          console.error('[VodPlayer] Playback error:', err);
          setStreamError(err || 'تعذر تشغيل الفيديو');
          setIsBuffering(false);
        }
      });

      // Check saved resume point
      const saved = VodResumeService.getResumePoint(item.id);
      if (saved && saved.currentTimeSec > 10) {
        setSavedResume(saved);
        setShowResumePrompt(true);
        setTimeout(() => {
          spatialNav.setFocus('btn-resume-accept');
        }, 150);
      } else {
        setTimeout(() => {
          spatialNav.setFocus('btn-play-pause');
        }, 200);
      }

      // Determine stream protocol
      const streamType = item.streamUrl.endsWith('.m3u8') ? 'HLS' : 'MP4';
      player.current.loadStream(item.streamUrl, streamType).then(() => {
        if (!isMounted) return;
        setAudioTracks(player.current.getAudioTracks());
        setSubtitleTracks(player.current.getSubtitleTracks());
      }).catch((err) => {
        if (!isMounted) return;
        console.error('[VodPlayer] loadStream error:', err);
        setStreamError('خطأ في تحميل ملف الفيديو');
        setIsBuffering(false);
      });
    }

    resetControlsTimer();

    // 6. Periodic auto-save every 5s
    const saveInterval = setInterval(() => {
      if (currentTimeRef.current >= 10 && durationRef.current > 0) {
        VodResumeService.saveResumePoint(item.id, currentTimeRef.current, durationRef.current);
      }
    }, 5000);

    return () => {
      isMounted = false;
      clearInterval(saveInterval);
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
      if (seekFeedbackTimeoutRef.current) clearTimeout(seekFeedbackTimeoutRef.current);
      if (bufferingDebounceRef.current) clearTimeout(bufferingDebounceRef.current);
      
      // Save progress on exit
      if (currentTimeRef.current >= 10) {
        VodResumeService.saveResumePoint(item.id, currentTimeRef.current, durationRef.current);
      }
      player.current.stop();
    };
  }, [item, resetControlsTimer]);

  // 7. Resume Dialog handlers
  const handleResumeAccept = () => {
    if (savedResume) {
      const targetTime = savedResume.currentTimeSec;
      pendingResumeRef.current = targetTime;
      setCurrentTime(targetTime);
      currentTimeRef.current = targetTime;

      // Immediately seek and start playback
      try {
        player.current.seek(targetTime);
        player.current.play();
        setIsPlaying(true);
      } catch (err) {
        console.warn('[VodPlayer] Error during resume seek:', err);
      }

      setToastMessage(`⏩ استئناف من ${savedResume.formattedTime}`);
      setTimeout(() => setToastMessage(null), 2500);
    }
    setShowResumePrompt(false);
    resetControlsTimer();
    setTimeout(() => spatialNav.setFocus('btn-play-pause'), 100);
  };

  const handleResumeDecline = () => {
    // Clear resume point and play from beginning
    VodResumeService.clearResumePoint(item.id);
    pendingResumeRef.current = null;
    try {
      player.current.seek(0);
      setCurrentTime(0);
      currentTimeRef.current = 0;
      player.current.play();
      setIsPlaying(true);
    } catch (err) {
      console.warn('[VodPlayer] Error during restart seek:', err);
    }
    setShowResumePrompt(false);
    resetControlsTimer();
    setTimeout(() => spatialNav.setFocus('btn-play-pause'), 100);
  };

  // 8. Remote Control & Keyboard Interaction Router
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.keyCode;

      // When resume prompt is shown, navigate within prompt
      if (showResumePrompt) {
        if (code === TV_KEYS.RETURN || code === TV_KEYS.BACKSPACE || code === TV_KEYS.ESCAPE) {
          e.preventDefault();
          handleResumeDecline();
          return;
        }
        if (code === TV_KEYS.ENTER) {
          e.preventDefault();
          const curFocus = spatialNav.getCurrentFocus();
          if (curFocus === 'btn-resume-decline') {
            handleResumeDecline();
          } else {
            handleResumeAccept();
          }
          return;
        }
        if (code === TV_KEYS.RIGHT) {
          e.preventDefault();
          spatialNav.setFocus('btn-resume-accept');
          return;
        }
        if (code === TV_KEYS.LEFT) {
          e.preventDefault();
          spatialNav.setFocus('btn-resume-decline');
          return;
        }
        return;
      }

      // If audio or subtitle modals are open
      if (showAudioModal || showSubtitleModal) {
        if (code === TV_KEYS.RETURN || code === TV_KEYS.BACKSPACE || code === TV_KEYS.ESCAPE) {
          e.preventDefault();
          setShowAudioModal(false);
          setShowSubtitleModal(false);
          resetControlsTimer();
          setTimeout(() => spatialNav.setFocus('btn-play-pause'), 100);
          return;
        }
      }

      // Reset OSD auto-hide on any key
      resetControlsTimer();

      switch (code) {
        // Arrow LEFT: Rewind 10 seconds
        case TV_KEYS.LEFT:
          // If controls are hidden, arrow left seeks immediately
          if (!showControls) {
            e.preventDefault();
            seekRelative(-10);
          } else {
            // If focus is not on buttons, or user is seeking
            const curFocus = spatialNav.getCurrentFocus();
            if (!curFocus || curFocus === 'timeline-slider' || curFocus === 'btn-play-pause') {
              e.preventDefault();
              seekRelative(-10);
            }
          }
          break;

        // Arrow RIGHT: Forward 10 seconds
        case TV_KEYS.RIGHT:
          if (!showControls) {
            e.preventDefault();
            seekRelative(10);
          } else {
            const curFocus = spatialNav.getCurrentFocus();
            if (!curFocus || curFocus === 'timeline-slider' || curFocus === 'btn-play-pause') {
              e.preventDefault();
              seekRelative(10);
            }
          }
          break;

        // Arrow UP: Show controls / Focus controls
        case TV_KEYS.UP:
          if (!showControls) {
            e.preventDefault();
            setShowControls(true);
            spatialNav.setFocus('btn-play-pause');
          }
          break;

        // Arrow DOWN: Hide controls or navigate down
        case TV_KEYS.DOWN:
          if (showControls) {
            // Hide controls on down if already on control bar
            const curFocus = spatialNav.getCurrentFocus();
            if (curFocus === 'btn-play-pause') {
              setShowControls(false);
            }
          }
          break;

        // Dedicated Media Play/Pause keys
        case TV_KEYS.PLAY:
          e.preventDefault();
          if (!isPlaying) togglePlayPause();
          break;
        case TV_KEYS.PAUSE:
          e.preventDefault();
          if (isPlaying) togglePlayPause();
          break;
        case TV_KEYS.PLAY_PAUSE:
          e.preventDefault();
          togglePlayPause();
          break;

        // Media Fast Forward & Rewind (1 minute steps)
        case TV_KEYS.FAST_FORWARD:
          e.preventDefault();
          seekRelative(60);
          break;
        case TV_KEYS.REWIND:
          e.preventDefault();
          seekRelative(-60);
          break;

        // Stop / Back
        case TV_KEYS.STOP:
        case TV_KEYS.RETURN:
        case TV_KEYS.BACKSPACE:
        case TV_KEYS.ESCAPE:
          e.preventDefault();
          handleExit();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    showControls, 
    isPlaying, 
    showAudioModal, 
    showSubtitleModal, 
    showResumePrompt, 
    seekRelative, 
    togglePlayPause, 
    resetControlsTimer
  ]);

  // 9. Sync Virtual Remote Simulator trigger key
  useEffect(() => {
    if (!externalTriggerKey) return;
    if (externalTriggerKey === TV_KEYS.PLAY_PAUSE) {
      togglePlayPause();
    } else if (externalTriggerKey === TV_KEYS.LEFT) {
      seekRelative(-10);
    } else if (externalTriggerKey === TV_KEYS.RIGHT) {
      seekRelative(10);
    } else if (externalTriggerKey === TV_KEYS.FAST_FORWARD) {
      seekRelative(60);
    } else if (externalTriggerKey === TV_KEYS.REWIND) {
      seekRelative(-60);
    }
  }, [externalTriggerKey, togglePlayPause, seekRelative]);

  // 10. Exit player cleanly
  const handleExit = () => {
    if (currentTimeRef.current >= 10) {
      VodResumeService.saveResumePoint(item.id, currentTimeRef.current, durationRef.current);
    }
    player.current.stop();
    onBack();
  };

  // Timeline progress percentage
  const progressPercent = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0;

  return (
    <div 
      className="relative w-screen h-screen bg-black overflow-hidden select-none"
      onMouseMove={resetControlsTimer}
      onClick={resetControlsTimer}
    >
      {/* 1. PRIMARY VIDEO DISPLAY SURFACE */}
      <div 
        ref={videoContainerRef} 
        className="w-full h-full bg-black flex items-center justify-center cursor-none"
      />

      {/* 2. BUFFERING OVERLAY SPINNER */}
      {isBuffering && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm pointer-events-none">
          <div className="relative w-16 h-16">
            <div className="absolute inset-0 rounded-full border-4 border-accent-cyan/20"></div>
            <div className="absolute inset-0 rounded-full border-4 border-accent-cyan border-t-transparent animate-spin"></div>
          </div>
          <span className="text-sm font-bold text-accent-cyan mt-4 tracking-wider">جاري تحميل البث السينمائي...</span>
        </div>
      )}

      {/* 3. STREAM ERROR OVERLAY */}
      {streamError && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/85 backdrop-blur-md p-8 text-center">
          <AlertCircle className="w-16 h-16 text-rose-500 mb-4" />
          <h3 className="text-2xl font-black text-white mb-2">تعذر تشغيل الفيديو</h3>
          <p className="text-sm text-slate-300 max-w-md mb-6">{streamError}</p>
          <button
            data-nav-id="btn-error-back"
            onClick={handleExit}
            className="tv-focusable px-8 py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl border border-white/20"
          >
            العودة للمكتبة
          </button>
        </div>
      )}

      {/* 4. CENTER SEEK & ACTION VISUAL FEEDBACK */}
      {seekFeedback && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none">
          <div className="px-8 py-5 bg-black/75 border border-white/20 rounded-3xl backdrop-blur-xl shadow-2xl flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-150">
            {seekFeedback.icon === 'fwd' && <FastForward className="w-12 h-12 text-accent-cyan fill-accent-cyan animate-pulse" />}
            {seekFeedback.icon === 'rwd' && <Rewind className="w-12 h-12 text-accent-cyan fill-accent-cyan animate-pulse" />}
            {seekFeedback.icon === 'play' && <Play className="w-12 h-12 text-emerald-400 fill-emerald-400" />}
            {seekFeedback.icon === 'pause' && <Pause className="w-12 h-12 text-amber-400 fill-amber-400" />}

            <span className="text-xl font-black text-white font-mono">{seekFeedback.text}</span>
            <span className="text-xs font-mono text-slate-300 bg-white/10 px-3 py-1 rounded-full">
              {VodResumeService.formatTime(seekFeedback.targetTime)}
            </span>
          </div>
        </div>
      )}

      {/* 5. RESUME POINT PROMPT DIALOG */}
      {showResumePrompt && savedResume && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-[520px] bg-[#121722] border-2 border-accent-cyan/40 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-14 h-14 rounded-2xl bg-accent-cyan/20 border border-accent-cyan/40 flex items-center justify-center mx-auto mb-4 text-accent-cyan">
              <Clock className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-black text-white mb-2">استئناف المشاهدة</h3>
            <p className="text-sm text-slate-300 leading-relaxed mb-6">
              شاهدت سابقاً حتى <strong className="text-accent-cyan font-mono">{savedResume.formattedTime}</strong> ({savedResume.percent}%)
              <br />هل ترغب في الاستئناف من حيث توقفت؟
            </p>

            <div className="grid grid-cols-2 gap-4">
              <button
                data-nav-id="btn-resume-accept"
                onClick={handleResumeAccept}
                className="tv-focusable py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm rounded-2xl shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>استئناف ({savedResume.formattedTime})</span>
              </button>

              <button
                data-nav-id="btn-resume-decline"
                onClick={handleResumeDecline}
                className="tv-focusable py-3.5 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-2xl border border-white/15 flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>البدء من البداية</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. AUDIO TRACK SELECTION MODAL */}
      {showAudioModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
          <div className="w-96 bg-[#111622] border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Volume2 className="w-5 h-5 text-accent-cyan" />
                <h4 className="text-lg font-black text-white">اختيار المسار الصوتي</h4>
              </div>
              <button 
                onClick={() => setShowAudioModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                إغلاق (Back)
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {audioTracks.map((tr) => (
                <button
                  key={tr.id}
                  data-nav-id={`audio-opt-${tr.id}`}
                  onClick={() => {
                    player.current.setAudioTrack(tr.id);
                    setAudioTracks(player.current.getAudioTracks());
                    setShowAudioModal(false);
                    resetControlsTimer();
                  }}
                  className={`tv-focusable w-full text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between border transition-all ${
                    tr.isActive
                      ? 'bg-cyan-500/20 text-accent-cyan border-accent-cyan/50 shadow-sm'
                      : 'bg-white/5 text-slate-300 hover:text-white border-white/5'
                  }`}
                >
                  <span>{tr.label}</span>
                  {tr.isActive && <Check className="w-4 h-4 text-accent-cyan" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. SUBTITLE TRACK SELECTION MODAL */}
      {showSubtitleModal && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md">
          <div className="w-96 bg-[#111622] border border-white/20 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
              <div className="flex items-center gap-2">
                <Subtitles className="w-5 h-5 text-purple-400" />
                <h4 className="text-lg font-black text-white">اختيار الترجمة</h4>
              </div>
              <button 
                onClick={() => setShowSubtitleModal(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                إغلاق (Back)
              </button>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {subtitleTracks.map((sub) => (
                <button
                  key={sub.id}
                  data-nav-id={`sub-opt-${sub.id}`}
                  onClick={() => {
                    player.current.setSubtitleTrack(sub.id);
                    setSubtitleTracks(player.current.getSubtitleTracks());
                    setShowSubtitleModal(false);
                    resetControlsTimer();
                  }}
                  className={`tv-focusable w-full text-right px-4 py-3 rounded-xl font-bold text-sm flex items-center justify-between border transition-all ${
                    sub.isActive
                      ? 'bg-purple-500/20 text-purple-300 border-purple-400/50 shadow-sm'
                      : 'bg-white/5 text-slate-300 hover:text-white border-white/5'
                  }`}
                >
                  <span>{sub.label}</span>
                  {sub.isActive && <Check className="w-4 h-4 text-purple-300" />}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 8. 10-FOOT CINEMATIC OSD LAYER */}
      <div 
        className={`absolute inset-0 z-20 flex flex-col justify-between p-12 transition-opacity duration-300 pointer-events-none ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* TOP BAR */}
        <div className="w-full flex items-center justify-between pointer-events-auto">
          {/* Back button & Title */}
          <div className="flex items-center gap-4">
            <button
              data-nav-id="btn-vod-player-back"
              onClick={handleExit}
              className="tv-focusable p-3 rounded-2xl bg-black/60 hover:bg-black/90 border border-white/20 text-slate-300 hover:text-white backdrop-blur-md"
              title="رجوع (Back)"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>

            <div className="text-right">
              <div className="flex items-center gap-2">
                <Film className="w-5 h-5 text-accent-cyan" />
                <h1 className="text-2xl font-black text-white drop-shadow-md">{item.title}</h1>
              </div>
              {item.subtitle && (
                <p className="text-xs font-bold text-accent-cyan/90 mt-0.5">{item.subtitle}</p>
              )}
            </div>
          </div>

          {/* Badges & System Clock */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-black/60 border border-white/15 rounded-xl text-xs font-bold text-slate-300 backdrop-blur-md">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>4K UHD • HDR10</span>
            </div>

            <div className="flex items-center gap-2 px-4 py-1.5 bg-black/60 border border-white/15 rounded-xl text-base font-bold font-mono text-white backdrop-blur-md">
              <Clock className="w-4 h-4 text-accent-cyan" />
              <span>{systemClock}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Toast Feedback Banner */}
        {toastMessage && (
          <div className="self-center px-5 py-2.5 rounded-2xl bg-black/85 border border-accent-cyan/50 text-white font-bold text-sm shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 pointer-events-none flex items-center gap-2">
            <Maximize2 className="w-4 h-4 text-accent-cyan" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* BOTTOM TIMELINE & CONTROL BAR */}
        <div className="w-full flex flex-col gap-4 pointer-events-auto bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 rounded-3xl border border-white/10 backdrop-blur-md shadow-2xl">
          
          {/* TIMELINE SEEK BAR */}
          <div className="w-full flex flex-col gap-2">
            <div 
              data-nav-id="timeline-slider"
              dir="ltr"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                // Bar is forced LTR so left=start, right=end — no inversion needed
                const ratio = Math.max(0, Math.min(1, clickX / rect.width));
                const target = ratio * duration;
                player.current.seek(target);
                setCurrentTime(target);
              }}
              className="tv-focusable relative w-full h-3 bg-white/15 rounded-full cursor-pointer overflow-hidden group"
            >
              {/* Progress Played Bar */}
              <div 
                className="h-full bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 rounded-full transition-all duration-100 relative"
                style={{ width: `${progressPercent}%` }}
              >
                {/* Scrubber thumb glow */}
                <span className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-[0_0_12px_rgba(0,229,255,1)]"></span>
              </div>
            </div>

            {/* TIMESTAMPS COUNTER */}
            <div className="w-full flex items-center justify-between text-xs font-mono font-bold text-slate-300">
              <div className="flex items-center gap-2">
                <span className="text-white text-sm">{VodResumeService.formatTime(currentTime)}</span>
                <span className="text-slate-500">/</span>
                <span className="text-slate-400 text-sm">{VodResumeService.formatTime(duration)}</span>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-slate-400">
                  المتبقي: -{VodResumeService.formatTime(Math.max(0, duration - currentTime))}
                </span>
                <span className="px-2 py-0.5 rounded bg-white/10 text-[10px] text-accent-cyan font-bold font-sans">
                  {Math.round(progressPercent)}%
                </span>
              </div>
            </div>
          </div>

          {/* CONTROL BUTTONS ROW */}
          <div className="w-full flex items-center justify-between pt-2">
            
            {/* Left side: Navigation hint */}
            <div className="text-[11px] text-slate-400 flex items-center gap-3">
              <span>الأسهم يمين/يسار: 10 ثوانٍ</span>
              <span>•</span>
              <span>OK: تشغيل/إيقاف</span>
              <span>•</span>
              <span>Back: خروج وحفظ</span>
            </div>

            {/* Center controls: Skip 60, Rewind 10, Play/Pause, Forward 10, Skip 60 */}
            <div className="flex items-center gap-4">
              
              {/* -60s Skip Backward */}
              <button
                data-nav-id="btn-seek-back-60"
                onClick={() => seekRelative(-60)}
                className="tv-focusable p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-mono font-bold"
                title="تأخير دقيقة (-60s)"
              >
                <RotateCcw className="w-5 h-5" />
                <span>60s-</span>
              </button>

              {/* -10s Rewind */}
              <button
                data-nav-id="btn-seek-back-10"
                onClick={() => seekRelative(-10)}
                className="tv-focusable p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-white flex items-center gap-1 text-xs font-mono font-bold"
                title="تأخير 10 ثوانٍ"
              >
                <Rewind className="w-5 h-5" />
                <span>10s-</span>
              </button>

              {/* PRIMARY PLAY / PAUSE BUTTON */}
              <button
                data-nav-id="btn-play-pause"
                onClick={togglePlayPause}
                className="tv-focusable w-16 h-16 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 flex items-center justify-center shadow-lg shadow-cyan-500/30 scale-105"
                title={isPlaying ? 'إيقاف مؤقت (Space/OK)' : 'تشغيل (Space/OK)'}
              >
                {isPlaying ? (
                  <Pause className="w-7 h-7 fill-current" />
                ) : (
                  <Play className="w-7 h-7 fill-current ml-1" />
                )}
              </button>

              {/* +10s Fast Forward */}
              <button
                data-nav-id="btn-seek-fwd-10"
                onClick={() => seekRelative(10)}
                className="tv-focusable p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 border border-white/15 text-slate-200 hover:text-white flex items-center gap-1 text-xs font-mono font-bold"
                title="تقديم 10 ثوانٍ"
              >
                <span>+10s</span>
                <FastForward className="w-5 h-5" />
              </button>

              {/* +60s Skip Forward */}
              <button
                data-nav-id="btn-seek-fwd-60"
                onClick={() => seekRelative(60)}
                className="tv-focusable p-3 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center gap-1 text-xs font-mono font-bold"
                title="تقديم دقيقة (+60s)"
              >
                <span>+60s</span>
                <RotateCw className="w-5 h-5" />
              </button>
            </div>

            {/* Right side: Engine, Aspect Ratio, Audio & Subtitles */}
            <div className="flex items-center gap-2.5">
              {/* Player Engine Switcher */}
              <button
                data-nav-id="btn-vod-engine"
                onClick={() => {
                  const engines: PlayerEngineType[] = ['exoplayer', 'vlc', 'mx-hardware', 'mpv-cinema'];
                  const idx = engines.indexOf(activeEngine);
                  const next = engines[(idx + 1) % engines.length];
                  handleEngineSwitch(next);
                }}
                className="tv-focusable px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                title="تبديل محرك التشغيل (ExoPlayer, VLC, MX Player, MPV Cinema)"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>
                  {activeEngine === 'exoplayer' ? 'Exo' : 
                   activeEngine === 'vlc' ? 'VLC' : 
                   activeEngine === 'mpv-cinema' ? 'MPV' : 'MX+'}
                </span>
              </button>

              {/* Aspect Ratio / Screen Mode */}
              <button
                data-nav-id="btn-vod-aspect"
                onClick={handleCycleAspectRatio}
                className="tv-focusable px-3 py-2 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer"
                title="تغيير أبعاد الشاشة (ملء الشاشة، سينمائي، كلاسيكي 4:3، سواد على الأطراف)"
              >
                <Maximize2 className="w-3.5 h-3.5 text-accent-cyan" />
                <span>
                  {aspectRatio === 'fit' ? 'FIT' : 
                   aspectRatio === 'fill' ? 'ملء الشاشة' : 
                   aspectRatio === 'stretch' ? 'تمديد' : 
                   aspectRatio === 'cinema' ? 'سينما 21:9' : 
                   aspectRatio === '16:9' ? '16:9' : 
                   aspectRatio === '4:3' ? 'سواد 4:3' : 
                   aspectRatio === 'letterbox' ? 'سواد سينما' : 
                   aspectRatio === 'zoom-120' ? '120%' : '150%'}
                </span>
              </button>

              <button
                data-nav-id="btn-open-audio"
                onClick={() => {
                  setShowAudioModal(true);
                  setTimeout(() => spatialNav.setFocus('audio-opt-0'), 100);
                }}
                className="tv-focusable px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center gap-2 text-xs font-bold"
              >
                <Volume2 className="w-4 h-4 text-accent-cyan" />
                <span>الصوت</span>
              </button>

              <button
                data-nav-id="btn-open-subtitles"
                onClick={() => {
                  setShowSubtitleModal(true);
                  setTimeout(() => spatialNav.setFocus('sub-opt--1'), 100);
                }}
                className="tv-focusable px-3.5 py-2.5 rounded-2xl bg-white/5 hover:bg-white/15 border border-white/10 text-slate-300 hover:text-white flex items-center gap-2 text-xs font-bold"
              >
                <Subtitles className="w-4 h-4 text-purple-400" />
                <span>الترجمة</span>
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
