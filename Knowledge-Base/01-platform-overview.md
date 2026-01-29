# R-Link Platform Overview

## Overview

R-Link is a live video collaboration platform built on the Base44 platform. It enables organizations to host meetings, webinars, and live streams from a single unified interface called the Studio. R-Link provides a complete ecosystem for live video events including scheduling, branding, recording, audience engagement elements, team management, and integrations with 21 third-party services across email, payments, CRM, calendar, cloud storage, SSO, SMS, and live streaming categories.

The platform serves two plan tiers -- Basic (for small teams and meetings) and Business (for organizations that need webinars, live streaming, advanced branding, and AI features). All interactions flow through a React-based frontend that communicates with Base44's backend services via the Base44 SDK.

---

## Architecture

### Technology Stack

| Layer | Technology |
|---|---|
| Frontend Framework | React |
| Data Fetching / Caching | TanStack Query (React Query) |
| Backend Platform | Base44 |
| SDK | Base44 JavaScript SDK |
| Authentication | Base44 Auth (OAuth-based, token-based access) |
| Real-time Video | WebRTC (via Base44 infrastructure) |
| Live Streaming Protocol | RTMP |

### How It Works

1. **Base44 Platform**: R-Link is a Base44 application. Base44 provides the backend infrastructure, database (entities), authentication, file storage, and serverless functions. The R-Link frontend is a React single-page application (SPA) that uses the Base44 SDK to interact with these services.

2. **Entity-Driven Data Model**: All data is stored as Base44 entities. The platform defines the following entities:
   - `Account` -- Organization account with plan, billing, and usage data
   - `Room` -- Virtual room configuration (name, type, capacity, branding overrides)
   - `BrandKit` -- Visual branding settings (colors, fonts, frames, lower thirds, logos)
   - `TeamMember` -- Users associated with an account, with role assignments
   - `RoomTemplate` -- Reusable room configurations
   - `Integration` -- Third-party service connections (21 supported platforms)
   - `NotetakerSettings` -- AI notetaker configuration
   - `Role` -- Permission role definitions (built-in: admin, host; custom roles supported)
   - `ElementFolder` -- Organizational folders for elements
   - `Element` -- Interactive overlays (Links, Banners, Polls, Website Overlays, Prompter, Core Media)
   - `ChatMessage` -- In-session chat messages
   - `Reward` -- Gamification rewards
   - `AuctionSession` -- Auction/bidding sessions
   - `UserOverlay` -- Per-user visual overlays
   - `EventFolder` -- Organizational folders for events

3. **React Query Integration**: Data fetching uses TanStack Query for caching, background refetching, and optimistic updates. Entity data is typically fetched via `useQuery` hooks that wrap Base44 SDK calls.

4. **Authentication Flow**: Base44 handles authentication. The `AuthContext` provides `user`, `isAuthenticated`, `isLoadingAuth`, `authError`, `logout`, and `navigateToLogin`. Tokens are passed via URL parameter (`access_token`) and persisted in `localStorage` as `base44_access_token`.

### Application Parameters

R-Link receives configuration via URL query parameters:

| Parameter | Description | Example |
|---|---|---|
| `appId` | The Base44 application ID | `appId=rlink-abc123` |
| `serverUrl` | Base44 server endpoint URL | `serverUrl=https://api.base44.io` |
| `token` / `access_token` | Authentication token (from URL) | `access_token=eyJhb...` |
| `fromUrl` | Return URL after auth flows | `fromUrl=https://app.rlink.com/admin` |
| `functionsVersion` | Serverless functions version identifier | `functionsVersion=v2` |

---

## Glossary of Key Terms

