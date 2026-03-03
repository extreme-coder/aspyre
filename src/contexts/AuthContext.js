import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { supabase } from '../config/supabase';
import {
  registerForPushNotificationsAsync,
  savePushToken,
  removePushToken,
} from '../utils/pushNotifications';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileError, setProfileError] = useState(null);
  const [loading, setLoading] = useState(true);
  const previousUserIdRef = useRef(null);

  const fetchProfile = async (userId) => {
    setProfileError(null);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      setProfileError(error.message);
      setProfile(null);
    } else {
      setProfile(data);
    }
    return { data, error };
  };

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      // Handle invalid refresh token by signing out
      if (error?.message?.includes('Refresh Token') || error?.code === 'invalid_grant') {
        console.warn('Invalid session, signing out:', error.message);
        await supabase.auth.signOut();
        setSession(null);
        setUser(null);
        setLoading(false);
        return;
      }

      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        previousUserIdRef.current = session.user.id;
        await fetchProfile(session.user.id);
        // Register for push notifications on app start
        const token = await registerForPushNotificationsAsync();
        if (token) {
          await savePushToken(session.user.id, token);
        }
      }
      setLoading(false);
    }).catch(async (err) => {
      // Handle any auth errors by clearing session
      console.warn('Auth error, clearing session:', err.message);
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        const previousUserId = previousUserIdRef.current;
        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          previousUserIdRef.current = session.user.id;
          await fetchProfile(session.user.id);
          // Register for push notifications on login
          const token = await registerForPushNotificationsAsync();
          if (token) {
            await savePushToken(session.user.id, token);
          }
        } else {
          // Remove push token on logout
          if (previousUserId) {
            await removePushToken(previousUserId);
          }
          previousUserIdRef.current = null;
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    return { data, error };
  };

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  };

  const signInWithApple = async () => {
    if (Platform.OS !== 'ios') {
      return { data: null, error: { message: 'Apple Sign In is only available on iOS' } };
    }

    try {
      // Generate a random nonce for security
      const rawNonce = Crypto.getRandomBytes(16)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      // Request Apple credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (!credential.identityToken) {
        return { data: null, error: { message: 'No identity token received from Apple' } };
      }

      // Sign in with Supabase using the Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
        nonce: rawNonce,
      });

      if (error) {
        return { data: null, error };
      }

      // If Apple provided the user's name (only on first sign-in), update the profile
      if (credential.fullName?.givenName || credential.fullName?.familyName) {
        const displayName = [credential.fullName.givenName, credential.fullName.familyName]
          .filter(Boolean)
          .join(' ');

        if (displayName && data.user) {
          await supabase
            .from('profiles')
            .update({ display_name: displayName })
            .eq('id', data.user.id);
        }
      }

      return { data, error: null };
    } catch (err) {
      if (err.code === 'ERR_REQUEST_CANCELED') {
        return { data: null, error: { message: 'Sign in was cancelled' } };
      }
      return { data: null, error: { message: err.message || 'Apple Sign In failed' } };
    }
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  const resetPassword = async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  };

  const updatePassword = async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    return { data, error };
  };

  const updateProfile = async (updates) => {
    if (!user) return { data: null, error: { message: 'Not authenticated' } };

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (!error && data) {
      setProfile(data);
    }
    return { data, error };
  };

  const getProfile = async () => {
    if (!user) return { data: null, error: { message: 'Not authenticated' } };
    return fetchProfile(user.id);
  };

  const value = {
    user,
    session,
    profile,
    profileError,
    loading,
    signUp,
    signIn,
    signInWithApple,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    getProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
