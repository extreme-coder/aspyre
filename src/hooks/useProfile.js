import { useState, useEffect, useCallback } from 'react';
import { File } from 'expo-file-system/next';
import { supabase } from '../config/supabase';
import * as Localization from 'expo-localization';

const AVATARS_BUCKET = 'avatars';

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

  // Upload avatar image
  const uploadAvatar = useCallback(async (imageUri) => {
    if (!userId || !imageUri) {
      return { error: { message: 'Invalid parameters' } };
    }

    try {
      // Determine file extension from URI
      const uriParts = imageUri.split('.');
      const extension = uriParts[uriParts.length - 1].toLowerCase().split('?')[0] || 'jpg';
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
      const fileExtension = validExtensions.includes(extension) ? extension : 'jpg';

      // Create unique filename: userId/avatar_timestamp.ext
      const timestamp = Date.now();
      const filename = `${userId}/avatar_${timestamp}.${fileExtension}`;

      // Determine content type
      const contentTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
      };
      const contentType = contentTypes[fileExtension] || 'image/jpeg';

      // Read file and convert to base64
      const file = new File(imageUri);
      const base64 = await file.base64();

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(AVATARS_BUCKET)
        .upload(filename, bytes, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Avatar upload error:', uploadError);
        return { error: uploadError };
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(AVATARS_BUCKET)
        .getPublicUrl(filename);

      const avatarUrl = urlData.publicUrl;

      // Update profile with new avatar URL
      const { data: profileData, error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', userId)
        .select()
        .single();

      if (updateError) {
        return { error: updateError };
      }

      setProfile(profileData);
      return { data: { url: avatarUrl } };
    } catch (err) {
      console.error('Avatar upload failed:', err);
      return { error: { message: err.message || 'Failed to upload avatar' } };
    }
  }, [userId]);

  return {
    profile,
    loading,
    error,
    saving,
    fetchProfile,
    updateProfile,
    uploadAvatar,
    getDeviceTimezone,
  };
}
