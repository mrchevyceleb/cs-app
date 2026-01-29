# R-Link Plans, Pricing & Billing

## Overview

R-Link offers two subscription plans -- **Basic** and **Business** -- designed to serve individuals, small teams, and organizations of varying sizes. Both plans include unlimited meeting length and access to the Admin portal. The Business plan unlocks advanced features including webinars, live streaming, expanded branding, AI tools, and a broader set of interactive elements.

This document provides the complete feature comparison, exact plan limits, feature gating logic, billing details, usage tracking, upgrade/downgrade flows, and frequently asked questions about plans and pricing.

---

## Plan Comparison Tables

### Table 1: Room & Participant Limits

| Feature | Basic | Business |
|---------|-------|----------|
| Rooms (EventFolders) | 1 | 5 (parallel) |
| Interactive Participants per Meeting | Up to 50 | Up to 100 |
| Meeting Length | Unlimited | Unlimited |
| Webinar Attendees | Not available | Up to 1,000 |
| Live Stream Viewers | Not available | Unlimited (via RTMP) |
| Breakout Rooms | 1 | Unlimited |
| Whiteboards | 1 | Unlimited |
| Team Members | Up to 3 (default limit) | Expanded (configurable) |

### Table 2: Session Types

| Session Type | Basic | Business |
|-------------|-------|----------|
| Meeting | Yes | Yes |
| Webinar | No | Yes |
| Live Stream | No | Yes |

### Table 3: Elements (Interactive Overlays)

| Element Type | Basic | Business |
|-------------|-------|----------|
| Slides | Yes (Core Media) | Yes |
| Video | Yes (Core Media) | Yes |
| Audio | Yes (Core Media) | Yes |
| Links | No | Yes |
| Banners | No | Yes |
| Polls | No | Yes |
| Website Overlays | No | Yes |
| Prompter | No | Yes |

**Core Media** includes Slides, Video, and Audio -- available on all plans.

**All Elements** adds Links, Banners, Polls, Website Overlays, and Prompter -- available only on the Business plan.

### Table 4: Branding & Customization

| Feature | Basic | Business |
|---------|-------|----------|
| Branded Backgrounds | Yes | Yes |
| Custom Logo | Limited | Full |
| CTA Button | No | Yes |
| Exit URL | No | Yes |
| Waiting Room Customization | No | Yes |
| Vanity URL | No | Yes |
| Full Branding Suite | No | Yes |

**Full Branding Suite** includes: Branded Background, CTA Button, Exit URL, Custom Waiting Room, and Vanity URL.

### Table 5: Storage & Media

| Feature | Basic | Business |
|---------|-------|----------|
| Storage | 10 GB | 50 GB |
| Recording | Yes | Yes |
| Clips (Repurposed) | Yes | Yes |
| Clip Sharing | Yes | Yes |
| Clip Analytics | Basic | Advanced |

### Table 6: AI & Communication

| Feature | Basic | Business |
|---------|-------|----------|
| R-Link AI Notetaker | No | Yes |
| R-Link AI Translation | No | Yes |
| Phone Dial-in | No | Yes |
| Phone Conferencing | No | Yes |

**R-Link AI Suite** includes the AI Notetaker (transcription + summarization) and AI Translation (real-time multilingual support). Both require the Business plan.

### Table 7: Platform & Administration

| Feature | Basic | Business |
|---------|-------|----------|
| Admin Portal | Yes (all 18 tabs) | Yes (all 18 tabs) |
| Custom Roles | Yes (via Roles tab, owner-only) | Yes |
| Room Templates | Yes | Yes |
| Integrations | SSO + Calendar only | All 21+ integrations |
| Webhooks | No | Yes |
| API Keys | No | Yes |
| Event Landing Pages | No | Yes |
| Lead Management | No | Yes |

---

## Exact Plan Limits (from Code)

### Default Account Limits Object

When a new account is created, it receives the following default limits:

```
Account.limits = {
  max_rooms: 5,
  max_storage_gb: 10,
  max_attendees: 100,
  max_team_members: 3
}
```

**Note:** The default `max_rooms` value of 5 and `max_attendees` of 100 in the code represent the upper bounds. Plan-level enforcement further restricts these values:

