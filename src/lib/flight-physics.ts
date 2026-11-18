import { AircraftState } from './types';

// Physics constants
const GRAVITY = 32.174; // ft/s^2
const AIR_DENSITY_SEA_LEVEL = 0.002377; // slug/ft^3
const WING_AREA = 4605; // ft^2 (B777-300ER)
const MASS = 775000 / 32.174; // slug (max takeoff weight / g)

// Calculate air density based on altitude
function getAirDensity(altitude: number): number {
  // Simplified atmospheric model
  const altitudeFactor = Math.max(0, 1 - altitude / 100000);
  return AIR_DENSITY_SEA_LEVEL * altitudeFactor;
}

// Calculate lift coefficient based on angle of attack and flaps
function getLiftCoefficient(pitch: number, flapsAngle: number, airspeed: number): number {
  const baseCL = 0.2 + (pitch * 0.05); // Simplified lift curve
  const flapsBonus = flapsAngle * 0.02;
  const stallFactor = airspeed < 120 ? 0.5 : 1; // Stall warning below 120 knots
  return (baseCL + flapsBonus) * stallFactor;
}

// Calculate drag coefficient
function getDragCoefficient(flapsAngle: number, gearDown: boolean): number {
  const baseCD = 0.02;
  const flapsDrag = flapsAngle * 0.005;
  const gearDrag = gearDown ? 0.015 : 0;
  return baseCD + flapsDrag + gearDrag;
}

// Main physics update function
export function updateFlightPhysics(
  state: AircraftState,
  deltaTime: number // in seconds
): AircraftState {
  const newState = { ...state };
  
  // Calculate thrust from engines
  const engine1Thrust = state.engine1Enabled ? state.throttle * 115000 : 0; // lbf
  const engine2Thrust = state.engine2Enabled ? state.throttle * 115000 : 0; // lbf
  const totalThrust = engine1Thrust + engine2Thrust;
  
  // Update N1 based on throttle
  const targetN1 = state.throttle * 0.95 + 5; // N1 percentage
  newState.engine1N1 = state.engine1Enabled ? targetN1 : Math.max(0, state.engine1N1 - deltaTime * 10);
  newState.engine2N1 = state.engine2Enabled ? targetN1 : Math.max(0, state.engine2N1 - deltaTime * 10);
  
  // Calculate aerodynamic forces
  const airDensity = getAirDensity(state.altitude);
  const velocityFtS = state.airspeed * 1.68781; // knots to ft/s
  
  const lift = 0.5 * airDensity * velocityFtS * velocityFtS * WING_AREA * 
               getLiftCoefficient(state.pitch, state.flapsAngle, state.airspeed);
  const drag = 0.5 * airDensity * velocityFtS * velocityFtS * WING_AREA * 
               getDragCoefficient(state.flapsAngle, state.gearDown);
  const weight = MASS * GRAVITY;
  
  // Calculate accelerations
  const pitchRad = (state.pitch * Math.PI) / 180;
  const thrustComponent = totalThrust * Math.cos(pitchRad);
  const dragForce = drag + weight * Math.sin(pitchRad);
  
  const netForceForward = thrustComponent - dragForce;
  const accelerationForward = netForceForward / MASS;
  
  // Update airspeed
  const newVelocityFtS = velocityFtS + accelerationForward * deltaTime;
  newState.airspeed = Math.max(0, newVelocityFtS / 1.68781);
  
  // Calculate vertical forces
  const liftComponent = lift * Math.cos((state.roll * Math.PI) / 180);
  const verticalForce = liftComponent - weight * Math.cos(pitchRad);
  const verticalAcceleration = verticalForce / MASS;
  
  // Update vertical speed
  newState.verticalSpeed = state.verticalSpeed + verticalAcceleration * deltaTime * 60; // ft/min
  
  // Update altitude
  const altitudeChange = (state.verticalSpeed / 60) * deltaTime;
  newState.altitude = Math.max(0, state.altitude + altitudeChange);
  
  // Update heading based on roll
  const turnRate = state.roll * 0.03; // degrees per second per degree of roll
  newState.heading = (state.heading + turnRate * deltaTime + 360) % 360;
  
  // Ground speed approximation
  newState.groundSpeed = state.airspeed * 0.98; // Simplified wind effect
  
  // Apply pitch damping
  if (Math.abs(state.pitch) > 0.1) {
    newState.pitch = state.pitch * 0.98;
  }
  
  // Apply roll damping
  if (Math.abs(state.roll) > 0.1) {
    newState.roll = state.roll * 0.95;
  }
  
  return newState;
}

// Initial aircraft state
export const initialAircraftState: AircraftState = {
  altitude: 35000,
  pitch: 0,
  roll: 0,
  heading: 270,
  airspeed: 280,
  verticalSpeed: 0,
  groundSpeed: 275,
  engine1N1: 85,
  engine2N1: 85,
  engine1Enabled: true,
  engine2Enabled: true,
  throttle: 80,
  gearDown: false,
  flapsAngle: 0,
  autopilotEnabled: false,
  autothrottleEnabled: false,
  targetHeading: 270,
  targetAltitude: 35000,
  targetAirspeed: 280,
  verticalSpeedTarget: 0,
};
