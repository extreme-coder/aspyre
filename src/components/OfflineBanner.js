import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetworkState } from '../hooks/useNetworkState';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

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
        <Ionicons name="cloud-offline-outline" size={16} color={colors.onTertiaryContainer} />
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
    backgroundColor: colors.tertiaryContainer,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    // NO border - tonal contrast is sufficient
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  text: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onTertiaryContainer,
  },
  retryButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.tertiary,
    borderRadius: radius.full,
  },
  retryText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onTertiary,
  },
});
