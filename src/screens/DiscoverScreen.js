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
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

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
          <ActivityIndicator size="small" color={colors.onSurface} />
        </View>
      );
    }

    switch (profile.relationshipStatus) {
      case 'friends':
        return (
          <View style={[styles.actionButton, styles.friendsButton]}>
            <Ionicons name="checkmark" size={14} color={colors.onSurfaceVariant} />
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
            <Ionicons name="person-add-outline" size={14} color={colors.onPrimary} />
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
              <Ionicons name="location-outline" size={12} color={colors.onSurfaceVariant} />
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
          <Ionicons name="search-outline" size={48} color={colors.onSurfaceVariant} />
          <Text style={styles.emptyTitle}>No results found</Text>
          <Text style={styles.emptySubtitle}>
            Try a different name or handle
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name="people-outline" size={48} color={colors.onSurfaceVariant} />
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
        <ActivityIndicator size="small" color={colors.onSurface} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.title}>Discover</Text>
        <View style={styles.placeholder} />
      </View>

      {/* Search Input */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.onSurfaceVariant} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or @handle"
          placeholderTextColor={colors.onSurfaceVariant}
          value={searchQuery}
          onChangeText={searchUsers}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => searchUsers('')}>
            <Ionicons name="close-circle" size={18} color={colors.onSurfaceVariant} />
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
              tintColor={colors.primary}
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
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
  },
  placeholder: {
    width: 24,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    padding: 0,
  },
  listContent: {
    paddingBottom: spacing.xl,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
  },
  avatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  userInfo: {
    flex: 1,
    marginLeft: spacing.md,
  },
  userName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  userHandle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  locationText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.xs,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
    gap: spacing.xs,
  },
  addButton: {
    backgroundColor: colors.primary,
  },
  addButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onPrimary,
  },
  pendingButton: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  pendingButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  friendsButton: {
    backgroundColor: colors.secondaryContainer,
  },
  friendsButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSecondaryContainer,
  },
  acceptButton: {
    backgroundColor: colors.primary,
  },
  acceptButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onPrimary,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    color: colors.onSurface,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  footer: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.lg,
  },
  retryButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
  },
  retryButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurface,
    letterSpacing: 1,
  },
});
