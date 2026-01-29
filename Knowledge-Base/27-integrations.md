# Integrations

## Overview

The Integrations tab is located in Group 4 of the Admin Sidebar (alongside Leads and AI Notetaker). It provides a centralized interface for connecting R-Link with over 21 third-party services across 8 categories: Email, Payment, Cloud Storage, Authentication, CRM, Calendar, SMS, and Live Streaming.

The Integrations tab is powered by the `IntegrationsTab` component and includes management for service integrations, Webhooks, and API Keys.

### Integration Entity Structure

```
Integration {
  provider       // Name of the service (e.g., 'mailchimp', 'stripe', 'google_drive')
  category       // Integration category (e.g., 'email', 'payment', 'cloud_storage')
  status         // Connection status: 'connected' or 'disconnected'
  account_id     // The account this integration belongs to
}
```

### Integration Operations

- **Connect/Save**: Creates or updates an integration record with `account_id` and sets `status` to `'connected'`.
- **Disconnect**: Updates the integration `status` to `'disconnected'`. The integration record remains but is inactive.

Each integration has its own **configuration modal component** that opens when the user clicks to set up or configure the integration.

## Email Integrations

### Mailchimp

**What it does**: Syncs attendee data with Mailchimp for email marketing. Automatically adds session registrants and attendees to Mailchimp lists, tracks engagement metrics, and enables automated campaign triggers based on R-Link events.

**Capabilities**:
- Sync attendees to Mailchimp audience lists.
- Track engagement data (attendance, watch time, interactions).
- Automate email campaigns triggered by R-Link events (e.g., post-webinar follow-up).
- Segment audiences based on session participation.

**Setup Steps**:
1. Navigate to **Integrations** in the Admin Sidebar.
2. Find **Mailchimp** under the Email category.
3. Click **Connect**.
4. The Mailchimp configuration modal opens.
5. Authenticate with your Mailchimp account via OAuth.
6. Select the Mailchimp audience list to sync with.
7. Configure sync preferences (which fields to map, sync frequency).
8. Click **Save** to complete the connection.
9. The integration status changes to `'connected'`.

**Disconnecting**: Click the integration, then click **Disconnect**. Status updates to `'disconnected'`. Existing synced data in Mailchimp is not removed.

---

### SendGrid

**What it does**: Handles transactional and marketing emails sent from the R-Link platform. Transactional emails include session invitations, registration confirmations, and reminders. Marketing emails include follow-up campaigns and engagement-based sequences.

**Capabilities**:
- Send transactional emails (invites, confirmations, reminders).
- Send marketing emails and campaigns.
- Email delivery tracking and analytics.
- Template management for branded emails.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **SendGrid** under the Email category.
3. Click **Connect**.
4. The SendGrid configuration modal opens.
5. Enter your SendGrid API key.
6. Configure sender identity (from name, from email).
7. Select email templates or use defaults.
8. Click **Save**.
9. Status changes to `'connected'`.

## Payment Integrations

### Stripe

**What it does**: Processes payments and manages subscriptions for paid events, webinars, and premium content access. Supports one-time payments and recurring billing.

**Capabilities**:
- Accept payments for paid webinars and events.
- Manage subscriptions for recurring access.
- Process refunds.
- Payment analytics and reporting.
- Support for multiple currencies.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Stripe** under the Payment category.
3. Click **Connect**.
4. The Stripe configuration modal opens.
5. Authenticate with your Stripe account via OAuth or enter API keys.
6. Configure payment settings (currency, tax handling).
7. Set up webhook endpoints for payment event notifications.
8. Click **Save**.

---

### PayPal

**What it does**: Provides payment processing as an alternative to Stripe. Enables attendees to pay for events and access using their PayPal accounts.

**Capabilities**:
- Accept PayPal payments for events.
- Process one-time payments.
- PayPal checkout integration for Event Landing Pages.
- Payment notifications and receipts.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **PayPal** under the Payment category.
3. Click **Connect**.
4. The PayPal configuration modal opens.
5. Authenticate with your PayPal business account.
6. Configure payment preferences.
7. Click **Save**.

## Cloud Storage Integrations

### Google Drive

**What it does**: Stores recordings and files in Google Drive. Enables automatic export of cloud recordings to a designated Google Drive folder, plus file sharing during sessions.

