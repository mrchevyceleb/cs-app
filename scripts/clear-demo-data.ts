import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  console.log('Add SUPABASE_SERVICE_ROLE_KEY to your .env.local file')
  console.log('You can find it in Supabase Dashboard > Settings > API > service_role key')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function clearDemoData() {
  console.log('Clearing demo data...\n')

  // Delete in order due to foreign key constraints
  const { error: messagesError } = await supabase
    .from('messages')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all

  if (messagesError) {
    console.error('Error deleting messages:', messagesError.message)
  } else {
    console.log('Deleted messages')
  }

  const { error: ticketsError } = await supabase
    .from('tickets')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (ticketsError) {
    console.error('Error deleting tickets:', ticketsError.message)
  } else {
    console.log('Deleted tickets')
  }

  const { error: customersError } = await supabase
    .from('customers')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')

  if (customersError) {
    console.error('Error deleting customers:', customersError.message)
  } else {
    console.log('Deleted customers')
  }

  console.log('\nDemo data cleared!')
}

clearDemoData().catch(console.error)
