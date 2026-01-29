# R-Link Platform Overview & Architecture

## Overview

R-Link is a live video collaboration platform built on the Base44 low-code platform. It enables individuals and organizations to host meetings, webinars, and live streams with a rich set of interactive features, branding options, and integrations. The platform is delivered as a single-page React application with real-time communication powered by WebRTC and RTMP streaming protocols.

This document serves as the comprehensive platform reference, covering architecture, terminology, navigation, admin capabilities, session types, data entities, URL parameters, and integrations.

---

## Architecture

### Technology Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend Framework | React | Single-page application UI |
| State Management | TanStack Query (React Query) | Server state caching, synchronization, and data fetching |
| Platform SDK | Base44 SDK | Authentication, data persistence, serverless functions, file storage |
| Real-time Video | WebRTC | Peer-to-peer and SFU-based video/audio for interactive participants |
| Live Streaming | RTMP | Production-quality streaming to external platforms (YouTube, Facebook, Twitch, LinkedIn) |
| Routing | React Router | Client-side page navigation with URL parameters |
| Styling | CSS / Component Library | Responsive UI with breakpoint at 768px for mobile |

### Base44 Platform Integration

R-Link leverages Base44 for:
- **Authentication:** User login/registration with session tokens, Google SSO, and Microsoft SSO
- **Data Layer:** Entity CRUD operations via `Entity.list()`, `Entity.create()`, `Entity.update()`, `Entity.delete()`, `Entity.getById()`
- **File Storage:** Upload and retrieval of recordings, clips, brand assets, and media files
- **Serverless Functions:** Backend logic for integrations, webhooks, and data processing via `InvokeFunctionByName`
- **Real-time Subscriptions:** Live data updates via entity subscriptions

### Application Parameters

The R-Link application receives these parameters at initialization:

| Parameter | Source | Description |
|-----------|--------|-------------|
| `appId` | Platform config | Unique identifier for the R-Link application instance |
| `serverUrl` | Platform config | Base44 server endpoint URL |
| `token` | URL (`access_token`) | Authentication token passed via URL fragment or query parameter |
| `fromUrl` | URL | Return URL for redirect flows (e.g., after login) |
| `functionsVersion` | Platform config | Version identifier for serverless function compatibility |

---

## Glossary

