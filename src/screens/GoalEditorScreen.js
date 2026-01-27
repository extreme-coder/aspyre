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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { useGoals } from '../hooks/useGoals';

const GOAL_TYPES = [
  { value: 'habit', label: 'Habit', description: 'Build a daily/weekly routine' },
  { value: 'skill', label: 'Skill', description: 'Learn something new' },
  { value: 'project', label: 'Project', description: 'Complete a specific outcome' },
  { value: 'mindset', label: 'Mindset', description: 'Shift your perspective' },
];

export default function GoalEditorScreen({ navigation, route }) {
  const { user } = useAuth();
  const { createGoal, updateGoal, deleteGoal, saving } = useGoals(user?.id);
  const existingGoal = route.params?.goal;
  const isEditing = !!existingGoal;

  const [title, setTitle] = useState('');
  const [goalType, setGoalType] = useState('habit');
  const [tagsInput, setTagsInput] = useState('');
  const justSavedRef = useRef(false);

  // Populate form when editing
  useEffect(() => {
    if (existingGoal) {
      setTitle(existingGoal.title || '');
      setGoalType(existingGoal.goal_type || 'habit');
      setTagsInput(existingGoal.tags?.join(', ') || '');
    }
  }, [existingGoal]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (justSavedRef.current) return false;
    if (isEditing) {
      // For existing goals, compare with original values
      return (
        title !== (existingGoal?.title || '') ||
        goalType !== (existingGoal?.goal_type || 'habit') ||
        tagsInput !== (existingGoal?.tags?.join(', ') || '')
      );
    } else {
      // For new goals, check if any content has been entered
      return title.trim().length > 0 || tagsInput.trim().length > 0;
    }
  }, [isEditing, existingGoal, title, goalType, tagsInput]);

  // Warn user if they try to leave with unsaved changes
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

  const handleSave = async () => {
    if (!title.trim()) {
      Alert.alert('Error', 'Please enter a goal title.');
      return;
    }

    const tags = tagsInput
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(t => t.length > 0);

    if (isEditing) {
      const { error } = await updateGoal(existingGoal.id, {
        title: title.trim(),
        goal_type: goalType,
        tags,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        justSavedRef.current = true;
        navigation.goBack();
      }
    } else {
      const { error } = await createGoal({
        title: title.trim(),
        goal_type: goalType,
        tags,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        justSavedRef.current = true;
        navigation.goBack();
      }
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Goal',
      `Are you sure you want to delete "${existingGoal.title}"? This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await deleteGoal(existingGoal.id);
            if (error) {
              Alert.alert('Error', error.message);
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#666" />
        </TouchableOpacity>
        <Text style={styles.title}>{isEditing ? 'Edit Goal' : 'New Goal'}</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerButton}>
          {saving ? (
            <ActivityIndicator size="small" color="#000" />
          ) : (
            <Text style={styles.saveButton}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Title */}
          <View style={styles.field}>
            <Text style={styles.label}>Goal Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="What do you want to achieve?"
              placeholderTextColor="#999"
              autoFocus={!isEditing}
            />
          </View>

          {/* Goal Type */}
          <View style={styles.field}>
            <Text style={styles.label}>Type</Text>
            <View style={styles.typeGrid}>
              {GOAL_TYPES.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.typeOption,
                    goalType === type.value && styles.typeOptionActive,
                  ]}
                  onPress={() => setGoalType(type.value)}
                >
                  <Text
                    style={[
                      styles.typeLabel,
                      goalType === type.value && styles.typeLabelActive,
                    ]}
                  >
                    {type.label}
                  </Text>
                  <Text
                    style={[
                      styles.typeDescription,
                      goalType === type.value && styles.typeDescriptionActive,
                    ]}
                  >
                    {type.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Tags */}
          <View style={styles.field}>
            <Text style={styles.label}>Tags (optional)</Text>
            <TextInput
              style={styles.input}
              value={tagsInput}
              onChangeText={(text) => setTagsInput(text.toLowerCase().replace(/[^a-z, ]/g, ''))}
              placeholder="fitness, morning, focus (comma separated)"
              placeholderTextColor="#999"
            />
            <Text style={styles.hint}>
              Tags help find posts from users with similar interests.
            </Text>
          </View>

          {/* Delete Button (only when editing) */}
          {isEditing && (
            <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
              <Ionicons name="trash-outline" size={18} color="#c00" />
              <Text style={styles.deleteButtonText}>Delete Goal</Text>
            </TouchableOpacity>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  headerButton: {
    width: 40,
    alignItems: 'center',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
  },
  saveButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  field: {
    marginBottom: 32,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#000',
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '300',
    color: '#000',
  },
  hint: {
    fontSize: 12,
    fontWeight: '300',
    color: '#999',
    marginTop: 8,
  },
  typeGrid: {
    gap: 12,
  },
  typeOption: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 16,
  },
  typeOptionActive: {
    borderColor: '#000',
    backgroundColor: '#000',
  },
  typeLabel: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
    marginBottom: 4,
  },
  typeLabelActive: {
    color: '#fff',
  },
  typeDescription: {
    fontSize: 12,
    fontWeight: '300',
    color: '#666',
  },
  typeDescriptionActive: {
    color: '#999',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#c00',
    paddingVertical: 16,
    marginTop: 24,
  },
  deleteButtonText: {
    color: '#c00',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 2,
  },
  bottomSpacer: {
    height: 40,
  },
});
