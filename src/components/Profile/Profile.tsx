import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { Profile as ProfileType } from '../../lib/types';
import { Avatar } from '../../components/Avatar';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { PostCard } from '../PostCard';
import { PostSkeleton } from '../PostSkeleton';
import { PageTransition } from '../PageTransition';

interface ProfileProps {
  profile: ProfileType;
  isOwnProfile?: boolean;
}

export const Profile: React.FC<ProfileProps> = ({ profile, isOwnProfile = false }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [bio, setBio] = useState(profile.bio || '');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [posts, setPosts] = useState<any[]>([]);
  const [isLoadingPosts, setIsLoadingPosts] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();

  // Fetch connection status and posts
  useEffect(() => {
    if (!user || isOwnProfile) return;

    const fetchConnectionStatus = async () => {
      try {
        const { data, error } = await supabase
          .from('connections')
          .select('status')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${user.id})`)
          .single();

        if (error) throw error;
        setConnectionStatus(data?.status || 'none');
      } catch (err) {
        console.error('Error fetching connection status:', err);
      }
    };

    fetchConnectionStatus();
  }, [user, profile.id, isOwnProfile]);

  // Fetch user's posts
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setIsLoadingPosts(true);
        const { data, error } = await supabase
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
          .eq('user_id', profile.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const postsWithCounts = (data || []).map(post => ({
          ...post,
          _count: {
            comments: post.comments?.length || 0,
            reactions: post.reactions?.length || 0
          }
        }));

        setPosts(postsWithCounts);
      } catch (err) {
        console.error('Error fetching posts:', err);
      } finally {
        setIsLoadingPosts(false);
      }
    };

    fetchPosts();
  }, [profile.id]);

  const handleConnect = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from('connections')
        .insert([{
          user1_id: user.id,
          user2_id: profile.id,
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
    if (!user) return;

    try {
      setIsLoading(true);
      const { data, error: fetchError } = await supabase
        .from('connections')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${user.id})`)
        .single();

      if (fetchError) throw fetchError;
      if (!data) throw new Error('Connection not found');

      const { error: deleteError } = await supabase
        .from('connections')
        .delete()
        .eq('id', data.id);

      if (deleteError) throw deleteError;
      setConnectionStatus('none');
    } catch (err) {
      console.error('Error removing connection:', err);
      setError('Failed to remove connection');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ bio })
        .eq('id', profile.id);

      if (updateError) throw updateError;
      
      // Update the profile in the UI
      profile.bio = bio;
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    const previousPage = location.state?.from || '/community';
    navigate(previousPage);
  };

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto p-4">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-6">
            <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </button>
            {!isOwnProfile && (
              <div>
                {connectionStatus === 'none' && (
                  <button
                    onClick={handleConnect}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Connect
                  </button>
                )}
                {connectionStatus === 'pending' && (
                  <span className="text-sm text-gray-500">Connection Request Pending</span>
                )}
                {connectionStatus === 'accepted' && (
                  <button
                    onClick={handleRemoveConnection}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 disabled:opacity-50"
                  >
                    Remove Connection
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-4">
            <Avatar
              url={profile.avatar_url}
              size={96}
              username={profile.username}
            />
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{profile.username}</h2>
                  {profile.rating && (
                    <p className="text-gray-600">Rating: {profile.rating}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Bio & Goals</h3>
              {isOwnProfile && !isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Edit
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Share your goals and a bit about yourself..."
                  className="w-full h-32 p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setBio(profile.bio || '');
                      setIsEditing(false);
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdateProfile}
                    disabled={isLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isLoading ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700 whitespace-pre-wrap">
                {profile.bio || (isOwnProfile ? 'Add a bio to share your goals...' : 'No bio yet.')}
              </p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-2 text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        {/* Posts Section */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold mb-4">Posts</h3>
          {isLoadingPosts ? (
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <PostSkeleton key={i} />
              ))}
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No posts yet
            </div>
          ) : (
            <div className="space-y-6">
              {posts.map(post => (
                <PostCard
                  key={post.id}
                  post={post}
                  showActions={true}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}; 