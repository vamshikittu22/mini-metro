import React from 'react';
import { GameMode } from '../../types';

interface ModeSelectViewProps {
  selectedMode: GameMode;
  onModeSelect: (mode: GameMode) => void;
  onStart: () => void;
}

export const ModeSelectView: React.FC<ModeSelectViewProps> = ({ selectedMode, onModeSelect, onStart }) => {
  return (
    <div className="fixed inset-0 bg-[#1A1A1A] flex flex-col items-center justify-center p-24 text-white">
      <div className="flex flex-col items-center gap-12 mb-32">
        {(['NORMAL', 'EXTREME', 'ENDLESS', 'CREATIVE'] as GameMode[]).map(m => (
          <ModeItem key={m} label={m} active={selectedMode === m} onClick={() => onModeSelect(m)} />
        ))}
      </div>
      <div className="flex flex-col items-center gap-4 cursor-pointer group" onClick={onStart}>
        <div className="w-12 h-12 border-2 border-[#2ECC71] group-hover:bg-[#2ECC71] transition-all rounded-full flex items-center justify-center relative">
           <div className="w-px h-8 bg-[#2ECC71] group-hover:bg-white absolute" />
           <div className="w-8 h-px bg-[#2ECC71] group-hover:bg-white absolute" />
        </div>
        <span className="text-xl font-black uppercase tracking-[0.4em] group-hover:text-[#2ECC71]">Establish Link</span>
      </div>
    </div>
  );
};

const ModeItem = ({ label, active, onClick }: any) => (
  <div onClick={onClick} className={`cursor-pointer transition-all ${active ? 'bg-blue-600 px-16 py-4' : 'opacity-40 hover:opacity-100'}`}>
    <span className={`text-6xl font-black uppercase tracking-tighter ${active ? 'text-white' : 'text-white/40'}`}>{label}</span>
  </div>
);
