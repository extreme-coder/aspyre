import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { onboardingColors, onboardingTypography } from '../../constants/onboardingTheme';

const wordmarkBlack = require('../../../assets/wordmark_black.png');
import OnboardingProgress from '../../components/OnboardingProgress';
import OnboardingNextButton from '../../components/OnboardingNextButton';

export default function OnboardingPhotoScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { displayName, locationCity, locationRegion, locationLat, locationLng } = route.params || {};

  const [photoUri, setPhotoUri] = useState(null);
  const [loading, setLoading] = useState(false);

  const handlePickPhoto = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to add a profile picture.'
        );
        return;
      }

      setLoading(true);

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1], // Square crop
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to select image');
    } finally {
      setLoading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUri(null);
  };

  const handleSkip = () => {
    navigation.navigate('OnboardingGoals', {
      displayName,
      locationCity,
      locationRegion,
      locationLat,
      locationLng,
      photoUri: null,
    });
  };

  const handleNext = () => {
    navigation.navigate('OnboardingGoals', {
      displayName,
      locationCity,
      locationRegion,
      locationLat,
      locationLng,
      photoUri,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={wordmarkBlack} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Progress Bar */}
      <OnboardingProgress progress={0.6} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.heading}>Add a profile image</Text>
        <Text style={styles.subheading}>
          Select a profile picture that will make your friends smile.
        </Text>

        {/* Photo Upload Area */}
        <TouchableOpacity
          style={styles.photoContainer}
          onPress={handlePickPhoto}
          disabled={loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={onboardingColors.textMuted} />
            </View>
          ) : photoUri ? (
            // Circle preview
            <View style={styles.photoPreviewContainer}>
              <Image source={{ uri: photoUri }} style={styles.photoPreview} />
            </View>
          ) : (
            // Placeholder - Square area with icon
            <View style={styles.photoPlaceholder}>
              <View style={styles.placeholderIcon}>
                <Ionicons name="image-outline" size={32} color={onboardingColors.textMuted} />
                <View style={styles.plusBadge}>
                  <Ionicons name="add" size={14} color={onboardingColors.white} />
                </View>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Change/Remove Photo */}
        {photoUri && (
          <View style={styles.photoActions}>
            <TouchableOpacity onPress={handlePickPhoto} style={styles.photoActionButton}>
              <Text style={styles.photoActionText}>Change Photo</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleRemovePhoto} style={styles.photoActionButton}>
              <Text style={[styles.photoActionText, styles.removeText]}>Remove</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Skip Link */}
        {!photoUri && (
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>Skip for now</Text>
          </TouchableOpacity>
        )}

      </View>

      {/* Next Button - only show if photo selected */}
      {photoUri && (
        <OnboardingNextButton
          onPress={handleNext}
          disabled={loading}
        />
      )}
    </View>
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
    alignItems: 'center',
  },
  heading: {
    ...onboardingTypography.heading,
    marginBottom: 8,
    textAlign: 'center',
  },
  subheading: {
    ...onboardingTypography.subheading,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  photoContainer: {
    width: 240,
    height: 240,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: onboardingColors.inputBg,
    borderRadius: 16,
  },
  photoPreviewContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoPreview: {
    width: 200,
    height: 200,
    borderRadius: 100, // Circle preview
  },
  photoPlaceholder: {
    flex: 1,
    backgroundColor: onboardingColors.inputBg,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderIcon: {
    position: 'relative',
  },
  plusBadge: {
    position: 'absolute',
    bottom: -4,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: onboardingColors.textMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoActions: {
    flexDirection: 'row',
    gap: 24,
    marginBottom: 24,
  },
  photoActionButton: {
    paddingVertical: 8,
  },
  photoActionText: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.textPrimary,
  },
  removeText: {
    color: onboardingColors.textMuted,
  },
  skipButton: {
    paddingVertical: 12,
    marginBottom: 24,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.textSecondary,
    textDecorationLine: 'underline',
  },
});
