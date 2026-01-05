import React, { useEffect } from 'react';

interface ToastProps {
  message: string;
  visible: boolean;
  onHide: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, visible, onHide }) => {
  useEffect(() => {
    if (visible) {
      const timer = setTimeout(onHide, 2000);
      return () => clearTimeout(timer);
    }
  }, [visible, onHide]);

  if (!visible) return null;

  return (
    <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[1000] bg-black text-white px-6 py-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.2)] animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
      <div className="flex items-center gap-3">
        <span className="text-xl">↺</span>
        <span className="text-[10px] font-black uppercase tracking-widest">{message}</span>
      </div>
    </div>
  );
};