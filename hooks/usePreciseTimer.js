import { useState, useRef, useEffect, useCallback } from 'react';
import { Platform } from 'react-native';

/**
 * Precise timer hook for breathing exercises using requestAnimationFrame (60fps)
 * Handles phases, pause/resume, countdown, drift correction
 */
export const usePreciseTimer = (initialPhases = [], options = {}) => {
  const {
    onPhaseChange,
    onCycleComplete,
    onSessionComplete,
    hapticsEnabled = true,
    toleranceMs = 100, // Phase advance tolerance
  } = options;

  const [isActive, setIsActive] = useState(false);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const [remainingMs, setRemainingMs] = useState(0);

  const rafRef = useRef(null);
  const phaseEndTimeRef = useRef(0);
  const sessionStartTimeRef = useRef(0);
  const pausedDurationRef = useRef(0);
  const pauseStartTimeRef = useRef(0);
  const phasesRef = useRef(initialPhases);
  const targetCyclesRef = useRef(null);
  const animationFrameRef = useRef(0);

  // Update phases/target (safe for mid-session changes)
  const setPhases = useCallback((newPhases, targetCycles = null) => {
    phasesRef.current = newPhases.map(p => p.duration);
    targetCyclesRef.current = targetCycles;
  }, []);

  const vibrate = useCallback((duration = 50) => {
    if (hapticsEnabled && Platform.OS === 'android') {
      // Vibration.vibrate(duration); // Add if safeHaptics imported
    }
  }, [hapticsEnabled]);

  const clearRaf = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const startPhase = useCallback((phaseIdx) => {
    const now = performance.now();
    const duration = phasesRef.current[phaseIdx];
    if (!duration) return;

    phaseEndTimeRef.current = now + duration;
    setCurrentPhase(phaseIdx);
    setRemainingMs(duration);

    // Phase start haptic/instructions
    vibrate(80);
    onPhaseChange?.(phasesRef.current[phaseIdx]?.name || `Phase ${phaseIdx}`, duration);
  }, [onPhaseChange, vibrate]);

  const togglePlayPause = useCallback(() => {
    if (isActive) {
      // PAUSE
      if (Platform.OS === 'web') {
        pauseStartTimeRef.current = performance.now();
      } else {
        pauseStartTimeRef.current = Date.now();
      }
      setIsActive(false);
      clearRaf();
    } else {
      // RESUME
      const pauseDuration = (Platform.OS === 'web' ? performance.now() : Date.now()) - pauseStartTimeRef.current;
      pausedDurationRef.current += pauseDuration;
      phaseEndTimeRef.current += pauseDuration;
      pauseStartTimeRef.current = 0;
      setIsActive(true);
    }
  }, [isActive, clearRaf]);

  const reset = useCallback(() => {
    clearRaf();
    setIsActive(false);
    setCurrentPhase(0);
    setCycleCount(0);
    setSessionDuration(0);
    setRemainingMs(0);
    phaseEndTimeRef.current = 0;
    pausedDurationRef.current = 0;
    pauseStartTimeRef.current = 0;
    sessionStartTimeRef.current = 0;
  }, [clearRaf]);

  // Main RAF loop
  const tick = useCallback(() => {
    if (!isActive) return;

    const now = Platform.OS === 'web' ? performance.now() : Date.now();
    const elapsedSession = now - sessionStartTimeRef.current - pausedDurationRef.current;
    const remaining = Math.max(0, phaseEndTimeRef.current - now + pausedDurationRef.current);

    setSessionDuration(Math.floor(elapsedSession / 1000));
    setRemainingMs(remaining);

    // Verbal countdown
    if (remaining <= 3000) {
      const count = Math.ceil(remaining / 1000);
      // setInstructions(`${count}...`);
    }

    // Phase advance
    if (remaining <= toleranceMs) {
      const nextPhase = (currentPhase + 1) % phasesRef.current.length;

      if (nextPhase === 0) {
        // Cycle complete
        const newCycleCount = cycleCount + 1;
        setCycleCount(newCycleCount);
        onCycleComplete?.(newCycleCount);

        if (targetCyclesRef.current && newCycleCount >= targetCyclesRef.current) {
          setIsActive(false);
          onSessionComplete?.(newCycleCount, Math.floor(elapsedSession / 1000));
          clearRaf();
          return;
        }
      }

      startPhase(nextPhase);
    }

    animationFrameRef.current = requestAnimationFrame(tick);
    rafRef.current = animationFrameRef.current;
  }, [isActive, currentPhase, cycleCount, toleranceMs, onCycleComplete, onSessionComplete, startPhase]);

  // Start session
  const start = useCallback((newPhases = null, targetCycles = null) => {
    if (newPhases) {
      phasesRef.current = newPhases.map(p => p.duration);
      targetCyclesRef.current = targetCycles;
    }

    const now = Platform.OS === 'web' ? performance.now() : Date.now();
    sessionStartTimeRef.current = now;
    pausedDurationRef.current = 0;
    startPhase(0);
    setIsActive(true);
  }, [startPhase]);

  // Effects
  useEffect(() => {
    if (isActive) {
      animationFrameRef.current = requestAnimationFrame(tick);
      rafRef.current = animationFrameRef.current;
    }

    return () => {
      clearRaf();
    };
  }, [isActive, tick, clearRaf]);

  return {
    isActive,
    currentPhase,
    cycleCount,
    sessionDuration,
    remainingMs,
    phases: phasesRef.current,
    togglePlayPause,
    start,
    reset,
    setPhases,
  };
};

export default usePreciseTimer;

