import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

export default function HomeScreen({ navigation }) {
  const { user, profile, profileError, getProfile, signOut } = useAuth();

  const handleLogout = async () => {
    const { error } = await signOut();
    if (error) {
      Alert.alert('Error', error.message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>ASPYRE</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Logout</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        {profileError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorTitle}>Failed to load profile</Text>
            <Text style={styles.errorMessage}>{profileError}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={getProfile}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.welcome}>
              {profile?.full_name ? `Hello, ${profile.full_name}` : 'Welcome'}
            </Text>
            <Text style={styles.subtitle}>Your journey begins here.</Text>
            {user?.email && (
              <Text style={styles.email}>{user.email}</Text>
            )}

            <TouchableOpacity
              style={styles.profileButton}
              onPress={() => navigation.navigate('Profile')}
            >
              <Text style={styles.profileButtonText}>View Profile</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  logo: {
    fontSize: 16,
    fontWeight: '300',
    letterSpacing: 4,
    color: '#000',
  },
  logout: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#666',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  welcome: {
    fontSize: 32,
    fontWeight: '200',
    letterSpacing: 2,
    color: '#000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 1,
    color: '#666',
  },
  email: {
    fontSize: 12,
    fontWeight: '300',
    letterSpacing: 0.5,
    color: '#999',
    marginTop: 24,
  },
  profileButton: {
    marginTop: 40,
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 14,
    paddingHorizontal: 32,
  },
  profileButtonText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '500',
    color: '#000',
  },
  errorContainer: {
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: '#c00',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    borderWidth: 1,
    borderColor: '#000',
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  retryButtonText: {
    fontSize: 12,
    letterSpacing: 2,
    fontWeight: '500',
    color: '#000',
  },
});
