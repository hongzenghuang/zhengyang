import { AircraftState } from './types';

// PID state for autothrottle (stored globally)
let atIntegral = 0;
let atLastError = 0;
let atLastTime = Date.now();

// Reset PID state
export function resetAutothrottlePID() {
  atIntegral = 0;
  atLastError = 0;
  atLastTime = Date.now();
}

// Autothrottle with PID control for stable speed holding
export function applyAutothrottle(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  if (!state.autothrottleEnabled) {
    resetAutothrottlePID();
    return state;
  }

  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.05);
  const now = Date.now();
  const actualDt = (now - atLastTime) / 1000;
  atLastTime = now;

  // Calculate airspeed error
  const speedError = state.targetAirspeed - state.airspeed;
  
  // Dead zone - don't adjust if within 3 knots of target
  if (Math.abs(speedError) < 3) {
    atIntegral = 0; // Reset integral in dead zone
    return state;
  }
  
  // PID gains - tuned for stability
  const Kp = 0.03; // Proportional (reduced from 0.08)
  const Ki = 0.005; // Integral (eliminates steady-state error)
  const Kd = 0.01; // Derivative (dampens oscillation)
  
  // Integral term (with anti-windup)
  atIntegral += speedError * actualDt;
  atIntegral = Math.max(-50, Math.min(50, atIntegral)); // Anti-windup
  
  // Derivative term
  const derivative = actualDt > 0 ? (speedError - atLastError) / actualDt : 0;
  atLastError = speedError;
  
  // PID output
  const pidOutput = (Kp * speedError) + (Ki * atIntegral) + (Kd * derivative);
  
  // Limit throttle adjustment rate: max 1.5% per second (very smooth)
  const maxAdjustment = 1.5 * dt;
  const clampedAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, pidOutput));
  
  newState.throttle = Math.max(0, Math.min(100, state.throttle + clampedAdjustment));

  return newState;
}
