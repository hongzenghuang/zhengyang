'use client';

import { useEffect, useState } from 'react';
import { useFlight } from '@/contexts/FlightContext';
import { useKeyboardControls } from '@/hooks/useKeyboardControls';

export default function FlightSimulatorPage() {
  const { state, dispatch, setTargetHeading, setTargetAltitude, setTargetAirspeed } = useFlight();
  const [currentTime, setCurrentTime] = useState(new Date());

  useKeyboardControls({ dispatch, enabled: true });

  // Update clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (date: Date) => {
    return date.toUTCString().split(' ')[4];
  };

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  // Calculate attitude indicator rotation
  const pitchOffset = state.pitch * 2;
  const rollRotation = state.roll;

  // Calculate vertical speed needle rotation
  const vsRotation = (state.verticalSpeed / 2000) * 45;

  return (
    <div className="pg-root">
      <style dangerouslySetInnerHTML={{__html:`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        .pg-root { display: flex; flex-direction: column; width: 100%; height: 840px; background: var(--color-surface-variant); font-family: 'Consolas', 'Monaco', monospace; color: var(--color-on-surface); overflow: hidden; }
        
        /* 顶部外部视野 */
        .b777-view { width: 100%; height: 300px; position: relative; overflow: hidden; background: linear-gradient(180deg, #0a1628 0%, #1a2f4a 40%, #2d4a6b 70%, #4a6b8a 100%); }
        .b777-horizon { position: absolute; bottom: 40%; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent); }
        .b777-hud { position: absolute; top: 12px; left: 16px; display: flex; gap: 20px; }
        .b777-hud-item { display: flex; flex-direction: column; align-items: center; gap: 2px; }
        .b777-hud-label { font-size: 8px; color: var(--color-primary); letter-spacing: 1.5px; text-transform: uppercase; opacity: 0.7; }
        .b777-hud-val { font-size: 16px; font-weight: 700; color: var(--color-primary); text-shadow: 0 0 6px color-mix(in srgb, var(--color-primary) 60%, transparent); }
        .b777-hud-right { position: absolute; top: 12px; right: 16px; display: flex; gap: 20px; }
        .b777-view-grad { position: absolute; bottom: 0; left: 0; right: 0; height: 40px; background: linear-gradient(to top, var(--color-surface-variant), transparent); }
        
        /* MCP 模式控制面板 */
        .b777-mcp { display: flex; align-items: center; justify-content: center; gap: 4px; padding: 6px 12px; background: #111; border-bottom: 1px solid #2a2a2a; border-top: 1px solid #2a2a2a; }
        .b777-mcp-group { display: flex; align-items: center; gap: 3px; padding: 4px 10px; background: #0a0a0a; border-radius: 3px; border: 1px solid #222; }
        .b777-mcp-label { font-size: 7px; color: #555; letter-spacing: 1px; text-transform: uppercase; }
        .b777-mcp-val { font-size: 13px; font-weight: 700; color: var(--color-primary); font-family: 'Consolas', monospace; }
        .b777-mcp-btn { padding: 3px 8px; background: #1a1a1a; border: 1px solid #333; border-radius: 2px; font-size: 8px; color: #888; cursor: pointer; letter-spacing: 0.5px; }
        .b777-mcp-btn.active { background: var(--color-primary); color: #000; border-color: var(--color-primary); }
        
        /* 主仪表板 */
        .b777-panel { display: grid; grid-template-columns: 1fr 1.6fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; padding: 8px; flex: 1; background: #0d0d0d; }
        
        /* 仪表通用样式 */
        .b777-inst { background: #000; border-radius: 6px; border: 2px solid #1a1a1a; box-shadow: inset 0 2px 8px rgba(0,0,0,0.8), 0 1px 0 rgba(255,255,255,0.05); position: relative; overflow: hidden; }
        .b777-inst-title { position: absolute; top: 6px; left: 50%; transform: translateX(-50%); font-size: 8px; color: #555; letter-spacing: 1.5px; text-transform: uppercase; z-index: 10; }
        
        /* PFD 主飞行显示器 */
        .b777-pfd { grid-column: 1; grid-row: 1 / 3; display: flex; flex-direction: column; }
        .pfd-screen { flex: 1; position: relative; background: #000; overflow: hidden; }
        
        /* 姿态仪 */
        .att-indicator { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 220px; height: 220px; border-radius: 50%; background: #000; border: 3px solid #2a2a2a; box-shadow: 0 0 20px rgba(0,0,0,0.9), inset 0 0 30px rgba(0,0,0,0.5); overflow: hidden; }
        .att-sky { position: absolute; top: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, #1e5a8e 0%, #3a7fb8 100%); }
        .att-ground { position: absolute; bottom: 0; left: 0; right: 0; height: 50%; background: linear-gradient(180deg, #8b6914 0%, #5a4510 100%); }
        .att-horizon-line { position: absolute; top: 50%; left: 0; right: 0; height: 2px; background: #fff; transform: translateY(-50%); }
        .att-pitch-marks { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%; }
        .att-pitch-mark { position: absolute; left: 50%; transform: translateX(-50%); height: 1px; background: #fff; }
        .att-aircraft { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 80px; height: 4px; z-index: 5; }
        .att-aircraft::before, .att-aircraft::after { content: ''; position: absolute; top: 0; width: 30px; height: 4px; background: var(--color-secondary); }
        .att-aircraft::before { left: 0; }
        .att-aircraft::after { right: 0; }
        .att-aircraft-center { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 12px; height: 12px; border: 3px solid var(--color-secondary); border-radius: 50%; background: transparent; z-index: 6; }
        
        /* PFD 空速带 */
        .pfd-airspeed { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 50px; height: 180px; background: rgba(0,0,0,0.7); border: 1px solid #333; border-radius: 3px; }
        .pfd-as-tape { position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
        .pfd-as-mark { position: absolute; left: 0; right: 0; height: 1px; background: #555; }
        .pfd-as-num { position: absolute; right: 4px; font-size: 10px; color: #fff; font-weight: 600; }
        .pfd-as-box { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); height: 24px; background: #000; border: 2px solid var(--color-primary); display: flex; align-items: center; justify-content: center; }
        .pfd-as-val { font-size: 16px; font-weight: 700; color: var(--color-primary); }
        .pfd-as-label { position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%); font-size: 8px; color: #888; letter-spacing: 1px; }
        
        /* PFD 高度带 */
        .pfd-altitude { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); width: 60px; height: 180px; background: rgba(0,0,0,0.7); border: 1px solid #333; border-radius: 3px; }
        .pfd-alt-tape { position: absolute; top: 0; left: 0; right: 0; bottom: 0; overflow: hidden; }
        .pfd-alt-mark { position: absolute; left: 0; right: 0; height: 1px; background: #555; }
        .pfd-alt-num { position: absolute; left: 4px; font-size: 10px; color: #fff; font-weight: 600; }
        .pfd-alt-box { position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); height: 24px; background: #000; border: 2px solid var(--color-primary); display: flex; align-items: center; justify-content: center; }
        .pfd-alt-val { font-size: 14px; font-weight: 700; color: var(--color-primary); }
        .pfd-alt-label { position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%); font-size: 8px; color: #888; letter-spacing: 1px; }
        
        /* PFD 航向 */
        .pfd-heading { position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%); width: 160px; height: 40px; background: rgba(0,0,0,0.7); border: 1px solid #333; border-radius: 3px; }
        .pfd-hdg-box { position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); padding: 2px 8px; background: #000; border: 1px solid var(--color-primary); }
        .pfd-hdg-val { font-size: 13px; font-weight: 700; color: var(--color-primary); }
        
        /* PFD 垂直速度 */
        .pfd-vs { position: absolute; right: 75px; top: 50%; transform: translateY(-50%); width: 20px; height: 180px; background: rgba(0,0,0,0.7); border: 1px solid #333; border-radius: 3px; }
        .pfd-vs-scale { position: absolute; top: 0; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; justify-content: space-between; padding: 4px 0; }
        .pfd-vs-mark { height: 1px; background: #555; }
        .pfd-vs-needle { position: absolute; left: 50%; top: 50%; width: 2px; height: 80px; background: var(--color-primary); transform-origin: bottom center; }
        .pfd-vs-label { position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%); font-size: 8px; color: #888; letter-spacing: 1px; }
        
        /* ND 导航显示器 */
        .b777-nd { grid-column: 2; grid-row: 1 / 3; display: flex; flex-direction: column; }
        .nd-screen { flex: 1; position: relative; background: #000; overflow: hidden; }
        .nd-compass { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 270px; height: 270px; border-radius: 50%; border: 2px solid #333; }
        .nd-range-rings { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); }
        .nd-ring { position: absolute; border: 1px solid #2a2a2a; border-radius: 50%; }
        .nd-ring-1 { width: 60px; height: 60px; top: -30px; left: -30px; }
        .nd-ring-2 { width: 120px; height: 120px; top: -60px; left: -60px; }
        .nd-ring-3 { width: 180px; height: 180px; top: -90px; left: -90px; }
        .nd-radials { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 100%; height: 100%; }
        .nd-radial { position: absolute; top: 50%; left: 50%; width: 1px; height: 100px; background: linear-gradient(to bottom, #333, transparent); transform-origin: top center; }
        .nd-aircraft { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 0; height: 0; border-left: 8px solid transparent; border-right: 8px solid transparent; border-bottom: 16px solid var(--color-primary); }
        .nd-info { position: absolute; top: 10px; left: 10px; display: flex; flex-direction: column; gap: 4px; }
        .nd-info-item { font-size: 12px; color: #888; }
        .nd-info-val { color: var(--color-primary); font-weight: 600; }
        
        /* EICAS 发动机指示 */
        .b777-eicas { grid-column: 3; grid-row: 1 / 3; display: flex; flex-direction: column; }
        .eicas-screen { flex: 1; padding: 12px; display: flex; flex-direction: column; gap: 10px; background: #000; }
        .eicas-title { font-size: 10px; color: #888; letter-spacing: 1.5px; text-transform: uppercase; text-align: center; margin-bottom: 4px; }
        .eicas-engines { display: flex; justify-content: space-around; gap: 12px; }
        .eicas-engine { flex: 1; display: flex; flex-direction: column; gap: 8px; padding: 10px; background: #0a0a0a; border-radius: 4px; border: 1px solid #222; }
        .eicas-eng-label { font-size: 9px; color: #666; letter-spacing: 1px; text-align: center; }
        .eicas-gauge { display: flex; flex-direction: column; gap: 4px; }
        .eicas-gauge-label { font-size: 8px; color: #888; letter-spacing: 1px; }
        .eicas-gauge-bar { height: 8px; background: #1a1a1a; border-radius: 2px; overflow: hidden; position: relative; }
        .eicas-gauge-fill { height: 100%; background: linear-gradient(90deg, var(--color-primary), var(--color-secondary)); border-radius: 2px; transition: width 0.3s; }
        .eicas-gauge-val { font-size: 12px; font-weight: 700; color: var(--color-primary); text-align: right; }
        .eicas-temps { display: flex; flex-direction: column; gap: 6px; padding: 10px; background: #0a0a0a; border-radius: 4px; border: 1px solid #222; }
        .eicas-temp-row { display: flex; justify-content: space-between; align-items: center; }
        .eicas-temp-label { font-size: 9px; color: #888; }
        .eicas-temp-val { font-size: 12px; font-weight: 600; color: var(--color-primary); }
        
        /* 备用仪表区域 */
        .b777-standby { grid-column: 1 / 4; grid-row: 3; display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; }
        
        /* 备用仪表通用 */
        .standby-inst { display: flex; flex-direction: column; }
        .standby-screen { flex: 1; position: relative; background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px; }
        .standby-label { font-size: 8px; color: #888; letter-spacing: 1px; margin-top: 8px; }
        .standby-val { font-size: 14px; font-weight: 700; color: var(--color-primary); }
      `}} />
      
      {/* 外部视野 */}
      <div className="b777-view">
        <div className="b777-horizon"></div>
        <div className="b777-hud">
          <div className="b777-hud-item">
            <span className="b777-hud-label">GS</span>
            <span className="b777-hud-val">{Math.round(state.groundSpeed)}</span>
          </div>
          <div className="b777-hud-item">
            <span className="b777-hud-label">TAS</span>
            <span className="b777-hud-val">{Math.round(state.airspeed * 1.02)}</span>
          </div>
          <div className="b777-hud-item">
            <span className="b777-hud-label">WIND</span>
            <span className="b777-hud-val">270°/15</span>
          </div>
        </div>
        <div className="b777-hud-right">
          <div className="b777-hud-item">
            <span className="b777-hud-label">SAT</span>
            <span className="b777-hud-val">-47°C</span>
          </div>
          <div className="b777-hud-item">
            <span className="b777-hud-label">TAT</span>
            <span className="b777-hud-val">-21°C</span>
          </div>
        </div>
        <div className="b777-view-grad"></div>
      </div>
      
      {/* MCP 面板 */}
      <div className="b777-mcp">
        <div className="b777-mcp-group">
          <span className="b777-mcp-label">IAS</span>
          <span className="b777-mcp-val">{Math.round(state.targetAirspeed)}</span>
        </div>
        <div className="b777-mcp-group">
          <span className="b777-mcp-label">HDG</span>
          <span className="b777-mcp-val">{Math.round(state.targetHeading)}</span>
        </div>
        <div className="b777-mcp-group">
          <span className="b777-mcp-label">ALT</span>
          <span className="b777-mcp-val">{Math.round(state.targetAltitude)}</span>
        </div>
        <div className="b777-mcp-group">
          <span className="b777-mcp-label">V/S</span>
          <span className="b777-mcp-val">{Math.round(state.verticalSpeed)}</span>
        </div>
        <button className={`b777-mcp-btn ${state.autothrottleEnabled ? 'active' : ''}`}>A/T</button>
        <button className={`b777-mcp-btn ${state.autopilotEnabled ? 'active' : ''}`}>A/P</button>
      </div>
      
      {/* 主仪表板 */}
      <div className="b777-panel">
        {/* PFD */}
        <div className="b777-inst b777-pfd">
          <div className="b777-inst-title">PFD</div>
          <div className="pfd-screen">
            <div className="att-indicator" style={{ transform: `translate(-50%, -50%) rotate(${rollRotation}deg)` }}>
              <div className="att-sky" style={{ transform: `translateY(${pitchOffset}px)` }}></div>
              <div className="att-ground" style={{ transform: `translateY(${pitchOffset}px)` }}></div>
              <div className="att-horizon-line" style={{ transform: `translateY(calc(-50% + ${pitchOffset}px))` }}></div>
            </div>
            <div className="att-aircraft"></div>
            <div className="att-aircraft-center"></div>
            
            <div className="pfd-airspeed">
              <div className="pfd-as-tape">
                <div className="pfd-as-mark" style={{top:'10%'}}></div>
                <div className="pfd-as-num" style={{top:'10%'}}>{Math.round(state.airspeed + 40)}</div>
                <div className="pfd-as-mark" style={{top:'30%'}}></div>
                <div className="pfd-as-num" style={{top:'30%'}}>{Math.round(state.airspeed + 20)}</div>
                <div className="pfd-as-mark" style={{top:'50%'}}></div>
                <div className="pfd-as-num" style={{top:'50%'}}>{Math.round(state.airspeed)}</div>
                <div className="pfd-as-mark" style={{top:'70%'}}></div>
                <div className="pfd-as-num" style={{top:'70%'}}>{Math.round(state.airspeed - 20)}</div>
                <div className="pfd-as-mark" style={{top:'90%'}}></div>
                <div className="pfd-as-num" style={{top:'90%'}}>{Math.round(state.airspeed - 40)}</div>
              </div>
              <div className="pfd-as-box">
                <span className="pfd-as-val">{Math.round(state.airspeed)}</span>
              </div>
              <div className="pfd-as-label">AIRSPEED</div>
            </div>
            
            <div className="pfd-altitude">
              <div className="pfd-alt-tape">
                <div className="pfd-alt-mark" style={{top:'10%'}}></div>
                <div className="pfd-alt-num" style={{top:'10%'}}>{Math.round(state.altitude + 500)}</div>
                <div className="pfd-alt-mark" style={{top:'30%'}}></div>
                <div className="pfd-alt-num" style={{top:'30%'}}>{Math.round(state.altitude + 200)}</div>
                <div className="pfd-alt-mark" style={{top:'50%'}}></div>
                <div className="pfd-alt-num" style={{top:'50%'}}>{Math.round(state.altitude)}</div>
                <div className="pfd-alt-mark" style={{top:'70%'}}></div>
                <div className="pfd-alt-num" style={{top:'70%'}}>{Math.round(state.altitude - 200)}</div>
                <div className="pfd-alt-mark" style={{top:'90%'}}></div>
                <div className="pfd-alt-num" style={{top:'90%'}}>{Math.round(state.altitude - 500)}</div>
              </div>
              <div className="pfd-alt-box">
                <span className="pfd-alt-val">{Math.round(state.altitude)}</span>
              </div>
              <div className="pfd-alt-label">ALTITUDE</div>
            </div>
            
            <div className="pfd-vs">
              <div className="pfd-vs-scale">
                <div className="pfd-vs-mark"></div>
                <div className="pfd-vs-mark"></div>
                <div className="pfd-vs-mark"></div>
                <div className="pfd-vs-mark"></div>
                <div className="pfd-vs-mark"></div>
              </div>
              <div className="pfd-vs-needle" style={{ transform: `translate(-50%, -50%) rotate(${vsRotation}deg)` }}></div>
              <div className="pfd-vs-label">VS</div>
            </div>
            
            <div className="pfd-heading">
              <div className="pfd-hdg-box">
                <span className="pfd-hdg-val">{Math.round(state.heading)}°</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* ND */}
        <div className="b777-inst b777-nd">
          <div className="b777-inst-title">ND</div>
          <div className="nd-screen">
            <div className="nd-compass" style={{ transform: `translate(-50%, -50%) rotate(${-state.heading}deg)` }}>
              <div className="nd-range-rings">
                <div className="nd-ring nd-ring-1"></div>
                <div className="nd-ring nd-ring-2"></div>
                <div className="nd-ring nd-ring-3"></div>
              </div>
              <div className="nd-radials">
                <div className="nd-radial" style={{transform:'rotate(0deg)'}}></div>
                <div className="nd-radial" style={{transform:'rotate(45deg)'}}></div>
                <div className="nd-radial" style={{transform:'rotate(90deg)'}}></div>
                <div className="nd-radial" style={{transform:'rotate(135deg)'}}></div>
                <div className="nd-radial" style={{transform:'rotate(180deg)'}}></div>
                <div className="nd-radial" style={{transform:'rotate(225deg)'}}></div>
                <div className="nd-radial" style={{transform:'rotate(270deg)'}}></div>
                <div className="nd-radial" style={{transform:'rotate(315deg)'}}></div>
              </div>
            </div>
            <div className="nd-aircraft"></div>
            <div className="nd-info">
              <div className="nd-info-item">GS <span className="nd-info-val">{Math.round(state.groundSpeed)}</span></div>
              <div className="nd-info-item">TAS <span className="nd-info-val">{Math.round(state.airspeed * 1.02)}</span></div>
              <div className="nd-info-item">HDG <span className="nd-info-val">{Math.round(state.heading)}°</span></div>
              <div className="nd-info-item">RANGE <span className="nd-info-val">80 NM</span></div>
            </div>
          </div>
        </div>
        
        {/* EICAS */}
        <div className="b777-inst b777-eicas">
          <div className="b777-inst-title">EICAS</div>
          <div className="eicas-screen">
            <div className="eicas-title">ENGINE</div>
            <div className="eicas-engines">
              <div className="eicas-engine">
                <div className="eicas-eng-label">ENG 1 {state.engine1Enabled ? '●' : '○'}</div>
                <div className="eicas-gauge">
                  <div className="eicas-gauge-label">N1</div>
                  <div className="eicas-gauge-bar">
                    <div className="eicas-gauge-fill" style={{width:`${state.engine1N1}%`}}></div>
                  </div>
                  <div className="eicas-gauge-val">{state.engine1N1.toFixed(1)}%</div>
                </div>
              </div>
              <div className="eicas-engine">
                <div className="eicas-eng-label">ENG 2 {state.engine2Enabled ? '●' : '○'}</div>
                <div className="eicas-gauge">
                  <div className="eicas-gauge-label">N1</div>
                  <div className="eicas-gauge-bar">
                    <div className="eicas-gauge-fill" style={{width:`${state.engine2N1}%`}}></div>
                  </div>
                  <div className="eicas-gauge-val">{state.engine2N1.toFixed(1)}%</div>
                </div>
              </div>
            </div>
            <div className="eicas-temps">
              <div className="eicas-temp-row">
                <span className="eicas-temp-label">THROTTLE</span>
                <span className="eicas-temp-val">{Math.round(state.throttle)}%</span>
              </div>
              <div className="eicas-temp-row">
                <span className="eicas-temp-label">FLAPS</span>
                <span className="eicas-temp-val">{state.flapsAngle}°</span>
              </div>
              <div className="eicas-temp-row">
                <span className="eicas-temp-label">GEAR</span>
                <span className="eicas-temp-val">{state.gearDown ? 'DOWN' : 'UP'}</span>
              </div>
              <div className="eicas-temp-row">
                <span className="eicas-temp-label">PITCH</span>
                <span className="eicas-temp-val">{state.pitch.toFixed(1)}°</span>
              </div>
              <div className="eicas-temp-row">
                <span className="eicas-temp-label">ROLL</span>
                <span className="eicas-temp-val">{state.roll.toFixed(1)}°</span>
              </div>
            </div>
          </div>
        </div>
        
        {/* 备用仪表 */}
        <div className="b777-standby">
          <div className="b777-inst standby-inst">
            <div className="b777-inst-title">TURN</div>
            <div className="standby-screen">
              <div className="standby-val">{state.roll.toFixed(0)}°</div>
              <div className="standby-label">BANK ANGLE</div>
            </div>
          </div>
          
          <div className="b777-inst standby-inst">
            <div className="b777-inst-title">SLIP</div>
            <div className="standby-screen">
              <div className="standby-val">0.0</div>
              <div className="standby-label">SLIP/SKID</div>
            </div>
          </div>
          
          <div className="b777-inst standby-inst">
            <div className="b777-inst-title">SPD</div>
            <div className="standby-screen">
              <div className="standby-val">{Math.round(state.airspeed)}</div>
              <div className="standby-label">AIRSPEED KTS</div>
            </div>
          </div>
          
          <div className="b777-inst standby-inst">
            <div className="b777-inst-title">ALT</div>
            <div className="standby-screen">
              <div className="standby-val">{Math.round(state.altitude)}</div>
              <div className="standby-label">ALTITUDE FT</div>
            </div>
          </div>
          
          <div className="b777-inst standby-inst">
            <div className="b777-inst-title">ATT</div>
            <div className="standby-screen">
              <div className="standby-val">{state.pitch.toFixed(0)}°</div>
              <div className="standby-label">PITCH</div>
            </div>
          </div>
          
          <div className="b777-inst standby-inst">
            <div className="b777-inst-title">CLOCK</div>
            <div className="standby-screen">
              <div className="standby-val">{formatTime(currentTime)}</div>
              <div className="standby-label">UTC TIME</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
