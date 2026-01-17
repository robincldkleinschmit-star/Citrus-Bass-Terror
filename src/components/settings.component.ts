import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AudioService } from '../services/audio.service';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-neutral-800 p-4 rounded-lg border border-neutral-600 shadow-xl text-xs md:text-sm font-sans w-full max-w-sm">
      <h3 class="text-sky-500 font-bold uppercase mb-4 tracking-wider border-b border-neutral-700 pb-2">Audio Config</h3>
      
      <!-- Input Device Selector -->
      <div class="mb-4">
        <label class="block text-neutral-400 mb-1">INPUT DEVICE</label>
        <select 
          class="w-full bg-neutral-900 text-white border border-neutral-600 rounded px-2 py-1 focus:border-sky-500 focus:outline-none"
          [value]="audioService.currentInputId()"
          (change)="onInputSelect($event)">
          @for (device of audioService.availableInputs(); track device.deviceId) {
            <option [value]="device.deviceId">
              {{ device.label || 'Unknown Device' }}
            </option>
          }
        </select>
      </div>

      <!-- Channel Selector -->
      <div class="mb-4">
        <label class="block text-neutral-400 mb-1">INPUT CHANNEL</label>
        <div class="flex bg-neutral-900 rounded border border-neutral-600 p-1 gap-1">
          <button 
            class="flex-1 py-1 text-center rounded text-[10px] uppercase font-bold transition-colors"
            [class.bg-neutral-700]="audioService.activeInputChannel() === 'ch1'"
            [class.text-sky-500]="audioService.activeInputChannel() === 'ch1'"
            [class.text-neutral-500]="audioService.activeInputChannel() !== 'ch1'"
            (click)="audioService.setInputChannel('ch1')">
            CH 1
          </button>
           <button 
            class="flex-1 py-1 text-center rounded text-[10px] uppercase font-bold transition-colors"
            [class.bg-neutral-700]="audioService.activeInputChannel() === 'ch2'"
            [class.text-sky-500]="audioService.activeInputChannel() === 'ch2'"
             [class.text-neutral-500]="audioService.activeInputChannel() !== 'ch2'"
            (click)="audioService.setInputChannel('ch2')">
            CH 2
          </button>
           <button 
            class="flex-1 py-1 text-center rounded text-[10px] uppercase font-bold transition-colors"
            [class.bg-neutral-700]="audioService.activeInputChannel() === 'mix'"
            [class.text-sky-500]="audioService.activeInputChannel() === 'mix'"
             [class.text-neutral-500]="audioService.activeInputChannel() !== 'mix'"
            (click)="audioService.setInputChannel('mix')">
            MIX
          </button>
        </div>
      </div>

      <!-- Output Device Selector -->
      <div class="mb-4">
        <label class="block text-neutral-400 mb-1">OUTPUT DEVICE</label>
        @if (audioService.availableOutputs().length > 0) {
          <select 
            class="w-full bg-neutral-900 text-white border border-neutral-600 rounded px-2 py-1 focus:border-sky-500 focus:outline-none"
            [value]="audioService.currentOutputId()"
            (change)="onOutputSelect($event)">
            @for (device of audioService.availableOutputs(); track device.deviceId) {
              <option [value]="device.deviceId">
                {{ device.label || 'Unknown Device' }}
              </option>
            }
          </select>
        } @else {
          <div class="text-neutral-500 italic p-1">Default System Output</div>
        }
      </div>

      <div class="text-[10px] text-neutral-500 mt-2">
        Note: Output selection is supported on Chrome/Edge/Firefox(123+). If "Default" is selected, system audio settings apply.
      </div>
    </div>
  `
})
export class SettingsComponent {
  audioService = inject(AudioService);

  onInputSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.audioService.changeInputDevice(select.value);
  }

  onOutputSelect(event: Event) {
    const select = event.target as HTMLSelectElement;
    this.audioService.changeOutputDevice(select.value);
  }
}