**Capabilities**:
- Auto-export recordings to Google Drive.
- Store session files and documents.
- Share Drive files within R-Link sessions.
- Organize recordings in Drive folders by date, room, or session.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Google Drive** under the Cloud Storage category.
3. Click **Connect**.
4. The Google Drive configuration modal opens.
5. Authenticate with your Google account via OAuth.
6. Grant R-Link permission to access your Drive.
7. Select or create a destination folder for recordings.
8. Configure auto-export preferences.
9. Click **Save**.

---

### Dropbox

**What it does**: Syncs recordings to Dropbox. Similar to Google Drive integration but for Dropbox users.

**Capabilities**:
- Sync recordings to Dropbox.
- Automatic backup of cloud recordings.
- Organize files by session metadata.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Dropbox** under the Cloud Storage category.
3. Click **Connect**.
4. The Dropbox configuration modal opens.
5. Authenticate with your Dropbox account via OAuth.
6. Select destination folder.
7. Configure sync preferences.
8. Click **Save**.

## Authentication Integrations

### Google SSO

**What it does**: Enables Single Sign-On (SSO) with Google accounts. Team members and participants can log in using their Google credentials.

**Capabilities**:
- One-click login with Google accounts.
- Automatic user provisioning from Google Workspace.
- Reduced friction for attendees joining sessions.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Google SSO** under the Authentication category.
3. Click **Connect**.
4. The Google SSO configuration modal opens.
5. Configure Google OAuth client credentials (Client ID, Client Secret) from your Google Cloud Console.
6. Set allowed domains (optional, for restricting SSO to specific email domains).
7. Click **Save**.

---

### Microsoft SSO

**What it does**: Enables Single Sign-On with Microsoft/Azure AD accounts. Team members and participants can log in using their Microsoft credentials.

**Capabilities**:
- One-click login with Microsoft accounts.
- Azure AD directory integration.
- Enterprise SSO for organizations using Microsoft 365.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Microsoft SSO** under the Authentication category.
3. Click **Connect**.
4. The Microsoft SSO configuration modal opens.
5. Configure Azure AD application credentials (Application ID, Client Secret, Tenant ID).
6. Set allowed domains if needed.
7. Click **Save**.

## CRM Integrations

### Salesforce

**What it does**: Provides two-way synchronization of registration, attendance, and engagement data with Salesforce CRM. Ensures sales and marketing teams have complete visibility into prospect/customer interactions through R-Link events.

**Capabilities**:
- Two-way sync of registrations and attendance.
- Push engagement data (watch time, interactions, Q&A participation) to Salesforce.
- Create or update Salesforce Leads, Contacts, and Campaign Members.
- Trigger Salesforce workflows based on R-Link events.
- Pull Salesforce data into R-Link for personalized session experiences.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Salesforce** under the CRM category.
3. Click **Connect**.
4. The Salesforce configuration modal opens.
5. Authenticate with your Salesforce org via OAuth.
6. Map R-Link fields to Salesforce fields (name, email, company, custom fields).
7. Configure sync direction (one-way or two-way).
8. Set up object mapping (which Salesforce objects to create/update).
9. Click **Save**.

---

### HubSpot

**What it does**: Syncs contacts and pipeline data with HubSpot CRM. Enables marketing and sales alignment through automatic contact creation and engagement tracking.

**Capabilities**:
- Sync contacts from R-Link events to HubSpot.
- Update contact properties with engagement data.
- Manage pipeline deals linked to event attendance.
- Trigger HubSpot workflows from R-Link events.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **HubSpot** under the CRM category.
3. Click **Connect**.
4. The HubSpot configuration modal opens.
5. Authenticate with your HubSpot account via OAuth.
6. Map R-Link fields to HubSpot properties.
7. Configure contact sync preferences.
8. Click **Save**.

---

### Marketo

**What it does**: Integrates with Marketo for marketing automation. Syncs event data for lead scoring, nurture campaigns, and marketing analytics.

**Capabilities**:
- Sync event registrations and attendance to Marketo.
- Feed engagement data into Marketo lead scoring.
- Trigger Marketo smart campaigns from R-Link events.
- Track marketing attribution for events.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Marketo** under the CRM category.
3. Click **Connect**.
4. The Marketo configuration modal opens.
5. Enter Marketo REST API credentials (Client ID, Client Secret, Munchkin Account ID).
6. Configure data mapping and sync preferences.
7. Click **Save**.

