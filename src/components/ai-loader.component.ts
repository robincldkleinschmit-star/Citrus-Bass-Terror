import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-ai-loader',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center">
      <div class="flex flex-col items-center gap-6 max-w-md text-center p-8 border border-sky-500/30 rounded-2xl bg-neutral-900/90 shadow-[0_0_50px_rgba(56,189,248,0.3)]">
        
        <!-- Animated Icon -->
        <div class="relative w-20 h-20">
          <div class="absolute inset-0 rounded-full border-t-4 border-sky-500 animate-spin"></div>
          <div class="absolute inset-2 rounded-full border-r-4 border-sky-300 animate-spin [animation-duration:1.5s]"></div>
          <div class="absolute inset-4 rounded-full border-b-4 border-white animate-spin [animation-duration:2s]"></div>
          
          <div class="absolute inset-0 flex items-center justify-center">
            <span class="text-2xl">⚡</span>
          </div>
        </div>

        <div>
          <h2 class="text-2xl font-bold text-white mb-2 font-['Permanent_Marker'] tracking-widest">PORTING TO VST</h2>
          <p class="text-sky-400 font-mono text-xs uppercase animate-pulse">
            Analyzing DSP Chain... <br>
            Generating C++ (JUCE)...
          </p>
        </div>
      </div>
    </div>
  `
})
export class AiLoaderComponent {}