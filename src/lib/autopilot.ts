import { AircraftState } from './types';

// Autopilot logic to maintain target heading, altitude, and vertical speed
export function applyAutopilot(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  if (!state.autopilotEnabled) {
    return state;
  }

  const newState = { ...state };

  // Heading hold - adjust roll to turn towards target heading
  const headingError = state.targetHeading - state.heading;
  let normalizedError = headingError;
  
  // Normalize to -180 to 180
  if (normalizedError > 180) normalizedError -= 360;
  if (normalizedError < -180) normalizedError += 360;
  
  // Calculate target roll based on heading error
  const targetRoll = Math.max(-30, Math.min(30, normalizedError * 2));
  
  // Smoothly adjust roll towards target
  const rollDiff = targetRoll - state.roll;
  newState.roll = state.roll + rollDiff * deltaTime * 2;

  // Altitude hold - adjust pitch to maintain target altitude
  const altitudeError = state.targetAltitude - state.altitude;
  
  // Calculate target vertical speed based on altitude error
  const targetVS = Math.max(-2000, Math.min(2000, altitudeError * 10));
  
  // Adjust pitch to achieve target vertical speed
  const vsError = targetVS - state.verticalSpeed;
  const pitchAdjustment = vsError * 0.001;
  
  newState.pitch = Math.max(-15, Math.min(15, state.pitch + pitchAdjustment * deltaTime * 10));

  return newState;
}