| Term | Definition |
|------|-----------|
| **Account** | The top-level entity representing an R-Link subscription. Contains plan type, billing info, usage metrics, and owner details. |
| **Admin Portal** | The `/Admin` page with 18 tabs for managing all aspects of an R-Link account. Available on all plans. |
| **Attendee** | A viewer in a Webinar or Live Stream session who can watch but has limited interaction capabilities. |
| **Banner** | An Element type that displays a visual overlay banner within a session. Business plan feature. |
| **Base44** | The low-code platform that R-Link is built upon, providing auth, data, functions, and hosting. |
| **Brand Kit** | A collection of branding assets (colors, fonts, logos, backgrounds) applied to sessions and pages. |
| **Breakout Room** | A sub-room within a session where a subset of participants can collaborate separately. Basic gets 1; Business gets unlimited. |
| **CTA Button** | Call-to-Action button displayed during sessions. Business branding feature. |
| **Element** | An interactive overlay or media component displayed during a session (Slides, Video, Audio, Links, Banners, Polls, Website Overlays, Prompter). |
| **Element Folder** | An organizational container for grouping Elements in the admin panel. |
| **Event** | A scheduled or active session instance. Contains session type, room assignment, timing, and configuration. |
| **Event Landing Page** | A public-facing page for promoting and registering for a webinar or event. |
| **EventFolder (Room)** | The primary organizational unit in R-Link. Rooms contain events, elements, and settings. Also referred to as "Room" in the UI. |
| **Gallery Layout** | A grid view showing all participants equally. Default layout for Meeting sessions. |
| **Host** | A session participant with elevated permissions: can manage participants, elements, recording, and session settings. |
| **Interactive Participant** | A user who joins a session with full audio/video capabilities (as opposed to view-only attendees). |
| **Layout** | The visual arrangement of video feeds and content in a session (Gallery, Speaker, Stage, etc.). |
| **Live Stream** | A session type optimized for production-quality broadcasting via RTMP to external platforms. Business plan required. |
| **Meeting** | A collaborative session type where all participants can interact equally. Default type on all plans. |
| **Notetaker** | An AI-powered feature that transcribes meetings and generates notes. Business plan feature. |
| **Prompter** | An Element that displays scrolling text (teleprompter) visible only to the host. Business plan feature. |
| **Recording** | A captured video/audio file of a session, stored in the account's storage allocation. |
| **Repurposed Clip** | A segment extracted from a recording for sharing or reuse. |
| **RTMP** | Real-Time Messaging Protocol, used for streaming to external platforms like YouTube and Facebook. |
| **SFU** | Selective Forwarding Unit, the server architecture for routing WebRTC media streams between participants. |
| **Stage Layout** | A layout where designated speakers are prominently displayed. Used in Webinar sessions. |
| **Studio** | The main session page (`/Studio`) where hosts and participants interact during a live session. |
| **Template** | A reusable room configuration that can be applied when creating new rooms. |
| **Vanity URL** | A custom URL slug for accessing a room or event landing page. Business branding feature. |
| **Viewer** | The page (`/Viewer`) where attendees watch a webinar or live stream without interactive capabilities. |
| **Waiting Room** | A pre-session holding area where attendees wait for the host to admit them. Customizable on Business plan. |
| **WebRTC** | Web Real-Time Communication, the browser API and protocol for peer-to-peer audio/video/data. |
| **Webinar** | A host-led session type supporting up to 1,000 attendees with structured presentation flow. Business plan required. |
| **Webhook** | An HTTP callback that sends event data to external URLs when actions occur in R-Link. |
| **Whiteboard** | A collaborative drawing canvas available within sessions. Basic gets 1; Business gets unlimited. |

---

## Navigation Map -- All 14 Pages

| # | Page Name | Route | Description | Auth Required | Plan |
|---|-----------|-------|-------------|--------------|------|
| 1 | Home | `/` or `/Home` | Dashboard landing page after login. Shows recent activity, quick actions, and account summary. | Yes | Basic+ |
| 2 | Landing | `/Landing` | Public marketing/landing page for unauthenticated users. Describes R-Link features and pricing. | No | -- |
| 3 | Admin | `/Admin` | Full administration portal with 18 tabs for account management, rooms, recordings, team, billing, and more. | Yes | Basic+ |
| 4 | Studio | `/Studio` | The live session interface. Hosts and participants join here for meetings, webinars, and live streams. Accepts query params for session configuration. | Yes | Basic+ |
| 5 | Viewer | `/Viewer` | Attendee-facing view for webinars and live streams. View-only with limited interactivity (chat, polls). | Varies | Business (for webinar/live stream) |
| 6 | Setup | `/Setup` | Pre-session device configuration page. Camera, microphone, and speaker selection. Display name and event name entry. | Yes | Basic+ |
| 7 | Onboarding | `/Onboarding` | Guided 6-step onboarding flow for new users. Covers Studio, Elements, Layouts, and AI Tools. | Yes | Basic+ |
| 8 | Register | `/Register` | User registration page for creating a new R-Link account. | No | -- |
| 9 | EventLanding | `/EventLanding` | Public event promotion page with registration form for upcoming webinars and events. | No | Business |
| 10 | Replay | `/Replay` | Playback page for viewing recorded sessions. | Yes | Basic+ |
| 11 | SharedClip | `/SharedClip` | Public or shared view of a repurposed clip extracted from a recording. | No (shared link) | Basic+ |
| 12 | SharedPresentation | `/SharedPresentation` | Public or shared view of a presentation/slide deck used in a session. | No (shared link) | Basic+ |
| 13 | MeetingNotes | `/MeetingNotes` | View and manage AI-generated meeting transcripts and notes. | Yes | Business |
| 14 | VirtualBackgroundTest | `/VirtualBackgroundTest` | Testing page for previewing and configuring virtual backgrounds before a session. | Yes | Basic+ |

