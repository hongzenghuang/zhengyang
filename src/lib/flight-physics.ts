import { AircraftState } from './types';

// Physics constants
const GRAVITY = 32.174; // ft/s^2
const AIR_DENSITY_SEA_LEVEL = 0.002377; // slug/ft^3
const WING_AREA = 4605; // ft^2 (B777-300ER)
const MASS = 775000 / 32.174; // slug (max takeoff weight / g)
const MAX_THRUST_PER_ENGINE = 115000; // lbf per engine

// Calculate air density based on altitude (ISA model)
function getAirDensity(altitude: number): number {
  const altitudeFt = Math.max(0, altitude);
  const tempRatio = 1 - (altitudeFt * 0.000006875);
  const pressureRatio = Math.pow(tempRatio, 5.2561);
  return AIR_DENSITY_SEA_LEVEL * pressureRatio / tempRatio;
}

// Calculate lift coefficient
function getLiftCoefficient(pitch: number, flapsAngle: number, airspeed: number): number {
  const aoa = pitch * 0.8; // Simplified angle of attack
  const baseCL = 0.3 + (aoa * 0.08);
  const flapsBonus = flapsAngle * 0.015;
  const stallSpeed = 130 + flapsAngle * 2;
  const stallFactor = airspeed < stallSpeed ? Math.max(0.3, airspeed / stallSpeed) : 1;
  return Math.max(-0.5, Math.min(2.5, (baseCL + flapsBonus) * stallFactor));
}

// Calculate drag coefficient
function getDragCoefficient(flapsAngle: number, gearDown: boolean, airspeed: number): number {
  const baseCD = 0.018;
  const inducedDrag = 0.0001 * airspeed;
  const flapsDrag = flapsAngle * 0.004;
  const gearDrag = gearDown ? 0.012 : 0;
  return baseCD + inducedDrag + flapsDrag + gearDrag;
}

// Main physics update function
export function updateFlightPhysics(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.1); // Cap delta time

  // Calculate thrust (throttle is 0-100, convert to 0-1)
  const throttleNorm = state.throttle / 100;
  const engine1Thrust = state.engine1Enabled ? throttleNorm * MAX_THRUST_PER_ENGINE : 0;
  const engine2Thrust = state.engine2Enabled ? throttleNorm * MAX_THRUST_PER_ENGINE : 0;
  const totalThrust = engine1Thrust + engine2Thrust;

  // Update N1 based on throttle (smooth transition)
  const targetN1 = state.throttle * 0.9 + 10;
  const n1Rate = 15; // N1 change rate per second
  newState.engine1N1 = state.engine1Enabled 
    ? state.engine1N1 + (targetN1 - state.engine1N1) * Math.min(1, n1Rate * dt / 100)
    : Math.max(0, state.engine1N1 - dt * 8);
  newState.engine2N1 = state.engine2Enabled 
    ? state.engine2N1 + (targetN1 - state.engine2N1) * Math.min(1, n1Rate * dt / 100)
    : Math.max(0, state.engine2N1 - dt * 8);

  // Calculate aerodynamic forces
  const airDensity = getAirDensity(state.altitude);
  const velocityFtS = state.airspeed * 1.68781; // knots to ft/s

  const lift = 0.5 * airDensity * velocityFtS * velocityFtS * WING_AREA * 
               getLiftCoefficient(state.pitch, state.flapsAngle, state.airspeed);
  const drag = 0.5 * airDensity * velocityFtS * velocityFtS * WING_AREA * 
               getDragCoefficient(state.flapsAngle, state.gearDown, state.airspeed);
  const weight = MASS * GRAVITY;

  // Calculate accelerations
  const pitchRad = (state.pitch * Math.PI) / 180;
  const thrustComponent = totalThrust * Math.cos(pitchRad);
  const dragForce = drag + weight * Math.sin(pitchRad);
  const netForceForward = thrustComponent - dragForce;
  const accelerationForward = netForceForward / MASS;

  // Update airspeed
  const newVelocityFtS = velocityFtS + accelerationForward * dt;
  newState.airspeed = Math.max(0, newVelocityFtS / 1.68781);

  // Calculate vertical forces
  const liftComponent = lift * Math.cos((state.roll * Math.PI) / 180);
  const verticalForce = liftComponent - weight * Math.cos(pitchRad);
  const verticalAcceleration = verticalForce / MASS;

  // Update vertical speed (smooth)
  const targetVS = verticalAcceleration * 60 * 60; // ft/min
  newState.verticalSpeed = state.verticalSpeed + (targetVS - state.verticalSpeed) * Math.min(1, dt * 2);

  // Update altitude
  const altitudeChange = (state.verticalSpeed / 60) * dt;
  newState.altitude = Math.max(0, state.altitude + altitudeChange);

  // Update heading based on roll
  const turnRate = state.roll * 0.025;
  newState.heading = (state.heading + turnRate * dt + 360) % 360;

  // Ground speed
  newState.groundSpeed = state.airspeed * 0.98;

  // Apply pitch damping (return to neutral slowly)
  if (Math.abs(state.pitch) > 0.5) {
    newState.pitch = state.pitch * (1 - dt * 0.3);
  }

  // Apply roll damping
  if (Math.abs(state.roll) > 0.5) {
    newState.roll = state.roll * (1 - dt * 0.5);
  }

  return newState;
}

// Initial aircraft state - stable cruise configuration
export const initialAircraftState: AircraftState = {
  altitude: 35000,
  pitch: 2.5, // Slight nose up for level flight
  roll: 0,
  heading: 270,
  airspeed: 280,
  verticalSpeed: 0,
  groundSpeed: 275,
  engine1N1: 82,
  engine2N1: 82,
  engine1Enabled: true,
  engine2Enabled: true,
  throttle: 78,
  gearDown: false,
  flapsAngle: 0,
  autopilotEnabled: false,
  autothrottleEnabled: false,
  targetHeading: 270,
  targetAltitude: 35000,
  targetAirspeed: 280,
  verticalSpeedTarget: 0,
};
