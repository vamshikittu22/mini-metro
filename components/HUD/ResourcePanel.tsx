import React from 'react';
import { THEME } from '../../constants';
import { BaseButton } from '../UI/BaseButton';
import { TransitLine, Train } from '../../types';

interface ResourcePanelProps {
  resources: { lines: number; trains: number; tunnels: number; wagons: number };
  activeLineIdx: number;
  onLineIdxChange: (idx: number) => void;
  lines: TransitLine[];
  onAddTrain: () => void;
  onRemoveTrain: (trainId: number) => void;
  onAddWagon: (trainId: number) => void;
  onRemoveWagon: (trainId: number) => void;
  onDeleteLine: () => void;
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
  onDeleteLine
}) => {
  const currentLine = lines.find(l => l.id === activeLineIdx);
  const isLoop = currentLine && currentLine.stations.length > 2 && currentLine.stations[0] === currentLine.stations[currentLine.stations.length - 1];

  return (
    <div className="absolute bottom-10 right-10 z-10 bg-white/95 border border-black/5 p-8 rounded-[3rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.1)] min-w-[380px] pointer-events-auto flex flex-col gap-8 backdrop-blur-xl">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#2F3436]/40">Inventory</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            <AssetStat label="Routes" value={resources.lines} />
            <AssetStat label="Locos" value={resources.trains} />
            <AssetStat label="Cross" value={resources.tunnels} />
            <AssetStat label="Wagons" value={resources.wagons} />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-[120px] justify-end">
          {THEME.lineColors.map((color, idx) => (
            <button 
              key={idx} 
              onClick={() => onLineIdxChange(idx)} 
              className={`w-6 h-6 rounded-md transition-all ${activeLineIdx === idx ? 'scale-110 shadow-lg ring-2 ring-offset-2 ring-[#2F3436]' : 'opacity-20 hover:opacity-60'}`} 
              style={{ backgroundColor: color }} 
            />
          ))}
        </div>
      </div>

      <div className="h-px bg-black/5 w-full" />

      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <h4 className="text-[14px] font-black uppercase text-[#2F3436]">Line {activeLineIdx + 1}</h4>
              {isLoop && (
                <div className="flex items-center gap-1 bg-black/5 px-2 py-0.5 rounded-full" title="Circular Route">
                   <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" className="text-[#2F3436]">
                    <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8"/>
                    <path d="M21 3v5h-5"/>
                  </svg>
                  <span className="text-[8px] font-black uppercase tracking-widest text-[#2F3436]/60">Loop</span>
                </div>
              )}
            </div>
            <span className="text-[9px] font-black text-black/20 uppercase tracking-widest">{currentLine?.trains.length || 0} active locos</span>
          </div>
          <BaseButton variant="primary" size="sm" onClick={onAddTrain} disabled={resources.trains === 0}>
            Deploy Unit
          </BaseButton>
        </div>

        <div className="flex flex-col gap-4 max-h-[340px] overflow-y-auto pr-3 no-scrollbar">
          {currentLine && currentLine.trains.length > 0 ? (
            currentLine.trains.map((train, i) => (
              <div key={train.id} className="bg-black/[0.03] p-4 rounded-3xl flex flex-col gap-4 border border-transparent hover:border-black/5 transition-all">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#2F3436]" />
                    <span className="text-[10px] font-black text-black/60 uppercase">Locomotive {i + 1}</span>
                  </div>
                  <button onClick={() => onRemoveTrain(train.id)} className="text-[9px] text-red-400 font-black uppercase hover:text-red-600 transition-colors">Recall</button>
                </div>
                
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-end gap-1.5 pb-1">
                    <div className="w-10 h-6 bg-[#2F3436] rounded-md" />
                    {[...Array(train.wagons)].map((_, j) => (
                      <div key={j} className="w-8 h-5 bg-[#2F3436]/40 rounded-sm" />
                    ))}
                  </div>
                  
                  <div className="flex bg-white rounded-2xl p-1 shadow-sm border border-black/5">
                    <button 
                      onClick={() => onRemoveWagon(train.id)} 
                      disabled={train.wagons === 0}
                      className="w-8 h-8 flex items-center justify-center text-sm font-black disabled:opacity-20 hover:bg-black/5 rounded-xl transition-all"
                    >—</button>
                    <div className="w-px h-4 bg-black/5 self-center" />
                    <button 
                      onClick={() => onAddWagon(train.id)} 
                      disabled={resources.wagons === 0}
                      className="w-8 h-8 flex items-center justify-center text-sm font-black disabled:opacity-20 hover:bg-black/5 rounded-xl transition-all"
                    >+</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-[10px] font-black text-black/20 uppercase tracking-widest">No deployed assets</p>
            </div>
          )}
        </div>

        {currentLine && (
          <button 
            onClick={onDeleteLine} 
            className="text-[9px] font-black uppercase tracking-[0.3em] text-red-500/40 hover:text-red-500 transition-all pt-2"
          >
            Abolish entire line
          </button>
        )}
      </div>
    </div>
  );
};

const AssetStat = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col">
    <span className="text-xl font-black text-[#2F3436] leading-none">{value}</span>
    <span className="text-[8px] text-black/30 font-black uppercase tracking-wider mt-1">{label}</span>
  </div>
);