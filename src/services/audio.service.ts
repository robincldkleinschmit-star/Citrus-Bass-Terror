import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AudioService {
  private audioContext: AudioContext | null = null;
  private inputStream: MediaStreamAudioSourceNode | null = null;
  private mediaStream: MediaStream | null = null;
  
  // Channel Routing Nodes
  private splitterNode: ChannelSplitterNode | null = null;
  private inputCh1Gain: GainNode | null = null;
  private inputCh2Gain: GainNode | null = null;

  // Compressor Nodes
  private compressorNode: DynamicsCompressorNode | null = null;
  private compressorMakeupNode: GainNode | null = null;
  private compressorBypassGain: GainNode | null = null;
  private compressorEffectGain: GainNode | null = null;
  private compAnalyzer: AnalyserNode | null = null;

  // State for Compressor
  private currentCompressorBlend = 1.0; 

  // Amp Node Chain
  private inputPadNode: GainNode | null = null;
  private inputGainNode: GainNode | null = null;
  private tightenFilter: BiquadFilterNode | null = null; // New: Pre-drive tightener
  private driveNode: WaveShaperNode | null = null;
  private bassFilter: BiquadFilterNode | null = null;
  private midFilter: BiquadFilterNode | null = null;
  private trebleFilter: BiquadFilterNode | null = null;
  private masterGainNode: GainNode | null = null;
  
  // Cabinet Simulation (Convolution)
  private cabConvolver: ConvolverNode | null = null;
  private cabMakeUpGain: GainNode | null = null;

  private analyzer: AnalyserNode | null = null;

  public isInitialized = signal(false);
  public isRunning = signal(false);
  public inputLevel = signal(0);       
  public compressorLevel = signal(0);  
  public isCompressorOn = signal(false);

  // Device Management
  public availableInputs = signal<MediaDeviceInfo[]>([]);
  public availableOutputs = signal<MediaDeviceInfo[]>([]);
  public currentInputId = signal<string>('default');
  public currentOutputId = signal<string>('default');
  public activeInputChannel = signal<'ch1' | 'ch2' | 'mix'>('ch1');

  async initialize() {
    if (this.audioContext) {
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
        this.isRunning.set(true);
      }
      return;
    }

    try {
      this.audioContext = new AudioContext({ latencyHint: 'interactive' });
      await this.setupInputStream();
      await this.buildAudioGraph();
      this.isInitialized.set(true);
      this.isRunning.set(true);
      await this.refreshDeviceList();
      this.startMeterLoop();
    } catch (err) {
      console.error('Audio initialization failed', err);
    }
  }

  private async setupInputStream(deviceId?: string) {
    if (!this.audioContext) return;

    if (this.inputStream) {
      this.inputStream.disconnect();
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
    }

    const constraints: MediaStreamConstraints = { 
      audio: { 
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: false, 
        autoGainControl: false, 
        noiseSuppression: false,
        latency: 0,
        channelCount: 2 
      } as any
    };

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      this.inputStream = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.connectInputRouting();
    } catch (e) {
      console.error('Error getting user media:', e);
    }
  }

  private connectInputRouting() {
    if (!this.audioContext || !this.inputStream) return;

    if (!this.splitterNode) {
        this.splitterNode = this.audioContext.createChannelSplitter(2);
        this.inputCh1Gain = this.audioContext.createGain();
        this.inputCh2Gain = this.audioContext.createGain();
    }

    this.inputStream.disconnect();
    this.splitterNode.disconnect();
    this.inputCh1Gain!.disconnect();
    this.inputCh2Gain!.disconnect();

    this.inputStream.connect(this.splitterNode);
    this.splitterNode.connect(this.inputCh1Gain!, 0); 
    this.splitterNode.connect(this.inputCh2Gain!, 1);

    this.updateChannelGains();

    if (this.inputPadNode) {
        this.inputCh1Gain!.connect(this.inputPadNode);
        this.inputCh2Gain!.connect(this.inputPadNode);
    }
  }

  private async buildAudioGraph() {
    if (!this.audioContext) return;

    // 1. Input Pad
    this.inputPadNode = this.audioContext.createGain();
    
    // --- COMPRESSOR (Optical Style Tweaks) ---
    this.compressorNode = this.audioContext.createDynamicsCompressor();
    // Optical comps are smoother. 
    this.compressorNode.threshold.value = -20;
    this.compressorNode.knee.value = 20; 
    this.compressorNode.ratio.value = 6; 
    this.compressorNode.attack.value = 0.020; // Slower attack for transients
    this.compressorNode.release.value = 0.20; 

    this.compressorMakeupNode = this.audioContext.createGain();
    this.compressorMakeupNode.gain.value = 1.0; 

    this.compressorBypassGain = this.audioContext.createGain();
    this.compressorEffectGain = this.audioContext.createGain(); 

    this.compressorBypassGain.gain.value = 1.0;
    this.compressorEffectGain.gain.value = 0.0;
    
    this.compAnalyzer = this.audioContext.createAnalyser();
    this.compAnalyzer.fftSize = 256;
    // --- END COMPRESSOR ---

    // 2. Preamp Gain
    this.inputGainNode = this.audioContext.createGain();
    
    // 2.5 Pre-Drive Tightening Filter
    // Real amps filter sub-bass before gain stages to avoid "farting out"
    this.tightenFilter = this.audioContext.createBiquadFilter();
    this.tightenFilter.type = 'highpass';
    this.tightenFilter.frequency.value = 80; 
    this.tightenFilter.Q.value = 0.7;

    // 3. Drive (Asymmetric Tube Emulation)
    this.driveNode = this.audioContext.createWaveShaper();
    this.driveNode.curve = this.makeAsymmetricCurve(400); 
    this.driveNode.oversample = '4x';

    // 4. Tone Stack (Tuned for Bass)
    this.bassFilter = this.audioContext.createBiquadFilter();
    this.bassFilter.type = 'lowshelf';
    this.bassFilter.frequency.value = 100;

    this.midFilter = this.audioContext.createBiquadFilter();
    this.midFilter.type = 'peaking';
    this.midFilter.frequency.value = 400; // Lower mid scoop center
    this.midFilter.Q.value = 1.0;

    this.trebleFilter = this.audioContext.createBiquadFilter();
    this.trebleFilter.type = 'highshelf';
    this.trebleFilter.frequency.value = 2500; // Presence range

    // 5. Master Volume
    this.masterGainNode = this.audioContext.createGain();

    // 6. Cabinet Simulator (Convolution)
    this.cabConvolver = this.audioContext.createConvolver();
    // Generate an IR that sounds like a 4x10 Cab
    const cabBuffer = await this.generateCabinetIR();
    this.cabConvolver.buffer = cabBuffer;
    
    this.cabMakeUpGain = this.audioContext.createGain();
    this.cabMakeUpGain.gain.value = 2.0; // Convolution loses some level

    // Analyzer (Main Output)
    this.analyzer = this.audioContext.createAnalyser();
    this.analyzer.fftSize = 256;

    // --- Wiring ---
    
    // Compressor Routing
    this.inputPadNode.connect(this.compressorBypassGain);
    this.inputPadNode.connect(this.compressorNode);
    
    this.compressorNode.connect(this.compressorMakeupNode);
    this.compressorMakeupNode.connect(this.compressorEffectGain);

    this.compressorBypassGain.connect(this.inputGainNode);
    this.compressorEffectGain.connect(this.inputGainNode);
    
    this.compressorBypassGain.connect(this.compAnalyzer);
    this.compressorEffectGain.connect(this.compAnalyzer);

    // Amp Chain
    this.inputGainNode
      .connect(this.tightenFilter)
      .connect(this.driveNode)
      .connect(this.bassFilter)
      .connect(this.midFilter)
      .connect(this.trebleFilter)
      .connect(this.masterGainNode)
      .connect(this.cabConvolver)
      .connect(this.cabMakeUpGain)
      .connect(this.analyzer)
      .connect(this.audioContext.destination);

    if (this.inputCh1Gain && this.inputCh2Gain) {
        this.inputCh1Gain.disconnect();
        this.inputCh2Gain.disconnect();
        this.inputCh1Gain.connect(this.inputPadNode);
        this.inputCh2Gain.connect(this.inputPadNode);
    }

    // Defaults
    this.inputPadNode.gain.value = 1.0; 
    this.inputGainNode.gain.value = 2.0; 
    this.masterGainNode.gain.value = 0.0;
  }

  // --- IR Generation for Analog Cab Tone ---
  private async generateCabinetIR(): Promise<AudioBuffer> {
    if (!this.audioContext) throw new Error("No Context");
    
    const sampleRate = this.audioContext.sampleRate;
    const duration = 0.2; // 200ms
    const offlineCtx = new OfflineAudioContext(1, sampleRate * duration, sampleRate);
    
    // Create an Impulse (Dirac Delta approximation)
    const impulse = offlineCtx.createBuffer(1, sampleRate * duration, sampleRate);
    const data = impulse.getChannelData(0);
    // Band-limited impulse to avoid harsh digital aliasing at start
    data[0] = 1.0; 
    data[1] = 0.5;

    const source = offlineCtx.createBufferSource();
    source.buffer = impulse;

    // Filter Chain to mimic a 4x10 Bass Cab
    // 1. Sharp Low Cut (Speaker resonance freq)
    const lowCut = offlineCtx.createBiquadFilter();
    lowCut.type = 'highpass';
    lowCut.frequency.value = 55;
    lowCut.Q.value = 1.5; // Slight resonant bump at cutoff

    // 2. Cab Resonance (Box Thump)
    const thump = offlineCtx.createBiquadFilter();
    thump.type = 'peaking';
    thump.frequency.value = 110;
    thump.gain.value = 4;
    thump.Q.value = 1.0;

    // 3. Mid Dip (Scoop typical of multi-speaker cabs)
    const scoop = offlineCtx.createBiquadFilter();
    scoop.type = 'peaking';
    scoop.frequency.value = 450;
    scoop.gain.value = -4;
    scoop.Q.value = 0.8;

    // 4. High Rolloff (Speaker Cone Physics)
    const highCut = offlineCtx.createBiquadFilter();
    highCut.type = 'lowpass';
    highCut.frequency.value = 4000;
    highCut.Q.value = 0.5; // Smooth rolloff

    // 5. High Shelf (Air kill - Bass cabs don't produce 10k+)
    const airKill = offlineCtx.createBiquadFilter();
    airKill.type = 'highshelf';
    airKill.frequency.value = 8000;
    airKill.gain.value = -20;

    source
      .connect(lowCut)
      .connect(thump)
      .connect(scoop)
      .connect(highCut)
      .connect(airKill)
      .connect(offlineCtx.destination);
    
    source.start();
    return offlineCtx.startRendering();
  }

  // --- Asymmetric Distortion for Tube Warmth ---
  private makeAsymmetricCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      
      // Asymmetric function:
      // Positive swings (Push) saturate smoothly
      // Negative swings (Pull) saturate harder/earlier, creating even harmonics
      
      if (x < -0.5) {
        // Harder compression on negative
         curve[i] = (2 * Math.atan(k * x * 1.5)) / Math.PI; 
      } else {
        // Softer on positive
         curve[i] = (2 * Math.atan(k * x * 0.8)) / Math.PI;
      }
    }
    return curve;
  }

  // --- Controls ---

  toggleCompressor(isOn: boolean) {
    this.isCompressorOn.set(isOn);
    this.updateCompressorGains();
  }

  setCompressorBlend(val: number) {
    this.currentCompressorBlend = val / 10;
    this.updateCompressorGains();
  }

  private updateCompressorGains() {
    if (!this.audioContext || !this.compressorBypassGain || !this.compressorEffectGain) return;
    const t = this.audioContext.currentTime;

    if (this.isCompressorOn()) {
        const wet = this.currentCompressorBlend;
        const dry = 1.0 - wet;
        this.compressorEffectGain.gain.setTargetAtTime(wet, t, 0.05);
        this.compressorBypassGain.gain.setTargetAtTime(dry, t, 0.05);
    } else {
        this.compressorEffectGain.gain.setTargetAtTime(0, t, 0.05);
        this.compressorBypassGain.gain.setTargetAtTime(1.0, t, 0.05);
    }
  }

  setCompressorAmount(val: number) {
    if (this.compressorNode && this.compressorMakeupNode && this.audioContext) {
      // 0 -> -10dB (Subtle), 10 -> -40dB (Squashed)
      const threshold = -10 - (val * 3); 
      const makeup = 1 + (val * 0.2); 

      const t = this.audioContext.currentTime;
      this.compressorNode.threshold.setTargetAtTime(threshold, t, 0.1);
      this.compressorMakeupNode.gain.setTargetAtTime(makeup, t, 0.1);
    }
  }

  setDrive(val: number) {
    if (this.driveNode) {
      // Curve k value: 0 -> 20 (clean/warm), 10 -> 800 (heavy fuzz)
      const k = 20 + Math.pow(val, 2.5) * 5; 
      this.driveNode.curve = this.makeAsymmetricCurve(k);
    }
  }

  // ... (Existing Methods maintained for compatibility)

  async refreshDeviceList() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    this.availableInputs.set(devices.filter(d => d.kind === 'audioinput'));
    this.availableOutputs.set(devices.filter(d => d.kind === 'audiooutput'));
  }

  async changeInputDevice(deviceId: string) {
    try {
      await this.setupInputStream(deviceId);
      this.currentInputId.set(deviceId);
    } catch (e) {
      console.error('Failed to change input device', e);
    }
  }

  async changeOutputDevice(deviceId: string) {
    if (!this.audioContext) return;
    const ctx = this.audioContext as any;
    if (typeof ctx.setSinkId === 'function') {
      try {
        await ctx.setSinkId(deviceId);
        this.currentOutputId.set(deviceId);
      } catch (e) {
        console.error('Failed to set output device', e);
      }
    } else {
      console.warn('AudioContext.setSinkId is not supported in this browser.');
    }
  }

  public setInputChannel(mode: 'ch1' | 'ch2' | 'mix') {
      this.activeInputChannel.set(mode);
      this.updateChannelGains();
  }

  private updateChannelGains() {
     if (!this.audioContext || !this.inputCh1Gain || !this.inputCh2Gain) return;
     const mode = this.activeInputChannel();
     const t = this.audioContext.currentTime;
     
     if (mode === 'ch1') {
         this.inputCh1Gain.gain.setTargetAtTime(1, t, 0.02);
         this.inputCh2Gain.gain.setTargetAtTime(0, t, 0.02);
     } else if (mode === 'ch2') {
         this.inputCh1Gain.gain.setTargetAtTime(0, t, 0.02);
         this.inputCh2Gain.gain.setTargetAtTime(1, t, 0.02);
     } else { 
         this.inputCh1Gain.gain.setTargetAtTime(0.5, t, 0.02);
         this.inputCh2Gain.gain.setTargetAtTime(0.5, t, 0.02);
     }
  }

  toggleStandby(isOn: boolean) {
    if (this.audioContext) {
      if (isOn) {
        this.audioContext.resume();
        this.isRunning.set(true);
      } else {
        this.audioContext.suspend();
        this.isRunning.set(false);
      }
    }
  }

  setGain(val: number) {
    if (this.inputGainNode && this.audioContext) {
       // Preamp gain: 1x to 10x
       const gainVal = 1 + val; 
       this.inputGainNode.gain.setTargetAtTime(gainVal, this.audioContext.currentTime, 0.1);
    }
  }

  setBass(val: number) {
    if (this.bassFilter && this.audioContext) {
      const db = (val - 5) * 4; 
      this.bassFilter.gain.setTargetAtTime(db, this.audioContext.currentTime, 0.1);
    }
  }

  setMid(val: number) {
    if (this.midFilter && this.audioContext) {
      const db = (val - 5) * 4;
      this.midFilter.gain.setTargetAtTime(db, this.audioContext.currentTime, 0.1);
    }
  }

  setTreble(val: number) {
    if (this.trebleFilter && this.audioContext) {
      const db = (val - 5) * 4;
      this.trebleFilter.gain.setTargetAtTime(db, this.audioContext.currentTime, 0.1);
    }
  }

  setVolume(val: number) {
    if (this.masterGainNode && this.audioContext) {
      const gain = val / 10;
      this.masterGainNode.gain.setTargetAtTime(gain, this.audioContext.currentTime, 0.1);
    }
  }

  setPad(isPassive: boolean) {
    if (this.inputPadNode && this.audioContext) {
      this.inputPadNode.gain.setTargetAtTime(isPassive ? 1.0 : 0.25, this.audioContext.currentTime, 0.1);
    }
  }

  private startMeterLoop() {
    const dataArray = new Uint8Array(this.analyzer?.frequencyBinCount || 0);
    const dataArrayComp = new Uint8Array(this.compAnalyzer?.frequencyBinCount || 0);
    
    const update = () => {
      if (!this.isRunning()) {
        this.inputLevel.set(0);
        this.compressorLevel.set(0);
        requestAnimationFrame(update);
        return;
      }
      
      if (this.analyzer) {
        this.analyzer.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const x = (dataArray[i] - 128) / 128.0;
            sum += x * x;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        this.inputLevel.set(rms);
      }

      if (this.compAnalyzer) {
        this.compAnalyzer.getByteTimeDomainData(dataArrayComp);
        let sum = 0;
        for (let i = 0; i < dataArrayComp.length; i++) {
            const x = (dataArrayComp[i] - 128) / 128.0;
            sum += x * x;
        }
        const rms = Math.sqrt(sum / dataArrayComp.length);
        this.compressorLevel.set(rms);
      }
      
      requestAnimationFrame(update);
    };
    update();
  }
}