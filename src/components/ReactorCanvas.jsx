import React, { useState, useEffect } from 'react';
import { useJarvis } from '../context/JarvisContext';

// --- 🔊 DIRECT IMPORT STRATEGY ---
import clickSfx from '../assets/click_v2.wav'; 
import hoverSfx from '../assets/hover.wav';

// --- GEOMETRY ENGINE ---
const polarToCartesian = (centerX, centerY, radius, angleInDegrees) => {
  const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
  return {
    x: centerX + (radius * Math.cos(angleInRadians)),
    y: centerY + (radius * Math.sin(angleInRadians))
  };
};

const describeArc = (x, y, innerRadius, outerRadius, startAngle, endAngle) => {
  const start = polarToCartesian(x, y, outerRadius, endAngle);
  const end = polarToCartesian(x, y, outerRadius, startAngle);
  const start2 = polarToCartesian(x, y, innerRadius, endAngle);
  const end2 = polarToCartesian(x, y, innerRadius, startAngle);

  const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";

  // Handle crossing the 0/360 boundary for the right side
  let sweepFlag = 1; 
  if (endAngle < startAngle) sweepFlag = 0; 

  return [
    "M", start.x, start.y,
    "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
    "L", end2.x, end2.y,
    "A", innerRadius, innerRadius, 0, largeArcFlag, 1, start2.x, start2.y,
    "Z"
  ].join(" ");
};

// Simplified Arc for filling 
const describeFillArc = (x, y, innerRadius, outerRadius, startAngle, endAngle) => {
    const start = polarToCartesian(x, y, outerRadius, endAngle);
    const end = polarToCartesian(x, y, outerRadius, startAngle);
    const start2 = polarToCartesian(x, y, innerRadius, endAngle);
    const end2 = polarToCartesian(x, y, innerRadius, startAngle);
    
    let diff = endAngle - startAngle;
    if (diff < 0) diff += 360;
    const largeArcFlag = diff <= 180 ? "0" : "1";

    return [
      "M", start.x, start.y,
      "A", outerRadius, outerRadius, 0, largeArcFlag, 0, end.x, end.y,
      "L", end2.x, end2.y,
      "A", innerRadius, innerRadius, 0, largeArcFlag, 1, start2.x, start2.y,
      "Z"
    ].join(" ");
};

const describeTextArc = (x, y, radius, startAngle, endAngle, isClockwise) => {
    const start = polarToCartesian(x, y, radius, startAngle);
    const end = polarToCartesian(x, y, radius, endAngle);
    const largeArcFlag = Math.abs(endAngle - startAngle) <= 180 ? "0" : "1";
    
    if (isClockwise) {
        return ["M", start.x, start.y, "A", radius, radius, 0, largeArcFlag, 1, end.x, end.y].join(" ");
    } else {
        return ["M", end.x, end.y, "A", radius, radius, 0, largeArcFlag, 0, start.x, start.y].join(" ");
    }
};

// --- CONFIGURATION ---

const MENU_ITEMS = [
  { id: 'VISION', label: 'VISION', icon: 'fa-eye' },         
  { id: 'DATABASE', label: 'DATA', icon: 'fa-database' },    
  { id: 'SOCIAL', label: 'SOCIAL', icon: 'fa-share-alt' }, 
  { id: 'OPS', label: 'SYSTEM', icon: 'fa-server' },         
  { id: 'DRIVE', label: 'DRIVE', icon: 'fa-car' },            
  { id: 'GUARDIAN', label: 'GUARD', icon: 'fa-shield-alt' },  
];

const OPS_SUB_ITEMS = [
    { id: 'RECON', label: 'RECON', icon: 'fa-binoculars', startAngle: 150, endAngle: 180 }, 
    { id: 'OPS_LOG', label: 'LOGS', icon: 'fa-file-code', startAngle: 180, endAngle: 210 }, 
];

const L2_INNER = 230; const L2_OUTER = 265; 
const L3_INNER = 270; const L3_OUTER = 305; 
const L4_INNER = 310; const L4_OUTER = 345; 
const L5_INNER = 350; const L5_OUTER = 375; 

