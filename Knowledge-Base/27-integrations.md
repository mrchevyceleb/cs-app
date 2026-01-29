# 27 - Integrations

## Overview

R-Link supports 21+ third-party integrations across 8 categories, plus Webhooks and API Keys for custom development. The Integrations tab (`IntegrationsTab` component) provides a unified interface for connecting, configuring, and managing all external services. Each integration is stored as an `Integration` entity with provider, category, status, and configuration data. The system also supports webhook event notifications and API key management for programmatic access.

---

## Accessing Integrations

1. Log in to your R-Link account.
2. Navigate to the Admin Dashboard.
3. Click the **Integrations** tab in the left sidebar.
4. Integration management requires the `integrations.manage` permission. See `26-team-and-roles.md`.

---

## Integration Entity

The `Integration` entity stores connection data for each third-party service:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `account_id` | string | The R-Link account this integration belongs to |
| `provider` | string | Provider identifier (e.g., `'mailchimp'`, `'stripe'`, `'google_calendar'`) |
| `category` | string | Category: `'email'`, `'payment'`, `'cloud_storage'`, `'authentication'`, `'crm'`, `'calendar'`, `'sms'`, `'live_streaming'` |
| `status` | string | `'connected'`, `'disconnected'`, `'error'` |
| `config` | object | Provider-specific configuration (API keys, tokens, settings) |
| `created_at` | datetime | When the integration was first connected |
| `updated_at` | datetime | When the integration was last modified |

---

## Integration Categories and Providers

### 1. Email (Marketing & Communications)

#### Mailchimp

| Detail | Value |
|--------|-------|
| **Provider ID** | `mailchimp` |
| **Category** | email |
| **Description** | Sync attendees, track engagement, and automate campaigns |
| **Configuration Modal** | `EmailIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Mailchimp card.
2. Enter your Mailchimp API key (found in Mailchimp under Account > Extras > API keys).
3. Select the audience list to sync attendees to.
4. Configure sync settings:
   - Auto-sync new registrants to your Mailchimp audience.
   - Tag attendees based on event attendance.
   - Track email engagement metrics back in R-Link.
5. Click **Save** to connect.

**Use Cases:**
- Automatically add webinar registrants to an email list.
- Send follow-up campaigns to attendees.
- Segment audiences based on session attendance.

#### SendGrid

| Detail | Value |
|--------|-------|
| **Provider ID** | `sendgrid` |
| **Category** | email |
| **Description** | Professional transactional and marketing emails |
| **Configuration Modal** | `EmailIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the SendGrid card.
2. Enter your SendGrid API key (found in SendGrid under Settings > API Keys).
3. Configure sender identity (verified sender email and name).
4. Set up email templates for:
   - Registration confirmations
   - Session reminders
   - Post-session follow-ups
5. Click **Save** to connect.

**Use Cases:**
- Send branded transactional emails (confirmations, reminders).
- High-volume email delivery for large webinars.
- Custom email templates with R-Link merge tags.

---

### 2. Payment Processing

#### Stripe

| Detail | Value |
|--------|-------|
| **Provider ID** | `stripe` |
| **Category** | payment |
| **Description** | Accept payments and manage subscriptions |
| **Configuration Modal** | `StripeIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Stripe card.
2. Enter your Stripe API keys:
   - **Publishable key** (starts with `pk_live_` or `pk_test_`)
   - **Secret key** (starts with `sk_live_` or `sk_test_`)
3. Configure payment settings:
   - Default currency
   - Payment methods to accept (cards, ACH, etc.)
   - Webhook endpoint for payment events
4. Click **Save** to connect.

**Use Cases:**
- Charge for paid webinars and events.
- Set up recurring subscriptions for content access.
- Process one-time payments for session registrations.
- Checkout integration in the Studio (via CheckoutModal).

#### PayPal

| Detail | Value |
|--------|-------|
| **Provider ID** | `paypal` |
| **Category** | payment |
| **Description** | Process payments via PayPal |
| **Configuration Modal** | `PayPalIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the PayPal card.
2. Enter your PayPal API credentials:
   - **Client ID**
   - **Client Secret**
