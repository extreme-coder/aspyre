import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, ActivityIndicator, StyleSheet, Alert } from 'react-native';

import { useAuth } from '../contexts/AuthContext';
import { UnsavedChangesProvider, useUnsavedChanges } from '../contexts/UnsavedChangesContext';

// Auth screens
import LoginScreen from '../screens/LoginScreen';
import SignupScreen from '../screens/SignupScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Main app screens
import GateScreen from '../screens/GateScreen';
import JournalComposeScreen from '../screens/JournalComposeScreen';
import GoalsListScreen from '../screens/GoalsListScreen';
import GoalEditorScreen from '../screens/GoalEditorScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ProfileScreen from '../screens/ProfileScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import FriendsScreen from '../screens/FriendsScreen';
import MyJournalDetailScreen from '../screens/MyJournalDetailScreen';
import JournalEditorScreen from '../screens/JournalEditorScreen';
import SavedScreen from '../screens/SavedScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import NotificationsScreen from '../screens/NotificationsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();
const GoalsStack = createNativeStackNavigator();


// Auth Stack
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
        animation: 'fade',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Signup" component={SignupScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </Stack.Navigator>
  );
}

// Goals Stack (nested)
function GoalsStackNavigator() {
  return (
    <GoalsStack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
        animation: 'slide_from_right',
      }}
    >
      <GoalsStack.Screen name="GoalsList" component={GoalsListScreen} />
      <GoalsStack.Screen name="GoalEditor" component={GoalEditorScreen} />
    </GoalsStack.Navigator>
  );
}

// Main Tab Navigator
function MainTabs() {
  const { unsavedScreens } = useUnsavedChanges();

  // Create listeners that check for unsaved changes before allowing tab switch
  const createTabListeners = (screenName) => ({
    tabPress: (e) => {
      // Find if any screen has unsaved changes
      const unsavedScreen = Object.entries(unsavedScreens).find(([name, hasChanges]) => hasChanges && name !== screenName);

      if (unsavedScreen) {
        e.preventDefault();

        Alert.alert(
          'Discard changes?',
          'You have unsaved changes. Are you sure you want to leave?',
          [
            { text: 'Keep Editing', style: 'cancel' },
            {
              text: 'Discard',
              style: 'destructive',
              onPress: () => {
                // Navigate to the target tab
                e.target && e.target.split('-')[0] &&
                  e.data?.navigation?.navigate(screenName);
              },
            },
          ]
        );
      }
    },
  });

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: true,
        tabBarIconStyle: { display: 'none' },
        tabBarActiveTintColor: '#000',
        tabBarInactiveTintColor: '#999',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tab.Screen
        name="Home"
        component={GateScreen}
        options={{ tabBarLabel: 'HOME' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const unsavedScreen = Object.entries(unsavedScreens).find(([, hasChanges]) => hasChanges);
            if (unsavedScreen) {
              e.preventDefault();
              Alert.alert(
                'Discard changes?',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                  { text: 'Keep Editing', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => navigation.navigate('Home'),
                  },
                ]
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Post"
        component={JournalComposeScreen}
        options={{ tabBarLabel: 'POST' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const unsavedScreen = Object.entries(unsavedScreens).find(([, hasChanges]) => hasChanges);
            if (unsavedScreen) {
              e.preventDefault();
              Alert.alert(
                'Discard changes?',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                  { text: 'Keep Editing', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => navigation.navigate('Post'),
                  },
                ]
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Goals"
        component={GoalsStackNavigator}
        options={{ tabBarLabel: 'GOALS' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const unsavedScreen = Object.entries(unsavedScreens).find(([, hasChanges]) => hasChanges);
            if (unsavedScreen) {
              e.preventDefault();
              Alert.alert(
                'Discard changes?',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                  { text: 'Keep Editing', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => navigation.navigate('Goals'),
                  },
                ]
              );
            }
          },
        })}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{ tabBarLabel: 'SETTINGS' }}
        listeners={({ navigation }) => ({
          tabPress: (e) => {
            const unsavedScreen = Object.entries(unsavedScreens).find(([, hasChanges]) => hasChanges);
            if (unsavedScreen) {
              e.preventDefault();
              Alert.alert(
                'Discard changes?',
                'You have unsaved changes. Are you sure you want to leave?',
                [
                  { text: 'Keep Editing', style: 'cancel' },
                  {
                    text: 'Discard',
                    style: 'destructive',
                    onPress: () => navigation.navigate('Settings'),
                  },
                ]
              );
            }
          },
        })}
      />
    </Tab.Navigator>
  );
}

// App Stack (wraps tabs + modals)
function AppStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#fff' },
      }}
    >
      <Stack.Screen name="MainTabs" component={MainTabs} />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="PostDetail"
        component={PostDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Friends"
        component={FriendsScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="MyJournalDetail"
        component={MyJournalDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="JournalEditor"
        component={JournalEditorScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Saved"
        component={SavedScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="EditProfile"
        component={EditProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#000" />
      </View>
    );
  }

  return (
    <UnsavedChangesProvider>
      <NavigationContainer>
        {user ? <AppStack /> : <AuthStack />}
      </NavigationContainer>
    </UnsavedChangesProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  tabBar: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    height: 70,
    paddingBottom: 30,
    paddingTop: 12,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 2,
  },
});
