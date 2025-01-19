import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import type { Post } from '../../../lib/types';

interface CreatePostData {
  type: 'analysis' | 'before_after';
  analysisId?: string;
  beforeAnalysisId?: string;
  afterAnalysisId?: string;
  content: string;
}

export const usePosts = (userId: string) => {
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('posts')
        .select('*, profiles:user_id(*), comments(*), reactions(*)')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setPosts(data || []);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to fetch posts');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createPost = async (data: CreatePostData) => {
    try {
      const { error: postError } = await supabase
        .from('posts')
        .insert([{
          user_id: userId,
          content: data.content,
          type: data.type,
          analysis_id: data.analysisId,
          before_analysis_id: data.beforeAnalysisId,
          after_analysis_id: data.afterAnalysisId
        }]);

      if (postError) throw postError;
      await fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
    }
  };

  const addComment = async (postId: string, content: string) => {
    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: userId,
          content
        }]);

      if (error) throw error;
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
      throw err;
    }
  };

  const addReaction = async (postId: string, type: 'like' | 'helpful' | 'insightful') => {
    try {
      // Check if user already reacted
      const { data: existingReactions } = await supabase
        .from('reactions')
        .select('*')
        .eq('post_id', postId)
        .eq('user_id', userId);

      if (existingReactions && existingReactions.length > 0) {
        // Remove existing reaction
        const { error: deleteError } = await supabase
          .from('reactions')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // If we're not adding a new reaction, we're done
        if (existingReactions[0].type === type) {
          return;
        }
      }

      // Add new reaction if we're not just removing one
      const { error: insertError } = await supabase
        .from('reactions')
        .insert([{
          post_id: postId,
          user_id: userId,
          type
        }]);

      if (insertError) throw insertError;

    } catch (err) {
      console.error('Error toggling reaction:', err);
      setError('Failed to update reaction');
      throw err;
    }
  };

  return {
    posts,
    error,
    isLoading,
    fetchPosts,
    createPost,
    addComment,
    addReaction
  };
}; 