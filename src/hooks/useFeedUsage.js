import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AppState } from 'react-native';
import { supabase } from '../config/supabase';
import { getLocalDateString } from '../utils/dateUtils';
import {
  FEED_TIME_LIMIT_SECONDS,
  FEED_SYNC_INTERVAL_MS,
  FEED_TIMER_TICK_MS,
} from '../constants/feedConfig';

/**
 * Hook for tracking and persisting feed usage time.
 * Manages the timer, syncs to Supabase, and detects time limit.
 */
export function useFeedUsage(userId, userTimezone) {
  const [secondsUsed, setSecondsUsed] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState(null);

  // Memoize localDate to prevent unnecessary re-renders
  const localDate = useMemo(() => getLocalDateString(userTimezone), [userTimezone]);
  const localSecondsRef = useRef(0); // Track seconds locally between syncs
  const lastSyncedSecondsRef = useRef(0); // Last value synced to DB
  const tickIntervalRef = useRef(null);
  const syncIntervalRef = useRef(null);
  const appStateRef = useRef(AppState.currentState);
  const isTrackingRef = useRef(false); // Ref to avoid dependency cycles

  const timeRemaining = Math.max(0, FEED_TIME_LIMIT_SECONDS - secondsUsed);
  const isTimeLimitReached = secondsUsed >= FEED_TIME_LIMIT_SECONDS;

  // Fetch today's usage from Supabase
  const fetchUsage = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('feed_sessions')
        .select('seconds_used')
        .eq('user_id', userId)
        .eq('local_date', localDate)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else {
        const used = data?.seconds_used || 0;
        setSecondsUsed(used);
        localSecondsRef.current = used;
        lastSyncedSecondsRef.current = used;
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId, localDate]);

  useEffect(() => {
    fetchUsage();
  }, [fetchUsage]);

  // Sync current usage to Supabase
  const syncToSupabase = useCallback(async () => {
    if (!userId) return;

    const currentSeconds = localSecondsRef.current;

    // Only sync if there's a change
    if (currentSeconds === lastSyncedSecondsRef.current) return;

    try {
      const { error: upsertError } = await supabase
        .from('feed_sessions')
        .upsert(
          {
            user_id: userId,
            local_date: localDate,
            seconds_used: currentSeconds,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,local_date' }
        );

      if (!upsertError) {
        lastSyncedSecondsRef.current = currentSeconds;
      }
    } catch (err) {
      console.warn('Failed to sync feed usage:', err);
    }
  }, [userId, localDate]);

  // Stop tracking time (defined first to avoid reference issues)
  const stopTracking = useCallback(() => {
    if (!isTrackingRef.current) return;

    isTrackingRef.current = false;
    setIsTracking(false);

    if (tickIntervalRef.current) {
      clearInterval(tickIntervalRef.current);
      tickIntervalRef.current = null;
    }

    if (syncIntervalRef.current) {
      clearInterval(syncIntervalRef.current);
      syncIntervalRef.current = null;
    }

    // Sync on stop
    syncToSupabase();
  }, [syncToSupabase]);

  // Start tracking time
  const startTracking = useCallback(() => {
    // Use ref to check if already at limit to avoid dependency on changing state
    if (isTrackingRef.current || localSecondsRef.current >= FEED_TIME_LIMIT_SECONDS) return;

    isTrackingRef.current = true;
    setIsTracking(true);

    // Tick every second to update local counter
    tickIntervalRef.current = setInterval(() => {
      localSecondsRef.current += 1;
      setSecondsUsed(localSecondsRef.current);

      // Check if limit reached
      if (localSecondsRef.current >= FEED_TIME_LIMIT_SECONDS) {
        stopTracking();
        syncToSupabase(); // Final sync
      }
    }, FEED_TIMER_TICK_MS);

    // Sync to Supabase periodically
    syncIntervalRef.current = setInterval(() => {
      syncToSupabase();
    }, FEED_SYNC_INTERVAL_MS);
  }, [syncToSupabase, stopTracking]);

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (
        appStateRef.current.match(/active/) &&
        nextAppState.match(/inactive|background/)
      ) {
        // App going to background - stop tracking and sync
        if (isTrackingRef.current) {
          stopTracking();
        }
      }
      appStateRef.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [stopTracking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (tickIntervalRef.current) {
        clearInterval(tickIntervalRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, []);

  // Format time remaining as MM:SS
  const formatTimeRemaining = useCallback(() => {
    const minutes = Math.floor(timeRemaining / 60);
    const seconds = timeRemaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [timeRemaining]);

  // Get next reset time (midnight in user's timezone)
  const getNextResetTime = useCallback(() => {
    const tz = userTimezone || 'UTC';
    const now = new Date();

    // Get tomorrow's date in user's timezone
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: 'numeric',
        hour12: true,
      });

      // Midnight tomorrow
      const midnightTomorrow = new Date(tomorrow);
      midnightTomorrow.setHours(0, 0, 0, 0);

      return 'midnight';
    } catch {
      return 'midnight';
    }
  }, [userTimezone]);

  return {
    secondsUsed,
    timeRemaining,
    isTimeLimitReached,
    isTracking,
    loading,
    error,
    startTracking,
    stopTracking,
    fetchUsage,
    formatTimeRemaining,
    getNextResetTime,
    timeLimit: FEED_TIME_LIMIT_SECONDS,
  };
}
