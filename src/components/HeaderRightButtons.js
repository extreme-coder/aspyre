import React from 'react';
import { View, StyleSheet } from 'react-native';
import NotificationBadge from './NotificationBadge';
import HeaderProfileButton from './HeaderProfileButton';
import { spacing } from '../constants/theme';

/**
 * Combined header right buttons: notification bell + profile avatar.
 * Use this in screen headers for consistent layout.
 */
export default function HeaderRightButtons() {
  return (
    <View style={styles.container}>
      <NotificationBadge />
      <HeaderProfileButton />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