---

## Admin Portal -- All 18 Tabs

The Admin portal (`/Admin`) is organized into 18 tabs. Access is governed by the user's role (Owner, Admin, Host, or Member).

### Tab Access Matrix

| # | Tab Name | Route Param | Description | Owner | Admin | Host | Member |
|---|----------|------------|-------------|-------|-------|------|--------|
| 1 | Dashboard | `dashboard` | Account overview with key metrics, recent activity, and quick actions. Active rooms, storage usage, attendee counts. | Yes | Yes | Yes | Yes |
| 2 | Account | `account` | Account settings including organization name, owner email, timezone, and general preferences. | Yes | Yes | Yes | Yes |
| 3 | Rooms | `rooms` | Create, edit, delete, and manage EventFolders (Rooms). Configure room settings, assign templates, and manage room-specific options. | Yes | Yes | View/Create/Edit | -- |
| 4 | Schedule | `schedule` | View and manage scheduled meetings and events. Calendar interface for upcoming sessions. | Yes | Yes | Yes | Yes |
| 5 | Recordings | `recordings` | Browse, play, download, and manage session recordings. View recording metadata and storage usage. | Yes | Yes | View | -- |
| 6 | Clips | `clips` | Manage repurposed clips extracted from recordings. Share, download, and view clip analytics. | Yes | Yes | View | -- |
| 7 | Brand Kit | `brand-kit` | Configure visual branding: colors, fonts, logos, backgrounds, CTA buttons, exit URLs, waiting room appearance, and vanity URLs. | Yes | Yes | -- | -- |
| 8 | Team | `team` | Invite, manage, and remove team members. Assign roles and view team activity. | Yes | Yes | View/Invite | -- |
| 9 | Roles | `roles` | Define and manage custom roles with granular permissions. Assign permissions per admin tab and feature area. | Yes (Owner-only) | -- | -- | -- |
| 10 | Templates | `templates` | Create and manage reusable room templates. Define default settings, elements, and layouts for new rooms. | Yes | Yes | -- | -- |
| 11 | Billing | `billing` | View current plan, manage subscription, update payment methods, view invoice history, and change billing cycle. | Yes (Owner-only) | -- | -- | -- |
| 12 | Integrations | `integrations` | Connect and configure 21+ third-party integrations. Manage API keys and webhook endpoints. | Yes | Yes | -- | -- |
| 13 | Settings | `settings` | Global application settings including default session type, notification preferences, and advanced configuration. | Yes | Yes | -- | -- |
| 14 | Support | `support` | Access help resources, submit support tickets, and view knowledge base articles. | Yes | Yes | Yes | Yes |
| 15 | Notetaker | `notetaker` | Configure AI notetaker settings: auto-transcription, language preferences, summary options, and transcript management. | Yes | Yes | Yes | Yes |
| 16 | Leads | `leads` | View and manage lead data captured from event registrations, webinar attendees, and form submissions. | Yes | Yes | -- | -- |
| 17 | Event Landing | `event-landing` | Design and manage public event landing pages for webinars and events. Configure registration forms, page content, and branding. | Yes | Yes | -- | -- |
| 18 | Elements | `elements` | Create and manage interactive Elements (Slides, Video, Audio, Links, Banners, Polls, Website Overlays, Prompter). Organize into Element Folders. | Yes | Yes | -- | -- |

### Public Tabs (accessible to all authenticated users)
`dashboard`, `account`, `schedule`, `support`, `notetaker`

### Owner-Only Tabs
`billing`, `roles`

---

## Session Types

R-Link supports three distinct session types, each optimized for different use cases. The session type is specified via the `type` URL parameter when launching the Studio.

