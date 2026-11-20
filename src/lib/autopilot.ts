import { AircraftState } from './types';

// Autopilot with direct altitude control - much more reliable
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

  // === ALTITUDE HOLD (Direct Pitch Control) ===
  const altitudeError = state.targetAltitude - state.altitude;
  
  // Direct pitch control based on altitude error
  // Positive error = need to climb = positive pitch
  // Negative error = need to descend = negative pitch
  
  // Calculate required pitch angle to achieve target altitude
  // At cruise, ~2° pitch maintains level flight
  // Each degree of pitch ≈ 500 ft/min vertical speed
  const basePitch = 2; // Level flight pitch
  const pitchPerFPM = 0.004; // degrees per ft/min
  
  // Target vertical speed based on altitude error
  const maxVS = 3000; // ft/min
  const targetVS = Math.max(-maxVS, Math.min(maxVS, altitudeError * 8));
  
  // Target pitch = base + VS contribution
  const targetPitch = basePitch + targetVS * pitchPerFPM;
  
  // Smooth pitch transition
  const pitchError = targetPitch - state.pitch;
  const maxPitchRate = 4; // degrees per second
  const pitchChange = Math.max(-maxPitchRate, Math.min(maxPitchRate, pitchError * 3));
  
  // Apply pitch with wider limits for better authority
  newState.pitch = Math.max(-15, Math.min(20, state.pitch + pitchChange * dt));

  // === ALTITUDE CAPTURE (prevent overshoot) ===
  if (Math.abs(altitudeError) < 200) {
    // Very close to target - use gentle correction
    const capturePitch = basePitch + (altitudeError * 0.01);
    const captureError = capturePitch - state.pitch;
    newState.pitch = state.pitch + Math.max(-1, Math.min(1, captureError * 2)) * dt;
  }

  return newState;
}
