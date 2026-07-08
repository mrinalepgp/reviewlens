import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface AnalysisResult {
  sentiment: Sentiment;
  detected_issue: string;
}

const SYSTEM_PROMPT = `
You are an expert AI vernacular analyst for Indian e-commerce platforms.
Your task is to analyze product reviews written in mixed vernaculars such as Hinglish, Benglish, or other regional dialects written in Latin scripts.
You must extract the underlying sentiment and categorize any specific issue raised.
`;

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    sentiment: {
      type: SchemaType.STRING,
      description: "Must be exactly one of: 'positive', 'negative', 'neutral'",
    },
    detected_issue: {
      type: SchemaType.STRING,
      description: "A short descriptive category string (e.g., 'Size Misalignment', 'Battery Defect') or 'none' if no issue exists.",
    },
  },
  required: ["sentiment", "detected_issue"],
};

/**
 * Analyzes a given e-commerce review using Gemini to extract
 * sentiment and specific detected issues, particularly focused on Indian vernaculars.
 * 
 * @param reviewText The raw review text
 * @returns A strongly-typed AnalysisResult object.
 */
export async function analyzeReviewSentiment(reviewText: string): Promise<AnalysisResult> {
  try {
    console.log(`[AI] Dispatching sentiment analysis for text snippet via Gemini...`);
    
    if (!process.env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is missing from environment variables");
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
        temperature: 0.1,
      },
    });

    const result = await model.generateContent(`Review: "${reviewText}"`);
    const outputContent = result.response.text();
    
    if (!outputContent) {
      throw new Error('Received empty response payload from Gemini');
    }

    // Safely parse the strict JSON response format requested
    const parsedData = JSON.parse(outputContent) as AnalysisResult;
    
    // Basic runtime validation guard rails
    if (!['positive', 'negative', 'neutral'].includes(parsedData.sentiment)) {
        parsedData.sentiment = 'neutral';
    }
    
    if (typeof parsedData.detected_issue !== 'string') {
        parsedData.detected_issue = 'none';
    }

    console.log(`[AI] Analysis complete: [${parsedData.sentiment.toUpperCase()}] Issue: ${parsedData.detected_issue}`);
    return parsedData;

  } catch (error) {
    console.error('[AI] Fatal error during review sentiment analysis:', error);
    // Return a safe fallback to prevent the data processing pipeline from crashing entirely
    return {
      sentiment: 'neutral',
      detected_issue: 'analysis_error'
    };
  }
}
