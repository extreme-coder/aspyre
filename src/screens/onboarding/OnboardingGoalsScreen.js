import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

const wordmarkBlack = require('../../../assets/wordmark_black.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../contexts/AuthContext';
import { useGoals } from '../../hooks/useGoals';
import { onboardingColors, onboardingTypography } from '../../constants/onboardingTheme';
import OnboardingProgress from '../../components/OnboardingProgress';

const GOAL_TYPES = [
  {
    value: 'habit',
    label: 'Habit',
    description: 'Build a daily or weekly routine',
  },
  {
    value: 'skill',
    label: 'Skill',
    description: 'Learn something new',
  },
  {
    value: 'project',
    label: 'Project',
    description: 'Complete a specific outcome',
  },
  {
    value: 'mindset',
    label: 'Mindset',
    description: 'Shift your perspective',
  },
];

export default function OnboardingGoalsScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { updateProfile } = useAuth();
  const { user } = useAuth();
  const { createGoal } = useGoals(user?.id);

  const [goalTitle, setGoalTitle] = useState('');
  const [goalType, setGoalType] = useState(null);
  const [loading, setLoading] = useState(false);

  const isValid = goalTitle.trim().length >= 2 && goalType !== null;

  const completeOnboarding = async () => {
    const profileResult = await updateProfile({
      onboarding_complete: true,
    });

    if (profileResult.error) {
      Alert.alert('Error', profileResult.error.message || 'Failed to complete setup');
      return false;
    }
    return true;
  };

  const handleComplete = async () => {
    if (!isValid) return;

    setLoading(true);

    try {
      // Create the goal
      const goalResult = await createGoal({
        title: goalTitle.trim(),
        goal_type: goalType,
        tags: [],
      });

      if (goalResult.error) {
        console.warn('Goal creation failed:', goalResult.error);
        // Continue anyway
      }

      // Mark onboarding complete
      await completeOnboarding();

      // Navigation happens automatically via AppNavigator
    } catch (err) {
      console.error('Onboarding completion error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setLoading(true);

    try {
      // Just mark onboarding complete without creating a goal
      const success = await completeOnboarding();
      if (!success) {
        setLoading(false);
      }
      // Navigation happens automatically via AppNavigator
    } catch (err) {
      console.error('Skip error:', err);
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={wordmarkBlack} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Progress Bar */}
      <OnboardingProgress progress={0.9} />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.heading}>Create your first goal</Text>
        <Text style={styles.subheading}>
          What do you want to work on? You can skip this for now.
        </Text>

        {/* Goal Title Input */}
        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Goal Title</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., Exercise 3x per week"
            placeholderTextColor={onboardingColors.textMuted}
            value={goalTitle}
            onChangeText={setGoalTitle}
            maxLength={100}
            editable={!loading}
          />
        </View>

        {/* Goal Type Selector */}
        <View style={styles.typeSection}>
          <Text style={styles.inputLabel}>Goal Type</Text>
          <View style={styles.typeGrid}>
            {GOAL_TYPES.map((type) => (
              <TouchableOpacity
                key={type.value}
                style={[
                  styles.typeCard,
                  goalType === type.value && styles.typeCardActive,
                ]}
                onPress={() => setGoalType(type.value)}
                disabled={loading}
                activeOpacity={0.8}
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
      </ScrollView>

      {/* Bottom Buttons */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 24 }]}>
        <TouchableOpacity
          style={[
            styles.finishButton,
            !isValid && styles.finishButtonDisabled,
          ]}
          onPress={handleComplete}
          disabled={!isValid || loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={onboardingColors.white} size="small" />
          ) : (
            <Text style={styles.finishButtonText}>Create Goal</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          disabled={loading}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  logo: {
    width: 120,
    height: 35,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heading: {
    ...onboardingTypography.heading,
    marginBottom: 8,
  },
  subheading: {
    ...onboardingTypography.subheading,
    marginBottom: 32,
  },
  inputContainer: {
    marginBottom: 32,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: onboardingColors.textMuted,
    marginBottom: 8,
    marginLeft: 4,
  },
  input: {
    backgroundColor: onboardingColors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: onboardingColors.textPrimary,
  },
  typeSection: {
    marginBottom: 24,
  },
  typeGrid: {
    gap: 12,
  },
  typeCard: {
    backgroundColor: onboardingColors.inputBg,
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  typeCardActive: {
    backgroundColor: onboardingColors.black,
    borderColor: onboardingColors.black,
  },
  typeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: onboardingColors.textPrimary,
    marginBottom: 4,
  },
  typeLabelActive: {
    color: onboardingColors.white,
  },
  typeDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
  },
  typeDescriptionActive: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
    paddingTop: 16,
    backgroundColor: onboardingColors.background,
  },
  finishButton: {
    backgroundColor: onboardingColors.black,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
  },
  finishButtonDisabled: {
    backgroundColor: onboardingColors.buttonDisabled,
  },
  finishButtonText: {
    ...onboardingTypography.button,
    color: onboardingColors.white,
  },
  skipButton: {
    marginTop: 12,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.textMuted,
  },
});
