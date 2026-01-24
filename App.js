import React, { useEffect, useRef, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { AuthProvider } from './src/contexts/AuthContext';
import AppNavigator, { navigationRef } from './src/navigation/AppNavigator';

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

  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <AppNavigator onReady={handleNavigationReady} />
    </AuthProvider>
  );
}
