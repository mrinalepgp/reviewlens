"use client";

export const maxDuration = 120;

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { analyzeUrlsAction, AnalyzedProductSummary, fetchDashboardStateAction, deleteProductAction, updateUserProfileAction, wipeUserAccountAction } from '@/app/actions';
import { createClient } from '@/utils/supabase/client';
import KPICards from '@/components/KPICards';
import RiskRadar from '@/components/RiskRadar';
import ExecutiveConsole from '@/components/ExecutiveConsole';
import SmartIngestionModal from '@/components/SmartIngestionModal';
import { sanitizeCustomerQuote } from '@/lib/analyzer';
import { errorMessage } from '@/lib/errors';

// --- Types ---
type HealthStatus = 'safe' | 'warning' | 'critical';

// --- Components ---


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
    (item.title || 'Unknown').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.platform || 'Unknown').toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  // Seed the form from the current profile whenever the modal is (re)opened.
  // Adjusting during render is React's documented alternative to a
  // setState-in-effect cascade for prop-derived state.
  const [seededFor, setSeededFor] = useState<string | null>(null);
  const seedKey = isOpen && userState ? JSON.stringify([
    userState.full_name, userState.whatsapp_number, userState.company_name, userState.whatsapp_alerts_enabled
  ]) : null;

  if (seedKey !== null && seedKey !== seededFor) {
    setSeededFor(seedKey);
    setFullName(userState.full_name || '');
    setWhatsapp(userState.whatsapp_number || '');
    setCompanyName(userState.company_name || '');
    setWhatsappAlerts(userState.whatsapp_alerts_enabled || false);
  }
  if (seedKey === null && seededFor !== null) {
    setSeededFor(null);
  }

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
  const router = useRouter();
  const [toastNotification, setToastNotification] = useState<{
    message: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastNotification({ message, type });
    setTimeout(() => {
      setToastNotification(null);
    }, 6000);
  };

  // ── Synchronous localStorage seed ────────────────────────────────────────
  // Runs in the useState initializer — before the first paint — so returning
  // users NEVER see a blank flash on reload. No useEffect needed for this.
  const CACHE_KEY = 'reviewlens_persistent_catalog';

  const readCache = (): AnalyzedProductSummary[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('reviewlens_persistent_catalog') || localStorage.getItem('reviewlens_catalog');
      if (raw) {
        const parsed = JSON.parse(raw) as AnalyzedProductSummary[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          const clean = parsed.filter(p => {
            const title = (p.title || '').toLowerCase();
            return !title.startsWith('analysis failed') && !title.startsWith('incomplete data');
          });
          if (clean.length !== parsed.length) {
            localStorage.setItem('reviewlens_persistent_catalog', JSON.stringify(clean));
          }
          return clean;
        }
      }
    } catch { /* corrupt JSON — ignore */ }
    return [];
  };

  const [analyses, setAnalyses] = useState<AnalyzedProductSummary[]>(readCache);
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(() => {
    const cached = readCache();
    if (cached.length > 0) return cached[0].id || cached[0].url || cached[0].title || null;
    return null;
  });
  const [isLoading, setIsLoading] = useState(false);
  // isFetchingCatalog: start false if we already have cache data (no onboarding flash needed)
  const [isFetchingCatalog, setIsFetchingCatalog] = useState<boolean>(() => readCache().length === 0);
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
      try {
        // ── Tier 2: Direct Supabase client fetch ───────────────────────────
        // Tier 1 already seeded state synchronously from cache via useState.
        // This background fetch syncs with the authoritative DB state and
        // updates both the UI and localStorage cache silently.
        try {
          const supabaseClient = createClient();
          const { data: liveRows, error: liveError } = await supabaseClient
            .from('analyses')
            .select('*')
            .order('created_at', { ascending: false });

          if (liveError) {
            console.warn('[Dashboard] Direct Supabase fetch error:', liveError.message);
          } else if (liveRows && liveRows.length > 0) {
            // Map raw DB rows into AnalyzedProductSummary shape
            const mapped: AnalyzedProductSummary[] = liveRows.map((p: any) => {
              const intel = p.intelligence_data || p.intelligence || {};
              if ((!intel.defectTaxonomy || intel.defectTaxonomy.length === 0) && p.defect_clusters && Array.isArray(p.defect_clusters)) {
                intel.defectTaxonomy = p.defect_clusters;
              }
              if (!intel.executiveScorecard) intel.executiveScorecard = {};
              if (p.return_risk_score != null && intel.executiveScorecard.returnRiskScore == null)
                intel.executiveScorecard.returnRiskScore = p.return_risk_score;
              if (p.capital_protected != null && intel.executiveScorecard.estimatedCapitalProtected == null)
                intel.executiveScorecard.estimatedCapitalProtected = p.capital_protected;
              if (p.top_defect != null && intel.executiveScorecard.primaryRiskDriver == null)
                intel.executiveScorecard.primaryRiskDriver = p.top_defect;
              const extractedPrice = p.price || p.product_price || intel.price || p.margin_bleed_range || p.shield_radar?.price || p.competitor_benchmarks?.price || '';
              const priceStr = typeof extractedPrice === 'number' ? `₹${extractedPrice}` : String(extractedPrice || '');
              if (priceStr && !intel.price) intel.price = priceStr;
              if (priceStr && !intel.executiveScorecard.price) intel.executiveScorecard.price = priceStr;

              const rawReviews = p.raw_reviews || intel.raw_reviews || intel.reviews || p.shield_radar?.raw_reviews || [];
              if (!intel.raw_reviews) intel.raw_reviews = rawReviews;
              if (!intel.reviews) intel.reviews = rawReviews;

              return {
                id: p.id,
                url: p.product_url || p.url || '',
                platform: p.marketplace || p.platform || 'flipkart',
                title: p.product_name || p.title || p.product_title || 'Analyzed Product',
                price: priceStr,
                category: p.category,
                averageScore: p.average_rating || p.averageScore || 4.0,
                riskAssessment: p.risk_status || p.riskAssessment || 'safe',
                negativeThemes: intel?.executiveScorecard?.primaryRiskDriver
                  ? [intel.executiveScorecard.primaryRiskDriver] : [],
                raw_reviews: rawReviews,
                reviewsCount: rawReviews.length,
                intelligence: intel,
              };
            });

            setAnalyses(prev => {
              const dbIds = new Set(mapped.map(m => m.id));
              const localOnly = prev.filter(p => !p.id || !dbIds.has(p.id));
              const merged = [...mapped, ...localOnly];
              try {
                localStorage.setItem('reviewlens_persistent_catalog', JSON.stringify(merged));
                localStorage.setItem('reviewlens_catalog', JSON.stringify(merged));
              } catch { /* quota exceeded — ignore */ }
              return merged;
            });
            const liveId = mapped[0].id || mapped[0].url || mapped[0].title;
            setActiveAnalysisId(prev => prev || liveId || null);
            console.log(`[Dashboard] Direct Supabase fetch: ${mapped.length} analyses loaded. Active: ${liveId}`);
          } else {
            console.log('[Dashboard] Direct Supabase fetch returned 0 rows. Preserving local cache.');
          }
        } catch (directErr) {
          console.warn('[Dashboard] Direct Supabase fetch threw:', directErr);
        }

        // ── Tier 3: Server action for user profile / credits ───────────────
        // Only updates userState. Does NOT overwrite catalog (Tier 2 is
        // authoritative). Falls back to server-action catalog only if both
        // localStorage AND the direct Supabase fetch returned nothing.
        const res = await fetchDashboardStateAction();
        if (res.success) {
          setUserState(res.user);
          // Only fall back to server-action catalog if Tier 2 returned nothing
          setAnalyses(prev => {
            if (prev.length > 0) return prev; // already populated
            const data = res.historicalData || [];
            if (data.length > 0) {
              const fallbackId = data[0].id || data[0].url || data[0].title;
              setActiveAnalysisId(fallbackId ?? null);
              console.log(`[Dashboard] Tier-3 fallback: loaded ${data.length} entries.`);
              try { localStorage.setItem(CACHE_KEY, JSON.stringify(data)); } catch { /* ignore */ }
            }
            return data;
          });
        } else {
          console.warn('[Dashboard] Server action failed:', res.error);
          setError(prev => prev || res.error || 'Failed to load dashboard state.');
        }
      } finally {
        setIsFetchingCatalog(false);
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

  const isFreeUser = (userState?.plan || '').toLowerCase() === 'free' || (userState?.plan || '').toLowerCase() === 'hobby';

  const handleAnalyze = async (urls: string[], options?: { startDate?: string; endDate?: string; isComparison?: boolean; reviewLimit?: number }) => {
    console.log('[AuditModal] Initiating audit with URL and limits:', { urls, options });

    if (isFreeUser && analyses.length + urls.length > 3) {
      const limitMsg = `Free tier limit reached: Free accounts can analyze a maximum of 3 product links total (currently using ${analyses.length}/3). Please upgrade to Growth Seller for unlimited product links.`;
      setError(limitMsg);
      showToast(limitMsg, 'error');
      setIsIngestionModalOpen(false);
      return;
    }

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
        analyzeUrlsAction(urls, options),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("TIMEOUT_90S")), 90000)
        )
      ]);

      if (response.success) {
        setActiveStep(3);
        const updatedSummaries = response.summaries;

        // ── Atomic localStorage write on audit completion ──────────────────
        // Build the updated array first, then write to localStorage immediately
        // (before any async background work) so a page refresh right after an
        // audit always finds the new data in cache.
        setAnalyses(prev => {
          const newIds = new Set(updatedSummaries.map(s => s.id || s.url || s.title));
          const filteredPrev = prev.filter(p => !newIds.has(p.id || p.url || p.title));
          const updated = [...updatedSummaries, ...filteredPrev];
          // Atomic sync to localStorage — zero-latency persistence
          try { 
            localStorage.setItem('reviewlens_persistent_catalog', JSON.stringify(updated));
            localStorage.setItem('reviewlens_catalog', JSON.stringify(updated));
          } catch { /* quota — ignore */ }
          console.log(`[Dashboard] Atomic cache write: ${updated.length} total entries persisted to reviewlens_persistent_catalog.`);
          return updated;
        });

        // Set the first new result as active
        if (updatedSummaries.length > 0) {
          const newId = updatedSummaries[0].id || updatedSummaries[0].url || updatedSummaries[0].title;
          if (newId) setActiveAnalysisId(newId);
        }

        setUserState((prev: any) => prev ? { ...prev, credits: Math.max(0, (prev.credits ?? 50) - updatedSummaries.length) } : prev);

        // Explicit success feedback toast
        showToast("Audit initiated successfully!", "success");

        // Close modal smoothly
        setIsIngestionModalOpen(false);

        // Trigger router refresh so next-level server data syncs
        try {
          router.refresh();
        } catch { /* ignore */ }

        // Background sync: replace local state with authoritative DB snapshot
        // (picks up DB ids + any server-side field enrichment) and re-saves cache.
        void (async () => {
          try {
            const supabaseClient = createClient();
            const { data: freshRows } = await supabaseClient
              .from('analyses')
              .select('*')
              .order('created_at', { ascending: false });

            if (freshRows && freshRows.length > 0) {
              const freshMapped: AnalyzedProductSummary[] = freshRows.map((p: any) => {
                const intel = p.intelligence_data || p.intelligence || {};
                if ((!intel.defectTaxonomy || intel.defectTaxonomy.length === 0) && p.defect_clusters && Array.isArray(p.defect_clusters))
                  intel.defectTaxonomy = p.defect_clusters;
                if (!intel.executiveScorecard) intel.executiveScorecard = {};
                if (p.return_risk_score != null && intel.executiveScorecard.returnRiskScore == null)
                  intel.executiveScorecard.returnRiskScore = p.return_risk_score;
                if (p.capital_protected != null && intel.executiveScorecard.estimatedCapitalProtected == null)
                  intel.executiveScorecard.estimatedCapitalProtected = p.capital_protected;
                if (p.top_defect != null && intel.executiveScorecard.primaryRiskDriver == null)
                  intel.executiveScorecard.primaryRiskDriver = p.top_defect;
                return {
                  id: p.id, url: p.product_url || p.url, platform: p.platform,
                  title: p.product_name || p.title || p.product_title, price: p.price || intel.price, category: p.category,
                  averageScore: p.average_rating || p.averageScore || 4.0,
                  riskAssessment: p.risk_status || p.riskAssessment || 'safe',
                  negativeThemes: intel?.executiveScorecard?.primaryRiskDriver ? [intel.executiveScorecard.primaryRiskDriver] : [],
                  intelligence: intel,
                };
              });

              setAnalyses(prev => {
                const dbIds = new Set(freshMapped.map(m => m.id));
                const localOnly = prev.filter(p => !p.id || !dbIds.has(p.id));
                const merged = [...freshMapped, ...localOnly];
                try { localStorage.setItem(CACHE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
                return merged;
              });
              console.log(`[Dashboard] Post-audit DB sync: refreshed ${freshMapped.length} records.`);
            }
          } catch (syncErr) {
            console.warn('[Dashboard] Post-audit Supabase sync failed:', syncErr);
          }
        })();

        // Fetch user profile to update credits display
        fetchDashboardStateAction().then(res => {
          if (res.success) setUserState(res.user);
        });

      } else {
        const errorMsg = response.error || 'Failed to process product reviews.';
        setError("Failed to process product reviews: " + errorMsg);
        showToast("Failed to process product reviews: " + errorMsg, "error");
        setIsIngestionModalOpen(false);
      }
    } catch (err) {
      const errorMsg = (errorMessage(err) === "TIMEOUT_90S" || errorMessage(err)?.includes("504") || errorMessage(err)?.includes("timeout"))
        ? "The request took longer than expected (timed out after 90s). Please try a direct product page link or re-submit."
        : (errorMessage(err) || 'An unexpected error occurred during analysis.');
      setError("Failed to process product reviews: " + errorMsg);
      showToast("Failed to process product reviews: " + errorMsg, "error");
      setIsIngestionModalOpen(false);
    } finally {
      clearInterval(stepInterval);
      setIsLoading(false);
      setCurrentSkuIndex(0);
      setTotalSkus(0);
    }
  };


  const persistCatalogState = (updated: AnalyzedProductSummary[]) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('reviewlens_persistent_catalog', JSON.stringify(updated));
        localStorage.setItem('reviewlens_catalog', JSON.stringify(updated));
      } catch { /* quota — ignore */ }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    const res = await deleteProductAction(id);
    if (res.success) {
      setAnalyses(prev => {
        const next = prev.filter(p => p.id !== id);
        persistCatalogState(next);
        return next;
      });
    } else {
      setError("Failed to delete product: " + res.error);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Are you sure you want to clear all history? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/catalog/clear', { method: 'DELETE' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || `HTTP ${res.status}`);
      }

      console.log(`[Dashboard] Cleared ${json.deleted ?? 0} catalog record(s) from DB.`);

      // Atomically reset the entire catalog UI to zero-state
      setAnalyses([]);
      setActiveAnalysisId(null);

      // Invalidate localStorage cache so next reload doesn't re-surface stale data
      try {
        localStorage.removeItem(CACHE_KEY);
        localStorage.removeItem('reviewlens_catalog');
        localStorage.removeItem('reviewlens_persistent_catalog');
        localStorage.removeItem('reviewlens_cached_catalog');
      } catch { /* ignore */ }
    } catch (err) {
      console.error('[Dashboard] Clear all failed:', err);
      setError('Failed to clear history: ' + (errorMessage(err) || 'Unknown error'));
    }
  };

  const handleSignOut = async () => {
    try {
      document.cookie = "reviewlens_dev_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
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
              {isFreeUser ? (
                <>
                  <span className={`text-xs font-bold ${analyses.length >= 3 ? 'text-rose-400' : 'text-amber-400'}`}>⚡ {analyses.length}/3</span>
                  <span className="text-xs text-neutral-400 font-medium hidden sm:block">Product Links</span>
                </>
              ) : (
                <>
                  <span className="text-xs font-bold text-emerald-400">⚡ Unlimited</span>
                  <span className="text-xs text-neutral-400 font-medium hidden sm:block">Credits</span>
                </>
              )}
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

        {/* Onboarding Hero — shown only when user has 0 SKUs AND initial fetch has completed */}
        {analyses.length === 0 && !isLoading && !isFetchingCatalog && (
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
                      {(activeProduct.platform || 'unknown').toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-h-0 overflow-y-auto pr-1 flex flex-col gap-1.5 scrollbar-thin scrollbar-thumb-white/10">
                    {activeProduct.intelligence.vernacularDecoder.slice(0, 5).map((v: any, i: number) => (
                      <div key={i} className="bg-black/30 border border-white/5 rounded-xl p-2.5 flex flex-col gap-0.5 shrink-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[9px] font-bold text-rose-400 bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{v.businessImpactCategory || 'Quality'}</span>
                          <span className="text-[9px] text-neutral-500">{v.detectedLanguage || 'Hinglish'}</span>
                        </div>
                        <p className="text-xs text-neutral-200 font-serif italic leading-snug">&ldquo;{sanitizeCustomerQuote(v.rawVernacularText || v.originalTerm, activeProduct?.title)}&rdquo;</p>
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
        <ExecutiveConsole
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          userPlan={userState?.plan ?? 'enterprise'}
          onUpgrade={() => {
            setSelectedProduct(null);
            setIsSettingsModalOpen(true);
          }}
        />
      )}

      <SmartIngestionModal
        isOpen={isIngestionModalOpen}
        onClose={() => setIsIngestionModalOpen(false)}
        onAnalyze={(urls, options) => handleAnalyze(urls, options)}
        isLoading={isLoading}
        currentSkuIndex={currentSkuIndex}
        totalSkus={totalSkus}
        availableCredits={userState?.credits ?? 9999}
        userPlan={userState?.plan ?? 'enterprise'}
        currentProductCount={analyses.length}
        maxProductsAllowed={isFreeUser ? 3 : Infinity}
        onUpgrade={() => {
          setIsIngestionModalOpen(false);
          setIsSettingsModalOpen(true);
        }}
      />

      <SettingsManagerModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        userState={userState}
        historicalData={analyses}
        onUpdate={(updates) => setUserState((prev: any) => ({ ...prev, ...updates }))}
        onAccountWiped={handleSignOut}
      />

      {/* Explicit Global Notification Toast */}
      {toastNotification && (
        <div className="fixed top-5 right-5 z-[200] max-w-md w-[calc(100vw-2.5rem)] sm:w-auto animate-in slide-in-from-top-3 fade-in duration-200">
          <div className={`flex items-start gap-3 p-4 rounded-2xl border shadow-2xl backdrop-blur-xl ${
            toastNotification.type === 'success'
              ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-100 shadow-[0_0_30px_rgba(16,185,129,0.2)]'
              : toastNotification.type === 'error'
              ? 'bg-rose-950/95 border-rose-500/40 text-rose-100 shadow-[0_0_30px_rgba(244,63,94,0.2)]'
              : 'bg-indigo-950/95 border-indigo-500/40 text-indigo-100 shadow-[0_0_30px_rgba(99,102,241,0.2)]'
          }`}>
            <div className="text-xl shrink-0 mt-0.5">
              {toastNotification.type === 'success' ? '✅' : toastNotification.type === 'error' ? '⚠️' : 'ℹ️'}
            </div>
            <div className="flex-1 text-xs leading-relaxed">
              <div className="font-bold uppercase tracking-wider text-[11px] mb-0.5">
                {toastNotification.type === 'success' ? 'Audit Initiated' : toastNotification.type === 'error' ? 'Audit Notification' : 'Notification'}
              </div>
              <p className="opacity-90">{toastNotification.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToastNotification(null)}
              className="text-white/60 hover:text-white text-sm shrink-0 p-1 hover:bg-white/10 rounded-lg transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
