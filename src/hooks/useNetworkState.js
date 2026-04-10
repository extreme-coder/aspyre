import { useState, useEffect, useCallback } from 'react';
import NetInfo from '@react-native-community/netinfo';

/**
 * Hook for monitoring network connectivity state.
 * Returns isConnected boolean and refresh function.
 */
export function useNetworkState() {
  const [isConnected, setIsConnected] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState(true);

  useEffect(() => {
    // Subscribe to network state updates
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    // Get initial state
    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected ?? true);
      setIsInternetReachable(state.isInternetReachable ?? true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const refresh = useCallback(async () => {
    const state = await NetInfo.fetch();
    setIsConnected(state.isConnected ?? true);
    setIsInternetReachable(state.isInternetReachable ?? true);
    return state.isConnected && state.isInternetReachable;
  }, []);

  return {
    isConnected,
    isInternetReachable,
    isOffline: !isConnected || !isInternetReachable,
    refresh,
  };
}
