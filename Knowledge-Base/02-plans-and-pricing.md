# Plans and Pricing

## Overview

R-Link offers two subscription plans: **Basic** and **Business**. The Basic plan is designed for small teams that primarily need meeting functionality, while the Business plan unlocks the full platform including webinars, live streaming, advanced branding, AI features, and a comprehensive integration ecosystem. Both plans are available on monthly or annual billing cycles. Usage is tracked in real-time, and customers receive warnings when approaching their plan limits.

---

## Complete Plan Comparison

### Core Capabilities

| Feature | Basic | Business |
|---|---|---|
| **Session Types** | Meeting only | Meeting + Webinar + Live Stream |
| **Meeting Length** | Unlimited | Unlimited |
| **Rooms** | 1 | 5 (can run in parallel) |
| **Interactive Participants** | Up to 50 per meeting | Up to 100 per meeting |
| **Webinar Attendees** | Not available | Up to 1,000 |
| **Breakout Rooms** | 1 | Unlimited |
| **Whiteboards** | 1 | Unlimited |

### Elements

| Element Type | Basic | Business |
|---|---|---|
| Core Media (Slides) | Yes | Yes |
| Core Media (Video) | Yes | Yes |
| Core Media (Audio) | Yes | Yes |
| Links | No | Yes |
| Banners | No | Yes |
| Polls | No | Yes |
| Website Overlays | No | Yes |
| Prompter | No | Yes |

### Branding

| Branding Feature | Basic | Business |
|---|---|---|
| Branded Backgrounds | Yes | Yes |
| Custom Background Colors | Yes (via Brand Kit) | Yes (via Brand Kit) |
| Custom CTA Button | No | Yes |
| Custom Exit URL | No | Yes |
| Custom Waiting Room | No | Yes |
| Vanity URL | No | Yes |
| Full Branding Suite | No | Yes |

### Storage and Media

| Feature | Basic | Business |
|---|---|---|
| Storage | 10 GB | 50 GB |
| Recordings | Yes | Yes |
| Clips | Yes | Yes |

### AI and Communication

| Feature | Basic | Business |
|---|---|---|
| AI Notetaker | No | Yes |
| AI Translation | No | Yes |
| Phone Dial-in | No | Yes |
| Phone Conferencing | No | Yes |

### Streaming

| Feature | Basic | Business |
|---|---|---|
| Multi-platform Live Streaming (RTMP) | No | Yes |
| YouTube Live | No | Yes |
| Facebook Live | No | Yes |
| Twitch | No | Yes |
| LinkedIn Live | No | Yes |

### Administration

| Feature | Basic | Business |
|---|---|---|
| Admin Portal | Yes | Yes |
| Team Management | Yes | Yes |
| Role-based Permissions | Yes | Yes |

### Integrations

| Integration Category | Basic | Business |
|---|---|---|
| Calendar (Google Calendar, Outlook, iCal) | Yes | Yes |
| Email (Mailchimp, SendGrid) | No | Yes |
| Payment (Stripe, PayPal) | No | Yes |
| Cloud Storage (Google Drive, Dropbox) | No | Yes |
| SSO (Google SSO, Microsoft SSO) | No | Yes |
| CRM (Salesforce, HubSpot, Marketo, ActiveCampaign, ConvertKit, Go High Level) | No | Yes |
| SMS (Twilio) | No | Yes |
| Webhooks | No | Yes |
| API Keys | No | Yes |

---

## Exact Plan Limits

### Basic Plan Limits

| Limit | Value |
|---|---|
| Maximum Rooms | 1 |
| Maximum Interactive Participants per Meeting | 50 |
| Maximum Breakout Rooms per Session | 1 |
| Maximum Whiteboards per Session | 1 |
| Maximum Storage | 10 GB |
| Maximum Team Members | 3 (default account setting) |
| Webinar Attendees | Not available |
| RTMP Streaming | Not available |

### Business Plan Limits

| Limit | Value |
|---|---|
| Maximum Rooms (parallel) | 5 |
| Maximum Interactive Participants per Meeting | 100 |
| Maximum Webinar Attendees | 1,000 |
| Maximum Breakout Rooms per Session | Unlimited |
| Maximum Whiteboards per Session | Unlimited |
| Maximum Storage | 50 GB |
| Maximum Team Members | Configurable (higher than Basic) |
| RTMP Streams | Multi-platform simultaneous |

