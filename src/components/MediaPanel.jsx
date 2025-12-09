import React, { useRef, useState, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';
import { saveTrack, getTracks, deleteTrack } from '../utils/db'; // Import DB helpers

const MediaPanel = () => {
  const { setActiveMode, speak, playSound, lastCommand } = useJarvis(); // We will add lastCommand to context later
  const audioRef = useRef(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // 1. LOAD SAVED TRACKS ON START
  useEffect(() => {
    const loadSaved = async () => {
      const tracks = await getTracks();
      if (tracks.length > 0) {
        // Convert stored Blobs back to URLs
        const playableTracks = tracks.map(t => ({
            ...t,
            url: URL.createObjectURL(t.file)
        }));
        setPlaylist(playableTracks);
        // If we have tracks, select the first one but don't play yet
        setCurrentTrack(0);
      }
    };
    loadSaved();
  }, []);

  // 2. VOICE COMMAND LISTENER
  // This watches the "lastCommand" from the Brain and reacts if it sees media keywords
  useEffect(() => {
    if (!lastCommand) return;
    const cmd = lastCommand.text;
    const time = lastCommand.time; // timestamp to ensure we don't re-run old commands

    // Only react to fresh commands (within last 2 seconds)
    if (Date.now() - time > 2000) return;

    if (cmd.includes('play music') || cmd.includes('resume')) {
        if (audioRef.current && currentTrack !== -1) {
            audioRef.current.play();
            setIsPlaying(true);
            speak("Playing audio.");
        } else {
            speak("Playlist is empty.");
        }
    }
    else if (cmd.includes('stop') || cmd.includes('pause')) {
        if (audioRef.current) {
            audioRef.current.pause();
            setIsPlaying(false);
            speak("Audio paused.");
        }
    }
    else if (cmd.includes('next')) {
        nextTrack();
        speak("Skipping track.");
    }
    else if (cmd.includes('previous')) {
        prevTrack();
    }
  }, [lastCommand]);

  // 3. FILE UPLOAD (With Persistence)
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      speak("Processing audio files.");
      const newTracks = [];
      
      for (const file of files) {
          const track = {
              id: Date.now() + Math.random(), // Unique ID
              name: file.name.replace(/\.[^/.]+$/, ""),
              file: file // Store the raw blob
          };
          
          await saveTrack(track); // Save to IndexedDB
          
          newTracks.push({
              ...track,
              url: URL.createObjectURL(file)
          });
      }

      setPlaylist(prev => [...prev, ...newTracks]);
      speak(`${files.length} tracks added to database.`);
      
      if (currentTrack === -1) setCurrentTrack(0);
    }
  };

  const handleDelete = async (index) => {
      const track = playlist[index];
      await deleteTrack(track.id); // Remove from DB
      const newPlaylist = [...playlist];
      newPlaylist.splice(index, 1);
      setPlaylist(newPlaylist);
      if (currentTrack >= index && currentTrack > 0) setCurrentTrack(currentTrack - 1);
  };

  // Playback Logic
  useEffect(() => {
    if (currentTrack >= 0 && currentTrack < playlist.length) {
      if (audioRef.current) {
        audioRef.current.src = playlist[currentTrack].url;
        if(isPlaying) audioRef.current.play(); // Only auto-play if we were already playing or just clicked
      }
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current || currentTrack === -1) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (currentTrack < playlist.length - 1) setCurrentTrack(prev => prev + 1);
    else setCurrentTrack(0);
  };

  const prevTrack = () => {
    if (currentTrack > 0) setCurrentTrack(prev => prev - 1);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
      setDuration(audioRef.current.duration || 0);
    }
  };

  const formatTime = (time) => {
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec < 10 ? '0' + sec : sec}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-slide-up">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-cyan/30">
        <div className="flex items-center gap-3">
            <i className="fas fa-music text-cyan text-xl animate-pulse"></i>
            <h2 className="text-cyan font-orbitron text-xl tracking-widest">MEDIA DECK</h2>
        </div>
        <button onClick={() => { playSound('click'); setActiveMode("MENU_OPEN"); }} className="text-cyan hover:text-white">
          <i className="fas fa-times text-2xl"></i>
        </button>
      </div>

      {/* Visualizer */}
      <div className="p-6 flex flex-col items-center justify-center border-b border-cyan/10 bg-cyan/5">
        <div className="w-32 h-32 rounded-full border-4 border-cyan/30 flex items-center justify-center mb-4 relative">
            <div className={`absolute inset-0 border-t-4 border-cyan rounded-full ${isPlaying ? 'animate-spin' : ''}`}></div>
            <i className="fas fa-compact-disc text-5xl text-cyan/50"></i>
        </div>
        <h3 className="text-cyan font-bold text-lg text-center truncate w-full max-w-xs">
            {currentTrack !== -1 ? playlist[currentTrack].name : "NO MEDIA LOADED"}
        </h3>
        <p className="text-cyan-dim font-mono text-xs mt-1">
            {formatTime(currentTime)} / {formatTime(duration)}
        </p>
        <div className="w-full max-w-xs h-1 bg-cyan/20 mt-4 rounded-full overflow-hidden">
            <div className="h-full bg-cyan transition-all duration-300" style={{ width: `${(currentTime / duration) * 100}%` }}></div>
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <div className="flex flex-col gap-2">
                {playlist.map((track, index) => (
                    <div key={track.id} className={`p-3 border rounded flex items-center gap-3 ${currentTrack === index ? 'border-cyan bg-cyan/20 text-cyan' : 'border-white/5 text-gray-500'}`}>
                        <button onClick={() => { setCurrentTrack(index); setIsPlaying(true); }} className="flex-1 text-left truncate">
                            {index + 1}. {track.name}
                        </button>
                        <button onClick={() => handleDelete(index)} className="text-red-500 hover:text-white"><i className="fas fa-trash"></i></button>
                    </div>
                ))}
            </div>
      </div>

      {/* Controls */}
      <div className="p-6 pb-10 border-t border-cyan/30 bg-black flex flex-col gap-4">
        <input type="file" id="audio-upload" multiple accept="audio/*" className="hidden" onChange={handleFileUpload} />
        <button onClick={() => document.getElementById('audio-upload').click()} className="w-full py-3 border border-dashed border-cyan/50 text-cyan/50 font-mono text-xs">+ IMPORT AUDIO FILES</button>
        <div className="flex justify-between items-center px-4">
            <button onClick={prevTrack} className="text-cyan hover:text-white"><i className="fas fa-step-backward text-2xl"></i></button>
            <button onClick={togglePlay} className="w-16 h-16 rounded-full bg-cyan text-black flex items-center justify-center shadow-[0_0_20px_#00E5FF]">
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-2xl`}></i>
            </button>
            <button onClick={nextTrack} className="text-cyan hover:text-white"><i className="fas fa-step-forward text-2xl"></i></button>
        </div>
      </div>
      <audio ref={audioRef} onTimeUpdate={handleTimeUpdate} onEnded={nextTrack} />
    </div>
  );
};

export default MediaPanel;