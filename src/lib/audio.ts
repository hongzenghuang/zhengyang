// Audio system using Web Audio API - Engine sound removed per user request
class AudioSystem {
  private audioContext: AudioContext | null = null;
  private windGain: GainNode | null = null;
  private windNoise: AudioBufferSourceNode | null = null;
  private isInitialized = false;

  constructor() {
    // Audio context will be initialized on first user interaction
  }

  init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Wind noise - white noise (only wind sound, no engine)
      const bufferSize = 2 * this.audioContext.sampleRate;
      const noiseBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      
      this.windNoise = this.audioContext.createBufferSource();
      this.windNoise.buffer = noiseBuffer;
      this.windNoise.loop = true;
      
      const windFilter = this.audioContext.createBiquadFilter();
      windFilter.type = 'lowpass';
      windFilter.frequency.value = 800;
      
      this.windGain = this.audioContext.createGain();
      this.windGain.gain.value = 0;
      
      this.windNoise.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.audioContext.destination);
      this.windNoise.start();
      
      this.isInitialized = true;
    } catch (e) {
      console.warn('Audio initialization failed:', e);
    }
  }

  // Engine sound removed - no longer used
  updateEngineSound(_n1Percent: number) {
    // Intentionally empty - engine sound disabled per user request
  }

  updateWindSound(airspeed: number) {
    if (!this.isInitialized || !this.windGain) return;
    
    // Map airspeed to volume (0-0.2)
    const volume = Math.min(0.2, (airspeed / 350) * 0.2);
    this.windGain.gain.value = volume;
  }

  playWarning() {
    if (!this.isInitialized || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    oscillator.type = 'square';
    oscillator.frequency.value = 800;
    gain.gain.value = 0.2;
    
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.3);
    oscillator.stop(this.audioContext.currentTime + 0.3);
  }

  playClick() {
    if (!this.isInitialized || !this.audioContext) return;
    
    const oscillator = this.audioContext.createOscillator();
    const gain = this.audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 1000;
    gain.gain.value = 0.1;
    
    oscillator.connect(gain);
    gain.connect(this.audioContext.destination);
    
    oscillator.start();
    gain.gain.exponentialRampToValueAtTime(0.01, this.audioContext.currentTime + 0.05);
    oscillator.stop(this.audioContext.currentTime + 0.05);
  }

  stop() {
    if (this.windNoise) {
      this.windNoise.stop();
    }
    if (this.audioContext) {
      this.audioContext.close();
    }
    this.isInitialized = false;
  }
}

export const audioSystem = new AudioSystem();
