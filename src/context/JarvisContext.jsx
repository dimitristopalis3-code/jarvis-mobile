import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const JarvisContext = createContext();

export const JarvisProvider = ({ children }) => {
  // --- CORE STATE ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [systemStatus, setSystemStatus] = useState("STANDBY"); 
  const [activeMode, setActiveMode] = useState("HOME"); // HOME, MENU_OPEN, HUD, VISION, etc.
  
  // NEW: To broadcast commands to modules (like MediaPanel)
  const [lastCommand, setLastCommand] = useState(null); 
  
  const [user] = useState({ name: "Jim", access: "Admin" });
  const [battery, setBattery] = useState(100);
  
  // --- VOICE & SENSORS ---
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [hudData, setHudData] = useState({ speed: 0, heading: 0, altitude: 0, accuracy: 0 });

  // --- DATABASES ---
  const [faceDatabase, setFaceDatabase] = useState(() => JSON.parse(localStorage.getItem('jarvis_face_db_v2') || '[]'));
  const [incidentLog, setIncidentLog] = useState(() => JSON.parse(localStorage.getItem('jarvis_incidents') || '[]'));
  const [leadsLog, setLeadsLog] = useState(() => JSON.parse(localStorage.getItem('jarvis_leads') || '[]'));

  useEffect(() => { localStorage.setItem('jarvis_face_db_v2', JSON.stringify(faceDatabase)); }, [faceDatabase]);
  useEffect(() => { localStorage.setItem('jarvis_incidents', JSON.stringify(incidentLog)); }, [incidentLog]);
  useEffect(() => { localStorage.setItem('jarvis_leads', JSON.stringify(leadsLog)); }, [leadsLog]);

  // --- DATABASE ACTIONS ---
  // (Keeping these identical to before for brevity, logic remains the same)
  const addIncident = (i) => { setIncidentLog(prev => [{...i, id:Date.now(), date:new Date().toLocaleString()}, ...prev]); speak("Incident logged."); };
  const deleteIncident = (id) => setIncidentLog(prev => prev.filter(i => i.id !== id));
  const addLead = (l) => { setLeadsLog(prev => [{...l, id:Date.now(), status:'Potential', dateAdded:new Date().toLocaleDateString()}, ...prev]); speak("Target added."); };
  const updateLeadStatus = (id, s) => { setLeadsLog(prev => prev.map(l => l.id === id ? {...l, status:s} : l)); speak("Status updated."); };
  const deleteLead = (id) => setLeadsLog(prev => prev.filter(l => l.id !== id));
  const deletePerson = (i) => { const n=[...faceDatabase]; n.splice(i,1); setFaceDatabase(n); speak("Record deleted."); };
  const updatePerson = (i,d) => { const n=[...faceDatabase]; n[i]={...n[i], ...d}; setFaceDatabase(n); speak("Record updated."); };
  const addPerson = (d) => { setFaceDatabase(prev => [...prev, {...d, dateAdded:new Date().toLocaleDateString()}]); speak("Identity added."); };
  const clearDatabase = () => { setFaceDatabase([]); speak("Database wiped."); };

  // --- VOICE SYNTHESIS ---
  useEffect(() => {
    const loadVoices = () => {
      const vs = window.speechSynthesis.getVoices();
      if (vs.length > 0) {
        setAvailableVoices(vs);
        const saved = localStorage.getItem('jarvis_voice_index');
        if (saved) setSelectedVoiceIndex(parseInt(saved));
        else {
            const best = vs.findIndex(v => v.name.includes("Google UK English Male"));
            if (best !== -1) setSelectedVoiceIndex(best);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const changeVoice = (i) => { setSelectedVoiceIndex(i); localStorage.setItem('jarvis_voice_index', i); };

  const speak = (text, shouldListenAfter = false) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // NOTE: We do NOT stop listening here anymore to allow full-duplex feel if supported
    // But usually standard WebSpeech API requires stop/start to avoid echo
    if (isListening) stopListening();

    setIsSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    if (availableVoices.length > 0) u.voice = availableVoices[selectedVoiceIndex];
    u.rate = 1.0; u.pitch = 1.0;
    
    u.onend = () => {
      setIsSpeaking(false);
      if (shouldListenAfter) {
          // Add small delay to prevent hearing itself
          setTimeout(() => startListening(), 300);
      }
    };
    window.speechSynthesis.speak(u);
  };

  // --- VOICE RECOGNITION (THE UPGRADE) ---
  const recognitionRef = useRef(null);
  const [conversationState, setConversationState] = useState("IDLE");
  const [tempPersonData, setTempPersonData] = useState({});

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recon = new SR();
      recon.continuous = false; // We use false and auto-restart to simulate continuous
      recon.interimResults = false;
      recon.lang = 'en-US';

      recon.onstart = () => setIsListening(true);
      recon.onend = () => setIsListening(false);
      
      recon.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log("Heard:", transcript);
        processCommand(transcript);
      };
      
      recognitionRef.current = recon;
    }
  }, [conversationState, tempPersonData, faceDatabase, activeMode]); // Added activeMode dependency

  const startListening = () => {
    if (recognitionRef.current && !isSpeaking) {
        try { recognitionRef.current.start(); } catch (e) {}
    }
  };
  const stopListening = () => {
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) {}
  };
  const toggleListening = () => { if (isListening) stopListening(); else startListening(); };

  // --- SMART COMMAND PROCESSOR ---
  const processCommand = (cmd) => {
    // 1. BROADCAST to Modules (Media/Ops can listen to this)
    setLastCommand({ text: cmd, time: Date.now() });

    // 2. CONVERSATION INTERRUPT
    if (conversationState !== "IDLE") {
        handleConversationResponse(cmd);
        return;
    }

    // 3. WAKE WORD CHECK
    // If we just hear "Jarvis", we open the menu
    if (cmd === "jarvis" || cmd === "hey jarvis") {
        setActiveMode("MENU_OPEN");
        speak("Sir?", true);
        return;
    }

    // 4. NAVIGATION COMMANDS
    if (cmd.includes("open") || cmd.includes("start") || cmd.includes("let's")) {
        if (cmd.includes("drive") || cmd.includes("hud")) { setActiveMode("HUD"); speak("Driving protocols initiated."); }
        else if (cmd.includes("vision") || cmd.includes("camera")) { setActiveMode("VISION"); speak("Vision systems active."); }
        else if (cmd.includes("media") || cmd.includes("music")) { setActiveMode("MEDIA"); speak("Media player ready."); }
        else if (cmd.includes("database")) { setActiveMode("DATABASE"); speak("Accessing records."); }
        else if (cmd.includes("ops") || cmd.includes("incident")) { setActiveMode("OPS"); speak("Operations center online."); }
        else if (cmd.includes("recon") || cmd.includes("sales")) { setActiveMode("RECON"); speak("Sales targeting engaged."); }
        else if (cmd.includes("guardian")) { setActiveMode("GUARDIAN"); } // Panel speaks for itself
        else if (cmd.includes("comms")) { setActiveMode("MENU_OPEN"); speak("Comms channels open."); } // Comms is in menu
    }
    
    // 5. DEEP LINKS (Maps)
    else if (cmd.includes("drive home") || cmd.includes("navigate home")) {
        speak("Setting coordinates for Home Base.");
        // Replace with your actual address if you want, currently generalized
        window.open("https://www.google.com/maps/dir/?api=1&destination=Home", "_blank");
    }
    else if (cmd.includes("open maps")) {
        speak("Opening global positioning.");
        window.open("https://maps.google.com", "_blank");
    }

    // 6. CLOSING COMMANDS
    else if (cmd.includes("close") || cmd.includes("exit") || cmd.includes("stop")) {
        // If we are in a module, go back to MENU (Reactor with buttons), not empty Home
        if (activeMode !== "HOME") {
            setActiveMode("MENU_OPEN");
            speak("Module closed. Anything else, Sir?", true);
        } else {
            // If already at menu, minimize to Home
            setActiveMode("HOME");
            speak("Standing by.");
        }
    }
    
    // 7. CONFIRMATION ("Yes" to "Anything else?")
    else if (cmd.includes("yes") && activeMode === "MENU_OPEN") {
        speak("Awaiting command.", true);
    }
    else if (cmd.includes("no") && activeMode === "MENU_OPEN") {
        setActiveMode("HOME");
        speak("Very well. Interface minimized.");
    }
  };

  const handleConversationResponse = (response) => {
     // (Existing interview logic...)
     const newData = { ...tempPersonData };
     if (conversationState === "ASK_NAME") {
        newData.name = response.replace(/\./g, '');
        setTempPersonData(newData); setConversationState("ASK_GENDER"); speak(`Registered ${newData.name}. Male or Female?`, true);
     } 
     else if (conversationState === "ASK_GENDER") {
        newData.gender = response.includes("female") ? "Female" : "Male";
        setTempPersonData(newData); setConversationState("ASK_AGE"); speak("Age?", true);
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
        newData.accessLevel = level; newData.dateAdded = new Date().toLocaleDateString();
        setFaceDatabase(prev => [...prev, newData]);
        setConversationState("IDLE"); setTempPersonData({});
        speak("Identity archived.");
     }
  };

  // ... (Rest of Hooks: Sensors, Battery, HUD - Same as before)
  useEffect(() => { 
    if ('getBattery' in navigator) navigator.getBattery().then(b => setBattery(Math.round(b.level * 100))); 
    const geoId = navigator.geolocation.watchPosition(p => setHudData(prev => ({...prev, speed: p.coords.speed ? Math.round(p.coords.speed*3.6) : 0, altitude: Math.round(p.coords.altitude||0) })), e=>{}, {enableHighAccuracy:true});
    const handleOri = (e) => { if(e.webkitCompassHeading) setHudData(prev=>({...prev, heading: e.webkitCompassHeading})); else if(e.alpha) setHudData(prev=>({...prev, heading: 360-e.alpha})); };
    window.addEventListener('deviceorientation', handleOri);
    return () => { navigator.geolocation.clearWatch(geoId); window.removeEventListener('deviceorientation', handleOri); };
  }, []);

  const playSound = (type) => { /* Same sound logic */ };

  return (
    <JarvisContext.Provider value={{
      isListening, toggleListening, isSpeaking, speak, systemStatus, setSystemStatus, activeMode, setActiveMode,
      user, battery, playSound, availableVoices, selectedVoiceIndex, changeVoice,
      conversationState, triggerInterview, 
      faceDatabase, deletePerson, updatePerson, addPerson, clearDatabase,
      hudData, incidentLog, addIncident, deleteIncident, leadsLog, addLead, updateLeadStatus, deleteLead,
      lastCommand // <--- NEW EXPORT
    }}>
      {children}
    </JarvisContext.Provider>
  );
};

export const useJarvis = () => useContext(JarvisContext);