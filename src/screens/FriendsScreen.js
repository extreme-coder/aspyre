import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../hooks/useFriends';
import HeaderProfileButton from '../components/HeaderProfileButton';

const TABS = ['Friends', 'Requests'];

export default function FriendsScreen({ navigation }) {
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

  const [activeTab, setActiveTab] = useState('Friends');
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState(null);

  useFocusEffect(
    useCallback(() => {
      fetchAll();
    }, [fetchAll])
  );

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
            <ActivityIndicator size="small" color="#999" />
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
            <ActivityIndicator size="small" color="#000" />
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
            <ActivityIndicator size="small" color="#999" />
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
          <Text style={styles.emptyTitle}>No friends yet</Text>
          <Text style={styles.emptySubtitle}>
            Find people to connect with in the feed
          </Text>
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
          <Text style={styles.emptyTitle}>No pending requests</Text>
          <Text style={styles.emptySubtitle}>
            Friend requests you send or receive will appear here
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
          <HeaderProfileButton />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#000" />
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
        <HeaderProfileButton />
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
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    minWidth: 50,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  tab: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
  },
  tabTextActive: {
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontWeight: '500',
    color: '#666',
  },
  itemContent: {
    flex: 1,
  },
  itemName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  itemHandle: {
    fontSize: 13,
    fontWeight: '300',
    color: '#666',
    marginTop: 2,
  },
  requestNote: {
    fontSize: 13,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#666',
    marginTop: 4,
  },
  pendingLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    marginTop: 4,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  acceptButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 4,
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '500',
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
  cancelButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
  },
  cancelButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  removeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
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
  },
});
