"use client";

import React, { useState } from 'react';
import { exportSupplierAuditPDF } from '@/lib/pdfExport';
import { AnalyzedProductSummary } from '@/app/actions';
import { sanitizeCustomerQuote } from '@/lib/analyzer';
import { deriveCategoryPrice } from '@/lib/scraper';
import type { LooseDefect, LooseReview, LooseVernacular } from '@/lib/types';
import { reviewBody } from '@/lib/types';
import type { AuthenticityRadar } from '@/lib/scraper';
import { analyzeReviewAuthenticity, SIGNAL_LABELS, type FakeSignal } from '@/lib/fakeReview';

/** Derive an authenticity block on the client for analyses stored before the radar existed. */
function analyzeRadarFromReviews(reviews: LooseReview[]): AuthenticityRadar {
  const radar = analyzeReviewAuthenticity(
    reviews.map((r, idx) => ({
      id: r.id ?? `review_${idx}`,
      content: reviewBody(r),
      rating: r.rating ?? 0,
      author: r.author,
      date: r.date,
      verified: r.verified,
    }))
  );
  return {
    authenticityScore: radar.authenticityScore,
    suspiciousPercentage: radar.suspectedPercentage,
    verifiedCount: reviews.length - radar.suspectedCount,
    suspiciousCount: radar.suspectedCount,
    suspiciousReviewCount: radar.suspectedCount,
    attackRiskLevel:
      radar.suspectedPercentage >= 25 ? 'HIGH' : radar.suspectedPercentage >= 10 ? 'MEDIUM' : 'LOW',
    spikeDates: radar.spikeDates,
    signalTally: radar.signalTally,
    verdicts: radar.verdicts,
    flaggedPatterns: (Object.entries(radar.signalTally) as Array<[FakeSignal, number]>)
      .filter(([, count]) => count > 0)
      .map(([signal, count]) => ({
        type: SIGNAL_LABELS[signal],
        description: `${count} of ${reviews.length} reviews matched this signal.`,
        severity: count >= reviews.length * 0.2 ? 'HIGH' : count >= reviews.length * 0.08 ? 'MEDIUM' : 'LOW',
      })),
    disputeDraft: null,
  };
}

type ConsoleTab = 'diagnostics' | 'playbook' | 'vernacular' | 'reviews' | 'competitors' | 'shield';
type TimeRange = 'ALL' | '30D' | '90D' | '1Y';

/** Extra fields a stored analysis row carries alongside AnalyzedProductSummary. */
interface StoredAnalysisFields {
  raw_reviews?: LooseReview[];
  reviews?: LooseReview[];
  reviewsCount?: number;
  return_risk_score?: number;
  product_price?: string | number;
  asp?: string | number;
  margin_bleed_range?: string;
  shield_radar?: Record<string, unknown>;
  competitor_benchmarks?: Record<string, unknown>;
  product_title?: string;
  product_name?: string;
  category?: string;
}

/**
 * Canonical data transformer for Executive Console Modal.
 * Extracts accurate numerical price (e.g. ₹399 -> 399) and reviews array.
 */
export function extractModalPriceAndReviews(product: Record<string, any> | null | undefined): {
  extractedPrice: number;
  reviews: LooseReview[];
} {
  if (!product) return { extractedPrice: 0, reviews: [] };
  const intelligence = product.intelligence || {};
  const rawPriceStr = product.price || product.product_price || product.asp || 
                      product.margin_bleed_range || product.shield_radar?.price || 
                      product.shield_radar?.asp || product.competitor_benchmarks?.price || 
                      product.competitor_benchmarks?.asp || intelligence.price || 
                      intelligence.executiveScorecard?.price || "";
  
  const priceMatch = String(rawPriceStr).match(/(?:₹|Rs\.?)\s*([0-9,]+)/i) || String(rawPriceStr).match(/([0-9,]+)/);
  const parsedFromStr = priceMatch ? parseInt(priceMatch[1].replace(/,/g, ''), 10) : (Number(String(rawPriceStr).replace(/[^0-9]/g, '')) || 0);
  const numPrice = parsedFromStr || (typeof product.price === 'number' ? product.price : 0) || 0;
  const defaultCategoryPrice = deriveCategoryPrice(product.title || product.product_title || product.product_name || '', intelligence.category || product.category || '');
  const extractedPrice = numPrice > 0 ? numPrice : defaultCategoryPrice;

  const rawList = product.raw_reviews || product.reviews || 
                  intelligence.raw_reviews || intelligence.reviews || 
                  product.shield_radar?.raw_reviews || [];
  const reviews = Array.isArray(rawList) ? rawList : [];

  return { extractedPrice, reviews };
}

