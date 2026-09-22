// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Loose payload shapes
//
// Review and defect records reach the UI from three sources — the live
// scrapers, Gemini's JSON output, and older rows already persisted in Supabase
// — and each names its fields slightly differently. These interfaces describe
// the union of those shapes with every field optional, which is what the
// rendering code actually copes with. They exist so call sites can stop using
// `any` while keeping the same defensive property access.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** A defect cluster as emitted by the analyzer, the AI, or a stored analysis. */
export interface LooseDefect {
  id?: string;
  title?: string;
  category?: string;
  subIssue?: string;
  severity?: string;
  sharePercentage?: number;
  frequencyPercent?: number;
  description?: string;
  rootCauseDiagnostic?: string;
  factoryFixAction?: string;
  listingGapAlert?: string;
  vernacularQuotes?: string[];
  customerQuoteSnippet?: string;
}

/** A single review, however the upstream source chose to name its fields. */
export interface LooseReview {
  id?: string;
  rating?: number;
  date?: string;
  author?: string;
  reviewerName?: string;
  title?: string;
  sentiment?: string;
  verified?: boolean;
  isSuspicious?: boolean;
  fakeScore?: number;
  fakeSignals?: string[];
  // Field-name variants seen across marketplaces and stored payloads.
  content?: string;
  text?: string;
  reviewText?: string;
  reviewBody?: string;
  body?: string;
  comment?: string;
}

/** First non-empty review body across the known field-name variants. */
export function reviewBody(review: LooseReview): string {
  return (
    review.content ||
    review.reviewText ||
    review.text ||
    review.comment ||
    review.reviewBody ||
    review.body ||
    ''
  );
}

/** A vernacular decode entry from the analyzer or a stored analysis. */
export interface LooseVernacular {
  context?: string;
  originalTerm?: string;
  englishMeaning?: string;
  rawVernacularText?: string;
  detectedLanguage?: string;
  decodedIntent?: string;
  businessImpactCategory?: string;
}

/** Competitor radar block, which older stored analyses may omit entirely. */
export interface LooseCompetitorRadar {
  industryBenchmarkRisk?: number;
  yourReturnRisk?: number;
  categoryRank?: string;
  competitors?: Array<{
    name?: string;
    benchmarkRisk?: number;
    reviewsCount?: number;
    advantage?: string;
  }>;
  keyTakeaways?: string[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Scraped hydration payloads
// ──────────────────────────────────────────────────────────────────────────────

/**
 * A node inside a decoded marketplace hydration payload (`__NEXT_DATA__`,
 * `window.__INITIAL_STATE__`, embedded JSON-LD). These documents have no
 * published schema and change without notice, so traversal probes properties
 * defensively and coerces whatever it finds via the helpers below.
 */
export type ScrapedNode = { [key: string]: unknown };

export function isScrapedNode(value: unknown): value is ScrapedNode {
  return typeof value === 'object' && value !== null;
}

/** Coerce to a non-empty trimmed string, or `undefined`. */
export function asString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

/** Coerce to a finite number, tolerating "₹1,299" style strings. */
export function asNumber(value: unknown): number | undefined {
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
  if (typeof value === 'string') {
    const parsed = parseFloat(value.replace(/[^0-9.]/g, ''));
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

/** First defined value among `keys`, coerced to a string. */
export function pickString(node: ScrapedNode, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const found = asString(node[key]);
    if (found !== undefined) return found;
  }
  return undefined;
}
