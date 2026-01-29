# Account Management

## Overview

Every R-Link user belongs to an account. The Account entity stores organization-level information including company details, subscription plan, billing, usage limits, security policies, and notification preferences. Accounts are automatically created during user registration and can be managed through the **AccountTab** and **SettingsTab** in the Admin Dashboard.

---

## Account Entity

The `Account` entity is the top-level organizational unit in R-Link. All resources (rooms, templates, recordings, team members, etc.) are scoped to an account.

### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (auto-generated) |
| `company_name` | string | Organization display name |
| `owner_email` | string | Email address of the account owner |
| `owner_name` | string | Full name of the account owner |
| `plan` | string | Current subscription plan (e.g., `basic`, `pro`, `enterprise`) |
| `plan_status` | string | Status of the plan (e.g., `active`, `trialing`, `past_due`, `canceled`) |
| `billing_cycle` | string | Billing frequency (`monthly` or `annual`) |
| `usage` | object | Current usage metrics (rooms created, storage used, minutes consumed, etc.) |
| `limits` | object | Plan-specific limits (max rooms, max storage, max participants, etc.) |
| `payment_method` | object | Stored payment method details (card type, last 4 digits, expiration) |
| `next_renewal_date` | datetime | Date of the next billing cycle renewal |
| `security_settings` | object | Security configuration (2FA enforcement, domain restrictions, session timeout) |
| `notification_preferences` | object | Email and in-app notification settings |
| `created_date` | datetime | When the account was created |
| `updated_date` | datetime | When the account was last modified |

### Plan Values

| Plan | Description |
|------|-------------|
| `basic` | Free tier with limited features and usage |
| `pro` | Professional tier with expanded limits and advanced features |
| `enterprise` | Full-featured tier with custom limits, SSO, and dedicated support |

### Plan Status Values

| Status | Description |
|--------|-------------|
| `active` | Plan is current and in good standing |
| `trialing` | User is in a free trial period |
| `past_due` | Payment failed; account is in a grace period |
| `canceled` | Plan has been canceled; access may be restricted |

---

## Account Auto-Creation Flow

When a new user registers on R-Link, an account is automatically created. This flow requires no manual intervention from the user.

### Step-by-Step Flow

```
1. User completes registration (email + password or OAuth).
2. System creates a new Account entity with:
   - plan = 'basic'
   - company_name = "{full_name}'s Organization"
     (e.g., "John Smith's Organization")
   - owner_email = user's registration email
   - owner_name = user's full name from registration
   - plan_status = 'active' (or 'trialing' if trial is enabled)
   - Default security_settings and notification_preferences
3. System sets the user's account_id via base44.auth.updateMe().
   - This links the user record to the newly created account.
   - All subsequent API calls from this user are scoped to this account.
4. System creates a default BrandKit for the account.
   - The default BrandKit uses R-Link's standard colors and fonts.
   - Users can customize the BrandKit later via the BrandKit tab.
5. User is redirected to the Admin Dashboard.
```

### Key Technical Detail: base44.auth.updateMe()

After the Account entity is created, the system calls `base44.auth.updateMe()` to set the `account_id` on the authenticated user's profile. This is the mechanism that binds the user to their account. Without this step, the user would not be associated with any account and would not be able to access account-scoped resources.

### Default BrandKit

As part of account creation, a default BrandKit is automatically generated. This BrandKit:
- Uses R-Link's standard color palette and default fonts.
- Is automatically associated with any templates or rooms created before the user customizes their branding.
- Can be fully customized at any time through the BrandKit tab.
- Remains available even after the user creates additional BrandKits.

### Common Customer Questions About Account Creation

**Q: I just signed up but my company name shows as "John's Organization." How do I change it?**
A: Navigate to the Account tab in the Admin Dashboard. You can update your company name in the Company Details section.

**Q: I signed up with the wrong email. Can I change the owner email?**
A: The owner email is the email used during registration. To change it, go to the Account tab and update the email field. Note that this may require email verification.

**Q: I do not see any branding options. Where do I set up my brand?**
A: A default BrandKit was created when your account was set up. Navigate to the BrandKit tab in the Admin Dashboard to customize colors, fonts, and logos.

---

## AccountTab

The AccountTab is the primary interface for managing account-level information. It is accessible from the Admin Dashboard via the `?tab=account` URL parameter.

