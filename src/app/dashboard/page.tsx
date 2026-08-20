"use client";

export const maxDuration = 120;

import React, { useState, useEffect } from 'react';
import { analyzeUrlsAction, compareCompetitorAction, AnalyzedProductSummary, fetchProductReviewsAction, ReviewAnalysisRow, fetchDashboardStateAction, deleteProductAction, clearAllHistoryAction, updateUserProfileAction, wipeUserAccountAction } from '@/app/actions';
import { createClient } from '@/utils/supabase/client';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import KPICards from '@/components/KPICards';
import RiskRadar from '@/components/RiskRadar';
import ExecutiveConsole from '@/components/ExecutiveConsole';
import SmartIngestionModal from '@/components/SmartIngestionModal';

// --- Types ---
type HealthStatus = 'safe' | 'warning' | 'critical';

// --- Components ---

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
      "Phase 1: Spawning Scrape.do parallel workers to extract deep review catalog...",
      "Phase 2: Executing Map-Reduce Gemini AI analysis...",
      "Phase 3: Finalizing executive return risk matrix..."
    ];
    let i = 0;
    setLoadingText(texts[0]);
    const interval = setInterval(() => {
      i = (i + 1) % texts.length;
      setLoadingText(texts[i]);
    }, 2500);
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleStart = (e?: React.MouseEvent | React.FormEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
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
    <form onSubmit={handleStart} className="bg-white/[0.02] border border-white/10 rounded-2xl p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Smart Ingestion</h2>
          <p className="text-sm text-neutral-400 mt-1">Import products to trigger AI analysis.</p>
        </div>
      </div>

      <div className="flex space-x-1 bg-black/40 p-1 rounded-xl border border-white/5 w-fit">
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setTab('url'); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            tab === 'url' ? 'bg-indigo-500/20 text-indigo-300 shadow-[0_0_10px_rgba(99,102,241,0.2)]' : 'text-neutral-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Direct URL Input
        </button>
        <button
          type="button"
          onClick={(e) => { e.preventDefault(); setTab('csv'); }}
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
          type="submit"
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
    </form>
  );
}

