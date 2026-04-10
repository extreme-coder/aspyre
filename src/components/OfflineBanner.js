import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from '../hooks/useNetworkState';

/**
 * Banner that shows when the device is offline.
 * Displays at the top of screens to inform users.
 */
export default function OfflineBanner({ onRetry }) {
  const { isOffline, refresh } = useNetworkState();

  if (!isOffline) return null;

  const handleRetry = async () => {
    const connected = await refresh();
    if (connected && onRetry) {
      onRetry();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Ionicons name="cloud-offline-outline" size={16} color="#856404" />
        <Text style={styles.text}>You're offline</Text>
      </View>
      <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
        <Text style={styles.retryText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff3cd',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#ffc107',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    fontSize: 13,
    fontWeight: '500',
    color: '#856404',
  },
  retryButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#856404',
    borderRadius: 4,
  },
  retryText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#fff',
  },
});
