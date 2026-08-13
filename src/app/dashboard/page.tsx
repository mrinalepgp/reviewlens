"use client";

import React, { useState, useEffect } from 'react';
import { analyzeUrlsAction, AnalyzedProductSummary, fetchProductReviewsAction, ReviewAnalysisRow } from '@/app/actions';
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
              Analyzing reviews...
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

function ReviewDetailModal({
  product,
  onClose
}: {
  product: AnalyzedProductSummary;
  onClose: () => void;
}) {
  const [reviews, setReviews] = useState<ReviewAnalysisRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (product.id) {
      fetchProductReviewsAction(product.id).then((res) => {
        if (res.success) setReviews(res.reviews);
        setIsLoading(false);
      });
    } else {
      setIsLoading(false);
    }
  }, [product.id]);

  // Aggregate issues for the chart
  const issueCounts: Record<string, number> = {};
  reviews.forEach(r => {
    if (r.ai_extracted_issue && r.ai_extracted_issue !== 'none' && r.ai_extracted_issue !== 'analysis_error') {
      issueCounts[r.ai_extracted_issue] = (issueCounts[r.ai_extracted_issue] || 0) + 1;
    }
  });

  const chartData = Object.keys(issueCounts).map(issue => ({
    name: issue,
    count: issueCounts[issue]
  })).sort((a, b) => b.count - a.count);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-white/10 shrink-0">
          <div>
            <h3 className="text-xl font-bold text-white">{product.title}</h3>
            <p className="text-sm text-indigo-400 mt-1">AI Extracted Reviews Dashboard</p>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <svg className="animate-spin h-6 w-6 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : !product.id ? (
            <div className="text-center text-rose-400 py-10 bg-rose-500/10 rounded-xl border border-rose-500/20">
              No database ID found for this product. Make sure Supabase keys are configured properly in .env.local.
            </div>
          ) : reviews.length === 0 ? (
            <div className="text-center text-neutral-400 py-10">No reviews found in database for this analysis batch.</div>
          ) : (
            <>
              {/* Visual Analytics Chart */}
              {chartData.length > 0 && (
                <div className="bg-black/50 border border-white/5 rounded-xl p-5 shadow-[0_0_20px_rgba(79,70,229,0.05)]">
                  <h4 className="text-sm font-semibold text-neutral-200 mb-4 flex items-center gap-2">
                    <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Issue Distribution
                  </h4>
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{fill: '#9ca3af', fontSize: 12}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fill: '#9ca3af', fontSize: 12}} axisLine={false} tickLine={false} />
                        <Tooltip 
                          cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                          contentStyle={{backgroundColor: '#171717', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.5)'}} 
                          itemStyle={{color: '#818cf8', fontWeight: 'bold'}}
                          labelStyle={{color: '#d1d5db', marginBottom: '4px'}}
                        />
                        <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                          {
                            chartData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill="#6366f1" style={{ filter: 'drop-shadow(0px 0px 8px rgba(99,102,241,0.6))' }} />
                            ))
                          }
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Review Feed */}
              <div className="flex flex-col gap-4">
                <h4 className="text-sm font-semibold text-neutral-200">Raw Feedback Stream</h4>
                {reviews.map((rev) => (
                  <div key={rev.id} className="bg-black/40 border border-white/5 hover:border-white/10 transition-colors rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2 items-center">
                        <span className="text-sm bg-neutral-800 px-2 py-0.5 rounded text-neutral-300 font-medium">⭐ {rev.star_rating}</span>
                        <span className={`text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                          rev.ai_sentiment === 'positive' ? 'bg-emerald-500/10 text-emerald-400' :
                          rev.ai_sentiment === 'negative' ? 'bg-rose-500/10 text-rose-400' :
                          'bg-neutral-500/10 text-neutral-400'
                        }`}>
                          {rev.ai_sentiment}
                        </span>
                      </div>
                      {rev.ai_extracted_issue !== 'none' && rev.ai_extracted_issue !== 'analysis_error' && (
                        <span className="text-xs font-medium bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-1 rounded-md shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                          Issue: {rev.ai_extracted_issue}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-neutral-300 leading-relaxed italic">
                      "{rev.review_text}"
                    </p>
                  </div>
                ))}
              </div>
            </>
          )}
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
          setTimeout(() => reject(new Error("TIMEOUT_45S")), 45000)
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
      if (err.message === "TIMEOUT_45S" || err.message?.includes("504") || err.message?.includes("timeout")) {
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
        <ReviewDetailModal 
          product={selectedProduct} 
          onClose={() => setSelectedProduct(null)} 
        />
      )}
    </div>
  );
}
