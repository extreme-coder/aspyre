import { useState, useCallback } from 'react';
import { File } from 'expo-file-system/next';
import { supabase } from '../config/supabase';

const MEDIA_BUCKET = 'journal-media';

/**
 * Hook for editing any journal entry (not just today's).
 * Used by JournalEditorScreen for editing past journals.
 */
export function useJournalEditor(userId) {
  const [journal, setJournal] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // Fetch a specific journal by ID
  const fetchJournal = useCallback(async (journalId) => {
    if (!userId || !journalId) {
      setJournal(null);
      return { error: { message: 'Invalid parameters' } };
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('journals')
        .select(`
          *,
          primary_goal:goals(id, title, goal_type)
        `)
        .eq('id', journalId)
        .eq('user_id', userId)
        .single();

      if (fetchError) {
        setError(fetchError.message);
        setJournal(null);
        return { error: fetchError };
      }

      setJournal(data);
      return { data };
    } catch (err) {
      setError(err.message);
      setJournal(null);
      return { error: err };
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Upload media to Supabase Storage
  const uploadMedia = useCallback(async (localUri, journalLocalDate) => {
    if (!userId || !localUri) return null;

    try {
      const file = new File(localUri);
      if (!file.exists) {
        throw new Error('File does not exist');
      }

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

      const timestamp = Date.now();
      const filename = `${userId}/${journalLocalDate}/${timestamp}.${ext}`;

      const base64 = await file.base64();
      const binaryString = atob(base64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

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

      const { data: urlData } = supabase.storage
        .from(MEDIA_BUCKET)
        .getPublicUrl(filename);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Media upload failed:', err);
      return null;
    }
  }, [userId]);

  // Save bullets to journal_bullets table
  const saveBullets = useCallback(async (journalId, bullets) => {
    if (!journalId || !bullets || bullets.length === 0) return { success: true };

    try {
      await supabase
        .from('journal_bullets')
        .delete()
        .eq('journal_id', journalId);

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
      await supabase
        .from('journal_proof_chips')
        .delete()
        .eq('journal_id', journalId);

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

  // Update journal with all related data
  const updateJournal = useCallback(async (journalId, journalData, bullets = [], proofChips = [], localMediaUri = null) => {
    if (!userId || !journalId) {
      return { error: { message: 'Invalid parameters' } };
    }

    setSaving(true);
    setError(null);

    try {
      // Upload media if provided and it's a local file
      let mediaUrl = journalData.media;
      if (localMediaUri && !localMediaUri.startsWith('http')) {
        mediaUrl = await uploadMedia(localMediaUri, journal?.local_date);
        if (!mediaUrl) {
          return { error: { message: 'Failed to upload image. Please try again.' } };
        }
      }

      const dataToSave = {
        ...journalData,
        media: mediaUrl,
        edited_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error: updateError } = await supabase
        .from('journals')
        .update(dataToSave)
        .eq('id', journalId)
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
      await saveBullets(journalId, bullets);
      await saveProofChips(journalId, proofChips);

      setJournal(data);
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId, journal, uploadMedia, saveBullets, saveProofChips]);

  // Update privacy only
  const updatePrivacy = useCallback(async (journalId, newPrivacy) => {
    if (!userId || !journalId) {
      return { error: { message: 'Invalid parameters' } };
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('journals')
        .update({ post_privacy: newPrivacy })
        .eq('id', journalId)
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

      setJournal(data);
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // Delete journal
  const deleteJournal = useCallback(async (journalId) => {
    if (!userId || !journalId) {
      return { error: { message: 'Invalid parameters' } };
    }

    setSaving(true);
    setError(null);

    try {
      // Delete related data first (bullets and chips)
      await supabase.from('journal_bullets').delete().eq('journal_id', journalId);
      await supabase.from('journal_proof_chips').delete().eq('journal_id', journalId);

      // Delete the journal
      const { error: deleteError } = await supabase
        .from('journals')
        .delete()
        .eq('id', journalId)
        .eq('user_id', userId);

      if (deleteError) {
        setError(deleteError.message);
        return { error: deleteError };
      }

      setJournal(null);
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return {
    journal,
    loading,
    saving,
    error,
    fetchJournal,
    updateJournal,
    updatePrivacy,
    deleteJournal,
    fetchBullets,
    fetchProofChips,
  };
}
