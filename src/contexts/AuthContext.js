import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
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
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    getProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
