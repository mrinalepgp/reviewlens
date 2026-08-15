"use client";

export const maxDuration = 120;

import React, { useState, useEffect } from 'react';
import { analyzeUrlsAction, compareCompetitorAction, AnalyzedProductSummary, fetchProductReviewsAction, ReviewAnalysisRow, fetchDashboardStateAction } from '@/app/actions';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// --- Types ---
type HealthStatus = 'safe' | 'warning' | 'critical';

// --- Components ---

function KPICards({ data }: { data: AnalyzedProductSummary[] }) {
  const activeSkus = data.length;
  
  if (activeSkus === 0) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Active Monitored SKUs</span>
          <span className="text-3xl font-black text-white">0</span>
        </div>
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-neutral-500"></div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Avg. Return Risk</span>
          <span className="text-3xl font-black text-neutral-400">N/A</span>
        </div>
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-neutral-500"></div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Top Defect Cause</span>
          <span className="text-lg font-bold text-neutral-500 mt-1">No products analyzed</span>
        </div>
        <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-neutral-500"></div>
          <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Capital Protected</span>
          <span className="text-3xl font-black text-neutral-400">₹0</span>
        </div>
      </div>
    );
  }

  const avgRisk = data.reduce((acc, curr) => acc + (curr.intelligence?.executiveScorecard?.returnRiskScore || 0), 0) / activeSkus;
  
  // Tally top defect
  const defects = data.map(d => d.intelligence?.executiveScorecard?.primaryRiskDriver).filter(Boolean);
  const defectCounts = defects.reduce((acc, val) => {
    acc[val] = (acc[val] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topDefect = Object.keys(defectCounts).sort((a, b) => defectCounts[b] - defectCounts[a])[0] || "Unknown";

  // Calculate generic protected capital
  const totalUnits = activeSkus * 1000;
  const projectedBleed = totalUnits * (avgRisk / 100) * 180;
  const protectedCapital = projectedBleed * 0.40;

  const formatINR = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Active Monitored SKUs</span>
        <span className="text-3xl font-black text-white">{activeSkus} <span className="text-sm text-neutral-500 font-medium">Products</span></span>
      </div>
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Avg. Return Risk</span>
        <div className="flex items-center gap-2">
          <span className="text-3xl font-black text-rose-400">{avgRisk.toFixed(1)}%</span>
          {avgRisk > 50 && <span className="text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-2 py-0.5 rounded">High</span>}
        </div>
      </div>
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500"></div>
        <span className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">Top Defect Cause</span>
        <span className="text-lg font-bold text-white mt-1 line-clamp-1">{topDefect}</span>
      </div>
      <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-2xl p-5 flex flex-col gap-2 relative overflow-hidden shadow-[0_0_15px_rgba(16,185,129,0.05)]">
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500"></div>
        <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Capital Protected</span>
        <span className="text-3xl font-black text-emerald-400">{formatINR(protectedCapital)}</span>
      </div>
    </div>
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
  const [tab, setTab] = useState<'url' | 'csv'>('url');

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

  const getPlatformPills = () => {
    const urls = inputText.split('\n').map(u => u.trim()).filter(u => u.length > 0);
    let flipkartCount = 0;
    let meeshoCount = 0;
    urls.forEach(u => {
      if (u.includes('flipkart.com')) flipkartCount++;
      if (u.includes('meesho.com')) meeshoCount++;
    });

    if (flipkartCount === 0 && meeshoCount === 0) return null;

    return (
      <div className="flex gap-2 mb-3 mt-2">
        {flipkartCount > 0 && (
          <span className="px-2 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-xs font-medium flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></div>
            {flipkartCount} Flipkart URL{flipkartCount > 1 ? 's' : ''} detected
          </span>
        )}
        {meeshoCount > 0 && (
          <span className="px-2 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded text-xs font-medium flex items-center gap-1">
            <div className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse"></div>
            {meeshoCount} Meesho URL{meeshoCount > 1 ? 's' : ''} detected
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Smart Ingestion</h2>
          <p className="text-sm text-neutral-400 mt-1">Import products to trigger AI analysis.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
        <button
          onClick={() => setTab('url')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'url' ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Direct URL Input
        </button>
        <button
          onClick={() => setTab('csv')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'csv' ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Bulk CSV Upload
        </button>
      </div>
      
      {tab === 'url' ? (
        <div className="flex flex-col flex-grow">
          {getPlatformPills()}
          <textarea 
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isLoading}
            className="w-full flex-grow min-h-[150px] bg-black/40 border border-white/10 rounded-xl p-4 text-sm text-neutral-200 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50 transition-all resize-none placeholder:text-neutral-600 disabled:opacity-50"
            placeholder="https://flipkart.com/product/p/itme...&#10;https://meesho.com/s/p/..."
          />
        </div>
      ) : (
        <div className="flex-grow min-h-[150px] border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center bg-black/20 hover:bg-black/40 transition-colors cursor-pointer group">
          <svg className="w-8 h-8 text-neutral-500 group-hover:text-indigo-400 transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-sm font-medium text-neutral-400 group-hover:text-white transition-colors">Drag & Drop Catalog CSV</span>
          <span className="text-xs text-neutral-500 mt-1">or click to browse files</span>
        </div>
      )}
      
      <div className="flex justify-end pt-2">
        <button 
          onClick={handleStart}
          disabled={isLoading || (tab === 'url' && !inputText.trim())}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Risk Radar</h2>
          <p className="text-sm text-neutral-400 mt-1">Real-time alerts prioritized by AI sentiment urgency.</p>
        </div>
        <button className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg text-xs font-medium text-neutral-300 transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Export AI Audit (PDF)
        </button>
      </div>

      <div className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex flex-col gap-3 animate-pulse">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex p-4 rounded-xl bg-black/40 border border-white/5 h-24 items-center">
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
              className="flex flex-col p-4 rounded-xl bg-black/40 border border-white/5 hover:border-white/20 transition-colors gap-3 cursor-pointer group"
            >
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20 uppercase">
                    {alert.platform}
                  </span>
                  <span className="text-sm font-semibold text-neutral-200 line-clamp-1 flex-1 group-hover:text-white transition-colors">
                    {alert.title}
                  </span>
                </div>
                <RiskBadge status={alert.riskAssessment} />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1">
                {/* Vernacular Snippet (Mock if unavailable) */}
                <div className="bg-white/5 border border-white/10 rounded-lg p-3 relative">
                  <span className="absolute -top-2 left-3 bg-neutral-900 px-1 text-[10px] font-bold text-neutral-400 uppercase">Raw Vernacular</span>
                  <p className="text-xs text-neutral-300 italic line-clamp-2 mt-1 font-serif">
                    "Kapda bohot patla hai aur size bhi chota aaya, fit nahi ho raha thik se."
                  </p>
                </div>
                
                {/* AI Translated Defect */}
                <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-lg p-3 relative">
                  <span className="absolute -top-2 left-3 bg-neutral-900 px-1 text-[10px] font-bold text-indigo-400 uppercase">AI Root-Cause</span>
                  <p className="text-xs text-indigo-200 line-clamp-2 mt-1 font-medium">
                    Critical sizing mismatch (runs small) combined with poor material thickness complaints.
                  </p>
                </div>
              </div>

              {alert.negativeThemes && alert.negativeThemes.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-1">
                  {alert.negativeThemes.map((theme, i) => (
                    <span key={i} className="text-[10px] text-rose-300 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20 font-medium">
                      {theme}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function HistoricalTable({ data, onSelectProduct }: { data: AnalyzedProductSummary[], onSelectProduct: (product: AnalyzedProductSummary) => void }) {
  if (!data || data.length === 0) return null;

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-6 mt-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Historical Catalog Analysis</h2>
          <p className="text-sm text-neutral-400 mt-1">Review past AI reports and monitor listing performance.</p>
        </div>
        <div className="relative">
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input type="text" placeholder="Search SKUs..." className="bg-black/40 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500" />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-neutral-400">
          <thead className="text-xs uppercase bg-white/5 border-y border-white/10 text-neutral-300">
            <tr>
              <th className="px-4 py-3 font-semibold">Product Title</th>
              <th className="px-4 py-3 font-semibold">Platform</th>
              <th className="px-4 py-3 font-semibold">Risk Score</th>
              <th className="px-4 py-3 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, idx) => (
              <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                <td className="px-4 py-3 font-medium text-neutral-200 max-w-xs truncate">{item.title}</td>
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold text-indigo-400 bg-indigo-400/10 px-2 py-0.5 rounded border border-indigo-400/20 uppercase">
                    {item.platform}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <RiskBadge status={item.riskAssessment} />
                </td>
                <td className="px-4 py-3 text-right">
                  <button onClick={() => onSelectProduct(item)} className="text-indigo-400 hover:text-indigo-300 font-medium text-xs">
                    Deep Dive →
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="flex items-center justify-between text-xs text-neutral-500">
        <span>Showing 1 to {data.length} of {data.length} entries</span>
        <div className="flex gap-1">
          <button className="px-2 py-1 border border-white/10 rounded hover:bg-white/5 disabled:opacity-50" disabled>Prev</button>
          <button className="px-2 py-1 border border-white/10 rounded bg-white/10 text-white">1</button>
          <button className="px-2 py-1 border border-white/10 rounded hover:bg-white/5 disabled:opacity-50" disabled>Next</button>
        </div>
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
    const isBad = inverse ? score < 50 : score > 70;
    const isWarning = inverse ? (score >= 50 && score < 80) : (score > 30 && score <= 70);
    
    if (isBad) return 'text-rose-400 border-rose-500/30 bg-rose-500/10 shadow-[0_0_15px_rgba(244,63,94,0.1)]';
    if (isWarning) return 'text-amber-400 border-amber-500/30 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
    return 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
  };
  
  const filteredReviews = reviews?.filter((r: any) => reviewFilter === 'ALL' || r.badge === reviewFilter) || [];
  
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

              {/* Tab 3: Vernacular */}
              {activeTab === 'vernacular' && (
                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                  <h4 className="text-lg font-semibold text-white">Vernacular Decoder (Hinglish/Regional)</h4>
                  <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                    {vernacularDecoder?.map((item: any, idx: number) => (
                      <div key={idx} className="bg-black/40 border border-white/5 rounded-xl p-5 flex flex-col gap-2">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">{item.originalTerm}</span>
                          <span className="text-neutral-500">→</span>
                          <span className="text-sm text-white font-medium">{item.englishMeaning}</span>
                        </div>
                        <p className="text-sm text-neutral-400 italic">"{item.context}"</p>
                      </div>
                    ))}
                    {!vernacularDecoder?.length && <p className="text-neutral-500 italic">No vernacular terms flagged.</p>}
                  </div>
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

const MOCK_HISTORICAL_DATA: AnalyzedProductSummary[] = [
  {
    url: "https://flipkart.com/mock-product",
    platform: "flipkart",
    title: "Men Regular Fit Solid Spread Collar Casual Shirt",
    averageScore: 2.8,
    riskAssessment: "critical",
    negativeThemes: ["Size Runs Small", "Poor Fabric", "Color Fade"],
    intelligence: {
      executiveScorecard: { returnRiskScore: 88, listingHealthScore: 42, estimatedMarginLossRange: "₹45k - ₹60k", primaryRiskDriver: "Sizing Mismatch" },
      defectTaxonomy: [ { category: "Fit Issues", description: "XL fits like L", severity: "HIGH", frequencyPercent: 65 } ],
      vernacularDecoder: [],
      mitigationPlaybook: { listingFixBullets: ["Update sizing chart to reflect slim-fit specs", "Add fabric care instructions to prevent fading claims"], antiReturnListingCopy: "Please note: This shirt features a slim-fit design. We recommend ordering one size up for a relaxed fit.", supplierQualityMemo: "URGENT: Batch #43 color fastness failing QC. Increase dye fixation time.", customerRecoveryScript: "We apologize for the sizing issue. Here is a free return label..." },
      reviews: []
    }
  },
  {
    url: "https://meesho.com/mock-product",
    platform: "meesho",
    title: "Women Floral Print Crepe Straight Kurta",
    averageScore: 4.2,
    riskAssessment: "safe",
    negativeThemes: ["Slightly transparent"],
    intelligence: {
      executiveScorecard: { returnRiskScore: 12, listingHealthScore: 85, estimatedMarginLossRange: "Minimal", primaryRiskDriver: "Fabric Transparency" },
      defectTaxonomy: [ { category: "Material", description: "Fabric is slightly thin", severity: "LOW", frequencyPercent: 15 } ],
      vernacularDecoder: [],
      mitigationPlaybook: { listingFixBullets: ["Add 'lightweight crepe' to description"], antiReturnListingCopy: "", supplierQualityMemo: "", customerRecoveryScript: "" },
      reviews: []
    }
  }
];

export default function Dashboard() {
  const [results, setResults] = useState<AnalyzedProductSummary[]>([]);
  const [historicalData, setHistoricalData] = useState<AnalyzedProductSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AnalyzedProductSummary | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [userState, setUserState] = useState<any>(null);

  useEffect(() => {
    async function loadInitialState() {
      const res = await fetchDashboardStateAction();
      if (res.success) {
        setUserState(res.user);
        setHistoricalData(res.historicalData || []);
        setResults(res.historicalData || []);
      } else {
        setError(res.error || "Failed to load dashboard state.");
      }
    }
    loadInitialState();
  }, []);

  const loadDemoData = () => {
    setResults(MOCK_HISTORICAL_DATA);
    setHistoricalData(MOCK_HISTORICAL_DATA);
  };

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
        setResults((prev) => [...response.summaries, ...prev]);
        setHistoricalData((prev) => [...response.summaries, ...prev]);
        setUserState((prev: any) => prev ? { ...prev, credits: Math.max(0, prev.credits - response.summaries.length) } : prev);
      } else {
        setError("Pipeline Error: " + response.error);
      }
    } catch (err: any) {
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
        <div className="container mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-xl shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              R
            </div>
            <span className="text-lg font-bold tracking-tight text-white hidden sm:block">ReviewLens Intelligence</span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={loadDemoData} className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 rounded-lg text-sm font-semibold transition-colors">
              ⚡ Load Demo Data
            </button>
            
            <div className="flex items-center gap-2 px-3 py-1.5 bg-neutral-900 border border-white/10 rounded-lg">
              <span className="text-xs font-bold text-amber-400">⚡ {userState?.credits ?? 0}/50</span>
              <span className="text-xs text-neutral-400 font-medium hidden sm:block">Credits</span>
            </div>

            <div className="relative">
              <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="flex items-center gap-2 focus:outline-none">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white border border-white/10 shadow-sm">
                  {userState?.initials ?? 'US'}
                </div>
              </button>
              
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white">{userState?.email || 'User'}</p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{userState?.email || 'No email'}</p>
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                      {userState?.plan ?? 'Hobby'} Plan
                    </div>
                  </div>
                  <div className="py-1">
                    <Link href="#" className="block px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors">Account Settings</Link>
                    <Link href="#" className="block px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors">Billing & Usage</Link>
                  </div>
                  <div className="border-t border-white/10 pt-1 mt-1">
                    <button className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-white/5 transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-7xl px-4 sm:px-6 py-8 flex flex-col gap-8 relative">
        <header>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Executive Dashboard</h1>
          <p className="text-neutral-400">Monitor your catalog health, trigger AI analyses, and recover margin.</p>
        </header>

        {error && (
          <div className="w-full rounded-xl p-4 flex items-center justify-between border bg-rose-500/10 border-rose-500/20 text-rose-400">
            <span className="font-medium text-sm">{error}</span>
            <button onClick={() => setError(null)} className="text-xs font-semibold px-3 py-1 hover:bg-white/10 rounded transition-colors">Dismiss</button>
          </div>
        )}

        {/* 1. KPI Metrics */}
        <KPICards data={historicalData} />

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

        {/* 4. Historical Table */}
        <HistoricalTable data={historicalData} onSelectProduct={setSelectedProduct} />
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
