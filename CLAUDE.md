# CS-App: Customer Support Application

> **North Star:** Handle 1 million users with just 1 person and an amazing AI agent.

Modern customer support platform with AI-first automation, multi-channel communication, and embeddable widget. Built with Next.js 16, React 19, Supabase, and Claude AI.

## Quick Start

```bash
# Install dependencies
npm install

# Set up Doppler (one-time)
doppler login
doppler setup        # selects r-link-customer-service / dev from doppler.yaml

# Run development server (secrets injected from Doppler)
npm run dev

# Fallback: without Doppler, use .env.local
# cp .env.example .env.local   # fill in values
# npm run dev:local
```

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Frontend**: React 19, Tailwind CSS 4, Radix UI
- **Database**: Supabase (PostgreSQL with Row-Level Security)
- **AI**: Claude AI (Anthropic SDK), OpenAI (embeddings)
- **Auth**: Supabase Auth
- **Real-time**: Supabase Realtime (WebSocket subscriptions)
- **Email**: SendGrid

## Project Structure

**Key Directories:**
- `src/app/(dashboard)/` - Main dashboard UI (tickets, analytics, knowledge, settings)
- `src/app/api/` - REST API routes (tickets, chat, knowledge, webhooks, widget)
- `src/app/portal/` - Customer self-service portal
- `src/app/widget/` - Embeddable widget (iframe)
- `src/components/` - React components (dashboard, widget, ui primitives)
- `src/lib/` - Core logic
  - `ai-agent/` - Agentic AI engine with tool use
  - `ai-router/` - AI orchestration and triage
  - `knowledge/` - RAG ingestion, search, parsing
  - `brave/` - Brave Search integration
  - `channels/`, `email/`, `twilio/`, `webhooks/` - Communication channels
  - `widget/`, `portal/`, `supabase/` - Auth and database clients
- `Knowledge-Base/` - Customer-facing documentation (33 markdown files)
- `supabase/migrations/` - Database schema (migrations 001-023)

## Key Features

### AI Agent Engine
- **Agentic AI** with tool use (Claude + Anthropic SDK)
- **RAG Knowledge Base** with semantic search (OpenAI embeddings)
- **Auto-triage** and smart routing
- **Web search** via Brave Search API
- Configurable agent behavior (model, timeout, max tool rounds)

### Ticket Management
- Real-time queue with filtering, bulk actions, keyboard shortcuts
- AI-suggested responses and knowledge base suggestions
- SLA tracking with visual badges (ok/warning/breached)
- Customer context sidebar with history

### Omnichannel
- **Widget** - Embeddable iframe with anonymous/email auth
- **Portal** - Customer self-service with token auth
- **SMS** (Twilio), **Email** (inbound webhooks), **Slack**
- Unified AI routing with channel-aware formatting

### Real-time
- Typing indicators, read receipts, presence tracking (Supabase Broadcast)
- Live message delivery status

### Analytics
- Ticket volume, resolution times, CSAT scores, agent performance

## Database

**Key Tables:** `agents`, `customers`, `tickets`, `messages`, `knowledge_articles`, `knowledge_chunks` (embeddings), `customer_access_tokens`, `sla_policies`, `canned_responses`, `ticket_events`, `ticket_feedback`, `ai_agent_conversations`

**Auth:**
- Dashboard: Supabase Auth (cookies via middleware)
- Portal: Bearer token (`Authorization: Bearer <token>`)
- Widget: Bearer token with `wt_` prefix

**Supabase Clients:**
- Server (API routes): `getServiceClient()` - service role for admin ops
- Client: `createClient(url, anonKey)` - respects RLS

## Widget Integration

```html
<script src="https://nova.r-link.com/widget/loader.js"
  data-position="bottom-right" data-company-name="Acme"></script>
```
**API:** `window.csWidget.open()`, `.close()`, `.identify({email, name})`

## Secrets Management (DOPPLER ONLY)

**NEVER set env vars directly in Vercel, .env files, or any other provider.** All secrets are managed exclusively through [Doppler](https://dashboard.doppler.com), project `r-link-customer-service` (configs: `dev`, `stg`, `prd`).

```bash
doppler secrets set KEY="value"           # Set a secret
doppler secrets get KEY --plain           # Read a secret
doppler secrets                           # List all secrets
```

Doppler syncs to Vercel automatically. If Vercel env vars appear stale, re-trigger the sync from the Doppler dashboard (never manually add/edit Vercel env vars).

**Reference:** See `.env.example` for all variables

**Core:** Supabase (URL, anon key, service role key), `NEXT_PUBLIC_APP_URL`
**AI:** Anthropic keys (2x for load balancing), OpenAI, Brave Search, agent config
**Channels:** SendGrid (email), `INBOUND_EMAIL_ADDRESS`, `EMAIL_FROM`, `EMAIL_AI_FROM`
**Security:** `CRON_SECRET`, `WEBHOOK_EMAIL_SECRET`, `INTERNAL_API_KEY`, widget CORS origins

## Development

**Scripts:**
- `npm run dev` - Doppler-injected secrets (primary)
- `npm run dev:local` - Uses `.env.local` (fallback)

**Patterns:**
- API routes: Export `GET`/`POST`/etc, use `getServiceClient()`, return `NextResponse.json()`
- Dashboard pages: `'use client'` for interactivity, use existing components
- Styling: Tailwind, dark mode via `.dark` class, indigo primary
- Types: Database types in `src/types/database.ts`, strict TypeScript

## Migrations

**CLI:** Project already linked to remote Supabase instance

```bash
echo "y" | npx supabase db push          # Push migrations
npx supabase migration list             # List status
npx supabase migration new <name>       # Create new
npx supabase db pull                    # Pull remote schema
```

**After adding tables:** Update `src/types/database.ts` for type safety.