function MultiStepPipelineLoader({ activeStep }: { activeStep: number }) {
  const steps = [
    { num: 1, label: 'Spawning Scrape.do parallel workers to extract deep review catalog...' },
    { num: 2, label: 'Executing Map-Reduce Gemini AI analysis...' },
    { num: 3, label: 'Finalizing executive return risk matrix...' }
  ];

  const currentProgress = Math.min(100, Math.max(25, (activeStep / 3) * 100));

  return (
    <div className="flex flex-col gap-4 p-5 rounded-2xl bg-black/60 border border-indigo-500/30 shadow-[0_0_30px_rgba(99,102,241,0.15)] animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <svg className="animate-spin h-4 w-4 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white tracking-wide uppercase">AI Pipeline Processing</h4>
            <p className="text-xs text-indigo-300/80 font-mono mt-0.5">Scrape.do & Gemini 1.5 Flash</p>
          </div>
        </div>
        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
          Phase {Math.min(activeStep, 3)} of 3
        </span>
      </div>

      <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden border border-white/5">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 transition-all duration-700 ease-out rounded-full"
          style={{ width: `${currentProgress}%` }}
        ></div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 mt-1">
        {steps.map(s => {
          const isDone = activeStep > s.num;
          const isActive = activeStep === s.num;
          return (
            <div 
              key={s.num} 
              className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                isActive 
                  ? 'bg-indigo-500/10 border-indigo-500/40 text-white shadow-[0_0_12px_rgba(99,102,241,0.1)]' 
                  : isDone 
                  ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400' 
                  : 'bg-black/20 border-white/5 text-neutral-500'
              }`}
            >
              <div className="flex items-center gap-3">
                {isDone ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-xs font-bold text-emerald-400">✓</span>
                ) : isActive ? (
                  <span className="w-5 h-5 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                  </span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-neutral-800 border border-neutral-700 flex items-center justify-center text-[10px] font-bold text-neutral-500">{s.num}</span>
                )}
                <span className="text-xs font-medium font-mono">{s.label}</span>
              </div>
              {isActive && (
                <span className="text-[10px] uppercase font-bold text-indigo-400 animate-pulse bg-indigo-500/20 px-2 py-0.5 rounded border border-indigo-500/30">Processing...</span>
              )}
              {isDone && (
                <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">Complete</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RiskBadge({ status }: { status: HealthStatus }) {
  switch (status) {
    case 'critical':
      return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded whitespace-nowrap">Critical</span>;
    case 'warning':
      return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded whitespace-nowrap">Warning</span>;
    case 'safe':
      return <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded whitespace-nowrap">Optimal</span>;
  }
}

function HistoricalTable({ 
  data, 
  onSelectProduct, 
  onDeleteProduct, 
  onClearAll,
  activeAnalysisId,
  onInspectRadar,
  marketplaceFilter = 'all',
  onMarketplaceFilterChange
}: { 
  data: AnalyzedProductSummary[]; 
  onSelectProduct: (product: AnalyzedProductSummary) => void; 
  onDeleteProduct: (id: string) => void;
  onClearAll: () => void;
  activeAnalysisId?: string | null;
  onInspectRadar?: (productId: string) => void;
  marketplaceFilter?: 'all' | 'flipkart' | 'meesho';
  onMarketplaceFilterChange?: (f: 'all' | 'flipkart' | 'meesho') => void;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  if (!data || data.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center text-center gap-4">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <h3 className="text-xl font-bold text-white">No products monitored yet</h3>
        <p className="text-neutral-400 text-sm max-w-md">Enter a Meesho or Flipkart URL to run your first AI audit and start building your historical catalog.</p>
      </div>
    );
  }

  const marketplaceFiltered = marketplaceFilter === 'all' ? data : data.filter(item => item.platform === marketplaceFilter);
  const filteredData = marketplaceFiltered.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.platform.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.intelligence?.category || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-3.5 flex flex-col gap-2.5 h-full min-h-0 overflow-hidden">
      <div className="flex items-center justify-between shrink-0 gap-2">
        <div>
          <h2 className="text-xs font-bold text-white uppercase tracking-wider">Historical Catalog</h2>
          <p className="text-[10px] text-neutral-400">Click row to sync Defect Radar →</p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {(['all', 'flipkart', 'meesho'] as const).map(f => (
            <button
              key={f}
              onClick={() => onMarketplaceFilterChange?.(f)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all ${
                marketplaceFilter === f
                  ? f === 'flipkart' ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    : f === 'meesho' ? 'bg-pink-500/20 text-pink-300 border-pink-500/40'
                    : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                  : 'bg-white/5 text-neutral-400 border-white/10 hover:border-white/20'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <div className="relative flex-1 min-w-[140px]">
          <svg className="w-3.5 h-3.5 absolute left-2.5 top-2 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKUs..."
            className="w-full bg-black/40 border border-white/10 rounded-lg pl-8 pr-3 py-1 text-xs text-white focus:outline-none focus:border-indigo-500"
          />
        </div>
        <button onClick={onClearAll} className="px-2.5 py-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg text-[10px] font-semibold transition-colors flex items-center gap-1 shrink-0">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
          Clear
        </button>
      </div>

      {/* Internal scrollable table wrapper */}
      <div className="w-full min-w-0 flex-1 min-h-0 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 pr-0.5">
        <table className="w-full table-fixed text-left text-sm text-neutral-400">
          <colgroup>
            <col style={{ width: '42%' }} />
            <col style={{ width: '12%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '14%' }} />
            <col style={{ width: '12%' }} />
          </colgroup>
          <thead className="text-[10px] uppercase bg-neutral-950/90 backdrop-blur-sm sticky top-0 z-10 border-b border-white/10 text-neutral-400 tracking-wider">
            <tr>
              <th className="px-3 py-2 font-semibold text-left">Product</th>
              <th className="px-2 py-2 font-semibold text-left">Mkt</th>
              <th className="px-2 py-2 font-semibold text-left">Risk</th>
              <th className="px-2 py-2 font-semibold text-left">Capital</th>
              <th className="px-2 py-2 font-semibold text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item, idx) => {
              const itemKey = item.id || item.url || item.title || `${idx}`;
              const isActive = activeAnalysisId
                ? (item.id === activeAnalysisId || item.url === activeAnalysisId || item.title === activeAnalysisId)
                : (idx === 0);

              return (
                <tr
                  key={idx}
                  onClick={() => onInspectRadar?.(itemKey)}
                  className={`border-b border-white/5 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-indigo-500/10 border-l-2 border-l-indigo-500'
                      : 'hover:bg-white/[0.04]'
                  }`}
                >
                  {/* Title — constrained, truncates */}
                  <td className="px-3 py-2 min-w-0">
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {isActive && (
                          <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                        )}
                        <span
                          className="text-xs font-semibold text-white truncate block min-w-0"
                          title={item.title}
                        >
                          {item.title}
                        </span>
                      </div>
                      {item.intelligence?.category && (
                        <span className="text-[9px] text-emerald-400/80 font-mono uppercase tracking-wider truncate">
                          {item.intelligence.category}
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Platform badge */}
                  <td className="px-2 py-2">
                    <span className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded border ${
                      item.platform === 'flipkart'
                        ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                        : 'bg-pink-500/10 text-pink-400 border-pink-500/20'
                    }`}>
                      {item.platform === 'flipkart' ? 'FK' : 'ME'}
                    </span>
                  </td>

                  {/* Risk */}
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-1">
                      <RiskBadge status={item.riskAssessment} />
                      <span className="text-[10px] font-mono font-bold text-neutral-300 shrink-0">
                        {item.intelligence?.executiveScorecard?.returnRiskScore ?? '—'}%
                      </span>
                    </div>
                  </td>

                  {/* Capital Protected */}
                  <td className="px-2 py-2 font-mono text-[10px] font-bold text-emerald-400">
                    ₹{(item.intelligence?.executiveScorecard?.estimatedCapitalProtected || 0).toLocaleString('en-IN')}
                  </td>

                  {/* Action — compact icon buttons */}
                  <td className="px-2 py-2">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); onSelectProduct(item); }}
                        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 hover:underline whitespace-nowrap"
                        title="Open Executive Console"
                      >
                        Console
                      </button>
                      {item.id && (
                        <button
                          onClick={(e) => { e.stopPropagation(); onDeleteProduct(item.id!); }}
                          className="text-neutral-600 hover:text-rose-400 transition-colors shrink-0"
                          title="Delete"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-[10px] text-neutral-500 shrink-0 pt-1 border-t border-white/5">
        <span>Showing 1 to {filteredData.length} of {data.length} entries</span>
        <div className="flex gap-1">
          <button className="px-2 py-0.5 border border-white/10 rounded hover:bg-white/5 disabled:opacity-50" disabled>Prev</button>
          <button className="px-2 py-0.5 border border-white/10 rounded bg-white/10 text-white">1</button>
          <button className="px-2 py-0.5 border border-white/10 rounded hover:bg-white/5 disabled:opacity-50" disabled>Next</button>
        </div>
      </div>
    </div>
  );
}

