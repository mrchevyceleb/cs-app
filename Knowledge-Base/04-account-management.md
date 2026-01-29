# Account Management

## Overview

Every R-Link organization is represented by an `Account` entity in Base44. The account stores the organization's profile information, subscription plan, billing details, usage metrics, and resource limits. Accounts are managed through two admin tabs: the **Account** tab (`/admin?tab=account`) for profile editing and the **Settings** tab (`/admin?tab=settings`) for security, notifications, and streaming configuration.

R-Link automatically creates an account for new users who sign up and do not yet have one. This auto-creation process also generates a default Brand Kit, ensuring every account starts with a fully functional configuration.

---

## Account Entity Fields

The `Account` entity contains the following fields:

### Core Identity Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | string | Auto-generated | Unique account identifier |
| `company_name` | string | `"{full_name}'s Organization"` or `"My Organization"` | Organization display name |
| `owner_email` | string | User's email | Email of the account owner |
| `owner_name` | string | User's `full_name` or `""` | Name of the account owner |
| `phone` | string | `""` | Contact phone number (optional) |

### Subscription Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `plan` | string | `"basic"` | Subscription tier: `"basic"` or `"business"` |
| `plan_status` | string | `"active"` | Status: `"active"`, `"past_due"`, `"cancelled"`, etc. |
| `billing_cycle` | string | `"monthly"` | Billing frequency: `"monthly"` or `"annual"` |
| `payment_method` | object | null | Stored payment method details |
| `next_renewal_date` | string | null | ISO date of next billing cycle renewal |

### Usage Tracking Fields

| Field | Type | Default Values | Description |
|---|---|---|---|
| `usage` | object | See below | Current usage metrics |
| `usage.active_rooms` | number | `2` | Number of active rooms |
| `usage.storage_used_gb` | number | `1.5` | Storage consumed in gigabytes |
| `usage.attendees_this_month` | number | `45` | Total attendees in current billing period |
| `usage.hours_streamed` | number | `12` | Total streaming hours in current period |

### Resource Limits Fields

| Field | Type | Default Values | Description |
|---|---|---|---|
| `limits` | object | See below | Plan resource limits |
| `limits.max_rooms` | number | `5` | Maximum concurrent rooms |
| `limits.max_storage_gb` | number | `10` | Maximum storage in GB |
| `limits.max_attendees` | number | `100` | Maximum attendees per session |
| `limits.max_team_members` | number | `3` | Maximum team members |

### Regional Settings Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `timezone` | string | `"UTC"` | Account timezone |
| `locale` | string | `"en-US"` | Default language/locale |

### Security Settings Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `security_settings` | object | See below | Security configuration |
| `security_settings.enforce_2fa` | boolean | `false` | Require two-factor authentication for all team members |
| `security_settings.allowed_email_domains` | array | `[]` | Restrict team member emails to specific domains (Business only) |
| `security_settings.session_timeout_minutes` | number | `480` | Auto-logout timeout in minutes |

### Notification Preferences Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `notification_preferences` | object | See below | Email notification settings |
| `notification_preferences.email_upcoming_events` | boolean | `true` | Reminders for scheduled meetings |
| `notification_preferences.email_recording_ready` | boolean | `true` | When recordings finish processing |
| `notification_preferences.email_payment_reminders` | boolean | `true` | Billing and payment notifications |
| `notification_preferences.email_usage_warnings` | boolean | `true` | Alerts when approaching plan limits |
| `notification_preferences.notification_frequency` | string | `"instant"` | Digest frequency: `"instant"`, `"daily"`, or `"weekly"` |

---

## Auto-Creation Flow for New Users

When a user first accesses the Admin page and no account exists, R-Link automatically creates one. The logic is in `Admin.jsx`:

### Trigger Conditions

Auto-creation runs when ALL of the following are true:
- `currentUser` is loaded and has an `email`
- The `accounts` query returns an empty array (`accounts.length === 0`)

