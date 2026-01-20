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
import * as ImagePicker from 'expo-image-picker';
import { useFocusEffect } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useJournal } from '../hooks/useJournal';
import { useGoals } from '../hooks/useGoals';
import { useProfile } from '../hooks/useProfile';
import { formatDateForDisplay } from '../utils/dateUtils';
import HeaderProfileButton from '../components/HeaderProfileButton';

const PRIVACY_OPTIONS = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends Only' },
  { value: 'only_me', label: 'Only Me' },
];

const FEEDBACK_MODES = [
  { value: 'none', label: 'No feedback' },
  { value: 'question', label: 'Ask a question' },
  { value: 'open', label: 'Open to advice' },
];

const GOAL_TYPE_LABELS = {
  habit: 'Habit',
  skill: 'Skill',
  project: 'Project',
  mindset: 'Mindset',
};

// Proof chip type options
const PROOF_CHIP_TYPES = [
  { type: 'minutes', label: 'min', placeholder: '45' },
  { type: 'sessions', label: 'sessions', placeholder: '3' },
  { type: 'streak', label: 'day streak', placeholder: '7' },
  { type: 'custom', label: '', placeholder: 'e.g., 5 pages' },
];

// Autosave debounce delay in ms
const AUTOSAVE_DELAY = 2000;

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
    fetchBullets,
    fetchProofChips,
  } = useJournal(user?.id, profile?.timezone);

  // Refetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchGoals();
      fetchTodayJournal();
    }, [fetchGoals, fetchTodayJournal])
  );

  // Form state - New format
  const [primaryGoalId, setPrimaryGoalId] = useState(null);
  const [mediaUri, setMediaUri] = useState(null); // Local or remote URI
  const [headline, setHeadline] = useState('');
  const [proofChips, setProofChips] = useState([
    { id: 'chip_1', type: 'minutes', value: '', label: 'min' },
  ]);
  const [bullets, setBullets] = useState([{ id: 'bullet_1', text: '' }]);
  const [friction, setFriction] = useState('');
  const [fix, setFix] = useState('');
  const [takeaway, setTakeaway] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [feedbackMode, setFeedbackMode] = useState('open');
  const [feedbackQuestion, setFeedbackQuestion] = useState('');
  // Default post privacy based on account privacy (public account = everyone, friends account = friends)
  const getDefaultPrivacy = useCallback(() => {
    return profile?.account_privacy === 'public' ? 'everyone' : 'friends';
  }, [profile?.account_privacy]);
  const [postPrivacy, setPostPrivacy] = useState('friends');

  // UI state
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showPrivacyPicker, setShowPrivacyPicker] = useState(false);
  const [showFeedbackPicker, setShowFeedbackPicker] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const autosaveTimer = useRef(null);
  const nextBulletId = useRef(2);
  const nextChipId = useRef(2);
  const justSavedRef = useRef(false);

  const loading = journalLoading || goalsLoading;

  // Set default privacy when profile loads (before initialization)
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
    setHeadline(todayJournal.headline || '');
    setFriction(todayJournal.challenge || '');
    setFix(todayJournal.win || '');
    setTakeaway(todayJournal.takeaway || '');
    setNextStep(todayJournal.next_step || '');
    setFeedbackMode(todayJournal.feedback_mode || 'open');
    setFeedbackQuestion(todayJournal.feedback_question || '');
    setPostPrivacy(todayJournal.post_privacy || getDefaultPrivacy());

    // Fetch bullets and chips
    const loadedBullets = await fetchBullets(todayJournal.id);
    if (loadedBullets.length > 0) {
      const bulletsWithKeys = loadedBullets.map((b, i) => ({
        ...b,
        id: `db_bullet_${b.id || i}`,
      }));
      setBullets(bulletsWithKeys);
      nextBulletId.current = loadedBullets.length + 1;
    } else {
      setBullets([{ id: 'bullet_1', text: '' }]);
      nextBulletId.current = 2;
    }

    const loadedChips = await fetchProofChips(todayJournal.id);
    if (loadedChips.length > 0) {
      const chipsWithKeys = loadedChips.map((c, i) => ({
        ...c,
        id: `db_chip_${c.id || i}`,
      }));
      setProofChips(chipsWithKeys);
      nextChipId.current = loadedChips.length + 1;
    } else {
      setProofChips([{ id: 'chip_1', type: 'minutes', value: '', label: 'min' }]);
      nextChipId.current = 2;
    }
  }, [todayJournal, fetchBullets, fetchProofChips, getDefaultPrivacy]);

  // Enter edit mode and reload form data
  const enterEditMode = useCallback(async () => {
    await loadFormFromJournal();
    setIsEditing(true);
  }, [loadFormFromJournal]);

  // Initialize form from existing journal or draft
  useEffect(() => {
    const initializeForm = async () => {
      if (loading || initialized) return;

      if (todayJournal) {
        // Load from existing journal
        setPrimaryGoalId(todayJournal.primary_goal_id);
        setMediaUri(todayJournal.media || null);
        setHeadline(todayJournal.headline || '');
        setFriction(todayJournal.challenge || '');
        setFix(todayJournal.win || '');
        setTakeaway(todayJournal.takeaway || '');
        setNextStep(todayJournal.next_step || '');
        setFeedbackMode(todayJournal.feedback_mode || 'open');
        setFeedbackQuestion(todayJournal.feedback_question || '');
        setPostPrivacy(todayJournal.post_privacy || getDefaultPrivacy());

        // Fetch bullets and chips
        const loadedBullets = await fetchBullets(todayJournal.id);
        if (loadedBullets.length > 0) {
          // Add string prefix to ensure unique keys
          const bulletsWithKeys = loadedBullets.map((b, i) => ({
            ...b,
            id: `db_bullet_${b.id || i}`,
          }));
          setBullets(bulletsWithKeys);
          nextBulletId.current = loadedBullets.length + 1;
        }

        const loadedChips = await fetchProofChips(todayJournal.id);
        if (loadedChips.length > 0) {
          // Add string prefix to ensure unique keys
          const chipsWithKeys = loadedChips.map((c, i) => ({
            ...c,
            id: `db_chip_${c.id || i}`,
          }));
          setProofChips(chipsWithKeys);
          nextChipId.current = loadedChips.length + 1;
        }
      } else {
        // Try loading from draft
        const savedDraft = await loadDraft();
        if (savedDraft) {
          setPrimaryGoalId(savedDraft.primaryGoalId);
          setMediaUri(savedDraft.mediaUri || null);
          setHeadline(savedDraft.headline || '');

          // Ensure proof chips have IDs
          const draftChips = savedDraft.proofChips || [{ id: 'chip_1', type: 'minutes', value: '', label: 'min' }];
          const chipsWithIds = draftChips.map((c, i) => ({
            ...c,
            id: c.id || `draft_chip_${i + 1}`,
          }));
          setProofChips(chipsWithIds);
          nextChipId.current = chipsWithIds.length + 1;

          // Ensure bullets have IDs
          const draftBullets = savedDraft.bullets || [{ id: 'bullet_1', text: '' }];
          const bulletsWithIds = draftBullets.map((b, i) => ({
            ...b,
            id: b.id || `draft_bullet_${i + 1}`,
          }));
          setBullets(bulletsWithIds);
          nextBulletId.current = bulletsWithIds.length + 1;

          setFriction(savedDraft.friction || '');
          setFix(savedDraft.fix || '');
          setTakeaway(savedDraft.takeaway || '');
          setNextStep(savedDraft.nextStep || '');
          setFeedbackMode(savedDraft.feedbackMode || 'open');
          setFeedbackQuestion(savedDraft.feedbackQuestion || '');
          setPostPrivacy(savedDraft.postPrivacy || getDefaultPrivacy());
        } else {
          // No draft, set default privacy based on account
          setPostPrivacy(getDefaultPrivacy());
        }
      }

      setInitialized(true);
    };

    initializeForm();
  }, [loading, todayJournal, initialized, loadDraft, fetchBullets, fetchProofChips, getDefaultPrivacy]);

  // Autosave draft
  const draftData = {
    primaryGoalId,
    mediaUri,
    headline,
    proofChips,
    bullets,
    friction,
    fix,
    takeaway,
    nextStep,
    feedbackMode,
    feedbackQuestion,
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
  }, [
    initialized,
    hasPostedToday,
    primaryGoalId,
    mediaUri,
    headline,
    proofChips,
    bullets,
    friction,
    fix,
    takeaway,
    nextStep,
    feedbackMode,
    feedbackQuestion,
    postPrivacy,
    saveDraft,
  ]);

  // Check if there are unsaved changes (content that would be lost)
  const hasUnsavedChanges = useCallback(() => {
    // If just saved, don't warn
    if (justSavedRef.current) return false;

    // If already posted today and not editing, no changes to lose
    if (hasPostedToday && !isEditing) return false;

    // Check if any meaningful content has been entered
    const hasHeadline = headline.trim().length > 0;
    const hasProofContent = proofChips.some(chip =>
      (chip.value && chip.value.toString().trim().length > 0) ||
      (chip.label && chip.label.trim().length > 0)
    );
    const hasBulletContent = bullets.some(b => b.text && b.text.trim().length > 0);
    const hasPlaybookContent = friction.trim().length > 0 ||
      fix.trim().length > 0 ||
      takeaway.trim().length > 0 ||
      nextStep.trim().length > 0;

    return hasHeadline || hasProofContent || hasBulletContent || hasPlaybookContent || mediaUri;
  }, [hasPostedToday, isEditing, headline, proofChips, bullets, friction, fix, takeaway, nextStep, mediaUri]);

  // Warn user if they try to leave with unsaved changes (stack navigation)
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

  // Bullet management
  const addBullet = () => {
    if (bullets.length < 5) {
      setBullets([...bullets, { id: `bullet_${nextBulletId.current++}`, text: '' }]);
    }
  };

  const updateBullet = (id, text) => {
    setBullets(bullets.map(b => (b.id === id ? { ...b, text } : b)));
  };

  const removeBullet = (id) => {
    if (bullets.length > 1) {
      setBullets(bullets.filter(b => b.id !== id));
    }
  };

  // Proof chip management
  const addProofChip = () => {
    if (proofChips.length < 4) {
      setProofChips([...proofChips, { id: `chip_${nextChipId.current++}`, type: 'custom', value: '', label: '' }]);
    }
  };

  const updateProofChip = (index, field, value) => {
    const updated = [...proofChips];
    updated[index] = { ...updated[index], [field]: value };

    // Auto-set label for known types, clear for custom
    if (field === 'type') {
      const chipType = PROOF_CHIP_TYPES.find(t => t.type === value);
      if (value === 'custom') {
        updated[index].label = ''; // Clear label for custom type
      } else if (chipType && chipType.label) {
        updated[index].label = chipType.label;
      }
    }

    setProofChips(updated);
  };

  const removeProofChip = (index) => {
    if (proofChips.length > 1) {
      setProofChips(proofChips.filter((_, i) => i !== index));
    }
  };

  // Validation
  const getOptionalMissingSections = () => {
    const missing = [];
    if (!mediaUri) missing.push('a photo');
    if (bullets.every(b => !b.text.trim())) missing.push('at least one bullet');
    if (activeGoals.length > 0 && !primaryGoalId) missing.push('a focus goal');
    return missing;
  };

  const isHeadlineMissing = () => !headline.trim();

  // Save
  const performSave = async () => {
    setUploadingImage(true);

    const journalData = {
      primary_goal_id: primaryGoalId,
      headline: headline.trim() || null,
      challenge: friction.trim() || null, // Maps to friction
      win: fix.trim() || null, // Maps to fix
      takeaway: takeaway.trim() || null,
      next_step: nextStep.trim() || null,
      feedback_mode: feedbackMode,
      feedback_question: feedbackMode === 'question' ? feedbackQuestion.trim() : null,
      post_privacy: postPrivacy,
      // Legacy fields set to null
      what_i_did: null,
      tomorrow_plan: null,
      discovery: null,
      mood: null,
      energy: null,
      open_to_feedback: feedbackMode !== 'none',
    };

    // Filter valid proof chips
    const validChips = proofChips.filter(c => c.value);

    // Filter valid bullets
    const validBullets = bullets.filter(b => b.text.trim());

    const result = await saveJournalWithExtras(
      journalData,
      validBullets,
      validChips,
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
      // Mark as just saved to prevent unsaved changes warning
      justSavedRef.current = true;

      const title = result.wasCreate ? 'Posted!' : 'Updated!';
      const message = result.wasCreate
        ? "Your proof is live. Keep the streak going!"
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
    // Headline is required
    if (isHeadlineMissing()) {
      Alert.alert(
        'Headline required',
        'Please add a headline for your post.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Other fields are optional but we'll ask
    const missing = getOptionalMissingSections();

    if (missing.length > 0) {
      const formatted =
        missing.length === 1
          ? missing[0]
          : missing.slice(0, -1).join(', ') + ' and ' + missing[missing.length - 1];

      Alert.alert(
        'Quick check',
        `You haven't added ${formatted}. Post anyway?`,
        [
          { text: 'Go back', style: 'cancel' },
          { text: 'Post anyway', onPress: performSave },
        ]
      );
    } else {
      await performSave();
    }
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
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  // Preview mode - show post as it looks to others
  if (hasPostedToday && !isEditing) {
    const goal = todayJournal?.primary_goal;

    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <HeaderProfileButton />
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Your Post</Text>
            <Text style={styles.dateText}>{formatDateForDisplay(localDate)}</Text>
          </View>
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

            {/* Headline */}
            {todayJournal?.headline && (
              <Text style={styles.previewHeadline}>{todayJournal.headline}</Text>
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

            {/* Proof chips preview */}
            {proofChips.some(c => c.value) && (
              <View style={styles.previewChipsRow}>
                {proofChips
                  .filter(c => c.value)
                  .map((chip) => (
                    <View key={chip.id} style={styles.previewChip}>
                      <Text style={styles.previewChipText}>
                        {chip.value} {chip.label}
                      </Text>
                    </View>
                  ))}
              </View>
            )}

            {/* Bullets preview */}
            {bullets.some(b => b.text.trim()) && (
              <View style={styles.previewBullets}>
                {bullets
                  .filter(b => b.text.trim())
                  .map((bullet) => (
                    <View key={bullet.id} style={styles.previewBulletRow}>
                      <Text style={styles.previewBulletDot}>•</Text>
                      <Text style={styles.previewBulletText}>{bullet.text}</Text>
                    </View>
                  ))}
              </View>
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
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.viewAllPostsButtonText}>View All Your Posts</Text>
          </TouchableOpacity>

          <View style={styles.previewExplainer}>
            <Text style={styles.previewExplainerText}>
              This is how your post appears in the feed.
            </Text>
          </View>
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
        <View style={styles.header}>
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
                        } else {
                          navigation.goBack();
                        }
                      },
                    },
                  ]
                );
              } else {
                if (isEditing) {
                  setIsEditing(false);
                } else {
                  navigation.goBack();
                }
              }
            }}
          >
            <Text style={styles.cancelButton}>{isEditing ? 'Cancel' : 'Cancel'}</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>{isEditing ? 'Edit Post' : 'New Post'}</Text>
            <Text style={styles.dateText}>{formatDateForDisplay(localDate)}</Text>
          </View>
          <TouchableOpacity onPress={handleSave} disabled={saving || uploadingImage}>
            {saving || uploadingImage ? (
              <ActivityIndicator size="small" color="#000" />
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
          {/* Focus Goal - First thing to select */}
          <View style={styles.field}>
            <Text style={styles.label}>Focus Goal</Text>
            {activeGoals.length === 0 ? (
              <TouchableOpacity
                style={styles.noGoalPrompt}
                onPress={() => navigation.navigate('Goals')}
              >
                <Text style={styles.noGoalText}>No goals yet. Tap to create one.</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.picker}
                onPress={() => setShowGoalPicker(!showGoalPicker)}
              >
                <Text style={[styles.pickerText, !selectedGoal && styles.pickerPlaceholder]}>
                  {selectedGoal ? selectedGoal.title : 'Select a goal...'}
                </Text>
              </TouchableOpacity>
            )}
            {showGoalPicker && (
              <View style={styles.pickerOptions}>
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

          {/* Hero Image Picker */}
          <TouchableOpacity style={styles.imagePicker} onPress={showImageOptions}>
            {mediaUri && typeof mediaUri === 'string' && mediaUri.length > 0 ? (
              <Image source={{ uri: mediaUri }} style={styles.heroImage} />
            ) : (
              <View style={styles.imagePickerPlaceholder}>
                <Text style={styles.imagePickerIcon}>+</Text>
                <Text style={styles.imagePickerText}>Add Photo</Text>
                <Text style={styles.imagePickerHint}>Show your progress</Text>
              </View>
            )}
          </TouchableOpacity>

          {mediaUri && (
            <TouchableOpacity style={styles.changeImageButton} onPress={showImageOptions}>
              <Text style={styles.changeImageText}>Change Photo</Text>
            </TouchableOpacity>
          )}

          {/* Headline */}
          <View style={styles.field}>
            <Text style={styles.label}>Headline</Text>
            <TextInput
              style={styles.headlineInput}
              value={headline}
              onChangeText={setHeadline}
              placeholder="What's your win today?"
              placeholderTextColor="#999"
              maxLength={100}
            />
            <Text style={styles.charCount}>{headline.length}/100</Text>
          </View>

          {/* Proof Chips */}
          <View style={styles.field}>
            <Text style={styles.label}>Proof (Metrics)</Text>
            <Text style={styles.hint}>Add 1-4 numbers that prove your progress</Text>

            {proofChips.map((chip, index) => (
              <View key={chip.id} style={styles.chipRow}>
                <TextInput
                  style={[
                    styles.chipValueInput,
                    focusedField === `chip_value_${index}` && styles.inputFocused,
                  ]}
                  value={chip.value}
                  onChangeText={(text) => updateProofChip(index, 'value', text)}
                  onFocus={() => setFocusedField(`chip_value_${index}`)}
                  onBlur={() => setFocusedField(null)}
                  placeholder={PROOF_CHIP_TYPES.find(t => t.type === chip.type)?.placeholder || ''}
                  placeholderTextColor="#ccc"
                  keyboardType="numeric"
                />
                <TouchableOpacity
                  style={styles.chipTypeButton}
                  onPress={() => {
                    const currentIndex = PROOF_CHIP_TYPES.findIndex(t => t.type === chip.type);
                    const nextIndex = (currentIndex + 1) % PROOF_CHIP_TYPES.length;
                    const nextType = PROOF_CHIP_TYPES[nextIndex];
                    updateProofChip(index, 'type', nextType.type);
                  }}
                >
                  <Text style={styles.chipTypeText}>
                    {(chip.type === 'custom' ? (chip.label || 'custom') : PROOF_CHIP_TYPES.find(t => t.type === chip.type)?.label)?.toLowerCase()}
                  </Text>
                </TouchableOpacity>
                {chip.type === 'custom' && (
                  <TextInput
                    style={[
                      styles.chipLabelInput,
                      focusedField === `chip_label_${index}` && styles.inputFocused,
                    ]}
                    value={chip.label}
                    onChangeText={(text) => updateProofChip(index, 'label', text.toLowerCase().replace(/[^a-z]/g, ''))}
                    onFocus={() => setFocusedField(`chip_label_${index}`)}
                    onBlur={() => setFocusedField(null)}
                    placeholder="label"
                    placeholderTextColor="#ccc"
                  />
                )}
                {proofChips.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeChipButton}
                    onPress={() => removeProofChip(index)}
                  >
                    <Text style={styles.removeChipText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {proofChips.length < 4 && (
              <TouchableOpacity style={styles.addButton} onPress={addProofChip}>
                <Text style={styles.addButtonText}>+ Add Metric</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bullets */}
          <View style={styles.field}>
            <Text style={styles.label}>What Happened</Text>
            <Text style={styles.hint}>2-5 bullet points about your session</Text>

            {bullets.map((bullet, index) => (
              <View key={bullet.id} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <TextInput
                  style={styles.bulletInput}
                  value={bullet.text}
                  onChangeText={(text) => updateBullet(bullet.id, text)}
                  placeholder={index === 0 ? 'What did you work on?' : 'Add another point...'}
                  placeholderTextColor="#999"
                />
                {bullets.length > 1 && (
                  <TouchableOpacity
                    style={styles.removeBulletButton}
                    onPress={() => removeBullet(bullet.id)}
                  >
                    <Text style={styles.removeBulletText}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {bullets.length < 5 && (
              <TouchableOpacity style={styles.addButton} onPress={addBullet}>
                <Text style={styles.addButtonText}>+ Add Bullet</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Friction & Fix */}
          <View style={styles.sectionDivider}>
            <Text style={styles.sectionDividerText}>Playbook</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Friction</Text>
            <TextInput
              style={styles.textInput}
              value={friction}
              onChangeText={setFriction}
              placeholder="What was hard or got in your way?"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Fix</Text>
            <TextInput
              style={styles.textInput}
              value={fix}
              onChangeText={setFix}
              placeholder="How did you handle it?"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Takeaway</Text>
            <TextInput
              style={styles.textInput}
              value={takeaway}
              onChangeText={setTakeaway}
              placeholder="What's your key insight?"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Next Step</Text>
            <TextInput
              style={styles.textInput}
              value={nextStep}
              onChangeText={setNextStep}
              placeholder="What will you do next?"
              placeholderTextColor="#999"
            />
          </View>

          {/* Feedback Mode */}
          <View style={styles.field}>
            <Text style={styles.label}>Feedback</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowFeedbackPicker(!showFeedbackPicker)}
            >
              <Text style={styles.pickerText}>
                {FEEDBACK_MODES.find((f) => f.value === feedbackMode)?.label}
              </Text>
            </TouchableOpacity>
            {showFeedbackPicker && (
              <View style={styles.pickerOptions}>
                {FEEDBACK_MODES.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.pickerOption,
                      feedbackMode === option.value && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setFeedbackMode(option.value);
                      setShowFeedbackPicker(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        feedbackMode === option.value && styles.pickerOptionTextActive,
                      ]}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {feedbackMode === 'question' && (
              <TextInput
                style={[styles.textInput, styles.questionInput]}
                value={feedbackQuestion}
                onChangeText={setFeedbackQuestion}
                placeholder="What would you like to know?"
                placeholderTextColor="#999"
              />
            )}
          </View>

          {/* Privacy */}
          <View style={styles.field}>
            <Text style={styles.label}>Who Can See This</Text>
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
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  headerCenter: {
    alignItems: 'center',
  },
  cancelButton: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    minWidth: 50,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
  },
  dateText: {
    fontSize: 10,
    fontWeight: '300',
    color: '#999',
    marginTop: 2,
  },
  saveButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    minWidth: 50,
    textAlign: 'right',
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
  editNotice: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
    backgroundColor: '#f9f9f9',
  },
  editNoticeText: {
    fontSize: 11,
    fontWeight: '400',
    color: '#666',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },

  // Image picker
  imagePicker: {
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePickerPlaceholder: {
    aspectRatio: 4 / 3,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#eee',
    borderStyle: 'dashed',
    borderRadius: 8,
  },
  imagePickerIcon: {
    fontSize: 40,
    fontWeight: '200',
    color: '#ccc',
  },
  imagePickerText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginTop: 8,
  },
  imagePickerHint: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
    marginTop: 4,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
  },
  changeImageButton: {
    alignSelf: 'center',
    paddingVertical: 8,
    marginBottom: 16,
  },
  changeImageText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    textDecorationLine: 'underline',
  },

  // Fields
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  hint: {
    fontSize: 11,
    fontWeight: '300',
    color: '#999',
    marginBottom: 12,
    marginTop: -6,
  },
  headlineInput: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    fontSize: 18,
    fontWeight: '500',
    color: '#000',
  },
  charCount: {
    fontSize: 10,
    fontWeight: '300',
    color: '#ccc',
    textAlign: 'right',
    marginTop: 4,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    fontSize: 15,
    fontWeight: '300',
    color: '#000',
    minHeight: 60,
    textAlignVertical: 'top',
  },
  questionInput: {
    marginTop: 12,
  },
  inputFocused: {
    borderColor: '#000',
    borderWidth: 2,
  },

  // Proof chips
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  chipValueInput: {
    width: 60,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 10,
    fontSize: 16,
    fontWeight: '500',
    color: '#000',
    textAlign: 'center',
  },
  chipTypeButton: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 4,
  },
  chipTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  chipLabelInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 10,
    fontSize: 14,
    fontWeight: '300',
    color: '#000',
  },
  removeChipButton: {
    padding: 8,
  },
  removeChipText: {
    fontSize: 20,
    fontWeight: '300',
    color: '#999',
  },

  // Bullets
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  bulletDot: {
    fontSize: 18,
    fontWeight: '400',
    color: '#000',
    marginRight: 8,
    marginTop: 8,
  },
  bulletInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    fontSize: 15,
    fontWeight: '300',
    color: '#000',
  },
  removeBulletButton: {
    padding: 8,
    marginLeft: 4,
  },
  removeBulletText: {
    fontSize: 20,
    fontWeight: '300',
    color: '#999',
  },

  // Add buttons
  addButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },

  // Section divider
  sectionDivider: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    paddingTop: 24,
    marginBottom: 24,
    alignItems: 'center',
  },
  sectionDividerText: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#ccc',
    textTransform: 'uppercase',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    marginTop: -18,
  },

  // Pickers
  picker: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
  },
  pickerText: {
    fontSize: 15,
    fontWeight: '300',
    color: '#000',
  },
  pickerPlaceholder: {
    color: '#999',
  },
  pickerOptions: {
    borderWidth: 1,
    borderColor: '#eee',
    borderTopWidth: 0,
  },
  pickerOption: {
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerOptionActive: {
    backgroundColor: '#000',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#000',
  },
  pickerOptionTextActive: {
    color: '#fff',
  },
  pickerOptionType: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#999',
    textTransform: 'uppercase',
  },
  noGoalPrompt: {
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
    padding: 14,
  },
  noGoalText: {
    fontSize: 14,
    fontWeight: '300',
    color: '#999',
    textAlign: 'center',
  },

  // Error
  errorContainer: {
    backgroundColor: '#fee',
    padding: 12,
    marginTop: 16,
  },
  errorText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#c00',
    textAlign: 'center',
  },
  bottomSpacer: {
    height: 40,
  },

  // Preview styles
  previewContent: {
    padding: 24,
  },
  previewCard: {
    borderWidth: 1,
    borderColor: '#eee',
    overflow: 'hidden',
  },
  previewHeroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
  },
  previewHeadline: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    padding: 16,
    paddingBottom: 8,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 16,
    paddingTop: 8,
  },
  authorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  authorName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
  },
  goalText: {
    fontSize: 11,
    fontWeight: '300',
    color: '#666',
    marginTop: 2,
  },
  previewChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  previewChip: {
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 4,
  },
  previewChipText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#333',
  },
  previewBullets: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  previewBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  previewBulletDot: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    marginRight: 8,
  },
  previewBulletText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '300',
    color: '#333',
    lineHeight: 20,
  },
  previewFooter: {
    padding: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  privacyBadgeLabel: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
  },
  privacyBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
  },
  privacyChangeHint: {
    fontSize: 11,
    fontWeight: '500',
    color: '#666',
    textDecorationLine: 'underline',
  },
  previewPickerOptions: {
    borderWidth: 1,
    borderColor: '#eee',
    margin: 16,
    marginTop: 0,
  },
  previewEditButton: {
    marginTop: 16,
    backgroundColor: '#000',
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  previewEditButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#fff',
    letterSpacing: 1,
  },
  viewAllPostsButton: {
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewAllPostsButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#000',
    letterSpacing: 1,
  },
  previewExplainer: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  previewExplainerText: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
    textAlign: 'center',
  },
});
