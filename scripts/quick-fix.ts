/**
 * Quick fix script for escalated tickets
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ovvovxkfuydwdxepqvhq.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im92dm92eGtmdXlkd2R4ZXBxdmhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzkwMTQzMiwiZXhwIjoyMDgzNDc3NDMyfQ.tKLIdrqqEHXqjG_Q7fd62_-c5n2kJQgf7DvWy31YYSw'

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

  // Verify
  const { data: verifyTickets, error: verifyError } = await supabase
    .from('tickets')
    .select('id')
    .eq('status', 'escalated')
    .eq('queue_type', 'ai')

  if (verifyError) {
    console.error('Error verifying tickets:', verifyError)
    process.exit(1)
  }

  console.log(`\nVerification: ${verifyTickets?.length || 0} escalated tickets still in AI queue.`)
}

main()
