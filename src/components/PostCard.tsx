import React from 'react';
import { MessageSquare, Heart, Award, ThumbsUp, User } from 'lucide-react';
import { RatingDisplay } from './Analysis/RatingDisplay';
import type { Post } from '../lib/types';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: Post;
  onComment?: (postId: string, content: string) => Promise<void>;
  onReact?: (postId: string, type: 'like' | 'helpful' | 'insightful') => void;
  showActions?: boolean;
}

export const PostCard: React.FC<PostCardProps> = ({
  post,
  onComment,
  onReact,
  showActions = true
}) => {
  const navigate = useNavigate();

  const handleProfileClick = (username: string) => {
    navigate(`/profile/${username}`, { state: { from: location.pathname } });
  };

  const renderAnalysisPost = () => {
    if (!post.analyses) return null;
    
    let analysisRatings: Array<{ value: number; label: string }> = [];
    if (post.analyses.analysis_text) {
      try {
        const analysis = JSON.parse(post.analyses.analysis_text);
        if (analysis?.ratings) {
          analysisRatings = [
            { value: analysis.ratings.overall_rating, label: 'Overall Rating' },
            { value: analysis.ratings.face_rating, label: 'Face Rating' },
            { value: analysis.ratings.hair_rating, label: 'Hair Rating' }
          ].filter(rating => typeof rating.value === 'number' && !isNaN(rating.value));
        }
      } catch (err) {
        console.warn('Error parsing analysis data:', err);
      }
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            {post.analyses.front_image_url ? (
              <img
                src={post.analyses.front_image_url}
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
            {post.analyses.left_side_image_url ? (
              <img
                src={post.analyses.left_side_image_url}
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
        {analysisRatings.length > 0 && (
          <RatingDisplay
            ratings={analysisRatings}
            size="sm"
          />
        )}
      </div>
    );
  };

  const renderBeforeAfterPost = () => {
    // Get before images (prefer analysis images if available)
    const beforeFrontImage = post.before_analysis?.front_image_url || post.before_image_url;
    const beforeSideImage = post.before_analysis?.left_side_image_url;
    const beforeRating = post.before_analysis?.overall_rating;

    // Get after images (prefer analysis images if available)
    const afterFrontImage = post.after_analysis?.front_image_url || post.after_image_url;
    const afterSideImage = post.after_analysis?.left_side_image_url;
    const afterRating = post.after_analysis?.overall_rating;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Before</h4>
            <div className="space-y-2">
              {beforeFrontImage && (
                <img
                  src={beforeFrontImage}
                  alt="Before front view"
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              )}
              {beforeSideImage && (
                <img
                  src={beforeSideImage}
                  alt="Before side view"
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              )}
              {!beforeFrontImage && !beforeSideImage && (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">No before images</span>
                </div>
              )}
              {beforeRating !== null && beforeRating !== undefined && (
                <RatingDisplay
                  ratings={[{ value: beforeRating, label: 'Before Rating' }]}
                  size="sm"
                />
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">After</h4>
            <div className="space-y-2">
              {afterFrontImage && (
                <img
                  src={afterFrontImage}
                  alt="After front view"
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              )}
              {afterSideImage && (
                <img
                  src={afterSideImage}
                  alt="After side view"
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              )}
              {!afterFrontImage && !afterSideImage && (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">No after images</span>
                </div>
              )}
              {afterRating !== null && afterRating !== undefined && (
                <RatingDisplay
                  ratings={[{ value: afterRating, label: 'After Rating' }]}
                  size="sm"
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const postContent = post.type === 'analysis' ? renderAnalysisPost() : renderBeforeAfterPost();
  if (!postContent && !post.content) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          {post.profiles && (
            <>
              <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                {post.profiles.avatar_url ? (
                  <img 
                    src={post.profiles.avatar_url} 
                    alt={post.profiles.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-full h-full p-2 text-gray-400" />
                )}
              </div>
              <div>
                <div 
                  onClick={() => handleProfileClick(post.profiles?.username || '')}
                  className="font-medium cursor-pointer hover:text-blue-600"
                >
                  {post.profiles?.username}
                </div>
                <div className="text-sm text-gray-500">
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
              </div>
            </>
          )}
        </div>
        <div className="text-sm text-gray-500">
          {post.type === 'analysis' ? 'Analysis Share' : 'Progress Update'}
        </div>
      </div>

      {post.content && (
        <p className="text-gray-700 mb-4">{post.content}</p>
      )}

      {postContent}

      {showActions && (
        <div className="flex items-center gap-4 mt-4 pt-4 border-t">
          <button
            onClick={() => onReact?.(post.id, 'like')}
            className={`flex items-center gap-1 ${
              post.reactions?.some(r => r.type === 'like') ? 'text-pink-600' : 'text-gray-600'
            }`}
          >
            <Heart className="w-5 h-5" />
            <span>{post.reactions?.filter(r => r.type === 'like').length || 0}</span>
          </button>
          <button
            onClick={() => onReact?.(post.id, 'helpful')}
            className={`flex items-center gap-1 ${
              post.reactions?.some(r => r.type === 'helpful') ? 'text-blue-600' : 'text-gray-600'
            }`}
          >
            <ThumbsUp className="w-5 h-5" />
            <span>{post.reactions?.filter(r => r.type === 'helpful').length || 0}</span>
          </button>
          <button
            onClick={() => onReact?.(post.id, 'insightful')}
            className={`flex items-center gap-1 ${
              post.reactions?.some(r => r.type === 'insightful') ? 'text-yellow-600' : 'text-gray-600'
            }`}
          >
            <Award className="w-5 h-5" />
            <span>{post.reactions?.filter(r => r.type === 'insightful').length || 0}</span>
          </button>
          <button
            onClick={() => onComment?.(post.id, '')}
            className="flex items-center gap-1 text-gray-600 ml-auto"
          >
            <MessageSquare className="w-5 h-5" />
            <span>{post._count?.comments || 0}</span>
          </button>
        </div>
      )}

      {post.comments?.map(comment => (
        <div key={comment.id} className="flex gap-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
            {comment.profiles?.avatar_url ? (
              <img 
                src={comment.profiles.avatar_url} 
                alt={comment.profiles.username}
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-full h-full p-1.5 text-gray-400" />
            )}
          </div>
          <div>
            <div 
              onClick={() => handleProfileClick(comment.profiles?.username || '')}
              className="font-medium cursor-pointer hover:text-blue-600"
            >
              {comment.profiles?.username}
            </div>
            <p className="text-gray-700 text-sm">{comment.content}</p>
            <p className="text-xs text-gray-500 mt-1">
              {new Date(comment.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}; 