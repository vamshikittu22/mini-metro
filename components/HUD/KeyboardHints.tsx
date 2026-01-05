import React, { useState } from 'react';

export const KeyboardHints: React.FC = () => {
  const [visible, setVisible] = useState(true);

  if (!visible) {
    return (
      <button 
        onClick={() => setVisible(true)}
        className="fixed bottom-8 right-[330px] z-40 bg-white/80 backdrop-blur border-2 border-black w-8 h-8 flex items-center justify-center text-black font-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-y-0.5 hover:shadow-none transition-all pointer-events-auto"
        title="Show Controls"
      >
        ?
      </button>
    );
  }

  return (
    <div className="fixed bottom-8 right-[330px] z-40 bg-white/90 backdrop-blur border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] pointer-events-auto animate-in slide-in-from-right-4 fade-in duration-300 max-w-[200px]">
      <div className="flex justify-between items-center mb-3 border-b border-black pb-2">
        <span className="text-[9px] font-black uppercase tracking-widest text-black">Keybinds</span>
        <button onClick={() => setVisible(false)} className="text-[10px] font-black hover:text-red-500 text-black">✕</button>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-2 text-[8px] font-black uppercase text-black">
        <div className="flex justify-center"><span className="bg-black text-white px-1.5 py-0.5 rounded-[2px] min-w-[24px] text-center">SPC</span></div>
        <span className="self-center">Pause / Play</span>
        
        <div className="flex justify-center"><span className="bg-black text-white px-1.5 py-0.5 rounded-[2px] min-w-[24px] text-center">1-4</span></div>
        <span className="self-center">Speed Control</span>
        
        <div className="flex justify-center"><span className="bg-black text-white px-1.5 py-0.5 rounded-[2px] min-w-[24px] text-center">TAB</span></div>
        <span className="self-center">Cycle Line</span>
        
        <div className="flex justify-center"><span className="bg-black text-white px-1.5 py-0.5 rounded-[2px] min-w-[24px] text-center">Z</span></div>
        <span className="self-center">Undo / Redo</span>
        
        <div className="flex justify-center"><span className="bg-black text-white px-1.5 py-0.5 rounded-[2px] min-w-[24px] text-center">ESC</span></div>
        <span className="self-center">Close / Menu</span>
      </div>
    </div>
  );
};