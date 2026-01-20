import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';
import * as Localization from 'expo-localization';

export function useProfile(userId) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch profile
  const fetchProfile = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setProfile(null);
      } else {
        setProfile(data);

        // Auto-detect and update timezone if it's the default
        if (data && data.timezone === 'America/Vancouver') {
          const deviceTimezone = Localization.timezone;
          if (deviceTimezone && deviceTimezone !== 'America/Vancouver') {
            // Update timezone silently
            await supabase
              .from('profiles')
              .update({ timezone: deviceTimezone })
              .eq('id', userId);
            setProfile(prev => ({ ...prev, timezone: deviceTimezone }));
          }
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Update profile
  const updateProfile = useCallback(async (updates) => {
    if (!userId) {
      return { error: { message: 'Not authenticated' } };
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        return { error: updateError };
      }

      setProfile(data);
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // Get device timezone
  const getDeviceTimezone = useCallback(() => {
    return Localization.timezone || 'America/Vancouver';
  }, []);

  return {
    profile,
    loading,
    error,
    saving,
    fetchProfile,
    updateProfile,
    getDeviceTimezone,
  };
}
