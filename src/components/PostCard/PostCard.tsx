import React from 'react';
import { MessageSquare, Heart, Award, ThumbsUp, User } from 'lucide-react';
import { RatingDisplay } from '../Analysis/RatingDisplay';
import type { Post, Comment, Profile } from '../../lib/types';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';

interface PostCardProps {
  post: Post;
  onComment?: (postId: string, content: string) => Promise<void>;
  onReact?: (postId: string, type: 'like' | 'helpful' | 'insightful') => void;
  showActions?: boolean;
  onUpdate?: () => void;
}

export const PostCard: React.FC<PostCardProps> = ({
  post: initialPost,
  onComment,
  onReact,
  showActions = true,
  onUpdate
}) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [showCommentInput, setShowCommentInput] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [post, setPost] = React.useState(initialPost);

  // Update post when initialPost changes
  React.useEffect(() => {
    setPost(initialPost);
  }, [initialPost]);

  const handleProfileClick = (username: string) => {
    // If it's the current user's profile, navigate to /profile
    if (user?.username === username) {
      navigate('/profile');
    } else {
      // For other users, navigate to their profile page
      navigate(`/profile/${username}`, { state: { from: location.pathname } });
    }
  };

  const handleReaction = async (type: 'like' | 'helpful' | 'insightful') => {
    try {
      if (onReact) {
        await onReact(post.id, type);
        if (onUpdate) {
          await onUpdate();
        }
      }
    } catch (err) {
      console.error('Error handling reaction:', err);
    }
  };

  const handleComment = async (content: string) => {
    try {
      if (onComment && user) {
        // Optimistically add the comment to the UI
        const tempComment: Comment = {
          id: Date.now().toString(), // Temporary ID
          content,
          created_at: new Date().toISOString(),
          user_id: user.id,
          post_id: post.id,
          profiles: {
            id: user.id,
            username: user.username || '',
            avatar_url: user.avatar_url,
            gender: 'other',
            bio: '',
            rating: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
        };

        setPost(prevPost => ({
          ...prevPost,
          comments: [...(prevPost.comments || []), tempComment]
        }));

        // Actually send the comment to the server
        await onComment(post.id, content);
      }
    } catch (err) {
      console.error('Error posting comment:', err);
      // Revert the optimistic update on error
      setPost(initialPost);
    }
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
          <div className="bg-gray-50 p-3 rounded-lg">
            <RatingDisplay
              ratings={analysisRatings}
              size="sm"
            />
          </div>
        )}
      </div>
    );
  };

  const renderBeforeAfterPost = () => {
    // Get front images and ratings
    const beforeFrontImage = post.before_analysis?.front_image_url || post.before_image_url;
    const beforeRating = post.before_analysis?.overall_rating;

    const afterFrontImage = post.after_analysis?.front_image_url || post.after_image_url;
    const afterRating = post.after_analysis?.overall_rating;

    // Calculate rating difference if both ratings exist
    const ratingDifference = beforeRating !== null && afterRating !== null && beforeRating !== undefined && afterRating !== undefined
      ? (afterRating - beforeRating).toFixed(1)
      : null;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">Before</h4>
            <div className="space-y-2">
              {beforeFrontImage ? (
                <img
                  src={beforeFrontImage}
                  alt="Before front view"
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
              {beforeRating !== null && beforeRating !== undefined && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <RatingDisplay
                    ratings={[{ value: beforeRating, label: 'Overall Rating' }]}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-gray-700">After</h4>
            <div className="space-y-2">
              {afterFrontImage ? (
                <img
                  src={afterFrontImage}
                  alt="After front view"
                  className="w-full h-48 object-cover rounded-lg"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
              {afterRating !== null && afterRating !== undefined && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <RatingDisplay
                    ratings={[{ value: afterRating, label: 'Overall Rating' }]}
                    size="sm"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
        {ratingDifference && (
          <div className={`text-center p-3 rounded-lg font-medium ${
            Number(ratingDifference) >= 0 
              ? (Number(ratingDifference) > 0 ? 'bg-green-50 text-green-600' : 'bg-gray-50 text-gray-600') 
              : 'bg-red-50 text-red-600'
          }`}>
            Rating Change: {Number(ratingDifference) > 0 ? '+' : ''}{ratingDifference} points
          </div>
        )}
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
            onClick={() => handleReaction('like')}
            className={`flex items-center gap-1 transition-colors ${
              post.reactions?.some(r => r.type === 'like' && r.user_id === user?.id) 
                ? 'text-pink-600' 
                : 'text-gray-600 hover:text-pink-600'
            }`}
          >
            <Heart className={`w-5 h-5 ${
              post.reactions?.some(r => r.type === 'like' && r.user_id === user?.id) 
                ? 'fill-current' 
                : ''
            }`} />
            <span>{post.reactions?.filter(r => r.type === 'like').length || 0}</span>
          </button>
          <button
            onClick={() => handleReaction('helpful')}
            className={`flex items-center gap-1 transition-colors ${
              post.reactions?.some(r => r.type === 'helpful' && r.user_id === user?.id) 
                ? 'text-blue-600' 
                : 'text-gray-600 hover:text-blue-600'
            }`}
          >
            <ThumbsUp className={`w-5 h-5 ${
              post.reactions?.some(r => r.type === 'helpful' && r.user_id === user?.id) 
                ? 'fill-current' 
                : ''
            }`} />
            <span>{post.reactions?.filter(r => r.type === 'helpful').length || 0}</span>
          </button>
          <button
            onClick={() => handleReaction('insightful')}
            className={`flex items-center gap-1 transition-colors ${
              post.reactions?.some(r => r.type === 'insightful' && r.user_id === user?.id) 
                ? 'text-yellow-600' 
                : 'text-gray-600 hover:text-yellow-600'
            }`}
          >
            <Award className={`w-5 h-5 ${
              post.reactions?.some(r => r.type === 'insightful' && r.user_id === user?.id) 
                ? 'fill-current' 
                : ''
            }`} />
            <span>{post.reactions?.filter(r => r.type === 'insightful').length || 0}</span>
          </button>
          <button
            onClick={() => setShowCommentInput(!showCommentInput)}
            className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors ml-auto"
          >
            <MessageSquare className="w-5 h-5" />
            <span>{post.comments?.length || 0}</span>
          </button>
        </div>
      )}

      {showCommentInput && (
        <div className="mt-4 flex gap-2">
          <input
            type="text"
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            placeholder="Write a comment..."
            className="flex-1 rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && commentText.trim()) {
                handleComment(commentText);
                setCommentText('');
                setShowCommentInput(false);
              }
            }}
          />
          <button
            onClick={() => {
              if (commentText.trim()) {
                handleComment(commentText);
                setCommentText('');
                setShowCommentInput(false);
              }
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Post
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