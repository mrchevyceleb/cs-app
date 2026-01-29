# How the AI & Automation Works

A plain-English guide to every automatic thing this app does behind the scenes.

---

## The Big Picture

Think of the app like a restaurant. Customers walk in (send messages), and there are three layers of staff:

1. **The Front Door** - Webhooks that catch every incoming message (email, SMS, Slack, widget)
2. **The Manager** - The AI Router that decides what to do with each message
3. **The Night Crew** - Cron jobs that run on a schedule to clean up, predict problems, and reach out to customers

On top of all that, there's **Nova** - an AI copilot that sits next to the human agent and can look things up, update tickets, and draft responses when asked.

---

## Layer 1: The Front Door (Inbound Webhooks)

When a customer sends a message from any channel, it hits a webhook endpoint. Each channel has its own door:

| Channel | Endpoint | What Triggers It |
|---------|----------|-----------------|
| Email | `/api/webhooks/email` | Customer sends an email to your support address |
| SMS | `/api/webhooks/twilio/sms` | Customer texts your Twilio phone number |
| Slack | `/api/webhooks/inbound/slack` | Customer messages in a connected Slack workspace |
| Widget | `/api/widget/messages` | Customer uses the chat widget on your website |
| Portal | `/api/portal/tickets/[id]/messages` | Customer replies through the customer portal |

**What happens at the front door:**

1. Verify the message is real (check signatures so nobody can fake a message)
2. Log the raw message to `channel_inbound_logs` (a receipt, basically)
3. Hand it off to the AI Router

That's it. The front door doesn't make decisions - it just catches the message and passes it along.

---

## Layer 2: The Manager (AI Router)

This is where the magic happens. Every single inbound message goes through the same process, no matter what channel it came from. The code lives in `src/lib/ai-router/`.

### Step-by-step flow:

```
Customer sends message
        |
        v
  1. Who is this customer?
     - Look them up by email or phone
     - If new, create a customer record
        |
        v
  2. Is there an open ticket?
     - Yes → add message to that ticket
     - No  → create a new ticket
        |
        v
  3. AI Triage (the brain)
     - Check for emergency keywords first
     - Search the knowledge base for relevant articles
     - Ask Claude to analyze the message
     - Claude returns: intent, confidence score (0-100%), and recommended action
        |
        v
  4. What did Claude decide?
     |
     |-- "auto_respond" (confidence >= 85%)
     |     → Generate a response
     |     → Format it for the channel (SMS gets plain text, email gets HTML, etc.)
     |     → Send it automatically
     |     → Mark ticket as "ai_handled"
     |
     |-- "route_human" (confidence < 60%)
     |     → Leave ticket in queue for a human agent
     |     → Save the suggested response as a draft the agent can use
     |
     |-- "escalate" (urgent/sensitive)
           → Flag ticket as escalated
           → Note the reason (legal threat, angry customer, etc.)
           → Human agent sees it at the top of their queue
```

### The Emergency Shortcut

Before Claude even looks at a message, the system checks for keywords like:
- "urgent", "emergency", "legal", "lawyer", "lawsuit"
- "refund", "cancel subscription", "delete account"
- "security breach", "hacked", "fraud"
- "angry", "furious", "unacceptable"
- "speak to manager", "supervisor", "human", "real person"

If any of these appear, the message skips the AI entirely and goes straight to **escalate** with 100% confidence. No waiting, no analysis - a human gets it immediately.

### Channel Formatting

When the AI does auto-respond, it formats the response for each channel:

- **SMS**: Strips out all markdown formatting, removes URLs, keeps it under 1500 characters
- **Email**: Adds a greeting and sign-off, converts to HTML
- **Slack**: Converts markdown to Slack's format (bold uses single `*` instead of `**`)
- **Widget/Portal**: Keeps basic markdown as-is

---

## Layer 3: The Night Crew (Cron Jobs)

These run on a schedule (configured in `vercel.json`). They don't wait for messages - they proactively scan the database and take action. Think of them as background workers that never sleep.

### 3a. Customer-Facing Automations

