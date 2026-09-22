// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Fake Review & Bot Radar
//
// Scores each review against five independent signals and reports which ones
// fired, so a flag can always be justified to the seller. Deterministic — the
// same review set always produces the same verdict.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface RadarReview {
  id?: string;
  content: string;
  rating: number;
  author?: string;
  date?: string;
  verified?: boolean;
}

export type FakeSignal =
  | 'duplicate_text'
  | 'temporal_spike'
  | 'generic_five_star'
  | 'unverified_extreme'
  | 'template_vocabulary';

export interface ReviewVerdict {
  id: string;
  /** 0–1. Sum of fired signal weights, clamped. */
  fakeScore: number;
  isSuspected: boolean;
  signals: FakeSignal[];
}

export interface RadarResult {
  verdicts: ReviewVerdict[];
  suspectedCount: number;
  suspectedPercentage: number;
  /** 0–100, higher is cleaner. */
  authenticityScore: number;
  /** Dates where review volume exceeded the spike threshold. */
  spikeDates: string[];
  signalTally: Record<FakeSignal, number>;
}

const SIGNAL_WEIGHTS: Record<FakeSignal, number> = {
  duplicate_text: 0.45,
  temporal_spike: 0.25,
  generic_five_star: 0.20,
  unverified_extreme: 0.20,
  template_vocabulary: 0.25,
};

/** A review is flagged once its combined score reaches this threshold. */
export const SUSPICION_THRESHOLD = 0.45;

/** Below this word count a 5★ review carries no specific information. */
const GENERIC_WORD_LIMIT = 6;

/** A day's volume this many times the daily mean is treated as a spike. */
const SPIKE_MULTIPLIER = 3;

/** Minimum reviews before temporal analysis is meaningful. */
const MIN_REVIEWS_FOR_TEMPORAL = 12;

const STOPWORDS = new Set([
  'the', 'and', 'for', 'this', 'that', 'with', 'was', 'are', 'its', 'but', 'you',
  'very', 'all', 'has', 'have', 'from', 'not', 'too', 'out', 'can', 'will',
]);

