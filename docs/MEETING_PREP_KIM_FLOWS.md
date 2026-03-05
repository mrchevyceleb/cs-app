# Meeting Prep: CS App High-Level Flows & Automation
**Date:** March 2026  
**Project:** KG-APPS / cs-app (R-Link Support Ecosystem)

---

## 1. Executive Summary: The "Three Pillars"
The platform isn't just a chat widget; it’s a **State Machine** that manages the customer lifecycle through three integrated engines:

1.  **The Brain (Nova AI Agent):** Uses Claude 3.5 Sonnet + Tools to solve problems using the Knowledge Base and Web.
2.  **The Nervous System (Workflow Engine):** Handles immediate "If/Then" triggers (e.g., *If Urgent, then Alert Slack*).
3.  **The Heartbeat (Cron System):** Manages time-based cadences (e.g., *If no reply in 24h, then follow up*).

---

## 2. Core Operational Flows (The "How it Works")

### A. Inbound & Auto-Triage Flow
*   **Instant Classification:** Every incoming message is processed by **Claude Haiku** in <200ms to set **Priority** (Low to Urgent) and generate a **Subject** line.
*   **Identity Linking:** The system automatically detects email addresses in anonymous chats and merges them with existing customer profiles in Supabase.
*   **Quick Ack:** While the "Heavy" AI is thinking, a 1-sentence acknowledgment is sent to the user to keep the UI feeling "live."

### B. The Agentic "Tool-Use" Loop
Unlike a standard chatbot, Nova uses a **multi-turn loop** (`src/lib/ai-agent/engine.ts`):
1.  **Search KB:** Hits the Vector DB for R-Link specific docs.
2.  **Search Web:** Uses Brave Search if the KB is empty.
3.  **Context Check:** Pulls the last 20 messages and customer metadata.
4.  **Decision:** It chooses to **Resolve**, **Respond**, or **Escalate** based on its "Confidence Score."

### C. The Human Handoff (Smart Escalation)
*   **Real-time Sync:** Uses Supabase Realtime to "pop" escalated tickets into the Agent Dashboard instantly.
*   **AI Copilot:** Even when a human takes over, the AI drafts suggested "Canned Responses" and provides a "Resolution Note" summary of the previous AI-user interaction.

---

## 3. Automation Scenarios (The "If/Then" Cadences)

| Trigger (The "If") | Logic/Engine | Action (The "Then") |
| :--- | :--- | :--- |
| **New Signup + No Room Created** | `api/cron/lifecycle` | Send "Getting Started" email after 24 hours. |
| **Urgent Message + No Reply > 15m** | `lib/workflow/engine` | Trigger Slack Alert + SMS to Support Team. |
| **Ticket Marked 'Resolved'** | `api/cron/post-resolution` | Wait 4h, then send CSAT Feedback Survey. |
| **Basic User Hits 'Webinar' Page** | `api/proactive/outreach` | Trigger "Business Plan" upsell email with PDF guide. |
| **Customer 'Ghosts' AI Response** | `api/cron/stalled-conv` | Send "Checking in" email after 24h; Auto-close after 3 days. |
| **Negative Feedback (1-2 Stars)** | `lib/workflow/engine` | Re-open ticket + Assign to Manager immediately. |

---

## 4. Technical Validation (Proof for Kim)
*   **Security:** Uses **PostgreSQL RLS** (Row Level Security) to ensure AI only "sees" the current customer's data.
*   **Speed:** Uses a "Haiku-First" architecture for triage to minimize latency.
*   **Reliability:** Built-in **LLM Fallbacks**—if the primary AI model is rate-limited, the system automatically switches to a backup provider to prevent downtime.
*   **Knowledge Coverage:** 57+ distinct documentation routes covering every R-Link feature from "Media Controls" to "Live Auctions."

---

## 5. Key "Flex" Points for the Meeting
*   **"Proactive, not Reactive":** We aren't just waiting for them to complain; the **Lifecycle Cron** catches them before they churn.
*   **"Agentic, not Scripted":** The AI isn't following a flowchart; it's using tools to find the best answer in real-time.
*   **"Human-in-the-Loop":** The system is designed to make humans 10x faster, not just replace them.
