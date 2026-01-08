-- R-Link Customer Service Platform - Initial Schema
-- Base tables (vector features will be added separately via SQL Editor)

-- ============================================
-- TABLES
-- ============================================

-- Agents (support staff)
create table if not exists agents (
  id uuid primary key references auth.users on delete cascade,
  email text not null unique,
  name text not null,
  avatar_url text,
  status text default 'offline' check (status in ('online', 'away', 'offline')),
  created_at timestamptz default now()
);

-- Customers (end users contacting support)
create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  email text unique,
  name text,
  preferred_language text default 'en' check (preferred_language in ('en', 'es', 'tl', 'hi')),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Tickets (support conversations)
create table if not exists tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid references customers not null,
  assigned_agent_id uuid references agents,
  subject text not null,
  status text default 'open' check (status in ('open', 'pending', 'resolved', 'escalated')),
  priority text default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  ai_confidence float check (ai_confidence >= 0 and ai_confidence <= 100),
  ai_handled boolean default true,
  tags text[] default '{}',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Messages (individual messages in a ticket)
create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid references tickets on delete cascade not null,
  sender_type text check (sender_type in ('customer', 'agent', 'ai')) not null,
  sender_id uuid, -- null for AI, customer_id or agent_id otherwise
  content text not null,
  content_translated text,
  original_language text,
  confidence float check (confidence >= 0 and confidence <= 100),
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- Knowledge Base Articles (for RAG) - embedding column added via SQL Editor
create table if not exists knowledge_articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text,
  tags text[] default '{}',
  is_published boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- ============================================
-- INDEXES
-- ============================================

-- Tickets indexes
create index if not exists idx_tickets_customer_id on tickets(customer_id);
create index if not exists idx_tickets_assigned_agent_id on tickets(assigned_agent_id);
create index if not exists idx_tickets_status on tickets(status);
create index if not exists idx_tickets_priority on tickets(priority);
create index if not exists idx_tickets_created_at on tickets(created_at desc);
create index if not exists idx_tickets_ai_handled on tickets(ai_handled);

-- Messages indexes
create index if not exists idx_messages_ticket_id on messages(ticket_id);
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_messages_sender_type on messages(sender_type);

-- Knowledge articles
create index if not exists idx_knowledge_articles_category on knowledge_articles(category);

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to update updated_at timestamp
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at on tickets
drop trigger if exists trigger_tickets_updated_at on tickets;
create trigger trigger_tickets_updated_at
  before update on tickets
  for each row
  execute function update_updated_at();

-- Auto-update updated_at on knowledge_articles
drop trigger if exists trigger_knowledge_articles_updated_at on knowledge_articles;
create trigger trigger_knowledge_articles_updated_at
  before update on knowledge_articles
  for each row
  execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
alter table agents enable row level security;
alter table customers enable row level security;
alter table tickets enable row level security;
alter table messages enable row level security;
alter table knowledge_articles enable row level security;

-- Agents policies
drop policy if exists "Agents can view all agents" on agents;
create policy "Agents can view all agents"
  on agents for select
  to authenticated
  using (true);

drop policy if exists "Agents can update their own profile" on agents;
create policy "Agents can update their own profile"
  on agents for update
  to authenticated
  using (auth.uid() = id);

-- Customers policies (agents can manage all customers)
drop policy if exists "Agents can view all customers" on customers;
create policy "Agents can view all customers"
  on customers for select
  to authenticated
  using (true);

drop policy if exists "Agents can create customers" on customers;
create policy "Agents can create customers"
  on customers for insert
  to authenticated
  with check (true);

drop policy if exists "Agents can update customers" on customers;
create policy "Agents can update customers"
  on customers for update
  to authenticated
  using (true);

-- Public access for chat widget (customers creating themselves)
drop policy if exists "Public can create customers via widget" on customers;
create policy "Public can create customers via widget"
  on customers for insert
  to anon
  with check (true);

-- Tickets policies
drop policy if exists "Agents can view all tickets" on tickets;
create policy "Agents can view all tickets"
  on tickets for select
  to authenticated
  using (true);

drop policy if exists "Agents can create tickets" on tickets;
create policy "Agents can create tickets"
  on tickets for insert
  to authenticated
  with check (true);

drop policy if exists "Agents can update tickets" on tickets;
create policy "Agents can update tickets"
  on tickets for update
  to authenticated
  using (true);

-- Public access for chat widget
drop policy if exists "Public can create tickets via widget" on tickets;
create policy "Public can create tickets via widget"
  on tickets for insert
  to anon
  with check (true);

drop policy if exists "Public can view their own tickets" on tickets;
create policy "Public can view their own tickets"
  on tickets for select
  to anon
  using (true); -- Widget will filter by customer_id client-side

-- Messages policies
drop policy if exists "Agents can view all messages" on messages;
create policy "Agents can view all messages"
  on messages for select
  to authenticated
  using (true);

drop policy if exists "Agents can create messages" on messages;
create policy "Agents can create messages"
  on messages for insert
  to authenticated
  with check (true);

-- Public access for chat widget
drop policy if exists "Public can create messages via widget" on messages;
create policy "Public can create messages via widget"
  on messages for insert
  to anon
  with check (true);

drop policy if exists "Public can view messages in their tickets" on messages;
create policy "Public can view messages in their tickets"
  on messages for select
  to anon
  using (true); -- Widget will filter by ticket_id client-side

-- Knowledge articles policies
drop policy if exists "Anyone can view published articles" on knowledge_articles;
create policy "Anyone can view published articles"
  on knowledge_articles for select
  using (is_published = true);

