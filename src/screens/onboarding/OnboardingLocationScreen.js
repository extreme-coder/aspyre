import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';

const wordmarkBlack = require('../../../assets/wordmark_black.png');
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { onboardingColors, onboardingTypography } from '../../constants/onboardingTheme';
import OnboardingProgress from '../../components/OnboardingProgress';
import OnboardingNextButton from '../../components/OnboardingNextButton';

// Simple city search data (in a real app, you'd use a location API)
const POPULAR_CITIES = [
  { city: 'New York', region: 'NY, USA' },
  { city: 'Los Angeles', region: 'CA, USA' },
  { city: 'San Francisco', region: 'CA, USA' },
  { city: 'Chicago', region: 'IL, USA' },
  { city: 'Seattle', region: 'WA, USA' },
  { city: 'Austin', region: 'TX, USA' },
  { city: 'Denver', region: 'CO, USA' },
  { city: 'Miami', region: 'FL, USA' },
  { city: 'Boston', region: 'MA, USA' },
  { city: 'Portland', region: 'OR, USA' },
  { city: 'Vancouver', region: 'BC, Canada' },
  { city: 'Toronto', region: 'ON, Canada' },
  { city: 'London', region: 'UK' },
  { city: 'Paris', region: 'France' },
  { city: 'Berlin', region: 'Germany' },
  { city: 'Sydney', region: 'Australia' },
  { city: 'Tokyo', region: 'Japan' },
];

