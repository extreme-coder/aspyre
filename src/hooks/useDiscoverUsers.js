import { useState, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';

const PAGE_SIZE = 20;

export function useDiscoverUsers(currentUserId) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const debounceRef = useRef(null);
  const offsetRef = useRef(0);

  // Fetch users with optional search query
  const fetchUsers = useCallback(async (query = '', offset = 0, append = false) => {
    if (!currentUserId) return;

    setLoading(true);
    setError(null);

    try {
      // Build the query
      let queryBuilder = supabase
        .from('profiles')
        .select(`
          id,
          display_name,
          handle,
          avatar_url,
          location_city,
          location_region,
          account_privacy,
          created_at
        `)
        .eq('account_privacy', 'public')
        .neq('id', currentUserId)
        .order('created_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1);

      // Add search filter if query exists
      if (query.trim()) {
        const searchTerm = query.trim().toLowerCase();
        queryBuilder = queryBuilder.or(
          `display_name.ilike.%${searchTerm}%,handle.ilike.%${searchTerm}%`
        );
      }

      const { data: profiles, error: profilesError } = await queryBuilder;

      if (profilesError) throw profilesError;

      // Get blocked users to filter out
      const { data: blockedData } = await supabase
        .from('blocks')
        .select('blocked_user_id')
        .eq('user_id', currentUserId);

      const blockedIds = new Set((blockedData || []).map(b => b.blocked_user_id));

      // Get users who blocked the current user
      const { data: blockedByData } = await supabase
        .from('blocks')
        .select('user_id')
        .eq('blocked_user_id', currentUserId);

      const blockedByIds = new Set((blockedByData || []).map(b => b.user_id));

      // Filter out blocked users
      const filteredProfiles = (profiles || []).filter(
        p => !blockedIds.has(p.id) && !blockedByIds.has(p.id)
      );

      // Get friendship status for each user
      const profileIds = filteredProfiles.map(p => p.id);

      // Check if they are friends
      const { data: friendsData } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', currentUserId)
        .in('friend_id', profileIds);

      const friendIds = new Set((friendsData || []).map(f => f.friend_id));

      // Check outgoing pending requests
      const { data: outgoingRequests } = await supabase
        .from('friend_requests')
        .select('to_user_id')
        .eq('from_user_id', currentUserId)
        .eq('status', 'pending')
        .in('to_user_id', profileIds);

      const pendingOutgoingIds = new Set((outgoingRequests || []).map(r => r.to_user_id));

      // Check incoming pending requests
      const { data: incomingRequests } = await supabase
        .from('friend_requests')
        .select('from_user_id')
        .eq('to_user_id', currentUserId)
        .eq('status', 'pending')
        .in('from_user_id', profileIds);

      const pendingIncomingIds = new Set((incomingRequests || []).map(r => r.from_user_id));

      // Add relationship status to each profile
      const usersWithStatus = filteredProfiles.map(profile => ({
        ...profile,
        relationshipStatus: friendIds.has(profile.id)
          ? 'friends'
          : pendingOutgoingIds.has(profile.id)
          ? 'pending_outgoing'
          : pendingIncomingIds.has(profile.id)
          ? 'pending_incoming'
          : 'none',
      }));

      if (append) {
        setUsers(prev => [...prev, ...usersWithStatus]);
      } else {
        setUsers(usersWithStatus);
      }

      setHasMore(profiles?.length === PAGE_SIZE);
      offsetRef.current = offset + (profiles?.length || 0);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  // Search with debounce
  const searchUsers = useCallback((query) => {
    setSearchQuery(query);

    // Clear existing debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    // Debounce the search
    debounceRef.current = setTimeout(() => {
      offsetRef.current = 0;
      fetchUsers(query, 0, false);
    }, 300);
  }, [fetchUsers]);

  // Load more (pagination)
  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    fetchUsers(searchQuery, offsetRef.current, true);
  }, [loading, hasMore, searchQuery, fetchUsers]);

  // Refresh (reset and reload)
  const refresh = useCallback(() => {
    offsetRef.current = 0;
    fetchUsers(searchQuery, 0, false);
  }, [searchQuery, fetchUsers]);

  // Send friend request
  const sendFriendRequest = useCallback(async (toUserId, note = '') => {
    if (!currentUserId) return { error: { message: 'Not logged in' } };

    try {
      const { data, error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: currentUserId,
          to_user_id: toUserId,
          note: note || null,
          status: 'pending',
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Update local state
      setUsers(prev =>
        prev.map(user =>
          user.id === toUserId
            ? { ...user, relationshipStatus: 'pending_outgoing' }
            : user
        )
      );

      return { data };
    } catch (err) {
      console.error('Error sending friend request:', err);
      return { error: err };
    }
  }, [currentUserId]);

  // Cancel friend request
  const cancelFriendRequest = useCallback(async (toUserId) => {
    if (!currentUserId) return { error: { message: 'Not logged in' } };

    try {
      const { error: cancelError } = await supabase
        .from('friend_requests')
        .update({ status: 'canceled' })
        .eq('from_user_id', currentUserId)
        .eq('to_user_id', toUserId)
        .eq('status', 'pending');

      if (cancelError) throw cancelError;

      // Update local state
      setUsers(prev =>
        prev.map(user =>
          user.id === toUserId
            ? { ...user, relationshipStatus: 'none' }
            : user
        )
      );

      return { success: true };
    } catch (err) {
      console.error('Error canceling friend request:', err);
      return { error: err };
    }
  }, [currentUserId]);

  return {
    users,
    loading,
    error,
    hasMore,
    searchQuery,
    searchUsers,
    loadMore,
    refresh,
    sendFriendRequest,
    cancelFriendRequest,
  };
}
