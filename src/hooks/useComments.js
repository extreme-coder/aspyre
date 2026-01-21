import { useState, useCallback } from 'react';
import { supabase } from '../config/supabase';

/**
 * Hook for managing comments on journal posts.
 */
export function useComments(journalId, userId) {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState(null);

  // Fetch comments for a journal
  const fetchComments = useCallback(async () => {
    if (!journalId) {
      setComments([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('comments')
        .select(`
          id,
          content,
          created_at,
          user_id,
          commenter:profiles!user_id(
            id,
            display_name,
            avatar_url
          )
        `)
        .eq('journal_id', journalId)
        .order('created_at', { ascending: true });

      if (fetchError) {
        setError(fetchError.message);
        setComments([]);
      } else {
        setComments(data || []);
      }
    } catch (err) {
      setError(err.message);
      setComments([]);
    } finally {
      setLoading(false);
    }
  }, [journalId]);

  // Add a comment
  const addComment = useCallback(async (content) => {
    if (!journalId || !userId || !content?.trim()) {
      return { error: { message: 'Invalid parameters' } };
    }

    setAdding(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('comments')
        .insert({
          journal_id: journalId,
          user_id: userId,
          content: content.trim(),
        })
        .select(`
          id,
          content,
          created_at,
          user_id,
          commenter:profiles!user_id(
            id,
            display_name,
            avatar_url
          )
        `)
        .single();

      if (insertError) {
        setError(insertError.message);
        return { error: insertError };
      }

      // Add to local state
      setComments(prev => [...prev, data]);
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setAdding(false);
    }
  }, [journalId, userId]);

  // Delete a comment
  const deleteComment = useCallback(async (commentId) => {
    if (!commentId) {
      return { error: { message: 'Invalid comment ID' } };
    }

    try {
      const { error: deleteError } = await supabase
        .from('comments')
        .delete()
        .eq('id', commentId);

      if (deleteError) {
        return { error: deleteError };
      }

      // Remove from local state
      setComments(prev => prev.filter(c => c.id !== commentId));
      return { success: true };
    } catch (err) {
      return { error: err };
    }
  }, []);

  return {
    comments,
    loading,
    adding,
    error,
    commentCount: comments.length,
    fetchComments,
    addComment,
    deleteComment,
  };
}
