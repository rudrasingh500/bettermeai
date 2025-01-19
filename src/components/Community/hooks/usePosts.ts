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
  const [posts, setPosts] = useState<Post[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchPosts = useCallback(async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const { data, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, username, avatar_url),
          analyses!posts_analysis_id_fkey (
            id, front_image_url, left_side_image_url, analysis_text
          ),
          before_analysis:analyses!posts_before_analysis_id_fkey (
            id, front_image_url, analysis_text
          ),
          after_analysis:analyses!posts_after_analysis_id_fkey (
            id, front_image_url, analysis_text
          ),
          comments (
            id, content, created_at,
            profiles (id, username, avatar_url)
          ),
          reactions (id, type, user_id)
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Transform posts data to include counts
      const postsWithCounts = (data || []).map(post => ({
        ...post,
        _count: {
          comments: post.comments?.length || 0,
          reactions: post.reactions?.length || 0
        }
      }));

      setPosts(postsWithCounts);
      setError(null);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  const createPost = async (data: CreatePostData) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('posts')
        .insert([{
          user_id: userId,
          type: data.type,
          analysis_id: data.analysisId,
          before_analysis_id: data.beforeAnalysisId,
          after_analysis_id: data.afterAnalysisId,
          content: data.content
        }]);

      if (error) throw error;
      await fetchPosts();
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
    } finally {
      setIsLoading(false);
    }
  };

  const addComment = async (postId: string, content: string) => {
    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: userId,
          content
        }]);

      if (error) throw error;
      await fetchPosts();
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    } finally {
      setIsLoading(false);
    }
  };

  const addReaction = async (postId: string, type: 'like' | 'helpful' | 'insightful') => {
    try {
      setIsLoading(true);
      // First check if user already reacted
      const { data: existingReaction } = await supabase
        .from('reactions')
        .select('id')
        .eq('post_id', postId)
        .eq('user_id', userId)
        .single();

      if (existingReaction) {
        // Remove existing reaction
        const { error } = await supabase
          .from('reactions')
          .delete()
          .eq('id', existingReaction.id);

        if (error) throw error;
      } else {
        // Add new reaction
        const { error } = await supabase
          .from('reactions')
          .insert([{
            post_id: postId,
            user_id: userId,
            type
          }]);

        if (error) throw error;
      }

      await fetchPosts();
    } catch (err) {
      console.error('Error toggling reaction:', err);
      setError('Failed to update reaction');
    } finally {
      setIsLoading(false);
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