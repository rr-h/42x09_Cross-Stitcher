import { useEffect, useRef } from 'react';
import { useGameStore } from '../store/storeFunctions';
import { saveRemoteRollingSnapshot } from '../sync/remoteSnapshots';

const SAVE_EVERY_MS = 5 * 60 * 1000;
const IDLE_AFTER_MS = 6 * 60 * 1000;
const TICK_MS = 30 * 1000;

export function useAutosaveSnapshots(): void {
  const progress = useGameStore(s => s.progress);
  const patternId = useGameStore(s => s.progress?.patternId ?? null);
  const lastInteractionAt = useGameStore(s => s.lastInteractionAt);

  const progressRef = useRef(progress);
  const lastInteractionRef = useRef(lastInteractionAt);
  const lastSavedAtRef = useRef(0);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    lastInteractionRef.current = lastInteractionAt;
  }, [lastInteractionAt]);

  useEffect(() => {
    if (!patternId) return;

    let timer: number | null = null;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;

      const p = progressRef.current;
      if (!p) return;

      const now = Date.now();
      const lastAction = lastInteractionRef.current || 0;

      // idle gate: no autosaves if idle > 6 mins
      if (now - lastAction > IDLE_AFTER_MS) return;

      // every 5 minutes while active
      if (now - lastSavedAtRef.current < SAVE_EVERY_MS) return;

      lastSavedAtRef.current = now;
      try {
        await saveRemoteRollingSnapshot(p, now);
      } catch (err) {
        // do not crash the app over autosave
        console.warn('Autosave snapshot failed:', err);
      }
    };

    timer = window.setInterval(() => {
      void tick();
    }, TICK_MS);

    // save when tab is hidden, if user was active recently
    const onVis = () => {
      if (document.visibilityState !== 'hidden') return;
      void tick();
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
      if (timer !== null) window.clearInterval(timer);
    };
  }, [patternId]);
}
