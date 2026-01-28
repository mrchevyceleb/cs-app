import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRLS() {
  console.log('Checking RLS status...\n')

  // Check if RLS is enabled
  const { data: tables, error } = await supabase.rpc('exec_sql', {
    sql: `
      SELECT tablename, rowsecurity
      FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('tickets', 'customers', 'messages');
    `
  })

  if (error) {
    console.log('Could not check RLS status via RPC, checking policies instead...\n')
  }

  // Check policies on tickets table
  const { data: policies } = await supabase
    .from('pg_policies')
    .select('*')
    .eq('tablename', 'tickets')

  if (policies) {
    console.log(`Found ${policies.length} policies on tickets table:`)
    policies.forEach(p => {
      console.log(`  - ${p.policyname} (${p.cmd})`)
    })
  } else {
    console.log('Using service role - checking tickets directly...')

    const { data: tickets, error: ticketsError } = await supabase
      .from('tickets')
      .select('*')
      .limit(5)

    if (ticketsError) {
      console.error('Error querying tickets:', ticketsError)
    } else {
      console.log(`\n✅ Can query ${tickets?.length || 0} tickets with service role`)
    }

    // Check if agents table exists and has data
    const { data: agents, error: agentsError } = await supabase
      .from('agents')
      .select('id, email, name')
      .limit(5)

    if (agentsError) {
      console.error('\n⚠️  Error querying agents:', agentsError.message)
      console.log('   This might explain why authentication is failing!')
    } else {
      console.log(`\n✅ Found ${agents?.length || 0} agents:`)
      agents?.forEach(agent => {
        console.log(`   - ${agent.email} (${agent.name})`)
      })
    }
  }
}

checkRLS().catch(console.error)