| Limit Field | Basic (Enforced) | Business (Enforced) | Default (Code) |
|------------|------------------|--------------------| --------------|
| `max_rooms` | 1 | 5 | 5 |
| `max_storage_gb` | 10 | 50 | 10 |
| `max_attendees` | 50 | 100 | 100 |
| `max_team_members` | 3 | Expanded | 3 |

### Default Account Configuration

```
Account = {
  plan: 'basic',
  billing_cycle: 'monthly',
  limits: {
    max_rooms: 5,
    max_storage_gb: 10,
    max_attendees: 100,
    max_team_members: 3
  }
}
```

---

## Feature Gating Details

Feature gating in R-Link uses plan-based checks to determine whether a feature is available to the current user. The gating logic evaluates the `Account.plan` field.

### Gate Conditions

| Feature Gate | Condition | UI Behavior When Gated |
|-------------|-----------|----------------------|
| Webinar session type | `plan === 'business'` | Session type selector shows "Business" badge; clicking shows upgrade prompt |
| Live Stream session type | `plan === 'business'` | Session type selector shows "Business" badge; clicking shows upgrade prompt |
| Advanced Elements (Links, Banners, Polls, Website Overlays, Prompter) | `plan === 'business'` | Element picker shows lock icon; clicking shows upgrade modal |
| Full Branding Suite (CTA, Exit URL, Waiting Room, Vanity URL) | `plan === 'business'` | Brand kit fields are disabled with "Upgrade to Business" tooltip |
| AI Notetaker | `plan === 'business'` | Notetaker toggle is disabled; shows upgrade prompt |
| AI Translation | `plan === 'business'` | Translation option hidden or disabled with upgrade prompt |
| Phone Dial-in | `plan === 'business'` | Dial-in section shows "Business feature" badge |
| Multi-platform Streaming | `plan === 'business'` | Streaming destination selector shows upgrade prompt for RTMP targets |
| Advanced Integrations | `plan === 'business'` | Integration cards show lock icon; connecting shows upgrade modal |
| Event Landing Pages | `plan === 'business'` | Event Landing tab shows upgrade prompt |
| Lead Management | `plan === 'business'` | Leads tab shows upgrade prompt |
| Webhooks & API Keys | `plan === 'business'` | Integration sub-section disabled with upgrade prompt |
| Room count > 1 | `plan === 'business'` | "Create Room" button disabled when at limit; shows upgrade prompt |
| Breakout Rooms > 1 | `plan === 'business'` | "Add Breakout Room" button disabled after 1st; shows upgrade prompt |
| Whiteboards > 1 | `plan === 'business'` | "Add Whiteboard" button disabled after 1st; shows upgrade prompt |
| Participants > 50 | `plan === 'business'` | Participant join is blocked at 50 on Basic; shows capacity message |

### Limit Enforcement

Limits are enforced at both the UI level (disabling controls) and the backend level (API rejections). When a limit is reached:

1. **UI Level:** The relevant button or control becomes disabled with a tooltip or modal explaining the limit.
2. **API Level:** If the UI check is bypassed, the backend rejects the action with an appropriate error.
3. **Upgrade Prompt:** A modal or inline message offers the option to upgrade to the Business plan.

---

## Billing

### Billing Cycles

| Cycle | Description | Discount |
|-------|------------|----------|
| Monthly | `billing_cycle: 'monthly'` | Standard pricing |
| Annual | `billing_cycle: 'annual'` | Discounted (typically 15-20% savings) |

### Payment Methods

R-Link accepts the following payment methods through integrated payment processors:
- Credit/debit cards (Visa, Mastercard, American Express)
- PayPal (via PayPal integration)
- Stripe-supported payment methods (ACH, SEPA, etc., depending on region)

### Invoice History

Accessible via **Admin > Billing** (Owner-only tab):
- View all past invoices with dates, amounts, and status
- Download invoices as PDF
- Filter by date range
- View payment method used for each invoice

### Billing Entity Fields

The Account entity tracks billing-related data:

```
Account = {
  plan: 'basic' | 'business',
  billing_cycle: 'monthly' | 'annual',
  payment_method: { type, last_four, expiry },
  billing_email: 'owner@example.com',
  next_billing_date: 'YYYY-MM-DD',
  subscription_status: 'active' | 'past_due' | 'canceled' | 'trialing'
}
```

---

## Usage Tracking

