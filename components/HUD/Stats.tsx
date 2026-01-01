import React from 'react';

interface StatsProps {
  score: number;
  timeScale: number;
  onSpeedChange: (speed: number) => void;
}

export const Stats: React.FC<StatsProps> = ({ score, timeScale, onSpeedChange }) => {
  return (
    <div className="absolute top-8 right-8 z-50 flex items-start gap-4 pointer-events-auto">
      <div className="bg-black/80 flex items-center p-1 rounded-sm gap-1">
        <button onClick={() => onSpeedChange(0)} className="w-8 h-8 flex items-center justify-center text-white text-[10px] font-bold opacity-40 hover:opacity-100">||</button>
        <button onClick={() => onSpeedChange(1)} className={`w-10 h-8 flex items-center justify-center text-white text-[10px] font-black ${timeScale === 1 ? 'bg-white text-black' : 'opacity-40'}`}>1x</button>
        <button onClick={() => onSpeedChange(2)} className={`w-10 h-8 flex items-center justify-center text-white text-[10px] font-black ${timeScale === 2 ? 'bg-white text-black' : 'opacity-40'}`}>2x</button>
        <button onClick={() => onSpeedChange(4)} className={`w-10 h-8 flex items-center justify-center text-white text-[10px] font-black ${timeScale === 4 ? 'bg-white text-black' : 'opacity-40'}`}>4x</button>
      </div>

      <div className="bg-[#B0B0B0]/40 p-4 min-w-[100px] flex flex-col items-center justify-center rounded-sm">
        <span className="text-[8px] font-black uppercase opacity-40 tracking-[0.4em] mb-1">Score</span>
        <span className="text-4xl font-black tabular-nums">{score}</span>
      </div>
    </div>
  );
};