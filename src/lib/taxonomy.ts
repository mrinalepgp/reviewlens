// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dynamic defect taxonomy
//
// In-process mirror of `public.defect_taxonomies`
// (supabase/migrations/20260922090100_defect_taxonomy_seed.sql). Kept local so
// the analysis pipeline never blocks on a database round trip; `loadTaxonomy()`
// overlays any rows an admin has added through the console.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface TaxonomyEntry {
  category: string;
  aspect: string;
  defectLabel: string;
  keywords: string[];
  severityWeight: number;
  returnRiskFactor: number;
}

export const ASPECTS = ['Durability', 'Packaging', 'Usability', 'Delivery', 'Sizing'] as const;
export type Aspect = (typeof ASPECTS)[number];

export const DEFAULT_TAXONOMY: TaxonomyEntry[] = [
  // Electronics
  { category: 'Electronics', aspect: 'Durability', defectLabel: 'Screen Burn-In', keywords: ['screen burn', 'burn in', 'dead pixel', 'discolour', 'discolor', 'ghosting'], severityWeight: 0.85, returnRiskFactor: 0.62 },
  { category: 'Electronics', aspect: 'Usability', defectLabel: 'Audio Lag', keywords: ['audio lag', 'sound delay', 'latency', 'out of sync', 'lip sync'], severityWeight: 0.60, returnRiskFactor: 0.38 },
  { category: 'Electronics', aspect: 'Durability', defectLabel: 'Battery Drain', keywords: ['battery drain', 'battery backup', 'discharge', 'charge quickly', 'drains'], severityWeight: 0.75, returnRiskFactor: 0.55 },
  { category: 'Electronics', aspect: 'Durability', defectLabel: 'Overheating', keywords: ['overheat', 'heating', 'too hot', 'thermal'], severityWeight: 0.80, returnRiskFactor: 0.58 },
  { category: 'Electronics', aspect: 'Packaging', defectLabel: 'Damaged On Arrival', keywords: ['damaged', 'broken on arrival', 'cracked', 'dent'], severityWeight: 0.95, returnRiskFactor: 0.88 },
  { category: 'Electronics', aspect: 'Delivery', defectLabel: 'Wrong Item Shipped', keywords: ['wrong item', 'different product', 'not as ordered'], severityWeight: 0.90, returnRiskFactor: 0.92 },

  // Fashion
  { category: 'Fashion', aspect: 'Durability', defectLabel: 'Fabric Shrinkage', keywords: ['shrink', 'shrunk', 'after wash', 'washing'], severityWeight: 0.70, returnRiskFactor: 0.48 },
  { category: 'Fashion', aspect: 'Durability', defectLabel: 'Stitching Failure', keywords: ['stitch', 'seam', 'thread coming out', 'torn', 'tear'], severityWeight: 0.80, returnRiskFactor: 0.60 },
  { category: 'Fashion', aspect: 'Sizing', defectLabel: 'Size Mismatch', keywords: ['size', 'too small', 'too large', 'tight', 'loose', 'fitting'], severityWeight: 0.65, returnRiskFactor: 0.72 },
  { category: 'Fashion', aspect: 'Usability', defectLabel: 'Colour Bleeding', keywords: ['colour bleed', 'color bleed', 'faded', 'fading'], severityWeight: 0.68, returnRiskFactor: 0.45 },
  { category: 'Fashion', aspect: 'Packaging', defectLabel: 'Missing Accessory', keywords: ['missing', 'not received', 'incomplete'], severityWeight: 0.72, returnRiskFactor: 0.55 },
  { category: 'Fashion', aspect: 'Delivery', defectLabel: 'Late Delivery', keywords: ['late', 'delayed', 'took too long', 'never arrived'], severityWeight: 0.40, returnRiskFactor: 0.18 },

  // Footwear
  { category: 'Footwear', aspect: 'Durability', defectLabel: 'Sole Separation', keywords: ['sole came off', 'sole separat', 'glue', 'peeling', 'detach'], severityWeight: 0.88, returnRiskFactor: 0.70 },
  { category: 'Footwear', aspect: 'Sizing', defectLabel: 'Size Runs Small', keywords: ['runs small', 'order one size', 'tight', 'narrow'], severityWeight: 0.60, returnRiskFactor: 0.68 },
  { category: 'Footwear', aspect: 'Usability', defectLabel: 'Insole Discomfort', keywords: ['uncomfortable', 'hurts', 'blister', 'hard sole', 'cushion'], severityWeight: 0.62, returnRiskFactor: 0.42 },
  { category: 'Footwear', aspect: 'Packaging', defectLabel: 'Mismatched Pair', keywords: ['different size', 'odd pair', 'two left', 'mismatch'], severityWeight: 0.95, returnRiskFactor: 0.90 },

  // Home & Kitchen
  { category: 'Home & Kitchen', aspect: 'Durability', defectLabel: 'Non-Stick Peeling', keywords: ['non stick', 'coating', 'peel', 'chipping', 'scratch'], severityWeight: 0.78, returnRiskFactor: 0.52 },
  { category: 'Home & Kitchen', aspect: 'Packaging', defectLabel: 'Leaked In Transit', keywords: ['leak', 'spill', 'broken seal', 'wet'], severityWeight: 0.85, returnRiskFactor: 0.75 },
  { category: 'Home & Kitchen', aspect: 'Usability', defectLabel: 'Poor Build Quality', keywords: ['flimsy', 'cheap plastic', 'wobbly', 'breaks easily'], severityWeight: 0.75, returnRiskFactor: 0.55 },

  // Beauty
  { category: 'Beauty', aspect: 'Packaging', defectLabel: 'Seal Tampered', keywords: ['seal broken', 'tampered', 'opened', 'used product'], severityWeight: 0.92, returnRiskFactor: 0.85 },
  { category: 'Beauty', aspect: 'Usability', defectLabel: 'Skin Reaction', keywords: ['rash', 'irritation', 'allergic', 'burning', 'itch'], severityWeight: 0.90, returnRiskFactor: 0.66 },
  { category: 'Beauty', aspect: 'Durability', defectLabel: 'Expired Stock', keywords: ['expired', 'expiry', 'old stock', 'manufacture date'], severityWeight: 0.95, returnRiskFactor: 0.88 },

  // General fallback
  { category: 'General', aspect: 'Durability', defectLabel: 'Product Defective', keywords: ['defective', 'faulty', 'not working', 'stopped working', 'dead'], severityWeight: 0.90, returnRiskFactor: 0.80 },
  { category: 'General', aspect: 'Packaging', defectLabel: 'Poor Packaging', keywords: ['packaging', 'packed badly', 'no bubble wrap', 'box damaged'], severityWeight: 0.55, returnRiskFactor: 0.30 },
  { category: 'General', aspect: 'Delivery', defectLabel: 'Delivery Issue', keywords: ['delivery', 'courier', 'delayed', 'lost in transit'], severityWeight: 0.45, returnRiskFactor: 0.20 },
  { category: 'General', aspect: 'Usability', defectLabel: 'Not As Described', keywords: ['not as described', 'misleading', 'fake', 'duplicate', 'first copy'], severityWeight: 0.85, returnRiskFactor: 0.78 },
  { category: 'General', aspect: 'Sizing', defectLabel: 'Sizing Issue', keywords: ['size', 'fit', 'dimension', 'measurement'], severityWeight: 0.60, returnRiskFactor: 0.65 },
];

