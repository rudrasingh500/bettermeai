import { useEffect, useState, useCallback } from 'react';
import { usePrefetchedData } from '../../hooks/usePrefetchedData';
import { Connection, Profile, Post } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { useNavigate, useLocation } from 'react-router-dom';
import { PageTransition } from '../PageTransition';
import { Avatar } from '../Avatar';
import { User, UserPlus, UserCheck, UserX, Search } from 'lucide-react';
import { PostCard } from '../PostCard';

export const Community = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('posts');
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [postSearchResults, setPostSearchResults] = useState<Post[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);

  // Define fetch functions
  const fetchConnections = useCallback(async () => {
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
  }, [user]);

  const fetchPosts = useCallback(async () => {
    const { data } = await supabase
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
        reactions (id, type, user_id)
      `)
      .order('created_at', { ascending: false });
    return data || [];
  }, []);

  // Use enhanced prefetched data hook
  const { data: connections, isLoading: isLoadingConnections } = usePrefetchedData<Connection>(
    'connections',
    fetchConnections,
    30 * 1000 // 30 seconds cache
  );

  const { data: posts, isLoading: isLoadingPosts } = usePrefetchedData<Post>(
    'posts',
    fetchPosts,
    30 * 1000
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

      // Search posts by content or by users found in the search
      const userIds = profiles?.map(p => p.id) || [];
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
          reactions (id, type, user_id)
        `)
        .or(`content.ilike.%${query}%,user_id.in.(${userIds.join(',')})`)
        .order('created_at', { ascending: false })
        .limit(10);

      if (postError) throw postError;
      setPostSearchResults(posts || []);
    } catch (error) {
      console.error('Error searching:', error);
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
      setActiveTab(state.activeTab);
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
      
      // Clear cache and refresh data
      localStorage.removeItem('prefetched_connections');
      await fetchConnections();
      window.location.reload();
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
      
      // Clear cache and refresh data
      localStorage.removeItem('prefetched_connections');
      await fetchConnections();
      window.location.reload();
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
      
      // First verify the connection exists and belongs to the user
      const { data: connection, error: fetchError } = await supabase
        .from('connections')
        .select('*')
        .eq('id', connectionId)
        .single();

      if (fetchError) {
        console.error('Error fetching connection:', fetchError);
        throw fetchError;
      }

      if (!connection) {
        console.error('Connection not found');
        throw new Error('Connection not found');
      }

      // Verify user owns this connection
      if (connection.user1_id !== user.id && connection.user2_id !== user.id) {
        console.error('User does not own this connection');
        throw new Error('Unauthorized');
      }

      console.log('Deleting connection:', connection);

      // Delete the connection
      const { error: deleteError } = await supabase
        .from('connections')
        .delete()
        .eq('id', connectionId);

      if (deleteError) {
        console.error('Error deleting connection:', deleteError);
        throw deleteError;
      }

      console.log('Successfully deleted connection');

      // Clear cache and refresh data
      localStorage.removeItem('prefetched_connections');
      await fetchConnections();
      window.location.reload();
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

  const handleCreatePost = () => {
    navigate('/analysis', { state: { createPost: true } });
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

    const pendingConnections = connections.filter(c => 
      c.status === 'pending' && c.user2_id === user?.id
    );
    const acceptedConnections = connections.filter(c => c.status === 'accepted');

    return (
      <div className="space-y-6">
        {pendingConnections.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-4">Pending Connections</h3>
            <div className="space-y-4">
              {pendingConnections.map(connection => {
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
                    {connection.user1_id === user?.id && (
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
                    )}
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
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Requests
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
                      <PostCard key={post.id} post={post} />
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
                      onClick={handleCreatePost}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Create Post
                    </button>
                  </div>
                  
                  {isLoadingPosts ? (
                    <div className="text-center py-4">Loading posts...</div>
                  ) : posts && posts.length > 0 ? (
                    posts.map(post => (
                      <PostCard key={post.id} post={post} />
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">No posts yet</div>
                  )}
                </div>
              ) : activeTab === 'connections' ? (
                renderConnectionsList()
              ) : activeTab === 'requests' ? (
                <div className="space-y-6">
                  {isLoadingConnections ? (
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
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold mb-4">Connection Requests</h3>
                      <div className="space-y-4">
                        {connections
                          .filter(c => c.status === 'pending' && c.user2_id === user?.id)
                          .map(connection => {
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
                                    aria-label="Accept connection request"
                                  >
                                    <UserCheck className="w-5 h-5" />
                                  </button>
                                  <button
                                    onClick={() => handleRejectConnection(connection.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-full"
                                    aria-label="Reject connection request"
                                  >
                                    <UserX className="w-5 h-5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        {connections.filter(c => c.status === 'pending' && c.user2_id === user?.id).length === 0 && (
                          <div className="text-center py-8 text-gray-500">
                            No pending requests
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
}; 