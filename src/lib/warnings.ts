import { AircraftState } from './types';

// Warning types
export type WarningLevel = 'advisory' | 'caution' | 'warning';

export interface Alert {
  id: string;
  level: WarningLevel;
  message: string;
  audio?: string; // Audio file or TTS text
  active: boolean;
  timestamp: number;
}

// EGPWS (Enhanced Ground Proximity Warning System) calls
const EGPWS_CALLS = {
  SINK_RATE: 'Sink rate',
  PULL_UP: 'Pull up',
  TERRAIN: 'Terrain, terrain',
  TOO_LOW_TERRAIN: 'Too low, terrain',
  TOO_LOW_GEAR: 'Too low, gear',
  TOO_LOW_FLAPS: 'Too low, flaps',
  DONT_SINK: "Don't sink",
  GLIDESLOPE: 'Glideslope',
};

// Calculate alerts based on aircraft state
export function calculateAlerts(state: AircraftState): Alert[] {
  const alerts: Alert[] = [];
  const now = Date.now();

  // STALL WARNING - airspeed too low (only when airborne and above 50ft)
  // Don't trigger during takeoff roll or initial climb
  const stallSpeed = 110 + state.flapsAngle * 1.2;
  const isAirborne = state.altitude > 50;
  const isClimbingOut = state.altitude > 0 && state.altitude < 400 && state.verticalSpeed > 500;
  
  if (state.airspeed < stallSpeed + 10 && isAirborne && !isClimbingOut) {
    alerts.push({
      id: 'STALL',
      level: 'warning',
      message: 'STALL',
      audio: 'Stall, stall',
      active: true,
      timestamp: now,
    });
  }

  // OVERSPEED WARNING - airspeed too high
  const maxSpeed = 350;
  if (state.airspeed > maxSpeed) {
    alerts.push({
      id: 'OVERSPEED',
      level: 'warning',
      message: 'OVERSPEED',
      audio: 'Overspeed, overspeed',
      active: true,
      timestamp: now,
    });
  }

  // SINK RATE - descending too fast
  if (state.verticalSpeed < -2000 && state.altitude > 500) {
    alerts.push({
      id: 'SINK_RATE',
      level: 'warning',
      message: 'SINK RATE',
      audio: EGPWS_CALLS.SINK_RATE,
      active: true,
      timestamp: now,
    });
  }

  // PULL UP - terrain proximity (simplified)
  if (state.verticalSpeed < -3000 && state.altitude < 1000) {
    alerts.push({
      id: 'PULL_UP',
      level: 'warning',
      message: 'PULL UP',
      audio: EGPWS_CALLS.PULL_UP,
      active: true,
      timestamp: now,
    });
  }

  // TERRAIN - low altitude with descent
  if (state.altitude < 500 && state.verticalSpeed < -500 && state.altitude > 0) {
    alerts.push({
      id: 'TERRAIN',
      level: 'caution',
      message: 'TERRAIN',
      audio: EGPWS_CALLS.TERRAIN,
      active: true,
      timestamp: now,
    });
  }

  // TOO LOW GEAR - low altitude, gear up
  if (state.altitude < 800 && state.altitude > 100 && !state.gearDown && state.verticalSpeed < -200) {
    alerts.push({
      id: 'TOO_LOW_GEAR',
      level: 'caution',
      message: 'TOO LOW - GEAR',
      audio: EGPWS_CALLS.TOO_LOW_GEAR,
      active: true,
      timestamp: now,
    });
  }

  // TOO LOW FLAPS - low altitude, flaps up
  if (state.altitude < 600 && state.altitude > 100 && state.flapsAngle < 15 && state.verticalSpeed < -200) {
    alerts.push({
      id: 'TOO_LOW_FLAPS',
      level: 'caution',
      message: 'TOO LOW - FLAPS',
      audio: EGPWS_CALLS.TOO_LOW_FLAPS,
      active: true,
      timestamp: now,
    });
  }

  // DON'T SINK - climbing then descending at low altitude
  if (state.altitude < 1000 && state.altitude > 100 && state.verticalSpeed < -500) {
    alerts.push({
      id: 'DONT_SINK',
      level: 'caution',
      message: "DON'T SINK",
      audio: EGPWS_CALLS.DONT_SINK,
      active: true,
      timestamp: now,
    });
  }

  // ENGINE FAILURE
  if (!state.engine1Enabled || !state.engine2Enabled) {
    const failedEngine = !state.engine1Enabled ? '1' : '2';
    alerts.push({
      id: 'ENGINE_FAIL',
      level: 'warning',
      message: `ENG ${failedEngine} FAIL`,
      audio: `Engine ${failedEngine} failure`,
      active: true,
      timestamp: now,
    });
  }

  // ALTITUDE DEVIATION - off target altitude by more than 300ft
  if (state.autopilotEnabled) {
    const altDev = Math.abs(state.altitude - state.targetAltitude);
    if (altDev > 300) {
      alerts.push({
        id: 'ALT_DEV',
        level: 'advisory',
        message: 'ALT DEVIATION',
        active: true,
        timestamp: now,
      });
    }
  }

  // BANK ANGLE - excessive bank
  if (Math.abs(state.roll) > 35 && state.altitude > 0) {
    alerts.push({
      id: 'BANK_ANGLE',
      level: 'caution',
      message: 'BANK ANGLE',
      audio: 'Bank angle, bank angle',
      active: true,
      timestamp: now,
    });
  }

  return alerts;
}

// Check if master caution should be active
export function hasMasterCaution(alerts: Alert[]): boolean {
  return alerts.some(a => a.level === 'caution' || a.level === 'warning');
}

// Check if master warning should be active
export function hasMasterWarning(alerts: Alert[]): boolean {
  return alerts.some(a => a.level === 'warning');
}

// Get highest priority alert for audio
export function getPriorityAlert(alerts: Alert[]): Alert | null {
  const warnings = alerts.filter(a => a.level === 'warning');
  if (warnings.length > 0) {
    // Priority order
    const priority = ['PULL_UP', 'STALL', 'TERRAIN', 'SINK_RATE', 'OVERSPEED', 'ENGINE_FAIL'];
    for (const id of priority) {
      const alert = warnings.find(a => a.id === id);
      if (alert) return alert;
    }
    return warnings[0];
  }
  return null;
}
