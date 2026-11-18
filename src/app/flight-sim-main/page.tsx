'use client';

import { useEffect, useState } from 'react';
import { useFlight } from '@/contexts/FlightContext';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';

export default function FlightSimulatorPage() {
  const { 
    state, 
    dispatch, 
    adjustTargetHeading, 
    adjustTargetAltitude, 
    adjustTargetAirspeed 
  } = useFlight();
  const [currentTime, setCurrentTime] = useState(new Date());

  useKeyboardControls({ dispatch, enabled: true });

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => date.toUTCString().split(' ')[4];

  // Calculate attitude indicator transformations
  const pitchOffset = -state.pitch * 3;
  const rollRotation = -state.roll;

  // Calculate vertical speed needle rotation (±2000 ft/min range)
  const vsRotation = (state.verticalSpeed / 2000) * 45;

  // Dynamic sky color based on altitude
  const skyGradient = state.altitude > 30000 
    ? 'linear-gradient(180deg, #0a0e27 0%, #1a2f4a 40%, #2d4a6b 70%, #4a6b8a 100%)'
    : state.altitude > 15000
    ? 'linear-gradient(180deg, #1a3a5c 0%, #3a6b8a 40%, #5a8ba8 70%, #7aabca 100%)'
    : 'linear-gradient(180deg, #4a7ba8 0%, #6a9bc8 40%, #8abbe8 70%, #aadbff 100%)';

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-mono overflow-hidden">
      <style jsx global>{`
        .knob-btn {
          width: 28px;
          height: 28px;
          background: linear-gradient(145deg, #3a3a3a, #1a1a1a);
          border: 2px solid #555;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          font-size: 16px;
          font-weight: bold;
          color: #aaa;
        }
        .knob-btn:hover {
          background: linear-gradient(145deg, #4a4a4a, #2a2a2a);
          border-color: #00ff88;
          color: #00ff88;
        }
        .knob-btn:active {
          transform: scale(0.95);
        }
        .ap-btn {
          padding: 6px 12px;
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1px;
          cursor: pointer;
          transition: all 0.2s;
          color: #888;
        }
        .ap-btn:hover {
          border-color: #555;
        }
        .ap-btn.active {
          background: #00ff88;
          border-color: #00ff88;
          color: #000;
          box-shadow: 0 0 12px rgba(0, 255, 136, 0.5);
        }
        .throttle-slider {
          writing-mode: bt-lr;
          -webkit-appearance: slider-vertical;
          width: 20px;
          height: 120px;
          background: #1a1a1a;
          border: 2px solid #333;
          border-radius: 4px;
        }
        .throttle-slider::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 30px;
          height: 12px;
          background: #00ff88;
          border-radius: 2px;
          cursor: pointer;
        }
      `}</style>

      <div className="flex flex-col h-screen max-h-screen">
        {/* External View - Dynamic Sky */}
        <div 
          className="relative w-full h-48 flex-shrink-0 overflow-hidden"
          style={{ background: skyGradient }}
        >
          {/* Horizon line */}
          <div 
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            style={{ 
              bottom: `${50 + state.pitch * 2}%`,
              transform: `rotate(${state.roll}deg)`,
              transformOrigin: 'center'
            }}
          />
          
          {/* HUD overlay */}
          <div className="absolute top-3 left-4 flex gap-6 text-xs">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-green-400/70 tracking-wider">GS</span>
              <span className="text-base font-bold text-green-400">{Math.round(state.groundSpeed)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-green-400/70 tracking-wider">TAS</span>
              <span className="text-base font-bold text-green-400">{Math.round(state.airspeed * 1.02)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-green-400/70 tracking-wider">WIND</span>
              <span className="text-base font-bold text-green-400">270°/15</span>
            </div>
          </div>
          
          <div className="absolute top-3 right-4 flex gap-6 text-xs">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-green-400/70 tracking-wider">SAT</span>
              <span className="text-base font-bold text-green-400">-47°C</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-green-400/70 tracking-wider">TAT</span>
              <span className="text-base font-bold text-green-400">-21°C</span>
            </div>
          </div>

          {/* Aircraft type label */}
          <div className="absolute bottom-2 left-4 text-[10px] text-white/40 tracking-widest">
            BOEING 777-300ER
          </div>
        </div>

        {/* MCP - Mode Control Panel */}
        <div className="flex items-center justify-center gap-3 px-4 py-2 bg-[#111] border-y border-[#2a2a2a] flex-shrink-0">
          {/* IAS/MACH */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0a0a0a] rounded border border-[#222]">
            <span className="text-[9px] text-gray-500 tracking-wider">IAS</span>
            <button 
              className="knob-btn"
              onClick={() => adjustTargetAirspeed(-5)}
              tabIndex={-1}
            >−</button>
            <span className="text-lg font-bold text-green-400 min-w-[48px] text-center">
              {Math.round(state.targetAirspeed)}
            </span>
            <button 
              className="knob-btn"
              onClick={() => adjustTargetAirspeed(5)}
              tabIndex={-1}
            >+</button>
          </div>

          {/* HEADING */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0a0a0a] rounded border border-[#222]">
            <span className="text-[9px] text-gray-500 tracking-wider">HDG</span>
            <button 
              className="knob-btn"
              onClick={() => adjustTargetHeading(-5)}
              tabIndex={-1}
            >−</button>
            <span className="text-lg font-bold text-green-400 min-w-[48px] text-center">
              {String(Math.round(state.targetHeading)).padStart(3, '0')}
            </span>
            <button 
              className="knob-btn"
              onClick={() => adjustTargetHeading(5)}
              tabIndex={-1}
            >+</button>
          </div>

          {/* ALTITUDE */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0a0a0a] rounded border border-[#222]">
            <span className="text-[9px] text-gray-500 tracking-wider">ALT</span>
            <button 
              className="knob-btn"
              onClick={() => adjustTargetAltitude(-100)}
              tabIndex={-1}
            >−</button>
            <span className="text-lg font-bold text-green-400 min-w-[64px] text-center">
              {Math.round(state.targetAltitude).toLocaleString()}
            </span>
            <button 
              className="knob-btn"
              onClick={() => adjustTargetAltitude(100)}
              tabIndex={-1}
            >+</button>
          </div>

          {/* V/S Display */}
          <div className="flex items-center gap-1 px-3 py-1.5 bg-[#0a0a0a] rounded border border-[#222]">
            <span className="text-[9px] text-gray-500 tracking-wider">V/S</span>
            <span className="text-lg font-bold text-green-400 min-w-[56px] text-center">
              {state.verticalSpeed > 0 ? '+' : ''}{Math.round(state.verticalSpeed)}
            </span>
          </div>

          {/* A/P and A/T Buttons */}
          <div className="flex gap-2 ml-2">
            <button 
              className={`ap-btn ${state.autopilotEnabled ? 'active' : ''}`}
              onClick={() => dispatch('TOGGLE_AUTOPILOT')}
            >
              A/P [P]
            </button>
            <button 
              className={`ap-btn ${state.autothrottleEnabled ? 'active' : ''}`}
              onClick={() => dispatch('TOGGLE_AUTOTHROTTLE')}
            >
              A/T [T]
            </button>
          </div>
        </div>

        {/* Main Instrument Panel */}
        <div className="flex-1 grid grid-cols-12 gap-2 p-2 bg-[#0d0d0d] overflow-hidden">
          
          {/* PFD - Primary Flight Display (Left) */}
          <div className="col-span-4 bg-black rounded-lg border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden">
            <div className="text-center text-[9px] text-gray-500 tracking-widest py-1 border-b border-[#1a1a1a]">
              PRIMARY FLIGHT DISPLAY
            </div>
            <div className="flex-1 relative bg-black overflow-hidden">
              {/* Attitude Indicator */}
              <div 
                className="absolute top-1/2 left-1/2 w-56 h-56 rounded-full bg-black border-4 border-[#2a2a2a] shadow-2xl overflow-hidden"
                style={{ 
                  transform: `translate(-50%, -50%) rotate(${rollRotation}deg)`,
                  transition: 'transform 0.1s'
                }}
              >
                {/* Sky */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#1e5a8e] to-[#3a7fb8]"
                  style={{ transform: `translateY(${pitchOffset}px)` }}
                />
                {/* Ground */}
                <div 
                  className="absolute bottom-0 left-0 right-0 h-1/2 bg-gradient-to-b from-[#8b6914] to-[#5a4510]"
                  style={{ transform: `translateY(${pitchOffset}px)` }}
                />
                {/* Horizon line */}
                <div 
                  className="absolute top-1/2 left-0 right-0 h-0.5 bg-white"
                  style={{ transform: `translateY(calc(-50% + ${pitchOffset}px))` }}
                />
                {/* Pitch marks */}
                <div className="absolute top-1/2 left-1/2 w-full h-full" style={{ transform: 'translate(-50%, -50%)' }}>
                  {[-10, -5, 5, 10].map(deg => (
                    <div
                      key={deg}
                      className="absolute left-1/2 h-px bg-white"
                      style={{
                        top: `${50 - deg * 3}%`,
                        width: Math.abs(deg) === 10 ? '40px' : '30px',
                        transform: 'translateX(-50%)'
                      }}
                    />
                  ))}
                </div>
              </div>
              
              {/* Aircraft symbol (fixed) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-1 z-10">
                <div className="absolute left-0 top-0 w-8 h-1 bg-yellow-400" />
                <div className="absolute right-0 top-0 w-8 h-1 bg-yellow-400" />
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 border-2 border-yellow-400 rounded-full bg-transparent" />
              </div>

              {/* Airspeed tape (left) */}
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-14 h-44 bg-black/80 border border-[#333] rounded">
                <div className="relative h-full overflow-hidden">
                  {[-40, -20, 0, 20, 40].map((offset, idx) => (
                    <div key={idx} className="absolute left-0 right-0 flex items-center justify-between px-1" style={{ top: `${(idx / 4) * 100}%` }}>
                      <div className="w-2 h-px bg-gray-500" />
                      <span className="text-[10px] font-semibold text-white">
                        {Math.round(state.airspeed + offset)}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 bg-black border-2 border-green-400 flex items-center justify-center">
                  <span className="text-base font-bold text-green-400">{Math.round(state.airspeed)}</span>
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-gray-500 tracking-wider">KTS</div>
              </div>

              {/* Altitude tape (right) */}
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-16 h-44 bg-black/80 border border-[#333] rounded">
                <div className="relative h-full overflow-hidden">
                  {[-500, -200, 0, 200, 500].map((offset, idx) => (
                    <div key={idx} className="absolute left-0 right-0 flex items-center justify-between px-1" style={{ top: `${(idx / 4) * 100}%` }}>
                      <span className="text-[10px] font-semibold text-white">
                        {Math.round(state.altitude + offset)}
                      </span>
                      <div className="w-2 h-px bg-gray-500" />
                    </div>
                  ))}
                </div>
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-6 bg-black border-2 border-green-400 flex items-center justify-center">
                  <span className="text-sm font-bold text-green-400">{Math.round(state.altitude)}</span>
                </div>
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-gray-500 tracking-wider">FT</div>
              </div>

              {/* Vertical Speed Indicator */}
              <div className="absolute right-20 top-1/2 -translate-y-1/2 w-5 h-44 bg-black/80 border border-[#333] rounded">
                <div className="absolute top-1/2 left-1/2 w-0.5 h-20 bg-green-400 origin-bottom" 
                  style={{ 
                    transform: `translate(-50%, -100%) rotate(${vsRotation}deg)`,
                    transition: 'transform 0.2s'
                  }}
                />
                <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] text-gray-500 tracking-wider">VS</div>
              </div>

              {/* Heading indicator (bottom) */}
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-40 h-10 bg-black/80 border border-[#333] rounded flex items-center justify-center">
                <span className="text-base font-bold text-green-400">{Math.round(state.heading)}°</span>
              </div>
            </div>
          </div>

          {/* ND - Navigation Display (Center) */}
          <div className="col-span-4 bg-black rounded-lg border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden">
            <div className="text-center text-[9px] text-gray-500 tracking-widest py-1 border-b border-[#1a1a1a]">
              NAVIGATION DISPLAY
            </div>
            <div className="flex-1 relative bg-black overflow-hidden">
              {/* Compass rose */}
              <div 
                className="absolute top-1/2 left-1/2 w-64 h-64 rounded-full border-2 border-[#333]"
                style={{ 
                  transform: `translate(-50%, -50%) rotate(${-state.heading}deg)`,
                  transition: 'transform 0.2s'
                }}
              >
                {/* Range rings */}
                <div className="absolute top-1/2 left-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 border border-[#2a2a2a] rounded-full" />
                <div className="absolute top-1/2 left-1/2 w-32 h-32 -translate-x-1/2 -translate-y-1/2 border border-[#2a2a2a] rounded-full" />
                <div className="absolute top-1/2 left-1/2 w-48 h-48 -translate-x-1/2 -translate-y-1/2 border border-[#2a2a2a] rounded-full" />
                
                {/* Radials */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map(deg => (
                  <div
                    key={deg}
                    className="absolute top-1/2 left-1/2 w-px h-24 bg-gradient-to-b from-[#333] to-transparent origin-top"
                    style={{ transform: `translate(-50%, 0) rotate(${deg}deg)` }}
                  />
                ))}
              </div>

              {/* Aircraft symbol (fixed) */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 border-l-[8px] border-r-[8px] border-b-[16px] border-l-transparent border-r-transparent border-b-green-400 z-10" />

              {/* Info overlay */}
              <div className="absolute top-3 left-3 flex flex-col gap-1 text-xs">
                <div className="text-gray-400">GS <span className="text-green-400 font-semibold">{Math.round(state.groundSpeed)}</span></div>
                <div className="text-gray-400">TAS <span className="text-green-400 font-semibold">{Math.round(state.airspeed * 1.02)}</span></div>
                <div className="text-gray-400">HDG <span className="text-green-400 font-semibold">{Math.round(state.heading)}°</span></div>
                <div className="text-gray-400">RANGE <span className="text-green-400 font-semibold">80 NM</span></div>
              </div>
            </div>
          </div>

          {/* EICAS - Engine Indication (Right) */}
          <div className="col-span-4 bg-black rounded-lg border-2 border-[#1a1a1a] shadow-inner flex flex-col overflow-hidden">
            <div className="text-center text-[9px] text-gray-500 tracking-widest py-1 border-b border-[#1a1a1a]">
              ENGINE INDICATION
            </div>
            <div className="flex-1 p-3 flex flex-col gap-3 overflow-y-auto">
              {/* Throttle Control */}
              <div className="flex items-center gap-3 p-2 bg-[#0a0a0a] rounded border border-[#222]">
                <span className="text-[10px] text-gray-500 tracking-wider w-16">THROTTLE</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={state.throttle}
                  onChange={(e) => {
                    const value = parseInt(e.target.value);
                    dispatch(value > state.throttle ? 'THROTTLE_UP' : 'THROTTLE_DOWN');
                  }}
                  className="flex-1 h-2 bg-[#1a1a1a] rounded appearance-none cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, #00ff88 0%, #00ff88 ${state.throttle}%, #1a1a1a ${state.throttle}%, #1a1a1a 100%)`
                  }}
                />
                <span className="text-base font-bold text-green-400 min-w-[48px] text-right">
                  {Math.round(state.throttle)}%
                </span>
              </div>

              {/* Engine Gauges */}
              <div className="grid grid-cols-2 gap-3">
                {[1, 2].map(engNum => {
                  const n1 = engNum === 1 ? state.engine1N1 : state.engine2N1;
                  const enabled = engNum === 1 ? state.engine1Enabled : state.engine2Enabled;
                  return (
                    <div key={engNum} className="p-2 bg-[#0a0a0a] rounded border border-[#222]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] text-gray-500 tracking-wider">ENG {engNum}</span>
                        <button
                          onClick={() => dispatch(engNum === 1 ? 'TOGGLE_ENGINE_1' : 'TOGGLE_ENGINE_2')}
                          className={`text-[10px] px-2 py-0.5 rounded border ${
                            enabled 
                              ? 'bg-green-400/20 border-green-400 text-green-400' 
                              : 'bg-red-400/20 border-red-400 text-red-400'
                          }`}
                        >
                          {enabled ? 'ON' : 'OFF'}
                        </button>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                            <span>N1</span>
                            <span className="text-green-400 font-bold">{n1.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-[#1a1a1a] rounded overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-400 to-yellow-400 transition-all duration-300"
                              style={{ width: `${n1}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* System Status */}
              <div className="p-2 bg-[#0a0a0a] rounded border border-[#222] space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">GEAR</span>
                  <span className={state.gearDown ? 'text-green-400 font-semibold' : 'text-gray-400'}>
                    {state.gearDown ? 'DOWN' : 'UP'} [G]
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">FLAPS</span>
                  <span className="text-green-400 font-semibold">{state.flapsAngle}° [</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">PITCH</span>
                  <span className="text-green-400 font-semibold">{state.pitch.toFixed(1)}°</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">ROLL</span>
                  <span className="text-green-400 font-semibold">{state.roll.toFixed(1)}°</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Keyboard shortcuts hint */}
        <div className="flex-shrink-0 px-4 py-2 bg-[#111] border-t border-[#2a2a2a] text-[10px] text-gray-500 flex gap-4 flex-wrap">
          <span>↑↓←→ 姿态</span>
          <span>W/S 油门</span>
          <span>G 起落架</span>
          <span>P 自动驾驶</span>
          <span>T 自动油门</span>
          <span>1/2 引擎</span>
          <span>[/] 襟翼</span>
        </div>
      </div>
    </div>
  );
}
