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

const FILTER_OPTIONS = [
  { key: FeedFilter.DISCOVER, label: 'Discover' },
  { key: FeedFilter.SIMILAR_GOALS, label: 'Goals' },
  { key: FeedFilter.FRIENDS, label: 'Friends' },
  { key: FeedFilter.NEARBY, label: 'Nearby' },
  { key: FeedFilter.SAVED, label: 'Saved' },
];

export default function GateScreen({ navigation }) {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const {
    gateState,
    loading,
    timeRemaining,
    formatTimeRemaining,
    getNextResetTime,
    refreshState,
    startTracking,
    stopTracking,
    isTracking,
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
      // Navigate to Goals tab, then to GoalEditor
      navigation.navigate('Goals', {
        screen: 'GoalEditor',
        params: { goal: null },
      });
    }
  }, [goalsLoading, loading, goals, navigation]);

  // Refresh state when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refreshState();
    }, [refreshState])
  );

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

  // Calculate timer color
  const getTimerColor = () => {
    if (timeRemaining <= 60) return '#c00';
    if (timeRemaining <= 120) return '#f80';
    return '#000';
  };

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

    let message = 'No posts to show';
    let subtitle = '';

    switch (filter) {
      case FeedFilter.DISCOVER:
        message = 'Nothing to discover yet';
        subtitle = 'Check back soon as more people post';
        break;
      case FeedFilter.FRIENDS:
        message = 'No posts from friends yet';
        subtitle = 'Add friends to see their posts here';
        break;
      case FeedFilter.NEARBY:
        message = 'No nearby posts';
        subtitle = 'No one near you has posted recently';
        break;
      case FeedFilter.SAVED:
        message = 'No saved posts';
        subtitle = 'Posts you save will appear here';
        break;
      case FeedFilter.SIMILAR_GOALS:
        message = 'No similar goal posts';
        subtitle = 'Add goals to see posts from people with similar interests';
        break;
    }

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>{message}</Text>
        {subtitle && <Text style={styles.emptyStateSubtitle}>{subtitle}</Text>}
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

          <View style={styles.timesUpActions}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.primaryButtonText}>View My Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => navigation.navigate('Saved')}
            >
              <Text style={styles.secondaryButtonText}>View Saved Posts</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={() => navigation.navigate('Post', { draftMode: 'tomorrow' })}
            >
              <Text style={styles.tertiaryButtonText}>Draft Tomorrow's Post</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.tertiaryButton}
              onPress={() => navigation.navigate('Goals')}
            >
              <Text style={styles.tertiaryButtonText}>View Goals</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // NEEDS_POST state
  if (gateState === GateState.NEEDS_POST) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.logo}>ASPYRE</Text>
          <Text style={styles.greeting}>
            {profile?.display_name
              ? `Welcome back, ${profile.display_name.split(' ')[0]}`
              : 'Welcome back'}
          </Text>
          <Text style={styles.subtitle}>
            Post first to unlock inspiration
          </Text>

          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => navigation.navigate('Post')}
          >
            <Text style={styles.primaryButtonText}>Post Today's Journal</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.linkButtonText}>View Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => navigation.navigate('Goals')}
            >
              <Text style={styles.linkButtonText}>View Goals</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.explainer}>
            <Text style={styles.explainerText}>
              Share your progress first, then see what others are working on.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // FEED_UNLOCKED state - show feed inline
  return (
    <SafeAreaView style={styles.container}>
      {/* Timer Header */}
      <View style={styles.timerHeader}>
        <Text style={styles.headerLogo}>ASPYRE</Text>
        <View style={styles.timerContainer}>
          <Text style={[styles.timer, { color: getTimerColor() }]}>
            {formatTimeRemaining()}
          </Text>
          <Text style={styles.timerLabel}>remaining</Text>
        </View>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('Profile')}
        >
          {profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0 ? (
            <Image
              source={{ uri: profile.avatar_url }}
              style={styles.profilePic}
            />
          ) : (
            <View style={styles.profilePicPlaceholder}>
              <Text style={styles.profilePicInitial}>
                {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Filter Chips */}
      <View style={styles.filterContainer}>
        <FlatList
          horizontal
          data={FILTER_OPTIONS}
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
          data={journals}
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
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* Tracking Indicator */}
      <View style={styles.trackingIndicator}>
        <View style={[styles.trackingDot, isTracking && styles.trackingDotActive]} />
        <Text style={styles.trackingText}>
          {isTracking ? 'Timer running' : 'Timer paused'}
        </Text>
      </View>

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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
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
  timesUpActions: {
    width: '100%',
    alignItems: 'center',
  },
  // Feed styles
  timerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLogo: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 4,
    color: '#000',
    width: 80,
  },
  timerContainer: {
    alignItems: 'center',
  },
  timer: {
    fontSize: 20,
    fontWeight: '500',
    letterSpacing: 2,
    fontVariant: ['tabular-nums'],
  },
  timerLabel: {
    fontSize: 10,
    fontWeight: '300',
    color: '#999',
    letterSpacing: 1,
    marginTop: 2,
  },
  profileButton: {
    width: 80,
    alignItems: 'flex-end',
  },
  profilePic: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  profilePicPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f0f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profilePicInitial: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
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
  },
  trackingIndicator: {
    position: 'absolute',
    bottom: 24,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  trackingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  trackingDotActive: {
    backgroundColor: '#0c0',
  },
  trackingText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
    letterSpacing: 0.5,
  },
});
