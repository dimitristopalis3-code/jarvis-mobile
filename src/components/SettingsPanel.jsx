import React from 'react';
import { useJarvis } from '../context/JarvisContext';

const SettingsPanel = ({ onClose }) => {
  const { availableVoices, selectedVoiceIndex, changeVoice, playSound } = useJarvis();

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex flex-col p-6 animate-fade-in">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-8 border-b border-cyan/30 pb-4">
        <h2 className="text-cyan font-orbitron text-xl tracking-widest">SYSTEM CONFIG</h2>
        <button 
          onClick={() => { playSound('click'); onClose(); }}
          className="text-cyan hover:text-white"
        >
          <i className="fas fa-times text-2xl"></i>
        </button>
      </div>

      {/* Voice Selection */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <h3 className="text-cyan-dim font-mono text-xs mb-4">VOCAL SYNTHESIS MODULE</h3>
        
        <div className="flex flex-col gap-2">
          {availableVoices.length === 0 && (
            <div className="text-red-500 font-mono text-sm">LOADING VOICE PACKS...</div>
          )}
          
          {availableVoices.map((voice, index) => (
            <button
              key={index}
              onClick={() => { playSound('click'); changeVoice(index); }}
              className={`
                p-4 text-left font-mono text-sm border transition-all
                ${selectedVoiceIndex === index 
                  ? 'border-cyan bg-cyan/10 text-cyan shadow-[0_0_10px_rgba(0,229,255,0.2)]' 
                  : 'border-white/10 text-gray-500 hover:border-cyan/50 hover:text-cyan/70'}
              `}
            >
              <div className="font-bold truncate">{voice.name}</div>
              <div className="text-[10px] opacity-70">{voice.lang}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="mt-6 text-center text-cyan-dim text-[10px] font-mono">
        T-FORCE SECURITY PROTOCOLS VER 1.0
      </div>
    </div>
  );
};

export default SettingsPanel;