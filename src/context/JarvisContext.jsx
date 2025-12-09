import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const JarvisContext = createContext();

export const JarvisProvider = ({ children }) => {
  // --- CORE STATE ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [systemStatus, setSystemStatus] = useState("STANDBY"); 
  const [activeMode, setActiveMode] = useState("HOME"); 
  const [lastCommand, setLastCommand] = useState(null); 
  const [user] = useState({ name: "Jim", access: "Admin" });
  const [battery, setBattery] = useState(100);
  
  // --- VOICE & SENSORS ---
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [hudData, setHudData] = useState({ speed: 0, heading: 0, altitude: 0, accuracy: 0 });

  // --- DATABASE LOADING ---
  const safeLoad = (key, fallback) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : fallback;
    } catch (e) { return fallback; }
  };

  const [faceDatabase, setFaceDatabase] = useState(() => safeLoad('jarvis_face_db_v2', []));
  const [incidentLog, setIncidentLog] = useState(() => safeLoad('jarvis_incidents', []));
  const [leadsLog, setLeadsLog] = useState(() => safeLoad('jarvis_leads', []));

  useEffect(() => { localStorage.setItem('jarvis_face_db_v2', JSON.stringify(faceDatabase)); }, [faceDatabase]);
  useEffect(() => { localStorage.setItem('jarvis_incidents', JSON.stringify(incidentLog)); }, [incidentLog]);
  useEffect(() => { localStorage.setItem('jarvis_leads', JSON.stringify(leadsLog)); }, [leadsLog]);

  // --- ACTIONS ---
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

  const speak = (text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    
    // Stop listening before speaking to prevent echo
    if (recognitionRef.current) {
       try { recognitionRef.current.stop(); } catch(e){}
    }

    setIsSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    if (availableVoices.length > 0) u.voice = availableVoices[selectedVoiceIndex];
    u.rate = 1.0; u.pitch = 1.0;
    
    u.onend = () => {
      setIsSpeaking(false);
      // NO AUTO RESTART. We stay silent until user taps again.
    };
    window.speechSynthesis.speak(u);
  };

  // --- VOICE RECOGNITION (MANUAL MODE) ---
  const recognitionRef = useRef(null);
  const [conversationState, setConversationState] = useState("IDLE");
  const [tempPersonData, setTempPersonData] = useState({});

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recon = new SR();
      recon.continuous = false; // Single command only
      recon.interimResults = false;
      recon.lang = 'en-US';

      recon.onstart = () => { setIsListening(true); };
      
      recon.onend = () => {
          // Simply stop. No loops. No restarts.
          setIsListening(false);
      };
      
      recon.onresult = (event) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        processCommand(transcript);
      };
      
      recognitionRef.current = recon;
    }
  }, [conversationState, activeMode]); 

  const startListening = () => {
    if (recognitionRef.current && !isSpeaking) {
        try { recognitionRef.current.start(); } catch (e) {}
    }
  };

  const toggleListening = () => {
    if (isListening) {
        // Manual Stop
        if(recognitionRef.current) recognitionRef.current.stop();
        speak("Cancelled.");
    } else {
        // Manual Start
        startListening();
        playSound('startup');
    }
  };

  // --- COMMAND PROCESSOR ---
  const processCommand = (cmd) => {
    setLastCommand({ text: cmd, time: Date.now() });

    if (conversationState !== "IDLE") {
        handleConversationResponse(cmd);
        return;
    }

    if (cmd === "jarvis" || cmd === "hey jarvis" || cmd === "hello") {
        setActiveMode("MENU_OPEN");
        speak("Sir?");
        return;
    }

    if (cmd.includes("open") || cmd.includes("start") || cmd.includes("let's")) {
        if (cmd.includes("drive") || cmd.includes("hud")) { setActiveMode("HUD"); speak("Driving protocols initiated."); }
        else if (cmd.includes("vision") || cmd.includes("camera")) { setActiveMode("VISION"); speak("Visual sensors active."); }
        else if (cmd.includes("media") || cmd.includes("music")) { setActiveMode("MEDIA"); speak("Media player ready."); }
        else if (cmd.includes("database")) { setActiveMode("DATABASE"); speak("Accessing records."); }
        else if (cmd.includes("ops") || cmd.includes("incident")) { setActiveMode("OPS"); speak("Operations center online."); }
        else if (cmd.includes("recon") || cmd.includes("sales")) { setActiveMode("RECON"); speak("Sales targeting engaged."); }
        else if (cmd.includes("guardian")) { setActiveMode("GUARDIAN"); }
        else if (cmd.includes("comms")) { setActiveMode("COMMS_MENU"); speak("Comms channels open."); }
    }
    
    else if (cmd.includes("drive home")) {
        speak("Setting coordinates for Home Base.");
        window.open("https://www.google.com/maps/dir/?api=1&destination=Home", "_blank");
    }
    else if (cmd.includes("open maps")) {
        speak("Opening global positioning.");
        window.open("https://www.google.com/maps", "_blank");
    }

    else if (cmd.includes("close") || cmd.includes("exit") || cmd.includes("stop")) {
        if (activeMode !== "HOME") {
            setActiveMode("MENU_OPEN");
            speak("Module closed. Anything else?");
        } else {
            setActiveMode("HOME");
            speak("Standing by.");
        }
    }
    
    else if (cmd.includes("yes") && activeMode === "MENU_OPEN") {
        speak("Awaiting command.");
        // Optional: We could trigger listening here manually if we really wanted to, 
        // but for safety, we let the user tap.
    }
    else if (cmd.includes("no") && activeMode === "MENU_OPEN") {
        setActiveMode("HOME");
        speak("Interface minimized.");
    }
  };

  const handleConversationResponse = (response) => {
     // ... (Existing interview logic - same as before) ...
     const newData = { ...tempPersonData };
     if (conversationState === "ASK_NAME") {
        newData.name = response.replace(/\./g, '');
        setTempPersonData(newData); setConversationState("ASK_GENDER"); 
        speak(`Registered ${newData.name}. Male or Female?`); 
        // Here we MIGHT want to auto-listen because it's a conversation flow, 
        // but let's keep it manual for stability first.
        // User taps -> says "Male" -> Jarvis processes.
     } 
     else if (conversationState === "ASK_GENDER") {
        newData.gender = response.includes("female") ? "Female" : "Male";
        setTempPersonData(newData); setConversationState("ASK_AGE"); speak("Age?");
     } 
     else if (conversationState === "ASK_AGE") {
        newData.age = response.replace(/\D/g,'') || "Unknown";
        setTempPersonData(newData); setConversationState("ASK_ACCESS"); speak("Access Level?");
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

  const triggerInterview = (faceDescriptor) => {
    if (conversationState === "SCANNING") {
        setTempPersonData({ descriptor: faceDescriptor });
        setConversationState("ASK_NAME");
        speak("Target captured. Who is this person?");
    }
  };

  // --- SENSORS ---
  useEffect(() => { 
    if ('getBattery' in navigator) navigator.getBattery().then(b => setBattery(Math.round(b.level * 100))); 
    const geoId = navigator.geolocation.watchPosition(p => setHudData(prev => ({...prev, speed: p.coords.speed ? Math.round(p.coords.speed*3.6) : 0, altitude: Math.round(p.coords.altitude||0) })), e=>{}, {enableHighAccuracy:true});
    const handleOri = (e) => { if(e.webkitCompassHeading) setHudData(prev=>({...prev, heading: e.webkitCompassHeading})); else if(e.alpha) setHudData(prev=>({...prev, heading: 360-e.alpha})); };
    window.addEventListener('deviceorientation', handleOri);
    return () => { navigator.geolocation.clearWatch(geoId); window.removeEventListener('deviceorientation', handleOri); };
  }, []);

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
        } else if (type === 'startup') {
          osc.frequency.value = 150; 
          osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.4);
          gain.gain.value = 0.1; gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.4);
          osc.start(); osc.stop(ctx.currentTime + 0.4);
        }
    } catch (e) {} 
  };

  return (
    <JarvisContext.Provider value={{
      isListening, toggleListening, isSpeaking, speak, systemStatus, setSystemStatus, activeMode, setActiveMode,
      user, battery, playSound, availableVoices, selectedVoiceIndex, changeVoice,
      conversationState, triggerInterview, 
      faceDatabase, deletePerson, updatePerson, addPerson, clearDatabase,
      hudData, incidentLog, addIncident, deleteIncident, leadsLog, addLead, updateLeadStatus, deleteLead,
      lastCommand 
    }}>
      {children}
    </JarvisContext.Provider>
  );
};

export const useJarvis = () => useContext(JarvisContext);