import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, Users, Sparkles, Lock } from 'lucide-react';

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-12 md:pt-20 pb-12 md:pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-3xl md:text-6xl font-bold text-gray-900 mb-4 md:mb-6">
            Discover Your Best Look with AI
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-6 md:mb-8 px-4">
            Get personalized recommendations for your facial features, hair, and style using advanced AI analysis.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="bg-blue-600 text-white px-6 md:px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transform hover:scale-105 transition-all"
          >
            Get Started
          </button>
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-12 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Analysis</h3>
              <p className="text-gray-600">
                Get detailed analysis of your facial features and personalized recommendations.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Community</h3>
              <p className="text-gray-600">
                Connect with others on similar journeys and share experiences.
              </p>
            </div>

            <div className="text-center p-6">
              <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Progress</h3>
              <p className="text-gray-600">
                Monitor your improvements over time with detailed history.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Notice */}
      <div className="bg-gray-50 py-8 md:py-12">
        <div className="container mx-auto px-4 max-w-4xl text-center">
          <div className="flex items-center justify-center mb-4">
            <Lock className="w-6 h-6 text-gray-600 mr-2" />
            <h3 className="text-xl font-semibold">Your Privacy Matters</h3>
          </div>
          <p className="text-gray-600 px-4">
            Your data is securely stored and never shared. We use state-of-the-art encryption to protect your information.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Landing;