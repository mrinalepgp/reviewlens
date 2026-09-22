import { NextResponse } from 'next/server';
import { estimateAuditPreFlight } from '@/lib/scraper';
import { getAuthenticatedUser } from '@/utils/supabase/server';
import { errorMessage } from '@/lib/errors';

export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    // Pre-flight estimation performs a live fetch, so it is gated like any
    // other billable operation.
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized.' }, { status: 401 });
    }

    const body = await req.json();
    const { url, startDate, endDate, isComparison } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    const estimation = await estimateAuditPreFlight(url, startDate, endDate, isComparison);
    return NextResponse.json({ success: true, estimation });
  } catch (err) {
    console.error('[API /api/preflight] Error:', err);
    return NextResponse.json({ success: false, error: errorMessage(err) || 'Pre-flight estimation failed' }, { status: 500 });
  }
}
