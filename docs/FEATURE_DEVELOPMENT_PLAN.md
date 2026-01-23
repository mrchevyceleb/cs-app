# CS-App Feature Development Plan

## Overview

This document outlines the incremental development plan for the R-Link Customer Support application. Features are organized by priority and dependency, designed to be tackled one at a time.

---

## Current State Summary

### What's Working

- Ticket queue with real-time updates
- Ticket detail view with message history
- Knowledge base CRUD with vector embeddings
- AI-powered chat responses (OpenAI GPT-4)
- Multi-language detection and translation
- Auto-escalation logic
- Embeddable chat widget
- Magic link authentication
- Responsive UI with dark mode

### What's Scaffolding Only

- Analytics dashboard (skeleton placeholders)
- Settings page (buttons don't work)
- File attachments (UI only)
- AI assist/suggestions (UI only)
- Export functionality (UI only)

---

## Phase 1: Core Functionality Completion

### 1.1 Ticket Actions & Workflow ✅ COMPLETED

**Priority: HIGH | Complexity: Medium**

Current state: All ticket workflow features are fully functional.

Tasks:

- [x] Add "Resolve Ticket" button that updates status to `resolved`
- [x] Add "Escalate to Human" button that updates status to `escalated`
- [x] Add status change dropdown (open/pending/resolved/escalated)
- [x] Add priority change dropdown (low/normal/high/urgent)
- [x] Add "Assign to Me" functionality for agents
- [x] Show assigned agent in ticket detail
- [x] Add confirmation dialogs for destructive actions

Files modified:

- `src/app/(dashboard)/tickets/[id]/page.tsx`
- `src/components/dashboard/TicketDetail.tsx`
- `src/components/dashboard/TicketCard.tsx`
- `src/components/ui/alert-dialog.tsx` (created)
- `src/types/database.ts`

---

### 1.2 Agent Responses in Tickets ✅ COMPLETED

**Priority: HIGH | Complexity: Medium**

Current state: Agent message sending is fully functional with optimistic updates and error handling.

Tasks:

- [x] Wire up ChatInput to POST to `/api/tickets/[id]/messages`
- [x] Set `sender_type: 'agent'` for manual responses
- [x] Add "Send as AI" vs "Send as Agent" toggle (split button with dropdown)
- [x] Real-time message updates after sending (via existing Supabase subscriptions)
- [x] Optimistic UI updates while sending (pending messages show with spinner)
- [x] Error handling with retry option

Files modified:

- `src/components/dashboard/ChatInput.tsx` - Added split button with mode dropdown, loading/error states
- `src/app/(dashboard)/tickets/[id]/page.tsx` - Refactored to use API route with optimistic updates
- `src/components/dashboard/TicketDetail.tsx` - Updated props to pass through sending state
- `src/components/dashboard/ChatBubble.tsx` - Added pending message visual indicator

---

### 1.3 AI Assist Feature

**Priority: HIGH | Complexity: Medium**

Current state: "AI Assist" button exists but does nothing.

Tasks:

- [ ] Create `/api/suggestions` endpoint that generates response drafts
- [ ] Pass ticket context + message history to AI
- [ ] Display suggested response in ChatInput as editable draft
- [ ] Agent can edit, then send
- [ ] Show confidence score for suggestion
- [ ] Add "Regenerate" button for new suggestions
- [ ] Agent should be able to do ANYTHING a human can do in the app - the north star of this app is that it is a platform that one human can use to manage the entire customer service infrastructure without anyone else at scale. Which means the agent needs to be as agentic as possible

Files to modify:

- `src/api/suggestions/route.ts` (create)
- `src/components/dashboard/ChatInput.tsx`
- `src/lib/openai/prompts.ts` (add suggestion prompt)

---

### 1.4 Real Metrics Dashboard

**Priority: MEDIUM | Complexity: Low**

Current state: MetricsBar shows hardcoded demo data.

Tasks:

- [ ] Create `/api/metrics` endpoint
- [ ] Query real counts: open tickets, avg response time, AI resolution rate, escalation rate
- [ ] Replace hardcoded values in MetricsBar
- [ ] Add loading states
- [ ] Auto-refresh metrics every 30 seconds

Files to modify:

- `src/api/metrics/route.ts` (create)
- `src/components/dashboard/MetricsBar.tsx`

---

## Phase 2: Enhanced Features

### 2.1 All Tickets Page

**Priority: MEDIUM | Complexity: Medium**

Current state: Shows "Coming Soon" placeholder.

Tasks:

- [ ] Build full ticket list with pagination
- [ ] Advanced filters: date range, assigned agent, customer email
- [ ] Sortable columns: created, updated, priority, status
- [ ] Bulk actions: resolve multiple, assign multiple
- [ ] Search by subject or message content
- [ ] Export to CSV

Files to modify:

- `src/app/(dashboard)/tickets/page.tsx`
- Create `src/components/dashboard/TicketTable.tsx`

---

### 2.2 Translation API

**Priority: MEDIUM | Complexity: Low**

Current state: Endpoint exists but is empty.

Tasks:

- [ ] Implement `/api/translate` endpoint
- [ ] Use existing `translateMessage()` from openai/chat.ts
- [ ] Add "Translate" button on non-English messages
- [ ] Show original + translated content toggle
- [ ] Cache translations in message metadata

Files to modify:

- `src/api/translate/route.ts`
- `src/components/dashboard/ChatBubble.tsx`

---

### 2.3 File Attachments

**Priority: MEDIUM | Complexity: High**

Current state: Attachment button exists, no functionality.

Tasks:

- [ ] Set up Supabase Storage bucket for attachments
- [ ] Create `/api/upload` endpoint
- [ ] Handle file selection in ChatInput
- [ ] Upload to Supabase Storage
- [ ] Store file URL in message metadata
- [ ] Display attachments in ChatBubble (images inline, files as download links)
- [ ] Add file type validation (images, PDFs, docs)
- [ ] Add file size limits (10MB max)

Files to modify:

- `src/api/upload/route.ts` (create)
- `src/components/dashboard/ChatInput.tsx`
- `src/components/dashboard/ChatBubble.tsx`
- Supabase: Create storage bucket + policies

---

### 2.4 Customer Management

**Priority: MEDIUM | Complexity: Medium**

Current state: Customers exist in DB but no management UI.

Tasks:

- [ ] Create `/customers` page
- [ ] List all customers with search
- [ ] Customer detail view: all their tickets, metadata, language preference
- [ ] Edit customer metadata
- [ ] Merge duplicate customers
- [ ] Customer activity timeline

Files to create:

- `src/app/(dashboard)/customers/page.tsx`
- `src/app/(dashboard)/customers/[id]/page.tsx`
- `src/api/customers/route.ts`
- `src/api/customers/[id]/route.ts`

---

## Phase 3: Analytics & Reporting

### 3.1 Analytics Dashboard

**Priority: MEDIUM | Complexity: High**

Current state: Skeleton placeholders only.

Tasks:

- [ ] Design analytics data model (daily/weekly aggregations)
- [ ] Create analytics aggregation job (edge function or cron)
- [ ] Ticket volume over time chart
- [ ] AI vs Human resolution breakdown
- [ ] Average response time trends
- [ ] Customer satisfaction metrics (requires feedback system)
- [ ] Agent performance comparison
- [ ] Peak hours heatmap

Files to modify:

- `src/app/(dashboard)/analytics/page.tsx`
- `src/api/analytics/route.ts` (create)
- Consider: Chart library (recharts, chart.js)

---

### 3.2 Export & Reports

**Priority: LOW | Complexity: Medium**

Tasks:

- [ ] Export tickets to CSV
- [ ] Export analytics to PDF
- [ ] Scheduled email reports (weekly summary)
- [ ] Custom date range exports

---

## Phase 4: Settings & Configuration

### 4.1 Agent Profile Settings

**Priority: LOW | Complexity: Low**

Current state: UI exists but buttons don't work.

Tasks:

- [ ] Update agent name/avatar
- [ ] Change notification preferences
- [ ] Set working hours / auto-away
- [ ] Signature for responses

Files to modify:

- `src/app/(dashboard)/settings/page.tsx`
- `src/api/agents/[id]/route.ts` (create)

---

### 4.2 Nova AI Configuration

**Priority: LOW | Complexity: Medium**

Tasks:

- [ ] Adjust AI confidence threshold
- [ ] Set auto-escalation rules
- [ ] Customize AI personality/tone
- [ ] Enable/disable specific AI features
- [ ] Blocked phrases / topics to always escalate

---

### 4.3 Team Management (Admin)

**Priority: LOW | Complexity: High**

Tasks:

- [ ] Invite new agents
- [ ] Role management (admin, agent, viewer)
- [ ] Deactivate agents
- [ ] View agent activity logs

---

## Phase 5: Advanced Features

### 5.1 Canned Responses / Templates

**Priority: MEDIUM | Complexity: Medium**

Tasks:

- [ ] Create response templates with variables
- [ ] Quick insert from ChatInput
- [ ] Organize by category
- [ ] AI can suggest relevant templates

---

### 5.2 Ticket Tags & Categories

**Priority: LOW | Complexity: Low**

Current state: Tags field exists in DB but no UI.

Tasks:

- [ ] Add/remove tags on tickets
- [ ] Create/manage tag taxonomy
- [ ] Filter tickets by tag
- [ ] Auto-tagging via AI

---

### 5.3 Internal Notes

**Priority: MEDIUM | Complexity: Low**

Tasks:

- [ ] Add internal notes to tickets (not visible to customer)
- [ ] Different styling for internal vs external messages
- [ ] @mention other agents

---

### 5.4 SLA & Escalation Rules

**Priority: LOW | Complexity: High**

Tasks:

- [ ] Define SLA policies (response time by priority)
- [ ] Visual SLA breach warnings
- [ ] Auto-escalation on SLA breach
- [ ] SLA reporting

---

### 5.5 Customer Feedback

**Priority: LOW | Complexity: Medium**

Tasks:

- [ ] Post-resolution feedback request
- [ ] Rating system (1-5 stars)
- [ ] Optional comment
- [ ] Feedback analytics

---

## Recommended Development Order

### Sprint 1: Make Tickets Fully Functional

1. **1.1 Ticket Actions & Workflow** - Resolve, escalate, assign
2. **1.2 Agent Responses in Tickets** - Actually send messages
3. **1.4 Real Metrics Dashboard** - Show real numbers

### Sprint 2: AI Assistance & Communication

4. **1.3 AI Assist Feature** - Draft suggestions
5. **2.2 Translation API** - Multi-language support
6. **5.3 Internal Notes** - Team collaboration

### Sprint 3: Enhanced Management

7. **2.1 All Tickets Page** - Full ticket management
8. **2.4 Customer Management** - Customer profiles
9. **5.2 Ticket Tags & Categories** - Organization

### Sprint 4: Analytics & Polish

10. **3.1 Analytics Dashboard** - Data insights
11. **4.1 Agent Profile Settings** - Personalization
12. **5.1 Canned Responses** - Efficiency

### Future Sprints

- File attachments (requires storage setup)
- Team management (requires role system)
- SLA & escalation rules (complex logic)
- Customer feedback (new workflow)

---

## Technical Debt & Improvements

- [ ] Add comprehensive error handling across all API routes
- [ ] Add input validation (zod schemas)
- [ ] Add API rate limiting
- [ ] Add request logging/monitoring
- [ ] Write unit tests for critical paths
- [ ] Add E2E tests for main workflows
- [ ] Performance optimization (query caching, pagination)
- [ ] Accessibility audit and fixes

---

## Notes

- Each feature should be tested thoroughly before moving to the next
- Update this document as features are completed
- Consider user feedback when prioritizing
- Keep the chat widget functional throughout all changes

Last updated: January 2026
