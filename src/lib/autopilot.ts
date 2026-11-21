import { AircraftState } from './types';

// PID state for autopilot altitude control
let apIntegral = 0;
let apLastError = 0;
let apLastTime = Date.now();

// Reset PID state
export function resetAutopilotPID() {
  apIntegral = 0;
  apLastError = 0;
  apLastTime = Date.now();
}

// Autopilot with PID altitude control for stable altitude holding
export function applyAutopilot(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  if (!state.autopilotEnabled) {
    resetAutopilotPID();
    return state;
  }

  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.05);
  const now = Date.now();
  const actualDt = (now - apLastTime) / 1000;
  apLastTime = now;

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

  // === ALTITUDE HOLD (PID Pitch Control) ===
  const altitudeError = state.targetAltitude - state.altitude;
  
  // Dead zone - don't adjust if within 50ft of target
  if (Math.abs(altitudeError) < 50) {
    apIntegral = 0; // Reset integral in dead zone
    // Maintain current pitch with small correction
    const levelPitch = 2; // Level flight pitch
    const pitchError = levelPitch - state.pitch;
    newState.pitch = state.pitch + Math.max(-0.5, Math.min(0.5, pitchError * 0.5)) * dt;
    return newState;
  }
  
  // PID gains - tuned for stability
  const Kp = 0.008; // Proportional
  const Ki = 0.001; // Integral (eliminates steady-state error)
  const Kd = 0.003; // Derivative (dampens oscillation)
  
  // Integral term (with anti-windup)
  apIntegral += altitudeError * actualDt;
  apIntegral = Math.max(-200, Math.min(200, apIntegral)); // Anti-windup
  
  // Derivative term (rate of change of error)
  const derivative = actualDt > 0 ? (altitudeError - apLastError) / actualDt : 0;
  apLastError = altitudeError;
  
  // PID output = target pitch adjustment
  const pidOutput = (Kp * altitudeError) + (Ki * apIntegral) + (Kd * derivative);
  
  // Base pitch for level flight
  const basePitch = 2;
  const targetPitch = basePitch + pidOutput;
  
  // Limit pitch: -12° to +18°
  const clampedTargetPitch = Math.max(-12, Math.min(18, targetPitch));
  
  // Smooth pitch transition (max 2°/sec)
  const pitchError = clampedTargetPitch - state.pitch;
  const maxPitchRate = 2;
  const pitchChange = Math.max(-maxPitchRate, Math.min(maxPitchRate, pitchError * 2));
  
  newState.pitch = state.pitch + pitchChange * dt;

  return newState;
}
