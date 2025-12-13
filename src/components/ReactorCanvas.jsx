import React from 'react';
import { useJarvis } from '../context/JarvisContext';

const ReactorCanvas = () => {
  const { isListening, isSpeaking } = useJarvis();

  // --- STYLING LOGIC ---

  const getCoreGlow = () => {
    if (isListening) return 'bg-cyan/20 shadow-[0_0_50px_rgba(0,229,255,0.9)] animate-pulse-fast';
    if (isSpeaking) return 'bg-emerald-300/20 shadow-[0_0_60px_rgba(167,243,208,0.7)] animate-pulse-fast';
    return 'bg-cyan/5 shadow-[0_0_30px_rgba(0,229,255,0.4)]';
  };

  const getTextColor = () => {
    if (isListening) return 'text-cyan drop-shadow-[0_0_15px_rgba(0,229,255,1)] animate-pulse';
    if (isSpeaking) return 'text-emerald-300 drop-shadow-[0_0_15px_rgba(167,243,208,1)]';
    return 'text-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]';
  };

  const getDynamicAccentStyle = () => {
    const targetAngle = isSpeaking ? 120 : 45;
    const colorStart = isSpeaking ? 'rgba(250, 204, 21, 1)' : 'rgba(250, 204, 21, 0.8)';
    const colorEnd = isSpeaking ? 'rgba(251, 146, 60, 0.8)' : 'rgba(250, 204, 21, 0.2)';

    return {
        background: `conic-gradient(from 0deg, ${colorStart} 0deg, ${colorEnd} ${targetAngle}deg, transparent ${targetAngle}deg)`,
        maskImage: 'radial-gradient(closest-side, transparent 85%, white 86%)',
        WebkitMaskImage: 'radial-gradient(closest-side, transparent 85%, white 86%)',
        transition: 'all 0.2s ease-in-out',
        position: 'absolute',
        inset: 0,
        borderRadius: '9999px',
        transform: 'rotate(-20deg)',
    };
  };

  const compassMaskStyle = {
      maskImage: `conic-gradient(
          black 0deg 30deg,
          transparent 30deg 60deg,
          black 60deg 120deg,
          transparent 120deg 150deg,
          black 150deg 210deg,
          transparent 210deg 240deg,
          black 240deg 300deg,
          transparent 300deg 330deg,
          black 330deg 360deg
      )`,
      WebkitMaskImage: `conic-gradient(
          black 0deg 30deg,
          transparent 30deg 60deg,
          black 60deg 120deg,
          transparent 120deg 150deg,
          black 150deg 210deg,
          transparent 210deg 240deg,
          black 240deg 300deg,
          transparent 300deg 330deg,
          black 330deg 360deg
      )`,
  };

  return (
    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[380px] sm:h-[380px] flex items-center justify-center z-0 pointer-events-none">

        {/* --- LAYER 1: OUTER SCALE (USER CUSTOMIZED) --- */}
        <div className="absolute inset-[-40px] rounded-full animate-spin-slow" style={{ animationDuration: '40s' }}>
            <div className="absolute inset-0 rounded-full"
                 style={{
                     // Same 1deg tick / 5deg gap pattern as inner gear
                     background: 'repeating-conic-gradient(transparent 0deg 5deg, #00e5ff 5deg 6deg)',
                     // Custom mask settings provided by user
                     maskImage: 'radial-gradient(transparent 60%, black 60%)',
                     WebkitMaskImage: 'radial-gradient(transparent 60%, black 93%)'
                 }}>
            </div>
        </div>

        {/* --- LAYER 2 GROUP: THE TRACK SYSTEM --- */}
        <div className="absolute inset-[-2px] rounded-full border border-cyan/30 opacity-60"></div> {/* Outer Rail */}
        <div className="absolute inset-[23px] rounded-full border border-cyan/30 opacity-60"></div> {/* Inner Rail */}

        <div className="absolute inset-[-2px] rounded-full animate-spin-slow" style={{ animationDuration: '30s' }}>
            
            {/* A. Yellow Voice Arc (Thickened) */}
            <div className="absolute inset-0" style={getDynamicAccentStyle()}></div>

            {/* B. Opposite Segment Array (Thickened to 20px) */}
            
            {/* 3 Solid Blocks */}
            <div className="absolute inset-0 rotate-[150deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.8)] skew-x-12"></div></div>
            <div className="absolute inset-0 rotate-[164deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.8)] skew-x-12"></div></div>
            <div className="absolute inset-0 rotate-[178deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.8)] skew-x-12"></div></div>

            {/* 3 Outline Blocks */}
            <div className="absolute inset-0 rotate-[195deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] border border-cyan shadow-[0_0_5px_rgba(0,229,255,0.5)] skew-x-12"></div></div>
            <div className="absolute inset-0 rotate-[209deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] border border-cyan shadow-[0_0_5px_rgba(0,229,255,0.5)] skew-x-12"></div></div>
            <div className="absolute inset-0 rotate-[223deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] border border-cyan shadow-[0_0_5px_rgba(0,229,255,0.5)] skew-x-12"></div></div>
        </div>

        {/* --- LAYER: CLOCK GEAR --- */}
        <div className="absolute inset-[10%] rounded-full animate-spin-slow" style={{ animationDuration: '60s', direction: 'reverse' }}>
            {/* Minor Ticks */}
            <div className="absolute inset-0 rounded-full"
                 style={{
                     background: 'repeating-conic-gradient(transparent 0deg 5deg, #00e5ff 5deg 6deg)',
                     maskImage: 'radial-gradient(transparent 60%, black 60%)',
                     WebkitMaskImage: 'radial-gradient(transparent 60%, black 83%)'
                 }}>
            </div>
            {/* Shield */}
            <div className="absolute inset-0 rounded-full shadow-[0_0_25px_rgba(0,229,255,0.5)]"
                 style={{
                    background: 'conic-gradient(rgba(0, 229, 255, 0.6) 0deg 216deg, transparent 216deg 360deg)',
                    maskImage: 'radial-gradient(transparent 60%, black 60%)',
                    WebkitMaskImage: 'radial-gradient(transparent 60%, black 83%)'
                 }}>
            </div>
        </div>

        {/* --- LAYER 3: THE ARMOR RING --- */}
        <div className="absolute inset-[16%] rounded-full animate-spin-reverse-slow" style={{ animationDuration: '25s' }}>
            {/* Base Semi-Transparent Ring */}
            <div className="absolute inset-0 rounded-full border-[16px] border-cyan/20"></div>

            {/* 1. Large Armor Plate */}
            <div className="absolute inset-0 rounded-full border-[16px] border-cyan/50"
                 style={{
                     maskImage: 'conic-gradient(transparent 0deg 90deg, black 90deg 360deg)',
                     WebkitMaskImage: 'conic-gradient(transparent 0deg 90deg, black 90deg 360deg)'
                 }}>
            </div>

            {/* 2. The Segment Array */}
            {/* Solid Segments */}
            <div className="absolute inset-0 rotate-[15deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] bg-cyan shadow-[0_0_10px_cyan]"></div></div>
            <div className="absolute inset-0 rotate-[27deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] bg-cyan shadow-[0_0_10px_cyan]"></div></div>
            <div className="absolute inset-0 rotate-[39deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] bg-cyan shadow-[0_0_10px_cyan]"></div></div>

            {/* Outline Segments */}
            <div className="absolute inset-0 rotate-[51deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] border-2 border-cyan"></div></div>
            <div className="absolute inset-0 rotate-[63deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] border-2 border-cyan"></div></div>
            <div className="absolute inset-0 rotate-[75deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] border-2 border-cyan"></div></div>
        </div>

        {/* --- LAYER 4: THE COMPASS --- */}
        <div className="absolute inset-[27%] rounded-full">
            <div className="absolute inset-0 rounded-full border-[1px] border-cyan/30"></div>
            <div className="absolute inset-[-3px] rounded-full border-[6px] border-cyan shadow-[0_0_10px_rgba(0,229,255,0.6)]"
                 style={compassMaskStyle}>
            </div>
        </div>

        {/* --- LAYER 5: APERTURE RING --- */}
        <div className="absolute inset-[37%] rounded-full animate-spin-slow">
            <div className="absolute inset-0 rounded-full border-[8px] border-dashed border-cyan/20"></div>
        </div>

        {/* --- LAYER 6: THE CORE --- */}
        <div className={`absolute inset-[43%] rounded-full transition-all duration-500 ${getCoreGlow()}`}></div>

        {/* --- LAYER 7: TEXT DISPLAY --- */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
            <h1 className={`font-orbitron font-bold text-3xl tracking-[0.2em] transition-all duration-300 ${getTextColor()}`}>
                {isListening ? "LISTENING" : "JARVIS"}
            </h1>
            <div className={`h-[3px] w-20 mt-2 rounded-full transition-all duration-500 relative overflow-hidden
                ${isSpeaking ? 'bg-emerald-300/50' : 'bg-cyan/30'}
            `}>
                 <div className={`absolute top-0 left-0 h-full w-1/3 bg-white/60 blur-[2px] animate-pulse ${isSpeaking ? 'animate-spin-slow' : ''}`} style={{animationDuration: '3s'}}></div>
            </div>
            <div className="text-[10px] font-mono text-cyan/60 mt-2 tracking-[0.3em] font-bold">
                {isListening ? "VOICE COMMAND" : "ONLINE"}
            </div>
        </div>

    </div>
  );
};

export default ReactorCanvas;