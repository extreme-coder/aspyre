import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../hooks/useFriends';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
  editorialMargins,
} from '../constants/theme';

const TABS = ['Friends', 'Requests'];

export default function FriendsScreen({ navigation, route }) {
  const { user } = useAuth();
  const {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    fetchAll,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    friendCount,
    incomingCount,
    outgoingCount,
  } = useFriends(user?.id);

  // Use tab from route params if provided (e.g., from notification navigation)
  const initialTab = route.params?.tab && TABS.includes(route.params.tab) ? route.params.tab : 'Friends';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

  // Update active tab when navigating with a new tab param
  useEffect(() => {
    if (route.params?.tab && TABS.includes(route.params.tab)) {
      setActiveTab(route.params.tab);
    }
  }, [route.params?.tab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  };

  const handleAccept = async (requestId, senderName) => {
    setProcessingId(requestId);
    const result = await acceptRequest(requestId);
    setProcessingId(null);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to accept request');
    } else {
      Alert.alert('Friend Added', `You and ${senderName} are now friends!`);
    }
  };

  const handleDecline = async (requestId) => {
    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await declineRequest(requestId);
            setProcessingId(null);

            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to decline request');
            }
          },
        },
      ]
    );
  };

  const handleCancel = async (requestId) => {
    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel this friend request?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(requestId);
            const result = await cancelRequest(requestId);
            setProcessingId(null);

            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFriend = async (friendId, friendName) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendName} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setProcessingId(friendId);
            const result = await removeFriend(friendId);
            setProcessingId(null);

            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const navigateToProfile = (userId) => {
    navigation.navigate('Profile', { userId });
  };

  const renderAvatar = (profile, size = 44) => {
    const initial = (profile?.display_name || profile?.handle || '?')[0].toUpperCase();
    return (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[styles.avatarText, { fontSize: size * 0.4 }]}>{initial}</Text>
      </View>
    );
  };

  const renderFriendItem = (item) => {
    const friend = item.friend;
    const isProcessing = processingId === friend?.id;

    return (
      <TouchableOpacity
        key={friend?.id}
        style={styles.listItem}
        onPress={() => navigateToProfile(friend?.id)}
        disabled={isProcessing}
      >
        {renderAvatar(friend)}
        <View style={styles.itemContent}>
          <Text style={styles.itemName}>{friend?.display_name || friend?.handle || 'User'}</Text>
          {friend?.handle && friend?.display_name && (
            <Text style={styles.itemHandle}>@{friend.handle}</Text>
          )}
        </View>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveFriend(friend?.id, friend?.display_name || friend?.handle)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
          ) : (
            <Text style={styles.removeButtonText}>Remove</Text>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderIncomingRequest = (request) => {
    const sender = request.sender;
    const isProcessing = processingId === request.id;

    return (
      <View key={request.id} style={styles.listItem}>
        <TouchableOpacity
          style={styles.itemLeft}
          onPress={() => navigateToProfile(sender?.id)}
        >
          {renderAvatar(sender)}
          <View style={styles.itemContent}>
            <Text style={styles.itemName}>{sender?.display_name || sender?.handle || 'User'}</Text>
            {sender?.handle && sender?.display_name && (
              <Text style={styles.itemHandle}>@{sender.handle}</Text>
            )}
            {request.note && (
              <Text style={styles.requestNote}>"{request.note}"</Text>
            )}
          </View>
        </TouchableOpacity>
        <View style={styles.requestActions}>
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <>
              <TouchableOpacity
                style={styles.acceptButton}
                onPress={() => handleAccept(request.id, sender?.display_name || sender?.handle)}
              >
                <Text style={styles.acceptButtonText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.declineButton}
                onPress={() => handleDecline(request.id)}
              >
                <Text style={styles.declineButtonText}>Decline</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderOutgoingRequest = (request) => {
    const recipient = request.recipient;
    const isProcessing = processingId === request.id;

    return (
      <View key={request.id} style={styles.listItem}>
        <TouchableOpacity
          style={styles.itemLeft}
          onPress={() => navigateToProfile(recipient?.id)}
        >
          {renderAvatar(recipient)}
          <View style={styles.itemContent}>
            <Text style={styles.itemName}>{recipient?.display_name || recipient?.handle || 'User'}</Text>
            {recipient?.handle && recipient?.display_name && (
              <Text style={styles.itemHandle}>@{recipient.handle}</Text>
            )}
            {request.note && (
              <Text style={styles.requestNote}>"{request.note}"</Text>
            )}
            <Text style={styles.pendingLabel}>Pending</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={() => handleCancel(request.id)}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
          ) : (
            <Text style={styles.cancelButtonText}>Cancel</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const renderFriendsTab = () => {
    if (friends.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="people-outline" size={48} color={colors.outlineVariant} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>
            Discover people with similar goals and interests
          </Text>
          <TouchableOpacity
            style={styles.emptyButton}
            onPress={() => navigation.navigate('Discover')}
          >
            <Text style={styles.emptyButtonText}>Discover People</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return friends.map(renderFriendItem);
  };

  const renderRequestsTab = () => {
    const hasIncoming = incomingRequests.length > 0;
    const hasOutgoing = outgoingRequests.length > 0;

    if (!hasIncoming && !hasOutgoing) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="mail-outline" size={48} color={colors.outlineVariant} style={styles.emptyIcon} />
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtitle}>
            When you send friend requests or receive them, they'll show up here
          </Text>
        </View>
      );
    }

    return (
      <>
        {hasIncoming && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Incoming ({incomingCount})</Text>
            {incomingRequests.map(renderIncomingRequest)}
          </View>
        )}
        {hasOutgoing && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sent ({outgoingCount})</Text>
            {outgoingRequests.map(renderOutgoingRequest)}
          </View>
        )}
      </>
    );
  };

  if (loading && friends.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Friends</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
            <Ionicons name="search-outline" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Friends</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Discover')}>
          <Ionicons name="search-outline" size={20} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          const count = tab === 'Friends' ? friendCount : incomingCount + outgoingCount;
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab}
                {count > 0 && ` (${count})`}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {activeTab === 'Friends' ? renderFriendsTab() : renderRequestsTab()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: editorialMargins.left,
    paddingRight: editorialMargins.right,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  backButton: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.primary,
    minWidth: 50,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
  },
  placeholder: {
    minWidth: 50,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
    // NO border - use tonal surface instead
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  tabTextActive: {
    color: colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    paddingLeft: editorialMargins.left,
    paddingRight: editorialMargins.right,
    marginBottom: spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: editorialMargins.left,
    paddingRight: editorialMargins.right,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLowest,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.medium,
    color: colors.onSurfaceVariant,
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleSm.fontSize,
    color: colors.onSurface,
  },
  itemHandle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  requestNote: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    fontStyle: 'italic',
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  pendingLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  requestActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  acceptButton: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  acceptButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSecondary,
  },
  declineButton: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  declineButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  cancelButton: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  cancelButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  removeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  removeButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  emptyState: {
    padding: spacing.xxxl,
    alignItems: 'center',
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleMd.fontSize,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    lineHeight: typography.bodyMd.lineHeight,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  emptyButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
  },
  emptyButtonText: {
    fontFamily: fontFamily.semiBold,
    color: colors.onPrimary,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
  },
});
