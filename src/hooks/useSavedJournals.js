import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for fetching saved journals with privacy/block filtering.
 */
export function useSavedJournals(userId) {
  const [savedJournals, setSavedJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchSavedJournals = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_saved_journals', {
        p_user_id: userId,
        p_limit: 50,
      });

      if (rpcError) throw rpcError;
      setSavedJournals(data || []);
    } catch (err) {
      console.error('Error fetching saved journals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const unsaveJournal = useCallback(async (journalId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: deleteError } = await supabase
        .from('saves')
        .delete()
        .eq('user_id', userId)
        .eq('journal_id', journalId);

      if (deleteError) throw deleteError;

      // Remove from local state
      setSavedJournals(prev => prev.filter(j => j.id !== journalId));
      return { success: true };
    } catch (err) {
      console.error('Error unsaving journal:', err);
      return { error: err };
    }
  }, [userId]);

  const refresh = useCallback(() => {
    fetchSavedJournals();
  }, [fetchSavedJournals]);

  return {
    savedJournals,
    loading,
    error,
    fetchSavedJournals,
    unsaveJournal,
    refresh,
    savedCount: savedJournals.length,
  };
}
