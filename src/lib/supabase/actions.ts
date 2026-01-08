'use server'

import { createClient } from './server'
import { redirect } from 'next/navigation'

export async function signInWithMagicLink(formData: FormData) {
  const email = formData.get('email') as string
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/callback`,
    },
  })

  if (error) {
    return { error: error.message }
  }

  return { success: true }
}

export async function signOut() {
  const supabase = await createClient()

  // Update agent status to offline before signing out
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    await supabase
      .from('agents')
      .update({ status: 'offline' })
      .eq('id', user.id)
  }

  await supabase.auth.signOut()
  redirect('/login')
}

export async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function getAgent() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: agent } = await supabase
    .from('agents')
    .select('*')
    .eq('id', user.id)
    .single()

  return agent
}
