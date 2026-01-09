
import React from 'react';
import { THEME } from '../../constants';
import { TransitLine, Station } from '../../types';

interface ResourcePanelProps {
  resources: { lines: number; trains: number; tunnels: number; bridges: number; wagons: number };
  activeLineIdx: number;
  onLineIdxChange: (idx: number) => void;
  lines: TransitLine[];
  stations: Station[];
  onAddTrain: () => void;
  onRemoveTrain: (trainId: number) => void;
  onDeleteLine: () => void;
  onAudit: () => void;
  onAddWagon: (trainId: number) => void;
  onRemoveWagon: (trainId: number) => void;
  onDownload?: () => void;
}

function getContrastColor(hexColor: string) {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 128 ? '#000000' : '#FFFFFF';
}

export const ResourcePanel: React.FC<ResourcePanelProps> = ({ 
  resources, 
  activeLineIdx, 
  onLineIdxChange, 
  lines,
  stations,
  onAddTrain,
  onRemoveTrain,
  onDeleteLine,
  onAudit,
  onAddWagon,
  onRemoveWagon,
  onDownload
}) => {
  const activeLine = lines.find(l => l.id === activeLineIdx);
  const trainCount = activeLine ? activeLine.trains.length : 0;

  const unconnectedCount = stations.filter(s => 
    !lines.some(l => l.stations.includes(s.id))
  ).length;

  const totalWaiting = stations.reduce((acc, s) => acc + s.waitingPassengers.length, 0);

  return (
    <>
      {/* Top Line Switcher */}
      <div className="fixed top-8 left-1/2 -translate-x-1/2 z-50 flex gap-1 pointer-events-auto bg-white border-2 border-black p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
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
              className={`w-10 h-10 flex flex-col items-center justify-center transition-all duration-200 relative ${
                isActive ? 'scale-110 z-10 border-2 border-black' : 'opacity-40 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
              }`}
              style={{ backgroundColor: lineColor }}
            >
              <span className="text-[16px] font-black" style={{ color: textColor }}>
                {idx + 1}
              </span>
              {hasLine && <div className="absolute top-0.5 right-0.5 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: textColor }} />}
            </button>
          );
        })}
      </div>

      {/* Bottom Inventory Bar */}
      <div className="fixed bottom-8 left-8 z-50 flex items-center gap-2 pointer-events-auto">
        <InvItem code="L" val={resources.lines} label="Lines" onClick={onAudit} />
        <InvItem code="T" val={resources.trains} label="Locos" onClick={onAudit} />
        <InvItem code="U" val={resources.tunnels} label="Tunnels" onClick={onAudit} />
        <InvItem code="B" val={resources.bridges} label="Bridges" onClick={onAudit} />
        <InvItem code="W" val={resources.wagons} label="Wagons" onClick={onAudit} />
        
        <div className="ml-4 bg-black p-3 border-2 border-white flex gap-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
          <div className="flex flex-col">
            <span className="text-[12px] font-black text-white leading-none tabular-nums">{unconnectedCount}</span>
            <span className="text-[7px] font-black text-white/60 uppercase tracking-widest">Unconnected</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[12px] font-black text-white leading-none tabular-nums">{totalWaiting}</span>
            <span className="text-[7px] font-black text-white/60 uppercase tracking-widest">Waiting</span>
          </div>
        </div>
        
        {onDownload && (
          <button 
            onClick={onDownload}
            className="ml-4 bg-white border-2 border-black p-3 flex flex-col items-center shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:text-white transition-all"
            title="Download System Analysis"
          >
            <span className="text-[12px]">📊</span>
            <span className="text-[7px] font-black uppercase">DATA</span>
          </button>
        )}
      </div>

      {/* Management Box */}
      <div className="fixed bottom-8 right-8 z-50 w-[300px] bg-white border-2 border-black p-6 text-black pointer-events-auto shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
         <div className="flex justify-between items-center mb-6 border-b-2 border-black pb-4">
            <div className="flex flex-col">
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 border border-black" style={{ backgroundColor: THEME.lineColors[activeLineIdx] }} />
                 <span className="text-[13px] font-black uppercase tracking-widest text-black">SYSTEM {activeLineIdx + 1}</span>
               </div>
               <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-black/60">{trainCount} ACTIVE TRAINS</span>
            </div>
            <button 
              onClick={onAddTrain} 
              disabled={resources.trains <= 0}
              className="bg-black text-white px-3 py-2 text-[9px] font-black uppercase hover:bg-emerald-500 transition-all disabled:opacity-20"
            >
              + LOCO
            </button>
         </div>

         <div className="flex flex-col gap-3 mb-6 max-h-[260px] overflow-y-auto pr-2 custom-scrollbar">
           {activeLine?.trains.map((train, i) => (
             <div key={train.id} className="bg-black/5 p-3 border border-black flex flex-col gap-2">
               <div className="flex justify-between items-center">
                 <span className="text-[9px] font-black uppercase tracking-tight text-black">Train {i+1} • {train.wagons} Wagons</span>
                 <button onClick={() => onRemoveTrain(train.id)} className="text-[8px] font-black text-red-600 uppercase hover:underline">Retire</button>
               </div>
               <div className="flex gap-2">
                 <button 
                   onClick={() => onAddWagon(train.id)}
                   disabled={resources.wagons <= 0}
                   className="flex-1 bg-white border border-black hover:bg-black hover:text-white py-1.5 text-[8px] font-black uppercase transition-all disabled:opacity-30"
                 >
                   + Wagon
                 </button>
                 <button 
                   onClick={() => onRemoveWagon(train.id)}
                   disabled={train.wagons <= 0}
                   className="flex-1 bg-white border border-black hover:bg-black hover:text-white py-1.5 text-[8px] font-black uppercase transition-all disabled:opacity-30"
                 >
                   - Wagon
                 </button>
               </div>
             </div>
           ))}
           {trainCount === 0 && (
             <div className="py-4 flex flex-col items-center justify-center">
               <span className="text-[10px] font-black uppercase tracking-widest italic text-black/30">No trains deployed</span>
             </div>
           )}
         </div>

         <div className="flex flex-col gap-2">
            {activeLine && (
              <button 
                onClick={handleDeleteClick}
                className="w-full py-2.5 bg-white border-2 border-black hover:bg-red-600 hover:text-white text-black text-[10px] font-black uppercase transition-all"
              >
                Delete Line {activeLineIdx + 1}
              </button>
            )}
         </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f0f0f0; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #000; }
      `}</style>
    </>
  );

  function handleDeleteClick() {
    onDeleteLine();
  }
};

const InvItem = ({ code, val, label, onClick }: any) => (
  <div onClick={onClick} className="bg-white px-4 py-3 flex items-center gap-3 cursor-pointer border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] group transition-all">
    <div className="w-5 h-5 bg-black text-white flex items-center justify-center text-[9px] font-black group-hover:bg-emerald-500 transition-all">{code}</div>
    <div className="flex flex-col">
       <span className="text-[16px] font-black text-black leading-none tabular-nums">{val}</span>
       <span className="text-[7px] font-black text-black uppercase tracking-[0.2em] opacity-80">{label}</span>
    </div>
  </div>
);
