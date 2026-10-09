/**
 * محرك التنبيهات الصوتية الصيدلانية الفورية عبر Web Audio API
 * يعمل بدون الحاجة لتحميل ملفات صوتية خارجية
 */

class SoundAlertEngine {
  private audioCtx: AudioContext | null = null;
  private soundEnabled = true;

  constructor() {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('pharmacy_sound_alerts_enabled');
      this.soundEnabled = stored !== 'false';
    }
  }

  public isEnabled(): boolean {
    return this.soundEnabled;
  }

  public setEnabled(enabled: boolean): void {
    this.soundEnabled = enabled;
    if (typeof window !== 'undefined') {
      localStorage.setItem('pharmacy_sound_alerts_enabled', String(enabled));
    }
  }

  public toggle(): boolean {
    this.setEnabled(!this.soundEnabled);
    return this.soundEnabled;
  }

  private initCtx(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  /**
   * رنين تنبيه طلب جديد — نغمة صيدلانية احترافية ثلاثية (Melodic Chime)
   */
  public playNewOrderChime(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      // نغمات ثلاثية متتابعة C5 -> E5 -> G5 (Do -> Mi -> Sol)
      const notes = [
        { freq: 523.25, time: now + 0.0, dur: 0.18 },
        { freq: 659.25, time: now + 0.15, dur: 0.22 },
        { freq: 783.99, time: now + 0.32, dur: 0.45 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.22, time + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
      });
    } catch {
      // Audio playback silently ignored if blocked by user autoplay policy
    }
  }

  /**
   * رنين تنبيه عاجل / روشتة جديدة
   */
  public playUrgentAlert(): void {
    if (!this.soundEnabled) return;
    try {
      const ctx = this.initCtx();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [
        { freq: 880, time: now + 0.0, dur: 0.12 },
        { freq: 1174.66, time: now + 0.14, dur: 0.3 },
      ];

      notes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, time);

        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.25, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(time);
        osc.stop(time + dur);
      });
    } catch {
      // ignore
    }
  }
}

export const soundAlert = new SoundAlertEngine();
