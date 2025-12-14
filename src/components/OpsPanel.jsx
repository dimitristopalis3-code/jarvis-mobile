import React from 'react';
import { useJarvis } from '../context/JarvisContext';

const OpsPanel = () => {
  const { setActiveMode, playSound } = useJarvis();

  const handleClose = () => {
      playSound('click');
      setActiveMode('HOME');
  };

  return (
    // ⚠️ UPGRADE: z-60 puts this ABOVE the reactor. 
    // Removed 'pointer-events-none' so we can interact with the close button.
    <div className="absolute inset-0 z-60 flex items-center justify-center animate-in fade-in duration-300">
      
      {/* Clickable Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose}></div>
      
      {/* Main Container */}
      <div 
          onClick={(e) => e.stopPropagation()} 
          className="relative w-full max-w-lg p-6 grid grid-cols-2 gap-4"
      >
          
          {/* ❌ CLOSE BUTTON (Floating Top Right) */}
          <button 
            onClick={handleClose}
            className="absolute top-[-10px] right-2 z-50 w-8 h-8 flex items-center justify-center bg-black border border-cyan text-cyan rounded-full hover:bg-red-900/50 hover:border-red-500 hover:text-red-500 transition-all shadow-[0_0_15px_rgba(0,229,255,0.5)]"
          >
            <i className="fas fa-times"></i>
          </button>

          {/* SYSTEM HEALTH */}
          <div className="col-span-2 bg-black/80 border border-cyan/30 p-4 rounded-lg backdrop-blur-md shadow-[0_0_30px_rgba(0,229,255,0.1)]">
              <div className="flex justify-between items-center mb-2">
                  <h3 className="font-orbitron text-cyan text-sm">SYSTEM INTEGRITY</h3>
                  <span className="text-emerald-400 font-mono text-xs animate-pulse">100%</span>
              </div>
              <div className="w-full h-2 bg-cyan/10 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan w-full shadow-[0_0_10px_cyan]"></div>
              </div>
          </div>

          {/* DIAGNOSTICS */}
          <div className="bg-black/80 border border-cyan/30 p-4 rounded-lg backdrop-blur-md">
              <h3 className="font-orbitron text-cyan text-xs mb-2 border-b border-cyan/30 pb-1">CPU LOAD</h3>
              <div className="font-mono text-cyan-300 text-2xl">12%</div>
              <div className="text-[10px] text-cyan/50 mt-1">OPTIMAL</div>
          </div>

          <div className="bg-black/80 border border-cyan/30 p-4 rounded-lg backdrop-blur-md">
              <h3 className="font-orbitron text-cyan text-xs mb-2 border-b border-cyan/30 pb-1">MEMORY</h3>
              <div className="font-mono text-cyan-300 text-2xl">4.2 TB</div>
              <div className="text-[10px] text-cyan/50 mt-1">AVAILABLE</div>
          </div>

          {/* SECURITY STATUS */}
          <div className="col-span-2 bg-black/80 border border-cyan/30 p-4 rounded-lg backdrop-blur-md flex justify-between items-center">
              <div>
                  <div className="text-xs text-cyan/70 font-mono">ENCRYPTION</div>
                  <div className="text-cyan font-bold font-orbitron">AES-256 ACTIVE</div>
              </div>
              <i className="fas fa-lock text-cyan text-2xl"></i>
          </div>

      </div>
    </div>
  );
};

export default OpsPanel;