### Step-by-Step Auto-Creation Process

1. **Create Account entity** with these values:
   - `company_name`: If the user has `full_name`, uses `"{full_name}'s Organization"`. Otherwise, uses `"My Organization"`.
   - `owner_email`: The user's `email`.
   - `owner_name`: The user's `full_name` or empty string `""`.
   - `plan`: `"basic"`
   - `plan_status`: `"active"`
   - `billing_cycle`: `"monthly"`
   - `usage`: `{ active_rooms: 2, storage_used_gb: 1.5, attendees_this_month: 45, hours_streamed: 12 }`
   - `limits`: `{ max_rooms: 5, max_storage_gb: 10, max_attendees: 100, max_team_members: 3 }`

2. **Set `account_id` on the user**: Calls `base44.auth.updateMe({ account_id: newAccount.id })` to associate the user with the new account for row-level security (RLS).

3. **Create default Brand Kit** for the new account:
   - `account_id`: The new account's ID
   - `name`: `"Default Brand Kit"`
   - `description`: `"Your starting brand kit - customize it or create new ones"`
   - `is_default`: `true`
   - `colors`: `{ primary: '#6a1fbf', accent: '#00c853', background: '#001233', text: '#ffffff', secondary_text: '#9ca3af' }`
   - `fonts`: `{ heading: 'Inter', body: 'Inter', caption: 'Inter' }`
   - `logos`: `{}`
   - `backgrounds`: `[]`
   - `frame_settings`: `{ style: 'rounded', border_width: 2, border_color: '#6a1fbf', shadow: true }`
   - `lower_third`: `{ template: 'modern', background_color: '#001233', text_color: '#ffffff', accent_color: '#6a1fbf', show_logo: true }`
   - `overlay_defaults`: `{ watermark_position: 'bottom-right', watermark_opacity: 0.7 }`

4. **Invalidate queries**: React Query caches for `accounts` and `brandKits` are invalidated to refresh the UI.

### Missing account_id Recovery

If a user already has an account but their user data is missing `account_id`:
- The system detects `currentUser && account && !currentUser.data?.account_id`
- Calls `base44.auth.updateMe({ account_id: account.id })` to fix the association

---

## Account Profile Editing (AccountTab)

The **Account** tab (`/admin?tab=account`) provides a form for editing the organization's profile.

### Accessing the Account Tab

1. Navigate to **Admin** > **Account** in the sidebar.
2. The tab is accessible to all authenticated users (public access -- no permission gating).

### Editable Fields

The AccountTab displays two sections:

#### Organization Details Section

| Field | Input Type | Placeholder | Description |
|---|---|---|---|
| **Company / Organization Name** | Text input | "Enter company name" | The organization's display name |
| **Owner / Admin Name** | Text input | "Enter name" | Account owner's full name |
| **Contact Email** | Email input | "email@company.com" | Primary contact email (with Mail icon) |
| **Phone (Optional)** | Tel input | "+1 (555) 000-0000" | Contact phone number (with Phone icon) |

#### Regional Settings Section

| Field | Input Type | Options | Description |
|---|---|---|---|
| **Timezone** | Select dropdown | UTC, America/New_York, America/Los_Angeles, America/Chicago, Europe/London, Europe/Paris, Asia/Tokyo, Asia/Singapore, Australia/Sydney, Pacific/Auckland | Account timezone for scheduling and display |
| **Default Locale / Language** | Select dropdown | en-US (English US), en-GB (English UK), es-ES (Spanish), fr-FR (French), de-DE (German), ja-JP (Japanese), zh-CN (Chinese Simplified) | UI language and locale formatting |

### Saving Changes

1. Modify any field in the form.
2. Click the **Save Changes** button (gradient purple-green, bottom right).
3. The system calls `Account.update(account.id, formData)`.
4. Button shows "Saving..." during the operation, then "Saved" with a checkmark for 2 seconds.

---

## Account-Wide Settings (SettingsTab)

