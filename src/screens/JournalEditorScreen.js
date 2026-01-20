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
import { useAuth } from '../contexts/AuthContext';
import { useJournalEditor } from '../hooks/useJournalEditor';
import { useGoals } from '../hooks/useGoals';
import { formatDateForDisplay } from '../utils/dateUtils';

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

const PROOF_CHIP_TYPES = [
  { type: 'minutes', label: 'min', placeholder: '45' },
  { type: 'sessions', label: 'sessions', placeholder: '3' },
  { type: 'streak', label: 'day streak', placeholder: '7' },
  { type: 'custom', label: '', placeholder: 'e.g., 5 pages' },
];

/**
 * Screen for editing any journal entry (past or present).
 * Receives journal data via route params.
 */
export default function JournalEditorScreen({ navigation, route }) {
  const { journal: initialJournal } = route.params || {};
  const { user } = useAuth();
  const {
    journal,
    loading,
    saving,
    error,
    fetchJournal,
    updateJournal,
    fetchBullets,
    fetchProofChips,
  } = useJournalEditor(user?.id);
  const { activeGoals, loading: goalsLoading, fetchGoals } = useGoals(user?.id);

  // Form state
  const [primaryGoalId, setPrimaryGoalId] = useState(null);
  const [mediaUri, setMediaUri] = useState(null);
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
  const [postPrivacy, setPostPrivacy] = useState('friends');

  // UI state
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [showPrivacyPicker, setShowPrivacyPicker] = useState(false);
  const [showFeedbackPicker, setShowFeedbackPicker] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const nextBulletId = useRef(2);
  const nextChipId = useRef(2);
  const justSavedRef = useRef(false);

  // Load journal data on mount
  useEffect(() => {
    fetchGoals();
    if (initialJournal?.id) {
      fetchJournal(initialJournal.id);
    }
  }, [initialJournal?.id, fetchJournal, fetchGoals]);

  // Initialize form when journal loads
  useEffect(() => {
    const initializeForm = async () => {
      const journalData = journal || initialJournal;
      if (!journalData || initialized) return;

      setPrimaryGoalId(journalData.primary_goal_id);
      setMediaUri(journalData.media || null);
      setHeadline(journalData.headline || '');
      setFriction(journalData.challenge || '');
      setFix(journalData.win || '');
      setTakeaway(journalData.takeaway || '');
      setNextStep(journalData.next_step || '');
      setFeedbackMode(journalData.feedback_mode || 'open');
      setFeedbackQuestion(journalData.feedback_question || '');
      setPostPrivacy(journalData.post_privacy || 'friends');

      // Fetch bullets and chips
      const loadedBullets = await fetchBullets(journalData.id);
      if (loadedBullets.length > 0) {
        const bulletsWithKeys = loadedBullets.map((b, i) => ({
          ...b,
          id: `db_bullet_${b.id || i}`,
        }));
        setBullets(bulletsWithKeys);
        nextBulletId.current = loadedBullets.length + 1;
      }

      const loadedChips = await fetchProofChips(journalData.id);
      if (loadedChips.length > 0) {
        const chipsWithKeys = loadedChips.map((c, i) => ({
          ...c,
          id: `db_chip_${c.id || i}`,
        }));
        setProofChips(chipsWithKeys);
        nextChipId.current = loadedChips.length + 1;
      }

      setInitialized(true);
    };

    initializeForm();
  }, [journal, initialJournal, initialized, fetchBullets, fetchProofChips]);

  // Check for unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (justSavedRef.current) return false;
    const journalData = journal || initialJournal;
    if (!journalData) return false;

    return (
      headline !== (journalData.headline || '') ||
      friction !== (journalData.challenge || '') ||
      fix !== (journalData.win || '') ||
      takeaway !== (journalData.takeaway || '') ||
      nextStep !== (journalData.next_step || '') ||
      primaryGoalId !== journalData.primary_goal_id ||
      postPrivacy !== (journalData.post_privacy || 'friends')
    );
  }, [journal, initialJournal, headline, friction, fix, takeaway, nextStep, primaryGoalId, postPrivacy]);

  // Warn on navigation away with unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges() || saving) return;

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
  }, [navigation, hasUnsavedChanges, saving]);

  // Image picking
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your photo library.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please allow access to your camera.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const handleImageOptions = () => {
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

    if (field === 'type') {
      const chipType = PROOF_CHIP_TYPES.find(t => t.type === value);
      if (value === 'custom') {
        updated[index].label = '';
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

  // Save
  const handleSave = async () => {
    if (!headline.trim()) {
      Alert.alert('Headline required', 'Please add a headline for your post.');
      return;
    }

    setUploadingImage(true);

    const journalData = {
      primary_goal_id: primaryGoalId,
      headline: headline.trim() || null,
      challenge: friction.trim() || null,
      win: fix.trim() || null,
      takeaway: takeaway.trim() || null,
      next_step: nextStep.trim() || null,
      feedback_mode: feedbackMode,
      feedback_question: feedbackMode === 'question' ? feedbackQuestion.trim() : null,
      post_privacy: postPrivacy,
      open_to_feedback: feedbackMode !== 'none',
    };

    const validChips = proofChips.filter(c => c.value);
    const validBullets = bullets.filter(b => b.text.trim());

    const journalId = journal?.id || initialJournal?.id;
    const result = await updateJournal(
      journalId,
      journalData,
      validBullets,
      validChips,
      mediaUri && !mediaUri.startsWith('http') ? mediaUri : null
    );

    setUploadingImage(false);

    if (result.error) {
      Alert.alert('Oops!', result.error.message || 'Something went wrong.');
    } else {
      justSavedRef.current = true;
      Alert.alert('Updated!', 'Your changes have been saved.', [
        { text: 'Done', onPress: () => navigation.goBack() },
      ]);
    }
  };

  const journalData = journal || initialJournal;
  const selectedGoal = activeGoals.find((g) => g.id === primaryGoalId);
  const isLoading = loading || goalsLoading || !initialized;

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Edit Post</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color="#000" />
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.title}>Edit Post</Text>
            {journalData?.local_date && (
              <Text style={styles.dateText}>{formatDateForDisplay(journalData.local_date)}</Text>
            )}
          </View>
          <TouchableOpacity onPress={handleSave} disabled={saving || uploadingImage}>
            {saving || uploadingImage ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Hero Image */}
          <TouchableOpacity style={styles.imageSection} onPress={handleImageOptions}>
            {mediaUri ? (
              <Image source={{ uri: mediaUri }} style={styles.heroImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderText}>+ Add Photo</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Headline */}
          <View style={styles.section}>
            <Text style={styles.label}>Headline *</Text>
            <TextInput
              style={styles.headlineInput}
              value={headline}
              onChangeText={setHeadline}
              placeholder="What did you accomplish?"
              placeholderTextColor="#999"
              maxLength={100}
            />
          </View>

          {/* Goal Picker */}
          <View style={styles.section}>
            <Text style={styles.label}>Focus Goal</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowGoalPicker(!showGoalPicker)}
            >
              <Text style={selectedGoal ? styles.pickerValue : styles.pickerPlaceholder}>
                {selectedGoal
                  ? `${GOAL_TYPE_LABELS[selectedGoal.goal_type]}: ${selectedGoal.title}`
                  : 'Select a goal (optional)'}
              </Text>
            </TouchableOpacity>
            {showGoalPicker && (
              <View style={styles.pickerOptions}>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => {
                    setPrimaryGoalId(null);
                    setShowGoalPicker(false);
                  }}
                >
                  <Text style={styles.pickerOptionText}>No goal</Text>
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
                      {GOAL_TYPE_LABELS[goal.goal_type]}: {goal.title}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>

          {/* Proof Chips */}
          <View style={styles.section}>
            <Text style={styles.label}>Proof (optional)</Text>
            {proofChips.map((chip, index) => (
              <View key={chip.id} style={styles.chipRow}>
                <TextInput
                  style={styles.chipValueInput}
                  value={chip.value}
                  onChangeText={(text) => updateProofChip(index, 'value', text)}
                  placeholder={PROOF_CHIP_TYPES.find(t => t.type === chip.type)?.placeholder || ''}
                  placeholderTextColor="#999"
                  keyboardType={chip.type === 'custom' ? 'default' : 'numeric'}
                />
                <TouchableOpacity
                  style={styles.chipTypeButton}
                  onPress={() => {
                    const types = PROOF_CHIP_TYPES.map(t => t.type);
                    const currentIndex = types.indexOf(chip.type);
                    const nextIndex = (currentIndex + 1) % types.length;
                    updateProofChip(index, 'type', types[nextIndex]);
                  }}
                >
                  <Text style={styles.chipTypeText}>
                    {chip.type === 'custom' ? (chip.label || 'unit') : PROOF_CHIP_TYPES.find(t => t.type === chip.type)?.label}
                  </Text>
                </TouchableOpacity>
                {proofChips.length > 1 && (
                  <TouchableOpacity onPress={() => removeProofChip(index)}>
                    <Text style={styles.removeButton}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {proofChips.length < 4 && (
              <TouchableOpacity style={styles.addButton} onPress={addProofChip}>
                <Text style={styles.addButtonText}>+ Add metric</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Bullets */}
          <View style={styles.section}>
            <Text style={styles.label}>Key points (optional)</Text>
            {bullets.map((bullet) => (
              <View key={bullet.id} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <TextInput
                  style={styles.bulletInput}
                  value={bullet.text}
                  onChangeText={(text) => updateBullet(bullet.id, text)}
                  placeholder="What happened?"
                  placeholderTextColor="#999"
                  multiline
                />
                {bullets.length > 1 && (
                  <TouchableOpacity onPress={() => removeBullet(bullet.id)}>
                    <Text style={styles.removeButton}>×</Text>
                  </TouchableOpacity>
                )}
              </View>
            ))}
            {bullets.length < 5 && (
              <TouchableOpacity style={styles.addButton} onPress={addBullet}>
                <Text style={styles.addButtonText}>+ Add point</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Reflection Fields */}
          <View style={styles.section}>
            <Text style={styles.label}>Challenge (optional)</Text>
            <TextInput
              style={styles.textArea}
              value={friction}
              onChangeText={setFriction}
              placeholder="What was hard?"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Win (optional)</Text>
            <TextInput
              style={styles.textArea}
              value={fix}
              onChangeText={setFix}
              placeholder="What went well?"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Takeaway (optional)</Text>
            <TextInput
              style={styles.textArea}
              value={takeaway}
              onChangeText={setTakeaway}
              placeholder="What did you learn?"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.label}>Next step (optional)</Text>
            <TextInput
              style={styles.textArea}
              value={nextStep}
              onChangeText={setNextStep}
              placeholder="What's next?"
              placeholderTextColor="#999"
              multiline
            />
          </View>

          {/* Privacy */}
          <View style={styles.section}>
            <Text style={styles.label}>Visibility</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowPrivacyPicker(!showPrivacyPicker)}
            >
              <Text style={styles.pickerValue}>
                {PRIVACY_OPTIONS.find(p => p.value === postPrivacy)?.label || 'Friends Only'}
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
                    onPress={() => {
                      setPostPrivacy(option.value);
                      setShowPrivacyPicker(false);
                    }}
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

          {/* Feedback Mode */}
          <View style={styles.section}>
            <Text style={styles.label}>Feedback</Text>
            <TouchableOpacity
              style={styles.picker}
              onPress={() => setShowFeedbackPicker(!showFeedbackPicker)}
            >
              <Text style={styles.pickerValue}>
                {FEEDBACK_MODES.find(f => f.value === feedbackMode)?.label || 'Open to advice'}
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
                style={[styles.textArea, { marginTop: 12 }]}
                value={feedbackQuestion}
                onChangeText={setFeedbackQuestion}
                placeholder="What would you like feedback on?"
                placeholderTextColor="#999"
                multiline
              />
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
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
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
    fontSize: 11,
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
  placeholder: {
    minWidth: 50,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  imageSection: {
    marginBottom: 24,
  },
  heroImage: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
  },
  imagePlaceholder: {
    width: '100%',
    aspectRatio: 4 / 3,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#999',
  },
  section: {
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
  headlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 10,
    fontSize: 18,
    fontWeight: '400',
    color: '#000',
  },
  picker: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
  },
  pickerValue: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000',
  },
  pickerPlaceholder: {
    fontSize: 14,
    fontWeight: '400',
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
    borderBottomColor: '#f5f5f5',
  },
  pickerOptionActive: {
    backgroundColor: '#000',
  },
  pickerOptionText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#000',
  },
  pickerOptionTextActive: {
    color: '#fff',
  },
  chipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  chipValueInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#000',
  },
  chipTypeButton: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  chipTypeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
  },
  bulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  bulletDot: {
    fontSize: 16,
    fontWeight: '400',
    color: '#999',
    marginRight: 10,
    marginTop: 12,
  },
  bulletInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#eee',
    padding: 12,
    fontSize: 14,
    fontWeight: '400',
    color: '#000',
    minHeight: 44,
  },
  textArea: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    fontSize: 14,
    fontWeight: '400',
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    padding: 12,
  },
  addButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#666',
    letterSpacing: 1,
  },
  removeButton: {
    fontSize: 24,
    fontWeight: '300',
    color: '#ccc',
    paddingHorizontal: 10,
  },
  bottomSpacer: {
    height: 40,
  },
});
