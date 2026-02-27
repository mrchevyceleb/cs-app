import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
const supabaseServiceKey = process.env.SB_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SB_URL or SB_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTickets() {
  console.log('Checking tickets in database...\n')

  const { data: tickets, error } = await supabase
    .from('tickets')
    .select('id, subject, customer_id, created_at')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error fetching tickets:', error.message)
    return
  }

  console.log(`Found ${tickets?.length || 0} tickets:\n`)

  tickets?.forEach((ticket, index) => {
    console.log(`${index + 1}. ID: ${ticket.id}`)
    console.log(`   Subject: ${ticket.subject}`)
    console.log(`   Customer ID: ${ticket.customer_id}`)
    console.log(`   Created: ${ticket.created_at}`)
    console.log()
  })

  // Check for orphaned tickets (tickets without customers)
  const { data: orphaned } = await supabase
    .from('tickets')
    .select('id, customer_id')
    .is('customer_id', null)

  if (orphaned && orphaned.length > 0) {
    console.log(`\n⚠️  Found ${orphaned.length} tickets without customers (orphaned)`)
  }
}

checkTickets().catch(console.error)
