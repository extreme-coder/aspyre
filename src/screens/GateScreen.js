import React, { useCallback, useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Alert,
  Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useGateState, GateState } from '../hooks/useGateState';
import { useFeed, FeedFilter } from '../hooks/useFeed';
import { useGoals } from '../hooks/useGoals';
import { useImpressions } from '../hooks/useImpressions';
import FeedCard from '../components/FeedCard';
import ReportModal from '../components/ReportModal';
import NotificationBadge from '../components/NotificationBadge';
import OfflineBanner from '../components/OfflineBanner';
import { Ionicons } from '@expo/vector-icons';

const FILTER_OPTIONS = [
  { key: FeedFilter.DISCOVER, label: 'Discover' },
  { key: FeedFilter.SIMILAR_GOALS, label: 'Goals' },
  { key: FeedFilter.FRIENDS, label: 'Friends' },
  { key: FeedFilter.NEARBY, label: 'Nearby' },
];

// Limited filters for PREVIEW_MODE (new users)
const PREVIEW_FILTER_OPTIONS = [
  { key: FeedFilter.DISCOVER, label: 'Discover' },
];

// Limited filters for NEEDS_POST (active users who haven't posted today)
const NEEDS_POST_FILTER_OPTIONS = [
  { key: FeedFilter.FRIENDS, label: 'Friends' },
];