The **Settings** tab (`/admin?tab=settings`) provides security, notification, and streaming configuration.

### Accessing the Settings Tab

1. Navigate to **Admin** > **Settings** in the sidebar.
2. This tab is permission-gated (requires appropriate role permissions).

### Security Section

| Setting | Type | Description |
|---|---|---|
| **Two-Factor Authentication** | Toggle switch | Require 2FA for all team members. Default: off. |
| **Session Timeout** | Dropdown | Auto-logout after inactivity. Options: 30 minutes, 1 hour, 4 hours, 8 hours (default), 24 hours. |
| **Email Domain Restriction** | Domain list + input | Restrict team membership to specific email domains (Business plan only). Add domains like "company.com" and click Add. Click a domain badge to remove it. |

### Active Sessions Section

Displays a list of active browser sessions for the current user, showing:
- Device and browser information
- Location
- Last active time
- Current session indicator (green dot)
- **Revoke** button for non-current sessions
- **Log Out All** button (with confirmation dialog) to terminate all sessions except the current one

### Streaming Integrations Section

Quick-access configuration for RTMP streaming platforms:
- **YouTube**: Configure RTMP URL and stream key
- **Facebook Live**: Configure RTMP URL and stream key
- **Twitch**: Configure RTMP URL and stream key
- **LinkedIn Live**: Configure RTMP URL and stream key

Each platform shows a status badge ("Ready" with green check if configured) and a Configure/Edit button that opens the `RTMPIntegrationModal`.

### Notification Preferences Section

| Setting | Type | Default | Description |
|---|---|---|---|
| **Upcoming Events** | Toggle | On | Reminders for scheduled meetings |
| **Recording Ready** | Toggle | On | When recordings finish processing |
| **Payment Reminders** | Toggle | On | Billing and payment notifications |
| **Usage Warnings** | Toggle | On | Alerts when approaching plan limits |
| **Notification Frequency** | Dropdown | Instant | Digest frequency: Instant, Daily, Weekly |

### Saving Settings

Click the **Save Settings** button. The system calls `Account.update()` with `security_settings` and `notification_preferences` objects.

---

## account_id Association with Users

The `account_id` field on the user record is critical for data isolation and access control:

- **Row-Level Security (RLS)**: Base44 uses `account_id` to filter data queries, ensuring users only see data belonging to their account.
- **Set during account creation**: `base44.auth.updateMe({ account_id })` is called when the account is first created.
- **Recovery mechanism**: If `account_id` is missing from the user record but an account exists, the system automatically sets it on the next Admin page load.
- **Entity filtering**: All entity queries (rooms, templates, brand kits, team members, integrations, etc.) filter by `account_id` to scope results to the current account.

---

## Settings and Options

### Account-Level Defaults

| Setting | Default | Editable Location |
|---|---|---|
| Company Name | `"{user_name}'s Organization"` | Account tab |
| Plan | `basic` | Billing tab (upgrade) |
| Plan Status | `active` | Managed by billing system |
| Billing Cycle | `monthly` | Billing tab |
| Timezone | `UTC` | Account tab |
| Locale | `en-US` | Account tab |
| Enforce 2FA | `false` | Settings tab |
| Session Timeout | 480 minutes (8 hours) | Settings tab |
| Email Domain Restriction | Empty (no restriction) | Settings tab (Business only) |
| Notification Frequency | `instant` | Settings tab |

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Account not created for new user | User does not have an email in their profile | Ensure the user completed registration with a valid email address |
| "My Organization" as company name | User signed up without a `full_name` value | Edit the company name in the Account tab |
| Brand Kit not appearing after signup | Auto-creation failed or query cache stale | Refresh the page; check the `brandKits` query in browser dev tools |
| Cannot edit account profile | User does not have permission | The Account tab is public (all roles), but if the user is not authenticated, they cannot access Admin at all |
| Settings not saving | Network error or API failure | Check network connectivity; retry the save operation; check browser console for error details |
| Missing account_id on user | Race condition during signup or manual data issue | The system auto-recovers on next Admin page load; if persistent, contact support |
| Timezone not reflecting in sessions | Timezone change does not retroactively update existing scheduled sessions | Update timezone before creating new sessions; existing sessions retain their original timezone |
| 2FA enforcement not working | Feature depends on Base44 auth infrastructure | Verify that 2FA is configured at the Base44 platform level; contact support if enforcement is not being applied |
| Email domain restriction not visible | User is on Basic plan | Email domain restriction is a Business plan feature only |