---

### ActiveCampaign

**What it does**: Connects with ActiveCampaign for customer experience automation. Syncs attendee data for email automation, CRM, and messaging.

**Capabilities**:
- Sync attendees to ActiveCampaign contacts.
- Trigger automations based on event attendance.
- Update deal stages based on engagement.
- Tag contacts based on session participation.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **ActiveCampaign** under the CRM category.
3. Click **Connect**.
4. The ActiveCampaign configuration modal opens.
5. Enter your ActiveCampaign API URL and API key.
6. Map R-Link data fields to ActiveCampaign fields.
7. Configure automation triggers.
8. Click **Save**.

---

### ConvertKit

**What it does**: Integrates with ConvertKit (now Kit) for creator-focused email marketing. Designed for course creators, coaches, and content creators using R-Link.

**Capabilities**:
- Add event attendees as ConvertKit subscribers.
- Tag subscribers based on event participation.
- Trigger email sequences after events.
- Segment subscribers by engagement level.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **ConvertKit** under the CRM category.
3. Click **Connect**.
4. The ConvertKit configuration modal opens.
5. Enter your ConvertKit API key or authenticate via OAuth.
6. Select subscriber forms or tags to map.
7. Click **Save**.

---

### Go High Level

**What it does**: Full CRM integration with Go High Level (GHL). Provides comprehensive lead management, pipeline tracking, and marketing automation for agencies and businesses.

**Capabilities**:
- Full contact and lead sync.
- Pipeline management with event-based stage updates.
- Trigger GHL workflows from R-Link events.
- SMS and email follow-ups via GHL.
- Appointment and calendar sync.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Go High Level** under the CRM category.
3. Click **Connect**.
4. The Go High Level configuration modal opens.
5. Authenticate with your GHL account via OAuth or API key.
6. Map R-Link fields to GHL contact properties.
7. Configure pipeline and workflow triggers.
8. Click **Save**.

## Calendar Integrations

### Google Calendar

**What it does**: Synchronizes R-Link scheduled sessions with Google Calendar. When a session is scheduled in R-Link, it automatically appears on the user's Google Calendar, and vice versa.

**Capabilities**:
- Two-way sync of scheduled sessions.
- Automatic calendar event creation with join links.
- Reminder sync with Google Calendar notifications.
- Support for recurring events.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Google Calendar** under the Calendar category.
3. Click **Connect**.
4. The Google Calendar configuration modal opens.
5. Authenticate with your Google account via OAuth.
6. Select which Google Calendar to sync with.
7. Configure sync preferences (one-way or two-way, reminder settings).
8. Click **Save**.

---

### Microsoft Outlook

**What it does**: Synchronizes scheduled sessions with Microsoft Outlook Calendar. Works with both personal Outlook accounts and Microsoft 365 business accounts.

**Capabilities**:
- Sync sessions to Outlook Calendar.
- Automatic event creation with session details and join links.
- Reminder integration.
- Support for Microsoft 365 organizations.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Microsoft Outlook** under the Calendar category.
3. Click **Connect**.
4. The Outlook configuration modal opens.
5. Authenticate with your Microsoft account via OAuth.
6. Select calendar.
7. Configure sync preferences.
8. Click **Save**.

---

### iCal Feed

**What it does**: Provides an iCal subscription URL that external calendar applications can subscribe to. This is a one-way feed from R-Link to the external calendar.

**Capabilities**:
- Generate an iCal subscription URL.
- Compatible with any calendar application that supports iCal/ICS subscriptions (Apple Calendar, Thunderbird, etc.).
- Automatic updates as sessions are added or modified.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **iCal Feed** under the Calendar category.
3. Click **Connect** or **Generate Feed**.
4. Copy the generated iCal URL.
5. In your external calendar application, add a new calendar subscription and paste the URL.
6. The calendar will periodically poll the URL for updates.

**Note**: iCal Feed is one-way only (R-Link to external calendar). Events created in the external calendar are not synced back to R-Link.

## SMS Integration

### Twilio

**What it does**: Sends SMS notifications and reminders to participants via Twilio. Useful for session reminders, last-minute schedule changes, and follow-up messages.