3. Select environment: Sandbox (testing) or Live (production).
4. Configure payment settings:
   - Default currency
   - Payment capture mode (immediate or authorize-then-capture)
5. Click **Save** to connect.

**Use Cases:**
- Alternative payment method for attendees without credit cards.
- International payments in multiple currencies.
- PayPal checkout for paid events.

---

### 3. Cloud Storage

#### Google Drive

| Detail | Value |
|--------|-------|
| **Provider ID** | `google_drive` |
| **Category** | cloud_storage |
| **Description** | Store recordings and files in Google Drive |
| **Configuration Modal** | `GoogleDriveIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Google Drive card.
2. Authenticate with your Google account via OAuth.
3. Grant R-Link permission to access your Google Drive.
4. Select a destination folder for recordings.
5. Configure auto-sync settings:
   - Auto-upload new recordings to Google Drive.
   - Choose file naming convention.
   - Set folder structure (by date, room, or session type).
6. Click **Save** to connect.

**Use Cases:**
- Automatic backup of recordings to Google Drive.
- Share recordings via Google Drive links.
- Organize recordings alongside other team files.

#### Dropbox

| Detail | Value |
|--------|-------|
| **Provider ID** | `dropbox` |
| **Category** | cloud_storage |
| **Description** | Sync recordings to Dropbox |
| **Configuration Modal** | `DropboxIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Dropbox card.
2. Authenticate with your Dropbox account via OAuth.
3. Grant R-Link permission to access your Dropbox.
4. Select a destination folder for recordings.
5. Configure sync settings:
   - Auto-sync completed recordings.
   - Choose file organization method.
6. Click **Save** to connect.

**Use Cases:**
- Sync recordings to Dropbox for team access.
- Integrate with existing Dropbox-based workflows.
- Cross-platform file access.

---

### 4. Authentication (SSO)

#### Google SSO

| Detail | Value |
|--------|-------|
| **Provider ID** | `google_auth` |
| **Category** | authentication |
| **Description** | Enable Google single sign-on |
| **Configuration Modal** | `GoogleSSOIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Google SSO card.
2. Create an OAuth 2.0 Client ID in Google Cloud Console.
3. Enter the following credentials:
   - **Client ID**
   - **Client Secret**
   - **Redirect URI** (provided by R-Link)
4. Configure allowed domains (optional -- restrict to specific email domains).
5. Click **Save** to connect.

**Use Cases:**
- Allow team members to log in with their Google accounts.
- Simplify onboarding -- no separate R-Link password needed.
- Enforce corporate Google Workspace authentication.

#### Microsoft SSO

| Detail | Value |
|--------|-------|
| **Provider ID** | `microsoft_auth` |
| **Category** | authentication |
| **Description** | Enable Microsoft single sign-on |
| **Configuration Modal** | `MicrosoftSSOIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Microsoft SSO card.
2. Register an application in Azure Active Directory.
3. Enter the following credentials:
   - **Application (Client) ID**
   - **Client Secret**
   - **Tenant ID**
   - **Redirect URI** (provided by R-Link)
4. Configure allowed domains and tenant restrictions.
5. Click **Save** to connect.

**Use Cases:**
- Allow team members to log in with Microsoft 365 accounts.
- Azure AD integration for enterprise environments.
- Support for multi-tenant or single-tenant configurations.

---

### 5. CRM (Customer Relationship Management)

All CRM integrations use the `CRMIntegrationModal` for configuration.

#### Salesforce

| Detail | Value |
|--------|-------|
| **Provider ID** | `salesforce` |
| **Category** | crm |
| **Description** | Two-way sync for registrations, attendance, and engagement scores |

**Setup Steps:**
1. Click **Connect** on the Salesforce card.
2. Authenticate with your Salesforce org via OAuth.
3. Configure field mappings:
   - Map R-Link registrant fields to Salesforce Contact/Lead fields.
   - Map attendance data to custom fields or activities.
   - Map engagement scores to Salesforce fields.
4. Set sync direction: one-way (R-Link to Salesforce), or two-way.
5. Configure triggers (when to sync: on registration, on attendance, on session end).
6. Click **Save** to connect.

**Use Cases:**
- Push webinar leads into Salesforce pipeline.
- Track session engagement as Salesforce activities.
- Score leads based on attendance and participation.

