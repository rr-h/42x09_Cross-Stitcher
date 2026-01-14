import { useCallback, useEffect, useRef, useState } from 'react';
import { syncAllPatterns } from '../sync/patternSync';
import type { SyncStatus } from '../types/sync.types';
import { useAuth } from './useAuth';

/** Interval between autosync attempts when active */
const SYNC_EVERY_MS = 5 * 60 * 1000; // 5 minutes

/** User considered idle after this period of inactivity */
const IDLE_AFTER_MS = 6 * 60 * 1000; // 6 minutes

/** How often to check if a sync is needed */
const TICK_MS = 30 * 1000; // 30 seconds

/** Base delay for first retry after failure */
const RETRY_BASE_MS = 15 * 1000; // 15 seconds

/** Maximum retry delay cap */
const RETRY_MAX_MS = 2 * 60 * 1000; // 2 minutes

/** Quick retry delay when coming back online */
const ONLINE_RETRY_MS = 5 * 1000; // 5 seconds

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const isDev = (import.meta as any).env.DEV;

function log(...args: unknown[]): void {
  if (isDev) {
    console.log('[PatternSync]', ...args);
  }
}

function warn(...args: unknown[]): void {
  if (isDev) {
    console.warn('[PatternSync]', ...args);
  }
}

/**
 * Sync state machine.
 * Tracks sync timing, retry backoff, and online/offline status.
 */
interface SyncState {
  /** Timestamp of last successful sync */
  lastSyncedAt: number | null;
  /** Timestamp of last sync attempt (success or failure) */
  lastAttemptAt: number;
  /** Number of consecutive failures (resets on success) */
  failureCount: number;
  /** True if a sync operation is currently in flight */
  inFlight: boolean;
  /** True if a sync was requested while one was in flight */
  pendingSyncRequested: boolean;
  /** Scheduled retry timer ID */
  retryTimerId: number | null;
  /** Last error message */
  lastError: string | null;
}