| Term | Definition |
|---|---|
| **Account** | An organization's R-Link subscription. Contains plan details, billing info, usage metrics, and team members. Each account has an owner identified by `owner_email`. |
| **Room** | A virtual space where sessions take place. Rooms have persistent configuration (name, type, capacity, branding). Basic plan allows 1 room; Business allows 5 parallel rooms. |
| **Studio** | The live session interface where hosts produce content. Contains video feeds, layouts, elements, chat, and production controls. Accessed via the `/studio` page. |
| **Session** | An active instance of a Room. A session has a type (Meeting, Webinar, or Live Stream) that determines available layouts, participant roles, and features. |
| **Session Type** | One of three modes: `meeting` (collaborative), `webinar` (host-led presentation), or `livestream` (production-quality broadcast). Set via the `?type=` URL parameter. |
| **Element** | An interactive overlay or media item used during sessions. Types include Links, Banners, Polls, Website Overlays, Prompter, and Core Media (Slides, Video, Audio). Core Media is available on Basic; all others require Business. |
| **Brand Kit** | A collection of visual branding settings including colors, fonts, frame styles, lower third templates, and logos. Each account has a Brand Kit that can be overridden per room. |
| **Layout** | The visual arrangement of video feeds and content in the Studio. Each session type has its own set of available layouts (e.g., Gallery View for meetings, Stage-Host Full for webinars). |
| **Scene** | In Live Stream mode, a layout configuration is referred to as a "scene" (e.g., Host Scene, Interview Scene, CTA Scene). |
| **View** | In Meeting mode, layouts are called "views" (e.g., Gallery View, Speaker View, Focus View). |
| **Viewer** | The audience-facing page (`/viewer`) where non-host participants watch a webinar or live stream. |
| **Replay** | The post-session playback page (`/replay`) for watching recorded sessions. |
| **Admin Portal** | The management interface (`/admin`) with 18 tabs for configuring the account, rooms, branding, team, integrations, billing, and more. |
| **Breakout Room** | A sub-room within a session for small group discussions. Basic allows 1; Business allows unlimited. |
| **Whiteboard** | A collaborative drawing canvas within a session. Basic allows 1; Business allows unlimited. |
| **RTMP** | Real-Time Messaging Protocol, used for pushing live streams to external platforms (YouTube, Facebook, Twitch, LinkedIn). Business plan only. |
| **Lower Third** | A graphical overlay displayed at the bottom third of the video frame, typically showing a person's name and title. Configurable via Brand Kit. |
| **Vanity URL** | A custom URL for accessing sessions (e.g., `rlink.com/your-company`). Business plan only. |
| **Waiting Room** | A pre-session holding area where attendees wait until the host admits them. Customizable branding on Business plan. |
| **CTA Button** | A call-to-action button overlay displayed during sessions. Business plan only. |
| **Exit URL** | A URL that attendees are redirected to after a session ends. Business plan only. |
| **Notetaker** | The AI-powered meeting notes feature that transcribes and summarizes sessions. Business plan only (part of R-Link AI Suite). |
| **Translation** | AI-powered real-time translation during sessions. Business plan only (part of R-Link AI Suite). |

---

## Navigation Map

### All Pages

R-Link consists of 14 pages, each serving a specific purpose:

| Page | Route | Purpose |
|---|---|---|
| **Home** | `/` | Main landing/dashboard after login. Entry point for authenticated users. |
| **Landing** | `/landing` | Public marketing/information page for the platform. |
| **Register** | `/register` | New user registration page. |
| **Onboarding** | `/onboarding` | Post-registration guided setup flow. |
| **Admin** | `/admin` | Administration portal with 18 tabs (see below). Primary management interface. |
| **Studio** | `/studio` | Live session production interface. Where hosts run meetings, webinars, and streams. |
| **Viewer** | `/viewer` | Audience-facing page for watching live sessions. |
| **Setup** | `/setup` | Pre-session device and settings check (camera, microphone, speaker test). |
| **Replay** | `/replay` | Post-session recording playback page. |
| **MeetingNotes** | `/meeting-notes` | AI-generated meeting notes, transcripts, and summaries. |
| **EventLanding** | `/event-landing` | Public landing page for specific events (registration, details, schedule). |
| **SharedClip** | `/shared-clip` | Public sharing page for video clips extracted from recordings. |
| **SharedPresentation** | `/shared-presentation` | Public sharing page for presentation slides. |
| **VirtualBackgroundTest** | `/virtual-background-test` | Testing page for virtual background functionality. |

