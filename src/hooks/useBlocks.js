import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for managing blocked users.
 *
 * Privacy policy: Mutual invisibility
 * - Blocker cannot see blocked user's content
 * - Blocked user cannot see blocker's content
 * - Neither can send friend requests to each other
 */
export function useBlocks(userId) {
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all users blocked by current user
  const fetchBlockedUsers = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('blocks')
        .select(`
          blocked_user_id,
          created_at,
          blocked_user:profiles!blocks_blocked_user_id_fkey(
            id,
            handle,
            display_name,
            avatar_url
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setBlockedUsers(data || []);
    } catch (err) {
      console.error('Error fetching blocked users:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchBlockedUsers();
  }, [fetchBlockedUsers]);

  // Block a user
  const blockUser = useCallback(async (blockedId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    if (blockedId === userId) {
      return { error: { message: 'Cannot block yourself' } };
    }

    try {
      const { error: rpcError } = await supabase.rpc('block_user', {
        blocked_id: blockedId,
      });

      if (rpcError) throw rpcError;

      await fetchBlockedUsers();
      return { success: true };
    } catch (err) {
      console.error('Error blocking user:', err);
      return { error: err };
    }
  }, [userId, fetchBlockedUsers]);

  // Unblock a user
  const unblockUser = useCallback(async (blockedId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: rpcError } = await supabase.rpc('unblock_user', {
        blocked_id: blockedId,
      });

      if (rpcError) throw rpcError;

      await fetchBlockedUsers();
      return { success: true };
    } catch (err) {
      console.error('Error unblocking user:', err);
      return { error: err };
    }
  }, [userId, fetchBlockedUsers]);

  // Check if a user is blocked
  const isBlocked = useCallback((otherUserId) => {
    return blockedUsers.some(b => b.blocked_user_id === otherUserId);
  }, [blockedUsers]);

  return {
    blockedUsers,
    loading,
    error,
    fetchBlockedUsers,
    blockUser,
    unblockUser,
    isBlocked,
    blockedCount: blockedUsers.length,
  };
}
