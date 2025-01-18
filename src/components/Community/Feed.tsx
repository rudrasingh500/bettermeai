import React from 'react';
import { MessageSquare, Heart, Award, ThumbsUp } from 'lucide-react';
import type { Post, Profile } from '../../lib/types';
import { RatingDisplay } from '../Analysis/RatingDisplay';

interface FeedProps {
  posts: Post[];
  currentUser: Profile;
  onComment: (postId: string, content: string) => Promise<void>;
  onReact: (postId: string, type: 'like' | 'helpful' | 'insightful') => Promise<void>;
}

export const Feed: React.FC<FeedProps> = ({
  posts,
  currentUser,
  onComment,
  onReact
}) => {
  const [commentText, setCommentText] = React.useState<Record<string, string>>({});
  const [expandedPost, setExpandedPost] = React.useState<string | null>(null);

  const handleSubmitComment = async (postId: string) => {
    const content = commentText[postId]?.trim();
    if (!content) return;

    await onComment(postId, content);
    setCommentText(prev => ({ ...prev, [postId]: '' }));
  };

  const renderAnalysisPost = (post: Post) => {
    if (!post.analyses?.analysis_text) return null;

    try {
      const analysisData = JSON.parse(post.analyses.analysis_text);
      const ratings = [
        { value: analysisData.ratings.overall_rating, label: 'Overall' },
        { value: analysisData.ratings.face_rating, label: 'Face' },
        { value: analysisData.ratings.hair_rating, label: 'Hair' }
      ].filter(rating => typeof rating.value === 'number' && !isNaN(rating.value));

      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 sm:gap-4">
            {post.analyses.front_image_url && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Front View</h4>
                <img
                  src={post.analyses.front_image_url}
                  alt="Front view"
                  className="w-full h-32 sm:h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              </div>
            )}
            {post.analyses.left_side_image_url && (
              <div>
                <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Side View</h4>
                <img
                  src={post.analyses.left_side_image_url}
                  alt="Side view"
                  className="w-full h-32 sm:h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              </div>
            )}
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <RatingDisplay ratings={ratings} size="sm" />
          </div>
        </div>
      );
    } catch (error) {
      console.error('Error parsing analysis data:', error);
      return null;
    }
  };

  const renderBeforeAfterPost = (post: Post) => {
    let beforeRating: number | null = null;
    let afterRating: number | null = null;

    // Try to get ratings from the analyses
    if (post.before_analysis?.analysis_text) {
      try {
        const beforeData = JSON.parse(post.before_analysis.analysis_text);
        beforeRating = beforeData.ratings?.overall_rating || null;
      } catch (error) {
        console.error('Error parsing before analysis:', error);
      }
    }

    if (post.after_analysis?.analysis_text) {
      try {
        const afterData = JSON.parse(post.after_analysis.analysis_text);
        afterRating = afterData.ratings?.overall_rating || null;
      } catch (error) {
        console.error('Error parsing after analysis:', error);
      }
    }

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2 sm:gap-4">
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">Before</h4>
            {post.before_analysis?.front_image_url && (
              <img
                src={post.before_analysis.front_image_url}
                alt="Before"
                className="w-full h-32 sm:h-48 object-cover rounded-lg"
                loading="lazy"
              />
            )}
            {beforeRating !== null && (
              <div className="mt-2 bg-gray-50 rounded-lg p-2">
                <RatingDisplay
                  ratings={[{ value: beforeRating, label: 'Rating' }]}
                  size="sm"
                />
              </div>
            )}
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-2">After</h4>
            {post.after_analysis?.front_image_url && (
              <img
                src={post.after_analysis.front_image_url}
                alt="After"
                className="w-full h-32 sm:h-48 object-cover rounded-lg"
                loading="lazy"
              />
            )}
            {afterRating !== null && (
              <div className="mt-2 bg-gray-50 rounded-lg p-2">
                <RatingDisplay
                  ratings={[{ value: afterRating, label: 'Rating' }]}
                  size="sm"
                />
              </div>
            )}
          </div>
        </div>
        {beforeRating !== null && afterRating !== null && (
          <div className="text-sm text-gray-600 bg-blue-50 rounded-lg p-3">
            <p className="font-medium">
              Rating Improvement: {(afterRating - beforeRating).toFixed(1)} points
            </p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {posts.map((post) => (
        <div key={post.id} className="bg-white rounded-lg shadow-md p-4 sm:p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">
                {post.profiles?.username}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500">
                {new Date(post.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="text-xs sm:text-sm text-gray-500">
              {post.type === 'analysis' ? 'Analysis Share' : 'Progress Update'}
            </div>
          </div>

          {post.content && (
            <p className="text-gray-700 mb-4 text-sm sm:text-base">{post.content}</p>
          )}

          {post.type === 'analysis' ? renderAnalysisPost(post) : renderBeforeAfterPost(post)}

          <div className="flex items-center gap-2 sm:gap-4 mt-4 pt-4 border-t">
            <button
              onClick={() => onReact(post.id, 'like')}
              className="flex items-center gap-1 text-gray-600 hover:text-red-600"
            >
              <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm">{post.reactions?.filter(r => r.type === 'like').length || 0}</span>
            </button>
            <button
              onClick={() => onReact(post.id, 'helpful')}
              className="flex items-center gap-1 text-gray-600 hover:text-green-600"
            >
              <ThumbsUp className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm">{post.reactions?.filter(r => r.type === 'helpful').length || 0}</span>
            </button>
            <button
              onClick={() => onReact(post.id, 'insightful')}
              className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
            >
              <Award className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm">{post.reactions?.filter(r => r.type === 'insightful').length || 0}</span>
            </button>
            <button
              onClick={() => setExpandedPost(expandedPost === post.id ? null : post.id)}
              className="flex items-center gap-1 text-gray-600 hover:text-gray-900 ml-auto"
            >
              <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="text-sm">{post._count?.comments || 0}</span>
            </button>
          </div>

          {expandedPost === post.id && (
            <div className="mt-4 pt-4 border-t space-y-4">
              {post.comments?.map((comment) => (
                <div key={comment.id} className="flex gap-3">
                  <div className="flex-grow">
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-gray-900 text-sm">
                        {comment.profiles?.username}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(comment.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-gray-700 mt-1 text-sm sm:text-base">{comment.content}</p>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 mt-4">
                <input
                  type="text"
                  value={commentText[post.id] || ''}
                  onChange={(e) => setCommentText(prev => ({
                    ...prev,
                    [post.id]: e.target.value
                  }))}
                  placeholder="Add a comment..."
                  className="flex-grow px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      handleSubmitComment(post.id);
                    }
                  }}
                />
                <button
                  onClick={() => handleSubmitComment(post.id)}
                  className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Post
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {posts.length === 0 && (
        <div className="text-center py-8 text-gray-600">
          No posts yet. Be the first to share!
        </div>
      )}
    </div>
  );
};