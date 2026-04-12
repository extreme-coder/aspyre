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
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { useFriends } from '../hooks/useFriends';
import { useBlocks } from '../hooks/useBlocks';
import { useUnsavedChanges } from '../contexts/UnsavedChangesContext';
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
  editorialMargins,
  components,
} from '../constants/theme';

export default function SettingsScreen({ navigation }) {
  const { user, signOut } = useAuth();
  const { profile, loading, error, saving, updateProfile, getDeviceTimezone, fetchProfile } = useProfile(user?.id);
  const { friendCount, incomingCount, fetchAll: fetchFriends } = useFriends(user?.id);
  const { blockedUsers, unblockUser, fetchBlockedUsers } = useBlocks(user?.id);
  const { setUnsaved, clearUnsaved } = useUnsavedChanges();

  // Refetch profile when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchProfile();
      fetchFriends();
      fetchBlockedUsers();
      // Reset justSaved flag when returning to screen
      justSavedRef.current = false;
    }, [fetchProfile, fetchFriends, fetchBlockedUsers])
  );

  const [displayName, setDisplayName] = useState('');
  const [accountPrivacy, setAccountPrivacy] = useState('friends');
  const [locationEnabled, setLocationEnabled] = useState(false);
  const [locationCity, setLocationCity] = useState('');
  const [locationRegion, setLocationRegion] = useState('');
  const [locationLat, setLocationLat] = useState(null);
  const [locationLng, setLocationLng] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [manualLocationMode, setManualLocationMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const justSavedRef = useRef(false);

  // Populate form when profile loads
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || profile.full_name || '');
      setAccountPrivacy(profile.account_privacy || 'friends');
      setLocationEnabled(profile.location_enabled || false);
      setLocationCity(profile.location_city || '');
      setLocationRegion(profile.location_region || '');
      setLocationLat(profile.location_lat || null);
      setLocationLng(profile.location_lng || null);
      // If they have a city but no coords, they entered manually before
      if (profile.location_city && !profile.location_lat) {
        setManualLocationMode(true);
      }
    }
  }, [profile]);

  // Track changes
  useEffect(() => {
    if (!profile) return;
    const changed =
      displayName !== (profile.display_name || profile.full_name || '') ||
      accountPrivacy !== (profile.account_privacy || 'friends') ||
      locationEnabled !== (profile.location_enabled || false) ||
      locationCity !== (profile.location_city || '') ||
      locationRegion !== (profile.location_region || '') ||
      locationLat !== (profile.location_lat || null) ||
      locationLng !== (profile.location_lng || null);
    setHasChanges(changed);
  }, [displayName, accountPrivacy, locationEnabled, locationCity, locationRegion, locationLat, locationLng, profile]);

  // Sync unsaved changes to context for tab navigation warning
  useEffect(() => {
    if (justSavedRef.current) {
      clearUnsaved('Settings');
    } else {
      setUnsaved('Settings', hasChanges);
    }
  }, [hasChanges, setUnsaved, clearUnsaved]);

  // Clear unsaved state when component unmounts
  useEffect(() => {
    return () => {
      clearUnsaved('Settings');
    };
  }, [clearUnsaved]);

  // Handle location toggle
  const handleLocationToggle = async (enabled) => {
    if (!enabled) {
      // Turning off - clear location data
      setLocationEnabled(false);
      setLocationCity('');
      setLocationRegion('');
      setLocationLat(null);
      setLocationLng(null);
      setManualLocationMode(false);
      return;
    }

    // Turning on - try to get device location
    setLocationLoading(true);
    setLocationEnabled(true);

    try {
      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== 'granted') {
        // Permission denied - offer manual entry
        Alert.alert(
          'Location Access',
          "No worries! You can enter your city manually instead.",
          [{ text: 'OK' }]
        );
        setManualLocationMode(true);
        setLocationLoading(false);
        return;
      }

      // Get current position
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = position.coords;
      setLocationLat(latitude);
      setLocationLng(longitude);

      // Reverse geocode to get city name
      const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });

      if (address) {
        setLocationCity(address.city || address.subregion || '');
        setLocationRegion(address.region || '');
        setManualLocationMode(false);
      } else {
        // Couldn't geocode - let them enter manually
        Alert.alert(
          'Hmm...',
          "We found your location but couldn't determine the city. You can enter it manually.",
          [{ text: 'OK' }]
        );
        setManualLocationMode(true);
      }
    } catch (err) {
      console.warn('Location error:', err);
      Alert.alert(
        'Location Unavailable',
        "We couldn't get your location right now. You can enter your city manually.",
        [{ text: 'OK' }]
      );
      setManualLocationMode(true);
    } finally {
      setLocationLoading(false);
    }
  };

  // Refresh location
  const handleRefreshLocation = async () => {
    setLocationLoading(true);
    try {
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
        setManualLocationMode(false);
      }
    } catch (err) {
      Alert.alert('Oops!', "Couldn't refresh location. Please try again.");
    } finally {
      setLocationLoading(false);
    }
  };

  // Switch to manual mode
  const handleSwitchToManual = () => {
    setManualLocationMode(true);
    setLocationLat(null);
    setLocationLng(null);
  };

  const handleSave = async () => {
    const updates = {
      display_name: displayName.trim() || null,
      account_privacy: accountPrivacy,
      location_enabled: locationEnabled,
      location_city: locationEnabled ? locationCity.trim() || null : null,
      location_region: locationEnabled ? locationRegion.trim() || null : null,
      location_lat: locationEnabled ? locationLat : null,
      location_lng: locationEnabled ? locationLng : null,
    };

    const { error: saveError } = await updateProfile(updates);
    if (saveError) {
      Alert.alert('Oops!', "Couldn't save your settings. Please try again.");
    } else {
      justSavedRef.current = true;
      Alert.alert('Saved!', 'Your settings have been updated.');
      setHasChanges(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          const { error: logoutError } = await signOut();
          if (logoutError) {
            Alert.alert('Oops!', logoutError.message);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Couldn't load settings</Text>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backButton}>Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Display Name</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your name"
              placeholderTextColor={colors.onSurfaceVariant}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.value}>{user?.email}</Text>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Timezone</Text>
            <Text style={styles.value}>{profile?.timezone || getDeviceTimezone()}</Text>
          </View>

          <TouchableOpacity
            style={styles.editProfileButton}
            onPress={() => navigation.navigate('EditProfile')}
          >
            <Text style={styles.editProfileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        {/* Privacy Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Privacy</Text>

          <View style={styles.field}>
            <Text style={styles.label}>Account Visibility</Text>
            <View style={styles.privacyOptions}>
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  accountPrivacy === 'public' && styles.privacyOptionActive,
                ]}
                onPress={() => setAccountPrivacy('public')}
              >
                <Text
                  style={[
                    styles.privacyOptionText,
                    accountPrivacy === 'public' && styles.privacyOptionTextActive,
                  ]}
                >
                  Public
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.privacyOption,
                  accountPrivacy === 'friends' && styles.privacyOptionActive,
                ]}
                onPress={() => setAccountPrivacy('friends')}
              >
                <Text
                  style={[
                    styles.privacyOptionText,
                    accountPrivacy === 'friends' && styles.privacyOptionTextActive,
                  ]}
                >
                  Friends Only
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.hint}>
              {accountPrivacy === 'public'
                ? 'Anyone can see your journal posts (based on post privacy).'
                : 'Only friends can see your journal posts.'}
            </Text>
          </View>
        </View>

        {/* Social Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Social</Text>

          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => navigation.navigate('Friends')}
          >
            <View style={styles.linkRowContent}>
              <Text style={styles.linkRowLabel}>Friends</Text>
              <Text style={styles.linkRowValue}>
                {friendCount} friend{friendCount !== 1 ? 's' : ''}
                {incomingCount > 0 && ` (${incomingCount} pending)`}
              </Text>
            </View>
            <Text style={styles.linkRowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* Blocked Users Section */}
        {blockedUsers.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Blocked Users</Text>
            <Text style={styles.hint}>
              Blocked users cannot see your posts or send you friend requests.
            </Text>

            {blockedUsers.map((block) => (
              <View key={block.blocked_user_id} style={styles.blockedUserRow}>
                <View style={styles.blockedUserInfo}>
                  <Text style={styles.blockedUserName}>
                    {block.blocked_user?.display_name || block.blocked_user?.handle || 'User'}
                  </Text>
                  {block.blocked_user?.handle && (
                    <Text style={styles.blockedUserHandle}>@{block.blocked_user.handle}</Text>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.unblockButton}
                  onPress={() => {
                    Alert.alert(
                      'Unblock User',
                      `Are you sure you want to unblock ${block.blocked_user?.display_name || block.blocked_user?.handle}?`,
                      [
                        { text: 'Cancel', style: 'cancel' },
                        {
                          text: 'Unblock',
                          onPress: async () => {
                            const result = await unblockUser(block.blocked_user_id);
                            if (result.error) {
                              Alert.alert('Error', 'Failed to unblock user');
                            }
                          },
                        },
                      ]
                    );
                  }}
                >
                  <Text style={styles.unblockButtonText}>Unblock</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}

        {/* Location Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>

          <View style={styles.fieldRow}>
            <View style={styles.fieldRowText}>
              <Text style={styles.label}>Share Location</Text>
              <Text style={styles.hint}>Show your city to help connect with nearby users.</Text>
            </View>
            <Switch
              value={locationEnabled}
              onValueChange={handleLocationToggle}
              trackColor={{ false: colors.surfaceContainerHighest, true: colors.secondary }}
              thumbColor={colors.white}
              disabled={locationLoading}
            />
          </View>

          {locationEnabled && locationLoading && (
            <View style={styles.locationLoading}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={styles.locationLoadingText}>Finding your location...</Text>
            </View>
          )}

          {locationEnabled && !locationLoading && (
            <>
              {/* Show detected location */}
              {!manualLocationMode && locationCity ? (
                <View style={styles.detectedLocation}>
                  <View style={styles.detectedLocationInfo}>
                    <Text style={styles.detectedCity}>{locationCity}</Text>
                    {locationRegion && (
                      <Text style={styles.detectedRegion}>{locationRegion}</Text>
                    )}
                  </View>
                  <View style={styles.locationActions}>
                    <TouchableOpacity onPress={handleRefreshLocation} style={styles.locationActionButton}>
                      <Ionicons name="refresh-outline" size={18} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleSwitchToManual} style={styles.locationActionButton}>
                      <Ionicons name="pencil-outline" size={18} color={colors.onSurfaceVariant} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  {/* Manual entry mode */}
                  <View style={styles.field}>
                    <Text style={styles.label}>City</Text>
                    <TextInput
                      style={styles.input}
                      value={locationCity}
                      onChangeText={setLocationCity}
                      placeholder="Enter your city"
                      placeholderTextColor={colors.onSurfaceVariant}
                    />
                  </View>

                  <View style={styles.field}>
                    <Text style={styles.label}>Region / State</Text>
                    <TextInput
                      style={styles.input}
                      value={locationRegion}
                      onChangeText={setLocationRegion}
                      placeholder="Enter your region"
                      placeholderTextColor={colors.onSurfaceVariant}
                    />
                  </View>

                  {!manualLocationMode && (
                    <TouchableOpacity onPress={handleRefreshLocation} style={styles.detectButton}>
                      <Ionicons name="location-outline" size={18} color={colors.primary} />
                      <Text style={styles.detectButtonText}>Detect My Location</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </>
          )}
        </View>

        {/* Save Button */}
        {hasChanges && (
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={colors.onPrimary} size="small" />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Logout */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutButtonText}>Sign Out</Text>
        </TouchableOpacity>

        {/* Dev Tools - only in development */}
        {__DEV__ && (
          <TouchableOpacity
            style={styles.devToolsButton}
            onPress={() => navigation.navigate('DevTools')}
          >
            <Ionicons name="construct-outline" size={16} color={colors.onSurfaceVariant} />
            <Text style={styles.devToolsButtonText}>Developer Tools</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>Aspyre v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xxl,
  },
  errorTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleMd.fontSize,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingLeft: editorialMargins.left,
    paddingRight: editorialMargins.right,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  backButton: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.primary,
    minWidth: 50,
  },
  placeholder: {
    minWidth: 50,
  },
  title: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingLeft: editorialMargins.left,
    paddingRight: editorialMargins.right,
    paddingVertical: spacing.xl,
  },
  section: {
    marginBottom: spacing.xxl,
  },
  sectionTitle: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 2,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
    marginBottom: spacing.lg,
  },
  field: {
    marginBottom: spacing.xl,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.xl,
  },
  fieldRowText: {
    flex: 1,
    marginRight: spacing.lg,
  },
  label: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
    marginBottom: spacing.sm,
  },
  value: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  hint: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodySm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  editProfileButton: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingVertical: spacing.md,
    alignItems: 'center',
    marginTop: spacing.sm,
    borderRadius: radius.xl,
  },
  editProfileButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
  },
  input: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.sm,
    borderBottomWidth: 1,
    borderBottomColor: `rgba(196, 198, 207, 0.15)`,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurface,
  },
  privacyOptions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  privacyOption: {
    flex: 1,
    backgroundColor: colors.surfaceContainer,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderRadius: radius.lg,
  },
  privacyOptionActive: {
    backgroundColor: colors.primary,
  },
  privacyOptionText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  privacyOptionTextActive: {
    color: colors.onPrimary,
  },
  locationLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  locationLoadingText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  detectedLocation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  detectedLocationInfo: {
    flex: 1,
  },
  detectedCity: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleMd.fontSize,
    color: colors.onSurface,
  },
  detectedRegion: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodySm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  locationActions: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  locationActionButton: {
    padding: spacing.xs,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerHighest,
    paddingVertical: spacing.md,
    marginTop: spacing.sm,
    borderRadius: radius.xl,
  },
  detectButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurface,
  },
  saveButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderRadius: radius.xl,
  },
  saveButtonDisabled: {
    backgroundColor: colors.onSurfaceVariant,
  },
  saveButtonText: {
    fontFamily: fontFamily.semiBold,
    color: colors.onPrimary,
    textAlign: 'center',
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 2,
  },
  logoutButton: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingVertical: spacing.lg,
    marginBottom: spacing.xxl,
    borderRadius: radius.xl,
  },
  logoutButtonText: {
    fontFamily: fontFamily.medium,
    color: colors.onSurface,
    textAlign: 'center',
    fontSize: typography.labelMd.fontSize,
    letterSpacing: 2,
  },
  footer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  footerText: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    color: colors.outlineVariant,
    letterSpacing: 1,
  },
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    padding: spacing.lg,
    borderRadius: radius.lg,
  },
  linkRowBorderTop: {
    // Removed - no borders in new design
  },
  linkRowContent: {
    flex: 1,
  },
  linkRowLabel: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleSm.fontSize,
    color: colors.onSurface,
  },
  linkRowValue: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodySm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  linkRowArrow: {
    fontFamily: fontFamily.regular,
    fontSize: 20,
    color: colors.onSurfaceVariant,
    marginLeft: spacing.md,
  },
  blockedUserRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceContainerLow,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
  },
  blockedUserInfo: {
    flex: 1,
  },
  blockedUserName: {
    fontFamily: fontFamily.medium,
    fontSize: typography.titleSm.fontSize,
    color: colors.onSurface,
  },
  blockedUserHandle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodySm.fontSize,
    color: colors.onSurfaceVariant,
    marginTop: spacing.xs,
  },
  unblockButton: {
    backgroundColor: colors.surfaceContainerHighest,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.xl,
  },
  unblockButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
  devToolsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceContainerLow,
    paddingVertical: 14,
    marginBottom: spacing.lg,
    borderRadius: radius.lg,
  },
  devToolsButtonText: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelMd.fontSize,
    color: colors.onSurfaceVariant,
  },
});