R-Link tracks usage metrics in real-time to enforce plan limits and provide visibility into account consumption.

### Tracked Metrics

| Metric | Field | Description | Where Displayed |
|--------|-------|-------------|-----------------|
| Active Rooms | `usage.active_rooms` | Number of currently active (live) rooms | Admin > Dashboard |
| Storage Used | `usage.storage_used_gb` | Total storage consumed by recordings, clips, and media (in GB) | Admin > Dashboard, Admin > Recordings |
| Attendees This Month | `usage.attendees_this_month` | Cumulative unique attendees across all sessions in the current billing month | Admin > Dashboard |
| Hours Streamed | `usage.hours_streamed` | Total hours of live streaming in the current billing period | Admin > Dashboard |

### Usage Display

The Admin > Dashboard tab shows usage metrics with visual progress bars:

```
Storage:    ████████░░  8.2 / 10 GB (82%)
Rooms:      █░░░░░░░░░  1 / 1 (100%)
Attendees:  ████░░░░░░  42 / 50 (84%)
```

### Near-Limit Warnings (80% Threshold)

When any usage metric reaches 80% of the plan limit, R-Link displays warning notifications:

| Metric | 80% Threshold (Basic) | 80% Threshold (Business) | Warning Behavior |
|--------|----------------------|--------------------------|-----------------|
| Storage | 8 GB of 10 GB | 40 GB of 50 GB | Yellow warning banner on Dashboard; optional email notification |
| Rooms | N/A (1 room, binary) | 4 of 5 rooms | Warning when creating 4th room |
| Attendees | 40 of 50 | 80 of 100 | Warning banner during active session when approaching limit |
| Team Members | N/A (3 is default) | 80% of limit | Warning when adding team members near limit |

**Warning notification includes:**
- Current usage value and limit
- Percentage used
- Upgrade CTA button (if on Basic plan)
- Link to manage storage/resources (if on Business plan)

### At-Limit Behavior

When a limit is reached (100%):

| Metric | Basic Behavior | Business Behavior |
|--------|---------------|-------------------|
| Storage (100%) | Cannot upload new recordings or media; existing content accessible | Cannot upload; prompt to delete old content or request storage increase |
| Rooms (100%) | "Create Room" button disabled; shows upgrade prompt | "Create Room" button disabled; shows contact sales prompt |
| Attendees (100%) | New participants see "Session Full" message | New participants see "Session Full" message |
| Team Members (100%) | "Invite" button disabled; shows upgrade prompt | "Invite" button disabled; shows contact sales prompt |

---

## Upgrade Flow

### Basic to Business Upgrade

**Step-by-step process:**

1. User navigates to **Admin > Billing** (must be account Owner)
2. Current plan section shows "Basic" with an **"Upgrade to Business"** button
3. User clicks the upgrade button
4. A comparison modal appears showing Basic vs Business features
5. User selects billing cycle (Monthly or Annual)
6. User enters or confirms payment information
7. User reviews the order summary (prorated charges if mid-cycle)
8. User clicks **"Confirm Upgrade"**
9. Account is immediately updated:
   - `Account.plan` changes from `'basic'` to `'business'`
   - `Account.limits` are updated to Business values
   - All Business features are unlocked immediately
10. Confirmation page/modal with summary of new capabilities
11. Confirmation email sent to billing email

**Proration:** If upgrading mid-billing-cycle, the user is charged a prorated amount for the remaining days at the Business rate, minus credit for the unused Basic portion.

### Contextual Upgrade Prompts

Users may also encounter upgrade prompts when attempting to use gated features:
- Clicking a locked Element type
- Trying to create a second room on Basic
- Attempting to launch a Webinar or Live Stream on Basic
- Trying to connect a Business-only integration

Each contextual prompt includes:
- Explanation of why the feature requires Business
- Preview of what the feature does
- **"Upgrade Now"** button (redirects to Admin > Billing)
- **"Learn More"** link (opens plan comparison)

---

## Downgrade Flow

### Business to Basic Downgrade

**Step-by-step process:**

