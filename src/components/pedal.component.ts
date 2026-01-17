import { Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { KnobComponent } from './knob.component';

@Component({
  selector: 'app-pedal',
  standalone: true,
  imports: [CommonModule, KnobComponent],
  template: `
    <div class="relative w-40 h-56 bg-sky-300 rounded-lg shadow-[0_10px_20px_rgba(0,0,0,0.5)] border-b-8 border-sky-600 flex flex-col items-center py-6 px-2">
      <!-- Jacks -->
      <div class="absolute top-1/2 -left-2 w-2 h-6 bg-neutral-400 rounded-l"></div>
      <div class="absolute top-1/2 -right-2 w-2 h-6 bg-neutral-400 rounded-r"></div>

      <!-- Brand -->
      <div class="font-['Permanent_Marker'] text-neutral-800 text-lg rotate-[-5deg] mb-2">SQUEEZE</div>

      <!-- Controls -->
      <div class="mb-auto flex gap-2">
        <div class="scale-75 origin-top">
          <app-knob label="Sustain" [initialValue]="5" [min]="0" [max]="10" (valueChange)="onSustainChange($event)"></app-knob>
        </div>
        <div class="scale-75 origin-top">
          <app-knob label="Blend" [initialValue]="10" [min]="0" [max]="10" (valueChange)="onBlendChange($event)"></app-knob>
        </div>
      </div>
      
      <!-- VU Meter (LED Bar) -->
      <div class="flex gap-1 mb-2">
        <div class="w-2 h-2 rounded-full border border-neutral-600 bg-neutral-800 transition-colors duration-75" [class.bg-green-400]="level() > 0.05" [class.shadow-[0_0_5px_#4ade80]]="level() > 0.05"></div>
        <div class="w-2 h-2 rounded-full border border-neutral-600 bg-neutral-800 transition-colors duration-75" [class.bg-green-500]="level() > 0.15" [class.shadow-[0_0_5px_#22c55e]]="level() > 0.15"></div>
        <div class="w-2 h-2 rounded-full border border-neutral-600 bg-neutral-800 transition-colors duration-75" [class.bg-yellow-400]="level() > 0.3" [class.shadow-[0_0_5px_#facc15]]="level() > 0.3"></div>
        <div class="w-2 h-2 rounded-full border border-neutral-600 bg-neutral-800 transition-colors duration-75" [class.bg-sky-400]="level() > 0.5" [class.shadow-[0_0_5px_#38bdf8]]="level() > 0.5"></div>
        <div class="w-2 h-2 rounded-full border border-neutral-600 bg-neutral-800 transition-colors duration-75" [class.bg-blue-500]="level() > 0.7" [class.shadow-[0_0_5px_#3b82f6]]="level() > 0.7"></div>
      </div>

      <!-- LED & Switch -->
      <div class="flex flex-col items-center gap-4 mt-1 w-full">
        <!-- Status LED (Blue) -->
        <div class="w-3 h-3 rounded-full transition-all duration-200 border border-neutral-600"
             [class.bg-blue-500]="isActive()"
             [class.shadow-[0_0_10px_#3b82f6]]="isActive()"
             [class.bg-blue-900]="!isActive()">
        </div>

        <!-- Stomp Switch -->
        <button (click)="toggle()" class="w-full flex justify-center focus:outline-none active:scale-95 transition-transform">
           <div class="w-12 h-12 rounded-full bg-gradient-to-b from-neutral-300 to-neutral-400 border-4 border-neutral-500 shadow-lg flex items-center justify-center">
             <div class="w-8 h-8 rounded-full border-2 border-neutral-400 bg-neutral-200 ring-1 ring-white/50"></div>
           </div>
        </button>
      </div>
    </div>
  `
})
export class PedalComponent {
  isActive = input.required<boolean>();
  level = input<number>(0);
  toggleState = output<void>();
  levelChange = output<number>();
  blendChange = output<number>();

  toggle() {
    this.toggleState.emit();
  }

  onSustainChange(val: number) {
    this.levelChange.emit(val);
  }

  onBlendChange(val: number) {
    this.blendChange.emit(val);
  }
}