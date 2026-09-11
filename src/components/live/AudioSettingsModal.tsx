import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, Headphones, Speaker, Check, X, Sliders } from 'lucide-react';
import { PlayerAudioTrack, AudioOutputDevice } from '../../player/types';
import { AudioOutputManager } from '../../player/AudioOutputManager';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioTracks: PlayerAudioTrack[];
  onSelectTrack: (trackId: number) => void;
  currentVolume: number;
  onVolumeChange: (vol: number) => void;
  videoElement?: HTMLVideoElement | null;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  audioTracks,
  onSelectTrack,
  currentVolume,
  onVolumeChange,
  videoElement
}) => {
  const [outputDevices, setOutputDevices] = useState<AudioOutputDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('default');
  const [volume, setVolume] = useState<number>(currentVolume);

  useEffect(() => {
    if (isOpen) {
      AudioOutputManager.getAudioOutputDevices().then((devs) => {
        setOutputDevices(devs);
        setSelectedDeviceId(AudioOutputManager.getActiveDeviceId());
      });
      setVolume(currentVolume);
    }
  }, [isOpen, currentVolume]);

  if (!isOpen) return null;

  const handleDeviceSelect = async (deviceId: string) => {
    setSelectedDeviceId(deviceId);
    await AudioOutputManager.setAudioOutputDevice(deviceId, videoElement);
  };

  const handleVolumeSlide = (val: number) => {
    setVolume(val);
    onVolumeChange(val);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xl p-6 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl bg-surface-primary border border-white/10 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-accent-cyan">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">إعدادات الصوت والمعلقين والمخارج</h3>
              <p className="text-xs text-slate-400">تخصيص القنوات الصوتية ومضخم الصوت ومكبرات الصوت</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Audio Tracks & Commentary */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 mb-2.5 text-right flex items-center justify-end gap-1.5">
            <span>المسارات الصوتية وقنوات المعلقين:</span>
            <Sliders className="w-3.5 h-3.5 text-accent-cyan" />
          </h4>
          <div className="flex flex-col gap-2">
            {audioTracks.length === 0 ? (
              <p className="text-xs text-slate-500 text-right">لا توجد مسارات صوتية متعددة في هذا البث.</p>
            ) : (
              audioTracks.map((track) => (
                <button
                  key={track.id}
                  onClick={() => onSelectTrack(track.id)}
                  className={`w-full p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                    track.isActive
                      ? 'bg-cyan-500/20 border-accent-cyan text-white shadow-focus-glow-subtle'
                      : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {track.isActive && <Check className="w-4 h-4 text-accent-cyan" />}
                    <span className="text-xs text-slate-400 font-mono">[{track.codec || 'Stereo'}]</span>
                  </div>
                  <span className="text-sm font-bold">{track.label}</span>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Section 2: Audio Output Device Selector */}
        <div>
          <h4 className="text-xs font-bold text-slate-300 mb-2.5 text-right flex items-center justify-end gap-1.5">
            <span>مخرج الصوت النشط (Output Device):</span>
            <Speaker className="w-3.5 h-3.5 text-emerald-400" />
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {outputDevices.map((dev) => (
              <button
                key={dev.deviceId}
                onClick={() => handleDeviceSelect(dev.deviceId)}
                className={`p-3 rounded-xl border text-right flex items-center justify-between transition-all ${
                  dev.deviceId === selectedDeviceId
                    ? 'bg-emerald-500/20 border-emerald-400 text-white'
                    : 'bg-white/5 border-white/5 text-slate-300 hover:bg-white/10'
                }`}
              >
                {dev.deviceId === selectedDeviceId && <Check className="w-4 h-4 text-emerald-400" />}
                <div className="flex items-center gap-2 mr-auto">
                  <Headphones className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold truncate max-w-[170px]">{dev.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Section 3: App Volume & Booster Slider */}
        <div className="p-4 bg-surface-elevated rounded-2xl border border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">مستوى الصوت والمضخم (Booster):</span>
            <span className="font-mono text-sm font-extrabold text-accent-cyan">
              {Math.round(volume * 100)}% {volume > 1.0 && '(مضخم +)'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <VolumeX className="w-4 h-4 text-slate-400" />
            <input
              type="range"
              min="0"
              max="1.5"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeSlide(parseFloat(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-white/10 rounded-lg cursor-pointer"
            />
            <Volume2 className="w-5 h-5 text-accent-cyan" />
          </div>
          <p className="text-[10px] text-slate-500 text-right">
            * يمكنك رفع الصوت حتى 150% لتوضيح حوارات الأفلام ذات الصوت المنخفض.
          </p>
        </div>

        {/* Footer */}
        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-xs transition-all"
          >
            حفظ وإغلاق
          </button>
        </div>

      </div>
    </div>
  );
};
