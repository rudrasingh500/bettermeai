import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserPlus, UserCheck, UserX, MessageSquare, Loader2, Plus, X } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { CreatePost } from './CreatePost';
import { Feed } from './Feed';
import type { Profile, Connection, Post, Analysis } from '../../lib/types';

interface ConnectionWithProfiles {
  user1_id: string;
  user2_id: string;
  status: string;
  profiles_user1: Profile;
  profiles_user2: Profile;
}

const Community = () => {
  const { user, isLoading } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'connections' | 'community'>('community');
  const [potentialConnections, setPotentialConnections] = useState<Profile[]>([]);
  const [myConnections, setMyConnections] = useState<{
    profile: Profile;
    status: string;
    outgoing: boolean;
  }[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading2, setIsLoading2] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showChatPopup, setShowChatPopup] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      navigate('/login');
    }
  }, [user, isLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    setIsLoading2(true);
    try {
      await Promise.all([
        fetchPotentialConnections(),
        fetchMyConnections(),
        fetchPosts(),
        fetchAnalyses()
      ]);
    } finally {
      setIsLoading2(false);
    }
  };

  const fetchPotentialConnections = async () => {
    if (!user?.rating) return;

    try {
      // First get existing connection user IDs
      const { data: existingConnections, error: connectionsError } = await supabase
        .from('connections')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (connectionsError) throw connectionsError;

      // Create array of user IDs to exclude
      const excludeIds = [
        user.id,
        ...existingConnections?.map(c => c.user1_id === user.id ? c.user2_id : c.user1_id) || []
      ];

      // Handle case when there are no connections
      const query = excludeIds.length > 1
        ? supabase
            .from('profiles')
            .select('*')
            .not('id', 'in', `(${excludeIds.join(',')})`)
            .gte('rating', user.rating - 1)
            .lte('rating', user.rating + 1)
        : supabase
            .from('profiles')
            .select('*')
            .neq('id', user.id)
            .gte('rating', user.rating - 1)
            .lte('rating', user.rating + 1);

      const { data, error } = await query;

      if (error) throw error;

      setPotentialConnections(data || []);
    } catch (err) {
      console.error('Error fetching potential connections:', err);
      setError('Failed to load potential connections');
    }
  };

  const fetchMyConnections = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          profiles_user1:profiles!connections_user1_id_fkey (
            id, username, rating
          ),
          profiles_user2:profiles!connections_user2_id_fkey (
            id, username, rating
          )
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);

      if (error) throw error;

      // Transform the data to get the correct profile based on whether user is user1 or user2
      const connections = (data || []).map((connection: ConnectionWithProfiles) => {
        const isUser1 = connection.user1_id === user.id;
        return {
          profile: isUser1 ? connection.profiles_user2 : connection.profiles_user1,
          status: connection.status,
          outgoing: isUser1
        };
      });

      setMyConnections(connections);
    } catch (err) {
      console.error('Error fetching connections:', err);
      setError('Failed to load your connections');
    }
  };

  const fetchPosts = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          profiles (
            id,
            username
          ),
          analyses!posts_analysis_id_fkey (
            id,
            front_image_url,
            left_side_image_url,
            analysis_text
          ),
          before_analysis:analyses!posts_before_analysis_id_fkey (
            id,
            front_image_url,
            analysis_text
          ),
          after_analysis:analyses!posts_after_analysis_id_fkey (
            id,
            front_image_url,
            analysis_text
          ),
          comments (
            id,
            content,
            created_at,
            profiles (
              id,
              username
            )
          ),
          reactions (
            id,
            type,
            user_id
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Add computed counts
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
      setError('Failed to load posts');
    }
  };

  const fetchAnalyses = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAnalyses(data || []);
    } catch (err) {
      console.error('Error fetching analyses:', err);
      setError('Failed to load analyses');
    }
  };

  const handleCreatePost = async (data: {
    type: 'analysis' | 'before_after';
    analysisId?: string;
    beforeAnalysisId?: string;
    afterAnalysisId?: string;
    content: string;
  }) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          type: data.type,
          analysis_id: data.analysisId,
          before_analysis_id: data.beforeAnalysisId,
          after_analysis_id: data.afterAnalysisId,
          content: data.content
        }]);

      if (error) throw error;
      setShowCreatePost(false);
      fetchPosts(); // Refresh posts
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
    }
  };

  const handleComment = async (postId: string, content: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          content
        }]);

      if (error) throw error;
      fetchPosts(); // Refresh posts to show new comment
    } catch (err) {
      console.error('Error adding comment:', err);
      setError('Failed to add comment');
    }
  };

  const handleReact = async (postId: string, type: 'like' | 'helpful' | 'insightful') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('reactions')
        .upsert([{
          post_id: postId,
          user_id: user.id,
          type
        }], {
          onConflict: 'post_id,user_id'
        });

      if (error) throw error;
      fetchPosts(); // Refresh posts to show updated reactions
    } catch (err) {
      console.error('Error adding reaction:', err);
      setError('Failed to add reaction');
    }
  };

  const sendConnectionRequest = async (profileId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('connections')
        .insert([{
          user1_id: user.id,
          user2_id: profileId,
          status: 'pending'
        }]);

      if (error) throw error;

      // Refresh connections
      fetchPotentialConnections();
      fetchMyConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send connection request');
    }
  };

  const updateConnectionStatus = async (profileId: string, status: 'accepted' | 'rejected') => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('connections')
        .update({ status })
        .eq('user1_id', profileId)
        .eq('user2_id', user.id);

      if (error) throw error;

      // Refresh connections
      fetchMyConnections();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update connection status');
    }
  };

  const renderChatPopup = (username: string) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Chat with {username}</h3>
        <p className="text-gray-600 mb-6">
          Chat feature is coming soon! We're working hard to bring you a great messaging experience.
        </p>
        <button
          onClick={() => setShowChatPopup(null)}
          className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700"
        >
          Got it
        </button>
      </div>
    </div>
  );

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
      {/* Tabs */}
      <div className="flex justify-between items-center">
        <div className="flex gap-4 border-b">
          <button
            onClick={() => setActiveTab('community')}
            className={`pb-2 px-4 ${
              activeTab === 'community'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Community Feed
          </button>
          <button
            onClick={() => setActiveTab('connections')}
            className={`pb-2 px-4 ${
              activeTab === 'connections'
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Connections
          </button>
        </div>
        {activeTab === 'community' && (
          <button
            onClick={() => setShowCreatePost(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden sm:inline">Create Post</span>
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {isLoading2 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        activeTab === 'community' ? (
          <Feed
            posts={posts}
            currentUser={user}
            onComment={handleComment}
            onReact={handleReact}
          />
        ) : (
          <>
            {/* Potential Connections */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h2 className="text-xl font-bold mb-4">Discover People</h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {potentialConnections.map((profile) => (
                  <div key={profile.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">{profile.username}</h3>
                        <p className="text-sm text-gray-600">Rating: {profile.rating?.toFixed(1) || 'N/A'}</p>
                      </div>
                      <button
                        onClick={() => sendConnectionRequest(profile.id)}
                        className="text-blue-600 hover:text-blue-800 transition-colors"
                        title="Send connection request"
                      >
                        <UserPlus className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {potentialConnections.length === 0 && (
                <p className="text-center text-gray-600 py-8">
                  No potential connections found at your rating level.
                </p>
              )}
            </div>

            {/* My Connections */}
            <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
              <h2 className="text-xl font-bold mb-4">My Connections</h2>
              
              <div className="space-y-4">
                {myConnections.map(({ profile, status, outgoing }) => (
                  <div key={profile.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold">{profile.username}</h3>
                        <p className="text-sm text-gray-600">Rating: {profile.rating?.toFixed(1) || 'N/A'}</p>
                        <p className="text-sm text-gray-500">
                          Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                          {status === 'pending' && (outgoing ? ' (Sent)' : ' (Received)')}
                        </p>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        {status === 'pending' && !outgoing && (
                          <>
                            <button
                              onClick={() => updateConnectionStatus(profile.id, 'accepted')}
                              className="text-green-600 hover:text-green-800 transition-colors"
                              title="Accept connection"
                            >
                              <UserCheck className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => updateConnectionStatus(profile.id, 'rejected')}
                              className="text-red-600 hover:text-red-800 transition-colors"
                              title="Reject connection"
                            >
                              <UserX className="w-5 h-5" />
                            </button>
                          </>
                        )}
                        {status === 'accepted' && (
                          <button
                            onClick={() => setShowChatPopup(profile.username)}
                            className="text-blue-600 hover:text-blue-800 transition-colors"
                            title="Send message"
                          >
                            <MessageSquare className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {myConnections.length === 0 && (
                  <p className="text-center text-gray-600 py-8">
                    You don't have any connections yet. Start by discovering people!
                  </p>
                )}
              </div>
            </div>
          </>
        )
      )}

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 md:p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Create Post</h2>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            <CreatePost
              analyses={analyses}
              onSubmit={handleCreatePost}
            />
          </div>
        </div>
      )}

      {/* Chat Coming Soon Popup */}
      {showChatPopup && renderChatPopup(showChatPopup)}
    </div>
  );
};

export default Community;