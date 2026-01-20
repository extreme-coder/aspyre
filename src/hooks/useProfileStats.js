import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for fetching profile statistics including streak calculation.
 */
export function useProfileStats(userId) {
  const [stats, setStats] = useState({
    currentStreak: 0,
    longestStreak: 0,
    totalJournals: 0,
    totalKudos: 0,
    journalsThisWeek: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase.rpc('get_profile_stats', {
        p_user_id: userId,
      });

      if (rpcError) throw rpcError;

      if (data && data.length > 0) {
        const row = data[0];
        setStats({
          currentStreak: row.current_streak || 0,
          longestStreak: row.longest_streak || 0,
          totalJournals: parseInt(row.total_journals) || 0,
          totalKudos: parseInt(row.total_kudos) || 0,
          journalsThisWeek: parseInt(row.journals_this_week) || 0,
        });
      }
    } catch (err) {
      console.error('Error fetching profile stats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  return {
    stats,
    loading,
    error,
    fetchStats,
    refresh: fetchStats,
  };
}