### Editable Fields

| Field | Type | Description |
|-------|------|-------------|
| `company_name` | string | Organization name displayed throughout the platform |
| `owner_name` | string | Name of the account owner |
| `email` | string (email) | Primary contact email for the account |
| `phone` | string | Contact phone number |
| `timezone` | string | Account timezone (affects scheduling, event times, analytics) |
| `locale` | string | Language/locale setting for the account |

### Field Behaviors

- **company_name**: Displayed in room branding, emails, and public-facing pages. Changing this updates all references across the platform.
- **owner_name**: Used in account correspondence and as the default host name for events.
- **email**: Used for billing notifications, security alerts, and account recovery. Changing requires verification.
- **phone**: Optional. Used for SMS-based 2FA if enabled and for account recovery.
- **timezone**: Affects how dates and times are displayed throughout the dashboard, in scheduled events, and in analytics reports. Does not retroactively change existing scheduled events.
- **locale**: Determines the language and formatting conventions (date format, number format, etc.) for the dashboard UI.

### Common Customer Questions About AccountTab

**Q: I changed my timezone but my scheduled events still show the old time. Why?**
A: Changing the account timezone affects how times are displayed going forward. Existing scheduled events retain their original time. The actual event time has not changed; only the display format is different.

**Q: Can multiple people be listed as account owners?**
A: No. Each account has a single owner. However, you can add team members with administrative roles through the Team tab and Roles tab.

---

## Settings Tab

The SettingsTab provides access to security configuration, session management, notification preferences, and streaming integrations. It is accessible from the Admin Dashboard via the `?tab=settings` URL parameter.

### Security Settings

Security settings control authentication and access policies for all users on the account.

#### Two-Factor Authentication (2FA)

| Setting | Default | Description |
|---------|---------|-------------|
| `enforce_2fa` | `false` | When `true`, all account members must enable 2FA to access the platform |

**Behavior:**
- When `enforce_2fa` is set to `true`, all existing team members who have not yet enabled 2FA will be prompted to set it up on their next login.
- New team members invited after enforcement is enabled will be required to set up 2FA during their first login.
- The account owner can enable/disable this setting at any time.
- Disabling `enforce_2fa` does not remove 2FA from users who already have it configured; it only stops requiring it for users who do not.

**Common Questions:**
- **Q: I enabled enforce_2fa but a team member says they were not prompted.** A: The prompt appears on the user's next login. Ask the team member to log out and log back in.
- **Q: A team member lost their 2FA device. How do they regain access?** A: An account administrator can reset the user's 2FA from the Team tab. The user will be prompted to set up 2FA again on their next login. If the account owner is locked out, contact R-Link support.

#### Allowed Email Domains

| Setting | Default | Description |
|---------|---------|-------------|
| `allowed_email_domains` | `[]` (empty array) | List of email domains allowed to join the account |

**Behavior:**
- When empty (default), any email address can be invited to the account.
- When populated (e.g., `["company.com", "partner.org"]`), only users with email addresses matching one of the listed domains can be invited or join the account.
- Existing team members with non-matching domains are NOT removed; the restriction only applies to new invitations.
- Domain matching is case-insensitive.

**Common Questions:**
- **Q: I added a domain restriction but an existing team member with a different domain can still access the account.** A: Domain restrictions only apply to new invitations. Existing members retain access regardless of their email domain.
- **Q: Can I allow multiple domains?** A: Yes. Add all allowed domains to the `allowed_email_domains` array.

#### Session Timeout

| Setting | Default | Options |
|---------|---------|---------|
| `session_timeout_minutes` | `480` | `30`, `60`, `240`, `480`, `1440` |

**Behavior:**
- Defines how long a user session can remain inactive before automatic logout.
- The timeout is measured in minutes of inactivity (no clicks, no API calls).
- Default is 480 minutes (8 hours).
- Available options and their human-readable equivalents:
  - `30` = 30 minutes
  - `60` = 1 hour
  - `240` = 4 hours
  - `480` = 8 hours (default)
  - `1440` = 24 hours
- Changing the timeout applies to all users on the account, including the owner.
- Active sessions are not immediately affected; the new timeout applies on the user's next login or session refresh.

