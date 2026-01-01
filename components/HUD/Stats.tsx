
import React from 'react';

interface StatsProps {
  score: number;
  timeScale: number;
  onSpeedChange: (speed: number) => void;
}

export const Stats: React.FC<StatsProps> = ({ score, timeScale, onSpeedChange }) => {
  const btnClass = (active: boolean) => `
    w-10 h-10 flex items-center justify-center text-[10px] font-black uppercase tracking-widest transition-all
    ${active ? 'bg-black text-white' : 'text-black hover:bg-black/5'}
  `;

  return (
    <div className="absolute top-8 right-8 z-50 flex items-start gap-3 pointer-events-auto">
      <div className="bg-white border-2 border-black flex items-center p-0.5 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <button onClick={() => onSpeedChange(0)} className={btnClass(timeScale === 0)}>||</button>
        <button onClick={() => onSpeedChange(1)} className={btnClass(timeScale === 1)}>1x</button>
        <button onClick={() => onSpeedChange(2)} className={btnClass(timeScale === 2)}>2x</button>
        <button onClick={() => onSpeedChange(4)} className={btnClass(timeScale === 4)}>4x</button>
      </div>

      <div className="bg-white border-2 border-black p-4 min-w-[120px] flex flex-col items-center justify-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
        <span className="text-[9px] font-black uppercase opacity-40 tracking-[0.4em] mb-1 text-black">Throughput</span>
        <span className="text-4xl font-black tabular-nums text-black leading-none">{score}</span>
      </div>
    </div>
  );
};
