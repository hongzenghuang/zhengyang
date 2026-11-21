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
  // Corrected lift model based on realistic aerodynamics
  // At cruise (pitch=2°, flaps=0°, 250kts): CL≈0.36 (Lift=Weight)
  // At takeoff (pitch=10°, flaps=15°, 160kts): CL≈1.8 (good rotation)
  
  const baseCL = 0.20;
  const pitchCL = pitch * 0.08;
  const flapsCL = flapsAngle * 0.053;
  
  // Icing reduces lift by up to 30%
  const icingPenalty = scenario === 'icing' ? 0.7 : 1.0;
  
  // Stall model: below stall speed, lift degrades
  const stallSpeed = 110 - flapsAngle * 1.0;
  const stallFactor = airspeed < stallSpeed ? Math.max(0.3, airspeed / stallSpeed) : 1;
  
  return Math.max(0, Math.min(2.5, (baseCL + pitchCL + flapsCL) * stallFactor * icingPenalty));
}

function getDragCoefficient(
  liftCoeff: number, flapsAngle: number, gearDown: boolean, scenario: FlightScenario
): number {
  const baseCD = 0.015; // Further reduced base drag
  const inducedDrag = 0.025 * liftCoeff * liftCoeff; // Much lower induced drag
  const flapsDrag = flapsAngle * 0.002;
  const gearDrag = gearDown ? 0.010 : 0;
  // Icing adds extra drag
  const icingDrag = scenario === 'icing' ? 0.012 : 0;
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

  // N1 response - realistic spool up time
  // Idle N1 = 20%, Max N1 = 100%
  const targetN1 = state.throttle > 0 ? 20 + state.throttle * 0.8 : 20;
  const spoolRate = 3; // Slower spool rate for realism (was 6)
  newState.engine1N1 = state.engine1Enabled 
    ? state.engine1N1 + (targetN1 - state.engine1N1) * Math.min(1, spoolRate * dt)
    : Math.max(0, state.engine1N1 - dt * 10);
  newState.engine2N1 = state.engine2Enabled 
    ? state.engine2N1 + (targetN1 - state.engine2N1) * Math.min(1, spoolRate * dt)
    : Math.max(0, state.engine2N1 - dt * 10);

  // Thrust calculation - direct from N1 with idle thrust
  // At idle (N1=20%), thrust = 10% of max
  // At max (N1=100%), thrust = 100% of max
  const thrustFromN1 = (n1: number) => {
    if (n1 < 20) return 0;
    const normalizedN1 = (n1 - 20) / 80; // 0 to 1
    return normalizedN1 * MAX_THRUST_PER_ENGINE;
  };
  const n1Thrust1 = state.engine1Enabled ? thrustFromN1(newState.engine1N1) : 0;
  const n1Thrust2 = state.engine2Enabled ? thrustFromN1(newState.engine2N1) : 0;
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
    newState.pitch = Math.max(-5, Math.min(20, state.pitch));
  }

  // Reverse thrust (only on ground, speed > 5 kts)
  let reverseForce = 0;
  if (state.reverseThrust && isOnGround && state.airspeed > 5) {
    const reverseFactor = Math.min(1, state.airspeed / 80);
    reverseForce = totalThrust * REVERSE_THRUST_FACTOR * reverseFactor;
  }

  // IAS to TAS conversion
  const densityRatio = getDensityRatio(state.altitude);
  const tas = state.airspeed / Math.sqrt(Math.max(0.01, densityRatio));
  const velocityFtS = tas * 1.68781; // knots to ft/s

  // Aerodynamic forces
  const airDensity = getAirDensity(state.altitude);
  const cl = getLiftCoefficient(state.pitch, state.flapsAngle, state.airspeed, state.activeScenario);
  const cd = getDragCoefficient(cl, state.flapsAngle, state.gearDown, state.activeScenario);

  // Dynamic pressure: q = 0.5 * ρ * V²
  const dynamicPressure = 0.5 * airDensity * velocityFtS * velocityFtS;
  
  // Lift and drag forces
  const lift = dynamicPressure * WING_AREA * cl;
  const drag = dynamicPressure * WING_AREA * cd;
  const weight = CRUISE_WEIGHT;

  const pitchRad = (state.pitch * Math.PI) / 180;
  const rollRad = (state.roll * Math.PI) / 180;

  // Asymmetric thrust (yaw effect from single engine)
  const enginesActive = (state.engine1Enabled ? 1 : 0) + (state.engine2Enabled ? 1 : 0);
  let yawFromAsymmetry = 0;
  if (enginesActive === 1 && !isOnGround) {
    const thrustDiff = n1Thrust1 - n1Thrust2;
    yawFromAsymmetry = thrustDiff / MAX_THRUST_PER_ENGINE * 2;
  }

  // === HORIZONTAL MOTION (along flight path) ===
  // Forces along flight path: Thrust - Drag - Gravity component - Friction - Reverse
  const thrustAlongPath = totalThrust * Math.cos(pitchRad);
  const gravityAlongPath = weight * Math.sin(pitchRad); // Positive when climbing
  const groundFriction = isOnGround ? weight * 0.01 : 0;
  
  const netForceAlongPath = thrustAlongPath - drag - gravityAlongPath - groundFriction - reverseForce;
  const accelAlongPath = netForceAlongPath / MASS;

  // Update velocity (TAS in ft/s)
  const newTASFtS = Math.max(0, velocityFtS + accelAlongPath * dt);
  const newTAS = newTASFtS / 1.68781; // ft/s to knots
  const newIAS = newTAS * Math.sqrt(Math.max(0.01, densityRatio));
  newState.airspeed = Math.max(0, newIAS);

  // === VERTICAL MOTION ===
  // Calculate vertical forces
  const liftVertical = lift * Math.cos(rollRad) * Math.cos(pitchRad);
  const weightVertical = weight;
  const netForceVertical = liftVertical - weightVertical;
  const accelVertical = netForceVertical / MASS;
  
  if (isOnGround) {
    // On ground: can only take off if lift > weight AND speed > VR (rotation speed)
    // VR for B777-9 is approximately 140-150 knots depending on weight
    const rotationSpeed = 140; // VR - rotation speed
    if (netForceVertical > 0 && state.airspeed > rotationSpeed) {
      // Takeoff! Lift exceeds weight and speed is sufficient
      const vsChange = accelVertical * 60 * dt;
      newState.verticalSpeed = Math.max(0, state.verticalSpeed + vsChange);
      newState.altitude = Math.max(0, state.altitude + (newState.verticalSpeed / 60) * dt);
    } else {
      // Stay on ground
      newState.verticalSpeed = 0;
      newState.altitude = 0;
    }
  } else {
    // In air: normal vertical motion
    const vsChange = accelVertical * 60 * dt;
    newState.verticalSpeed = state.verticalSpeed + vsChange;
    newState.verticalSpeed = newState.verticalSpeed * 0.995; // Damping
    newState.verticalSpeed = Math.max(-6000, Math.min(6000, newState.verticalSpeed));

    const avgVS = (state.verticalSpeed + newState.verticalSpeed) / 2;
    const altitudeChange = (avgVS / 60) * dt;
    newState.altitude = Math.max(0, state.altitude + altitudeChange);

    // Landing
    if (newState.altitude <= 0) {
      newState.altitude = 0;
      newState.verticalSpeed = Math.max(0, newState.verticalSpeed);
    }
  }

  // === HEADING (turn rate from bank angle) ===
  const turnRate = isOnGround ? state.roll * 0.005 : state.roll * 0.03;
  newState.heading = (state.heading + (turnRate + yawFromAsymmetry) * dt + 360) % 360;

  // Ground speed
  const newTAS2 = newState.airspeed / Math.sqrt(Math.max(0.01, densityRatio));
  newState.groundSpeed = newTAS2 * 0.98;

  // Very gentle stability - almost no automatic correction
  if (!isOnGround) {
    if (Math.abs(state.pitch) > 15) {
      newState.pitch = state.pitch * (1 - dt * 0.002);
    }
    if (Math.abs(state.roll) > 30) {
      newState.roll = state.roll * (1 - dt * 0.003);
    }
  }

  // Apply scenario effects
  applyScenarioEffects(state, newState, dt);

  // === CRASH DETECTION ===
  if (!state.crashed) {
    // Crash conditions:
    // 1. Hit ground with excessive vertical speed (>1000 ft/min)
    // 2. Hit ground with excessive pitch (>25° or <-20°)
    // 3. Hit ground with excessive roll (>45°)
    // 4. Overspeed structural failure (>400 kts IAS at low altitude)
    
    const hardLanding = newState.altitude <= 0 && state.verticalSpeed < -1000;
    const noseDive = newState.altitude <= 0 && state.pitch < -20;
    const wingStrike = newState.altitude <= 0 && Math.abs(state.roll) > 45;
    const overspeedFailure = state.airspeed > 400 && state.altitude < 5000;
    
    if (hardLanding) {
      newState.crashed = true;
      newState.crashReason = '硬着陆 - 下降率过大';
    } else if (noseDive) {
      newState.crashed = true;
      newState.crashReason = '俯冲坠毁 - 俯仰角过大';
    } else if (wingStrike) {
      newState.crashed = true;
      newState.crashReason = '翼尖触地 - 滚转角过大';
    } else if (overspeedFailure) {
      newState.crashed = true;
      newState.crashReason = '超速解体 - 空速超过结构限制';
    }
  }

  // If crashed, freeze all motion
  if (newState.crashed) {
    newState.airspeed = 0;
    newState.verticalSpeed = 0;
    newState.groundSpeed = 0;
    newState.altitude = 0;
    newState.engine1N1 = 0;
    newState.engine2N1 = 0;
    newState.throttle = 0;
  }

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
  crashed: false,
  crashReason: '',
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
