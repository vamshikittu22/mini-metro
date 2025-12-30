import React from 'react';
import { StationType } from '../../types';

interface CreativeToolbarProps {
  activeTool: 'PAN' | 'ERASE' | StationType;
  onToolChange: (tool: 'PAN' | 'ERASE' | StationType) => void;
}

export const CreativeToolbar: React.FC<CreativeToolbarProps> = ({ activeTool, onToolChange }) => {
  const tools: { id: 'PAN' | 'ERASE' | StationType; label: string; icon: string }[] = [
    { id: 'PAN', label: 'Navigate', icon: '⊹' },
    { id: 'circle', label: 'Place Circle', icon: '○' },
    { id: 'square', label: 'Place Square', icon: '□' },
    { id: 'triangle', label: 'Place Triangle', icon: '△' },
    { id: 'pentagon', label: 'Place Pentagon', icon: '⬠' },
    { id: 'star', label: 'Place Star', icon: '☆' },
    { id: 'ERASE', label: 'Erase Station', icon: '✕' },
  ];

  return (
    <div className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 bg-black/60 backdrop-blur-md p-2 rounded-full border border-white/5 shadow-2xl pointer-events-auto">
      {tools.map((tool) => (
        <button
          key={tool.id}
          onClick={() => onToolChange(tool.id)}
          className={`w-10 h-10 rounded-full flex items-center justify-center text-xl transition-all ${
            activeTool === tool.id
              ? 'bg-white text-black scale-110 shadow-lg'
              : 'text-white/40 hover:text-white hover:bg-white/10'
          }`}
          title={tool.label}
        >
          {tool.icon}
        </button>
      ))}
      <div className="mx-2 w-px h-6 bg-white/10" />
      <span className="text-[8px] font-black uppercase text-white/30 tracking-widest px-2">Creative Toolset</span>
    </div>
  );
};
