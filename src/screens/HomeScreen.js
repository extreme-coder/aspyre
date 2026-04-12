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
import {
  colors,
  spacing,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

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
    backgroundColor: colors.surface,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    backgroundColor: colors.surfaceContainerLow,
  },
  logo: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyLg.fontSize,
    letterSpacing: 4,
    color: colors.onSurface,
  },
  logout: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  welcome: {
    fontFamily: fontFamily.regular,
    fontSize: 32,
    letterSpacing: 2,
    color: colors.onSurface,
    marginBottom: spacing.md,
  },
  subtitle: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    letterSpacing: 1,
    color: colors.onSurfaceVariant,
  },
  email: {
    fontFamily: fontFamily.regular,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 0.5,
    color: colors.onSurfaceVariant,
    marginTop: spacing.lg,
  },
  profileButton: {
    marginTop: spacing.xl,
    backgroundColor: colors.primary,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  profileButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 2,
    color: colors.onPrimary,
  },
  errorContainer: {
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorTitle: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.titleMd.fontSize,
    color: colors.error,
    marginBottom: spacing.sm,
  },
  errorMessage: {
    fontFamily: fontFamily.regular,
    fontSize: typography.bodyMd.fontSize,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.surfaceContainerHighest,
    borderRadius: radius.xl,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  retryButtonText: {
    fontFamily: fontFamily.semiBold,
    fontSize: typography.labelSm.fontSize,
    letterSpacing: 2,
    color: colors.onSurface,
  },
});
