import React from 'react';
import { THEME } from '../../constants';
import { BaseButton } from '../UI/BaseButton';
import { TransitLine, Train, GameMode } from '../../types';

interface ResourcePanelProps {
  resources: { lines: number; trains: number; tunnels: number; bridges: number; wagons: number };
  activeLineIdx: number;
  onLineIdxChange: (idx: number) => void;
  lines: TransitLine[];
  onAddTrain: () => void;
  onRemoveTrain: (trainId: number) => void;
  onAddWagon: (trainId: number) => void;
  onRemoveWagon: (trainId: number) => void;
  onDeleteLine: () => void;
  mode: GameMode;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ 
  resources, 
  activeLineIdx, 
  onLineIdxChange, 
  lines,
  onAddTrain, 
  onRemoveTrain,
  onAddWagon,
  onRemoveWagon,
  onDeleteLine,
  mode
}) => {
  const currentLine = lines.find(l => l.id === activeLineIdx);
  const isLoop = currentLine && currentLine.stations.length > 2 && currentLine.stations[0] === currentLine.stations[currentLine.stations.length - 1];
  const isCreative = mode === 'CREATIVE';

  return (
    <>
      {/* LINE SELECTOR - TOP CENTER */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/60 backdrop-blur-md p-1.5 rounded-sm border border-white/5 shadow-2xl pointer-events-auto">
        {THEME.lineColors.map((color, idx) => {
          const hasLine = lines.some(l => l.id === idx);
          return (
            <button 
              key={idx} 
              onClick={() => onLineIdxChange(idx)} 
              className={`relative w-8 h-8 rounded-sm transition-all flex items-center justify-center
                ${activeLineIdx === idx ? 'scale-110 shadow-lg ring-2 ring-white' : 'opacity-20 hover:opacity-100'}
              `} 
              style={{ backgroundColor: color }}
              title={`Line ${idx + 1}`}
            >
              {hasLine && (
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
              )}
              <span className={`text-[10px] font-black ${idx === 3 || idx === 8 ? 'text-black' : 'text-white'}`}>
                {idx + 1}
              </span>
            </button>
          );
        })}
      </div>

      {/* INVENTORY - BOTTOM LEFT */}
      <div className="fixed bottom-8 left-8 z-50 bg-black/60 backdrop-blur-md px-6 py-4 rounded-sm border border-white/5 shadow-xl pointer-events-auto flex items-center gap-8">
        <InventoryItem label="Lines" value={isCreative ? '∞' : resources.lines} icon="L" />
        <div className="w-px h-6 bg-white/5" />
        <InventoryItem label="Trains" value={isCreative ? '∞' : resources.trains} icon="T" />
        <div className="w-px h-6 bg-white/5" />
        <InventoryItem label="Tunnels" value={isCreative ? '∞' : resources.tunnels} icon="U" />
        <div className="w-px h-6 bg-white/5" />
        <InventoryItem label="Bridges" value={isCreative ? '∞' : resources.bridges} icon="B" />
        <div className="w-px h-6 bg-white/5" />
        <InventoryItem label="Wagons" value={isCreative ? '∞' : resources.wagons} icon="W" />
      </div>

      {/* ACTIVE LINE MANAGEMENT - BOTTOM RIGHT */}
      <div className="fixed bottom-8 right-8 z-50 bg-black/60 backdrop-blur-md p-6 rounded-sm border border-white/5 shadow-2xl min-w-[320px] pointer-events-auto flex flex-col gap-4 max-h-[60vh]">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="text-[12px] font-black uppercase text-white">Line {activeLineIdx + 1}</h4>
              {isLoop && (
                <span className="bg-white text-black text-[7px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-widest">Loop</span>
              )}
            </div>
            <span className="text-[10px] font-black text-white/20 uppercase tracking-tighter">
              {currentLine?.trains.length || 0} TRAINS ACTIVE
            </span>
          </div>
          <button 
            onClick={onAddTrain} 
            disabled={!isCreative && resources.trains === 0} 
            className="bg-white text-black text-[10px] font-black px-4 py-1.5 uppercase tracking-tighter hover:bg-white/80 transition-colors disabled:opacity-20"
          >
            + Train
          </button>
        </div>

        {currentLine && currentLine.trains.length > 0 ? (
          <div className="flex flex-col gap-2 overflow-y-auto pr-2 no-scrollbar">
            {currentLine.trains.map((train, i) => (
              <div key={train.id} className="bg-white/5 border border-white/5 p-3 rounded-sm flex flex-col gap-2 transition-all hover:bg-white/10">
                <div className="flex justify-between items-center">
                  <span className="text-[8px] font-black text-white/40 uppercase">T-{i + 1}</span>
                  <button onClick={() => onRemoveTrain(train.id)} className="text-[8px] text-red-500 font-black uppercase hover:underline">Recall</button>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-end gap-1">
                    <div className="w-6 h-4 bg-white rounded-sm" />
                    {[...Array(train.wagons)].map((_, j) => (
                      <div key={j} className="w-4 h-3 bg-white/30 rounded-xs" />
                    ))}
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => onRemoveWagon(train.id)} 
                      disabled={train.wagons === 0}
                      className="w-6 h-6 flex items-center justify-center text-[10px] font-black disabled:opacity-10 bg-white/10 text-white rounded-sm hover:bg-white/20"
                    >—</button>
                    <button 
                      onClick={() => onAddWagon(train.id)} 
                      disabled={!isCreative && resources.wagons === 0}
                      className="w-6 h-6 flex items-center justify-center text-[10px] font-black disabled:opacity-10 bg-white/10 text-white rounded-sm hover:bg-white/20"
                    >+</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 border border-dashed border-white/10 rounded-sm">
            <p className="text-[9px] font-black text-white/10 uppercase tracking-widest">No deployed assets</p>
          </div>
        )}

        {currentLine && (
          <button 
            onClick={onDeleteLine} 
            className="text-[8px] font-black uppercase tracking-[0.2em] text-red-500/30 hover:text-red-500 transition-all text-center pt-1"
          >
            Abolish entire line
          </button>
        )}
      </div>
    </>
  );
};

const InventoryItem = ({ label, value, icon }: { label: string; value: number | string; icon: string }) => (
  <div className="flex items-center gap-3">
    <div className="w-6 h-6 rounded-sm bg-white flex items-center justify-center text-[10px] font-black text-black">
      {icon}
    </div>
    <div className="flex flex-col">
      <span className="text-sm font-black text-white leading-none">{value}</span>
      <span className="text-[7px] text-white/30 font-black uppercase tracking-widest">{label}</span>
    </div>
  </div>
);
