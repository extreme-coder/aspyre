import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ImageBackground,
  Image,
  StatusBar,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../contexts/AuthContext';
import { onboardingColors, onboardingTypography } from '../../constants/onboardingTheme';

const backgroundImage = require('../../../assets/onboarding-background.jpg');
const wordmarkWhite = require('../../../assets/wordmark_white.png');

export default function OnboardingWelcomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { signInWithApple } = useAuth();
  const [appleAuthAvailable, setAppleAuthAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkAppleAuth = async () => {
      if (Platform.OS === 'ios') {
        const isAvailable = await AppleAuthentication.isAvailableAsync();
        setAppleAuthAvailable(isAvailable);
      }
    };
    checkAppleAuth();
  }, []);

  const handleTour = () => {
    navigation.navigate('OnboardingTour');
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);

    if (error && error.message !== 'Sign in was cancelled') {
      Alert.alert('Error', error.message);
    }
    // If successful, AuthContext will handle navigation
  };

  const handleCreateAccount = () => {
    navigation.navigate('OnboardingAuth');
  };

  const handleSignIn = () => {
    navigation.navigate('OnboardingAuth', { isSignIn: true });
  };

  return (
    <ImageBackground
      source={backgroundImage}
      style={styles.background}
      resizeMode="cover"
    >
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Gradient overlay - lighter top, darker bottom */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0.1)', 'rgba(0, 0, 0, 0.6)']}
        style={styles.overlay}
      />

      {/* Content */}
      <View style={[styles.content, { paddingTop: insets.top + 60 }]}>
        {/* Logo and Tagline */}
        <View style={styles.heroSection}>
          <Image source={wordmarkWhite} style={styles.logo} resizeMode="contain" />
          <Text style={styles.tagline}>Become Your Best Self</Text>
        </View>

        {/* Buttons */}
        <View style={[styles.buttonsSection, { paddingBottom: insets.bottom + 24 }]}>
          {/* Tour Button */}
          <TouchableOpacity
            style={styles.tourButton}
            onPress={handleTour}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.tourButtonText}>Take a quick tour</Text>
          </TouchableOpacity>

          {/* Apple Sign In */}
          {appleAuthAvailable && (
            <TouchableOpacity
              style={styles.appleButton}
              onPress={handleAppleSignIn}
              disabled={loading}
              activeOpacity={0.9}
            >
              {loading ? (
                <ActivityIndicator color={onboardingColors.white} size="small" />
              ) : (
                <>
                  <Text style={styles.appleIcon}></Text>
                  <Text style={styles.appleButtonText}>Sign in with Apple</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Create Account */}
          <TouchableOpacity
            style={styles.createAccountButton}
            onPress={handleCreateAccount}
            disabled={loading}
            activeOpacity={0.9}
          >
            <Text style={styles.createAccountButtonText}>Create Account</Text>
          </TouchableOpacity>

          {/* Sign In Link */}
          <TouchableOpacity
            style={styles.signInLink}
            onPress={handleSignIn}
            disabled={loading}
          >
            <Text style={styles.signInLinkText}>Already have an account? Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  heroSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logo: {
    width: 220,
    height: 64,
    marginBottom: 20,
  },
  tagline: {
    ...onboardingTypography.tagline,
    fontSize: 22,
    fontWeight: '500',
  },
  buttonsSection: {
    paddingHorizontal: 24,
  },
  tourButton: {
    backgroundColor: onboardingColors.white,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  tourButtonText: {
    ...onboardingTypography.button,
    color: onboardingColors.black,
  },
  appleButton: {
    backgroundColor: onboardingColors.black,
    borderRadius: 28,
    height: 56,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  appleIcon: {
    fontSize: 18,
    color: onboardingColors.white,
    marginRight: 8,
  },
  appleButtonText: {
    ...onboardingTypography.button,
    color: onboardingColors.white,
  },
  createAccountButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: onboardingColors.white,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  createAccountButtonText: {
    ...onboardingTypography.button,
    color: onboardingColors.white,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signInLinkText: {
    fontSize: 14,
    fontWeight: '400',
    color: onboardingColors.white,
    opacity: 0.9,
  },
});
