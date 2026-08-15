import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const next = requestUrl.searchParams.get('next') || '/reset-password';

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
    return NextResponse.redirect(new URL(next, request.url));
  }

  return NextResponse.redirect(new URL('/login', request.url));
}
