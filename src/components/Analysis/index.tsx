import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { History, Plus, Camera } from 'lucide-react';
import { useAuthStore } from '../../lib/store';
import { PhotoCapture } from './PhotoCapture';
import { RatingDisplay } from './RatingDisplay';
import { ImageGrid } from './ImageGrid';
import { ImprovementPlan } from './ImprovementPlan';
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

  // Show latest analysis results
  if ((latestAnalysis && latestResults && !showNewAnalysis) || (analysis && step === 'results')) {
    const currentAnalysis = analysis || latestResults;
    const currentImages = analysis ? images : {
      front: latestAnalysis?.front_image_url,
      leftSide: latestAnalysis?.left_side_image_url,
      rightSide: latestAnalysis?.right_side_image_url,
      hair: latestAnalysis?.hair_image_url,
      teeth: latestAnalysis?.teeth_image_url,
      body: latestAnalysis?.body_image_url
    };
    const analysisDate = analysis ? 'Just now' : new Date(latestAnalysis!.created_at).toLocaleDateString();

    const validImages = [
      { url: currentImages.front, label: 'Front View', alt: 'Front view' },
      { url: currentImages.leftSide, label: 'Left Profile', alt: 'Left side' },
      { url: currentImages.rightSide, label: 'Right Profile', alt: 'Right side' },
      { url: currentImages.hair, label: 'Hair Detail', alt: 'Hair' },
      { url: currentImages.teeth, label: 'Teeth', alt: 'Teeth' },
      { url: currentImages.body, label: 'Body', alt: 'Body' }
    ].filter(img => img.url);

    const validRatings = [
      { value: currentAnalysis.ratings.face_rating, label: 'Face' },
      { value: currentAnalysis.ratings.hair_rating, label: 'Hair' },
      { value: currentAnalysis.ratings.teeth_rating, label: 'Teeth' },
      { value: currentAnalysis.ratings.body_rating, label: 'Body' },
      { value: currentAnalysis.ratings.overall_rating, label: 'Overall' }
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
              onClick={startNewAnalysis}
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
              {currentAnalysis.facial_analysis && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">Facial Analysis</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Face Shape</h3>
                      <p className="text-gray-600">{currentAnalysis.facial_analysis.face_shape}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Symmetry</h3>
                      <p className="text-gray-600">{currentAnalysis.facial_analysis.symmetry}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Notable Features</h3>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {currentAnalysis.facial_analysis.notable_features.map((feature, index) => (
                          <li key={index}>{feature}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Skin Analysis */}
              {currentAnalysis.skin_analysis && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">Skin Analysis</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Skin Type</h3>
                      <p className="text-gray-600">{currentAnalysis.skin_analysis.skin_type}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Texture</h3>
                      <p className="text-gray-600">{currentAnalysis.skin_analysis.texture}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Concerns</h3>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {currentAnalysis.skin_analysis.concerns.map((concern, index) => (
                          <li key={index}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Teeth Analysis */}
              {currentAnalysis.teeth_analysis && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">Teeth Analysis</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Alignment</h3>
                      <p className="text-gray-600">{currentAnalysis.teeth_analysis.alignment}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Color</h3>
                      <p className="text-gray-600">{currentAnalysis.teeth_analysis.color}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Health</h3>
                      <p className="text-gray-600">{currentAnalysis.teeth_analysis.health}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Concerns</h3>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {currentAnalysis.teeth_analysis.concerns.map((concern, index) => (
                          <li key={index}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Column */}
            <div className="space-y-4 md:space-y-6">
              {/* Hair Analysis */}
              {currentAnalysis.hair_analysis && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">Hair Analysis</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Hair Type & Texture</h3>
                      <p className="text-gray-600">
                        {currentAnalysis.hair_analysis.hair_type} - {currentAnalysis.hair_analysis.texture}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Condition</h3>
                      <p className="text-gray-600">{currentAnalysis.hair_analysis.condition}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Recommendations</h3>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {currentAnalysis.hair_analysis.recommendations.map((rec, index) => (
                          <li key={index}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Body Analysis */}
              {currentAnalysis.body_analysis && (
                <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
                  <h2 className="text-lg md:text-xl font-semibold mb-4">Body Analysis</h2>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Posture</h3>
                      <p className="text-gray-600">{currentAnalysis.body_analysis.posture}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Body Type</h3>
                      <p className="text-gray-600">{currentAnalysis.body_analysis.body_type}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Proportions</h3>
                      <p className="text-gray-600">{currentAnalysis.body_analysis.proportions}</p>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-700 mb-1">Concerns</h3>
                      <ul className="list-disc list-inside text-gray-600 space-y-1">
                        {currentAnalysis.body_analysis.concerns.map((concern, index) => (
                          <li key={index}>{concern}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Improvement Plan */}
          {currentAnalysis.recommendations && (
            <div className="bg-white rounded-lg shadow-sm p-4 md:p-6">
              <h2 className="text-lg md:text-xl font-semibold mb-4">Improvement Plan</h2>
              <ImprovementPlan recommendations={currentAnalysis.recommendations} />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show photo capture interface for new analysis
  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">
          Take Your {step.replace(/([A-Z])/g, ' $1').toLowerCase()} Photo
        </h1>
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
        >
          <History className="w-5 h-5" />
          View History
        </button>
      </div>
      
      <PhotoCapture
        key={step}
        step={step as Exclude<AnalysisStep, 'results'>}
        instruction={STEP_INSTRUCTIONS[step as Exclude<AnalysisStep, 'results'>]}
        stepCount={{ current: STEP_ORDER.indexOf(step) + 1, total: STEP_ORDER.length - 1 }}
        onCapture={handleCapture}
        onNext={handleNext}
        isAnalyzing={isAnalyzing}
        error={error}
        currentImage={images[step]}
      />
    </div>
  );
};

const AnalysisWithErrorBoundary = () => (
  <ErrorBoundary>
    <Analysis />
  </ErrorBoundary>
);

export default AnalysisWithErrorBoundary;