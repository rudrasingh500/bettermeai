import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/store';

export const usePrefetch = () => {
  const { user } = useAuthStore();

  const prefetchData = useCallback(async () => {
    if (!user) return;

    // Fetch all data in parallel
    await Promise.all([
      // Connections
      supabase
        .from('connections')
        .select(`
          *,
          profiles!connections_user1_id_fkey (id, username, avatar_url),
          profiles!connections_user2_id_fkey (id, username, avatar_url)
        `)
        .or('user1_id.eq.' + user.id + ',user2_id.eq.' + user.id)
        .then(({ data }) => {
          if (data) {
            localStorage.setItem('prefetched_connections', JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          }
        }),

      // Posts with full data
      supabase
        .from('posts')
        .select(`
          *,
          profiles (id, username, avatar_url, bio),
          analyses!posts_analysis_id_fkey (
            id, front_image_url, left_side_image_url, analysis_text,
            face_rating, hair_rating, teeth_rating, body_rating, overall_rating
          ),
          before_analysis:analyses!posts_before_analysis_id_fkey (
            id, front_image_url, analysis_text, overall_rating
          ),
          after_analysis:analyses!posts_after_analysis_id_fkey (
            id, front_image_url, analysis_text, overall_rating
          ),
          comments (
            id, content, created_at,
            profiles (id, username, avatar_url)
          ),
          reactions (id, type, user_id)
        `)
        .order('created_at', { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (data) {
            localStorage.setItem('prefetched_posts', JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          }
        }),

      // User's analyses
      supabase
        .from('analyses')
        .select(`
          *,
          posts!posts_analysis_id_fkey (
            id, content, created_at,
            profiles (id, username, avatar_url)
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (data) {
            localStorage.setItem('prefetched_analyses', JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          }
        }),

      // Prefetch profiles for Community
      supabase
        .from('profiles')
        .select('*')
        .limit(50)
        .then(({ data }) => {
          if (data) {
            localStorage.setItem('prefetched_profiles', JSON.stringify({
              data,
              timestamp: Date.now()
            }));
          }
        })
    ]).catch(error => {
      console.error('Error prefetching data:', error);
    });
  }, [user]);

  // Initial prefetch
  useEffect(() => {
    prefetchData();
  }, [prefetchData]);

  // Set up real-time listeners for updates
  useEffect(() => {
    if (!user) return;

    const postsSubscription = supabase
      .channel('posts_channel')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'posts' 
      }, async () => {
        // Refresh posts data when changes occur
        prefetchData();
      })
      .subscribe();

    const connectionsSubscription = supabase
      .channel('connections_channel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'connections'
      }, async () => {
        // Refresh connections data when changes occur
        prefetchData();
      })
      .subscribe();

    // Refresh data periodically (every 30 seconds)
    const interval = setInterval(prefetchData, 30 * 1000);

    return () => {
      postsSubscription.unsubscribe();
      connectionsSubscription.unsubscribe();
      clearInterval(interval);
    };
  }, [user, prefetchData]);
}; 