import React from 'react';

interface LoadingScreenProps {
  isLoading: boolean;
}

/**
 * Loading screen component with pure CSS fade-out animations.
 */
export const LoadingScreen: React.FC<LoadingScreenProps> = ({ isLoading }) => {
  return (
    <div 
      className={`fixed inset-0 z-[9999] bg-[#F8F4EE] flex flex-col items-center justify-center pointer-events-none ${
        !isLoading ? 'animate-fadeOut' : 'opacity-100'
      }`}
    >
      <div className="relative mb-8">
        {/* Background track */}
        <div className="w-16 h-16 border-[6px] border-[#EBE5DA] rounded-full" />
        {/* Spinner */}
        <div className="w-16 h-16 border-[6px] border-black border-t-transparent rounded-full animate-spin absolute top-0 left-0" />
      </div>
      
      <div className="flex flex-col items-center gap-3">
        <span className="text-black font-black uppercase tracking-[0.3em] text-[10px] animate-pulse">
          Initializing Network
        </span>
        <div className="flex gap-1">
          <div className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1 h-1 bg-black rounded-full animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1 h-1 bg-black rounded-full animate-bounce" />
        </div>
      </div>

      <style>{`
        @keyframes fadeOut {
          from { opacity: 1; visibility: visible; }
          to { opacity: 0; visibility: hidden; }
        }
        .animate-fadeOut {
          animation: fadeOut 600ms cubic-bezier(0.4, 0, 0.2, 1) forwards;
        }
      `}</style>
    </div>
  );
};