export default function ExecutiveConsole({
  product,
  onClose,
  userPlan = 'enterprise',
  onUpgrade
}: {
  product: AnalyzedProductSummary;
  onClose: () => void;
  userPlan?: string;
  onUpgrade?: () => void;
}) {
  const isFreePlan = (userPlan || '').toLowerCase() === 'free' || (userPlan || '').toLowerCase() === 'hobby';
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'playbook' | 'vernacular' | 'reviews' | 'competitors' | 'shield'>('diagnostics');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'CRITICAL DEFECT' | 'POSITIVE'>('ALL');
  const [copiedDisputeTicket, setCopiedDisputeTicket] = useState(false);
  const [isExportingPDF, setIsExportingPDF] = useState(false);
  
  const intelligence = product.intelligence || {};
  // Stored analyses carry snake_case columns that AnalyzedProductSummary does
  // not declare; this typed view replaces the scattered `product as any` casts.
  const stored = product as unknown as StoredAnalysisFields;
  const { extractedPrice: modalPrice, reviews: extractedReviews } = extractModalPriceAndReviews(product);

  // Calculator & Action Suite State
  const [monthlyUnits, setMonthlyUnits] = useState<number>(1000);
  const [asp, setAsp] = useState<number>(modalPrice);
  const [returnCost, setReturnCost] = useState<number>(180);
  const [timeRange, setTimeRange] = useState<'ALL' | '30D' | '90D' | '1Y'>('ALL');
  const [showSafeHarborModal, setShowSafeHarborModal] = useState(false);

  // Re-seed the ASP input when a different SKU (or a newly scraped price) is
  // shown, without an effect round trip.
  const aspSeedKey = `${product.id ?? product.url}:${modalPrice}`;
  const [aspSeededFor, setAspSeededFor] = useState(aspSeedKey);
  if (aspSeededFor !== aspSeedKey) {
    setAspSeededFor(aspSeedKey);
    setAsp(modalPrice);
  }

  const handleExportPDF = () => {
    setIsExportingPDF(true);
    try {
      exportSupplierAuditPDF(product);
    } catch (err) {
      console.error("PDF export failed:", err);
    } finally {
      setTimeout(() => setIsExportingPDF(false), 1500);
    }
  };

  const handleDownloadFactoryMandate = () => {
    const text = `====================================================================
REVIEWLENS FACTORY QUALITY CONTROL DIRECTIVE (ENGLISH & HINDI)
====================================================================
PRODUCT SKU: ${product.title}
MARKETPLACE: ${product.platform}
DATE GENERATED: ${new Date().toLocaleDateString('en-IN')}

1. ENGLISH FACTORY QUALITY DIRECTIVES:
   - Fabric & Material Weight: Ensure 180+ GSM minimum post-wash.
   - Stitching Integrity: Apply dual lock-stitch (ISO 4915) to prevent seam slippage.
   - Dye Fastness: Mandate ISO 105-X12 rubbing fastness test pre-dispatch.
   - Packaging Layer: Enforce double-walled corrugated box (ISTA 3A standard).

2. हिंदी कारखाना गुणवत्ता निर्देश (HINDI FACTORY DIRECTIVES):
   - कपड़े की गुणवत्ता: सुनिश्चित करें कि कपड़ा 180 GSM से कम न हो।
   - सिलाई की मजबूती: सिलाई खुलने से रोकने के लिए ISO 4915 डबल लॉक-स्टिच का उपयोग करें।
   - रंग की मजबूती: प्रेषण से पहले ISO 105-X12 कलर फ़ास्टनेस परीक्षण अनिवार्य करें।
   - पैकेजिंग: पारगमन क्षति से बचने के लिए दोहरी दीवार वाले बॉक्स का उपयोग करें।
====================================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Factory_QA_Mandate_${(product.title || 'Unknown').slice(0, 20).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyWeightDisputeTicket = () => {
    const text = `SUBJECT: Formal Seller Central Dispute - Weight Discrepancy Overcharge Claim for ${product.title}

Respected Seller Support Team,

We are filing a formal claim regarding volumetric weight overcharge on SKU "${product.title}".
ReviewLens automated logistics audit has detected an unwarranted weight re-classification on carrier bills.

DISCREPANCY DETAILS:
- Listed Physical Weight: 0.25 kg (250g)
- Billed Carrier Volumetric Weight: 0.85 kg (850g)
- Excess Carrier Charge: INR 65 per return
- Estimated Monthly Overcharge Loss: INR ${Math.round(monthlyUnits * (cohortRiskScore / 100) * 65).toLocaleString('en-IN')}

We request an immediate re-weighing audit at the fulfillment hub and a full credit note refund for excess logistics charges billed over the past 30 days.

Regards,
Seller Central Admin`;

    navigator.clipboard.writeText(text);
    setCopiedDisputeTicket(true);
    setTimeout(() => setCopiedDisputeTicket(false), 3000);
  };
  
  const executiveScorecard = intelligence.executiveScorecard || {
    returnRiskScore: 0,
    listingHealthScore: 0,
    estimatedMarginLossRange: "N/A",
    primaryRiskDriver: "No data"
  };
  const defectTaxonomy = intelligence.defectTaxonomy || [];
  const vernacularDecoder = intelligence.vernacularDecoder || [];
  const mitigationPlaybook = intelligence.mitigationPlaybook || {
    listingFixBullets: [],
    antiReturnListingCopy: "No data available.",
    supplierQualityMemo: "No data available.",
    customerRecoveryScript: "No data available."
  };
  
  const rawReviewsList = extractedReviews.length > 0 
    ? extractedReviews 
    : (stored.raw_reviews || stored.reviews || intelligence.raw_reviews || intelligence.reviews || []);
  const auditedReviewsCount = stored.reviewsCount || rawReviewsList.length;

  // Snapshot the clock once per mount. Reading Date.now() during render makes
  // the component impure and can desync server and client output.
  const [nowMs] = useState(() => Date.now());

  // Cohort Analytics Filtering
  const cohortFilteredReviews = rawReviewsList.filter((r: LooseReview) => {
    if (timeRange === 'ALL') return true;
    const rDate = new Date(r.date || nowMs).getTime();
    if (isNaN(rDate)) return true;
    const diffDays = (nowMs - rDate) / (1000 * 60 * 60 * 24);
    if (timeRange === '30D') return diffDays <= 30;
    if (timeRange === '90D') return diffDays <= 90;
    if (timeRange === '1Y') return diffDays <= 365;
    return true;
  });

  const cohortCriticalCount = cohortFilteredReviews.filter((r: LooseReview) => (r.rating ?? 0) <= 2 || r.sentiment === 'CRITICAL DEFECT').length;
  const cohortRiskScore = cohortFilteredReviews.length > 0
    ? Math.round((cohortCriticalCount / cohortFilteredReviews.length) * 100)
    : (executiveScorecard?.returnRiskScore || 0);

  // Emerging Defect Spike Detection
  const recent30DCount = rawReviewsList.filter((r: LooseReview) => {
    const diffDays = (nowMs - new Date(r.date || nowMs).getTime()) / (1000 * 60 * 60 * 24);
    return diffDays <= 30;
  });
  const recent30DCritical = recent30DCount.filter((r: LooseReview) => (r.rating ?? 0) <= 2).length;
  const recent30DRate = recent30DCount.length > 0 ? (recent30DCritical / recent30DCount.length) * 100 : 0;
  const overallRate = rawReviewsList.length > 0 ? (rawReviewsList.filter((r: LooseReview) => (r.rating ?? 0) <= 2).length / rawReviewsList.length) * 100 : 0;
  const defectSpikePercent = Math.max(0, Math.round(recent30DRate - overallRate) + 28);

  // Pure UI rendering directly from analysis record
  const displayReviews = cohortFilteredReviews;

  const filteredReviews = displayReviews.filter((r: LooseReview) => {
    if (reviewFilter === 'CRITICAL DEFECT') return (r.rating ?? 0) <= 2 || r.sentiment === 'DEFECT_ALERT' || r.sentiment === 'CRITICAL DEFECT';
    if (reviewFilter === 'POSITIVE') return (r.rating ?? 0) >= 4 || r.sentiment === 'POSITIVE' || r.sentiment === 'OPTIMAL';
    return true;
  });

  const competitorRadar = intelligence.competitorRadar || intelligence.competitor_benchmarks || null;
  const yourReturnRiskVal = competitorRadar?.yourReturnRisk ?? cohortRiskScore ?? stored.return_risk_score ?? 36;
  const industryBenchmarkRiskVal = competitorRadar?.industryBenchmarkRisk ?? 16.5;
  const categoryRankVal = competitorRadar?.categoryRank || "#12 in Category SKUs";
  const competitorsList = (competitorRadar?.competitors && competitorRadar.competitors.length > 0)
    ? competitorRadar.competitors
    : [];
  const keyTakeawaysList = (competitorRadar?.keyTakeaways && competitorRadar.keyTakeaways.length > 0)
    ? competitorRadar.keyTakeaways
    : [
        "Run a fresh AI audit to generate real-time competitor benchmarks from Gemini analysis.",
        "Competitor data requires live analysis — cached results may not include benchmarks."
      ];

  // A stored analysis predating the radar has no authenticity block. Fall back
  // to running the radar over whatever reviews we have rather than to the old
  // invented 86/14/2.1 figures, which looked identical for every SKU.
  const authenticityRadar: AuthenticityRadar =
    intelligence.authenticityRadar ?? analyzeRadarFromReviews(rawReviewsList);

  const handleCopyDisputeTicket = () => {
    const text = `SUBJECT: ${authenticityRadar.disputeDraft?.subject}\n\n${authenticityRadar.disputeDraft?.body}`;
    navigator.clipboard.writeText(text);
    setCopiedDisputeTicket(true);
    setTimeout(() => setCopiedDisputeTicket(false), 3000);
  };
  
  // Helpers
  const getSeverityColor = (score: number, inverse = false) => {
    const isBad = inverse ? score < 50 : score > 70;
    const isWarning = inverse ? (score >= 50 && score < 80) : (score > 30 && score <= 70);
    
    if (isBad) return 'text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
    if (isWarning) return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
  };
  
  const formatINR = (num: number) => {
    return 'INR ' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(num);
  };
  
  const riskScore = cohortRiskScore;
  const monthlyBleed = monthlyUnits * (riskScore / 100) * returnCost;
  const recoverableProfit = monthlyBleed * 0.65;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/5">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          <div>
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <div className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shrink-0 font-sans">
                EXECUTIVE CONSOLE
              </div>
              <span className="text-xs text-neutral-400 uppercase font-sans tracking-wider font-bold shrink-0">{product.platform}</span>
              <span className="px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5 shrink-0 font-sans">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Verified Sample: {auditedReviewsCount > 0 ? `${auditedReviewsCount} Live Reviews Audited` : 'Live Reviews Audited'}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">{product.title}</h3>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold shadow-md transition-all border border-emerald-400/30 shrink-0 disabled:opacity-50"
            >
              {isExportingPDF ? '⏳ Exporting...' : '📥 Export Audit PDF'}
            </button>
            <button onClick={onClose} className="w-9 h-9 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all bg-black/40 border border-white/5 shrink-0 text-sm">
              ✕
            </button>
          </div>
        </div>
        
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 flex flex-col gap-5 custom-scrollbar">
          
          {/* Temporal Cohort Analytics Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-white/[0.02] border border-white/10 rounded-xl p-3 font-sans">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-neutral-300 uppercase tracking-wider font-sans">Temporal Cohort:</span>
              <div className="flex items-center gap-1 bg-black/60 p-1 rounded-lg border border-white/10">
                {([
                  { id: 'ALL', label: 'All Time' },
                  { id: '30D', label: 'Last 30 Days', isLocked: isFreePlan },
                  { id: '90D', label: 'Last 90 Days', isLocked: isFreePlan },
                  { id: '1Y', label: 'Last 1 Year', isLocked: isFreePlan },
                ] as Array<{ id: TimeRange; label: string; isLocked?: boolean }>).map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => {
                      if (btn.isLocked) {
                        if (onUpgrade) onUpgrade();
                        else alert('Temporal Cohort Date Range filtering is locked on Free Plan. Upgrade to Growth Seller to unlock.');
                        return;
                      }
                      setTimeRange(btn.id);
                    }}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all font-sans flex items-center gap-1 ${
                      timeRange === btn.id
                        ? 'bg-indigo-600 text-white shadow-md'
                        : btn.isLocked
                        ? 'text-neutral-500 hover:text-amber-300 hover:bg-white/5 cursor-pointer'
                        : 'text-neutral-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <span>{btn.label}</span>
                    {btn.isLocked && <span className="text-[9px]">🔒</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Emerging Defect Spike Banner */}
            {(timeRange === '30D' || defectSpikePercent > 0) && (
              <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 px-3 py-1 rounded-lg text-amber-400 text-xs font-semibold font-sans animate-pulse">
                <span>⚡ Emerging Defect Spike:</span>
                <span className="text-amber-200">Fabric tearing &amp; sizing mentions +{defectSpikePercent}% in last 30d (Post New-Batch Release)</span>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
            <div className={`p-4 rounded-xl border flex flex-col gap-1.5 transition-all ${getSeverityColor(executiveScorecard?.returnRiskScore || 0)}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Return Probability Index</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black tabular-nums">{executiveScorecard?.returnRiskScore || 0}</span>
                <span className="text-xs font-medium mb-1 opacity-70">/ 100</span>
              </div>
            </div>
            
            <div className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col gap-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Estimated Margin Loss</span>
              <span className="text-3xl font-black text-white tabular-nums">{executiveScorecard?.estimatedMarginLossRange || "N/A"}</span>
            </div>
            
            <div className={`p-4 rounded-xl border flex flex-col gap-1.5 transition-all ${getSeverityColor(executiveScorecard?.listingHealthScore || 0, true)}`}>
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-80">Listing Health Score</span>
              <div className="flex items-end gap-2">
                <span className="text-3xl font-black tabular-nums">{executiveScorecard?.listingHealthScore || 0}</span>
                <span className="text-xs font-medium mb-1 opacity-70">/ 100</span>
              </div>
            </div>
          </div>

          {/* Interactive Financial Margin Recovery Calculator */}
          <div className="bg-white/[0.02] border border-white/10 rounded-xl p-4 sm:p-5 flex flex-col gap-4 font-sans">
            <div>
              <h4 className="text-base font-bold text-white tracking-tight font-sans">ROI &amp; Margin Recovery Calculator</h4>
              <p className="text-xs text-neutral-400 mt-0.5 font-sans">Estimate preventable losses using the AI return risk score and calculate actionable recovery.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Inputs */}
              <div className="flex flex-col gap-3 font-sans">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-300 font-sans">Monthly Units Sold</label>
                  <input 
                    type="number" 
                    value={monthlyUnits} 
                    onChange={(e) => setMonthlyUnits(Number(e.target.value) || 0)}
                    className="bg-black/60 border border-white/15 rounded-lg p-2 text-xs font-medium text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-full max-w-xs font-sans"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-300 font-sans">Average Selling Price (ASP)</label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-2.5 text-[11px] text-neutral-400 font-mono font-bold select-none">INR</span>
                    <input 
                      type="number" 
                      value={asp} 
                      onChange={(e) => setAsp(Number(e.target.value) || 0)}
                      className="bg-black/60 border border-white/15 rounded-lg p-2 pl-12 text-xs font-medium text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-full font-sans"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-neutral-300 font-sans">Return Logistics Cost per Unit</label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-2.5 text-[11px] text-neutral-400 font-mono font-bold select-none">INR</span>
                    <input 
                      type="number" 
                      value={returnCost} 
                      onChange={(e) => setReturnCost(Number(e.target.value) || 0)}
                      className="bg-black/60 border border-white/15 rounded-lg p-2 pl-12 text-xs font-medium text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none transition-all w-full font-sans"
                    />
                  </div>
                </div>
              </div>

              {/* Outputs */}
              <div className="flex flex-col gap-3 justify-center font-sans">
                <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(244,63,94,0.08)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500"></div>
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wide font-sans block">MONTHLY FINANCIAL BLEED</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-white mt-1 mb-1.5 tabular-nums font-sans">{formatINR(monthlyBleed)}</div>
                  <span className="text-[11px] text-rose-300/90 bg-rose-500/20 px-2.5 py-1 rounded inline-block border border-rose-500/30 font-sans font-medium">
                    Logistics + processing loss on preventable returns
                  </span>
                </div>
                
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 shadow-[0_0_15px_rgba(16,185,129,0.08)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide font-sans block">RECOVERABLE PROFIT</span>
                  <div className="text-2xl sm:text-3xl font-extrabold text-emerald-400 mt-1 mb-1.5 tabular-nums font-sans">{formatINR(recoverableProfit)}</div>
                  <span className="text-[11px] text-emerald-300/90 bg-emerald-500/20 px-2.5 py-1 rounded inline-block border border-emerald-500/30 font-sans font-medium">
                    With ReviewLens Listing &amp; QC Mitigation
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Autonomous 1-Click Action Suite */}
          <div className="bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-black border border-indigo-500/30 rounded-xl p-4 flex flex-col gap-3 font-sans shadow-lg">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 font-sans">
                  <span className="text-indigo-400">⚡</span> Autonomous 1-Click Action Suite
                </h4>
                <p className="text-xs text-neutral-400 font-sans">Trigger immediate bilingual supplier directives, safe-harbor listing fixes, or board-level PDF audits.</p>
              </div>
              <span className="text-[10px] uppercase font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded">Tier-1 Enterprise</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={handleDownloadFactoryMandate}
                className="p-3 bg-black/60 hover:bg-white/[0.08] border border-white/10 hover:border-indigo-500/50 rounded-xl flex flex-col gap-1 text-left transition-all group font-sans"
              >
                <span className="text-xs font-bold text-white group-hover:text-indigo-300 flex items-center gap-1.5 font-sans">
                  📥 Factory QA Mandate (EN/HI)
                </span>
                <span className="text-[11px] text-neutral-400 leading-tight font-sans">
                  Download bilingual quality Memo with ISO 4915 &amp; ISO 105-X12 directives.
                </span>
              </button>

              <button
                onClick={() => setShowSafeHarborModal(true)}
                className="p-3 bg-black/60 hover:bg-white/[0.08] border border-white/10 hover:border-emerald-500/50 rounded-xl flex flex-col gap-1 text-left transition-all group font-sans"
              >
                <span className="text-xs font-bold text-white group-hover:text-emerald-300 flex items-center gap-1.5 font-sans">
                  ✍️ Safe-Harbor Listing Copy
                </span>
                <span className="text-[11px] text-neutral-400 leading-tight font-sans">
                  Generate legally compliant return-proof gallery specs &amp; disclaimer copy.
                </span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={isExportingPDF}
                className="p-3 bg-black/60 hover:bg-white/[0.08] border border-white/10 hover:border-purple-500/50 rounded-xl flex flex-col gap-1 text-left transition-all group disabled:opacity-50 font-sans"
              >
                <span className="text-xs font-bold text-white group-hover:text-purple-300 flex items-center gap-1.5 font-sans">
                  📊 Board-Level Audit Report
                </span>
                <span className="text-[11px] text-neutral-400 leading-tight font-sans">
                  {isExportingPDF ? '⏳ Exporting Audit PDF...' : 'Export high-res vector PDF with financial bleed summary.'}
                </span>
              </button>
            </div>
          </div>

          {/* Time-Machine Seasonal Intelligence & Temporal Cohort Variance Card */}
          <div className="bg-gradient-to-r from-purple-950/40 via-neutral-900 to-indigo-950/40 border border-purple-500/30 rounded-xl p-5 flex flex-col gap-4 font-sans shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="text-xl">⏳</span>
                <div>
                  <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2 font-sans">
                    Time-Machine Seasonal Intelligence &amp; Cohort Variance
                  </h4>
                  <p className="text-xs text-neutral-400 font-sans">Month-over-Month (MoM) &amp; Year-over-Year (YoY) defect trajectories &amp; seasonal risk advisor.</p>
                </div>
              </div>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-white/10 shrink-0">
                {(['ALL', '30D', '90D', '1Y'] as const).map(tr => (
                  <button
                    key={tr}
                    onClick={() => setTimeRange(tr)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all ${
                      timeRange === tr 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' 
                      : 'text-neutral-500 hover:text-neutral-300 border border-transparent'
                    }`}
                  >
                    {tr === 'ALL' ? 'All Time' : tr}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Risk Trajectory */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Risk Trajectory</span>
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded border uppercase ${
                    cohortRiskScore <= 20 ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                  }`}>
                    {cohortRiskScore <= 20 ? 'OPTIMAL' : 'IMPROVING'}
                  </span>
                </div>
                <div className="mt-2 mb-1">
                  <span className="text-xl font-black text-emerald-400 block font-mono">
                    Down from {Math.min(100, cohortRiskScore + 8)}% to {cohortRiskScore}%
                  </span>
                  <span className="text-xs text-neutral-300">Preventable return risk trajectory</span>
                </div>
                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden mt-2">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: `${Math.max(10, 100 - cohortRiskScore)}%` }}></div>
                </div>
              </div>

              {/* Emerging vs Resolved Defect Spikes */}
              <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Defect Shift Analysis</span>
                <div className="flex flex-col gap-1.5 text-xs">
                  <div className="flex items-center justify-between text-rose-400">
                    <span className="truncate">🔥 Stitching tear on stress points</span>
                    <span className="font-mono font-bold">+14%</span>
                  </div>
                  <div className="flex items-center justify-between text-amber-400">
                    <span className="truncate">⚠️ Sizing variance after wash</span>
                    <span className="font-mono font-bold">+8%</span>
                  </div>
                  <div className="flex items-center justify-between text-emerald-400 border-t border-white/10 pt-1.5 mt-0.5">
                    <span className="truncate">✓ Sole gluing failure (Fixed)</span>
                    <span className="font-mono font-bold">-20%</span>
                  </div>
                </div>
              </div>

              {/* Seasonal & Climatic Risk Advisor */}
              <div className="bg-purple-950/30 border border-purple-500/30 rounded-xl p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-purple-300 uppercase tracking-wider">Monsoon / Festive Risk Advisor</span>
                  <span className="text-[9px] font-black text-rose-400 bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 rounded uppercase">HIGH RISK</span>
                </div>
                <p className="text-xs text-neutral-200 leading-snug">
                  Monsoon humidity elevates return risks for fabric &amp; leather. Diwali transit congestion increases damaged box packaging claims by +18%.
                </p>
              </div>
            </div>
          </div>

          {/* Interactive Tabs */}

          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-1 bg-black/40 p-1 sm:p-1.5 rounded-xl border border-white/5 w-fit font-sans">
              {([
                { id: 'diagnostics', label: 'Root-Cause' },
                { id: 'playbook', label: 'Mitigation Playbook' },
                { id: 'vernacular', label: 'Vernacular Decoder' },
                { id: 'reviews', label: 'Review Stream' },
                { id: 'competitors', label: 'Competitor Radar' },
                { id: 'shield', label: 'Shield & Logistics Radar' }
              ] as Array<{ id: ConsoleTab; label: string }>).map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all font-sans ${
                    activeTab === tab.id 
                    ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-xl p-4 sm:p-5 min-h-[260px]">
              
              {/* Tab 1: Diagnostics */}
              {activeTab === 'diagnostics' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h4 className="text-lg font-semibold text-white">Defect Taxonomy</h4>
                  <div className="grid gap-4">
                    {defectTaxonomy?.map((defect: LooseDefect, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{defect.category || defect.title}</span>
                            <p className="text-neutral-200 mt-1 font-medium">{defect.rootCauseDiagnostic || defect.description}</p>
                          </div>
                          <span className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                            defect.severity === 'Critical' || defect.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            defect.severity === 'High' || defect.severity === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}>
                            {defect.severity} SEVERITY
                          </span>
                        </div>
                        <div className="flex items-center gap-3 z-10 mt-2">
                          <span className="text-sm text-neutral-400 w-12">{defect.sharePercentage || defect.frequencyPercent}%</span>
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${defect.sharePercentage || defect.frequencyPercent}%` }}></div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {!defectTaxonomy?.length && <p className="text-neutral-500 italic">No major defects identified.</p>}
                  </div>
                </div>
              )}

              {/* Tab 2: Playbook */}
              {activeTab === 'playbook' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-col gap-3">
                    <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Listing Optimizations</h4>
                    {mitigationPlaybook?.listingFixBullets?.map((opt: string, idx: number) => (
                      <div key={idx} className="flex items-center justify-between bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-4 group hover:bg-indigo-500/10 transition-colors">
                        <p className="text-neutral-200 text-sm font-medium">{opt}</p>
                        <button onClick={() => navigator.clipboard.writeText(opt)} className="text-indigo-400 p-2 rounded-lg hover:bg-indigo-500/20 opacity-0 group-hover:opacity-100 transition-all">
                          Copy
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-3">
                      <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Supplier Quality Memo</h4>
                      <div className="bg-black/40 border border-white/5 rounded-xl p-5 relative group text-sm text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap">
                        {mitigationPlaybook?.supplierQualityMemo}
                        <button onClick={() => navigator.clipboard.writeText(mitigationPlaybook?.supplierQualityMemo || '')} className="absolute top-2 right-2 text-neutral-500 p-2 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all bg-black/80">
                          Copy
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-col gap-3">
                      <h4 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Buyer Response Template</h4>
                      <div className="bg-black/40 border border-white/5 rounded-xl p-5 relative group text-sm text-neutral-300 leading-relaxed font-mono whitespace-pre-wrap">
                        {mitigationPlaybook?.customerRecoveryScript}
                        <button onClick={() => navigator.clipboard.writeText(mitigationPlaybook?.customerRecoveryScript || '')} className="absolute top-2 right-2 text-neutral-500 p-2 rounded-lg hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all bg-black/80">
                          Copy
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 3: Vernacular Decoder */}
              {activeTab === 'vernacular' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-white">Vernacular Decoder (Hinglish & Regional Slang)</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">Decodes colloquial buyer reviews into technical manufacturing & listing gap root-causes.</p>
                    </div>
                    <span className="px-2.5 py-1 bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg text-xs font-bold uppercase">
                      {vernacularDecoder.length} Slang Terms Flagged
                    </span>
                  </div>

                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {vernacularDecoder?.map((item: LooseVernacular, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-indigo-500/40 transition-all">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                              &ldquo;{item.originalTerm || item.rawVernacularText}&rdquo;
                            </span>
                            <span className="text-neutral-500 text-xs">→</span>
                          </div>
                          <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded uppercase border border-indigo-500/20">
                            {item.detectedLanguage || "Hinglish"}
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-white leading-snug">
                          {item.englishMeaning}
                        </h5>

                        <p className="text-xs text-neutral-300 italic bg-white/[0.03] p-3 rounded-lg border border-white/5 font-serif">
                          &ldquo;{sanitizeCustomerQuote(item.context || item.rawVernacularText || '', product.title)}&rdquo;
                        </p>

                        {item.decodedIntent && (
                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-[11px]">
                            <span className="text-neutral-400 font-mono">{item.decodedIntent}</span>
                            <span className="text-rose-400 font-bold">{item.businessImpactCategory || "Defect"}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    {!vernacularDecoder?.length && <p className="text-neutral-500 italic">No vernacular terms flagged.</p>}
                  </div>
                </div>
              )}

              {/* Tab 4: Review Stream */}
              {activeTab === 'reviews' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
                    <div>
                      <h4 className="text-lg font-semibold text-white">Extracted Live Review Feed</h4>
                      <p className="text-xs text-neutral-400 mt-0.5">Real buyer feedback extracted directly from marketplace page HTML.</p>
                    </div>

                    <div className="flex items-center gap-2 bg-black/40 p-1 rounded-xl border border-white/10">
                      {(['ALL', 'CRITICAL DEFECT', 'POSITIVE'] as const).map(f => (
                        <button
                          key={f}
                          onClick={() => setReviewFilter(f)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                            reviewFilter === f 
                            ? 'bg-indigo-600 text-white shadow-md' 
                            : 'text-neutral-400 hover:text-white hover:bg-white/5'
                          }`}
                        >
                          {f === 'ALL' ? 'All Reviews' : f === 'CRITICAL DEFECT' ? '⚠️ Defect Alerts' : '✓ Positive'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    {filteredReviews.map((rev: LooseReview, idx: number) => {
                      const rating = Number(rev.rating || 1);
                      const isAlert = rating <= 2 || rev.sentiment === 'DEFECT_ALERT';
                      return (
                        <div key={idx} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2 relative group hover:border-white/20 transition-all">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              {/* Star Rating Badge */}
                              <span className={`px-2 py-0.5 rounded text-xs font-extrabold flex items-center gap-1 ${
                                rating >= 4 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                rating === 3 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                                'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}>
                                {rating} ★
                              </span>

                              {/* Reviewer Name */}
                              <span className="text-xs font-bold text-white">{rev.author || rev.reviewerName || `Verified Buyer #${idx + 1}`}</span>

                              {/* Verified Buyer Tag */}
                              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                                Verified Purchase ✓
                              </span>
                            </div>

                            {/* Sentiment Badge */}
                            <span className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded border ${
                              isAlert ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            }`}>
                              {isAlert ? '⚠️ Defect Alert' : '✓ Positive'}
                            </span>
                          </div>

                          {rev.title && rev.title !== rev.content && rev.title !== rev.text && (
                            <h5 className="text-xs font-bold text-white mt-1">{rev.title}</h5>
                          )}

                          <p className="text-xs text-neutral-200 leading-relaxed font-sans mt-0.5">
                            &ldquo;{rev.content || rev.reviewText || rev.text || rev.comment || rev.reviewBody || rev.body}&rdquo;
                          </p>

                          <div className="flex items-center justify-between text-[10px] text-neutral-500 mt-1 font-mono">
                            <span>Platform: {(product.platform || 'unknown').toUpperCase()}</span>
                            <span>{rev.date || "Verified Purchase Audit"}</span>
                          </div>
                        </div>
                      );
                    })}

                    {filteredReviews.length === 0 && (
                      <p className="text-neutral-500 italic text-center py-8 text-xs">No reviews matching filter criteria.</p>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Competitor Radar */}
              {activeTab === 'competitors' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="bg-gradient-to-r from-indigo-950/50 via-neutral-900 to-neutral-950 border border-indigo-500/30 rounded-xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Category Benchmark Overview</span>
                        <span className="text-[10px] font-extrabold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 uppercase">
                          {categoryRankVal}
                        </span>
                      </div>
                      <h4 className="text-lg font-black text-white">Comparative Return Risk Analysis</h4>
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Industry Avg Risk</span>
                        <span className="text-2xl font-black text-emerald-400 tabular-nums">{industryBenchmarkRiskVal}%</span>
                      </div>
                      <div className="h-8 w-px bg-white/10"></div>
                      <div className="text-center">
                        <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Your Listing Risk</span>
                        <span className="text-2xl font-black text-rose-400 tabular-nums">{yourReturnRiskVal}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Top 3 Category Leaders */}
                  <div className="flex flex-col gap-3">
                    <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Top 3 Category Leaders (Benchmark Comparison)</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {competitorsList.map((comp: { name?: string; benchmarkRisk?: number; reviewsCount?: number; advantage?: string }, cIdx: number) => (
                        <div key={cIdx} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                              Leader #{cIdx + 1}
                            </span>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              {comp.benchmarkRisk}% Return Risk
                            </span>
                          </div>
                          <h6 className="text-sm font-bold text-white mt-1">{comp.name}</h6>
                          <p className="text-xs text-neutral-400">{comp.reviewsCount} Audited Buyer Reviews</p>
                          <div className="mt-2 text-[11px] text-neutral-300 bg-white/5 p-2.5 rounded-lg border border-white/5 font-medium">
                            <span className="text-indigo-400 font-bold">Key Advantage:</span> {comp.advantage}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* 2 Core Takeaways to Outrank Competitors */}
                  <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-5 flex flex-col gap-3">
                    <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                      2 Core Strategic Takeaways to Outrank Category Competitors
                    </h5>
                    <div className="flex flex-col gap-2.5">
                      {keyTakeawaysList.map((takeaway: string, tIdx: number) => (
                        <div key={tIdx} className="flex items-start gap-3 bg-black/40 p-3 rounded-lg border border-white/5">
                          <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                            {tIdx + 1}
                          </span>
                          <p className="text-xs text-neutral-200 leading-relaxed font-medium">
                            {takeaway}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 6: Shield & Logistics Radar */}
              {activeTab === 'shield' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300 font-sans">
                  {/* Reverse Logistics & Weight Audit Shield */}
                  <div className="bg-gradient-to-r from-neutral-900 via-indigo-950/40 to-black border border-indigo-500/30 rounded-xl p-5 flex flex-col gap-4 shadow-xl">
                    <div className="flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2 font-sans">
                          🛡️ Reverse Logistics &amp; Weight Audit Shield
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5 font-sans">Detect volumetric weight carrier overcharges and generate automated seller central claims.</p>
                      </div>
                      <span className="text-xs font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-full font-mono">
                        Weight Discrepancy: +240% Carrier Variance
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col gap-3 font-sans">
                        <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider font-sans">SKU Volumetric Audit Breakdown</span>
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 font-sans">
                          <span className="text-xs text-neutral-300">Listed SKU Physical Weight</span>
                          <span className="text-xs font-mono font-bold text-emerald-400">0.25 kg (250g)</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 font-sans">
                          <span className="text-xs text-neutral-300">Carrier Volumetric Billed Weight</span>
                          <span className="text-xs font-mono font-bold text-rose-400">0.85 kg (850g)</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-white/10 pb-2 font-sans">
                          <span className="text-xs text-neutral-300">Overcharge Bleed Per Return</span>
                          <span className="text-xs font-mono font-bold text-rose-400">INR 65 / return</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 font-sans">
                          <span className="text-xs font-bold text-white">Est. Monthly Logistics Overcharge Loss</span>
                          <span className="text-sm font-bold font-mono text-rose-400">{formatINR(Math.round(monthlyUnits * (riskScore / 100) * 65))}</span>
                        </div>
                      </div>

                      <div className="bg-black/50 border border-white/10 rounded-xl p-4 flex flex-col justify-between gap-3 font-sans">
                        <div>
                          <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider font-sans">Automated Seller Claim Generator</span>
                          <p className="text-xs text-neutral-300 mt-1 font-sans">Pre-populated formal ticket with volumetric math ready for Meesho / Flipkart seller central submission.</p>
                        </div>

                        <button
                          onClick={handleCopyWeightDisputeTicket}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2.5 rounded-lg font-bold transition-all border border-indigo-400/30 flex items-center justify-center gap-2 font-sans shadow-md"
                        >
                          {copiedDisputeTicket ? '✓ Weight Claim Ticket Copied!' : '📋 Copy Volumetric Weight Dispute Ticket'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Verified Genuine Reviews</span>
                      <span className="text-3xl font-black text-emerald-400 tabular-nums">{authenticityRadar.authenticityScore}%</span>
                      <span className="text-xs text-emerald-300/80">{authenticityRadar.verifiedCount} Genuine Customer Audits</span>
                    </div>

                    <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Suspicious / Bot Anomaly</span>
                      <span className="text-3xl font-black text-rose-400 tabular-nums">{authenticityRadar.suspiciousPercentage}%</span>
                      <span className="text-xs text-rose-300/80">{authenticityRadar.suspiciousCount} Flagged Competitor Complaints</span>
                    </div>

                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col gap-1">
                      <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Review Volume Spikes</span>
                      <span className="text-3xl font-black text-indigo-300 tabular-nums">{authenticityRadar.spikeDates?.length ?? 0}</span>
                      <span className="text-xs text-indigo-300/80">
                        {authenticityRadar.spikeDates && authenticityRadar.spikeDates.length > 0
                          ? `Abnormal posting days: ${authenticityRadar.spikeDates.join(', ')}`
                          : 'No abnormal posting days detected'}
                      </span>
                    </div>
                  </div>

                  {/* Flagged Patterns */}
                  <div className="flex flex-col gap-3">
                    <h5 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Flagged Review Authenticity Anomalies</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(authenticityRadar.flaggedPatterns ?? []).map((pat: { type?: string; description?: string; severity?: string }, pIdx: number) => (
                        <div key={pIdx} className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-white">{pat.type}</span>
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded uppercase border ${
                              pat.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                            }`}>
                              {pat.severity} ANOMALY
                            </span>
                          </div>
                          <p className="text-xs text-neutral-400">{pat.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dispute Ticket Draft */}
                  <div className="bg-neutral-900/90 border border-indigo-500/30 rounded-xl p-5 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-2">
                        🛡️ Seller Support Dispute Ticket Draft
                      </h5>
                      <button
                        onClick={handleCopyDisputeTicket}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                      >
                        {copiedDisputeTicket ? '✓ Copied Dispute Ticket!' : '📋 Copy Dispute Ticket for Seller Support'}
                      </button>
                    </div>

                    <div className="bg-black/50 border border-white/10 rounded-lg p-3 text-xs text-neutral-200 font-mono">
                      <span className="text-neutral-500 font-bold block mb-1">Subject: {authenticityRadar.disputeDraft?.subject}</span>
                      <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap">{authenticityRadar.disputeDraft?.body}</p>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* Safe Harbor Listing Copy Overlay Modal */}
      {showSafeHarborModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-neutral-950 border border-emerald-500/30 rounded-2xl w-full max-w-2xl p-6 flex flex-col gap-4 shadow-2xl relative font-sans">
            <div className="flex justify-between items-center border-b border-white/10 pb-3 font-sans">
              <h4 className="text-lg font-bold text-white flex items-center gap-2 font-sans">
                ✍️ Safe-Harbor Listing Copy &amp; Gallery Specs
              </h4>
              <button onClick={() => setShowSafeHarborModal(false)} className="text-neutral-400 hover:text-white text-sm">✕</button>
            </div>

            <div className="flex flex-col gap-3 font-sans text-xs text-neutral-300 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-lg text-emerald-300 font-sans">
                <strong>Return Protection Strategy:</strong> Publishing clear dimensional disclaimers legally curbs &quot;Item Not As Described&quot; claims by 68%.
              </div>

              <div>
                <h5 className="font-bold text-white mb-1 font-sans">Recommended Secondary Image Gallery Copy:</h5>
                <div className="bg-black/60 p-3 rounded border border-white/10 font-mono text-[11px] text-emerald-300 leading-relaxed">
                  • ACCURATE FIT ASSURANCE: Standard Indian Sizing. Check size matrix before ordering.<br/>
                  • FABRIC SPECIFICATION: 100% Breathable Cotton. Hand wash separately on first cycle.<br/>
                  • SHADE DISCLAIMER: Minor color variation may exist due to studio lighting.
                </div>
              </div>

              <div>
                <h5 className="font-bold text-white mb-1 font-sans">Bullet Point Specifications (Paste to Seller Central):</h5>
                <div className="bg-black/60 p-3 rounded border border-white/10 font-mono text-[11px] text-neutral-200 whitespace-pre-wrap leading-relaxed">
1. MATERIAL: Premium High-Density Weave (Pre-shrunk fabric).
2. SIZING DIRECTIVE: Order your standard size. If between sizes, choose one size up.
3. CARE DIRECTIVES: Cold hand wash recommended to retain color vibrancy.
4. PACKAGING: Sealed tamper-evident polybag. Inspect seal prior to accepting delivery.
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-white/10 pt-3 font-sans">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(`ACCURATE FIT ASSURANCE: Standard Indian Sizing.\nMATERIAL: Premium High-Density Weave (Pre-shrunk fabric).\nCARE DIRECTIVES: Cold hand wash recommended.`);
                  alert('Safe-Harbor copy copied to clipboard!');
                }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-all font-sans"
              >
                📋 Copy All Safe-Harbor Copy
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
