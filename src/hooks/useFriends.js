import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for managing friends and friend requests.
 */
export function useFriends(userId) {
  const [friends, setFriends] = useState([]);
  const [incomingRequests, setIncomingRequests] = useState([]);
  const [outgoingRequests, setOutgoingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch all friends
  const fetchFriends = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('friends')
        .select(`
          friend_id,
          created_at,
          friend:profiles!friends_friend_id_fkey(
            id,
            handle,
            display_name,
            avatar_url,
            account_privacy
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setFriends(data || []);
    } catch (err) {
      console.error('Error fetching friends:', err);
      setError(err.message);
    }
  }, [userId]);

  // Fetch incoming friend requests (where current user is recipient)
  const fetchIncomingRequests = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          note,
          status,
          created_at,
          sender:profiles!friend_requests_from_user_id_fkey(
            id,
            handle,
            display_name,
            avatar_url
          )
        `)
        .eq('to_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setIncomingRequests(data || []);
    } catch (err) {
      console.error('Error fetching incoming requests:', err);
      setError(err.message);
    }
  }, [userId]);

  // Fetch outgoing friend requests (where current user is sender)
  const fetchOutgoingRequests = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('friend_requests')
        .select(`
          id,
          note,
          status,
          created_at,
          recipient:profiles!friend_requests_to_user_id_fkey(
            id,
            handle,
            display_name,
            avatar_url
          )
        `)
        .eq('from_user_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setOutgoingRequests(data || []);
    } catch (err) {
      console.error('Error fetching outgoing requests:', err);
      setError(err.message);
    }
  }, [userId]);

  // Fetch all data
  const fetchAll = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    await Promise.all([
      fetchFriends(),
      fetchIncomingRequests(),
      fetchOutgoingRequests(),
    ]);

    setLoading(false);
  }, [userId, fetchFriends, fetchIncomingRequests, fetchOutgoingRequests]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  // Send a friend request
  const sendFriendRequest = useCallback(async (toUserId, note = null) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      // Check if already friends
      const { data: existingFriend } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', userId)
        .eq('friend_id', toUserId)
        .maybeSingle();

      if (existingFriend) {
        return { error: { message: 'Already friends with this user' } };
      }

      // Check if there's already a pending request (either direction)
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, from_user_id, status')
        .or(`and(from_user_id.eq.${userId},to_user_id.eq.${toUserId}),and(from_user_id.eq.${toUserId},to_user_id.eq.${userId})`)
        .eq('status', 'pending')
        .maybeSingle();

      if (existingRequest) {
        if (existingRequest.from_user_id === toUserId) {
          // They already sent us a request - accept it instead
          return { error: { message: 'This user has already sent you a request. Check your incoming requests.' } };
        }
        return { error: { message: 'Friend request already pending' } };
      }

      // Send the request
      const { data, error: insertError } = await supabase
        .from('friend_requests')
        .insert({
          from_user_id: userId,
          to_user_id: toUserId,
          note: note || null,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      await fetchOutgoingRequests();
      return { data };
    } catch (err) {
      console.error('Error sending friend request:', err);
      return { error: err };
    }
  }, [userId, fetchOutgoingRequests]);

  // Accept a friend request
  const acceptRequest = useCallback(async (requestId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: rpcError } = await supabase.rpc('accept_friend_request', {
        request_id: requestId,
      });

      if (rpcError) throw rpcError;

      await fetchAll();
      return { success: true };
    } catch (err) {
      console.error('Error accepting friend request:', err);
      return { error: err };
    }
  }, [userId, fetchAll]);

  // Decline a friend request
  const declineRequest = useCallback(async (requestId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: rpcError } = await supabase.rpc('decline_friend_request', {
        request_id: requestId,
      });

      if (rpcError) throw rpcError;

      await fetchIncomingRequests();
      return { success: true };
    } catch (err) {
      console.error('Error declining friend request:', err);
      return { error: err };
    }
  }, [userId, fetchIncomingRequests]);

  // Cancel an outgoing friend request
  const cancelRequest = useCallback(async (requestId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: rpcError } = await supabase.rpc('cancel_friend_request', {
        request_id: requestId,
      });

      if (rpcError) throw rpcError;

      await fetchOutgoingRequests();
      return { success: true };
    } catch (err) {
      console.error('Error canceling friend request:', err);
      return { error: err };
    }
  }, [userId, fetchOutgoingRequests]);

  // Remove a friend
  const removeFriend = useCallback(async (friendId) => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: rpcError } = await supabase.rpc('remove_friend', {
        other_user_id: friendId,
      });

      if (rpcError) throw rpcError;

      await fetchFriends();
      return { success: true };
    } catch (err) {
      console.error('Error removing friend:', err);
      return { error: err };
    }
  }, [userId, fetchFriends]);

  // Check if a specific user is a friend
  const isFriend = useCallback((otherUserId) => {
    return friends.some(f => f.friend_id === otherUserId);
  }, [friends]);

  // Check if there's a pending request to a user
  const hasPendingRequestTo = useCallback((otherUserId) => {
    return outgoingRequests.some(r => r.recipient?.id === otherUserId);
  }, [outgoingRequests]);

  // Check if there's a pending request from a user
  const hasPendingRequestFrom = useCallback((otherUserId) => {
    return incomingRequests.some(r => r.sender?.id === otherUserId);
  }, [incomingRequests]);

  // Get the relationship status with another user
  const getRelationshipStatus = useCallback((otherUserId) => {
    if (isFriend(otherUserId)) return 'friends';
    if (hasPendingRequestTo(otherUserId)) return 'request_sent';
    if (hasPendingRequestFrom(otherUserId)) return 'request_received';
    return 'none';
  }, [isFriend, hasPendingRequestTo, hasPendingRequestFrom]);

  return {
    friends,
    incomingRequests,
    outgoingRequests,
    loading,
    error,
    fetchAll,
    fetchFriends,
    fetchIncomingRequests,
    fetchOutgoingRequests,
    sendFriendRequest,
    acceptRequest,
    declineRequest,
    cancelRequest,
    removeFriend,
    isFriend,
    hasPendingRequestTo,
    hasPendingRequestFrom,
    getRelationshipStatus,
    friendCount: friends.length,
    incomingCount: incomingRequests.length,
    outgoingCount: outgoingRequests.length,
  };
}
