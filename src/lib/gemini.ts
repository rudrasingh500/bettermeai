import { GoogleGenerativeAI } from '@google/generative-ai';
import type { Profile } from './types';
import { HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

// Get API key from environment variables
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Validate API key exists
if (!GEMINI_API_KEY) {
  throw new Error('Missing Gemini API key. Please add VITE_GEMINI_API_KEY to your .env file.');
}

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: {
    temperature: 0.9,
    topP: 0.95,
    topK: 40,
    maxOutputTokens: 8192,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT" as HarmCategory,
      threshold: "BLOCK_NONE" as HarmBlockThreshold,
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH" as HarmCategory,
      threshold: "BLOCK_NONE" as HarmBlockThreshold,
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT" as HarmCategory,
      threshold: "BLOCK_NONE" as HarmBlockThreshold,
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT" as HarmCategory,
      threshold: "BLOCK_NONE" as HarmBlockThreshold,
    },
  ],
});

export interface AnalysisResult {
  facial_analysis: {
    face_shape: string;
    symmetry: string;
    proportions: string;
    notable_features: string[];
  };
  skin_analysis: {
    skin_type: string;
    texture: string;
    concerns: string[];
    recommendations: string[];
  };
  hair_analysis: {
    hair_type: string;
    texture: string;
    condition: string;
    recommendations: string[];
  };
  teeth_analysis: {
    alignment: string;
    color: string;
    health: string;
    concerns: string[];
    recommendations: string[];
  };
  body_analysis: {
    posture: string;
    body_type: string;
    proportions: string;
    concerns: string[];
    recommendations: string[];
  };
  recommendations: {
    skincare: string[];
    hairstyle: string[];
    dental: string[];
    fashion: string[];
    products: string[];
    improvements: string[];
    lifestyle: {
      fitness: string[];
      nutrition: string[];
      sleep: string[];
      posture: string[];
      grooming: string[];
      fashion: string[];
      dental: string[];
      confidence: string[];
    };
  };
  ratings: {
    face_rating: number;
    hair_rating: number;
    teeth_rating: number;
    body_rating: number;
    overall_rating: number;
  };
}

async function fileToGenerativePart(imageDataUrl: string) {
  try {
    // Validate image data URL format
    if (!imageDataUrl.startsWith('data:image/')) {
      throw new Error('Invalid image format. Must be a data URL.');
    }

    // Extract base64 data and mime type
    const matches = imageDataUrl.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      throw new Error('Invalid image data URL format');
    }

    const [, mimeType, base64Data] = matches;

    // Validate mime type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      throw new Error('Unsupported image format. Must be JPEG, PNG, or WebP.');
    }

    // Check if base64 data is valid
    try {
      atob(base64Data);
    } catch {
      throw new Error('Invalid base64 image data');
    }

    // Return the generative part
    return {
      inlineData: {
        data: base64Data,
        mimeType: mimeType
      }
    };
  } catch (error) {
    console.error('Error converting file to generative part:', error);
    throw new Error('Failed to process image data: ' + (error instanceof Error ? error.message : 'Unknown error'));
  }
}

function validateAnalysisResult(data: any): data is AnalysisResult {
  try {
    if (!data || typeof data !== 'object') return false;

    // Check required sections
    const requiredSections = [
      'facial_analysis', 'skin_analysis', 'hair_analysis',
      'teeth_analysis', 'body_analysis', 'recommendations', 'ratings'
    ];
    if (!requiredSections.every(section => section in data)) return false;

    // Validate ratings
    const { ratings } = data;
    if (!ratings || typeof ratings !== 'object') return false;
    const requiredRatings = [
      'face_rating', 'hair_rating', 'teeth_rating',
      'body_rating', 'overall_rating'
    ];
    if (!requiredRatings.every(rating => rating in ratings)) return false;
    if (!requiredRatings.every(rating => typeof ratings[rating] === 'number')) return false;

    // Validate arrays
    if (!Array.isArray(data.facial_analysis.notable_features)) return false;
    if (!Array.isArray(data.skin_analysis.concerns)) return false;
    if (!Array.isArray(data.skin_analysis.recommendations)) return false;
    if (!Array.isArray(data.hair_analysis.recommendations)) return false;
    if (!Array.isArray(data.teeth_analysis.concerns)) return false;
    if (!Array.isArray(data.teeth_analysis.recommendations)) return false;
    if (!Array.isArray(data.body_analysis.concerns)) return false;
    if (!Array.isArray(data.body_analysis.recommendations)) return false;
    if (!Array.isArray(data.recommendations.skincare)) return false;
    if (!Array.isArray(data.recommendations.hairstyle)) return false;
    if (!Array.isArray(data.recommendations.dental)) return false;
    if (!Array.isArray(data.recommendations.fashion)) return false;
    if (!Array.isArray(data.recommendations.products)) return false;
    if (!Array.isArray(data.recommendations.improvements)) return false;

    // Validate lifestyle recommendations
    const { lifestyle } = data.recommendations;
    if (!lifestyle || typeof lifestyle !== 'object') return false;
    const requiredLifestyleCategories = [
      'fitness', 'nutrition', 'sleep', 'posture',
      'grooming', 'fashion', 'dental', 'confidence'
    ];
    if (!requiredLifestyleCategories.every(category => category in lifestyle)) return false;
    if (!requiredLifestyleCategories.every(category => Array.isArray(lifestyle[category]))) return false;

    return true;
  } catch (error) {
    console.error('Error validating analysis result:', error);
    return false;
  }
}