#### HubSpot

| Detail | Value |
|--------|-------|
| **Provider ID** | `hubspot` |
| **Category** | crm |
| **Description** | Sync contacts and track engagement in your pipeline |

**Setup Steps:**
1. Click **Connect** on the HubSpot card.
2. Authenticate with your HubSpot account via OAuth or API key.
3. Configure contact sync:
   - Map registration fields to HubSpot contact properties.
   - Set lifecycle stage for new contacts.
   - Configure deal creation on paid event registration.
4. Set up engagement tracking:
   - Log session attendance as HubSpot activities.
   - Update contact properties with engagement data.
5. Click **Save** to connect.

**Use Cases:**
- Automatically create HubSpot contacts from registrants.
- Track webinar attendance in the HubSpot timeline.
- Trigger workflows based on session engagement.

#### Marketo

| Detail | Value |
|--------|-------|
| **Provider ID** | `marketo` |
| **Category** | crm |
| **Description** | Marketing automation with engagement tracking |

**Setup Steps:**
1. Click **Connect** on the Marketo card.
2. Enter your Marketo REST API credentials:
   - **Client ID**
   - **Client Secret**
   - **REST API Endpoint** (e.g., `https://XXX-XXX-XXX.mktorest.com`)
3. Configure lead sync and program membership.
4. Set up engagement scoring.
5. Click **Save** to connect.

**Use Cases:**
- Sync attendees to Marketo programs.
- Track engagement for lead scoring.
- Trigger Marketo smart campaigns based on R-Link events.

#### ActiveCampaign

| Detail | Value |
|--------|-------|
| **Provider ID** | `activecampaign` |
| **Category** | crm |
| **Description** | Customer experience automation with two-way sync |

**Setup Steps:**
1. Click **Connect** on the ActiveCampaign card.
2. Enter your ActiveCampaign API credentials:
   - **API URL** (e.g., `https://youraccountname.api-us1.com`)
   - **API Key**
3. Configure contact sync and list assignments.
4. Set up automation triggers.
5. Click **Save** to connect.

**Use Cases:**
- Add attendees to ActiveCampaign lists and automations.
- Tag contacts based on event attendance.
- Two-way data sync for comprehensive customer profiles.

#### ConvertKit

| Detail | Value |
|--------|-------|
| **Provider ID** | `convertkit` |
| **Category** | crm |
| **Description** | Creator marketing platform with automated tagging |

**Setup Steps:**
1. Click **Connect** on the ConvertKit card.
2. Enter your ConvertKit API credentials:
   - **API Key**
   - **API Secret**
3. Select subscriber forms and tags.
4. Configure automated tag assignment based on events.
5. Click **Save** to connect.

**Use Cases:**
- Add webinar registrants as ConvertKit subscribers.
- Tag subscribers based on attendance.
- Trigger ConvertKit sequences from R-Link events.

#### GoHighLevel

| Detail | Value |
|--------|-------|
| **Provider ID** | `gohighlevel` |
| **Category** | crm |
| **Description** | Full-featured CRM and marketing automation |

**Setup Steps:**
1. Click **Connect** on the GoHighLevel card.
2. Enter your GoHighLevel API credentials:
   - **API Key** or OAuth token
   - **Location ID**
3. Configure contact sync and pipeline mapping.
4. Set up workflow triggers.
5. Click **Save** to connect.

**Use Cases:**
- Sync R-Link contacts into GoHighLevel CRM.
- Create pipeline opportunities from paid event registrations.
- Trigger GoHighLevel workflows from R-Link events.

---

### 6. Calendar

#### Google Calendar