### Meeting (Collaborative)

- **URL Parameter:** `?type=meeting`
- **Default Layout:** Gallery
- **Plan Requirement:** Basic+
- **Max Interactive Participants:** 50 (Basic) / 100 (Business)
- **Primary Use Case:** Collaborative discussions, team calls, brainstorming, and working sessions where all participants interact equally.

**Available Layouts (5):**
| Layout | Description |
|--------|------------|
| Gallery | Grid view showing all participants equally. Default for meetings. |
| Speaker | Active speaker is prominently displayed; other participants shown in a sidebar or strip. |
| Sidebar | Content or shared screen takes the main area; participants in a side panel. |
| Spotlight | One participant is highlighted in the center with others minimized. |
| Compact | Minimal layout optimized for screen sharing with small participant thumbnails. |

**Meeting Features:**
- All participants have audio/video capabilities
- Screen sharing available to all participants (or restricted by host)
- Chat, reactions, and hand-raising
- Breakout rooms (1 on Basic, unlimited on Business)
- Whiteboard (1 on Basic, unlimited on Business)
- Recording (host-initiated)
- Elements: Core Media on Basic; all Elements on Business

### Webinar (Host-Led)

- **URL Parameter:** `?type=webinar`
- **Default Layout:** Stage Host (`stage_host`)
- **Plan Requirement:** Business
- **Max Attendees:** Up to 1,000
- **Primary Use Case:** Presentations, product launches, educational sessions, and events with a clear presenter/audience dynamic.

**Available Layouts (6):**
| Layout | Description |
|--------|------------|
| Stage Host | Host(s) prominently displayed on a virtual stage. Default for webinars. |
| Stage Content | Shared content (slides, screen) takes center stage with host in a smaller overlay. |
| Picture-in-Picture | Host video as a small overlay on shared content. |
| Full Content | Content fills the entire view; host video is hidden or minimized. |
| Interview | Two or more hosts displayed side-by-side in an interview-style arrangement. |
| Panel | Multiple speakers displayed in a panel format with audience Q&A. |

**Webinar Features:**
- Hosts have full audio/video; attendees are view-only by default
- Attendees can interact via chat, polls, and Q&A
- Registration support via WebinarRegistration entity and EventLanding page
- Automated email sequences (with email integrations)
- Lead capture and analytics
- All Elements available
- Full branding suite applied
- Recording and replay

### Live Stream (Production-Quality)

- **URL Parameter:** `?type=livestream`
- **Default Layout:** Live Host (`live_host`)
- **Plan Requirement:** Business
- **Max Viewers:** Unlimited (via RTMP distribution)
- **Primary Use Case:** Broadcasting to external platforms (YouTube, Facebook, Twitch, LinkedIn) with production-quality output.

**Available Layouts (7):**
| Layout | Description |
|--------|------------|
| Live Host | Host prominently displayed with branding overlays. Default for live streams. |
| Live Content | Content takes the primary view with host in an overlay. |
| Live Split | Split view between host and content. |
| Live Full | Full-screen content with no host video visible. |
| Live Interview | Two or more speakers in a broadcast-quality interview layout. |
| Live Panel | Multiple speakers in a panel discussion format. |
| Live Custom | Fully customizable layout with drag-and-drop positioning of video feeds and content. |

**Live Stream Features:**
- RTMP output to YouTube, Facebook Live, Twitch, LinkedIn Live
- Multi-platform simultaneous streaming
- Production controls (scene switching, transitions)
- All Elements available as overlays
- Full branding applied to stream output
- Real-time viewer count and health monitoring
- Recording of the stream output
- Low-latency monitoring via Viewer page

---

## All Entities (27+ Entities)

R-Link's data model is composed of the following entities, managed through the Base44 SDK.

