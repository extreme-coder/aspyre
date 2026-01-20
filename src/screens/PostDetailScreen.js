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
import HeaderProfileButton from '../components/HeaderProfileButton';

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
        <Text style={styles.headerTitle}>Post</Text>
        <HeaderProfileButton />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
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
            onPress={() => journal?.user_id && navigation.navigate('UserProfile', { userId: journal.user_id })}
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
    paddingBottom: 16,
    lineHeight: 32,
  },
  authorSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
  },
  avatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#666',
  },
  authorText: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#000',
  },
  location: {
    fontSize: 13,
    fontWeight: '300',
    color: '#999',
    marginTop: 2,
  },
  date: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
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
  chipsSection: {
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
  section: {
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  sectionText: {
    fontSize: 15,
    fontWeight: '300',
    color: '#333',
    lineHeight: 24,
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
  actions: {
    flexDirection: 'row',
    gap: 32,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 0.5,
  },
  actionTextActive: {
    color: '#000',
  },
  actionCount: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
  },
  actionCountActive: {
    color: '#000',
  },
  bottomSpacer: {
    height: 40,
  },
});
