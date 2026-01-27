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
  KeyboardAvoidingView,
  Platform,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';

/**
 * Screen for editing user profile information.
 */
export default function EditProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile, uploadAvatar, fetchProfile } = useProfile(user?.id);

  const [displayName, setDisplayName] = useState('');
  const [pendingAvatarUri, setPendingAvatarUri] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const justSavedRef = useRef(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
    }
  }, [profile]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (justSavedRef.current) return false;
    if (!profile) return false;
    return (
      displayName !== (profile.display_name || '') ||
      pendingAvatarUri !== null
    );
  }, [profile, displayName, pendingAvatarUri]);

  // Warn user if they try to leave with unsaved changes
  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges() || saving) return;

      e.preventDefault();

      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure you want to leave?',
        [
          { text: 'Keep Editing', style: 'cancel' },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    });

    return unsubscribe;
  }, [navigation, hasUnsavedChanges, saving]);

  const pickAvatar = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Please allow access to your photo library to change your avatar.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.[0]?.uri) {
        setPendingAvatarUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to select image');
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Display name is required');
      return;
    }

    setSaving(true);

    // Upload avatar if there's a pending one
    if (pendingAvatarUri) {
      setUploadingAvatar(true);
      const avatarResult = await uploadAvatar(pendingAvatarUri);
      setUploadingAvatar(false);

      if (avatarResult.error) {
        setSaving(false);
        Alert.alert('Error', avatarResult.error.message || 'Failed to upload avatar');
        return;
      }
    }

    const updates = {
      display_name: displayName.trim(),
    };

    const result = await updateProfile(updates);

    setSaving(false);

    if (result.error) {
      Alert.alert('Error', result.error.message || 'Failed to update profile');
    } else {
      justSavedRef.current = true;
      setPendingAvatarUri(null);
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerButton} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#000" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.headerButton}>
            {saving ? (
              <ActivityIndicator size="small" color="#000" />
            ) : (
              <Text style={styles.saveButton}>Save</Text>
            )}
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={pickAvatar} disabled={saving}>
              {pendingAvatarUri ? (
                <Image source={{ uri: pendingAvatarUri }} style={styles.avatarImage} />
              ) : profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0 ? (
                <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {(displayName || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
              {uploadingAvatar && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={pickAvatar} disabled={saving}>
              <Text style={styles.changeAvatarText}>
                {profile?.avatar_url || pendingAvatarUri ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
            {pendingAvatarUri && (
              <TouchableOpacity onPress={() => setPendingAvatarUri(null)}>
                <Text style={styles.removeAvatarText}>Remove</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Display Name */}
          <View style={styles.field}>
            <Text style={styles.label}>Display Name *</Text>
            <TextInput
              style={styles.input}
              value={displayName}
              onChangeText={setDisplayName}
              placeholder="Your display name"
              placeholderTextColor="#999"
              maxLength={50}
              editable={!saving}
            />
            <Text style={styles.hint}>This is how you appear to others</Text>
          </View>

          {/* Email (read-only) */}
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <Text style={styles.readOnlyValue}>{user?.email}</Text>
            <Text style={styles.hint}>Contact support to change your email</Text>
          </View>

          {/* Privacy note */}
          <View style={styles.note}>
            <Text style={styles.noteText}>
              For privacy and location settings, go to Settings.
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Settings')}>
              <Text style={styles.noteLink}>Open Settings</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  headerButton: {
    width: 50,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
    color: '#000',
  },
  saveButton: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '300',
    color: '#fff',
  },
  avatarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 12,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeAvatarText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#000',
    marginBottom: 8,
  },
  removeAvatarText: {
    fontSize: 12,
    fontWeight: '400',
    color: '#999',
  },
  field: {
    marginBottom: 24,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
    color: '#999',
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    fontSize: 16,
    fontWeight: '300',
    color: '#000',
  },
  hint: {
    fontSize: 11,
    fontWeight: '300',
    color: '#999',
    marginTop: 6,
  },
  readOnlyValue: {
    fontSize: 16,
    fontWeight: '300',
    color: '#666',
    paddingVertical: 14,
  },
  note: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    marginTop: 16,
  },
  noteText: {
    fontSize: 13,
    fontWeight: '300',
    color: '#666',
    marginBottom: 8,
  },
  noteLink: {
    fontSize: 13,
    fontWeight: '500',
    color: '#000',
    textDecorationLine: 'underline',
  },
});
