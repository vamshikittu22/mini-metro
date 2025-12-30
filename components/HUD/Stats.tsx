import React from 'react';

interface StatsProps {
  score: number;
  timeScale: number;
  autoSpawn: boolean;
  dayNightAuto: boolean;
  isNightManual: boolean;
  onSpeedChange: (speed: number) => void;
  onToggleAutoSpawn: () => void;
  onToggleDayNightAuto: () => void;
  onToggleManualDayNight: () => void;
}

export const Stats: React.FC<StatsProps> = ({ 
  score, 
  timeScale, 
  autoSpawn, 
  dayNightAuto, 
  isNightManual, 
  onSpeedChange, 
  onToggleAutoSpawn,
  onToggleDayNightAuto,
  onToggleManualDayNight
}) => {
  return (
    <div className="flex flex-col items-end gap-2 pointer-events-auto">
      <div className="flex items-center gap-4">
        
        {/* DAY/NIGHT CONTROLS */}
        <div className="flex bg-black/40 backdrop-blur p-1 rounded-sm border border-white/5 shadow-lg gap-1">
          <button 
            onClick={onToggleDayNightAuto}
            className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${dayNightAuto ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}
            title="Auto Day/Night Cycle"
          >
            {dayNightAuto ? 'Auto Cycle' : 'Manual Cycle'}
          </button>
          {!dayNightAuto && (
            <button 
              onClick={onToggleManualDayNight}
              className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all ${isNightManual ? 'bg-[#3E86C6] text-white' : 'bg-[#FBAE17] text-black shadow-lg shadow-yellow-500/20'}`}
            >
              {isNightManual ? 'Set Day' : 'Set Night'}
            </button>
          )}
        </div>

        {/* SIMULATION TOGGLE (STOP SWITCH) */}
        <div className="flex bg-black/40 backdrop-blur p-1 rounded-sm border border-white/5 shadow-lg">
          <button 
            onClick={onToggleAutoSpawn}
            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${autoSpawn ? 'bg-white text-black' : 'bg-red-500 text-white animate-pulse'}`}
          >
            {autoSpawn ? 'System Live' : 'Simulation Stopped'}
          </button>
        </div>

        {/* SPEED CONTROLS */}
        <div className="flex gap-1 bg-black/40 backdrop-blur p-1 rounded-sm border border-white/5 shadow-lg">
          {[0, 1, 2, 4].map(s => (
            <button 
              key={s}
              onClick={() => onSpeedChange(s)} 
              className={`w-8 h-8 rounded-sm flex items-center justify-center text-[10px] font-black transition-all ${timeScale === s ? 'bg-white text-black shadow-md' : 'text-white/20 hover:text-white'}`}
            >
              {s === 0 ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
                </svg>
              ) : `${s}x`}
            </button>
          ))}
        </div>

        {/* SCORE DISPLAY */}
        <div className="text-right bg-black/40 backdrop-blur px-6 py-2 rounded-sm border border-white/5 shadow-lg">
          <p className="text-[8px] uppercase tracking-[0.4em] text-white/40 font-black leading-none mb-1">Score</p>
          <p className="text-3xl font-black tabular-nums text-white tracking-tighter leading-none">{score}</p>
        </div>
      </div>
    </div>
  );
};