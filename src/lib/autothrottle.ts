import { AircraftState } from './types';

// Autothrottle with smooth, stable control
export function applyAutothrottle(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  if (!state.autothrottleEnabled) {
    return state;
  }

  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.05);

  // Calculate airspeed error
  const speedError = state.targetAirspeed - state.airspeed;
  
  // Dead zone - don't adjust if within 5 knots of target
  if (Math.abs(speedError) < 5) {
    return state;
  }
  
  // Conservative gain - much smoother control
  // Max adjustment: 2% per second (was 5%)
  const gain = 0.08; // Reduced from 0.4
  const throttleAdjustment = speedError * gain;
  const maxAdjustment = 2 * dt; // Max 2% per second
  const clampedAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, throttleAdjustment));
  
  newState.throttle = Math.max(0, Math.min(100, state.throttle + clampedAdjustment));

  return newState;
}
