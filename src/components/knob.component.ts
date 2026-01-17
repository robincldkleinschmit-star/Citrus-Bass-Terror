import { Component, input, output, signal, HostListener, computed } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-knob',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-2 select-none group" 
         (mousedown)="onMouseDown($event)">
      
      <!-- Knob Body -->
      <div class="relative w-16 h-16 md:w-20 md:h-20 rounded-full bg-neutral-200 shadow-xl border-b-4 border-neutral-400 cursor-ns-resize transition-transform active:scale-95"
           [style.transform]="'rotate(' + rotation() + 'deg)'">
        
        <!-- Knurling Texture -->
        <div class="absolute inset-0 rounded-full opacity-30 bg-[repeating-conic-gradient(rgba(0,0,0,0.1)_0deg_2deg,transparent_2deg_4deg)]"></div>
        
        <!-- Indicator Line -->
        <div class="absolute top-1 left-1/2 -translate-x-1/2 w-1.5 h-6 bg-neutral-800 rounded-sm"></div>
        
        <!-- Shine/Reflection -->
        <div class="absolute top-2 left-2 w-12 h-8 rounded-full bg-gradient-to-br from-white to-transparent opacity-40"></div>
      </div>

      <!-- Label -->
      <span class="font-sans font-bold text-neutral-800 uppercase tracking-widest text-xs md:text-sm mt-1">
        {{ label() }}
      </span>
      
      <!-- Value Tooltip (visible on drag) -->
      @if (isDragging()) {
        <div class="absolute -top-8 bg-neutral-800 text-white text-xs px-2 py-1 rounded">
          {{ value().toFixed(1) }}
        </div>
      }
    </div>
  `
})
export class KnobComponent {
  label = input.required<string>();
  initialValue = input<number>(5);
  min = input<number>(0);
  max = input<number>(10);
  valueChange = output<number>();

  value = signal(5);
  isDragging = signal(false);
  startY = 0;
  startVal = 0;

  // Map value (0-10) to degrees (-135 to 135)
  rotation = computed(() => {
    const range = this.max() - this.min();
    const percent = (this.value() - this.min()) / range;
    return -135 + (percent * 270);
  });

  ngOnInit() {
    this.value.set(this.initialValue());
  }

  onMouseDown(event: MouseEvent) {
    event.preventDefault();
    this.isDragging.set(true);
    this.startY = event.clientY;
    this.startVal = this.value();
    
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('mouseup', this.onMouseUp);
  }

  onMouseMove = (event: MouseEvent) => {
    if (!this.isDragging()) return;
    
    const deltaY = this.startY - event.clientY;
    const sensitivity = 0.05; // Pixels to value
    
    let newVal = this.startVal + (deltaY * sensitivity);
    
    // Clamp
    newVal = Math.max(this.min(), Math.min(this.max(), newVal));
    
    this.value.set(newVal);
    this.valueChange.emit(newVal);
  }

  onMouseUp = () => {
    this.isDragging.set(false);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('mouseup', this.onMouseUp);
  }
}