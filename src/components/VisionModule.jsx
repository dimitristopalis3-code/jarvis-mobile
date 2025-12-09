import React, { useRef, useEffect, useState } from 'react';
import { useJarvis } from '../context/JarvisContext';
import * as faceapi from 'face-api.js';

const VisionModule = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isMounted = useRef(true); // Track if component is active
  
  const { setActiveMode, speak, playSound, conversationState, triggerInterview, faceDatabase, isListening, toggleListening } = useJarvis();
  
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [scanTimer, setScanTimer] = useState(0);
  const [facingMode, setFacingMode] = useState('environment'); 
  
  const lastWarningTime = useRef(0);

  // 1. OPTIMIZED MODEL LOADING
  useEffect(() => {
    isMounted.current = true;
    const loadModels = async () => {
      const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
      try {
        await Promise.all([
          // We prioritize the Tiny models for Mobile Speed
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(MODEL_URL), // Lighter landmarks
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL) 
        ]);
        if(isMounted.current) setModelsLoaded(true);
      } catch (e) {
        if(isMounted.current) speak("Neural network connection failed.");
      }
    };
    loadModels();
    return () => { isMounted.current = false; };
  }, []);

  // 2. START CAMERA (Optimized Resolution)
  useEffect(() => {
    let stream = null;
    const startCam = async () => {
      if (videoRef.current && videoRef.current.srcObject) {
         videoRef.current.srcObject.getTracks().forEach(t => t.stop());
      }
      try {
        // FORCE LOW RESOLUTION (640x480) for performance
        // Mobile screens are small; high res just eats battery and CPU
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                facingMode: facingMode,
                width: { ideal: 640 }, 
                height: { ideal: 480 },
                frameRate: { ideal: 30 }
            }, 
            audio: false 
        });
        if (videoRef.current && isMounted.current) {
            videoRef.current.srcObject = stream;
        }
      } catch (e) { if(isMounted.current) speak("Camera malfunction."); }
    };
    startCam();
    return () => { if(stream) stream.getTracks().forEach(t => t.stop()); }
  }, [facingMode]);

  // Toggle Camera
  const toggleCamera = () => {
    playSound('click');
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  // 3. DRAW REACTOR LOCK
  const drawReactorLock = (ctx, x, y, w, h, color, time) => {
    const centerX = x + w/2;
    const centerY = y + h/2;
    const radius = Math.max(w, h) * 0.6; 

    ctx.save();
    ctx.translate(centerX, centerY);
    if(facingMode === 'user') ctx.scale(-1, 1); 

    ctx.beginPath();
    ctx.rotate(time * 0.05);
    ctx.arc(0, 0, radius * 0.8, 0, Math.PI * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 5]);
    ctx.shadowBlur = 10;
    ctx.shadowColor = color;
    ctx.stroke();
    
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

  // 4. DRAW BRACKETS
  const drawSimpleBracket = (ctx, x, y, w, h, color, isHighAlert = false) => {
    const lineLen = w * 0.2;
    ctx.save();
    if (isHighAlert) {
        const flash = Math.sin(Date.now() / 100);
        ctx.lineWidth = 4;
        ctx.shadowBlur = 20 * Math.abs(flash);
        ctx.shadowColor = color;
        ctx.strokeStyle = `rgba(0, 68, 255, ${Math.abs(flash) + 0.5})`;
    } else {
        ctx.lineWidth = 2;
        ctx.strokeStyle = color;
        ctx.shadowBlur = 0;
    }
    ctx.beginPath();
    ctx.moveTo(x, y + lineLen); ctx.lineTo(x, y); ctx.lineTo(x + lineLen, y);
    ctx.moveTo(x + w - lineLen, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + lineLen);
    ctx.moveTo(x + w, y + h - lineLen); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w - lineLen, y + h);
    ctx.moveTo(x + lineLen, y + h); ctx.lineTo(x, y + h); ctx.lineTo(x, y + h - lineLen);
    ctx.stroke();
    ctx.restore();
  };

  // 5. OPTIMIZED DETECTION LOOP
  useEffect(() => {
    if (!modelsLoaded || !videoRef.current) return;
    
    let isProcessing = false;
    let animationId;

    // We use TinyFaceDetectorOptions with smaller input size for Speed
    // inputSize: 320 is much faster than default 416 or 512
    const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

    const detect = async () => {
      if (!isMounted.current) return;
      
      // Prevent backlog: If previous scan is still running, skip this frame
      if (isProcessing) {
          animationId = requestAnimationFrame(detect);
          return;
      }

      isProcessing = true;

      if (videoRef.current && videoRef.current.readyState === 4 && canvasRef.current) {
        
        try {
            // A. DETECT
            const detections = await faceapi.detectAllFaces(videoRef.current, detectorOptions)
                .withFaceLandmarks(true) // Use Tiny Landmarks if available
                .withFaceDescriptors();

            if (!isMounted.current) return;

            const ctx = canvasRef.current.getContext('2d');
            const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
            
            canvasRef.current.width = displaySize.width;
            canvasRef.current.height = displaySize.height;
            
            // MIRROR CONTEXT IF SELFIE MODE
            if (facingMode === 'user') {
                ctx.translate(displaySize.width, 0);
                ctx.scale(-1, 1);
            }

            const resizedDetections = faceapi.resizeResults(detections, displaySize);
            ctx.clearRect(0, 0, displaySize.width, displaySize.height);

            // B. FIND PRIMARY
            let primaryTargetIndex = -1;
            let maxArea = 0;
            let missingPersonDetected = false;

            resizedDetections.forEach((d, i) => {
                const area = d.detection.box.width * d.detection.box.height;
                if (area > maxArea) { maxArea = area; primaryTargetIndex = i; }
            });

            // C. LOOP
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

                // COLOR
                let lockColor = '#888888'; 
                if (conversationState === "SCANNING" && isPrimary) lockColor = '#FFFFFF'; 
                else {
                    if (bestMatch.accessLevel === 'Admin') lockColor = '#00FF00'; 
                    else if (bestMatch.accessLevel === 'Medium') lockColor = '#FFA500'; 
                    else if (bestMatch.accessLevel === 'Missing') lockColor = '#0044FF'; 
                }
                if (bestMatch.accessLevel === 'Missing') missingPersonDetected = true;

                // DRAW
                if (isPrimary) {
                    const time = Date.now() / 20; 
                    drawReactorLock(ctx, box.x, box.y, box.width, box.height, lockColor, time);
                    
                    // INFO
                    ctx.save();
                    if (facingMode === 'user') { ctx.scale(-1, 1); ctx.translate(-(box.x * 2 + box.width + 180), 0); }
                    
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
                    ctx.restore();

                    if (conversationState === "SCANNING") {
                        setScanTimer(prev => prev + 1);
                        ctx.fillStyle = '#00E5FF';
                        ctx.fillRect(box.x, box.y - 15, box.width * (scanTimer / 20), 8);
                        if (scanTimer > 20) { setScanTimer(0); triggerInterview(detection.descriptor); }
                    } else { setScanTimer(0); }

                } else {
                    drawSimpleBracket(ctx, box.x, box.y, box.width, box.height, lockColor, bestMatch.accessLevel === 'Missing');
                    ctx.save();
                    if (facingMode === 'user') { ctx.scale(-1, 1); ctx.translate(-(box.x * 2 + box.width), 0); }
                    ctx.font = 'bold 10px Orbitron';
                    ctx.fillStyle = lockColor;
                    const label = bestMatch.name !== "Unknown" ? bestMatch.name.toUpperCase() : "UNKNOWN";
                    ctx.fillText(label, box.x, box.y - 5);
                    if (bestMatch.accessLevel === 'Missing') {
                        ctx.fillStyle = '#0044FF';
                        ctx.font = 'bold 12px Orbitron';
                        ctx.fillText("⚠ MATCH FOUND", box.x, box.y - 20);
                    }
                    ctx.restore();
                }
            });

            // E. WARNING
            if (missingPersonDetected) {
                const now = Date.now();
                if (now - lastWarningTime.current > 15000) {
                    speak("Alert, Sir. Missing person detected in sector.", false);
                    playSound('startup');
                    lastWarningTime.current = now;
                }
            }
            
            if (resizedDetections.length === 0) setScanTimer(0);

        } catch(e) {
            console.log("Detection skip", e);
        }
      }
      
      isProcessing = false;
      animationId = requestAnimationFrame(detect);
    };

    detect();
    return () => cancelAnimationFrame(animationId);
  }, [modelsLoaded, faceDatabase, conversationState, scanTimer, triggerInterview, facingMode]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <video ref={videoRef} autoPlay playsInline muted className={`absolute inset-0 w-full h-full object-cover ${facingMode === 'user' ? 'scale-x-[-1]' : ''}`} />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full object-cover pointer-events-none" />
      
      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-black/60 border border-cyan px-4 py-2 rounded text-cyan font-orbitron text-xs backdrop-blur-md">
          {!modelsLoaded ? "LOADING AI CORE..." : 
           conversationState === "IDLE" ? "MULTI-TARGET TRACKING ACTIVE" : "PRIORITY SCAN IN PROGRESS"}
      </div>

      <div className="absolute bottom-10 z-50 flex gap-4">
         
         {/* CAM SWITCH BUTTON */}
         <button 
            onClick={toggleCamera}
            className="w-14 h-14 rounded-full bg-black/60 border border-cyan text-cyan flex items-center justify-center backdrop-blur-md hover:bg-cyan/20 active:scale-90 transition-all"
         >
           <i className="fas fa-sync-alt text-xl"></i>
         </button>

         {/* MIC BUTTON */}
         <button 
            onClick={toggleListening}
            className={`w-14 h-14 rounded-full border flex items-center justify-center backdrop-blur-md transition-all ${isListening ? 'bg-red-500/50 border-red-500 animate-pulse' : 'bg-black/60 border-cyan text-cyan'}`}
         >
           <i className="fas fa-microphone text-xl"></i>
         </button>

         {/* CLOSE BUTTON */}
         <button onClick={() => { playSound('click'); setActiveMode("HOME"); }} className="w-14 h-14 rounded-full bg-black/60 border border-red-500 text-red-500 flex items-center justify-center backdrop-blur-md">
           <i className="fas fa-times text-xl"></i>
         </button>
      </div>
    </div>
  );
};

export default VisionModule;