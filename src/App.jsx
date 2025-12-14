import React, { useState, useEffect } from 'react';
import { JarvisProvider, useJarvis } from './context/JarvisContext';

// Components
import ReactorCanvas from './components/ReactorCanvas';
import SettingsPanel from './components/SettingsPanel';
import VisionModule from './components/VisionModule';
import MediaPanel from './components/MediaPanel';
import DatabasePanel from './components/DatabasePanel';
import HUDModule from './components/HUDModule';
import OpsPanel from './components/OpsPanel';
import IncidentLogPanel from './components/IncidentLogPanel';
import ReconPanel from './components/ReconPanel';
import GuardianPanel from './components/GuardianPanel';
import AlarmOverlay from './components/AlarmOverlay';

const JarvisInterface = () => {
  const { 
    setSystemStatus, playSound, speak, 
    user, battery, isListening, toggleListening, activeMode, setActiveMode 
  } = useJarvis();

  const [started, setStarted] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  
  // ⏰ ALARM STATE
  const [activeAlarms, setActiveAlarms] = useState([]); 
  const [triggeredAlarm, setTriggeredAlarm] = useState(null); 

  const isMenuOpen = activeMode === 'MENU_OPEN';

  const handleStart = () => {
    playSound('startup');
    setStarted(true);
    setSystemStatus("ONLINE");
    setTimeout(() => {
      speak(`Welcome back, ${user.name}. System secure. Battery at ${battery} percent.`);
    }, 1000);
  };

  // ⏰ INTELLIGENT ALARM CHECKER (Runs every 10 seconds)
  useEffect(() => {
      const checkAlarms = setInterval(() => {
          if (activeAlarms.length === 0) return;

          const now = new Date();
          const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
          const todayString = now.toDateString(); // "Fri Dec 14 2025"
          
          // ISO Date for Specific Date matching (YYYY-MM-DD) - Adjust for local timezone
          const offset = now.getTimezoneOffset();
          const localIsoDate = new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split('T')[0];

          // Check every alarm
          const match = activeAlarms.find(alarm => {
              // 1. Time must match
              if (alarm.time !== currentTime) return false;

              // 2. Specific Date Check
              if (alarm.specificDate) {
                  // If alarm has a date (e.g., 2025-12-25), it MUST match today's date
                  if (alarm.specificDate !== localIsoDate) return false;
                  // If date matches, ensure it hasn't fired yet
                  return !alarm.fired;
              }

              // 3. Handling Recurrence (No specific date)
              if (alarm.isRecurring) {
                  return alarm.lastFired !== todayString;
              } else {
                  return !alarm.fired;
              }
          });

          if (match) {
              setTriggeredAlarm(match);
              speak(`Alert. Protocol initiated: ${match.note}`);

              setActiveAlarms(prev => prev.map(a => {
                  if (a.id === match.id) {
                      return { 
                          ...a, 
                          fired: true, 
                          lastFired: todayString 
                      };
                  }
                  return a;
              }));
          }
      }, 10000); 

      return () => clearInterval(checkAlarms);
  }, [activeAlarms, speak]);

  // 🛠️ ALARM SETTER
  const handleSetAlarm = (alarmInfo) => {
      const newAlarm = {
          id: Date.now(),
          time: alarmInfo.time,
          note: alarmInfo.note,
          isRecurring: alarmInfo.isRecurring || false, 
          specificDate: alarmInfo.date || null, // e.g., "2025-12-25"
          fired: false,
          lastFired: null
      };
      
      setActiveAlarms(prev => [...prev, newAlarm]);
      console.log("Alarm Protocol Set:", newAlarm);
  };

  const handleReactorClick = () => {
    if (!isMenuOpen) {
        setActiveMode('MENU_OPEN');
        playSound('click');
        if (!isListening) toggleListening();
    } else {
        setActiveMode('HOME');
        playSound('click');
        if (isListening) toggleListening();
    }
  };

  const openLink = (url) => {
      setTimeout(() => { window.open(url, '_blank'); }, 800);
  };

  const handleModuleSelect = (moduleId) => {
      console.log("Selected Module:", moduleId);
      
      if (moduleId === 'OPS_LOG') {
          setActiveMode('LOGS');
      } else {
          setActiveMode(moduleId);
      }

      if (isListening) toggleListening();

      switch (moduleId) {
          case 'VISION': speak("Optical sensors calibrated. Visual feed online."); break;
          case 'DATABASE': speak("Accessing secure archives. Decrypting files."); break;
          case 'SOCIAL': speak("Social media interface loaded. Select network."); break;
          case 'OPS': speak("System diagnostics running. Operations normal."); break;
          case 'DRIVE': speak("Engine interface active. Tesla Uplink established."); break; 
          case 'GUARDIAN': speak("Defense protocols active. Perimeter secured."); break;
          case 'RECON': speak("Satellite uplink established. Scanning sector."); break;
          
          case 'OPS_LOG': speak("Opening Incident Log. Select an entry to set a protocol."); break;

          case 'WHATSAPP': speak("Opening encrypted messaging channel."); openLink("https://wa.me/"); break;
          case 'MESSENGER': speak("Accessing Facebook network."); openLink("https://www.messenger.com/"); break;
          case 'VIBER': speak("Viber protocols initiated."); openLink("https://www.viber.com/"); break;
          case 'FACEBOOK': speak("Loading social feed."); openLink("https://www.facebook.com/"); break;
          case 'INSTAGRAM': speak("Visual grid loaded."); openLink("https://www.instagram.com/"); break;
          case 'X': speak("Accessing global news stream."); openLink("https://x.com/"); break;
          case 'YOUTUBE': speak("Video uplink established."); openLink("https://www.youtube.com/"); break;

          default: speak("Module loaded."); break;
      }
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
      
      {triggeredAlarm && (
          <AlarmOverlay 
            alarmData={triggeredAlarm} 
            onDismiss={() => setTriggeredAlarm(null)} 
          />
      )}

      <ReactorCanvas 
        onClick={handleReactorClick} 
        menuOpen={isMenuOpen} 
        onModuleSelect={handleModuleSelect}
      />
      
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

      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}

      {activeMode === 'VISION' && <VisionModule />}
      {activeMode === 'MEDIA' && <MediaPanel />} 
      {activeMode === 'SOCIAL' && <MediaPanel />} 
      {activeMode === 'DATABASE' && <DatabasePanel />}
      {activeMode === 'HUD' && <HUDModule />}
      {activeMode === 'OPS' && <OpsPanel />}
      {activeMode === 'LOGS' && <IncidentLogPanel onSetAlarm={handleSetAlarm} />}
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