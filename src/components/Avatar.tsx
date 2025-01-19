import React from 'react';
import { User } from 'lucide-react';

interface AvatarProps {
  url?: string | null;
  size?: number;
  username?: string;
}

export const Avatar: React.FC<AvatarProps> = ({ 
  url, 
  size = 40,
  username
}) => {
  if (!url) {
    return (
      <div 
        className="bg-gray-200 rounded-full flex items-center justify-center"
        style={{ width: size, height: size }}
      >
        <User 
          className="text-gray-500"
          size={Math.round(size * 0.6)}
        />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={`${username}'s avatar`}
      className="rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  );
}; 