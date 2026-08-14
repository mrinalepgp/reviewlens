"use client";

export const maxDuration = 120;

import React, { useState, useEffect } from 'react';
import { analyzeUrlsAction, compareCompetitorAction, AnalyzedProductSummary, fetchProductReviewsAction, ReviewAnalysisRow } from '@/app/actions';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Types ---
type HealthStatus = 'safe' | 'warning' | 'critical';

// --- Components ---

function SystemHealthBanner({ status }: { status: 'safe' | 'critical' }) {
  const [isOpen, setIsOpen] = useState(false);
  const isSafe = status === 'safe';
  
  return (
    <>
      <div className={`w-full rounded-xl p-4 flex items-center justify-between border ${isSafe ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'}`}>
        <div className="flex items-center gap-3">
          {isSafe ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          )}
          <span className="font-medium text-sm">
            {isSafe ? 'System Health: Optimal. All AI scraping pipelines operational.' : 'System Health: Critical. Scraping delay detected on nodes.'}
          </span>
        </div>
        <button 
          onClick={() => setIsOpen(true)}
          className="text-xs font-semibold px-3 py-1 rounded bg-white/5 hover:bg-white/10 transition-colors"
        >
          View Details
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-white/10">
              <h3 className="text-lg font-bold text-white">System Infrastructure Health</h3>
              <button 
                onClick={() => setIsOpen(false)} 
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">Database Connection</span>
                <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active (Supabase Cloud)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">AI Engine Status</span>
                <span className="text-sm font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Active (Gemini Flash API)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-neutral-400">Scraper Infrastructure</span>
                <span className="text-sm font-medium text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">Operational (Meesho/Flipkart)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function IngestionCard({
  onAnalyze,
  isLoading
}: {
  onAnalyze: (urls: string[]) => void;
  isLoading: boolean;
}) {
  const [inputText, setInputText] = useState("");
  const [loadingText, setLoadingText] = useState("Parsing product reviews...");

  useEffect(() => {
    if (!isLoading) return;
    const texts = [
      "Parsing product reviews...",
      "Analyzing return risk vectors...",
      "Compiling seller playbook..."
    ];
    let i = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleStart = () => {
    if (!inputText.trim()) return;
    const urls = inputText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    onAnalyze(urls);
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 h-full">
      <div>
        <h2 className="text-lg font-semibold text-white">Bulk Product Ingestion</h2>
        <p className="text-sm text-neutral-400 mt-1">Paste product URLs (Meesho/Flipkart) to begin vernacular analysis.</p>
      </div>
      
      <textarea 
        value={inputText}
        onChange={(e) => setInputText(e.target.value)}
        disabled={isLoading}
        className="w-full flex-grow min-h-[150px] bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none placeholder:text-neutral-600 disabled:opacity-50"
        placeholder="https://flipkart.com/product/p/itme...&#10;https://meesho.com/s/p/..."
      />
      
      <div className="flex justify-end pt-2">
        <button 
          onClick={handleStart}
          disabled={isLoading || !inputText.trim()}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-medium text-sm transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50 disabled:shadow-none"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {loadingText}
            </>
          ) : (
            '⚡ Start AI Analysis'
          )}
        </button>
      </div>
    </div>
  );
}

function RiskBadge({ status }: { status: HealthStatus }) {
  switch (status) {
    case 'critical':
      return <span className="px-2.5 py-1 text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full">Critical Risk</span>;
    case 'warning':
      return <span className="px-2.5 py-1 text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full">Warning</span>;
    case 'safe':
      return <span className="px-2.5 py-1 text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">Optimal</span>;
  }
}

function RiskRadar({ 
  results, 
  isLoading,
  onSelectProduct 
}: { 
  results: AnalyzedProductSummary[],
  isLoading: boolean,
  onSelectProduct: (product: AnalyzedProductSummary) => void 
}) {
  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-6 h-full">
      <div>
        <h2 className="text-lg font-semibold text-white">Risk Radar</h2>
        <p className="text-sm text-neutral-400 mt-1">Real-time alerts prioritized by AI sentiment urgency. Click to view detailed reviews.</p>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex p-4 rounded-xl bg-black/40 border border-white/5 h-20 items-center">
                <div className="w-12 h-6 bg-white/10 rounded mr-4"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4"></div>
                  <div className="h-4 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="flex items-center justify-center h-32 rounded-xl border border-dashed border-white/10 text-sm text-neutral-500">
            Awaiting input URLs to begin analysis...
          </div>
        ) : (
          results.map((alert, idx) => (
            <div 
              key={idx} 
              onClick={() => onSelectProduct(alert)}
              className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-colors gap-4 cursor-pointer group"
            >
              <div className="flex flex-col gap-1.5 w-full">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded uppercase">
                    {alert.platform}
                  </span>
                  <span className="text-sm font-medium text-neutral-200 line-clamp-1 flex-1 group-hover:text-white transition-colors">
                    {alert.title}
                  </span>
                  <span className="text-xs font-semibold bg-neutral-800 text-neutral-300 px-2 py-0.5 rounded ml-auto">
                    ⭐ {alert.averageScore.toFixed(1)}
                  </span>
                </div>
                
                {alert.negativeThemes.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mt-1">
                    {alert.negativeThemes.map((theme, i) => (
                      <span key={i} className="text-xs text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                        {theme}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-neutral-400 italic">No major issues identified.</p>
                )}
              </div>
              
              <div className="flex items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0 ml-4">
                <RiskBadge status={alert.riskAssessment} />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function ExecutiveIntelligenceConsoleModal({
  product,
  onClose
}: {
  product: AnalyzedProductSummary;
  onClose: () => void;
}) {
  const [activeTab, setActiveTab] = useState<'diagnostics' | 'playbook' | 'vernacular' | 'reviews' | 'competitors' | 'shield'>('diagnostics');
  const [reviewFilter, setReviewFilter] = useState<'ALL' | 'CRITICAL DEFECT' | 'NEGATIVE' | 'POSITIVE'>('ALL');
  
  // Competitor Radar State
  const [customCompetitorUrl, setCustomCompetitorUrl] = useState('');
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);
  
  // Calculator State
  const [monthlyUnits, setMonthlyUnits] = useState<number>(1000);
  const [asp, setAsp] = useState<number>(999);
  const [returnCost, setReturnCost] = useState<number>(180);
  
  const intelligence = product.intelligence || {};
  
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
  const reviews = intelligence.reviews || [];
  
  // Helpers
  const getSeverityColor = (score: number, inverse = false) => {
    // If inverse, higher score is better (e.g. Health Score). If normal, higher score is worse (e.g. Risk Score)
    const isBad = inverse ? score < 50 : score > 70;
    const isWarning = inverse ? (score >= 50 && score < 80) : (score > 30 && score <= 70);
    
    if (isBad) return 'text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
    if (isWarning) return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
  };
  
  const filteredReviews = reviews?.filter((r: any) => reviewFilter === 'ALL' || r.badge === reviewFilter) || [];
  
  // Calculator Logic
  const formatINR = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };
  
  const riskScore = executiveScorecard?.returnRiskScore || 0;
  const projectedBleed = monthlyUnits * (riskScore / 100) * returnCost;
  const recoverableMargin = projectedBleed * 0.40;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden ring-1 ring-white/5">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-gradient-to-b from-white/[0.02] to-transparent shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="px-2 py-0.5 rounded text-xs font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                EXECUTIVE CONSOLE
              </div>
              <span className="text-xs text-neutral-500 uppercase tracking-wider">{product.platform}</span>
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">{product.title}</h3>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-all bg-black/40 border border-white/5">
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-8 custom-scrollbar">
          
          {/* Top KPI Ribbon */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-5 rounded-xl border flex flex-col gap-2 transition-all ${getSeverityColor(executiveScorecard?.returnRiskScore || 0)}`}>
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Return Probability Index</span>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black tabular-nums">{executiveScorecard?.returnRiskScore || 0}</span>
                <span className="text-sm font-medium mb-1 opacity-70">/ 100</span>
              </div>
            </div>
            
            <div className="p-5 rounded-xl border border-white/10 bg-white/5 backdrop-blur-md flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Estimated Margin Loss</span>
              <span className="text-4xl font-black text-white tabular-nums">{executiveScorecard?.estimatedMarginLossRange || "N/A"}</span>
            </div>
            
            <div className={`p-5 rounded-xl border flex flex-col gap-2 transition-all ${getSeverityColor(executiveScorecard?.listingHealthScore || 0, true)}`}>
              <span className="text-xs font-semibold uppercase tracking-wider opacity-80">Listing Health Score</span>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black tabular-nums">{executiveScorecard?.listingHealthScore || 0}</span>
                <span className="text-sm font-medium mb-1 opacity-70">/ 100</span>
              </div>
            </div>
          </div>

          {/* Interactive Financial Margin Recovery Calculator */}
          <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 flex flex-col gap-6">
            <div>
              <h4 className="text-lg font-semibold text-white">ROI & Margin Recovery Calculator</h4>
              <p className="text-sm text-neutral-400 mt-1">Estimate preventable losses using the AI return risk score and calculate actionable recovery.</p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Inputs */}
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-neutral-300">Monthly Units Sold</label>
                  <input 
                    type="number" 
                    value={monthlyUnits} 
                    onChange={(e) => setMonthlyUnits(Number(e.target.value) || 0)}
                    className="bg-black/40 border border-white/10 rounded-lg p-2.5 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full max-w-xs"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-neutral-300">Average Selling Price (ASP)</label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-2.5 text-neutral-500">₹</span>
                    <input 
                      type="number" 
                      value={asp} 
                      onChange={(e) => setAsp(Number(e.target.value) || 0)}
                      className="bg-black/40 border border-white/10 rounded-lg p-2.5 pl-8 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full"
                    />
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium text-neutral-300">Return Logistics Cost per Unit</label>
                  <div className="relative max-w-xs">
                    <span className="absolute left-3 top-2.5 text-neutral-500">₹</span>
                    <input 
                      type="number" 
                      value={returnCost} 
                      onChange={(e) => setReturnCost(Number(e.target.value) || 0)}
                      className="bg-black/40 border border-white/10 rounded-lg p-2.5 pl-8 text-sm text-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Outputs */}
              <div className="flex flex-col gap-4 justify-center">
                <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-5 shadow-[0_0_15px_rgba(244,63,94,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">Monthly Financial Bleed</span>
                  <div className="text-3xl font-black text-white mt-1 mb-2 tabular-nums">{formatINR(projectedBleed)}</div>
                  <span className="text-xs text-rose-300/80 bg-rose-500/10 px-2 py-1 rounded inline-block border border-rose-500/20">
                    Logistics + processing loss on preventable returns
                  </span>
                </div>
                
                <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-5 shadow-[0_0_15px_rgba(16,185,129,0.05)] relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Recoverable Profit</span>
                  <div className="text-3xl font-black text-emerald-400 mt-1 mb-2 tabular-nums">{formatINR(recoverableMargin)}</div>
                  <span className="text-xs text-emerald-300/80 bg-emerald-500/10 px-2 py-1 rounded inline-block border border-emerald-500/20">
                    With ReviewLens Listing & QC Mitigation
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Tabs */}
          <div className="flex flex-col gap-4">
            <div className="flex space-x-1 bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
              {[
                { id: 'diagnostics', label: 'Root-Cause' },
                { id: 'playbook', label: 'Mitigation Playbook' },
                { id: 'vernacular', label: 'Vernacular Decoder' },
                { id: 'reviews', label: 'Review Stream' },
                { id: 'competitors', label: 'Competitor Radar' },
                { id: 'shield', label: 'Shield Radar (Authenticity)' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id 
                    ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]' 
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-white/5'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 min-h-[300px]">
              
              {/* Tab 1: Diagnostics */}
              {activeTab === 'diagnostics' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h4 className="text-lg font-semibold text-white">Defect Taxonomy</h4>
                  <div className="grid gap-4">
                    {defectTaxonomy?.map((defect: any, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden">
                        <div className="flex justify-between items-start z-10">
                          <div>
                            <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">{defect.category}</span>
                            <p className="text-neutral-200 mt-1 font-medium">{defect.description}</p>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-bold ${defect.severity === 'HIGH' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
                            {defect.severity} SEVERITY
                          </span>
                        </div>
                        <div className="flex items-center gap-3 z-10 mt-2">
                          <span className="text-sm text-neutral-400 w-12">{defect.frequencyPercent}%</span>
                          <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${defect.frequencyPercent}%` }}></div>
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
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>
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

              {/* Tab 3: Vernacular */}
              {activeTab === 'vernacular' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h4 className="text-lg font-semibold text-white">Vernacular Intent Decoder</h4>
                  <div className="grid gap-4">
                    {vernacularDecoder?.map((item: any, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
                        <div className="flex flex-col gap-1">
                          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Original Raw Text</span>
                          <p className="text-neutral-300 italic">"{item.rawVernacularText}"</p>
                        </div>
                        <div className="flex flex-col gap-1 md:border-l md:border-white/10 md:pl-6">
                          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Decoded Intent</span>
                          <p className="text-indigo-300 font-medium">{item.decodedIntent}</p>
                        </div>
                        <div className="flex flex-col gap-1 md:border-l md:border-white/10 md:pl-6">
                          <span className="text-xs text-neutral-500 font-semibold uppercase tracking-wider">Business Impact</span>
                          <span className="inline-flex w-fit items-center px-2.5 py-1 rounded-md text-xs font-bold bg-white/5 text-neutral-200 border border-white/10 shadow-sm mt-1">
                            {item.businessImpactCategory}
                          </span>
                        </div>
                      </div>
                    ))}
                    {!vernacularDecoder?.length && <p className="text-neutral-500 italic">No vernacular patterns detected.</p>}
                  </div>
                </div>
              )}

              {/* Tab 4: Reviews */}
              {activeTab === 'reviews' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <div className="flex items-center gap-2 flex-wrap">
                    {['ALL', 'CRITICAL DEFECT', 'NEGATIVE', 'POSITIVE', 'NEUTRAL'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setReviewFilter(filter as any)}
                        className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                          reviewFilter === filter 
                          ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30' 
                          : 'bg-black/40 text-neutral-400 border-white/5 hover:bg-white/5'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid gap-4">
                    {filteredReviews.map((rev: any, idx: number) => (
                      <div key={idx} className={`bg-black/40 border transition-colors rounded-xl p-5 flex flex-col gap-3 relative ${
                        rev.isSuspicious ? 'border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.1)]' : 'border-white/5 hover:border-white/10'
                      }`}>
                        {rev.isSuspicious && (
                          <div className="absolute -top-3 -right-2 bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded shadow-lg border border-rose-400 z-10 flex items-center gap-1">
                            <span>⚠️</span> SUSPICIOUS / ATTACK
                          </div>
                        )}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-sm bg-neutral-800 px-2 py-1 rounded-md text-neutral-200 font-bold border border-white/5 shadow-sm">
                              ⭐ {rev.rating}
                            </span>
                            <span className="text-sm font-semibold text-white pr-4">{rev.title}</span>
                          </div>
                          <span className={`text-xs px-2 py-1 rounded font-bold uppercase tracking-wider whitespace-nowrap ${
                            rev.badge === 'CRITICAL DEFECT' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                            rev.badge === 'NEGATIVE' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                            rev.badge === 'POSITIVE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                            'bg-neutral-500/20 text-neutral-400 border border-white/10'
                          }`}>
                            {rev.badge || 'NEUTRAL'}
                          </span>
                        </div>
                        <p className="text-sm text-neutral-300 leading-relaxed">
                          {rev.comment}
                        </p>
                      </div>
                    ))}
                    {filteredReviews.length === 0 && (
                      <div className="text-center py-10 text-neutral-500 border border-dashed border-white/10 rounded-xl">
                        No reviews found for filter: {reviewFilter}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 5: Competitors */}
              {activeTab === 'competitors' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {comparisonResult ? (
                    <div className="flex flex-col gap-6">
                      <div className="flex justify-between items-center">
                        <h4 className="text-xl font-bold text-white">Head-to-Head Matrix</h4>
                        <button onClick={() => setComparisonResult(null)} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white rounded-lg transition-colors text-sm font-medium">Back to Radar</button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Clash Scorecard */}
                        <div className="bg-black/40 border border-white/5 rounded-xl p-6 flex flex-col gap-4">
                          <h5 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider mb-2">Clash Scorecard</h5>
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-300">Return Risk</span>
                            <div className="flex gap-4 font-mono">
                              <span className={comparisonResult.clashScorecard.ourRisk < comparisonResult.clashScorecard.theirRisk ? "text-emerald-400 font-bold" : "text-rose-400"}>{comparisonResult.clashScorecard.ourRisk}</span>
                              <span className="text-neutral-600">vs</span>
                              <span className={comparisonResult.clashScorecard.theirRisk < comparisonResult.clashScorecard.ourRisk ? "text-emerald-400 font-bold" : "text-neutral-400"}>{comparisonResult.clashScorecard.theirRisk}</span>
                            </div>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-neutral-300">Listing Health</span>
                            <div className="flex gap-4 font-mono">
                              <span className={comparisonResult.clashScorecard.ourHealth > comparisonResult.clashScorecard.theirHealth ? "text-emerald-400 font-bold" : "text-rose-400"}>{comparisonResult.clashScorecard.ourHealth}</span>
                              <span className="text-neutral-600">vs</span>
                              <span className={comparisonResult.clashScorecard.theirHealth > comparisonResult.clashScorecard.ourHealth ? "text-emerald-400 font-bold" : "text-neutral-400"}>{comparisonResult.clashScorecard.theirHealth}</span>
                            </div>
                          </div>
                        </div>

                        {/* Where You Win */}
                        <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-6 flex flex-col gap-3">
                          <h5 className="text-sm font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Where You Win
                          </h5>
                          <ul className="flex flex-col gap-2">
                            {comparisonResult.whereYouWin.map((point: string, idx: number) => (
                              <li key={idx} className="text-sm text-neutral-200 leading-relaxed">• {point}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Where They Win */}
                        <div className="bg-rose-500/5 border border-rose-500/10 rounded-xl p-6 flex flex-col gap-3">
                          <h5 className="text-sm font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            Vulnerabilities
                          </h5>
                          <ul className="flex flex-col gap-2">
                            {comparisonResult.whereTheyWin.map((point: string, idx: number) => (
                              <li key={idx} className="text-sm text-neutral-200 leading-relaxed">• {point}</li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Market Steal Strategy */}
                      <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-6">
                        <h5 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                          Market-Steal Strategy
                        </h5>
                        <div className="grid md:grid-cols-2 gap-4">
                          {comparisonResult.marketStealStrategy.map((tactic: string, idx: number) => (
                            <div key={idx} className="bg-black/40 rounded-lg p-4 text-sm text-neutral-200 border border-white/5">
                              {tactic}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : isComparing ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <svg className="animate-spin h-8 w-8 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <p className="text-neutral-400 font-medium">Scraping competitor data and generating AI clash matrix...</p>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col gap-2">
                        <h4 className="text-lg font-semibold text-white">Auto-Discovered Rivals</h4>
                        <p className="text-sm text-neutral-400">Top organic competitors in this price band extracted via AI.</p>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {intelligence?.competitorDiscovery?.map((comp: any, idx: number) => (
                          <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col justify-between gap-4">
                            <div>
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded border border-indigo-500/20">{comp.targetCompetitorCategory}</span>
                              </div>
                              <h5 className="font-medium text-neutral-200 line-clamp-2">{comp.suggestedSearchKeyword}</h5>
                              <p className="text-sm text-neutral-500 mt-2">Target Keyword for Ads/SEO</p>
                            </div>
                          </div>
                        ))}
                        {!intelligence?.competitorDiscovery?.length && <p className="text-neutral-500 italic col-span-2">No competitor targets discovered.</p>}
                      </div>

                      <div className="mt-8 pt-8 border-t border-white/10">
                        <h4 className="text-sm font-semibold text-white mb-4">Or paste a specific competitor URL</h4>
                        <div className="flex gap-3">
                          <input 
                            type="text" 
                            placeholder="https://flipkart.com/..." 
                            value={customCompetitorUrl}
                            onChange={(e) => setCustomCompetitorUrl(e.target.value)}
                            className="flex-1 bg-black/40 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                          />
                          <button 
                            disabled={!customCompetitorUrl}
                            onClick={async () => {
                              setIsComparing(true);
                              const res = await compareCompetitorAction(intelligence, customCompetitorUrl);
                              if (res.success) setComparisonResult(res.matrix);
                              setIsComparing(false);
                            }}
                            className="px-6 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
                          >
                            Compare Custom SKU
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Tab 6: Shield Radar */}
              {activeTab === 'shield' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  {intelligence.authenticityRadar ? (
                    <>
                      {/* Authenticity Gauge */}
                      <div className="bg-black/40 border border-white/5 rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex flex-col gap-1">
                          <h4 className="text-lg font-bold text-white">Review Authenticity Score</h4>
                          <p className="text-sm text-neutral-400">AI analysis of review timing, language repetition, and sentiment anomalies.</p>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="flex flex-col items-end">
                            <span className="text-3xl font-black text-white tabular-nums">{intelligence.authenticityRadar.authenticityScore}</span>
                            <span className="text-xs text-neutral-500 uppercase tracking-wider font-semibold">/ 100</span>
                          </div>
                          <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider border flex items-center gap-2 ${
                            intelligence.authenticityRadar.attackRiskLevel === 'HIGH' 
                              ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' 
                              : intelligence.authenticityRadar.attackRiskLevel === 'MEDIUM'
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          }`}>
                            {intelligence.authenticityRadar.attackRiskLevel === 'HIGH' ? '🔴 High Attack Probability' : intelligence.authenticityRadar.attackRiskLevel === 'MEDIUM' ? '🟠 Medium Risk' : '🟢 Natural Sentiment'}
                          </div>
                        </div>
                      </div>

                      {/* Flagged Anomaly Cards */}
                      {intelligence.authenticityRadar.flaggedPatterns && intelligence.authenticityRadar.flaggedPatterns.length > 0 && (
                        <div className="flex flex-col gap-4">
                          <h4 className="text-sm font-semibold text-white uppercase tracking-wider">Flagged Anomalies ({intelligence.authenticityRadar.suspiciousReviewCount} Reviews Affected)</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {intelligence.authenticityRadar.flaggedPatterns.map((pattern: any, idx: number) => (
                              <div key={idx} className={`border rounded-xl p-5 ${
                                pattern.severity === 'HIGH' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'
                              }`}>
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`text-xs font-bold px-2 py-1 rounded border ${
                                    pattern.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                  }`}>{pattern.type}</span>
                                </div>
                                <p className="text-sm text-neutral-300 mt-3 leading-relaxed">{pattern.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Marketplace Dispute Ticket */}
                      {intelligence.authenticityRadar.disputeDraft && (
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl p-6 mt-2">
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h4 className="text-sm font-semibold text-indigo-400 uppercase tracking-wider">Marketplace Dispute Ticket</h4>
                              <p className="text-xs text-neutral-400 mt-1">Ready-to-send draft for Seller Support.</p>
                            </div>
                            <button 
                              onClick={() => {
                                const draft = `Subject: ${intelligence.authenticityRadar.disputeDraft.subject}\n\n${intelligence.authenticityRadar.disputeDraft.body}`;
                                navigator.clipboard.writeText(draft);
                              }}
                              className="px-3 py-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 rounded text-xs font-medium transition-colors flex items-center gap-1.5"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
                              Copy Support Ticket
                            </button>
                          </div>
                          <div className="bg-black/60 rounded-lg p-4 border border-white/5 font-mono text-sm text-neutral-300">
                            <p className="font-semibold text-white mb-2">Subject: {intelligence.authenticityRadar.disputeDraft.subject}</p>
                            <p className="whitespace-pre-wrap text-neutral-400">{intelligence.authenticityRadar.disputeDraft.body}</p>
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-20 text-neutral-500 border border-dashed border-white/10 rounded-xl">
                      Authenticity Radar data not available for this snapshot.
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Main Page ---

export default function Dashboard() {
  const [results, setResults] = useState<AnalyzedProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AnalyzedProductSummary | null>(null);

  const handleAnalyze = async (urls: string[]) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await Promise.race([
        analyzeUrlsAction(urls),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error("TIMEOUT_90S")), 90000)
        )
      ]);
      
      if (response.success) {
        // Prepend new results to the existing array so the newest are on top
        setResults((prev) => [...response.summaries, ...prev]);
      } else {
        console.error(response.error);
        setError("Pipeline Error: " + response.error);
      }
    } catch (err: any) {
      console.error(err);
      if (err.message === "TIMEOUT_90S" || err.message?.includes("504") || err.message?.includes("timeout")) {
        setError("The request took too long to complete. Please try analyzing a direct product page link or re-submit.");
      } else {
        setError("A fatal error occurred during pipeline execution. " + (err.message || ''));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
        <div className="container mx-auto flex h-14 max-w-7xl items-center px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-indigo-600 text-white font-bold text-xs">
              R
            </div>
            <span className="text-sm font-semibold tracking-tight text-neutral-200">ReviewLens Command Center</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-6xl px-4 sm:px-6 py-8 flex flex-col gap-8 relative">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Dashboard Overview</h1>
          <p className="text-sm text-neutral-400">Monitor your product catalog and trigger AI analyses.</p>
        </header>

        {error && (
          <div className="w-full rounded-xl p-4 flex items-center justify-between border bg-rose-500/10 border-rose-500/20 text-rose-400">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-medium text-sm">
                {error}
              </span>
            </div>
            <button onClick={() => setError(null)} className="text-xs font-semibold px-3 py-1 hover:bg-white/10 rounded transition-colors">
              Dismiss
            </button>
          </div>
        )}

        {/* 1. Global System Health Banner */}
        <SystemHealthBanner status="safe" />

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* 2. Bulk Product Ingestion Card */}
          <div className="lg:col-span-2">
            <IngestionCard onAnalyze={handleAnalyze} isLoading={isLoading} />
          </div>

          {/* 3. Priority-sorted Risk Radar */}
          <div className="lg:col-span-3">
            <RiskRadar results={results} isLoading={isLoading} onSelectProduct={setSelectedProduct} />
          </div>
        </div>
      </main>

      {selectedProduct && (
        <ExecutiveIntelligenceConsoleModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}
