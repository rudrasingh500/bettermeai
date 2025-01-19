import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Post } from '../lib/types';
import { useAuthStore } from '../lib/store';

interface RankedPost extends Post {
  _score: number;
}

export const usePosts = (maxAge: number = 30 * 1000) => {
  const [posts, setPosts] = useState<RankedPost[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuthStore();

  const calculatePostScore = useCallback((post: Post, userConnections: Set<string>) => {
    const now = new Date();
    const postDate = new Date(post.created_at);
    const hoursSincePosted = (now.getTime() - postDate.getTime()) / (1000 * 60 * 60);
    
    // Base score factors
    const reactionScore = (post.reactions?.length || 0) * 10;
    const commentScore = (post.comments?.length || 0) * 15;
    const recencyScore = Math.max(0, 100 - hoursSincePosted); // Decreases over time
    
    // Connection bonus
    const isConnection = userConnections.has(post.user_id);
    const connectionBonus = isConnection ? 50 : 0;

    // Quality indicators
    const hasAnalysis = post.analyses ? 20 : 0;
    const hasBeforeAfter = (post.before_analysis && post.after_analysis) ? 30 : 0;
    const hasContent = post.content && post.content.trim().length > 0 ? 10 : 0;

    // Calculate final score
    const score = (
      reactionScore +
      commentScore +
      recencyScore +
      connectionBonus +
      hasAnalysis +
      hasBeforeAfter +
      hasContent
    );

    return score;
  }, []);

  const fetchPosts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // First, fetch user's connections
      const { data: connections, error: connectionsError } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .eq('status', 'accepted')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`);

      if (connectionsError) throw connectionsError;

      // Create a set of connected user IDs
      const connectedUserIds = new Set<string>();
      connections?.forEach(conn => {
        if (conn.user1_id === user?.id) {
          connectedUserIds.add(conn.user2_id);
        } else {
          connectedUserIds.add(conn.user1_id);
        }
      });

      // Fetch posts with all related data
      const { data: fetchedPosts, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (id, username, avatar_url),
          comments (
            id,
            content,
            created_at,
            profiles (id, username, avatar_url)
          ),
          reactions (id, type, user_id),
          analyses!posts_analysis_id_fkey (
            id, front_image_url, left_side_image_url, analysis_text
          ),
          before_analysis:analyses!posts_before_analysis_id_fkey (
            id, front_image_url, analysis_text, overall_rating
          ),
          after_analysis:analyses!posts_after_analysis_id_fkey (
            id, front_image_url, analysis_text, overall_rating
          )
        `)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      // Rank and sort posts
      const rankedPosts = (fetchedPosts || []).map(post => ({
        ...post,
        _score: calculatePostScore(post, connectedUserIds)
      }));

      // Sort by score descending
      rankedPosts.sort((a, b) => b._score - a._score);

      setPosts(rankedPosts);
    } catch (err) {
      console.error('Error fetching posts:', err);
      setError('Failed to load posts');
    } finally {
      setIsLoading(false);
    }
  }, [user?.id, calculatePostScore]);

  // Initial fetch and periodic refresh
  useEffect(() => {
    fetchPosts();

    const interval = setInterval(fetchPosts, maxAge);
    return () => clearInterval(interval);
  }, [fetchPosts, maxAge]);

  return {
    posts,
    isLoading,
    error,
    refetch: fetchPosts
  };
}; 