// Aircraft state interface
export interface AircraftState {
  // Position and attitude
  altitude: number;        // Altitude in feet
  pitch: number;           // Pitch angle in degrees (positive = nose up)
  roll: number;            // Roll angle in degrees (positive = right roll)
  heading: number;         // Heading in degrees (0-360)
  
  // Speed
  airspeed: number;        // Indicated airspeed in knots
  verticalSpeed: number;   // Vertical speed in ft/min (positive = climbing)
  groundSpeed: number;     // Ground speed in knots
  
  // Engines
  engine1N1: number;       // Left engine N1 (%)
  engine2N1: number;       // Right engine N1 (%)
  engine1Enabled: boolean;
  engine2Enabled: boolean;
  throttle: number;        // Throttle position (0-100%)
  reverseThrust: boolean;  // Reverse thrust engaged (ground only)
  
  // Systems
  gearDown: boolean;       // Landing gear status
  flapsAngle: number;      // Flaps angle (0, 5, 15, 20, 30)
  
  // Autopilot
  autopilotEnabled: boolean;
  autothrottleEnabled: boolean;
  targetHeading: number;   // Target heading (0-360)
  targetAltitude: number;  // Target altitude in feet
  targetAirspeed: number;  // Target airspeed in knots
  verticalSpeedTarget: number; // Target vertical speed in ft/min

  // Scenario
  activeScenario: FlightScenario;
  scenarioTimer: number;   // Seconds since scenario started
  scenarioMessage: string; // Alert message for current scenario

  // Crash state
  crashed: boolean;        // Aircraft has crashed
  crashReason: string;     // Reason for crash
}

// Flight scenarios
export type FlightScenario = 
  | 'normal'
  | 'engine_failure'
  | 'stall'
  | 'wind_shear'
  | 'bird_strike'
  | 'icing';

export interface ScenarioInfo {
  id: FlightScenario;
  name: string;
  description: string;
  icon: string;
}

export const SCENARIOS: ScenarioInfo[] = [
  { id: 'normal', name: '正常飞行', description: '标准起飞和巡航', icon: '✈' },
  { id: 'engine_failure', name: '引擎故障', description: '起飞后单引擎失效', icon: '⚠' },
  { id: 'stall', name: '失速改出', description: '高空低速失速状态', icon: '↻' },
  { id: 'wind_shear', name: '风切变', description: '进近时遭遇风切变', icon: '🌪' },
  { id: 'bird_strike', name: '鸟击', description: '起飞阶段鸟击引擎', icon: '🐦' },
  { id: 'icing', name: '结冰条件', description: '机翼结冰影响升力', icon: '❄' },
];

// Control input types
export type ControlAction = 
  | 'THROTTLE_UP'
  | 'THROTTLE_DOWN'
  | 'PITCH_UP'
  | 'PITCH_DOWN'
  | 'ROLL_LEFT'
  | 'ROLL_RIGHT'
  | 'TOGGLE_GEAR'
  | 'TOGGLE_AUTOPILOT'
  | 'TOGGLE_AUTOTHROTTLE'
  | 'TOGGLE_ENGINE_1'
  | 'TOGGLE_ENGINE_2'
  | 'TOGGLE_REVERSE_THRUST'
  | 'FLAPS_UP'
  | 'FLAPS_DOWN'
  | 'SET_SCENARIO'
  | 'RESET';

// Tutorial step
export interface TutorialStep {
  id: number;
  title: string;
  description: string;
  keys: string[];
  action?: ControlAction;
}

// Key mapping
export interface KeyMapping {
  key: string;
  action: ControlAction;
  label: string;
}
