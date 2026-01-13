import { useCallback, useEffect, useRef } from 'react';
import { useGameStore } from '../store/storeFunctions';
import { saveRemoteRollingSnapshot } from '../sync/remoteSnapshots';
import type { UserProgress } from '../types';

/** Interval between autosave attempts when active and healthy */
const SAVE_EVERY_MS = 5 * 60 * 1000; // 5 minutes

/** User considered idle after this period of inactivity */
const IDLE_AFTER_MS = 6 * 60 * 1000; // 6 minutes

/** How often to check if a save is needed */
const TICK_MS = 30 * 1000; // 30 seconds

/** Base delay for first retry after failure */
const RETRY_BASE_MS = 15 * 1000; // 15 seconds

/** Maximum retry delay cap */
const RETRY_MAX_MS = 2 * 60 * 1000; // 2 minutes

/** Quick retry delay when coming back online */
const ONLINE_RETRY_MS = 5 * 1000; // 5 seconds

const isDev = import.meta.env.DEV;

function log(...args: unknown[]): void {
  if (isDev) {
    console.log('[Autosave]', ...args);
  }
}

function warn(...args: unknown[]): void {
  if (isDev) {
    console.warn('[Autosave]', ...args);
  }
}

/**
 * Autosave state machine per pattern.
 * Tracks save timing, retry backoff, concurrency, and online/offline status.
 */
interface AutosaveState {
  /** Timestamp of last successful save (remote + local) */
  lastSavedAt: number;
  /** Timestamp of last save attempt (success or failure) */
  lastAttemptAt: number;
  /** Number of consecutive failures (resets on success) */
  failureCount: number;
  /** True if a save operation is currently in flight */
  inFlight: boolean;
  /** True if a save was requested while one was in flight */
  pendingSaveRequested: boolean;
  /** Scheduled retry timer ID */
  retryTimerId: number | null;
}

function createInitialAutosaveState(): AutosaveState {
  return {
    lastSavedAt: 0,
    lastAttemptAt: 0,
    failureCount: 0,
    inFlight: false,
    pendingSaveRequested: false,
    retryTimerId: null,
  };
}

/**
 * Calculate retry delay with exponential backoff.
 * delay = RETRY_BASE_MS * 2^(failureCount - 1), capped at RETRY_MAX_MS.
 */
function calculateRetryDelay(failureCount: number): number {
  if (failureCount <= 0) return RETRY_BASE_MS;
  const delay = RETRY_BASE_MS * Math.pow(2, failureCount - 1);
  return Math.min(delay, RETRY_MAX_MS);
}

/**
 * Hook that provides automatic rolling snapshot saving with:
 * - lastSavedAt only updated on successful saves
 * - Exponential backoff retry on failures
 * - No overlapping save attempts (coalesced pending saves)
 * - Respects idle window (no saves if inactive > 6 min)
 * - Handles online/offline transitions gracefully
 */
