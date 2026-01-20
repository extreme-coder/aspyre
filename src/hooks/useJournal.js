import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system/next';
import { supabase } from '../config/supabase';
import { getLocalDateString, isWithinEditWindow } from '../utils/dateUtils';

const DRAFT_STORAGE_KEY = '@aspyre_journal_draft';
const MEDIA_BUCKET = 'journal-media';

/**
 * Hook for managing daily journal entries.
 * Handles create, update, draft autosave, and edit window logic.
 */
export function useJournal(userId, userTimezone) {
  const [todayJournal, setTodayJournal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);

  // Memoize localDate to prevent unnecessary re-renders
  const localDate = useMemo(() => getLocalDateString(userTimezone), [userTimezone]);

  // Track if initial fetch has been done
  const hasFetchedRef = useRef(false);

  // Fetch today's journal entry - always queries database fresh
  const fetchTodayJournal = useCallback(async () => {
    if (!userId) {
      setTodayJournal(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Always query fresh from database
      const { data, error: fetchError } = await supabase
        .from('journals')
        .select(`
          *,
          primary_goal:goals(id, title, goal_type)
        `)
        .eq('user_id', userId)
        .eq('local_date', localDate)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setTodayJournal(null);
      } else {
        // data is null if no journal found, which correctly sets hasPostedToday to false
        setTodayJournal(data);
      }
    } catch (err) {
      setError(err.message);
      setTodayJournal(null);
    } finally {
      setLoading(false);
    }
  }, [userId, localDate]);

  useEffect(() => {
    fetchTodayJournal();
  }, [fetchTodayJournal]);

  // Load draft from AsyncStorage
  const loadDraft = useCallback(async () => {
    try {
      const storedDraft = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
      if (storedDraft) {
        const parsed = JSON.parse(storedDraft);
        // Only use draft if it's for today and user matches
        if (parsed.localDate === localDate && parsed.userId === userId) {
          setDraft(parsed.data);
          return parsed.data;
        } else {
          // Clear stale draft
          await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
        }
      }
    } catch (err) {
      console.warn('Failed to load draft:', err);
    }
    return null;
  }, [localDate, userId]);

  // Save draft to AsyncStorage
  const saveDraft = useCallback(async (data) => {
    if (!userId) return;

    try {
      const draftData = {
        userId,
        localDate,
        data,
        savedAt: new Date().toISOString(),
      };
      await AsyncStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draftData));
      setDraft(data);
    } catch (err) {
      console.warn('Failed to save draft:', err);
    }
  }, [userId, localDate]);

  // Clear draft from AsyncStorage
  const clearDraft = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
      setDraft(null);
    } catch (err) {
      console.warn('Failed to clear draft:', err);
    }
  }, []);

  // Check if editing is allowed
  const canEdit = useCallback(() => {
    if (!todayJournal) return true; // No journal yet, can create
    return isWithinEditWindow(todayJournal.created_at);
  }, [todayJournal]);

  // Check if privacy can be changed (allowed even after edit window)
  // Decision: Allow privacy changes anytime
  const canChangePrivacy = useCallback(() => {
    return !!todayJournal;
  }, [todayJournal]);

  // Create or update journal entry
  const saveJournal = useCallback(async (journalData) => {
    if (!userId) {
      return { error: { message: 'Not authenticated' } };
    }

    setSaving(true);
    setError(null);

    try {
      if (todayJournal) {
        // Updating existing journal
        if (!isWithinEditWindow(todayJournal.created_at)) {
          // Only allow privacy update after edit window
          const allowedUpdates = { post_privacy: journalData.post_privacy };

          const { data, error: updateError } = await supabase
            .from('journals')
            .update(allowedUpdates)
            .eq('id', todayJournal.id)
            .eq('user_id', userId)
            .select(`
              *,
              primary_goal:goals(id, title, goal_type)
            `)
            .single();

          if (updateError) {
            setError(updateError.message);
            return { error: updateError };
          }

          setTodayJournal(data);
          await clearDraft();
          return { data, wasPrivacyOnlyUpdate: true };
        }

        // Within edit window - full update allowed
        const { data, error: updateError } = await supabase
          .from('journals')
          .update({
            ...journalData,
            edited_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', todayJournal.id)
          .eq('user_id', userId)
          .select(`
            *,
            primary_goal:goals(id, title, goal_type)
          `)
          .single();

        if (updateError) {
          setError(updateError.message);
          return { error: updateError };
        }

        setTodayJournal(data);
        await clearDraft();
        return { data, wasUpdate: true };
      } else {
        // Creating new journal
        const { data, error: insertError } = await supabase
          .from('journals')
          .insert({
            user_id: userId,
            local_date: localDate,
            ...journalData,
          })
          .select(`
            *,
            primary_goal:goals(id, title, goal_type)
          `)
          .single();

        if (insertError) {
          // Check for unique constraint violation
          if (insertError.code === '23505') {
            setError('You have already posted today. Refreshing...');
            await fetchTodayJournal();
            return { error: { message: 'Journal already exists for today' } };
          }
          setError(insertError.message);
          return { error: insertError };
        }

        setTodayJournal(data);
        await clearDraft();
        return { data, wasCreate: true };
      }
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId, localDate, todayJournal, fetchTodayJournal, clearDraft]);

  // Update privacy only (allowed anytime)
  const updatePrivacy = useCallback(async (newPrivacy) => {
    if (!todayJournal) {
      return { error: { message: 'No journal to update' } };
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('journals')
        .update({ post_privacy: newPrivacy })
        .eq('id', todayJournal.id)
        .eq('user_id', userId)
        .select(`
          *,
          primary_goal:goals(id, title, goal_type)
        `)
        .single();

      if (updateError) {
        setError(updateError.message);
        return { error: updateError };
      }

      setTodayJournal(data);
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId, todayJournal]);

  // Upload media to Supabase Storage
  const uploadMedia = useCallback(async (localUri) => {
    if (!userId || !localUri) return null;

    try {
      // Create File instance from local URI
      const file = new File(localUri);
      if (!file.exists) {
        throw new Error('File does not exist');
      }

      // Determine file extension and MIME type
      const ext = localUri.split('.').pop().toLowerCase();
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        gif: 'image/gif',
        webp: 'image/webp',
        mp4: 'video/mp4',
        mov: 'video/quicktime',
      };
      const contentType = mimeTypes[ext] || 'image/jpeg';

      // Generate unique filename
      const timestamp = Date.now();
      const filename = `${userId}/${localDate}/${timestamp}.${ext}`;

      // Read file as base64 using new File API
      const base64 = await file.base64();

      // Convert base64 to ArrayBuffer
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .upload(filename, bytes, {
          contentType,
          upsert: true,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Media upload failed:', err);
      return null;
    }
  }, [userId, localDate]);

  // Save bullets to journal_bullets table
  const saveBullets = useCallback(async (journalId, bullets) => {
    if (!journalId || !bullets || bullets.length === 0) return { success: true };

    try {
      // Delete existing bullets
      await supabase
        .from('journal_bullets')
        .delete()
        .eq('journal_id', journalId);

      // Insert new bullets
      const bulletRows = bullets
        .filter(b => b.text && b.text.trim())
        .map((bullet, index) => ({
          journal_id: journalId,
          text: bullet.text.trim(),
          idx: index,
        }));

      if (bulletRows.length > 0) {
        const { error: insertError } = await supabase
          .from('journal_bullets')
          .insert(bulletRows);

        if (insertError) {
          console.error('Failed to save bullets:', insertError);
          return { error: insertError };
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to save bullets:', err);
      return { error: err };
    }
  }, []);

  // Save proof chips to journal_proof_chips table
  const saveProofChips = useCallback(async (journalId, proofChips) => {
    if (!journalId || !proofChips || proofChips.length === 0) return { success: true };

    try {
      // Delete existing chips
      await supabase
        .from('journal_proof_chips')
        .delete()
        .eq('journal_id', journalId);

      // Insert new chips
      const chipRows = proofChips
        .filter(chip => chip.value)
        .map((chip, index) => ({
          journal_id: journalId,
          chip_type: chip.type,
          value_text: String(chip.value),
          label: chip.label || null,
          idx: index,
        }));

      if (chipRows.length > 0) {
        const { error: insertError } = await supabase
          .from('journal_proof_chips')
          .insert(chipRows);

        if (insertError) {
          console.error('Failed to save proof chips:', insertError);
          return { error: insertError };
        }
      }

      return { success: true };
    } catch (err) {
      console.error('Failed to save proof chips:', err);
      return { error: err };
    }
  }, []);

  // Create or update journal entry with new format (bullets, chips, media)
  const saveJournalWithExtras = useCallback(async (journalData, bullets = [], proofChips = [], localMediaUri = null) => {
    if (!userId) {
      return { error: { message: 'Not authenticated' } };
    }

    setSaving(true);
    setError(null);

    try {
      // Upload media if provided
      let mediaUrl = journalData.media;
      if (localMediaUri && !localMediaUri.startsWith('http')) {
        mediaUrl = await uploadMedia(localMediaUri);
        if (!mediaUrl) {
          return { error: { message: 'Failed to upload image. Please try again.' } };
        }
      }

      const dataToSave = {
        ...journalData,
        media: mediaUrl,
      };

      if (todayJournal) {
        // Updating existing journal - always allow full edits
        // Track if edited after the initial edit window
        const wasEditedLate = !isWithinEditWindow(todayJournal.created_at);

        const { data, error: updateError } = await supabase
          .from('journals')
          .update({
            ...dataToSave,
            edited_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', todayJournal.id)
          .eq('user_id', userId)
          .select(`
            *,
            primary_goal:goals(id, title, goal_type)
          `)
          .single();

        if (updateError) {
          setError(updateError.message);
          return { error: updateError };
        }

        // Save bullets and proof chips
        await saveBullets(data.id, bullets);
        await saveProofChips(data.id, proofChips);

        setTodayJournal(data);
        await clearDraft();
        return { data, wasUpdate: true, wasEditedLate };
      } else {
        // Creating new journal
        const { data, error: insertError } = await supabase
          .from('journals')
          .insert({
            user_id: userId,
            local_date: localDate,
            ...dataToSave,
          })
          .select(`
            *,
            primary_goal:goals(id, title, goal_type)
          `)
          .single();

        if (insertError) {
          // Check for unique constraint violation
          if (insertError.code === '23505') {
            setError('You have already posted today. Refreshing...');
            await fetchTodayJournal();
            return { error: { message: 'Journal already exists for today' } };
          }
          setError(insertError.message);
          return { error: insertError };
        }

        // Save bullets and proof chips
        await saveBullets(data.id, bullets);
        await saveProofChips(data.id, proofChips);

        setTodayJournal(data);
        await clearDraft();
        return { data, wasCreate: true };
      }
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId, localDate, todayJournal, fetchTodayJournal, clearDraft, uploadMedia, saveBullets, saveProofChips]);

  // Fetch bullets for a journal
  const fetchBullets = useCallback(async (journalId) => {
    if (!journalId) return [];

    try {
      const { data, error } = await supabase
        .from('journal_bullets')
        .select('*')
        .eq('journal_id', journalId)
        .order('idx', { ascending: true });

      if (error) {
        console.error('Failed to fetch bullets:', error);
        return [];
      }

      return data.map(b => ({ id: b.id, text: b.text }));
    } catch (err) {
      console.error('Failed to fetch bullets:', err);
      return [];
    }
  }, []);

  // Fetch proof chips for a journal
  const fetchProofChips = useCallback(async (journalId) => {
    if (!journalId) return [];

    try {
      const { data, error } = await supabase
        .from('journal_proof_chips')
        .select('*')
        .eq('journal_id', journalId)
        .order('idx', { ascending: true });

      if (error) {
        console.error('Failed to fetch proof chips:', error);
        return [];
      }

      return data.map(c => ({
        id: c.id,
        type: c.chip_type,
        value: c.value_text,
        label: c.label,
      }));
    } catch (err) {
      console.error('Failed to fetch proof chips:', err);
      return [];
    }
  }, []);

  return {
    todayJournal,
    loading,
    saving,
    error,
    draft,
    localDate,
    canEdit: canEdit(),
    canChangePrivacy: canChangePrivacy(),
    hasPostedToday: !!todayJournal,
    isWithinEditWindow: todayJournal ? isWithinEditWindow(todayJournal.created_at) : false,
    fetchTodayJournal,
    loadDraft,
    saveDraft,
    clearDraft,
    saveJournal,
    saveJournalWithExtras,
    updatePrivacy,
    uploadMedia,
    fetchBullets,
    fetchProofChips,
  };
}
