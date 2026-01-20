import { useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for tracking feed impressions.
 * Records when a user sees a post to inform the Discover feed ranking.
 */
export function useImpressions(userId, localDate = null) {
  // Track which journals have been recorded this session to avoid duplicates
  const recordedRef = useRef(new Set());

  // Get local date
  const getLocalDate = useCallback(() => {
    if (localDate) return localDate;
    const now = new Date();
    return now.toISOString().split('T')[0];
  }, [localDate]);

  /**
   * Record an impression when a post becomes visible.
   * Dedupes per (viewer_id, journal_id, local_date) client-side.
   */
  const recordImpression = useCallback(async (journalId, authorId) => {
    if (!userId || !journalId || !authorId) return;

    // Create a unique key for this impression
    const date = getLocalDate();
    const key = `${journalId}-${date}`;

    // Skip if already recorded this session
    if (recordedRef.current.has(key)) return;

    // Mark as recorded immediately to prevent duplicate calls
    recordedRef.current.add(key);

    try {
      // Insert impression (unique constraint will prevent true duplicates)
      const { error } = await supabase.from('feed_impressions').insert({
        viewer_id: userId,
        journal_id: journalId,
        author_id: authorId,
        local_date: date,
      });

      // Ignore unique constraint violations (already recorded)
      if (error && !error.message.includes('duplicate key')) {
        console.warn('Failed to record impression:', error.message);
      }
    } catch (err) {
      console.warn('Failed to record impression:', err.message);
    }
  }, [userId, getLocalDate]);

  /**
   * Record impressions for multiple posts at once (batch).
   */
  const recordImpressions = useCallback(async (posts) => {
    if (!userId || !posts || posts.length === 0) return;

    const date = getLocalDate();
    const newImpressions = [];

    for (const post of posts) {
      const key = `${post.id}-${date}`;
      if (!recordedRef.current.has(key) && post.id && post.user_id) {
        recordedRef.current.add(key);
        newImpressions.push({
          viewer_id: userId,
          journal_id: post.id,
          author_id: post.user_id,
          local_date: date,
        });
      }
    }

    if (newImpressions.length === 0) return;

    try {
      // Batch insert (ignore duplicates)
      const { error } = await supabase
        .from('feed_impressions')
        .insert(newImpressions);

      if (error && !error.message.includes('duplicate key')) {
        console.warn('Failed to batch record impressions:', error.message);
      }
    } catch (err) {
      console.warn('Failed to batch record impressions:', err.message);
    }
  }, [userId, getLocalDate]);

  /**
   * Clear the session tracking (call on refresh or new session)
   */
  const clearSessionTracking = useCallback(() => {
    recordedRef.current.clear();
  }, []);

  return {
    recordImpression,
    recordImpressions,
    clearSessionTracking,
  };
}
