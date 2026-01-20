import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../config/supabase';

export function useGoals(userId) {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  // Fetch all goals
  const fetchGoals = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError(fetchError.message);
        setGoals([]);
      } else {
        setGoals(data || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  // Get active goals (not archived)
  const activeGoals = goals.filter(g => !g.is_archived);

  // Get archived goals
  const archivedGoals = goals.filter(g => g.is_archived);

  // Create goal
  const createGoal = useCallback(async ({ title, goal_type, tags = [] }) => {
    if (!userId) {
      return { error: { message: 'Not authenticated' } };
    }

    setSaving(true);
    setError(null);

    try {
      const { data, error: createError } = await supabase
        .from('goals')
        .insert({
          user_id: userId,
          title,
          goal_type,
          tags,
        })
        .select()
        .single();

      if (createError) {
        setError(createError.message);
        return { error: createError };
      }

      setGoals(prev => [data, ...prev]);
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // Update goal
  const updateGoal = useCallback(async (goalId, updates) => {
    setSaving(true);
    setError(null);

    try {
      const { data, error: updateError } = await supabase
        .from('goals')
        .update(updates)
        .eq('id', goalId)
        .eq('user_id', userId) // RLS ensures this, but explicit is good
        .select()
        .single();

      if (updateError) {
        setError(updateError.message);
        return { error: updateError };
      }

      setGoals(prev => prev.map(g => g.id === goalId ? data : g));
      return { data };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId]);

  // Archive/unarchive goal
  const toggleArchive = useCallback(async (goalId, isArchived) => {
    return updateGoal(goalId, { is_archived: !isArchived });
  }, [updateGoal]);

  // Delete goal
  const deleteGoal = useCallback(async (goalId) => {
    setSaving(true);
    setError(null);

    try {
      const { error: deleteError } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', userId);

      if (deleteError) {
        setError(deleteError.message);
        return { error: deleteError };
      }

      setGoals(prev => prev.filter(g => g.id !== goalId));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { error: err };
    } finally {
      setSaving(false);
    }
  }, [userId]);

  return {
    goals,
    activeGoals,
    archivedGoals,
    loading,
    error,
    saving,
    fetchGoals,
    createGoal,
    updateGoal,
    toggleArchive,
    deleteGoal,
  };
}
