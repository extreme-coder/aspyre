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
} from 'react-native';
import { supabase } from '../config/supabase';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';

const GOAL_TYPE_LABELS = {
  habit: 'Habit',
  skill: 'Skill',
  project: 'Project',
  mindset: 'Mindset',
};

const PRIVACY_LABELS = {
  everyone: 'Everyone',
  friends: 'Friends Only',
  only_me: 'Only Me',
};

/**
 * Screen for viewing own journal detail with edit/delete options.
 */
export default function MyJournalDetailScreen({ route, navigation }) {
  const { journal: initialJournal } = route.params;
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  const [journal, setJournal] = useState(initialJournal);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [bullets, setBullets] = useState([]);
  const [proofChips, setProofChips] = useState([]);

  // Fetch full journal detail
  const fetchDetail = useCallback(async () => {
    if (!initialJournal?.id || !user?.id) {
      setLoading(false);
      return;
    }

    try {
      // Fetch journal with goal
      const { data: journalData, error: journalError } = await supabase
        .from('journals')
        .select(`
          *,
          goal:goals(id, title, goal_type)
        `)
        .eq('id', initialJournal.id)
        .single();

      if (journalError) {
        console.error('Failed to fetch journal:', journalError);
      } else if (journalData) {
        setJournal(journalData);
      }

      // Fetch bullets
      const { data: bulletsData } = await supabase
        .from('journal_bullets')
        .select('*')
        .eq('journal_id', initialJournal.id)
        .order('idx', { ascending: true });

      if (bulletsData) {
        setBullets(bulletsData);
      }

      // Fetch proof chips
      const { data: chipsData } = await supabase
        .from('journal_proof_chips')
        .select('*')
        .eq('journal_id', initialJournal.id)
        .order('idx', { ascending: true });

      if (chipsData) {
        setProofChips(chipsData);
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

  // Check if journal was edited
  const wasEdited = journal?.updated_at && journal?.created_at &&
    new Date(journal.updated_at).getTime() - new Date(journal.created_at).getTime() > 60000; // More than 1 min diff

  // Delete journal
  const handleDelete = () => {
    Alert.alert(
      'Delete Journal',
      'Are you sure you want to delete this journal? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);

            try {
              const { data, error } = await supabase.rpc('delete_journal', {
                p_journal_id: journal.id,
                p_user_id: user.id,
              });

              if (error) throw error;

              if (data && data.length > 0 && data[0].success) {
                if (data[0].was_today) {
                  Alert.alert(
                    'Journal Deleted',
                    "Today's journal has been deleted. You'll need to post again to unlock the feed.",
                    [{ text: 'OK', onPress: () => navigation.navigate('Home') }]
                  );
                } else {
                  Alert.alert('Deleted', 'Journal has been deleted.', [
                    { text: 'OK', onPress: () => navigation.goBack() },
                  ]);
                }
              } else {
                throw new Error('Failed to delete journal');
              }
            } catch (err) {
              Alert.alert('Error', err.message || 'Failed to delete journal');
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Edit journal - navigate to compose screen
  const handleEdit = () => {
    // Navigate to the compose screen which will load today's journal for editing
    navigation.navigate('Post');
  };

  // Get image URL
  const imageUrl = journal?.media;

  // Get goal info
  const goal = journal?.goal;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.backButton}>Back</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Journal</Text>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Journal</Text>
        <TouchableOpacity onPress={handleEdit}>
          <Text style={styles.editButton}>Edit</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Hero Image */}
        {imageUrl && (
          <Image source={{ uri: imageUrl }} style={styles.heroImage} />
        )}

        {/* Headline */}
        {journal?.headline && (
          <Text style={styles.headline}>{journal.headline}</Text>
        )}

        {/* Date & Edit indicator */}
        <View style={styles.metaRow}>
          <Text style={styles.date}>{formatDate(journal?.created_at)}</Text>
          {wasEdited && (
            <View style={styles.editedBadge}>
              <Text style={styles.editedText}>Edited</Text>
            </View>
          )}
        </View>

        {/* Privacy badge */}
        <View style={styles.privacyRow}>
          <Text style={styles.privacyLabel}>Visible to:</Text>
          <Text style={styles.privacyValue}>
            {PRIVACY_LABELS[journal?.post_privacy] || 'Friends Only'}
          </Text>
        </View>

        {/* Goal badge */}
        {goal && (
          <View style={styles.goalBadge}>
            <Text style={styles.goalType}>
              {GOAL_TYPE_LABELS[goal.goal_type] || goal.goal_type}
            </Text>
            <Text style={styles.goalTitle}>{goal.title}</Text>
          </View>
        )}

        {/* Proof Chips */}
        {proofChips.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Proof</Text>
            <View style={styles.chipsRow}>
              {proofChips.map((chip, index) => (
                <View key={chip.id || index} style={styles.chip}>
                  <Text style={styles.chipValue}>
                    {chip.value_int || chip.value_text || chip.value}
                  </Text>
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
                <View key={bullet.id || index} style={styles.bulletRow}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{bullet.text}</Text>
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

        {/* Feedback section */}
        {journal?.feedback_mode === 'question' && journal?.feedback_question && (
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Question for readers</Text>
            <Text style={styles.feedbackQuestion}>{journal.feedback_question}</Text>
          </View>
        )}

        {journal?.feedback_mode === 'open' && (
          <View style={styles.feedbackSection}>
            <Text style={styles.feedbackLabel}>Open to advice</Text>
            <Text style={styles.feedbackHint}>
              You indicated you welcome feedback on this post
            </Text>
          </View>
        )}

        {/* Kudos count */}
        <View style={styles.statsRow}>
          <Text style={styles.statsText}>
            {journal?.kudos_count || initialJournal?.kudos_count || 0} kudos received
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.editActionButton} onPress={handleEdit}>
            <Text style={styles.editActionText}>Edit Journal</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteActionButton}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#c00" />
            ) : (
              <Text style={styles.deleteActionText}>Delete Journal</Text>
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacer} />
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
  editButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    minWidth: 50,
    textAlign: 'right',
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
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  headline: {
    fontSize: 24,
    fontWeight: '600',
    color: '#000',
    padding: 24,
    paddingBottom: 12,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 12,
    gap: 12,
  },
  date: {
    fontSize: 13,
    fontWeight: '300',
    color: '#999',
  },
  editedBadge: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  editedText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 16,
    gap: 8,
  },
  privacyLabel: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
  },
  privacyValue: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    marginHorizontal: 24,
    marginBottom: 20,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  goalType: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  goalTitle: {
    fontSize: 14,
    fontWeight: '400',
    color: '#333',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  chipValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  chipLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    marginTop: 2,
  },
  bulletsList: {
    gap: 10,
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  bulletDot: {
    fontSize: 16,
    fontWeight: '400',
    color: '#666',
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '300',
    color: '#333',
    lineHeight: 22,
  },
  playbookSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 20,
  },
  playbookHeader: {
    marginBottom: 16,
  },
  playbookTitle: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  playbookItem: {
    marginBottom: 16,
  },
  playbookLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    marginBottom: 6,
  },
  playbookText: {
    fontSize: 15,
    fontWeight: '300',
    color: '#333',
    lineHeight: 22,
  },
  feedbackSection: {
    marginHorizontal: 24,
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    padding: 20,
    borderLeftWidth: 3,
    borderLeftColor: '#ddd',
  },
  feedbackLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#999',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  feedbackQuestion: {
    fontSize: 16,
    fontWeight: '400',
    color: '#333',
    fontStyle: 'italic',
    lineHeight: 24,
  },
  feedbackHint: {
    fontSize: 14,
    fontWeight: '300',
    color: '#666',
  },
  statsRow: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  statsText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
  },
  actions: {
    paddingHorizontal: 24,
    paddingTop: 16,
    gap: 12,
  },
  editActionButton: {
    backgroundColor: '#000',
    paddingVertical: 14,
    alignItems: 'center',
  },
  editActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 1,
  },
  deleteActionButton: {
    borderWidth: 1,
    borderColor: '#c00',
    paddingVertical: 14,
    alignItems: 'center',
  },
  deleteActionText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#c00',
    letterSpacing: 1,
  },
  bottomSpacer: {
    height: 40,
  },
});
