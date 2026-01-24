import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../config/supabase';

// Configure how notifications are handled when app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Request permission and get Expo push token
 * @returns {Promise<string|null>} The Expo push token or null if failed
 */
export async function registerForPushNotificationsAsync() {
  // Push notifications only work on physical devices
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Check existing permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  // Request permission if not already granted
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted');
    return null;
  }

  // Get the Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;

    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const token = tokenData.data;
    console.log('Expo push token:', token);

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#000000',
      });
    }

    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Save push token to user's profile in Supabase
 * @param {string} userId - The user's ID
 * @param {string} token - The Expo push token
 */
export async function savePushToken(userId, token) {
  if (!userId || !token) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: token })
      .eq('id', userId);

    if (error) {
      console.error('Error saving push token:', error);
    } else {
      console.log('Push token saved successfully');
    }
  } catch (error) {
    console.error('Error saving push token:', error);
  }
}

/**
 * Remove push token from user's profile (call on logout)
 * @param {string} userId - The user's ID
 */
export async function removePushToken(userId) {
  if (!userId) return;

  try {
    const { error } = await supabase
      .from('profiles')
      .update({ expo_push_token: null })
      .eq('id', userId);

    if (error) {
      console.error('Error removing push token:', error);
    } else {
      console.log('Push token removed successfully');
    }
  } catch (error) {
    console.error('Error removing push token:', error);
  }
}

/**
 * Get the navigation route for a notification type
 * @param {object} notification - The notification data
 * @returns {object} Navigation params { screen, params }
 */
export function getNotificationNavigation(notification) {
  const { type, data } = notification;

  switch (type) {
    case 'friend_request':
    case 'friend_accepted':
      return {
        screen: 'Friends',
        params: { tab: type === 'friend_request' ? 'Requests' : 'Friends' },
      };
    case 'comment':
    case 'kudos':
      if (!data?.journal_id) return null;
      return {
        screen: 'PostDetail',
        params: { journal: { id: data.journal_id } },
      };
    default:
      return null;
  }
}