| Detail | Value |
|--------|-------|
| **Provider ID** | `google_calendar` |
| **Category** | calendar |
| **Description** | Sync meetings with Google Calendar |
| **Configuration Modal** | `GoogleCalendarIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Google Calendar card.
2. Authenticate with your Google account via OAuth.
3. Grant R-Link permission to manage your Google Calendar.
4. Select which calendar to sync events to.
5. Configure sync settings:
   - Auto-create calendar events for scheduled sessions.
   - Include join link in event description.
   - Set reminder notifications.
6. Click **Save** to connect.

**Use Cases:**
- Automatically add R-Link sessions to Google Calendar.
- Send Google Calendar reminders to participants.
- Prevent scheduling conflicts by checking calendar availability.

#### Microsoft Outlook

| Detail | Value |
|--------|-------|
| **Provider ID** | `outlook` |
| **Category** | calendar |
| **Description** | Sync meetings with Outlook Calendar |
| **Configuration Modal** | `OutlookIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Microsoft Outlook card.
2. Authenticate with your Microsoft account via OAuth.
3. Grant R-Link permission to manage your Outlook Calendar.
4. Select the target calendar.
5. Configure sync settings:
   - Auto-create Outlook events for scheduled sessions.
   - Include meeting link in event body.
   - Configure Teams/Outlook notification preferences.
6. Click **Save** to connect.

**Use Cases:**
- Sync R-Link sessions to Outlook for enterprise environments.
- Leverage Outlook's scheduling assistant for team availability.
- Send Outlook calendar invites to participants.

#### iCal Feed

| Detail | Value |
|--------|-------|
| **Provider ID** | `ical` |
| **Category** | calendar |
| **Description** | Generate iCal feeds for calendar subscriptions |
| **Configuration Modal** | `ICalIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the iCal Feed card.
2. Configure feed settings:
   - Which session types to include (meetings, webinars, live streams).
   - Feed visibility (public or private with token).
3. Copy the generated iCal feed URL.
4. Subscribe to the feed in any calendar application (Apple Calendar, Thunderbird, etc.).

**Use Cases:**
- Universal calendar compatibility (any app that supports iCal).
- Public event feeds for marketing pages.
- Personal calendar subscriptions without OAuth.

---

### 7. SMS

#### Twilio

| Detail | Value |
|--------|-------|
| **Provider ID** | `twilio` |
| **Category** | sms |
| **Description** | Send SMS notifications and reminders |
| **Configuration Modal** | `TwilioIntegrationModal` |

**Setup Steps:**
1. Click **Connect** on the Twilio card.
2. Enter your Twilio credentials:
   - **Account SID**
   - **Auth Token**
   - **Phone Number** (Twilio phone number to send from)
3. Configure SMS settings:
   - Session reminder timing (e.g., 1 hour before, 15 minutes before).
   - Custom message templates with merge fields.
   - Opt-in/opt-out management.
4. Click **Save** to connect.

**Use Cases:**
- Send SMS reminders before sessions start.
- Notify registrants of schedule changes.
- Send join links via text message.
- International SMS support via Twilio.

---

### 8. Live Streaming

All streaming integrations use the `RTMPIntegrationModal` for configuration.

#### YouTube

| Detail | Value |
|--------|-------|
| **Provider ID** | `youtube` |
| **Category** | live_streaming |
| **Description** | Stream live to YouTube |

**Setup Steps:**
1. Click **Connect** on the YouTube card.
2. Authenticate with your YouTube/Google account.
3. Enter RTMP credentials:
   - **RTMP URL**: `rtmp://a.rtmp.youtube.com/live2` (default YouTube RTMP endpoint)
   - **Stream Key**: Found in YouTube Studio under "Go Live" > "Stream" settings
4. Configure default streaming settings:
   - Privacy (public, unlisted, private)
   - Category (from YouTube categories list)
   - Auto-start behavior
5. Click **Save** to connect.

**Use Cases:**
- Simulcast R-Link sessions to YouTube Live.
- Build YouTube audience alongside private webinars.
- Archive sessions on YouTube channel.

#### Facebook Live

| Detail | Value |
|--------|-------|
| **Provider ID** | `facebook` |
| **Category** | live_streaming |
| **Description** | Stream live to Facebook |

**Setup Steps:**
1. Click **Connect** on the Facebook Live card.
2. Authenticate with your Facebook account.
3. Enter RTMP credentials:
   - **RTMP URL**: Provided in Facebook Live Producer
   - **Stream Key**: Provided in Facebook Live Producer
4. Configure default settings:
   - Target (page, group, or profile)
   - Privacy settings
5. Click **Save** to connect.

