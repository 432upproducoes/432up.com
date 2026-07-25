'use client';
import { useState } from 'react';
import HeroOrbeCanvas from '@/components/HeroOrbe';

export default function Home() {
  const [activated, setActivated] = useState(false);

  return (
    <main className="relative min-h-screen bg-[#0B0A10] text-white flex flex-col items-center justify-center overflow-hidden">
      {/* Canvas 3D de Fundo */}
      <HeroOrbeCanvas />

      {/* Conteúdo sobreposto */}
      <div className="relative z-10 text-center px-6">
        {!activated ? (
          <button
            onClick={() => setActivated(true)}
            className="px-8 py-4 rounded-full border border-[#9D4EDD] bg-[#9D4EDD]/20 backdrop-blur-md text-white font-mono text-sm tracking-widest hover:border-[#CCFF00] transition-all shadow-[0_0_30px_rgba(157,78,221,0.4)]"
          >
            ✨ ATIVAR EXPERIÊNCIA 3D (432Hz)
          </button>
        ) : (
          <div className="animate-fade-in">
            <h1 className="text-6xl md:text-8xl font-black tracking-tighter">
              A MÁGICA DA<br />
              <span className="text-[#CCFF00]">FREQUÊNCIA</span>
            </h1>
            <p className="mt-4 font-mono text-xs text-[#9D4EDD] tracking-widest uppercase">
              Shader WebGL + React Three Fiber 60FPS
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
