import { config } from 'dotenv'
import { createClient } from '@supabase/supabase-js'

// Load .env.local
config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  console.log('Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Demo Customers
const customers = [
  {
    email: 'maria.garcia@example.com',
    name: 'Maria Garcia',
    preferred_language: 'es',
    metadata: { plan: 'pro', signup_date: '2024-01-15', location: 'Miami, FL' }
  },
  {
    email: 'john.smith@example.com',
    name: 'John Smith',
    preferred_language: 'en',
    metadata: { plan: 'starter', signup_date: '2024-02-20', location: 'New York, NY' }
  },
  {
    email: 'priya.patel@example.com',
    name: 'Priya Patel',
    preferred_language: 'en',
    metadata: { plan: 'enterprise', signup_date: '2023-11-10', location: 'San Francisco, CA' }
  },
  {
    email: 'carlos.rodriguez@example.com',
    name: 'Carlos Rodriguez',
    preferred_language: 'es',
    metadata: { plan: 'pro', signup_date: '2024-03-05', location: 'Los Angeles, CA' }
  },
  {
    email: 'anika.santos@example.com',
    name: 'Anika Santos',
    preferred_language: 'tl',
    metadata: { plan: 'starter', signup_date: '2024-03-18', location: 'Manila, PH' }
  },
  {
    email: 'mike.johnson@example.com',
    name: 'Mike Johnson',
    preferred_language: 'en',
    metadata: { plan: 'pro', signup_date: '2024-01-28', location: 'Chicago, IL' }
  },
  {
    email: 'sarah.chen@example.com',
    name: 'Sarah Chen',
    preferred_language: 'en',
    metadata: { plan: 'enterprise', signup_date: '2023-12-01', location: 'Seattle, WA' }
  },
  {
    email: 'raj.kumar@example.com',
    name: 'Raj Kumar',
    preferred_language: 'hi',
    metadata: { plan: 'starter', signup_date: '2024-04-02', location: 'Mumbai, IN' }
  }
]

interface MessageTemplate {
  sender_type: string
  content: string
  content_translated?: string
  original_language?: string
  confidence?: number
}

interface TicketTemplate {
  subject: string
  status: string
  priority: string
  ai_confidence: number
  ai_handled: boolean
  tags: string[]
  messages: MessageTemplate[]
}

// Demo Tickets with realistic scenarios
const ticketTemplates: TicketTemplate[] = [
  {
    subject: "Can't start my live stream",
    status: 'open',
    priority: 'high',
    ai_confidence: 0.82,
    ai_handled: true,
    tags: ['streaming', 'technical'],
    messages: [
      { sender_type: 'customer', content: "Hi, I've been trying to start a live stream for the past 30 minutes but nothing happens when I click the Go Live button. Can someone help?" },
      { sender_type: 'ai', content: "I understand you're having trouble starting your live stream. Let me help you troubleshoot this.\n\nFirst, please try these quick fixes:\n1. Make sure you've granted camera and microphone permissions in your browser\n2. Try using Chrome or Firefox for best compatibility\n3. Check that no other application is using your camera\n\nCould you tell me which browser you're using and whether you see any error messages?", confidence: 0.82 },
      { sender_type: 'customer', content: "I'm using Chrome. There's no error message, the button just doesn't do anything at all." },
      { sender_type: 'ai', content: "Thanks for that information. Since the button isn't responding at all, this might be a JavaScript issue. Please try:\n\n1. Clear your browser cache (Ctrl+Shift+Delete, select 'Cached images and files')\n2. Disable any ad blockers or browser extensions temporarily\n3. Try opening R-Link in an incognito window\n\nLet me know if any of these steps help!", confidence: 0.78 }
    ]
  },
  {
    subject: "Quiero un reembolso - No estoy satisfecho",
    status: 'escalated',
    priority: 'urgent',
    ai_confidence: 0.45,
    ai_handled: false,
    tags: ['billing', 'refund', 'spanish'],
    messages: [
      { sender_type: 'customer', content: "Pagué $99 por el plan Pro hace 3 días pero el servicio no funciona como esperaba. Quiero mi dinero de vuelta.", original_language: 'es' },
      { sender_type: 'ai', content: "Lamento mucho escuchar que no está satisfecho con su experiencia. Entiendo su frustración.\n\nPara ayudarle con su solicitud de reembolso de $99, necesito conectarle con un agente humano que puede procesar esto inmediatamente. Ellos también pueden ayudar a resolver cualquier problema que esté experimentando.\n\n¿Podría describir brevemente qué problemas específicos ha encontrado? Esto ayudará a nuestro equipo a asistirle mejor.", confidence: 0.45, content_translated: "I'm very sorry to hear you're not satisfied with your experience. I understand your frustration.\n\nTo help with your $99 refund request, I need to connect you with a human agent who can process this immediately. They can also help resolve any issues you're experiencing.\n\nCould you briefly describe what specific problems you've encountered? This will help our team assist you better." },
      { sender_type: 'customer', content: "La calidad del video es muy mala y los compradores se quejan. He perdido ventas por esto!", original_language: 'es' }
    ]
  },
  {
    subject: "How to set up digital rewards for my streams?",
    status: 'resolved',
    priority: 'normal',
    ai_confidence: 0.95,
    ai_handled: true,
    tags: ['rewards', 'setup', 'how-to'],
    messages: [
      { sender_type: 'customer', content: "I heard R-Link has a digital rewards system. How do I set that up for my live streams? I want to give coins to my viewers." },
      { sender_type: 'ai', content: "Great question! R-Link's Digital Rewards system is a fantastic way to engage your audience. Here's how to set it up:\n\n**Step 1: Enable Digital Rewards**\n1. Go to your Dashboard → Settings → Stream Features\n2. Toggle on 'Digital Rewards'\n3. Click 'Configure Rewards'\n\n**Step 2: Set Up Your Coin Economy**\n- Choose your coin name and icon\n- Set earning rates (viewers earn coins by watching, commenting, sharing)\n- Create reward tiers that viewers can redeem\n\n**Step 3: Add Interactive Widgets**\n- Enable the Leaderboard widget to show top supporters\n- Add the 'Rain Coins' button for surprise giveaways\n\nWould you like me to walk you through any specific step in more detail?", confidence: 0.95 },
      { sender_type: 'customer', content: "Perfect! That's exactly what I needed. Thanks!" },
      { sender_type: 'ai', content: "You're welcome! Happy streaming! If you have any other questions about digital rewards or anything else, feel free to ask anytime.", confidence: 0.98 }
    ]
  },
  {
    subject: "Team member can't access our workspace",
    status: 'pending',
    priority: 'high',
    ai_confidence: 0.72,
    ai_handled: true,
    tags: ['teams', 'access', 'enterprise'],
    messages: [
      { sender_type: 'customer', content: "I added a new team member yesterday but she still can't log in. She keeps getting an 'Access Denied' error. We have the Enterprise plan." },
      { sender_type: 'ai', content: "I can help you troubleshoot this team access issue. Let's go through a few things:\n\n**Quick checks:**\n1. Has your team member clicked the invitation link from her email? (Check spam folder too)\n2. Is she using the correct email address that was invited?\n3. Has she completed the account verification?\n\n**If those are all confirmed:**\n- Go to Dashboard → Team → Members\n- Find her entry and check the 'Status' column\n- If it shows 'Pending', click 'Resend Invitation'\n\nCould you check these and let me know what you find?", confidence: 0.72 }
    ]
  },
  {
    subject: "Billing question - was charged twice",
    status: 'open',
    priority: 'urgent',
    ai_confidence: 0.68,
    ai_handled: true,
    tags: ['billing', 'duplicate-charge'],
    messages: [
      { sender_type: 'customer', content: "I just noticed I was charged $49 TWICE this month for my Pro plan. This is unacceptable! I want one of those charges reversed immediately." },
      { sender_type: 'ai', content: "I completely understand your concern, and I apologize for this billing discrepancy. Duplicate charges should never happen.\n\nI can see you're on our Pro plan at $49/month. To resolve this quickly:\n\n1. I'm flagging this for immediate review by our billing team\n2. A human agent will verify the charges and process the refund if confirmed\n\n**What I need from you:**\n- Can you confirm the last 4 digits of the card that was charged?\n- Do you have the dates of both charges?\n\nIn the meantime, rest assured that any duplicate charge will be fully refunded within 3-5 business days. Would you like me to connect you directly with a billing specialist?", confidence: 0.68 }
    ]
  },
  {
    subject: "Paano mag-record ng live stream?",
    status: 'resolved',
    priority: 'normal',
    ai_confidence: 0.88,
    ai_handled: true,
    tags: ['recording', 'tagalog', 'how-to'],
    messages: [
      { sender_type: 'customer', content: "Paano ko mare-record ang aking live stream para ma-share ko ito sa ibang platform?", original_language: 'tl' },
      { sender_type: 'ai', content: "Ang pag-record ng iyong live streams sa R-Link ay napakadali!\n\n**Para i-enable ang Recording:**\n1. Bago mag-start ng stream, pumunta sa Stream Settings\n2. Toggle on ang 'Auto-Record Stream'\n3. Piliin ang quality - SD, HD, o Full HD\n\n**Saan makikita ang Recordings:**\n- Pagkatapos ng stream, pumunta sa Dashboard → Library → Recordings\n- Ang recordings ay awtomatikong naka-process within 30 minutes\n- Pwede mong i-download o directly share sa social media\n\n**Storage Info:**\n- Free plan: 5GB storage\n- Pro plan: 100GB storage\n- Enterprise: Unlimited\n\nMay iba pa bang gusto mong malaman tungkol sa recordings?", confidence: 0.88, content_translated: "Recording your live streams on R-Link is very easy!\n\n**To enable Recording:**\n1. Before starting your stream, go to Stream Settings\n2. Toggle on 'Auto-Record Stream'\n3. Choose quality - SD, HD, or Full HD\n\n**Where to find Recordings:**\n- After the stream, go to Dashboard → Library → Recordings\n- Recordings are automatically processed within 30 minutes\n- You can download or directly share to social media\n\n**Storage Info:**\n- Free plan: 5GB storage\n- Pro plan: 100GB storage\n- Enterprise: Unlimited\n\nIs there anything else you'd like to know about recordings?" },
      { sender_type: 'customer', content: "Salamat! Nahanap ko na. Very helpful!", original_language: 'tl' }
    ]
  },
  {
    subject: "Feature request: Multi-camera support",
    status: 'open',
    priority: 'low',
    ai_confidence: 0.91,
    ai_handled: true,
    tags: ['feature-request', 'multi-camera'],
    messages: [
      { sender_type: 'customer', content: "Love R-Link so far! Quick question - do you support multiple camera angles during a stream? I have 3 cameras I'd like to switch between." },
      { sender_type: 'ai', content: "Thank you for the kind words! I'm happy to share that R-Link does support multi-camera streaming!\n\n**How to use Multi-Camera:**\n1. Connect all cameras to your computer before going live\n2. In the Stream Studio, click 'Add Source' → 'Camera'\n3. Add each camera as a separate source\n4. During your stream, click on any camera to switch to it\n\n**Pro Tips:**\n- Use keyboard shortcuts (1, 2, 3) to quickly switch between cameras\n- Set up 'Scenes' with different camera layouts for quick transitions\n- The Pro plan allows up to 4 simultaneous cameras, Enterprise supports 8\n\nWhich plan are you currently on? I can give you specific guidance based on your setup.", confidence: 0.91 },
      { sender_type: 'customer', content: "I'm on Pro. This is exactly what I needed - didn't realize you had keyboard shortcuts!" }
    ]
  },
  {
    subject: "Stream keeps freezing",
    status: 'open',
    priority: 'high',
    ai_confidence: 0.75,
    ai_handled: true,
    tags: ['streaming', 'performance', 'technical'],
    messages: [
      { sender_type: 'customer', content: "My stream freezes every few minutes. Viewers are complaining. I have good internet (100 Mbps) so that shouldn't be the issue. Help!" },
      { sender_type: 'ai', content: "I understand how frustrating stream freezes can be, especially when viewers are affected. Let's troubleshoot this systematically.\n\n**Immediate checks:**\n1. **Upload speed is key** - While your 100 Mbps download is great, what's your upload speed? Run a test at speedtest.net and share the upload result.\n2. **Wired > WiFi** - If you're on WiFi, try connecting via ethernet cable\n3. **Close background apps** - Other programs using bandwidth can cause issues\n\n**In your Stream Settings:**\n- Try lowering your bitrate to 3000-4000 kbps temporarily\n- Switch from 1080p to 720p to reduce bandwidth needs\n\n**Quick diagnostic:**\n- When does the freezing happen? (Start of stream, random, during high activity?)\n- Are you using any virtual camera software?\n\nLet me know your upload speed and I'll help you dial in the perfect settings!", confidence: 0.75 }
    ]
  }
]

async function seedDemoData() {
  console.log('🚀 Starting demo data seeding...\n')

  const createdCustomerIds: string[] = []

  // Step 1: Create customers using RPC
  console.log('Creating customers...')
  for (const customer of customers) {
    const { data: customerId, error } = await supabase.rpc('seed_customer', {
      p_email: customer.email,
      p_name: customer.name,
      p_preferred_language: customer.preferred_language,
      p_metadata: customer.metadata
    })

    if (error) {
      console.error(`  ✗ Error creating customer ${customer.name}:`, error.message)
    } else {
      createdCustomerIds.push(customerId)
      console.log(`  ✓ Created customer: ${customer.name}`)
    }
  }
  console.log()

  // Step 2: Create tickets and messages
  console.log('Creating tickets and messages...')
  let ticketCount = 0
  let messageCount = 0

  for (let i = 0; i < ticketTemplates.length; i++) {
    const template = ticketTemplates[i]
    const customerId = createdCustomerIds[i % createdCustomerIds.length]

    if (!customerId) {
      console.error(`  ✗ No customer ID for ticket "${template.subject}"`)
      continue
    }

    // Create ticket using RPC
    const { data: ticketId, error: ticketError } = await supabase.rpc('seed_ticket', {
      p_customer_id: customerId,
      p_subject: template.subject,
      p_status: template.status,
      p_priority: template.priority,
      p_ai_confidence: template.ai_confidence,
      p_ai_handled: template.ai_handled,
      p_tags: template.tags
    })

    if (ticketError) {
      console.error(`  ✗ Error creating ticket "${template.subject}":`, ticketError.message)
      continue
    }
    ticketCount++

    // Create messages for this ticket
    for (const msg of template.messages) {
      const { error: msgError } = await supabase.rpc('seed_message', {
        p_ticket_id: ticketId,
        p_sender_type: msg.sender_type,
        p_content: msg.content,
        p_content_translated: msg.content_translated || null,
        p_original_language: msg.original_language || null,
        p_confidence: msg.confidence || null
      })

      if (msgError) {
        console.error('    ✗ Error creating message:', msgError.message)
      } else {
        messageCount++
      }
    }

    console.log(`  ✓ Created ticket: "${template.subject}" (${template.messages.length} messages)`)
  }

  console.log(`\n✅ Demo data seeding complete!`)
  console.log(`   Customers: ${createdCustomerIds.length}`)
  console.log(`   Tickets: ${ticketCount}`)
  console.log(`   Messages: ${messageCount}`)
}

seedDemoData().catch(console.error)