**Common Questions:**
- **Q: I set the timeout to 30 minutes but I keep getting logged out during a live event.** A: Active participation in a live event (sending chat messages, reacting, etc.) counts as activity and resets the timeout. If you are only watching passively, the session may time out. Consider increasing the timeout to 240 or 480 minutes during events.
- **Q: Can I set different timeouts for different users?** A: No. The session timeout is an account-level setting that applies uniformly to all users.

### Active Sessions

The Active Sessions panel displays all currently active sessions for the account.

#### Session Information

Each active session displays:

| Field | Description |
|-------|-------------|
| `device` | Device type and browser (e.g., "Chrome on Windows", "Safari on iPhone") |
| `location` | Approximate geographic location based on IP address |
| `lastActive` | Timestamp of the last activity in this session |

#### Revoke Session

- Each session has a "Revoke" action.
- Revoking a session immediately invalidates it; the user on that device will be logged out.
- The account owner can revoke any session. Team members can only revoke their own sessions.
- Revoking a session does not prevent the user from logging in again.

**Common Questions:**
- **Q: I see a session from a location I do not recognize. Is my account compromised?** A: Location is approximated from the IP address and may not be exact (e.g., VPN usage can show different locations). If you are concerned, revoke the session immediately and change your password. Consider enabling `enforce_2fa` for additional security.
- **Q: I revoked a session but the user can still access the platform.** A: Revoking a session logs the user out of that specific session. They can still log in again with valid credentials. To prevent access entirely, remove them from the account via the Team tab.

### Notification Preferences

Notification preferences control which email notifications the account owner receives.

#### Email Notification Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `email_upcoming_events` | `true` | Receive email reminders before scheduled events |
| `email_recording_ready` | `true` | Receive email when a recording has been processed and is ready to view |
| `email_payment_reminders` | `true` | Receive email reminders about upcoming payments and billing |
| `email_usage_warnings` | `true` | Receive email when approaching plan usage limits |
| `notification_frequency` | `'instant'` | How often notification emails are sent |

#### Notification Frequency Options

| Value | Behavior |
|-------|----------|
| `'instant'` | Notifications are sent immediately when the triggering event occurs |
| `'daily'` | Notifications are batched and sent once per day (typically morning, account timezone) |
| `'weekly'` | Notifications are batched and sent once per week (typically Monday morning, account timezone) |

**Behavior Notes:**
- Notification preferences apply to the account owner's email.
- Team members manage their own notification preferences individually.
- `notification_frequency` applies to all enabled notification types.
- Critical security notifications (password changes, suspicious login attempts) are always sent instantly regardless of the frequency setting.
- Usage warnings are triggered when the account reaches 80% and 95% of any plan limit.

**Common Questions:**
- **Q: I turned off all notifications but I am still getting emails.** A: Security-related notifications (password changes, suspicious activity) cannot be disabled. These are always sent for your protection.
- **Q: My team members are not getting event reminder emails.** A: Each team member manages their own notification preferences. Ask them to check their settings in the Admin Dashboard.
- **Q: I set my frequency to daily but I got an instant notification.** A: Payment failure notifications and security alerts are always sent instantly, regardless of the frequency setting. Other notifications will follow the daily schedule.

### Streaming Integrations

The Streaming Integrations section allows users to configure RTMP streaming to external platforms.

#### RTMPIntegrationModal

The RTMPIntegrationModal is a configuration dialog for setting up streaming integrations with external platforms.

**Supported Platforms:**

| Platform | Configuration Required |
|----------|----------------------|
| YouTube | RTMP stream key from YouTube Studio |
| Facebook | RTMP stream key from Facebook Live Producer |
| Twitch | RTMP stream key from Twitch Dashboard |
| LinkedIn | RTMP stream key from LinkedIn Live (requires LinkedIn approval) |

**How It Works:**
1. User opens the Streaming Integrations section in the Settings tab.
2. User clicks "Add Integration" to open the RTMPIntegrationModal.
3. User selects the target platform (YouTube, Facebook, Twitch, or LinkedIn).
4. User enters their RTMP stream key from the external platform.
5. The integration is saved and can be used when starting a live room.
6. During a live session, the user can toggle streaming to any configured platform.

**Common Questions:**
- **Q: Where do I find my RTMP stream key?** A: Each platform has a different location:
  - **YouTube**: YouTube Studio > Go Live > Stream settings > Stream key
  - **Facebook**: Facebook Live Producer > Stream setup > Stream key
  - **Twitch**: Twitch Dashboard > Settings > Stream > Primary Stream Key
  - **LinkedIn**: LinkedIn Live events dashboard (requires LinkedIn Live approval)
