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
import HeaderProfileButton from '../components/HeaderProfileButton';

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
        <Text style={styles.headerTitle}>Saved</Text>
        <HeaderProfileButton />
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
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
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
    paddingBottom: 40,
  },
  list: {
    paddingTop: 8,
  },
  countText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  savedItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  thumbnail: {
    width: 60,
    height: 60,
    borderRadius: 4,
    marginRight: 14,
  },
  thumbnailPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  thumbnailText: {
    fontSize: 20,
    fontWeight: '500',
    color: '#999',
  },
  itemContent: {
    flex: 1,
  },
  itemHeadline: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 6,
    lineHeight: 20,
  },
  authorRow: {
    marginBottom: 4,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
  },
  metaDot: {
    fontSize: 12,
    fontWeight: '300',
    color: '#ccc',
    marginHorizontal: 6,
  },
  kudosText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#999',
  },
  unsaveButton: {
    padding: 8,
    marginLeft: 8,
  },
  unsaveIcon: {
    fontSize: 24,
    fontWeight: '300',
    color: '#ccc',
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
    lineHeight: 22,
  },
});
