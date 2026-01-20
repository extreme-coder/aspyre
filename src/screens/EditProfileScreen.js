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
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';

/**
 * Screen for editing user profile information.
 */
export default function EditProfileScreen({ navigation }) {
  const { user } = useAuth();
  const { profile, loading: profileLoading, updateProfile, fetchProfile } = useProfile(user?.id);

  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [bio, setBio] = useState('');
  const [saving, setSaving] = useState(false);
  const justSavedRef = useRef(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setHandle(profile.handle || '');
      setBio(profile.bio || '');
    }
  }, [profile]);

  // Check if there are unsaved changes
  const hasUnsavedChanges = useCallback(() => {
    if (justSavedRef.current) return false;
    if (!profile) return false;
    return (
      displayName !== (profile.display_name || '') ||
      handle !== (profile.handle || '') ||
      bio !== (profile.bio || '')
    );
  }, [profile, displayName, handle, bio]);

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

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Display name is required');
      return;
    }

    setSaving(true);

    const updates = {
      display_name: displayName.trim(),
      handle: handle.trim() || null,
      bio: bio.trim() || null,
    };

    const result = await updateProfile(updates);

    setSaving(false);

    if (result.error) {
      if (result.error.message?.includes('duplicate') || result.error.code === '23505') {
        Alert.alert('Handle Taken', 'This handle is already in use. Please choose another.');
      } else {
        Alert.alert('Error', result.error.message || 'Failed to update profile');
      }
    } else {
      justSavedRef.current = true;
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    }
  };

  if (profileLoading && !profile) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
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
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={styles.cancelButton}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
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
          {/* Avatar preview */}
          <View style={styles.avatarSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {(displayName || profile?.handle || '?')[0].toUpperCase()}
              </Text>
            </View>
            <Text style={styles.avatarHint}>
              Avatar customization coming soon
            </Text>
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

          {/* Handle */}
          <View style={styles.field}>
            <Text style={styles.label}>Handle</Text>
            <View style={styles.handleInputWrapper}>
              <Text style={styles.handlePrefix}>@</Text>
              <TextInput
                style={styles.handleInput}
                value={handle}
                onChangeText={(text) => setHandle(text.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="yourhandle"
                placeholderTextColor="#999"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!saving}
              />
            </View>
            <Text style={styles.hint}>Letters, numbers, and underscores only</Text>
          </View>

          {/* Bio */}
          <View style={styles.field}>
            <Text style={styles.label}>Bio</Text>
            <TextInput
              style={styles.bioInput}
              value={bio}
              onChangeText={setBio}
              placeholder="A short bio about yourself..."
              placeholderTextColor="#999"
              maxLength={160}
              multiline
              numberOfLines={3}
              editable={!saving}
            />
            <Text style={styles.charCount}>{bio.length}/160</Text>
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
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  cancelButton: {
    fontSize: 14,
    fontWeight: '400',
    color: '#666',
    minWidth: 50,
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
    minWidth: 50,
    textAlign: 'right',
  },
  placeholder: {
    minWidth: 50,
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
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: '300',
    color: '#fff',
  },
  avatarHint: {
    fontSize: 12,
    fontWeight: '300',
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
  handleInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  handlePrefix: {
    fontSize: 16,
    fontWeight: '300',
    color: '#999',
    paddingLeft: 14,
  },
  handleInput: {
    flex: 1,
    padding: 14,
    paddingLeft: 4,
    fontSize: 16,
    fontWeight: '300',
    color: '#000',
  },
  bioInput: {
    borderWidth: 1,
    borderColor: '#eee',
    padding: 14,
    fontSize: 16,
    fontWeight: '300',
    color: '#000',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  hint: {
    fontSize: 11,
    fontWeight: '300',
    color: '#999',
    marginTop: 6,
  },
  charCount: {
    fontSize: 10,
    fontWeight: '300',
    color: '#ccc',
    textAlign: 'right',
    marginTop: 4,
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
