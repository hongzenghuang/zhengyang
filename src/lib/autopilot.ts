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
  // Large error = faster climb/descent, small error = gentle correction
  const maxVS = 2000; // ft/min
  const altGain = 8; // ft/min per ft of error
  const targetVS = Math.max(-maxVS, Math.min(maxVS, altitudeError * altGain));
  
  // Phase 2: Pitch control to achieve target VS
  const vsError = targetVS - state.verticalSpeed;
  
  // Pitch adjustment proportional to VS error
  // More aggressive when far from target, gentler when close
  const vsGainLarge = 0.0008; // For large errors
  const vsGainSmall = 0.0003; // For small errors
  const vsGain = Math.abs(vsError) > 500 ? vsGainLarge : vsGainSmall;
  
  const pitchAdjustment = vsError * vsGain;
  
  // Limit pitch rate (max 2°/sec for smooth control)
  const maxPitchRate = 2;
  const pitchChange = Math.max(-maxPitchRate, Math.min(maxPitchRate, pitchAdjustment * 60));
  
  // Pitch limits: -8° to +12° (more nose-up authority for climb)
  newState.pitch = Math.max(-8, Math.min(12, state.pitch + pitchChange * dt));

  // === ALTITUDE CAPTURE (reduce overshoot) ===
  // When within 200ft of target, reduce VS to prevent overshoot
  if (Math.abs(altitudeError) < 200) {
    const captureVS = altitudeError * 20; // Gentle correction
    const captureVSError = captureVS - state.verticalSpeed;
    const capturePitchAdj = captureVSError * 0.0002;
    newState.pitch = Math.max(-5, Math.min(8, state.pitch + capturePitchAdj * dt * 60));
  }

  return newState;
}