These directly affect what customers experience:

#### Stalled Conversation Revival
**What it does:** Finds tickets where the customer hasn't replied in 24+ hours and sends a gentle follow-up.

**How it works:**
1. Look for tickets with status "pending" where the last message is from the AI or agent
2. Check if that message is older than 24 hours
3. Make sure we haven't already sent a revival in the last 3 days
4. Add a friendly follow-up message to the ticket (like "Hey, just checking in - did that solve your issue?")
5. Log it to `proactive_outreach_log`

**Limit:** Max 50 per run, so it doesn't spam.

#### Post-Resolution Check-In
**What it does:** 5 days after a ticket is resolved, emails the customer to make sure everything is still good.

**How it works:**
1. Find tickets that were resolved exactly 5 days ago
2. Generate a personalized check-in email
3. Include a link to the customer portal so they can easily reopen if needed
4. Send via email (Resend)
5. Log it

**Limit:** Max 50 per run. Skips customers without email addresses.

### 3b. Agent-Facing Automations

These help human agents work smarter:

#### SLA Prediction
**What it does:** Predicts which tickets are about to breach their SLA (service level agreement) and warns agents before it happens.

**How it works:**
1. Look at every open ticket that has an SLA policy
2. Calculate breach probability based on:
   - How much time is left on the clock
   - How many tickets are in the queue right now
   - How many agents are online
   - Historical breach rate for similar tickets
3. If breach probability is >= 70% and it's within 4 hours, send an `agent_notification`
4. Store the prediction in `sla_predictions`

**The math (simplified):** More time left = lower risk. More tickets in queue = higher risk. Fewer agents online = higher risk. History of breaches = higher risk.

#### Pattern Detection
**What it does:** Spots when multiple customers are reporting the same issue (like an outage or a bug).

**How it works:**
1. Scan customer messages from the last hour
2. Extract keywords from each message
3. Group messages by similar keywords
4. If 2+ different customers mention the same thing, that's a pattern
5. Rate severity:
   - **Critical**: 10+ customers affected, or 5+ with urgent keywords
   - **High**: 10+ total messages, or 5+ customers with urgent words
   - **Medium**: 5+ customers or 10+ messages
   - **Low**: Everything else
6. Save to `issue_patterns` and notify agents for high/critical

**Why this matters:** If your service goes down and 50 customers all write in, the agent sees ONE alert saying "50 customers reporting connection issues" instead of 50 individual tickets.

#### Smart Queue
**What it does:** Automatically sorts the ticket queue so agents always work on the most important ticket next.

**Scoring formula (what makes a ticket bubble to the top):**

| Factor | Weight | What it means |
|--------|--------|--------------|
| SLA Urgency | 35% | Closer to SLA deadline = higher score |
| Customer Health | 20% | Unhappy/at-risk customers get priority |
| Complexity | 15% | More messages, escalations, technical tags = higher |
| Wait Time | 20% | Longer the customer waits = higher score |
| Sentiment | 10% | Angry language, ALL CAPS, exclamation marks = higher |

Each factor scores 0-100, gets multiplied by its weight, and they're added up. The ticket with the highest total score is at the top of the queue.

### 3c. Knowledge Base Maintenance

These keep the AI's knowledge fresh and accurate:

#### Knowledge Gap Detection
**What it does:** Finds topics where the AI doesn't have good answers and suggests new articles to write.

**How it works:**
1. Look at tickets from the past week where AI confidence was below 60%
2. Extract common keywords from those ticket subjects
3. If the same topic appears 3+ times, that's a gap
4. Create a draft article suggestion with sample customer questions
5. A human reviews and writes the actual article

#### Article Effectiveness Scoring
**What it does:** Measures how well each knowledge base article actually helps resolve tickets.

**How it works:**
1. Look at resolved tickets from the past week
2. Check which articles the AI used in its responses
3. Calculate a score: did using this article lead to resolution or escalation?
4. Factor in CSAT ratings from customers where this article was used
5. Store scores in `knowledge_article_metrics`

