import { captureScreen } from 'react-native-view-shot';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

/**
 * Complete list of all screens to capture.
 * Each entry specifies the route, params, and a descriptive name.
 */
export const SCREENSHOT_SCREENS = [
  // ============================================
  // MAIN TABS
  // ============================================
  {
    name: '01_home_feed',
    route: 'MainTabs',
    params: { screen: 'Home' },
    description: 'Home Feed',
  },
  {
    name: '02_post_composer',
    route: 'MainTabs',
    params: { screen: 'Post' },
    description: 'Post Composer',
  },
  {
    name: '03_profile_me',
    route: 'MainTabs',
    params: { screen: 'Me' },
    description: 'My Profile',
  },

  // ============================================
  // STACK SCREENS
  // ============================================
  {
    name: '10_settings',
    route: 'Settings',
    params: {},
    description: 'Settings',
  },
  {
    name: '11_edit_profile',
    route: 'EditProfile',
    params: {},
    description: 'Edit Profile',
  },
  {
    name: '12_notifications',
    route: 'Notifications',
    params: {},
    description: 'Notifications',
  },
  {
    name: '13_friends',
    route: 'Friends',
    params: {},
    description: 'Friends List',
  },
  {
    name: '14_friends_requests',
    route: 'Friends',
    params: { tab: 'Requests' },
    description: 'Friend Requests',
  },
  {
    name: '15_discover',
    route: 'Discover',
    params: {},
    description: 'Discover Users',
  },
  {
    name: '16_goals_list',
    route: 'GoalsList',
    params: {},
    description: 'Goals List',
  },
  {
    name: '17_goal_editor_new',
    route: 'GoalEditor',
    params: { goal: null },
    description: 'New Goal Editor',
  },
  {
    name: '18_saved',
    route: 'Saved',
    params: {},
    description: 'Saved Posts',
  },
];

/**
 * Manual screenshots required (not automated)
 * These screens require special navigation or state
 */
export const MANUAL_SCREENSHOTS = [
  // Onboarding (requires logged out state)
  { name: 'onboarding_welcome', description: 'Onboarding Welcome' },
  { name: 'onboarding_auth_signup', description: 'Auth - Sign Up' },
  { name: 'onboarding_auth_signin', description: 'Auth - Sign In' },
  { name: 'onboarding_name', description: 'Onboarding - Name' },
  { name: 'onboarding_goals', description: 'Onboarding - Goals' },
  { name: 'forgot_password', description: 'Forgot Password' },

  // Feed states and filters
  { name: 'home_preview_mode', description: 'Home - Preview Mode (new user)' },
  { name: 'home_needs_post', description: 'Home - Needs Post Gate' },
  { name: 'home_time_limit', description: 'Home - Time Limit Reached' },
  { name: 'feed_filter_discover', description: 'Feed - Discover Filter' },
  { name: 'feed_filter_friends', description: 'Feed - Friends Filter' },
  { name: 'feed_filter_goals', description: 'Feed - Goals Filter' },
  { name: 'feed_filter_nearby', description: 'Feed - Nearby Filter' },

  // Profile sub-tabs
  { name: 'profile_journals_tab', description: 'Profile - Journals Tab' },
  { name: 'profile_goals_tab', description: 'Profile - Goals Tab' },
  { name: 'profile_saved_tab', description: 'Profile - Saved Tab' },

  // Detail screens (require existing data)
  { name: 'post_detail', description: 'Post Detail View' },
  { name: 'my_journal_detail', description: 'My Journal Detail' },
  { name: 'journal_editor', description: 'Journal Editor' },
  { name: 'goal_editor_edit', description: 'Goal Editor (editing)' },
  { name: 'other_user_profile', description: 'Other User Profile' },

  // Composer states
  { name: 'composer_empty', description: 'Composer - Empty' },
  { name: 'composer_with_content', description: 'Composer - With Content' },
  { name: 'composer_expanded', description: 'Composer - Expanded Details' },
  { name: 'composer_goal_picker', description: 'Composer - Goal Picker' },
  { name: 'composer_privacy_picker', description: 'Composer - Privacy Picker' },

  // Empty states
  { name: 'empty_feed_discover', description: 'Empty - Discover Feed' },
  { name: 'empty_feed_friends', description: 'Empty - Friends Feed' },
  { name: 'empty_notifications', description: 'Empty - Notifications' },
  { name: 'empty_friends', description: 'Empty - Friends List' },
  { name: 'empty_saved', description: 'Empty - Saved Posts' },
  { name: 'empty_goals', description: 'Empty - Goals List' },

  // Misc
  { name: 'offline_banner', description: 'Offline Banner' },
  { name: 'report_modal', description: 'Report Modal' },
];

/**
 * Delay helper
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Capture a single screenshot and save to camera roll
 */
export async function captureAndSave(name) {
  try {
    // Capture the screen
    const uri = await captureScreen({
      format: 'png',
      quality: 1,
    });

    // Save to media library (camera roll)
    const asset = await MediaLibrary.createAssetAsync(uri);

    console.log(`Captured: ${name}`);
    return { success: true, uri: asset.uri, name };
  } catch (error) {
    console.error(`Failed to capture ${name}:`, error);
    return { success: false, error: error.message, name };
  }
}

/**
 * Run the full screenshot tour
 * @param {object} navigation - React Navigation object
 * @param {function} onProgress - Callback for progress updates (current, total, name)
 * @returns {Promise<object>} Results summary
 */
export async function runScreenshotTour(navigation, onProgress = () => {}) {
  const results = {
    captured: [],
    failed: [],
    total: SCREENSHOT_SCREENS.length,
  };

  // Request permissions
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant photo library access to save screenshots.');
    return results;
  }

  // Create album for organization
  let album = await MediaLibrary.getAlbumAsync('Aspyre Screenshots');

  for (let i = 0; i < SCREENSHOT_SCREENS.length; i++) {
    const screen = SCREENSHOT_SCREENS[i];
    onProgress(i + 1, SCREENSHOT_SCREENS.length, screen.description);

    try {
      // Navigate to screen
      navigation.navigate(screen.route, screen.params);

      // Wait for animation and render
      await delay(1500);

      // Capture
      const result = await captureAndSave(screen.name);

      if (result.success) {
        results.captured.push(screen.name);

        // Add to album if it exists
        if (album) {
          try {
            const asset = await MediaLibrary.getAssetInfoAsync(result.uri);
            await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
          } catch (e) {
            // Album operations can fail, continue anyway
          }
        }
      } else {
        results.failed.push({ name: screen.name, error: result.error });
      }
    } catch (error) {
      results.failed.push({ name: screen.name, error: error.message });
    }

    // Small delay between screens
    await delay(500);
  }

  // Return to home
  navigation.navigate('MainTabs', { screen: 'Home' });

  return results;
}

/**
 * Capture a single screen instantly (for manual use)
 */
export async function captureCurrentScreen(screenName = 'manual_capture') {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'Please grant photo library access to save screenshots.');
    return null;
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `${screenName}_${timestamp}`;

  const result = await captureAndSave(name);

  if (result.success) {
    Alert.alert('Screenshot Saved', `Saved to camera roll: ${name}`);
  } else {
    Alert.alert('Screenshot Failed', result.error);
  }

  return result;
}
