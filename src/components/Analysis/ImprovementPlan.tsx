import React from 'react';
import type { AnalysisResult } from '../../lib/gemini';

interface ImprovementPlanProps {
  recommendations: AnalysisResult['recommendations'];
}

export const ImprovementPlan: React.FC<ImprovementPlanProps> = ({
  recommendations
}) => {
  const renderSection = (title: string, items: string[]) => (
    <div className="space-y-3">
      <h4 className="font-medium text-gray-900 text-sm md:text-base">{title}</h4>
      <ul className="list-disc list-inside text-gray-600 space-y-2 text-sm md:text-base">
        {items.map((item, index) => (
          <li key={index} className="leading-relaxed">{item}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {recommendations.skincare.length > 0 && (
          <div className="bg-blue-50 rounded-lg p-4 md:p-6">
            {renderSection('Skincare Routine', recommendations.skincare)}
          </div>
        )}
        {recommendations.hairstyle.length > 0 && (
          <div className="bg-purple-50 rounded-lg p-4 md:p-6">
            {renderSection('Hairstyle Changes', recommendations.hairstyle)}
          </div>
        )}
        {recommendations.products.length > 0 && (
          <div className="bg-green-50 rounded-lg p-4 md:p-6">
            {renderSection('Recommended Products', recommendations.products)}
          </div>
        )}
      </div>

      {recommendations.lifestyle && (
        <div className="bg-gray-50 rounded-lg p-4 md:p-6">
          <h3 className="text-lg md:text-xl font-semibold text-gray-900 mb-4">
            Lifestyle Recommendations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {Object.entries(recommendations.lifestyle).map(([category, items]) => (
              <div key={category}>
                {renderSection(
                  category.charAt(0).toUpperCase() + category.slice(1),
                  items
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};