import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useComments } from '../hooks/useComments';
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

/**
 * Post detail screen showing expanded view of a journal entry.
 * Shows full "Proof + Punchline + Playbook" content.
 */
export default function PostDetailScreen({ route, navigation }) {
  const { journal: initialJournal } = route.params;
  const { user } = useAuth();

  const [journal, setJournal] = useState(initialJournal);
  const [loading, setLoading] = useState(true);
  const [bullets, setBullets] = useState([]);
  const [proofChips, setProofChips] = useState([]);
  const [kudosLoading, setKudosLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [newComment, setNewComment] = useState('');

  // Comments
  const {
    comments,
    loading: commentsLoading,
    adding: addingComment,
    fetchComments,
    addComment,
    deleteComment,
    commentCount,
  } = useComments(initialJournal?.id, user?.id);

  // Fetch full journal detail
  const fetchDetail = useCallback(async () => {
    if (!initialJournal?.id || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .rpc('get_journal_detail', {
          p_journal_id: initialJournal.id,
          p_viewer_id: user.id,
        });

      if (error) {
        console.error('Failed to fetch detail:', error);
      } else if (data && data.length > 0) {
        const journalData = data[0];
        setJournal(journalData);

        // Parse bullets
        if (journalData.bullets) {
          const parsedBullets = typeof journalData.bullets === 'string'
            ? JSON.parse(journalData.bullets)
            : journalData.bullets;
          setBullets(parsedBullets || []);
        }

        // Parse proof chips
        if (journalData.proof_chips) {
          const parsedChips = typeof journalData.proof_chips === 'string'
            ? JSON.parse(journalData.proof_chips)
            : journalData.proof_chips;
          setProofChips(parsedChips || []);
        }
      }
    } catch (err) {
      console.error('Error fetching detail:', err);
    } finally {
      setLoading(false);
    }
  }, [initialJournal?.id, user?.id]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Handle adding a comment
  const handleAddComment = async () => {
    if (!newComment.trim()) return;

    const result = await addComment(newComment);
    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to add comment');
    } else {
      setNewComment('');
    }
  };

  // Handle deleting a comment
  const handleDeleteComment = (commentId) => {
    Alert.alert(
      'Delete Comment',
      'Are you sure you want to delete this comment?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const result = await deleteComment(commentId);
            if (result.error) {
              Alert.alert('Error', result.error.message || 'Failed to delete comment');
            }
          },
        },
      ]
    );
  };

  // Format comment date
  const formatCommentDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Also try to parse from initial journal if RPC doesn't have data
  useEffect(() => {
    if (initialJournal?.proof_chips && proofChips.length === 0) {
      try {
        const parsed = typeof initialJournal.proof_chips === 'string'
          ? JSON.parse(initialJournal.proof_chips)
          : initialJournal.proof_chips;
        if (Array.isArray(parsed)) {
          setProofChips(parsed);
        }
      } catch (e) {}
    }
  }, [initialJournal?.proof_chips, proofChips.length]);

  // Format date
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  };

  // Toggle kudos
  const handleKudosToggle = async () => {
    if (kudosLoading || !user?.id) return;
    setKudosLoading(true);

    const newHasKudos = !journal.viewer_has_kudos;
    setJournal(prev => ({
      ...prev,
      viewer_has_kudos: newHasKudos,
      kudos_count: newHasKudos
        ? parseInt(prev.kudos_count || 0) + 1
        : Math.max(0, parseInt(prev.kudos_count || 0) - 1),
    }));

    try {
      if (newHasKudos) {
        const { error } = await supabase
          .from('kudos')
          .insert({ journal_id: journal.id, user_id: user.id });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('kudos')
          .delete()
          .eq('journal_id', journal.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    } catch (err) {
      // Revert
      setJournal(prev => ({
        ...prev,
        viewer_has_kudos: !newHasKudos,
        kudos_count: !newHasKudos
          ? parseInt(prev.kudos_count || 0) + 1
          : Math.max(0, parseInt(prev.kudos_count || 0) - 1),
      }));
      console.warn('Kudos error:', err);
    } finally {
      setKudosLoading(false);
    }
  };

  // Toggle save
  const handleSaveToggle = async () => {
    if (saveLoading || !user?.id) return;
    setSaveLoading(true);

    const newHasSaved = !journal.viewer_has_saved;
    setJournal(prev => ({ ...prev, viewer_has_saved: newHasSaved }));

    try {
      if (newHasSaved) {
        const { error } = await supabase
          .from('saves')
          .insert({ journal_id: journal.id, user_id: user.id });
        if (error && error.code !== '23505') throw error;
      } else {
        const { error } = await supabase
          .from('saves')
          .delete()
          .eq('journal_id', journal.id)
          .eq('user_id', user.id);
        if (error) throw error;
      }
    } catch (err) {
      setJournal(prev => ({ ...prev, viewer_has_saved: !newHasSaved }));
      console.warn('Save error:', err);
    } finally {
      setSaveLoading(false);
    }
  };

  // Get image URL
  const imageUrl = journal?.hero_image || journal?.media;

  // Get location string
  const locationString = journal?.author_location_city
    ? journal?.author_location_region
      ? `${journal.author_location_city}, ${journal.author_location_region}`
      : journal.author_location_city
    : null;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
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
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Post</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Hero Image */}
        {imageUrl && typeof imageUrl === 'string' && imageUrl.length > 0 && (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
        )}

        {/* Headline */}
        {journal?.headline && (
          <Text style={styles.headline}>{journal.headline}</Text>
        )}

        {/* Author section */}
        <View style={styles.authorSection}>
          <TouchableOpacity
            style={styles.authorInfo}
            onPress={() => journal?.user_id && navigation.navigate('Profile', { userId: journal.user_id })}
            activeOpacity={0.7}
          >
            {journal?.author_avatar_url && typeof journal.author_avatar_url === 'string' && journal.author_avatar_url.length > 0 ? (
              <Image source={{ uri: journal.author_avatar_url }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {(journal?.author_display_name || journal?.author_handle || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.authorText}>
              <Text style={styles.authorName}>
                {journal?.author_display_name || journal?.author_handle || 'Anonymous'}
              </Text>
              {locationString && (
                <Text style={styles.location}>{locationString}</Text>
              )}
            </View>
          </TouchableOpacity>
          <Text style={styles.date}>{formatDate(journal?.created_at)}</Text>
        </View>

        {/* Goal badge */}
        {journal?.goal_title && (
          <View style={styles.goalBadge}>
            <Text style={styles.goalType}>
              {GOAL_TYPE_LABELS[journal?.goal_type] || journal?.goal_type}
            </Text>
            <Text style={styles.goalTitle}>{journal.goal_title}</Text>
          </View>
        )}

        {/* Proof Chips */}
        {proofChips.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.sectionLabel}>Proof</Text>
            <View style={styles.chipsRow}>
              {proofChips.map((chip, index) => (
                <View key={index} style={styles.chip}>
                  <Text style={styles.chipValue}>{chip.value}</Text>
                  <Text style={styles.chipLabel}>{chip.label?.toLowerCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Bullets */}
        {bullets.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What Happened</Text>
            <View style={styles.bulletsList}>
              {bullets.map((bullet, index) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet.content || bullet.text}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Playbook Section */}
        {(journal?.challenge || journal?.win || journal?.takeaway || journal?.next_step) && (
          <View style={styles.playbookSection}>
            <View style={styles.playbookHeader}>
              <Text style={styles.playbookTitle}>Playbook</Text>
            </View>

            {/* Friction (challenge) */}
            {journal?.challenge && (
              <View style={styles.playbookItem}>
                <Text style={styles.playbookLabel}>Friction</Text>
                <Text style={styles.playbookText}>{journal.challenge}</Text>
              </View>
            )}

            {/* Fix (win) */}
            {journal?.win && (
              <View style={styles.playbookItem}>
                <Text style={styles.playbookLabel}>Fix</Text>
                <Text style={styles.playbookText}>{journal.win}</Text>
              </View>
            )}

            {/* Takeaway */}
            {journal?.takeaway && (
              <View style={styles.playbookItem}>
                <Text style={styles.playbookLabel}>Takeaway</Text>
                <Text style={styles.playbookText}>{journal.takeaway}</Text>
              </View>
            )}

            {/* Next Step */}
            {journal?.next_step && (
              <View style={styles.playbookItem}>
                <Text style={styles.playbookLabel}>Next Step</Text>
                <Text style={styles.playbookText}>{journal.next_step}</Text>
              </View>
            )}
          </View>
        )}

        {/* Legacy fields for old posts */}
        {journal?.what_i_did && !journal?.headline && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>What I Did</Text>
            <Text style={styles.sectionText}>{journal.what_i_did}</Text>
          </View>
        )}

        {journal?.tomorrow_plan && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Tomorrow</Text>
            <Text style={styles.sectionText}>{journal.tomorrow_plan}</Text>
          </View>
        )}

        {journal?.discovery && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Discovery</Text>
            <Text style={styles.sectionText}>{journal.discovery}</Text>
          </View>
        )}

        {/* Feedback section */}
        {journal?.feedback_mode === 'question' && journal?.feedback_question && (
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Question for you</Text>
            <Text style={styles.feedbackQuestion}>{journal.feedback_question}</Text>
          </View>
        )}

        {journal?.feedback_mode === 'open' && (
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Open to advice</Text>
            <Text style={styles.feedbackHint}>
              The author welcomes feedback on this post
            </Text>
          </View>
        )}

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleKudosToggle}
            disabled={kudosLoading}
          >
            <Text style={[
              styles.actionText,
              journal?.viewer_has_kudos && styles.actionTextActive,
            ]}>
              {journal?.viewer_has_kudos ? 'Kudos!' : 'Kudos'}
            </Text>
            {parseInt(journal?.kudos_count) > 0 && (
              <Text style={[
                styles.actionCount,
                journal?.viewer_has_kudos && styles.actionCountActive,
              ]}>
                {journal.kudos_count}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSaveToggle}
            disabled={saveLoading}
          >
            <Text style={[
              styles.actionText,
              journal?.viewer_has_saved && styles.actionTextActive,
            ]}>
              {journal?.viewer_has_saved ? 'Saved' : 'Save'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Comments Section */}
        <View style={styles.commentsSection}>
          <View style={styles.commentsHeader}>
            <Text style={styles.commentsTitle}>
              Discussion {commentCount > 0 ? `(${commentCount})` : ''}
            </Text>
          </View>

          {/* Comment Input */}
          <View style={styles.commentInputContainer}>
            <TextInput
              style={styles.commentInput}
              value={newComment}
              onChangeText={setNewComment}
              placeholder="Add a comment..."
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              maxLength={500}
              editable={!addingComment}
            />
            <TouchableOpacity
              style={[
                styles.commentSubmitButton,
                (!newComment.trim() || addingComment) && styles.commentSubmitButtonDisabled,
              ]}
              onPress={handleAddComment}
              disabled={!newComment.trim() || addingComment}
            >
              {addingComment ? (
                <ActivityIndicator size="small" color={colors.onPrimary} />
              ) : (
                <Text style={styles.commentSubmitText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {commentsLoading ? (
            <View style={styles.commentsLoading}>
              <ActivityIndicator size="small" color={colors.onSurfaceVariant} />
            </View>
          ) : comments.length === 0 ? (
            <View style={styles.noComments}>
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsHint}>Be the first to share your thoughts</Text>
            </View>
          ) : (
            <View style={styles.commentsList}>
              {comments.map((comment) => (
                <View key={comment.id} style={styles.commentItem}>
                  <TouchableOpacity
                    style={styles.commentAuthorAvatar}
                    onPress={() => comment.user_id && navigation.navigate('Profile', { userId: comment.user_id })}
                  >
                    {comment.commenter?.avatar_url ? (
                      <Image source={{ uri: comment.commenter.avatar_url }} style={styles.commentAvatar} />
                    ) : (
                      <View style={styles.commentAvatarPlaceholder}>
                        <Text style={styles.commentAvatarText}>
                          {(comment.commenter?.display_name || '?')[0].toUpperCase()}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                  <View style={styles.commentContent}>
                    <View style={styles.commentHeader}>
                      <TouchableOpacity
                        onPress={() => comment.user_id && navigation.navigate('Profile', { userId: comment.user_id })}
                      >
                        <Text style={styles.commentAuthorName}>
                          {comment.commenter?.display_name || 'Anonymous'}
                        </Text>
                      </TouchableOpacity>
                      <Text style={styles.commentTime}>{formatCommentDate(comment.created_at)}</Text>
                    </View>
                    <Text style={styles.commentText}>{comment.content}</Text>
                    {comment.user_id === user?.id && (
                      <TouchableOpacity
                        style={styles.commentDeleteButton}
                        onPress={() => handleDeleteComment(comment.id)}
                      >
                        <Text style={styles.commentDeleteText}>Delete</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
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
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  headline: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleLg.fontSize,
    color: colors.onSurface,
    padding: spacing.lg,
    paddingBottom: spacing.lg,
    lineHeight: 32,
  },
  authorSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    marginRight: spacing.md,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  location: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  date: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondaryContainer,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
  },
  goalType: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSecondaryContainer,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalTitle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSecondaryContainer,
  },
  chipsSection: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.md,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  chip: {
    backgroundColor: colors.surfaceContainerHigh,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  chipValue: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    color: colors.onSurface,
  },
  chipLabel: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    lineHeight: 24,
  },
  bulletsList: {
    gap: spacing.sm,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyLg.fontSize,
    color: colors.onSurfaceVariant,
    marginRight: spacing.sm,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    lineHeight: 22,
  },
  playbookSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  playbookHeader: {
    marginBottom: spacing.lg,
  },
  playbookTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  playbookItem: {
    marginBottom: spacing.lg,
  },
  playbookLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  playbookText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    lineHeight: 22,
  },
  feedbackSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.tertiaryContainer,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  feedbackLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onTertiaryContainer,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  feedbackQuestion: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyLg.fontSize,
    color: colors.onTertiaryContainer,
    fontStyle: 'italic',
    lineHeight: 24,
  },
  feedbackHint: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onTertiaryContainer,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  actionText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 0.5,
  },
  actionTextActive: {
    color: colors.secondary,
  },
  actionCount: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  actionCountActive: {
    color: colors.secondary,
  },
  bottomSpacer: {
    height: 40,
  },
  // Comments styles
  commentsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    backgroundColor: colors.surface,
  },
  commentsHeader: {
    marginBottom: spacing.lg,
  },
  commentsTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  commentInput: {
    flex: 1,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    maxHeight: 100,
    minHeight: 44,
  },
  commentSubmitButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    minWidth: 60,
    alignItems: 'center',
  },
  commentSubmitButtonDisabled: {
    backgroundColor: colors.surfaceContainerHigh,
  },
  commentSubmitText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onPrimary,
  },
  commentsLoading: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  noComments: {
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  noCommentsText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    marginBottom: spacing.xs,
  },
  noCommentsHint: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  commentsList: {
    gap: spacing.lg,
  },
  commentItem: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  commentAuthorAvatar: {},
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
  },
  commentAvatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentAvatarText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  commentAuthorName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurface,
  },
  commentTime: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
  commentText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    lineHeight: 20,
  },
  commentDeleteButton: {
    marginTop: spacing.xs,
    alignSelf: 'flex-start',
  },
  commentDeleteText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.error,
  },
});
