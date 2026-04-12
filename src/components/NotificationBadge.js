import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
  touchTarget,
} from '../constants/theme';

/**
 * Notification bell icon with badge for screen headers.
 * Shows unread count badge, navigates to Notifications on press.
 */
export default function NotificationBadge() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { unreadCount } = useNotifications(user?.id);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('Notifications')}
    >
      <View style={styles.iconContainer}>
        <Ionicons name="notifications-outline" size={22} color={colors.onSurface} />
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: touchTarget.min,
    alignItems: 'flex-end',
  },
  iconContainer: {
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -4,
    backgroundColor: colors.secondary,
    borderRadius: radius.full,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  badgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize - 1,
    color: colors.onSecondary,
  },
});
