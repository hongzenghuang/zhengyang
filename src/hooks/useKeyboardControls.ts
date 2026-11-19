'use client';

import { useEffect, useRef } from 'react';
import { ControlAction } from '@/lib/types';
import { audioSystem } from '@/lib/audio';

interface UseKeyboardControlsProps {
  dispatch: (action: ControlAction) => void;
  enabled?: boolean;
}

// Toggle actions that should only trigger once per keypress (not on repeat)
const TOGGLE_ACTIONS = new Set([
  'TOGGLE_GEAR',
  'TOGGLE_AUTOPILOT', 
  'TOGGLE_AUTOTHROTTLE',
  'TOGGLE_ENGINE_1',
  'TOGGLE_ENGINE_2',
  'FLAPS_UP',
  'FLAPS_DOWN'
]);

export function useKeyboardControls({ dispatch, enabled = true }: UseKeyboardControlsProps) {
  const lastToggleRef = useRef<Record<string, number>>({});

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
      const key = e.key;
      const keyLower = key.toLowerCase();
      
      if (gameKeys.includes(key) || gameKeys.map(k => k.toLowerCase()).includes(keyLower)) {
        e.preventDefault();
      }

      let action: ControlAction | null = null;

      // Handle both lowercase and special keys
      if (keyLower === 'w') action = 'THROTTLE_UP';
      else if (keyLower === 's') action = 'THROTTLE_DOWN';
      else if (keyLower === 'g') action = 'TOGGLE_GEAR';
      else if (keyLower === 'p') action = 'TOGGLE_AUTOPILOT';
      else if (keyLower === 't') action = 'TOGGLE_AUTOTHROTTLE';
      else if (key === '1') action = 'TOGGLE_ENGINE_1';
      else if (key === '2') action = 'TOGGLE_ENGINE_2';
      else if (key === '[') action = 'FLAPS_UP';
      else if (key === ']') action = 'FLAPS_DOWN';
      else if (key === 'ArrowUp') action = 'PITCH_UP';
      else if (key === 'ArrowDown') action = 'PITCH_DOWN';
      else if (key === 'ArrowLeft') action = 'ROLL_LEFT';
      else if (key === 'ArrowRight') action = 'ROLL_RIGHT';

      if (!action) return;

      // For toggle actions, prevent rapid repeat (debounce)
      if (TOGGLE_ACTIONS.has(action)) {
        if (e.repeat) return; // Skip if key is held down
        
        const now = Date.now();
        const lastTime = lastToggleRef.current[action] || 0;
        if (now - lastTime < 300) return; // 300ms debounce
        lastToggleRef.current[action] = now;
      }

      dispatch(action);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', initAudio);
      window.removeEventListener('click', initAudio);
    };
  }, [dispatch, enabled]);
}
