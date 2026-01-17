import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from './services/audio.service';
import { VstGeneratorService } from './services/vst-generator.service';
import { KnobComponent } from './components/knob.component';
import { SwitchComponent } from './components/switch.component';
import { SettingsComponent } from './components/settings.component';
import { PedalComponent } from './components/pedal.component';
import { AiLoaderComponent } from './components/ai-loader.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, KnobComponent, SwitchComponent, SettingsComponent, PedalComponent, AiLoaderComponent],
  template: `
    <!-- AI Loader Overlay -->
    @if (isGeneratingVst()) {
      <app-ai-loader></app-ai-loader>
    }

    <!-- Main Container centered on screen -->
    <div class="relative w-full max-w-4xl p-4 flex flex-col items-center gap-8">
      
      <!-- Amp Head Enclosure -->
      <div class="w-full bg-tolex rounded-xl shadow-[0_20px_50px_rgba(0,0,0,0.7)] border-t border-sky-300 p-2 md:p-4 relative z-20">
        
        <!-- Handle (Visual Only) -->
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-12 bg-neutral-900 rounded-t-lg border-t-2 border-neutral-700 shadow-lg z-0 hidden md:block"></div>
        <div class="absolute -top-12 left-1/2 -translate-x-1/2 w-56 h-4 bg-neutral-400 rounded-sm shadow z-0 hidden md:block" style="top: -10px;"></div>

        <!-- White Metal Faceplate -->
        <div class="bg-slate-100 rounded-lg shadow-inner border border-slate-300 p-6 md:p-8 flex flex-col md:flex-row gap-8 md:gap-4 items-center justify-between relative z-10">
          
          <!-- Screw heads -->
          <div class="absolute top-2 left-2 w-3 h-3 rounded-full bg-neutral-300 border border-neutral-400 flex items-center justify-center text-[8px] text-neutral-500">+</div>
          <div class="absolute top-2 right-2 w-3 h-3 rounded-full bg-neutral-300 border border-neutral-400 flex items-center justify-center text-[8px] text-neutral-500">+</div>
          <div class="absolute bottom-2 left-2 w-3 h-3 rounded-full bg-neutral-300 border border-neutral-400 flex items-center justify-center text-[8px] text-neutral-500">+</div>
          <div class="absolute bottom-2 right-2 w-3 h-3 rounded-full bg-neutral-300 border border-neutral-400 flex items-center justify-center text-[8px] text-neutral-500">+</div>

          <!-- Left Section: Input, Drive, Gain -->
          <div class="flex items-end gap-4 md:gap-6 border-r border-slate-300 pr-4 md:pr-6 h-full">
            <div class="flex flex-col items-center gap-2">
              <!-- Input Jack Graphic -->
              <div class="w-8 h-8 rounded-full bg-neutral-800 border-4 border-neutral-400 shadow-inner mb-2"></div>
              <app-switch 
                label="INPUT" 
                onLabel="PASSIVE" 
                offLabel="ACTIVE" 
                [initialState]="true"
                (stateChange)="onPadToggle($event)">
              </app-switch>
            </div>
            
            <app-knob 
              label="GAIN" 
              [initialValue]="gain"
              (valueChange)="onGainChange($event)">
            </app-knob>

            <app-knob 
              label="DRIVE" 
              [initialValue]="drive"
              (valueChange)="onDriveChange($event)">
            </app-knob>
          </div>

          <!-- Center Section: Tone Stack -->
          <div class="flex items-end gap-3 md:gap-6 grow justify-center border-r border-slate-300 pr-4 md:pr-6 h-full">
            <app-knob 
              label="BASS" 
              [initialValue]="bass"
              (valueChange)="onBassChange($event)">
            </app-knob>
            
            <app-knob 
              label="MID" 
              [initialValue]="mid"
              (valueChange)="onMidChange($event)">
            </app-knob>
            
            <app-knob 
              label="TREBLE" 
              [initialValue]="treble"
              (valueChange)="onTrebleChange($event)">
            </app-knob>
          </div>

          <!-- Right Section: Volume & Power -->
          <div class="flex items-end gap-6 pl-2">
            <app-knob 
              label="VOLUME" 
              [initialValue]="volume"
              (valueChange)="onVolumeChange($event)">
            </app-knob>

            <div class="flex flex-col items-center gap-4">
              <!-- Jewel Light (Blue) -->
              <div class="w-6 h-6 rounded-full border-2 border-neutral-400 shadow-md transition-colors duration-500"
                  [class.bg-sky-400]="audioService.isRunning()"
                  [class.shadow-[0_0_15px_#38bdf8]]="audioService.isRunning()"
                  [class.bg-sky-900]="!audioService.isRunning()">
              </div>

              <app-switch 
                label="POWER" 
                onLabel="ON" 
                offLabel="STBY" 
                [initialState]="false"
                (stateChange)="onPowerToggle($event)">
              </app-switch>
            </div>
          </div>

          <!-- Brand Logo -->
          <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-10 pointer-events-none select-none hidden md:block">
            <h1 class="font-['Permanent_Marker'] text-6xl text-neutral-800 rotate-[-5deg]">CITRUS</h1>
          </div>

        </div>
      </div>

      <!-- Floor / Pedalboard Section -->
      <div class="w-full flex flex-col md:flex-row justify-between items-end px-4 gap-8">
        
        <!-- External Pedals -->
        <div class="flex items-end gap-4">
          <!-- Cable running to amp -->
          <div class="hidden md:block w-8 h-32 border-l-4 border-neutral-800 rounded-bl-3xl absolute -left-2 top-3/4 -z-10"></div>
          
          <app-pedal 
            [isActive]="audioService.isCompressorOn()"
            [level]="audioService.compressorLevel()"
            (toggleState)="onPedalToggle()"
            (levelChange)="onPedalLevelChange($event)"
            (blendChange)="onPedalBlendChange($event)">
          </app-pedal>
        </div>

        <!-- Settings & Meters -->
        <div class="flex flex-col items-end gap-2 w-full md:w-auto">
          
          <!-- Instruction Text or VU Meter -->
          <div class="flex flex-col items-end">
            @if (!audioService.isInitialized()) {
              <div class="text-neutral-400 text-right animate-pulse">
                <p class="text-sm">Turn <span class="text-sky-500 font-bold">POWER ON</span> to initialize.</p>
              </div>
            } @else {
              <div class="flex gap-3 items-center">
                  <span class="text-[10px] text-neutral-500 uppercase tracking-widest">Master Output</span>
                  <!-- Simple VU Meter -->
                  <div class="w-48 h-2 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
                      <div class="h-full bg-gradient-to-r from-green-500 via-sky-500 to-red-500 transition-all duration-75 ease-out"
                          [style.width.%]="audioService.inputLevel() * 100 * 2"></div>
                  </div>
              </div>
            }
          </div>

          <!-- Bottom Toolbar -->
          <div class="flex gap-4 mt-2 items-center">
            <!-- AI Export Button -->
            <button (click)="onExportVst()" 
                    class="bg-sky-600 hover:bg-sky-500 text-white px-3 py-1 rounded text-xs uppercase font-bold tracking-wider shadow-lg flex items-center gap-2 transition-all hover:scale-105 active:scale-95">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              AI VST PORT
            </button>

            <!-- Settings Toggle -->
            <div class="relative">
              <button (click)="toggleSettings()" 
                      class="text-neutral-500 hover:text-white transition-colors text-xs uppercase tracking-widest flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="3"></circle>
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
                </svg>
                <span>Config</span>
              </button>

              @if (showSettings()) {
                <div class="absolute bottom-12 right-0 z-50 animate-[fade-in_0.2s_ease-out]">
                  <app-settings></app-settings>
                </div>
              }
            </div>
          </div>
        </div>
      </div>

    </div>
  `
})
export class AppComponent {
  audioService = inject(AudioService);
  vstService = inject(VstGeneratorService);
  
