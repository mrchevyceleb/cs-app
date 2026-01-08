/**
 * Direct Supabase seed script for R-Link knowledge base
 * This version inserts articles directly without generating embeddings
 *
 * Run with: npx tsx scripts/seed-knowledge-base-direct.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseAnonKey)

// R-Link Knowledge Base Articles
const articles = [
  // Getting Started
  {
    title: 'Getting Started with R-Link',
    category: 'General',
    content: `Welcome to R-Link, the secure, blockchain-powered video conferencing platform that blends communication, commerce, and rewards — all in one live environment.

Getting started is simple:
1. Choose the subscription plan that fits your needs
2. Sign up for an account using your email
3. Verify your account and complete your profile
4. Start hosting meetings immediately

R-Link is designed for simplicity. If you can host a Zoom meeting, you can host on R-Link. Our blockchain technology operates invisibly in the background, so you don't need any crypto knowledge to get started.

Key things to know:
- No software download required - R-Link runs entirely in your browser
- Meetings have no time limits on paid plans
- You can invite up to 3000 participants on the Ultimate plan
- Start earning digital rewards from your very first meeting`
  },
  {
    title: 'What Makes R-Link Different from Zoom?',
    category: 'General',
    content: `R-Link is not just another video conferencing tool - it's a fully branded, browser-based experience built for influence, interaction, and intentional growth.

Key differences from Zoom and other platforms:

1. **Built-in Sales Tools**: Add clickable buttons, custom toolbar links, and call-to-action elements that let participants purchase or register without leaving the meeting.

2. **Blockchain Rewards**: Earn Rally blockchain rewards through platform activity. Rewards can be redeemed for premium services or converted.

3. **Multi-Platform Streaming**: Simultaneously broadcast to YouTube, Facebook, LinkedIn, and other platforms with a single click using RTMP streaming.

4. **Decentralized Security**: 256-bit encryption with decentralized data ownership - you control your data, not us.

5. **Interactive Engagement**: Gamification features, widgets, and interactive elements keep your audience engaged throughout.

6. **No Downloads**: Everything runs in the browser - no software installation needed.

7. **Custom Branding**: Create branded meeting rooms with vanity URLs on Business plans.`
  },

  // Live Streaming
  {
    title: 'How to Start a Live Stream on R-Link',
    category: 'Live Streaming',
    content: `Starting a live stream on R-Link is straightforward:

1. **Schedule or Start Instant Meeting**
   - Go to your dashboard and click "New Meeting" or "Schedule"
   - Choose your meeting settings and preferences

2. **Enable Live Streaming**
   - Before starting, toggle on "Enable Live Stream" in your meeting settings
   - You can stream to multiple platforms simultaneously

3. **Connect Your Streaming Destinations**
   - Add your RTMP credentials for YouTube, Facebook, LinkedIn, or other platforms
   - R-Link supports multi-platform RTMP streaming

4. **Start Your Stream**
   - Click "Go Live" when you're ready
   - Your stream will broadcast to all connected platforms at once

Tips for successful streaming:
- Test your audio and video before going live
- Have a stable internet connection (minimum 10 Mbps upload recommended)
- Use a good quality microphone and camera
- Start streaming 5-10 minutes early to ensure everything is working`
  },
  {
    title: 'Troubleshooting Stream Quality Issues',
    category: 'Technical Support',
    content: `If you're experiencing stream quality issues, try these solutions:

**Common Issues and Fixes:**

1. **Laggy or Choppy Video**
   - Check your internet speed (minimum 10 Mbps upload recommended)
   - Close other applications using bandwidth
   - Reduce video quality settings if needed
   - Use a wired ethernet connection instead of WiFi

2. **Audio Problems**
   - Ensure your microphone is selected correctly in settings
   - Check that your browser has microphone permissions
   - Test audio in the pre-meeting check
   - Use headphones to prevent echo

3. **Stream Not Starting**
   - Verify your RTMP credentials are correct
   - Check that your streaming platform is not blocking the connection
   - Ensure you haven't exceeded platform-specific stream limits

4. **Browser Issues**
   - Use Chrome, Firefox, or Edge (latest versions)
   - Clear browser cache and cookies
   - Disable browser extensions that might interfere
   - Allow all R-Link permissions (camera, microphone, notifications)

**Still Having Issues?**
Contact our support team at support@r-link.com with:
- Your browser type and version
- Description of the issue
- Screenshots or screen recordings if possible`
  },

  // Commerce & Sales
  {
    title: 'Setting Up In-Meeting Sales Tools',
    category: 'Commerce',
    content: `R-Link's built-in sales tools help you convert participants into customers during your meetings.

**Available Sales Features:**

1. **Custom Call-to-Action Buttons**
   - Add clickable buttons to your meeting toolbar
   - Link to your products, services, or registration pages
   - Participants can click without leaving the meeting

2. **Toolbar Links**
   - Add up to 5 custom links in your meeting toolbar
   - Perfect for downloads, sign-ups, or product pages

3. **Overlay Widgets**
   - Display promotional content during your meeting
   - Time-based or manual triggers
   - Include images, text, and links

4. **Setting Up Your Sales Tools:**
   - Go to Meeting Settings > Commerce Tools
   - Click "Add New Button" or "Add New Link"
   - Enter your URL and button text
   - Choose when to display (always, manually, or scheduled)
   - Save and test before your live meeting

**Best Practices:**
- Keep CTAs clear and compelling
- Don't overwhelm viewers with too many buttons
- Place your most important offer prominently
- Test all links before going live`
  },

  // Security
  {
    title: 'R-Link Security and Data Privacy',
    category: 'Account & Security',
    content: `R-Link takes your security seriously with enterprise-grade protection:

**Security Features:**

1. **256-bit Encryption**
   - All meetings are encrypted end-to-end
   - Your data is protected in transit and at rest

2. **Decentralized Data Ownership**
   - You control your data, not R-Link
   - Built on blockchain technology for transparency

3. **Meeting Security Options:**
   - Password protection for meetings
   - Waiting room to screen participants
   - Lock meetings once started
   - Remove disruptive participants
   - Disable screen sharing for participants

4. **Account Security:**
   - Two-factor authentication available
   - Session management in settings
   - Login notifications

**Privacy Commitments:**
- We never sell your data
- GDPR and CCPA compliant
- Regular security audits
- Transparent privacy policy

**Tips for Secure Meetings:**
- Always use meeting passwords for sensitive content
- Enable waiting rooms for public meetings
- Don't share meeting links on public forums
- Regularly review your account access logs`
  },

  // Billing
  {
    title: 'Understanding R-Link Pricing Plans',
    category: 'Billing & Plans',
    content: `R-Link offers flexible pricing plans to match your needs:

**Basic Plan**
- HD video and audio
- Unlimited meeting duration
- Up to 100 participants
- Basic security features
- Perfect for individuals and small teams

**Business Plan**
- Everything in Basic, plus:
- Up to 500 participants
- Webinar features
- Multi-platform streaming (RTMP)
- Advanced engagement tools
- AI-powered features
- Custom branding options
- Multiple room creation with vanity URLs

**Ultimate Plan**
- Everything in Business, plus:
- Up to 3000 participants
- Priority support
- Advanced analytics
- Maximum storage for recordings
- Dedicated account manager

**Important Billing Information:**
- No long-term contracts or hidden fees
- Cancel anytime from your dashboard
- Monthly or annual billing (save with annual)
- Payment via credit card or PayPal
- Automatic renewal unless cancelled
- Prorated refunds available for annual plans`
  },
  {
    title: 'How to Cancel or Change Your Subscription',
    category: 'Billing & Plans',
    content: `Managing your R-Link subscription is easy:

**To Cancel Your Subscription:**
1. Log into your R-Link account
2. Go to Settings > Billing & Subscription
3. Click "Cancel Subscription"
4. Follow the confirmation prompts
5. Your access continues until the end of your billing period

**To Upgrade Your Plan:**
1. Go to Settings > Billing & Subscription
2. Click "Change Plan"
3. Select your new plan
4. Confirm payment - you'll be charged the prorated difference

**To Downgrade Your Plan:**
1. Go to Settings > Billing & Subscription
2. Click "Change Plan"
3. Select the lower tier
4. Changes take effect at your next billing cycle

**Refund Policy:**
- Monthly plans: No refunds for partial months
- Annual plans: Prorated refunds available within 30 days
- Contact support for refund requests

**Important Notes:**
- There are no cancellation fees
- You keep access until your billing period ends
- Download your recordings before cancelling
- Your data is retained for 30 days after cancellation`
  },

  // Rewards
  {
    title: 'How Digital Rewards Work on R-Link',
    category: 'Gamification',
    content: `R-Link's digital rewards system lets you earn while you meet!

**How to Earn Rewards:**
- Host meetings and events
- Invite participants to join R-Link
- Engage with the platform regularly
- Complete profile and account setup
- Refer new paying customers

**How Rewards Work:**
- R-Link creates a Connect account for you automatically when you sign up
- No crypto wallet setup required initially
- Rewards accumulate in your account automatically
- You can optionally activate a wallet later for advanced features

**Using Your Rewards:**
- Redeem for premium R-Link services
- Upgrade your subscription
- Access exclusive features
- Convert to other digital assets (advanced users)

**Viewing Your Rewards:**
1. Go to your Dashboard
2. Click on "Rewards" in the sidebar
3. View your balance and history
4. See available redemption options

**Tips to Maximize Rewards:**
- Host regular meetings
- Build an active referral network
- Engage with community features
- Complete all profile milestones`
  },

  // Technical Support
  {
    title: 'Browser Compatibility and System Requirements',
    category: 'Technical Support',
    content: `R-Link is browser-based and requires no software download.

**Supported Browsers:**
- Google Chrome (recommended) - version 90+
- Mozilla Firefox - version 85+
- Microsoft Edge - version 90+
- Safari - version 14+ (Mac only)

**System Requirements:**

*Minimum:*
- 2 GHz dual-core processor
- 4 GB RAM
- Stable internet connection (5 Mbps)
- Webcam and microphone

*Recommended for Hosts/Streamers:*
- 3 GHz quad-core processor
- 8 GB RAM
- High-speed internet (10+ Mbps upload)
- HD webcam
- Quality microphone or headset

**Mobile Devices:**
- iOS: Safari on iPhone/iPad (iOS 14+)
- Android: Chrome on Android devices (Android 10+)
- R-Link mobile app available on App Store and Google Play

**Network Requirements:**
- Ports 443 (HTTPS) and 80 (HTTP) open
- WebRTC support enabled
- No VPN conflicts (some VPNs may cause issues)

**Troubleshooting:**
If you have issues, try:
1. Update your browser to the latest version
2. Clear cache and cookies
3. Disable ad blockers and extensions
4. Check firewall settings`
  },
  {
    title: 'Recording and File Storage',
    category: 'Technical Support',
    content: `R-Link lets you record your meetings and store them securely.

**Recording Features:**
- Record meetings in HD quality
- Local or cloud recording options
- Automatic cloud backup on paid plans
- Download recordings anytime

**Storage Limits by Plan:**
- Basic: 5 GB cloud storage
- Business: 50 GB cloud storage
- Ultimate: Unlimited cloud storage

**Managing Your Recordings:**
1. Go to Dashboard > Recordings
2. View all your recorded sessions
3. Download, share, or delete recordings
4. Organize with folders and tags

**Recording Best Practices:**
- Inform participants that recording is active
- Check available storage before long sessions
- Download important recordings as backup
- Delete old recordings to free up space

**File Formats:**
- Video: MP4 (H.264)
- Audio only: MP3
- Transcripts: TXT, SRT (if enabled)

**Sharing Recordings:**
- Generate shareable links
- Set expiration dates for links
- Password protect sensitive recordings
- Control download permissions

**Data Retention:**
- Active accounts: Recordings kept indefinitely (within storage limits)
- After cancellation: 30 days to download before deletion`
  },

  // Team Features
  {
    title: 'Setting Up Your Team on R-Link',
    category: 'Integrations',
    content: `Business plan subscribers can create and manage teams on R-Link.

**Team Features:**
- Create multiple meeting rooms with vanity URLs
- Assign presenters and admins
- Controlled access permissions
- Shared branding across rooms
- Consolidated billing

**Creating Your Team:**
1. Go to Settings > Team Management
2. Click "Create Team"
3. Enter team name and settings
4. Invite team members via email

**User Roles:**
- **Owner**: Full control, billing access
- **Admin**: Manage rooms, users, settings
- **Presenter**: Host meetings, access recordings
- **Member**: Join meetings, view shared content

**Managing Permissions:**
- Assign roles per user
- Set room-specific access
- Control who can create meetings
- Manage recording permissions

**Vanity URLs:**
- Create custom URLs for your rooms (e.g., r-link.com/your-company)
- Different URLs for different teams or purposes
- Easy to remember and share
- Professional branding

**Team Billing:**
- Single invoice for all team members
- Add or remove seats as needed
- View usage per team member
- Export reports for accounting`
  },

  // Support
  {
    title: 'How to Contact R-Link Support',
    category: 'General',
    content: `R-Link offers multiple support channels to help you succeed.

**Support Options:**

1. **Knowledge Base & FAQs**
   - Browse our comprehensive help articles
   - Search for specific topics
   - Available 24/7

2. **Email Support**
   - Contact: support@r-link.com
   - Response time: Within 24 hours
   - Include your account email and issue details

3. **Video Tutorials**
   - Step-by-step guides
   - Available on our YouTube channel
   - Covers all major features

4. **Community Forums**
   - Connect with other R-Link users
   - Share tips and best practices
   - Get answers from power users

5. **Dedicated Support (Business/Ultimate)**
   - Priority response times
   - Dedicated account manager (Ultimate)
   - Phone support available

**When Contacting Support, Include:**
- Your account email address
- Detailed description of the issue
- Screenshots or recordings if applicable
- Browser type and version
- Steps to reproduce the problem

**Support Hours:**
- Email: 24/7 (response within 24 hours)
- Priority Support: Mon-Fri, 9AM-6PM EST
- Emergency issues: Escalation available`
  },

  // Meetings
  {
    title: 'Scheduling and Managing Meetings',
    category: 'Live Streaming',
    content: `R-Link makes it easy to schedule and manage your meetings.

**Scheduling a Meeting:**
1. Click "Schedule Meeting" on your dashboard
2. Set the date, time, and duration
3. Add a title and description
4. Configure meeting settings (password, waiting room, etc.)
5. Invite participants via email or link

**Meeting Settings:**
- **Password Protection**: Require password to join
- **Waiting Room**: Screen participants before admitting
- **Auto-Record**: Automatically record all sessions
- **Participant Controls**: Mute on entry, disable video

**Pre-Conference Features:**
- Customizable waiting areas
- Event titles and branding
- Participant count display
- Music or video while waiting

**During the Meeting:**
- Share your screen or specific applications
- Use the whiteboard for collaboration
- Enable breakout rooms (Business+)
- Use polls and Q&A features
- Share files with participants

**After the Meeting:**
- Access recordings in your dashboard
- View attendance reports
- Download chat logs
- Send follow-up emails to participants

**Calendar Integration:**
- Sync with Google Calendar
- Sync with Outlook/Office 365
- Automatic reminders
- One-click join from calendar`
  },

  // Mobile
  {
    title: 'Using R-Link on Mobile Devices',
    category: 'Technical Support',
    content: `R-Link works great on mobile devices through our dedicated apps.

**Download the App:**
- iOS: Available on the App Store
- Android: Available on Google Play
- Search for "R-Link Secure Video Meetings"

**Mobile Features:**
- HD video and audio calls
- Screen sharing (varies by device)
- Chat and reactions
- View shared content
- Basic meeting controls

**Joining a Meeting on Mobile:**
1. Tap the meeting link you received
2. The app will open automatically
3. Allow camera and microphone access
4. Enter meeting password if required
5. Tap "Join Meeting"

**Hosting on Mobile:**
- Start instant meetings
- Access your scheduled meetings
- Basic host controls available
- For full features, use desktop/laptop

**Mobile Best Practices:**
- Use WiFi for best quality
- Keep your device charged
- Use headphones for better audio
- Find a quiet, well-lit location
- Position camera at eye level

**Limitations on Mobile:**
- Some advanced host features require desktop
- Multi-platform streaming not available
- Limited virtual background options
- Screen sharing may vary by device`
  }
]

async function seedKnowledgeBase() {
  console.log('Starting direct knowledge base seeding...\n')
  console.log('Note: Articles will be inserted without embeddings.')
  console.log('Vector search will be available once embeddings are generated.\n')

  let successCount = 0
  let errorCount = 0

  for (const article of articles) {
    console.log(`Processing: ${article.title}...`)

    try {
      const { error } = await supabase
        .from('knowledge_articles')
        .insert({
          title: article.title,
          content: article.content,
          category: article.category,
          // embedding is null - will be generated later when OpenAI key is available
        })

      if (error) {
        console.error(`  ✗ Error: ${error.message}`)
        errorCount++
      } else {
        console.log(`  ✓ Added: ${article.title}`)
        successCount++
      }

      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100))
    } catch (err) {
      console.error(`  ✗ Error processing "${article.title}":`, err)
      errorCount++
    }
  }

  console.log('\n✓ Knowledge base seeding complete!')
  console.log(`  Successful: ${successCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log(`  Total: ${articles.length}`)

  if (successCount > 0) {
    console.log('\nNote: To enable AI-powered vector search, configure a valid')
    console.log('OPENAI_API_KEY in .env.local and regenerate embeddings.')
  }
}

// Run the seeding
seedKnowledgeBase()
  .catch(console.error)
  .finally(() => process.exit(0))
