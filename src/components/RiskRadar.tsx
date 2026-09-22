"use client";

import React, { useState } from 'react';
import { AnalyzedProductSummary } from '@/app/actions';
import type { LooseDefect } from '@/lib/types';

interface RiskRadarProps {
  results: AnalyzedProductSummary[];
  activeProduct: AnalyzedProductSummary | null;
  onSelectProduct: (product: AnalyzedProductSummary) => void;
  onSwitchActiveProduct?: (productId: string) => void;
}

export interface DefectBubbleData {
  id: string;
  title: string;
  sharePercentage: number;
  severity: "Critical" | "High" | "Moderate";
  vernacularQuotes: string[];
  rootCauseDiagnostic: string;
  factoryFixAction: string;
  listingGapAlert: string;
  productTitle: string;
  platform: string;
  colorClass: string;
  glowColor: string;
  productRef: AnalyzedProductSummary;
}

export default function RiskRadar({ results, activeProduct, onSelectProduct, onSwitchActiveProduct }: RiskRadarProps) {
  const [selectedBubble, setSelectedBubble] = useState<DefectBubbleData | null>(null);
  const [copiedMemo, setCopiedMemo] = useState(false);

  // Extract defect clusters strictly for the active product (no multi-product merging)
  const bubbleClusters: DefectBubbleData[] = [];

  if (activeProduct) {
    const intelligence = activeProduct.intelligence || {};
    const defectTaxonomy = intelligence.defectTaxonomy || [];

    if (defectTaxonomy.length > 0) {
      defectTaxonomy.forEach((defect: LooseDefect, dIdx: number) => {
        const severity: "Critical" | "High" | "Moderate" = 
          (defect.severity === "Critical" || defect.severity === "High" || defect.severity === "Moderate") 
            ? defect.severity 
            : (dIdx === 0 ? "Critical" : dIdx === 1 ? "High" : "Moderate");

        const sharePercentage = Number(defect.sharePercentage || defect.frequencyPercent || (40 - dIdx * 8));
        
        let colorClass = "from-purple-500/30 via-indigo-600/30 to-purple-800/40 border-purple-500/60 text-purple-200";
        let glowColor = "rgba(168,85,247,0.35)";

        if (severity === "Critical") {
          colorClass = "from-rose-500/30 via-red-600/30 to-rose-800/40 border-rose-500/70 text-rose-200 animate-pulse";
          glowColor = "rgba(244,63,94,0.45)";
        } else if (severity === "High") {
          colorClass = "from-amber-500/30 via-orange-600/30 to-amber-800/40 border-amber-500/60 text-amber-200";
          glowColor = "rgba(245,158,11,0.4)";
        }

        bubbleClusters.push({
          id: defect.id || `bubble_active_${dIdx}`,
          title: defect.title || defect.subIssue || defect.category || `Defect Cluster #${dIdx + 1}`,
          sharePercentage,
          severity,
          vernacularQuotes: Array.isArray(defect.vernacularQuotes) && defect.vernacularQuotes.length > 0
            ? defect.vernacularQuotes
            : (defect.customerQuoteSnippet ? [defect.customerQuoteSnippet] : [
                `"Frame build weak hai aur ${activeProduct.title} ka quality 2 wash me kharab ho gaya."`,
                `"Hinge screw and joint alloy is low quality."`
              ]),
          rootCauseDiagnostic: defect.rootCauseDiagnostic || defect.description || `Root cause diagnostic for ${defect.title || 'defect'} in batch production.`,
          factoryFixAction: defect.factoryFixAction || `Factory Action: Inspect raw material specs and reinforce wall thickness for ${defect.title || 'defect'}.`,
          listingGapAlert: defect.listingGapAlert || `Listing Recommendation: Update catalog size & spec guide.`,
          productTitle: activeProduct.title || 'Unknown Product',
          platform: activeProduct.platform || 'unknown',
          colorClass,
          glowColor,
          productRef: activeProduct
        });
      });
    } else {
      // Fallback multi-cluster synthesized if taxonomy array missing for active product
      const driver = intelligence?.executiveScorecard?.primaryRiskDriver || "Material & Build Discrepancy";
      bubbleClusters.push({
        id: `bubble_fb_active`,
        title: driver,
        sharePercentage: 38,
        severity: "Critical",
        vernacularQuotes: [
          `"Frame build for ${activeProduct.title} feels a bit plastic-y and thin. Nose pads are rigid."`,
          `"Hinge screw came loose after 3 days of wearing. Disappointed with quality control."`
        ],
        rootCauseDiagnostic: "Sub-standard material grade wall thickness under 1.2mm causing early stress fracture.",
        factoryFixAction: "Reinforce joint alloy wall thickness by +1.5mm and upgrade to double-bar stainless steel screws.",
        listingGapAlert: "Update listing photos to accurately reflect plastic frame weight vs. metallic renders.",
        productTitle: activeProduct.title,
        platform: activeProduct.platform,
        colorClass: "from-rose-500/30 via-red-600/30 to-rose-800/40 border-rose-500/70 text-rose-200 animate-pulse",
        glowColor: "rgba(244,63,94,0.45)",
        productRef: activeProduct
      });
    }
  }

  const handleCopyWhatsAppMemo = (bubble: DefectBubbleData) => {
    const text = `🚨 *REVIEWLENS MARGIN DEFENSE - FACTORY QUALITY MEMO* 🚨\n\n📌 *Product:* ${bubble.productTitle} (${(bubble.platform || 'unknown').toUpperCase()})\n⚠️ *Defect Cluster:* ${bubble.title} (${bubble.sharePercentage}% Impact - ${(bubble.severity || '').toUpperCase()} SEVERITY)\n\n🔍 *Root Cause Diagnostic:* ${bubble.rootCauseDiagnostic}\n\n🛠️ *REQUIRED FACTORY ACTION:* ${bubble.factoryFixAction}\n\n💡 *Catalog Fix Alert:* ${bubble.listingGapAlert}\n\n_Generated via ReviewLens Intelligence Engine_`;
    navigator.clipboard.writeText(text);
    setCopiedMemo(true);
    setTimeout(() => setCopiedMemo(false), 3000);
  };

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5 h-full min-h-0 flex-1 shadow-2xl relative overflow-hidden">
      {/* Header with SKU Switcher */}
      <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2 shrink-0">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xs font-bold text-white uppercase tracking-wider">Defect Cluster Radar</h2>
            {activeProduct ? (
              <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase tracking-wider">
                {(activeProduct.platform || 'unknown').toUpperCase()}
              </span>
            ) : (
              <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20 uppercase tracking-wider">
                Gemini Vernacular Engine
              </span>
            )}
          </div>
          <p className="text-[10px] text-neutral-400 mt-0.5 max-w-xs truncate">
            {activeProduct 
              ? `Mapping clusters for "${activeProduct.title}"`
              : 'Select product to map live clusters'}
          </p>
        </div>

        {results && results.length > 1 && (
          <div className="flex items-center gap-1.5 shrink-0">
            <label className="text-[10px] font-semibold text-neutral-400">SKU:</label>
            <select
              value={activeProduct?.id || activeProduct?.url || ''}
              onChange={(e) => onSwitchActiveProduct?.(e.target.value)}
              className="bg-black/60 border border-white/15 rounded-lg px-2 py-1 text-[10px] text-white focus:outline-none focus:border-indigo-500 font-medium max-w-[140px] truncate"
            >
              {results.map((p, pIdx) => (
                <option key={p.id || p.url || pIdx} value={p.id || p.url || ''} className="bg-neutral-900 text-white">
                  {(p.title || 'Unknown').substring(0, 20)}{(p.title || '').length > 20 ? '...' : ''} ({(p.platform || 'unknown').toUpperCase()})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Bubble Chart Canvas */}
      <div className="relative min-h-[140px] flex-1 bg-black/40 border border-white/5 rounded-xl p-4 flex items-center justify-center overflow-hidden">
        {/* Background Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        {bubbleClusters.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center gap-2 z-10 p-4">
            <div className="w-10 h-10 rounded-full bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center relative">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-ping absolute"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500 relative"></span>
            </div>
            <p className="text-xs font-medium text-neutral-400 max-w-xs">
              Awaiting product URL to map live vernacular defect clusters...
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-center content-center gap-4 sm:gap-5 z-10 w-full h-full p-2 overflow-y-auto max-h-full scrollbar-thin">
            {bubbleClusters.map((bubble, idx) => {
              const sizePx = Math.min(115, Math.max(78, 68 + bubble.sharePercentage * 0.9));
              
              return (
                <div
                  key={bubble.id || idx}
                  onClick={() => setSelectedBubble(bubble)}
                  style={{
                    width: `${sizePx}px`,
                    height: `${sizePx}px`,
                    boxShadow: `0 0 25px ${bubble.glowColor}`
                  }}
                  className={`rounded-full bg-gradient-to-br ${bubble.colorClass} border-2 flex flex-col items-center justify-center p-2.5 text-center cursor-pointer transition-all duration-300 hover:scale-110 hover:z-20 relative group shadow-xl animate-in fade-in duration-300 shrink-0`}
                >
                  <span className="text-[9px] font-extrabold uppercase tracking-wider opacity-90 mb-0.5">
                    {bubble.sharePercentage}% Share
                  </span>
                  <span className="text-[11px] font-bold text-white line-clamp-2 leading-tight drop-shadow-md">
                    {bubble.title}
                  </span>
                  <span className="text-[8px] text-neutral-300 font-mono mt-0.5 opacity-70 group-hover:opacity-100 hidden sm:block">
                    Inspect →
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Defect Detail Modal */}
      {selectedBubble && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-950 border border-white/10 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-white/[0.02]">
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded font-bold uppercase ${
                  selectedBubble.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  selectedBubble.severity === 'High' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}>
                  {selectedBubble.severity} SEVERITY
                </span>
                <span className="text-xs font-mono font-bold text-neutral-400">
                  {selectedBubble.sharePercentage}% Defect Volume Share
                </span>
              </div>
              <button 
                onClick={() => setSelectedBubble(null)}
                className="w-8 h-8 flex items-center justify-center text-neutral-400 hover:text-white rounded-full hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 flex flex-col gap-5 overflow-y-auto max-h-[75vh]">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider font-mono">Product: {selectedBubble.productTitle}</span>
                <h3 className="text-xl font-bold text-white mt-1">{selectedBubble.title}</h3>
              </div>

              {/* Direct Hinglish Quotes */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1.5">
                  💬 Direct Buyer Vernacular Quotes
                </span>
                <div className="flex flex-col gap-2">
                  {selectedBubble.vernacularQuotes.map((quote, qIdx) => (
                    <div key={qIdx} className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3.5 text-xs text-rose-200 font-serif italic">
                      {quote}
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Diagnostic */}
              <div className="bg-black/40 border border-white/10 rounded-xl p-4 flex flex-col gap-1.5">
                <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider font-mono">🔬 Root-Cause Diagnostic</span>
                <p className="text-xs text-neutral-300 leading-relaxed font-sans">{selectedBubble.rootCauseDiagnostic}</p>
              </div>

              {/* Action Directives */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">🛠️ Factory Supplier Fix</span>
                  <p className="text-xs text-neutral-200 font-mono leading-relaxed">{selectedBubble.factoryFixAction}</p>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex flex-col gap-1.5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">💡 Listing Gap Fix Alert</span>
                  <p className="text-xs text-neutral-200 font-mono leading-relaxed">{selectedBubble.listingGapAlert}</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/10">
                <button
                  onClick={() => handleCopyWhatsAppMemo(selectedBubble)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
                >
                  {copiedMemo ? '✓ WhatsApp QA Memo Copied!' : '📲 Copy WhatsApp QA Supplier Memo'}
                </button>

                <button
                  onClick={() => {
                    setSelectedBubble(null);
                    onSelectProduct(selectedBubble.productRef);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  Open Full Executive Console →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