---

## FAQ

**Q: What happens when I first sign up for R-Link?**
A: When you access the Admin portal for the first time, R-Link automatically creates an account for you with the Basic plan, a default Brand Kit, and starter usage values. Your organization name defaults to "{Your Name}'s Organization" or "My Organization" if no name is available.

**Q: Can I change my plan from the Account tab?**
A: No. Plan changes are managed through the **Billing** tab (`/admin?tab=billing`), which is restricted to account owners only.

**Q: What are the default usage values on a new account?**
A: New accounts start with sample usage data: 2 active rooms, 1.5 GB storage used, 45 attendees this month, and 12 hours streamed. These values update as you use the platform.

**Q: Can I change the account owner?**
A: The account owner is determined by the `owner_email` field. You can edit the owner name and email in the Account tab. The account owner has full access to all features including Billing and Roles tabs.

**Q: What timezone options are available?**
A: The following timezones are supported: UTC, America/New_York, America/Los_Angeles, America/Chicago, Europe/London, Europe/Paris, Asia/Tokyo, Asia/Singapore, Australia/Sydney, Pacific/Auckland.

**Q: What locales are supported?**
A: English (US), English (UK), Spanish, French, German, Japanese, and Chinese (Simplified).

**Q: How does the email domain restriction work?**
A: On the Business plan, you can add email domains (e.g., "company.com") in the Settings tab. Only users with email addresses from those domains can be added as team members. If no domains are listed, there is no restriction.

**Q: What is the session timeout?**
A: The session timeout controls how long a user can be inactive before being automatically logged out. The default is 8 hours (480 minutes). Options range from 30 minutes to 24 hours.

---

## Known Limitations

1. **Single account per user**: The current architecture associates one account per user context. Users cannot belong to multiple accounts simultaneously.
2. **No account deletion**: There is no self-service account deletion workflow in the Admin portal. Account deletion requires contacting support.
3. **Auto-creation sample data**: New accounts are created with non-zero usage values (2 rooms, 1.5 GB, etc.) that represent sample data rather than actual usage.
4. **Limited timezone options**: Only 10 timezone options are available; additional timezones may not be selectable.
5. **Limited locale options**: Only 7 locales are supported. The locale setting affects display formatting but may not translate the entire UI.
6. **Email domain restriction is Business-only**: Basic plan users cannot restrict team member email domains.
7. **No multi-language UI**: The locale setting primarily affects date/number formatting. Full UI translation is not currently implemented.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Account Profile Editing | Yes | Yes |
| Timezone & Locale Settings | Yes | Yes |
| Security Settings (2FA, Timeout) | Yes | Yes |
| Email Domain Restriction | No | Yes |
| Notification Preferences | Yes | Yes |
| Streaming Integration Quick Config | Yes | Yes |
| Active Sessions Management | Yes | Yes |

---

## Related Documents

- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture, entity model, and glossary
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan details, limits, and billing
- [03-getting-started.md](./03-getting-started.md) -- Signup and onboarding flow
- [11-brand-kit.md](./11-brand-kit.md) -- Default Brand Kit details and customization
- [17-team-management.md](./17-team-management.md) -- Team member management
- [18-roles-and-permissions.md](./18-roles-and-permissions.md) -- Permission system and role definitions
- [32-admin-dashboard-reference.md](./32-admin-dashboard-reference.md) -- Complete admin tab reference