### Default Account Object Limits

When an account is created, the following default limits are set in the Account entity:

```
limits: {
  max_rooms: 5,
  max_storage_gb: 10,
  max_attendees: 100,
  max_team_members: 3
}
```

Note: These default values represent the initial configuration. Actual enforced limits depend on the subscription plan (`plan` field: `basic` or `business`).

---

## Feature Gating Details

Feature gating is enforced at multiple levels in the R-Link platform:

### Plan-Level Gating

The `Account` entity has a `plan` field (values: `basic` or `business`). Feature availability checks compare the user's account plan against feature requirements.

| Gated Feature | Gate Condition | User Experience When Blocked |
|---|---|---|
| Webinar session type | `plan !== 'business'` | Session type option disabled or hidden; upgrade prompt shown |
| Live Stream session type | `plan !== 'business'` | Session type option disabled or hidden; upgrade prompt shown |
| Non-core Elements | `plan !== 'business'` | Element appears locked in the Elements panel with upgrade badge |
| Full Branding Suite | `plan !== 'business'` | Brand Kit shows limited options; advanced fields locked |
| AI Notetaker | `plan !== 'business'` | Notetaker toggle disabled; upgrade prompt in admin tab |
| AI Translation | `plan !== 'business'` | Translation option hidden or disabled in session |
| Phone Dial-in | `plan !== 'business'` | Dial-in section not shown in session setup |
| RTMP Streaming | `plan !== 'business'` | Streaming destinations section hidden; no RTMP output options |
| Most Integrations | `plan !== 'business'` | Integration cards show "Business plan required" badge |

### Limit-Level Gating

Even within a plan, usage limits are enforced:

| Limit | Enforcement |
|---|---|
| Room count | Cannot create new rooms when `active_rooms >= max_rooms` |
| Storage | Upload blocked when `storage_used_gb >= max_storage_gb` |
| Participants | Additional participants cannot join when room is at capacity |
| Team members | Cannot invite new members when team is at limit |

---

## Billing

### Billing Cycles

| Cycle | Value | Description |
|---|---|---|
| Monthly | `monthly` | Billed every month |
| Annual | `annual` | Billed once per year (typically at a discount) |

The billing cycle is stored in the `Account` entity as `billing_cycle`.

### Account Billing Fields

The `Account` entity tracks the following billing-related fields:

| Field | Type | Description |
|---|---|---|
| `plan` | String | Current plan: `basic` or `business` |
| `billing_cycle` | String | Current cycle: `monthly` or `annual` |
| `plan_status` | String | Subscription status (e.g., `active`, `past_due`, `canceled`, `trialing`) |
| `payment_method` | Object | Stored payment method details |
| `billing_history` | Array | List of past invoices and payments |
| `next_billing_date` | Date | Date of next scheduled payment |
| `subscription_start_date` | Date | When the current subscription period began |

### Payment Methods

R-Link supports payment processing through integrated payment providers:
- **Stripe**: Credit/debit card payments, ACH transfers
- **PayPal**: PayPal balance and linked payment methods

Payment method management is available in the **Billing** admin tab (owner-only access).

### Invoice and Billing History

Customers can view and download billing history from the **Billing** admin tab:
- List of all past invoices with dates, amounts, and status
- Download individual invoices as PDF
- View payment method used for each transaction
- See upcoming charges and next billing date

---

## Usage Tracking

R-Link tracks usage in real-time on the Account entity. The following metrics are monitored:

| Metric | Field | Description |
|---|---|---|
| Active Rooms | `active_rooms` | Number of currently active/configured rooms |
| Storage Used | `storage_used_gb` | Total storage consumed in GB (recordings, clips, uploads) |
| Attendees This Month | `attendees_this_month` | Cumulative unique attendees in current billing period |
| Hours Streamed | `hours_streamed` | Total streaming hours in current billing period |

### Near Limit Warnings

The platform triggers **"Near Limit" warnings** when usage reaches **80% of the plan limit** for any tracked metric.

| Metric | Basic 80% Threshold | Business 80% Threshold | Warning Location |
|---|---|---|---|
| Rooms | 1 of 1 (always at limit) | 4 of 5 | Dashboard, Room creation UI |
| Storage | 8 GB of 10 GB | 40 GB of 50 GB | Dashboard, Upload UI, Recordings tab |
| Participants (per session) | 40 of 50 | 80 of 100 | Dashboard, active session indicator |
| Team Members | 2 of 3 (default) | Depends on limit | Dashboard, Team tab |

