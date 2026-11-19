'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AircraftState, ControlAction } from '@/lib/types';
import { initialAircraftState, updateFlightPhysics } from '@/lib/flight-physics';
import { applyAutopilot } from '@/lib/autopilot';
import { applyAutothrottle } from '@/lib/autothrottle';
import { audioSystem } from '@/lib/audio';

interface FlightContextType {
  state: AircraftState;
  dispatch: (action: ControlAction) => void;
  setThrottle: (value: number) => void;
  setTargetHeading: (heading: number) => void;
  setTargetAltitude: (altitude: number) => void;
  setTargetAirspeed: (speed: number) => void;
  adjustTargetHeading: (delta: number) => void;
  adjustTargetAltitude: (delta: number) => void;
  adjustTargetAirspeed: (delta: number) => void;
}

const FlightContext = createContext<FlightContextType | undefined>(undefined);

export function FlightProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AircraftState>(initialAircraftState);
  const stateRef = useRef(state);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      let newState = updateFlightPhysics(stateRef.current, deltaTime);
      newState = applyAutopilot(newState, deltaTime);
      newState = applyAutothrottle(newState, deltaTime);

      stateRef.current = newState;
      setState(newState);

      audioSystem.updateEngineSound((newState.engine1N1 + newState.engine2N1) / 2);
      audioSystem.updateWindSound(newState.airspeed);

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const dispatch = useCallback((action: ControlAction) => {
    audioSystem.playClick();
    
    // CRITICAL: Update stateRef directly so physics engine sees changes immediately
    const prev = stateRef.current;
    const updates: Partial<AircraftState> = {};

    switch (action) {
      case 'THROTTLE_UP':
        updates.throttle = Math.min(100, prev.throttle + 1);
        break;
      case 'THROTTLE_DOWN':
        updates.throttle = Math.max(0, prev.throttle - 1);
        break;
      case 'PITCH_UP':
        updates.pitch = Math.min(15, prev.pitch + 1);
        break;
      case 'PITCH_DOWN':
        updates.pitch = Math.max(-15, prev.pitch - 1);
        break;
      case 'ROLL_LEFT':
        updates.roll = Math.max(-30, prev.roll - 2);
        break;
      case 'ROLL_RIGHT':
        updates.roll = Math.min(30, prev.roll + 2);
        break;
      case 'TOGGLE_GEAR':
        updates.gearDown = !prev.gearDown;
        break;
      case 'TOGGLE_AUTOPILOT':
        updates.autopilotEnabled = !prev.autopilotEnabled;
        if (!prev.autopilotEnabled) {
          updates.targetHeading = Math.round(prev.heading);
          updates.targetAltitude = Math.round(prev.altitude / 100) * 100;
          updates.targetAirspeed = Math.round(prev.airspeed);
        }
        break;
      case 'TOGGLE_AUTOTHROTTLE':
        updates.autothrottleEnabled = !prev.autothrottleEnabled;
        if (!prev.autothrottleEnabled) {
          updates.targetAirspeed = Math.round(prev.airspeed);
        }
        break;
      case 'TOGGLE_ENGINE_1':
        updates.engine1Enabled = !prev.engine1Enabled;
        break;
      case 'TOGGLE_ENGINE_2':
        updates.engine2Enabled = !prev.engine2Enabled;
        break;
      case 'TOGGLE_REVERSE_THRUST':
        // Only allow reverse thrust on ground with throttle at idle
        if (prev.altitude <= 0 && prev.gearDown) {
          updates.reverseThrust = !prev.reverseThrust;
          if (!prev.reverseThrust) {
            // Engaging reverse: force throttle to 0
            updates.throttle = 0;
          }
        }
        break;
      case 'FLAPS_UP': {
        const flapSteps = [0, 1, 5, 15, 20, 25, 30];
        const currentIdx = flapSteps.indexOf(prev.flapsAngle);
        if (currentIdx > 0) {
          updates.flapsAngle = flapSteps[currentIdx - 1];
        }
        break;
      }
      case 'FLAPS_DOWN': {
        const flapStepsDown = [0, 1, 5, 15, 20, 25, 30];
        const currentIdxDown = flapStepsDown.indexOf(prev.flapsAngle);
        if (currentIdxDown < flapStepsDown.length - 1) {
          updates.flapsAngle = flapStepsDown[currentIdxDown + 1];
        }
        break;
      }
    }

    // Apply updates to both stateRef and React state
    stateRef.current = { ...prev, ...updates };
    setState(s => ({ ...s, ...updates }));
  }, []);

  // Direct throttle setter for slider
  const setThrottle = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    stateRef.current = { ...stateRef.current, throttle: clamped };
    setState(prev => ({ ...prev, throttle: clamped }));
  }, []);

  const setTargetHeading = useCallback((heading: number) => {
    setState(prev => ({ ...prev, targetHeading: ((heading % 360) + 360) % 360 }));
  }, []);

  const setTargetAltitude = useCallback((altitude: number) => {
    setState(prev => ({ ...prev, targetAltitude: Math.max(0, Math.min(45000, altitude)) }));
  }, []);

  const setTargetAirspeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, targetAirspeed: Math.max(100, Math.min(350, speed)) }));
  }, []);

  const adjustTargetHeading = useCallback((delta: number) => {
    setState(prev => ({ ...prev, targetHeading: (((prev.targetHeading + delta) % 360) + 360) % 360 }));
  }, []);

  const adjustTargetAltitude = useCallback((delta: number) => {
    setState(prev => ({ ...prev, targetAltitude: Math.max(0, Math.min(45000, prev.targetAltitude + delta)) }));
  }, []);

  const adjustTargetAirspeed = useCallback((delta: number) => {
    setState(prev => ({ ...prev, targetAirspeed: Math.max(100, Math.min(350, prev.targetAirspeed + delta)) }));
  }, []);

  return (
    <FlightContext.Provider value={{ 
      state, 
      dispatch, 
      setThrottle,
      setTargetHeading, 
      setTargetAltitude, 
      setTargetAirspeed,
      adjustTargetHeading,
      adjustTargetAltitude,
      adjustTargetAirspeed
    }}>
      {children}
    </FlightContext.Provider>
  );
}

export function useFlight() {
  const context = useContext(FlightContext);
  if (!context) {
    throw new Error('useFlight must be used within FlightProvider');
  }
  return context;
}
