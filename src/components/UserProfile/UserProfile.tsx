import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { supabase } from '../../lib/supabase';
import { RatingDisplay } from '../Analysis/RatingDisplay';
import { PostCard } from '../PostCard/PostCard';
import { PostSkeleton } from '../shared/PostSkeleton';
import { PageTransition } from '../layout/PageTransition';
import { useProfile } from '../../hooks/useProfile';
import { usePostInteractions } from '../../hooks/usePostInteractions';

export const UserProfile = () => {
  const { user, isLoading: authLoading, initialized } = useAuthStore();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'analyses' | 'posts'>('analyses');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    analyses,
    posts,
    isEditing,
    setIsEditing,
    bio,
    setBio,
    error,
    isLoading,
    latestRating,
    handleUpdateProfile,
    fetchData
  } = useProfile({ isOwnProfile: true });

  const {
    handleReaction,
    handleComment
  } = usePostInteractions(fetchData);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !e.target.files?.[0]) return;
    
    try {
      setUploadingAvatar(true);
      const file = e.target.files[0];
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('File must be an image');
      }

      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      
      if (!fileExt || !validExtensions.includes(fileExt)) {
        throw new Error('Invalid file type. Please upload a JPG, PNG, or GIF');
      }

      const fileName = `${user.id}/avatar.${fileExt}`;
      
      // Upload image to Supabase Storage
      const { error: uploadError, data } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type
        });
      
      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName);

      // Update profile with new avatar URL
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id);

      if (updateError) throw updateError;

      // Update local user state
      useAuthStore.setState({ 
        user: { ...user, avatar_url: publicUrl }
      });

    } catch (err) {
      console.error('Error uploading avatar:', err);
      throw err;
    } finally {
      setUploadingAvatar(false);
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Redirect to login if not authenticated
  if (initialized && !authLoading && !user) {
    navigate('/login');
    return null;
  }

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto p-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden">
                {user?.avatar_url ? (
                  <img 
                    src={user.avatar_url} 
                    alt={user.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-4 text-gray-400" />
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute bottom-0 right-0 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-50"
              >
                <Camera className="w-4 h-4 text-gray-600" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-bold">{user?.username}</h2>
                  {latestRating && (
                    <p className="text-gray-600">Rating: {latestRating}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Bio & Goals</h3>
              {!isEditing && (
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
              <p className="text-gray-700">{bio || 'Add a bio to share your goals...'}</p>
            )}
          </div>

          {error && (
            <div className="mt-4 p-2 text-red-600 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="mt-8">
          <div className="flex space-x-4 mb-6">
            <button
              onClick={() => setActiveTab('analyses')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'analyses'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Analyses
            </button>
            <button
              onClick={() => setActiveTab('posts')}
              className={`px-4 py-2 text-sm font-medium rounded-lg ${
                activeTab === 'posts'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Posts
            </button>
          </div>

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
                  {analyses.map(analysis => (
                    <div key={analysis.id} className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2">
                        <div>
                          <div className="text-lg font-semibold">
                            Analysis from {new Date(analysis.created_at).toLocaleDateString()}
                          </div>
                          <div className="text-sm text-gray-600">
                            Overall Rating: {analysis.overall_rating?.toFixed(1) || 'N/A'}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                          {analysis.front_image_url ? (
                            <img
                              src={analysis.front_image_url}
                              alt="Front view"
                              className="w-full h-48 object-cover rounded-lg"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400">No front view</span>
                            </div>
                          )}
                        </div>
                        <div>
                          {analysis.left_side_image_url ? (
                            <img
                              src={analysis.left_side_image_url}
                              alt="Side view"
                              className="w-full h-48 object-cover rounded-lg"
                              loading="lazy"
                            />
                          ) : (
                            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                              <span className="text-gray-400">No side view</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-lg">
                        <RatingDisplay
                          ratings={[
                            { value: analysis.face_rating || 0, label: 'Face' },
                            { value: analysis.hair_rating || 0, label: 'Hair' },
                            { value: analysis.teeth_rating || 0, label: 'Teeth' },
                            { value: analysis.body_rating || 0, label: 'Body' },
                            { value: analysis.overall_rating || 0, label: 'Overall' }
                          ].filter(rating => rating.value > 0)}
                          size="sm"
                        />
                      </div>
                    </div>
                  ))}
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
                      showActions={true}
                      onReact={handleReaction}
                      onComment={handleComment}
                      onUpdate={fetchData}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </PageTransition>
  );
};