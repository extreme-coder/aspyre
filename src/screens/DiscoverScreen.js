import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useDiscoverUsers } from '../hooks/useDiscoverUsers';

export default function DiscoverScreen({ navigation }) {
  const { user } = useAuth();
  const {
    users,
    loading,
    error,
    hasMore,
    searchQuery,
    searchUsers,
    loadMore,
    refresh,
    sendFriendRequest,
    cancelFriendRequest,
  } = useDiscoverUsers(user?.id);

  const [processingId, setProcessingId] = useState(null);

  // Load users on focus
  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleSendRequest = async (userId, userName) => {
    setProcessingId(userId);
    const result = await sendFriendRequest(userId);
    setProcessingId(null);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to send request');
    } else {
      Alert.alert('Request Sent', `Friend request sent to ${userName}`);
    }
  };

  const handleCancelRequest = async (userId) => {
    setProcessingId(userId);
    const result = await cancelFriendRequest(userId);
    setProcessingId(null);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to cancel request');
    }
  };

  const navigateToProfile = (userId) => {
    navigation.navigate('Profile', { userId });
  };

  const renderAvatar = (profile) => {
    if (profile.avatar_url) {
      return (
        <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
      );
    }

    const initial = (profile.display_name || profile.handle || '?')[0].toUpperCase();
    return (
      <View style={styles.avatarPlaceholder}>
        <Text style={styles.avatarText}>{initial}</Text>
      </View>
    );
  };

  const renderActionButton = (profile) => {
    const isProcessing = processingId === profile.id;

    if (isProcessing) {
      return (
        <View style={styles.actionButton}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      );
    }

    switch (profile.relationshipStatus) {
      case 'friends':
        return (
          <View style={[styles.actionButton, styles.friendsButton]}>
            <Ionicons name="checkmark" size={14} color="#666" />
            <Text style={styles.friendsButtonText}>Friends</Text>
          </View>
        );

      case 'pending_outgoing':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.pendingButton]}
            onPress={() => handleCancelRequest(profile.id)}
          >
            <Text style={styles.pendingButtonText}>Pending</Text>
          </TouchableOpacity>
        );

      case 'pending_incoming':
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.acceptButton]}
            onPress={() => navigateToProfile(profile.id)}
          >
            <Text style={styles.acceptButtonText}>Respond</Text>
          </TouchableOpacity>
        );

      default:
        return (
          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => handleSendRequest(profile.id, profile.display_name || profile.handle)}
          >
            <Ionicons name="person-add-outline" size={14} color="#fff" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        );
    }
  };

  const renderUserItem = ({ item }) => {
    const location = [item.location_city, item.location_region]
      .filter(Boolean)
      .join(', ');

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => navigateToProfile(item.id)}
      >
        {renderAvatar(item)}
        <View style={styles.userInfo}>
          <Text style={styles.userName}>
            {item.display_name || item.handle || 'User'}
          </Text>
          {item.handle && item.display_name && (
            <Text style={styles.userHandle}>@{item.handle}</Text>
          )}
          {location && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={12} color="#999" />
              <Text style={styles.locationText}>{location}</Text>
            </View>
          )}
        </View>
        {renderActionButton(item)}
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => {
    if (loading) return null;

    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyState}>
          <Ionicons name="search-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different name or handle
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color="#ccc" />
        <Text style={styles.emptyTitle}>No one to discover yet</Text>
        <Text style={styles.emptySubtitle}>
          Check back soon as more people join
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    if (!hasMore || !loading) return null;
    return (
      <View style={styles.footer}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or @handle"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={searchUsers}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => searchUsers('')}>
            <Ionicons name="close-circle" size={18} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Error State */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Something went wrong</Text>
          <TouchableOpacity style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* User List */}
      {!error && (
        <FlatList
          data={users}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={loading && users.length === 0}
              onRefresh={refresh}
              tintColor="#000"
            />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
  },
  placeholder: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    padding: 0,
  },
  listContent: {
    paddingBottom: 40,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  userHandle: {
    fontSize: 13,
    fontWeight: '300',
    color: '#666',
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
    marginLeft: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 4,
    gap: 4,
  },
  addButton: {
    backgroundColor: '#000',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  pendingButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  pendingButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  friendsButton: {
    borderWidth: 1,
    borderColor: '#ddd',
  },
  friendsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  acceptButton: {
    backgroundColor: '#000',
  },
  acceptButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
  },
  emptyState: {
    padding: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
  },
  footer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#000',
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
});
