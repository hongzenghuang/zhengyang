import { AircraftState } from './types';

// Autothrottle logic to maintain target airspeed
export function applyAutothrottle(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  if (!state.autothrottleEnabled) {
    return state;
  }

  const newState = { ...state };

  // Calculate airspeed error
  const speedError = state.targetAirspeed - state.airspeed;
  
  // Adjust throttle to maintain target speed
  const throttleAdjustment = speedError * 0.5;
  
  newState.throttle = Math.max(0, Math.min(100, state.throttle + throttleAdjustment * deltaTime));

  return newState;
}
