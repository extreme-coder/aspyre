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
                <ActivityIndicator size="small" color="#000" />
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
              <Ionicons name="checkmark-circle" size={14} color="#4CAF50" />
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
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Action bar */}
      {(unreadCount > 0 || notifications.length > 0) && (
        <View style={styles.actionBar}>
          {unreadCount > 0 ? (
            <TouchableOpacity style={styles.actionButton} onPress={handleMarkAllRead}>
              <Ionicons name="checkmark-done-outline" size={18} color="#666" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.actionButton} onPress={handleClearAll}>
              <Ionicons name="trash-outline" size={18} color="#666" />
            </TouchableOpacity>
          )}
        </View>
      )}

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
    backgroundColor: '#fff',
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  actionButton: {
    padding: 4,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingVertical: 8,
  },
  listContentEmpty: {
    flex: 1,
  },
  notificationItem: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  notificationUnread: {
    backgroundColor: '#fafafa',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
    flex: 1,
  },
  textUnread: {
    color: '#000',
    fontWeight: '600',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
    marginLeft: 8,
  },
  notificationBody: {
    fontSize: 13,
    fontWeight: '300',
    color: '#666',
    lineHeight: 18,
    marginBottom: 6,
  },
  notificationTime: {
    fontSize: 11,
    fontWeight: '400',
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 48,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#c00',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 1,
  },
  // Inline friend request actions
  friendRequestActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    marginBottom: 6,
  },
  acceptButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  declineButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  declineButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  handledLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    marginBottom: 4,
  },
  handledLabelText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4CAF50',
  },
});
