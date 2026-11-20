import { AircraftState, FlightScenario } from './types';

// Physics constants
const GRAVITY = 32.174; // ft/s^2
const AIR_DENSITY_SEA_LEVEL = 0.002377; // slug/ft^3
const WING_AREA = 4605; // ft^2 (B777-9)
const CRUISE_WEIGHT = 350000; // lbf (lighter for better single-engine performance)
const MASS = CRUISE_WEIGHT / GRAVITY; // slug
const MAX_THRUST_PER_ENGINE = 115000; // lbf per engine (GE9X)
const REVERSE_THRUST_FACTOR = 0.4;

function getAirDensity(altitude: number): number {
  const altitudeFt = Math.max(0, altitude);
  const tempRatio = 1 - (altitudeFt * 0.000006875);
  const pressureRatio = Math.pow(tempRatio, 5.2561);
  const densityRatio = pressureRatio / tempRatio;
  return AIR_DENSITY_SEA_LEVEL * densityRatio;
}

function getDensityRatio(altitude: number): number {
  const altitudeFt = Math.max(0, altitude);
  const tempRatio = 1 - (altitudeFt * 0.000006875);
  const pressureRatio = Math.pow(tempRatio, 5.2561);
  return pressureRatio / tempRatio;
}

function getLiftCoefficient(
  pitch: number, flapsAngle: number, airspeed: number, scenario: FlightScenario
): number {
  // Completely redesigned lift model for realistic performance
  // Key insight: lift coefficient should be higher at cruise to maintain altitude
  // At pitch=2, flaps=0, 250kts: CL≈1.2 (cruise)
  // At pitch=10, flaps=15, 160kts: CL≈2.2 (takeoff)
  
  const baseCL = 0.8; // Higher base for cruise
  const pitchCL = pitch * 0.12; // Pitch effect
  const flapsCL = flapsAngle * 0.06; // Flaps effect
  
  // Icing reduces lift by up to 30%
  const icingPenalty = scenario === 'icing' ? 0.7 : 1.0;
  
  // Stall model: below stall speed, lift degrades
  const stallSpeed = 110 - flapsAngle * 1.2;
  const stallFactor = airspeed < stallSpeed ? Math.max(0.3, airspeed / stallSpeed) : 1;
  
  return Math.max(0, Math.min(3.0, (baseCL + pitchCL + flapsCL) * stallFactor * icingPenalty));
}

function getDragCoefficient(
  liftCoeff: number, flapsAngle: number, gearDown: boolean, scenario: FlightScenario
): number {
  const baseCD = 0.020;
  const inducedDrag = 0.040 * liftCoeff * liftCoeff;
  const flapsDrag = flapsAngle * 0.003;
  const gearDrag = gearDown ? 0.015 : 0;
  // Icing adds extra drag
  const icingDrag = scenario === 'icing' ? 0.015 : 0;
  return baseCD + inducedDrag + flapsDrag + gearDrag + icingDrag;
}

