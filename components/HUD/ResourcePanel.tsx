import React from 'react';
import { THEME } from '../../constants';
import { TransitLine } from '../../types';

interface ResourcePanelProps {
  resources: { lines: number; trains: number; tunnels: number; bridges: number; wagons: number };
  activeLineIdx: number;
  onLineIdxChange: (idx: number) => void;
  lines: TransitLine[];
  onAddTrain: () => void;
  onDeleteLine: () => void;
  onAudit: () => void;
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ 
  resources, 
  activeLineIdx, 
  onLineIdxChange, 
  lines,
  onAddTrain,
  onDeleteLine,
  onAudit
}) => {
  const activeLine = lines.find(l => l.id === activeLineIdx);
  const trainCount = activeLine ? activeLine.trains.length : 0;

  return (
    <>
      {/* Top Line Switcher */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 pointer-events-auto bg-black/60 p-1 rounded-sm">
        {Array.from({ length: 10 }).map((_, idx) => {
          const isActive = activeLineIdx === idx;
          const hasLine = lines.some(l => l.id === idx);
          return (
            <button 
              key={idx} 
              onClick={() => onLineIdxChange(idx)} 
              className={`w-8 h-8 flex items-center justify-center text-[10px] font-black transition-all ${
                isActive ? 'bg-[#2ECC71] text-white' : hasLine ? 'bg-white/20 text-white' : 'opacity-20 text-white hover:opacity-100'
              }`}
            >
              {idx + 1}
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
      <div className="fixed bottom-8 right-8 z-50 w-[240px] bg-[#444444] p-6 text-white pointer-events-auto rounded-sm border border-white/5 shadow-xl">
         <div className="flex justify-between items-center mb-6">
            <div className="flex flex-col">
               <span className="text-[10px] font-black uppercase">Line {activeLineIdx + 1}</span>
               <span className="text-[8px] font-bold opacity-40 uppercase tracking-widest">{trainCount} Trains Deployed</span>
            </div>
            <button onClick={onAddTrain} className="bg-white text-black px-3 py-1 text-[9px] font-black uppercase hover:bg-[#2ECC71] hover:text-white transition-all">+ Train</button>
         </div>
         <div className="flex flex-col gap-4">
            <div className="h-[40px] border border-dashed border-white/10 flex items-center justify-center">
               <span className="text-[8px] font-bold opacity-20 uppercase tracking-[0.4em]">
                 {trainCount > 0 ? `${trainCount} Active Assets` : 'No Deployed Assets'}
               </span>
            </div>
            {activeLine && (
              <button 
                onClick={onDeleteLine}
                className="w-full py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[9px] font-black uppercase transition-all rounded-sm"
              >
                Delete Connection
              </button>
            )}
         </div>
      </div>
    </>
  );
};

const InvItem = ({ code, val, label, onClick }: any) => (
  <div onClick={onClick} className="bg-[#444444] px-4 py-2 flex items-center gap-3 cursor-pointer hover:bg-black transition-all border border-white/5">
    <div className="w-5 h-5 bg-white text-black flex items-center justify-center text-[9px] font-black rounded-[1px]">{code}</div>
    <div className="flex flex-col">
       <span className="text-xs font-black text-white leading-none">{val}</span>
       <span className="text-[7px] font-bold text-white/40 uppercase tracking-widest">{label}</span>
    </div>
  </div>
);