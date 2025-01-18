import React from 'react';

interface Rating {
  value: number;
  label: string;
}

interface RatingDisplayProps {
  ratings: Rating[];
  size?: 'sm' | 'lg';
}

export const RatingDisplay: React.FC<RatingDisplayProps> = ({ 
  ratings,
  size = 'lg'
}) => {
  const getRatingColor = (value: number) => {
    if (value >= 8) return 'text-green-600';
    if (value >= 6) return 'text-blue-600';
    if (value >= 4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const textSize = size === 'lg' ? 'text-2xl md:text-3xl' : 'text-xl md:text-2xl';
  const gridCols = ratings.length <= 3 
    ? 'grid-cols-1 sm:grid-cols-3' 
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-5';

  return (
    <div className={`grid ${gridCols} gap-3 md:gap-4`}>
      {ratings.map((rating, index) => (
        <div 
          key={index} 
          className="bg-white rounded-lg p-3 md:p-4 text-center hover:shadow-md transition-shadow"
        >
          <div className={`${textSize} font-bold ${getRatingColor(rating.value)} mb-1`}>
            {rating.value.toFixed(1)}
          </div>
          <div className="text-sm text-gray-600">{rating.label}</div>
        </div>
      ))}
    </div>
  );
};