// Scenario-specific effects
function applyScenarioEffects(state: AircraftState, newState: AircraftState, dt: number): void {
  const scenario = state.activeScenario;
  const timer = state.scenarioTimer;

  switch (scenario) {
    case 'engine_failure':
      // Engine 2 fails after 3 seconds
      if (timer > 3 && state.engine2Enabled) {
        newState.engine2Enabled = false;
        newState.scenarioMessage = '⚠ ENGINE 2 FAILURE - 单发失效，保持控制';
      }
      break;

    case 'stall':
      // Stall warning when airspeed is low
      if (state.airspeed < 130) {
        newState.scenarioMessage = '⚠ STALL WARNING - 推杆低头加速改出！';
        // Add nose-down tendency (stall buffet)
        if (state.pitch > 0) {
          newState.pitch = state.pitch - dt * 0.8;
        }
        // Random roll disturbance (wing drop)
        newState.roll = state.roll + (Math.random() - 0.5) * dt * 8;
      } else {
        newState.scenarioMessage = '速度恢复，改出成功';
      }
      break;

    case 'wind_shear': {
      // Wind shear: sudden changes in wind every few seconds
      const shearCycle = Math.floor(timer / 4);
      const shearPhase = timer % 4;
      
      if (shearPhase < 1) {
        // Headwind burst - sudden airspeed increase
        newState.airspeed = state.airspeed + dt * 15;
        newState.verticalSpeed = state.verticalSpeed + dt * 800;
        newState.scenarioMessage = '🌪 WIND SHEAR - 逆风增强！';
      } else if (shearPhase < 2) {
        // Downdraft
        newState.verticalSpeed = state.verticalSpeed - dt * 1200;
        newState.scenarioMessage = '🌪 WIND SHEAR - 下沉气流！';
      } else if (shearPhase < 3) {
        // Tailwind burst - sudden airspeed decrease
        newState.airspeed = Math.max(0, state.airspeed - dt * 12);
        newState.scenarioMessage = '🌪 WIND SHEAR - 顺风增强，空速下降！';
      } else {
        // Recovery
        newState.scenarioMessage = shearCycle > 2 ? '风切变减弱，恢复控制' : '准备下一波风切变...';
      }
      // Random roll disturbance
      newState.roll = state.roll + (Math.random() - 0.5) * dt * 5;
      break;
    }

    case 'bird_strike':
      // Bird strike at 5 seconds - damages engine 1
      if (timer > 5 && timer < 5.5 && state.engine1Enabled) {
        newState.engine1Enabled = false;
        newState.scenarioMessage = '🐦 BIRD STRIKE - 引擎1受损！检查推力';
      }
      // Vibration effect for first 8 seconds
      if (timer > 5 && timer < 8) {
        newState.roll = state.roll + (Math.random() - 0.5) * dt * 10;
        newState.pitch = state.pitch + (Math.random() - 0.5) * dt * 3;
      }
      break;

    case 'icing':
      newState.scenarioMessage = '❄ ICING CONDITIONS - 升力下降，阻力增加';
      // Gradual performance degradation
      if (timer > 10) {
        newState.scenarioMessage = '❄ 严重结冰 - 尽快下降高度！';
      }
      break;

    default:
      newState.scenarioMessage = '';
      break;
  }
}