- **Q: Can I stream to multiple platforms simultaneously?** A: Yes. Configure each platform separately and enable multiple streams during your live session. Note that simultaneous streaming to multiple platforms consumes more bandwidth and may require a higher plan.
- **Q: My stream is not appearing on YouTube/Facebook/etc.** A: Verify that:
  1. Your stream key is correct and has not expired.
  2. You have started the stream on the external platform (some platforms require you to "Go Live" on their end as well).
  3. Your internet connection has sufficient upload bandwidth.
  4. Your plan supports RTMP streaming.

---

## Troubleshooting

### Account Not Found After Registration

**Symptoms:** User registers successfully but sees an error about no account being found, or sees an empty dashboard.

**Possible Causes:**
- The `base44.auth.updateMe()` call failed during account creation.
- Network interruption during the registration flow.

**Resolution Steps:**
1. Ask the customer to log out and log back in.
2. If the issue persists, check whether the Account entity was created (engineering may need to verify via API).
3. If the account exists but the user is not linked, engineering can manually call `base44.auth.updateMe()` to set the `account_id`.
4. If the account was not created, escalate to engineering to trigger the account creation flow.

### Plan Shows "basic" But Customer Purchased a Paid Plan

**Symptoms:** Customer says they purchased a Pro or Enterprise plan but the dashboard shows `plan = 'basic'`.

**Possible Causes:**
- Payment processing delay.
- The upgrade was applied to a different account.
- Payment failed and `plan_status` reverted to `basic`.

**Resolution Steps:**
1. Check the `plan_status` field. If it shows `past_due`, the payment may have failed.
2. Verify the `payment_method` is valid and not expired.
3. Check the `next_renewal_date` to understand the billing timeline.
4. If the customer has multiple accounts, verify they are logged into the correct one.
5. Escalate to billing support with the account ID and payment reference.

### 2FA Lockout

**Symptoms:** Account owner or team member cannot access the platform because they lost their 2FA device.

**Resolution Steps:**
1. If a team member is locked out, an account administrator can reset their 2FA from the Team tab.
2. If the account owner is locked out:
   - Check if there is another administrator on the account who can reset the owner's 2FA.
   - If no other admin exists, the owner must contact R-Link support with identity verification for manual 2FA reset.
3. After the reset, the user will be prompted to set up 2FA again on their next login.

### Session Timeout Issues During Live Events

**Symptoms:** User gets logged out during a live event despite being "active."

**Resolution Steps:**
1. Check the `session_timeout_minutes` setting. If set to a low value (30 or 60), recommend increasing it.
2. Clarify that "activity" means interactive actions (chat, reactions, clicks). Passively watching does not reset the timeout.
3. Recommend the user keep their dashboard tab active (not minimized or in the background) during events.

### Notification Emails Not Being Received

**Symptoms:** Customer reports not receiving notification emails.

**Resolution Steps:**
1. Check the notification preferences in the Settings tab. Confirm the relevant notification type is enabled.
2. Check the `notification_frequency` setting. If set to `daily` or `weekly`, the notification may not have been sent yet.
3. Ask the customer to check their spam/junk folder.
4. Verify the account email address is correct in the Account tab.
5. If all settings are correct, escalate to engineering to check the email delivery service logs.

---

## Internal Reference

### Related Entities

- **User**: Linked to Account via `account_id` (set by `base44.auth.updateMe()`)
- **BrandKit**: Default created during account auto-creation
- **Team**: Team members are scoped to the account
- **Role**: Custom roles are scoped to the account

### Related Admin Tabs

- **AccountTab** (`?tab=account`): Company details and owner information
- **SettingsTab** (`?tab=settings`): Security, sessions, notifications, streaming
- **BillingTab** (`?tab=billing`): Plan management and payment details
- **TeamTab** (`?tab=team`): Team member management
- **RolesTab** (`?tab=roles`): Role and permission management

### Data Flow Summary

```
User Registration
  -> Account.create({plan: 'basic', company_name: "{name}'s Organization", ...})
  -> base44.auth.updateMe({account_id: newAccount.id})
  -> BrandKit.create({account_id: newAccount.id, is_default: true})
  -> Redirect to Admin Dashboard
```
