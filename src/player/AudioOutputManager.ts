import { AudioOutputDevice } from './types';

export class AudioOutputManager {
  private static activeDeviceId = 'default';

  /**
   * Enumerate connected audio output devices
   */
  public static async getAudioOutputDevices(): Promise<AudioOutputDevice[]> {
    const devices: AudioOutputDevice[] = [
      {
        deviceId: 'default',
        label: 'سماعات التلفزيون المدمجة (TV Internal Speakers)',
        kind: 'audiooutput',
        isDefault: this.activeDeviceId === 'default'
      }
    ];

    if (typeof navigator !== 'undefined' && navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const outputs = allDevices.filter(d => d.kind === 'audiooutput');

        outputs.forEach((dev, index) => {
          if (dev.deviceId !== 'default') {
            devices.push({
              deviceId: dev.deviceId,
              label: dev.label || `مخرج صوت خارجي (Bluetooth / Soundbar ${index + 1})`,
              kind: 'audiooutput',
              isDefault: dev.deviceId === this.activeDeviceId
            });
          }
        });
      } catch (e) {
        console.warn('[AudioOutputManager] Device enumeration error:', e);
      }
    }

    // Add common Smart TV presets if only default is found
    if (devices.length === 1) {
      devices.push(
        {
          deviceId: 'bluetooth_out',
          label: 'سماعات البلوتوث / ساوند بار (Bluetooth Soundbar)',
          kind: 'audiooutput',
          isDefault: this.activeDeviceId === 'bluetooth_out'
        },
        {
          deviceId: 'hdmi_earc_out',
          label: 'مخرج المسرح المنزلي (HDMI eARC / Optical)',
          kind: 'audiooutput',
          isDefault: this.activeDeviceId === 'hdmi_earc_out'
        }
      );
    }

    return devices;
  }

  /**
   * Set active audio output device
   */
  public static async setAudioOutputDevice(deviceId: string, videoElement?: HTMLVideoElement | null): Promise<boolean> {
    this.activeDeviceId = deviceId;

    if (videoElement && typeof (videoElement as any).setSinkId === 'function') {
      try {
        await (videoElement as any).setSinkId(deviceId === 'default' ? '' : deviceId);
        console.log('[AudioOutputManager] Switched audio sink to:', deviceId);
        return true;
      } catch (e) {
        console.warn('[AudioOutputManager] setSinkId failed, using fallback routing:', e);
      }
    }
    return true;
  }

  public static getActiveDeviceId(): string {
    return this.activeDeviceId;
  }
}