export function updateFlightPhysics(
  state: AircraftState,
  deltaTime: number
): AircraftState {
  const newState = { ...state };
  const dt = Math.min(deltaTime, 0.05);

  // Update scenario timer
  if (state.activeScenario !== 'normal') {
    newState.scenarioTimer = state.scenarioTimer + dt;
  }

  // N1 response - fast spool up, but starts from 0 when throttle is 0
  const targetN1 = state.throttle > 0 ? state.throttle * 0.85 + 15 : 0;
  newState.engine1N1 = state.engine1Enabled 
    ? state.engine1N1 + (targetN1 - state.engine1N1) * Math.min(1, 6 * dt)
    : Math.max(0, state.engine1N1 - dt * 15);
  newState.engine2N1 = state.engine2Enabled 
    ? state.engine2N1 + (targetN1 - state.engine2N1) * Math.min(1, 6 * dt)
    : Math.max(0, state.engine2N1 - dt * 15);

  // Thrust calculation - direct from N1
  const n1Thrust1 = state.engine1Enabled ? (newState.engine1N1 / 100) * MAX_THRUST_PER_ENGINE : 0;
  const n1Thrust2 = state.engine2Enabled ? (newState.engine2N1 / 100) * MAX_THRUST_PER_ENGINE : 0;
  const totalThrust = n1Thrust1 + n1Thrust2;

  // Ground detection
  const isOnGround = state.altitude <= 0 && state.gearDown;

  // Auto-disengage reverse thrust if not on ground
  if (!isOnGround && state.reverseThrust) {
    newState.reverseThrust = false;
  }

  // Ground roll limits - allow pitch up for rotation
  if (isOnGround) {
    newState.roll = Math.max(-5, Math.min(5, state.roll));
    // Allow pitch up to 20° for takeoff rotation
    newState.pitch = Math.max(-5, Math.min(20, state.pitch));
  }

  // Reverse thrust (only on ground, speed > 5 kts)
  let reverseForce = 0;
  if (state.reverseThrust && isOnGround && state.airspeed > 5) {
    const reverseFactor = Math.min(1, state.airspeed / 80);
    reverseForce = totalThrust * REVERSE_THRUST_FACTOR * reverseFactor;
  }

  // IAS to TAS
  const densityRatio = getDensityRatio(state.altitude);
  const tas = state.airspeed / Math.sqrt(Math.max(0.01, densityRatio));
  const velocityFtS = tas * 1.68781;

  // Aerodynamic forces (with scenario effects)
  const airDensity = getAirDensity(state.altitude);
  const cl = getLiftCoefficient(state.pitch, state.flapsAngle, state.airspeed, state.activeScenario);
  const cd = getDragCoefficient(cl, state.flapsAngle, state.gearDown, state.activeScenario);

  const dynamicPressure = 0.5 * airDensity * velocityFtS * velocityFtS;
  const lift = dynamicPressure * WING_AREA * cl;
  const drag = dynamicPressure * WING_AREA * cd;
  const weight = CRUISE_WEIGHT;

  const pitchRad = (state.pitch * Math.PI) / 180;
  const rollRad = (state.roll * Math.PI) / 180;

  // Asymmetric thrust (yaw effect from single engine)
  const enginesActive = (state.engine1Enabled ? 1 : 0) + (state.engine2Enabled ? 1 : 0);
  let yawFromAsymmetry = 0;
  if (enginesActive === 1 && !isOnGround) {
    // Single engine causes yaw toward dead engine
    const thrustDiff = n1Thrust1 - n1Thrust2;
    yawFromAsymmetry = thrustDiff / MAX_THRUST_PER_ENGINE * 2; // degrees per frame
  }

  // Forward forces - minimal gravity effect for stable climb
  const thrustForward = totalThrust * Math.cos(pitchRad);
  // Gravity component along flight path - very small to prevent excessive deceleration
  const gravityForward = weight * Math.sin(pitchRad) * 0.15;
  const groundFriction = isOnGround ? weight * 0.02 : 0;
  const netForceForward = thrustForward - drag - gravityForward - groundFriction - reverseForce;
  const accelerationForward = netForceForward / MASS;

  // Update airspeed
  const newTASFtS = Math.max(0, velocityFtS + accelerationForward * dt);
  const newTAS = newTASFtS / 1.68781;
  const newIAS = newTAS * Math.sqrt(Math.max(0.01, densityRatio));
  newState.airspeed = Math.max(0, newIAS);

  // Vertical forces - stable and responsive climb
  if (isOnGround) {
    newState.verticalSpeed = 0;
    newState.altitude = 0;
  } else {
    // Lift acts perpendicular to wings
    const liftVertical = lift * Math.cos(rollRad);
    // Thrust contributes to vertical force when pitched up
    const thrustVertical = totalThrust * Math.sin(pitchRad) * 0.3;
    const gravityVertical = weight;
    const netForceVertical = liftVertical + thrustVertical - gravityVertical;
    const verticalAcceleration = netForceVertical / MASS;

    // Responsive vertical speed changes
    const vsChange = verticalAcceleration * 70 * dt;
    newState.verticalSpeed = state.verticalSpeed + vsChange;

    // Gentle damping to stabilize
    if (Math.abs(state.verticalSpeed) < 10 && Math.abs(verticalAcceleration) < 0.05) {
      newState.verticalSpeed = newState.verticalSpeed * 0.97;
    }

    newState.verticalSpeed = Math.max(-6000, Math.min(6000, newState.verticalSpeed));

    const avgVS = (state.verticalSpeed + newState.verticalSpeed) / 2;
    const altitudeChange = (avgVS / 60) * dt;
    newState.altitude = Math.max(0, state.altitude + altitudeChange);

    if (newState.altitude <= 0) {
      newState.altitude = 0;
      newState.verticalSpeed = Math.max(0, newState.verticalSpeed);
    }
  }

  // Heading from roll + asymmetric thrust yaw
  const turnRate = isOnGround ? state.roll * 0.005 : state.roll * 0.03;
  newState.heading = (state.heading + (turnRate + yawFromAsymmetry) * dt + 360) % 360;

  // Ground speed
  const newTAS2 = newState.airspeed / Math.sqrt(Math.max(0.01, densityRatio));
  newState.groundSpeed = newTAS2 * 0.98;

  // Very gentle stability - almost no automatic correction
  // Pilot has full manual control
  if (!isOnGround) {
    // Extremely weak damping only at extreme attitudes
    if (Math.abs(state.pitch) > 15) {
      newState.pitch = state.pitch * (1 - dt * 0.002);
    }
    if (Math.abs(state.roll) > 30) {
      newState.roll = state.roll * (1 - dt * 0.003);
    }
  }

  // Apply scenario effects
  applyScenarioEffects(state, newState, dt);

  return newState;
}

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
  reverseThrust: false,
  gearDown: true,
  flapsAngle: 0,
  autopilotEnabled: false,
  autothrottleEnabled: false,
  targetHeading: 270,
  targetAltitude: 10000,
  targetAirspeed: 250,
  verticalSpeedTarget: 0,
  activeScenario: 'normal',
  scenarioTimer: 0,
  scenarioMessage: '',
};

