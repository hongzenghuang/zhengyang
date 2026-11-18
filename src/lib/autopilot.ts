import { AircraftState } from './types';

// Autopilot logic with smooth control
export function applyAutopilot(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  if (!state.autopilotEnabled) {
    return state;
  }

  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.1);

  // Heading hold - smooth roll control
  const headingError = state.targetHeading - state.heading;
  let normalizedError = headingError;
  if (normalizedError > 180) normalizedError -= 360;
  if (normalizedError < -180) normalizedError += 360;

  // Calculate target roll (max 25 degrees bank)
  const targetRoll = Math.max(-25, Math.min(25, normalizedError * 1.5));
  const rollDiff = targetRoll - state.roll;
  newState.roll = state.roll + rollDiff * dt * 1.5;

  // Altitude hold - smooth pitch control
  const altitudeError = state.targetAltitude - state.altitude;
  
  // Calculate target vertical speed (max 1800 ft/min)
  const targetVS = Math.max(-1800, Math.min(1800, altitudeError * 8));
  
  // Adjust pitch to achieve target vertical speed
  const vsError = targetVS - state.verticalSpeed;
  const pitchAdjustment = vsError * 0.0008;
  
  newState.pitch = Math.max(-12, Math.min(12, state.pitch + pitchAdjustment * dt * 8));

  return newState;
}