**Capabilities**:
- Send SMS reminders before scheduled sessions.
- Notify participants of schedule changes.
- Post-event follow-up messages.
- Custom SMS templates.
- Phone number collection during registration.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Twilio** under the SMS category.
3. Click **Connect**.
4. The Twilio configuration modal opens.
5. Enter your Twilio Account SID.
6. Enter your Twilio Auth Token.
7. Enter or select the Twilio phone number to send from.
8. Configure default message templates.
9. Click **Save**.

## Live Streaming Integrations

These integrations allow R-Link Live Stream mode sessions to broadcast simultaneously to external platforms.

### YouTube

**What it does**: Streams R-Link sessions live to YouTube. Enables reaching YouTube audiences while hosting the interactive session in R-Link.

**Capabilities**:
- Broadcast R-Link sessions to YouTube Live.
- Automatic stream key configuration.
- YouTube chat integration (optional).
- Stream status monitoring.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **YouTube** under the Live Streaming category.
3. Click **Connect**.
4. Authenticate with your YouTube/Google account via OAuth.
5. Select the YouTube channel to stream to.
6. Configure stream settings (title, description, visibility).
7. Click **Save**.

**Usage**: When starting a Live Stream session, select YouTube as a streaming destination. The session video is simultaneously sent to YouTube Live.

---

### Facebook Live

**What it does**: Streams R-Link sessions to Facebook Live on a Page or Profile.

**Capabilities**:
- Broadcast to Facebook Pages or personal profiles.
- Automatic stream configuration.
- Reach Facebook audiences alongside R-Link participants.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Facebook Live** under the Live Streaming category.
3. Click **Connect**.
4. Authenticate with your Facebook account via OAuth.
5. Select the Facebook Page or profile to stream to.
6. Configure stream permissions and defaults.
7. Click **Save**.

---

### Twitch

**What it does**: Streams R-Link sessions to Twitch for gaming, creative, and professional audiences.

**Capabilities**:
- Broadcast to Twitch channels.
- Stream key integration.
- Reach the Twitch community while hosting in R-Link.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **Twitch** under the Live Streaming category.
3. Click **Connect**.
4. Authenticate with your Twitch account via OAuth.
5. Select the Twitch channel.
6. Configure stream title and category.
7. Click **Save**.

---

### LinkedIn Live

**What it does**: Streams R-Link sessions to LinkedIn Live for professional networking and thought leadership content.

**Capabilities**:
- Broadcast to LinkedIn profiles or Company Pages.
- Professional audience reach.
- Integration with LinkedIn's event features.

**Setup Steps**:
1. Navigate to **Integrations**.
2. Find **LinkedIn Live** under the Live Streaming category.
3. Click **Connect**.
4. Authenticate with your LinkedIn account via OAuth.
5. Select the LinkedIn profile or Company Page.
6. Configure stream details.
7. Click **Save**.

**Note**: LinkedIn Live access may require LinkedIn approval for live broadcasting.

## Webhooks

### Overview

The `WebhookConfigModal` provides webhook configuration for receiving HTTP callbacks when specific events occur in R-Link. Webhooks push real-time event data to external systems.

### Supported Webhook Events

| Event | Description |
|-------|-------------|
| Room creation | Triggered when a new room is created |
| Recording completion | Triggered when a recording finishes processing |
| Participant joins | Triggered when a participant joins a session |

Additional events may include: session start, session end, registration received, and payment completed.

### Configuring Webhooks

1. Navigate to **Integrations**.
2. Scroll to the **Webhooks** section or click the Webhooks tab.
3. Click **Add Webhook**.
4. The `WebhookConfigModal` opens.
5. Enter the **Endpoint URL**: The HTTPS URL where R-Link will send POST requests.
6. Select the **Events** to subscribe to (check one or more events from the list).
7. Optionally set a **Secret Key** for request signature verification.
8. Click **Save**.

### Webhook Payload

Webhook requests are sent as HTTP POST requests with a JSON payload containing:
- `event`: The event type (e.g., `room.created`, `recording.completed`, `participant.joined`).
- `timestamp`: ISO 8601 timestamp of the event.
- `data`: Event-specific payload with relevant details (room ID, recording URL, participant info, etc.).

### Webhook Security

- Always use HTTPS endpoints.
- Use the secret key to verify webhook signatures and ensure requests originate from R-Link.
- Implement idempotency in your webhook handler to handle duplicate deliveries.

### Managing Webhooks

