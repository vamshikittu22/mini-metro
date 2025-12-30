import React from 'react';
import { BaseButton } from '../UI/BaseButton';

interface StatsProps {
  score: number;
  timeScale: number;
  onSpeedChange: (speed: number) => void;
}

export const Stats: React.FC<StatsProps> = ({ score, timeScale, onSpeedChange }) => {
  return (
    <div className="flex flex-col items-end gap-4 pointer-events-auto">
      <div className="flex items-center gap-8">
        <div className="flex gap-1 bg-white/60 backdrop-blur p-1.5 rounded-full border border-black/5 shadow-sm">
          {[0, 1, 2, 4].map(s => (
            <button 
              key={s}
              onClick={() => onSpeedChange(s)} 
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black transition-all ${timeScale === s ? 'bg-[#2F3436] text-white shadow-lg' : 'text-[#2F3436]/30 hover:text-[#2F3436]'}`}
            >
              {s === 0 ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : `${s}x`}
            </button>
          ))}
        </div>

        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#2F3436]/40 font-black">Commuters</p>
          <p className="text-5xl font-light tabular-nums text-[#2F3436] tracking-tighter">{score}</p>
        </div>
      </div>
    </div>
  );
};