'use client';

import { useEffect } from 'react';
import { ControlAction } from '@/lib/types';
import { audioSystem } from '@/lib/audio';

interface UseKeyboardControlsProps {
  dispatch: (action: ControlAction) => void;
  enabled?: boolean;
}

export function useKeyboardControls({ dispatch, enabled = true }: UseKeyboardControlsProps) {
  useEffect(() => {
    if (!enabled) return;

    const initAudio = () => {
      audioSystem.init();
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('click', initAudio);
    };
    window.addEventListener('keydown', initAudio);
    window.addEventListener('click', initAudio);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if focus is on input elements
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      const gameKeys = ['w', 's', 'g', 'p', 't', '1', '2', '[', ']', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];
      if (gameKeys.includes(e.key)) {
        e.preventDefault();
      }

      switch (e.key.toLowerCase()) {
        case 'w':
          dispatch('THROTTLE_UP');
          break;
        case 's':
          dispatch('THROTTLE_DOWN');
          break;
        case 'g':
          dispatch('TOGGLE_GEAR');
          break;
        case 'p':
          dispatch('TOGGLE_AUTOPILOT');
          break;
        case 't':
          dispatch('TOGGLE_AUTOTHROTTLE');
          break;
        case '1':
          dispatch('TOGGLE_ENGINE_1');
          break;
        case '2':
          dispatch('TOGGLE_ENGINE_2');
          break;
        case '[':
          dispatch('FLAPS_UP');
          break;
        case ']':
          dispatch('FLAPS_DOWN');
          break;
        case 'arrowup':
          dispatch('PITCH_UP');
          break;
        case 'arrowdown':
          dispatch('PITCH_DOWN');
          break;
        case 'arrowleft':
          dispatch('ROLL_LEFT');
          break;
        case 'arrowright':
          dispatch('ROLL_RIGHT');
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('click', initAudio);
    };
  }, [dispatch, enabled]);
}
