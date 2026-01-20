import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useJournal } from './useJournal';
import { useFeedUsage } from './useFeedUsage';

/**
 * Gate states for the home screen
 */
export const GateState = {
  LOADING: 'LOADING',
  NEEDS_POST: 'NEEDS_POST',
  FEED_UNLOCKED: 'FEED_UNLOCKED',
  TIME_LIMIT_REACHED: 'TIME_LIMIT_REACHED',
};

/**
 * Hook that computes the current gate state based on journal and feed usage.
 * Recomputes on app resume.
 */
export function useGateState(userId, userTimezone) {
  const [gateState, setGateState] = useState(GateState.LOADING);

  const {
    hasPostedToday,
    loading: journalLoading,
    fetchTodayJournal,
  } = useJournal(userId, userTimezone);

  const {
    isTimeLimitReached,
    timeRemaining,
    loading: feedLoading,
    fetchUsage,
    formatTimeRemaining,
    getNextResetTime,
    startTracking,
    stopTracking,
    isTracking,
  } = useFeedUsage(userId, userTimezone);

  const loading = journalLoading || feedLoading;

  // Compute gate state
  const computeState = useCallback(() => {
    if (loading) {
      return GateState.LOADING;
    }

    // Check time limit first (highest priority)
    if (isTimeLimitReached) {
      return GateState.TIME_LIMIT_REACHED;
    }

    // Check if user has posted today
    if (!hasPostedToday) {
      return GateState.NEEDS_POST;
    }

    // User has posted and has time remaining
    return GateState.FEED_UNLOCKED;
  }, [loading, isTimeLimitReached, hasPostedToday]);

  // Update state when dependencies change
  useEffect(() => {
    const newState = computeState();
    setGateState(newState);
  }, [computeState]);

  // Refetch data on app resume
  useEffect(() => {
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        // App came to foreground - refresh state
        fetchTodayJournal();
        fetchUsage();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [fetchTodayJournal, fetchUsage]);

  // Refresh all data
  const refreshState = useCallback(() => {
    fetchTodayJournal();
    fetchUsage();
  }, [fetchTodayJournal, fetchUsage]);

  return {
    gateState,
    loading,
    hasPostedToday,
    isTimeLimitReached,
    timeRemaining,
    formatTimeRemaining,
    getNextResetTime,
    refreshState,
    startTracking,
    stopTracking,
    isTracking,
  };
}
