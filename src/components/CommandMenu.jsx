import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useJarvis } from '../context/JarvisContext';

const CommandMenu = ({ isOpen, onClose, onOpenSettings }) => {
  const { activeMode, setActiveMode, playSound, speak } = useJarvis();
  const [subMenu, setSubMenu] = useState(null); 

  // Sync Local State with Global Context
  useEffect(() => {
    if (activeMode === 'COMMS_MENU') {
        setSubMenu('COMMS');
    } else {
        setSubMenu(null);
    }
  }, [activeMode]);

  const radius = 160;

  // --- MAIN MENU ITEMS ---
  const mainItems = [
    { id: 'hud', label: 'DRIVE', icon: 'fa-car', angle: -90, action: () => { setActiveMode('HUD'); speak("Driving protocols initiated."); } },
    { id: 'database', label: 'DATABASE', icon: 'fa-database', angle: -45, action: () => { setActiveMode('DATABASE'); speak("Accessing personnel records."); } },
    { id: 'recon', label: 'RECON', icon: 'fa-search-location', angle: 0, action: () => { setActiveMode('RECON'); speak("Sales targeting engaged."); } },
    { id: 'ops', label: 'OPS LOG', icon: 'fa-file-medical-alt', angle: 45, action: () => { setActiveMode('OPS'); speak("Operations center online."); } },
    { id: 'media', label: 'MEDIA', icon: 'fa-music', angle: 90, action: () => { setActiveMode('MEDIA'); speak("Media player ready."); } },
    { id: 'vision', label: 'VISION', icon: 'fa-eye', angle: 135, action: () => { setActiveMode('VISION'); speak("Vision systems active."); } },
    { id: 'guardian', label: 'GUARDIAN', icon: 'fa-shield-alt', angle: 180, action: () => { setActiveMode('GUARDIAN'); } },
    // Manual click sets mode globally now
    { id: 'comms', label: 'COMMS', icon: 'fa-comments', angle: 225, action: () => { setActiveMode('COMMS_MENU'); speak("Comms open."); } }
  ];

  // --- COMMS SUB-MENU ---
  const commsItems = [
    { id: 'whatsapp', label: 'WHATSAPP', icon: 'fab fa-whatsapp', angle: 225, url: 'https://wa.me/' },
    { id: 'messenger', label: 'MESSENGER', icon: 'fab fa-facebook-messenger', angle: 180, url: 'https://m.me/' },
    { id: 'viber', label: 'VIBER', icon: 'fab fa-viber', angle: 135, url: 'viber://forward?text=Status%20Check' },
    { id: 'facebook', label: 'FACEBOOK', icon: 'fab fa-facebook-f', angle: 90, url: 'https://facebook.com/' },
    { id: 'instagram', label: 'INSTAGRAM', icon: 'fab fa-instagram', angle: 45, url: 'https://instagram.com/' },
    { id: 'x', label: 'X', icon: 'fab fa-x-twitter', angle: 0, url: 'https://x.com/' },
    { id: 'youtube', label: 'YOUTUBE', icon: 'fab fa-youtube', angle: -45, url: 'https://youtube.com/' },
    // Back button resets global mode
    { id: 'back', label: 'BACK', icon: 'fa-undo', angle: -90, action: () => { setActiveMode('MENU_OPEN'); } }
  ];

  // Determine items based on ACTIVE MODE
  const showComms = activeMode === 'COMMS_MENU';
  const currentItems = showComms ? commsItems : mainItems;

  const getPosition = (angle) => {
    const radian = (angle * Math.PI) / 180;
    return { x: Math.cos(radian) * radius, y: Math.sin(radian) * radius * 0.8 };
  };

  const handleAction = (item) => {
    playSound('click');
    if (item.url) {
        speak(`Opening ${item.label}`);
        if (item.url.startsWith('viber://') || item.url.startsWith('whatsapp://')) window.location.href = item.url;
        else window.open(item.url, '_blank');
    } else if (item.action) {
        item.action();
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
          onClick={() => { onClose(); }}
        >
          <div className="relative w-0 h-0 flex items-center justify-center" onClick={e => e.stopPropagation()}>
            <div className="absolute w-32 h-32 rounded-full cursor-pointer" onClick={() => { onClose(); }} />
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
                    ${item.id === 'back' ? 'border-red-500/50 text-red-500 hover:border-red-500' : 'text-cyan'}
                  `}
                >
                  <i className={`fas ${item.icon} text-2xl`}></i>
                  <span className="font-orbitron text-[8px] tracking-wider mt-1">{item.label}</span>
                  <div className="absolute top-1/2 left-1/2 w-[160px] h-[1px] bg-cyan/20 -z-10 origin-left pointer-events-none" style={{ transform: `rotate(${item.angle + 180}deg)`, width: `${radius}px`, left: '50%', top: '50%' }} />
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