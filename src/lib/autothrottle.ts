import { AircraftState } from './types';

// Autothrottle logic with smooth control
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
  
  // Adjust throttle smoothly (max 5% per second)
  const throttleAdjustment = speedError * 0.4;
  const maxAdjustment = 5 * dt;
  const clampedAdjustment = Math.max(-maxAdjustment, Math.min(maxAdjustment, throttleAdjustment));
  
  newState.throttle = Math.max(0, Math.min(100, state.throttle + clampedAdjustment));

  return newState;
}
