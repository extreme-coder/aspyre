import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../config/supabase';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
  components,
} from '../constants/theme';

const GOAL_TYPE_LABELS = {
  habit: 'Habit',
  skill: 'Skill',
  project: 'Project',
  mindset: 'Mindset',
};

/**
 * Card component for displaying a journal entry in the feed.
 * New format: Hero image + Headline + Proof chips (collapsed view)
 */
export default function FeedCard({
  journal,
  userId,
  onKudosUpdate,
  onSavedUpdate,
  onHide,
  onReport,
  onPress, // Navigate to detail view
  onAuthorPress, // Navigate to author profile
  showAddFriend = false, // Show add friend button for non-friends
  onFriendRequestSent, // Callback when friend request is sent
}) {
  const [kudosLoading, setKudosLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [friendRequestLoading, setFriendRequestLoading] = useState(false);
  const [friendRequestSent, setFriendRequestSent] = useState(false);

  const {
    id,
    user_id: authorId,
    author_display_name,
    author_handle,
    author_avatar_url,
    author_location_city,
    author_location_region,
    goal_title,
    goal_type,
    // New fields
    headline,
    media,
    hero_image,
    proof_chips,
    // Legacy fields (fallback)
    what_i_did,
    challenge,
    win,
    kudos_count,
    viewer_has_kudos,
    viewer_has_saved,
    created_at,
  } = journal;

  // Use hero_image or media for the image
  const imageUrl = hero_image || media;

  // Format location string
  const locationString = author_location_city
    ? author_location_region
      ? `${author_location_city}, ${author_location_region}`
      : author_location_city
    : null;

  // Format date
  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Parse proof chips from JSON string if needed
  const parsedProofChips = (() => {
    if (!proof_chips) return [];
    if (Array.isArray(proof_chips)) return proof_chips;
    try {
      return JSON.parse(proof_chips);
    } catch {
      return [];
    }
  })();

  // Toggle kudos
  const handleKudosToggle = async () => {
    if (kudosLoading) return;
    setKudosLoading(true);

    const newHasKudos = !viewer_has_kudos;
    onKudosUpdate(id, newHasKudos);

    try {
      if (newHasKudos) {
        const { error } = await supabase
          .from('kudos')
          .insert({ journal_id: id, user_id: userId });

        if (error && error.code !== '23505') {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('kudos')
          .delete()
          .eq('journal_id', id)
          .eq('user_id', userId);

        if (error) throw error;
      }
    } catch (err) {
      onKudosUpdate(id, !newHasKudos);
      console.warn('Kudos error:', err);
    } finally {
      setKudosLoading(false);
    }
  };

  // Toggle save
  const handleSaveToggle = async () => {
    if (saveLoading) return;
    setSaveLoading(true);

    const newHasSaved = !viewer_has_saved;
    onSavedUpdate(id, newHasSaved);

    try {
      if (newHasSaved) {
        const { error } = await supabase
          .from('saves')
          .insert({ journal_id: id, user_id: userId });

        if (error && error.code !== '23505') {
          throw error;
        }
      } else {
        const { error } = await supabase
          .from('saves')
          .delete()
          .eq('journal_id', id)
          .eq('user_id', userId);

        if (error) throw error;
      }
    } catch (err) {
      onSavedUpdate(id, !newHasSaved);
      console.warn('Save error:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Hide post
  const handleHide = () => {
    Alert.alert(
      'Hide Post',
      "You won't see this post anymore. This can't be undone.",
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Hide',
          style: 'destructive',
          onPress: async () => {
            onHide(id);

            try {
              const { error } = await supabase
                .from('hidden_posts')
                .insert({ journal_id: id, user_id: userId });

              if (error && error.code !== '23505') {
                throw error;
              }
            } catch (err) {
              console.warn('Hide error:', err);
            }
          },
        },
      ]
    );
  };

  // Show more options
  const handleMoreOptions = () => {
    Alert.alert(
      'Options',
      null,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Hide Post', onPress: handleHide },
        {
          text: 'Report',
          style: 'destructive',
          onPress: () => onReport(journal),
        },
      ]
    );
  };

  // Send friend request
  const handleSendFriendRequest = async () => {
    if (friendRequestLoading || friendRequestSent) return;
    setFriendRequestLoading(true);

    try {
      const { error } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: userId,
          to_user_id: authorId,
          status: 'pending',
        });

      if (error) {
        if (error.message?.includes('must post at least once')) {
          Alert.alert('Post First', 'Share your first journal entry before adding friends.');
        } else if (error.message?.includes('limit reached')) {
          Alert.alert('Limit Reached', 'You\'ve sent too many friend requests today. Try again tomorrow.');
        } else if (error.code === '23505') {
          // Duplicate - request already exists
          setFriendRequestSent(true);
        } else {
          throw error;
        }
      } else {
        setFriendRequestSent(true);
        onFriendRequestSent && onFriendRequestSent(authorId);
      }
    } catch (err) {
      console.warn('Friend request error:', err);
      Alert.alert('Error', 'Could not send friend request. Please try again.');
    } finally {
      setFriendRequestLoading(false);
    }
  };

  // Determine if this is new format (has headline or media) or legacy
  const isNewFormat = !!(headline || imageUrl);

  // For legacy posts, create a summary from what_i_did or win
  const legacySummary = what_i_did || win || challenge;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => onPress && onPress(journal)}
      activeOpacity={onPress ? 0.9 : 1}
    >
      {/* Hero Image */}
      {imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0 && (
        <Image source={{ uri: imageUrl }} style={styles.heroImage} />
      )}

      {/* Content container */}
      <View style={styles.contentContainer}>
        {/* Headline or Legacy Title */}
        {(headline || legacySummary) && (
          <Text style={styles.headline} numberOfLines={2}>
            {headline || legacySummary}
          </Text>
        )}

        {/* Author header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => onAuthorPress && onAuthorPress(authorId)}
            activeOpacity={onAuthorPress ? 0.7 : 1}
            disabled={!onAuthorPress}
          >
            {author_avatar_url && typeof author_avatar_url === 'string' && author_avatar_url.length > 0 ? (
              <Image source={{ uri: author_avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(author_display_name || author_handle || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.authorText}>
              <Text style={styles.authorName}>
                {author_display_name || author_handle || 'Anonymous'}
              </Text>
              {goal_title ? (
                <Text style={styles.goalInfo} numberOfLines={1}>
                  {GOAL_TYPE_LABELS[goal_type] || goal_type}: {goal_title}
                </Text>
              ) : locationString ? (
                <Text style={styles.location}>{locationString}</Text>
              ) : null}
            </View>
          </TouchableOpacity>
          <View style={styles.headerRight}>
            {/* Add Friend Button */}
            {showAddFriend && authorId !== userId && (
              <TouchableOpacity
                style={[
                  styles.addFriendButton,
                  friendRequestSent && styles.addFriendButtonSent,
                ]}
                onPress={handleSendFriendRequest}
                disabled={friendRequestLoading || friendRequestSent}
              >
                {friendRequestLoading ? (
                  <Text style={styles.addFriendButtonText}>...</Text>
                ) : friendRequestSent ? (
                  <Text style={[styles.addFriendButtonText, styles.addFriendButtonTextSent]}>Sent</Text>
                ) : (
                  <>
                    <Ionicons name="person-add-outline" size={12} color={colors.onPrimary} />
                    <Text style={styles.addFriendButtonText}>Add</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <Text style={styles.timestamp}>{formatDate(created_at)}</Text>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={handleMoreOptions}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.onSurfaceVariant} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Proof Chips */}
        {parsedProofChips.length > 0 && (
          <View style={styles.chipsRow}>
            {parsedProofChips.slice(0, 4).map((chip, index) => (
              <View key={index} style={styles.chip}>
                <Text style={styles.chipText}>
                  {chip.value} {chip.label?.toLowerCase()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Read more link for new format */}
        {isNewFormat && onPress && (
          <TouchableOpacity
            style={styles.readMoreButton}
            onPress={() => onPress(journal)}
          >
            <Text style={styles.readMoreText}>Read more...</Text>
          </TouchableOpacity>
        )}

        {/* Legacy content preview (for old posts without new format) */}
        {!isNewFormat && (
          <View style={styles.legacyContent}>
            {win && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Win</Text>
                <Text style={styles.sectionText} numberOfLines={2}>{win}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleKudosToggle}
            disabled={kudosLoading}
          >
            <Ionicons
              name={viewer_has_kudos ? 'heart' : 'heart-outline'}
              size={20}
              color={viewer_has_kudos ? colors.secondary : colors.onSurfaceVariant}
            />
            {parseInt(kudos_count) > 0 && (
              <Text
                style={[
                  styles.actionCount,
                  viewer_has_kudos && styles.actionCountActive,
                ]}
              >
                {kudos_count}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSaveToggle}
            disabled={saveLoading}
          >
            <Ionicons
              name={viewer_has_saved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={viewer_has_saved ? colors.tertiary : colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    marginBottom: spacing.md,
    overflow: 'hidden',
    // NO border - use tonal layering instead
  },
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  contentContainer: {
    padding: spacing.lg,
  },
  headline: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleLg.fontSize,
    lineHeight: typography.titleLg.lineHeight,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleSm.fontSize,
    color: colors.onSurface,
    letterSpacing: 0.3,
  },
  goalInfo: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  location: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  timestamp: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  moreButton: {
    padding: spacing.xs,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  chip: {
    backgroundColor: colors.secondaryContainer,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  chipText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSecondaryContainer,
  },
  readMoreButton: {
    paddingVertical: spacing.sm,
    marginBottom: spacing.xs,
  },
  readMoreText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.primary,
  },
  legacyContent: {
    marginBottom: spacing.sm,
  },
  section: {
    gap: spacing.xs,
  },
  sectionLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    lineHeight: typography.bodyMd.lineHeight,
    color: colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingTop: spacing.md,
    // NO border - use spacing instead
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  actionCount: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  actionCountActive: {
    color: colors.secondary,
  },
  addFriendButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
  },
  addFriendButtonSent: {
    backgroundColor: colors.surfaceContainerHighest,
  },
  addFriendButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onPrimary,
  },
  addFriendButtonTextSent: {
    color: colors.onSurfaceVariant,
  },
});
