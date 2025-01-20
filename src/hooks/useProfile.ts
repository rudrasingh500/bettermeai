import { useState, useCallback, useRef, useEffect } from 'react';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import type { Analysis, Post, Profile } from '../lib/types';
import { useContentModeration } from '../lib/contentModeration';
import { toast } from 'react-hot-toast';

interface UseProfileOptions {
  profileId?: string;
  isOwnProfile?: boolean;
}

export const useProfile = ({ profileId, isOwnProfile = false }: UseProfileOptions = {}) => {
  const { user } = useAuthStore();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [latestRating, setLatestRating] = useState<number | null>(null);
  const isFetchingRef = useRef(false);
  const { checkContent } = useContentModeration();

  const targetId = isOwnProfile ? user?.id : profileId;

  const fetchData = useCallback(async () => {
    if (!targetId || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      setIsLoading(true);

      const [analysesResult, postsResult, profileResult] = await Promise.all([
        supabase
          .from('analyses')
          .select('*')
          .eq('user_id', targetId)
          .order('created_at', { ascending: false }),
        supabase
          .from('posts')
          .select(`
            *,
            profiles (id, username, avatar_url),
            analyses!posts_analysis_id_fkey (
              id,
              front_image_url,
              left_side_image_url,
              analysis_text
            ),
            before_analysis:analyses!posts_before_analysis_id_fkey (
              id,
              front_image_url,
              analysis_text,
              overall_rating
            ),
            after_analysis:analyses!posts_after_analysis_id_fkey (
              id,
              front_image_url,
              analysis_text,
              overall_rating
            ),
            comments (
              id,
              content,
              created_at,
              profiles (
                id,
                username,
                avatar_url
              )
            ),
            reactions (
              id,
              type,
              user_id
            )
          `)
          .eq('user_id', targetId)
          .order('created_at', { ascending: false }),
        supabase
          .from('profiles')
          .select('bio')
          .eq('id', targetId)
          .single()
      ]);

      if (analysesResult.error) throw analysesResult.error;
      if (postsResult.error) throw postsResult.error;
      if (profileResult.error) throw profileResult.error;

      setAnalyses(analysesResult.data || []);
      if (analysesResult.data && analysesResult.data.length > 0) {
        setLatestRating(analysesResult.data[0].overall_rating);
      }

      const postsWithCounts = (postsResult.data || []).map(post => ({
        ...post,
        _count: {
          comments: post.comments?.length || 0,
          reactions: post.reactions?.length || 0
        }
      }));
      setPosts(postsWithCounts);

      // Set the bio from the profile data
      setBio(profileResult.data?.bio || '');

    } catch (err) {
      console.error('Error fetching profile data:', err);
      setError('Failed to load data');
    } finally {
      isFetchingRef.current = false;
      setIsLoading(false);
    }
  }, [targetId]);

  // Call fetchData when the component mounts
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateProfile = async (data: Partial<Profile>) => {
    if (!targetId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Check bio content before updating if it exists
      if (data.bio) {
        const moderationResult = await checkContent(data.bio);
        if (!moderationResult.isAcceptable) {
          // Show error toast with the specific reason from content moderation
          toast.error(moderationResult.reason || 'This content is not allowed');
          setError(moderationResult.reason || 'This content is not allowed');
          setIsLoading(false);
          return;
        }
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', targetId);

      if (updateError) throw updateError;
      
      if (isOwnProfile) {
        // Refresh auth store to update user data
        const { data: updatedProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', targetId)
          .single();

        if (updatedProfile) {
          useAuthStore.setState({ user: updatedProfile });
          // Update local bio state
          setBio(updatedProfile.bio || '');
        }
      }

      setIsEditing(false);
      await fetchData();
      toast.success('Profile updated successfully');
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update profile';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnect = async () => {
    if (!user || !profileId) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('connections')
        .insert([{
          user1_id: user.id,
          user2_id: profileId,
          status: 'pending'
        }]);

      if (error) throw error;
      setConnectionStatus('pending');
    } catch (err) {
      console.error('Error connecting:', err);
      setError('Failed to send connection request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveConnection = async () => {
    if (!user || !profileId) return;

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${user.id})`)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Connection not found');

      const { error: removeError } = await supabase
        .rpc('remove_connection', {
          connection_id: data.id,
          user_id: user.id
        });

      if (removeError) throw removeError;
      setConnectionStatus('none');
    } catch (err) {
      console.error('Error removing connection:', err);
      setError('Failed to remove connection');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch connection status
  useEffect(() => {
    if (!user || !profileId || isOwnProfile) return;

    const fetchConnectionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('connections')
          .select('status')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${profileId}),and(user1_id.eq.${profileId},user2_id.eq.${user.id})`)
          .single();

        if (error) throw error;
        setConnectionStatus(data?.status || 'none');
      } catch (err) {
        console.error('Error fetching connection status:', err);
      }
    };

    fetchConnectionStatus();
  }, [user, profileId, isOwnProfile]);

  return {
    analyses,
    posts,
    isEditing,
    setIsEditing,
    bio,
    setBio,
    error,
    isLoading,
    connectionStatus,
    latestRating,
    handleUpdateProfile,
    handleConnect,
    handleRemoveConnection,
    fetchData
  };
}; 