export function useAutosaveSnapshots(): void {
  const progress = useGameStore(s => s.progress);
  const patternId = useGameStore(s => s.progress?.patternId ?? null);
  const lastInteractionAt = useGameStore(s => s.lastInteractionAt);

  // Use refs to access latest values in async callbacks without stale closures
  const progressRef = useRef<UserProgress | null>(progress);
  const lastInteractionRef = useRef(lastInteractionAt);

  // Autosave state machine (per hook instance, tied to current patternId)
  const stateRef = useRef<AutosaveState>(createInitialAutosaveState());

  // Online status tracking
  const isOnlineRef = useRef(typeof window !== 'undefined' ? window.navigator.onLine : true);

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    lastInteractionRef.current = lastInteractionAt;
  }, [lastInteractionAt]);

  /**
   * Clear any scheduled retry timer.
   */
  const clearRetryTimer = useCallback(() => {
    const state = stateRef.current;
    if (state.retryTimerId !== null) {
      window.clearTimeout(state.retryTimerId);
      state.retryTimerId = null;
    }
  }, []);

  /**
   * Check if user is considered "active" (interacted within IDLE_AFTER_MS).
   */
  const isUserActive = useCallback((): boolean => {
    const lastAction = lastInteractionRef.current || 0;
    return Date.now() - lastAction <= IDLE_AFTER_MS;
  }, []);

  /**
   * Schedule a retry after the given delay, respecting activity rules.
   */
  const scheduleRetry = useCallback(
    (delayMs: number, attemptSave: () => Promise<void>) => {
      const state = stateRef.current;
      clearRetryTimer();

      state.retryTimerId = window.setTimeout(() => {
        state.retryTimerId = null;

        // Only retry if user is still considered active
        if (isUserActive()) {
          log('Retry timer fired, attempting save');
          void attemptSave();
        } else {
          log('Retry timer fired but user is idle, skipping');
        }
      }, delayMs);

      log(`Scheduled retry in ${Math.round(delayMs / 1000)}s`);
    },
    [clearRetryTimer, isUserActive]
  );

  /**
   * Perform the actual save operation with proper state management.
   * - Guards against concurrent saves
   * - Updates timestamps appropriately
   * - Handles failures with backoff retry
   */
  const performSave = useCallback(async (): Promise<void> => {
    const state = stateRef.current;
    const p = progressRef.current;

    // No progress to save
    if (!p) {
      log('No progress to save');
      return;
    }

    // Guard: only one save at a time
    if (state.inFlight) {
      log('Save already in flight, marking pending');
      state.pendingSaveRequested = true;
      return;
    }

    // Guard: respect idle window
    if (!isUserActive()) {
      log('User is idle, skipping save');
      return;
    }

    // Guard: if offline, don't attempt (wait for online event)
    if (!isOnlineRef.current) {
      log('Offline, skipping save attempt');
      return;
    }

    const now = Date.now();
    state.inFlight = true;
    state.lastAttemptAt = now;
    clearRetryTimer();

    log('Starting save attempt...');

    try {
      await saveRemoteRollingSnapshot(p, now);

      // SUCCESS: update lastSavedAt and reset failure count
      state.lastSavedAt = now;
      state.failureCount = 0;
      state.pendingSaveRequested = false;

      log('Save successful, lastSavedAt updated');
    } catch (err) {
      // FAILURE: do NOT update lastSavedAt, increment failure count
      state.failureCount++;
      warn(`Save failed (attempt #${state.failureCount}):`, err);

      // Schedule retry with backoff, if still active
      if (isUserActive() && isOnlineRef.current) {
        const delay = calculateRetryDelay(state.failureCount);
        scheduleRetry(delay, performSave);
      }
    } finally {
      state.inFlight = false;
    }

    // Process pending save request if any
    if (state.pendingSaveRequested && isUserActive()) {
      const timeSinceLastSave = Date.now() - state.lastSavedAt;

      // Only immediately re-save if enough time has passed since last success
      if (timeSinceLastSave >= SAVE_EVERY_MS) {
        log('Processing pending save request');
        state.pendingSaveRequested = false;
        void performSave();
      } else {
        // Clear pending flag - the regular tick will handle it
        state.pendingSaveRequested = false;
      }
    }
  }, [clearRetryTimer, isUserActive, scheduleRetry]);

  /**
   * Periodic tick to check if a save is needed.
   */
  const tick = useCallback(async (): Promise<void> => {
    const state = stateRef.current;
    const p = progressRef.current;

    if (!p) return;

    // Don't interfere if a save is in flight
    if (state.inFlight) return;

    // Don't save if idle
    if (!isUserActive()) return;

    const now = Date.now();
    const timeSinceLastSave = now - state.lastSavedAt;

    // Check if it's time for a regular save
    if (timeSinceLastSave >= SAVE_EVERY_MS) {
      log(`${Math.round(timeSinceLastSave / 1000)}s since last save, attempting save`);
      await performSave();
    }
  }, [isUserActive, performSave]);

  useEffect(() => {
    if (!patternId) return;

    // Reset state when pattern changes
    stateRef.current = createInitialAutosaveState();

    let tickTimer: number | null = null;
    let cancelled = false;

    // Set up periodic tick
    tickTimer = window.setInterval(() => {
      if (!cancelled) {
        void tick();
      }
    }, TICK_MS);

    // Handle visibility change (save when tab is hidden if active)
    const onVisibilityChange = (): void => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden' && isUserActive()) {
        log('Tab hidden, attempting save');
        void performSave();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Handle online/offline transitions
    const onOnline = (): void => {
      if (cancelled) return;
      isOnlineRef.current = true;
      log('Back online');

      const state = stateRef.current;

      // If we had failures while offline and user is active, retry quickly
      if (state.failureCount > 0 && isUserActive()) {
        log('Retrying after coming online');
        scheduleRetry(ONLINE_RETRY_MS, performSave);
      } else if (isUserActive()) {
        // Check if a regular save is due
        const timeSinceLastSave = Date.now() - state.lastSavedAt;
        if (timeSinceLastSave >= SAVE_EVERY_MS) {
          scheduleRetry(ONLINE_RETRY_MS, performSave);
        }
      }
    };

    const onOffline = (): void => {
      if (cancelled) return;
      isOnlineRef.current = false;
      log('Gone offline, pausing remote saves');

      // Clear any pending retry - we'll handle it on online event
      clearRetryTimer();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    // Cleanup
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);

      if (tickTimer !== null) {
        window.clearInterval(tickTimer);
      }
      clearRetryTimer();
    };
  }, [patternId, tick, performSave, isUserActive, scheduleRetry, clearRetryTimer]);
}
