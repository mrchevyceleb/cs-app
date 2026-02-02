# Copilot instructions for CS-App

## Big picture architecture
- Next.js 16 App Router app with segmented routes: auth in src/app/(auth), main dashboard in src/app/(dashboard), public portal in src/app/portal, widget in src/app/widget.
- API surface lives under src/app/api/* with feature-oriented folders (tickets, chat, knowledge, webhooks, widget). These routes call shared logic in src/lib/**.
- AI orchestration is centralized in src/lib/ai-router (triage, prompts, formatters). RAG and knowledge search flow through src/app/api/knowledge and src/lib/knowledge.
- Omnichannel ingest uses src/app/api/ingest and src/lib/webhooks/* + channel handlers (email, twilio, slack). Messages ultimately create/update tickets in Supabase.
- Real-time UX (typing, read receipts, presence) is managed in src/contexts/RealtimeContext.tsx + hooks in src/hooks (useTypingIndicator, useReadReceipts).

## Key workflows
- Dev server: npm run dev (Next.js app on localhost:3000).
- Supabase migrations: npx supabase migration list, npx supabase db push, npx supabase migration new <name>.

## Project conventions & patterns
- API responses are JSON with either { data: T } or { error: string } and NextResponse.json() in route handlers.
- Supabase clients: use service role in server routes and anon key on the client. Database types live in src/types/database.ts.
- Widget auth is token-based with wt_ prefix (see src/lib/widget/auth.ts) and iframe-based UI (src/app/widget, public/widget/loader.js).
- Dashboard UI components live in src/components/dashboard and are composed into routes under src/app/(dashboard).
- Tailwind CSS with dark mode via .dark and shared tokens in src/app/globals.css.

## Integration points
- Supabase (auth, DB, realtime) via src/lib/supabase and RLS-driven schema in supabase/migrations.
- AI: Anthropic (Claude) + OpenAI embeddings (see src/lib/ai-router and src/lib/openai).
- Email: Resend + inbound processing in src/lib/email/inbound.ts and webhook routes.
- SMS: Twilio client in src/lib/twilio/client.ts with webhooks under src/app/api/webhooks/twilio/sms.
- Slack: inbound webhook at src/app/api/webhooks/inbound/slack.

## Examples to follow
- Ticket API patterns: src/app/api/tickets/*
- Knowledge search + RAG: src/app/api/knowledge/* and src/lib/knowledge
- Webhook dispatch & signatures: src/lib/webhooks/service.ts and src/lib/webhooks/signatures.ts
