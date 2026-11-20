import { AircraftState } from './types';

// Autopilot with improved altitude and heading control
export function applyAutopilot(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  if (!state.autopilotEnabled) {
    return state;
  }

  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.05);

  // === HEADING HOLD (Roll Control) ===
  const headingError = state.targetHeading - state.heading;
  let normalizedHeadingError = headingError;
  if (normalizedHeadingError > 180) normalizedHeadingError -= 360;
  if (normalizedHeadingError < -180) normalizedHeadingError += 360;

  // Target bank angle proportional to heading error (max 25°)
  const targetRoll = Math.max(-25, Math.min(25, normalizedHeadingError * 2));
  const rollDiff = targetRoll - state.roll;
  
  // Smooth roll rate (max 3°/sec)
  const maxRollRate = 3;
  const rollChange = Math.max(-maxRollRate, Math.min(maxRollRate, rollDiff * 2));
  newState.roll = state.roll + rollChange * dt;

  // === ALTITUDE HOLD (Pitch Control) ===
  const altitudeError = state.targetAltitude - state.altitude;
  
  // Phase 1: Calculate target vertical speed based on altitude error
  // More aggressive gains for better altitude control
  const maxVS = 2500; // ft/min
  const altGain = 12; // ft/min per ft of error (increased)
  const targetVS = Math.max(-maxVS, Math.min(maxVS, altitudeError * altGain));
  
  // Phase 2: Pitch control to achieve target VS
  const vsError = targetVS - state.verticalSpeed;
  
  // Much more aggressive pitch adjustment
  const vsGainLarge = 0.0015; // For large errors (increased from 0.0008)
  const vsGainSmall = 0.0008; // For small errors (increased from 0.0003)
  const vsGain = Math.abs(vsError) > 300 ? vsGainLarge : vsGainSmall;
  
  const pitchAdjustment = vsError * vsGain;
  
  // Faster pitch rate for better response
  const maxPitchRate = 3; // increased from 2
  const pitchChange = Math.max(-maxPitchRate, Math.min(maxPitchRate, pitchAdjustment * 60));
  
  // Wider pitch limits for better climb/descent authority
  newState.pitch = Math.max(-12, Math.min(15, state.pitch + pitchChange * dt));

  // === ALTITUDE CAPTURE (reduce overshoot) ===
  // When within 300ft of target, use gentler correction
  if (Math.abs(altitudeError) < 300) {
    const captureVS = altitudeError * 15; // Gentler correction
    const captureVSError = captureVS - state.verticalSpeed;
    const capturePitchAdj = captureVSError * 0.0004;
    newState.pitch = Math.max(-8, Math.min(10, state.pitch + capturePitchAdj * dt * 60));
  }

  return newState;
}
