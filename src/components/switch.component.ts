import { Component, input, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-switch',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-2 cursor-pointer group select-none" (click)="toggle()">
      <!-- Switch Housing -->
      <div class="relative w-8 h-14 bg-neutral-300 rounded-md border border-neutral-400 shadow-inner flex justify-center">
        <!-- Nut -->
        <div class="absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full border-2 border-neutral-400 bg-neutral-200 z-10"></div>
        
        <!-- Stick -->
        <div class="w-4 h-10 bg-gradient-to-r from-neutral-300 to-neutral-100 rounded shadow-md transform transition-all duration-200 z-20 origin-center"
             [class.-translate-y-2]="isOn()"
             [class.translate-y-2]="!isOn()"
             [class.bg-neutral-200]="!isOn()"
             [class.shadow-xl]="isOn()">
           <div class="w-full h-full bg-neutral-400 opacity-20 rounded"></div>   
        </div>
      </div>
      
      <span class="font-sans font-bold text-neutral-800 uppercase tracking-wider text-[10px] text-center leading-tight">
        {{ label() }}
        <br>
        <span class="text-[9px] text-neutral-500">{{ isOn() ? onLabel() : offLabel() }}</span>
      </span>
    </div>
  `
})
export class SwitchComponent {
  label = input.required<string>();
  onLabel = input<string>('ON');
  offLabel = input<string>('OFF');
  initialState = input<boolean>(false);
  stateChange = output<boolean>();

  isOn = signal(false);

  ngOnInit() {
    this.isOn.set(this.initialState());
  }

  toggle() {
    this.isOn.update(v => !v);
    this.stateChange.emit(this.isOn());
  }
}