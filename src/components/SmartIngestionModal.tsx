"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { parseUrlsFromText, parseUrlsFromCsv, ParsedUrl } from '@/lib/urlParser';

interface SmartIngestionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAnalyze: (urls: string[]) => void;
  isLoading: boolean;
  loadingStep: number;       // 0=idle, 1=scraping, 2=analyzing, 3=finalizing
  currentSkuIndex?: number;  // which SKU is being processed (1-based)
  totalSkus?: number;
  availableCredits?: number;
}

type Tab = 'url' | 'csv';

interface QueueItem extends ParsedUrl {
  status: 'queued' | 'processing' | 'done' | 'error';
}

const PLATFORM_STYLE = {
  flipkart: {
    bg: 'bg-blue-500/10', border: 'border-blue-500/25', text: 'text-blue-300',
    dot: 'bg-blue-400', badge: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    label: 'Flipkart',
  },
  meesho: {
    bg: 'bg-pink-500/10', border: 'border-pink-500/25', text: 'text-pink-300',
    dot: 'bg-pink-400', badge: 'bg-pink-500/20 text-pink-300 border-pink-500/30',
    label: 'Meesho',
  },
  unsupported: {
    bg: 'bg-neutral-800/60', border: 'border-neutral-700/50', text: 'text-neutral-500',
    dot: 'bg-neutral-600', badge: 'bg-neutral-700 text-neutral-400 border-neutral-600',
    label: 'Unsupported',
  },
};

const PHASE_LABELS = [
  '',
  'Spawning Scrape.do parallel workers…',
  'Executing Map-Reduce Gemini AI analysis…',
  'Finalizing executive return risk matrix…',
];