export default function GateScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const {
    gateState,
    loading,
    getNextResetTime,
    refreshState,
    startTracking,
    stopTracking,
  } = useGateState(user?.id, profile?.timezone);

  const {
    journals,
    loading: feedLoading,
    loadingMore,
    error: feedError,
    hasMore,
    filter,
    changeFilter,
    loadMore,
    refresh: refreshFeed,
    updateKudos,
    updateSaved,
    removeFromFeed,
  } = useFeed(user?.id);

  const { goals, loading: goalsLoading } = useGoals(user?.id);

  const { recordImpression, clearSessionTracking } = useImpressions(user?.id);

  const [refreshing, setRefreshing] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingJournal, setReportingJournal] = useState(null);

  // Track if we've checked for first-time user (to prevent infinite navigation)
  const hasCheckedFirstTime = useRef(false);

  // First-time user redirect: if no goals, navigate to GoalEditor
  useEffect(() => {
    if (
      !goalsLoading &&
      !loading &&
      goals.length === 0 &&
      !hasCheckedFirstTime.current
    ) {
      hasCheckedFirstTime.current = true;
      // Navigate to GoalEditor for first-time setup
      navigation.navigate('GoalEditor', { goal: null });
    }
  }, [goalsLoading, loading, goals, navigation]);

  // Refresh state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshState();
    }, [refreshState])
  );

  // Set appropriate filter based on gate state
  useEffect(() => {
    if (gateState === GateState.PREVIEW_MODE) {
      // New users see Discover preview
      if (filter !== FeedFilter.DISCOVER) {
        changeFilter(FeedFilter.DISCOVER);
      }
    } else if (gateState === GateState.NEEDS_POST) {
      // Active users who haven't posted see Friends only
      if (filter !== FeedFilter.FRIENDS) {
        changeFilter(FeedFilter.FRIENDS);
      }
    }
  }, [gateState, filter, changeFilter]);

  // Start/stop tracking when feed is unlocked
  useFocusEffect(
    useCallback(() => {
      if (gateState === GateState.FEED_UNLOCKED) {
        startTracking();
        return () => {
          stopTracking();
        };
      }
    }, [gateState, startTracking, stopTracking])
  );

  // Handle pull to refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    refreshState();
    clearSessionTracking(); // Clear impression tracking on refresh
    await refreshFeed();
    setRefreshing(false);
  }, [refreshState, refreshFeed, clearSessionTracking]);

  // Handle filter change
  const handleFilterChange = useCallback((newFilter) => {
    if (newFilter === FeedFilter.NEARBY && !profile?.location_enabled) {
      Alert.alert(
        'Location Required',
        'Enable location sharing in Settings to see posts from people nearby.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => navigation.navigate('Settings'),
          },
        ]
      );
      return;
    }
    changeFilter(newFilter);
  }, [changeFilter, profile?.location_enabled, navigation]);

  // Handle report
  const handleReport = useCallback((journal) => {
    setReportingJournal(journal);
    setReportModalVisible(true);
  }, []);

  // Render filter chip
  const renderFilterChip = (option) => {
    const isActive = filter === option.key;
    return (
      <TouchableOpacity
        key={option.key}
        style={[styles.filterChip, isActive && styles.filterChipActive]}
        onPress={() => handleFilterChange(option.key)}
      >
        <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
          {option.label}
        </Text>
      </TouchableOpacity>
    );
  };

  // Navigate to post detail
  const handlePostPress = useCallback((journal) => {
    navigation.navigate('PostDetail', { journal });
  }, [navigation]);

  // Navigate to author profile
  const handleAuthorPress = useCallback((authorId) => {
    navigation.navigate('Profile', { userId: authorId });
  }, [navigation]);

  // Render feed card with impression tracking
  const renderItem = useCallback(({ item }) => {
    // Record impression when post is rendered (visible)
    if (filter === FeedFilter.DISCOVER) {
      recordImpression(item.id, item.user_id);
    }

    // Show Add Friend button on Discover feed for non-friends
    const showAddFriend = filter === FeedFilter.DISCOVER && !item.is_friend;

    return (
      <FeedCard
        journal={item}
        userId={user?.id}
        onKudosUpdate={updateKudos}
        onSavedUpdate={updateSaved}
        onHide={removeFromFeed}
        onReport={handleReport}
        onPress={handlePostPress}
        onAuthorPress={handleAuthorPress}
        showAddFriend={showAddFriend}
      />
    );
  }, [user?.id, updateKudos, updateSaved, removeFromFeed, handleReport, handlePostPress, handleAuthorPress, filter, recordImpression]);

  // Render footer
  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#000" />
      </View>
    );
  };

  // Render empty state
  const renderEmpty = () => {
    if (feedLoading) return null;

    let icon = 'earth-outline';
    let message = 'No posts to show';
    let subtitle = '';
    let buttonText = '';
    let onButtonPress = null;

    switch (filter) {
      case FeedFilter.DISCOVER:
        icon = 'compass-outline';
        message = 'Nothing to discover yet';
        subtitle = 'Find people to follow and see their posts here';
        buttonText = 'Discover People';
        onButtonPress = () => navigation.navigate('Discover');
        break;
      case FeedFilter.FRIENDS:
        icon = 'people-outline';
        message = 'No posts from friends yet';
        subtitle = 'Connect with people to see their updates';
        buttonText = 'Find Friends';
        onButtonPress = () => navigation.navigate('Discover');
        break;
      case FeedFilter.NEARBY:
        icon = 'location-outline';
        message = 'No nearby posts';
        subtitle = 'No one near you has posted recently';
        break;
      case FeedFilter.SIMILAR_GOALS:
        icon = 'flag-outline';
        message = 'No similar goal posts';
        subtitle = 'Create goals to find people with shared interests';
        buttonText = 'Create Goal';
        onButtonPress = () => navigation.navigate('GoalEditor', { goal: null });
        break;
    }

    return (
      <View style={styles.emptyState}>
        <Ionicons name={icon} size={48} color="#ccc" style={styles.emptyStateIcon} />
        <Text style={styles.emptyStateTitle}>{message}</Text>
        {subtitle && <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>}
        {buttonText && onButtonPress && (
          <TouchableOpacity style={styles.emptyStateButton} onPress={onButtonPress}>
            <Text style={styles.emptyStateButtonText}>{buttonText}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Loading state
  if (loading || gateState === GateState.LOADING) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  // TIME_LIMIT_REACHED state
  if (gateState === GateState.TIME_LIMIT_REACHED) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.logo}>ASPYRE</Text>
          <Text style={styles.timesUpTitle}>Time's Up!</Text>
          <Text style={styles.timesUpSubtitle}>
            You've used your feed time for today.{'\n'}
            Come back tomorrow to see more.
          </Text>
          <Text style={styles.resetTime}>
            Resets at {getNextResetTime()}
          </Text>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => navigation.navigate('Saved')}
          >
            <Text style={styles.secondaryButtonText}>View Saved Posts</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Determine which filter options to show based on gate state
  const getFilterOptions = () => {
    if (gateState === GateState.PREVIEW_MODE) {
      return PREVIEW_FILTER_OPTIONS;
    }
    if (gateState === GateState.NEEDS_POST) {
      return NEEDS_POST_FILTER_OPTIONS;
    }
    return FILTER_OPTIONS;
  };

  // Check if current state allows feed viewing
  const canViewFeed = gateState === GateState.FEED_UNLOCKED ||
                      gateState === GateState.PREVIEW_MODE ||
                      gateState === GateState.NEEDS_POST;

  // Feed viewing states (PREVIEW_MODE, NEEDS_POST, FEED_UNLOCKED)
  if (canViewFeed) {
    const currentFilterOptions = getFilterOptions();
    const isPreviewMode = gateState === GateState.PREVIEW_MODE;
    const isNeedsPost = gateState === GateState.NEEDS_POST;

    // Limit to 5 posts in preview mode
    const displayJournals = isPreviewMode ? journals.slice(0, 5) : journals;

    return (
      <SafeAreaView style={styles.container}>
        {/* Offline Banner */}
        <OfflineBanner onRetry={handleRefresh} />

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft} />
          <Text style={styles.headerTitle}>ASPYRE</Text>
          <NotificationBadge />
        </View>

        {/* Soft Gate Banner for PREVIEW_MODE */}
        {isPreviewMode && (
          <View style={styles.previewBanner}>
            <Text style={styles.previewBannerText}>
              Post your first journal to unlock the full feed
            </Text>
            <TouchableOpacity
              style={styles.previewBannerButton}
              onPress={() => navigation.navigate('Post')}
            >
              <Text style={styles.previewBannerButtonText}>Post Now</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Soft Gate Banner for NEEDS_POST */}
        {isNeedsPost && (
          <View style={styles.needsPostBanner}>
            <Text style={styles.needsPostBannerText}>
              Post today to unlock Discover
            </Text>
            <TouchableOpacity
              style={styles.needsPostBannerButton}
              onPress={() => navigation.navigate('Post')}
            >
              <Text style={styles.needsPostBannerButtonText}>Post</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Filter Chips */}
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={currentFilterOptions}
            renderItem={({ item }) => renderFilterChip(item)}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterList}
          />
        </View>

        {/* Feed Content */}
        {feedLoading && journals.length === 0 ? (
          <View style={styles.feedLoadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        ) : feedError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Something went wrong</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refreshFeed}>
              <Text style={styles.retryButtonText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={displayJournals}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.feedContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor="#000"
              />
            }
            onEndReached={!isPreviewMode ? loadMore : undefined}
            onEndReachedThreshold={0.5}
            ListFooterComponent={!isPreviewMode ? renderFooter : null}
            ListEmptyComponent={renderEmpty}
          />
        )}

        {/* Preview Mode Footer - CTA to post */}
        {isPreviewMode && displayJournals.length > 0 && (
          <View style={styles.previewFooter}>
            <Text style={styles.previewFooterText}>
              Post your first journal to see more
            </Text>
            <TouchableOpacity
              style={styles.previewFooterButton}
              onPress={() => navigation.navigate('Post')}
            >
              <Text style={styles.previewFooterButtonText}>Get Started</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Report Modal */}
        <ReportModal
          visible={reportModalVisible}
          onClose={() => {
            setReportModalVisible(false);
            setReportingJournal(null);
          }}
          journal={reportingJournal}
          userId={user?.id}
        />
      </SafeAreaView>
    );
  }

  // Fallback (should not reach here)
  return null;
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
    paddingVertical: 12,
  },
  headerLeft: {
    width: 44,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 4,
    color: '#000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 28,
    fontWeight: '300',
    letterSpacing: 8,
    color: '#000',
    marginBottom: 48,
  },
  greeting: {
    fontSize: 24,
    fontWeight: '200',
    letterSpacing: 1,
    color: '#000',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 0.5,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#000',
    paddingVertical: 16,
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
    marginBottom: 12,
  },
  secondaryButtonText: {
    color: '#000',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
  },
  tertiaryButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  tertiaryButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 1,
  },
  secondaryActions: {
    marginTop: 16,
  },
  linkButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  linkButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 1,
  },
  explainer: {
    position: 'absolute',
    bottom: 60,
    left: 32,
    right: 32,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 20,
  },
  explainerText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
    textAlign: 'center',
    lineHeight: 18,
  },
  // Time's Up styles
  timesUpTitle: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 2,
    color: '#000',
    marginBottom: 12,
  },
  timesUpSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  resetTime: {
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 1,
    marginBottom: 40,
  },
  // Feed styles
  filterContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  filterList: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  filterChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#000',
    borderColor: '#000',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 0.5,
  },
  filterChipTextActive: {
    color: '#fff',
  },
  feedLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
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
  feedContent: {
    padding: 16,
    paddingBottom: 80,
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyState: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  emptyStateIcon: {
    marginBottom: 16,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#999',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  emptyStateButton: {
    marginTop: 20,
    backgroundColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
  },
  // Preview mode banner (new users)
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  previewBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: '#333',
    marginRight: 12,
  },
  previewBannerButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  previewBannerButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Needs post banner (active users)
  needsPostBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fffdf0',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0e8c0',
  },
  needsPostBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '400',
    color: '#665500',
    marginRight: 12,
  },
  needsPostBannerButton: {
    backgroundColor: '#000',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  needsPostBannerButtonText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  // Preview mode footer
  previewFooter: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  previewFooterText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
    marginBottom: 12,
  },
  previewFooterButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  previewFooterButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
});
