import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for managing user notifications with realtime updates.
 * Provides notifications list, unread count, and CRUD operations.
 */
export function useNotifications(userId) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const subscriptionRef = useRef(null);

  // Calculate unread count from notifications
  const calculateUnreadCount = useCallback((notifs) => {
    return notifs.filter((n) => !n.read_at).length;
  }, []);

  // Fetch notifications from database
  const fetchNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (fetchError) {
        setError(fetchError.message);
        setNotifications([]);
        setUnreadCount(0);
      } else {
        setNotifications(data || []);
        setUnreadCount(calculateUnreadCount(data || []));
      }
    } catch (err) {
      setError(err.message);
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
    }
  }, [userId, calculateUnreadCount]);

  // Set up realtime subscription
  useEffect(() => {
    if (!userId) return;

    // Initial fetch
    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Add new notification to the top of the list
          setNotifications((prev) => [payload.new, ...prev]);
          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Update notification in list
          setNotifications((prev) =>
            prev.map((n) => (n.id === payload.new.id ? payload.new : n))
          );
          // Recalculate unread count
          setNotifications((prev) => {
            setUnreadCount(calculateUnreadCount(prev));
            return prev;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          // Remove notification from list
          setNotifications((prev) => {
            const updated = prev.filter((n) => n.id !== payload.old.id);
            setUnreadCount(calculateUnreadCount(updated));
            return updated;
          });
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    // Cleanup subscription on unmount
    return () => {
      if (subscriptionRef.current) {
        supabase.removeChannel(subscriptionRef.current);
      }
    };
  }, [userId, fetchNotifications, calculateUnreadCount]);

  // Mark a single notification as read
  const markAsRead = useCallback(
    async (notificationId) => {
      if (!userId || !notificationId) return { error: { message: 'Invalid params' } };

      try {
        const { data, error: updateError } = await supabase
          .from('notifications')
          .update({ read_at: new Date().toISOString() })
          .eq('id', notificationId)
          .eq('user_id', userId)
          .select()
          .single();

        if (updateError) {
          return { error: updateError };
        }

        // Update local state
        setNotifications((prev) =>
          prev.map((n) => (n.id === notificationId ? data : n))
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));

        return { data };
      } catch (err) {
        return { error: err };
      }
    },
    [userId]
  );

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('user_id', userId)
        .is('read_at', null);

      if (updateError) {
        return { error: updateError };
      }

      // Update local state
      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read_at: n.read_at || new Date().toISOString(),
        }))
      );
      setUnreadCount(0);

      return { success: true };
    } catch (err) {
      return { error: err };
    }
  }, [userId]);

  // Delete a single notification
  const deleteNotification = useCallback(
    async (notificationId) => {
      if (!userId || !notificationId) return { error: { message: 'Invalid params' } };

      try {
        const notification = notifications.find((n) => n.id === notificationId);
        const wasUnread = notification && !notification.read_at;

        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId)
          .eq('user_id', userId);

        if (deleteError) {
          return { error: deleteError };
        }

        // Update local state
        setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
        if (wasUnread) {
          setUnreadCount((prev) => Math.max(0, prev - 1));
        }

        return { success: true };
      } catch (err) {
        return { error: err };
      }
    },
    [userId, notifications]
  );

  // Clear all notifications
  const clearAll = useCallback(async () => {
    if (!userId) return { error: { message: 'Not authenticated' } };

    try {
      const { error: deleteError } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', userId);

      if (deleteError) {
        return { error: deleteError };
      }

      // Update local state
      setNotifications([]);
      setUnreadCount(0);

      return { success: true };
    } catch (err) {
      return { error: err };
    }
  }, [userId]);

  return {
    notifications,
    unreadCount,
    loading,
    error,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
