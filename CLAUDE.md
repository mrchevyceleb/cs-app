# CS-App: Customer Support Application

> **North Star:** Handle 1 million users with just 1 person and an amazing AI agent.

A modern customer support application built with Next.js 16, React 19, Supabase, and Claude AI. Features include AI-assisted ticket management, real-time messaging, SLA tracking, customer portal, embeddable widget, and omnichannel communication (SMS, Email, Slack, and more).

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables (copy .env.example to .env.local)
# Required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Run development server
npm run dev
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, Tailwind CSS 4, Radix UI
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **AI**: Claude AI (Anthropic SDK), OpenAI (embeddings)
- **Auth**: Supabase Auth
- **Real-time**: Supabase Realtime (WebSocket subscriptions)
- **Email**: Resend

## Project Structure

```
src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login)
│   ├── (dashboard)/              # Main dashboard routes
│   │   ├── analytics/            # Analytics & metrics
│   │   ├── knowledge/            # Knowledge base management
│   │   ├── settings/             # App settings
│   │   └── tickets/              # Ticket views
│   ├── api/                      # API routes
│   │   ├── agents/               # Agent management
│   │   ├── canned-responses/     # Saved responses
│   │   ├── chat/                 # AI chat endpoints
│   │   ├── feedback/             # CSAT feedback
│   │   ├── ingest/               # Unified channel ingest
│   │   ├── knowledge/            # RAG knowledge base
│   │   ├── metrics/              # Dashboard metrics
│   │   ├── portal/               # Customer portal APIs
│   │   ├── sla/                  # SLA policies
│   │   ├── sms/send/             # Outbound SMS
│   │   ├── tickets/              # Ticket CRUD + messages
│   │   ├── upload/               # File attachments
│   │   ├── webhooks/             # Webhook management + inbound
│   │   │   ├── twilio/sms/       # Twilio SMS webhook
│   │   │   ├── email/            # Email inbound webhook
│   │   │   └── inbound/slack/    # Slack webhook
│   │   ├── widget/               # Embeddable widget APIs
│   │   └── workflows/            # Automation rules
│   ├── feedback/                 # Public feedback pages
│   ├── portal/                   # Customer portal (full page)
│   └── widget/                   # Embeddable widget (iframe)
│
├── components/
│   ├── dashboard/                # Dashboard components
│   │   ├── ChatBubble.tsx        # Message display
│   │   ├── ChatInput.tsx         # Message composition
│   │   ├── FilterBar.tsx         # Ticket filtering
│   │   ├── Sidebar.tsx           # Navigation
│   │   ├── TicketCard.tsx        # Ticket list item
│   │   ├── TicketDetail.tsx      # Ticket view
│   │   └── TicketQueue.tsx       # Ticket list
│   ├── shared/                   # Shared components
│   ├── ui/                       # UI primitives (shadcn/ui)
│   └── widget/                   # Widget components
│       ├── WidgetContainer.tsx   # Main widget wrapper
│       ├── WidgetAuth.tsx        # Email capture
│       ├── WidgetChat.tsx        # Chat interface
│       ├── WidgetTicketList.tsx  # Customer's tickets
│       └── WidgetNewTicket.tsx   # New ticket form
│
├── contexts/                     # React contexts
│   ├── KeyboardShortcutsContext.tsx
│   └── RealtimeContext.tsx       # Typing, read receipts, presence
│
├── hooks/                        # Custom hooks
│   ├── useKeyboardShortcuts.ts
│   ├── useTypingIndicator.ts     # Typing indicator hook
│   └── useReadReceipts.ts        # Read receipts hook
│
├── lib/
│   ├── ai-router/                # AI unified routing
│   │   ├── index.ts              # Main orchestrator
│   │   ├── triage.ts             # Claude triage logic
│   │   ├── prompts.ts            # AI prompts
│   │   └── formatters.ts         # Channel-aware formatting
│   ├── channels/                 # Channel management
│   │   └── customer.ts           # Find/create customers
│   ├── email/                    # Email utilities
│   │   └── inbound.ts            # Inbound email processing
│   ├── portal/                   # Portal auth
│   ├── supabase/                 # Supabase clients
│   ├── twilio/                   # Twilio SMS integration
│   │   └── client.ts             # SMS send/receive
│   ├── webhooks/                 # Webhook infrastructure
│   │   ├── service.ts            # Dispatch & retry logic
│   │   └── signatures.ts         # HMAC signatures
│   ├── widget/                   # Widget utilities
│   │   ├── auth.ts               # Widget authentication
│   │   ├── config.ts             # Widget configuration
│   │   └── messaging.ts          # postMessage API
│   ├── sla.ts                    # SLA calculations
│   └── utils.ts                  # General utilities
│
├── types/
│   ├── database.ts               # Database types & Supabase schema
│   └── widget.ts                 # Widget types
│
public/
└── widget/
    └── loader.js                 # Embeddable widget loader script

supabase/
└── migrations/                   # Database migrations (001-017)
    ├── 015_channel_support.sql   # Multi-channel support
    ├── 016_webhooks.sql          # Webhook infrastructure
    └── 017_read_receipts.sql     # Read receipts & typing
```

## Key Features

