/**
 * ReviewLens — Bulletproof Multi-Marketplace URL Ingestion Engine
 * Handles messy text, app share strings, concatenated URLs, UTM noise, and deduplication.
 */

export type ParsedUrlPlatform = 'flipkart' | 'meesho' | 'unsupported';

export interface ParsedUrl {
  raw: string;         // Original extracted URL
  clean: string;       // Sanitized canonical URL
  platform: ParsedUrlPlatform;
  identifier: string;  // PID for Flipkart, slug for Meesho
  displayLabel: string;
  valid: boolean;
}

// ─── Regex patterns ────────────────────────────────────────────────────────────

// Extract all URLs from arbitrary text (including mobile share strings)
const URL_EXTRACT_REGEX = /https?:\/\/[^\s"'<>)\]]+/gi;

// Split concatenated URLs without spaces — e.g. "FLIPKARThttps://meesho.com"
// by finding https:// that is not at string start
const CONCATENATED_URL_SPLIT_REGEX = /(?=https?:\/\/)/gi;

// Flipkart canonical product URL patterns:
// - flipkart.com/*/p/itm*
// - flipkart.com/product/p/itme*
// - dl.flipkart.com deep links → extract pid
const FLIPKART_DOMAIN = /(?:www\.|dl\.)?flipkart\.com/i;

// Meesho product URL patterns:
// - meesho.com/product-name/p/123456
// - meesho.com/*/p/*
const MEESHO_DOMAIN = /(?:www\.)?meesho\.com/i;

// UTM and tracking params to strip
const UTM_PARAMS = [
  'utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content',
  'utm_id', 'affid', 'affExtParam1', 'affExtParam2', 'ref', 'otracker',
  'otracker1', 'fm', 'sh', 'sn', 'ss', 'ppid', 'pageUID',
  'olink', 'bsh', 'afftrack', 'clickid', 'gclid', 'fbclid',
  'wc_ref', 'storeId', 'store_id', 'pincode', 'poc'
];

// ─── Core Helpers ─────────────────────────────────────────────────────────────

function stripUtmParams(url: string): string {
  try {
    const u = new URL(url);
    UTM_PARAMS.forEach(p => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
}

function extractFlipkartPid(url: string): string {
  try {
    const u = new URL(url);
    // pid query param (deep links)
    const pid = u.searchParams.get('pid');
    if (pid) return pid;
    // Path-based: /p/ITME... or /p/itm...
    const pathMatch = u.pathname.match(/\/p\/(IT[A-Z0-9]+|itm[a-z0-9]+)/i);
    if (pathMatch) return pathMatch[1].toUpperCase();
    // product-name portion (last meaningful segment before /p/)
    const segments = u.pathname.split('/').filter(Boolean);
    const pIdx = segments.findIndex(s => s === 'p');
    if (pIdx > 0) return segments[pIdx - 1].slice(0, 30);
    return segments[segments.length - 1]?.slice(0, 30) || 'FK-Product';
  } catch {
    return 'FK-Product';
  }
}

function buildCleanFlipkartUrl(raw: string): string {
  try {
    const u = new URL(raw);
    // Normalise dl.flipkart.com → www.flipkart.com
    u.hostname = 'www.flipkart.com';
    // Keep only path + essential params (pid, lid, marketplace)
    const pid = u.searchParams.get('pid');
    const lid = u.searchParams.get('lid');
    const marketplace = u.searchParams.get('marketplace');
    const cleanParams = new URLSearchParams();
    if (pid) cleanParams.set('pid', pid);
    if (lid) cleanParams.set('lid', lid);
    if (marketplace) cleanParams.set('marketplace', marketplace);
    u.search = cleanParams.toString();
    return u.toString();
  } catch {
    return raw;
  }
}

function extractMeeshoSlug(url: string): string {
  try {
    const u = new URL(url);
    // /product-slug/p/123456
    const segments = u.pathname.split('/').filter(Boolean);
    const pIdx = segments.findIndex(s => s === 'p');
    if (pIdx > 0) return segments[pIdx - 1].slice(0, 40);
    // fallback to last segment
    return segments[segments.length - 1]?.slice(0, 40) || 'Meesho-Product';
  } catch {
    return 'Meesho-Product';
  }
}

function buildCleanMeeshoUrl(raw: string): string {
  try {
    const u = new URL(raw);
    u.hostname = 'www.meesho.com';
    u.search = '';
    u.hash = '';
    return u.toString();
  } catch {
    return raw;
  }
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

function parseOneUrl(raw: string): ParsedUrl {
  const trimmed = raw.trim();

  if (FLIPKART_DOMAIN.test(trimmed)) {
    const clean = buildCleanFlipkartUrl(stripUtmParams(trimmed));
    const pid = extractFlipkartPid(trimmed);
    return {
      raw: trimmed,
      clean,
      platform: 'flipkart',
      identifier: pid,
      displayLabel: pid,
      valid: true,
    };
  }

  if (MEESHO_DOMAIN.test(trimmed)) {
    const clean = buildCleanMeeshoUrl(stripUtmParams(trimmed));
    const slug = extractMeeshoSlug(trimmed);
    return {
      raw: trimmed,
      clean,
      platform: 'meesho',
      identifier: slug,
      displayLabel: slug.replace(/-/g, ' '),
      valid: true,
    };
  }

  return {
    raw: trimmed,
    clean: trimmed,
    platform: 'unsupported',
    identifier: '',
    displayLabel: trimmed.length > 50 ? trimmed.slice(0, 47) + '…' : trimmed,
    valid: false,
  };
}

/**
 * Main entry point — parse arbitrary text input into structured URL queue items.
 * Handles:
 *  - Mobile app share strings ("Check this on Flipkart: https://...")
 *  - Concatenated URLs without spaces
 *  - Whitespace / newline separated lists
 *  - Deduplication by canonical clean URL
 */
export function parseUrlsFromText(text: string): ParsedUrl[] {
  if (!text || !text.trim()) return [];

  // Step 1: Split by newlines to handle each line independently
  const lines = text.split('\n');

  // Step 2: From each line, extract all embedded http URLs
  const rawUrls: string[] = [];
  for (const line of lines) {
    // Handle concatenated URLs (e.g. "...FLIPKARThttps://meesho.com")
    const parts = line.split(CONCATENATED_URL_SPLIT_REGEX).filter(Boolean);
    for (const part of parts) {
      const matches = part.match(URL_EXTRACT_REGEX);
      if (matches) {
        rawUrls.push(...matches);
      }
    }
  }

  // Step 3: Parse + clean each URL
  const parsed = rawUrls.map(parseOneUrl);

  // Step 4: Deduplicate by canonical clean URL
  const seen = new Set<string>();
  const deduped: ParsedUrl[] = [];
  for (const p of parsed) {
    const key = p.clean.toLowerCase().replace(/\/$/, '');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }

  return deduped;
}

/**
 * Parse URLs from a CSV file text.
 * Finds any column that contains http URLs.
 */
export function parseUrlsFromCsv(csvText: string): ParsedUrl[] {
  const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
  const urlStrings: string[] = [];

  for (const line of lines) {
    // Split by comma but handle quoted fields
    const cols = line.split(',').map(c => c.replace(/^["']|["']$/g, '').trim());
    const urlCol = cols.find(c => /^https?:\/\//i.test(c));
    if (urlCol) urlStrings.push(urlCol);
  }

  const parsed = urlStrings.map(parseOneUrl);
  const seen = new Set<string>();
  const deduped: ParsedUrl[] = [];
  for (const p of parsed) {
    const key = p.clean.toLowerCase().replace(/\/$/, '');
    if (!seen.has(key)) {
      seen.add(key);
      deduped.push(p);
    }
  }
  return deduped;
}
