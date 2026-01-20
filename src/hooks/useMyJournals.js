import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for fetching and managing user's own journals.
 */
export function useMyJournals(userId) {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState(null);

  const PAGE_SIZE = 20;

  const fetchJournals = useCallback(async (cursor = null) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (cursor) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_my_journals', {
        p_user_id: userId,
        p_limit: PAGE_SIZE,
        p_cursor: cursor,
      });

      if (rpcError) throw rpcError;

      const newJournals = data || [];

      if (cursor) {
        setJournals(prev => [...prev, ...newJournals]);
      } else {
        setJournals(newJournals);
      }

      setHasMore(newJournals.length === PAGE_SIZE);
    } catch (err) {
      console.error('Error fetching journals:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [userId]);

  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && journals.length > 0) {
      const lastJournal = journals[journals.length - 1];
      fetchJournals(lastJournal.created_at);
    }
  }, [loadingMore, hasMore, journals, fetchJournals]);

  const refresh = useCallback(() => {
    fetchJournals(null);
  }, [fetchJournals]);

  const deleteJournal = useCallback(async (journalId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { data, error: rpcError } = await supabase.rpc('delete_journal', {
        p_journal_id: journalId,
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;

      if (data && data.length > 0 && data[0].success) {
        // Remove from local state
        setJournals(prev => prev.filter(j => j.id !== journalId));
        return {
          success: true,
          wasToday: data[0].was_today,
          deletedDate: data[0].deleted_date,
        };
      }

      return { error: { message: 'Failed to delete journal' } };
    } catch (err) {
      console.error('Error deleting journal:', err);
      return { error: err };
    }
  }, [userId]);

  // Group journals by month/year for display
  const groupedJournals = useCallback(() => {
    const groups = {};

    journals.forEach(journal => {
      const date = new Date(journal.local_date);
      const monthKey = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(journal);
    });

    return Object.entries(groups).map(([month, items]) => ({
      month,
      data: items,
    }));
  }, [journals]);

  return {
    journals,
    groupedJournals: groupedJournals(),
    loading,
    loadingMore,
    hasMore,
    error,
    fetchJournals,
    loadMore,
    refresh,
    deleteJournal,
  };
}
