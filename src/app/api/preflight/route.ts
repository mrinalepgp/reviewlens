import { NextResponse } from 'next/server';
import { estimateAuditPreFlight } from '@/lib/scraper';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { url, startDate, endDate, isComparison } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    const estimation = await estimateAuditPreFlight(url, startDate, endDate, isComparison);
    return NextResponse.json({ success: true, estimation });
  } catch (err: any) {
    console.error('[API /api/preflight] Error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Pre-flight estimation failed' }, { status: 500 });
  }
}
