import { GoogleGenerativeAI, Schema, SchemaType } from "@google/generative-ai";
import { errorMessage } from './errors';
// Type-only import: erased at compile time, so this does not create a runtime
// cycle with scraper.ts, which imports cleanAndParseJSON from here.
import type { EnterpriseIntelligence } from './scraper';

/** The single method `generateContentSafe` needs from a Gemini model handle. */
interface GenerativeModelLike {
  generateContent(prompt: string): Promise<{ response: { text(): string } }>;
}

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

export function cleanAndParseJSON(rawText: string) {
  let clean = rawText.trim();
  // Remove markdown ```json and ``` if present
  clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  return JSON.parse(clean);
}

/** Pull an HTTP status off an SDK error shaped as `{status}` or `{response:{status}}`. */
function httpStatusOf(err: unknown): number | undefined {
  if (!err || typeof err !== 'object') return undefined;
  const direct = (err as { status?: unknown }).status;
  if (typeof direct === 'number') return direct;
  const nested = (err as { response?: { status?: unknown } }).response?.status;
  return typeof nested === 'number' ? nested : undefined;
}

async function generateContentSafe(model: GenerativeModelLike, prompt: string, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await model.generateContent(prompt);
    } catch (err) {
      if (i === retries - 1) throw err;
      const status = httpStatusOf(err);
      if (status === 429 || status === 503 || errorMessage(err).includes('503') || errorMessage(err).includes('429')) {
        console.warn(`[AI] Gemini rate limit/busy (503/429), pausing 2s before attempt ${i + 2}...`);
        await new Promise((res) => setTimeout(res, 2000));
      } else {
        throw err;
      }
    }
  }
  // Unreachable while retries >= 1, but keeps the return type non-nullable.
  throw new Error(`[AI] Gemini call failed after ${retries} attempts`);
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
        temperature: 0.2,
        topP: 0.8,
        maxOutputTokens: 8192,
      },
    });

    const result = await generateContentSafe(model, `Review: "${reviewText}"`);
    const outputContent = result.response.text();

    if (!outputContent) {
      throw new Error('Received empty response payload from Gemini');
    }

    // Safely parse the strict JSON response format requested
    let parsedData: AnalysisResult;
    try {
      parsedData = cleanAndParseJSON(outputContent) as AnalysisResult;
    } catch (err) {
      console.error('[AI] JSON Parse Error in analyzeReviewSentiment:', errorMessage(err), 'Raw text:', outputContent);
      return { sentiment: 'neutral', detected_issue: 'analysis_error' };
    }

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

export async function generateHeadToHeadComparison(
  baseIntelligence: EnterpriseIntelligence,
  rivalIntelligence: EnterpriseIntelligence
): Promise<HeadToHeadMatrix> {
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
      topP: 0.8,
      maxOutputTokens: 8192,
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
    
    try {
      return cleanAndParseJSON(outputContent) as HeadToHeadMatrix;
    } catch (parseError) {
      console.error('[AI] JSON Parse Error in generateHeadToHeadComparison:', errorMessage(parseError), 'Raw text:', outputContent);
      throw parseError; // Caught by outer try-catch for fallback
    }
  } catch (error) {
    console.error('[AI] Failed to generate head-to-head matrix:', error);
    // Fallback stub
    return {
      clashScorecard: {
        ourRisk: baseIntelligence?.executiveScorecard?.returnRiskScore || 0,
        theirRisk: rivalIntelligence?.executiveScorecard?.returnRiskScore || 0,
        ourHealth: baseIntelligence?.executiveScorecard?.listingHealthScore || 0,
        theirHealth: rivalIntelligence?.executiveScorecard?.listingHealthScore || 0,
        ourRating: 0,
        theirRating: 0
      },
      whereYouWin: ["Analysis failed to generate advantages."],
      whereTheyWin: ["Analysis failed to generate vulnerabilities."],
      marketStealStrategy: ["Please try running the comparison again."]
    };
  }
}