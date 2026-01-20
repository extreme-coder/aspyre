import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';

const PAGE_SIZE = 20;

/**
 * Feed filters
 */
export const FeedFilter = {
  SIMILAR_GOALS: 'similar_goals',
  FRIENDS: 'friends',
  NEARBY: 'nearby',
  SAVED: 'saved',
  ALL: 'all',
};

/**
 * Hook for fetching and managing feed data with pagination.
 * Uses the get_viewable_journals RPC for privacy-safe queries.
 */
export function useFeed(userId) {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState(FeedFilter.SIMILAR_GOALS);

  const cursorRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Fetch journals from the RPC
  const fetchJournals = useCallback(async (isLoadMore = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    if (isLoadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
      cursorRef.current = null;
    }

    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_viewable_journals', {
        p_viewer_id: userId,
        p_filter: filter,
        p_limit: PAGE_SIZE,
        p_cursor: cursorRef.current,
      });

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      const newJournals = data || [];

      if (isLoadMore) {
        setJournals(prev => [...prev, ...newJournals]);
      } else {
        setJournals(newJournals);
      }

      // Update cursor for pagination
      if (newJournals.length > 0) {
        cursorRef.current = newJournals[newJournals.length - 1].created_at;
      }

      setHasMore(newJournals.length === PAGE_SIZE);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isInitialLoadRef.current = false;
    }
  }, [userId, filter]);

  // Initial fetch and filter change
  useEffect(() => {
    fetchJournals(false);
  }, [fetchJournals]);

  // Load more function for infinite scroll
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) {
      fetchJournals(true);
    }
  }, [loadingMore, hasMore, loading, fetchJournals]);

  // Refresh function
  const refresh = useCallback(() => {
    cursorRef.current = null;
    fetchJournals(false);
  }, [fetchJournals]);

  // Change filter
  const changeFilter = useCallback((newFilter) => {
    if (newFilter !== filter) {
      setFilter(newFilter);
      cursorRef.current = null;
    }
  }, [filter]);

  // Optimistic update for kudos
  const updateKudos = useCallback((journalId, hasKudos) => {
    setJournals(prev => prev.map(journal => {
      if (journal.id === journalId) {
        return {
          ...journal,
          viewer_has_kudos: hasKudos,
          kudos_count: hasKudos
            ? (parseInt(journal.kudos_count) || 0) + 1
            : Math.max(0, (parseInt(journal.kudos_count) || 0) - 1),
        };
      }
      return journal;
    }));
  }, []);

  // Optimistic update for save
  const updateSaved = useCallback((journalId, hasSaved) => {
    setJournals(prev => prev.map(journal => {
      if (journal.id === journalId) {
        return {
          ...journal,
          viewer_has_saved: hasSaved,
        };
      }
      return journal;
    }));
  }, []);

  // Remove journal from feed (for hide)
  const removeFromFeed = useCallback((journalId) => {
    setJournals(prev => prev.filter(journal => journal.id !== journalId));
  }, []);

  return {
    journals,
    loading,
    loadingMore,
    error,
    hasMore,
    filter,
    changeFilter,
    loadMore,
    refresh,
    updateKudos,
    updateSaved,
    removeFromFeed,
  };
}