### Admin Portal Tabs (18 Total)

The Admin page (`/admin`) contains 18 tabs organized by function:

| Tab | Slug | Description | Access |
|---|---|---|---|
| **Dashboard** | `dashboard` | Overview analytics, usage metrics, quick actions | Public (all roles) |
| **Account** | `account` | Account settings, organization name, owner info | Public (all roles) |
| **Rooms** | `rooms` | Create, configure, and manage virtual rooms | Permission-gated |
| **Schedule** | `schedule` | Event calendar, create/edit scheduled sessions | Public (all roles) |
| **Recordings** | `recordings` | Browse, play, download, and manage session recordings | Permission-gated |
| **Clips** | `clips` | Create and manage short clips from recordings | Permission-gated |
| **Brand Kit** | `brand-kit` | Visual branding: colors, fonts, frames, lower thirds, logos | Permission-gated |
| **Team** | `team` | Invite and manage team members, assign roles | Permission-gated |
| **Roles** | `roles` | Define permission roles (admin, host, custom) | Owner-only |
| **Templates** | `templates` | Create and manage reusable room templates | Permission-gated |
| **Billing** | `billing` | Subscription plan, payment method, invoices, usage | Owner-only |
| **Integrations** | `integrations` | Connect third-party services (21 supported) | Permission-gated |
| **Settings** | `settings` | Global platform settings and preferences | Permission-gated |
| **Support** | `support` | Help resources, contact support, documentation links | Public (all roles) |
| **Notetaker** | `notetaker` | AI notetaker configuration and settings | Public (all roles) |
| **Leads** | `leads` | Lead capture data, attendee information, CRM sync | Permission-gated |
| **Event Landing** | `event-landing` | Design and manage event landing/registration pages | Permission-gated |
| **Elements** | `elements` | Manage interactive overlays (Links, Banners, Polls, etc.) | Permission-gated |

**Access levels explained:**
- **Public**: Visible to all authenticated team members regardless of role (dashboard, account, schedule, support, notetaker)
- **Owner-only**: Restricted to the account owner only (billing, roles)
- **Permission-gated**: Controlled by the role-based permission system via `usePermissions` hook

---

## Session Types

R-Link supports three distinct session types, each optimized for a different use case:

### Meeting (Collaborative)

- **Purpose**: Interactive team collaboration where all participants can speak and share
- **Default Layout**: Gallery View (all participants in equal-sized tiles)
- **Mode Identifier**: `meeting`
- **URL Parameter**: `?type=meeting`
- **Key Characteristics**:
  - All participants are interactive (can enable camera/mic)
  - Up to 50 participants (Basic) or 100 participants (Business)
  - Breakout rooms available (1 on Basic, unlimited on Business)
  - Whiteboards available (1 on Basic, unlimited on Business)
  - Collaborative screen sharing

**Available Layouts (Meeting):**

| Layout | Description |
|---|---|
| Gallery View | Equal-sized grid of all participants |
| Speaker View | Active speaker enlarged, others in smaller tiles |
| Screen+Thumbnails | Shared screen prominent with participant thumbnails |
| Presenter Mode | Single presenter full-screen with minimal UI |
| Focus View | Focused on one participant, others hidden |

### Webinar (Host-Led)

- **Purpose**: Presentation-style events with a clear host/speaker and audience
- **Default Layout**: Stage-Host Full (host fills the stage area)
- **Mode Identifier**: `webinar`
- **URL Parameter**: `?type=webinar`
- **Plan Requirement**: Business plan required
- **Key Characteristics**:
  - Host and designated speakers are on stage; audience is view-only
  - Up to 1,000 attendees
  - Audience interacts via chat, polls, and Q&A
  - Event landing page for registration
  - Lead capture integration

**Available Layouts (Webinar):**

