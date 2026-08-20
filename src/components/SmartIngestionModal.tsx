"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';

interface SmartIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (urls: string[]) => void;
  isLoading: boolean;
  loadingStep: number; // 0=idle,1=scraping,2=analyzing,3=finalizing
}

type Tab = 'url' | 'csv';

interface QueuedUrl {
  url: string;
  platform: 'flipkart' | 'meesho' | 'unknown';
  status: 'queued' | 'processing' | 'done' | 'error';
}

function detectPlatform(url: string): QueuedUrl['platform'] {
  if (url.includes('flipkart.com')) return 'flipkart';
  if (url.includes('meesho.com')) return 'meesho';
  return 'unknown';
}

const PLATFORM_COLORS = {
  flipkart: { bg: 'bg-blue-500/10', border: 'border-blue-500/20', text: 'text-blue-400', dot: 'bg-blue-400', label: 'Flipkart' },
  meesho: { bg: 'bg-pink-500/10', border: 'border-pink-500/20', text: 'text-pink-400', dot: 'bg-pink-400', label: 'Meesho' },
  unknown: { bg: 'bg-neutral-500/10', border: 'border-neutral-500/20', text: 'text-neutral-400', dot: 'bg-neutral-400', label: 'Unknown' },
};

const STEP_LABELS = [
  "Idle",
  "Phase 1: Spawning Scrape.do parallel workers...",
  "Phase 2: Executing Map-Reduce Gemini AI analysis...",
  "Phase 3: Finalizing executive return risk matrix...",
];

