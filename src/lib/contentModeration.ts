import { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY || '');

interface ModerationResult {
  isAcceptable: boolean;
  reason?: string;
}

export const moderateContent = async (content: string): Promise<ModerationResult> => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

    const prompt = `
      Please analyze the following content for any harmful, inappropriate, or offensive material.
      Consider the following criteria:
      - Hate speech or discrimination
      - Explicit adult content
      - Violence or gore
      - Harassment or bullying
      - Spam or misleading content
      - Personal attacks
      - Inappropriate language

      Content to analyze:
      "${content}"

      Return ONLY a JSON object (no markdown formatting, no code blocks) containing:
      {
        "isAcceptable": boolean (true if content is safe, false if it violates any criteria),
        "reason": string (explanation if content is not acceptable, null if acceptable)
      }
    `;

    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    try {
      // Clean up the response text by removing markdown formatting
      const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
      const moderationResult = JSON.parse(cleanJson);
      return {
        isAcceptable: moderationResult.isAcceptable,
        reason: moderationResult.reason
      };
    } catch (err) {
      console.error('Error parsing moderation result:', err);
      // Default to accepting content if we can't parse the result
      return { isAcceptable: true };
    }
  } catch (err) {
    console.error('Error moderating content:', err);
    // Default to accepting content if the API call fails
    return { isAcceptable: true };
  }
};

// Hook for content moderation
export const useContentModeration = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const checkContent = async (content: string): Promise<ModerationResult> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await moderateContent(content);
      
      // If content is not acceptable, set the error message
      if (!result.isAcceptable) {
        setError(result.reason || 'This content is not allowed');
      }
      
      return result;
    } catch (err) {
      const errorMessage = 'Failed to check content';
      setError(errorMessage);
      return { isAcceptable: true }; // Default to accepting if check fails
    } finally {
      setIsLoading(false);
    }
  };

  return {
    checkContent,
    isLoading,
    error,
    setError // Export setError to allow clearing the error state
  };
}; 