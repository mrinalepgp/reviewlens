'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}

export async function signup(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('fullName') as string
  const whatsapp = formData.get('whatsapp') as string

  if (!email || !password || !fullName || !whatsapp) {
    return { error: 'All fields are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }
  
  if (data.user) {
    // Insert into sellers table (using our DDL)
    const { error: sellerError } = await supabase.from('sellers').insert({
        id: data.user.id,
        full_name: fullName,
        whatsapp_number: whatsapp,
        subscription_status: 'free'
    })
    
    if (sellerError) {
        console.error("Failed to insert seller record:", sellerError)
        // If it fails, they are still signed up, but we could handle it better
    }
  }

  revalidatePath('/dashboard')
  redirect('/dashboard')
}
