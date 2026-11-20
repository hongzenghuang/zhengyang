'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useFlight } from '@/contexts/FlightContext';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';
import { SCENARIOS, FlightScenario } from '@/lib/types';
import { calculateAlerts, hasMasterCaution, hasMasterWarning, getPriorityAlert, Alert } from '@/lib/warnings';
import { audioSystem } from '@/lib/audio';

interface TrafficAircraft {
  id: number;
  bearing: number;
  distance: number;
  altitude: number;
  heading: number;
  speed: number;
  callsign: string;
}

interface Weather {
  type: 'clear' | 'cloudy' | 'rain' | 'fog' | 'storm';
  visibility: number;
  windDir: number;
  windSpeed: number;
  clouds: number;
  temperature: number;
}

// Circular gauge component for engine parameters
function CircularGauge({ 
  value, 
  max, 
  label, 
  unit, 
  warning = 85,
  danger = 95 
}: { 
  value: number; 
  max: number; 
  label: string; 
  unit: string;
  warning?: number;
  danger?: number;
}) {
  const percentage = Math.min(100, (value / max) * 100);
  const startAngle = -225;
  const endAngle = 45;
  const totalAngle = endAngle - startAngle;
  const currentAngle = startAngle + (percentage / 100) * totalAngle;
  
  const getColor = () => {
    if (percentage >= danger) return '#ff4444';
    if (percentage >= warning) return '#ffaa00';
    return '#00ff88';
  };

  const polarToCartesian = (cx: number, cy: number, r: number, angle: number) => {
    const rad = (angle * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };

  const describeArc = (cx: number, cy: number, r: number, start: number, end: number) => {
    const s = polarToCartesian(cx, cy, r, start);
    const e = polarToCartesian(cx, cy, r, end);
    const largeArc = end - start > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  return (
    <div className="relative w-full aspect-square max-w-[100px]">
      <svg viewBox="0 0 100 100" className="w-full h-full">
        {/* Background arc */}
        <path
          d={describeArc(50, 50, 40, startAngle, endAngle)}
          fill="none"
          stroke="#1a3a1a"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={describeArc(50, 50, 40, startAngle, currentAngle)}
          fill="none"
          stroke={getColor()}
          strokeWidth="6"
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 3px ${getColor()})` }}
        />
        {/* Tick marks */}
        {[0, 25, 50, 75, 100].map(tick => {
          const angle = startAngle + (tick / 100) * totalAngle;
          const inner = polarToCartesian(50, 50, 32, angle);
          const outer = polarToCartesian(50, 50, 36, angle);
          return (
            <line
              key={tick}
              x1={inner.x} y1={inner.y}
              x2={outer.x} y2={outer.y}
              stroke="#6a8a6a"
              strokeWidth="1"
            />
          );
        })}
        {/* Center value */}
        <text x="50" y="48" textAnchor="middle" fill={getColor()} fontSize="14" fontWeight="bold" fontFamily="monospace">
          {value.toFixed(0)}
        </text>
        <text x="50" y="60" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">
          {unit}
        </text>
      </svg>
      <div className="absolute top-1 left-1/2 -translate-x-1/2 text-[8px] text-[#6a8a6a] tracking-wider">
        {label}
      </div>
    </div>
  );
}

export default function FlightSimulatorPage() {
  const { 
    state, 
    dispatch, 
    setThrottle,
    adjustTargetHeading, 
    adjustTargetAltitude, 
    adjustTargetAirspeed,
    setScenario,
  } = useFlight();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showScenarioPanel, setShowScenarioPanel] = useState(false);
  const cloudOffsetRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [groundOffset, setGroundOffset] = useState(0);
  
  // Alert system
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [masterCaution, setMasterCaution] = useState(false);
  const [masterWarning, setMasterWarning] = useState(false);
  const [masterCautionFlash, setMasterCautionFlash] = useState(false);
  const [masterWarningFlash, setMasterWarningFlash] = useState(false);
  const lastAlertAudioRef = useRef<string | null>(null);
  const lastAlertTimeRef = useRef<number>(0);
  
  // Speed and altitude trend tracking (for trend arrows)
  const prevAirspeedRef = useRef(0);
  const prevAltitudeRef = useRef(0);
  const [speedTrend, setSpeedTrend] = useState(0); // kts per 6 seconds
  const [altTrend, setAltTrend] = useState(0); // ft/min

  useKeyboardControls({ dispatch, enabled: true });

  const weather = useMemo<Weather>(() => ({
    type: 'clear',
    visibility: 10000,
    windDir: 270,
    windSpeed: 15,
    clouds: 3,
    temperature: 15,
  }), []);

  const [traffic] = useState<TrafficAircraft[]>(() => {
    const callsigns = ['UAL452', 'DAL187', 'AAL903', 'SWA221', 'BAW115', 'DLH400', 'AFR223', 'KAL85'];
    return Array.from({ length: 5 }, (_, i) => ({
      id: i,
      bearing: Math.random() * 360,
      distance: 15 + Math.random() * 40,
      altitude: 20000 + Math.random() * 20000,
      heading: Math.random() * 360,
      speed: 250 + Math.random() * 200,
      callsign: callsigns[Math.floor(Math.random() * callsigns.length)],
    }));
  });

  const [trafficPositions, setTrafficPositions] = useState<TrafficAircraft[]>(traffic);
  
  useEffect(() => {
    const interval = setInterval(() => {
      setTrafficPositions(prev => prev.map(t => ({
        ...t,
        bearing: (t.bearing + (Math.random() - 0.5) * 0.5 + 360) % 360,
        distance: Math.max(5, t.distance + (Math.random() - 0.5) * 0.2),
      })));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Use state directly for attitude indicator - no smoothing needed
  // The physics engine already provides smooth transitions

  // Alert system - calculate warnings and trigger voice alerts
  useEffect(() => {
    const newAlerts = calculateAlerts(state);
    setAlerts(newAlerts);
    
    const hasCaution = hasMasterCaution(newAlerts);
    const hasWarning = hasMasterWarning(newAlerts);
    
    setMasterCaution(hasCaution);
    setMasterWarning(hasWarning);
    
    // Flash master lights
    if (hasWarning) {
      setMasterWarningFlash(true);
      const timer = setTimeout(() => setMasterWarningFlash(false), 500);
      return () => clearTimeout(timer);
    } else if (hasCaution) {
      setMasterCautionFlash(true);
      const timer = setTimeout(() => setMasterCautionFlash(false), 500);
      return () => clearTimeout(timer);
    }
  }, [state.airspeed, state.altitude, state.verticalSpeed, state.roll, state.engine1Enabled, state.engine2Enabled, state.gearDown, state.flapsAngle, state.autopilotEnabled, state.targetAltitude]);

  // Voice alerts using Web Speech API - with user interaction requirement
  const [audioInitialized, setAudioInitialized] = useState(false);
  
  // Initialize audio on first user interaction
  useEffect(() => {
    const initAudio = () => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Warm up speech synthesis
        const utterance = new SpeechSynthesisUtterance('');
        utterance.volume = 0;
        window.speechSynthesis.speak(utterance);
        setAudioInitialized(true);
      }
      // Remove listeners after initialization
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
    
    document.addEventListener('click', initAudio);
    document.addEventListener('keydown', initAudio);
    
    return () => {
      document.removeEventListener('click', initAudio);
      document.removeEventListener('keydown', initAudio);
    };
  }, []);

  useEffect(() => {
    const priorityAlert = getPriorityAlert(alerts);
    const now = Date.now();
    
    // Only speak if audio is initialized, alert changed, and enough time has passed
    if (audioInitialized && 
        priorityAlert?.audio && 
        priorityAlert.audio !== lastAlertAudioRef.current &&
        now - lastAlertTimeRef.current > 3000) {
      
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        // Cancel any ongoing speech
        window.speechSynthesis.cancel();
        
        // Small delay to ensure cancel completes
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(priorityAlert.audio!);
          utterance.rate = 0.9;
          utterance.pitch = 0.8;
          utterance.volume = 1;
          utterance.lang = 'en-US';
          
          // Try to get a voice
          const voices = window.speechSynthesis.getVoices();
          const englishVoice = voices.find(v => v.lang.startsWith('en'));
          if (englishVoice) {
            utterance.voice = englishVoice;
          }
          
          window.speechSynthesis.speak(utterance);
          lastAlertAudioRef.current = priorityAlert.audio!;
          lastAlertTimeRef.current = Date.now();
        }, 50);
      }
    }
    
    // Reset if no alerts
    if (!priorityAlert) {
      lastAlertAudioRef.current = null;
    }
  }, [alerts, audioInitialized]);

  // Speed/altitude trend calculation (every 500ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const speedDelta = (state.airspeed - prevAirspeedRef.current) * 12; // extrapolate to 6 sec
      setSpeedTrend(speedDelta);
      prevAirspeedRef.current = state.airspeed;
      
      const altDelta = (state.altitude - prevAltitudeRef.current) * 120; // extrapolate to per minute
      setAltTrend(altDelta);
      prevAltitudeRef.current = state.altitude;
    }, 500);
    return () => clearInterval(interval);
  }, [state.airspeed, state.altitude]);

  // Crash detection - play crash sound and speak warning
  const prevCrashedRef = useRef(false);
  useEffect(() => {
    if (state.crashed && !prevCrashedRef.current) {
      // Just crashed - play explosion sound
      audioSystem.playCrash();
      
      // Speak crash warning
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance('Crash. Aircraft destroyed.');
          utterance.rate = 0.8;
          utterance.pitch = 0.7;
          utterance.volume = 1;
          utterance.lang = 'en-US';
          window.speechSynthesis.speak(utterance);
        }, 500);
      }
    }
    prevCrashedRef.current = state.crashed;
  }, [state.crashed]);

  useEffect(() => {
    let animFrame: number;
    const animate = () => {
      const speed = state.airspeed * 0.5;
      cloudOffsetRef.current = (cloudOffsetRef.current + speed * 0.016) % 2000;
      groundOffsetRef.current = (groundOffsetRef.current + speed * 0.03) % 400;
      setCloudOffset(cloudOffsetRef.current);
      setGroundOffset(groundOffsetRef.current);
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [state.airspeed]);

  const skyGradient = state.altitude > 30000 
    ? 'linear-gradient(180deg, #050a1a 0%, #0a1628 30%, #1a2f4a 60%, #2d4a6b 100%)'
    : state.altitude > 15000
    ? 'linear-gradient(180deg, #0e2240 0%, #1a3a5c 30%, #3a6b8a 60%, #5a8ba8 100%)'
    : state.altitude > 5000
    ? 'linear-gradient(180deg, #2a5a8a 0%, #4a7ba8 30%, #6a9bc8 60%, #8abbe8 100%)'
    : 'linear-gradient(180deg, #5a9bd8 0%, #7abbe8 30%, #9adbf8 60%, #c0e8ff 100%)';

  const groundVisible = state.altitude < 20000;
  const groundOpacity = Math.max(0, 1 - state.altitude / 20000);

  const getHeadingDir = (h: number) => {
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return dirs[Math.round(h / 45) % 8];
  };

  const getRelativeBearing = (trafficBearing: number) => {
    return ((trafficBearing - state.heading + 540) % 360) - 180;
  };

  return (
    <div className="relative h-screen bg-[#0a0a0a] text-white font-mono flex flex-col overflow-hidden select-none">
      <style jsx global>{`
        .knob-btn {
          width: 26px; height: 26px;
          background: linear-gradient(145deg, #3a3a3a, #1a1a1a);
          border: 2px solid #555; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer; transition: all 0.15s;
          font-size: 14px; font-weight: bold; color: #aaa;
          flex-shrink: 0;
        }
        .knob-btn:hover { border-color: #00ff88; color: #00ff88; }
        .knob-btn:active { transform: scale(0.92); }
        .ap-btn {
          padding: 4px 10px; background: #1a1a1a;
          border: 2px solid #333; border-radius: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          cursor: pointer; transition: all 0.2s; color: #888;
          white-space: nowrap;
        }
        .ap-btn:hover { border-color: #555; }
        .ap-btn.active {
          background: #00ff88; border-color: #00ff88; color: #000;
          box-shadow: 0 0 10px rgba(0, 255, 136, 0.4);
        }
        input[type="range"] { -webkit-appearance: none; appearance: none; background: transparent; }
        input[type="range"]::-webkit-slider-runnable-track {
          height: 8px; background: #1a1a1a; border-radius: 4px; border: 1px solid #333;
        }
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none; width: 18px; height: 18px;
          background: #00ff88; border-radius: 50%; margin-top: -6px;
          cursor: pointer; border: 2px solid #00cc6a;
        }
        .cloud {
          position: absolute; border-radius: 50%;
          background: rgba(255,255,255,0.15);
          filter: blur(8px);
        }
        .ground-line {
          position: absolute; height: 1px;
          background: rgba(100,140,80,0.3);
        }
        .eicas-display {
          background: linear-gradient(180deg, #0a1a0a 0%, #000 100%);
          border: 2px solid #1a3a1a;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
        .eicas-value {
          color: #00ff88;
          text-shadow: 0 0 4px rgba(0, 255, 136, 0.5);
        }
        .eicas-label {
          color: #6a8a6a;
          font-size: 9px;
          letter-spacing: 1px;
        }
        .traffic-dot {
          width: 6px; height: 6px;
          background: #00ff88;
          border-radius: 50%;
          box-shadow: 0 0 4px #00ff88;
        }
        @media (max-width: 900px) {
          .mcp-panel { flex-wrap: wrap; gap: 4px !important; padding: 4px 8px !important; }
          .mcp-group { padding: 2px 6px !important; }
          .mcp-val { font-size: 14px !important; min-width: 40px !important; }
          .instrument-grid { grid-template-columns: 1fr !important; }
          .ext-view { height: 80px !important; }
        }
        @media (max-height: 700px) {
          .ext-view { height: 70px !important; }
          .mcp-panel { padding: 2px 8px !important; }
        }
      `}</style>

      {/* Scenario Alert Banner */}
      {state.scenarioMessage && (
        <div className={`flex-shrink-0 px-3 py-1 text-center text-xs font-bold tracking-wider border-b ${
          state.activeScenario === 'normal' 
            ? 'bg-green-900/30 text-green-400 border-green-800' 
            : state.activeScenario === 'stall' || state.activeScenario === 'bird_strike'
            ? 'bg-red-900/40 text-red-400 border-red-800 animate-pulse'
            : 'bg-amber-900/40 text-amber-400 border-amber-800'
        }`}>
          {state.scenarioMessage}
        </div>
      )}

      {/* External View */}
      <div className="ext-view relative w-full h-32 flex-shrink-0 overflow-hidden" style={{ background: skyGradient }}>
        {state.altitude < 35000 && (
          <div className="absolute inset-0 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div key={`cloud-${i}`} className="cloud"
                style={{
                  width: `${80 + i * 40}px`, height: `${30 + i * 15}px`,
                  top: `${10 + i * 12}%`,
                  left: `${((i * 350 - cloudOffset * (0.5 + i * 0.2)) % 1400) - 200}px`,
                  opacity: state.altitude > 25000 ? 0.05 : 0.15 + (i * 0.03),
                }}
              />
            ))}
          </div>
        )}

        {groundVisible && (
          <div className="absolute bottom-0 left-0 right-0 overflow-hidden"
            style={{ 
              height: `${Math.min(50, groundOpacity * 50)}%`,
              opacity: groundOpacity,
              transform: `rotate(${-state.roll}deg)`,
              transformOrigin: 'center bottom',
            }}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#2a4a1a] via-[#3a5a2a] to-[#4a6a3a]" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={`gline-${i}`} className="ground-line"
                style={{ width: '200%', bottom: `${i * 12}%`, left: `${-groundOffset % 200}px`, opacity: 0.3 - i * 0.03 }} />
            ))}
            {/* Runway when on ground */}
            {state.altitude < 100 && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-full bg-[#3a3a3a] border-x border-[#555]">
                {/* Center line markings */}
                {[0, 1, 2, 3, 4, 5].map(i => (
                  <div key={`rwy-${i}`} className="absolute left-1/2 -translate-x-1/2 w-1 h-4 bg-white/60"
                    style={{ bottom: `${((i * 20 - groundOffset * 2) % 120 + 120) % 120}%` }} />
                ))}
                {/* Edge lights */}
                <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-t from-blue-400/40 via-blue-400/20 to-transparent" />
                <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-t from-blue-400/40 via-blue-400/20 to-transparent" />
              </div>
            )}
          </div>
        )}

        {/* Horizon glow - pitch up moves horizon down */}
        <div className="absolute left-0 right-0 h-8 pointer-events-none"
          style={{ 
            top: `${50 + state.pitch * 2}%`, 
            transform: `rotate(${-state.roll}deg)`, 
            transformOrigin: 'center',
            background: 'linear-gradient(to top, rgba(255,200,100,0.15), transparent)',
          }} />

        {/* Horizon line - thicker and more visible */}
        <div className="absolute left-0 right-0 h-0.5 bg-white/40 pointer-events-none"
          style={{ top: `${50 + state.pitch * 2}%`, transform: `rotate(${-state.roll}deg)`, transformOrigin: 'center' }} />
        
        {/* Attitude warning overlay - prevents spatial disorientation */}
        {(Math.abs(state.pitch) > 15 || Math.abs(state.roll) > 30) && state.altitude > 0 && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <div className={`px-4 py-2 rounded font-bold text-sm tracking-wider animate-pulse ${
              Math.abs(state.pitch) > 20 || Math.abs(state.roll) > 45 
                ? 'bg-red-600/80 text-white' 
                : 'bg-amber-500/80 text-black'
            }`}>
              {Math.abs(state.pitch) > 20 ? '⚠ PITCH' : Math.abs(state.roll) > 45 ? '⚠ BANK' : '⚠ ATTITUDE'}
            </div>
          </div>
        )}
        
        {/* Digital attitude display in external view */}
        <div className="absolute top-1/2 left-2 -translate-y-1/2 flex flex-col gap-1 text-[10px] pointer-events-none">
          <div className="flex items-center gap-1">
            <span className="text-green-400/60 w-8">PIT</span>
            <span className={`font-bold font-mono ${state.pitch > 15 ? 'text-amber-400' : state.pitch < -10 ? 'text-amber-400' : 'text-green-400'}`}>
              {state.pitch > 0 ? '+' : ''}{state.pitch.toFixed(1)}°
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-green-400/60 w-8">ROL</span>
            <span className={`font-bold font-mono ${Math.abs(state.roll) > 30 ? 'text-amber-400' : 'text-green-400'}`}>
              {state.roll > 0 ? 'R+' : state.roll < 0 ? 'L' : ''}{Math.abs(state.roll).toFixed(1)}°
            </span>
          </div>
        </div>
        
        <div className="absolute top-2 left-3 flex gap-4 text-[10px]">
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">GS</span>
            <span className="text-sm font-bold text-green-400">{Math.round(state.groundSpeed)}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">TAS</span>
            <span className="text-sm font-bold text-green-400">{Math.round(state.airspeed / Math.sqrt(Math.max(0.1, 1 - state.altitude * 0.000006875 * 1.4)))}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">WIND</span>
            <span className="text-sm font-bold text-green-400">{weather.windDir}°/{weather.windSpeed}</span>
          </div>
        </div>
        
        <div className="absolute top-2 right-3 flex gap-4 text-[10px]">
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">SAT</span>
            <span className="text-sm font-bold text-green-400">{Math.round(weather.temperature - state.altitude * 0.002)}°C</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">MACH</span>
            <span className="text-sm font-bold text-green-400">{(state.airspeed / 660).toFixed(2)}</span>
          </div>
        </div>

        <div className="absolute bottom-1.5 left-3 text-[9px] text-white/30 tracking-widest">BOEING 777-9</div>

        <div className="absolute bottom-1.5 right-3 flex gap-4 text-[10px]">
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">ALT</span>
            <span className="text-sm font-bold text-green-400">{Math.round(state.altitude).toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">VS</span>
            <span className={`text-sm font-bold ${Math.abs(state.verticalSpeed) > 200 ? (state.verticalSpeed > 0 ? 'text-green-400' : 'text-amber-400') : 'text-green-400'}`}>
              {state.verticalSpeed > 0 ? '+' : ''}{Math.round(state.verticalSpeed)}
            </span>
          </div>
        </div>
      </div>

      {/* Master Caution/Warning Lights and ECAM Messages */}
      {(masterCaution || masterWarning) && (
        <div className="flex-shrink-0 flex items-center gap-3 px-3 py-1 bg-black border-b border-[#2a2a2a]">
          {/* Master Warning Light (Red) */}
          <div 
            className={`px-3 py-1 rounded font-bold text-xs tracking-wider transition-all ${
              masterWarning && masterWarningFlash
                ? 'bg-red-600 text-white shadow-lg shadow-red-500/50'
                : masterWarning
                ? 'bg-red-900/50 text-red-400 border border-red-600'
                : 'bg-transparent text-gray-600'
            }`}
          >
            MASTER WARNING
          </div>
          
          {/* Master Caution Light (Amber) */}
          <div 
            className={`px-3 py-1 rounded font-bold text-xs tracking-wider transition-all ${
              masterCaution && masterCautionFlash && !masterWarning
                ? 'bg-amber-500 text-black shadow-lg shadow-amber-400/50'
                : masterCaution && !masterWarning
                ? 'bg-amber-900/50 text-amber-400 border border-amber-600'
                : 'bg-transparent text-gray-600'
            }`}
          >
            MASTER CAUTION
          </div>

          {/* ECAM Messages */}
          <div className="flex-1 flex gap-2 overflow-x-auto">
            {alerts.filter(a => a.level === 'warning').map(alert => (
              <span key={alert.id} className="px-2 py-0.5 bg-red-900/30 border border-red-600 rounded text-red-400 text-[10px] font-bold whitespace-nowrap">
                {alert.message}
              </span>
            ))}
            {alerts.filter(a => a.level === 'caution').map(alert => (
              <span key={alert.id} className="px-2 py-0.5 bg-amber-900/30 border border-amber-600 rounded text-amber-400 text-[10px] font-bold whitespace-nowrap">
                {alert.message}
              </span>
            ))}
            {alerts.filter(a => a.level === 'advisory').map(alert => (
              <span key={alert.id} className="px-2 py-0.5 bg-blue-900/30 border border-blue-600 rounded text-blue-400 text-[10px] whitespace-nowrap">
                {alert.message}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* MCP Panel */}
      <div className="mcp-panel flex items-center justify-center gap-2 px-3 py-1.5 bg-[#111] border-y border-[#2a2a2a] flex-shrink-0">
        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">IAS</span>
          <button className="knob-btn" onClick={() => adjustTargetAirspeed(-5)} tabIndex={-1}>−</button>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[40px] text-center">{Math.round(state.targetAirspeed)}</span>
          <button className="knob-btn" onClick={() => adjustTargetAirspeed(5)} tabIndex={-1}>+</button>
        </div>

        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">HDG</span>
          <button className="knob-btn" onClick={() => adjustTargetHeading(-5)} tabIndex={-1}>−</button>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[40px] text-center">{String(Math.round(state.targetHeading)).padStart(3, '0')}</span>
          <button className="knob-btn" onClick={() => adjustTargetHeading(5)} tabIndex={-1}>+</button>
        </div>

        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">ALT</span>
          <button className="knob-btn" onClick={() => adjustTargetAltitude(-100)} tabIndex={-1}>−</button>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[56px] text-center">{Math.round(state.targetAltitude).toLocaleString()}</span>
          <button className="knob-btn" onClick={() => adjustTargetAltitude(100)} tabIndex={-1}>+</button>
        </div>

        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">V/S</span>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[48px] text-center">
            {state.verticalSpeed > 0 ? '+' : ''}{Math.round(state.verticalSpeed)}
          </span>
        </div>

        <div className="flex gap-1.5 ml-1">
          <button className={`ap-btn ${state.autopilotEnabled ? 'active' : ''}`} onClick={() => dispatch('TOGGLE_AUTOPILOT')}>A/P [P]</button>
          <button className={`ap-btn ${state.autothrottleEnabled ? 'active' : ''}`} onClick={() => dispatch('TOGGLE_AUTOTHROTTLE')}>A/T [T]</button>
        </div>

        <button 
          onClick={() => setShowScenarioPanel(true)}
          className={`ap-btn ml-1 ${state.activeScenario !== 'normal' ? 'active' : ''}`}
          style={state.activeScenario !== 'normal' ? { background: '#ffaa00', borderColor: '#ffaa00', color: '#000' } : {}}
        >
          {state.activeScenario === 'normal' ? '⚡ 特殊情况' : `⚡ ${SCENARIOS.find(s => s.id === state.activeScenario)?.name || '场景'}`}
        </button>
      </div>

      {/* Main Instrument Panel */}
      <div className="instrument-grid flex-1 grid grid-cols-12 gap-1.5 p-1.5 bg-[#0d0d0d] overflow-hidden min-h-0">
        
        {/* PFD - Primary Flight Display */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            PRIMARY FLIGHT DISPLAY
          </div>
          <div className="flex-1 relative overflow-hidden min-h-0">
            {/* Full SVG PFD */}
            <svg viewBox="0 0 300 400" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              <defs>
                <linearGradient id="skyGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1a4a7a" />
                  <stop offset="100%" stopColor="#4a8aba" />
                </linearGradient>
                <linearGradient id="groundGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#8a6a20" />
                  <stop offset="100%" stopColor="#4a3008" />
                </linearGradient>
                <clipPath id="attitudeClip">
                  <circle cx="150" cy="180" r="95" />
                </clipPath>
              </defs>

              {/* Speed Tape (Left) */}
              <rect x="5" y="80" width="55" height="200" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
              {Array.from({ length: 11 }, (_, i) => {
                const val = Math.round(state.airspeed - 50 + i * 10);
                const y = 180 - (val - state.airspeed) * 2;
                if (y < 80 || y > 280) return null;
                return (
                  <g key={`spd-${i}`}>
                    <line x1="50" y1={y} x2="55" y2={y} stroke="#00ff88" strokeWidth="1" />
                    <text x="45" y={y + 3} textAnchor="end" fill="#00ff88" fontSize="9" fontFamily="monospace">
                      {val > 0 ? val : ''}
                    </text>
                  </g>
                );
              })}
              {/* Current speed box */}
              <rect x="5" y="170" width="55" height="20" fill="#000" stroke="#00ff88" strokeWidth="2" />
              <text x="32" y="184" textAnchor="middle" fill="#00ff88" fontSize="14" fontWeight="bold" fontFamily="monospace">
                {Math.round(state.airspeed)}
              </text>
              {/* Speed trend arrow */}
              {Math.abs(speedTrend) > 2 && (
                <g transform={`translate(62, 180)`}>
                  {speedTrend > 0 ? (
                    <polygon points="0,-8 4,0 -4,0" fill="#00ff88" opacity="0.8" />
                  ) : (
                    <polygon points="0,8 4,0 -4,0" fill="#ffaa00" opacity="0.8" />
                  )}
                  <line x1="0" y1={speedTrend > 0 ? 0 : 0} x2="0" y2={speedTrend > 0 ? -Math.min(15, Math.abs(speedTrend) * 0.5) : Math.min(15, Math.abs(speedTrend) * 0.5)} 
                    stroke={speedTrend > 0 ? '#00ff88' : '#ffaa00'} strokeWidth="2" />
                </g>
              )}
              <text x="32" y="70" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">IAS</text>
              <text x="32" y="300" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">KTS</text>

              {/* Attitude Indicator (Center) - Fixed transform order */}
              <circle cx="150" cy="180" r="98" fill="none" stroke="#333" strokeWidth="3" />
              <g clipPath="url(#attitudeClip)">
                {/* Sky/Ground with rotation - FIXED: translate first, then rotate */}
                <g transform={`rotate(${-state.roll}, 150, 180) translate(0, ${-state.pitch * 3})`}>
                  <rect x="0" y="-100" width="300" height="280" fill="url(#skyGrad)" />
                  <rect x="0" y="180" width="300" height="320" fill="url(#groundGrad)" />
                  {/* Horizon line - thicker and more visible */}
                  <line x1="0" y1="180" x2="300" y2="180" stroke="white" strokeWidth="3" />
                  {/* Pitch ladder - more detailed */}
                  {[-20, -15, -10, -5, 5, 10, 15, 20].map(p => (
                    <g key={`pitch-${p}`}>
                      <line x1="110" y1={180 - p * 4} x2="140" y2={180 - p * 4} stroke="white" strokeWidth={Math.abs(p) % 10 === 0 ? 2 : 1} />
                      <line x1="160" y1={180 - p * 4} x2="190" y2={180 - p * 4} stroke="white" strokeWidth={Math.abs(p) % 10 === 0 ? 2 : 1} />
                      <text x="105" y={183 - p * 4} textAnchor="end" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        {Math.abs(p)}
                      </text>
                      <text x="195" y={183 - p * 4} textAnchor="start" fill="white" fontSize="9" fontWeight="bold" fontFamily="monospace">
                        {Math.abs(p)}
                      </text>
                    </g>
                  ))}
                </g>
              </g>

              {/* Bank angle marks (fixed outer ring) */}
              {[0, 10, 20, 30, 45, 60].map(angle => (
                <g key={`bank-l-${angle}`} transform={`rotate(${-angle}, 150, 180)`}>
                  <line x1="150" y1="85" x2="150" y2="92" stroke="white" strokeWidth="1.5" />
                </g>
              ))}
              {[10, 20, 30, 45, 60].map(angle => (
                <g key={`bank-r-${angle}`} transform={`rotate(${angle}, 150, 180)`}>
                  <line x1="150" y1="85" x2="150" y2="92" stroke="white" strokeWidth="1.5" />
                </g>
              ))}
              {/* Bank pointer - moves with aircraft roll */}
              <g transform={`rotate(${-state.roll}, 150, 180)`}>
                <polygon points="150,88 146,95 154,95" fill="white" />
              </g>
              {/* Fixed triangle at top */}
              <polygon points="150,82 146,76 154,76" fill="#ffcc00" />

              {/* Aircraft symbol (fixed) */}
              <g>
                {/* Wings */}
                <rect x="95" y="177" width="40" height="6" fill="#ffcc00" />
                <rect x="165" y="177" width="40" height="6" fill="#ffcc00" />
                {/* Center */}
                <circle cx="150" cy="180" r="6" fill="none" stroke="#ffcc00" strokeWidth="2" />
                {/* Tail */}
                <rect x="147" y="190" width="6" height="12" fill="#ffcc00" />
              </g>

              {/* Digital pitch/roll readout - prevents spatial disorientation */}
              <rect x="115" y="285" width="70" height="35" fill="#000" stroke="#00ff88" strokeWidth="1" rx="3" />
              <text x="150" y="298" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">PITCH / ROLL</text>
              <text x="130" y="313" textAnchor="middle" fill={state.pitch > 15 ? '#ffaa00' : state.pitch < -10 ? '#ffaa00' : '#00ff88'} fontSize="11" fontWeight="bold" fontFamily="monospace">
                {state.pitch > 0 ? '+' : ''}{state.pitch.toFixed(1)}°
              </text>
              <text x="170" y="313" textAnchor="middle" fill={Math.abs(state.roll) > 30 ? '#ffaa00' : '#00ff88'} fontSize="11" fontWeight="bold" fontFamily="monospace">
                {state.roll > 0 ? '+' : ''}{state.roll.toFixed(1)}°
              </text>

              {/* Altitude Tape (Right) */}
              <rect x="240" y="80" width="55" height="200" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
              {Array.from({ length: 11 }, (_, i) => {
                const val = Math.round((state.altitude - 500 + i * 100) / 100) * 100;
                const y = 180 - (val - state.altitude) * 0.1;
                if (y < 80 || y > 280) return null;
                return (
                  <g key={`alt-${i}`}>
                    <line x1="240" y1={y} x2="245" y2={y} stroke="#00ff88" strokeWidth="1" />
                    <text x="250" y={y + 3} textAnchor="start" fill="#00ff88" fontSize="9" fontFamily="monospace">
                      {val > 0 ? Math.round(val / 100) : ''}
                    </text>
                  </g>
                );
              })}
              {/* Current altitude box */}
              <rect x="240" y="170" width="55" height="20" fill="#000" stroke="#00ff88" strokeWidth="2" />
              <text x="267" y="184" textAnchor="middle" fill="#00ff88" fontSize="12" fontWeight="bold" fontFamily="monospace">
                {Math.round(state.altitude).toLocaleString()}
              </text>
              {/* Altitude trend arrow */}
              {Math.abs(altTrend) > 100 && (
                <g transform={`translate(237, 180)`}>
                  {altTrend > 0 ? (
                    <polygon points="0,-8 4,0 -4,0" fill="#00ff88" opacity="0.8" />
                  ) : (
                    <polygon points="0,8 4,0 -4,0" fill="#ffaa00" opacity="0.8" />
                  )}
                  <line x1="0" y1={0} x2="0" y2={altTrend > 0 ? -Math.min(15, Math.abs(altTrend) / 200) : Math.min(15, Math.abs(altTrend) / 200)} 
                    stroke={altTrend > 0 ? '#00ff88' : '#ffaa00'} strokeWidth="2" />
                </g>
              )}
              <text x="267" y="70" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">ALT</text>
              <text x="267" y="300" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">FT</text>

              {/* Vertical Speed Indicator (Far right) */}
              <rect x="298" y="120" width="12" height="120" fill="#0a0a0a" stroke="#333" strokeWidth="1" />
              <line x1="298" y1="180" x2="310" y2="180" stroke="#6a8a6a" strokeWidth="1" />
              {[-2000, -1000, 0, 1000, 2000].map(vs => {
                const y = 180 - (vs / 2000) * 50;
                return (
                  <g key={`vs-${vs}`}>
                    <line x1="298" y1={y} x2="302" y2={y} stroke="#6a8a6a" strokeWidth="1" />
                  </g>
                );
              })}
              {/* VS needle */}
              <line 
                x1="304" y1="180" 
                x2="304" y2={180 - Math.max(-50, Math.min(50, state.verticalSpeed / 40))} 
                stroke={state.verticalSpeed > 100 ? '#00ff88' : state.verticalSpeed < -100 ? '#ffaa00' : '#6a8a6a'} 
                strokeWidth="2" 
              />
              <text x="304" y="115" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">VS</text>
              <text x="304" y="250" textAnchor="middle" fill={state.verticalSpeed > 100 ? '#00ff88' : state.verticalSpeed < -100 ? '#ffaa00' : '#6a8a6a'} fontSize="8" fontFamily="monospace">
                {state.verticalSpeed > 0 ? '+' : ''}{Math.round(state.verticalSpeed / 100) * 100}
              </text>

              {/* Heading display at bottom */}
              <rect x="100" y="310" width="100" height="30" fill="#0a0a0a" stroke="#333" strokeWidth="1" rx="2" />
              <text x="150" y="325" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">HDG</text>
              <text x="150" y="338" textAnchor="middle" fill="#00ff88" fontSize="14" fontWeight="bold" fontFamily="monospace">
                {String(Math.round(state.heading)).padStart(3, '0')}° {getHeadingDir(state.heading)}
              </text>

              {/* Flight mode annunciations */}
              <text x="150" y="370" textAnchor="middle" fill="#00ff88" fontSize="9" fontFamily="monospace">
                {state.autopilotEnabled ? 'A/P ENG' : 'MANUAL'} | {state.autothrottleEnabled ? 'A/T ENG' : 'MAN THR'}
              </text>
            </svg>
          </div>
        </div>

        {/* ND - Navigation Display (Heading + Traffic Combined) */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            NAVIGATION DISPLAY
          </div>
          <div className="flex-1 relative overflow-hidden min-h-0">
            <svg viewBox="0 0 300 350" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
              {/* Radar circles */}
              <circle cx="150" cy="160" r="120" fill="none" stroke="#1a3a1a" strokeWidth="1" />
              <circle cx="150" cy="160" r="80" fill="none" stroke="#1a3a1a" strokeWidth="1" strokeDasharray="2,2" />
              <circle cx="150" cy="160" r="40" fill="none" stroke="#1a3a1a" strokeWidth="1" strokeDasharray="2,2" />
              
              {/* Cross lines */}
              <line x1="30" y1="160" x2="270" y2="160" stroke="#1a3a1a" strokeWidth="1" />
              <line x1="150" y1="40" x2="150" y2="280" stroke="#1a3a1a" strokeWidth="1" />

              {/* Heading arc with marks */}
              {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180, 190, 200, 210, 220, 230, 240, 250, 260, 270, 280, 290, 300, 310, 320, 330, 340, 350].map(deg => {
                const relDeg = ((deg - state.heading + 540) % 360) - 180;
                if (Math.abs(relDeg) > 90) return null;
                const angle = (relDeg - 90) * Math.PI / 180;
                const x1 = 150 + Math.cos(angle) * 115;
                const y1 = 160 + Math.sin(angle) * 115;
                const x2 = 150 + Math.cos(angle) * 120;
                const y2 = 160 + Math.sin(angle) * 120;
                const tx = 150 + Math.cos(angle) * 130;
                const ty = 160 + Math.sin(angle) * 130;
                const isMajor = deg % 30 === 0;
                const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : '';
                return (
                  <g key={`hdg-${deg}`}>
                    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="#00ff88" strokeWidth={isMajor ? 2 : 1} />
                    {isMajor && (
                      <text x={tx} y={ty + 3} textAnchor="middle" fill="#00ff88" fontSize="10" fontWeight="bold" fontFamily="monospace">
                        {label || deg}
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Heading line (our direction - top) */}
              <line x1="150" y1="40" x2="150" y2="80" stroke="#ffcc00" strokeWidth="2" />
              <polygon points="150,40 146,48 154,48" fill="#ffcc00" />

              {/* Our aircraft (center) */}
              <g transform="translate(150, 160)">
                <polygon points="0,-12 6,8 0,4 -6,8" fill="white" />
              </g>

              {/* Traffic dots */}
              {trafficPositions.map(t => {
                const relBearing = getRelativeBearing(t.bearing);
                if (Math.abs(relBearing) > 90) return null;
                const distNorm = Math.min(1, t.distance / 50);
                const angle = (relBearing - 90) * Math.PI / 180;
                const x = 150 + Math.cos(angle) * distNorm * 100;
                const y = 160 + Math.sin(angle) * distNorm * 100;
                const altDiff = t.altitude - state.altitude;
                const altIndicator = altDiff > 1000 ? '↑' : altDiff < -1000 ? '↓' : '=';
                const altColor = Math.abs(altDiff) < 1000 ? '#ffaa00' : '#00ff88';
                return (
                  <g key={`traffic-${t.id}`}>
                    <circle cx={x} cy={y} r="4" fill="#00ff88" style={{ filter: 'drop-shadow(0 0 3px #00ff88)' }} />
                    <text x={x + 8} y={y - 4} fill="#00ff88" fontSize="7" fontFamily="monospace">
                      {t.callsign}
                    </text>
                    <text x={x + 8} y={y + 4} fill={altColor} fontSize="7" fontFamily="monospace">
                      {altIndicator}{Math.abs(Math.round(altDiff / 1000))}
                    </text>
                  </g>
                );
              })}

              {/* Range labels */}
              <text x="150" y="52" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">50 NM</text>
              <text x="150" y="92" textAnchor="middle" fill="#6a8a6a" fontSize="7" fontFamily="monospace">25</text>

              {/* Current heading display */}
              <rect x="100" y="295" width="100" height="35" fill="#0a0a0a" stroke="#1a3a1a" strokeWidth="1" rx="2" />
              <text x="150" y="310" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">HEADING</text>
              <text x="150" y="325" textAnchor="middle" fill="#00ff88" fontSize="16" fontWeight="bold" fontFamily="monospace">
                {String(Math.round(state.heading)).padStart(3, '0')}°
              </text>

              {/* Info row */}
              <text x="50" y="345" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">GS {Math.round(state.groundSpeed)}</text>
              <text x="150" y="345" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">TRAF {trafficPositions.length}</text>
              <text x="250" y="345" textAnchor="middle" fill="#6a8a6a" fontSize="8" fontFamily="monospace">WIND {weather.windDir}°/{weather.windSpeed}</text>
            </svg>
          </div>
        </div>

        {/* EICAS - Electronic Engine Display with Circular Gauges */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            ENGINE INDICATION & CREW ALERTING
          </div>
          <div className="flex-1 flex flex-col p-2 gap-2 overflow-y-auto min-h-0">
            {/* Engine N1 Circular Gauges */}
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              {[1, 2].map(engNum => {
                const n1 = engNum === 1 ? state.engine1N1 : state.engine2N1;
                const enabled = engNum === 1 ? state.engine1Enabled : state.engine2Enabled;
                return (
                  <div key={engNum} className="eicas-display p-2 flex flex-col items-center">
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="eicas-label">ENG {engNum}</span>
                      <button
                        onClick={() => dispatch(engNum === 1 ? 'TOGGLE_ENGINE_1' : 'TOGGLE_ENGINE_2')}
                        className={`text-[8px] px-1.5 py-0.5 rounded border ${
                          enabled ? 'bg-green-400/20 border-green-400 text-green-400' : 'bg-red-400/20 border-red-400 text-red-400'
                        }`}
                      >{enabled ? 'ON' : 'OFF'}</button>
                    </div>
                    <CircularGauge value={n1} max={100} label="N1" unit="%" warning={85} danger={95} />
                  </div>
                );
              })}
            </div>

            {/* N2 Circular Gauges */}
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              {[1, 2].map(engNum => {
                const n1 = engNum === 1 ? state.engine1N1 : state.engine2N1;
                const n2 = Math.min(100, n1 * 1.05);
                return (
                  <div key={`n2-${engNum}`} className="eicas-display p-2 flex flex-col items-center">
                    <CircularGauge value={n2} max={100} label={`ENG${engNum} N2`} unit="%" warning={90} danger={98} />
                  </div>
                );
              })}
            </div>

            {/* N3 Circular Gauges */}
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              {[1, 2].map(engNum => {
                const n1 = engNum === 1 ? state.engine1N1 : state.engine2N1;
                const n3 = Math.min(100, n1 * 0.95);
                return (
                  <div key={`n3-${engNum}`} className="eicas-display p-2 flex flex-col items-center">
                    <CircularGauge value={n3} max={100} label={`ENG${engNum} N3`} unit="%" warning={85} danger={95} />
                  </div>
                );
              })}
            </div>

            {/* Throttle Display */}
            <div className="eicas-display p-2 flex-shrink-0">
              <div className="flex items-center justify-between mb-1">
                <span className="eicas-label">THROTTLE</span>
                <span className="eicas-value text-lg font-bold">{Math.round(state.throttle)}%</span>
              </div>
              <input
                type="range" min="0" max="100" step="1"
                value={Math.round(state.throttle)}
                onChange={(e) => setThrottle(parseInt(e.target.value))}
                onMouseUp={(e) => (e.target as HTMLElement).blur()}
                onTouchEnd={(e) => (e.target as HTMLElement).blur()}
                onKeyDown={(e) => {
                  // Prevent arrow keys from adjusting the slider
                  if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.key)) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                }}
                className="w-full h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[7px] text-gray-500 mt-0.5">
                <span>IDLE</span>
                <span>TOGA</span>
              </div>
            </div>

            {/* Engine Parameters - Circular Gauges */}
            <div className="eicas-display p-2 flex-shrink-0">
              <div className="eicas-label mb-2 text-center">ENGINE PARAMETERS</div>
              <div className="grid grid-cols-3 gap-1">
                <CircularGauge 
                  value={400 + state.engine1N1 * 3} 
                  max={900} 
                  label="EGT" 
                  unit="°C"
                  warning={75}
                  danger={90}
                />
                <CircularGauge 
                  value={40 + state.engine1N1 * 0.3} 
                  max={80} 
                  label="OIL" 
                  unit="PSI"
                  warning={80}
                  danger={90}
                />
                <CircularGauge 
                  value={60 + state.engine1N1 * 0.2} 
                  max={120} 
                  label="OIL" 
                  unit="°C"
                  warning={75}
                  danger={90}
                />
              </div>
            </div>

            {/* Fuel */}
            <div className="eicas-display p-2 flex-shrink-0">
              <div className="eicas-label mb-1">FUEL</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex justify-between text-[8px]">
                    <span className="eicas-label">FLOW</span>
                    <span className="eicas-value font-bold">{Math.round(state.throttle * 50)}</span>
                  </div>
                  <div className="text-[7px] text-gray-500 text-right">KG/H</div>
                </div>
                <div>
                  <div className="flex justify-between text-[8px]">
                    <span className="eicas-label">TOTAL</span>
                    <span className="eicas-value font-bold">82,400</span>
                  </div>
                  <div className="text-[7px] text-gray-500 text-right">KG</div>
                </div>
              </div>
            </div>

            {/* System Status */}
            <div className="eicas-display p-2 flex-shrink-0">
              <div className="eicas-label mb-1">SYSTEMS</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px]">
                <div className="flex justify-between">
                  <span className="eicas-label">GEAR</span>
                  <span className={state.gearDown ? 'eicas-value' : 'text-gray-500'}>{state.gearDown ? 'DOWN' : 'UP'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="eicas-label">FLAPS</span>
                  <span className="eicas-value">{state.flapsAngle}°</span>
                </div>
                <div className="flex justify-between">
                  <span className="eicas-label">A/P</span>
                  <span className={state.autopilotEnabled ? 'eicas-value' : 'text-gray-500'}>{state.autopilotEnabled ? 'ENG' : 'OFF'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="eicas-label">A/T</span>
                  <span className={state.autothrottleEnabled ? 'eicas-value' : 'text-gray-500'}>{state.autothrottleEnabled ? 'ENG' : 'OFF'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="eicas-label">REV</span>
                  <span className={state.reverseThrust ? 'text-amber-400' : 'text-gray-500'}>{state.reverseThrust ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Crash Overlay */}
      {state.crashed && (
        <div className="absolute inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          {/* Fire/explosion effect */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute inset-0 bg-gradient-radial from-orange-600/30 via-red-900/20 to-transparent animate-pulse" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-orange-500/20 blur-3xl animate-ping" />
          </div>
          
          <div className="relative z-10 text-center p-8 max-w-md">
            {/* Crash icon */}
            <div className="text-6xl mb-4 animate-bounce">💥</div>
            
            {/* Crash title */}
            <h1 className="text-4xl font-bold text-red-500 mb-2 tracking-wider animate-pulse">
              CRASH
            </h1>
            
            {/* Crash reason */}
            <p className="text-xl text-red-400 mb-6">
              {state.crashReason}
            </p>
            
            {/* Stats */}
            <div className="bg-black/50 border border-red-900/50 rounded-lg p-4 mb-6 text-left">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-400">最终高度:</div>
                <div className="text-white font-mono">{Math.round(state.altitude)} ft</div>
                <div className="text-gray-400">最终空速:</div>
                <div className="text-white font-mono">{Math.round(state.airspeed)} kts</div>
                <div className="text-gray-400">下降率:</div>
                <div className="text-red-400 font-mono">{Math.round(state.verticalSpeed)} ft/min</div>
                <div className="text-gray-400">俯仰角:</div>
                <div className="text-white font-mono">{state.pitch.toFixed(1)}°</div>
                <div className="text-gray-400">滚转角:</div>
                <div className="text-white font-mono">{state.roll.toFixed(1)}°</div>
              </div>
            </div>
            
            {/* Reset button */}
            <button
              onClick={() => dispatch('RESET')}
              className="px-8 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg transition-all transform hover:scale-105 shadow-lg shadow-red-900/50"
            >
              重新开始
            </button>
            
            {/* Tips */}
            <p className="text-xs text-gray-500 mt-4">
              提示: 着陆时保持下降率在 500-800 ft/min，俯仰角 2-5°
            </p>
          </div>
        </div>
      )}

      {/* Scenario Panel (floating) */}
      {showScenarioPanel && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70" onClick={() => setShowScenarioPanel(false)}>
          <div className="bg-[#111] border border-[#333] rounded-lg p-4 max-w-md w-full mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-green-400 tracking-wider">特殊情况飞行</h3>
              <button onClick={() => setShowScenarioPanel(false)} className="text-gray-500 hover:text-white text-lg">×</button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => { setScenario(s.id); setShowScenarioPanel(false); }}
                  className={`p-3 rounded border text-left transition-all ${
                    state.activeScenario === s.id 
                      ? 'border-green-400 bg-green-400/10' 
                      : 'border-[#333] bg-[#0a0a0a] hover:border-green-400/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{s.icon}</span>
                    <span className="text-xs font-bold text-green-400">{s.name}</span>
                  </div>
                  <p className="text-[10px] text-gray-500">{s.description}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Keyboard shortcuts */}
      <div className="flex-shrink-0 px-3 py-1.5 bg-[#111] border-t border-[#2a2a2a] text-[9px] text-gray-500 flex gap-3 flex-wrap items-center">
        <span className="text-gray-400">↑↓←→</span><span>姿态</span>
        <span className="text-gray-400">W/S</span><span>油门</span>
        <span className="text-gray-400">G</span><span>起落架</span>
        <span className="text-gray-400">R</span><span>反推</span>
        <span className="text-gray-400">P</span><span>自动驾驶</span>
        <span className="text-gray-400">T</span><span>自动油门</span>
        <span className="text-gray-400">1/2</span><span>引擎</span>
        <span className="text-gray-400">[/]</span><span>襟翼</span>
      </div>
    </div>
  );
}
