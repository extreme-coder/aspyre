import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useFriends } from '../hooks/useFriends';
import { useBlocks } from '../hooks/useBlocks';
import { supabase } from '../config/supabase';

export default function UserProfileScreen({ route, navigation }) {
  const { userId } = route.params;
  const { user } = useAuth();
  const {
    getRelationshipStatus,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    incomingRequests,
    outgoingRequests,
    fetchAll: fetchFriends,
  } = useFriends(user?.id);
  const { blockUser, isBlocked } = useBlocks(user?.id);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [requestNote, setRequestNote] = useState('');
  const [error, setError] = useState(null);

  const relationshipStatus = getRelationshipStatus(userId);
  const blocked = isBlocked(userId);

  // Find the relevant request for this user
  const incomingRequest = incomingRequests.find(r => r.sender?.id === userId);
  const outgoingRequest = outgoingRequests.find(r => r.recipient?.id === userId);

  const fetchProfile = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          // No rows returned - user doesn't exist or is blocked/private
          setError('This profile is not available');
        } else {
          throw fetchError;
        }
      } else {
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleSendRequest = async () => {
    setShowNoteModal(true);
  };

  const confirmSendRequest = async () => {
    setShowNoteModal(false);
    setActionLoading(true);

    const result = await sendFriendRequest(userId, requestNote.trim() || null);

    setActionLoading(false);
    setRequestNote('');

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to send request');
    } else {
      Alert.alert('Request Sent', 'Your friend request has been sent!');
      await fetchFriends();
    }
  };

  const handleAcceptRequest = async () => {
    if (!incomingRequest) return;

    setActionLoading(true);
    const result = await acceptRequest(incomingRequest.id);
    setActionLoading(false);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to accept request');
    } else {
      Alert.alert('Friend Added', `You and ${profile?.display_name || profile?.handle} are now friends!`);
    }
  };

  const handleDeclineRequest = async () => {
    if (!incomingRequest) return;

    Alert.alert(
      'Decline Request',
      'Are you sure you want to decline this friend request?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await declineRequest(incomingRequest.id);
            setActionLoading(false);

            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to decline request');
            }
          },
        },
      ]
    );
  };

  const handleCancelRequest = async () => {
    if (!outgoingRequest) return;

    Alert.alert(
      'Cancel Request',
      'Are you sure you want to cancel your friend request?',
      [
        { text: 'Keep', style: 'cancel' },
        {
          text: 'Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await cancelRequest(outgoingRequest.id);
            setActionLoading(false);

            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to cancel request');
            }
          },
        },
      ]
    );
  };

  const handleRemoveFriend = async () => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${profile?.display_name || profile?.handle} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await removeFriend(userId);
            setActionLoading(false);

            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const handleBlock = async () => {
    Alert.alert(
      'Block User',
      `Are you sure you want to block ${profile?.display_name || profile?.handle}? They won't be able to see your posts or send you requests.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            const result = await blockUser(userId);
            setActionLoading(false);

            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to block user');
            } else {
              Alert.alert('User Blocked', 'This user has been blocked.', [
                { text: 'OK', onPress: () => navigation.goBack() },
              ]);
            }
          },
        },
      ]
    );
  };

  const renderAvatar = () => {
    const initial = (profile?.display_name || profile?.handle || '?')[0].toUpperCase();
    return (
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    );
  };

  const renderActionButton = () => {
    if (actionLoading) {
      return (
        <View style={styles.actionButton}>
          <ActivityIndicator size="small" color="#fff" />
        </View>
      );
    }

    switch (relationshipStatus) {
      case 'friends':
        return (
          <View style={styles.actionButtons}>
            <View style={styles.friendBadge}>
              <Text style={styles.friendBadgeText}>Friends</Text>
            </View>
            <TouchableOpacity style={styles.removeButton} onPress={handleRemoveFriend}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        );

      case 'request_sent':
        return (
          <TouchableOpacity style={styles.pendingButton} onPress={handleCancelRequest}>
            <Text style={styles.pendingButtonText}>Request Sent - Cancel</Text>
          </TouchableOpacity>
        );

      case 'request_received':
        return (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionButton} onPress={handleAcceptRequest}>
              <Text style={styles.actionButtonText}>Accept Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={handleDeclineRequest}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <TouchableOpacity style={styles.actionButton} onPress={handleSendRequest}>
            <Text style={styles.actionButtonText}>Add Friend</Text>
          </TouchableOpacity>
        );
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Profile</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>{error || 'Profile not found'}</Text>
          <Text style={styles.errorSubtitle}>
            This profile may be private or the user may have blocked you.
          </Text>
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
        <Text style={styles.title}>Profile</Text>
        <TouchableOpacity onPress={handleBlock}>
          <Text style={styles.blockButton}>Block</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Info */}
        <View style={styles.profileSection}>
          {renderAvatar()}
          <Text style={styles.displayName}>
            {profile.display_name || profile.handle || 'User'}
          </Text>
          {profile.handle && (
            <Text style={styles.handle}>@{profile.handle}</Text>
          )}
          <View style={styles.privacyBadge}>
            <Text style={styles.privacyText}>
              {profile.account_privacy === 'public' ? 'Public Account' : 'Friends Only'}
            </Text>
          </View>
        </View>

        {/* Action Button */}
        <View style={styles.actionSection}>
          {renderActionButton()}
        </View>

        {/* Request Note (if received) */}
        {incomingRequest?.note && (
          <View style={styles.noteSection}>
            <Text style={styles.noteLabel}>Their message:</Text>
            <Text style={styles.noteText}>"{incomingRequest.note}"</Text>
          </View>
        )}

        {/* Info about visibility */}
        {profile.account_privacy === 'friends' && relationshipStatus !== 'friends' && (
          <View style={styles.infoSection}>
            <Text style={styles.infoText}>
              This is a friends-only account. Become friends to see their posts.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Note Modal */}
      <Modal
        visible={showNoteModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add a Note</Text>
            <Text style={styles.modalSubtitle}>
              Introduce yourself (optional)
            </Text>
            <TextInput
              style={styles.noteInput}
              value={requestNote}
              onChangeText={setRequestNote}
              placeholder="Hey, I'd like to connect!"
              placeholderTextColor="#999"
              multiline
              maxLength={200}
            />
            <Text style={styles.charCount}>{requestNote.length}/200</Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => {
                  setShowNoteModal(false);
                  setRequestNote('');
                }}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSendButton}
                onPress={confirmSendRequest}
              >
                <Text style={styles.modalSendText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  blockButton: {
    fontSize: 14,
    fontWeight: '400',
    color: '#c00',
    minWidth: 50,
    textAlign: 'right',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    color: '#000',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '500',
    color: '#666',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  handle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    marginBottom: 12,
  },
  privacyBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  privacyText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  actionSection: {
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  actionButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  pendingButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  pendingButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  friendBadge: {
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  friendBadgeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2e7d32',
  },
  removeButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  removeButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  declineButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
  },
  declineButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  noteSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginBottom: 24,
  },
  noteLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  noteText: {
    fontSize: 14,
    fontWeight: '300',
    fontStyle: 'italic',
    color: '#333',
  },
  infoSection: {
    backgroundColor: '#fff9c4',
    padding: 16,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  modalSubtitle: {
    fontSize: 13,
    fontWeight: '300',
    color: '#666',
    marginBottom: 16,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    fontWeight: '300',
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: {
    fontSize: 10,
    fontWeight: '300',
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 16,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  modalCancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  modalSendButton: {
    backgroundColor: '#000',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 4,
  },
  modalSendText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
});
