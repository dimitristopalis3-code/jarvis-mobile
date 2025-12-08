import React, { useState, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';
import * as faceapi from 'face-api.js';

const DatabasePanel = () => {
  const { faceDatabase, deletePerson, updatePerson, addPerson, clearDatabase, setActiveMode, playSound, speak } = useJarvis();

  // Mode: 'LIST', 'EDIT', 'ADD'
  const [viewMode, setViewMode] = useState('LIST');
  const [editingIndex, setEditingIndex] = useState(null);
  
  // Form State
  const [formData, setFormData] = useState({ name: '', gender: 'Male', age: '', accessLevel: 'No Access' });
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  // Helper: Open Edit Mode
  const handleEditClick = (index) => {
    const person = faceDatabase[index];
    setFormData({
        name: person.name,
        gender: person.gender || 'Male',
        age: person.age || '',
        accessLevel: person.accessLevel || 'No Access',
        descriptor: person.descriptor // Keep existing biometrics
    });
    setHasBiometrics(!!person.descriptor);
    setEditingIndex(index);
    setViewMode('EDIT');
  };

  // Helper: Open Add Mode
  const handleAddClick = () => {
    setFormData({ name: '', gender: 'Male', age: '', accessLevel: 'No Access' });
    setHasBiometrics(false);
    setViewMode('ADD');
  };

  // Helper: Save
  const handleSave = () => {
    if(!formData.name) return speak("Name is required.");
    
    if (viewMode === 'ADD') {
        addPerson(formData);
    } else {
        updatePerson(editingIndex, formData);
    }
    setViewMode('LIST');
  };

  // PHOTO ANALYSIS LOGIC
  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsProcessingPhoto(true);
    speak("Analyzing photo for biometric data...");

    try {
        // 1. Load Models (if not already loaded globally)
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL)
        ]);

        // 2. Process Image
        const img = await faceapi.bufferToImage(file);
        const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
            setFormData(prev => ({ ...prev, descriptor: detection.descriptor }));
            setHasBiometrics(true);
            speak("Face detected and encoded.");
        } else {
            speak("No valid face found in this image.");
        }
    } catch (err) {
        console.error(err);
        speak("Analysis failed.");
    }
    setIsProcessingPhoto(false);
  };

  // Helper: Get Color
  const getAccessColor = (level) => {
    if (level === 'Admin') return 'text-green-500 border-green-500/50 bg-green-500/10';
    if (level === 'Medium') return 'text-orange-500 border-orange-500/50 bg-orange-500/10';
    if (level === 'Missing') return 'text-blue-500 border-blue-500/50 bg-blue-500/10';
    return 'text-gray-400 border-gray-500/50 bg-gray-500/10';
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-xl flex flex-col animate-slide-up">
      
      {/* HEADER */}
      <div className="flex justify-between items-center p-6 border-b border-cyan/30">
        <div className="flex items-center gap-3">
            <i className="fas fa-database text-cyan text-xl animate-pulse"></i>
            <h2 className="text-cyan font-orbitron text-xl tracking-widest">
                {viewMode === 'LIST' ? 'IDENTITY RECORDS' : viewMode === 'ADD' ? 'NEW ENTRY' : 'EDIT RECORD'}
            </h2>
        </div>
        <button 
          onClick={() => { playSound('click'); viewMode === 'LIST' ? setActiveMode("HOME") : setViewMode('LIST'); }}
          className="text-cyan hover:text-white"
        >
          <i className={`fas ${viewMode === 'LIST' ? 'fa-times' : 'fa-arrow-left'} text-2xl`}></i>
        </button>
      </div>

      {/* --- LIST MODE --- */}
      {viewMode === 'LIST' && (
        <>
           <div className="p-4 border-b border-cyan/10 flex justify-between">
              <span className="text-cyan-dim font-mono text-xs pt-2">RECORDS: {faceDatabase.length}</span>
              <button 
                onClick={() => { playSound('click'); handleAddClick(); }}
                className="px-4 py-2 bg-cyan/10 border border-cyan text-cyan font-orbitron text-xs hover:bg-cyan/30"
              >
                + ADD MANUAL ENTRY
              </button>
           </div>

           <div className="flex-1 overflow-y-auto p-4 no-scrollbar flex flex-col gap-3">
              {faceDatabase.length === 0 ? (
                 <div className="text-center text-cyan-dim mt-20 opacity-50">DATABASE EMPTY</div>
              ) : (
                 faceDatabase.map((person, index) => (
                    <div key={index} className={`p-4 border rounded-lg flex justify-between items-center ${getAccessColor(person.accessLevel)}`}>
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full border flex items-center justify-center">
                                <i className={`fas ${person.descriptor ? 'fa-fingerprint' : 'fa-user'} text-lg`}></i>
                            </div>
                            <div>
                                <div className="font-bold">{person.name.toUpperCase()}</div>
                                <div className="text-xs opacity-70">{person.gender} | {person.age} | {person.accessLevel}</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                             <button onClick={() => handleEditClick(index)} className="w-8 h-8 border rounded hover:bg-white/10"><i className="fas fa-pen text-xs"></i></button>
                             <button onClick={() => deletePerson(index)} className="w-8 h-8 border border-red-500/50 text-red-500 hover:bg-red-500/20"><i className="fas fa-trash text-xs"></i></button>
                        </div>
                    </div>
                 ))
              )}
           </div>
        </>
      )}

      {/* --- EDIT / ADD MODE --- */}
      {viewMode !== 'LIST' && (
         <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
            
            {/* 1. PHOTO UPLOAD SECTION */}
            <div className="p-4 border border-cyan/30 rounded bg-cyan/5 text-center">
                <div className={`w-20 h-20 mx-auto rounded-full border-2 flex items-center justify-center mb-2 ${hasBiometrics ? 'border-green-500 text-green-500' : 'border-cyan/30 text-cyan/30'}`}>
                    {isProcessingPhoto ? <i className="fas fa-circle-notch fa-spin text-2xl"></i> : <i className="fas fa-fingerprint text-3xl"></i>}
                </div>
                <div className="font-mono text-xs mb-3">
                    {hasBiometrics ? "BIOMETRIC DATA LINKED" : "NO BIOMETRIC DATA"}
                </div>
                
                <input type="file" id="face-upload" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                <button 
                    onClick={() => document.getElementById('face-upload').click()}
                    disabled={isProcessingPhoto}
                    className="px-4 py-2 border border-cyan text-cyan font-mono text-xs hover:bg-cyan/10"
                >
                    {hasBiometrics ? "UPDATE PHOTO" : "UPLOAD PHOTO FOR SCAN"}
                </button>
                <div className="text-[10px] text-cyan-dim mt-2">
                    * Uploading a clear face photo allows JARVIS to recognize this person in the field.
                </div>
            </div>

            {/* 2. TEXT FIELDS */}
            <div className="flex flex-col gap-4">
                <div>
                    <label className="block text-cyan-dim font-mono text-xs mb-1">FULL NAME</label>
                    <input 
                        type="text" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-black border border-cyan/30 p-3 text-cyan font-orbitron focus:border-cyan outline-none"
                        placeholder="ENTER NAME"
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-cyan-dim font-mono text-xs mb-1">GENDER</label>
                        <select 
                            value={formData.gender}
                            onChange={e => setFormData({...formData, gender: e.target.value})}
                            className="w-full bg-black border border-cyan/30 p-3 text-cyan font-mono outline-none"
                        >
                            <option value="Male">MALE</option>
                            <option value="Female">FEMALE</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-cyan-dim font-mono text-xs mb-1">AGE</label>
                        <input 
                            type="number" 
                            value={formData.age}
                            onChange={e => setFormData({...formData, age: e.target.value})}
                            className="w-full bg-black border border-cyan/30 p-3 text-cyan font-mono outline-none"
                            placeholder="00"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-cyan-dim font-mono text-xs mb-1">ACCESS LEVEL</label>
                    <select 
                        value={formData.accessLevel}
                        onChange={e => setFormData({...formData, accessLevel: e.target.value})}
                        className="w-full bg-black border border-cyan/30 p-3 text-cyan font-mono outline-none"
                    >
                        <option value="No Access">NO ACCESS (GREY)</option>
                        <option value="Medium">MEDIUM (ORANGE)</option>
                        <option value="Admin">ADMIN (GREEN)</option>
                        <option value="Missing">MISSING PERSON (BLUE)</option>
                    </select>
                </div>
            </div>

            {/* SAVE BUTTON */}
            <button 
                onClick={handleSave}
                className="mt-4 w-full py-4 bg-cyan/20 border border-cyan text-cyan font-bold font-orbitron tracking-widest hover:bg-cyan/40"
            >
                SAVE RECORD
            </button>
         </div>
      )}

    </div>
  );
};

export default DatabasePanel;