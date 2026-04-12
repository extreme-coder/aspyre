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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../hooks/useGoals';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

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
        <Ionicons
          name={goal.is_archived ? 'arrow-undo-outline' : 'archive-outline'}
          size={18}
          color={colors.onSurfaceVariant}
        />
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
          <ActivityIndicator size="large" color={colors.primary} />
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
            <Ionicons name="refresh-outline" size={18} color={colors.onPrimary} />
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
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

      {/* Floating Add Button */}
      {!showArchived && (
        <TouchableOpacity style={styles.fab} onPress={handleCreateGoal}>
          <Ionicons name="add" size={28} color={colors.onPrimary} />
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
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
    padding: spacing.xl,
  },
  errorTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.xl,
  },
  retryButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 2,
    color: colors.onPrimary,
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
  addButtonContainer: {
    minWidth: 50,
  },
  addButton: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    letterSpacing: 1,
    color: colors.primary,
  },
  toggleRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceContainerLow,
  },
  toggleOption: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  toggleOptionActive: {
    backgroundColor: colors.primary,
  },
  toggleText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  toggleTextActive: {
    fontFamily: fontFamily.medium,
    color: colors.onPrimary,
  },
  list: {
    padding: spacing.lg,
  },
  goalCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  goalCardContent: {
    flex: 1,
    marginRight: spacing.lg,
  },
  goalTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyLg.fontSize,
    letterSpacing: 0.5,
    color: colors.onSurface,
    marginBottom: spacing.xs,
  },
  goalType: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  tag: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  tagText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 0.5,
    color: colors.onSecondaryContainer,
  },
  archiveButton: {
    padding: spacing.sm,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  createButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.xl,
  },
  createButtonText: {
    fontFamily: fontFamily.semiBold,
    color: colors.onPrimary,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 2,
  },
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    width: 56,
    height: 56,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
});
