import React, { useRef, useState, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';

const MediaPanel = () => {
  const { setActiveMode, speak, playSound } = useJarvis();
  const audioRef = useRef(null);
  const [playlist, setPlaylist] = useState([]);
  const [currentTrack, setCurrentTrack] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Handle File Upload
  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      const newTracks = files.map(file => ({
        name: file.name.replace(/\.[^/.]+$/, ""), // Remove extension
        url: URL.createObjectURL(file),
        file: file
      }));
      setPlaylist(prev => [...prev, ...newTracks]);
      speak(`${files.length} tracks added to database.`);
      
      // Auto play if first track
      if (currentTrack === -1) {
        setCurrentTrack(playlist.length); // Points to the first new track
      }
    }
  };

  // Playback Logic
  useEffect(() => {
    if (currentTrack >= 0 && currentTrack < playlist.length) {
      if (audioRef.current) {
        audioRef.current.src = playlist[currentTrack].url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  }, [currentTrack]);

  const togglePlay = () => {
    if (!audioRef.current || currentTrack === -1) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const nextTrack = () => {
    if (currentTrack < playlist.length - 1) {
      setCurrentTrack(prev => prev + 1);
    } else {
      setCurrentTrack(0); // Loop
    }
  };

  const prevTrack = () => {
    if (currentTrack > 0) {
      setCurrentTrack(prev => prev - 1);
    }
  };

  // Progress Bar Update
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
        <button 
          onClick={() => { playSound('click'); setActiveMode("HOME"); }}
          className="text-cyan hover:text-white"
        >
          <i className="fas fa-times text-2xl"></i>
        </button>
      </div>

      {/* Visualizer / Current Track Info */}
      <div className="p-6 flex flex-col items-center justify-center border-b border-cyan/10 bg-cyan/5">
        <div className="w-32 h-32 rounded-full border-4 border-cyan/30 flex items-center justify-center mb-4 relative">
            {/* Spinning Disc Effect */}
            <div className={`absolute inset-0 border-t-4 border-cyan rounded-full ${isPlaying ? 'animate-spin' : ''}`}></div>
            <i className="fas fa-compact-disc text-5xl text-cyan/50"></i>
        </div>
        
        <h3 className="text-cyan font-bold text-lg text-center truncate w-full max-w-xs">
            {currentTrack !== -1 ? playlist[currentTrack].name : "NO MEDIA LOADED"}
        </h3>
        <p className="text-cyan-dim font-mono text-xs mt-1">
            {formatTime(currentTime)} / {formatTime(duration)}
        </p>
        
        {/* Progress Bar */}
        <div className="w-full max-w-xs h-1 bg-cyan/20 mt-4 rounded-full overflow-hidden">
            <div 
                className="h-full bg-cyan transition-all duration-300" 
                style={{ width: `${(currentTime / duration) * 100}%` }}
            ></div>
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
        {playlist.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-cyan-dim opacity-50">
                <i className="fas fa-folder-open text-4xl mb-2"></i>
                <span className="font-mono text-xs">DATABASE EMPTY</span>
            </div>
        ) : (
            <div className="flex flex-col gap-2">
                {playlist.map((track, index) => (
                    <button
                        key={index}
                        onClick={() => setCurrentTrack(index)}
                        className={`p-3 text-left font-mono text-sm border rounded flex items-center gap-3 transition-all ${currentTrack === index ? 'border-cyan bg-cyan/20 text-cyan' : 'border-white/5 text-gray-500 hover:border-cyan/50'}`}
                    >
                        <span className="text-xs opacity-50">{index + 1}</span>
                        <span className="truncate flex-1">{track.name}</span>
                        {currentTrack === index && <i className="fas fa-volume-up animate-pulse"></i>}
                    </button>
                ))}
            </div>
        )}
      </div>

      {/* Controls */}
      <div className="p-6 pb-10 border-t border-cyan/30 bg-black flex flex-col gap-4">
        {/* Hidden File Input */}
        <input 
            type="file" 
            id="audio-upload" 
            multiple 
            accept="audio/*" 
            className="hidden" 
            onChange={handleFileUpload}
        />
        
        <button 
            onClick={() => document.getElementById('audio-upload').click()}
            className="w-full py-3 border border-dashed border-cyan/50 text-cyan/50 font-mono text-xs hover:bg-cyan/10 hover:text-cyan hover:border-cyan transition-all"
        >
            + IMPORT AUDIO FILES
        </button>

        <div className="flex justify-between items-center px-4">
            <button onClick={prevTrack} className="text-cyan hover:text-white active:scale-90"><i className="fas fa-step-backward text-2xl"></i></button>
            <button 
                onClick={togglePlay} 
                className="w-16 h-16 rounded-full bg-cyan text-black flex items-center justify-center shadow-[0_0_20px_#00E5FF] hover:scale-105 active:scale-95 transition-all"
            >
                <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'} text-2xl`}></i>
            </button>
            <button onClick={nextTrack} className="text-cyan hover:text-white active:scale-90"><i className="fas fa-step-forward text-2xl"></i></button>
        </div>
      </div>

      {/* Actual Audio Element (Hidden) */}
      <audio 
        ref={audioRef} 
        onTimeUpdate={handleTimeUpdate} 
        onEnded={nextTrack}
      />
    </div>
  );
};

export default MediaPanel;