function createInitialSyncState(): SyncState {
  return {
    lastSyncedAt: null,
    lastAttemptAt: 0,
    failureCount: 0,
    inFlight: false,
    pendingSyncRequested: false,
    retryTimerId: null,
    lastError: null,
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
 * Hook that provides automatic pattern syncing with:
 * - Auto-sync every 5 minutes when authenticated
 * - Exponential backoff retry on failures
 * - Respects idle window (no sync if inactive > 6 min)
 * - Handles online/offline transitions gracefully
 * - Exposes sync status for UI
 * - Provides manual sync trigger
 */
export function usePatternSync(): {
  syncStatus: SyncStatus;
  triggerManualSync: () => Promise<void>;
} {
  const { user } = useAuth();
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    state: 'idle',
    lastSyncedAt: null,
    error: null,
  });

  // Track last user interaction (mouse/keyboard/touch)
  const lastInteractionRef = useRef(Date.now());

  // Sync state machine
  const stateRef = useRef<SyncState>(createInitialSyncState());

  // Online status tracking
  const isOnlineRef = useRef(typeof window !== 'undefined' ? window.navigator.onLine : true);

  // Update last interaction timestamp
  useEffect(() => {
    const updateInteraction = (): void => {
      lastInteractionRef.current = Date.now();
    };

    window.addEventListener('mousemove', updateInteraction);
    window.addEventListener('keydown', updateInteraction);
    window.addEventListener('touchstart', updateInteraction);

    return () => {
      window.removeEventListener('mousemove', updateInteraction);
      window.removeEventListener('keydown', updateInteraction);
      window.removeEventListener('touchstart', updateInteraction);
    };
  }, []);

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
   * Update UI sync status from internal state.
   */
  const updateSyncStatus = useCallback((state: SyncState) => {
    setSyncStatus({
      state: state.inFlight ? 'syncing' : state.lastError ? 'error' : state.lastSyncedAt ? 'synced' : 'idle',
      lastSyncedAt: state.lastSyncedAt,
      error: state.lastError,
    });
  }, []);

  /**
   * Schedule a retry after the given delay, respecting activity rules.
   */
  const scheduleRetry = useCallback(
    (delayMs: number, attemptSync: () => Promise<void>) => {
      const state = stateRef.current;
      clearRetryTimer();

      state.retryTimerId = window.setTimeout(() => {
        state.retryTimerId = null;

        // Only retry if user is still considered active
        if (isUserActive()) {
          log('Retry timer fired, attempting sync');
          void attemptSync();
        } else {
          log('Retry timer fired but user is idle, skipping');
        }
      }, delayMs);

      log(`Scheduled retry in ${Math.round(delayMs / 1000)}s`);
    },
    [clearRetryTimer, isUserActive]
  );

  /**
   * Perform the actual sync operation with proper state management.
   */
  const performSync = useCallback(async (): Promise<void> => {
    const state = stateRef.current;

    // Guard: user must be authenticated
    if (!user) {
      log('User not authenticated, skipping sync');
      return;
    }

    // Guard: only one sync at a time
    if (state.inFlight) {
      log('Sync already in flight, marking pending');
      state.pendingSyncRequested = true;
      return;
    }

    // Guard: respect idle window
    if (!isUserActive()) {
      log('User is idle, skipping sync');
      return;
    }

    // Guard: if offline, don't attempt (wait for online event)
    if (!isOnlineRef.current) {
      log('Offline, skipping sync attempt');
      return;
    }

    const now = Date.now();
    state.inFlight = true;
    state.lastAttemptAt = now;
    state.lastError = null;
    clearRetryTimer();

    updateSyncStatus(state);
    log('Starting sync attempt...');

    try {
      await syncAllPatterns();

      // SUCCESS: update lastSyncedAt and reset failure count
      state.lastSyncedAt = now;
      state.failureCount = 0;
      state.pendingSyncRequested = false;
      state.lastError = null;

      updateSyncStatus(state);
      log('Sync successful');
    } catch (err) {
      // FAILURE: do NOT update lastSyncedAt, increment failure count
      state.failureCount++;
      state.lastError = err instanceof Error ? err.message : 'Sync failed';

      warn(`Sync failed (attempt #${state.failureCount}):`, err);
      updateSyncStatus(state);

      // Schedule retry with backoff, if still active
      if (isUserActive() && isOnlineRef.current) {
        const delay = calculateRetryDelay(state.failureCount);
        scheduleRetry(delay, performSync);
      }
    } finally {
      state.inFlight = false;
      updateSyncStatus(state);
    }

    // Process pending sync request if any
    if (state.pendingSyncRequested && isUserActive()) {
      const timeSinceLastSync = state.lastSyncedAt ? Date.now() - state.lastSyncedAt : Infinity;

      // Only immediately re-sync if enough time has passed since last success
      if (timeSinceLastSync >= SYNC_EVERY_MS) {
        log('Processing pending sync request');
        state.pendingSyncRequested = false;
        void performSync();
      } else {
        // Clear pending flag - the regular tick will handle it
        state.pendingSyncRequested = false;
      }
    }
  }, [user, isUserActive, clearRetryTimer, updateSyncStatus, scheduleRetry]);

  /**
   * Periodic tick to check if a sync is needed.
   */
  const tick = useCallback(async (): Promise<void> => {
    const state = stateRef.current;

    // Don't sync if no user
    if (!user) return;

    // Don't interfere if a sync is in flight
    if (state.inFlight) return;

    // Don't sync if idle
    if (!isUserActive()) return;

    const now = Date.now();
    const timeSinceLastSync = state.lastSyncedAt ? now - state.lastSyncedAt : Infinity;

    // Check if it's time for a regular sync
    if (timeSinceLastSync >= SYNC_EVERY_MS) {
      log(`${Math.round(timeSinceLastSync / 1000)}s since last sync, attempting sync`);
      await performSync();
    }
  }, [user, isUserActive, performSync]);

  /**
   * Manual sync trigger exposed to UI
   */
  const triggerManualSync = useCallback(async (): Promise<void> => {
    log('Manual sync triggered');
    await performSync();
  }, [performSync]);

  useEffect(() => {
    if (!user) {
      // Reset state when user logs out
      stateRef.current = createInitialSyncState();
      setSyncStatus({ state: 'idle', lastSyncedAt: null, error: null });
      return;
    }

    let tickTimer: number | null = null;
    let cancelled = false;

    // Set up periodic tick
    tickTimer = window.setInterval(() => {
      if (!cancelled) {
        void tick();
      }
    }, TICK_MS);

    // Handle visibility change (sync when tab is hidden if active)
    const onVisibilityChange = (): void => {
      if (cancelled) return;
      if (document.visibilityState === 'hidden' && isUserActive() && user) {
        log('Tab hidden, attempting sync');
        void performSync();
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
        scheduleRetry(ONLINE_RETRY_MS, performSync);
      } else if (isUserActive()) {
        // Check if a regular sync is due
        const timeSinceLastSync = state.lastSyncedAt ? Date.now() - state.lastSyncedAt : Infinity;
        if (timeSinceLastSync >= SYNC_EVERY_MS) {
          scheduleRetry(ONLINE_RETRY_MS, performSync);
        }
      }
    };

    const onOffline = (): void => {
      if (cancelled) return;
      isOnlineRef.current = false;
      log('Gone offline, pausing remote syncs');

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
  }, [user, tick, performSync, isUserActive, scheduleRetry, clearRetryTimer]);

  return { syncStatus, triggerManualSync };
}
