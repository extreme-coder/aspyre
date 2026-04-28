import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useNotifications } from '../hooks/useNotifications';
import { useFriends } from '../hooks/useFriends';
import { getNotificationNavigation } from '../utils/pushNotifications';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

// Notification type icons (emoji-based for simplicity)
const NOTIFICATION_ICONS = {
  friend_request: '👋',
  friend_accepted: '🤝',
  comment: '💬',
  kudos: '🔥',
};

// Format relative time
function formatRelativeTime(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NotificationsScreen({ navigation }) {
  const { user } = useAuth();
  const {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications(user?.id);

  const { acceptRequest, declineRequest } = useFriends(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);
  const [handledRequests, setHandledRequests] = useState(new Set());

  useFocusEffect(
    useCallback(() => {
      fetchNotifications();
    }, [fetchNotifications])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const handleNotificationPress = async (notification) => {
    // Mark as read if not already
    if (!notification.read_at) {
      await markAsRead(notification.id);
    }

    // Navigate to relevant screen
    const navParams = getNotificationNavigation(notification);
    if (navParams) {
      navigation.navigate(navParams.screen, navParams.params);
    }
  };

  const handleNotificationLongPress = (notification) => {
    Alert.alert(
      'Delete Notification',
      'Remove this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteNotification(notification.id),
        },
      ]
    );
  };

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return;
    const result = await markAllAsRead();
    if (result.error) {
      Alert.alert('Oops!', 'Failed to mark notifications as read');
    }
  };

  const handleClearAll = () => {
    if (notifications.length === 0) return;

    Alert.alert(
      'Clear All Notifications',
      'This will delete all your notifications. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            const result = await clearAll();
            if (result.error) {
              Alert.alert('Oops!', 'Failed to clear notifications');
            }
          },
        },
      ]
    );
  };

  // Handle accept friend request inline
  const handleAcceptRequest = async (notification) => {
    const requestId = notification.data?.request_id;
    if (!requestId) return;

    setProcessingRequestId(requestId);
    const result = await acceptRequest(requestId);
    setProcessingRequestId(null);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to accept request');
    } else {
      // Mark notification as read and track that we handled it
      await markAsRead(notification.id);
      setHandledRequests(prev => new Set([...prev, requestId]));
    }
  };

  // Handle decline friend request inline
  const handleDeclineRequest = async (notification) => {
    const requestId = notification.data?.request_id;
    if (!requestId) return;

    setProcessingRequestId(requestId);
    const result = await declineRequest(requestId);
    setProcessingRequestId(null);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to decline request');
    } else {
      // Mark notification as read and track that we handled it
      await markAsRead(notification.id);
      setHandledRequests(prev => new Set([...prev, requestId]));
    }
  };

  const renderNotification = ({ item }) => {
    const isUnread = !item.read_at;
    const icon = NOTIFICATION_ICONS[item.type] || '📬';
    const isFriendRequest = item.type === 'friend_request';
    const requestId = item.data?.request_id;
    const isProcessing = processingRequestId === requestId;
    const wasHandled = handledRequests.has(requestId);

    return (
      <TouchableOpacity
        style={[styles.notificationItem, isUnread && styles.notificationUnread]}
        onPress={() => handleNotificationPress(item)}
        onLongPress={() => handleNotificationLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{icon}</Text>
        </View>
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text style={[styles.notificationTitle, isUnread && styles.textUnread]}>
              {item.title}
            </Text>
            {isUnread && !isFriendRequest && <View style={styles.unreadDot} />}
          </View>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.body}
          </Text>

          {/* Inline Accept/Decline for friend requests */}
          {isFriendRequest && !wasHandled && (
            <View style={styles.friendRequestActions}>
              {isProcessing ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptRequest(item)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDeclineRequest(item)}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
          )}

          {/* Show "Accepted" label if handled */}
          {isFriendRequest && wasHandled && (
            <View style={styles.handledLabel}>
              <Ionicons name="checkmark-circle" size={14} color={colors.secondary} />
              <Text style={styles.handledLabelText}>Responded</Text>
            </View>
          )}

          <Text style={styles.notificationTime}>
            {formatRelativeTime(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>🔔</Text>
      <Text style={styles.emptyTitle}>No notifications yet</Text>
      <Text style={styles.emptySubtitle}>
        You'll see friend requests, comments, and kudos here
      </Text>
    </View>
  );

  const renderError = () => (
    <View style={styles.errorState}>
      <Text style={styles.errorTitle}>Failed to load notifications</Text>
      <Text style={styles.errorMessage}>{error}</Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchNotifications}>
        <Text style={styles.retryButtonText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && notifications.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.actionBar}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel="Close notifications"
            hitSlop={8}
          >
            <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
          <View style={styles.actionButton} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Action bar */}
      <View style={styles.actionBar}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Close notifications"
          hitSlop={8}
        >
          <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
        </TouchableOpacity>
        {unreadCount > 0 ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleMarkAllRead}>
            <Ionicons name="checkmark-done-outline" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : notifications.length > 0 ? (
          <TouchableOpacity style={styles.actionButton} onPress={handleClearAll}>
            <Ionicons name="trash-outline" size={18} color={colors.onSurfaceVariant} />
          </TouchableOpacity>
        ) : (
          <View style={styles.actionButton} />
        )}
      </View>

      {error ? (
        renderError()
      ) : (
        <FlatList
          data={notifications}
          renderItem={renderNotification}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            notifications.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  actionButton: {
    padding: spacing.xs,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: spacing.sm,
  },
  listContentEmpty: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  notificationUnread: {
    backgroundColor: colors.surfaceContainerLow,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  icon: {
    fontSize: 18,
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  notificationTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    flex: 1,
  },
  textUnread: {
    fontFamily: fontFamily.semiBold,
    color: colors.onSurface,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.secondary,
    marginLeft: spacing.sm,
  },
  notificationBody: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  notificationTime: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
  },
  retryButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    color: colors.onPrimary,
    letterSpacing: 1,
  },
  // Inline friend request actions
  friendRequestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  acceptButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  acceptButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onPrimary,
  },
  declineButton: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  declineButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  handledLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
    marginBottom: spacing.xs,
  },
  handledLabelText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.secondary,
  },
});
