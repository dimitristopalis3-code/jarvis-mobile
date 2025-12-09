import React, { useState, useEffect } from 'react';
import { JarvisProvider, useJarvis } from './context/JarvisContext';

// Components
import ReactorCanvas from './components/ReactorCanvas';
import SettingsPanel from './components/SettingsPanel';
import CommandMenu from './components/CommandMenu';
import VisionModule from './components/VisionModule';
import MediaPanel from './components/MediaPanel';
import DatabasePanel from './components/DatabasePanel';
import HUDModule from './components/HUDModule';
import OpsPanel from './components/OpsPanel';
import ReconPanel from './components/ReconPanel';
import GuardianPanel from './components/GuardianPanel';

const JarvisInterface = () => {
  const { 
    systemStatus, setSystemStatus, playSound, speak, 
    user, battery, isListening, toggleListening, activeMode, setActiveMode 
  } = useJarvis();

  const [started, setStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // Logic to control Menu based on Voice State
  const showMenu = activeMode === 'MENU_OPEN';

  const handleStart = () => {
    playSound('startup');
    setStarted(true);
    setSystemStatus("ONLINE");
    setTimeout(() => {
      speak(`Welcome back, ${user.name}. System secure. Battery at ${battery} percent.`);
    }, 1000);
  };

  if (!started) {
    return (
      <div onClick={handleStart} className="w-screen h-screen bg-black flex flex-col items-center justify-center cursor-pointer select-none">
        <div className="text-cyan text-6xl animate-pulse mb-4"><i className="fas fa-fingerprint"></i></div>
        <div className="text-cyan font-orbitron font-bold text-xl tracking-widest">INITIALIZE JARVIS</div>
        <div className="text-cyan-dim font-mono text-xs mt-2">TOUCH TO AUTHENTICATE</div>
      </div>
    );
  }

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden">
      
      {/* 1. Background Layer */}
      <ReactorCanvas />
      
      {/* 2. TRIGGER AREA (Only active in HOME mode) */}
      {activeMode === 'HOME' && (
        <div 
          onClick={() => { playSound('click'); setActiveMode('MENU_OPEN'); }}
          className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full z-10 cursor-pointer"
        ></div>
      )}

      {/* 3. Top HUD */}
      <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-start z-20 pointer-events-none">
        <div className="text-cyan-dim font-mono text-xs">
           <div className="border-b border-cyan w-20 mb-1">T-FORCE</div>
           <div>OP: {user.name.toUpperCase()}</div>
           <div>ACC: {user.access.toUpperCase()}</div>
        </div>
        <div className="text-right">
           <div className={`text-xl font-orbitron font-bold ${battery < 20 ? 'text-red-500' : 'text-cyan'}`}>
             {battery}%
           </div>
           <div className="text-cyan-dim font-mono text-[10px]">PWR LEVEL</div>
        </div>
      </div>

      {/* 4. MICROPHONE BUTTON (Only in HOME/MENU) */}
      {(activeMode === 'HOME' || activeMode === 'MENU_OPEN') && (
        <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
          <button 
            onClick={toggleListening}
            className={`
              w-16 h-16 rounded-full border border-cyan flex items-center justify-center
              transition-all duration-300 backdrop-blur-sm
              ${isListening 
                ? 'bg-red-500/20 shadow-[0_0_30px_rgba(255,0,0,0.5)] border-red-500 scale-110' 
                : 'bg-black/50 hover:bg-cyan/20 shadow-[0_0_15px_rgba(0,229,255,0.3)]'}
            `}
          >
            <i className={`fas fa-microphone text-2xl ${isListening ? 'text-red-500 animate-pulse' : 'text-cyan'}`}></i>
          </button>
        </div>
      )}

      {/* 5. Status Text */}
      <div className="absolute bottom-8 w-full text-center z-20 pointer-events-none">
         <div className="text-cyan font-orbitron tracking-[4px] text-sm animate-pulse">{systemStatus}</div>
         <div className="text-cyan-dim text-[10px] mt-1 font-mono">
            {isListening ? "LISTENING..." : activeMode === 'MENU_OPEN' ? "AWAITING SELECTION" : activeMode}
         </div>
      </div>

      {/* --- MENU --- */}
      <CommandMenu 
        isOpen={showMenu} 
        onClose={() => setActiveMode('HOME')} 
        onOpenSettings={() => { setActiveMode('HOME'); setShowSettings(true); }}
      />
      
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {/* --- MODULES --- */}
      {activeMode === 'VISION' && <VisionModule />}
      {activeMode === 'MEDIA' && <MediaPanel />}
      {activeMode === 'DATABASE' && <DatabasePanel />}
      {activeMode === 'HUD' && <HUDModule />}
      {activeMode === 'OPS' && <OpsPanel />}
      {activeMode === 'RECON' && <ReconPanel />}
      {activeMode === 'GUARDIAN' && <GuardianPanel />}

    </div>
  );
};

function App() {
  return (
    <JarvisProvider>
      <JarvisInterface />
    </JarvisProvider>
  );
}

export default App;