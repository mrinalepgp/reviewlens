'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const whatsapp = formData.get('whatsapp') as string

  if (!email || !password || !fullName || !whatsapp) {
    return { error: 'All fields are required' }
  }

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    console.error("Missing Supabase environment variables: NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
    return { error: 'Server configuration error' };
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      console.error("Supabase connection error during signup:", error);
      return { error: error.message }
    }
    
    if (data.user) {
      const { error: sellerError } = await supabase.from('sellers').insert({
          id: data.user.id,
          full_name: fullName,
          whatsapp_number: whatsapp,
          subscription_status: 'free'
      })
      
      if (sellerError) {
          console.error("Failed to insert seller record:", sellerError)
      }

      const { error: profileError } = await supabase.from('user_profiles').insert({
          id: data.user.id,
          credits: 50,
          full_name: fullName
      })

      if (profileError) {
          console.error("Failed to insert user profile record:", profileError)
      }
    }
  } catch (error) {
    console.error("Exact connection error to server console during signup:", error);
    return { error: 'An unexpected connection error occurred' }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
