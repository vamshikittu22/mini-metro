import React from 'react';

interface StatsProps {
  score: number;
  timeScale: number;
  onSpeedChange: (speed: number) => void;
}

export const Stats: React.FC<StatsProps> = ({ score, timeScale, onSpeedChange }) => {
  return (
    <div className="absolute top-8 right-8 z-50 flex items-start gap-3 pointer-events-auto">
      <div className="bg-white flex items-center p-1 rounded-sm gap-1 border border-black/5 shadow-md">
        <button 
          onClick={() => onSpeedChange(0)} 
          className={`w-9 h-9 flex items-center justify-center text-[#1A1A1A] text-[10px] font-bold transition-all ${timeScale === 0 ? 'bg-[#1A1A1A] text-white' : 'opacity-40 hover:opacity-100'}`}
        >
          ||
        </button>
        <button 
          onClick={() => onSpeedChange(1)} 
          className={`w-10 h-9 flex items-center justify-center text-[#1A1A1A] text-[10px] font-black transition-all rounded-sm ${timeScale === 1 ? 'bg-[#1A1A1A] text-white' : 'opacity-40 hover:opacity-100'}`}
        >
          1x
        </button>
        <button 
          onClick={() => onSpeedChange(2)} 
          className={`w-10 h-9 flex items-center justify-center text-[#1A1A1A] text-[10px] font-black transition-all rounded-sm ${timeScale === 2 ? 'bg-[#1A1A1A] text-white' : 'opacity-40 hover:opacity-100'}`}
        >
          2x
        </button>
        <button 
          onClick={() => onSpeedChange(4)} 
          className={`w-10 h-9 flex items-center justify-center text-[#1A1A1A] text-[10px] font-black transition-all rounded-sm ${timeScale === 4 ? 'bg-[#1A1A1A] text-white' : 'opacity-40 hover:opacity-100'}`}
        >
          4x
        </button>
      </div>

      <div className="bg-white p-4 min-w-[110px] flex flex-col items-center justify-center rounded-sm border border-black/5 shadow-md">
        <span className="text-[9px] font-black uppercase opacity-30 tracking-[0.4em] mb-1 text-[#1A1A1A]">Throughput</span>
        <span className="text-4xl font-black tabular-nums text-[#1A1A1A]">{score}</span>
      </div>
    </div>
  );
};