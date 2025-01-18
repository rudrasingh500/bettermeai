import React, { useState } from 'react';
import { Image as ImageIcon } from 'lucide-react';
import type { Analysis } from '../../lib/types';

interface CreatePostProps {
  analyses: Analysis[];
  onSubmit: (data: {
    type: 'analysis' | 'before_after';
    analysisId?: string;
    beforeAnalysisId?: string;
    afterAnalysisId?: string;
    content: string;
  }) => Promise<void>;
}

export const CreatePost: React.FC<CreatePostProps> = ({
  analyses,
  onSubmit
}) => {
  const [type, setType] = useState<'analysis' | 'before_after'>('analysis');
  const [selectedAnalysis, setSelectedAnalysis] = useState<string>('');
  const [beforeAnalysisId, setBeforeAnalysisId] = useState<string>('');
  const [afterAnalysisId, setAfterAnalysisId] = useState<string>('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      await onSubmit({
        type,
        analysisId: type === 'analysis' ? selectedAnalysis : undefined,
        beforeAnalysisId: type === 'before_after' ? beforeAnalysisId : undefined,
        afterAnalysisId: type === 'before_after' ? afterAnalysisId : undefined,
        content
      });

      // Reset form
      setType('analysis');
      setSelectedAnalysis('');
      setBeforeAnalysisId('');
      setAfterAnalysisId('');
      setContent('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedAnalyses = [...analyses].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Post Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Post Type
        </label>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <button
            type="button"
            onClick={() => setType('analysis')}
            className={`flex-1 py-2 px-4 rounded-lg border text-sm sm:text-base ${
              type === 'analysis'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Share Analysis
          </button>
          <button
            type="button"
            onClick={() => setType('before_after')}
            className={`flex-1 py-2 px-4 rounded-lg border text-sm sm:text-base ${
              type === 'before_after'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Before & After
          </button>
        </div>
      </div>

      {/* Analysis Selection */}
      {type === 'analysis' ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Analysis
          </label>
          <select
            value={selectedAnalysis}
            onChange={(e) => setSelectedAnalysis(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
            required
          >
            <option value="">Select an analysis</option>
            {sortedAnalyses.map((analysis) => (
              <option key={analysis.id} value={analysis.id}>
                {new Date(analysis.created_at).toLocaleDateString()} - Rating: {analysis.overall_rating?.toFixed(1)}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Before Analysis Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Before Analysis
            </label>
            <select
              value={beforeAnalysisId}
              onChange={(e) => setBeforeAnalysisId(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
              required
            >
              <option value="">Select analysis</option>
              {sortedAnalyses.map((analysis) => (
                <option key={analysis.id} value={analysis.id}>
                  {new Date(analysis.created_at).toLocaleDateString()} - Rating: {analysis.overall_rating?.toFixed(1)}
                </option>
              ))}
            </select>
          </div>

          {/* After Analysis Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              After Analysis
            </label>
            <select
              value={afterAnalysisId}
              onChange={(e) => setAfterAnalysisId(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
              required
            >
              <option value="">Select analysis</option>
              {sortedAnalyses
                .filter(analysis => analysis.id !== beforeAnalysisId)
                .map((analysis) => (
                  <option key={analysis.id} value={analysis.id}>
                    {new Date(analysis.created_at).toLocaleDateString()} - Rating: {analysis.overall_rating?.toFixed(1)}
                  </option>
                ))}
            </select>
          </div>

          {/* Preview Images */}
          {(beforeAnalysisId || afterAnalysisId) && (
            <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              {beforeAnalysisId && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Before Preview</h4>
                  <img
                    src={analyses.find(a => a.id === beforeAnalysisId)?.front_image_url || ''}
                    alt="Before"
                    className="w-full h-32 sm:h-48 object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}
              {afterAnalysisId && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">After Preview</h4>
                  <img
                    src={analyses.find(a => a.id === afterAnalysisId)?.front_image_url || ''}
                    alt="After"
                    className="w-full h-32 sm:h-48 object-cover rounded-lg"
                    loading="lazy"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Description
        </label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
          rows={4}
          placeholder="Share your thoughts..."
          required
        />
      </div>

      {/* Submit Button */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
        >
          {isSubmitting ? 'Posting...' : 'Post'}
        </button>
      </div>
    </form>
  );
};