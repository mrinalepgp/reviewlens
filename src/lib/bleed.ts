// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Return-bleed & ROI quant
//
//   Bleed = Live Selling Price × Est. Monthly Volume × Return Risk Factor
//           × Aspect Defect Frequency
//
// Every input is derived from scraped evidence. When an input is genuinely
// unknown the functions return `null` rather than a plausible-looking number —
// a blank cell is honest, an invented ₹1,34,850 is not.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Share of buyers who leave a written review on Indian marketplaces. Used to
 * back out order volume from review counts. Conservative end of the commonly
 * cited 1–3% band, so volume (and therefore bleed) is under- not over-stated.
 */
export const REVIEW_TO_ORDER_RATE = 0.015;

/** Reviews are assumed to have accumulated over this window when dates are absent. */
export const DEFAULT_ACCRUAL_MONTHS = 12;

/** Reverse logistics + refurb cost as a share of selling price, on top of the refund. */
export const REVERSE_LOGISTICS_RATE = 0.18;

export interface DefectFrequency {
  label: string;
  /** Count of reviews mentioning this defect. */
  mentions: number;
  /** 0–1. Probability a unit is returned once this defect is present. */
  returnRiskFactor: number;
}

export interface BleedInput {
  /** Live scraped selling price in rupees. */
  price: number | null | undefined;
  /** Total reviews ingested for the SKU. */
  reviewCount: number | null | undefined;
  /** Months the reviews span, when review dates were parsed. */
  accrualMonths?: number | null;
  /** Explicit monthly volume, if the seller supplied one. Overrides estimation. */
  monthlyVolumeOverride?: number | null;
  defects: DefectFrequency[];
}

export interface DefectBleed extends DefectFrequency {
  /** Share of all ingested reviews naming this defect (0–1). */
  frequency: number;
  /** Units per month expected to come back because of this defect. */
  monthlyReturnedUnits: number;
  /** Rupees per month lost to this defect (refund + reverse logistics). */
  monthlyBleedInr: number;
}

export interface BleedResult {
  /** `null` when price or review volume was unavailable — render as "—", not ₹0. */
  monthlyBleedInr: number | null;
  annualBleedInr: number | null;
  estimatedMonthlyVolume: number | null;
  /** Blended probability any given unit is returned (0–1). */
  blendedReturnRate: number | null;
  perDefect: DefectBleed[];
  /** Why the result is null, for surfacing in the UI instead of a fake figure. */
  unavailableReason?: string;
}

/**
 * Back out monthly order volume from review count.
 * volume = reviews / review-rate / months-accrued
 */
export function estimateMonthlyVolume(
  reviewCount: number | null | undefined,
  accrualMonths: number | null = DEFAULT_ACCRUAL_MONTHS
): number | null {
  if (!reviewCount || reviewCount <= 0) return null;
  const months = accrualMonths && accrualMonths > 0 ? accrualMonths : DEFAULT_ACCRUAL_MONTHS;
  const totalOrders = reviewCount / REVIEW_TO_ORDER_RATE;
  return Math.round(totalOrders / months);
}

/**
 * Full bleed model for one SKU. Defect frequencies are capped at 1 and the
 * blended return rate at 0.95 — a SKU cannot bleed more than it sells.
 */
export function computeBleed(input: BleedInput): BleedResult {
  const price = Number(input.price);
  const reviewCount = Number(input.reviewCount);

  const empty: BleedResult = {
    monthlyBleedInr: null,
    annualBleedInr: null,
    estimatedMonthlyVolume: null,
    blendedReturnRate: null,
    perDefect: [],
  };

  if (!Number.isFinite(price) || price <= 0) {
    return { ...empty, unavailableReason: 'Live selling price could not be extracted for this SKU.' };
  }
  if (!Number.isFinite(reviewCount) || reviewCount <= 0) {
    return { ...empty, unavailableReason: 'No reviews were ingested for this SKU.' };
  }

  const monthlyVolume =
    input.monthlyVolumeOverride && input.monthlyVolumeOverride > 0
      ? Math.round(input.monthlyVolumeOverride)
      : estimateMonthlyVolume(reviewCount, input.accrualMonths ?? DEFAULT_ACCRUAL_MONTHS);

  if (!monthlyVolume) {
    return { ...empty, unavailableReason: 'Monthly order volume could not be estimated.' };
  }

  // Refund of the sale price plus the cost of getting the unit back and resaleable.
  const lossPerReturnedUnit = price * (1 + REVERSE_LOGISTICS_RATE);

  const perDefect: DefectBleed[] = (input.defects ?? [])
    .filter((d) => d && d.mentions > 0)
    .map((d) => {
      const frequency = Math.min(d.mentions / reviewCount, 1);
      const riskFactor = Math.min(Math.max(d.returnRiskFactor, 0), 1);
      const monthlyReturnedUnits = monthlyVolume * riskFactor * frequency;
      return {
        ...d,
        frequency,
        monthlyReturnedUnits,
        monthlyBleedInr: Math.round(monthlyReturnedUnits * lossPerReturnedUnit),
      };
    })
    .sort((a, b) => b.monthlyBleedInr - a.monthlyBleedInr);

  if (perDefect.length === 0) {
    return {
      monthlyBleedInr: 0,
      annualBleedInr: 0,
      estimatedMonthlyVolume: monthlyVolume,
      blendedReturnRate: 0,
      perDefect: [],
    };
  }

  // Defects overlap (one review can name several), so sum the returned units and
  // clamp, rather than summing independent probabilities past 100%.
  const rawReturnedUnits = perDefect.reduce((acc, d) => acc + d.monthlyReturnedUnits, 0);
  const returnedUnits = Math.min(rawReturnedUnits, monthlyVolume * 0.95);
  const monthlyBleedInr = Math.round(returnedUnits * lossPerReturnedUnit);

  return {
    monthlyBleedInr,
    annualBleedInr: monthlyBleedInr * 12,
    estimatedMonthlyVolume: monthlyVolume,
    blendedReturnRate: returnedUnits / monthlyVolume,
    perDefect,
  };
}

/**
 * Capital protected = the share of bleed a seller can remove by fixing the
 * defects flagged as addressable (packaging, sizing, description accuracy are
 * fixable; delivery delays largely are not).
 */
export function computeCapitalProtected(
  result: BleedResult,
  addressableLabels: string[]
): number | null {
  if (result.monthlyBleedInr == null) return null;
  const addressable = new Set(addressableLabels.map((l) => l.toLowerCase()));
  const recoverable = result.perDefect
    .filter((d) => addressable.has(d.label.toLowerCase()))
    .reduce((acc, d) => acc + d.monthlyBleedInr, 0);
  return Math.round(recoverable * 12);
}
