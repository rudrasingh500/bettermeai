import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Avatar } from '../shared/Avatar';
import { PostCard } from '../PostCard/PostCard';
import { PostSkeleton } from '../shared/PostSkeleton';
import { PageTransition } from '../layout/PageTransition';
import { useProfile } from '../../hooks/useProfile';
import { usePostInteractions } from '../../hooks/usePostInteractions';
import type { Profile as ProfileType } from '../../lib/types';

interface ProfileViewProps {
  profile: ProfileType;
  isOwnProfile?: boolean;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ profile, isOwnProfile = false }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const {
    posts,
    isEditing,
    setIsEditing,
    bio,
    setBio,
    error,
    isLoading,
    connectionStatus,
    handleUpdateProfile,
    handleConnect,
    handleRemoveConnection,
    fetchData
  } = useProfile({ profileId: profile.id, isOwnProfile });

  const {
    handleReaction,
    handleComment
  } = usePostInteractions(fetchData);

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
                  className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={4}
                  placeholder="Tell us about yourself and your goals..."
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsEditing(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleUpdateProfile({ bio })}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-gray-700">{bio || 'No bio yet.'}</p>
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
          {isLoading ? (
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
                  onReact={handleReaction}
                  onComment={handleComment}
                  onUpdate={fetchData}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}; 