### Core Account Entities

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **Account** | `plan`, `billing_cycle`, `owner_email`, `limits` (max_rooms, max_storage_gb, max_attendees, max_team_members), `usage` (active_rooms, storage_used_gb, attendees_this_month, hours_streamed) | Top-level account configuration and subscription details. |
| **User** (auth) | `email`, `name`, `role`, `avatar_url`, `onboarding_completed` | Authenticated user managed by Base44 auth system. |
| **TeamMember** | `email`, `name`, `role_id`, `status` (invited/active/deactivated), `invited_by` | A member of the account's team with role-based permissions. |
| **Role** | `name`, `permissions` (object mapping tab names to access levels), `is_default` | Custom role definition for granular access control. |

### Room & Event Entities

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **EventFolder (Room)** | `name`, `slug`, `settings`, `template_id`, `brand_kit_id`, `created_by` | Organizational container for events and elements. The primary "Room" concept in the UI. |
| **Event** | `folder_id`, `type` (meeting/webinar/livestream), `status` (scheduled/live/ended), `start_time`, `end_time`, `settings`, `recording_enabled` | A specific session instance within a Room. |
| **ScheduledMeeting** | `event_id`, `folder_id`, `title`, `start_time`, `end_time`, `recurrence`, `attendee_emails`, `calendar_integration` | A pre-scheduled meeting with calendar integration and attendee invitations. |
| **RoomTemplate** | `name`, `settings`, `default_type`, `default_elements`, `default_layout`, `brand_kit_id` | Reusable room configuration for quick setup. |

### Content & Media Entities

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **Recording** | `event_id`, `folder_id`, `url`, `duration`, `size_mb`, `format`, `status` (processing/ready/failed), `thumbnail_url` | A recorded session file with metadata. |
| **RepurposedClip** | `recording_id`, `start_time`, `end_time`, `url`, `title`, `description`, `thumbnail_url` | A segment extracted from a recording for sharing. |
| **SharedClip** | `clip_id`, `share_url`, `access_type` (public/restricted), `view_count`, `expires_at` | Public sharing configuration for a clip. |
| **SharedPresentation** | `presentation_url`, `share_url`, `title`, `slide_count`, `access_type` | Publicly shared presentation/slide deck. |
| **ClipAnalytics** | `clip_id`, `views`, `unique_viewers`, `avg_watch_time`, `completion_rate`, `referrers` | Analytics data for shared clips. |
| **MeetingTranscript** | `event_id`, `transcript_text`, `summary`, `action_items`, `language`, `status` (processing/complete) | AI-generated transcript and meeting summary. |

### Interactive Elements Entities

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **ElementFolder** | `name`, `room_id`, `sort_order` | Organizational container for grouping Elements. |
| **Element** | `folder_id`, `type` (slides/video/audio/link/banner/poll/website/prompter), `content`, `settings`, `sort_order` | An interactive overlay or media component for sessions. |
| **Poll** | `event_id`, `question`, `options`, `status` (draft/active/closed), `results`, `allow_multiple` | An audience poll displayed during a session. |
| **Banner** | `event_id`, `text`, `url`, `style`, `position`, `display_duration` | A visual overlay banner displayed during sessions. |
| **UserOverlay** | `user_id`, `event_id`, `type`, `content`, `position` | A per-user visual overlay in a session. |

### Engagement & Lead Entities

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **ChatMessage** | `event_id`, `user_id`, `message`, `timestamp`, `type` (text/system/reaction) | A message in the session chat. |
| **Reward** | `event_id`, `user_id`, `type`, `value`, `reason` | A reward or incentive given during a session. |
| **AuctionSession** | `event_id`, `items`, `status`, `current_bid`, `winner_id` | An auction event within a session. |
| **WebinarRegistration** | `event_id`, `email`, `name`, `registration_date`, `status` (registered/attended/no_show), `custom_fields` | A webinar attendee registration record. |
| **Query** | `type`, `parameters`, `results`, `created_at` | A saved or executed data query. |

### Branding & Integration Entities