  showSettings = signal(false);
  isGeneratingVst = signal(false);

  // Initial Values
  gain = 3;
  drive = 6;
  bass = 5;
  mid = 5;
  treble = 5;
  volume = 0;
  
  // Pedal State (tracked for export)
  pedalBlend = 10;
  pedalSustain = 5;

  async startAmp() {
    await this.audioService.initialize();
  }

  toggleSettings() {
    this.showSettings.update(v => !v);
  }

  onGainChange(val: number) {
    this.gain = val;
    this.audioService.setGain(val);
  }

  onDriveChange(val: number) {
    this.drive = val;
    this.audioService.setDrive(val);
  }

  onBassChange(val: number) {
    this.bass = val;
    this.audioService.setBass(val);
  }

  onMidChange(val: number) {
    this.mid = val;
    this.audioService.setMid(val);
  }

  onTrebleChange(val: number) {
    this.treble = val;
    this.audioService.setTreble(val);
  }

  onVolumeChange(val: number) {
    this.volume = val;
    this.audioService.setVolume(val);
  }

  onPowerToggle(isOn: boolean) {
    if (!this.audioService.isInitialized()) {
      if (isOn) this.startAmp();
    } else {
      this.audioService.toggleStandby(isOn);
    }
  }

  onPadToggle(isPassive: boolean) {
    this.audioService.setPad(isPassive);
  }

  // Compressor
  onPedalToggle() {
    this.audioService.toggleCompressor(!this.audioService.isCompressorOn());
  }

  onPedalLevelChange(val: number) {
    this.pedalSustain = val;
    this.audioService.setCompressorAmount(val);
  }

  onPedalBlendChange(val: number) {
    this.pedalBlend = val;
    this.audioService.setCompressorBlend(val);
  }

  // AI VST Export
  async onExportVst() {
    this.isGeneratingVst.set(true);
    
    try {
      const blob = await this.vstService.generateVstBundle({
        gain: this.gain,
        drive: this.drive,
        bass: this.bass,
        mid: this.mid,
        treble: this.treble,
        compressorBlend: this.pedalBlend,
        compressorSustain: this.pedalSustain
      });

      this.downloadBlob(blob, 'CitrusTerror_VST3_Source.zip');
    } catch (e) {
      alert('Error generating VST. Please check your API key.');
    } finally {
      this.isGeneratingVst.set(false);
    }
  }

  private downloadBlob(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.setAttribute('href', url);
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    window.URL.revokeObjectURL(url);
  }
}