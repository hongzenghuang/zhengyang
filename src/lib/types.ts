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
}

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
  | 'FLAPS_UP'
  | 'FLAPS_DOWN';

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