| Entity | Key Fields | Description |
|--------|-----------|-------------|
| **BrandKit** | `name`, `primary_color`, `secondary_color`, `accent_color`, `font_family`, `logo_url`, `background_url`, `cta_button`, `exit_url`, `waiting_room_config`, `vanity_url` | Visual branding configuration applied to sessions and pages. |
| **Integration** | `type` (e.g., mailchimp, stripe, youtube), `status` (connected/disconnected), `credentials`, `settings`, `last_sync` | A connected third-party integration. |
| **NotetakerSettings** | `auto_transcribe`, `language`, `summary_enabled`, `action_items_enabled`, `notification_email` | Configuration for the AI notetaker feature. |

---

## URL Parameters Reference

### Studio Launch Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `type` | `meeting`, `webinar`, `livestream` | Session type to launch |
| `name` | String | Event/session display name |
| `room` | Room ID or slug | Target room for the session |
| `layout` | Layout identifier | Override default layout |
| `autostart` | `true`/`false` | Automatically start the session on load |

### Authentication Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `access_token` | JWT string | Authentication token (passed via URL fragment) |
| `clear_access_token` | `true` | Forces token clear and re-authentication |

### Navigation Parameters

| Parameter | Values | Description |
|-----------|--------|-------------|
| `fromUrl` | URL string | Return URL after authentication or flow completion |
| `tab` | Admin tab name | Direct navigation to specific Admin tab (e.g., `/Admin?tab=rooms`) |

---

## Integrations Overview (21+ Integrations)

R-Link supports extensive third-party integrations, managed through the Admin > Integrations tab.

### Email Marketing

| Integration | Features | Plan |
|------------|----------|------|
| **Mailchimp** | Sync attendees to lists, automated campaigns, tag management | Business |
| **SendGrid** | Transactional emails, event notifications, custom templates | Business |
| **ActiveCampaign** | Contact sync, automation triggers, deal creation | Business |
| **ConvertKit** | Subscriber management, tag-based sequences | Business |
| **Marketo** | Lead sync, program membership, activity tracking | Business |

### CRM & Sales

| Integration | Features | Plan |
|------------|----------|------|
| **Salesforce** | Lead/contact sync, opportunity creation, activity logging | Business |
| **HubSpot** | Contact sync, deal tracking, meeting logging | Business |
| **Go High Level** | Contact sync, pipeline management, automated follow-ups | Business |

### Payments

| Integration | Features | Plan |
|------------|----------|------|
| **Stripe** | Paid events, subscription billing, one-time charges | Business |
| **PayPal** | Payment collection for events and registrations | Business |

### Cloud Storage

| Integration | Features | Plan |
|------------|----------|------|
| **Google Drive** | Auto-upload recordings, shared folder sync | Business |
| **Dropbox** | Recording backup, file sharing | Business |

### Authentication (SSO)

| Integration | Features | Plan |
|------------|----------|------|
| **Google SSO** | Single sign-on with Google accounts | Basic+ |
| **Microsoft SSO** | Single sign-on with Microsoft/Azure AD accounts | Basic+ |

### Calendar

| Integration | Features | Plan |
|------------|----------|------|
| **Google Calendar** | Two-way sync, auto-create events, join links | Basic+ |
| **Outlook Calendar** | Two-way sync, auto-create events, join links | Basic+ |
| **iCal Feed** | Read-only calendar feed for any iCal-compatible client | Basic+ |

### Streaming Platforms

| Integration | Features | Plan |
|------------|----------|------|
| **YouTube Live** | Direct RTMP streaming, auto-create broadcasts | Business |
| **Facebook Live** | Stream to pages/groups, audience metrics | Business |
| **Twitch** | RTMP streaming with chat integration | Business |
| **LinkedIn Live** | Professional broadcast streaming | Business |

### Communication

| Integration | Features | Plan |
|------------|----------|------|
| **Twilio** | Phone dial-in, SMS notifications, conferencing bridge | Business |

### Developer Tools

| Integration | Features | Plan |
|------------|----------|------|
| **Webhooks** | Custom HTTP callbacks for event-driven automation | Business |
| **API Keys** | Programmatic access to R-Link data and functions | Business |

