
import React from 'react';
import { THEME } from '../../constants';
import { TransitLine, Train } from '../../types';

interface ResourcePanelProps {
  resources: { lines: number; trains: number; tunnels: number; bridges: number; wagons: number };
  activeLineIdx: number;
  onLineIdxChange: (idx: number) => void;
  lines: TransitLine[];
  onAddTrain: () => void;
  onRemoveTrain: (trainId: number) => void;
  onDeleteLine: () => void;
  onAudit: () => void;
  onAddWagon: (trainId: number) => void;
  onRemoveWagon: (trainId: number) => void;
}

/**
 * Calculates whether black or white text is better for contrast.
 */
function getContrastColor(hexColor: string) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#1A1A1A' : '#FFFFFF';
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ 
  resources, 
  activeLineIdx, 
  onLineIdxChange, 
  lines,
  onAddTrain,
  onRemoveTrain,
  onDeleteLine,
  onAudit,
  onAddWagon,
  onRemoveWagon
}) => {
  const activeLine = lines.find(l => l.id === activeLineIdx);
  const trainCount = activeLine ? activeLine.trains.length : 0;

  return (
    <>
      {/* Top Line Switcher */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 pointer-events-auto bg-white/90 backdrop-blur-md p-1.5 rounded-sm shadow-xl border border-black/5">
        {Array.from({ length: 10 }).map((_, idx) => {
          const isActive = activeLineIdx === idx;
          const lineRef = lines.find(l => l.id === idx);
          const hasLine = !!lineRef;
          const lineColor = THEME.lineColors[idx];
          const textColor = getContrastColor(lineColor);
          
          return (
            <button 
              key={idx} 
              onClick={() => onLineIdxChange(idx)} 
              className={`w-11 h-11 flex flex-col items-center justify-center transition-all duration-300 rounded-sm relative group ${
                isActive ? 'scale-110 z-10 shadow-lg' : 'opacity-40 grayscale-[0.3] hover:opacity-100 hover:grayscale-0'
              }`}
              style={{ 
                backgroundColor: lineColor,
                border: isActive ? '3px solid #1A1A1A' : '1px solid rgba(0,0,0,0.1)',
              }}
            >
              <span className="text-[18px] font-black" style={{ color: isActive ? textColor : 'rgba(255,255,255,0.8)' }}>
                {idx + 1}
              </span>
              {hasLine && <div className="absolute top-1 right-1 w-2 h-2 rounded-full" style={{ backgroundColor: textColor }} />}
            </button>
          );
        })}
      </div>

      {/* Bottom Inventory Bar */}
      <div className="fixed bottom-8 left-8 z-50 flex items-center gap-1 pointer-events-auto">
        <InvItem code="L" val={resources.lines} label="Lines" onClick={onAudit} />
        <InvItem code="T" val={resources.trains} label="Locos" onClick={onAudit} />
        <InvItem code="U" val={resources.tunnels} label="Tunnels" onClick={onAudit} />
        <InvItem code="B" val={resources.bridges} label="Bridges" onClick={onAudit} />
        <InvItem code="W" val={resources.wagons} label="Wagons" onClick={onAudit} />
      </div>

      {/* Management Box */}
      <div className="fixed bottom-8 right-8 z-50 w-[300px] bg-[#1A1A1A] p-6 text-white pointer-events-auto rounded-sm border border-white/5 shadow-2xl">
         <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
            <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <div className="w-3 h-3 rounded-full" style={{ backgroundColor: THEME.lineColors[activeLineIdx] }} />
                 <span className="text-[12px] font-black uppercase tracking-widest">SYSTEM {activeLineIdx + 1}</span>
               </div>
               <span className="text-[10px] font-bold opacity-30 uppercase tracking-widest">{trainCount} TRAINS</span>
            </div>
            <button 
              onClick={onAddTrain} 
              disabled={resources.trains <= 0}
              className="bg-white text-black px-4 py-2 text-[10px] font-black uppercase hover:bg-emerald-500 hover:text-white transition-all disabled:opacity-20"
            >
              + LOCO
            </button>
         </div>

         {/* Individual Train Management */}
         <div className="flex flex-col gap-3 mb-6 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
           {activeLine?.trains.map((train, i) => (
             <div key={train.id} className="bg-white/5 p-3 rounded-sm border border-white/10 flex flex-col gap-2">
               <div className="flex justify-between items-center">
                 <span className="text-[9px] font-black uppercase tracking-tight">Train {i+1} ({train.wagons} Wagons)</span>
                 <button onClick={() => onRemoveTrain(train.id)} className="text-[8px] font-black text-red-400 uppercase hover:text-white">Retire</button>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={() => onAddWagon(train.id)}
                   disabled={resources.wagons <= 0}
                   className="flex-1 bg-white/10 hover:bg-white text-white hover:text-black py-1.5 text-[8px] font-black uppercase transition-all disabled:opacity-10"
                 >
                   + Wagon
                 </button>
                 <button 
                   onClick={() => onRemoveWagon(train.id)}
                   disabled={train.wagons <= 0}
                   className="flex-1 bg-white/10 hover:bg-white text-white hover:text-black py-1.5 text-[8px] font-black uppercase transition-all disabled:opacity-10"
                 >
                   - Wagon
                 </button>
               </div>
             </div>
           ))}
         </div>

         <div className="flex flex-col gap-2">
            {activeLine && (
              <button 
                onClick={onDeleteLine}
                className="w-full py-2 bg-red-600/20 hover:bg-red-600 text-red-500 hover:text-white text-[10px] font-black uppercase transition-all"
              >
                Delete Line {activeLineIdx + 1}
              </button>
            )}
         </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
      `}</style>
    </>
  );
};

const InvItem = ({ code, val, label, onClick }: any) => (
  <div onClick={onClick} className="bg-white px-5 py-3 flex items-center gap-4 cursor-pointer hover:bg-black group transition-all border border-black/5 shadow-lg rounded-sm">
    <div className="w-5 h-5 bg-[#1A1A1A] text-white flex items-center justify-center text-[10px] font-black group-hover:bg-emerald-500 transition-all rounded-sm">{code}</div>
    <div className="flex flex-col">
       <span className="text-[15px] font-black text-[#1A1A1A] leading-none tracking-tight group-hover:text-white tabular-nums">{val}</span>
       <span className="text-[8px] font-black text-[#1A1A1A]/30 uppercase tracking-widest">{label}</span>
    </div>
  </div>
);
