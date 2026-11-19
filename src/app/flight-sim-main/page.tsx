'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
import { useFlight } from '@/contexts/FlightContext';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';

// Traffic aircraft type
interface TrafficAircraft {
  id: number;
  bearing: number;
  distance: number;
  altitude: number;
  heading: number;
  speed: number;
  callsign: string;
}

// Weather type
interface Weather {
  type: 'clear' | 'cloudy' | 'rain' | 'fog' | 'storm';
  visibility: number;
  windDir: number;
  windSpeed: number;
  clouds: number;
  temperature: number;
}

export default function FlightSimulatorPage() {
  const { 
    state, 
    dispatch, 
    setThrottle,
    adjustTargetHeading, 
    adjustTargetAltitude, 
    adjustTargetAirspeed 
  } = useFlight();
  const [currentTime, setCurrentTime] = useState(new Date());
  const cloudOffsetRef = useRef(0);
  const groundOffsetRef = useRef(0);
  const [cloudOffset, setCloudOffset] = useState(0);
  const [groundOffset, setGroundOffset] = useState(0);

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

  // Speed tape values
  const speedTapeValues = Array.from({ length: 11 }, (_, i) => Math.round(state.airspeed - 50 + i * 10));
  const altTapeValues = Array.from({ length: 11 }, (_, i) => Math.round((state.altitude - 500 + i * 100) / 100) * 100);

  return (
    <div className="h-screen bg-[#0a0a0a] text-white font-mono flex flex-col overflow-hidden select-none">
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
        .eicas-bar {
          height: 6px;
          background: #0a1a0a;
          border: 1px solid #1a3a1a;
          border-radius: 2px;
          overflow: hidden;
        }
        .eicas-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff88, #00cc6a);
          transition: width 0.2s;
        }
        .traffic-dot {
          position: absolute;
          width: 8px; height: 8px;
          background: #00ff88;
          border-radius: 50%;
          box-shadow: 0 0 6px #00ff88;
        }
        .traffic-label {
          position: absolute;
          font-size: 7px;
          color: #00ff88;
          white-space: nowrap;
          text-shadow: 0 0 2px #000;
        }
        .pfd-tape {
          position: absolute;
          width: 50px;
          height: 100%;
          background: rgba(0,0,0,0.85);
          border: 1px solid #333;
          overflow: hidden;
        }
        .pfd-tape-item {
          position: absolute;
          left: 0; right: 0;
          text-align: center;
          font-size: 10px;
          color: #00ff88;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pfd-tape-item::before {
          content: '';
          position: absolute;
          right: 0;
          top: 50%;
          width: 6px;
          height: 1px;
          background: #00ff88;
        }
        .pfd-tape-left .pfd-tape-item::before {
          right: auto;
          left: 0;
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
              transform: `rotate(${state.roll}deg)`,
              transformOrigin: 'center bottom'
            }}>
            <div className="absolute inset-0 bg-gradient-to-t from-[#2a4a1a] via-[#3a5a2a] to-[#4a6a3a]" />
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={`gline-${i}`} className="ground-line"
                style={{ width: '200%', bottom: `${i * 12}%`, left: `${-groundOffset % 200}px`, opacity: 0.3 - i * 0.03 }} />
            ))}
          </div>
        )}

        <div className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ bottom: `${50 + state.pitch * 1.5}%`, transform: `rotate(${state.roll}deg)`, transformOrigin: 'center' }} />
        
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
      </div>

      {/* Main Instrument Panel */}
      <div className="instrument-grid flex-1 grid grid-cols-12 gap-1.5 p-1.5 bg-[#0d0d0d] overflow-hidden min-h-0">
        
        {/* PFD - Professional Attitude Indicator with Speed/Alt Tapes */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            PRIMARY FLIGHT DISPLAY
          </div>
          <div className="flex-1 flex p-1 overflow-hidden min-h-0 relative">
            {/* Speed Tape (Left) */}
            <div className="pfd-tape pfd-tape-left left-0 top-0 bottom-0 z-20">
              {speedTapeValues.map((val, i) => {
                const offset = (state.airspeed - val) * 2;
                const y = 50 + offset;
                if (y < -10 || y > 110) return null;
                return (
                  <div key={val} className="pfd-tape-item" style={{ top: `${y}%`, transform: 'translateY(-50%)' }}>
                    {val > 0 ? val : ''}
                  </div>
                );
              })}
              {/* Current speed box */}
              <div className="absolute top-1/2 left-0 -translate-y-1/2 bg-black border-2 border-[#00ff88] px-1 py-0.5 z-30">
                <span className="text-sm font-bold text-[#00ff88]">{Math.round(state.airspeed)}</span>
              </div>
            </div>

            {/* Attitude Indicator (Center) */}
            <div className="flex-1 mx-[52px] relative overflow-hidden">
              {/* Circular attitude indicator */}
              <div className="absolute inset-2 rounded-full border-2 border-[#333] overflow-hidden bg-[#0a0a0a]">
                {/* Sky/Ground with roll and pitch */}
                <div 
                  className="absolute inset-[-100%]" 
                  style={{ 
                    transform: `rotate(${state.roll}deg) translateY(${state.pitch * 4}px)`,
                    transformOrigin: 'center center'
                  }}
                >
                  {/* Sky */}
                  <div className="absolute top-0 left-0 right-0 h-1/2" 
                    style={{ background: 'linear-gradient(180deg, #1a4a7a 0%, #2a6a9a 50%, #4a8aba 100%)' }} />
                  {/* Ground */}
                  <div className="absolute bottom-0 left-0 right-0 h-1/2" 
                    style={{ background: 'linear-gradient(180deg, #8a6a20 0%, #6a4a10 50%, #4a3008 100%)' }} />
                  {/* Horizon line */}
                  <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-white -translate-y-[1px]" />
                  {/* Pitch ladder */}
                  {[-15, -10, -5, 5, 10, 15].map(p => (
                    <div key={p} className="absolute left-1/2 -translate-x-1/2 flex items-center"
                      style={{ top: `${50 - p * 2.5}%` }}>
                      <div className="w-1 h-px bg-white" />
                      <span className="text-[8px] text-white mx-1">{Math.abs(p)}</span>
                      <div className="w-1 h-px bg-white" />
                    </div>
                  ))}
                </div>

                {/* Bank angle marks (fixed, rotate with roll for visual) */}
                <div className="absolute inset-0" style={{ transform: `rotate(${state.roll}deg)` }}>
                  {[0, 10, 20, 30, 45, 60].map(angle => (
                    <div key={`l${angle}`} className="absolute top-2 left-1/2 origin-bottom"
                      style={{ transform: `translateX(-50%) rotate(${-angle}deg)`, height: '45%' }}>
                      <div className="w-px h-2 bg-white/60 mx-auto" />
                    </div>
                  ))}
                  {[10, 20, 30, 45, 60].map(angle => (
                    <div key={`r${angle}`} className="absolute top-2 left-1/2 origin-bottom"
                      style={{ transform: `translateX(-50%) rotate(${angle}deg)`, height: '45%' }}>
                      <div className="w-px h-2 bg-white/60 mx-auto" />
                    </div>
                  ))}
                </div>

                {/* Fixed aircraft symbol */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                  <svg width="80" height="40" viewBox="0 0 80 40">
                    {/* Wings */}
                    <rect x="5" y="18" width="25" height="4" fill="#ffcc00" />
                    <rect x="50" y="18" width="25" height="4" fill="#ffcc00" />
                    {/* Center dot */}
                    <circle cx="40" cy="20" r="4" fill="none" stroke="#ffcc00" strokeWidth="2" />
                    {/* Tail */}
                    <rect x="37" y="28" width="6" height="8" fill="#ffcc00" />
                  </svg>
                </div>

                {/* Roll indicator triangle */}
                <div className="absolute top-1 left-1/2 -translate-x-1/2">
                  <div className="w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-white" />
                </div>
              </div>

              {/* Flight data below attitude */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-between px-2 pb-1">
                <div className="bg-black/80 px-2 py-0.5 rounded border border-[#333]">
                  <span className="text-[9px] text-[#00ff88] font-bold">HDG {String(Math.round(state.heading)).padStart(3, '0')}°</span>
                </div>
                <div className="bg-black/80 px-2 py-0.5 rounded border border-[#333]">
                  <span className="text-[9px] text-[#00ff88] font-bold">{getHeadingDir(state.heading)}</span>
                </div>
              </div>
            </div>

            {/* Altitude Tape (Right) */}
            <div className="pfd-tape right-0 top-0 bottom-0 z-20">
              {altTapeValues.map((val, i) => {
                const offset = (state.altitude - val) * 0.1;
                const y = 50 - offset;
                if (y < -10 || y > 110) return null;
                return (
                  <div key={val} className="pfd-tape-item" style={{ top: `${y}%`, transform: 'translateY(-50%)' }}>
                    {val > 0 ? Math.round(val / 100) * 100 : ''}
                  </div>
                );
              })}
              {/* Current altitude box */}
              <div className="absolute top-1/2 right-0 -translate-y-1/2 bg-black border-2 border-[#00ff88] px-1 py-0.5 z-30">
                <span className="text-sm font-bold text-[#00ff88]">{Math.round(state.altitude).toLocaleString()}</span>
              </div>
            </div>

            {/* VS indicator (far right) */}
            <div className="absolute right-0 top-0 bottom-0 w-6 bg-black/80 border-l border-[#333] flex flex-col items-center justify-center z-10">
              <span className="text-[7px] text-gray-500">VS</span>
              <div className={`text-[9px] font-bold ${state.verticalSpeed > 100 ? 'text-green-400' : state.verticalSpeed < -100 ? 'text-amber-400' : 'text-gray-400'}`}>
                {state.verticalSpeed > 0 ? '+' : ''}{Math.round(state.verticalSpeed / 100) * 100}
              </div>
              <div className="w-4 h-px bg-gray-500 mt-0.5" />
              <div className="text-[6px] text-gray-500">FPM</div>
            </div>
          </div>
        </div>

        {/* ND - Combined Heading + Traffic Radar */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            NAVIGATION DISPLAY
          </div>
          <div className="flex-1 flex flex-col p-2 gap-2 overflow-hidden min-h-0">
            {/* Heading display */}
            <div className="eicas-display p-2 flex-shrink-0">
              <div className="flex items-center justify-between">
                <span className="eicas-label">HEADING</span>
                <span className="eicas-value text-xl font-bold">{String(Math.round(state.heading)).padStart(3, '0')}° {getHeadingDir(state.heading)}</span>
              </div>
            </div>

            {/* Combined Radar Display (Heading + Traffic) */}
            <div className="flex-1 eicas-display p-2 min-h-0 relative overflow-hidden">
              <div className="absolute inset-3 flex items-center justify-center">
                <div className="relative w-full h-full max-w-[220px] max-h-[220px] aspect-square">
                  {/* Range rings */}
                  <div className="absolute inset-0 border border-green-400/30 rounded-full" />
                  <div className="absolute inset-[20%] border border-green-400/20 rounded-full" />
                  <div className="absolute inset-[40%] border border-green-400/15 rounded-full" />
                  
                  {/* Heading marks on outer ring */}
                  {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map(deg => {
                    const relDeg = ((deg - state.heading + 540) % 360) - 180;
                    const angle = (relDeg - 90) * Math.PI / 180;
                    const x = 50 + Math.cos(angle) * 48;
                    const y = 50 + Math.sin(angle) * 48;
                    const label = deg === 0 ? 'N' : deg === 90 ? 'E' : deg === 180 ? 'S' : deg === 270 ? 'W' : '';
                    return (
                      <div key={deg} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                        {label && <span className="text-[9px] text-green-400 font-bold">{label}</span>}
                        {!label && <div className="w-1 h-1 bg-green-400/50 rounded-full" />}
                      </div>
                    );
                  })}

                  {/* Cross lines */}
                  <div className="absolute top-1/2 left-[10%] right-[10%] h-px bg-green-400/20" />
                  <div className="absolute left-1/2 top-[10%] bottom-[10%] w-px bg-green-400/20" />
                  
                  {/* Heading line (our direction) */}
                  <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-0.5 h-[20%] bg-yellow-400" />
                  <div className="absolute top-[5%] left-1/2 -translate-x-1/2 w-2 h-2 bg-yellow-400 rotate-45 -translate-y-1" />

                  {/* Our aircraft (center) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <svg width="20" height="20" viewBox="0 0 20 20">
                      <polygon points="10,2 14,14 10,12 6,14" fill="white" />
                    </svg>
                  </div>

                  {/* Traffic dots */}
                  {trafficPositions.map(t => {
                    const relBearing = getRelativeBearing(t.bearing);
                    const distNorm = Math.min(1, t.distance / 50);
                    const angle = (relBearing - 90) * Math.PI / 180;
                    const x = 50 + Math.cos(angle) * distNorm * 42;
                    const y = 50 + Math.sin(angle) * distNorm * 42;
                    const altDiff = t.altitude - state.altitude;
                    const altIndicator = altDiff > 1000 ? '↑' : altDiff < -1000 ? '↓' : '=';
                    return (
                      <div key={t.id} className="absolute" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}>
                        <div className="traffic-dot" />
                        <div className="traffic-label -top-2.5 left-1/2 -translate-x-1/2">
                          {t.callsign}{altIndicator}{Math.abs(Math.round(altDiff / 1000))}
                        </div>
                      </div>
                    );
                  })}

                  {/* Range labels */}
                  <div className="absolute top-[2%] left-1/2 -translate-x-1/2 text-[7px] text-green-400/60">50</div>
                  <div className="absolute top-[22%] left-1/2 -translate-x-1/2 text-[7px] text-green-400/40">25</div>
                </div>
              </div>
            </div>

            {/* Nav Info Row */}
            <div className="grid grid-cols-4 gap-1 flex-shrink-0">
              <div className="eicas-display p-1.5 text-center">
                <div className="eicas-label">GS</div>
                <div className="eicas-value text-base font-bold">{Math.round(state.groundSpeed)}</div>
              </div>
              <div className="eicas-display p-1.5 text-center">
                <div className="eicas-label">TAS</div>
                <div className="eicas-value text-base font-bold">{Math.round(state.airspeed / Math.sqrt(Math.max(0.1, 1 - state.altitude * 0.000006875 * 1.4)))}</div>
              </div>
              <div className="eicas-display p-1.5 text-center">
                <div className="eicas-label">WIND</div>
                <div className="eicas-value text-xs font-bold">{weather.windDir}°/{weather.windSpeed}</div>
              </div>
              <div className="eicas-display p-1.5 text-center">
                <div className="eicas-label">TRAF</div>
                <div className="eicas-value text-base font-bold">{trafficPositions.length}</div>
              </div>
            </div>
          </div>
        </div>

        {/* EICAS - Electronic Engine Display */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            ENGINE INDICATION & CREW ALERTING
          </div>
          <div className="flex-1 flex flex-col p-2 gap-1.5 overflow-y-auto min-h-0">
            {/* Engine N1/N2/N3 Display */}
            <div className="grid grid-cols-2 gap-2 flex-shrink-0">
              {[1, 2].map(engNum => {
                const n1 = engNum === 1 ? state.engine1N1 : state.engine2N1;
                const n2 = Math.min(100, n1 * 1.05);
                const n3 = Math.min(100, n1 * 0.95);
                const enabled = engNum === 1 ? state.engine1Enabled : state.engine2Enabled;
                return (
                  <div key={engNum} className="eicas-display p-2">
                    <div className="flex items-center justify-between mb-1">
                      <span className="eicas-label">ENG {engNum}</span>
                      <button
                        onClick={() => dispatch(engNum === 1 ? 'TOGGLE_ENGINE_1' : 'TOGGLE_ENGINE_2')}
                        className={`text-[8px] px-1.5 py-0.5 rounded border ${
                          enabled ? 'bg-green-400/20 border-green-400 text-green-400' : 'bg-red-400/20 border-red-400 text-red-400'
                        }`}
                      >{enabled ? 'ON' : 'OFF'}</button>
                    </div>
                    <div className="space-y-1">
                      <div>
                        <div className="flex justify-between text-[8px]">
                          <span className="eicas-label">N1</span>
                          <span className="eicas-value font-bold">{n1.toFixed(1)}%</span>
                        </div>
                        <div className="eicas-bar">
                          <div className="eicas-bar-fill" style={{ width: `${n1}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[8px]">
                          <span className="eicas-label">N2</span>
                          <span className="eicas-value font-bold">{n2.toFixed(1)}%</span>
                        </div>
                        <div className="eicas-bar">
                          <div className="eicas-bar-fill" style={{ width: `${n2}%` }} />
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-[8px]">
                          <span className="eicas-label">N3</span>
                          <span className="eicas-value font-bold">{n3.toFixed(1)}%</span>
                        </div>
                        <div className="eicas-bar">
                          <div className="eicas-bar-fill" style={{ width: `${n3}%` }} />
                        </div>
                      </div>
                    </div>
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
                className="w-full h-2 cursor-pointer"
              />
              <div className="flex justify-between text-[7px] text-gray-500 mt-0.5">
                <span>IDLE</span>
                <span>TOGA</span>
              </div>
            </div>

            {/* Engine Parameters */}
            <div className="eicas-display p-2 flex-shrink-0">
              <div className="eicas-label mb-1">ENGINE PARAMETERS</div>
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="eicas-label">EGT</div>
                  <div className="eicas-value text-sm font-bold">{Math.round(400 + state.engine1N1 * 3)}°C</div>
                </div>
                <div>
                  <div className="eicas-label">OIL PRESS</div>
                  <div className="eicas-value text-sm font-bold">{Math.round(40 + state.engine1N1 * 0.3)}</div>
                  <div className="text-[7px] text-gray-500">PSI</div>
                </div>
                <div>
                  <div className="eicas-label">OIL TEMP</div>
                  <div className="eicas-value text-sm font-bold">{Math.round(60 + state.engine1N1 * 0.2)}°C</div>
                </div>
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
              </div>
            </div>

            {/* Weather Info */}
            <div className="eicas-display p-2 flex-shrink-0">
              <div className="eicas-label mb-1">WEATHER</div>
              <div className="grid grid-cols-3 gap-2 text-center text-[9px]">
                <div>
                  <div className="eicas-label">TYPE</div>
                  <div className="eicas-value font-bold">{weather.type.toUpperCase()}</div>
                </div>
                <div>
                  <div className="eicas-label">VIS</div>
                  <div className="eicas-value font-bold">{(weather.visibility / 1000).toFixed(0)}km</div>
                </div>
                <div>
                  <div className="eicas-label">CLOUDS</div>
                  <div className="eicas-value font-bold">{weather.clouds}/8</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts */}
      <div className="flex-shrink-0 px-3 py-1.5 bg-[#111] border-t border-[#2a2a2a] text-[9px] text-gray-500 flex gap-3 flex-wrap">
        <span className="text-gray-400">↑↓←→</span><span>姿态</span>
        <span className="text-gray-400">W/S</span><span>油门</span>
        <span className="text-gray-400">G</span><span>起落架</span>
        <span className="text-gray-400">P</span><span>自动驾驶</span>
        <span className="text-gray-400">T</span><span>自动油门</span>
        <span className="text-gray-400">1/2</span><span>引擎</span>
        <span className="text-gray-400">[/]</span><span>襟翼</span>
      </div>
    </div>
  );
}
