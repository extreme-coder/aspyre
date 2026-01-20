import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { supabase } from '../config/supabase';

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
}) {
  const [kudosLoading, setKudosLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);

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
      {imageUrl && (
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
            {author_avatar_url ? (
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
            <Text style={styles.timestamp}>{formatDate(created_at)}</Text>
            <TouchableOpacity
              style={styles.moreButton}
              onPress={handleMoreOptions}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text style={styles.moreButtonText}>...</Text>
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
            <Text
              style={[
                styles.actionText,
                viewer_has_kudos && styles.actionTextActive,
              ]}
            >
              {viewer_has_kudos ? 'Kudos!' : 'Kudos'}
            </Text>
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
            <Text
              style={[
                styles.actionText,
                viewer_has_saved && styles.actionTextActive,
              ]}
            >
              {viewer_has_saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#eee',
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  contentContainer: {
    padding: 16,
  },
  headline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
    lineHeight: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 10,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 0.3,
  },
  goalInfo: {
    fontSize: 11,
    fontWeight: '300',
    color: '#666',
    marginTop: 2,
  },
  location: {
    fontSize: 11,
    fontWeight: '300',
    color: '#999',
    marginTop: 2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timestamp: {
    fontSize: 11,
    fontWeight: '300',
    color: '#999',
  },
  moreButton: {
    padding: 4,
  },
  moreButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 2,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  chip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  readMoreButton: {
    paddingVertical: 8,
    marginBottom: 4,
  },
  readMoreText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
  },
  legacyContent: {
    marginBottom: 8,
  },
  section: {
    gap: 4,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#333',
    lineHeight: 20,
  },
  actions: {
    flexDirection: 'row',
    gap: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 0.5,
  },
  actionTextActive: {
    color: '#000',
  },
  actionCount: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
  actionCountActive: {
    color: '#000',
  },
});
