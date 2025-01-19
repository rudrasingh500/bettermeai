import React from 'react';
import { MessageSquare, Heart, Award, ThumbsUp } from 'lucide-react';
import { RatingDisplay } from './Analysis/RatingDisplay';
import type { Post } from '../lib/types';

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
  const renderAnalysisPost = () => {
    if (!post.analyses) return null;
    
    let analysis;
    try {
      analysis = JSON.parse(post.analyses.analysis_text || '{}');
      if (!analysis || !analysis.ratings) return null;
    } catch (err) {
      console.warn('Error parsing analysis data:', err);
      return null;
    }

    const validRatings = [
      { value: analysis.ratings.overall_rating, label: 'Overall Rating' },
      { value: analysis.ratings.face_rating, label: 'Face Rating' },
      { value: analysis.ratings.hair_rating, label: 'Hair Rating' }
    ].filter(rating => typeof rating.value === 'number' && !isNaN(rating.value));

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
        {validRatings.length > 0 && (
          <RatingDisplay
            ratings={validRatings}
            size="sm"
          />
        )}
      </div>
    );
  };

  const renderBeforeAfterPost = () => {
    const beforeImageUrl = post.before_analysis?.front_image_url || post.before_image_url;
    const afterImageUrl = post.after_analysis?.front_image_url || post.after_image_url;

    return (
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">Before</h4>
          {beforeImageUrl ? (
            <img
              src={beforeImageUrl}
              alt="Before"
              className="w-full h-48 object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No before image</span>
            </div>
          )}
        </div>
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">After</h4>
          {afterImageUrl ? (
            <img
              src={afterImageUrl}
              alt="After"
              className="w-full h-48 object-cover rounded-lg"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
              <span className="text-gray-400">No after image</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const postContent = post.type === 'analysis' ? renderAnalysisPost() : renderBeforeAfterPost();
  if (!postContent && !post.content) return null;

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          {post.profiles && (
            <span className="font-medium text-gray-900">{post.profiles.username}</span>
          )}
          <span className="text-sm text-gray-500">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
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
    </div>
  );
}; 