### 1. Ticket Management
- Real-time ticket queue with filtering (status, priority, tags)
- Keyboard shortcuts (`n`: new ticket, `/`: search, `?`: help)
- Bulk actions (assign, change status, add tags)
- AI-suggested responses via Claude

### 2. AI Integration
- Claude AI for response suggestions (`/api/chat/stream`)
- RAG knowledge base search (`/api/knowledge/search`)
- OpenAI embeddings for semantic search
- Auto-translation support

### 3. SLA Tracking
- Configurable SLA policies per priority
- First response and resolution time tracking
- Visual SLA badges (ok/warning/breached)
- Breach notifications

### 4. Customer Portal (`/portal`)
- Token-based authentication
- View and reply to tickets
- Email notifications for updates

### 5. Embeddable Widget (`/widget`)
- Lightweight loader script (~5KB)
- Iframe-based for CSS isolation
- Email-based customer auth
- Real-time message updates

### 6. Analytics
- Ticket volume trends
- Resolution times
- CSAT scores
- Agent performance metrics

### 7. Omnichannel Communication
- **SMS** (Twilio) - Inbound/outbound SMS support
- **Email** - Inbound email creates/updates tickets
- **Slack** - Slack workspace integration
- **Webhooks** - Extensible webhook infrastructure
- Unified AI routing across all channels
- Channel-aware response formatting

### 8. Real-time Features
- Typing indicators (Supabase Broadcast)
- Read receipts
- Live presence tracking
- Real-time message delivery status

## Database Schema

Key tables:
- `agents` - Support agents
- `customers` - Customer records
- `tickets` - Support tickets
- `messages` - Ticket messages
- `knowledge_articles` - RAG knowledge base
- `customer_access_tokens` - Portal/widget auth
- `sla_policies` - SLA rules
- `canned_responses` - Saved reply templates
- `ticket_events` - Activity timeline
- `ticket_feedback` - CSAT ratings

## API Patterns

### Authentication
- Dashboard: Supabase Auth (cookies via middleware)
- Portal: Bearer token (`Authorization: Bearer <token>`)
- Widget: Bearer token with `wt_` prefix

### Response Format
```typescript
// Success
{ data: T }
// or
{ tickets: T[], pagination: {...} }

// Error
{ error: string }
```

### Supabase Client Usage
```typescript
// Server-side (API routes) - use service role for admin operations
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, serviceRoleKey)

// Client-side - use anon key
import { createClient } from '@supabase/supabase-js'
const supabase = createClient(url, anonKey)
```

## Widget Integration

```html
<!-- Add to any website -->
<script
  src="https://your-domain.com/widget/loader.js"
  data-api-key="wk_abc123..."
  data-position="bottom-right"
  data-primary-color="#4F46E5"
  data-company-name="Acme Support"
  data-theme="auto"
></script>
```

```javascript
// Programmatic API
window.csWidget.open()
window.csWidget.close()
window.csWidget.identify({ email: 'user@example.com', name: 'John' })
```

## Environment Variables

```bash
# Required
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# AI (optional, enables AI features)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Email (optional, enables notifications)
RESEND_API_KEY=

# Twilio SMS (optional, enables SMS channel)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=

# Email Inbound (optional, enables email channel)
INBOUND_EMAIL_ADDRESS=support@yourdomain.com
INBOUND_EMAIL_WEBHOOK_SECRET=

# Slack Integration (optional, enables Slack channel)
SLACK_BOT_TOKEN=
SLACK_SIGNING_SECRET=
```

## Development Guidelines

### Adding New API Routes
1. Create route file in `src/app/api/<feature>/route.ts`
2. Export handlers: `GET`, `POST`, `PUT`, `DELETE`
3. Use `getServiceClient()` for Supabase admin operations
4. Return `NextResponse.json()` with appropriate status

### Adding New Dashboard Pages
1. Create page in `src/app/(dashboard)/<route>/page.tsx`
2. Use `'use client'` for interactive pages
3. Leverage existing components from `src/components/dashboard/`

### Styling
- Use Tailwind CSS classes
- Follow existing color scheme (primary indigo, semantic colors)
- Support dark mode via `.dark` class variants
- CSS variables defined in `globals.css`

### Type Safety
- All database types in `src/types/database.ts`
- Use strict TypeScript
- Define API request/response types

## Migrations

Migrations are managed via Supabase CLI. The project is already linked to the remote Supabase instance.

### Common Commands
```bash
# Push pending migrations to remote database (auto-confirms with echo "y")
echo "y" | npx supabase db push

# List migration status
npx supabase migration list

# Create a new migration
npx supabase migration new <migration_name>

# Repair a failed migration (mark as reverted to retry)
npx supabase migration repair <version> --status reverted

# Pull remote schema changes
npx supabase db pull
```

### After Adding New Tables
When adding new tables via migrations, update `src/types/database.ts` with the corresponding TypeScript types to maintain type safety.

## Testing the Widget

1. Start dev server: `npm run dev`
2. Open browser to `http://localhost:3000`
3. Create a test HTML file:
```html
<!DOCTYPE html>
<html>
<head><title>Widget Test</title></head>
<body>
  <h1>Test Page</h1>
  <script src="http://localhost:3000/widget/loader.js"
    data-position="bottom-right"
    data-company-name="Test Support">
  </script>
</body>
</html>
```
4. Open the test HTML file and interact with the widget
