
import React from 'react';
import { LoadingScreen } from '../LoadingScreen';

interface MainMenuViewProps {
  isLoading: boolean;
  saveInfo: { exists: boolean; time?: string };
  onNewConnection: () => void;
  onResume: () => void;
  onCaseStudy: () => void;
}

export const MainMenuView: React.FC<MainMenuViewProps> = ({ 
  isLoading, 
  saveInfo, 
  onNewConnection, 
  onResume,
  onCaseStudy
}) => {
  return (
    <div className="fixed inset-0 bg-[#1A1A1A] flex flex-col items-start justify-center p-24 select-none">
      <LoadingScreen isFading={!isLoading} />
      <h1 className="text-[120px] font-black tracking-tighter text-white mb-20 leading-none">MINI METRO ▲</h1>
      <div className="flex flex-col gap-4">
        <MenuBtn icon="→" onClick={onNewConnection}>New Connection</MenuBtn>
        <MenuBtn 
          icon="↗" 
          onClick={saveInfo.exists ? onResume : undefined} 
          className={!saveInfo.exists ? 'opacity-20 cursor-not-allowed grayscale' : ''}
        >
          Resume {saveInfo.time && <span className="text-[16px] lowercase opacity-50 ml-2">({saveInfo.time})</span>}
        </MenuBtn>
        <MenuBtn icon="◎" onClick={onCaseStudy}>Case Study</MenuBtn>
        <MenuBtn icon="→" onClick={() => {}}>Daily Challenge</MenuBtn>
        <MenuBtn icon="↓" onClick={() => {}}>Options</MenuBtn>
        <MenuBtn icon="↙" onClick={() => {}}>Exit</MenuBtn>
      </div>
    </div>
  );
};

interface MenuBtnProps {
  children: React.ReactNode;
  icon: string;
  onClick?: () => void;
  className?: string;
}

const MenuBtn: React.FC<MenuBtnProps> = ({ children, icon, onClick, className = '' }) => (
  <div onClick={onClick} className={`flex items-center gap-6 group cursor-pointer ${className}`}>
    <span className="text-white/40 text-3xl font-black group-hover:text-blue-400">{icon}</span>
    <div className="bg-blue-600 px-8 py-3 group-hover:bg-white group-hover:text-black transition-all">
      <span className="text-4xl font-black text-white group-hover:text-black uppercase tracking-tighter">{children}</span>
    </div>
  </div>
);
