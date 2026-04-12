import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import { useGoals } from '../hooks/useGoals';
import { useProfile } from '../hooks/useProfile';
import { formatDateForDisplay } from '../utils/dateUtils';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

const PRIVACY_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends Only' },
  { value: 'only_me', label: 'Only Me' },
];

const GOAL_TYPE_LABELS = {
  habit: 'Habit',
  skill: 'Skill',
  project: 'Project',
  mindset: 'Mindset',
};

// Autosave debounce delay in ms
const AUTOSAVE_DELAY = 2000;
const MIN_BODY_LENGTH = 1;
const SOFT_NUDGE_LENGTH = 20;

export default function JournalComposeScreen({ navigation }) {
  const { user } = useAuth();
  const { profile, fetchProfile } = useProfile(user?.id);
  const { activeGoals, loading: goalsLoading, fetchGoals } = useGoals(user?.id);
  const {
    todayJournal,
    loading: journalLoading,
    saving,
    error,
    localDate,
    canEdit,
    hasPostedToday,
    loadDraft,
    saveDraft,
    clearDraft,
    saveJournalWithExtras,
    updatePrivacy,
    fetchTodayJournal,
  } = useJournal(user?.id, profile?.timezone);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchGoals();
      fetchTodayJournal();
    }, [fetchGoals, fetchTodayJournal])
  );

  // Form state - Simplified format
  const [primaryGoalId, setPrimaryGoalId] = useState(null);
  const [mediaUri, setMediaUri] = useState(null);
  const [body, setBody] = useState('');
  const [challenge, setChallenge] = useState('');
  const [win, setWin] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [openToAdvice, setOpenToAdvice] = useState(true);
  const getDefaultPrivacy = useCallback(() => {
    return profile?.account_privacy === 'public' ? 'everyone' : 'friends';
  }, [profile?.account_privacy]);
  const [postPrivacy, setPostPrivacy] = useState('friends');

  // UI state
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showPrivacyPicker, setShowPrivacyPicker] = useState(false);
  const [showMoreDetails, setShowMoreDetails] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const autosaveTimer = useRef(null);
  const justSavedRef = useRef(false);

  const loading = journalLoading || goalsLoading;

  // Set default privacy when profile loads
  useEffect(() => {
    if (profile && !initialized && !todayJournal) {
      setPostPrivacy(getDefaultPrivacy());
    }
  }, [profile, initialized, todayJournal, getDefaultPrivacy]);

  // Load form data from todayJournal
  const loadFormFromJournal = useCallback(async () => {
    if (!todayJournal) return;

    setPrimaryGoalId(todayJournal.primary_goal_id);
    setMediaUri(todayJournal.media || null);
    setBody(todayJournal.headline || todayJournal.what_i_did || '');
    setChallenge(todayJournal.challenge || '');
    setWin(todayJournal.win || '');
    setTomorrow(todayJournal.tomorrow_plan || todayJournal.next_step || '');
    setOpenToAdvice(todayJournal.open_to_feedback !== false);
    setPostPrivacy(todayJournal.post_privacy || getDefaultPrivacy());

    // Auto-expand details if any are filled
    if (todayJournal.challenge || todayJournal.win || todayJournal.tomorrow_plan || todayJournal.next_step) {
      setShowMoreDetails(true);
    }
  }, [todayJournal, getDefaultPrivacy]);

  // Enter edit mode
  const enterEditMode = useCallback(async () => {
    await loadFormFromJournal();
    setIsEditing(true);
  }, [loadFormFromJournal]);

  // Initialize form
  useEffect(() => {
    const initializeForm = async () => {
      if (loading || initialized) return;

      if (todayJournal) {
        await loadFormFromJournal();
      } else {
        const savedDraft = await loadDraft();
        if (savedDraft) {
          setPrimaryGoalId(savedDraft.primaryGoalId);
          setMediaUri(savedDraft.mediaUri || null);
          setBody(savedDraft.body || '');
          setChallenge(savedDraft.challenge || '');
          setWin(savedDraft.win || '');
          setTomorrow(savedDraft.tomorrow || '');
          setOpenToAdvice(savedDraft.openToAdvice !== false);
          setPostPrivacy(savedDraft.postPrivacy || getDefaultPrivacy());
          if (savedDraft.challenge || savedDraft.win || savedDraft.tomorrow) {
            setShowMoreDetails(true);
          }
        } else {
          setPostPrivacy(getDefaultPrivacy());
        }
      }

      setInitialized(true);
    };

    initializeForm();
  }, [loading, todayJournal, initialized, loadDraft, loadFormFromJournal, getDefaultPrivacy]);

  // Autosave draft
  const draftData = {
    primaryGoalId,
    mediaUri,
    body,
    challenge,
    win,
    tomorrow,
    openToAdvice,
    postPrivacy,
  };

  useEffect(() => {
    if (!initialized || hasPostedToday) return;

    if (autosaveTimer.current) {
      clearTimeout(autosaveTimer.current);
    }

    autosaveTimer.current = setTimeout(() => {
      saveDraft(draftData);
    }, AUTOSAVE_DELAY);

    return () => {
      if (autosaveTimer.current) {
        clearTimeout(autosaveTimer.current);
      }
    };
  }, [initialized, hasPostedToday, primaryGoalId, mediaUri, body, challenge, win, tomorrow, openToAdvice, postPrivacy, saveDraft]);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (justSavedRef.current) return false;
    if (hasPostedToday && !isEditing) return false;

    const hasBody = body.trim().length > 0;
    const hasDetails = challenge.trim().length > 0 || win.trim().length > 0 || tomorrow.trim().length > 0;

    return hasBody || hasDetails || mediaUri;
  }, [hasPostedToday, isEditing, body, challenge, win, tomorrow, mediaUri]);

  // Warn on navigation
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges()) return;

      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges]);

  // Image picker
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your photos to add an image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow camera access to take a photo.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const showImageOptions = () => {
    Alert.alert('Add Photo', 'Choose an option', [
      { text: 'Take Photo', onPress: takePhoto },
      { text: 'Choose from Library', onPress: pickImage },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  // Save
  const performSave = async () => {
    setUploadingImage(true);

    const journalData = {
      primary_goal_id: primaryGoalId,
      headline: body.trim() || null,
      what_i_did: body.trim() || null,
      challenge: challenge.trim() || null,
      win: win.trim() || null,
      tomorrow_plan: tomorrow.trim() || null,
      next_step: tomorrow.trim() || null,
      open_to_feedback: openToAdvice,
      feedback_mode: openToAdvice ? 'open' : 'none',
      post_privacy: postPrivacy,
      // Legacy fields
      takeaway: null,
      discovery: null,
      mood: null,
      energy: null,
    };

    const result = await saveJournalWithExtras(
      journalData,
      [], // No bullets in simplified composer
      [], // No proof chips in simplified composer
      mediaUri && !mediaUri.startsWith('http') ? mediaUri : null
    );

    setUploadingImage(false);

    if (result.error) {
      Alert.alert(
        'Oops!',
        result.error.message || "Something went wrong. Let's try that again.",
        [{ text: 'OK' }]
      );
    } else {
      justSavedRef.current = true;

      const title = result.wasCreate ? 'Posted!' : 'Updated!';
      const message = result.wasCreate
        ? "Your post is live. Keep the streak going!"
        : 'Your changes have been saved.';
      Alert.alert(title, message, [
        {
          text: 'Done',
          onPress: () => {
            setIsEditing(false);
            if (result.wasCreate) {
              navigation.navigate('Home');
            }
          },
        },
      ]);
    }
  };

  const handleSave = async () => {
    const bodyLength = body.trim().length;

    // Minimum 1 character
    if (bodyLength < MIN_BODY_LENGTH) {
      Alert.alert(
        'Add something',
        'Write at least one character to post.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Soft nudge if under 20 characters
    if (bodyLength < SOFT_NUDGE_LENGTH) {
      Alert.alert(
        'Quick check',
        'Your post is pretty short. Add more detail?',
        [
          { text: 'Add more', style: 'cancel' },
          { text: 'Post anyway', onPress: performSave },
        ]
      );
      return;
    }

    await performSave();
  };

  const handlePrivacyChange = async (newPrivacy) => {
    setPostPrivacy(newPrivacy);
    setShowPrivacyPicker(false);

    if (hasPostedToday && !isEditing) {
      const result = await updatePrivacy(newPrivacy);
      if (result.error) {
        Alert.alert('Oops!', "Couldn't update privacy. Please try again.", [{ text: 'OK' }]);
      }
    }
  };

  const selectedGoal = activeGoals.find((g) => g.id === primaryGoalId);

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  // Preview mode - show post after posting
  if (hasPostedToday && !isEditing) {
    const goal = todayJournal?.primary_goal;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.dateText}>{formatDateForDisplay(localDate)}</Text>
          <TouchableOpacity onPress={enterEditMode}>
            <Text style={styles.editButton}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.editNotice}>
          <Text style={styles.editNoticeText}>
            Edits will be marked as updated
          </Text>
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.previewContent}>
          <View style={styles.previewCard}>
            {/* Hero image */}
            {todayJournal?.media && typeof todayJournal.media === 'string' && todayJournal.media.length > 0 && (
              <Image source={{ uri: todayJournal.media }} style={styles.previewHeroImage} />
            )}

            {/* Author header */}
            <View style={styles.previewHeader}>
              <View style={styles.authorInfo}>
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarText}>
                    {(profile?.display_name || profile?.handle || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View>
                  <Text style={styles.authorName}>
                    {profile?.display_name || profile?.handle || 'You'}
                  </Text>
                  {goal && (
                    <Text style={styles.goalText}>
                      {GOAL_TYPE_LABELS[goal.goal_type]}: {goal.title}
                    </Text>
                  )}
                </View>
              </View>
            </View>

            {/* Body */}
            {(todayJournal?.headline || todayJournal?.what_i_did) && (
              <Text style={styles.previewBody}>
                {todayJournal.headline || todayJournal.what_i_did}
              </Text>
            )}

            {/* Privacy */}
            <View style={styles.previewFooter}>
              <TouchableOpacity
                style={styles.privacyBadge}
                onPress={() => setShowPrivacyPicker(!showPrivacyPicker)}
              >
                <Text style={styles.privacyBadgeLabel}>Visible to:</Text>
                <Text style={styles.privacyBadgeText}>
                  {PRIVACY_OPTIONS.find((p) => p.value === postPrivacy)?.label || 'Friends Only'}
                </Text>
                <Text style={styles.privacyChangeHint}>Change</Text>
              </TouchableOpacity>
            </View>

            {showPrivacyPicker && (
              <View style={styles.previewPickerOptions}>
                {PRIVACY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      postPrivacy === option.value && styles.pickerOptionActive,
                    ]}
                    onPress={() => handlePrivacyChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        postPrivacy === option.value && styles.pickerOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          <TouchableOpacity style={styles.previewEditButton} onPress={enterEditMode}>
            <Text style={styles.previewEditButtonText}>Edit Post</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.viewAllPostsButton}
            onPress={() => navigation.navigate('Me')}
          >
            <Text style={styles.viewAllPostsButtonText}>View All Your Posts</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Compose/Edit mode
  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => {
              if (hasUnsavedChanges()) {
                Alert.alert(
                  'Discard changes?',
                  'You have unsaved changes. Are you sure you want to leave?',
                  [
                    { text: 'Keep Editing', style: 'cancel' },
                    {
                      text: 'Discard',
                      style: 'destructive',
                      onPress: () => {
                        if (isEditing) {
                          setIsEditing(false);
                        }
                      },
                    },
                  ]
                );
              } else {
                if (isEditing) {
                  setIsEditing(false);
                }
              }
            }}
          >
            {isEditing ? (
              <Ionicons name="close" size={24} color={colors.onSurfaceVariant} />
            ) : (
              <View style={{ width: 24 }} />
            )}
          </TouchableOpacity>
          <Text style={styles.dateText}>{formatDateForDisplay(localDate)}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving || uploadingImage}>
            {saving || uploadingImage ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.saveButton}>{isEditing ? 'Save' : 'Post'}</Text>
            )}
          </TouchableOpacity>
        </View>

        {isEditing && (
          <View style={styles.editNotice}>
            <Text style={styles.editNoticeText}>
              Changes will be marked as edited
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Body - Main text field */}
          <View style={styles.field}>
            <TextInput
              style={styles.bodyInput}
              value={body}
              onChangeText={setBody}
              placeholder="What did you work on today?"
              placeholderTextColor={colors.onSurfaceVariant}
              multiline
              autoFocus={!hasPostedToday}
            />
            <Text style={[styles.charCount, body.length < SOFT_NUDGE_LENGTH && body.length > 0 && styles.charCountWarning]}>
              {body.length} characters
            </Text>
          </View>

          {/* Focus Goal */}
          <View style={styles.field}>
            <Text style={styles.label}>Goal</Text>
            {activeGoals.length === 0 ? (
              <TouchableOpacity
                style={styles.noGoalPrompt}
                onPress={() => navigation.navigate('GoalEditor', { goal: null })}
              >
                <Text style={styles.noGoalText}>No goals yet. Tap to create one.</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowGoalPicker(!showGoalPicker)}
              >
                <Text style={[styles.pickerText, !selectedGoal && styles.pickerPlaceholder]}>
                  {selectedGoal ? selectedGoal.title : 'Select a goal (optional)'}
                </Text>
              </TouchableOpacity>
            )}
            {showGoalPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={[styles.pickerOption, !primaryGoalId && styles.pickerOptionActive]}
                  onPress={() => {
                    setPrimaryGoalId(null);
                    setShowGoalPicker(false);
                  }}
                >
                  <Text style={[styles.pickerOptionText, !primaryGoalId && styles.pickerOptionTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {activeGoals.map((goal) => (
                  <TouchableOpacity
                    key={goal.id}
                    style={[
                      styles.pickerOption,
                      primaryGoalId === goal.id && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setPrimaryGoalId(goal.id);
                      setShowGoalPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        primaryGoalId === goal.id && styles.pickerOptionTextActive,
                      ]}
                    >
                      {goal.title}
                    </Text>
                    <Text style={styles.pickerOptionType}>{goal.goal_type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Photo */}
          <TouchableOpacity style={styles.photoButton} onPress={showImageOptions}>
            {mediaUri && typeof mediaUri === 'string' && mediaUri.length > 0 ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: mediaUri }} style={styles.photoImage} />
                <View style={styles.photoOverlay}>
                  <Ionicons name="camera-outline" size={20} color={colors.onPrimary} />
                  <Text style={styles.photoChangeText}>Change</Text>
                </View>
              </View>
            ) : (
              <View style={styles.photoPlaceholder}>
                <Ionicons name="camera-outline" size={24} color={colors.onSurfaceVariant} />
                <Text style={styles.photoPlaceholderText}>Add photo (optional)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Privacy */}
          <View style={styles.field}>
            <Text style={styles.label}>Privacy</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowPrivacyPicker(!showPrivacyPicker)}
            >
              <Text style={styles.pickerText}>
                {PRIVACY_OPTIONS.find((p) => p.value === postPrivacy)?.label}
              </Text>
            </TouchableOpacity>
            {showPrivacyPicker && (
              <View style={styles.pickerOptions}>
                {PRIVACY_OPTIONS.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      postPrivacy === option.value && styles.pickerOptionActive,
                    ]}
                    onPress={() => handlePrivacyChange(option.value)}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        postPrivacy === option.value && styles.pickerOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Collapsible "Add more details" */}
          <TouchableOpacity
            style={styles.moreDetailsToggle}
            onPress={() => setShowMoreDetails(!showMoreDetails)}
          >
            <Text style={styles.moreDetailsToggleText}>
              {showMoreDetails ? 'Hide details' : 'Add more details'}
            </Text>
            <Ionicons
              name={showMoreDetails ? 'chevron-up' : 'chevron-down'}
              size={18}
              color={colors.onSurfaceVariant}
            />
          </TouchableOpacity>

          {showMoreDetails && (
            <View style={styles.moreDetailsSection}>
              {/* Challenge */}
              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Challenge</Text>
                <TextInput
                  style={styles.detailInput}
                  value={challenge}
                  onChangeText={setChallenge}
                  placeholder="What was hard?"
                  placeholderTextColor={colors.onSurfaceVariant}
                  multiline
                />
              </View>

              {/* Win */}
              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Win</Text>
                <TextInput
                  style={styles.detailInput}
                  value={win}
                  onChangeText={setWin}
                  placeholder="What went well?"
                  placeholderTextColor={colors.onSurfaceVariant}
                  multiline
                />
              </View>

              {/* Tomorrow */}
              <View style={styles.detailField}>
                <Text style={styles.detailLabel}>Tomorrow</Text>
                <TextInput
                  style={styles.detailInput}
                  value={tomorrow}
                  onChangeText={setTomorrow}
                  placeholder="What's next?"
                  placeholderTextColor={colors.onSurfaceVariant}
                />
              </View>

              {/* Open to Advice */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setOpenToAdvice(!openToAdvice)}
              >
                <View style={[styles.checkbox, openToAdvice && styles.checkboxChecked]}>
                  {openToAdvice && <Ionicons name="checkmark" size={14} color={colors.onPrimary} />}
                </View>
                <Text style={styles.checkboxLabel}>Open to advice</Text>
              </TouchableOpacity>
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

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
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
  },
  dateText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurface,
    letterSpacing: 0.5,
  },
  saveButton: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyMd.fontSize,
    color: colors.primary,
    minWidth: 50,
    textAlign: 'right',
  },
  editButton: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyMd.fontSize,
    color: colors.primary,
    minWidth: 50,
    textAlign: 'right',
  },
  editNotice: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.tertiaryContainer,
  },
  editNoticeText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onTertiaryContainer,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },

  // Fields
  field: {
    marginBottom: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },

  // Body input
  bodyInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.lg,
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyLg.fontSize,
    color: colors.onSurface,
    minHeight: 120,
    textAlignVertical: 'top',
    lineHeight: 24,
  },
  charCount: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  charCountWarning: {
    color: colors.tertiary,
  },

  // Pickers
  picker: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pickerText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  pickerPlaceholder: {
    color: colors.onSurfaceVariant,
  },
  pickerOptions: {
    backgroundColor: colors.surfaceContainerHigh,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    overflow: 'hidden',
    marginTop: -radius.lg,
    paddingTop: radius.lg,
  },
  pickerOption: {
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: colors.primary,
  },
  pickerOptionText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  pickerOptionTextActive: {
    color: colors.onPrimary,
  },
  pickerOptionType: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    textTransform: 'capitalize',
  },
  noGoalPrompt: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  noGoalText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },

  // Photo button
  photoButton: {
    marginBottom: spacing.lg,
  },
  photoPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  photoPlaceholderText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  photoPreview: {
    position: 'relative',
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  photoImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
    gap: spacing.xs,
  },
  photoChangeText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onPrimary,
  },

  // More details toggle
  moreDetailsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  moreDetailsToggleText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },

  // More details section
  moreDetailsSection: {
    paddingTop: spacing.lg,
  },
  detailField: {
    marginBottom: spacing.md,
  },
  detailLabel: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: spacing.sm,
  },
  detailInput: {
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // Checkbox
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
  },
  checkboxLabel: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },

  // Error
  errorContainer: {
    backgroundColor: colors.errorContainer,
    padding: spacing.md,
    marginTop: spacing.lg,
    borderRadius: radius.lg,
  },
  errorText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.bodyMd.fontSize,
    color: colors.error,
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 50,
  },

  // Preview styles
  previewContent: {
    padding: spacing.lg,
  },
  previewCard: {
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  previewHeroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.lg,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  authorName: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  goalText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: 2,
  },
  previewBody: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
    lineHeight: 22,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  previewFooter: {
    padding: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  privacyBadgeLabel: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  privacyBadgeText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurface,
  },
  privacyChangeHint: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  previewPickerOptions: {
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.lg,
    margin: spacing.lg,
    marginTop: 0,
    overflow: 'hidden',
  },
  previewEditButton: {
    marginTop: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  previewEditButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onPrimary,
  },
  viewAllPostsButton: {
    marginTop: spacing.md,
    backgroundColor: colors.surfaceContainerHigh,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  viewAllPostsButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
});
