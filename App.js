import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Manrope_400Regular,
  Manrope_500Medium,
  Manrope_600SemiBold,
  Manrope_700Bold,
  Manrope_800ExtraBold,
} from '@expo-google-fonts/manrope';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';
import { colors } from './src/constants/theme';

// Keep the splash screen visible while loading fonts
SplashScreen.preventAutoHideAsync();

/**
 * Get navigation params based on notification data
 */
function getNavigationFromNotification(data) {
  if (!data?.type) return null;

  switch (data.type) {
    case 'friend_request':
      return { screen: 'Friends', params: { tab: 'Requests' } };
    case 'friend_accepted':
      return { screen: 'Friends', params: { tab: 'Friends' } };
    case 'comment':
    case 'kudos':
      if (data.journal_id) {
        return { screen: 'PostDetail', params: { journal: { id: data.journal_id } } };
      }
      return null;
    default:
      return null;
  }
}

export default function App() {
  const notificationListener = useRef();
  const responseListener = useRef();
  const [pendingNavigation, setPendingNavigation] = useState(null);
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Load Manrope fonts
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Manrope_800ExtraBold,
  });

  // Hide splash screen when fonts are loaded
  const onLayoutRootView = useCallback(async () => {
    if (fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  // Handle navigation when both navigation is ready and we have a pending navigation
  useEffect(() => {
    if (isNavigationReady && pendingNavigation) {
      navigationRef.navigate(pendingNavigation.screen, pendingNavigation.params);
      setPendingNavigation(null);
    }
  }, [isNavigationReady, pendingNavigation]);

  useEffect(() => {
    // Check for notification that opened the app (cold start)
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const data = response.notification.request.content.data;
        const nav = getNavigationFromNotification(data);
        if (nav) {
          setPendingNavigation(nav);
        }
      }
    });

    // Listener for notifications received while app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(() => {});

    // Listener for when user taps on notification (app already running)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const data = response.notification.request.content.data;
        const nav = getNavigationFromNotification(data);
        if (nav) {
          if (navigationRef.isReady()) {
            navigationRef.navigate(nav.screen, nav.params);
          } else {
            setPendingNavigation(nav);
          }
        }
      }
    );

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const handleNavigationReady = () => {
    setIsNavigationReady(true);
  };

  // Show loading screen while fonts load
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container} onLayout={onLayoutRootView}>
      <AuthProvider>
        <StatusBar style="dark" />
        <AppNavigator onReady={handleNavigationReady} />
      </AuthProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
});