export default function OnboardingLocationScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { displayName } = route.params || {};

  const [locationCity, setLocationCity] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const locationDisplay = locationCity
    ? locationRegion
      ? `${locationCity}, ${locationRegion}`
      : locationCity
    : '';

  const isValid = locationCity.trim().length > 0;

  const handleDetectLocation = async () => {
    setLoading(true);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert(
          'Location Access',
          "No worries! You can enter your city manually instead.",
          [{ text: 'OK', onPress: () => setModalVisible(true) }]
        );
        setLoading(false);
        return;
      }

      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setLocationLat(latitude);
      setLocationLng(longitude);

      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (address) {
        setLocationCity(address.city || address.subregion || '');
        setLocationRegion(address.region || '');
      } else {
        Alert.alert(
          'Hmm...',
          "We found your location but couldn't determine the city. You can enter it manually.",
          [{ text: 'OK', onPress: () => setModalVisible(true) }]
        );
      }
    } catch (err) {
      console.warn('Location error:', err);
      Alert.alert(
        'Location Unavailable',
        "We couldn't get your location right now. You can enter your city manually.",
        [{ text: 'OK', onPress: () => setModalVisible(true) }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCity = (city, region) => {
    setLocationCity(city);
    setLocationRegion(region);
    setLocationLat(null);
    setLocationLng(null);
    setModalVisible(false);
    setSearchQuery('');
  };

  const handleClearLocation = () => {
    setLocationCity('');
    setLocationRegion('');
    setLocationLat(null);
    setLocationLng(null);
    setSearchQuery('');
  };

  const handleNext = () => {
    if (!isValid) return;

    navigation.navigate('OnboardingPhoto', {
      displayName,
      locationCity,
      locationRegion,
      locationLat,
      locationLng,
    });
  };

  // Filter cities based on search query
  const filteredCities = searchQuery.trim()
    ? POPULAR_CITIES.filter(
        (item) =>
          item.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.region.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : POPULAR_CITIES;

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image source={wordmarkBlack} style={styles.logo} resizeMode="contain" />
      </View>

      {/* Progress Bar */}
      <OnboardingProgress progress={0.4} />

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.heading}>Where are you based?</Text>

        {/* Location Input */}
        <TouchableOpacity
          style={styles.inputContainer}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <View style={styles.input}>
            <Ionicons
              name="location-outline"
              size={20}
              color={locationDisplay ? onboardingColors.textPrimary : onboardingColors.textMuted}
              style={styles.inputIcon}
            />
            <Text
              style={[
                styles.inputText,
                !locationDisplay && styles.inputPlaceholder,
              ]}
            >
              {locationDisplay || 'Select your city'}
            </Text>
            {locationDisplay ? (
              <TouchableOpacity onPress={handleClearLocation}>
                <Ionicons name="close-circle" size={20} color={onboardingColors.textMuted} />
              </TouchableOpacity>
            ) : (
              <Ionicons name="chevron-forward" size={20} color={onboardingColors.textMuted} />
            )}
          </View>
        </TouchableOpacity>

        {/* Detect Location Button */}
        {!locationDisplay && (
          <TouchableOpacity
            style={styles.detectButton}
            onPress={handleDetectLocation}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={onboardingColors.accent} />
            ) : (
              <>
                <Ionicons name="navigate-outline" size={18} color={onboardingColors.accent} />
                <Text style={styles.detectButtonText}>Use my current location</Text>
              </>
            )}
          </TouchableOpacity>
        )}

      </View>

      {/* Next Button */}
      <OnboardingNextButton
        onPress={handleNext}
        disabled={!isValid}
        loading={loading}
      />

      {/* Location Search Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={[styles.modalContainer, { paddingTop: insets.top }]}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setModalVisible(false)}
            >
              <Ionicons name="close" size={24} color={onboardingColors.textPrimary} />
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Location</Text>
            <TouchableOpacity
              style={styles.modalClearButton}
              onPress={handleClearLocation}
            >
              <Text style={styles.modalClearText}>Clear</Text>
            </TouchableOpacity>
          </View>

          {/* Current Location Option */}
          <TouchableOpacity
            style={styles.currentLocationOption}
            onPress={handleDetectLocation}
          >
            <Ionicons name="navigate-outline" size={20} color={onboardingColors.textSecondary} />
            <View style={styles.currentLocationText}>
              <Text style={styles.currentLocationTitle}>Current location</Text>
              <Text style={styles.currentLocationSubtitle}>
                {loading ? 'Detecting...' : 'Tap to detect your location'}
              </Text>
            </View>
            {loading && <ActivityIndicator size="small" color={onboardingColors.accent} />}
          </TouchableOpacity>

          {/* City List */}
          <FlatList
            data={filteredCities}
            keyExtractor={(item) => `${item.city}-${item.region}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.cityItem}
                onPress={() => handleSelectCity(item.city, item.region)}
              >
                <Ionicons
                  name="business-outline"
                  size={18}
                  color={onboardingColors.textMuted}
                />
                <Text style={styles.cityText}>
                  <Text style={styles.cityName}>{item.city}</Text>
                  {item.region && (
                    <Text style={styles.cityRegion}>, {item.region}</Text>
                  )}
                </Text>
              </TouchableOpacity>
            )}
            style={styles.cityList}
            contentContainerStyle={styles.cityListContent}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No cities found</Text>
              </View>
            }
          />

          {/* Search Input at Bottom */}
          <View style={[styles.searchContainer, { paddingBottom: insets.bottom + 16 }]}>
            <View style={styles.searchInputContainer}>
              <Ionicons name="search" size={18} color={onboardingColors.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search for a city"
                placeholderTextColor={onboardingColors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={18} color={onboardingColors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: onboardingColors.textPrimary,
  },
  inputPlaceholder: {
    color: onboardingColors.textMuted,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 16,
  },
  detectButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.accent,
    marginLeft: 8,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: onboardingColors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: onboardingColors.progressInactive,
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: onboardingColors.inputBg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: onboardingColors.textPrimary,
  },
  modalClearButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  modalClearText: {
    fontSize: 14,
    fontWeight: '500',
    color: onboardingColors.textSecondary,
  },
  currentLocationOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: onboardingColors.progressInactive,
  },
  currentLocationText: {
    flex: 1,
    marginLeft: 12,
  },
  currentLocationTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: onboardingColors.textPrimary,
  },
  currentLocationSubtitle: {
    fontSize: 13,
    color: onboardingColors.textMuted,
    marginTop: 2,
  },
  cityList: {
    flex: 1,
  },
  cityListContent: {
    paddingVertical: 8,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  cityText: {
    marginLeft: 12,
    fontSize: 15,
  },
  cityName: {
    fontWeight: '500',
    color: onboardingColors.textPrimary,
  },
  cityRegion: {
    fontWeight: '400',
    color: onboardingColors.textSecondary,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 14,
    color: onboardingColors.textMuted,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: onboardingColors.progressInactive,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: onboardingColors.inputBg,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: onboardingColors.textPrimary,
    marginLeft: 8,
  },
});
