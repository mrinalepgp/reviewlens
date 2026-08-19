import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { analyzeUrlsAction } from '@/app/actions';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in to run analyses.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { urls } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid payload: urls array is required.' },
        { status: 400 }
      );
    }

    const result = await analyzeUrlsAction(urls);
    if (!result.success) {
      return NextResponse.json(result, { status: 500 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[API /api/analyze] Exception:', err);
    return NextResponse.json(
      { success: false, error: err.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