drop policy if exists "Agents can manage articles" on knowledge_articles;
create policy "Agents can manage articles"
  on knowledge_articles for all
  to authenticated
  using (true)
  with check (true);

-- ============================================
-- REALTIME
-- ============================================

-- Enable realtime for key tables
alter publication supabase_realtime add table tickets;
alter publication supabase_realtime add table messages;

-- ============================================
-- SEED DATA - Demo Knowledge Base Articles
-- ============================================

insert into knowledge_articles (title, content, category, tags) values
(
  'Getting Started with R-Link Live Streaming',
  'To start a live stream on R-Link:

1. Go to your Dashboard and click "Go Live"
2. Configure your stream settings (title, description, thumbnail)
3. Choose your broadcast quality (720p recommended for most connections)
4. Add interactive widgets (polls, Q&A, product cards)
5. Click "Start Broadcast" when ready

Tips for great streams:
- Test your audio and video before going live
- Use good lighting and a stable internet connection
- Engage with your audience through the chat
- Use the product overlay feature to showcase items

For technical issues, ensure your browser supports WebRTC and you have granted camera/microphone permissions.',
  'Live Streaming',
  ARRAY['streaming', 'getting-started', 'broadcast', 'setup']
),
(
  'Troubleshooting Stream Quality Issues',
  'If you''re experiencing poor stream quality:

**Common Causes:**
- Slow internet connection (need minimum 5 Mbps upload)
- Browser not updated
- Too many background applications
- Incorrect stream settings

**Solutions:**

1. **Check your internet speed**: Use speedtest.net and ensure upload is 5+ Mbps
2. **Lower stream quality**: Go to Settings > Stream > Quality and select 480p
3. **Close background apps**: Video calls, downloads, and other streams compete for bandwidth
4. **Use a wired connection**: Ethernet is more stable than WiFi
5. **Clear browser cache**: Settings > Privacy > Clear browsing data
6. **Try a different browser**: Chrome and Firefox work best

If issues persist, contact support with your stream ID and we''ll investigate.',
  'Technical Support',
  ARRAY['streaming', 'troubleshooting', 'quality', 'technical']
),
(
  'Setting Up In-Stream Purchases',
  'Enable your viewers to buy products directly during your live stream:

**Setup Steps:**

1. Go to Settings > Commerce > Enable In-Stream Purchases
2. Connect your payment processor (Stripe or PayPal)
3. Add products in the Products tab
4. During stream, click "Add Product Overlay" to display items

**Best Practices:**
- Add clear product images and descriptions
- Set up inventory tracking to avoid overselling
- Use the "Featured Product" spotlight during key moments
- Enable instant checkout for faster conversions

**Fees:**
- R-Link takes 3% + $0.30 per transaction
- Your payment processor fees apply separately

For high-volume sellers, contact us about enterprise pricing.',
  'Commerce',
  ARRAY['commerce', 'purchases', 'selling', 'products', 'payments']
),
(
  'Account Security and Two-Factor Authentication',
  'Protect your R-Link account with these security features:

**Enable 2FA:**
1. Go to Settings > Security > Two-Factor Authentication
2. Choose your method: Authenticator app (recommended) or SMS
3. Scan the QR code with your authenticator app
4. Enter the verification code to confirm

**Security Best Practices:**
- Use a unique, strong password (12+ characters)
- Never share your login credentials
- Log out from shared devices
- Review connected apps regularly in Settings > Apps

**If Your Account Is Compromised:**
1. Change your password immediately
2. Enable 2FA if not already active
3. Review recent login activity in Settings > Security
4. Contact support if you notice unauthorized changes

We take security seriously. All data is encrypted and we never store plain-text passwords.',
  'Account & Security',
  ARRAY['security', 'account', '2fa', 'authentication', 'password']
),
(
  'Understanding R-Link Pricing Plans',
  'R-Link offers three pricing tiers:

**Starter (Free)**
- Up to 50 live viewers
- 720p streaming
- Basic analytics
- Community support

**Pro ($29/month)**
- Up to 500 live viewers
- 1080p streaming
- In-stream purchases
- Advanced analytics
- Priority support
- Custom branding

**Enterprise (Custom)**
- Unlimited viewers
- 4K streaming
- White-label solution
- Dedicated account manager
- SLA guarantees
- API access

**Billing:**
- Monthly or annual (save 20%)
- Cancel anytime
- Prorated refunds available

To upgrade, go to Settings > Billing > Change Plan.',
  'Billing & Plans',
  ARRAY['pricing', 'plans', 'billing', 'subscription', 'upgrade']
),
(
  'Refund Policy and Process',
  'R-Link''s refund policy:

**Subscription Refunds:**
- Full refund within 7 days of initial purchase
- Prorated refund for annual plans cancelled mid-term
- No refunds after 7 days for monthly plans

**In-Stream Purchase Refunds:**
- Sellers set their own return policies
- Disputes handled through our resolution center
- R-Link fees are non-refundable

**How to Request a Refund:**
1. Go to Settings > Billing > Payment History
2. Click on the transaction
3. Select "Request Refund"
4. Provide reason and submit

Processing time: 5-10 business days for credit cards, 3-5 days for PayPal.

For disputes about in-stream purchases, contact the seller first. If unresolved after 48 hours, open a dispute through Settings > Purchases > Open Dispute.',
  'Billing & Plans',
  ARRAY['refund', 'billing', 'returns', 'dispute', 'money']
);
