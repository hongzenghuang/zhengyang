import { AircraftState } from './types';

// Physics constants
const GRAVITY = 32.174; // ft/s^2
const AIR_DENSITY_SEA_LEVEL = 0.002377; // slug/ft^3
const WING_AREA = 4605; // ft^2 (B777-300ER)
const CRUISE_WEIGHT = 480000; // lbf (typical cruise weight, not max takeoff)
const MASS = CRUISE_WEIGHT / GRAVITY; // slug
const MAX_THRUST_PER_ENGINE = 115000; // lbf per engine

// Calculate air density based on altitude (ISA model)
function getAirDensity(altitude: number): number {
  const altitudeFt = Math.max(0, altitude);
  const tempRatio = 1 - (altitudeFt * 0.000006875);
  const pressureRatio = Math.pow(tempRatio, 5.2561);
  const densityRatio = pressureRatio / tempRatio;
  return AIR_DENSITY_SEA_LEVEL * densityRatio;
}

// Get density ratio for TAS calculation
function getDensityRatio(altitude: number): number {
  const altitudeFt = Math.max(0, altitude);
  const tempRatio = 1 - (altitudeFt * 0.000006875);
  const pressureRatio = Math.pow(tempRatio, 5.2561);
  return pressureRatio / tempRatio;
}

// Calculate lift coefficient
function getLiftCoefficient(pitch: number, flapsAngle: number, airspeed: number): number {
  // CL = base + pitch contribution + flaps contribution
  const baseCL = 0.1;
  const pitchCL = pitch * 0.12; // pitch in degrees
  const flapsCL = flapsAngle * 0.012;
  
  // Stall model
  const stallSpeed = 120 + flapsAngle * 1.5;
  const stallFactor = airspeed < stallSpeed ? Math.max(0.2, airspeed / stallSpeed) : 1;
  
  return Math.max(-0.3, Math.min(2.0, (baseCL + pitchCL + flapsCL) * stallFactor));
}

// Calculate drag coefficient
function getDragCoefficient(liftCoeff: number, flapsAngle: number, gearDown: boolean): number {
  const baseCD = 0.02;
  const inducedDrag = 0.04 * liftCoeff * liftCoeff; // Induced drag proportional to CL²
  const flapsDrag = flapsAngle * 0.003;
  const gearDrag = gearDown ? 0.015 : 0;
  return baseCD + inducedDrag + flapsDrag + gearDrag;
}

