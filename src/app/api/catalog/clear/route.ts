import { NextResponse } from 'next/server';
import { createClient, getAuthenticatedUser } from '@/utils/supabase/server';
import { errorMessage } from '@/lib/errors';

/**
 * DELETE /api/catalog/clear
 *
 * Authenticated endpoint: hard-deletes all analyses records for the
 * currently logged-in user from both the primary `analyses` table and the
 * legacy `tracked_products` table.
 *
 * Returns { success: true, deleted: number } on success.
 * Returns 401 if the caller is not authenticated.
 * Returns 500 with a structured error body on database failure.
 */
export async function DELETE() {
  try {
    const supabase = await createClient();
    const user = await getAuthenticatedUser();

    if (!user) {
      console.warn('[API /api/catalog/clear] Unauthenticated clear attempt rejected.');
      return NextResponse.json(
        { success: false, error: 'Unauthorized. Please log in.' },
        { status: 401 }
      );
    }

    console.log(`[API /api/catalog/clear] Clearing all catalog entries for user: ${user.id}`);

    // Primary: wipe analyses table
    const { error: analysesError, count: analysesCount } = await supabase
      .from('analyses')
      .delete({ count: 'exact' })
      .eq('user_id', user.id);

    if (analysesError) {
      console.error(
        '[API /api/catalog/clear] Failed to delete from analyses:',
        JSON.stringify({
          code: analysesError.code,
          message: analysesError.message,
          details: analysesError.details,
          hint: analysesError.hint,
        })
      );
      return NextResponse.json(
        { success: false, error: analysesError.message },
        { status: 500 }
      );
    }

    // Secondary: wipe legacy tracked_products table (best-effort, non-fatal)
    const { error: trackedError } = await supabase
      .from('tracked_products')
      .delete()
      .eq('user_id', user.id);

    if (trackedError) {
      console.warn(
        '[API /api/catalog/clear] Non-fatal: failed to delete from tracked_products:',
        trackedError.message
      );
    }

    const deleted = analysesCount ?? 0;
    console.log(`[API /api/catalog/clear] Successfully deleted ${deleted} analyses record(s) for user ${user.id}.`);

    return NextResponse.json({ success: true, deleted });
  } catch (err) {
    console.error('[API /api/catalog/clear] Unhandled exception:', err);
    return NextResponse.json(
      { success: false, error: errorMessage(err) || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