1. User navigates to **Admin > Billing** (must be account Owner)
2. Current plan section shows "Business" with a **"Change Plan"** or **"Downgrade"** link
3. User clicks to view plan options
4. A warning screen appears explaining what will be lost:
   - Webinar and Live Stream capabilities
   - Advanced Elements (Links, Banners, Polls, Website Overlays, Prompter)
   - Full Branding Suite features
   - AI Notetaker and Translation
   - Phone dial-in and conferencing
   - Advanced integrations
   - Rooms beyond 1
   - Storage beyond 10 GB
5. If storage usage exceeds 10 GB, user must delete content to get below the Basic limit before downgrading
6. If more than 1 room exists, user must archive/delete rooms to have only 1 active room
7. User confirms the downgrade
8. Downgrade takes effect at the end of the current billing cycle (user retains Business features until then)
9. `Account.plan` changes to `'basic'` at cycle end
10. Confirmation email sent with effective date

**Important:** Downgrade is not immediate. The user retains Business features until the end of the current paid period.

### Data Retention on Downgrade

| Data Type | Behavior After Downgrade |
|-----------|------------------------|
| Recordings | Retained if within 10 GB limit; excess must be deleted before downgrade |
| Rooms | Only 1 room remains active; others are archived (data preserved but inaccessible) |
| Elements | Core Media elements remain; Business-only elements are deactivated (not deleted) |
| Brand Kit | Basic branding features remain; Business features (CTA, Exit URL, Vanity URL) are deactivated |
| Team Members | Members beyond limit are deactivated (not deleted) |
| Integrations | Business-only integrations are disconnected |
| AI Transcripts | Existing transcripts remain accessible; new transcription is disabled |
| Scheduled Webinars/Streams | Canceled with notification to registered attendees |

---

## Cancellation

### Subscription Cancellation

1. Navigate to **Admin > Billing** (Owner-only)
2. Click **"Cancel Subscription"** link
3. Cancellation survey appears (optional feedback)
4. Confirm cancellation
5. Access continues until end of current billing period
6. Account transitions to a free/inactive state after expiration
7. Data is retained for a grace period (typically 30 days) before permanent deletion

### Reactivation

If a customer cancels and wishes to reactivate:
1. Log in with existing credentials
2. Navigate to **Admin > Billing**
3. Select a plan and enter payment information
4. If within the grace period, all previous data is restored
5. If past the grace period, account starts fresh

---

## Settings and Options

### Billing Settings (Admin > Billing)

| Setting | Description | Access |
|---------|-------------|--------|
| Current Plan | Displays Basic or Business with plan details | Owner |
| Billing Cycle | Monthly or Annual toggle | Owner |
| Payment Method | Add, update, or remove payment methods | Owner |
| Billing Email | Email address for invoices and billing notifications | Owner |
| Invoice History | List of all past invoices with download option | Owner |
| Auto-Renewal | Toggle automatic subscription renewal | Owner |
| Cancel/Downgrade | Options to change or cancel subscription | Owner |

---

## Troubleshooting

### Common Billing Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Upgrade to Business" button not visible | User is not the account Owner | Only the Owner can access Billing; contact the account Owner |
| Payment failed | Expired or declined card | Update payment method in Admin > Billing |
| Charged after cancellation | Cancellation takes effect at end of billing cycle | Charge is for the remaining pre-paid period; no refund for unused time |
| Features still locked after upgrade | Browser cache or stale session | Hard refresh the page (Ctrl+Shift+R); if persisting, log out and back in |
| Storage warning despite low usage | Cached recordings counting toward storage | Check Admin > Recordings for processing/temporary files |
| Plan shows "basic" after upgrade | API update delay or failed payment | Check payment status; if paid, wait 5 minutes and refresh; contact support if persisting |
| Cannot downgrade due to storage | Storage exceeds Basic limit (10 GB) | Delete recordings/clips to reduce storage below 10 GB |
| Cannot downgrade due to rooms | More than 1 active room | Archive or delete extra rooms |
| Invoice not received | Incorrect billing email | Verify billing email in Admin > Billing; check spam folder |
| Proration amount seems wrong | Mid-cycle upgrade calculation | Proration credits remaining Basic days and charges remaining Business days in the cycle |

---

## FAQ

**Q1: What is included in the Basic plan?**
A: The Basic plan includes 1 Room, up to 50 interactive participants, unlimited meeting length, 1 Breakout Room, 1 Whiteboard, Core Media elements (Slides/Video/Audio), 10 GB storage, branded backgrounds, and full access to the Admin portal with all 18 tabs.