| Layout | Description |
|---|---|
| Stage-Host Full | Host fills the entire stage area |
| Host+Guest | Host and one guest side by side on stage |
| Panel | Multiple speakers in a panel arrangement |
| Content Focus | Shared content (slides/media) fills the stage |
| Content+Host | Shared content with host picture-in-picture |
| Offer Layout | Special layout for product/service offers with CTA |

### Live Stream (Production-Quality)

- **Purpose**: Broadcast-quality production streamed to external platforms
- **Default Layout**: Host Scene (host as primary scene)
- **Mode Identifier**: `livestream`
- **URL Parameter**: `?type=livestream`
- **Plan Requirement**: Business plan required
- **Key Characteristics**:
  - RTMP output to YouTube, Facebook Live, Twitch, LinkedIn Live
  - Multi-platform simultaneous streaming
  - Scene-based production workflow
  - Lower thirds, overlays, media scenes
  - Professional broadcast aesthetics

**Available Layouts (Live Stream):**

| Layout | Description |
|---|---|
| Host Scene | Host as the primary visual element |
| Interview Scene | Host and guest in interview format |
| Multi-Guest Panel | Multiple guests in panel arrangement |
| Media Scene | Full-screen media playback (video/slides) |
| Media+Host | Media content with host picture-in-picture |
| Comment Highlight | Audience comment displayed prominently on screen |
| CTA Scene | Call-to-action scene with promotional content |

---

## Integrations Overview

R-Link supports 21 third-party integrations across 8 categories:

| Category | Integrations | Plan |
|---|---|---|
| **Email** | Mailchimp, SendGrid | Business |
| **Payment** | Stripe, PayPal | Business |
| **Cloud Storage** | Google Drive, Dropbox | Business |
| **Authentication/SSO** | Google SSO, Microsoft SSO | Business |
| **CRM** | Salesforce, HubSpot, Marketo, ActiveCampaign, ConvertKit, Go High Level | Business |
| **Calendar** | Google Calendar, Outlook, iCal Feed | Both plans |
| **SMS** | Twilio | Business |
| **Live Streaming** | YouTube, Facebook Live, Twitch, LinkedIn Live | Business |

Additionally, two developer-oriented integration mechanisms are available:
- **Webhooks**: Send event data to custom endpoints
- **API Keys**: Programmatic access to R-Link data

---

## Default Brand Kit

When a new account is created, R-Link automatically generates a Brand Kit with the following defaults:

| Setting | Default Value |
|---|---|
| **Primary Color** | `#6a1fbf` (purple) |
| **Accent Color** | `#00c853` (green) |
| **Background Color** | `#001233` (dark navy) |
| **Text Color** | `#ffffff` (white) |
| **Secondary Text Color** | `#9ca3af` (gray) |
| **Heading Font** | Inter |
| **Body Font** | Inter |
| **Caption Font** | Inter |
| **Frame Style** | Rounded |
| **Frame Border Width** | 2px |
| **Frame Border Color** | `#6a1fbf` (matches primary) |
| **Frame Shadow** | Enabled |
| **Lower Third Template** | Modern |
| **Lower Third Background** | `#001233` (matches background) |
| **Lower Third Text Color** | `#ffffff` (white) |
| **Lower Third Accent** | `#6a1fbf` (matches primary) |
| **Lower Third Show Logo** | Enabled |

---

## Permissions System

R-Link uses a role-based access control system managed by the `usePermissions` hook.

### Key Concepts

- **Owner**: The user whose email matches `account.owner_email`. Has unrestricted access to all features.
- **Role**: A named set of permissions assigned to team members. Built-in roles: `admin` (all permissions) and `host` (limited team/rooms access).
- **Permission Check**: `hasPermission(category, action)` returns boolean.
- **Tab Access Check**: `canAccessTab(tab)` returns boolean.

### Tab Access Rules

| Tab(s) | Access Rule |
|---|---|
| dashboard, account, schedule, support, notetaker | Public -- all authenticated users |
| billing, roles | Owner-only |
| All other tabs | Permission-gated by role |

### Built-in Roles