**The result:** You can see which articles are stars (high resolution rate, good CSAT) and which are duds (lead to escalation or bad ratings).

#### Article Retirement
**What it does:** Flags articles that haven't been used in 90+ days for human review.

**Important:** It does NOT auto-delete anything. It creates a review draft and lets a human decide whether to keep, update, or archive the article.

### 3d. AI Self-Improvement

These make the AI better over time:

#### Confidence Calibration
**What it does:** Adjusts how confident the AI needs to be before it auto-responds, based on actual results.

**How it works:**
1. Look at the last 30 days of AI-handled tickets
2. Group by intent (billing question, technical issue, etc.)
3. For each intent, check: when the AI responded automatically, how often did it work vs. get escalated?
4. Adjust thresholds:
   - If success rate > 90% → lower the bar to 60% confidence (AI is being too cautious)
   - If success rate is normal → keep threshold at 70%
   - If success rate is low → raise the bar to 80-90% (AI needs to be more sure before responding)
5. Save new thresholds to `channel_config`

**Why this matters:** Over time, the AI learns which types of questions it's good at and which ones it should leave to humans.

### 3e. Business Intelligence

These generate insights for planning:

#### Customer Health Scores
**What it does:** Gives every customer a health score (0-100) so you can spot unhappy customers before they leave.

**Scoring:**
- Start at 70
- Good CSAT ratings: +up to 20
- Bad CSAT ratings: -up to 20
- Open tickets: -5 each (max -25)
- Escalations: -10 each (max -30)
- Resolved tickets: +1 each (max +10)
- High resolution rate (>80%): bonus +10

**Risk levels:**
- 60+ = Healthy
- 40-60 = At Risk
- Below 40 = Critical

**What happens next:** Critical or declining customers trigger an intervention - agents get notified, and outreach can be sent automatically.

#### Volume Forecasting
**What it does:** Predicts how many tickets you'll get in the next 24 hours, 48 hours, and 7 days.

**How it works:**
1. Look at the last 12 weeks of ticket data
2. Calculate average tickets per day-of-week (Mondays are usually busier than Sundays, etc.)
3. Check if volume has been trending up or down recently
4. Apply the trend to the historical average
5. Add confidence intervals (±20-30%)

**Why this matters:** If you know Monday is going to be slammed, you can schedule more agents.

---

## Nova Copilot (The AI Assistant for Agents)

Nova is different from everything above. It doesn't run automatically - it's an AI assistant that sits in a panel next to the agent and responds when asked.

### What Nova can do:

| Tool | What it does |
|------|-------------|
| `lookup_customer` | Pull up a customer's full profile, subscription, and activity |
| `search_tickets` | Find tickets by keyword, status, customer, or date |
| `update_ticket` | Change status, priority, tags, or assignment |
| `escalate_ticket` | Move a ticket to a supervisor with notes |
| `process_refund` | Actually process a refund (order ID, amount, reason) |
| `update_customer` | Update customer name, language, or metadata |
| `search_knowledge_base` | Find relevant KB articles |
| `generate_response` | Draft 3 response options for the agent to pick from |
| `analyze_sentiment` | Analyze customer sentiment from their messages |
| `get_ticket_summary` | Generate a summary of a ticket's full history |

### How Nova works under the hood:

1. Agent types a question ("What's going on with Banana Steve's account?")
2. Message goes to `/api/copilot`
3. Claude receives the message plus all available tools
4. Claude decides which tools to use (might call `lookup_customer` then `search_tickets`)
5. Each tool runs, returns data to Claude
6. Claude might call more tools based on what it learned (up to 10 rounds)
7. Claude writes a final response using all the data it gathered
8. Response streams back to the agent in real-time

Nova uses the most powerful model (`claude-opus-4-5`) so it can handle complex, multi-step requests.

---

## Proactive Outreach (Broadcast System)

This is how the app reaches out to customers proactively, rather than waiting for them to contact you.

### When it gets triggered:

