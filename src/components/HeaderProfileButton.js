import React from 'react';
import { TouchableOpacity, Image, View, Text, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../contexts/AuthContext';
import { useProfile } from '../hooks/useProfile';
import {
  colors,
  radius,
  typography,
  fontFamily,
} from '../constants/theme';

/**
 * Profile button for screen headers.
 * Shows user avatar or initial, navigates to Profile on press.
 */
export default function HeaderProfileButton() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);

  return (
    <TouchableOpacity
      style={styles.button}
      onPress={() => navigation.navigate('Profile')}
    >
      {profile?.avatar_url && typeof profile.avatar_url === 'string' && profile.avatar_url.length > 0 ? (
        <Image
          source={{ uri: profile.avatar_url }}
          style={styles.avatar}
        />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarInitial}>
            {profile?.display_name?.charAt(0)?.toUpperCase() || '?'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
  },
  avatarPlaceholder: {
    width: 28,
    height: 28,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceContainerHigh,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    fontFamily: fontFamily.medium,
    fontSize: typography.labelSm.fontSize,
    color: colors.onSurfaceVariant,
  },
});