**Warning behavior:**
- A banner or notification appears in the Admin Dashboard
- The specific feature area (e.g., room creation, file upload) shows an inline warning
- The warning message includes the current usage, the limit, and a link to upgrade (for Basic users) or contact support (for Business users at hard limits)

---

## Upgrade Flow

### Basic to Business Upgrade

1. Customer navigates to **Admin > Billing** tab (or clicks an upgrade prompt anywhere in the platform)
2. Plan comparison is displayed showing the customer's current plan and Business features
3. Customer selects **Business** plan
4. Customer selects billing cycle (monthly or annual)
5. Customer enters or confirms payment method
6. Payment is processed
7. Account `plan` field is updated to `business`
8. All Business features are immediately unlocked
9. Usage limits are updated to Business tier values
10. Confirmation email is sent

### Downgrade (Business to Basic)

1. Customer navigates to **Admin > Billing** tab
2. Customer selects **Basic** plan
3. A warning is displayed listing features that will be lost:
   - Webinar and Live Stream session types
   - Non-core Elements (Links, Banners, Polls, Website Overlays, Prompter)
   - Full Branding Suite features (CTA button, Exit URL, Waiting Room, Vanity URL)
   - AI Suite (Notetaker + Translation)
   - Phone dial-in
   - RTMP streaming
   - Most integrations
   - Rooms beyond 1 will become inactive
   - Storage exceeding 10 GB may require cleanup
4. Customer confirms the downgrade
5. Downgrade takes effect at the end of the current billing period
6. The `plan` field is updated to `basic` when the current period ends
7. Confirmation email is sent

### Mid-Cycle Changes

- **Upgrade (Basic to Business)**: Takes effect immediately. Prorated charge for the remainder of the billing period.
- **Downgrade (Business to Basic)**: Takes effect at the end of the current billing period. No partial refund for unused time.

---

## Settings and Options

### Billing Tab Settings

| Setting | Type | Description | Access |
|---|---|---|---|
| Current Plan | Display | Shows `Basic` or `Business` | Owner-only |
| Billing Cycle | Selector | Monthly or Annual | Owner-only |
| Plan Status | Display | Active, Past Due, Canceled, Trialing | Owner-only |
| Payment Method | Form | Add/update payment card or PayPal | Owner-only |
| Auto-Renew | Toggle | Whether subscription auto-renews | Owner-only |
| Billing Email | Text field | Email for invoices and billing notifications | Owner-only |
| Invoice History | Table | List of past invoices with download links | Owner-only |
| Usage Summary | Display | Current usage vs. plan limits | Owner-only |

### Usage Dashboard Widgets

| Widget | Description |
|---|---|
| Storage Usage | Bar chart showing `storage_used_gb` / `max_storage_gb` |
| Room Usage | Count of `active_rooms` / `max_rooms` |
| Attendee Count | Monthly cumulative attendee count |
| Streaming Hours | Monthly cumulative hours streamed |

---

## Troubleshooting

### Billing and Payment Issues

| Issue | Cause | Solution |
|---|---|---|
| "Payment failed" error during upgrade | Invalid or expired payment method | Update payment method in Billing tab; try a different card |
| Plan still shows "Basic" after upgrade | Payment processing delay or failure | Check billing history for the charge; if absent, retry upgrade; if charged but not updated, escalate to support |
| "Past Due" plan status | Failed automatic renewal payment | Update payment method; the system will retry the charge |
| Cannot access Billing tab | Not the account owner | Only the account owner (matching `owner_email`) can access Billing; contact your account owner |
| Double charge on invoice | Billing cycle overlap during upgrade | Check invoice details; prorated charges may appear as separate line items; if genuine duplicate, escalate to support |
| Features locked after upgrade | Browser cache showing old plan data | Hard refresh the browser (Ctrl+Shift+R); if persists, log out and back in |
| Annual subscription charged monthly rate | Billing cycle not changed before upgrade | Check `billing_cycle` in Billing tab; contact support to correct |

### Usage Limit Issues

