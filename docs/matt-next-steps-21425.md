# Matt's Next Steps — 2/14/25

## Status: What's Done

- SendGrid API key, webhook secret, email from addresses — all set in Doppler (dev + stg + prd)
- `PORTAL_URL` set to `https://nova.r-link.com/portal` (all environments)
- `NEXT_PUBLIC_APP_URL` set to `https://nova.r-link.com` (all environments)
- Outbound email code fully wired (agent replies, AI/Ava replies, ticket notifications)
- Inbound email webhook code ready at `/api/webhooks/email`
- Email threading headers (Message-ID, In-Reply-To, References) implemented

## What's Left (3 steps, all in SendGrid/DNS)

### 1. Set up a subdomain for inbound email

You need a subdomain so SendGrid can receive customer reply emails. Don't use your root domain — that would hijack all your regular email.

**Pick a subdomain** like `inbound.r-link.com` or `parse.r-link.com`.

**Add an MX record** in your DNS provider (wherever r-link.com is managed):

| Type | Host               | Value              | Priority |
|------|--------------------|--------------------|----------|
| MX   | inbound.r-link.com | mx.sendgrid.net    | 10       |

DNS propagation can take up to 48 hours but usually happens in minutes.

---

### 2. Configure SendGrid Inbound Parse

1. Go to **SendGrid Dashboard** > **Settings** > **Inbound Parse**
2. Click **"Add Host & URL"**
3. Fill in:
   - **Receiving Domain:** `inbound.r-link.com` (whatever subdomain you chose in step 1)
   - **Destination URL:**
     ```
     https://nova.r-link.com/api/webhooks/email?secret=260b36de737df23f6bb7c841a71d58b22baa92ee02410a2a9a9d2b95787183fb
     ```
   - **"POST the raw, full MIME message"** — leave UNCHECKED
   - **"Check incoming emails for spam"** — optional, your call

---

### 3. Tell Claude your inbound subdomain

Once your MX record is live and SendGrid Inbound Parse is configured, tell Claude the subdomain you picked (e.g., `inbound.r-link.com`) and he'll:

- Add a `Reply-To: support@inbound.r-link.com` header to all outbound emails
- Update `INBOUND_EMAIL_ADDRESS` in Doppler to match
- This ensures customer replies route through SendGrid Inbound Parse back into the app

Without this, customer replies go to `support@r-link.com` (your regular inbox) and never reach the app.

---

### Bonus: Full domain authentication (recommended)

Right now you only have **Single Sender Verification** for `support@r-link.com`. This works but has limitations:

- Can only send from that exact address
- Lower deliverability/reputation
- "via sendgrid.net" may show in some email clients

**To upgrade:** SendGrid Dashboard > Settings > Sender Authentication > Authenticate Your Domain

This adds 3 CNAME records to your DNS and lets you send from any `@r-link.com` address with better deliverability.

---

## Quick Reference

### Doppler secrets (all environments: dev + stg + prd)

| Variable | Value |
|----------|-------|
| `SENDGRID_API_KEY` | set |
| `WEBHOOK_EMAIL_SECRET` | set |
| `EMAIL_FROM` | `R-Link Support <support@r-link.com>` |
| `EMAIL_AI_FROM` | `Ava from R-Link Support <support@r-link.com>` |
| `INBOUND_EMAIL_ADDRESS` | `support@r-link.com` (update after step 3) |
| `PORTAL_URL` | `https://nova.r-link.com/portal` |
| `NEXT_PUBLIC_APP_URL` | `https://nova.r-link.com` |

### Webhook endpoint

```
GET  /api/webhooks/email          — health check
POST /api/webhooks/email?secret=  — receives inbound emails from SendGrid
```

### Test inbound email (after all 3 steps complete)

Send an email to `support@inbound.r-link.com` and check:
1. Vercel function logs for the webhook hit
2. `channel_inbound_logs` table in Supabase for the parsed email
3. `tickets` table for the new ticket
4. AI should auto-respond within seconds (check `messages` table)
