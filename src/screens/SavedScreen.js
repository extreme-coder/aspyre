import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useSavedJournals } from '../hooks/useSavedJournals';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

/**
 * Dedicated Saved screen for viewing saved posts.
 * Accessible even when TIME_LIMIT_REACHED.
 * Respects privacy and blocks via the get_saved_journals RPC.
 */
export default function SavedScreen({ navigation }) {
  const { user } = useAuth();
  const {
    savedJournals,
    loading,
    fetchSavedJournals,
    unsaveJournal,
    refresh,
  } = useSavedJournals(user?.id);

  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      fetchSavedJournals();
    }, [fetchSavedJournals])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleUnsave = async (journalId, title) => {
    Alert.alert(
      'Unsave Post',
      `Remove "${title || 'this post'}" from saved?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unsave',
          onPress: async () => {
            const result = await unsaveJournal(journalId);
            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to unsave');
            }
          },
        },
      ]
    );
  };

  const navigateToDetail = (journal) => {
    // Transform saved journal to match PostDetail expected format
    const transformedJournal = {
      ...journal,
      author_display_name: journal.author_display_name,
      author_handle: journal.author_handle,
      author_avatar_url: journal.author_avatar_url,
    };
    navigation.navigate('PostDetail', { journal: transformedJournal });
  };

  const navigateToAuthor = (userId) => {
    navigation.navigate('Profile', { userId });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const renderSavedItem = (journal) => (
    <TouchableOpacity
      key={journal.id}
      style={styles.savedItem}
      onPress={() => navigateToDetail(journal)}
      activeOpacity={0.7}
    >
      {/* Thumbnail */}
      {journal.media && typeof journal.media === 'string' && journal.media.length > 0 ? (
        <Image source={{ uri: journal.media }} style={styles.thumbnail} />
      ) : (
        <View style={styles.thumbnailPlaceholder}>
          <Text style={styles.thumbnailText}>
            {(journal.headline || 'J')[0].toUpperCase()}
          </Text>
        </View>
      )}

      {/* Content */}
      <View style={styles.itemContent}>
        <Text style={styles.itemHeadline} numberOfLines={2}>
          {journal.headline || 'Untitled'}
        </Text>

        <TouchableOpacity
          style={styles.authorRow}
          onPress={() => navigateToAuthor(journal.user_id)}
        >
          <Text style={styles.authorName}>
            {journal.author_display_name || journal.author_handle || 'Unknown'}
          </Text>
        </TouchableOpacity>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>{formatDate(journal.local_date)}</Text>
          {journal.goal_title && (
            <>
              <Text style={styles.metaDot}>•</Text>
              <Text style={styles.metaText} numberOfLines={1}>
                {journal.goal_type}: {journal.goal_title}
              </Text>
            </>
          )}
        </View>

        <Text style={styles.kudosText}>{journal.kudos_count || 0} kudos</Text>
      </View>

      {/* Unsave button */}
      <TouchableOpacity
        style={styles.unsaveButton}
        onPress={() => handleUnsave(journal.id, journal.headline)}
      >
        <Text style={styles.unsaveIcon}>×</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  if (loading && savedJournals.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Saved</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loadingContainer}>
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
        <Text style={styles.headerTitle}>Saved</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {savedJournals.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No saved posts</Text>
            <Text style={styles.emptySubtitle}>
              Posts you save will appear here for easy access anytime
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            <Text style={styles.countText}>
              {savedJournals.length} saved post{savedJournals.length !== 1 ? 's' : ''}
            </Text>
            {savedJournals.map(renderSavedItem)}
          </View>
        )}
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
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  backButton: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    minWidth: 50,
  },
  headerTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
  },
  placeholder: {
    minWidth: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  list: {
    paddingTop: spacing.sm,
  },
  countText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surface,
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    marginRight: spacing.md,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  thumbnailText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleLg.fontSize,
    color: colors.onSurfaceVariant,
  },
  itemContent: {
    flex: 1,
  },
  itemHeadline: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  authorRow: {
    marginBottom: spacing.xs,
  },
  authorName: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  metaText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  metaDot: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginHorizontal: spacing.xs,
  },
  kudosText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  unsaveButton: {
    padding: spacing.sm,
    marginLeft: spacing.sm,
  },
  unsaveIcon: {
    fontSize: 24,
    fontFamily: fontFamily.regular,
    color: colors.onSurfaceVariant,
  },
  emptyState: {
    padding: spacing.xl,
    alignItems: 'center',
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
    lineHeight: 22,
  },
});
