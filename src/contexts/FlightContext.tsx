'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { AircraftState, ControlAction, FlightScenario } from '@/lib/types';
import { initialAircraftState, updateFlightPhysics, getScenarioInitialState, takeoffReadyState } from '@/lib/flight-physics';
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
  setScenario: (scenario: FlightScenario) => void;
}

const FlightContext = createContext<FlightContextType | undefined>(undefined);

export function FlightProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AircraftState>(initialAircraftState);
  const stateRef = useRef(state);
  const pendingUpdatesRef = useRef<Partial<AircraftState>>({});
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(Date.now());

  // Check if coming from tutorial - set takeoff state
  useEffect(() => {
    if (typeof window !== 'undefined' && sessionStorage.getItem('startTakeoff') === 'true') {
      sessionStorage.removeItem('startTakeoff');
      stateRef.current = takeoffReadyState;
      setState(takeoffReadyState);
      lastTimeRef.current = Date.now();
    }
  }, []);

  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      // Apply pending updates from keyboard/UI
      if (Object.keys(pendingUpdatesRef.current).length > 0) {
        stateRef.current = { ...stateRef.current, ...pendingUpdatesRef.current };
        pendingUpdatesRef.current = {};
      }

      let newState = stateRef.current;
      
      // Only update physics if not crashed
      if (!stateRef.current.crashed) {
        newState = updateFlightPhysics(stateRef.current, deltaTime);
        newState = applyAutopilot(newState, deltaTime);
        newState = applyAutothrottle(newState, deltaTime);
      }

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
    
    const prev = stateRef.current;
    const updates: Partial<AircraftState> = {};

    switch (action) {
      case 'THROTTLE_UP':
        updates.throttle = Math.min(100, prev.throttle + 2);
        break;
      case 'THROTTLE_DOWN':
        updates.throttle = Math.max(0, prev.throttle - 2);
        break;
      case 'PITCH_UP':
        updates.pitch = Math.min(25, prev.pitch + 3);
        break;
      case 'PITCH_DOWN':
        updates.pitch = Math.max(-15, prev.pitch - 3);
        break;
      case 'ROLL_LEFT':
        updates.roll = Math.max(-60, prev.roll - 5);
        break;
      case 'ROLL_RIGHT':
        updates.roll = Math.min(60, prev.roll + 5);
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
        if (prev.altitude <= 0 && prev.gearDown) {
          updates.reverseThrust = !prev.reverseThrust;
          if (!prev.reverseThrust) {
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
      case 'SET_SCENARIO':
        break;
      case 'RESET':
        // Reset to initial state
        stateRef.current = initialAircraftState;
        setState(initialAircraftState);
        lastTimeRef.current = Date.now();
        return;
    }

    // Queue updates to be applied in next animation frame
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates };
  }, []);

  const setThrottle = useCallback((value: number) => {
    const clamped = Math.max(0, Math.min(100, value));
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, throttle: clamped };
  }, []);

  const setTargetHeading = useCallback((heading: number) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, targetHeading: ((heading % 360) + 360) % 360 };
  }, []);

  const setTargetAltitude = useCallback((altitude: number) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, targetAltitude: Math.max(0, Math.min(45000, altitude)) };
  }, []);

  const setTargetAirspeed = useCallback((speed: number) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, targetAirspeed: Math.max(100, Math.min(350, speed)) };
  }, []);

  const adjustTargetHeading = useCallback((delta: number) => {
    const current = stateRef.current.targetHeading;
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, targetHeading: (((current + delta) % 360) + 360) % 360 };
  }, []);

  const adjustTargetAltitude = useCallback((delta: number) => {
    const current = stateRef.current.targetAltitude;
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, targetAltitude: Math.max(0, Math.min(45000, current + delta)) };
  }, []);

  const adjustTargetAirspeed = useCallback((delta: number) => {
    const current = stateRef.current.targetAirspeed;
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, targetAirspeed: Math.max(100, Math.min(350, current + delta)) };
  }, []);

  const setScenario = useCallback((scenario: FlightScenario) => {
    const newState = getScenarioInitialState(scenario);
    stateRef.current = newState;
    setState(newState);
    lastTimeRef.current = Date.now();
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
      adjustTargetAirspeed,
      setScenario,
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