**Use Cases:**
- Broadcast sessions to Facebook pages or groups.
- Reach Facebook audience during webinars.
- Cross-promote events on social media.

#### Twitch

| Detail | Value |
|--------|-------|
| **Provider ID** | `twitch` |
| **Category** | live_streaming |
| **Description** | Stream live to Twitch |

**Setup Steps:**
1. Click **Connect** on the Twitch card.
2. Enter RTMP credentials:
   - **RTMP URL**: `rtmp://live.twitch.tv/app/` (default Twitch ingest)
   - **Stream Key**: Found in Twitch Dashboard under Settings > Stream
3. Configure default settings.
4. Click **Save** to connect.

**Use Cases:**
- Stream interactive sessions to Twitch.
- Gaming, creative, or educational live content.
- Leverage Twitch chat alongside R-Link features.

#### LinkedIn Live

| Detail | Value |
|--------|-------|
| **Provider ID** | `linkedin` |
| **Category** | live_streaming |
| **Description** | Stream live to LinkedIn |

**Setup Steps:**
1. Click **Connect** on the LinkedIn Live card.
2. Enter RTMP credentials:
   - **RTMP URL**: Provided in LinkedIn Live Events
   - **Stream Key**: Provided in LinkedIn Live Events
3. Configure default settings.
4. Click **Save** to connect.

**Use Cases:**
- Professional broadcasts to LinkedIn audience.
- B2B webinar promotion.
- Thought leadership content distribution.

---

## Webhooks

### Overview

Webhooks allow you to receive real-time HTTP POST notifications when specific events occur in your R-Link account. Configure webhooks via the `WebhookConfigModal`.

### Accessing Webhooks

1. In the Integrations tab, scroll to the **Webhooks** section.
2. Click **Configure Webhooks** to open the configuration modal.

### Webhook Configuration

Each webhook consists of:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique webhook identifier |
| `url` | string | The HTTPS endpoint to receive POST requests |
| `events` | object | Map of event types to boolean (enabled/disabled) |
| `secret` | string | Signing secret for payload verification (format: `whsec_xxxxxxxxxx`) |
| `enabled` | boolean | Whether the webhook is active |
| `created` | datetime | When the webhook was created |

### Available Webhook Events

| Event | Description |
|-------|-------------|
| `room.created` | Fired when a new room is created |
| `room.started` | Fired when a room session begins (host joins) |
| `room.ended` | Fired when a room session ends |
| `participant.joined` | Fired when a participant joins a room |
| `participant.left` | Fired when a participant leaves a room |
| `recording.started` | Fired when recording begins in a session |
| `recording.completed` | Fired when a recording is processed and ready |
| `registration.created` | Fired when someone registers for a webinar/event |

### Creating a Webhook

1. Click **Configure Webhooks** to open the modal.
2. Enter the **Webhook URL** (must be an HTTPS endpoint).
3. Optionally enter a **Signing Secret** (auto-generated if left blank).
4. Toggle which events should trigger the webhook (all enabled by default).
5. Click **Add** to create the webhook.
6. Click **Save** to persist all webhook configurations.

### Webhook Payload

Webhooks send POST requests with:
- **Content-Type**: `application/json`
- **X-Webhook-Secret**: The signing secret for verification
- **Body**: JSON payload containing the event type, timestamp, and event-specific data

### Managing Webhooks

- View active webhooks in the webhook section (shows URL, count of webhooks).
- Remove a webhook by clicking the delete button in the configuration modal.
- Toggle webhooks on/off without deleting them.

---

## API Keys

### Overview

API keys provide programmatic access to R-Link's API. Keys are used to authenticate server-to-server requests.

### Key Format

R-Link API keys follow this naming convention:

| Key Type | Format | Description |
|----------|--------|-------------|
| **Production** | `rlink_live_xxxxxxxxxxxxxxxx` | For live/production environments |
| **Development** | `rlink_test_xxxxxxxxxxxxxxxx` | For testing and development |

The `rlink_live_` and `rlink_test_` prefixes distinguish between production and development keys. Always use test keys during development and live keys in production.

### Creating an API Key