export default function SmartIngestionModal({
  isOpen, onClose, onAnalyze, isLoading, loadingStep,
  currentSkuIndex = 0, totalSkus = 0, availableCredits = 50,
}: SmartIngestionModalProps) {
  const [tab, setTab] = useState<Tab>('url');
  const [rawInput, setRawInput] = useState('');
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [csvDragOver, setCsvDragOver] = useState(false);
  const [csvError, setCsvError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ─── Parse input on every keystroke ───────────────────────────────────────
  const rebuildQueue = useCallback((text: string) => {
    const parsed = parseUrlsFromText(text);
    setQueue(prev => {
      // Preserve status of URLs already in queue
      return parsed.map(p => {
        const existing = prev.find(q => q.clean === p.clean);
        return { ...p, status: existing?.status ?? 'queued' } as QueueItem;
      });
    });
  }, []);

  useEffect(() => { rebuildQueue(rawInput); }, [rawInput, rebuildQueue]);

  // ─── Sync per-SKU status during loading ───────────────────────────────────
  useEffect(() => {
    if (!isLoading) {
      setQueue(prev => prev.map(q => ({ ...q, status: 'queued' as const })));
      return;
    }
    if (totalSkus > 0 && currentSkuIndex > 0) {
      setQueue(prev => prev.filter(q => q.valid).map((q, i) => ({
        ...q,
        status: i < currentSkuIndex - 1 ? 'done'
          : i === currentSkuIndex - 1 ? 'processing'
          : 'queued',
      } as QueueItem)));
    }
  }, [isLoading, currentSkuIndex, totalSkus]);

  // ─── Derived counts ────────────────────────────────────────────────────────
  const validItems = queue.filter(q => q.valid);
  const flipkartCount = queue.filter(q => q.platform === 'flipkart').length;
  const meeshoCount  = queue.filter(q => q.platform === 'meesho').length;
  const unsupCount   = queue.filter(q => q.platform === 'unsupported').length;
  const validCount   = validItems.length;
  const overCredit   = validCount > availableCredits;
  const canLaunch    = !isLoading && validCount > 0 && !overCredit;

  // Progress
  const progressPct = isLoading
    ? totalSkus > 0
      ? Math.min(97, Math.round(((currentSkuIndex - 1 + (loadingStep / 3)) / totalSkus) * 100))
      : Math.min(90, loadingStep * 30)
    : 0;

  // ─── Handlers ─────────────────────────────────────────────────────────────
  const handleRemove = (cleanUrl: string) => {
    setQueue(prev => prev.filter(q => q.clean !== cleanUrl));
    // Also remove from raw textarea
    setRawInput(prev => {
      const lines = prev.split('\n').filter(l => !l.includes(cleanUrl));
      return lines.join('\n');
    });
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!canLaunch) return;
    onAnalyze(validItems.map(q => q.clean));
  };

  const handleCsvFile = (file: File) => {
    setCsvError(null);
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setCsvError('Please upload a valid .csv or .txt file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = e => {
      const text = (e.target?.result as string) || '';
      const parsed = parseUrlsFromCsv(text);
      if (parsed.length === 0) {
        setCsvError('No Flipkart or Meesho URLs found. Ensure the CSV has a column with product URLs.');
        return;
      }
      const newLines = parsed.map(p => p.raw).join('\n');
      setRawInput(prev => prev ? `${prev}\n${newLines}` : newLines);
      setTab('url');
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setCsvDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleCsvFile(file);
  };

  if (!isOpen) return null;

  const phaseLabel = isLoading
    ? totalSkus > 0
      ? `Processing SKU ${currentSkuIndex} of ${totalSkus} — ${PHASE_LABELS[Math.min(loadingStep, 3)]}`
      : PHASE_LABELS[Math.min(loadingStep, 3)]
    : '';

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200"
      onClick={e => { if (e.target === e.currentTarget && !isLoading) onClose(); }}
    >
      <div className="w-full max-w-2xl bg-neutral-950 border border-white/10 rounded-2xl shadow-[0_0_80px_rgba(99,102,241,0.18)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 duration-300 max-h-[92vh]">

        {/* ── Header ────────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-black text-white leading-tight">Run AI Product Audit</h2>
              <p className="text-[11px] text-neutral-400">Gemini AI + Scrape.do — {availableCredits} credits remaining</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isLoading}
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white transition-colors flex items-center justify-center disabled:opacity-30">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Tabs ──────────────────────────────────────────────────────── */}
        <div className="flex gap-0.5 bg-black/30 border-b border-white/10 px-6 pt-3 pb-0 shrink-0">
          {(['url', 'csv'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} disabled={isLoading}
              className={`px-5 py-2 text-sm font-semibold rounded-t-lg border-b-2 transition-all -mb-px disabled:opacity-40 ${tab === t
                ? 'border-indigo-500 text-indigo-300 bg-indigo-500/10'
                : 'border-transparent text-neutral-500 hover:text-neutral-200 hover:bg-white/5'
              }`}>
              {t === 'url' ? (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                  Direct URL Queue
                  {validCount > 0 && <span className="ml-1 px-1.5 py-0.5 bg-indigo-500/30 text-indigo-300 rounded text-[10px] font-bold">{validCount}</span>}
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  Bulk CSV Upload
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ── Body ──────────────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">

          {tab === 'url' ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">

              {/* Textarea */}
              <div>
                <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2 block">
                  Paste URLs &nbsp;<span className="normal-case font-normal text-neutral-600">— one per line, share strings, or concatenated</span>
                </label>
                <textarea
                  ref={textareaRef}
                  value={rawInput}
                  onChange={e => setRawInput(e.target.value)}
                  disabled={isLoading}
                  rows={4}
                  className="w-full bg-black/50 border border-white/10 rounded-xl p-3.5 text-sm text-neutral-200 placeholder:text-neutral-700 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/20 transition-all resize-none disabled:opacity-40 font-mono leading-relaxed"
                  placeholder={"https://www.flipkart.com/product/p/itme...\nhttps://www.meesho.com/product-slug/p/123456\nCheck this out: https://dl.flipkart.com/s/abc?pid=XYZ"}
                />
              </div>

              {/* Platform Summary Pills */}
              {queue.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {flipkartCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                      {flipkartCount} Flipkart
                    </span>
                  )}
                  {meeshoCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-pink-500/10 text-pink-400 border border-pink-500/20 rounded-full text-[11px] font-bold">
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400 animate-pulse" />
                      {meeshoCount} Meesho
                    </span>
                  )}
                  {unsupCount > 0 && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-[11px] font-bold">
                      ⚠ {unsupCount} Unsupported
                    </span>
                  )}
                  {overCredit && (
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full text-[11px] font-bold">
                      ✕ Exceeds {availableCredits} credit limit
                    </span>
                  )}
                </div>
              )}

              {/* Visual Queue Badges */}
              {queue.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-widest">
                    Audit Queue — {validCount} valid · {unsupCount > 0 ? `${unsupCount} skipped` : 'all supported'}
                  </p>
                  <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin">
                    {queue.map((item, i) => {
                      const s = PLATFORM_STYLE[item.platform];
                      return (
                        <div key={item.clean + i}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-all ${s.bg} ${s.border} ${!item.valid ? 'opacity-50' : ''}`}>

                          {/* Status indicator */}
                          {item.status === 'processing' ? (
                            <svg className="animate-spin h-3 w-3 text-indigo-400 shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : item.status === 'done' ? (
                            <span className="text-emerald-400 text-[11px] font-black shrink-0">✓</span>
                          ) : (
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />
                          )}

                          {/* Platform badge */}
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase border shrink-0 ${s.badge}`}>
                            {item.platform === 'unsupported' ? '⚠ Unsupported' : s.label}
                          </span>

                          {/* Identifier / display label */}
                          <span className="text-[11px] text-neutral-300 font-mono truncate flex-1 min-w-0" title={item.clean}>
                            {item.valid ? item.displayLabel : item.displayLabel}
                          </span>

                          {/* Status text */}
                          {item.status === 'processing' && (
                            <span className="text-[9px] font-black text-indigo-400 uppercase animate-pulse shrink-0">Analyzing…</span>
                          )}
                          {item.status === 'done' && (
                            <span className="text-[9px] font-black text-emerald-400 uppercase shrink-0">Done</span>
                          )}
                          {!item.valid && (
                            <span className="text-[9px] font-black text-neutral-500 uppercase shrink-0">Disabled</span>
                          )}

                          {/* Remove button */}
                          {!isLoading && (
                            <button type="button" onClick={() => handleRemove(item.clean)}
                              className="text-neutral-600 hover:text-rose-400 transition-colors shrink-0 ml-1"
                              title="Remove">
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Per-SKU Progress Bar */}
              {isLoading && (
                <div className="flex flex-col gap-2 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-indigo-300 leading-snug max-w-[85%]">{phaseLabel}</span>
                    <span className="text-[11px] font-black text-indigo-400">{progressPct}%</span>
                  </div>
                  <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-400 rounded-full transition-all duration-700 ease-out"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                  {totalSkus > 0 && (
                    <div className="flex gap-1.5 mt-0.5">
                      {Array.from({ length: totalSkus }).map((_, i) => (
                        <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                          i < currentSkuIndex - 1 ? 'bg-emerald-500'
                          : i === currentSkuIndex - 1 ? 'bg-indigo-400 animate-pulse'
                          : 'bg-white/10'
                        }`} />
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
                <button type="button" onClick={onClose} disabled={isLoading}
                  className="px-4 py-2 text-sm text-neutral-400 hover:text-white hover:bg-white/5 rounded-xl transition-colors disabled:opacity-30">
                  Cancel
                </button>
                <button type="submit" disabled={!canLaunch}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${
                    canLaunch
                      ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_28px_rgba(79,70,229,0.6)]'
                      : 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                  }`}>
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Analyzing…
                    </>
                  ) : overCredit ? (
                    `⚠ Exceeds ${availableCredits} Credits`
                  ) : validCount === 0 ? (
                    'Add Valid URLs to Launch'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                      </svg>
                      ⚡ Launch Audit ({validCount})
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* ── CSV Tab ──────────────────────────────────────────────── */
            <div className="flex flex-col gap-4">
              <div
                onDragOver={e => { e.preventDefault(); setCsvDragOver(true); }}
                onDragLeave={() => setCsvDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`min-h-[200px] border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-3 cursor-pointer transition-all ${
                  csvDragOver
                    ? 'border-indigo-500 bg-indigo-500/10'
                    : 'border-white/10 hover:border-indigo-500/40 bg-black/20 hover:bg-black/40'
                }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${csvDragOver ? 'bg-indigo-500/20' : 'bg-white/5'}`}>
                  <svg className={`w-6 h-6 transition-colors ${csvDragOver ? 'text-indigo-400' : 'text-neutral-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">Drag &amp; drop your catalog CSV</p>
                  <p className="text-xs text-neutral-500 mt-0.5">or click to browse — auto-maps URL columns</p>
                </div>
                <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold text-neutral-500 uppercase tracking-wider">.csv / .txt</span>
                <input ref={fileInputRef} type="file" accept=".csv,.txt" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleCsvFile(f); }} />
              </div>

              {csvError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-sm font-medium">{csvError}</div>
              )}

              <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 flex flex-col gap-2">
                <p className="text-xs font-bold text-neutral-300">Auto-Mapping Rules:</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-neutral-500">
                  <span>• Detects any column starting with <code className="text-indigo-400">http</code></span>
                  <span>• Strips UTM &amp; affiliate params</span>
                  <span>• Flipkart PID extracted automatically</span>
                  <span>• Meesho product slug preserved</span>
                  <span>• Duplicate URLs auto-removed</span>
                  <span>• Max {availableCredits} URLs per batch</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