| Issue | Cause | Solution |
|---|---|---|
| "Room limit reached" when creating a room | `active_rooms >= max_rooms` | Delete or deactivate unused rooms; or upgrade to Business for more rooms |
| "Storage full" when uploading | `storage_used_gb >= max_storage_gb` | Delete old recordings/clips; or upgrade for more storage |
| "Session full" when participant joins | Room at capacity | Attendees beyond the limit cannot join; upgrade for higher capacity |
| Near-limit warning appears but usage seems low | Cached usage data | Refresh the Dashboard; usage metrics update in near-real-time but may have brief delays |

---

## FAQ

**Q: How do I upgrade from Basic to Business?**
A: Navigate to Admin > Billing, select the Business plan, choose your billing cycle, enter payment details, and confirm. The upgrade takes effect immediately.

**Q: Can I switch from monthly to annual billing?**
A: Yes. Go to Admin > Billing and change the billing cycle. The new cycle takes effect at the next renewal date.

**Q: What happens if I downgrade from Business to Basic?**
A: The downgrade takes effect at the end of your current billing period. You retain Business features until then. After downgrade: rooms beyond 1 become inactive, storage exceeding 10 GB may require cleanup, and Business-only features (webinars, streaming, AI, advanced elements, advanced branding, most integrations) become unavailable.

**Q: Do I get a refund if I downgrade mid-cycle?**
A: No. Downgrades take effect at the end of the current billing period. You continue to have access to Business features for the remainder of the paid period.

**Q: Is there a free trial?**
A: Check the `plan_status` field for `trialing` status. Trial availability and duration depend on current promotional offers. Contact support for current trial options.

**Q: What happens when I hit my storage limit?**
A: New uploads and recordings are blocked. You receive a notification to either delete existing files or upgrade your plan. Existing files remain accessible.

**Q: Can I purchase additional storage without upgrading?**
A: The current plan structure offers fixed storage tiers (10 GB for Basic, 50 GB for Business). Contact support to discuss options for additional storage beyond your plan's allocation.

**Q: How is participant count calculated?**
A: Interactive participants are users who join a session with the ability to enable camera/microphone. For meetings, this includes all attendees. For webinars, interactive participants are hosts and speakers; the 1,000 attendee limit is for view-only audience members.

**Q: What payment methods are accepted?**
A: Credit cards, debit cards, and PayPal (via Stripe and PayPal integrations). ACH transfers may also be available through Stripe.

**Q: Where can I find my invoices?**
A: Admin > Billing tab > Invoice History section. Only the account owner can access this tab.

**Q: What does "parallel rooms" mean on the Business plan?**
A: Business plan allows up to 5 rooms to run active sessions simultaneously. This is useful for organizations running multiple concurrent meetings, webinars, or streams.

---

## Known Limitations

1. **Owner-Only Billing Access**: Only the account owner (the user whose email matches `owner_email`) can access the Billing tab. There is no way to delegate billing management to another team member.
2. **No Per-Feature Add-Ons**: Features cannot be individually purchased. The only way to access Business features is to upgrade to the Business plan.
3. **Downgrade Data Handling**: When downgrading from Business to Basic, rooms beyond the Basic limit (1) are deactivated but not deleted. However, storage exceeding the Basic limit (10 GB) may need manual cleanup.
4. **Billing Cycle Lock**: Changing billing cycle (monthly to annual or vice versa) takes effect at the next renewal, not immediately.
5. **Default Account Limits**: The default Account entity sets `max_rooms: 5`, `max_storage_gb: 10`, `max_attendees: 100`, `max_team_members: 3` regardless of plan. Actual enforcement depends on the `plan` field.

---

## Plan Requirements

This document covers features across both plans. Refer to the Complete Plan Comparison section above for the definitive breakdown of which features are included in each plan.

| Document Topic | Basic | Business |
|---|---|---|
| Billing management | Yes (owner-only) | Yes (owner-only) |
| Usage tracking | Yes | Yes |
| Near-limit warnings | Yes | Yes |
| Plan upgrade/downgrade | Yes | Yes |

---

## Related Documents

- [00-index.md](./00-index.md) -- Master index and question routing
- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture and feature overview
- [03-getting-started.md](./03-getting-started.md) -- Signup, onboarding, and first session
- [31-troubleshooting.md](./31-troubleshooting.md) -- Error diagnosis and resolution
