import React from 'react';

interface Image {
  url: string;
  label: string;
  alt: string;
}

interface ImageGridProps {
  images: Image[];
  columns?: 2 | 4;
  imageHeight?: string;
}

export const ImageGrid: React.FC<ImageGridProps> = ({
  images,
  columns = 4,
  imageHeight = 'h-40'
}) => {
  const gridCols = columns === 2 
    ? 'grid-cols-1 sm:grid-cols-2' 
    : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4';

  return (
    <div className={`grid ${gridCols} gap-3 md:gap-4`}>
      {images.map((image, index) => (
        <div key={index} className="space-y-2">
          {image.label && (
            <h3 className="text-sm font-semibold text-gray-700">
              {image.label}
            </h3>
          )}
          <img
            src={image.url}
            alt={image.alt}
            className={`w-full ${imageHeight} object-cover rounded-lg`}
            loading="lazy"
          />
        </div>
      ))}
    </div>
  );
};