- **Edit**: Update the endpoint URL or subscribed events.
- **Delete**: Remove a webhook to stop receiving callbacks.
- **Test**: Send a test payload to verify the endpoint is working.
- **Logs**: View recent webhook delivery logs to troubleshoot failed deliveries.

## API Keys

### Overview

API Keys provide programmatic access to R-Link's API. They are used for building custom integrations, automating workflows, and accessing R-Link data from external applications.

### API Key Format

API keys follow a prefixed format:
- **Live keys**: `rlink_live_xxxx` (for production use)
- **Test keys**: `rlink_test_xxxx` (for development and testing)

### Creating an API Key

1. Navigate to **Integrations**.
2. Scroll to the **API Keys** section.
3. Click **Create API Key**.
4. Enter a **name** for the key (e.g., "Production CRM Sync", "Dev Testing").
5. Select the key type: **Live** or **Test**.
6. Click **Create**.
7. The API key is displayed. **Copy it immediately** -- it will not be shown again.
8. Click **Copy to Clipboard** to securely copy the key.

### Revoking an API Key

1. Navigate to the **API Keys** section under Integrations.
2. Find the key to revoke in the list.
3. Click **Revoke**.
4. Confirm the revocation.
5. The key is immediately invalidated and can no longer be used for API requests.

### API Key Security Warning

**IMPORTANT**: Do not share API keys in public repositories, client-side code, or unsecured locations. Treat API keys as sensitive credentials.

- Store keys in environment variables or secure vault systems.
- Never commit keys to version control (Git, SVN, etc.).
- Rotate keys periodically.
- Use test keys (`rlink_test_xxxx`) for development; use live keys (`rlink_live_xxxx`) only in production environments.
- If a key is compromised, revoke it immediately and create a new one.

### API Key Management

| Action | Description |
|--------|-------------|
| Create | Generate a new named API key (live or test) |
| Copy | Copy key to clipboard (only available immediately after creation) |
| Revoke | Permanently invalidate a key |
| List | View all active and revoked keys with names and creation dates |

## Settings and Options

### Global Integration Settings

| Setting | Description | Notes |
|---------|-------------|-------|
| Integration category filter | Filter integrations by category | Email, Payment, Cloud Storage, Auth, CRM, Calendar, SMS, Live Streaming |
| Connection status | View connected vs. disconnected integrations | Status badge on each integration |
| Auto-sync | Enable automatic data sync for connected integrations | Per-integration setting |

### Integration Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `provider` | String | Integration service name (e.g., `'mailchimp'`, `'stripe'`) |
| `category` | String | Category grouping (e.g., `'email'`, `'payment'`) |
| `status` | String | `'connected'` or `'disconnected'` |
| `account_id` | String | Account that owns this integration |

## Troubleshooting

### Integration fails to connect
- Verify your credentials or API keys for the third-party service are correct.
- Check that your account on the third-party service is active and has the required permissions.
- For OAuth-based integrations, try disconnecting and reconnecting to refresh the authorization.
- Check browser popup blockers -- OAuth flows may open a popup window.

### Data not syncing to CRM
- Verify the integration status is `'connected'` (not `'disconnected'`).
- Check field mapping configuration -- unmapped fields will not sync.
- Review sync logs if available in the integration's configuration modal.
- For two-way sync (Salesforce), ensure both read and write permissions are granted.

### Calendar events not appearing
- Confirm the calendar integration is connected and the correct calendar is selected.
- For Google Calendar and Outlook, verify OAuth permissions include calendar write access.
- For iCal Feed, ensure the external calendar application is refreshing the subscription (this may take up to 24 hours for some apps).

### Webhook not receiving events
- Verify the endpoint URL is correct and uses HTTPS.
- Check that the endpoint server is running and accessible from the internet.
- Review webhook delivery logs for HTTP error codes.
- Ensure the selected events match the events you expect to receive.
- Test the endpoint with the built-in test feature.

### Live stream not broadcasting
- Verify the streaming integration is connected and the correct channel/page is selected.
- Ensure your account on the streaming platform (YouTube, Facebook, Twitch, LinkedIn) is approved for live streaming.
- Check stream key validity -- keys may expire or rotate on some platforms.
- Verify your internet upload bandwidth is sufficient for streaming.

### API key not working
- Verify you are using the correct key type (live vs. test) for your environment.
- Check that the key has not been revoked.
- Ensure the key is being sent correctly in the API request headers.
- If the key was just created, there may be a brief propagation delay.