function normalizeText(text: string): string {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

function dayKey(date: string | undefined): string | null {
  if (!date) return null;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Bag-of-words Jaccard similarity, ignoring stopwords. */
function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

const NEAR_DUPLICATE_THRESHOLD = 0.8;

export function analyzeReviewAuthenticity(reviews: RadarReview[]): RadarResult {
  const emptyTally: Record<FakeSignal, number> = {
    duplicate_text: 0,
    temporal_spike: 0,
    generic_five_star: 0,
    unverified_extreme: 0,
    template_vocabulary: 0,
  };

  if (!Array.isArray(reviews) || reviews.length === 0) {
    return {
      verdicts: [],
      suspectedCount: 0,
      suspectedPercentage: 0,
      authenticityScore: 100,
      spikeDates: [],
      signalTally: emptyTally,
    };
  }

  const prepared = reviews.map((r, idx) => {
    const normalized = normalizeText(r.content);
    const tokens = new Set(normalized.split(' ').filter((t) => t.length > 2 && !STOPWORDS.has(t)));
    return {
      review: r,
      id: r.id ?? `review_${idx}`,
      normalized,
      tokens,
      day: dayKey(r.date),
      wordCount: normalized ? normalized.split(' ').length : 0,
    };
  });

  // ── Signal 1: exact / near-duplicate bodies ────────────────────────────────
  const duplicateIds = new Set<string>();
  const seenExact = new Map<string, string>();
  for (const item of prepared) {
    if (!item.normalized) continue;
    const priorId = seenExact.get(item.normalized);
    if (priorId) {
      duplicateIds.add(item.id);
      duplicateIds.add(priorId);
    } else {
      seenExact.set(item.normalized, item.id);
    }
  }
  // Near-duplicates are O(n^2); cap the comparison window so a 500-review audit
  // stays responsive.
  const NEAR_DUP_WINDOW = 250;
  const window = prepared.slice(0, NEAR_DUP_WINDOW);
  for (let i = 0; i < window.length; i += 1) {
    for (let j = i + 1; j < window.length; j += 1) {
      if (duplicateIds.has(window[i].id) && duplicateIds.has(window[j].id)) continue;
      if (similarity(window[i].tokens, window[j].tokens) >= NEAR_DUPLICATE_THRESHOLD) {
        duplicateIds.add(window[i].id);
        duplicateIds.add(window[j].id);
      }
    }
  }

  // ── Signal 2: temporal posting spikes ──────────────────────────────────────
  const spikeDates: string[] = [];
  const dated = prepared.filter((p) => p.day);
  if (dated.length >= MIN_REVIEWS_FOR_TEMPORAL) {
    const perDay = new Map<string, number>();
    for (const item of dated) perDay.set(item.day!, (perDay.get(item.day!) ?? 0) + 1);
    const mean = dated.length / perDay.size;
    for (const [day, count] of perDay) {
      if (count >= mean * SPIKE_MULTIPLIER && count > 2) spikeDates.push(day);
    }
  }
  const spikeSet = new Set(spikeDates);

  // ── Signal 5: template vocabulary among top-rated reviews ──────────────────
  // Phrases repeated verbatim across many 5★ reviews indicate a supplied script.
  const fiveStar = prepared.filter((p) => p.review.rating >= 5 && p.wordCount >= 4);
  const bigramCounts = new Map<string, number>();
  for (const item of fiveStar) {
    const words = item.normalized.split(' ');
    const seenInThisReview = new Set<string>();
    for (let i = 0; i < words.length - 1; i += 1) {
      const bigram = `${words[i]} ${words[i + 1]}`;
      if (seenInThisReview.has(bigram)) continue;
      seenInThisReview.add(bigram);
      bigramCounts.set(bigram, (bigramCounts.get(bigram) ?? 0) + 1);
    }
  }
  const templateThreshold = Math.max(3, Math.ceil(fiveStar.length * 0.4));
  const templateBigrams = new Set(
    [...bigramCounts.entries()].filter(([, count]) => count >= templateThreshold).map(([bigram]) => bigram)
  );

  // ── Score every review ─────────────────────────────────────────────────────
  const signalTally = { ...emptyTally };
  const verdicts: ReviewVerdict[] = prepared.map((item) => {
    const signals: FakeSignal[] = [];

    if (duplicateIds.has(item.id)) signals.push('duplicate_text');
    if (item.day && spikeSet.has(item.day)) signals.push('temporal_spike');
    if (item.review.rating >= 5 && item.wordCount > 0 && item.wordCount <= GENERIC_WORD_LIMIT) {
      signals.push('generic_five_star');
    }
    if (item.review.verified === false && (item.review.rating >= 5 || item.review.rating <= 1)) {
      signals.push('unverified_extreme');
    }
    if (templateBigrams.size > 0 && item.review.rating >= 5) {
      const words = item.normalized.split(' ');
      const hasTemplate = words.some((_, i) => i < words.length - 1 && templateBigrams.has(`${words[i]} ${words[i + 1]}`));
      if (hasTemplate) signals.push('template_vocabulary');
    }

    for (const signal of signals) signalTally[signal] += 1;

    const fakeScore = Math.min(
      1,
      signals.reduce((acc, signal) => acc + SIGNAL_WEIGHTS[signal], 0)
    );

    return {
      id: item.id,
      fakeScore: Number(fakeScore.toFixed(3)),
      isSuspected: fakeScore >= SUSPICION_THRESHOLD,
      signals,
    };
  });

  const suspectedCount = verdicts.filter((v) => v.isSuspected).length;
  const suspectedPercentage = Number(((suspectedCount / verdicts.length) * 100).toFixed(1));

  return {
    verdicts,
    suspectedCount,
    suspectedPercentage,
    authenticityScore: Number((100 - suspectedPercentage).toFixed(1)),
    spikeDates: spikeDates.sort(),
    signalTally,
  };
}

export const SIGNAL_LABELS: Record<FakeSignal, string> = {
  duplicate_text: 'Duplicate or near-duplicate review body',
  temporal_spike: 'Posted during an abnormal review-volume spike',
  generic_five_star: 'Five-star rating with no specific content',
  unverified_extreme: 'Unverified buyer leaving an extreme rating',
  template_vocabulary: 'Repeats phrasing templated across other five-star reviews',
};
