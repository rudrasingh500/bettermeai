import React from 'react';
import { PostCard } from '../PostCard';
import type { Post, Profile } from '../../lib/types';

interface FeedProps {
  posts: Post[];
  currentUser: Profile;
  onComment: (postId: string, content: string) => Promise<void>;
  onReact: (postId: string, type: 'like' | 'helpful' | 'insightful') => void;
}

export const Feed: React.FC<FeedProps> = ({
  posts,
  currentUser,
  onComment,
  onReact
}) => {
  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-600">
        No posts yet. Be the first to share!
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          onComment={onComment}
          onReact={onReact}
        />
      ))}
    </div>
  );
};