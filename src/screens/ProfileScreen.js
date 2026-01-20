import React, { useState, useCallback, useEffect } from 'react';
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
import { useProfile } from '../hooks/useProfile';
import { useProfileStats } from '../hooks/useProfileStats';
import { useMyJournals } from '../hooks/useMyJournals';
import { useSavedJournals } from '../hooks/useSavedJournals';
import { useGoals } from '../hooks/useGoals';

const TABS = ['Journals', 'Saved', 'Goals', 'Insights'];

const PRIVACY_LABELS = {
  public: 'Public',
  friends_only: 'Friends Only',
};

export default function ProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { profile, loading: profileLoading } = useProfile(user?.id);
  const { stats, loading: statsLoading, fetchStats } = useProfileStats(user?.id);
  const {
    groupedJournals,
    loading: journalsLoading,
    loadingMore,
    hasMore,
    fetchJournals,
    loadMore,
    deleteJournal,
    refresh: refreshJournals,
  } = useMyJournals(user?.id);
  const {
    savedJournals,
    loading: savedLoading,
    fetchSavedJournals,
    unsaveJournal,
    refresh: refreshSaved,
  } = useSavedJournals(user?.id);
  const { activeGoals, loading: goalsLoading, fetchGoals } = useGoals(user?.id);

  const [activeTab, setActiveTab] = useState('Journals');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch data when screen focuses
  useFocusEffect(
    useCallback(() => {
      fetchStats();
      fetchJournals();
      fetchSavedJournals();
      fetchGoals();
    }, [fetchStats, fetchJournals, fetchSavedJournals, fetchGoals])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchStats(),
      activeTab === 'Journals' ? refreshJournals() : Promise.resolve(),
      activeTab === 'Saved' ? refreshSaved() : Promise.resolve(),
      activeTab === 'Goals' ? fetchGoals() : Promise.resolve(),
    ]);
    setRefreshing(false);
  };

  const handleDeleteJournal = (journalId, localDate) => {
    Alert.alert(
      'Delete Journal',
      'Are you sure you want to delete this journal? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteJournal(journalId);
            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to delete journal');
            } else {
              // Refresh stats to update streak
              fetchStats();

              if (result.wasToday) {
                Alert.alert(
                  'Journal Deleted',
                  "Today's journal has been deleted. You'll need to post again to unlock the feed.",
                  [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
                );
              }
            }
          },
        },
      ]
    );
  };

  const handleUnsave = async (journalId) => {
    const result = await unsaveJournal(journalId);
    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to unsave');
    }
  };

  const navigateToJournalDetail = (journal) => {
    navigation.navigate('MyJournalDetail', { journal, isOwnJournal: true });
  };

  const navigateToSavedDetail = (journal) => {
    // Transform saved journal to match PostDetail expected format
    const transformedJournal = {
      ...journal,
      author_display_name: journal.author_display_name,
      author_handle: journal.author_handle,
      author_avatar_url: journal.author_avatar_url,
    };
    navigation.navigate('PostDetail', { journal: transformedJournal });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderHeader = () => (
    <View style={styles.profileHeader}>
      {/* Avatar */}
      <View style={styles.avatarContainer}>
        {profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0 ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {(profile?.display_name || profile?.handle || '?')[0].toUpperCase()}
            </Text>
          </View>
        )}
      </View>

      {/* Name & Handle */}
      <Text style={styles.displayName}>
        {profile?.display_name || profile?.handle || 'Anonymous'}
      </Text>
      {profile?.handle && profile?.display_name && (
        <Text style={styles.handle}>@{profile.handle}</Text>
      )}

      {/* Privacy & Location badges */}
      <View style={styles.badgeRow}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>
            {PRIVACY_LABELS[profile?.account_privacy] || 'Public'}
          </Text>
        </View>
        {profile?.location_enabled && profile?.location_city && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {profile.location_city}
              {profile.location_region ? `, ${profile.location_region}` : ''}
            </Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.currentStreak}</Text>
          <Text style={styles.statLabel}>Day Streak</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalJournals}</Text>
          <Text style={styles.statLabel}>Journals</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.totalKudos}</Text>
          <Text style={styles.statLabel}>Kudos</Text>
        </View>
      </View>

      {/* Edit Profile Button */}
      <TouchableOpacity
        style={styles.editProfileButton}
        onPress={() => navigation.navigate('EditProfile')}
      >
        <Text style={styles.editProfileText}>Edit Profile</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTabs = () => (
    <View style={styles.tabs}>
      {TABS.map((tab) => {
        const isActive = activeTab === tab;
        let count = null;
        if (tab === 'Journals') count = stats.totalJournals;
        if (tab === 'Saved') count = savedJournals.length;
        if (tab === 'Goals') count = activeGoals.length;

        return (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, isActive && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
              {tab}
              {count !== null && count > 0 ? ` (${count})` : ''}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );

  const renderJournalItem = (journal) => (
    <TouchableOpacity
      key={journal.id}
      style={styles.journalItem}
      onPress={() => navigateToJournalDetail(journal)}
    >
      <View style={styles.journalItemLeft}>
        {journal.media && typeof journal.media === 'string' && journal.media.length > 0 && (
          <Image source={{ uri: journal.media }} style={styles.journalThumb} />
        )}
        <View style={styles.journalInfo}>
          <Text style={styles.journalHeadline} numberOfLines={2}>
            {journal.headline || 'Untitled'}
          </Text>
          <Text style={styles.journalDate}>{formatDate(journal.local_date)}</Text>
          {journal.goal_title && (
            <Text style={styles.journalGoal} numberOfLines={1}>
              {journal.goal_type}: {journal.goal_title}
            </Text>
          )}
        </View>
      </View>
      <View style={styles.journalItemRight}>
        <Text style={styles.kudosCount}>{journal.kudos_count || 0} kudos</Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => handleDeleteJournal(journal.id, journal.local_date)}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  const renderJournalsTab = () => {
    if (journalsLoading && groupedJournals.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      );
    }

    if (groupedJournals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No journals yet</Text>
          <Text style={styles.emptySubtitle}>
            Your daily journals will appear here
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Post')}
          >
            <Text style={styles.ctaButtonText}>Write Today's Journal</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.journalsList}>
        {groupedJournals.map((group) => (
          <View key={group.month} style={styles.journalGroup}>
            <Text style={styles.groupHeader}>{group.month}</Text>
            {group.data.map(renderJournalItem)}
          </View>
        ))}
        {loadingMore && (
          <View style={styles.loadingMore}>
            <ActivityIndicator size="small" color="#000" />
          </View>
        )}
        {hasMore && !loadingMore && (
          <TouchableOpacity style={styles.loadMoreButton} onPress={loadMore}>
            <Text style={styles.loadMoreText}>Load More</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderSavedItem = (journal) => (
    <TouchableOpacity
      key={journal.id}
      style={styles.savedItem}
      onPress={() => navigateToSavedDetail(journal)}
    >
      <View style={styles.savedItemLeft}>
        {journal.media && typeof journal.media === 'string' && journal.media.length > 0 && (
          <Image source={{ uri: journal.media }} style={styles.journalThumb} />
        )}
        <View style={styles.journalInfo}>
          <Text style={styles.journalHeadline} numberOfLines={2}>
            {journal.headline || 'Untitled'}
          </Text>
          <Text style={styles.savedAuthor}>
            by {journal.author_display_name || journal.author_handle || 'Unknown'}
          </Text>
          <Text style={styles.journalDate}>{formatDate(journal.local_date)}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={styles.unsaveButton}
        onPress={() => handleUnsave(journal.id)}
      >
        <Text style={styles.unsaveButtonText}>Unsave</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );

  const renderSavedTab = () => {
    if (savedLoading && savedJournals.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      );
    }

    if (savedJournals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No saved posts</Text>
          <Text style={styles.emptySubtitle}>
            Posts you save will appear here for easy access
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.savedList}>
        {savedJournals.map(renderSavedItem)}
      </View>
    );
  };

  const renderGoalItem = (goal) => (
    <TouchableOpacity
      key={goal.id}
      style={styles.goalItem}
      onPress={() => navigation.navigate('Goals', { screen: 'GoalEditor', params: { goal } })}
    >
      <View style={styles.goalInfo}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Text style={styles.goalType}>{goal.goal_type}</Text>
      </View>
      <Text style={styles.goalArrow}>→</Text>
    </TouchableOpacity>
  );

  const renderGoalsTab = () => {
    if (goalsLoading && activeGoals.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      );
    }

    if (activeGoals.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No active goals</Text>
          <Text style={styles.emptySubtitle}>
            Set goals to track your progress
          </Text>
          <TouchableOpacity
            style={styles.ctaButton}
            onPress={() => navigation.navigate('Goals')}
          >
            <Text style={styles.ctaButtonText}>Create a Goal</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles.goalsList}>
        {activeGoals.map(renderGoalItem)}
        <TouchableOpacity
          style={styles.viewAllGoalsButton}
          onPress={() => navigation.navigate('Goals')}
        >
          <Text style={styles.viewAllGoalsText}>View All Goals</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderInsightsTab = () => {
    const weeklyData = [
      { label: 'This Week', value: stats.journalsThisWeek },
      { label: 'Current Streak', value: stats.currentStreak },
      { label: 'Best Streak', value: stats.longestStreak },
      { label: 'Total Entries', value: stats.totalJournals },
    ];

    return (
      <View style={styles.insightsContainer}>
        <Text style={styles.insightsTitle}>Your Progress</Text>

        <View style={styles.insightsGrid}>
          {weeklyData.map((item, index) => (
            <View key={index} style={styles.insightCard}>
              <Text style={styles.insightValue}>{item.value}</Text>
              <Text style={styles.insightLabel}>{item.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.insightsTip}>
          <Text style={styles.tipTitle}>Keep Going!</Text>
          <Text style={styles.tipText}>
            {stats.currentStreak > 0
              ? `You're on a ${stats.currentStreak}-day streak! Don't break the chain.`
              : 'Start a streak by posting today. Consistency builds habits!'}
          </Text>
        </View>
      </View>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Journals':
        return renderJournalsTab();
      case 'Saved':
        return renderSavedTab();
      case 'Goals':
        return renderGoalsTab();
      case 'Insights':
        return renderInsightsTab();
      default:
        return null;
    }
  };

  const loading = profileLoading || statsLoading;

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Profile</Text>
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
        <Text style={styles.headerTitle}>Profile</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
          <Text style={styles.settingsButton}>Settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {renderHeader()}
        {renderTabs()}
        {renderTabContent()}
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
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
  },
  settingsButton: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    minWidth: 60,
    textAlign: 'right',
  },
  placeholder: {
    minWidth: 60,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },

  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  avatarContainer: {
    marginBottom: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
  },
  displayName: {
    fontSize: 20,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  handle: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 20,
  },
  badge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#999',
    marginTop: 4,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: '#eee',
  },
  editProfileButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },

  // Tabs
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
    fontSize: 12,
    fontWeight: '500',
    color: '#999',
    letterSpacing: 0.5,
  },
  tabTextActive: {
    color: '#000',
  },

  // Journals Tab
  journalsList: {
    paddingTop: 16,
  },
  journalGroup: {
    marginBottom: 24,
  },
  groupHeader: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 2,
    color: '#999',
    textTransform: 'uppercase',
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  journalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  journalItemLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  journalThumb: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  journalInfo: {
    flex: 1,
  },
  journalHeadline: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  journalDate: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
  },
  journalGoal: {
    fontSize: 11,
    fontWeight: '300',
    color: '#666',
    marginTop: 2,
  },
  journalItemRight: {
    alignItems: 'flex-end',
    marginLeft: 12,
  },
  kudosCount: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    marginBottom: 8,
  },
  deleteButton: {
    padding: 4,
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#c00',
  },
  loadingMore: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  loadMoreText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },

  // Saved Tab
  savedList: {
    paddingTop: 16,
  },
  savedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  savedItemLeft: {
    flexDirection: 'row',
    flex: 1,
    alignItems: 'center',
  },
  savedAuthor: {
    fontSize: 12,
    fontWeight: '300',
    color: '#666',
    marginBottom: 2,
  },
  unsaveButton: {
    padding: 8,
  },
  unsaveButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#999',
  },

  // Goals Tab
  goalsList: {
    paddingTop: 16,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  goalInfo: {
    flex: 1,
  },
  goalTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
  },
  goalType: {
    fontSize: 11,
    fontWeight: '400',
    color: '#999',
    textTransform: 'capitalize',
  },
  goalArrow: {
    fontSize: 16,
    fontWeight: '300',
    color: '#ccc',
  },
  viewAllGoalsButton: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  viewAllGoalsText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    textDecorationLine: 'underline',
  },

  // Insights Tab
  insightsContainer: {
    padding: 24,
  },
  insightsTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    marginBottom: 20,
    textAlign: 'center',
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  insightCard: {
    width: '47%',
    backgroundColor: '#f8f8f8',
    padding: 20,
    alignItems: 'center',
    borderRadius: 8,
  },
  insightValue: {
    fontSize: 28,
    fontWeight: '600',
    color: '#000',
  },
  insightLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    marginTop: 6,
    textAlign: 'center',
  },
  insightsTip: {
    backgroundColor: '#f0f0f0',
    padding: 20,
    borderRadius: 8,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  tipText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#666',
    lineHeight: 20,
  },

  // Empty States
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
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#000',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  ctaButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 1,
  },
});
