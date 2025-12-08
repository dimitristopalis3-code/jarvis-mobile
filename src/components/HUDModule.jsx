import React, { useState, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';

const HUDModule = () => {
  const { hudData, setActiveMode, playSound, speak, battery } = useJarvis();
  const [isMirrored, setIsMirrored] = useState(false);
  const [time, setTime] = useState(new Date());

  // Clock
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMirror = () => {
    setIsMirrored(!isMirrored);
    speak(isMirrored ? "Standard view." : "Heads up display mode active.");
  };

  // Speed Color (Cyan -> Orange -> Red)
  const getSpeedColor = (s) => {
    if (s < 50) return 'text-cyan';
    if (s < 100) return 'text-cyan-200';
    if (s < 130) return 'text-orange-500';
    return 'text-red-600 animate-pulse';
  };

  return (
    // Note: bg-black/10 is very subtle, letting the Reactor show through
    <div className="fixed inset-0 z-30 flex flex-col items-center justify-between p-6 bg-black/10 backdrop-blur-[1px]">
      
      {/* --- FLIPPABLE CONTENT CONTAINER --- */}
      <div className={`w-full h-full flex flex-col justify-between relative z-10 transition-transform duration-500 ${isMirrored ? 'scale-x-[-1]' : ''}`}>
        
        {/* TOP BAR: Compass & Time */}
        <div className="flex justify-between items-start pointer-events-none">
            {/* COMPASS */}
            <div className="text-cyan font-mono text-sm bg-black/40 p-2 rounded border border-cyan/20">
                <div className="border-b border-cyan/50 mb-1 pb-1 text-[10px]">HEADING</div>
                <div className="text-3xl font-bold">{Math.round(hudData.heading)}°</div>
                <div className="text-xs opacity-70">
                    {hudData.heading >= 337 || hudData.heading < 23 ? "N" :
                     hudData.heading < 67 ? "NE" :
                     hudData.heading < 112 ? "E" :
                     hudData.heading < 157 ? "SE" :
                     hudData.heading < 202 ? "S" :
                     hudData.heading < 247 ? "SW" :
                     hudData.heading < 292 ? "W" : "NW"}
                </div>
            </div>

            {/* TIME */}
            <div className="text-right text-cyan font-mono bg-black/40 p-2 rounded border border-cyan/20">
                <div className="text-4xl font-bold">{time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                <div className="text-xs">ALT: {hudData.altitude}m</div>
            </div>
        </div>

        {/* CENTER: SPEEDOMETER (Overlaid on Reactor) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center w-full pointer-events-none">
            {/* Speed Number */}
            <div className={`font-orbitron font-black text-[100px] leading-none tracking-tighter drop-shadow-[0_0_10px_rgba(0,0,0,0.8)] ${getSpeedColor(hudData.speed)}`}>
                {hudData.speed}
            </div>
            <div className="text-cyan/70 font-mono text-xl tracking-[8px] mt-2 bg-black/30 inline-block px-4 rounded">KM/H</div>
        </div>

        {/* BOTTOM: CONTROLS & STATUS */}
        <div className="flex justify-between items-end w-full">
            
            {/* G-Force Bubble (Bottom Left) */}
            <div className="w-24 h-24 rounded-full border border-cyan/30 flex items-center justify-center relative bg-black/20 backdrop-blur-sm pointer-events-none">
                <div className="absolute inset-0 flex items-center justify-center opacity-30 text-4xl text-cyan">+</div>
                {/* Dot */}
                <div className="w-3 h-3 bg-cyan rounded-full shadow-[0_0_10px_#00E5FF]"
                     style={{ transform: `translate(${Math.sin(time.getTime()/1000)*10}px, ${Math.cos(time.getTime()/1000)*10}px)` }}>
                </div>
                <div className="absolute -bottom-6 w-full text-center text-cyan/50 text-[10px]">G-FORCE</div>
            </div>

            {/* MAPS BUTTON (Bottom Right - MOVED HERE TO FIX OVERLAP) */}
            <button 
                onClick={() => { playSound('click'); window.open('https://maps.google.com', '_blank'); }}
                className="mb-2 bg-cyan/10 border border-cyan text-cyan px-6 py-3 rounded-full font-orbitron text-sm hover:bg-cyan/30 active:scale-95 transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)]"
            >
                <i className="fas fa-location-arrow mr-2"></i> MAPS
            </button>

        </div>
      </div>

      {/* --- CENTRAL CONTROLS (Floating, Non-Mirrored) --- */}
      {/* These stay centered and do not flip, ensuring they are always usable */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-6 z-50">
         <button 
            onClick={toggleMirror}
            className={`w-14 h-14 rounded-full border flex items-center justify-center backdrop-blur-md transition-all shadow-[0_0_15px_rgba(0,229,255,0.2)] ${isMirrored ? 'bg-cyan text-black border-cyan' : 'bg-black/60 border-cyan text-cyan'}`}
         >
           <i className="fas fa-clone text-xl transform rotate-90"></i>
         </button>
         
         <button 
            onClick={() => { playSound('click'); setActiveMode("HOME"); }}
            className="w-14 h-14 rounded-full bg-black/60 border border-red-500 text-red-500 flex items-center justify-center backdrop-blur-md shadow-[0_0_15px_rgba(255,0,0,0.3)]"
         >
           <i className="fas fa-times text-xl"></i>
         </button>
      </div>

    </div>
  );
};

export default HUDModule;