import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Image,
  Alert,
  Modal,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useProfileStats } from '../hooks/useProfileStats';
import { useMyJournals } from '../hooks/useMyJournals';
import { useGoals } from '../hooks/useGoals';
import { useFriends } from '../hooks/useFriends';
import { useBlocks } from '../hooks/useBlocks';
import { supabase } from '../config/supabase';

const TABS = ['Journals', 'Goals', 'Insights'];
const OTHER_USER_TABS = ['Journals', 'Goals'];

const PRIVACY_LABELS = {
  public: 'Public',
  friends: 'Friends Only',
  friends_only: 'Friends Only',
};

export default function ProfileScreen({ route, navigation }) {
  const { user } = useAuth();
  const viewingUserId = route.params?.userId;
  const isOwnProfile = !viewingUserId || viewingUserId === user?.id;
  const targetUserId = isOwnProfile ? user?.id : viewingUserId;

  // Own profile hooks
  const { profile: ownProfile, loading: ownProfileLoading } = useProfile(isOwnProfile ? user?.id : null);
  const { stats, loading: statsLoading, fetchStats } = useProfileStats(isOwnProfile ? user?.id : null);
  const {
    groupedJournals,
    loading: journalsLoading,
    loadingMore,
    hasMore,
    fetchJournals,
    loadMore,
    deleteJournal,
    refresh: refreshJournals,
  } = useMyJournals(isOwnProfile ? user?.id : null);
  const { activeGoals, loading: goalsLoading, fetchGoals } = useGoals(isOwnProfile ? user?.id : null);

  // Other user profile state
  const [otherProfile, setOtherProfile] = useState(null);
  const [otherProfileLoading, setOtherProfileLoading] = useState(!isOwnProfile);
  const [otherJournals, setOtherJournals] = useState([]);
  const [otherJournalsLoading, setOtherJournalsLoading] = useState(false);
  const [otherGoals, setOtherGoals] = useState([]);
  const [otherGoalsLoading, setOtherGoalsLoading] = useState(false);
  const [profileError, setProfileError] = useState(null);

  // Friend functionality
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

  const [actionLoading, setActionLoading] = useState(false);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [requestNote, setRequestNote] = useState('');

  const relationshipStatus = !isOwnProfile ? getRelationshipStatus(viewingUserId) : null;
  const blocked = !isOwnProfile ? isBlocked(viewingUserId) : false;

  // Find the relevant request for this user
  const incomingRequest = !isOwnProfile ? incomingRequests.find(r => r.sender?.id === viewingUserId) : null;
  const outgoingRequest = !isOwnProfile ? outgoingRequests.find(r => r.recipient?.id === viewingUserId) : null;

  const [activeTab, setActiveTab] = useState('Journals');
  const [refreshing, setRefreshing] = useState(false);

  // Get the profile to display
  const profile = isOwnProfile ? ownProfile : otherProfile;

  // Fetch other user's profile
  const fetchOtherProfile = useCallback(async () => {
    if (isOwnProfile || !viewingUserId) return;

    setOtherProfileLoading(true);
    setProfileError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', viewingUserId)
        .single();

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setProfileError('This profile is not available');
        } else {
          throw fetchError;
        }
      } else {
        setOtherProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfileError('Failed to load profile');
    } finally {
      setOtherProfileLoading(false);
    }
  }, [isOwnProfile, viewingUserId]);

  // Fetch other user's public journals
  const fetchOtherJournals = useCallback(async () => {
    if (isOwnProfile || !viewingUserId) return;

    setOtherJournalsLoading(true);
    try {
      const { data, error } = await supabase
        .rpc('get_user_public_journals', {
          p_user_id: viewingUserId,
          p_viewer_id: user?.id,
          p_limit: 20,
        });

      if (error) throw error;
      setOtherJournals(data || []);
    } catch (err) {
      console.error('Error fetching journals:', err);
    } finally {
      setOtherJournalsLoading(false);
    }
  }, [isOwnProfile, viewingUserId, user?.id]);

  // Fetch other user's goals
  const fetchOtherGoals = useCallback(async () => {
    if (isOwnProfile || !viewingUserId) return;

    setOtherGoalsLoading(true);
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('id, title, goal_type, created_at')
        .eq('user_id', viewingUserId)
        .eq('is_archived', false)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOtherGoals(data || []);
    } catch (err) {
      console.error('Error fetching goals:', err);
    } finally {
      setOtherGoalsLoading(false);
    }
  }, [isOwnProfile, viewingUserId]);

  // Fetch data when screen focuses (own profile)
  useFocusEffect(
    useCallback(() => {
      if (isOwnProfile) {
        fetchStats();
        fetchJournals();
        fetchGoals();
      } else {
        fetchOtherProfile();
        fetchOtherJournals();
        fetchOtherGoals();
        fetchFriends();
      }
    }, [isOwnProfile, fetchStats, fetchJournals, fetchGoals, fetchOtherProfile, fetchOtherJournals, fetchOtherGoals, fetchFriends])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    if (isOwnProfile) {
      await Promise.all([
        fetchStats(),
        activeTab === 'Journals' ? refreshJournals() : Promise.resolve(),
        activeTab === 'Goals' ? fetchGoals() : Promise.resolve(),
      ]);
    } else {
      await Promise.all([
        fetchOtherProfile(),
        fetchOtherJournals(),
        fetchOtherGoals(),
        fetchFriends(),
      ]);
    }
    setRefreshing(false);
  };

  // Friend request handlers
  const handleSendRequest = async () => {
    setShowNoteModal(true);
  };

  const confirmSendRequest = async () => {
    setShowNoteModal(false);
    setActionLoading(true);

    const result = await sendFriendRequest(viewingUserId, requestNote.trim() || null);

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
            const result = await removeFriend(viewingUserId);
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
            const result = await blockUser(viewingUserId);
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
              fetchStats();
              if (result.wasToday) {
                Alert.alert(
                  'Journal Deleted',
                  "Today's journal has been deleted. You'll need to post again to unlock the feed.",
                  [{ text: 'OK', onPress: () => navigation.navigate('MainTabs', { screen: 'Home' }) }]
                );
              }
            }
          },
        },
      ]
    );
  };

  const navigateToJournalDetail = (journal) => {
    navigation.navigate('MyJournalDetail', { journal, isOwnJournal: true });
  };

  const navigateToOtherJournalDetail = (journal) => {
    navigation.navigate('PostDetail', { journal });
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderActionButton = () => {
    if (actionLoading) {
      return (
        <View style={styles.singleActionButton}>
          <ActivityIndicator size="small" color="#000" />
        </View>
      );
    }

    switch (relationshipStatus) {
      case 'friends':
        return (
          <View style={styles.friendActionButtons}>
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
          <View style={styles.friendActionButtons}>
            <TouchableOpacity style={styles.friendActionButton} onPress={handleAcceptRequest}>
              <Text style={styles.friendActionButtonText}>Accept Request</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.declineButton} onPress={handleDeclineRequest}>
              <Text style={styles.declineButtonText}>Decline</Text>
            </TouchableOpacity>
          </View>
        );

      default:
        return (
          <TouchableOpacity style={styles.singleActionButton} onPress={handleSendRequest}>
            <Text style={styles.friendActionButtonText}>Add Friend</Text>
          </TouchableOpacity>
        );
    }
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

      {/* Stats (own profile only) */}
      {isOwnProfile && (
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
      )}

      {/* Edit Profile & Saved Buttons (own profile) or Friend Actions (other user) */}
      {isOwnProfile ? (
        <View style={styles.profileButtonsRow}>
          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editProfileText}>Edit Profile</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.savedButton}
            onPress={() => navigation.navigate('Saved')}
          >
            <Text style={styles.savedButtonText}>Saved</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.friendActionSection}>
          {renderActionButton()}
        </View>
      )}

      {/* Request Note (if received from other user) */}
      {!isOwnProfile && incomingRequest?.note && (
        <View style={styles.noteSection}>
          <Text style={styles.noteLabel}>Their message:</Text>
          <Text style={styles.noteText}>"{incomingRequest.note}"</Text>
        </View>
      )}

      {/* Info about visibility for other users */}
      {!isOwnProfile && profile?.account_privacy === 'friends' && relationshipStatus !== 'friends' && (
        <View style={styles.infoSection}>
          <Text style={styles.infoText}>
            This is a friends-only account. Become friends to see their posts.
          </Text>
        </View>
      )}
    </View>
  );

  const getTabIcon = (tab, isActive) => {
    const icons = {
      Journals: isActive ? 'book' : 'book-outline',
      Goals: isActive ? 'flag' : 'flag-outline',
      Insights: isActive ? 'stats-chart' : 'stats-chart-outline',
    };
    return icons[tab] || 'ellipse-outline';
  };

  const renderTabs = () => {
    const tabs = isOwnProfile ? TABS : OTHER_USER_TABS;

    return (
      <View style={styles.tabs}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab;

          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Ionicons
                name={getTabIcon(tab, isActive)}
                size={22}
                color={isActive ? '#000' : '#999'}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

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

  const renderOtherJournalItem = (journal) => (
    <TouchableOpacity
      key={journal.id}
      style={styles.journalItem}
      onPress={() => navigateToOtherJournalDetail(journal)}
    >
      <View style={styles.journalItemLeft}>
        {journal.hero_image && typeof journal.hero_image === 'string' && journal.hero_image.length > 0 && (
          <Image source={{ uri: journal.hero_image }} style={styles.journalThumb} />
        )}
        <View style={styles.journalInfo}>
          <Text style={styles.journalHeadline} numberOfLines={2}>
            {journal.headline || 'Untitled'}
          </Text>
          <Text style={styles.journalDate}>{formatDate(journal.created_at)}</Text>
        </View>
      </View>
      <View style={styles.journalItemRight}>
        <Text style={styles.kudosCount}>{journal.kudos_count || 0} kudos</Text>
      </View>
    </TouchableOpacity>
  );

  const renderJournalsTab = () => {
    if (isOwnProfile) {
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
              onPress={() => navigation.navigate('MainTabs', { screen: 'Post' })}
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
    } else {
      // Other user's journals
      if (otherJournalsLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        );
      }

      if (otherJournals.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No visible journals</Text>
            <Text style={styles.emptySubtitle}>
              {profile?.account_privacy === 'friends' && relationshipStatus !== 'friends'
                ? 'Become friends to see their journals'
                : 'This user hasn\'t shared any journals yet'}
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.journalsList}>
          {otherJournals.map(renderOtherJournalItem)}
        </View>
      );
    }
  };

  const renderGoalItem = (goal) => (
    <TouchableOpacity
      key={goal.id}
      style={styles.goalItem}
      onPress={() => navigation.navigate('MainTabs', { screen: 'Goals', params: { screen: 'GoalEditor', params: { goal } } })}
    >
      <View style={styles.goalInfo}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Text style={styles.goalType}>{goal.goal_type}</Text>
      </View>
      <Text style={styles.goalArrow}>→</Text>
    </TouchableOpacity>
  );

  const renderOtherGoalItem = (goal) => (
    <View key={goal.id} style={styles.goalItem}>
      <View style={styles.goalInfo}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Text style={styles.goalType}>{goal.goal_type}</Text>
      </View>
    </View>
  );

  const renderGoalsTab = () => {
    if (isOwnProfile) {
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
              onPress={() => navigation.navigate('MainTabs', { screen: 'Goals' })}
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
            onPress={() => navigation.navigate('MainTabs', { screen: 'Goals' })}
          >
            <Text style={styles.viewAllGoalsText}>View All Goals</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      // Other user's goals
      if (otherGoalsLoading) {
        return (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#000" />
          </View>
        );
      }

      if (otherGoals.length === 0) {
        return (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No goals</Text>
            <Text style={styles.emptySubtitle}>
              This user hasn't set any goals yet
            </Text>
          </View>
        );
      }

      return (
        <View style={styles.goalsList}>
          {otherGoals.map(renderOtherGoalItem)}
        </View>
      );
    }
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
      case 'Goals':
        return renderGoalsTab();
      case 'Insights':
        return renderInsightsTab();
      default:
        return null;
    }
  };

  const loading = isOwnProfile
    ? (ownProfileLoading || statsLoading)
    : otherProfileLoading;

  if (loading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        {!isOwnProfile && (
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backButton}>Back</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Profile</Text>
            <View style={styles.placeholder} />
          </View>
        )}
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (!isOwnProfile && (profileError || !profile)) {
    return (
      <SafeAreaView style={styles.container}>
        <TouchableOpacity style={styles.backIconButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <View style={styles.errorState}>
          <Text style={styles.errorTitle}>{profileError || 'Profile not found'}</Text>
          <Text style={styles.errorSubtitle}>
            This profile may be private or the user may have blocked you.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {!isOwnProfile && (
        <>
          <TouchableOpacity style={styles.backIconButton} onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuIconButton} onPress={() => setShowOptionsMenu(true)}>
            <Ionicons name="ellipsis-horizontal" size={24} color="#000" />
          </TouchableOpacity>
        </>
      )}

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

      {/* Note Modal for friend requests */}
      {!isOwnProfile && (
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
      )}

      {/* Options Menu Modal */}
      {!isOwnProfile && (
        <Modal
          visible={showOptionsMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowOptionsMenu(false)}
        >
          <TouchableOpacity
            style={styles.optionsOverlay}
            activeOpacity={1}
            onPress={() => setShowOptionsMenu(false)}
          >
            <View style={styles.optionsMenu}>
              <TouchableOpacity
                style={styles.optionItem}
                onPress={() => {
                  setShowOptionsMenu(false);
                  handleBlock();
                }}
              >
                <Ionicons name="ban-outline" size={20} color="#c00" />
                <Text style={styles.optionTextDanger}>Block User</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.optionItemCancel}
                onPress={() => setShowOptionsMenu(false)}
              >
                <Text style={styles.optionTextCancel}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  backIconButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  menuIconButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  optionsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  optionsMenu: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 8,
    paddingBottom: 34,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 12,
  },
  optionTextDanger: {
    fontSize: 16,
    fontWeight: '500',
    color: '#c00',
  },
  optionItemCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    marginTop: 8,
  },
  optionTextCancel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
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
    width: '48%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editProfileText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
  profileButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'stretch',
  },
  savedButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  savedButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },

  // Friend action section
  friendActionSection: {
    alignSelf: 'stretch',
  },
  friendActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  singleActionButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendActionButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendActionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
  pendingButton: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
  friendBadge: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  friendBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
  removeButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
  declineButton: {
    width: '48%',
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
  noteSection: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginTop: 20,
    width: '100%',
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
    marginTop: 20,
    width: '100%',
  },
  infoText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
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

  // Modal
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
