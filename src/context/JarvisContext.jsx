import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const JarvisContext = createContext();

export const JarvisProvider = ({ children }) => {
  // --- CORE STATE ---
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [systemStatus, setSystemStatus] = useState("STANDBY"); 
  const [activeMode, setActiveMode] = useState("HOME"); 
  const [user] = useState({ name: "Jim", access: "Admin" });
  const [battery, setBattery] = useState(100);
  
  // --- VOICE & SENSORS ---
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoiceIndex, setSelectedVoiceIndex] = useState(0);
  const [hudData, setHudData] = useState({ speed: 0, heading: 0, altitude: 0, accuracy: 0 });

  // --- DATABASES ---
  // 1. Biometrics
  const [faceDatabase, setFaceDatabase] = useState(() => {
    const saved = localStorage.getItem('jarvis_face_db_v2');
    return saved ? JSON.parse(saved) : [];
  });

  // 2. Incident Logs (NEW)
  const [incidentLog, setIncidentLog] = useState(() => {
    const saved = localStorage.getItem('jarvis_incidents');
    return saved ? JSON.parse(saved) : [];
  });

  // 3. Recon/Leads (NEW)
  const [leadsLog, setLeadsLog] = useState(() => {
    const saved = localStorage.getItem('jarvis_leads');
    return saved ? JSON.parse(saved) : [];
  });

  // --- PERSISTENCE ---
  useEffect(() => { localStorage.setItem('jarvis_face_db_v2', JSON.stringify(faceDatabase)); }, [faceDatabase]);
  useEffect(() => { localStorage.setItem('jarvis_incidents', JSON.stringify(incidentLog)); }, [incidentLog]);
  useEffect(() => { localStorage.setItem('jarvis_leads', JSON.stringify(leadsLog)); }, [leadsLog]);

  // --- ACTIONS: INCIDENTS ---
  const addIncident = (incident) => {
    const newRecord = { ...incident, id: Date.now(), date: new Date().toLocaleString() };
    setIncidentLog(prev => [newRecord, ...prev]);
    speak("Incident logged. Analysis complete.");
  };

  const deleteIncident = (id) => {
    setIncidentLog(prev => prev.filter(i => i.id !== id));
  };

  // --- ACTIONS: LEADS ---
  const addLead = (lead) => {
    const newLead = { ...lead, id: Date.now(), status: 'Potential', dateAdded: new Date().toLocaleDateString() };
    setLeadsLog(prev => [newLead, ...prev]);
    speak("Target acquired. Added to sales pipeline.");
  };

  const updateLeadStatus = (id, newStatus) => {
    setLeadsLog(prev => prev.map(l => l.id === id ? { ...l, status: newStatus } : l));
    speak(`Status updated to ${newStatus}.`);
  };

  const deleteLead = (id) => {
    setLeadsLog(prev => prev.filter(l => l.id !== id));
  };

  // --- ACTIONS: BIOMETRICS ---
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
    speak(`Record updated.`);
  };

  const addPerson = (newData) => {
    setFaceDatabase(prev => [...prev, { ...newData, dateAdded: new Date().toLocaleDateString() }]);
    speak(`New identity added.`);
  };

  const clearDatabase = () => {
    setFaceDatabase([]);
    speak("Database wiped.");
  };

  // --- SENSORS & VOICE LOGIC ---
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        setAvailableVoices(voices);
        const savedIndex = localStorage.getItem('jarvis_voice_index');
        if (savedIndex) setSelectedVoiceIndex(parseInt(savedIndex));
        else {
            const bestIndex = voices.findIndex(v => v.name.includes("Google UK English Male"));
            if (bestIndex !== -1) setSelectedVoiceIndex(bestIndex);
        }
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }, []);

  const changeVoice = (index) => { setSelectedVoiceIndex(index); localStorage.setItem('jarvis_voice_index', index); };

  const speak = (text, shouldListenAfter = false) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    if (isListening) stopListening();
    setIsSpeaking(true);
    const u = new SpeechSynthesisUtterance(text);
    if (availableVoices.length > 0) u.voice = availableVoices[selectedVoiceIndex];
    u.rate = 1.0; u.pitch = 1.0;
    u.onend = () => { setIsSpeaking(false); if (shouldListenAfter) setTimeout(() => startListening(), 200); };
    window.speechSynthesis.speak(u);
  };

  const recognitionRef = useRef(null);
  const [conversationState, setConversationState] = useState("IDLE");
  const [tempPersonData, setTempPersonData] = useState({});

  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const recon = new SR();
      recon.continuous = false; recon.interimResults = false; recon.lang = 'en-US';
      recon.onstart = () => setIsListening(true); recon.onend = () => setIsListening(false);
      recon.onresult = (event) => processCommand(event.results[0][0].transcript.toLowerCase().trim());
      recognitionRef.current = recon;
    }
  }, [conversationState, tempPersonData, faceDatabase]);

  const startListening = () => { if (recognitionRef.current) try { recognitionRef.current.start(); playSound('click'); } catch (e) {} };
  const stopListening = () => { if (recognitionRef.current) try { recognitionRef.current.stop(); } catch (e) {} };
  const toggleListening = () => { if (isListening) stopListening(); else startListening(); };

  const processCommand = (cmd) => {
    if (conversationState !== "IDLE") { handleConversationResponse(cmd); return; }
    if (cmd.includes("vision")) { setActiveMode("VISION"); speak("Visual sensors active."); } 
    else if (cmd.includes("scan")) { setActiveMode("VISION"); setConversationState("SCANNING"); speak("Scanning target."); }
    else if (cmd.includes("database")) { setActiveMode("DATABASE"); speak("Accessing records."); }
    else if (cmd.includes("ops") || cmd.includes("incident")) { setActiveMode("OPS"); speak("Operations center online."); }
    else if (cmd.includes("recon") || cmd.includes("sales")) { setActiveMode("RECON"); speak("Sales targeting engaged."); }
    else if (cmd.includes("drive")) { setActiveMode("HUD"); speak("Driving mode engaged."); }
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
        speak("Target captured. Who is this person?", true);
    }
  };

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
      hudData,
      // NEW EXPORTS
      incidentLog, addIncident, deleteIncident,
      leadsLog, addLead, updateLeadStatus, deleteLead
    }}>
      {children}
    </JarvisContext.Provider>
  );
};

export const useJarvis = () => useContext(JarvisContext);