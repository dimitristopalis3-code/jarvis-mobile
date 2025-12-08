import React, { useRef, useEffect, useState } from 'react';
import { useJarvis } from '../context/JarvisContext';
import * as faceapi from 'face-api.js';

const VisionModule = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const { setActiveMode, speak, playSound, conversationState, triggerInterview, faceDatabase, isListening, toggleListening } = useJarvis();
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanTimer, setScanTimer] = useState(0);
  
  // COOLDOWN FOR WARNINGS (So he doesn't spam)
  const lastWarningTime = useRef(0);

  // 1. LOAD MODELS
  useEffect(() => {
    const loadModels = async () => {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL) 
        ]);
        setModelsLoaded(true);
      } catch (e) {
        speak("Neural network connection failed.");
      }
    };
    loadModels();
  }, []);

  // 2. START CAMERA
  useEffect(() => {
    let stream = null;
    const startCam = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' }, audio: false 
        });
        if (videoRef.current) {
            videoRef.current.srcObject = stream;
        }
      } catch (e) { speak("Camera malfunction."); }
    };
    startCam();
    return () => { if(stream) stream.getTracks().forEach(t => t.stop()); }
  }, []);

  // 3. DRAW REACTOR LOCK (Primary Target)
  const drawReactorLock = (ctx, x, y, w, h, color, time) => {
    const centerX = x + w/2;
    const centerY = y + h/2;
    const radius = Math.max(w, h) * 0.6; 

    ctx.save();
    ctx.translate(centerX, centerY);

    // Inner Ring
    ctx.beginPath();
    ctx.rotate(time * 0.05);
    ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.stroke();
    
    // Outer Brackets
    ctx.rotate(-time * 0.1); 
    const bracketSize = radius * 1.2;
    ctx.lineWidth = 5;
    ctx.setLineDash([]); 
    for(let i=0; i<3; i++) {
        ctx.rotate((Math.PI * 2) / 3);
        ctx.beginPath();
        ctx.arc(0, 0, bracketSize, 0, 1.0); 
        ctx.stroke();
    }

    // Crosshair
    ctx.resetTransform();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 20, centerY); ctx.lineTo(centerX + 20, centerY);
    ctx.moveTo(centerX, centerY - 20); ctx.lineTo(centerX, centerY + 20);
    ctx.stroke();
    ctx.restore();
  };

  // 4. DRAW BRACKETS (Background Targets)
  const drawSimpleBracket = (ctx, x, y, w, h, color, isHighAlert = false) => {
    const lineLen = w * 0.2;
    
    ctx.save();
    
    if (isHighAlert) {
        // FLASHING EFFECT for Missing Persons
        const flash = Math.sin(Date.now() / 100); // Fast pulse
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20 * Math.abs(flash);
        ctx.shadowColor = color;
        ctx.strokeStyle = `rgba(0, 68, 255, ${Math.abs(flash) + 0.5})`; // Blue pulse
    } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 0;
    }

    ctx.beginPath();
    // Corners
    ctx.moveTo(x, y + lineLen); ctx.lineTo(x, y); ctx.lineTo(x + lineLen, y);
    ctx.moveTo(x + w - lineLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + lineLen);
    ctx.moveTo(x + w, y + h - lineLen); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - lineLen, y + h);
    ctx.moveTo(x + lineLen, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - lineLen);
    ctx.stroke();
    
    ctx.restore();
  };

  // 5. DETECTION LOOP
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;
    
    const interval = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState === 4 && canvasRef.current) {
        
        // A. DETECT
        const detections = await faceapi.detectAllFaces(
            videoRef.current, 
            new faceapi.TinyFaceDetectorOptions()
        ).withFaceLandmarks().withFaceDescriptors();

        const ctx = canvasRef.current.getContext('2d');
        const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
        
        canvasRef.current.width = displaySize.width;
        canvasRef.current.height = displaySize.height;
        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        ctx.clearRect(0, 0, displaySize.width, displaySize.height);

        // B. FIND PRIMARY
        let primaryTargetIndex = -1;
        let maxArea = 0;
        let missingPersonDetected = false; // Flag for audio warning

        resizedDetections.forEach((d, i) => {
            const area = d.detection.box.width * d.detection.box.height;
            if (area > maxArea) {
                maxArea = area;
                primaryTargetIndex = i;
            }
        });

        // C. LOOP THROUGH FACES
        resizedDetections.forEach((detection, index) => {
            const box = detection.detection.box;
            const isPrimary = (index === primaryTargetIndex);
            
            // RECOGNITION
            let bestMatch = { name: "Unknown", accessLevel: "No Access", distance: 1.0 };
            if (faceDatabase.length > 0) {
                faceDatabase.forEach(person => {
                    if (person.descriptor) {
                        const storedDescriptor = new Float32Array(Object.values(person.descriptor));
                        const dist = faceapi.euclideanDistance(detection.descriptor, storedDescriptor);
                        if (dist < 0.6 && dist < bestMatch.distance) {
                            bestMatch = { ...person, distance: dist };
                        }
                    }
                });
            }

            // COLOR LOGIC
            let lockColor = '#888888'; 
            if (conversationState === "SCANNING" && isPrimary) lockColor = '#FFFFFF'; 
            else {
                 if (bestMatch.accessLevel === 'Admin') lockColor = '#00FF00'; 
                 else if (bestMatch.accessLevel === 'Medium') lockColor = '#FFA500'; 
                 else if (bestMatch.accessLevel === 'Missing') lockColor = '#0044FF'; 
            }

            // WARNING CHECK
            if (bestMatch.accessLevel === 'Missing') {
                missingPersonDetected = true;
            }

            // D. DRAW VISUALS
            if (isPrimary) {
                // REACTOR LOCK
                const time = Date.now() / 20; 
                drawReactorLock(ctx, box.x, box.y, box.width, box.height, lockColor, time);
                
                // INFO PANEL
                const infoX = box.x + box.width + 20;
                const infoY = box.y;
                if (bestMatch.name !== "Unknown" || conversationState === "SCANNING") {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(infoX, infoY, 160, 90);
                    ctx.strokeStyle = lockColor;
                    ctx.strokeRect(infoX, infoY, 160, 90);
                    ctx.font = 'bold 12px Orbitron';
                    ctx.fillStyle = lockColor;
                    ctx.fillText(bestMatch.name.toUpperCase(), infoX + 10, infoY + 25);
                    ctx.font = '10px Share Tech Mono';
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillText(`ACCESS: ${bestMatch.accessLevel ? bestMatch.accessLevel.toUpperCase() : 'SCANNING...'}`, infoX + 10, infoY + 45);
                    if(bestMatch.age) ctx.fillText(`AGE: ${bestMatch.age}`, infoX + 10, infoY + 60);
                }

                // SCAN INTERACTION
                if (conversationState === "SCANNING") {
                    setScanTimer(prev => prev + 1);
                    ctx.fillStyle = '#00E5FF';
                    ctx.fillRect(box.x, box.y - 15, box.width * (scanTimer / 20), 8);
                    if (scanTimer > 20) { 
                        setScanTimer(0);
                        triggerInterview(detection.descriptor);
                    }
                } else {
                    setScanTimer(0);
                }

            } else {
                // BACKGROUND BRACKETS
                // Pass 'true' if Missing Person to trigger the pulse effect
                drawSimpleBracket(ctx, box.x, box.y, box.width, box.height, lockColor, bestMatch.accessLevel === 'Missing');
                
                // FLOATING NAME
                ctx.font = 'bold 10px Orbitron';
                ctx.fillStyle = lockColor;
                const label = bestMatch.name !== "Unknown" ? bestMatch.name.toUpperCase() : "UNKNOWN";
                ctx.fillText(label, box.x, box.y - 5);
                
                // Warning Label for Missing
                if (bestMatch.accessLevel === 'Missing') {
                    ctx.fillStyle = '#0044FF';
                    ctx.font = 'bold 12px Orbitron';
                    ctx.fillText("⚠ MATCH FOUND", box.x, box.y - 20);
                }
            }
        });

        // E. AUDIO WARNING LOGIC
        if (missingPersonDetected) {
            const now = Date.now();
            // Warn if it has been more than 15 seconds since last warning
            if (now - lastWarningTime.current > 15000) {
                speak("Alert, Sir. Missing person detected in sector.", false); // False = don't auto-listen
                playSound('startup'); // Use startup sound as an alert chime
                lastWarningTime.current = now;
            }
        }
        
        if (resizedDetections.length === 0) setScanTimer(0);
      }
    }, 100); 

    return () => clearInterval(interval);
  }, [modelsLoaded, faceDatabase, conversationState, scanTimer, triggerInterview]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/60 border border-cyan px-4 py-2 rounded text-cyan font-orbitron text-xs backdrop-blur-md">
          {!modelsLoaded ? "LOADING AI CORE..." : 
           conversationState === "IDLE" ? "MULTI-TARGET TRACKING ACTIVE" : "PRIORITY SCAN IN PROGRESS"}
      </div>

      <div className="absolute bottom-10 z-50 flex gap-4">
         <button onClick={toggleListening} className={`w-14 h-14 rounded-full border flex items-center justify-center backdrop-blur-md transition-all ${isListening ? 'bg-red-500/50 border-red-500 animate-pulse' : 'bg-black/60 border-cyan text-cyan'}`}>
           <i className="fas fa-microphone text-xl"></i>
         </button>
         <button onClick={() => { playSound('click'); setActiveMode("HOME"); }} className="w-14 h-14 rounded-full bg-black/60 border border-red-500 text-red-500 flex items-center justify-center backdrop-blur-md">
           <i className="fas fa-times text-xl"></i>
         </button>
      </div>
    </div>
  );
};

export default VisionModule;