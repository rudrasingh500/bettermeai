import { useState } from 'react';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';

export const usePostInteractions = (onUpdate?: () => Promise<void>) => {
  const { user } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  const handleReaction = async (postId: string, type: 'like' | 'helpful' | 'insightful') => {
    try {
      if (!user?.id) return;

      // Check if user already reacted
      const { data: existingReactions } = await supabase
        .from('reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (existingReactions && existingReactions.length > 0) {
        // Remove existing reaction
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (deleteError) throw deleteError;

        // If we're not adding a new reaction, we're done
        if (existingReactions[0].type === type) {
          await onUpdate?.();
          return;
        }
      }

      // Add new reaction
      const { error: insertError } = await supabase
        .from('reactions')
        .insert([{
          post_id: postId,
          user_id: user.id,
          type
        }]);

      if (insertError) throw insertError;
      await onUpdate?.();
    } catch (err) {
      console.error('Error handling reaction:', err);
      setError('Failed to update reaction');
    }
  };

  const handleComment = async (postId: string, content: string) => {
    try {
      if (!user?.id || !content.trim()) return;

      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content: content.trim()
        }]);

      if (error) throw error;
      await onUpdate?.();
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  };

  return {
    handleReaction,
    handleComment,
    error
  };
}; 