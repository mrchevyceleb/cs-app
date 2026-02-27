import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SB_URL!
const supabaseServiceKey = process.env.SB_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createAgent() {
  console.log('Creating agent record...\n')

  // Get all auth users
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers()

  if (usersError) {
    console.error('Error fetching users:', usersError.message)
    return
  }

  if (!users || users.length === 0) {
    console.log('No users found. Please sign up first.')
    return
  }

  console.log(`Found ${users.length} user(s):\n`)

  for (const user of users) {
    console.log(`User: ${user.email}`)
    console.log(`  ID: ${user.id}`)

    // Check if agent already exists
    const { data: existingAgent } = await supabase
      .from('agents')
      .select('*')
      .eq('id', user.id)
      .single()

    if (existingAgent) {
      console.log(`  ✅ Agent record already exists`)
      continue
    }

    // Create agent
    const { data: agent, error: agentError } = await supabase
      .from('agents')
      .insert({
        id: user.id,
        email: user.email!,
        name: user.email!.split('@')[0],
        status: 'online',
      })
      .select()
      .single()

    if (agentError) {
      console.error(`  ❌ Error creating agent:`, agentError.message)
    } else {
      console.log(`  ✅ Agent created successfully!`)
    }
    console.log()
  }
}

createAgent().catch(console.error)
