import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { AgentInsert } from '@/types/database'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // Check if user exists in agents table, if not create them
      const { data: { user } } = await supabase.auth.getUser()

      if (user) {
        const { data: agent } = await supabase
          .from('agents')
          .select('id')
          .eq('id', user.id)
          .single()

        // Create agent record if it doesn't exist
        if (!agent) {
          const newAgent: AgentInsert = {
            id: user.id,
            email: user.email!,
            name: user.email?.split('@')[0] || 'Agent',
            status: 'online' as const,
          }
          await supabase.from('agents').insert(newAgent)
        } else {
          // Update status to online
          await supabase
            .from('agents')
            .update({ status: 'online' as const })
            .eq('id', user.id)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could not authenticate user`)
}
