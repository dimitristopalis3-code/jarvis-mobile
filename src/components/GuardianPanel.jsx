import React, { useState, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, onSnapshot } from 'firebase/firestore';

// --- FIREBASE CONFIG ---
const firebaseConfig = {
    apiKey: "AIzaSyBwhzGsK-ah7ObMOgpRDlzGghycLNinm6g",
    authDomain: "tforce-guardian-system.firebaseapp.com",
    projectId: "tforce-guardian-system",
    storageBucket: "tforce-guardian-system.firebasestorage.app",
    messagingSenderId: "194168927826",
    appId: "1:194168927826:web:18073e1a188b8e4408118b"
};

// Initialize only once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const GuardianPanel = () => {
  const { setActiveMode, playSound, speak } = useJarvis();
  
  // State
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('live'); 
  const [units, setUnits] = useState([]);
  const [logs, setLogs] = useState([]);
  
  // Login State
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  // 1. AUTH LISTENER (With Audio Fix)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
        
        // FIX: Add a delay so the UI renders first, preventing audio stutter
        if(u) {
            setTimeout(() => {
                speak("Guardian uplink established.");
            }, 800); // 800ms delay to let the heavy data load first
        }
    });
    return () => unsub();
  }, [speak]); // Removed 'speak' from dependency if it causes loops, but 'speak' is stable in context.

  // 2. LIVE FEED LISTENER
  useEffect(() => {
    if (!user || view !== 'live') return;
    
    const unsub = onSnapshot(collection(db, 'locations'), snap => {
        const data = snap.docs.map(d => ({id:d.id, ...d.data()}));
        const now = new Date();
        const active = data.filter(u => {
            if(!u.timestamp || !u.timestamp.toDate) return false;
            const diff = (now - u.timestamp.toDate()) / 1000 / 60;
            return u.onDuty && diff < 60;
        });
        setUnits(active);
    });
    return () => unsub();
  }, [user, view]);

  // 3. LOGS LISTENER
  useEffect(() => {
    if (!user || view !== 'logs') return;

    const unsub = onSnapshot(collection(db, 'scan_logs'), snap => {
        let data = snap.docs.map(d => ({id:d.id, ...d.data()}));
        data.sort((a,b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
        setLogs(data.slice(0, 50));
    });
    return () => unsub();
  }, [user, view]);

  // HANDLERS
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
        setError("Access Denied: " + err.message);
        playSound('error'); 
    }
  };

  const handleLogout = () => {
    signOut(auth);
    playSound('click');
  };

  const fmtDate = (ts) => {
    if(!ts || !ts.toDate) return "PENDING...";
    try { return ts.toDate().toLocaleTimeString(); } catch(e) { return "ERR"; }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-slide-up font-mono">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 border-b border-red-600/30">
        <div className="flex items-center gap-3">
            <i className="fas fa-shield-alt text-red-600 text-xl animate-pulse"></i>
            <h2 className="text-red-600 font-bold text-xl tracking-widest">GUARDIAN COMMAND</h2>
        </div>
        <button onClick={() => { playSound('click'); setActiveMode("HOME"); }} className="text-red-600 hover:text-white">
          <i className="fas fa-times text-2xl"></i>
        </button>
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 overflow-y-auto p-6 no-scrollbar">
        
        {loading ? (
            <div className="text-center text-red-600 mt-20 animate-pulse">ESTABLISHING SECURE CONNECTION...</div>
        ) : !user ? (
            // --- LOGIN SCREEN ---
            <div className="max-w-sm mx-auto mt-10 p-6 border border-red-600/50 rounded bg-red-900/10">
                <h3 className="text-red-600 text-center text-lg font-bold mb-6">RESTRICTED ACCESS</h3>
                <form onSubmit={handleLogin} className="flex flex-col gap-4">
                    <input 
                        type="email" 
                        placeholder="OFFICER EMAIL" 
                        value={email} onChange={e=>setEmail(e.target.value)}
                        className="bg-black border border-red-600/30 p-3 text-white outline-none focus:border-red-600"
                    />
                    <input 
                        type="password" 
                        placeholder="ACCESS CODE" 
                        value={pass} onChange={e=>setPass(e.target.value)}
                        className="bg-black border border-red-600/30 p-3 text-white outline-none focus:border-red-600"
                    />
                    {error && <div className="text-xs text-red-500 text-center">{error}</div>}
                    <button type="submit" className="bg-red-600 text-white font-bold py-3 hover:bg-red-700 transition-all">
                        AUTHENTICATE
                    </button>
                </form>
            </div>
        ) : (
            // --- DASHBOARD ---
            <>
                {/* NAV TABS */}
                <div className="flex gap-4 mb-6 border-b border-white/10 pb-4">
                    <button 
                        onClick={() => setView('live')}
                        className={`px-4 py-2 border ${view==='live' ? 'border-red-600 bg-red-600/20 text-red-500' : 'border-gray-700 text-gray-500'}`}
                    >
                        ACTIVE UNITS
                    </button>
                    <button 
                        onClick={() => setView('logs')}
                        className={`px-4 py-2 border ${view==='logs' ? 'border-red-600 bg-red-600/20 text-red-500' : 'border-gray-700 text-gray-500'}`}
                    >
                        SCAN LOGS
                    </button>
                    <button onClick={handleLogout} className="ml-auto text-xs text-gray-500 hover:text-white">SIGN OUT</button>
                </div>

                {/* VIEW: LIVE UNITS */}
                {view === 'live' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {units.length === 0 && <div className="col-span-full text-center text-gray-500">NO ACTIVE UNITS DETECTED</div>}
                        {units.map(u => (
                            <div key={u.id} className="border border-white/20 border-l-4 border-l-green-500 p-4 bg-white/5">
                                <div className="flex justify-between items-start">
                                    <h3 className="font-bold text-lg text-white">{u.username}</h3>
                                    <span className="text-green-500 text-xs font-bold animate-pulse">● ON DUTY</span>
                                </div>
                                <div className="text-gray-400 text-xs mt-1">LAST SIGNAL: {fmtDate(u.timestamp)}</div>
                                <div className="bg-black p-2 mt-3 font-mono text-xs text-red-400 border border-white/10 flex justify-between items-center">
                                    <span>{u.latitude?.toFixed(4)}, {u.longitude?.toFixed(4)}</span>
                                    <a 
                                        href={`http://googleusercontent.com/maps.google.com/5{u.latitude},${u.longitude}`} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="text-white hover:text-red-500"
                                    >
                                        <i className="fas fa-map-marker-alt"></i> MAP
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* VIEW: LOGS */}
                {view === 'logs' && (
                    <div className="space-y-2">
                         <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-gray-500">RECENT ACTIVITY</span>
                        </div>
                        {logs.map(l => (
                            <div key={l.id} className="border-b border-white/10 p-3 flex justify-between items-center hover:bg-white/5">
                                <div>
                                    <div className="font-bold text-white text-sm">{l.username}</div>
                                    <div className="text-gray-500 text-xs">{fmtDate(l.timestamp)}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-red-400 text-sm">{l.checkpointData || "SCAN"}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </>
        )}
      </div>
    </div>
  );
};

export default GuardianPanel;