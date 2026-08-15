'use server';

import { createClient } from '@/utils/supabase/server';

export async function sendResetLink(formData: FormData) {
  const email = formData.get('email') as string;

  if (!email) {
    return { error: 'Email is required', success: false };
  }

  const supabase = await createClient();

  // Redirect to /reset-password after clicking the link in the email
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback?next=/reset-password`,
  });

  if (error) {
    return { error: error.message, success: false };
  }

  return { error: '', success: true };
}