const ExecutiveIntelligenceConsoleModal = ExecutiveConsole;

function SettingsManagerModal({ 
  isOpen, 
  onClose, 
  userState, 
  onUpdate,
  historicalData,
  onAccountWiped
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  userState: any, 
  onUpdate: (updates: any) => void,
  historicalData: any[],
  onAccountWiped: () => void
}) {
  const [activeTab, setActiveTab] = useState<'Profile' | 'Security' | 'Billing' | 'Danger'>('Profile');

  // Profile Tab State
  const [fullName, setFullName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [whatsappAlerts, setWhatsappAlerts] = useState(false);
  const [isProfileSaving, setIsProfileSaving] = useState(false);

  // Security Tab State
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSecuritySaving, setIsSecuritySaving] = useState(false);
  
  // Danger Tab State
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState(0);

  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);

  useEffect(() => {
    if (isOpen && userState) {
      setFullName(userState.full_name || '');
      setWhatsapp(userState.whatsapp_number || '');
      setCompanyName(userState.company_name || '');
      setWhatsappAlerts(userState.whatsapp_alerts_enabled || false);
    }
  }, [isOpen, userState]);

  if (!isOpen) return null;

  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProfileSaving(true);
    const res = await updateUserProfileAction(fullName, whatsapp, companyName, whatsappAlerts);
    setIsProfileSaving(false);
    if (res.success) {
      showToast('Profile updated successfully', 'success');
      onUpdate({ full_name: fullName, whatsapp_number: whatsapp, company_name: companyName, whatsapp_alerts_enabled: whatsappAlerts });
    } else {
      showToast(res.error || 'Failed to update', 'error');
    }
  };

  const calculateStrength = (pass: string) => {
    if (pass.length === 0) return { score: 0, text: '', color: 'bg-neutral-800' };
    if (pass.length < 6) return { score: 1, text: 'Weak', color: 'bg-rose-500' };
    if (pass.length >= 8 && /[A-Z]/.test(pass) && /[0-9]/.test(pass) && /[^A-Za-z0-9]/.test(pass)) return { score: 3, text: 'Strong', color: 'bg-emerald-500' };
    return { score: 2, text: 'Medium', color: 'bg-amber-500' };
  };

  const handleSecuritySave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      showToast("Passwords do not match", "error");
      return;
    }
    if (password.length < 6) {
      showToast("Password too short", "error");
      return;
    }
    setIsSecuritySaving(true);
    const res = await updateUserProfileAction(fullName, whatsapp, companyName, whatsappAlerts, password);
    setIsSecuritySaving(false);
    if (res.success) {
      showToast('Password updated successfully', 'success');
      setPassword('');
      setConfirmPassword('');
    } else {
      showToast(res.error || 'Failed to update password', 'error');
    }
  };

  const handleExportCSV = () => {
    if (historicalData.length === 0) {
      showToast("No historical data to export", "error");
      return;
    }
    const headers = ["ID", "URL", "Platform", "Product Name", "Average Rating", "Risk Assessment"];
    const rows = historicalData.map(d => [
      d.id || '',
      d.url || '',
      d.platform || '',
      `"${(d.title || '').replace(/"/g, '""')}"`,
      d.averageScore || '',
      d.riskAssessment || ''
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "intelligence_export.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmStep === 0) {
      setDeleteConfirmStep(1);
      return;
    }
    setIsDeleting(true);
    const res = await wipeUserAccountAction();
    if (res.success) {
      onAccountWiped();
    } else {
      setIsDeleting(false);
      showToast(res.error || 'Failed to delete account', 'error');
    }
  };

  // Profile Tab UI
  const renderProfile = () => (
    <form onSubmit={handleProfileSave} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">Email Address</label>
        <div className="relative">
          <input type="text" value={userState?.email || ''} readOnly className="w-full bg-black/40 border border-white/5 rounded-lg pl-10 pr-4 py-2.5 text-neutral-500 cursor-not-allowed" />
          <svg className="w-4 h-4 text-neutral-500 absolute left-3.5 top-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">Full Name</label>
        <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="e.g. Rahul Sharma" required className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 transition-colors placeholder:text-neutral-600" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">Company / Brand Name</label>
        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)} placeholder="e.g. ReviewLens Store" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 transition-colors" />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-neutral-300">Verified WhatsApp Number</label>
        <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="e.g. +91 98765 43210" className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 transition-colors placeholder:text-neutral-600" />
      </div>
      <div className="flex items-center gap-3 mt-2 bg-white/5 p-4 rounded-xl border border-white/5">
        <div className="flex-1">
          <p className="text-sm font-bold text-white">WhatsApp Critical Alerts</p>
          <p className="text-xs text-neutral-400 mt-0.5">Receive immediate notifications for high-risk product returns.</p>
        </div>
        <button type="button" onClick={() => setWhatsappAlerts(!whatsappAlerts)} className={`w-11 h-6 rounded-full transition-colors relative ${whatsappAlerts ? 'bg-emerald-500' : 'bg-neutral-600'}`}>
          <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition-transform ${whatsappAlerts ? 'translate-x-5' : ''}`}></div>
        </button>
      </div>
      <div className="mt-2 flex justify-end">
        <button type="submit" disabled={isProfileSaving} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50">
          {isProfileSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </div>
    </form>
  );

  const renderSecurity = () => {
    const strength = calculateStrength(password);
    const isGoogle = userState?.providers?.includes('google');

    if (isGoogle) {
      return (
        <div className="flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-xl p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center p-2.5">
                <svg viewBox="0 0 48 48" className="w-full h-full"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691z"/><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/></svg>
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Google SSO: Connected</h3>
                <p className="text-neutral-400 text-sm">You registered via Google. Password changes are disabled.</p>
              </div>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Active SSO</span>
          </div>
        </div>
      );
    }

    return (
      <form onSubmit={handleSecuritySave} className="flex flex-col gap-5">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center justify-between mb-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-500/20 rounded-full flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
            </div>
            <div>
              <h3 className="text-white font-bold text-base">Email/Password: Active</h3>
              <p className="text-neutral-400 text-xs mt-0.5">You log in with your email address and password.</p>
            </div>
          </div>
          <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Standard Auth</span>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-300">New Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter new password (min. 8 characters)" required minLength={8} className="w-full bg-black/40 border border-white/10 rounded-lg pl-4 pr-10 py-2.5 text-white focus:border-indigo-500 transition-colors placeholder:text-neutral-600" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-neutral-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{showPassword ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}</svg>
            </button>
          </div>
          {password.length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex gap-1 flex-1 h-1.5">
                <div className={`flex-1 rounded-full ${strength.score >= 1 ? strength.color : 'bg-neutral-800'}`}></div>
                <div className={`flex-1 rounded-full ${strength.score >= 2 ? strength.color : 'bg-neutral-800'}`}></div>
                <div className={`flex-1 rounded-full ${strength.score >= 3 ? strength.color : 'bg-neutral-800'}`}></div>
              </div>
              <span className={`text-xs font-bold ${strength.score === 1 ? 'text-rose-500' : strength.score === 2 ? 'text-amber-500' : 'text-emerald-500'}`}>{strength.text}</span>
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-neutral-300">Confirm New Password</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Re-enter new password" required minLength={8} className={`w-full bg-black/40 border rounded-lg pl-4 pr-10 py-2.5 text-white transition-colors placeholder:text-neutral-600 ${confirmPassword && password !== confirmPassword ? 'border-rose-500/50 focus:border-rose-500' : 'border-white/10 focus:border-indigo-500'}`} />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-neutral-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{showPassword ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /> : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.543 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />}</svg>
            </button>
          </div>
          {confirmPassword.length > 0 && (
            <div className={`text-xs mt-1 font-bold flex items-center gap-1 ${password === confirmPassword ? 'text-emerald-500' : 'text-rose-500'}`}>
              {password === confirmPassword ? (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Passwords match</>
              ) : (
                <><svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg> Passwords do not match</>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <button type="submit" disabled={isSecuritySaving || (password !== confirmPassword) || password.length < 8} className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] disabled:opacity-50">
            {isSecuritySaving ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    );
  };

  const renderBilling = () => {
    const totalQuota = 50;
    const usedAudits = historicalData ? historicalData.length : 0;
    const remainingCredits = Math.max(0, totalQuota - usedAudits);
    const progressPercent = Math.min(100, Math.max(0, (usedAudits / totalQuota) * 100));

    return (
      <div className="flex flex-col gap-6">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex flex-col gap-4">
          <div className="flex justify-between items-start">
            <div>
              <h3 className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Current Plan</h3>
              <p className="text-2xl font-black text-white mt-1">{userState?.plan?.toUpperCase() || 'STARTER SELLER'} PLAN</p>
            </div>
            <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-3 py-1 rounded-full text-xs font-bold uppercase">Active</span>
          </div>
          
          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-300 font-medium">SKU Audits Used</span>
              <span className="text-white font-bold">{usedAudits} / {totalQuota}</span>
            </div>
            <div className="h-2 w-full bg-black/40 rounded-full overflow-hidden border border-white/5">
              <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
            </div>
            <p className="text-xs text-neutral-500 text-right">{remainingCredits} credits remaining</p>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-bold text-white mb-4">Upgrade Your Plan</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-black/40 border border-indigo-500/30 rounded-xl p-5 flex flex-col gap-4 relative overflow-hidden group hover:border-indigo-500 transition-colors">
              <div className="absolute top-0 right-0 bg-indigo-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">POPULAR</div>
              <div>
                <h4 className="text-lg font-bold text-white">Pro Growth</h4>
                <p className="text-2xl font-black text-indigo-400 mt-1">₹1,999<span className="text-sm text-neutral-500 font-medium">/mo</span></p>
              </div>
              <ul className="space-y-2 text-sm text-neutral-300 flex-1">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> 500 SKU Audits/mo</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Competitor Radar</li>
              </ul>
              <button onClick={() => showToast("Contacting Sales for Pro Growth...", "success")} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-bold transition-all mt-2">Upgrade to Pro</button>
            </div>

            <div className="bg-black/40 border border-white/10 rounded-xl p-5 flex flex-col gap-4 hover:border-white/30 transition-colors">
              <div>
                <h4 className="text-lg font-bold text-white">Enterprise D2C</h4>
                <p className="text-2xl font-black text-white mt-1">Custom</p>
              </div>
              <ul className="space-y-2 text-sm text-neutral-300 flex-1">
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Unlimited Audits</li>
                <li className="flex items-center gap-2"><svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg> Custom API Sync</li>
              </ul>
              <button onClick={() => showToast("Contacting Enterprise Sales...", "success")} className="w-full py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-bold transition-all mt-2">Contact Sales</button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDanger = () => (
    <div className="flex flex-col gap-8">
      <div className="bg-white/5 border border-white/10 rounded-xl p-5 flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-lg">Export Historical Data</h3>
          <p className="text-neutral-400 text-sm mt-1">Download a CSV of all your analyzed SKUs.</p>
        </div>
        <button onClick={handleExportCSV} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white border border-white/10 rounded-lg text-sm font-medium transition-colors">
          Export CSV
        </button>
      </div>

      <div className="bg-rose-500/5 border border-rose-500/20 rounded-xl p-5 flex flex-col gap-4">
        <div>
          <h3 className="text-rose-500 font-bold text-lg">Delete Account</h3>
          <p className="text-rose-500/70 text-sm mt-1">Permanently erase all your historical product tracking data and log out. This cannot be undone.</p>
        </div>
        <div className="flex justify-end mt-2">
          {deleteConfirmStep === 0 ? (
            <button onClick={handleDeleteAccount} className="px-5 py-2 bg-rose-600/20 hover:bg-rose-600/30 text-rose-500 border border-rose-500/30 rounded-lg text-sm font-bold transition-colors">
              Delete Account
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <span className="text-rose-500 text-sm font-bold">Are you absolutely sure?</span>
              <button onClick={() => setDeleteConfirmStep(0)} className="px-4 py-2 text-sm text-neutral-400 hover:text-white transition-colors">Cancel</button>
              <button onClick={handleDeleteAccount} disabled={isDeleting} className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-bold transition-all shadow-[0_0_15px_rgba(225,29,72,0.3)] disabled:opacity-50">
                {isDeleting ? 'Wiping Data...' : 'Yes, Delete Everything'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-black/60 backdrop-blur-sm sm:p-4">
      <div className="bg-neutral-900 border border-white/10 sm:rounded-2xl w-full max-w-4xl h-full sm:h-[calc(100vh-2rem)] shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        <div className="flex justify-between items-center px-6 py-5 border-b border-white/10 shrink-0">
          <h2 className="text-xl font-black text-white">Settings & User Management</h2>
          <button onClick={onClose} className="text-neutral-500 hover:text-white transition-colors p-1 bg-white/5 rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
          <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 shrink-0 flex flex-row md:flex-col p-4 gap-2 overflow-x-auto md:overflow-y-auto no-scrollbar">
            {(['Profile', 'Security', 'Billing', 'Danger'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2.5 text-sm font-bold rounded-lg text-left whitespace-nowrap transition-colors ${activeTab === tab ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'text-neutral-400 hover:bg-white/5 hover:text-neutral-200 border border-transparent'}`}>
                {tab === 'Profile' && '👤 Profile & Company'}
                {tab === 'Security' && '🔒 Security & Credentials'}
                {tab === 'Billing' && '💳 Billing & Plan Quota'}
                {tab === 'Danger' && '⚠️ Danger Zone'}
              </button>
            ))}
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 bg-black/20">
            {toast && (
              <div className={`p-4 rounded-xl text-sm font-bold mb-6 animate-in fade-in ${toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}`}>
                {toast.msg}
              </div>
            )}
            
            {activeTab === 'Profile' && renderProfile()}
            {activeTab === 'Security' && renderSecurity()}
            {activeTab === 'Billing' && renderBilling()}
            {activeTab === 'Danger' && renderDanger()}
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
  const [analyses, setAnalyses] = useState<AnalyzedProductSummary[]>([]);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<AnalyzedProductSummary | null>(null);
  const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userState, setUserState] = useState<any>(null);
  const [isIngestionModalOpen, setIsIngestionModalOpen] = useState(false);
  const [marketplaceFilter, setMarketplaceFilter] = useState<'all' | 'flipkart' | 'meesho'>('all');
  const [currentSkuIndex, setCurrentSkuIndex] = useState(0);
  const [totalSkus, setTotalSkus] = useState(0);

  const activeProduct = analyses.find(a => 
    (a.id && a.id === activeAnalysisId) || 
    (a.url && a.url === activeAnalysisId) || 
    (a.title && a.title === activeAnalysisId)
  ) || analyses[0] || null;

  useEffect(() => {
    async function loadInitialState() {
      const res = await fetchDashboardStateAction();
      if (res.success) {
        setUserState(res.user);
        const data = res.historicalData || [];
        setAnalyses(data);
        if (data.length > 0 && !activeAnalysisId) {
          setActiveAnalysisId(data[0].id || data[0].url || data[0].title);
        }
      } else {
        setError(res.error || "Failed to load dashboard state.");
      }
    }
    loadInitialState();
  }, []);

  const loadDemoData = () => {
    setAnalyses(MOCK_HISTORICAL_DATA);
    if (MOCK_HISTORICAL_DATA.length > 0) {
      setActiveAnalysisId(MOCK_HISTORICAL_DATA[0].id || MOCK_HISTORICAL_DATA[0].url || MOCK_HISTORICAL_DATA[0].title);
    }
  };

  const handleAnalyze = async (urls: string[]) => {
    setIsLoading(true);
    setActiveStep(1);
    setError(null);
    setCurrentSkuIndex(1);
    setTotalSkus(urls.length);

    const stepInterval = setInterval(() => {
      setActiveStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 2500);

    try {
      const response = await Promise.race([
        analyzeUrlsAction(urls),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT_90S")), 90000)
        )
      ]);

      if (response.success) {
        setActiveStep(3);
        const updatedSummaries = response.summaries;

        // Auto-focus the first newly analyzed product
        if (updatedSummaries.length > 0) {
          const newId = updatedSummaries[0].id || updatedSummaries[0].url || updatedSummaries[0].title;
          if (newId) setActiveAnalysisId(newId);
        }

        setAnalyses((prev) => {
          const existingIds = new Set(prev.map(p => p.id || p.title));
          const newItems = updatedSummaries.filter(s => !existingIds.has(s.id || s.title));
          return [...newItems, ...prev];
        });
        setUserState((prev: any) => prev ? { ...prev, credits: Math.max(0, (prev.credits ?? 50) - updatedSummaries.length) } : prev);

        // Background sync to pull latest state from database
        fetchDashboardStateAction().then(res => {
          if (res.success && res.historicalData && res.historicalData.length > 0) {
            setAnalyses(res.historicalData);
          }
        });

        // Close modal smoothly after brief completion delay
        setTimeout(() => setIsIngestionModalOpen(false), 400);

      } else {
        setError("Pipeline Error: " + response.error);
      }
    } catch (err: any) {
      if (err.message === "TIMEOUT_90S" || err.message?.includes("504") || err.message?.includes("timeout")) {
        setError("The request took too long. Please try a direct product page link or re-submit.");
      } else {
        setError("A fatal error occurred: " + (err.message || ''));
      }
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setCurrentSkuIndex(0);
      setTotalSkus(0);
    }
  };


  const handleDeleteProduct = async (id: string) => {
    const res = await deleteProductAction(id);
    if (res.success) {
      setAnalyses(prev => prev.filter(p => p.id !== id));
    } else {
      setError("Failed to delete product: " + res.error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to clear all history? This cannot be undone.")) return;
    const res = await clearAllHistoryAction();
    if (res.success) {
      setAnalyses([]);
    } else {
      setError("Failed to clear history: " + res.error);
    }
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const getDisplayName = () => {
    if (userState?.full_name) return userState.full_name;
    if (userState?.email) return userState.email.split('@')[0];
    return 'User';
  };

  const getInitials = () => {
    const name = getDisplayName();
    const parts = name.split(' ').filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    } else if (name.length > 0) {
      return name.substring(0, 2).toUpperCase();
    }
    return 'US';
  };

  return (
    <div className="h-screen max-h-screen overflow-hidden flex flex-col bg-neutral-950 text-neutral-50 selection:bg-indigo-500/30">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md shrink-0 h-14">
        <div className="container mx-auto flex h-full max-w-[1600px] items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-base shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              R
            </div>
            <span className="text-base font-bold tracking-tight text-white hidden sm:block">ReviewLens Intelligence</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Primary CTA */}
            <button
              id="run-ai-audit-btn"
              onClick={() => setIsIngestionModalOpen(true)}
              disabled={isLoading}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_20px_rgba(79,70,229,0.35)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)] disabled:opacity-60 disabled:shadow-none"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              <span className="hidden sm:inline">Run AI Product Audit</span>
              <span className="sm:hidden">Audit</span>
            </button>

            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-neutral-900 border border-white/10 rounded-lg cursor-pointer hover:bg-neutral-800 transition-colors" onClick={() => setIsSettingsModalOpen(true)}>
              <span className="text-xs font-bold text-amber-400">⚡ {Math.max(0, 50 - analyses.length)}/50</span>
              <span className="text-xs text-neutral-400 font-medium hidden sm:block">Credits</span>
            </div>

            <div className="relative">
              <button onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)} className="flex items-center gap-2 focus:outline-none">
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white border border-white/10 shadow-sm">
                  {getInitials()}
                </div>
              </button>
              
              {isUserDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-neutral-900 border border-white/10 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
                  <div className="px-4 py-3 border-b border-white/10">
                    <p className="text-sm font-medium text-white truncate">{getDisplayName()}</p>
                    <p className="text-xs text-neutral-400 truncate mt-0.5">{userState?.email || 'No email'}</p>
                    <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 uppercase tracking-wider">
                      {userState?.plan ?? 'Hobby'} Plan
                    </div>
                  </div>
                  <div className="py-1">
                    <button onClick={() => { setIsSettingsModalOpen(true); setIsUserDropdownOpen(false); }} className="w-full text-left block px-4 py-2 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition-colors">Settings & Billing</button>
                  </div>
                  <div className="border-t border-white/10 pt-1 mt-1">
                    <button onClick={handleSignOut} className="w-full text-left px-4 py-2 text-sm text-rose-400 hover:bg-white/5 transition-colors">
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 container mx-auto max-w-[1600px] w-full px-4 py-3 flex flex-col gap-2.5 overflow-hidden">
        {/* Page title & errors */}
        <div className="shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-black tracking-tight text-white">Command Center</h1>
            <p className="text-[11px] text-neutral-400">Enterprise catalog intelligence &amp; margin recovery</p>
          </div>
        </div>

        {error && (
          <div className="shrink-0 w-full rounded-xl p-2.5 flex items-center justify-between border bg-rose-500/10 border-rose-500/20 text-rose-400 text-xs">
            <span className="font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-xs font-semibold px-2 py-0.5 hover:bg-white/10 rounded transition-colors">Dismiss</button>
          </div>
        )}

        {/* Pipeline loader */}
        {isLoading && (
          <div className="shrink-0 w-full">
            <MultiStepPipelineLoader activeStep={activeStep} />
          </div>
        )}

        {/* KPI Portfolio Bar */}
        <KPICards data={analyses} />

        {/* Onboarding Hero — shown only when user has 0 SKUs */}
        {analyses.length === 0 && !isLoading && (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center text-center gap-4 py-8 bg-white/[0.02] border border-white/10 rounded-2xl">
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                <svg className="w-8 h-8 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-indigo-500 animate-ping" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white mb-1">Your Intelligence Console Awaits</h2>
              <p className="text-neutral-400 text-xs max-w-md">Audit your first Flipkart or Meesho product URL to unlock defect radars, vernacular live feeds, and capital bleed prevention.</p>
            </div>
            <button
              onClick={() => setIsIngestionModalOpen(true)}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold text-sm transition-all shadow-[0_0_25px_rgba(79,70,229,0.4)] hover:shadow-[0_0_35px_rgba(79,70,229,0.6)]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              Audit Your First Product
            </button>
            <button onClick={loadDemoData} className="text-xs text-neutral-500 hover:text-indigo-400 transition-colors underline underline-offset-2">
              Or preview with demo data →
            </button>
          </div>
        )}

        {/* Split-Pane Command Center — shown only when user has SKUs */}
        {analyses.length > 0 && (
          <div className="flex-1 min-h-0 grid grid-cols-12 gap-3">
            {/* LEFT PANE: Historical Catalog Table (6 cols) */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-6 flex flex-col min-h-0 h-full">
              <HistoricalTable
                data={analyses}
                onSelectProduct={setSelectedProduct}
                onDeleteProduct={handleDeleteProduct}
                onClearAll={handleClearAll}
                activeAnalysisId={activeAnalysisId}
                onInspectRadar={(id) => setActiveAnalysisId(id)}
                marketplaceFilter={marketplaceFilter}
                onMarketplaceFilterChange={setMarketplaceFilter}
              />
            </div>

            {/* RIGHT PANE: Live Defect Radar + Vernacular Feed (6 cols) */}
            <div className="col-span-12 lg:col-span-6 xl:col-span-6 flex flex-col min-h-0 h-full gap-2.5">
              {/* Top 60%: Interactive Defect Cluster Radar */}
              <div className="flex-[3] min-h-0 flex flex-col">
                <RiskRadar
                  results={analyses}
                  activeProduct={activeProduct}
                  onSelectProduct={setSelectedProduct}
                  onSwitchActiveProduct={(id) => setActiveAnalysisId(id)}
                />
              </div>

              {/* Bottom 40%: Vernacular Live Feed */}
              {activeProduct?.intelligence?.vernacularDecoder && activeProduct.intelligence.vernacularDecoder.length > 0 ? (
                <div className="flex-[2] min-h-0 flex flex-col bg-white/[0.02] border border-white/10 rounded-2xl p-3 overflow-hidden">
                  <div className="flex items-center gap-2 shrink-0 mb-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <h3 className="text-xs font-bold text-white uppercase tracking-wider">Vernacular Live Feed</h3>
                    <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 uppercase">
                      {activeProduct.platform.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-white/10">
                    {activeProduct.intelligence.vernacularDecoder.slice(0, 5).map((v: any, i: number) => (
                      <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex flex-col gap-0.5 shrink-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{v.businessImpactCategory || 'Quality'}</span>
                          <span className="text-[9px] text-neutral-500">{v.detectedLanguage || 'Hinglish'}</span>
                        </div>
                        <p className="text-xs text-neutral-200 font-serif italic leading-snug">&ldquo;{v.rawVernacularText || v.originalTerm}&rdquo;</p>
                        <p className="text-[10px] text-emerald-400 font-mono">{v.englishMeaning}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex-[2] min-h-0 flex items-center justify-center bg-white/[0.02] border border-white/10 rounded-2xl p-3 text-center">
                  <p className="text-xs text-neutral-500 font-mono">Select a product to stream live buyer vernacular feed…</p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {selectedProduct && (
        <ExecutiveIntelligenceConsoleModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}

      <SmartIngestionModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
        onAnalyze={(urls) => { handleAnalyze(urls); }}
        isLoading={isLoading}
        loadingStep={activeStep}
        currentSkuIndex={currentSkuIndex}
        totalSkus={totalSkus}
        availableCredits={userState?.credits ?? 50}
      />

      <SettingsManagerModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        userState={userState}
        historicalData={analyses}
        onUpdate={(updates) => setUserState((prev: any) => ({ ...prev, ...updates }))}
        onAccountWiped={handleSignOut}
      />
    </div>
  );
}
