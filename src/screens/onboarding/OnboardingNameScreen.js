import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Image,
} from 'react-native';

const wordmarkBlack = require('../../../assets/wordmark_black.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { onboardingColors, onboardingTypography } from '../../constants/onboardingTheme';
import OnboardingProgress from '../../components/OnboardingProgress';
import OnboardingNextButton from '../../components/OnboardingNextButton';

export default function OnboardingNameScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();

  // Get any pre-filled data from previous screens or context
  const initialName = route.params?.displayName || '';
  const [displayName, setDisplayName] = useState(initialName);

  const isValid = displayName.trim().length >= 2;

  const handleNext = () => {
    if (!isValid) return;

    // Pass the display name to the next screen
    navigation.navigate('OnboardingLocation', {
      displayName: displayName.trim(),
    });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={[styles.container, { paddingTop: insets.top }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={wordmarkBlack} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Progress Bar */}
        <OnboardingProgress progress={0.2} />

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.heading}>What's your name?</Text>

          {/* Input */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Your name"
              placeholderTextColor={onboardingColors.textMuted}
              value={displayName}
              onChangeText={setDisplayName}
              autoCapitalize="words"
              autoCorrect={false}
              maxLength={50}
              returnKeyType="done"
              onSubmitEditing={handleNext}
            />
          </View>

        </View>

        {/* Next Button */}
        <OnboardingNextButton
          onPress={handleNext}
          disabled={!isValid}
        />
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  heading: {
    ...onboardingTypography.heading,
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: onboardingColors.inputBg,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: onboardingColors.textPrimary,
  },
});