// Takeoff-ready state: flaps set, on runway, engines at true idle
export const takeoffReadyState: AircraftState = {
  ...initialAircraftState,
  throttle: 0,
  engine1N1: 0, // True idle - no thrust until user advances throttle
  engine2N1: 0,
  flapsAngle: 15,
  gearDown: true,
  heading: 270,
  targetAltitude: 10000,
  targetAirspeed: 250,
  targetHeading: 270,
  scenarioMessage: '襟翼15°已设定 — 按 W 推满油门起飞！',
};

// Scenario-specific initial states
export function getScenarioInitialState(scenario: FlightScenario): AircraftState {
  const base = { ...initialAircraftState, activeScenario: scenario, scenarioTimer: 0, scenarioMessage: '' };

  switch (scenario) {
    case 'engine_failure':
      return {
        ...base,
        altitude: 2000,
        airspeed: 180,
        pitch: 5,
        heading: 270,
        throttle: 85,
        gearDown: false,
        flapsAngle: 5,
        targetAltitude: 10000,
        targetAirspeed: 250,
        scenarioMessage: '起飞爬升中... 等待引擎故障',
      };

    case 'stall':
      return {
        ...base,
        altitude: 8000,
        airspeed: 100,
        pitch: 12,
        heading: 180,
        throttle: 20,
        gearDown: false,
        flapsAngle: 0,
        targetAltitude: 8000,
        targetAirspeed: 250,
        scenarioMessage: '⚠ STALL WARNING - 推杆低头加速改出！',
      };

    case 'wind_shear':
      return {
        ...base,
        altitude: 1500,
        airspeed: 150,
        pitch: -2,
        heading: 360,
        throttle: 60,
        gearDown: true,
        flapsAngle: 25,
        targetAltitude: 0,
        targetAirspeed: 140,
        scenarioMessage: '进近中... 风切变预警',
      };

    case 'bird_strike':
      return {
        ...base,
        altitude: 500,
        airspeed: 160,
        pitch: 8,
        heading: 90,
        throttle: 90,
        gearDown: false,
        flapsAngle: 15,
        targetAltitude: 5000,
        targetAirspeed: 250,
        scenarioMessage: '起飞爬升中... 注意鸟群',
      };

    case 'icing':
      return {
        ...base,
        altitude: 12000,
        airspeed: 220,
        pitch: 2,
        heading: 270,
        throttle: 70,
        gearDown: false,
        flapsAngle: 0,
        targetAltitude: 12000,
        targetAirspeed: 220,
        scenarioMessage: '❄ 进入结冰区域',
      };

    default:
      return base;
  }
}
