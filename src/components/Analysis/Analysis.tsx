import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { usePrefetchedData } from '../../hooks/usePrefetchedData';
import { Analysis as AnalysisType } from '../../lib/types';
import { supabase } from '../../lib/supabase';
import { useAuthStore } from '../../lib/store';
import { useNavigate } from 'react-router-dom';
import { PageTransition } from '../layout/PageTransition';
import { Camera, Share2, ChevronRight, Upload, X } from 'lucide-react';
import { RatingDisplay } from './RatingDisplay';
import { useContentModeration } from '../../lib/contentModeration';
import { toast } from 'react-hot-toast';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (frontImage: File, sideImage: File) => Promise<void>;
  isLoading?: boolean;
  error?: string | undefined;
}

const UploadModal: React.FC<UploadModalProps> = React.memo(({ isOpen, onClose, onUpload, isLoading, error }) => {
  const [uploadedImages, setUploadedImages] = useState<{
    front?: File;
    side?: File;
    frontPreview?: string;
    sidePreview?: string;
  }>({});
  const { checkContent } = useContentModeration();

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>, type: 'front' | 'side') => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      // Validate file type and size
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a valid image file (JPEG, PNG, or WebP)');
        return;
      }

      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        toast.error('Image size must be less than 10MB');
        return;
      }

      // Check image content
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          // Validate image dimensions
          const img = new Image();
          img.onload = async () => {
            if (img.width < 720 || img.height < 480) {
              toast.error('Image resolution must be at least 720x480 pixels');
              return;
            }

            // Check image content for inappropriate material
            const moderationResult = await checkContent(reader.result as string);
            if (!moderationResult.isAcceptable) {
              toast.error(moderationResult.reason || 'This image is not allowed');
              return;
            }

            setUploadedImages(prev => ({
              ...prev,
              [type]: file,
              [`${type}Preview`]: reader.result as string
            }));
          };
          img.src = reader.result as string;
        } catch (err) {
          console.error('Error validating image:', err);
          toast.error('Failed to validate image');
        }
      };
      reader.onerror = () => {
        toast.error('Error reading image file');
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error('Error handling image upload:', err);
      toast.error('Failed to process image');
    }
  }, [checkContent]);

  const handleSubmit = useCallback(async () => {
    try {
      if (!uploadedImages.front || !uploadedImages.side) {
        toast.error('Please upload both front and side images');
        return;
      }
      await onUpload(uploadedImages.front, uploadedImages.side);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload images');
    }
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
    { value: analysis.overall_rating ?? null, label: 'Overall Rating' },
    { value: analysis.face_rating ?? null, label: 'Face Rating' },
    { value: analysis.hair_rating ?? null, label: 'Hair Rating' },
    { value: analysis.teeth_rating ?? null, label: 'Teeth Rating' },
    { value: analysis.body_rating ?? null, label: 'Body Rating' }
  ].filter((rating): rating is { value: number; label: string } => rating.value !== null);

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow">
      <div className="grid grid-cols-2 gap-4 mb-4">
        <img
          src={analysis.front_image_url ?? ''}
          alt="Front view"
          className="w-full h-48 object-cover rounded-lg"
        />
        <img
          src={analysis.left_side_image_url ?? ''}
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

export const Analysis = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [error, setError] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Analysis form state
  const [frontImage, setFrontImage] = useState<File | null>(null);
  const [leftSideImage, setLeftSideImage] = useState<File | null>(null);
  const [rightSideImage, setRightSideImage] = useState<File | null>(null);
  const [analysisText, setAnalysisText] = useState('');
  const [overallRating, setOverallRating] = useState(0);
  const [postureRating, setPostureRating] = useState(0);
  const [symmetryRating, setSymmetryRating] = useState(0);
  const [muscleDevelopmentRating, setMuscleDevelopmentRating] = useState(0);
  const [bodyFatRating, setBodyFatRating] = useState(0);
  const [proportionsRating, setProportionsRating] = useState(0);
  const [shareAnalysis, setShareAnalysis] = useState(false);

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

  const { data: analyses, isLoading: prefetchedLoading } = usePrefetchedData<AnalysisType>(
    'analyses',
    fetchAnalyses,
    30 * 1000 // 30 seconds cache
  );

  const uploadImage = async (file: File): Promise<string> => {
    if (!user) throw new Error('User not authenticated');
    
    try {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      const fileName = `${user.id}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('images')
        .upload(fileName, file);
      
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);
        
      return publicUrl;
    } catch (err) {
      console.error('Error uploading image:', err);
      throw new Error('Failed to upload image');
    }
  };

  const handleSubmit = async () => {
    if (!frontImage || !leftSideImage || !rightSideImage || !analysisText.trim()) {
      setError('Please provide all required images and analysis text');
      return;
    }

    try {
      setIsSubmitting(true);

      // Upload images
      const [frontUrl, leftUrl, rightUrl] = await Promise.all([
        uploadImage(frontImage),
        uploadImage(leftSideImage),
        uploadImage(rightSideImage)
      ]);

      if (!frontUrl || !leftUrl || !rightUrl) {
        throw new Error('Failed to upload one or more images');
      }

      // Create analysis
      const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert([
          {
            user_id: user?.id,
            front_image_url: frontUrl,
            left_side_image_url: leftUrl,
            right_side_image_url: rightUrl,
            analysis_text: analysisText.trim(),
            overall_rating: overallRating,
            posture_rating: postureRating,
            symmetry_rating: symmetryRating,
            muscle_development_rating: muscleDevelopmentRating,
            body_fat_rating: bodyFatRating,
            proportions_rating: proportionsRating
          }
        ])
        .select()
        .single();

      if (analysisError) throw analysisError;

      // Share analysis if requested
      if (shareAnalysis) {
        const { error: postError } = await supabase
          .from('posts')
          .insert([
            {
              user_id: user?.id,
              type: 'analysis',
              analysis_id: analysis.id,
              content: 'Check out my latest analysis!'
            }
          ]);

        if (postError) {
          console.error('Error sharing analysis:', postError);
          toast.error('Analysis saved but failed to share');
        } else {
          toast.success('Analysis saved and shared successfully');
        }
      } else {
        toast.success('Analysis saved successfully');
      }

      // Reset form
      setFrontImage(null);
      setLeftSideImage(null);
      setRightSideImage(null);
      setAnalysisText('');
      setOverallRating(0);
      setPostureRating(0);
      setSymmetryRating(0);
      setMuscleDevelopmentRating(0);
      setBodyFatRating(0);
      setProportionsRating(0);
      setShareAnalysis(false);
      setError(undefined);

      // Navigate to profile
      navigate('/profile');
    } catch (err) {
      console.error('Error submitting analysis:', err);
      setError('Failed to submit analysis');
      toast.error('Failed to submit analysis');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleShare = useCallback(async (id: string) => {
    try {
      setError(undefined);
      setIsLoading(true);
      
      const { data: shareData, error: shareError } = await supabase
        .from('analysis_shares')
        .insert([{ analysis_id: id }])
        .select()
        .single();

      if (shareError) throw shareError;
      if (!shareData) throw new Error('Failed to generate sharing link');

      const shareUrl = `${window.location.origin}/shared/${shareData.id}`;
      await navigator.clipboard.writeText(shareUrl);
      alert('Share link copied to clipboard!');
    } catch (error) {
      console.error('Share error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to share analysis';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleView = useCallback((id: string) => {
    try {
      navigate(`/analysis/${id}`);
    } catch (error) {
      console.error('Navigation error:', error);
      setError('Failed to view analysis');
    }
  }, [navigate]);

  // Show error message if present
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(undefined), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const renderContent = useMemo(() => {
    if (prefetchedLoading) {
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
            onView={handleView}
          />
        ))}
      </div>
    );
  }, [prefetchedLoading, analyses, handleShare, handleView]);

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
          <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <span className="block sm:inline">{error}</span>
            <button
              onClick={() => setError(undefined)}
              className="absolute top-0 right-0 px-4 py-3"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {renderContent}

        <UploadModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onUpload={handleSubmit}
          isLoading={isUploading}
          error={error}
        />
      </div>
    </PageTransition>
  );
}; 