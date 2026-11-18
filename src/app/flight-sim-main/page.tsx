'use client';

import { useEffect, useState, useRef } from 'react';
import { useFlight } from '@/contexts/FlightContext';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';

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

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Animate clouds and ground based on airspeed
  useEffect(() => {
    let animFrame: number;
    const animate = () => {
      const speed = state.airspeed * 0.5; // pixels per second factor
      cloudOffsetRef.current = (cloudOffsetRef.current + speed * 0.016) % 2000;
      groundOffsetRef.current = (groundOffsetRef.current + speed * 0.03) % 400;
      setCloudOffset(cloudOffsetRef.current);
      setGroundOffset(groundOffsetRef.current);
      animFrame = requestAnimationFrame(animate);
    };
    animFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrame);
  }, [state.airspeed]);

  // Calculate attitude indicator transformations
  const pitchOffset = -state.pitch * 3;
  const rollRotation = -state.roll;
  const vsRotation = (state.verticalSpeed / 2000) * 45;

  // Dynamic sky color based on altitude
  const skyGradient = state.altitude > 30000 
    ? 'linear-gradient(180deg, #050a1a 0%, #0a1628 30%, #1a2f4a 60%, #2d4a6b 100%)'
    : state.altitude > 15000
    ? 'linear-gradient(180deg, #0e2240 0%, #1a3a5c 30%, #3a6b8a 60%, #5a8ba8 100%)'
    : state.altitude > 5000
    ? 'linear-gradient(180deg, #2a5a8a 0%, #4a7ba8 30%, #6a9bc8 60%, #8abbe8 100%)'
    : 'linear-gradient(180deg, #5a9bd8 0%, #7abbe8 30%, #9adbf8 60%, #c0e8ff 100%)';

  // Ground visibility based on altitude
  const groundVisible = state.altitude < 20000;
  const groundOpacity = Math.max(0, 1 - state.altitude / 20000);

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
        @media (max-width: 900px) {
          .mcp-panel { flex-wrap: wrap; gap: 4px !important; padding: 4px 8px !important; }
          .mcp-group { padding: 2px 6px !important; }
          .mcp-val { font-size: 14px !important; min-width: 40px !important; }
          .instrument-grid { grid-template-columns: 1fr !important; grid-template-rows: auto auto auto !important; }
          .ext-view { height: 100px !important; }
        }
        @media (max-height: 700px) {
          .ext-view { height: 80px !important; }
          .mcp-panel { padding: 2px 8px !important; }
        }
      `}</style>

      {/* External View - Dynamic Sky with clouds and ground */}
      <div className="ext-view relative w-full h-40 flex-shrink-0 overflow-hidden" style={{ background: skyGradient }}>
        {/* Clouds layer */}
        {state.altitude < 35000 && (
          <div className="absolute inset-0 overflow-hidden">
            {[0, 1, 2, 3, 4, 5].map(i => (
              <div
                key={`cloud-${i}`}
                className="cloud"
                style={{
                  width: `${80 + i * 40}px`,
                  height: `${30 + i * 15}px`,
                  top: `${10 + i * 12}%`,
                  left: `${((i * 350 - cloudOffset * (0.5 + i * 0.2)) % 1400) - 200}px`,
                  opacity: state.altitude > 25000 ? 0.05 : 0.15 + (i * 0.03),
                }}
              />
            ))}
          </div>
        )}

        {/* Ground layer - visible at lower altitudes */}
        {groundVisible && (
          <div 
            className="absolute bottom-0 left-0 right-0 overflow-hidden"
            style={{ 
              height: `${Math.min(50, groundOpacity * 50)}%`,
              opacity: groundOpacity,
              transform: `rotate(${state.roll}deg)`,
              transformOrigin: 'center bottom'
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-[#2a4a1a] via-[#3a5a2a] to-[#4a6a3a]" />
            {/* Ground texture lines */}
            {[0, 1, 2, 3, 4, 5, 6, 7].map(i => (
              <div
                key={`gline-${i}`}
                className="ground-line"
                style={{
                  width: '200%',
                  bottom: `${i * 12}%`,
                  left: `${-groundOffset % 200}px`,
                  opacity: 0.3 - i * 0.03,
                }}
              />
            ))}
          </div>
        )}

        {/* Horizon line */}
        <div 
          className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent"
          style={{ 
            bottom: `${50 + state.pitch * 1.5}%`,
            transform: `rotate(${state.roll}deg)`,
            transformOrigin: 'center'
          }}
        />
        
        {/* HUD overlay - left */}
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
            <span className="text-sm font-bold text-green-400">270°/15</span>
          </div>
        </div>
        
        {/* HUD overlay - right */}
        <div className="absolute top-2 right-3 flex gap-4 text-[10px]">
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">SAT</span>
            <span className="text-sm font-bold text-green-400">{Math.round(-56 + state.altitude * 0.0003)}°C</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-green-400/60 tracking-wider">MACH</span>
            <span className="text-sm font-bold text-green-400">{(state.airspeed / 660).toFixed(2)}</span>
          </div>
        </div>

        {/* Aircraft type */}
        <div className="absolute bottom-1.5 left-3 text-[9px] text-white/30 tracking-widest">
          BOEING 777-300ER
        </div>

        {/* Altitude & VS quick readout */}
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

      {/* MCP - Mode Control Panel */}
      <div className="mcp-panel flex items-center justify-center gap-2 px-3 py-1.5 bg-[#111] border-y border-[#2a2a2a] flex-shrink-0">
        {/* IAS */}
        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">IAS</span>
          <button className="knob-btn" onClick={() => adjustTargetAirspeed(-5)} tabIndex={-1}>−</button>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[40px] text-center">
            {Math.round(state.targetAirspeed)}
          </span>
          <button className="knob-btn" onClick={() => adjustTargetAirspeed(5)} tabIndex={-1}>+</button>
        </div>

        {/* HDG */}
        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">HDG</span>
          <button className="knob-btn" onClick={() => adjustTargetHeading(-5)} tabIndex={-1}>−</button>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[40px] text-center">
            {String(Math.round(state.targetHeading)).padStart(3, '0')}
          </span>
          <button className="knob-btn" onClick={() => adjustTargetHeading(5)} tabIndex={-1}>+</button>
        </div>

        {/* ALT */}
        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">ALT</span>
          <button className="knob-btn" onClick={() => adjustTargetAltitude(-100)} tabIndex={-1}>−</button>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[56px] text-center">
            {Math.round(state.targetAltitude).toLocaleString()}
          </span>
          <button className="knob-btn" onClick={() => adjustTargetAltitude(100)} tabIndex={-1}>+</button>
        </div>

        {/* V/S */}
        <div className="mcp-group flex items-center gap-1 px-2 py-1 bg-[#0a0a0a] rounded border border-[#222]">
          <span className="text-[8px] text-gray-500 tracking-wider">V/S</span>
          <span className="mcp-val text-base font-bold text-green-400 min-w-[48px] text-center">
            {state.verticalSpeed > 0 ? '+' : ''}{Math.round(state.verticalSpeed)}
          </span>
        </div>

        {/* A/P and A/T Buttons */}
        <div className="flex gap-1.5 ml-1">
          <button 
            className={`ap-btn ${state.autopilotEnabled ? 'active' : ''}`}
            onClick={() => dispatch('TOGGLE_AUTOPILOT')}
          >A/P [P]</button>
          <button 
            className={`ap-btn ${state.autothrottleEnabled ? 'active' : ''}`}
            onClick={() => dispatch('TOGGLE_AUTOTHROTTLE')}
          >A/T [T]</button>
        </div>
      </div>

      {/* Main Instrument Panel */}
      <div className="instrument-grid flex-1 grid grid-cols-12 gap-1.5 p-1.5 bg-[#0d0d0d] overflow-hidden min-h-0">
        
        {/* PFD - Primary Flight Display */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            PRIMARY FLIGHT DISPLAY
          </div>
          <div className="flex-1 relative bg-black overflow-hidden min-h-0">
            {/* Attitude Indicator */}
            <div 
              className="absolute top-1/2 left-1/2 w-48 h-48 rounded-full bg-black border-3 border-[#2a2a2a] shadow-2xl overflow-hidden"
              style={{ 
                transform: `translate(-50%, -50%) rotate(${rollRotation}deg)`,
                transition: 'transform 0.08s'
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#1e5a8e] to-[#3a7fb8]"
                style={{ transform: `translateY(${pitchOffset}px)` }} />
              <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#8b6914] to-[#5a4510]"
                style={{ transform: `translateY(${pitchOffset}px)` }} />
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"
                style={{ transform: `translateY(calc(-50% + ${pitchOffset}px))` }} />
              {/* Pitch marks */}
              {[-10, -5, 5, 10].map(deg => (
                <div key={deg} className="absolute left-1/2 h-px bg-white/80"
                  style={{
                    top: `calc(50% - ${deg * 3}% + ${pitchOffset}px)`,
                    width: Math.abs(deg) === 10 ? '36px' : '24px',
                    transform: 'translateX(-50%)'
                  }}
                />
              ))}
            </div>
            
            {/* Aircraft symbol (fixed) */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <div className="relative w-16 h-1">
                <div className="absolute left-0 top-0 w-6 h-1 bg-yellow-400" />
                <div className="absolute right-0 top-0 w-6 h-1 bg-yellow-400" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 border-2 border-yellow-400 rounded-full" />
              </div>
            </div>

            {/* Airspeed tape */}
            <div className="absolute left-1 top-1/2 -translate-y-1/2 w-12 h-36 bg-black/80 border border-[#333] rounded">
              <div className="relative h-full overflow-hidden">
                {[-40, -20, 0, 20, 40].map((offset, idx) => (
                  <div key={idx} className="absolute left-0 right-0 flex items-center justify-between px-1" style={{ top: `${(idx / 4) * 100}%` }}>
                    <div className="w-1.5 h-px bg-gray-500" />
                    <span className="text-[9px] font-semibold text-white">{Math.round(state.airspeed + offset)}</span>
                  </div>
                ))}
              </div>
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-5 bg-black border-2 border-green-400 flex items-center justify-center">
                <span className="text-sm font-bold text-green-400">{Math.round(state.airspeed)}</span>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] text-gray-500">KTS</div>
            </div>

            {/* Altitude tape */}
            <div className="absolute right-1 top-1/2 -translate-y-1/2 w-14 h-36 bg-black/80 border border-[#333] rounded">
              <div className="relative h-full overflow-hidden">
                {[-500, -200, 0, 200, 500].map((offset, idx) => (
                  <div key={idx} className="absolute left-0 right-0 flex items-center justify-between px-1" style={{ top: `${(idx / 4) * 100}%` }}>
                    <span className="text-[9px] font-semibold text-white">{Math.round(state.altitude + offset)}</span>
                    <div className="w-1.5 h-px bg-gray-500" />
                  </div>
                ))}
              </div>
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-5 bg-black border-2 border-green-400 flex items-center justify-center">
                <span className="text-xs font-bold text-green-400">{Math.round(state.altitude)}</span>
              </div>
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] text-gray-500">FT</div>
            </div>

            {/* VS Indicator */}
            <div className="absolute right-16 top-1/2 -translate-y-1/2 w-4 h-36 bg-black/80 border border-[#333] rounded">
              <div className="absolute top-1/2 left-1/2 w-0.5 h-16 bg-green-400 origin-bottom"
                style={{ transform: `translate(-50%, -100%) rotate(${vsRotation}deg)`, transition: 'transform 0.15s' }} />
              <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 text-[7px] text-gray-500">VS</div>
            </div>

            {/* Heading */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-32 h-8 bg-black/80 border border-[#333] rounded flex items-center justify-center">
              <span className="text-sm font-bold text-green-400">{Math.round(state.heading)}°</span>
            </div>
          </div>
        </div>

        {/* ND - Navigation Display */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            NAVIGATION DISPLAY
          </div>
          <div className="flex-1 relative bg-black overflow-hidden min-h-0">
            <div className="absolute top-1/2 left-1/2 w-52 h-52 rounded-full border-2 border-[#333]"
              style={{ transform: `translate(-50%, -50%) rotate(${-state.heading}deg)`, transition: 'transform 0.15s' }}>
              <div className="absolute top-1/2 left-1/2 w-14 h-14 -translate-x-1/2 -translate-y-1/2 border border-[#2a2a2a] rounded-full" />
              <div className="absolute top-1/2 left-1/2 w-28 h-28 -translate-x-1/2 -translate-y-1/2 border border-[#2a2a2a] rounded-full" />
              <div className="absolute top-1/2 left-1/2 w-42 h-42 -translate-x-1/2 -translate-y-1/2 border border-[#2a2a2a] rounded-full" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                <div key={deg} className="absolute top-1/2 left-1/2 w-px h-20 bg-gradient-to-b from-[#333] to-transparent origin-top"
                  style={{ transform: `translate(-50%, 0) rotate(${deg}deg)` }} />
              ))}
              {/* Heading labels */}
              {[{d: 0, l: 'N'}, {d: 90, l: 'E'}, {d: 180, l: 'S'}, {d: 270, l: 'W'}].map(({d, l}) => (
                <div key={d} className="absolute text-[10px] font-bold text-green-400"
                  style={{
                    top: `${50 - 42 * Math.cos(d * Math.PI / 180)}%`,
                    left: `${50 + 42 * Math.sin(d * Math.PI / 180)}%`,
                    transform: `translate(-50%, -50%) rotate(${state.heading}deg)`
                  }}>{l}</div>
              ))}
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[7px] border-r-[7px] border-b-[14px] border-l-transparent border-r-transparent border-b-green-400 z-10" />
            <div className="absolute top-2 left-2 flex flex-col gap-0.5 text-[10px]">
              <div className="text-gray-400">GS <span className="text-green-400 font-semibold">{Math.round(state.groundSpeed)}</span></div>
              <div className="text-gray-400">HDG <span className="text-green-400 font-semibold">{Math.round(state.heading)}°</span></div>
              <div className="text-gray-400">RNG <span className="text-green-400 font-semibold">80 NM</span></div>
            </div>
          </div>
        </div>

        {/* EICAS - Engine Indication */}
        <div className="col-span-4 bg-black rounded border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden min-h-0">
          <div className="text-center text-[8px] text-gray-500 tracking-widest py-0.5 border-b border-[#1a1a1a] flex-shrink-0">
            ENGINE & SYSTEMS
          </div>
          <div className="flex-1 p-2 flex flex-col gap-2 overflow-y-auto min-h-0">
            {/* Throttle Control */}
            <div className="flex items-center gap-2 p-1.5 bg-[#0a0a0a] rounded border border-[#222]">
              <span className="text-[9px] text-gray-500 tracking-wider w-12 flex-shrink-0">THR</span>
              <input
                type="range" min="0" max="100" step="1"
                value={Math.round(state.throttle)}
                onChange={(e) => setThrottle(parseInt(e.target.value))}
                className="flex-1 h-2 cursor-pointer"
              />
              <span className="text-sm font-bold text-green-400 min-w-[36px] text-right">{Math.round(state.throttle)}%</span>
            </div>

            {/* Engine Gauges */}
            <div className="grid grid-cols-2 gap-2">
              {[1, 2].map(engNum => {
                const n1 = engNum === 1 ? state.engine1N1 : state.engine2N1;
                const enabled = engNum === 1 ? state.engine1Enabled : state.engine2Enabled;
                return (
                  <div key={engNum} className="p-1.5 bg-[#0a0a0a] rounded border border-[#222]">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] text-gray-500">ENG {engNum}</span>
                      <button
                        onClick={() => dispatch(engNum === 1 ? 'TOGGLE_ENGINE_1' : 'TOGGLE_ENGINE_2')}
                        className={`text-[9px] px-1.5 py-0.5 rounded border ${
                          enabled ? 'bg-green-400/20 border-green-400 text-green-400' : 'bg-red-400/20 border-red-400 text-red-400'
                        }`}
                      >{enabled ? 'ON' : 'OFF'}</button>
                    </div>
                    <div>
                      <div className="flex justify-between text-[8px] text-gray-500 mb-0.5">
                        <span>N1</span>
                        <span className="text-green-400 font-bold">{n1.toFixed(1)}%</span>
                      </div>
                      <div className="h-1.5 bg-[#1a1a1a] rounded overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-400 to-yellow-400 transition-all duration-200"
                          style={{ width: `${n1}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* System Status */}
            <div className="p-1.5 bg-[#0a0a0a] rounded border border-[#222] space-y-1 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-500">GEAR [G]</span>
                <span className={state.gearDown ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                  {state.gearDown ? 'DOWN ●' : 'UP ○'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">FLAPS [/]</span>
                <span className="text-green-400 font-semibold">{state.flapsAngle}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">PITCH</span>
                <span className="text-green-400 font-semibold">{state.pitch.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">ROLL</span>
                <span className="text-green-400 font-semibold">{state.roll.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">A/P</span>
                <span className={state.autopilotEnabled ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                  {state.autopilotEnabled ? 'ENGAGED' : 'OFF'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">A/T</span>
                <span className={state.autothrottleEnabled ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                  {state.autothrottleEnabled ? 'ENGAGED' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard shortcuts hint */}
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