**Q2: What does the Business plan add over Basic?**
A: Business adds 5 parallel rooms, 100 interactive participants, Webinars (up to 1,000 attendees), multi-platform live streaming (RTMP), unlimited breakout rooms and whiteboards, all Elements (Links/Banners/Polls/Website Overlays/Prompter), Full Branding Suite, R-Link AI Suite (Notetaker + Translation), 50 GB storage, phone dial-in and conferencing, all 21+ integrations, Event Landing Pages, Lead Management, Webhooks, and API Keys.

**Q3: Can I try Business features before upgrading?**
A: Contact the R-Link sales team to inquire about trial or demo options for Business plan features.

**Q4: How does annual billing work?**
A: Annual billing charges once per year at a discounted rate (typically 15-20% less than monthly). The full annual amount is charged upfront.

**Q5: What happens if I exceed my storage limit?**
A: At 80% capacity, you receive a warning notification. At 100%, you cannot upload new recordings or media. Existing content remains accessible. You can free space by deleting old recordings/clips or upgrade to Business for more storage.

**Q6: Can I change from monthly to annual billing?**
A: Yes. Navigate to Admin > Billing and select the annual option. The change takes effect at the start of the next billing cycle, or you may be offered immediate switch with prorated credit.

**Q7: Is there a free plan?**
A: R-Link does not currently offer a permanent free plan. New accounts default to the Basic plan. Contact sales for trial options.

**Q8: How are attendees counted?**
A: `attendees_this_month` tracks unique attendees across all sessions in the current billing month. The same person attending multiple sessions counts once.

**Q9: What happens to my data if I cancel?**
A: Your data is retained for a 30-day grace period after cancellation. During this time, you can reactivate and restore all data. After the grace period, data is permanently deleted.

**Q10: Can I have multiple payment methods?**
A: You can store multiple payment methods, but only one is designated as the primary method for subscription charges.

**Q11: Do integrations require the Business plan?**
A: SSO (Google, Microsoft) and Calendar integrations (Google Calendar, Outlook, iCal) are available on Basic. All other integrations (email marketing, CRM, payments, streaming platforms, Twilio, webhooks, API keys) require the Business plan.

**Q12: What is the max_team_members default?**
A: The default limit is 3 team members. This is the initial value set in the Account.limits object when a new account is created.

**Q13: How do I request a custom plan or enterprise pricing?**
A: Contact the R-Link sales team for custom plans with higher limits, dedicated support, or enterprise-specific features.

---

## Known Limitations

1. **No mid-cycle downgrade:** Downgrading from Business to Basic takes effect at the end of the current billing cycle. Immediate downgrade is not supported.
2. **Storage must be reduced before downgrade:** If storage exceeds the Basic limit (10 GB), the user must manually delete content before the downgrade can be processed.
3. **No plan pause:** There is no option to temporarily pause a subscription; cancellation is the only option.
4. **Single billing owner:** Only the account Owner can manage billing. Delegation to admin roles for billing management is not supported.
5. **Currency:** Pricing is displayed in a single currency; multi-currency support is not currently available.
6. **Prorated refunds:** Refunds for mid-cycle downgrades or cancellations are generally not provided; access continues until the end of the paid period.
7. **Team member limit on downgrade:** Excess team members are deactivated, not deleted. Re-activating them requires upgrading back to Business.
8. **Annual billing commitment:** Annual subscriptions cannot be converted to monthly mid-term. The change takes effect at renewal.
9. **Feature gating is binary:** There is no per-feature add-on purchasing; all Business features are bundled together.
10. **Default limits in code vs. plan enforcement:** The code default Account object shows `max_rooms: 5` and `max_attendees: 100`, but Basic plan enforcement restricts these to 1 room and 50 attendees respectively. The higher defaults serve the Business plan.

---

## Plan Requirements

This document itself defines the plan requirements for all features. Use the comparison tables above as the authoritative reference.

---

## Related Documents

- [00-index.md](00-index.md) -- Master index and question routing
- [01-platform-overview.md](01-platform-overview.md) -- Platform architecture and feature reference
- [03-getting-started.md](03-getting-started.md) -- Registration, onboarding, and first session
- [31-troubleshooting.md](31-troubleshooting.md) -- Troubleshooting, diagnostics, and known limitations
