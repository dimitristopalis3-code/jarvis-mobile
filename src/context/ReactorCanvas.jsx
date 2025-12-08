import React, { useRef, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';

const ReactorCanvas = () => {
  const canvasRef = useRef(null);
  // Grab state to influence pulse/speed if desired later, though not strictly needed for the rotation pattern
  const { isSpeaking, isListening, activeMode } = useJarvis();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let time = 0;

    // T-Force Color Palette based on reference image
    const colors = {
      cyan: '#00E5FF',
      cyanBright: '#E0FFFF',
      cyanDim: 'rgba(0, 229, 255, 0.2)',
      white: '#FFFFFF',
      orange: '#FF8C00', // A slightly deeper, glowing orange
      alert: '#FF0000'
    };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();

    // Helper to draw rings easily
    const drawRing = (radius, width, color, glow = 0, dash = []) => {
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = width;
        ctx.shadowBlur = glow;
        ctx.shadowColor = color;
        ctx.setLineDash(dash);
        ctx.stroke();
        ctx.setLineDash([]); // Reset dash
    };

    const draw = () => {
      time++;
      const width = canvas.width;
      const height = canvas.height;
      const centerX = width / 2;
      const centerY = height / 2;
      // Base scale
      const s = Math.min(width, height) * (width < 768 ? 0.35 : 0.25); 
      
      ctx.clearRect(0, 0, width, height);
      ctx.translate(centerX, centerY);

      const baseSpeed = 0.0015;
      const t = time * baseSpeed;

      // Define main color based on mode
      const mainColor = activeMode === 'WARNING' ? colors.alert : colors.cyan;
      const accentColor = activeMode === 'WARNING' ? colors.alert : colors.white;

      // --- LAYER 1 (OUTERMOST): Ticks ---
      // Rotation: Clockwise
      ctx.save();
      ctx.rotate(t);
      for (let i = 0; i < 72; i++) { // More ticks for detailed look
        ctx.rotate((Math.PI * 2) / 72);
        ctx.beginPath();
        // Alternating tick lengths for detail
        const tickLen = i % 4 === 0 ? 1.15 : 1.1;
        ctx.moveTo(s * 1.05, 0);
        ctx.lineTo(s * tickLen, 0);
        ctx.strokeStyle = mainColor;
        ctx.lineWidth = i % 4 === 0 ? 3 : 1.5;
        ctx.shadowBlur = 10;
        ctx.shadowColor = mainColor;
        ctx.stroke();
      }
      ctx.restore();

      // --- LAYER 2: Thick Segmented Ring ---
      // Rotation: Counter-Clockwise
      ctx.save();
      ctx.rotate(-t * 1.2);
      // Dashed pattern: long dash, gap, short dash, gap
      drawRing(s * 0.95, s * 0.08, colors.cyanDim, 5, [s*0.2, s*0.05, s*0.05, s*0.05]);
      // Add bright overlay segments
      ctx.rotate(Math.PI / 3);
      drawRing(s * 0.95, s * 0.02, mainColor, 15, [s*0.3, s*1.5]);
      ctx.restore();

      // --- LAYER 3: Fine Detail Ring ---
      // Rotation: Clockwise
      ctx.save();
      ctx.rotate(t * 1.5);
      drawRing(s * 0.85, 2, mainColor, 5, [5, 10]);
      ctx.restore();

      // --- LAYER 4: The "Hero" Ring (Orange Segment) ---
      // Rotation: Counter-Clockwise
      ctx.save();
      ctx.rotate(-t * 0.8);
      // 4a. Base Cyan Ring
      drawRing(s * 0.7, 8, colors.cyanDim, 10);
      // 4b. Bright Cyan highlights
      drawRing(s * 0.7, 4, mainColor, 20, [s*0.5, s*1.2]);
      
      // 4c. THE ORANGE SEGMENT
      if (activeMode !== 'WARNING') {
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.7, Math.PI * 0.5, Math.PI * 0.85); // Specific arc section
          ctx.strokeStyle = colors.orange;
          ctx.lineWidth = 10;
          ctx.shadowBlur = 30;
          ctx.shadowColor = colors.orange;
          ctx.stroke();
          // White hot core of the orange segment
          ctx.beginPath();
          ctx.arc(0, 0, s * 0.7, Math.PI * 0.52, Math.PI * 0.83);
          ctx.strokeStyle = colors.white;
          ctx.lineWidth = 3;
          ctx.shadowBlur = 10;
          ctx.shadowColor = colors.white;
          ctx.stroke();
      }
      ctx.restore();

      // --- LAYER 5: Inner Detailed Ring ---
      // Rotation: Clockwise
      ctx.save();
      ctx.rotate(t * 2);
      drawRing(s * 0.55, 3, mainColor, 5, [10, 15]);
      // Add some static structure pieces
      for(let k=0; k<4; k++) {
         ctx.rotate(Math.PI/2);
         ctx.beginPath();
         ctx.moveTo(s*0.5, 0);
         ctx.lineTo(s*0.6, 0);
         ctx.lineWidth = 6;
         ctx.stroke();
      }
      ctx.restore();

      // --- LAYER 6: Turbine / Shutter Core ---
      // Rotation: Counter-Clockwise (Fast)
      ctx.save();
      ctx.rotate(-t * 3);
      ctx.shadowBlur = 20;
      ctx.shadowColor = mainColor;
      for(let j=0; j<12; j++) {
          ctx.rotate((Math.PI*2)/12);
          ctx.beginPath();
          // Drawn as angled shutters
          ctx.moveTo(s*0.3, 0);
          ctx.lineTo(s*0.45, s*0.05);
          ctx.strokeStyle = mainColor;
          ctx.lineWidth = 2;
          ctx.stroke();
      }
      ctx.restore();

      // --- LAYER 7: Central Core Glow ---
      // Pulse, no rotation
      const corePulse = 1 + Math.sin(time * 0.05) * 0.1;
      const speakPulse = isSpeaking ? Math.random() * 0.2 : 0;
      
      ctx.save();
      // Bright white center
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.25 * corePulse, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.shadowBlur = 50 * corePulse;
      ctx.shadowColor = accentColor;
      ctx.fill();
      
      // Inner bright blue rim
      drawRing(s * 0.28 * corePulse, 5, mainColor, 30);
      
      // Vocal feedback flash
      if (speakPulse > 0) {
         drawRing(s * 0.2 * (1+speakPulse), 10, colors.white, 40);
      }
      ctx.restore();

      ctx.resetTransform();
      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isSpeaking, isListening, activeMode]);

  return <canvas ref={canvasRef} className="fixed top-0 left-0 w-full h-full z-0 pointer-events-none" />;
};

export default ReactorCanvas;