### Cannot access Integrations tab
- Your role must have `integrations.view` permission. Check with your account owner.
- Admin role includes this permission by default; host role does not.

### SMS reminders not sending
- Verify Twilio integration is connected with valid Account SID, Auth Token, and phone number.
- Check that participant phone numbers are collected during registration.
- Verify Twilio account has sufficient balance for SMS.
- Check Twilio logs for delivery errors.

## FAQ

**Q: How many integrations can I connect simultaneously?**
A: There is no limit on the number of connected integrations. You can connect all available integrations if needed.

**Q: Do integrations cost extra?**
A: R-Link does not charge extra for integration connections. However, the third-party services (Stripe, Twilio, Mailchimp, etc.) have their own pricing. You are responsible for costs on those platforms.

**Q: Can I connect multiple accounts of the same integration?**
A: Typically, one account per integration per R-Link account. For example, one Mailchimp account, one Stripe account. If you need multiple, contact support.

**Q: What happens to my data when I disconnect an integration?**
A: Disconnecting sets the integration status to `'disconnected'` and stops future data sync. Data already synced to the third-party service remains there. Data in R-Link is not affected.

**Q: Can I use webhooks to build custom integrations?**
A: Yes. Webhooks combined with API keys allow you to build fully custom integrations. Webhooks push events to your server, and API keys allow your server to query and update R-Link data.

**Q: How do live streaming integrations work with the three session modes?**
A: Live streaming integrations are designed for **Live Stream** mode specifically. When starting a Live Stream session, you can select one or more connected streaming destinations. The session video is simultaneously broadcast to R-Link participants and the selected external platforms.

**Q: Can I stream to multiple platforms at once?**
A: Yes. You can enable multiple live streaming destinations (e.g., YouTube and Facebook Live simultaneously) for a single Live Stream session. This is often called "simulcasting."

**Q: Are webhook deliveries retried on failure?**
A: Yes. If a webhook delivery fails (non-2xx response), R-Link retries the delivery with exponential backoff. After multiple failures, the webhook may be automatically disabled.

**Q: What is the difference between live and test API keys?**
A: Live keys (`rlink_live_xxxx`) access production data and should only be used in production environments. Test keys (`rlink_test_xxxx`) are for development and testing, typically accessing sandbox or test data without affecting real accounts.

**Q: Can I regenerate an API key?**
A: You cannot regenerate an existing key. Instead, create a new key and revoke the old one. This ensures a clean rotation with no ambiguity about which key is active.

## Known Limitations

- OAuth tokens for integrations may expire and require re-authentication. R-Link attempts token refresh automatically, but some providers require manual re-connection.
- iCal Feed is one-way only (R-Link to external calendar); events created in external calendars are not imported into R-Link.
- Webhook retry logic has a maximum attempt count; after exhausting retries, events may be lost unless the external system has a recovery mechanism.
- Live streaming quality depends on the host's upload bandwidth; R-Link does not provide CDN-level encoding for external streams.
- API key permissions are global; you cannot create a key that is restricted to specific endpoints or data.
- CRM field mapping must be configured manually for each integration; there is no automatic field detection.
- Simultaneous multi-platform streaming (simulcast) may increase bandwidth and resource usage significantly.
- SMS integration (Twilio) requires participants to provide phone numbers; there is no phone number lookup.
- Some integrations (LinkedIn Live) require platform-side approval before live streaming is available.

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Email integrations (Mailchimp, SendGrid) | No | Yes |
| Payment integrations (Stripe, PayPal) | Limited | Yes |
| Cloud Storage (Google Drive, Dropbox) | No | Yes |
| Authentication SSO (Google, Microsoft) | No | Yes |
| CRM integrations (all 6) | No | Yes |
| Calendar integrations | Limited (1) | All (3) |
| SMS (Twilio) | No | Yes |
| Live Streaming (all 4 platforms) | No | Yes |
| Webhooks | No | Yes |
| API Keys | Limited (1 test key) | Unlimited (live + test) |

## Related Documents

- **21-admin-panel-navigation.md** -- Admin sidebar structure and Group 4 navigation
- **22-scheduling.md** -- Calendar integrations and session reminders
- **23-recordings-and-clips.md** -- Cloud storage export for recordings
- **26-team-and-roles.md** -- Integration permissions (`integrations` category)
- **24-brand-kits.md** -- Brand identity applied across integrations
