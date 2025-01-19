import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { usePrefetchedData } from '../../hooks/usePrefetchedData';
import { Analysis as AnalysisType } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../PageTransition';
import { Camera, Share2, ChevronRight, Upload, X } from 'lucide-react';
import { RatingDisplay } from './RatingDisplay';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (frontImage: File, sideImage: File) => Promise<void>;
  isLoading?: boolean;
  error?: string;
}

const UploadModal: React.FC<UploadModalProps> = React.memo(({ isOpen, onClose, onUpload, isLoading, error }) => {
  const [uploadedImages, setUploadedImages] = useState<{
    front?: File;
    side?: File;
    frontPreview?: string;
    sidePreview?: string;
  }>({});

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'side') => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      setUploadedImages(prev => ({
        ...prev,
        [type]: file,
        [`${type}Preview`]: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!uploadedImages.front || !uploadedImages.side) return;
    await onUpload(uploadedImages.front, uploadedImages.side);
  }, [uploadedImages.front, uploadedImages.side, onUpload]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
        <div className="flex justify-between items-center mb-4">
          <h2 id="modal-title" className="text-xl font-semibold">New Analysis</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <ImageUploadField
            label="Front View"
            preview={uploadedImages.frontPreview}
            onChange={(e) => handleImageUpload(e, 'front')}
          />
          <ImageUploadField
            label="Side View"
            preview={uploadedImages.sidePreview}
            onChange={(e) => handleImageUpload(e, 'side')}
          />
        </div>

        {error && (
          <div className="text-red-600 text-sm mb-4" role="alert">
            {error}
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!uploadedImages.front || !uploadedImages.side || isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'Processing...' : 'Start Analysis'}
          </button>
        </div>
      </div>
    </div>
  );
});

interface ImageUploadFieldProps {
  label: string;
  preview?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

const ImageUploadField: React.FC<ImageUploadFieldProps> = React.memo(({ label, preview, onChange }) => {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>
      <div className="relative h-48 border-2 border-dashed border-gray-300 rounded-lg overflow-hidden">
        {preview ? (
          <img
            src={preview}
            alt={`${label} preview`}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Upload className="w-8 h-8 text-gray-400 mb-2" />
            <span className="text-sm text-gray-500">Upload {label.toLowerCase()}</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={onChange}
          className="absolute inset-0 opacity-0 cursor-pointer"
          aria-label={`Upload ${label.toLowerCase()}`}
        />
      </div>
    </div>
  );
});

interface AnalysisCardProps {
  analysis: AnalysisType;
  onShare: (id: string) => Promise<void>;
  onView: (id: string) => void;
}

const AnalysisCard: React.FC<AnalysisCardProps> = React.memo(({ analysis, onShare, onView }) => {
  const ratings = [
    { value: analysis.overall_rating, label: 'Overall Rating' },
    { value: analysis.face_rating, label: 'Face Rating' },
    { value: analysis.hair_rating, label: 'Hair Rating' },
    { value: analysis.teeth_rating, label: 'Teeth Rating' },
    { value: analysis.body_rating, label: 'Body Rating' }
  ].filter(rating => rating.value !== null) as { value: number; label: string }[];

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <img
          src={analysis.front_image_url}
          alt="Front view"
          className="w-full h-48 object-cover rounded-lg"
        />
        <img
          src={analysis.left_side_image_url}
          alt="Side view"
          className="w-full h-48 object-cover rounded-lg"
        />
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          {new Date(analysis.created_at).toLocaleDateString()}
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onShare(analysis.id)}
            className="p-2 text-gray-600 hover:text-blue-600 rounded-full"
            aria-label="Share analysis"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => onView(analysis.id)}
            className="p-2 text-gray-600 hover:text-blue-600 rounded-full"
            aria-label="View analysis details"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
});

export const Analysis: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const fetchAnalyses = useCallback(async () => {
    if (!user) return [];
    
    const { data, error } = await supabase
      .from('analyses')
      .select(`
        *,
        posts!posts_analysis_id_fkey (
          id,
          content,
          created_at,
          profiles (id, username, avatar_url)
        )
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }, [user]);

  const { data: analyses, isLoading } = usePrefetchedData<AnalysisType>(
    'analyses',
    fetchAnalyses,
    30 * 1000 // 30 seconds cache
  );

  const handleUpload = useCallback(async (frontImage: File, sideImage: File) => {
    if (!user) return;
    setIsUploading(true);
    setError(undefined);

    try {
      // Upload front image
      const frontPath = `analyses/${user.id}/${Date.now()}_front`;
      const { error: frontError } = await supabase.storage
        .from('images')
        .upload(frontPath, frontImage);
      if (frontError) throw frontError;

      // Upload side image
      const sidePath = `analyses/${user.id}/${Date.now()}_side`;
      const { error: sideError } = await supabase.storage
        .from('images')
        .upload(sidePath, sideImage);
      if (sideError) throw sideError;

      // Get public URLs
      const frontUrl = supabase.storage.from('images').getPublicUrl(frontPath).data.publicUrl;
      const sideUrl = supabase.storage.from('images').getPublicUrl(sidePath).data.publicUrl;

      // Create analysis record
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert([{
          user_id: user.id,
          front_image_url: frontUrl,
          left_side_image_url: sideUrl
        }])
        .select()
        .single();

      if (analysisError) throw analysisError;

      setIsModalOpen(false);
      navigate(`/analysis/${analysis.id}`);
    } catch (err) {
      console.error('Error creating analysis:', err);
      setError('Failed to create analysis. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [user, navigate]);

  const handleShare = useCallback(async (analysisId: string) => {
    try {
      const { error: err } = await supabase
        .from('posts')
        .insert([{
          user_id: user?.id,
          type: 'analysis',
          analysis_id: analysisId,
          content: 'Shared my latest analysis'
        }]);

      if (err) throw err;
      setError(undefined);
    } catch (err) {
      console.error('Error sharing analysis:', err);
      setError('Failed to share analysis');
    }
  }, [user]);

  const handleViewAnalysis = useCallback((analysisId: string) => {
    navigate(`/analysis/${analysisId}`);
  }, [navigate]);

  const renderContent = useMemo(() => {
    if (isLoading) {
      return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="animate-pulse bg-white rounded-lg shadow-sm p-4">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="h-48 bg-gray-200 rounded-lg"></div>
                <div className="h-48 bg-gray-200 rounded-lg"></div>
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (!analyses?.length) {
      return (
        <div className="text-center py-12">
          <Camera className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No analyses yet</h3>
          <p className="text-gray-500 mb-4">Get started by creating your first analysis</p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Create Analysis
          </button>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {analyses.map((analysis) => (
          <AnalysisCard
            key={analysis.id}
            analysis={analysis}
            onShare={handleShare}
            onView={handleViewAnalysis}
          />
        ))}
      </div>
    );
  }, [isLoading, analyses, handleShare, handleViewAnalysis]);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">My Analyses</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
          >
            <Camera className="w-5 h-5" />
            <span>New Analysis</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-md" role="alert">
            {error}
          </div>
        )}

        {renderContent}

        <UploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpload={handleUpload}
          isLoading={isUploading}
          error={error}
        />
      </div>
    </PageTransition>
  );
}; 