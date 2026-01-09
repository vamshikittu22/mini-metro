import React, { useState, useEffect } from 'react';

const DISMISS_KEY = 'mini-metro-mobile-dismissed-until';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

export const MobileWarning: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isSmallScreen = window.innerWidth < 768;
    
    // Only warn if it's both a small screen and has touch support (skipping tablets/desktops)
    const isTargetDevice = isSmallScreen && hasTouch;
    
    const dismissedUntil = localStorage.getItem(DISMISS_KEY);
    const isCurrentlyDismissed = dismissedUntil && Date.now() < parseInt(dismissedUntil, 10);

    if (isTargetDevice && !isCurrentlyDismissed) {
      setIsVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, (Date.now() + DISMISS_DURATION).toString());
    setIsVisible(false);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 select-none">
      <div className="bg-[#F8F4EE] border-4 border-black p-8 max-w-md w-full shadow-[16px_16px_0px_0px_rgba(0,0,0,1)] flex flex-col gap-6 animate-in zoom-in-95 duration-300">
        <div className="border-b-4 border-black pb-4">
          <h2 className="text-4xl font-black uppercase tracking-tighter text-[#EF3340] leading-none">
            Desktop<br/>Optimized
          </h2>
        </div>
        
        <div className="flex flex-col gap-4">
          <p className="text-sm font-bold uppercase leading-relaxed text-black tracking-wide">
            This simulation is designed for mouse & keyboard input.
          </p>
          <div className="bg-black/5 p-4 border-l-4 border-black">
            <p className="text-[10px] font-black uppercase text-black/60">
              Notice: Mobile support coming soon. Touch controls may be imprecise. This reminder will reappear in 7 days.
            </p>
          </div>
        </div>

        <button 
          onClick={handleDismiss}
          className="w-full py-4 bg-black text-white text-lg font-black uppercase tracking-widest hover:bg-[#2ECC71] hover:text-black transition-all shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] hover:shadow-none hover:translate-x-1 hover:translate-y-1"
        >
          Acknowledge
        </button>
      </div>
    </div>
  );
};