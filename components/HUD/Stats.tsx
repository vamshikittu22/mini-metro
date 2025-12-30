import React from 'react';
import { lerpColor } from '../../services/utils';

interface StatsProps {
  score: number;
  timeScale: number;
  autoSpawn: boolean;
  dayNightAuto: boolean;
  isNightManual: boolean;
  currentText: string;
  currentBg: string;
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
  currentText,
  currentBg,
  onSpeedChange, 
  onToggleAutoSpawn,
  onToggleDayNightAuto,
  onToggleManualDayNight
}) => {
  const isLightMode = currentBg.toLowerCase() === '#ffffff';

  return (
    <div className="flex flex-col items-end gap-2 pointer-events-auto">
      <div className="flex items-center gap-4">
        
        {/* DAY/NIGHT CONTROLS */}
        <div className="flex backdrop-blur p-1 rounded-sm border shadow-lg gap-1" style={{ backgroundColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.4)', borderColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}>
          <button 
            onClick={onToggleDayNightAuto}
            className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all rounded-xs`}
            style={{ 
              backgroundColor: dayNightAuto ? currentText : 'transparent', 
              color: dayNightAuto ? currentBg : currentText,
              opacity: dayNightAuto ? 1 : 0.4
            }}
            title="Auto Day/Night Cycle"
          >
            {dayNightAuto ? 'Auto Cycle' : 'Manual Cycle'}
          </button>
          {!dayNightAuto && (
            <button 
              onClick={onToggleManualDayNight}
              className={`px-3 py-1.5 text-[8px] font-black uppercase tracking-widest transition-all rounded-xs shadow-sm`}
              style={{ 
                backgroundColor: isNightManual ? '#3E86C6' : '#FBAE17',
                color: isNightManual ? '#FFFFFF' : '#000000'
              }}
            >
              {isNightManual ? 'Set Day' : 'Set Night'}
            </button>
          )}
        </div>

        {/* SIMULATION TOGGLE (STOP SWITCH) */}
        <div className="flex backdrop-blur p-1 rounded-sm border shadow-lg" style={{ backgroundColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.4)', borderColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}>
          <button 
            onClick={onToggleAutoSpawn}
            className={`px-4 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all rounded-xs`}
            style={{ 
              backgroundColor: autoSpawn ? currentText : '#EF4444', 
              color: autoSpawn ? currentBg : '#FFFFFF' 
            }}
          >
            {autoSpawn ? 'System Live' : 'Simulation Stopped'}
          </button>
        </div>

        {/* SPEED CONTROLS */}
        <div className="flex gap-1 backdrop-blur p-1 rounded-sm border shadow-lg" style={{ backgroundColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.4)', borderColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}>
          {[0, 1, 2, 4].map(s => (
            <button 
              key={s}
              onClick={() => onSpeedChange(s)} 
              className={`w-8 h-8 rounded-xs flex items-center justify-center text-[10px] font-black transition-all`}
              style={{ 
                backgroundColor: timeScale === s ? currentText : 'transparent', 
                color: timeScale === s ? currentBg : currentText,
                opacity: timeScale === s ? 1 : 0.2
              }}
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
        <div className="text-right backdrop-blur px-6 py-2 rounded-sm border shadow-lg" style={{ backgroundColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(0,0,0,0.4)', borderColor: isLightMode ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)' }}>
          <p className="text-[8px] uppercase tracking-[0.4em] font-black leading-none mb-1" style={{ color: lerpColor(currentBg, currentText, 0.4) }}>Score</p>
          <p className="text-3xl font-black tabular-nums tracking-tighter leading-none" style={{ color: currentText }}>{score}</p>
        </div>
      </div>
    </div>
  );
};