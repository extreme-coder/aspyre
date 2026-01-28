import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Dimensions,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../contexts/AuthContext';
import { onboardingColors, onboardingTypography, onboardingStyles } from '../../constants/onboardingTheme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TOUR_SLIDES = [
  {
    id: 1,
    titleParts: [
      { text: 'Make ', highlight: false },
      { text: 'Progress', highlight: true },
      { text: ' Daily', highlight: false },
    ],
    image: require('../../../assets/tour1.png'),
    accentColor: '#84CC16', // lime green
  },
  {
    id: 2,
    titleParts: [
      { text: 'Find ', highlight: false },
      { text: 'Inspiration', highlight: true },
    ],
    image: require('../../../assets/tour2.png'),
    accentColor: '#22D3EE', // cyan
  },
  {
    id: 3,
    titleParts: [
      { text: 'Stop Scrolling — ', highlight: false },
      { text: 'Build Momentum', highlight: true },
    ],
    image: require('../../../assets/tour3.png'),
    accentColor: '#F97316', // coral
  },
];

export default function OnboardingTourScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef(null);
  const { signInWithApple } = useAuth();
  const [activeSlide, setActiveSlide] = useState(0);
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

  // Auto-scroll carousel
  useEffect(() => {
    const interval = setInterval(() => {
      const nextSlide = (activeSlide + 1) % TOUR_SLIDES.length;
      scrollViewRef.current?.scrollTo({
        x: nextSlide * SCREEN_WIDTH,
        animated: true,
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeSlide]);

  const handleScroll = (event) => {
    const slideIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    setActiveSlide(slideIndex);
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    const { error } = await signInWithApple();
    setLoading(false);

    if (error && error.message !== 'Sign in was cancelled') {
      Alert.alert('Error', error.message);
    }
  };

  const handleCreateAccount = () => {
    navigation.navigate('OnboardingAuth');
  };

  const handleSignIn = () => {
    navigation.navigate('OnboardingAuth', { isSignIn: true });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Carousel */}
      <View style={styles.carouselContainer}>
        <ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          decelerationRate="fast"
        >
          {TOUR_SLIDES.map((slide) => (
            <View key={slide.id} style={styles.slide}>
              {/* Tour Image */}
              <Image
                source={slide.image}
                style={styles.slideImage}
                resizeMode="contain"
              />

              {/* Title with highlighted words */}
              <Text style={styles.slideTitle}>
                {slide.titleParts.map((part, index) => (
                  <Text
                    key={index}
                    style={part.highlight ? { color: slide.accentColor } : null}
                  >
                    {part.text}
                  </Text>
                ))}
              </Text>
            </View>
          ))}
        </ScrollView>

        {/* Page Indicators */}
        <View style={styles.pageIndicators}>
          {TOUR_SLIDES.map((slide, index) => (
            <View
              key={slide.id}
              style={[
                styles.indicator,
                activeSlide === index && [
                  styles.indicatorActive,
                  { backgroundColor: TOUR_SLIDES[activeSlide].accentColor },
                ],
              ]}
            />
          ))}
        </View>
      </View>

      {/* Buttons */}
      <View style={[styles.buttonsSection, { paddingBottom: insets.bottom + 24 }]}>
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  carouselContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  slide: {
    width: SCREEN_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  slideImage: {
    width: SCREEN_WIDTH - 80,
    height: SCREEN_WIDTH - 40,
    borderRadius: 24,
    marginBottom: 24,
  },
  slideTitle: {
    ...onboardingTypography.heading,
    fontSize: 26,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: onboardingColors.progressInactive,
    marginHorizontal: 4,
  },
  indicatorActive: {
    width: 24,
  },
  buttonsSection: {
    paddingHorizontal: 24,
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
    borderColor: onboardingColors.black,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  createAccountButtonText: {
    ...onboardingTypography.button,
    color: onboardingColors.black,
  },
  signInLink: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  signInLinkText: {
    fontSize: 14,
    fontWeight: '400',
    color: onboardingColors.textSecondary,
  },
});
