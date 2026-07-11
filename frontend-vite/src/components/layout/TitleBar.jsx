import React from 'react';

const TitleBar = () => {
  const handleMinimize = () => {
    if (window.electron && window.electron.window) {
      window.electron.window.minimize();
    }
  };

  const handleMaximize = () => {
    if (window.electron && window.electron.window) {
      window.electron.window.maximize();
    }
  };

  const handleClose = () => {
    if (window.electron && window.electron.window) {
      window.electron.window.close();
    }
  };

  // Only render if in Electron
  if (!window.electron) return null;

  return (
    <div className="h-8 bg-slate-50 flex items-center justify-between select-none border-b border-slate-200/50 z-[9999] relative">
      {/* Draggable area */}
      <div 
        className="flex-1 h-full flex items-center px-4 cursor-default" 
        style={{ WebkitAppRegion: 'drag' }}
      >
        <span className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">PhoneMAG — Gestion</span>
      </div>

      {/* Control buttons */}
      <div className="flex h-full no-drag" style={{ WebkitAppRegion: 'no-drag' }}>
        <button
          onClick={handleMinimize}
          className="px-4 h-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-500"
          title="Réduire"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="none" stroke="currentColor" strokeWidth="1" d="M1,5 h8" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="px-4 h-full flex items-center justify-center hover:bg-slate-200/50 transition-colors text-slate-500"
          title="Plein écran / Restaurer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect width="9" height="9" x="0.5" y="0.5" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="px-4 h-full flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors text-slate-500"
          title="Fermer"
        >
          <svg width="10" height="10" viewBox="0 0 10 10">
            <path fill="none" stroke="currentColor" strokeWidth="1" d="M1,1 l8,8 M9,1 l-8,8" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default TitleBar;
