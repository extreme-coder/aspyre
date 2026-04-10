import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';
import { cacheData, getCachedData, CACHE_KEYS } from '../utils/offlineCache';

const PAGE_SIZE = 20;

/**
 * Feed filters
 */
export const FeedFilter = {
  DISCOVER: 'discover',
  SIMILAR_GOALS: 'similar_goals',
  FRIENDS: 'friends',
  NEARBY: 'nearby',
  SAVED: 'saved',
  ALL: 'all',
};

/**
 * Hook for fetching and managing feed data with pagination.
 * Uses the get_viewable_journals RPC for privacy-safe queries.
 * Discover mode uses get_discover_feed RPC for ranked, diverse content.
 */
export function useFeed(userId, localDate = null) {
  const [journals, setJournals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState(FeedFilter.DISCOVER);
  const [isFromCache, setIsFromCache] = useState(false);

  const cursorRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  // Get local date for discover feed
  const getLocalDate = useCallback(() => {
    if (localDate) return localDate;
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, [localDate]);

  // Get cache key for current filter
  const getCacheKey = useCallback((filterType) => {
    switch (filterType) {
      case FeedFilter.DISCOVER:
        return `${CACHE_KEYS.FEED_DISCOVER}_${userId}`;
      case FeedFilter.FRIENDS:
        return `${CACHE_KEYS.FEED_FRIENDS}_${userId}`;
      default:
        return `feed_${filterType}_${userId}`;
    }
  }, [userId]);

  // Load cached data if available
  const loadFromCache = useCallback(async () => {
    const cacheKey = getCacheKey(filter);
    const cached = await getCachedData(cacheKey);
    if (cached && cached.length > 0) {
      setJournals(cached);
      setIsFromCache(true);
      return true;
    }
    return false;
  }, [filter, getCacheKey]);

  // Fetch journals from the appropriate RPC
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
      let data, rpcError;

      if (filter === FeedFilter.DISCOVER) {
        // Use discover feed RPC for ranked, diverse content
        const result = await supabase.rpc('get_discover_feed', {
          p_viewer_id: userId,
          p_local_date: getLocalDate(),
          p_limit: PAGE_SIZE,
          p_cursor: cursorRef.current,
        });
        data = result.data;
        rpcError = result.error;
      } else {
        // Use regular viewable journals RPC for filtered feeds
        const result = await supabase.rpc('get_viewable_journals', {
          p_viewer_id: userId,
          p_filter: filter,
          p_limit: PAGE_SIZE,
          p_cursor: cursorRef.current,
        });
        data = result.data;
        rpcError = result.error;
      }

      if (rpcError) {
        setError(rpcError.message);
        return;
      }

      const newJournals = data || [];

      if (isLoadMore) {
        setJournals(prev => [...prev, ...newJournals]);
      } else {
        setJournals(newJournals);
        setIsFromCache(false); // Mark as fresh data
        // Cache the initial page for offline access
        if (newJournals.length > 0) {
          const cacheKey = getCacheKey(filter);
          cacheData(cacheKey, newJournals);
        }
      }

      // Update cursor for pagination
      if (newJournals.length > 0) {
        cursorRef.current = newJournals[newJournals.length - 1].created_at;
      }

      setHasMore(newJournals.length === PAGE_SIZE);
    } catch (err) {
      // Try to load from cache on network error
      if (!isLoadMore) {
        const hasCached = await loadFromCache();
        if (hasCached) {
          setError(null); // Clear error if we have cached data
        } else {
          setError(err.message);
        }
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      isInitialLoadRef.current = false;
    }
  }, [userId, filter, getLocalDate, getCacheKey, loadFromCache]);

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
    isFromCache,
    changeFilter,
    loadMore,
    refresh,
    updateKudos,
    updateSaved,
    removeFromFeed,
  };
}
