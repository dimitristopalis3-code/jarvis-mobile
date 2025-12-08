import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJarvis } from '../context/JarvisContext';

const CommandMenu = ({ isOpen, onClose, onOpenSettings }) => {
  const { setActiveMode, playSound, speak } = useJarvis();
  const [subMenu, setSubMenu] = useState(null); // 'COMMS' or null

  // Configuration
  const radius = 160;

  // --- 1. MAIN MENU ITEMS ---
  
  // TOP CROWN (The Media Button)
  const mainTop = [
    { 
      id: 'media', label: 'MEDIA', icon: 'fa-music', angle: 90,
      action: () => { setActiveMode('MEDIA'); speak("Media player ready."); } 
    }
  ];

  // LEFT FLANK (Tactical)
  const mainLeft = [
    { 
      id: 'vision', label: 'VISION', icon: 'fa-eye', angle: 140,
      action: () => { setActiveMode('VISION'); speak("Vision systems active."); }
    },
    { 
      id: 'comms', label: 'COMMS', icon: 'fa-comments', angle: 180,
      action: () => { setSubMenu('COMMS'); speak("Select communication channel."); } 
    },
    { 
      id: 'hud', label: 'DRIVE', icon: 'fa-car', angle: 220,
      action: () => { setActiveMode('HUD'); speak("Driving protocols initiated."); } 
    }
  ];

  // RIGHT FLANK (System)
  const mainRight = [
    { 
      id: 'database', label: 'DATABASE', icon: 'fa-database', angle: 40,
      action: () => { setActiveMode('DATABASE'); speak("Accessing personnel records."); } 
    },
    { 
      id: 'settings', label: 'SYSTEM', icon: 'fa-cog', angle: 0,
      action: () => { onOpenSettings(); } 
    },
    { 
      id: 'close', label: 'CLOSE', icon: 'fa-times', angle: -40,
      action: () => { onClose(); } 
    }
  ];

  // --- 2. COMMS SUB-MENU ITEMS ---
  const commsItems = [
    { id: 'whatsapp', label: 'WHATSAPP', icon: 'fab fa-whatsapp', angle: 220, url: 'https://wa.me/' },
    { id: 'messenger', label: 'MESSENGER', icon: 'fab fa-facebook-messenger', angle: 180, url: 'https://m.me/' },
    { id: 'viber', label: 'VIBER', icon: 'fab fa-viber', angle: 140, url: 'viber://chat' },
    { id: 'facebook', label: 'FACEBOOK', icon: 'fab fa-facebook-f', angle: 90, url: 'https://facebook.com/' },
    { id: 'instagram', label: 'INSTAGRAM', icon: 'fab fa-instagram', angle: 40, url: 'https://instagram.com/' },
    { id: 'x', label: 'X', icon: 'fab fa-x-twitter', angle: 0, url: 'https://x.com/' },
    { id: 'youtube', label: 'YOUTUBE', icon: 'fab fa-youtube', angle: -40, url: 'https://youtube.com/' },
    { 
      id: 'back', label: 'BACK', icon: 'fa-undo', angle: -90, 
      action: () => setSubMenu(null) // Go back to Main
    }
  ];

  // Determine which set to show
  const currentItems = subMenu === 'COMMS' ? commsItems : [...mainTop, ...mainLeft, ...mainRight];

  // Helper to calculate X/Y
  const getPosition = (angle) => {
    const radian = (angle * Math.PI) / 180;
    return {
      x: Math.cos(radian) * radius,
      y: Math.sin(radian) * radius * 0.8
    };
  };

  const handleAction = (item) => {
    playSound('click');
    
    if (item.url) {
        window.open(item.url, '_blank');
        speak(`Opening ${item.label}`);
    } else if (item.action) {
        item.action();
    }
    
    if (item.id !== 'comms' && item.id !== 'back' && item.id !== 'settings') {
        onClose();
        setSubMenu(null); 
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
          onClick={() => { onClose(); setSubMenu(null); }}
        >
          <div className="relative w-0 h-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="absolute w-32 h-32 rounded-full cursor-pointer" onClick={() => { onClose(); setSubMenu(null); }} />

            {currentItems.map((item, index) => {
              const pos = getPosition(item.angle);
              
              return (
                <motion.button
                  key={item.id}
                  initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  animate={{ x: pos.x, y: pos.y, scale: 1, opacity: 1 }}
                  exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 200, damping: 20, delay: index * 0.03 }}
                  onClick={() => handleAction(item)}
                  className={`
                    absolute w-20 h-20 rounded-full border border-cyan/50 bg-black/80
                    flex flex-col items-center justify-center gap-1
                    shadow-[0_0_15px_rgba(0,229,255,0.2)]
                    hover:scale-110 hover:border-cyan hover:bg-cyan/20 hover:shadow-[0_0_25px_rgba(0,229,255,0.6)]
                    active:scale-95 transition-all
                    ${item.id === 'close' || item.id === 'back' ? 'border-red-500/50 text-red-500 hover:border-red-500' : 'text-cyan'}
                  `}
                >
                  <i className={`fas ${item.icon} text-2xl`}></i>
                  <span className="font-orbitron text-[8px] tracking-wider mt-1">{item.label}</span>
                  
                  <div 
                    className="absolute top-1/2 left-1/2 w-[160px] h-[1px] bg-cyan/20 -z-10 origin-left pointer-events-none"
                    style={{ 
                      transform: `rotate(${item.angle + 180}deg)`,
                      width: `${radius}px`,
                      left: '50%',
                      top: '50%'
                    }}
                  />
                </motion.button>
              );
            })}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CommandMenu;