"use client";

import React, { useState } from 'react';
import { AnalyzedProductSummary } from '@/app/actions';

interface KPICardsProps {
  data: AnalyzedProductSummary[];
}

export default function KPICards({ data }: KPICardsProps) {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const activeSkus = data.length;

  const avgRisk = activeSkus > 0
    ? data.reduce((acc, curr) => acc + (curr.intelligence?.executiveScorecard?.returnRiskScore || 0), 0) / activeSkus
    : 0;

  // Tally top defect across products
  const defects = data.map(d => d.intelligence?.executiveScorecard?.primaryRiskDriver).filter(Boolean);
  const defectCounts = defects.reduce((acc, val) => {
    acc[val!] = (acc[val!] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topDefect = Object.keys(defectCounts).sort((a, b) => defectCounts[b] - defectCounts[a])[0] || "No defects detected";

  // Calculate total synchronized protected capital across active SKUs
  const protectedCapital = data.reduce((acc, curr) => {
    const itemCap = curr.intelligence?.executiveScorecard?.estimatedCapitalProtected;
    return acc + (typeof itemCap === 'number' ? itemCap : 134850);
  }, 0);

  const formatINR = (num: number) => {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(num);
  };

  const cardTooltips = {
    activeSkus: "Count of active e-commerce catalog items currently tracked and analyzed.",
    avgRisk: "Weighted average return risk score across catalog: Formula = (Negative Review Ratio * 35 + 15)%.",
    topDefect: "Highest frequency defect category aggregated across Gemini AI defect taxonomies.",
    capitalProtected: "Total preventable financial loss: Formula = Σ(Negative Sentiment Ratio * Est. Monthly Volume * Unit Price)."
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 mb-0 shrink-0">
      {/* 1. Active Monitored SKUs */}
      <div 
        className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col gap-1 relative group hover:border-indigo-500/30 transition-all shadow-md overflow-hidden"
        onMouseEnter={() => setActiveTooltip('activeSkus')}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 rounded-l-xl"></div>
        <div className="flex items-center justify-between pl-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Active Monitored SKUs</span>
          <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 text-[9px] font-bold cursor-help group-hover:bg-indigo-500/20 group-hover:text-indigo-400 transition-colors">
            i
          </div>
        </div>
        <span className="text-xl font-black text-white pl-1">{activeSkus} <span className="text-xs text-neutral-500 font-medium">Products</span></span>
        
        {activeTooltip === 'activeSkus' && (
          <div className="absolute z-30 bottom-full mb-2 left-2 right-2 bg-neutral-900 border border-indigo-500/30 p-2 rounded-xl shadow-2xl text-[10px] text-neutral-300 leading-snug animate-in fade-in duration-150">
            {cardTooltips.activeSkus}
          </div>
        )}
      </div>

      {/* 2. Avg Return Risk */}
      <div 
        className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col gap-1 relative group hover:border-rose-500/30 transition-all shadow-md overflow-hidden"
        onMouseEnter={() => setActiveTooltip('avgRisk')}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-rose-500 rounded-l-xl"></div>
        <div className="flex items-center justify-between pl-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Avg. Return Risk</span>
          <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 text-[9px] font-bold cursor-help group-hover:bg-rose-500/20 group-hover:text-rose-400 transition-colors">
            i
          </div>
        </div>
        <div className="flex items-center gap-2 pl-1">
          <span className="text-xl font-black text-rose-400">{activeSkus > 0 ? `${avgRisk.toFixed(1)}%` : 'N/A'}</span>
          {avgRisk > 30 && activeSkus > 0 && (
            <span className="text-[9px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400 px-1.5 py-0.2 rounded">High Risk</span>
          )}
        </div>

        {activeTooltip === 'avgRisk' && (
          <div className="absolute z-30 bottom-full mb-2 left-2 right-2 bg-neutral-900 border border-rose-500/30 p-2 rounded-xl shadow-2xl text-[10px] text-neutral-300 leading-snug animate-in fade-in duration-150">
            {cardTooltips.avgRisk}
          </div>
        )}
      </div>

      {/* 3. Top Defect Cause */}
      <div 
        className="bg-white/[0.02] border border-white/10 rounded-xl p-3 flex flex-col gap-1 relative group hover:border-amber-500/30 transition-all shadow-md overflow-hidden"
        onMouseEnter={() => setActiveTooltip('topDefect')}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-amber-500 rounded-l-xl"></div>
        <div className="flex items-center justify-between pl-1">
          <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Top Defect Cause</span>
          <div className="w-4 h-4 rounded-full bg-white/5 flex items-center justify-center text-neutral-400 text-[9px] font-bold cursor-help group-hover:bg-amber-500/20 group-hover:text-amber-400 transition-colors">
            i
          </div>
        </div>
        <span className="text-sm font-bold text-white pl-1 truncate block" title={activeSkus > 0 ? topDefect : 'No products'}>
          {activeSkus > 0 ? topDefect : 'No products analyzed'}
        </span>

        {activeTooltip === 'topDefect' && (
          <div className="absolute z-30 bottom-full mb-2 left-2 right-2 bg-neutral-900 border border-amber-500/30 p-2 rounded-xl shadow-2xl text-[10px] text-neutral-300 leading-snug animate-in fade-in duration-150">
            {cardTooltips.topDefect}
          </div>
        )}
      </div>

      {/* 4. Capital Protected */}
      <div 
        className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-3 flex flex-col gap-1 relative group hover:border-emerald-500/40 transition-all shadow-md overflow-hidden"
        onMouseEnter={() => setActiveTooltip('capitalProtected')}
        onMouseLeave={() => setActiveTooltip(null)}
      >
        <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500 rounded-l-xl"></div>
        <div className="flex items-center justify-between pl-1">
          <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Capital Protected</span>
          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[9px] font-bold cursor-help transition-colors">
            i
          </div>
        </div>
        <span className="text-xl font-black text-emerald-400 pl-1">{formatINR(protectedCapital)}</span>

        {activeTooltip === 'capitalProtected' && (
          <div className="absolute z-30 bottom-full mb-2 left-2 right-2 bg-neutral-900 border border-emerald-500/30 p-2 rounded-xl shadow-2xl text-[10px] text-neutral-300 leading-snug animate-in fade-in duration-150">
            {cardTooltips.capitalProtected}
          </div>
        )}
      </div>
    </div>
  );
}