const SOCIAL_ITEMS = [
    { id: 'X', label: 'X', icon: 'fa-x-twitter', inner: L2_INNER, outer: L2_OUTER, start: 90, end: 120 },
    { id: 'YOUTUBE', label: 'YT', icon: 'fa-youtube', inner: L2_INNER, outer: L2_OUTER, start: 120, end: 150 },
    { id: 'INSTAGRAM', label: 'IG', icon: 'fa-instagram', inner: L3_INNER, outer: L3_OUTER, start: 90, end: 120 },
    { id: 'FACEBOOK', label: 'FB', icon: 'fa-facebook-f', inner: L3_INNER, outer: L3_OUTER, start: 120, end: 150 },
    { id: 'VIBER', label: 'VIBER', icon: 'fa-viber', inner: L4_INNER, outer: L4_OUTER, start: 90, end: 120 },
    { id: 'MESSENGER', label: 'MSG', icon: 'fa-facebook-messenger', inner: L4_INNER, outer: L4_OUTER, start: 120, end: 150 },
    { id: 'WHATSAPP', label: 'WHATSAPP', icon: 'fa-whatsapp', inner: L5_INNER, outer: L5_OUTER, start: 90, end: 150 },
];


const ReactorCanvas = ({ onClick, menuOpen, onModuleSelect }) => {
  const { isListening, isSpeaking, activeMode, systemStatus } = useJarvis();
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredButton, setHoveredButton] = useState(null);
  
  const [showOpsSubMenu, setShowOpsSubMenu] = useState(false);
  const [showSocialSubMenu, setShowSocialSubMenu] = useState(false);
  
  // 🚗 DRIVE MODE STATE
  const [speed, setSpeed] = useState(0);
  const [gpsError, setGpsError] = useState(null); 

  // --- AUDIO ENGINE ---
  const playSound = (type) => {
    const soundFile = type === 'click' ? clickSfx : hoverSfx;
    try {
        const audio = new Audio(soundFile);
        audio.volume = type === 'click' ? 1.0 : 0.4; 
        audio.currentTime = 0;
        audio.play().catch(e => {});
    } catch (error) { }
  };

  // --- 🛰️ REAL GPS TRACKING ---
  useEffect(() => {
      let watchId;

      if (activeMode === 'DRIVE') {
          if ('geolocation' in navigator) {
              const options = {
                  enableHighAccuracy: true, 
                  timeout: 5000,
                  maximumAge: 0
              };

              const success = (pos) => {
                  const speedMps = pos.coords.speed || 0;
                  const speedKmh = speedMps * 3.6;
                  setSpeed(speedKmh);
                  setGpsError(null);
              };

              const error = (err) => {
                  console.warn('GPS ERROR(' + err.code + '): ' + err.message);
                  setGpsError("GPS SIGNAL LOST");
              };

              watchId = navigator.geolocation.watchPosition(success, error, options);
          } else {
              setGpsError("GPS NOT SUPPORTED");
          }
      } else {
          if (watchId) navigator.geolocation.clearWatch(watchId);
          setSpeed(0);
      }

      return () => {
          if (watchId) navigator.geolocation.clearWatch(watchId);
      };
  }, [activeMode]);

  // --- INTERACTION HANDLERS ---
  const handleMouseEnter = () => { setIsHovered(true); playSound('hover'); };
  const handleMouseLeave = () => { setIsHovered(false); };

  const handleClick = (e) => {
    if (e) { e.stopPropagation(); e.nativeEvent.stopImmediatePropagation(); }
    playSound('click');
    if (onClick) onClick(e);
  };

  const handleMenuClick = (e, moduleId) => {
      if (e) e.stopPropagation();
      playSound('click');
      if (onModuleSelect) onModuleSelect(moduleId);
  };

  const handleButtonHover = (id) => {
      if (hoveredButton !== id) {
          setHoveredButton(id);
          playSound('hover');
      }
      if (id === 'OPS' || id === 'RECON' || id === 'OPS_LOG') setShowOpsSubMenu(true);
      else setShowOpsSubMenu(false);

      const isSocial = SOCIAL_ITEMS.some(item => item.id === id);
      if (id === 'SOCIAL' || isSocial) setShowSocialSubMenu(true);
      else setShowSocialSubMenu(false);
  };

  const isExpanded = isHovered || isListening || menuOpen;

  // --- STYLING LOGIC ---
  const getCoreGlow = () => {
    if (activeMode === 'DRIVE') return 'bg-cyan/10 shadow-[0_0_80px_rgba(0,229,255,0.6)] animate-pulse-fast';
    if (isListening) return 'bg-cyan/20 shadow-[0_0_50px_rgba(0,229,255,0.9)] animate-pulse-fast';
    if (isSpeaking) return 'bg-emerald-300/20 shadow-[0_0_60px_rgba(167,243,208,0.7)] animate-pulse-fast';
    return 'bg-cyan/5 shadow-[0_0_30px_rgba(0,229,255,0.4)]';
  };

  const getTextColor = () => {
    if (activeMode === 'DRIVE') {
        if (speed > 90) return 'text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,1)]';
        if (speed > 50) return 'text-orange-400 drop-shadow-[0_0_20px_rgba(251,146,60,1)]';
        return 'text-cyan drop-shadow-[0_0_20px_rgba(0,229,255,1)]';
    }
    if (isListening) return 'text-cyan drop-shadow-[0_0_15px_rgba(0,229,255,1)] animate-pulse';
    if (isSpeaking) return 'text-emerald-300 drop-shadow-[0_0_15px_rgba(167,243,208,1)]';
    return 'text-cyan drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]';
  };

  const getDynamicAccentStyle = () => {
    const targetAngle = isSpeaking ? 120 : 45;
    const colorStart = isSpeaking ? 'rgba(250, 204, 21, 1)' : 'rgba(250, 204, 21, 0.8)';
    const colorEnd = isSpeaking ? 'rgba(251, 146, 60, 0.8)' : 'rgba(250, 204, 21, 0.2)';
    return {
        background: `conic-gradient(from 0deg, ${colorStart} 0deg, ${colorEnd} ${targetAngle}deg, transparent ${targetAngle}deg)`,
        maskImage: 'radial-gradient(closest-side, transparent 85%, white 86%)',
        WebkitMaskImage: 'radial-gradient(closest-side, transparent 85%, white 86%)',
        transition: 'all 0.2s ease-in-out',
        position: 'absolute', inset: 0, borderRadius: '9999px', transform: 'rotate(-20deg)',
    };
  };

  const compassMaskStyle = {
      maskImage: 'conic-gradient(black 0deg 30deg, transparent 30deg 60deg, black 60deg 120deg, transparent 120deg 150deg, black 150deg 210deg, transparent 210deg 240deg, black 240deg 300deg, transparent 300deg 330deg, black 330deg 360deg)',
      WebkitMaskImage: 'conic-gradient(black 0deg 30deg, transparent 30deg 60deg, black 60deg 120deg, transparent 120deg 150deg, black 150deg 210deg, transparent 210deg 240deg, black 240deg 300deg, transparent 300deg 330deg, black 330deg 360deg)',
  };

  // --- 🚗 SPEEDOMETER RENDERER ---
  const renderSpeedBar = (side) => {
      const maxSpeed = 140;
      const progress = Math.min(Math.max(speed, 0) / maxSpeed, 1);
      const totalArc = 90; 
      const activeArc = totalArc * progress;

      const innerR = 155; 
      const outerR = 175;

      let bgPath, fillPath;
      let gradientId = side === 'left' ? "speedGradientLeft" : "speedGradientRight";

      if (side === 'left') {
          const start = 225;
          const end = 315;
          bgPath = describeFillArc(400, 400, innerR, outerR, end, start); 
          fillPath = describeFillArc(400, 400, innerR, outerR, start + activeArc, start); 
      } else {
          const start = 135;
          const end = 45;
          bgPath = describeFillArc(400, 400, innerR, outerR, start, end); 
          fillPath = describeFillArc(400, 400, innerR, outerR, start, start - activeArc); 
      }

      return (
          <g>
              <path d={bgPath} fill="rgba(0, 229, 255, 0.1)" stroke="rgba(0, 229, 255, 0.2)" strokeWidth="1" />
              <path d={fillPath} fill={`url(#${gradientId})`} className="transition-all duration-75" style={{ filter: "drop-shadow(0 0 8px rgba(0,0,0,0.5))" }} />
          </g>
      );
  }

  return (
    <div 
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] sm:w-[380px] sm:h-[380px] flex items-center justify-center z-50 pointer-events-auto cursor-pointer"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
    >
        {/* --- LAYER 2 GROUP: THE TRACK SYSTEM --- */}
        <div className="absolute inset-[-2px] rounded-full border border-cyan/30 opacity-90 pointer-events-none"></div>
        <div className="absolute inset-[23px] rounded-full border border-cyan/30 opacity-90 pointer-events-none"></div>

        {/* --- ROTATING DECORATIONS (Closed State) --- */}
        {!menuOpen && activeMode !== 'DRIVE' && (
            <div className="absolute inset-[-2px] rounded-full animate-spin-slow pointer-events-none" style={{ animationDuration: '30s' }}>
                <div className="absolute inset-0" style={getDynamicAccentStyle()}></div>
                {/* ⚠️ RESTORED: Solid Blocks */}
                <div className="absolute inset-0 rotate-[150deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.8)] skew-x-12"></div></div>
                <div className="absolute inset-0 rotate-[164deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.8)] skew-x-12"></div></div>
                <div className="absolute inset-0 rotate-[178deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] bg-cyan shadow-[0_0_8px_rgba(0,229,255,0.8)] skew-x-12"></div></div>
                
                {/* ⚠️ RESTORED: Outline Blocks (These were missing!) */}
                <div className="absolute inset-0 rotate-[195deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] border border-cyan shadow-[0_0_5px_rgba(0,229,255,0.5)] skew-x-12"></div></div>
                <div className="absolute inset-0 rotate-[209deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] border border-cyan shadow-[0_0_5px_rgba(0,229,255,0.5)] skew-x-12"></div></div>
                <div className="absolute inset-0 rotate-[223deg]"><div className="absolute top-[2px] left-1/2 -translate-x-1/2 w-[30px] h-[20px] border border-cyan shadow-[0_0_5px_rgba(0,229,255,0.5)] skew-x-12"></div></div>
            </div>
        )}

        {/* --- 🚗 SPEEDOMETER GAUGES (Only in Drive Mode) --- */}
        {activeMode === 'DRIVE' && (
            <div className="absolute inset-[-200px] pointer-events-none">
                 <svg viewBox="0 0 800 800" className="w-full h-full">
                     <defs>
                         <linearGradient id="speedGradientLeft" x1="0%" y1="100%" x2="0%" y2="0%">
                             <stop offset="0%" stopColor="#00e5ff" />   
                             <stop offset="35%" stopColor="#00e5ff" />
                             <stop offset="55%" stopColor="#fb923c" />  
                             <stop offset="75%" stopColor="#ef4444" />  
                             <stop offset="100%" stopColor="#ef4444" />
                         </linearGradient>

                         <linearGradient id="speedGradientRight" x1="0%" y1="100%" x2="0%" y2="0%">
                             <stop offset="0%" stopColor="#00e5ff" />   
                             <stop offset="35%" stopColor="#00e5ff" />
                             <stop offset="55%" stopColor="#fb923c" />  
                             <stop offset="75%" stopColor="#ef4444" />  
                             <stop offset="100%" stopColor="#ef4444" />
                         </linearGradient>
                     </defs>

                     {renderSpeedBar('left')}
                     {renderSpeedBar('right')}
                     
                     {[0, 1, 2, 3, 4, 5].map(i => { 
                         const angle = 225 + (i * (90/5));
                         const pos = polarToCartesian(400, 400, 185, angle);
                         return <circle cx={pos.x} cy={pos.y} r="2" fill="#00e5ff" opacity="0.6" key={`tick-l-${i}`} />
                     })}
                     {[0, 1, 2, 3, 4, 5].map(i => { 
                         const angle = 135 - (i * (90/5));
                         const pos = polarToCartesian(400, 400, 185, angle);
                         return <circle cx={pos.x} cy={pos.y} r="2" fill="#00e5ff" opacity="0.6" key={`tick-r-${i}`} />
                     })}
                 </svg>
            </div>
        )}

        {/* --- 🌟 LAYER: RADIAL MENU --- */}
        {menuOpen && (
            <div className="absolute inset-[-200px] rounded-full animate-spin-slow-reverse" style={{ animationDuration: '60s' }}>
                <svg viewBox="0 0 800 800" className="w-full h-full pointer-events-none">
                    <defs>
                        {MENU_ITEMS.map((item, index) => {
                             const innerR = 185; const outerR = 225;
                             const textR = (innerR + outerR) / 2;
                             const gap = 4; const totalArc = 360 / MENU_ITEMS.length;
                             const span = totalArc - gap;
                             const startAngle = (index * totalArc) - (totalArc / 2) + (gap/2);
                             const endAngle = startAngle + span;
                             const midAngle = startAngle + (span/2);
                             const normalizedMid = (midAngle + 360) % 360;
                             const isBottomHalf = normalizedMid > 90 && normalizedMid < 270;
                             const textPathData = describeTextArc(400, 400, textR, startAngle, endAngle, !isBottomHalf);
                             return <path key={`path-${item.id}`} id={`text-path-${item.id}`} d={textPathData} />;
                        })}
                        {OPS_SUB_ITEMS.map((item) => {
                            const innerR = 230; const outerR = 260; const textR = (innerR + outerR) / 2;
                            const textPathData = describeTextArc(400, 400, textR, item.startAngle, item.endAngle, false); 
                            return <path key={`path-${item.id}`} id={`text-path-${item.id}`} d={textPathData} />;
                        })}
                        {SOCIAL_ITEMS.map((item) => {
                            const textR = (item.inner + item.outer) / 2;
                            const textPathData = describeTextArc(400, 400, textR, item.start, item.end, false);
                            return <path key={`path-${item.id}`} id={`text-path-${item.id}`} d={textPathData} />;
                        })}
                    </defs>

                    {MENU_ITEMS.map((item, index) => {
                        const isItemHovered = hoveredButton === item.id;
                        const innerR = 185; const outerR = 225;
                        const gap = 4; const totalArc = 360 / MENU_ITEMS.length;
                        const span = totalArc - gap; 
                        const startAngle = (index * totalArc) - (totalArc / 2) + (gap/2);
                        const endAngle = startAngle + span;
                        const keepHighlight = (item.id === 'OPS' && showOpsSubMenu) || (item.id === 'SOCIAL' && showSocialSubMenu);
                        const pathData = describeArc(400, 400, innerR, outerR, startAngle, endAngle);

                        return (
                            <g key={item.id} className="pointer-events-auto cursor-pointer"
                               onClick={(e) => handleMenuClick(e, item.id)}
                               onMouseEnter={() => handleButtonHover(item.id)}
                               onMouseLeave={() => { if(item.id !== 'OPS' && item.id !== 'SOCIAL') setHoveredButton(null); }}
                            >
                                <path d={pathData} 
                                    fill={isItemHovered || keepHighlight ? "rgba(0, 229, 255, 1)" : "rgba(0, 0, 0, 0.8)"}
                                    stroke="rgba(0, 229, 255, 0.8)" strokeWidth="2" className="transition-all duration-200"
                                    style={{ filter: isItemHovered ? "drop-shadow(0 0 15px rgba(0,229,255,0.8))" : "none" }}
                                />
                                <text width="500" className="pointer-events-none font-orbitron font-bold tracking-[0.2em] text-[14px]">
                                    <textPath href={`#text-path-${item.id}`} startOffset="50%" textAnchor="middle" dominantBaseline="middle"
                                        fill={isItemHovered || keepHighlight ? "#000000" : "#00e5ff"}
                                        className="transition-colors duration-200"
                                    >
                                        {item.label}
                                    </textPath>
                                </text>
                            </g>
                        );
                    })}

                    {showOpsSubMenu && OPS_SUB_ITEMS.map((item) => {
                        const isItemHovered = hoveredButton === item.id;
                        const innerR = 230; const outerR = 260; const gap = 2; 
                        const start = item.startAngle + gap; const end = item.endAngle - gap;
                        const pathData = describeArc(400, 400, innerR, outerR, start, end);
                        return (
                            <g key={item.id} className="pointer-events-auto cursor-pointer"
                               onClick={(e) => handleMenuClick(e, item.id)}
                               onMouseEnter={() => handleButtonHover(item.id)}
                               onMouseLeave={() => setHoveredButton('OPS')} 
                            >
                                <path d={pathData} fill={isItemHovered ? "rgba(0, 229, 255, 1)" : "rgba(0, 0, 0, 0.9)"} stroke="rgba(0, 229, 255, 0.8)" strokeWidth="1" className="transition-all duration-200" />
                                <text width="500" className="pointer-events-none font-orbitron font-bold tracking-[0.1em] text-[10px]">
                                    <textPath href={`#text-path-${item.id}`} startOffset="50%" textAnchor="middle" dominantBaseline="middle" fill={isItemHovered ? "#000000" : "#00e5ff"}>{item.label}</textPath>
                                </text>
                            </g>
                        );
                    })}

                    {showSocialSubMenu && SOCIAL_ITEMS.map((item) => {
                        const isItemHovered = hoveredButton === item.id;
                        const gap = 1; const start = item.start + gap; const end = item.end - gap;
                        const pathData = describeArc(400, 400, item.inner, item.outer, start, end);
                        return (
                            <g key={item.id} className="pointer-events-auto cursor-pointer"
                               onClick={(e) => handleMenuClick(e, item.id)}
                               onMouseEnter={() => handleButtonHover(item.id)}
                               onMouseLeave={() => setHoveredButton('SOCIAL')} 
                            >
                                <path d={pathData} fill={isItemHovered ? "rgba(0, 229, 255, 1)" : "rgba(0, 0, 0, 0.9)"} stroke="rgba(0, 229, 255, 0.8)" strokeWidth="1" className="transition-all duration-200" />
                                <text width="500" className="pointer-events-none font-orbitron font-bold tracking-[0] text-[8px]">
                                    <textPath href={`#text-path-${item.id}`} startOffset="50%" textAnchor="middle" dominantBaseline="middle" fill={isItemHovered ? "#000000" : "#00e5ff"}>{item.label}</textPath>
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        )}

        {/* --- LAYER: CLOCK GEAR --- */}
        <div className="absolute inset-[10%] rounded-full animate-spin-slow pointer-events-none" style={{ animationDuration: '60s', direction: 'reverse' }}>
            <div className="absolute inset-0 rounded-full" style={{ background: 'repeating-conic-gradient(transparent 0deg 5deg, #00e5ff 5deg 6deg)', maskImage: 'radial-gradient(transparent 60%, black 60%)', WebkitMaskImage: 'radial-gradient(transparent 60%, black 83%)' }}></div>
            <div className="absolute inset-0 rounded-full shadow-[0_0_25px_rgba(0,229,255,0.5)]" style={{ background: 'conic-gradient(rgba(0, 255, 234, 0.6) 0deg 216deg, transparent 216deg 360deg)', maskImage: 'radial-gradient(transparent 60%, black 60%)', WebkitMaskImage: 'radial-gradient(transparent 60%, black 60%)' }}></div>
        </div>

        {/* --- LAYER 3: THE ARMOR RING --- */}
        <div className="absolute inset-[16%] rounded-full animate-spin-reverse-slow pointer-events-none" style={{ animationDuration: '25s' }}>
            <div className="absolute inset-0 rounded-full border-[16px] border-cyan/20"></div>
            <div className="absolute inset-0 rounded-full border-[16px] border-cyan/50" style={{ maskImage: 'conic-gradient(transparent 0deg 90deg, black 90deg 360deg)', WebkitMaskImage: 'conic-gradient(transparent 0deg 90deg, black 90deg 360deg)' }}></div>
            {/* ⚠️ RESTORED: Solid Segments */}
            <div className="absolute inset-0 rotate-[15deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] bg-cyan shadow-[0_0_10px_cyan]"></div></div>
            <div className="absolute inset-0 rotate-[27deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] bg-cyan shadow-[0_0_10px_cyan]"></div></div>
            <div className="absolute inset-0 rotate-[39deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] bg-cyan shadow-[0_0_10px_cyan]"></div></div>
            
            {/* ⚠️ RESTORED: Outline Segments (These were missing!) */}
            <div className="absolute inset-0 rotate-[51deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] border-2 border-cyan shadow-[0_0_5px_cyan]"></div></div>
            <div className="absolute inset-0 rotate-[63deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] border-2 border-cyan shadow-[0_0_5px_cyan]"></div></div>
            <div className="absolute inset-0 rotate-[75deg]"><div className="absolute top-0 left-1/2 -translate-x-1/2 w-[22px] h-[16px] border-2 border-cyan shadow-[0_0_5px_cyan]"></div></div>
        </div>

        {/* --- LAYER 4: THE COMPASS --- */}
        <div className={`absolute rounded-full transition-all duration-500 ease-out pointer-events-none ${isExpanded ? 'inset-[22%] shadow-[0_0_30px_rgba(0,229,255,0.6)]' : 'inset-[27%]'}`}>
            <div className="absolute inset-0 rounded-full border-[1px] border-cyan/30"></div>
            <div className="absolute inset-[-3px] rounded-full border-[6px] border-cyan shadow-[0_0_10px_rgba(0,229,255,0.6)]" style={compassMaskStyle}></div>
        </div>

        {/* --- LAYER 5: APERTURE RING --- */}
        <div className="absolute inset-[37%] rounded-full animate-spin-slow pointer-events-none">
            <div className="absolute inset-0 rounded-full border-[8px] border-dashed border-cyan/20"></div>
        </div>

        {/* --- LAYER 6: THE CORE --- */}
        <div className={`absolute inset-[43%] rounded-full transition-all duration-500 pointer-events-none ${getCoreGlow()}`}></div>

        {/* --- LAYER 7: TEXT DISPLAY (UPDATED FOR DRIVE) --- */}
        <div className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none">
            {activeMode === 'DRIVE' ? (
                <div className="flex flex-col items-center justify-center animate-in fade-in duration-300">
                    {/* Shows "GPS" error if signal lost, otherwise Speed */}
                    {gpsError ? (
                        <div className="text-red-500 font-bold tracking-widest text-xs animate-pulse">{gpsError}</div>
                    ) : (
                        <>
                            <h1 className={`font-orbitron font-bold text-6xl tracking-tighter ${getTextColor()}`}>
                                {Math.floor(speed)}
                            </h1>
                            <div className="text-sm font-mono text-cyan/70 tracking-[0.4em] mt-0">
                                KM/H
                            </div>
                        </>
                    )}
                </div>
            ) : (
                <>
                    <h1 className={`font-orbitron font-bold text-3xl tracking-[0.2em] transition-all duration-300 ${getTextColor()}`}>
                        {isListening ? "LISTENING" : "JARVIS"}
                    </h1>
                    <div className={`h-[3px] w-20 mt-2 rounded-full transition-all duration-500 relative overflow-hidden ${isSpeaking ? 'bg-emerald-300/50' : 'bg-cyan/30'}`}>
                        <div className={`absolute top-0 left-0 h-full w-1/3 bg-white/60 blur-[2px] animate-pulse ${isSpeaking ? 'animate-spin-slow' : ''}`} style={{animationDuration: '3s'}}></div>
                    </div>
                    <div className="text-[10px] font-mono text-cyan/60 mt-2 tracking-[0.3em] font-bold flex flex-col items-center gap-1">
                        {isListening 
                            ? <span className="text-emerald-300 drop-shadow-[0_0_5px_rgba(110,231,183,0.8)]">VOICE ACTIVE</span>
                            : <>
                                <span>{systemStatus}</span>
                                <span className="text-[8px] opacity-70">
                                    {menuOpen ? "SELECT MODULE" : activeMode}
                                </span>
                            </>
                        }
                    </div>
                </>
            )}
        </div>

    </div>
  );
};

export default ReactorCanvas;