1. In the Integrations tab, scroll to the **API Keys** section.
2. Click **Create New Key**.
3. Enter a descriptive **Key Name** (e.g., "Production Server", "Staging Environment", "CI/CD Pipeline").
4. Click **Generate Key**.
5. **IMPORTANT**: Copy the key immediately. The full key is shown only once and cannot be retrieved later.
6. Click **Done** to close the dialog.

### Viewing API Keys

The API Keys section displays all created keys:

| Column | Description |
|--------|-------------|
| **Name** | Descriptive name given during creation |
| **Key** | First 30 characters of the key (truncated for security) |
| **Created** | Date the key was generated |
| **Last Used** | Date the key was last used for an API call |

### Revoking an API Key

1. Find the key in the API Keys list.
2. Click **Revoke** on the right side.
3. Confirm the revocation. This action is permanent and cannot be undone.
4. Any applications using this key will immediately lose API access.

### API Key Security

- **Never share API keys** in public repositories, client-side code, or unsecured channels.
- Use environment variables to store keys in your applications.
- Rotate keys periodically by creating new ones and revoking old ones.
- Use separate keys for production and development environments.
- Monitor "Last Used" dates to identify unused keys for cleanup.

---

## Integration Status Values

| Status | Badge | Description |
|--------|-------|-------------|
| `connected` | Green "Connected" badge | Integration is active and functional |
| `disconnected` | (no badge) | Integration is not connected; shows "Connect" button |
| `error` | Red "Error" badge | Integration encountered a problem; needs reconfiguration |

### Connected State Actions
- **Configure**: Open the configuration modal to modify settings.
- **Disconnect**: Remove the integration connection.

### Disconnected State Actions
- **Connect**: Open the configuration modal to set up the integration.

---

## Complete Integration Reference Table

| # | Provider | Provider ID | Category | Modal Component |
|---|----------|-------------|----------|----------------|
| 1 | Mailchimp | `mailchimp` | email | EmailIntegrationModal |
| 2 | SendGrid | `sendgrid` | email | EmailIntegrationModal |
| 3 | Stripe | `stripe` | payment | StripeIntegrationModal |
| 4 | PayPal | `paypal` | payment | PayPalIntegrationModal |
| 5 | Google Drive | `google_drive` | cloud_storage | GoogleDriveIntegrationModal |
| 6 | Dropbox | `dropbox` | cloud_storage | DropboxIntegrationModal |
| 7 | Google SSO | `google_auth` | authentication | GoogleSSOIntegrationModal |
| 8 | Microsoft SSO | `microsoft_auth` | authentication | MicrosoftSSOIntegrationModal |
| 9 | Salesforce | `salesforce` | crm | SalesforceIntegrationModal (via CRMIntegrationModal) |
| 10 | HubSpot | `hubspot` | crm | HubSpotIntegrationModal (via CRMIntegrationModal) |
| 11 | Marketo | `marketo` | crm | MarketoIntegrationModal (via CRMIntegrationModal) |
| 12 | ActiveCampaign | `activecampaign` | crm | ActiveCampaignIntegrationModal (via CRMIntegrationModal) |
| 13 | ConvertKit | `convertkit` | crm | ConvertKitIntegrationModal (via CRMIntegrationModal) |
| 14 | GoHighLevel | `gohighlevel` | crm | GoHighLevelIntegrationModal (via CRMIntegrationModal) |
| 15 | Google Calendar | `google_calendar` | calendar | GoogleCalendarIntegrationModal |
| 16 | Microsoft Outlook | `outlook` | calendar | OutlookIntegrationModal |
| 17 | iCal Feed | `ical` | calendar | ICalIntegrationModal |
| 18 | Twilio | `twilio` | sms | TwilioIntegrationModal |
| 19 | YouTube | `youtube` | live_streaming | RTMPIntegrationModal |
| 20 | Facebook Live | `facebook` | live_streaming | RTMPIntegrationModal |
| 21 | Twitch | `twitch` | live_streaming | RTMPIntegrationModal |
| 22 | LinkedIn Live | `linkedin` | live_streaming | RTMPIntegrationModal |

---

## Common Troubleshooting

