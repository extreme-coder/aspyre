import React from 'react';
import { View, StyleSheet } from 'react-native';
import { onboardingColors } from '../constants/onboardingTheme';

/**
 * Progress bar component for onboarding flow.
 * @param {number} progress - Progress value between 0 and 1
 */
export default function OnboardingProgress({ progress = 0 }) {
  const clampedProgress = Math.min(Math.max(progress, 0), 1);

  return (
    <View style={styles.container}>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${clampedProgress * 100}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  track: {
    height: 4,
    backgroundColor: onboardingColors.progressInactive,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    backgroundColor: onboardingColors.accent,
    borderRadius: 2,
  },
});
