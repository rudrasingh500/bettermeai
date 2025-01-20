import React, { useState } from 'react';
import type { Analysis } from '../../lib/types';
import { useContentModeration } from '../../lib/contentModeration';
import { toast } from 'react-hot-toast';

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
  const [analysisId, setAnalysisId] = useState<string>('');
  const [beforeAnalysisId, setBeforeAnalysisId] = useState<string>('');
  const [afterAnalysisId, setAfterAnalysisId] = useState<string>('');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { checkContent } = useContentModeration();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    try {
      setIsSubmitting(true);

      // Check content before posting
      const moderationResult = await checkContent(content);
      if (!moderationResult.isAcceptable) {
        toast.error(moderationResult.reason || 'This content is not allowed');
        return;
      }

      await onSubmit({
        type,
        analysisId: type === 'analysis' ? analysisId : undefined,
        beforeAnalysisId: type === 'before_after' ? beforeAnalysisId : undefined,
        afterAnalysisId: type === 'before_after' ? afterAnalysisId : undefined,
        content: content.trim()
      });

      // Reset form
      setType('analysis');
      setAnalysisId('');
      setBeforeAnalysisId('');
      setAfterAnalysisId('');
      setContent('');
    } catch (err) {
      console.error('Error creating post:', err);
      toast.error('Failed to create post');
    } finally {
      setIsSubmitting(false);
    }
  };

  const sortedAnalyses = [...analyses].sort((a, b) => 
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Type Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Post Type
        </label>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setType('analysis')}
            className={`flex-1 p-3 rounded-lg border ${
              type === 'analysis'
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            Share Analysis
          </button>
          <button
            type="button"
            onClick={() => setType('before_after')}
            className={`flex-1 p-3 rounded-lg border ${
              type === 'before_after'
                ? 'border-blue-600 bg-blue-50 text-blue-600'
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            Before/After
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
            value={analysisId}
            onChange={(e) => setAnalysisId(e.target.value)}
            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            required
          >
            <option value="">Select an analysis</option>
            {analyses.map(analysis => (
              <option key={analysis.id} value={analysis.id}>
                Analysis from {new Date(analysis.created_at).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Before Analysis
            </label>
            <select
              value={beforeAnalysisId}
              onChange={(e) => setBeforeAnalysisId(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select before analysis</option>
              {analyses.map(analysis => (
                <option key={analysis.id} value={analysis.id}>
                  Analysis from {new Date(analysis.created_at).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              After Analysis
            </label>
            <select
              value={afterAnalysisId}
              onChange={(e) => setAfterAnalysisId(e.target.value)}
              className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              required
            >
              <option value="">Select after analysis</option>
              {analyses.map(analysis => (
                <option key={analysis.id} value={analysis.id}>
                  Analysis from {new Date(analysis.created_at).toLocaleDateString()}
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
          disabled={isSubmitting}
        />
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
        }`}
      >
        {isSubmitting ? 'Creating Post...' : 'Create Post'}
      </button>
    </form>
  );
};