/** Mean return-risk across the general fallback set, used when nothing matches. */
export const BASELINE_RETURN_RISK = 0.45;

function normalize(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Resolve the taxonomy rows that apply to a product category, General last. */
export function taxonomyForCategory(
  category: string | null | undefined,
  taxonomy: TaxonomyEntry[] = DEFAULT_TAXONOMY
): TaxonomyEntry[] {
  const key = normalize(String(category ?? ''));
  const specific = taxonomy.filter(
    (t) => t.category !== 'General' && (key.includes(normalize(t.category)) || normalize(t.category).includes(key))
  );
  const general = taxonomy.filter((t) => t.category === 'General');
  return specific.length > 0 ? [...specific, ...general] : general;
}

/**
 * Match a free-text defect label (Gemini output) or raw review body onto the
 * taxonomy. Returns the best keyword hit, or `null` when nothing matches so the
 * caller can apply `BASELINE_RETURN_RISK` explicitly rather than by accident.
 */
export function matchDefect(
  text: string,
  category?: string | null,
  taxonomy: TaxonomyEntry[] = DEFAULT_TAXONOMY
): TaxonomyEntry | null {
  const haystack = normalize(text);
  if (!haystack) return null;

  const candidates = taxonomyForCategory(category, taxonomy);
  let best: { entry: TaxonomyEntry; score: number } | null = null;

  for (const entry of candidates) {
    // An exact label hit beats any keyword hit.
    if (haystack.includes(normalize(entry.defectLabel))) {
      return entry;
    }
    const hits = entry.keywords.filter((k) => haystack.includes(normalize(k))).length;
    if (hits > 0 && (!best || hits > best.score)) {
      best = { entry, score: hits };
    }
  }

  return best?.entry ?? null;
}

/** Return-risk factor for a defect label, falling back to the documented baseline. */
export function resolveReturnRisk(
  defectLabel: string,
  category?: string | null,
  taxonomy: TaxonomyEntry[] = DEFAULT_TAXONOMY
): number {
  return matchDefect(defectLabel, category, taxonomy)?.returnRiskFactor ?? BASELINE_RETURN_RISK;
}

/** Aspect bucket for a defect label — drives the ABSA breakdown in the console. */
export function resolveAspect(
  defectLabel: string,
  category?: string | null,
  taxonomy: TaxonomyEntry[] = DEFAULT_TAXONOMY
): Aspect | 'Unclassified' {
  const entry = matchDefect(defectLabel, category, taxonomy);
  return (entry?.aspect as Aspect) ?? 'Unclassified';
}

/**
 * Defects a seller can actually remove by fixing listing copy, packaging or
 * QA. Delivery-stage failures sit with the courier and are excluded from
 * "capital protected" so the figure stays defensible.
 */
export const ADDRESSABLE_DEFECT_LABELS = DEFAULT_TAXONOMY
  .filter((t) => t.aspect !== 'Delivery')
  .map((t) => t.defectLabel);
