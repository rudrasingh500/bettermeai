import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../lib/store';
import { PhotoCapture } from './PhotoCapture';
import { Results } from './Results';
import { useAnalysis } from './hooks/useAnalysis';
import { useAnalysisHistory } from './hooks/useAnalysisHistory';
import { ErrorBoundary } from './ErrorBoundary';
import { STEP_ORDER, STEP_INSTRUCTIONS } from './types';
import type { AnalysisStep, ImageData } from './types';
import type { AnalysisResult } from '../../lib/gemini';

const Analysis = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState<AnalysisStep>('front');
  const [images, setImages] = useState<ImageData>({} as ImageData);
  const [showNewAnalysis, setShowNewAnalysis] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);

  const {
    analyzePhotos,
    saveAnalysis,
    isAnalyzing,
    error,
    setError
  } = useAnalysis(user?.id || '', user?.gender || 'other');

  const {
    latestAnalysis,
    latestResults,
    isLoading,
    refreshHistory
  } = useAnalysisHistory(user?.id || '');

  if (!user) {
    navigate('/login');
    return null;
  }

  const handleCapture = (imageSrc: string) => {
    setImages(prev => ({ ...prev, [step]: imageSrc }));
    setError(null);
  };

  const handleNext = async () => {
    if (step === 'body') {
      const result = await analyzePhotos(images);
      if (result) {
        setAnalysis(result);
        await saveAnalysis(images, result);
        await refreshHistory();
        setStep('results');
      }
    } else {
      setStep(STEP_ORDER[STEP_ORDER.indexOf(step) + 1]);
    }
  };

  const startNewAnalysis = () => {
    setStep('front');
    setImages({} as ImageData);
    setShowNewAnalysis(true);
    setError(null);
    setAnalysis(null);
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your analysis...</p>
        </div>
      </div>
    );
  }

  // Show latest analysis results or current analysis results
  if ((latestAnalysis && latestResults && !showNewAnalysis) || (analysis && step === 'results')) {
    if (!latestResults && !analysis) return null;
    
    const currentAnalysis = (analysis || latestResults) as AnalysisResult;
    const currentImages: Partial<ImageData> = analysis ? images : {
      front: latestAnalysis?.front_image_url || undefined,
      leftSide: latestAnalysis?.left_side_image_url || undefined,
      rightSide: latestAnalysis?.right_side_image_url || undefined,
      hair: latestAnalysis?.hair_image_url || undefined,
      teeth: latestAnalysis?.teeth_image_url || undefined,
      body: latestAnalysis?.body_image_url || undefined
    };
    const analysisDate = analysis ? 'Just now' : new Date(latestAnalysis!.created_at).toLocaleDateString();

    return (
      <Results
        analysis={currentAnalysis}
        images={currentImages}
        analysisDate={analysisDate}
        onStartNewAnalysis={startNewAnalysis}
      />
    );
  }

  // Show photo capture UI
  if (step === 'results') return null;

  const currentStepIndex = STEP_ORDER.indexOf(step);
  const stepCount = {
    current: currentStepIndex + 1,
    total: STEP_ORDER.length - 1 // Exclude 'results' step
  };

  return (
    <div className="max-w-4xl mx-auto p-4">
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          Take Your {step.replace(/([A-Z])/g, ' $1').toLowerCase()} Photo
        </h1>
        <p className="text-gray-600 mb-6">
          {STEP_INSTRUCTIONS[step as Exclude<AnalysisStep, 'results'>]}
        </p>

        <PhotoCapture
          step={step as Exclude<AnalysisStep, 'results'>}
          instruction={STEP_INSTRUCTIONS[step as Exclude<AnalysisStep, 'results'>]}
          stepCount={stepCount}
          onCapture={handleCapture}
          onNext={handleNext}
          currentImage={images[step]}
          error={error}
          isAnalyzing={isAnalyzing}
        />
      </div>
    </div>
  );
};

// Wrap with error boundary
export default function AnalysisWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <Analysis />
    </ErrorBoundary>
  );
}