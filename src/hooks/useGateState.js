import { useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import { useJournal } from './useJournal';
import { useFeedUsage } from './useFeedUsage';
import { useProfile } from './useProfile';

/**
 * Gate states for the home screen
 *
 * Soft Gate Logic:
 * - PREVIEW_MODE: New users (has_ever_posted = false) get limited Discover preview
 * - NEEDS_POST: Active users who haven't posted today - Friends feed only
 * - FEED_UNLOCKED: Posted today - full feed access
 * - TIME_LIMIT_REACHED: Feed time exhausted
 */
export const GateState = {
  LOADING: 'LOADING',
  PREVIEW_MODE: 'PREVIEW_MODE',  // New users - limited preview
  NEEDS_POST: 'NEEDS_POST',       // Active users - Friends only
  FEED_UNLOCKED: 'FEED_UNLOCKED',
  TIME_LIMIT_REACHED: 'TIME_LIMIT_REACHED',
};

/**
 * Hook that computes the current gate state based on journal and feed usage.
 * Implements soft gate: new users get preview, active users must post daily.
 */
export function useGateState(userId, userTimezone) {
  const [gateState, setGateState] = useState(GateState.LOADING);

  const { profile, loading: profileLoading } = useProfile(userId);

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

  const loading = journalLoading || feedLoading || profileLoading;
  const hasEverPosted = profile?.has_ever_posted ?? false;

  // Compute gate state
  const computeState = useCallback(() => {
    if (loading) {
      return GateState.LOADING;
    }

    // Check time limit first (highest priority) - only for users who have posted
    if (hasEverPosted && isTimeLimitReached) {
      return GateState.TIME_LIMIT_REACHED;
    }

    // New users who have never posted get preview mode
    if (!hasEverPosted) {
      return GateState.PREVIEW_MODE;
    }

    // Active users who haven't posted today
    if (!hasPostedToday) {
      return GateState.NEEDS_POST;
    }

    // User has posted today and has time remaining
    return GateState.FEED_UNLOCKED;
  }, [loading, isTimeLimitReached, hasPostedToday, hasEverPosted]);

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
