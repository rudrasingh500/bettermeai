import { useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { useAuthStore } from '../../../lib/store';

export const usePosts = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const createPost = async (content: string, type: 'analysis' | 'progress', analysisId?: string, beforeAnalysisId?: string, afterAnalysisId?: string) => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Create the post
      const { data: post, error: postError } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          content,
          type,
          analysis_id: analysisId,
          before_analysis_id: beforeAnalysisId,
          after_analysis_id: afterAnalysisId
        }])
        .select()
        .single();

      if (postError) throw postError;

      // Get all connections of the user
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (connectionsError) throw connectionsError;

      // Create notifications for all connections
      if (connections && connections.length > 0) {
        const { data: userProfile } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', user.id)
          .single();

        const notifications = connections.map(conn => ({
          user_id: conn.user1_id === user.id ? conn.user2_id : conn.user1_id,
          type: 'connection_post' as const,
          data: {
            post_id: post.id,
            username: userProfile?.username || 'user',
            post_type: type
          },
          read: false
        }));

        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('Error creating notifications:', notificationError);
        }
      }

      return post;
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPost,
    isLoading,
    error
  };
}; 