- **Pattern Detection finds an outage** → Broadcast to all affected customers: "We know about the issue and are working on it"
- **Health Score drops to critical** → Send intervention email to at-risk customer
- **Stalled Conversation** → Send follow-up message
- **Post-Resolution** → Check-in email 5 days later

### Channels it can use:

- **Email** (via Resend)
- **SMS** (via Twilio)
- **Internal** (adds a message to the ticket)
- **Widget** (pushes to the chat widget)
- **Slack** (sends to Slack)

### Tracking:

Every outreach is logged to `proactive_outreach_log` with:
- Who it was sent to
- What type (check-in, revival, broadcast, intervention)
- What channel
- Whether it was delivered successfully
- What triggered it

---

## How It All Connects

Here's the full picture of data flowing through the system:

```
CUSTOMER SENDS MESSAGE
         |
    [Webhook]
         |
    [AI Router]
    /    |    \
   /     |     \
Auto   Route   Escalate
Reply  Human   to Agent
  |      |        |
  v      v        v
TICKET IN DATABASE ←────────────────────────────┐
         |                                       |
    [Cron Jobs Run Every Few Minutes]             |
         |                                       |
    ┌────┴──────────────────────┐                |
    |                           |                |
  Stalled?──→ Send follow-up   |                |
  SLA risk?─→ Warn agent       |                |
  Pattern?──→ Alert agent      |                |
  Health?───→ Score customer ──→ Critical? ─→ Outreach
  Gaps?─────→ Suggest articles |
  Calibrate?→ Tune AI         |
  Forecast?─→ Predict volume  |
    |                           |
    └───────────────────────────┘
         |
    [Agent Opens Dashboard]
         |
    [Smart Queue sorts tickets]
         |
    [Agent works ticket with Nova's help]
         |
    [Ticket Resolved]
         |
    [5 days later: Check-in email]
```

---

## Database Tables the Automation Uses

| Table | What's stored | Who writes to it |
|-------|--------------|-----------------|
| `tickets` | Every support ticket | Router, agents, cron jobs |
| `messages` | Every message in every ticket | Router, agents, stalled revival |
| `customers` | Customer profiles | Router (auto-create), agents |
| `customer_health_scores` | Health score per customer | Health score cron |
| `sla_policies` | SLA rules per priority | Admin setup |
| `sla_predictions` | Breach probability forecasts | SLA prediction cron |
| `knowledge_articles` | Knowledge base content | Agents/admins |
| `knowledge_article_metrics` | Article effectiveness scores | Article effectiveness cron |
| `knowledge_article_drafts` | Suggested new/retired articles | Gap detection, retirement crons |
| `ai_calibration_data` | Confidence calibration history | Calibration cron |
| `issue_patterns` | Detected cross-customer patterns | Pattern detection cron |
| `volume_forecasts` | Ticket volume predictions | Volume forecast cron |
| `proactive_outreach_log` | Record of every proactive message | All outreach systems |
| `agent_notifications` | Alerts for agents | Pattern, SLA, health crons |
| `channel_inbound_logs` | Raw inbound message logs | Webhooks |
| `channel_config` | Per-channel AI settings | Calibration cron, admin |
| `ticket_queue_scores` | Smart queue rankings | Smart queue operator |
| `workflow_rules` | User-defined automation rules | Admin setup |

---

## Vercel Cron Schedule

The cron jobs are configured in `vercel.json`. Each one runs on a schedule:

| Job | Typical Schedule | Purpose |
|-----|-----------------|---------|
| Pattern Detection | Every 15 min | Catch outages fast |
| SLA Prediction | Every 15-30 min | Warn before breaches |
| Stalled Conversations | Every hour | Re-engage quiet tickets |
| Health Scores | Every few hours | Track customer risk |
| Volume Forecast | Daily | Predict tomorrow's load |
| Post-Resolution Check-In | Daily | Follow up resolved tickets |
| Knowledge Gaps | Weekly | Find missing articles |
| Article Effectiveness | Weekly | Score article quality |
| Article Retirement | Weekly | Flag stale articles |
| Confidence Calibration | Weekly | Tune AI thresholds |