// Main physics update function
export function updateFlightPhysics(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.05); // Cap delta time for stability

  // Calculate thrust (throttle is 0-100, convert to 0-1)
  const throttleNorm = state.throttle / 100;
  const engine1Thrust = state.engine1Enabled ? throttleNorm * MAX_THRUST_PER_ENGINE : 0;
  const engine2Thrust = state.engine2Enabled ? throttleNorm * MAX_THRUST_PER_ENGINE : 0;
  const totalThrust = engine1Thrust + engine2Thrust;

  // Update N1 based on throttle (smooth transition)
  const targetN1 = state.throttle * 0.85 + 15;
  const n1Rate = 20; // N1 change rate per second
  newState.engine1N1 = state.engine1Enabled 
    ? state.engine1N1 + (targetN1 - state.engine1N1) * Math.min(1, n1Rate * dt / 100)
    : Math.max(0, state.engine1N1 - dt * 10);
  newState.engine2N1 = state.engine2Enabled 
    ? state.engine2N1 + (targetN1 - state.engine2N1) * Math.min(1, n1Rate * dt / 100)
    : Math.max(0, state.engine2N1 - dt * 10);

  // Convert IAS to TAS for aerodynamic calculations
  const densityRatio = getDensityRatio(state.altitude);
  const tas = state.airspeed / Math.sqrt(Math.max(0.01, densityRatio)); // TAS in knots
  const velocityFtS = tas * 1.68781; // TAS to ft/s

  // Calculate aerodynamic forces using TAS
  const airDensity = getAirDensity(state.altitude);
  const cl = getLiftCoefficient(state.pitch, state.flapsAngle, state.airspeed);
  const cd = getDragCoefficient(cl, state.flapsAngle, state.gearDown);

  const dynamicPressure = 0.5 * airDensity * velocityFtS * velocityFtS;
  const lift = dynamicPressure * WING_AREA * cl;
  const drag = dynamicPressure * WING_AREA * cd;
  const weight = CRUISE_WEIGHT;

  // Ground detection - aircraft is on ground when altitude is 0 and gear is down
  const isOnGround = state.altitude <= 0 && state.gearDown;

  // Calculate accelerations
  const pitchRad = (state.pitch * Math.PI) / 180;
  const rollRad = (state.roll * Math.PI) / 180;

  // Forward acceleration (thrust - drag - gravity component - ground friction)
  const thrustForward = totalThrust * Math.cos(pitchRad);
  const dragForce = drag;
  const gravityForward = weight * Math.sin(pitchRad);
  const groundFriction = isOnGround ? velocityFtS * 500 : 0; // Ground friction proportional to speed
  const netForceForward = thrustForward - dragForce - gravityForward - groundFriction;
  const accelerationForward = netForceForward / MASS;

  // Update airspeed (IAS)
  const newTASFtS = Math.max(0, velocityFtS + accelerationForward * dt);
  const newTAS = newTASFtS / 1.68781; // back to knots
  const newIAS = newTAS * Math.sqrt(Math.max(0.01, densityRatio));
  newState.airspeed = Math.max(0, newIAS);

  // Vertical forces - only apply when not on ground
  if (isOnGround) {
    // On ground: no vertical movement, vertical speed is 0
    newState.verticalSpeed = 0;
    newState.altitude = 0;
  } else {
    // In air: calculate vertical forces
    const liftVertical = lift * Math.cos(rollRad);
    const gravityVertical = weight * Math.cos(pitchRad);
    const netForceVertical = liftVertical - gravityVertical;
    const verticalAcceleration = netForceVertical / MASS; // ft/s²

    // Update vertical speed (ft/min)
    // verticalAcceleration is in ft/s², convert to ft/min per second by multiplying by 60
    const vsChange = verticalAcceleration * 60 * dt; // ft/min change this frame
    newState.verticalSpeed = state.verticalSpeed + vsChange;

    // Dampen vertical speed oscillations near equilibrium
    if (Math.abs(state.verticalSpeed) < 5 && Math.abs(verticalAcceleration) < 0.1) {
      newState.verticalSpeed = newState.verticalSpeed * 0.95;
    }

    // Clamp vertical speed to realistic values
    newState.verticalSpeed = Math.max(-6000, Math.min(6000, newState.verticalSpeed));

    // Update altitude using average vertical speed
    const avgVS = (state.verticalSpeed + newState.verticalSpeed) / 2;
    const altitudeChange = (avgVS / 60) * dt; // ft/min to ft/s, then multiply by dt
    newState.altitude = Math.max(0, state.altitude + altitudeChange);

    // If we hit the ground, stop descending
    if (newState.altitude <= 0) {
      newState.altitude = 0;
      newState.verticalSpeed = Math.max(0, newState.verticalSpeed); // Only allow positive VS on ground
    }
  }

  // Update heading based on roll (only significant in air)
  const turnRate = isOnGround ? state.roll * 0.01 : state.roll * 0.03; // degrees per second per degree of roll
  newState.heading = (state.heading + turnRate * dt + 360) % 360;

  // Ground speed approximation
  const newTAS2 = newState.airspeed / Math.sqrt(Math.max(0.01, densityRatio));
  newState.groundSpeed = newTAS2 * 0.98;

  // Apply pitch damping (return to trim slowly)
  if (Math.abs(state.pitch) > 0.1) {
    newState.pitch = state.pitch * (1 - dt * 0.15);
  }

  // Apply roll damping
  if (Math.abs(state.roll) > 0.1) {
    newState.roll = state.roll * (1 - dt * 0.4);
  }

  return newState;
}

// Initial aircraft state - stopped on ground
export const initialAircraftState: AircraftState = {
  altitude: 0,
  pitch: 0,
  roll: 0,
  heading: 270,
  airspeed: 0,
  verticalSpeed: 0,
  groundSpeed: 0,
  engine1N1: 0,
  engine2N1: 0,
  engine1Enabled: true,
  engine2Enabled: true,
  throttle: 0,
  gearDown: true,
  flapsAngle: 0,
  autopilotEnabled: false,
  autothrottleEnabled: false,
  targetHeading: 270,
  targetAltitude: 10000,
  targetAirspeed: 250,
  verticalSpeedTarget: 0,
};
