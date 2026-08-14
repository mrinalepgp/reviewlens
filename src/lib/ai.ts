import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";

export type Sentiment = 'positive' | 'negative' | 'neutral';

export interface AnalysisResult {
  sentiment: Sentiment;
  detected_issue: string;
}

const SYSTEM_PROMPT = `
You are an expert AI vernacular analyst for Indian digital platforms, spanning e-commerce (Flipkart, Meesho, Amazon), social commerce (Facebook), and food delivery networks (Zomato, Swiggy).

Your task is to analyze customer reviews written in mixed vernaculars such as Hinglish, Benglish, or other regional dialects written in Latin scripts.
You must extract the underlying sentiment and categorize any specific issue raised.

Tailor your issue detection based on the context:
- For Food Delivery (Zomato/Swiggy): Detect food-specific issues like 'Cold Food', 'Packaging Leakage', 'Portion Size', 'Late Delivery', 'Wrong Item', 'Taste Issue'.
- For E-commerce/Social (Amazon/Flipkart/Meesho/Facebook): Detect product-specific issues like 'Size Misalignment', 'Fabric Defect', 'Delayed Shipping', 'Fake Product', 'Color Mismatch'.
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
      description: "A short descriptive category string matching the context (e.g., 'Cold Food', 'Size Misalignment') or 'none' if no clear issue exists.",
    },
  },
  required: ["sentiment", "detected_issue"],
};

async function generateContentSafe(model: any, prompt: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err: any) {
      if (i === retries - 1) throw err;
      console.warn(`[AI] Gemini busy, retrying attempt ${i + 2}...`);
      await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
    }
  }
}

/**
 * Analyzes a given platform review using Gemini to extract
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

    const result = await generateContentSafe(model, `Review: "${reviewText}"`);
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

export interface HeadToHeadMatrix {
  clashScorecard: {
    ourRisk: number;
    theirRisk: number;
    ourHealth: number;
    theirHealth: number;
    ourRating: number;
    theirRating: number;
  };
  whereYouWin: string[];
  whereTheyWin: string[];
  marketStealStrategy: string[];
}

export async function generateHeadToHeadComparison(baseIntelligence: any, rivalIntelligence: any): Promise<HeadToHeadMatrix> {
  console.log(`[AI] Generating Head-to-Head Comparison Matrix...`);

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing from environment variables");
  }

  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

  const schema: Schema = {
    type: SchemaType.OBJECT,
    properties: {
      clashScorecard: {
        type: SchemaType.OBJECT,
        properties: {
          ourRisk: { type: SchemaType.NUMBER },
          theirRisk: { type: SchemaType.NUMBER },
          ourHealth: { type: SchemaType.NUMBER },
          theirHealth: { type: SchemaType.NUMBER },
          ourRating: { type: SchemaType.NUMBER },
          theirRating: { type: SchemaType.NUMBER }
        },
        required: ["ourRisk", "theirRisk", "ourHealth", "theirHealth", "ourRating", "theirRating"]
      },
      whereYouWin: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Specific product/packaging advantages we have over the competitor."
      },
      whereTheyWin: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "What customers praise about the rival (our vulnerabilities)."
      },
      marketStealStrategy: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
        description: "Direct actionable tactics to outrank them based on the gaps."
      }
    },
    required: ["clashScorecard", "whereYouWin", "whereTheyWin", "marketStealStrategy"]
  };

  const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    systemInstruction: "You are an expert e-commerce competitive intelligence AI. Analyze the two product intelligence payloads and output a direct, actionable Head-to-Head Matrix.",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.2,
    },
  });

  const prompt = `
Base Product Intelligence:
${JSON.stringify(baseIntelligence, null, 2)}

Competitor Product Intelligence:
${JSON.stringify(rivalIntelligence, null, 2)}
  `;

  try {
    const result = await generateContentSafe(model, prompt);
    const outputContent = result.response.text();
    if (!outputContent) throw new Error('Empty response');
    
    return JSON.parse(outputContent) as HeadToHeadMatrix;
  } catch (error) {
    console.error('[AI] Failed to generate head-to-head matrix:', error);
    // Fallback stub
    return {
      clashScorecard: {
        ourRisk: baseIntelligence?.productSummary?.returnRiskScore || 0,
        theirRisk: rivalIntelligence?.productSummary?.returnRiskScore || 0,
        ourHealth: baseIntelligence?.productSummary?.listingHealthScore || 0,
        theirHealth: rivalIntelligence?.productSummary?.listingHealthScore || 0,
        ourRating: 0,
        theirRating: 0
      },
      whereYouWin: ["Analysis failed to generate advantages."],
      whereTheyWin: ["Analysis failed to generate vulnerabilities."],
      marketStealStrategy: ["Please try running the comparison again."]
    };
  }
}