import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator,
  ScrollView,
  Image,
} from 'react-native';

const wordmarkBlack = require('../../../assets/wordmark_black.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { onboardingColors, onboardingTypography, onboardingStyles } from '../../constants/onboardingTheme';

export default function OnboardingAuthScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const isSignIn = route.params?.isSignIn || false;
  const { signUp, signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Required', 'Please enter your email');
      return;
    }

    if (!password) {
      Alert.alert('Required', 'Please enter your password');
      return;
    }

    if (isSignIn) {
      // Sign In
      setLoading(true);
      const { error } = await signIn(email.trim(), password);
      setLoading(false);

      if (error) {
        Alert.alert('Error', error.message);
      }
      // If successful, AuthContext handles navigation
    } else {
      // Sign Up
      if (password.length < 6) {
        Alert.alert('Password too short', 'Password must be at least 6 characters');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Passwords don\'t match', 'Please make sure your passwords match');
        return;
      }

      setLoading(true);
      const { error } = await signUp(email.trim(), password);

      if (error) {
        setLoading(false);
        Alert.alert('Error', error.message);
      } else {
        // Auto sign-in after signup to ensure we have a valid session
        const { error: signInError } = await signIn(email.trim(), password);
        setLoading(false);

        if (signInError) {
          // Signup succeeded but sign-in failed (likely email confirmation required)
          Alert.alert(
            'Check your email',
            'Please verify your email address before signing in.'
          );
        } else {
          // Fully authenticated - proceed to onboarding
          navigation.navigate('OnboardingName');
        }
      }
    }
  };

  const toggleMode = () => {
    if (isSignIn) {
      navigation.setParams({ isSignIn: false });
    } else {
      navigation.setParams({ isSignIn: true });
    }
    // Clear fields when switching
    setPassword('');
    setConfirmPassword('');
  };

  const isFormValid = () => {
    if (!email.trim() || !password) return false;
    if (!isSignIn && password !== confirmPassword) return false;
    if (!isSignIn && password.length < 6) return false;
    return true;
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          disabled={loading}
        >
          <Ionicons name="arrow-back" size={24} color={onboardingColors.textPrimary} />
        </TouchableOpacity>

        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image source={wordmarkBlack} style={styles.logo} resizeMode="contain" />
        </View>

        {/* Heading */}
        <Text style={styles.heading}>
          {isSignIn ? 'Welcome back' : 'Create your account'}
        </Text>
        <Text style={styles.subheading}>
          {isSignIn
            ? 'Sign in to continue your journey'
            : 'Start your journey to becoming your best self'}
        </Text>

        {/* Form */}
        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={onboardingColors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoCorrect={false}
              editable={!loading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Password</Text>
            <View style={styles.passwordContainer}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder={isSignIn ? 'Your password' : 'At least 6 characters'}
                placeholderTextColor={onboardingColors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={onboardingColors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {!isSignIn && (
            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Confirm Password</Text>
              <TextInput
                style={styles.input}
                placeholder="Confirm your password"
                placeholderTextColor={onboardingColors.textMuted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showPassword}
                editable={!loading}
              />
            </View>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !isFormValid() && styles.submitButtonDisabled,
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid() || loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color={onboardingColors.white} size="small" />
          ) : (
            <Text style={styles.submitButtonText}>
              {isSignIn ? 'Sign In' : 'Continue'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Toggle Mode */}
        <TouchableOpacity
          style={styles.toggleLink}
          onPress={toggleMode}
          disabled={loading}
        >
          <Text style={styles.toggleLinkText}>
            {isSignIn
              ? "Don't have an account? Create one"
              : 'Already have an account? Sign In'}
          </Text>
        </TouchableOpacity>

        {/* Forgot Password (sign in only) */}
        {isSignIn && (
          <TouchableOpacity
            style={styles.forgotLink}
            onPress={() => navigation.navigate('ForgotPassword')}
            disabled={loading}
          >
            <Text style={styles.forgotLinkText}>Forgot Password?</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  backButton: {
    marginTop: 16,
    marginBottom: 24,
    width: 40,
    height: 40,
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 180,
    height: 52,
  },
  heading: {
    ...onboardingTypography.heading,
    marginBottom: 8,
  },
  subheading: {
    ...onboardingTypography.subheading,
    marginBottom: 32,
  },
  form: {
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
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
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  submitButton: {
    backgroundColor: onboardingColors.black,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  submitButtonDisabled: {
    backgroundColor: onboardingColors.buttonDisabled,
  },
  submitButtonText: {
    ...onboardingTypography.button,
    color: onboardingColors.white,
  },
  toggleLink: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLinkText: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },
  forgotLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  forgotLinkText: {
    fontSize: 14,
    fontWeight: '400',
    color: onboardingColors.textMuted,
    textDecorationLine: 'underline',
  },
});