| Role | Permissions |
|---|---|
| `admin` | All permissions across all categories |
| `host` | Limited permissions in team and rooms categories |

Custom roles can be created by the account owner via the Roles admin tab.

---

## Settings and Options

### Application-Level Settings

| Setting | Location | Description |
|---|---|---|
| App ID | URL param `appId` | Identifies the Base44 application instance |
| Server URL | URL param `serverUrl` | Base44 backend server endpoint |
| Functions Version | URL param `functionsVersion` | Version of serverless functions to use |
| Access Token | URL param `access_token` or `token` | Authentication bearer token |
| Return URL | URL param `fromUrl` | URL to redirect back after authentication |

### Account-Level Settings

| Setting | Default | Description |
|---|---|---|
| Plan | `basic` | Subscription tier (basic or business) |
| Billing Cycle | `monthly` | Payment frequency (monthly or annual) |
| Max Rooms | 5 | Maximum rooms allowed |
| Max Storage (GB) | 10 | Maximum storage in gigabytes |
| Max Attendees | 100 | Maximum attendees per session |
| Max Team Members | 3 | Maximum team members on the account |

---

## Troubleshooting

### Common Platform-Level Issues

| Issue | Cause | Solution |
|---|---|---|
| Blank page after login | Missing `appId` or `serverUrl` params | Verify URL contains all required parameters |
| "Not authenticated" error | Missing or expired token | Re-authenticate or check `access_token` param |
| Admin tabs missing | Insufficient role permissions | Check user's role via Team tab; contact account owner |
| Features appear locked | Basic plan limitation | Review [02-plans-and-pricing.md](./02-plans-and-pricing.md) for plan requirements |
| Slow data loading | Network or TanStack Query cache issue | Refresh the page; check network connectivity |

---

## FAQ

**Q: What platforms does R-Link support for live streaming?**
A: YouTube, Facebook Live, Twitch, and LinkedIn Live via RTMP. This requires the Business plan.

**Q: How many people can join a session?**
A: Meetings support up to 50 (Basic) or 100 (Business) interactive participants. Webinars support up to 1,000 attendees (Business only).

**Q: Is R-Link a standalone application?**
A: R-Link is built on the Base44 platform. It uses Base44 for backend services, authentication, data storage, and serverless functions. The frontend is a standalone React application.

**Q: Can I use R-Link on mobile?**
A: The platform is responsive. On screens narrower than 768px, sidebars auto-collapse. Full Studio functionality is optimized for desktop browsers.

**Q: What browsers are supported?**
A: Any modern browser supporting WebRTC and `getUserMedia` API (Chrome, Firefox, Edge, Safari). Chrome is recommended for best performance.

---

## Known Limitations

1. **Mobile Studio**: The Studio interface is optimized for desktop. On mobile devices (under 768px width), sidebars auto-collapse and some production controls may be less accessible.
2. **Single Account per User**: The current architecture associates one account per authenticated user context.
3. **Base44 Dependency**: All backend operations depend on Base44 platform availability. If Base44 experiences downtime, R-Link is affected.
4. **RTMP Latency**: Live streams to external platforms have inherent RTMP latency (typically 5-30 seconds depending on the destination platform).
5. **Browser WebRTC Support**: Features requiring camera/microphone access depend on browser WebRTC support and `getUserMedia` API availability.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Admin Portal | Yes | Yes |
| Meeting Session Type | Yes | Yes |
| Webinar Session Type | No | Yes |
| Live Stream Session Type | No | Yes |
| Brand Kit (basic) | Yes | Yes |
| Full Branding Suite | No | Yes |
| AI Suite (Notetaker + Translation) | No | Yes |
| All Elements | Core Media only | All unlocked |
| Most Integrations | No | Yes |

---

## Related Documents

- [00-index.md](./00-index.md) -- Master index and question routing
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Detailed plan comparison and billing
- [03-getting-started.md](./03-getting-started.md) -- Signup and onboarding guide
- [31-troubleshooting.md](./31-troubleshooting.md) -- Error diagnosis and resolution
