import { useEffect, useState, useCallback } from 'react';
import { usePrefetchedData } from '../../hooks/usePrefetchedData';
import { Connection, Profile, Post, Analysis } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageTransition } from '../layout/PageTransition';
import { Avatar } from '../shared/Avatar';
import { User, UserPlus, UserCheck, UserX, Search } from 'lucide-react';
import { PostCard } from '../PostCard/PostCard';
import { usePosts as useRankedPosts } from '../../hooks/usePosts';
import { usePosts as useCommunityPosts } from './hooks/usePosts';
import { CreatePost } from './CreatePost';

export const Community = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState<'posts' | 'connections'>('posts');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [postSearchResults, setPostSearchResults] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showChatPopup, setShowChatPopup] = useState<string | null>(null);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);

  const {
    posts,
    isLoading: isLoadingPosts,
    error: postsError,
    refetch: refetchPosts
  } = useRankedPosts(30 * 1000);

  const {
    addReaction,
    addComment
  } = useCommunityPosts(user?.id || '');

  const {
    data: connections,
    isLoading: isLoadingConnections,
    updateData: updateConnections
  } = usePrefetchedData<Connection>(
    'connections',
    useCallback(async () => {
      if (!user?.id) {
        console.log('No user ID available');
        return [];
      }
      
      console.log('Fetching connections for user:', user.id);
      const { data, error } = await supabase
        .from('connections')
        .select(`
          *,
          user1:profiles!connections_user1_id_fkey (id, username, avatar_url),
          user2:profiles!connections_user2_id_fkey (id, username, avatar_url)
        `)
        .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`);
      
      if (error) {
        console.error('Error fetching connections:', error);
        localStorage.removeItem('prefetched_connections');
        return [];
      }
      
      return data || [];
    }, [user]),
    30 * 1000 // 30 seconds cache
  );

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setPostSearchResults([]);
      return;
    }

    setIsSearching(true);
    try {
      // Search users
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('username', `%${query}%`)
        .limit(10);

      if (profileError) throw profileError;
      setSearchResults(profiles || []);

      // Search posts with complete data including analyses
      const { data: posts, error: postError } = await supabase
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
        .or(`content.ilike.%${query}%,user_id.in.(${profiles?.map(p => p.id).join(',') || ''})`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postError) throw postError;
      setPostSearchResults(posts || []);
    } catch (error) {
      console.error('Error searching:', error);
      setError('Failed to search');
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const debounceTimeout = setTimeout(() => {
      handleSearch(searchQuery);
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [searchQuery, handleSearch]);

  // Set active tab from navigation state
  useEffect(() => {
    const state = location.state as { activeTab?: string };
    if (state?.activeTab) {
      setActiveTab(state.activeTab as 'posts' | 'connections');
    }
  }, [location]);

  const handleConnect = async (profileId: string) => {
    try {
      const { error: err } = await supabase
        .from('connections')
        .insert([{
          user1_id: user?.id,
          user2_id: profileId,
          status: 'pending'
        }]);

      if (err) throw err;
    } catch (err) {
      console.error('Error sending connection request:', err);
      setError('Failed to send connection request');
    }
  };

  const handleAcceptConnection = async (connectionId: string) => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('connections')
        .update({ status: 'accepted' })
        .eq('id', connectionId);

      if (err) throw err;
      
      // Update local state using the updateData function
      const updatedConnections = connections.map(conn => 
        conn.id === connectionId ? { ...conn, status: 'accepted' as const } : conn
      );
      updateConnections(updatedConnections);
    } catch (err) {
      console.error('Error accepting connection:', err);
      setError('Failed to accept connection');
    }
  };

  const handleRejectConnection = async (connectionId: string) => {
    try {
      setError(null);
      const { error: err } = await supabase
        .from('connections')
        .update({ status: 'rejected' })
        .eq('id', connectionId);

      if (err) throw err;
      
      // Update local state using the updateData function
      const updatedConnections = connections.map(conn => 
        conn.id === connectionId ? { ...conn, status: 'rejected' as const } : conn
      );
      updateConnections(updatedConnections);
    } catch (err) {
      console.error('Error rejecting connection:', err);
      setError('Failed to reject connection');
    }
  };

  const handleRemoveConnection = async (connectionId: string) => {
    if (!user?.id) {
      console.error('No user ID available');
      return;
    }

    try {
      setError(null);
      console.log('Attempting to remove connection:', connectionId);
      
      const { error: removeError } = await supabase
        .rpc('remove_connection', {
          connection_id: connectionId,
          user_id: user.id
        });

      if (removeError) {
        console.error('Error removing connection:', removeError);
        throw removeError;
      }

      console.log('Successfully removed connection');

      // Update local state using the updateData function
      const updatedConnections = connections.filter(conn => conn.id !== connectionId);
      updateConnections(updatedConnections);
    } catch (err) {
      console.error('Error in handleRemoveConnection:', err);
      setError(typeof err === 'string' ? err : 'Failed to remove connection');
    } finally {
      setConfirmRemoveId(null);
    }
  };

  const handleViewProfile = (username: string) => {
    navigate(`/profile/${username}`);
  };

  const handleCreatePost = async (data: {
    type: 'analysis' | 'before_after';
    analysisId?: string;
    beforeAnalysisId?: string;
    afterAnalysisId?: string;
    content: string;
  }) => {
    try {
      await createPost(data);
      setShowCreatePost(false);
      await refetchPosts();
    } catch (error) {
      console.error('Error creating post:', error);
      setError('Failed to create post');
    }
  };

  const handleReaction = async (postId: string, type: 'like' | 'helpful' | 'insightful') => {
    try {
      await addReaction(postId, type);
      await refetchPosts();
    } catch (err) {
      console.error('Error handling reaction:', err);
    }
  };

  const renderConnectionsList = () => {
    console.log('Rendering connections list. Connections:', connections);
    if (isLoadingConnections) {
      return (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const pendingIncomingConnections = connections.filter(c => 
      c.status === 'pending' && c.user2_id === user?.id
    );
    const pendingOutgoingConnections = connections.filter(c => 
      c.status === 'pending' && c.user1_id === user?.id
    );
    const acceptedConnections = connections.filter(c => c.status === 'accepted');

    return (
      <div className="space-y-6">
        {pendingIncomingConnections.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Pending Requests</h3>
            <div className="space-y-4">
              {pendingIncomingConnections.map(connection => {
                const otherUser = connection.user1;
                return (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                      <Avatar url={otherUser.avatar_url} size={48} username={otherUser.username} />
                      <div>
                        <div 
                          className="font-medium cursor-pointer hover:text-blue-600"
                          onClick={() => handleViewProfile(otherUser.username)}
                        >
                          {otherUser.username}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAcceptConnection(connection.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded-full"
                      >
                        <UserCheck className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleRejectConnection(connection.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      >
                        <UserX className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {pendingOutgoingConnections.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Sent Requests</h3>
            <div className="space-y-4">
              {pendingOutgoingConnections.map(connection => {
                const otherUser = connection.user2;
                return (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                      <Avatar url={otherUser.avatar_url} size={48} username={otherUser.username} />
                      <div>
                        <div 
                          className="font-medium cursor-pointer hover:text-blue-600"
                          onClick={() => handleViewProfile(otherUser.username)}
                        >
                          {otherUser.username}
                        </div>
                      </div>
                    </div>
                    <span className="text-sm text-gray-500">Pending</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-lg font-semibold mb-4">Your Connections</h3>
          {acceptedConnections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No connections yet
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedConnections.map(connection => {
                const otherUser = connection.user1_id === user?.id
                  ? connection.user2
                  : connection.user1;

                return (
                  <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
                    <div className="flex items-center gap-4">
                      <Avatar url={otherUser.avatar_url} size={48} username={otherUser.username} />
                      <div>
                        <div 
                          className="font-medium cursor-pointer hover:text-blue-600"
                          onClick={() => handleViewProfile(otherUser.username)}
                        >
                          {otherUser.username}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => setConfirmRemoveId(connection.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                      title="Remove Connection"
                    >
                      <UserX className="w-5 h-5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Confirmation Dialog */}
        {confirmRemoveId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Remove Connection</h3>
              <p className="text-gray-600 mb-6">Are you sure you want to remove this connection?</p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setConfirmRemoveId(null)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRemoveConnection(confirmRemoveId)}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderDiscoverList = () => {
    if (isLoadingConnections) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3 mt-2"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    const connectedUserIds = new Set(
      connections
        .filter(c => c.status !== 'rejected')
        .flatMap(c => [c.user1_id, c.user2_id])
    );

    const potentialConnections = connections.filter(c => 
      c.status === 'pending' && !connectedUserIds.has(c.user1_id) && !connectedUserIds.has(c.user2_id)
    );

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {potentialConnections.map(connection => {
          const otherUser = connection.user1_id === user?.id
            ? connection.user2
            : connection.user1;

          return (
            <div key={connection.id} className="flex items-center justify-between p-4 bg-white rounded-lg shadow-sm">
              <div className="flex items-center gap-4">
                <Avatar url={otherUser.avatar_url} size={48} username={otherUser.username} />
                <div>
                  <div 
                    className="font-medium cursor-pointer hover:text-blue-600"
                    onClick={() => handleViewProfile(otherUser.username)}
                  >
                    {otherUser.username}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleConnect(otherUser.id)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full"
              >
                <UserPlus className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>
    );
  };

  // Fetch analyses when component mounts
  useEffect(() => {
    const fetchAnalyses = async () => {
      if (!user?.id) return;
      
      const { data, error } = await supabase
        .from('analyses')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching analyses:', error);
        return;
      }
      
      setAnalyses(data || []);
    };

    fetchAnalyses();
  }, [user?.id]);

  const createPost = async (data: {
    type: 'analysis' | 'before_after';
    analysisId?: string;
    beforeAnalysisId?: string;
    afterAnalysisId?: string;
    content: string;
  }) => {
    if (!user?.id) return;

    try {
      const { error: postError } = await supabase
        .from('posts')
        .insert([{
          user_id: user.id,
          type: data.type,
          analysis_id: data.analysisId,
          before_analysis_id: data.beforeAnalysisId,
          after_analysis_id: data.afterAnalysisId,
          content: data.content
        }]);

      if (postError) throw postError;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  };

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto p-4">
        <div className="flex flex-col space-y-6">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search users by username..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('posts')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posts'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Posts
              </button>
              <button
                onClick={() => setActiveTab('connections')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'connections'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Connections
              </button>
            </nav>
          </div>

          {/* Search Results */}
          {searchQuery && (
            <div className="space-y-8">
              {/* User Results */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">People</h3>
                {isSearching ? (
                  <div className="text-center py-4">Searching...</div>
                ) : searchResults.length > 0 ? (
                  <div className="space-y-4">
                    {searchResults.map((profile) => (
                      <div
                        key={profile.id}
                        className="flex items-center justify-between p-4 bg-white rounded-lg shadow"
                      >
                        <div className="flex items-center space-x-4">
                          <Avatar url={profile.avatar_url} size={40} username={profile.username} />
                          <div
                            className="font-medium cursor-pointer hover:text-blue-600"
                            onClick={() => navigate(`/profile/${profile.username}`)}
                          >
                            {profile.username}
                          </div>
                        </div>
                        {profile.id !== user?.id && (
                          <button
                            onClick={() => handleConnect(profile.id)}
                            className="px-4 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            Connect
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">No users found</div>
                )}
              </div>

              {/* Post Results */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4">Posts</h3>
                {isSearching ? (
                  <div className="text-center py-4">Searching...</div>
                ) : postSearchResults.length > 0 ? (
                  <div className="space-y-4">
                    {postSearchResults.map(post => (
                      <PostCard 
                        key={post.id} 
                        post={post}
                        onUpdate={refetchPosts}
                        onReact={handleReaction}
                        onComment={addComment}
                        showActions={true}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4 text-gray-500">No posts found</div>
                )}
              </div>
            </div>
          )}

          {/* Main Content */}
          {!searchQuery && (
            <>
              {activeTab === 'posts' ? (
                <div className="space-y-6">
                  {/* Create Post Button */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setShowCreatePost(true)}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Create Post
                    </button>
                  </div>
                  
                  {isLoadingPosts ? (
                    <div className="text-center py-4">Loading posts...</div>
                  ) : postsError ? (
                    <div className="text-center py-4 text-red-600">{postsError}</div>
                  ) : posts && posts.length > 0 ? (
                    <div className="space-y-6">
                      {posts.map(post => (
                        <PostCard 
                          key={post.id} 
                          post={post} 
                          onUpdate={refetchPosts}
                          onReact={handleReaction}
                          onComment={addComment}
                          showActions={true}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-gray-500">No posts yet</div>
                  )}
                </div>
              ) : activeTab === 'connections' ? (
                renderConnectionsList()
              ) : null}
            </>
          )}

          {/* Create Post Modal */}
          {showCreatePost && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
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
      </div>
    </PageTransition>
  );
}; 