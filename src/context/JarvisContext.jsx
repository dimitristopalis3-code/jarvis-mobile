import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const JarvisContext = createContext();

export const JarvisProvider = ({ children }) => {
  // --- STATE ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [systemStatus, setSystemStatus] = useState("STANDBY"); 
  const [activeMode, setActiveMode] = useState("HOME"); 
  const [user] = useState({ name: "Jim", access: "Admin" });
  const [battery, setBattery] = useState(100);
  
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);

  const [conversationState, setConversationState] = useState("IDLE"); 
  const [tempPersonData, setTempPersonData] = useState({}); 
  const [faceDatabase, setFaceDatabase] = useState(() => {
    const saved = localStorage.getItem('jarvis_face_db_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // --- NEW: HUD SENSORS ---
  const [hudData, setHudData] = useState({ speed: 0, heading: 0, altitude: 0, accuracy: 0 });
  
  useEffect(() => {
    // 1. GPS TRACKING
    const geoId = navigator.geolocation.watchPosition(
      (pos) => {
        setHudData(prev => ({
          ...prev,
          speed: pos.coords.speed ? Math.round(pos.coords.speed * 3.6) : 0, // Convert m/s to km/h
          altitude: Math.round(pos.coords.altitude || 0),
          accuracy: Math.round(pos.coords.accuracy)
        }));
      },
      (err) => console.log(err),
      { enableHighAccuracy: true, maximumAge: 0 }
    );

    // 2. COMPASS / ORIENTATION
    const handleOrientation = (e) => {
      if (e.webkitCompassHeading) {
        // iOS
        setHudData(prev => ({ ...prev, heading: e.webkitCompassHeading }));
      } else if (e.alpha) {
        // Android (approximate)
        setHudData(prev => ({ ...prev, heading: 360 - e.alpha }));
      }
    };
    window.addEventListener('deviceorientation', handleOrientation);

    return () => {
      navigator.geolocation.clearWatch(geoId);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  // --- DATABASE ACTIONS ---
  useEffect(() => {
    localStorage.setItem('jarvis_face_db_v2', JSON.stringify(faceDatabase));
  }, [faceDatabase]);

  const deletePerson = (index) => {
    const newDb = [...faceDatabase];
    const name = newDb[index].name;
    newDb.splice(index, 1);
    setFaceDatabase(newDb);
    speak(`Record for ${name} deleted.`);
  };

  const updatePerson = (index, updatedData) => {
    const newDb = [...faceDatabase];
    newDb[index] = { ...newDb[index], ...updatedData };
    setFaceDatabase(newDb);
    speak(`Record for ${updatedData.name} updated.`);
  };

  const addPerson = (newData) => {
    setFaceDatabase(prev => [...prev, { ...newData, dateAdded: new Date().toLocaleDateString() }]);
    speak(`New identity, ${newData.name}, added to the database.`);
  };

  const clearDatabase = () => {
    setFaceDatabase([]);
    speak("Database wiped.");
  };

  // --- VOICE & HEARING ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        const savedIndex = localStorage.getItem('jarvis_voice_index');
        if (savedIndex) {
          setSelectedVoiceIndex(parseInt(savedIndex));
        } else {
          const bestIndex = voices.findIndex(v => v.name.includes("Google UK English Male"));
          if (bestIndex !== -1) setSelectedVoiceIndex(bestIndex);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const changeVoice = (index) => {
    setSelectedVoiceIndex(index);
    localStorage.setItem('jarvis_voice_index', index);
  };

  const speak = (text, shouldListenAfter = false) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (isListening) stopListening();

    setIsSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    if (availableVoices.length > 0) u.voice = availableVoices[selectedVoiceIndex];
    u.rate = 1.0; u.pitch = 1.0;
    
    u.onend = () => {
      setIsSpeaking(false);
      if (shouldListenAfter) setTimeout(() => startListening(), 200);
    };
    window.speechSynthesis.speak(u);
  };

  const recognitionRef = useRef(null);

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recon = new SR();
      recon.continuous = false;
      recon.interimResults = false;
      recon.lang = 'en-US';
      recon.onstart = () => setIsListening(true);
      recon.onend = () => setIsListening(false);
      recon.onresult = (event) => {
        const command = event.results[0][0].transcript.toLowerCase().trim();
        processCommand(command);
      };
      recognitionRef.current = recon;
    }
  }, [conversationState, tempPersonData, faceDatabase]); 

  const startListening = () => {
    if (recognitionRef.current) try { recognitionRef.current.start(); playSound('click'); } catch (e) {}
  };
  const stopListening = () => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) {}
  };
  const toggleListening = () => {
    if (isListening) stopListening(); else startListening();
  };

  const processCommand = (cmd) => {
    if (conversationState !== "IDLE") {
      handleConversationResponse(cmd);
      return;
    }
    if (cmd.includes("vision") || cmd.includes("camera")) { setActiveMode("VISION"); speak("Visual sensors active."); } 
    else if (cmd.includes("scan")) { if (activeMode !== "VISION") setActiveMode("VISION"); setConversationState("SCANNING"); speak("Scanning target."); }
    else if (cmd.includes("database")) { setActiveMode("DATABASE"); speak("Accessing records."); }
    else if (cmd.includes("drive") || cmd.includes("hud")) { setActiveMode("HUD"); speak("Driving mode initiated."); }
    else if (cmd.includes("home")) { setActiveMode("HOME"); setConversationState("IDLE"); speak("Interface minimized."); }
  };

  const handleConversationResponse = (response) => {
    const newData = { ...tempPersonData };
    if (conversationState === "ASK_NAME") {
      newData.name = response.replace(/\./g, '');
      setTempPersonData(newData); setConversationState("ASK_GENDER"); speak(`Registered ${newData.name}. Male or Female?`, true);
    } 
    else if (conversationState === "ASK_GENDER") {
      newData.gender = response.includes("female") ? "Female" : "Male";
      setTempPersonData(newData); setConversationState("ASK_AGE"); speak("Approximate age?", true);
    } 
    else if (conversationState === "ASK_AGE") {
      newData.age = response.replace(/\D/g,'') || "Unknown";
      setTempPersonData(newData); setConversationState("ASK_ACCESS"); speak("Access Level?", true);
    } 
    else if (conversationState === "ASK_ACCESS") {
      let level = "No Access";
      if (response.includes("admin")) level = "Admin";
      if (response.includes("medium")) level = "Medium";
      if (response.includes("missing")) level = "Missing";
      newData.accessLevel = level;
      newData.dateAdded = new Date().toLocaleDateString();
      setFaceDatabase(prev => [...prev, newData]);
      setConversationState("IDLE"); setTempPersonData({});
      speak("Identity archived.");
    }
  };

  const triggerInterview = (faceDescriptor) => {
    if (conversationState === "SCANNING") {
        setTempPersonData({ descriptor: faceDescriptor });
        setConversationState("ASK_NAME");
        speak("Target captured. Who is this person, Sir?", true);
    }
  };

  useEffect(() => { if ('getBattery' in navigator) navigator.getBattery().then(b => setBattery(Math.round(b.level * 100))); }, []);

  const playSound = (type) => {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        if (type === 'click') {
          osc.frequency.value = 800; gain.gain.value = 0.1;
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          osc.start(); osc.stop(ctx.currentTime + 0.1);
        }
      } catch (e) {}
  };

  return (
    <JarvisContext.Provider value={{
      isListening, toggleListening, isSpeaking, speak,
      systemStatus, setSystemStatus, activeMode, setActiveMode,
      user, battery, playSound, availableVoices, selectedVoiceIndex, changeVoice,
      conversationState, triggerInterview, 
      faceDatabase, deletePerson, updatePerson, addPerson, clearDatabase,
      hudData // <--- New Export
    }}>
      {children}
    </JarvisContext.Provider>
  );
};

export const useJarvis = () => useContext(JarvisContext);