---

## Settings and Options

### Account-Level Settings (Admin > Settings)
- Default session type (Meeting/Webinar/Live Stream)
- Default recording behavior (auto-record on/off)
- Notification preferences (email, in-app)
- Timezone configuration
- Language preferences
- Advanced: custom RTMP endpoints, webhook retry policies

### Room-Level Settings (Admin > Rooms > Room Settings)
- Room name and slug
- Assigned template
- Assigned brand kit
- Default session type override
- Participant limits override
- Waiting room enable/disable
- Chat settings (enabled/disabled, moderated)

---

## Troubleshooting

For detailed troubleshooting procedures, see [31-troubleshooting.md](31-troubleshooting.md).

### Quick Reference -- Common Issues

| Issue | Quick Resolution | Full Guide |
|-------|-----------------|------------|
| Can't access Admin tab | Check role permissions in access matrix above | 31-troubleshooting.md |
| Session won't start | Verify room exists, check plan limits, ensure correct session type | 31-troubleshooting.md |
| Integration won't connect | Re-authenticate, check credentials, verify plan supports integration | 31-troubleshooting.md |
| Missing features | Verify plan level (Basic vs Business) | 02-plans-and-pricing.md |

---

## FAQ

**Q: How many pages does R-Link have?**
A: R-Link has 14 pages: Admin, EventLanding, Home, Landing, MeetingNotes, Onboarding, Register, Replay, Setup, SharedClip, SharedPresentation, Studio, Viewer, and VirtualBackgroundTest.

**Q: How many admin tabs are there?**
A: There are 18 admin tabs: dashboard, account, rooms, schedule, recordings, clips, brand-kit, team, roles, templates, billing, integrations, settings, support, notetaker, leads, event-landing, and elements.

**Q: What is the difference between a Room and an EventFolder?**
A: They are the same entity. "EventFolder" is the technical entity name in the data model; "Room" is the user-facing term in the UI.

**Q: Can I use R-Link without the Base44 platform?**
A: No. R-Link is built on Base44 and requires the Base44 SDK for authentication, data persistence, and serverless functions.

**Q: What is the maximum number of simultaneous rooms?**
A: Basic plan supports 1 room; Business plan supports up to 5 parallel rooms.

**Q: Can Basic plan users host webinars?**
A: No. Webinars and Live Streams require the Business plan.

**Q: How many integrations does R-Link support?**
A: R-Link supports 21+ integrations across email marketing, CRM, payments, cloud storage, SSO, calendar, streaming platforms, and communication. Plus Webhooks and API Keys for developer access.

---

## Known Limitations

1. **Single-tenant architecture:** Each R-Link instance is tied to one Base44 application ID. Multi-tenant deployments require separate app instances.
2. **Browser-only:** R-Link is a web application; there are no native desktop or mobile applications.
3. **WebRTC dependency:** Interactive participation requires a WebRTC-capable browser. Safari has limited SFU support.
4. **RTMP output only:** Live streaming uses RTMP for output; SRT and HLS ingest are not currently supported.
5. **No offline mode:** R-Link requires an active internet connection for all features.
6. **Sidebar auto-collapse:** On screens narrower than 768px, the admin sidebar automatically collapses to a hamburger menu.
7. **Entity query limits:** Base44 entity list queries may have pagination limits depending on the serverless function configuration.

---

## Plan Requirements

See [02-plans-and-pricing.md](02-plans-and-pricing.md) for complete plan comparison and feature gating details.

---

## Related Documents

- [00-index.md](00-index.md) -- Master index and question routing
- [02-plans-and-pricing.md](02-plans-and-pricing.md) -- Plans, pricing, and billing
- [03-getting-started.md](03-getting-started.md) -- Registration, onboarding, and first session
- [31-troubleshooting.md](31-troubleshooting.md) -- Troubleshooting, diagnostics, and known limitations