function cleanJsonResponse(text: string): string {
  try {
    // First try to parse as is
    JSON.parse(text);
    return text;
  } catch {
    try {
      // Remove markdown code block if present
      let cleaned = text.replace(/^```(?:json)?\n/, '').replace(/\n```$/, '');
      
      // Remove any leading/trailing whitespace
      cleaned = cleaned.trim();
      
      // Try to find the start and end of the JSON object
      const startIndex = cleaned.indexOf('{');
      const endIndex = cleaned.lastIndexOf('}');
      
      if (startIndex === -1 || endIndex === -1) {
        throw new Error('No valid JSON object found in response');
      }
      
      // Extract just the JSON object
      cleaned = cleaned.slice(startIndex, endIndex + 1);
      
      // Validate that it's parseable
      JSON.parse(cleaned);
      
      return cleaned;
    } catch (error) {
      console.error('Failed to clean JSON response:', error);
      throw new Error('Could not extract valid JSON from response');
    }
  }
}

export const analyzeImages = async (
  frontImage: string,
  leftSideImage: string,
  rightSideImage: string,
  hairImage: string,
  teethImage: string,
  bodyImage: string,
  gender: Profile['gender']
): Promise<AnalysisResult | 'Image too blurry'> => {
  try {
    if (!frontImage || !leftSideImage || !rightSideImage || !hairImage || !teethImage || !bodyImage) {
      throw new Error('All images are required');
    }

    const imageParts = await Promise.all([
      fileToGenerativePart(frontImage),
      fileToGenerativePart(leftSideImage),
      fileToGenerativePart(rightSideImage),
      fileToGenerativePart(hairImage),
      fileToGenerativePart(teethImage),
      fileToGenerativePart(bodyImage)
    ]);

    const [
      frontImagePart,
      leftSideImagePart,
      rightSideImagePart,
      hairImagePart,
      teethImagePart,
      bodyImagePart
    ] = imageParts;

    const genderSpecificPrompt = gender === 'female' 
      ? 'Consider diverse feminine beauty standards across cultures, emphasizing individuality and inclusivity while remaining sensitive to common aesthetic principles.'
      : gender === 'male'
      ? 'Consider diverse masculine beauty standards across cultures, emphasizing individuality and inclusivity while remaining sensitive to common aesthetic principles.'
      : 'Consider diverse gender-neutral beauty standards across cultures, emphasizing individuality and inclusivity while remaining sensitive to common aesthetic principles.';

    const prompt = `Analyze these facial, hair, teeth, and body images and provide a detailed analysis in JSON format. First, evaluate if any images are too blurry, poorly lit, or otherwise unclear. If so, respond with exactly "Image too blurry" and nothing else.

        If all images are clear enough, provide your analysis in the following JSON structure. IMPORTANT: The response must be valid JSON that can be parsed with JSON.parse(). DO NOT include any markdown formatting or code blocks.

        For your analysis, adhere to the following guidelines:
        - Use an objective and constructive tone, avoiding subjective or overly critical language.
        - Ratings should be based on measurable and observable characteristics, ensuring honesty and consistency.
        - Recommendations must be actionable, practical, and prioritize the user's health, confidence, and well-being over cosmetic changes.

        ${genderSpecificPrompt}

        {
          "facial_analysis": {
            "face_shape": "detailed description of face shape",
            "symmetry": "detailed analysis of facial symmetry, noting both strengths and areas for improvement",
            "proportions": "objective analysis of facial proportions based on standardized ratios",
            "notable_features": ["list", "of", "distinctive", "features"]
          },
          "skin_analysis": {
            "skin_type": "description of skin type based on observable characteristics (e.g., oily, dry, combination, normal)",
            "texture": "description of skin texture, including any visible irregularities",
            "concerns": ["list", "of", "skin", "concerns (if any)"],
            "recommendations": ["specific, actionable, and achievable", "skincare", "steps or products"]
          },
          "hair_analysis": {
            "hair_type": "description of hair type (e.g., straight, wavy, curly, coily)",
            "texture": "description of hair texture (e.g., fine, coarse, thick)",
            "condition": "objective analysis of hair condition, noting both strengths and areas for improvement",
            "recommendations": ["specific", "hair", "care", "recommendations tailored to user needs"]
          },
          "teeth_analysis": {
            "alignment": "objective description of teeth alignment",
            "color": "analysis of teeth color, considering natural variation and potential for whitening",
            "health": "overall dental health assessment based on visible factors",
            "concerns": ["list", "of", "dental", "concerns (if any)"],
            "recommendations": ["specific, practical", "dental", "care", "steps or products"]
          },
          "body_analysis": {
            "posture": "objective analysis of posture and alignment",
            "body_type": "description of body type based on observable traits",
            "proportions": "analysis of body proportions relative to general balance and symmetry",
            "concerns": ["list", "of", "body", "concerns (if any)"],
            "recommendations": ["specific, actionable", "steps for", "fitness or posture improvement"]
          },
          "recommendations": {
            "skincare": ["specific", "and", "practical", "skincare", "routine", "steps"],
            "hairstyle": ["hairstyle suggestions", "based on hair type and face shape"],
            "dental": ["specific", "dental", "care", "recommendations"],
            "fashion": ["clothing", "style", "recommendations tailored to body proportions"],
            "products": ["specific", "product", "recommendations", "with justifications"],
            "improvements": ["areas", "for", "improvement with actionable advice"],
            "lifestyle": {
              "fitness": ["fitness recommendations tailored to body type and goals"],
              "nutrition": ["dietary suggestions for balanced health"],
              "sleep": ["practical sleep improvement tips"],
              "posture": ["actionable posture correction advice"],
              "grooming": ["customized grooming routine steps"],
              "fashion": ["personalized style suggestions"],
              "dental": ["dental care tips for long-term health"],
              "confidence": ["confidence-building suggestions grounded in self-acceptance"]
            }
          },
          "ratings": {
            "face_rating": number between 1-10,
            "hair_rating": number between 1-10,
            "teeth_rating": number between 1-10,
            "body_rating": number between 1-10,
            "overall_rating": weighted average
          }
        }

        Ensure all ratings are on a scale of 1-10, where:
        1-3: Needs significant improvement
        4-6: Average, room for improvement
        7-8: Above average
        9-10: Exceptional

        Base the overall_rating on a weighted average:
        - Face: 35%
        - Hair: 25%
        - Teeth: 20%
        - Body: 20%

        Focus on providing insights and advice that empower the user to make informed, positive changes. Avoid judgments and prioritize constructive feedback.
        CRITICAL: Your response must be ONLY the JSON object, with no additional text before or after.`;


    const result = await model.generateContent({
      contents: [{
        role: 'user',
        parts: [
          { text: prompt },
          frontImagePart,
          leftSideImagePart,
          rightSideImagePart,
          hairImagePart,
          teethImagePart,
          bodyImagePart
        ]
      }],
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 0.7,
        topP: 0.8,
        topK: 40,
      }
    });

    const response = await result.response;
    const text = response.text();
    
    if (!text) {
      throw new Error('No analysis generated');
    }

    if (text.trim() === 'Image too blurry') {
      return 'Image too blurry';
    }
    
    try {
      // Add more detailed logging for debugging
      console.debug('Raw AI response:', text);
      
      const cleanedText = cleanJsonResponse(text);
      console.debug('Cleaned JSON:', cleanedText);
      
      const parsedResponse = JSON.parse(cleanedText);
      console.debug('Parsed response:', parsedResponse);

      if (!validateAnalysisResult(parsedResponse)) {
        console.error('Invalid response structure:', parsedResponse);
        throw new Error('Invalid analysis result structure');
      }

      // Ensure ratings are within bounds and are numbers
      const { ratings } = parsedResponse;
      Object.keys(ratings).forEach(key => {
        const value = ratings[key as keyof typeof ratings];
        if (typeof value === 'string') {
          ratings[key as keyof typeof ratings] = parseFloat(value);
        }
        ratings[key as keyof typeof ratings] = Math.max(1, Math.min(10, Number(ratings[key as keyof typeof ratings])));
      });

      return parsedResponse;
    } catch (error) {
      console.error('Error parsing JSON response:', error);
      console.error('Raw response:', text);
      throw new Error('Failed to parse analysis results. Please try again.');
    }
  } catch (error) {
    console.error('Error analyzing images:', error);
    if (error instanceof Error) {
      throw new Error(`Analysis failed: ${error.message}`);
    }
    throw new Error('Failed to analyze images. Please try again.');
  }
};