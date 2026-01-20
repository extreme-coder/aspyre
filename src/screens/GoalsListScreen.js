import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../hooks/useGoals';
import HeaderProfileButton from '../components/HeaderProfileButton';

const GOAL_TYPE_LABELS = {
  habit: 'Habit',
  skill: 'Skill',
  project: 'Project',
  mindset: 'Mindset',
};

function GoalCard({ goal, onPress, onToggleArchive }) {
  return (
    <TouchableOpacity style={styles.goalCard} onPress={onPress}>
      <View style={styles.goalCardContent}>
        <Text style={styles.goalTitle}>{goal.title}</Text>
        <Text style={styles.goalType}>{GOAL_TYPE_LABELS[goal.goal_type]}</Text>
        {goal.tags && goal.tags.length > 0 && (
          <View style={styles.tagsRow}>
            {goal.tags.slice(0, 3).map((tag, index) => (
              <View key={index} style={styles.tag}>
                <Text style={styles.tagText}>{tag?.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <TouchableOpacity
        style={styles.archiveButton}
        onPress={() => onToggleArchive(goal)}
      >
        <Text style={styles.archiveButtonText}>
          {goal.is_archived ? 'Restore' : 'Archive'}
        </Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function GoalsListScreen({ navigation }) {
  const { user } = useAuth();
  const { activeGoals, archivedGoals, loading, error, toggleArchive, fetchGoals } = useGoals(user?.id);
  const [showArchived, setShowArchived] = useState(false);

  // Refetch goals when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchGoals();
    }, [fetchGoals])
  );

  const displayedGoals = showArchived ? archivedGoals : activeGoals;

  const handleToggleArchive = async (goal) => {
    const action = goal.is_archived ? 'restore' : 'archive';
    Alert.alert(
      `${goal.is_archived ? 'Restore' : 'Archive'} Goal`,
      `Are you sure you want to ${action} "${goal.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: goal.is_archived ? 'Restore' : 'Archive',
          onPress: async () => {
            const { error: archiveError } = await toggleArchive(goal.id, goal.is_archived);
            if (archiveError) {
              Alert.alert('Error', archiveError.message);
            }
          },
        },
      ]
    );
  };

  const handleGoalPress = (goal) => {
    navigation.navigate('GoalEditor', { goal });
  };

  const handleCreateGoal = () => {
    navigation.navigate('GoalEditor', { goal: null });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Failed to load goals</Text>
          <Text style={styles.errorMessage}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchGoals}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.addButtonContainer} onPress={handleCreateGoal}>
          <Text style={styles.addButton}>+ New</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Goals</Text>
        <HeaderProfileButton />
      </View>

      {/* Toggle Active/Archived */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[styles.toggleOption, !showArchived && styles.toggleOptionActive]}
          onPress={() => setShowArchived(false)}
        >
          <Text style={[styles.toggleText, !showArchived && styles.toggleTextActive]}>
            Active ({activeGoals.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleOption, showArchived && styles.toggleOptionActive]}
          onPress={() => setShowArchived(true)}
        >
          <Text style={[styles.toggleText, showArchived && styles.toggleTextActive]}>
            Archived ({archivedGoals.length})
          </Text>
        </TouchableOpacity>
      </View>

      {displayedGoals.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>
            {showArchived ? 'No archived goals' : 'No goals yet'}
          </Text>
          {!showArchived && (
            <Text style={styles.emptySubtitle}>
              Create a goal to start tracking your progress.
            </Text>
          )}
          {!showArchived && (
            <TouchableOpacity style={styles.createButton} onPress={handleCreateGoal}>
              <Text style={styles.createButtonText}>Create Goal</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={displayedGoals}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <GoalCard
              goal={item}
              onPress={() => handleGoalPress(item)}
              onToggleArchive={handleToggleArchive}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#c00',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
  },
  addButtonContainer: {
    minWidth: 50,
  },
  addButton: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
  },
  toggleRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  toggleOption: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
  },
  toggleOptionActive: {
    borderBottomWidth: 2,
    borderBottomColor: '#000',
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 1,
    color: '#999',
  },
  toggleTextActive: {
    color: '#000',
    fontWeight: '500',
  },
  list: {
    padding: 24,
  },
  goalCard: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalCardContent: {
    flex: 1,
    marginRight: 16,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.5,
    color: '#000',
    marginBottom: 6,
  },
  goalType: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#999',
    textTransform: 'uppercase',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 10,
    gap: 6,
  },
  tag: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '400',
    letterSpacing: 0.5,
    color: '#666',
  },
  archiveButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  archiveButtonText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#999',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 1,
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
  createButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
  },
});
