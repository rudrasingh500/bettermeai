import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { CreatePost } from './CreatePost';
import { Feed } from './Feed';
import { useConnections } from './hooks/useConnections';
import { usePosts } from './hooks/usePosts';
import type { Analysis, Profile } from '../../lib/types';
import { supabase } from '../../lib/supabase';

const Community = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'connections' | 'community'>('community');
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showChatPopup, setShowChatPopup] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const {
    potentialConnections,
    myConnections,
    error: connectionsError,
    isLoading: connectionsLoading,
    fetchConnections,
    fetchPotentialConnections,
    sendConnectionRequest,
    updateConnectionStatus
  } = useConnections(user?.id || '');

  const {
    posts,
    error: postsError,
    isLoading: postsLoading,
    fetchPosts,
    createPost,
    addComment,
    addReaction
  } = usePosts(user?.id || '');

  // Initial data load and auth state handling
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login');
    } else if (user && !authLoading) {
      const loadData = async () => {
        try {
          if (isFetchingRef.current) return;
          isFetchingRef.current = true;

          // Fetch analyses for creating posts
          const { data: analysesData, error: analysesError } = await supabase
            .from('analyses')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (analysesError) throw analysesError;
          setAnalyses(analysesData || []);

          // Fetch other data
          await Promise.all([
            fetchConnections(),
            fetchPosts(),
            user.rating ? fetchPotentialConnections(user.rating) : Promise.resolve()
          ]);
        } catch (err) {
          console.error('Error loading community data:', err);
        } finally {
          isFetchingRef.current = false;
        }
      };

      loadData();
    }
  }, [user, authLoading, navigate, fetchConnections, fetchPosts, fetchPotentialConnections]);

  // Handle visibility changes
  useEffect(() => {
    if (!user) return;

    let timeoutId: NodeJS.Timeout;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // Clear any existing timeout
        if (timeoutId) clearTimeout(timeoutId);
        
        // Wait a short moment for the session refresh to complete
        timeoutId = setTimeout(() => {
          console.log('Community: Tab visible, fetching fresh data...');
          isFetchingRef.current = false;
          fetchPosts();
          fetchConnections();
          if (user.rating) {
            fetchPotentialConnections(user.rating);
          }
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, fetchPosts, fetchConnections, fetchPotentialConnections]);

  const handleCreatePost = async (data: {
    type: 'analysis' | 'before_after';
    analysisId?: string;
    beforeAnalysisId?: string;
    afterAnalysisId?: string;
    content: string;
  }) => {
    await createPost(data);
    setShowCreatePost(false);
  };

  const isLoading = authLoading || connectionsLoading || postsLoading;
  const error = connectionsError || postsError;

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-6">
        {/* Main Content */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="flex gap-4 border-b">
              <button
                onClick={() => setActiveTab('community')}
                className={`pb-2 px-4 ${
                  activeTab === 'community'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Community
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
            <button
              onClick={() => setShowCreatePost(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Share Progress
            </button>
          </div>

          {activeTab === 'community' ? (
            <Feed
              posts={posts}
              currentUser={user}
              onComment={addComment}
              onReact={addReaction}
            />
          ) : (
            <div className="space-y-6">
              {/* My Connections */}
              <div className="bg-white rounded-lg shadow-sm p-4">
                <h2 className="text-lg font-semibold mb-4">My Connections</h2>
                <div className="space-y-4">
                  {myConnections.length === 0 ? (
                    <p className="text-gray-500">No connections yet</p>
                  ) : (
                    myConnections.map(({ profile, status, outgoing }) => (
                      <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{profile.username}</p>
                          <p className="text-sm text-gray-500">Rating: {profile.rating?.toFixed(1) || 'N/A'}</p>
                        </div>
                        {status === 'pending' && !outgoing && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => updateConnectionStatus(profile.id, 'accepted')}
                              className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateConnectionStatus(profile.id, 'rejected')}
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {status === 'pending' && outgoing && (
                          <span className="text-sm text-gray-500">Pending</span>
                        )}
                        {status === 'accepted' && (
                          <button
                            onClick={() => setShowChatPopup(profile.username)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                          >
                            Message
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Suggested Connections */}
              {user.rating && potentialConnections.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm p-4">
                  <h2 className="text-lg font-semibold mb-4">Suggested Connections</h2>
                  <div className="space-y-4">
                    {potentialConnections.map(profile => (
                      <div key={profile.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{profile.username}</p>
                          <p className="text-sm text-gray-500">Rating: {profile.rating?.toFixed(1) || 'N/A'}</p>
                        </div>
                        <button
                          onClick={() => sendConnectionRequest(profile.id, user.rating!)}
                          className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                        >
                          Connect
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar - Quick Access to Connections */}
        {activeTab === 'community' && (
          <div className="w-full md:w-80 space-y-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Connections</h2>
                <button
                  onClick={() => setActiveTab('connections')}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All
                </button>
              </div>
              <div className="space-y-4">
                {myConnections.slice(0, 3).map(({ profile, status }) => (
                  <div key={profile.id} className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{profile.username}</p>
                      <p className="text-sm text-gray-500">Rating: {profile.rating?.toFixed(1) || 'N/A'}</p>
                    </div>
                    {status === 'accepted' && (
                      <button
                        onClick={() => setShowChatPopup(profile.username)}
                        className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
                      >
                        Message
                      </button>
                    )}
                  </div>
                ))}
                {myConnections.length > 3 && (
                  <p className="text-sm text-gray-500 text-center">
                    And {myConnections.length - 3} more...
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Create Post</h3>
              <button
                onClick={() => setShowCreatePost(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <CreatePost
              analyses={analyses}
              onSubmit={handleCreatePost}
            />
          </div>
        </div>
      )}

      {/* Chat Popup */}
      {showChatPopup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Chat with {showChatPopup}</h3>
              <button
                onClick={() => setShowChatPopup(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>
            <p className="text-gray-600">Chat functionality coming soon!</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default Community;