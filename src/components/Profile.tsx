import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, History, Loader2, MessageSquare, Heart, Award, ThumbsUp, Camera } from 'lucide-react';
import { useAuthStore } from '../lib/store';
import { supabase } from '../lib/supabase';
import { RatingDisplay } from './Analysis/RatingDisplay';
import { PostCard } from './PostCard';
import type { Analysis, Post } from '../lib/types';

const Profile = () => {
  const { user, isLoading, initialized } = useAuthStore();
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [username, setUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [latestRating, setLatestRating] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<'analyses' | 'posts'>('analyses');
  const [isLoading2, setIsLoading2] = useState(false);
  const isFetchingRef = useRef(false);

  const fetchData = useCallback(async () => {
    if (!user || isFetchingRef.current) return;

    try {
      isFetchingRef.current = true;
      console.log('Profile: Starting data fetch for user:', user.id);

      const [analysesResult, postsResult] = await Promise.all([
        supabase
          .from('analyses')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('posts')
          .select(`
            *,
            analyses!posts_analysis_id_fkey (
              id,
              front_image_url,
              left_side_image_url,
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
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
      ]);

      if (analysesResult.error) throw analysesResult.error;
      if (postsResult.error) throw postsResult.error;

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
      console.log('Profile: All data updated successfully');
      
    } catch (err) {
      console.error('Profile: Error fetching data:', err);
      setError('Failed to load data');
    } finally {
      isFetchingRef.current = false;
      setIsLoading2(false);
    }
  }, [user]);

  // Initial data load and auth state handling
  useEffect(() => {
    if (initialized && !isLoading && !user) {
      navigate('/login');
    } else if (user && !isLoading) {
      setUsername(user.username);
      setIsLoading2(true);
      fetchData();
    }
  }, [user, isLoading, initialized, navigate, fetchData]);

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
          console.log('Profile: Tab visible, fetching fresh data...');
          isFetchingRef.current = false;
          fetchData();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [user, fetchData]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ username })
        .eq('id', user.id);

      if (error) throw error;
      setIsEditing(false);
      
      // Refresh auth store to update user data
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      useAuthStore.setState({ user: data });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const renderAnalysisCard = (analysis: Analysis) => {
    let analysisData;
    try {
      analysisData = JSON.parse(analysis.analysis_text || '{}');
    } catch (err) {
      console.warn('Error parsing analysis data:', err);
      return null;
    }

    const ratings = [
      { value: analysis.face_rating || analysisData.ratings?.face_rating, label: 'Face' },
      { value: analysis.hair_rating || analysisData.ratings?.hair_rating, label: 'Hair' },
      { value: analysis.teeth_rating || analysisData.ratings?.teeth_rating, label: 'Teeth' },
      { value: analysis.body_rating || analysisData.ratings?.body_rating, label: 'Body' },
      { value: analysis.overall_rating || analysisData.ratings?.overall_rating, label: 'Overall' }
    ].filter(rating => typeof rating.value === 'number' && !isNaN(rating.value));

    return (
      <div key={analysis.id} className="bg-white rounded-lg shadow-sm p-4 md:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
          <div>
            <div className="text-lg font-semibold">
              Analysis from {new Date(analysis.created_at).toLocaleDateString()}
            </div>
            <div className="text-sm text-gray-600">
              Overall Rating: {analysis.overall_rating?.toFixed(1) || analysisData.ratings?.overall_rating.toFixed(1) || 'N/A'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          {analysis.front_image_url && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Front View</h4>
              <img
                src={analysis.front_image_url}
                alt="Front view"
                className="w-full h-40 sm:h-48 object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          )}
          {analysis.left_side_image_url && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Left Side</h4>
              <img
                src={analysis.left_side_image_url}
                alt="Left side view"
                className="w-full h-40 sm:h-48 object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          )}
          {analysis.right_side_image_url && (
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2">Right Side</h4>
              <img
                src={analysis.right_side_image_url}
                alt="Right side view"
                className="w-full h-40 sm:h-48 object-cover rounded-lg"
                loading="lazy"
              />
            </div>
          )}
        </div>

        <div className="mt-6">
          <RatingDisplay
            ratings={ratings}
            size="sm"
          />
        </div>

        {analysisData.recommendations && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-900 mb-3">Key Recommendations</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {analysisData.recommendations.skincare?.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Skincare</h5>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysisData.recommendations.skincare.slice(0, 3).map((rec: string, i: number) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysisData.recommendations.hairstyle?.length > 0 && (
                <div>
                  <h5 className="font-medium text-gray-700 mb-2">Hairstyle</h5>
                  <ul className="list-disc list-inside text-gray-600 space-y-1">
                    {analysisData.recommendations.hairstyle.slice(0, 3).map((rec: string, i: number) => (
                      <li key={i}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!initialized || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 md:space-y-8">
      {/* Profile Header */}
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <User className="w-8 h-8 text-blue-600" />
            </div>
            {isEditing ? (
              <form onSubmit={handleUpdateProfile} className="flex items-center space-x-2">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="border rounded-md px-2 py-1"
                  required
                />
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(user.username);
                  }}
                  className="text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
              </form>
            ) : (
              <div>
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Edit Profile
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {latestRating ? latestRating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">Latest Rating</div>
            </div>
            <button
              onClick={() => navigate('/analysis')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Camera className="w-5 h-5" />
              <span>New Analysis</span>
            </button>
          </div>
        </div>
        {error && <div className="mt-2 text-red-600 text-sm">{error}</div>}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => setActiveTab('analyses')}
          className={`pb-2 px-4 ${
            activeTab === 'analyses'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Analyses
        </button>
        <button
          onClick={() => setActiveTab('posts')}
          className={`pb-2 px-4 ${
            activeTab === 'posts'
              ? 'border-b-2 border-blue-600 text-blue-600'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Posts
        </button>
      </div>

      {/* Content */}
      {isLoading2 ? (
        <div className="flex justify-center items-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'analyses' ? (
            <>
              {analyses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-600 mb-4">No analyses yet. Start by taking your first analysis!</p>
                  <button
                    onClick={() => navigate('/analysis')}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    <Camera className="w-5 h-5" />
                    <span>New Analysis</span>
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {analyses.map(renderAnalysisCard)}
                </div>
              )}
            </>
          ) : (
            <>
              {posts.length === 0 ? (
                <div className="text-center py-12 text-gray-600">
                  No posts yet. Share your journey with the community!
                </div>
              ) : (
                <div className="space-y-6">
                  {posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      showActions={false}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Profile;