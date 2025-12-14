import React, { useEffect } from 'react';

const AlarmOverlay = ({ alarmData, onDismiss }) => {
  
  useEffect(() => {
    // 🔊 Create a loop sound effect
    const audio = new Audio('/assets/alarm_loop.mp3'); // Ensure you have a sound file or use a placeholder
    // If no file exists, we can try a browser beep or just rely on the visual flashing
    
    // Simple beep function using Web Audio API if no file exists
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    const playBeep = () => {
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.type = 'square';
        oscillator.frequency.value = 800; // Hz
        gainNode.gain.value = 0.1;
        oscillator.start();
        setTimeout(() => oscillator.stop(), 200);
    };

    const interval = setInterval(playBeep, 1000);

    return () => {
        clearInterval(interval);
        audioCtx.close();
    };
  }, []);

  return (
    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 backdrop-blur-xl animate-pulse">
      
      <div className="w-64 h-64 rounded-full border-4 border-red-500 flex items-center justify-center shadow-[0_0_100px_rgba(239,68,68,0.6)] animate-spin-slow">
        <div className="w-56 h-56 rounded-full border-2 border-red-500/50 border-dashed"></div>
      </div>

      <div className="absolute flex flex-col items-center">
          <h1 className="font-orbitron font-bold text-6xl text-red-500 tracking-widest drop-shadow-[0_0_20px_red]">
              {alarmData.time}
          </h1>
          <div className="text-red-400 font-mono text-xl mt-4 tracking-[0.2em] uppercase">
              {alarmData.note || "ROUTINE PROTOCOL"}
          </div>
          <div className="text-red-500/50 font-mono text-sm mt-2 animate-bounce">
              WAKE UP INITIATED
          </div>
      </div>

      <button 
        onClick={onDismiss}
        className="mt-20 px-12 py-4 bg-red-600 hover:bg-red-500 text-white font-orbitron font-bold rounded shadow-[0_0_30px_red] transition-all active:scale-95"
      >
        DISMISS ALARM
      </button>

    </div>
  );
};

export default AlarmOverlay;