"use client";

import React, { useState, useEffect } from 'react';

export interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (urls: string[], options?: { startDate?: string; endDate?: string; isComparison?: boolean }) => void;
  isLoading: boolean;
  loadingStep?: number;
  currentSkuIndex?: number;
  totalSkus?: number;
  availableCredits: number;
  userPlan?: string;
  currentProductCount?: number;
  maxProductsAllowed?: number;
  onUpgrade?: () => void;
}

export default function AuditModal({
  isOpen,
  onClose,
  onAnalyze,
  isLoading,
  loadingStep = 1,
  availableCredits = 9999,
  userPlan = 'enterprise',
  currentProductCount = 0,
  maxProductsAllowed = 3,
  onUpgrade
}: AuditModalProps) {
  const [inputText, setInputText] = useState('');
  
  // Date Range Picker State
  const [datePreset, setDatePreset] = useState<'30D' | '90D' | 'CUSTOM'>('30D');
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  
  // Time-Machine Comparison Toggle
  const [isComparison, setIsComparison] = useState<boolean>(false);

  // Pre-Flight Estimation State
  const [isEstimating, setIsEstimating] = useState<boolean>(false);
  const [estimation, setEstimation] = useState<{
    reviewVolume: number;
    creditCost: number;
    productTitle?: string;
    price?: number;
  } | null>(null);

  // Free Tier Gating Modal state
  const [showFreeTierGate, setShowFreeTierGate] = useState<boolean>(false);

  // Handle Preset Changes
  const handlePresetSelect = (preset: '30D' | '90D' | 'CUSTOM') => {
    setDatePreset(preset);
    const today = new Date().toISOString().split('T')[0];
    setEndDate(today);

    if (preset === '30D') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
    } else if (preset === '90D') {
      const d = new Date();
      d.setDate(d.getDate() - 90);
      setStartDate(d.toISOString().split('T')[0]);
    }
  };

  // Run Real-Time Pre-Flight Estimation when URL or Date Range changes
  useEffect(() => {
    if (!isOpen || !inputText.trim()) {
      setEstimation(null);
      return;
    }

    const firstUrl = inputText.split('\n').map(u => u.trim()).find(u => u.length > 10);
    if (!firstUrl) {
      setEstimation(null);
      return;
    }

    const timer = setTimeout(async () => {
      setIsEstimating(true);
      try {
        const res = await fetch('/api/preflight', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: firstUrl,
            startDate,
            endDate,
            isComparison
          })
        });
        const data = await res.json();
        if (data.success && data.estimation) {
          setEstimation({
            reviewVolume: data.estimation.reviewVolumeInCohort,
            creditCost: data.estimation.creditCost,
            productTitle: data.estimation.title,
            price: data.estimation.price
          });
        } else {
          // Heuristic fallback cost calculation
          const defaultVol = 148;
          const cost = Math.max(1, Math.ceil(defaultVol / 100)) + (isComparison ? 1 : 0);
          setEstimation({ reviewVolume: defaultVol, creditCost: cost });
        }
      } catch (err) {
        console.warn('[AuditModal] Pre-flight estimation error:', err);
        const cost = 1 + (isComparison ? 1 : 0);
        setEstimation({ reviewVolume: 50, creditCost: cost });
      } finally {
        setIsEstimating(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [isOpen, inputText, startDate, endDate, isComparison]);

  if (!isOpen) return null;

  const isFreePlan = (userPlan || 'enterprise').toLowerCase() === 'hobby' || (userPlan || '').toLowerCase() === 'free';
  const isProductLimitReached = isFreePlan && currentProductCount >= maxProductsAllowed;
  const estimatedReviews = estimation?.reviewVolume || 120;
  const estimatedCost = estimation?.creditCost || (1 + (isComparison ? 1 : 0));

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    if (isProductLimitReached) {
      if (onUpgrade) onUpgrade();
      return;
    }

    // Free Tier 100 Reviews Gating check
    if (isFreePlan && estimatedReviews > 100) {
      setShowFreeTierGate(true);
      return;
    }

    triggerAudit();
  };

  const triggerAudit = (capped100: boolean = false) => {
    const urls = inputText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    if (urls.length === 0) return;

    if (isFreePlan && (currentProductCount + urls.length > maxProductsAllowed)) {
      alert(`Free Plan limit: You can only have up to ${maxProductsAllowed} product links total. You already have ${currentProductCount}.`);
      return;
    }

    setShowFreeTierGate(false);
    onAnalyze(urls, {
      startDate: isFreePlan ? undefined : startDate,
      endDate: isFreePlan ? undefined : endDate,
      isComparison: isFreePlan ? false : isComparison
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col relative font-sans">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/10 bg-gradient-to-r from-indigo-950/40 via-neutral-950 to-black">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg shadow-[0_0_15px_rgba(79,70,229,0.3)]">
              ⚡
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">Smart Pre-Flight Audit Configurator</h3>
              <p className="text-xs text-neutral-400">
                {isFreePlan ? 'Free Tier: Analyze latest 100 reviews per SKU (up to 3 links total).' : 'Configure temporal cohorts, compare seasonal variance & review volume credits.'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-sm transition-colors disabled:opacity-50"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex flex-col gap-5 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* Free Tier Product Limit Warning Banner */}
          {isFreePlan && (
            <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs ${
              isProductLimitReached 
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' 
                : 'bg-amber-500/10 border-amber-500/20 text-amber-300'
            }`}>
              <div className="flex items-center gap-2">
                <span>{isProductLimitReached ? '🚫' : 'ℹ️'}</span>
                <span>
                  <strong>Free Plan Quota:</strong> {currentProductCount}/{maxProductsAllowed} product links used.
                  {isProductLimitReached 
                    ? ' Limit reached. Upgrade to Growth Seller for unlimited product links.' 
                    : ` (${maxProductsAllowed - currentProductCount} link slot${maxProductsAllowed - currentProductCount === 1 ? '' : 's'} remaining)`}
                </span>
              </div>
              {onUpgrade && (
                <button
                  type="button"
                  onClick={onUpgrade}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors shrink-0"
                >
                  Upgrade
                </button>
              )}
            </div>
          )}

          {/* Direct Marketplace URL Input (Bulk CSV tab removed) */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-neutral-300 uppercase tracking-wider">
                Direct Marketplace URL(s)
              </label>
              <span className="text-[10px] text-neutral-500 font-mono">Supports Meesho &amp; Flipkart</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              disabled={isLoading || isProductLimitReached}
              placeholder="Paste Meesho or Flipkart product URL...&#10;https://meesho.com/s/p/...&#10;https://flipkart.com/product/p/itm..."
              className="w-full h-24 bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono resize-none disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>

          {/* Temporal Cohort Date Range Picker (Locked for Free Plan) */}
          <div className={`border rounded-xl p-4 flex flex-col gap-3 transition-all ${
            isFreePlan 
              ? 'bg-neutral-900/40 border-white/5 opacity-75' 
              : 'bg-white/[0.02] border-white/10'
          }`}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                📅 Temporal Cohort Date Range
                {isFreePlan && (
                  <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase">
                    PRO / GROWTH ONLY
                  </span>
                )}
              </span>
              <div className="flex gap-1">
                {(['30D', '90D', 'CUSTOM'] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    disabled={isFreePlan}
                    onClick={() => handlePresetSelect(p)}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all ${
                      isFreePlan
                        ? 'bg-neutral-900 text-neutral-600 border-white/5 cursor-not-allowed'
                        : datePreset === p
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'bg-black/40 text-neutral-400 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {p === '30D' ? 'Last 30 Days' : p === '90D' ? 'Last Quarter' : 'Custom Range'}
                  </button>
                ))}
              </div>
            </div>

            {isFreePlan ? (
              <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-300">
                <div className="flex items-center gap-2">
                  <span>🔒</span>
                  <p className="text-[11px] leading-snug">
                    <strong>Date Range Locked:</strong> Free tier audits analyze the latest 100 reviews. Upgrade to filter by date cohorts &amp; unlock seasonal variance.
                  </p>
                </div>
                {onUpgrade && (
                  <button
                    type="button"
                    onClick={onUpgrade}
                    className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg text-[10px] uppercase tracking-wider transition-colors shrink-0 ml-2"
                  >
                    Unlock
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-neutral-400">Start Date</label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => { setStartDate(e.target.value); setDatePreset('CUSTOM'); }}
                    className="bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-semibold text-neutral-400">End Date</label>
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => { setEndDate(e.target.value); setDatePreset('CUSTOM'); }}
                    className="bg-black/60 border border-white/10 rounded-lg p-2 text-xs text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Time-Machine Comparison Toggle */}
          <div className="bg-gradient-to-r from-purple-950/20 via-neutral-900 to-black border border-purple-500/20 rounded-xl p-4 flex items-center justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                ⏳ Time-Machine Seasonal Comparison
              </span>
              <span className="text-[11px] text-neutral-400">
                Compare MoM / YoY seasonal variance &amp; emerging defect spikes (+1 Credit computation fee).
              </span>
            </div>
            <button
              type="button"
              disabled={isFreePlan}
              onClick={() => setIsComparison(!isComparison)}
              className={`w-12 h-6 rounded-full transition-colors relative border border-white/10 ${
                isFreePlan ? 'opacity-40 cursor-not-allowed bg-neutral-800' : isComparison ? 'bg-purple-600' : 'bg-neutral-800'
              }`}
            >
              <div className={`absolute top-0.5 left-0.5 bg-white w-5 h-5 rounded-full transition-transform ${isComparison ? 'translate-x-6' : ''}`}></div>
            </button>
          </div>

          {/* Real-time Pre-Flight Credit Balance Estimator */}
          <div className="bg-indigo-950/30 border border-indigo-500/30 rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-xl">💳</div>
              <div>
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider block">Pre-Flight Audit Estimation</span>
                {isEstimating ? (
                  <span className="text-xs text-neutral-400 animate-pulse">Calculating exact review volume in temporal cohort...</span>
                ) : (
                  <p className="text-xs text-neutral-200 mt-0.5">
                    {isFreePlan ? (
                      <>Free plan audits up to <strong className="text-indigo-400 font-mono">100 reviews</strong> per product.</>
                    ) : (
                      <>Auditing <strong className="text-indigo-400 font-mono">{estimatedReviews}</strong> reviews will use <strong className="text-amber-400 font-mono">{estimatedCost} credit{estimatedCost > 1 ? 's' : ''}</strong>.</>
                    )}
                  </p>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                {isFreePlan ? 'Product Links' : 'Remaining Balance'}
              </span>
              <span className="text-sm font-black text-amber-400 font-mono">
                {isFreePlan ? `${currentProductCount}/${maxProductsAllowed} Used` : `⚡ ${availableCredits} Credits`}
              </span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-white/10 bg-neutral-950 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 bg-white/5 hover:bg-white/10 text-neutral-300 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleFormSubmit}
            disabled={isLoading || !inputText.trim() || isProductLimitReached}
            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Processing Audit Pipeline...' : isProductLimitReached ? 'Product Limit Reached (3/3) — Upgrade' : `⚡ Execute Smart AI Audit`}
          </button>
        </div>

      </div>

      {/* Free Tier Gating Modal */}
      {showFreeTierGate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in">
          <div className="bg-neutral-950 border border-amber-500/40 rounded-2xl w-full max-w-md p-6 flex flex-col gap-4 shadow-2xl relative font-sans text-center">
            <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-2xl flex items-center justify-center mx-auto">
              👑
            </div>

            <div>
              <h4 className="text-lg font-black text-white">Free Plan Review Limit Reached</h4>
              <p className="text-xs text-neutral-300 mt-1 leading-relaxed">
                This product contains <strong className="text-amber-400">{estimatedReviews} reviews</strong>. Free plan is limited to auditing up to the latest 100 reviews per SKU.
              </p>
            </div>

            <div className="bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl text-[11px] text-amber-300 text-left">
              <strong>Growth Seller Plan Benefits (₹1,499/mo):</strong>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-neutral-300">
                <li>Audit up to 10,000+ reviews per temporal cohort</li>
                <li>Time-Machine YoY/MoM seasonal variance analysis</li>
                <li>Unlimited product links in catalog</li>
                <li>Bilingual English/Hindi factory QA mandate downloads</li>
              </ul>
            </div>

            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => {
                  if (onUpgrade) onUpgrade();
                  else alert('Redirecting to Growth Seller Subscription (₹1,499)...');
                }}
                className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-indigo-600 hover:from-amber-400 hover:to-indigo-500 text-white rounded-xl text-xs font-black shadow-lg uppercase tracking-wider"
              >
                Upgrade to Growth Seller — ₹1,499
              </button>

              <button
                onClick={() => triggerAudit(true)}
                className="w-full py-2 bg-white/5 hover:bg-white/10 text-neutral-300 border border-white/10 rounded-xl text-xs font-bold transition-colors"
              >
                Analyze Latest 100 Free
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