### Q: An integration shows "Connected" but is not working.
**A:** Click **Configure** on the integration to review the settings. Common issues:
1. API keys or tokens have expired -- regenerate them in the third-party service.
2. OAuth tokens need to be refreshed -- disconnect and reconnect the integration.
3. Permissions were revoked in the third-party service.
4. The third-party service is experiencing an outage.

### Q: I cannot connect an integration.
**A:** Check the following:
1. Your role must have the `integrations.manage` permission.
2. Ensure you have the correct credentials from the third-party service.
3. Check that the third-party service account is active and in good standing.
4. For OAuth integrations, ensure popup blockers are disabled.

### Q: My webhooks are not firing.
**A:** Troubleshooting steps:
1. Verify the webhook URL is correct and accessible from the internet (HTTPS required).
2. Check that the webhook is enabled (not just created but toggled on).
3. Verify the events you expect are toggled on for this webhook.
4. Check your server logs for incoming requests -- they may be arriving but failing.
5. Test with a service like webhook.site to confirm delivery.

### Q: I lost my API key.
**A:** API keys are shown only once at creation time. If you lose a key:
1. Create a new API key with the same name.
2. Update your application with the new key.
3. Revoke the old key to prevent unauthorized access.

### Q: How do I test integrations without affecting production?
**A:** Use test/development credentials:
- **Stripe**: Use `pk_test_` and `sk_test_` keys.
- **PayPal**: Select "Sandbox" environment during setup.
- **API Keys**: Use `rlink_test_` prefixed keys for development.
- **Webhooks**: Point to a staging webhook endpoint.

### Q: Can I connect multiple accounts for the same integration?
**A:** Each integration provider can have one active connection per R-Link account. To use multiple accounts (e.g., two Stripe accounts), you would need separate R-Link accounts.

### Q: What data is shared with CRM integrations?
**A:** CRM integrations typically sync:
- Registrant data (name, email, registration date)
- Attendance data (joined, duration, engagement score)
- Session metadata (title, date, type)
- Custom fields mapped during configuration

### Q: How do I set up multistreaming to multiple platforms?
**A:** Connect each streaming platform integration separately (YouTube, Facebook, Twitch, LinkedIn). When scheduling a live stream session, enable each platform and enter the RTMP credentials. R-Link will broadcast to all enabled platforms simultaneously. See `22-scheduling.md` for live stream scheduling details.

### Q: Calendar events are not syncing.
**A:** Check the following:
1. The calendar integration is connected and shows "Connected" status.
2. The correct calendar is selected in the integration settings.
3. The session was created AFTER the calendar integration was connected (existing sessions may not retroactively sync).
4. For Google Calendar, ensure R-Link has the necessary Calendar API permissions.
5. For Outlook, ensure the Azure AD app registration has Calendar.ReadWrite permission.

### Q: How do I verify webhook payloads?
**A:** Each webhook has a signing secret (format: `whsec_xxxxx`). When R-Link sends a webhook:
1. The `X-Webhook-Secret` header contains the secret.
2. Compare this header value with your stored secret.
3. Only process payloads where the secret matches.
4. This prevents unauthorized services from sending fake events to your endpoint.

---

## API Reference

### Integration Management

```
// List all integrations
Integration.list()

// Connect an integration
onConnect(integrationId)

// Save integration configuration
onSave({
  provider: 'stripe',
  category: 'payment',
  status: 'connected',
  config: { publishable_key: 'pk_live_xxx', secret_key: 'sk_live_xxx' }
})

// Disconnect an integration
onDisconnect(integrationId)
```

### Webhook Management

```
// Save webhook configurations
onSaveWebhooks([
  {
    id: '1',
    url: 'https://api.example.com/webhooks/rlink',
    events: {
      'room.created': true,
      'recording.completed': true,
      'registration.created': true
    },
    secret: 'whsec_abc123',
    enabled: true
  }
])
```

---

## Related Features

- **Scheduling**: Calendar integrations sync with scheduled sessions. Live streaming integrations receive RTMP data from live stream sessions. See `22-scheduling.md`.
- **Recordings**: Cloud storage integrations auto-sync recordings. See `23-recordings-and-clips.md`.
- **Team and Roles**: Integration access requires `integrations.view` and `integrations.manage` permissions. See `26-team-and-roles.md`.
