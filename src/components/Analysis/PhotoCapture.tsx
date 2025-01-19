import React, { useRef, useState, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, RotateCw, ArrowRight, Loader2 } from 'lucide-react';
import type { AnalysisStep } from './types';

const WEBCAM_CONFIG = {
  width: { min: 720, ideal: 1280 },
  height: { min: 480, ideal: 720 },
  facingMode: 'user',
  screenshotFormat: 'image/jpeg',
  screenshotQuality: 0.92
};

interface PhotoCaptureProps {
  step: Exclude<AnalysisStep, 'results'>;
  instruction: string;
  stepCount: { current: number; total: number };
  onCapture: (imageSrc: string) => void;
  onNext: () => void;
  isAnalyzing?: boolean;
  error?: string | null;
  currentImage?: string;
}

export const PhotoCapture: React.FC<PhotoCaptureProps> = ({
  step,
  instruction,
  stepCount,
  onCapture,
  onNext,
  isAnalyzing,
  error,
  currentImage
}) => {
  const webcamRef = useRef<Webcam>(null);
  const [showReview, setShowReview] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Reset review state when step changes
  useEffect(() => {
    setShowReview(false);
  }, [step]);

  const handleCapture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return;
    
    setShowReview(true);
    onCapture(imageSrc);
  };

  const handleRetake = () => {
    setShowReview(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow-md p-4 md:p-6">
        <div className="mb-4">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-2">
            Step {stepCount.current} of {stepCount.total}
          </h3>
          <p className="text-gray-600">{instruction}</p>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-50 text-red-600 rounded-lg text-sm md:text-base">
            {error}
          </div>
        )}

        {showReview ? (
          <div className="space-y-4">
            <img 
              src={currentImage} 
              alt="Captured photo"
              className="w-full max-h-[70vh] object-contain rounded-lg"
            />
            <div className="flex flex-col md:flex-row justify-center gap-4">
              <button
                onClick={handleRetake}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 w-full md:w-auto"
              >
                <RotateCw className="w-5 h-5" />
                Retake
              </button>
              <button
                onClick={onNext}
                disabled={isAnalyzing}
                className="flex items-center justify-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto"
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    {step === 'body' ? 'Analyze' : 'Next'}
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                  ...WEBCAM_CONFIG,
                  facingMode: isMobile ? 'environment' : 'user'
                }}
                className="absolute inset-0 w-full h-full object-cover"
              />
            </div>
            
            <div className="mt-6 flex justify-center">
              <button
                onClick={handleCapture}
                className="flex items-center justify-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 w-full md:w-auto"
              >
                <Camera className="w-5 h-5" />
                Capture
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};