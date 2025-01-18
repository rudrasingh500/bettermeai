import { useState, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { analyzeImages } from '../../../lib/gemini';
import type { AnalysisResult } from '../../../lib/gemini';
import type { Analysis, Profile } from '../../../lib/types';
import type { ImageData } from '../types';

interface AnalysisState {
  isAnalyzing: boolean;
  isSaving: boolean;
  progress: number;
  error: string | null;
}

export const useAnalysis = (userId: string, gender: Profile['gender']) => {
  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    isSaving: false,
    progress: 0,
    error: null
  });

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const validateImages = (images: ImageData): boolean => {
    const requiredImages = ['front', 'leftSide', 'rightSide', 'hair', 'teeth', 'body'] as const;
    const missingImages = requiredImages.filter(key => !images[key]);

    if (missingImages.length > 0) {
      setError(`Missing required photos: ${missingImages.join(', ')}`);
      return false;
    }

    return true;
  };

  const analyzePhotos = async (images: ImageData): Promise<AnalysisResult | null> => {
    if (!validateImages(images)) return null;

    setState(prev => ({ 
      ...prev, 
      isAnalyzing: true, 
      error: null,
      progress: 0 
    }));

    try {
      // Update progress as we process each step
      setState(prev => ({ ...prev, progress: 20 }));

      const result = await analyzeImages(
        images.front!,
        images.leftSide!,
        images.rightSide!,
        images.hair!,
        images.teeth!,
        images.body!,
        gender
      );

      setState(prev => ({ ...prev, progress: 80 }));

      if (result === 'Image too blurry') {
        setError('One or more images are too blurry. Please retake your photos in better lighting.');
        return null;
      }

      setState(prev => ({ ...prev, progress: 100 }));
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze images');
      return null;
    } finally {
      setState(prev => ({ ...prev, isAnalyzing: false }));
    }
  };

  const saveAnalysis = async (
    images: ImageData,
    analysis: AnalysisResult
  ): Promise<boolean> => {
    setState(prev => ({ 
      ...prev, 
      isSaving: true, 
      error: null 
    }));

    try {
      const analysisData = {
        user_id: userId,
        front_image_url: images.front,
        left_side_image_url: images.leftSide,
        right_side_image_url: images.rightSide,
        hair_image_url: images.hair,
        teeth_image_url: images.teeth,
        body_image_url: images.body,
        analysis_text: JSON.stringify(analysis),
        face_rating: analysis.ratings.face_rating,
        hair_rating: analysis.ratings.hair_rating,
        teeth_rating: analysis.ratings.teeth_rating,
        body_rating: analysis.ratings.body_rating,
        overall_rating: analysis.ratings.overall_rating,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('analyses')
        .insert([analysisData]);

      if (error) throw error;

      // Update user's rating in profile
      await supabase
        .from('profiles')
        .update({ 
          rating: analysis.ratings.overall_rating,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId);

      return true;
    } catch (err) {
      console.error('Error saving analysis:', err);
      setError('Failed to save analysis results');
      return false;
    } finally {
      setState(prev => ({ ...prev, isSaving: false }));
    }
  };

  const deleteAnalysis = async (analysisId: string): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('analyses')
        .delete()
        .eq('id', analysisId)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    } catch (err) {
      console.error('Error deleting analysis:', err);
      setError('Failed to delete analysis');
      return false;
    }
  };

  return {
    analyzePhotos,
    saveAnalysis,
    deleteAnalysis,
    isAnalyzing: state.isAnalyzing,
    isSaving: state.isSaving,
    progress: state.progress,
    error: state.error,
    setError
  };
};