import React from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { onboardingColors } from '../constants/onboardingTheme';

/**
 * Circular next button for onboarding flow.
 * Positioned at bottom-right of screen.
 * @param {function} onPress - Callback when pressed
 * @param {boolean} disabled - Whether button is disabled
 * @param {boolean} loading - Whether to show loading indicator
 */
export default function OnboardingNextButton({ onPress, disabled = false, loading = false }) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.8}
    >
      {loading ? (
        <ActivityIndicator color={onboardingColors.white} size="small" />
      ) : (
        <Ionicons
          name="arrow-forward"
          size={24}
          color={onboardingColors.white}
        />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: onboardingColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'absolute',
    bottom: 40,
    right: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonDisabled: {
    backgroundColor: onboardingColors.buttonDisabled,
  },
});
