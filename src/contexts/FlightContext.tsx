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
  setTargetHeading: (heading: number) => void;
  setTargetAltitude: (altitude: number) => void;
  setTargetAirspeed: (speed: number) => void;
}

const FlightContext = createContext<FlightContextType | undefined>(undefined);

export function FlightProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AircraftState>(initialAircraftState);
  const stateRef = useRef(state);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const lastTimeRef = useRef<number>(Date.now());

  // Update state ref
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  // Physics update loop
  useEffect(() => {
    const update = () => {
      const now = Date.now();
      const deltaTime = (now - lastTimeRef.current) / 1000;
      lastTimeRef.current = now;

      let newState = updateFlightPhysics(stateRef.current, deltaTime);
      newState = applyAutopilot(newState, deltaTime);
      newState = applyAutothrottle(newState, deltaTime);

      setState(newState);

      // Update audio
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
    
    setState(prev => {
      const newState = { ...prev };

      switch (action) {
        case 'THROTTLE_UP':
          newState.throttle = Math.min(100, prev.throttle + 5);
          break;
        case 'THROTTLE_DOWN':
          newState.throttle = Math.max(0, prev.throttle - 5);
          break;
        case 'PITCH_UP':
          newState.pitch = Math.min(15, prev.pitch + 2);
          break;
        case 'PITCH_DOWN':
          newState.pitch = Math.max(-15, prev.pitch - 2);
          break;
        case 'ROLL_LEFT':
          newState.roll = Math.max(-30, prev.roll - 5);
          break;
        case 'ROLL_RIGHT':
          newState.roll = Math.min(30, prev.roll + 5);
          break;
        case 'TOGGLE_GEAR':
          newState.gearDown = !prev.gearDown;
          break;
        case 'TOGGLE_AUTOPILOT':
          newState.autopilotEnabled = !prev.autopilotEnabled;
          break;
        case 'TOGGLE_AUTOTHROTTLE':
          newState.autothrottleEnabled = !prev.autothrottleEnabled;
          break;
        case 'TOGGLE_ENGINE_1':
          newState.engine1Enabled = !prev.engine1Enabled;
          break;
        case 'TOGGLE_ENGINE_2':
          newState.engine2Enabled = !prev.engine2Enabled;
          break;
        case 'FLAPS_UP':
          const flapSteps = [0, 5, 15, 20, 30];
          const currentIdx = flapSteps.indexOf(prev.flapsAngle);
          if (currentIdx > 0) {
            newState.flapsAngle = flapSteps[currentIdx - 1];
          }
          break;
        case 'FLAPS_DOWN':
          const flapStepsDown = [0, 5, 15, 20, 30];
          const currentIdxDown = flapStepsDown.indexOf(prev.flapsAngle);
          if (currentIdxDown < flapStepsDown.length - 1) {
            newState.flapsAngle = flapStepsDown[currentIdxDown + 1];
          }
          break;
      }

      return newState;
    });
  }, []);

  const setTargetHeading = useCallback((heading: number) => {
    setState(prev => ({ ...prev, targetHeading: heading }));
  }, []);

  const setTargetAltitude = useCallback((altitude: number) => {
    setState(prev => ({ ...prev, targetAltitude: altitude }));
  }, []);

  const setTargetAirspeed = useCallback((speed: number) => {
    setState(prev => ({ ...prev, targetAirspeed: speed }));
  }, []);

  return (
    <FlightContext.Provider value={{ state, dispatch, setTargetHeading, setTargetAltitude, setTargetAirspeed }}>
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