export default function SmartIngestionModal({ isOpen, onClose, onAnalyze, isLoading, loadingStep }: SmartIngestionModalProps) {
  const [tab, setTab] = useState<Tab>('url');
  const [rawInput, setRawInput] = useState('');
  const [queuedUrls, setQueuedUrls] = useState<QueuedUrl[]>([]);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [csvPreview, setCsvPreview] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-parse URLs from textarea
  const parseUrlsFromText = useCallback((text: string) => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && (l.startsWith('http://') || l.startsWith('https://')));
    const unique = Array.from(new Set(lines));
    setQueuedUrls(unique.map(url => ({ url, platform: detectPlatform(url), status: 'queued' as const })));
  }, []);

  useEffect(() => {
    parseUrlsFromText(rawInput);
  }, [rawInput, parseUrlsFromText]);

  // Sync status of queued URLs during loading
  useEffect(() => {
    if (isLoading && queuedUrls.length > 0) {
      setQueuedUrls(prev => prev.map((q, i) => ({
        ...q,
        status: i < loadingStep - 1 ? 'done' : i === loadingStep - 1 ? 'processing' : 'queued'
      })));
    } else if (!isLoading && queuedUrls.length > 0 && loadingStep === 0) {
      setQueuedUrls(prev => prev.map(q => ({ ...q, status: 'queued' })));
    }
  }, [isLoading, loadingStep]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const urls = queuedUrls.filter(q => q.platform !== 'unknown' || q.url.startsWith('http')).map(q => q.url);
    if (urls.length === 0) return;
    onAnalyze(urls);
  };

  const handleCSVFile = (file: File) => {
    setCsvError(null);
    if (!file.name.endsWith('.csv')) {
      setCsvError('Please upload a valid .csv file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      const urlColumn = lines.slice(1).map(line => {
        const cols = line.split(',');
        return cols.find(c => c.trim().startsWith('http')) || '';
      }).filter(Boolean);

      if (urlColumn.length === 0) {
        setCsvError('No valid URLs found. Ensure the CSV has a column with URLs starting with http/https.');
        return;
      }
      setCsvPreview(urlColumn.slice(0, 3));
      setRawInput(urlColumn.join('\n'));
      setTab('url');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCsvDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCSVFile(file);
  };

  const progressPct = isLoading ? Math.min(95, loadingStep * 33) : (loadingStep === 3 ? 100 : 0);

  if (!isOpen) return null;

  const flipkartCount = queuedUrls.filter(q => q.platform === 'flipkart').length;
  const meeshoCount = queuedUrls.filter(q => q.platform === 'meesho').length;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={(e) => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-neutral-950 border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(99,102,241,0.15)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Run AI Product Audit</h2>
              <p className="text-xs text-neutral-400 mt-0.5">Smart Ingestion Engine — Powered by Gemini AI &amp; Scrape.do</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-40"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-black/30 border-b border-white/10 px-6 pt-4 pb-0">
          {(['url', 'csv'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              disabled={isLoading}
              className={`px-5 py-2.5 text-sm font-semibold rounded-t-lg border-b-2 transition-all -mb-px disabled:opacity-50 ${tab === t
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-neutral-500 hover:text-neutral-200 hover:bg-white/5'
              }`}
            >
              {t === 'url' ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  Direct URL Queue
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Bulk CSV Upload
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
          {tab === 'url' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="text-sm font-medium text-neutral-300 mb-2 block">
                  Paste Flipkart or Meesho product URLs <span className="text-neutral-500">(one per line)</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  disabled={isLoading}
                  rows={5}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-4 text-sm text-neutral-200 placeholder:text-neutral-600 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/30 transition-all resize-none disabled:opacity-50 font-mono"
                  placeholder={"https://www.flipkart.com/product/p/itme...\nhttps://www.meesho.com/product/p/..."}
                />
              </div>

              {/* Platform detection pills */}
              {(flipkartCount > 0 || meeshoCount > 0) && (
                <div className="flex flex-wrap gap-2">
                  {flipkartCount > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      {flipkartCount} Flipkart URL{flipkartCount > 1 ? 's' : ''} detected
                    </span>
                  )}
                  {meeshoCount > 0 && (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                      {meeshoCount} Meesho URL{meeshoCount > 1 ? 's' : ''} detected
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
                    ✓ Ready to audit
                  </span>
                </div>
              )}

              {/* URL Queue Preview */}
              {queuedUrls.length > 0 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                    Audit Queue — {queuedUrls.length} URL{queuedUrls.length > 1 ? 's' : ''}
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {queuedUrls.map((q, i) => {
                      const colors = PLATFORM_COLORS[q.platform];
                      return (
                        <div key={i} className={`flex items-center gap-3 p-2.5 rounded-lg border ${colors.bg} ${colors.border} transition-all`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${colors.dot} ${q.status === 'processing' ? 'animate-ping' : ''}`} />
                          <span className={`text-[10px] font-bold uppercase shrink-0 ${colors.text}`}>{colors.label}</span>
                          <span className="text-xs text-neutral-300 font-mono truncate flex-1">{q.url}</span>
                          {q.status === 'done' && <span className="text-emerald-400 text-[10px] font-bold shrink-0">✓</span>}
                          {q.status === 'processing' && (
                            <svg className="animate-spin h-3 w-3 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          )}
                          {!isLoading && (
                            <button type="button" onClick={() => setQueuedUrls(prev => prev.filter((_, idx) => idx !== i))} className="text-neutral-500 hover:text-rose-400 transition-colors shrink-0">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Progress Bar */}
              {isLoading && (
                <div className="flex flex-col gap-2.5 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-300">{STEP_LABELS[Math.min(loadingStep, 3)]}</span>
                    <span className="text-xs font-bold text-indigo-400">{progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-700"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isLoading}
                  className="px-4 py-2.5 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading || queuedUrls.length === 0}
                  className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl font-semibold text-sm transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 disabled:shadow-none"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      ⚡ Launch Audit ({queuedUrls.length})
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* CSV Upload Tab */
            <div className="flex flex-col gap-4">
              <div
                onDragOver={(e) => { e.preventDefault(); setCsvDragOver(true); }}
                onDragLeave={() => setCsvDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`min-h-[220px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${csvDragOver ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/10 hover:border-indigo-500/50 bg-black/20 hover:bg-black/40'}`}
              >
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${csvDragOver ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                  <svg className={`w-7 h-7 transition-colors ${csvDragOver ? 'text-indigo-400' : 'text-neutral-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-white">Drag &amp; drop your catalog CSV</p>
                  <p className="text-xs text-neutral-400 mt-1">or click to browse — CSV with a URL column</p>
                </div>
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
                  .csv files only
                </span>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleCSVFile(f); }} />
              </div>

              {csvError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium">
                  {csvError}
                </div>
              )}

              {csvPreview.length > 0 && (
                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex flex-col gap-2">
                  <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">✓ URLs extracted — {csvPreview.length} preview</p>
                  {csvPreview.map((u, i) => (
                    <p key={i} className="text-xs font-mono text-neutral-300 truncate">{u}</p>
                  ))}
                  <p className="text-xs text-neutral-400 mt-1">Switched to Direct URL Queue tab with all URLs loaded.</p>
                </div>
              )}

              <div className="bg-white/5 border border-white/10 rounded-xl p-4">
                <p className="text-xs font-semibold text-neutral-300 mb-2">CSV Column Auto-Mapping:</p>
                <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-400">
                  <span>• Column with <code className="text-indigo-300">http</code> → Product URL</span>
                  <span>• Any URL column → Auto-detected</span>
                  <span>• Flipkart &amp; Meesho supported</span>
                  <span>• Max 10 URLs per batch</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
