import React from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Camera } from 'lucide-react';
import { ImageGrid } from './ImageGrid';
import { RatingDisplay } from './RatingDisplay';
import type { AnalysisResult } from '../../lib/gemini';
import type { ImageData } from './types';

interface ResultsProps {
  analysis: AnalysisResult;
  images: Partial<ImageData>;
  analysisDate: string;
  onStartNewAnalysis: () => void;
}

export const Results: React.FC<ResultsProps> = ({
  analysis,
  images,
  analysisDate,
  onStartNewAnalysis
}) => {
  const navigate = useNavigate();

  const validImages = [
    { url: images.front, label: 'Front View', alt: 'Front view' },
    { url: images.leftSide, label: 'Left Profile', alt: 'Left side' },
    { url: images.rightSide, label: 'Right Profile', alt: 'Right side' },
    { url: images.hair, label: 'Hair Detail', alt: 'Hair' },
    { url: images.teeth, label: 'Teeth', alt: 'Teeth' },
    { url: images.body, label: 'Body', alt: 'Body' }
  ].filter((img): img is { url: string; label: string; alt: string } => typeof img.url === 'string');

  const validRatings = [
    { value: analysis.ratings.face_rating, label: 'Face' },
    { value: analysis.ratings.hair_rating, label: 'Hair' },
    { value: analysis.ratings.teeth_rating, label: 'Teeth' },
    { value: analysis.ratings.body_rating, label: 'Body' },
    { value: analysis.ratings.overall_rating, label: 'Overall' }
  ].filter(rating => typeof rating.value === 'number');

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Analysis Results</h1>
          <p className="text-sm text-gray-600">{analysisDate}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:w-auto">
          <button
            onClick={onStartNewAnalysis}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Camera className="w-5 h-5" />
            <span>New Analysis</span>
          </button>
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center justify-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <History className="w-5 h-5" />
            <span>View History</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {/* Photos Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Photos</h2>
          <ImageGrid images={validImages} columns={4} imageHeight="h-40 sm:h-48" />
        </div>

        {/* Ratings Section */}
        <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold mb-4">Ratings</h2>
          <div className="bg-gray-50 rounded-lg p-3 md:p-4">
            <RatingDisplay ratings={validRatings} size="lg" />
          </div>
        </div>

        {/* Analysis Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Left Column */}
          <div className="space-y-4 md:space-y-6">
            {/* Facial Analysis */}
            {analysis.facial_analysis && (
              <AnalysisSection
                title="Facial Analysis"
                data={[
                  { label: 'Face Shape', value: analysis.facial_analysis.face_shape },
                  { label: 'Symmetry', value: analysis.facial_analysis.symmetry },
                  {
                    label: 'Notable Features',
                    value: analysis.facial_analysis.notable_features,
                    type: 'list'
                  }
                ]}
              />
            )}

            {/* Skin Analysis */}
            {analysis.skin_analysis && (
              <AnalysisSection
                title="Skin Analysis"
                data={[
                  { label: 'Skin Type', value: analysis.skin_analysis.skin_type },
                  { label: 'Texture', value: analysis.skin_analysis.texture },
                  {
                    label: 'Concerns',
                    value: analysis.skin_analysis.concerns,
                    type: 'list'
                  }
                ]}
              />
            )}

            {/* Teeth Analysis */}
            {analysis.teeth_analysis && (
              <AnalysisSection
                title="Teeth Analysis"
                data={[
                  { label: 'Alignment', value: analysis.teeth_analysis.alignment },
                  { label: 'Color', value: analysis.teeth_analysis.color },
                  { label: 'Health', value: analysis.teeth_analysis.health },
                  {
                    label: 'Concerns',
                    value: analysis.teeth_analysis.concerns,
                    type: 'list'
                  }
                ]}
              />
            )}
          </div>

          {/* Right Column */}
          <div className="space-y-4 md:space-y-6">
            {/* Hair Analysis */}
            {analysis.hair_analysis && (
              <AnalysisSection
                title="Hair Analysis"
                data={[
                  {
                    label: 'Hair Type & Texture',
                    value: `${analysis.hair_analysis.hair_type} - ${analysis.hair_analysis.texture}`
                  },
                  { label: 'Condition', value: analysis.hair_analysis.condition },
                  {
                    label: 'Recommendations',
                    value: analysis.hair_analysis.recommendations,
                    type: 'list'
                  }
                ]}
              />
            )}

            {/* Body Analysis */}
            {analysis.body_analysis && (
              <AnalysisSection
                title="Body Analysis"
                data={[
                  { label: 'Body Type', value: analysis.body_analysis.body_type },
                  { label: 'Posture', value: analysis.body_analysis.posture },
                  { label: 'Proportions', value: analysis.body_analysis.proportions },
                  {
                    label: 'Concerns',
                    value: analysis.body_analysis.concerns,
                    type: 'list'
                  },
                  {
                    label: 'Recommendations',
                    value: analysis.body_analysis.recommendations,
                    type: 'list'
                  }
                ]}
              />
            )}
          </div>
        </div>

        {/* Recommendations */}
        <div className="space-y-4 md:space-y-6">
          <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
            <h2 className="text-lg md:text-xl font-semibold mb-4">Improvement Plan</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Skincare Routine */}
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Skincare Routine</h3>
                <ul className="text-gray-700 space-y-2">
                  {analysis.recommendations.skincare.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Hairstyle Changes */}
              <div className="bg-purple-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Hairstyle Changes</h3>
                <ul className="text-gray-700 space-y-2">
                  {analysis.recommendations.hairstyle.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>

              {/* Recommended Products */}
              <div className="bg-green-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-3">Recommended Products</h3>
                <ul className="text-gray-700 space-y-2">
                  {analysis.recommendations.products.map((item, index) => (
                    <li key={index}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Lifestyle Recommendations */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">Lifestyle Recommendations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Fitness */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Fitness</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.fitness.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Nutrition */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Nutrition</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.nutrition.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Sleep */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Sleep</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.sleep.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Posture */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Posture</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.posture.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Grooming */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Grooming</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.grooming.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Fashion */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Fashion</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.fashion.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Dental */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Dental</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.dental.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>

                {/* Confidence */}
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Confidence</h4>
                  <ul className="text-gray-700 space-y-1">
                    {analysis.recommendations.lifestyle.confidence.map((item, index) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface AnalysisSectionProps {
  title: string;
  data: Array<{
    label: string;
    value: string | string[];
    type?: 'text' | 'list';
  }>;
}

const AnalysisSection: React.FC<AnalysisSectionProps> = ({ title, data }) => (
  <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
    <h2 className="text-lg md:text-xl font-semibold mb-4">{title}</h2>
    <div className="space-y-4">
      {data.map(({ label, value, type = 'text' }) => (
        <div key={label}>
          <h3 className="font-medium text-gray-700 mb-1">{label}</h3>
          {type === 'list' && Array.isArray(value) ? (
            <ul className="list-disc list-inside text-gray-600 space-y-1">
              {value.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600">{value}</p>
          )}
        </div>
      ))}
    </div>
  </div>
); 