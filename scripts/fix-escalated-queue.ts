/**
 * One-time script to fix escalated tickets that are still in the AI queue
 * Run with: npx tsx scripts/fix-escalated-queue.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
const supabaseKey = process.env.SB_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SB_URL or SB_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Checking for escalated tickets in AI queue...')

  // First, check how many need fixing
  const { data: brokenTickets, error: checkError } = await supabase
    .from('tickets')
    .select('id, subject, status, queue_type, created_at')
    .eq('status', 'escalated')
    .eq('queue_type', 'ai')

  if (checkError) {
    console.error('Error checking tickets:', checkError)
    process.exit(1)
  }

  if (!brokenTickets || brokenTickets.length === 0) {
    console.log('No escalated tickets found in AI queue. All good!')
    return
  }

  console.log(`Found ${brokenTickets.length} escalated ticket(s) in AI queue:`)
  brokenTickets.forEach(t => {
    console.log(`  - ${t.id}: ${t.subject} (${t.created_at})`)
  })

  // Fix them
  const { error: updateError, count } = await supabase
    .from('tickets')
    .update({ queue_type: 'human' })
    .eq('status', 'escalated')
    .eq('queue_type', 'ai')

  if (updateError) {
    console.error('Error updating tickets:', updateError)
    process.exit(1)
  }

  console.log(`\nFixed ${count || brokenTickets.length} ticket(s) moved to human queue.`)
}

main()
 * One-time script to fix escalated tickets that are still in the AI queue
 * Run with: npx tsx scripts/fix-escalated-queue.ts
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
const supabaseKey = process.env.SB_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SB_URL or SB_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('Checking for escalated tickets in AI queue...')

  // First, check how many need fixing
  const { data: brokenTickets, error: checkError } = await supabase
    .from('tickets')
    .select('id, subject, status, queue_type, created_at')
    .eq('status', 'escalated')
    .eq('queue_type', 'ai')

  if (checkError) {
    console.error('Error checking tickets:', checkError)
    process.exit(1)
  }

  if (!brokenTickets || brokenTickets.length === 0) {
    console.log('No escalated tickets found in AI queue. All good!')
    return
  }

  console.log(`Found ${brokenTickets.length} escalated ticket(s) in AI queue:`)
  brokenTickets.forEach(t => {
    console.log(`  - ${t.id}: ${t.subject} (${t.created_at})`)
  })

  // Fix them
  const { error: updateError, count } = await supabase
    .from('tickets')
    .update({ queue_type: 'human' })
    .eq('status', 'escalated')
    .eq('queue_type', 'ai')

  if (updateError) {
    console.error('Error updating tickets:', updateError)
    process.exit(1)
  }

  console.log(`\nFixed ${count || brokenTickets.length} ticket(s) moved to human queue.`)
}

main()

