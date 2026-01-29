# Getting Started with R-Link

## Overview

This guide walks new customers through every step of getting started on the R-Link platform -- from initial signup and registration, through the guided onboarding flow, to creating a first room and launching a live session. It covers account auto-creation, default Brand Kit initialization, session type selection, and the Setup page for device configuration. By the end of this guide, a new user should be able to host their first meeting, webinar, or live stream.

---

## Signup and Registration

### Registration Page

New users begin at the **Register** page (`/register`). This page is the entry point for creating an R-Link user account.

**Step-by-step signup process:**

1. Navigate to the R-Link registration URL
2. The Register page presents a signup form
3. Enter the required information:
   - Email address
   - Password (or use SSO if available on Business plans with Google SSO or Microsoft SSO configured)
4. Submit the registration form
5. Base44 authentication creates the user account
6. An authentication token (`access_token`) is generated and provided
7. The user is redirected to the **Onboarding** page (`/onboarding`)

**Technical details:**
- Authentication is handled by the Base44 SDK
- Upon successful registration, an `access_token` is returned in the URL and stored in `localStorage` as `base44_access_token`
- The `AuthContext` provider wraps the application and exposes: `user`, `isAuthenticated`, `isLoadingAuth`, `authError`, `logout`, `navigateToLogin`

### Authentication Parameters

The following URL parameters are used during and after authentication:

| Parameter | Purpose |
|---|---|
| `access_token` (or `token`) | Bearer token for API authentication, passed via URL after auth |
| `appId` | Identifies the R-Link Base44 application |
| `serverUrl` | Base44 backend endpoint URL |
| `fromUrl` | Return URL to redirect after auth flow completes |
| `functionsVersion` | Serverless functions version identifier |

### Existing User Login

Returning users authenticate through the Base44 login flow:

1. Navigate to the R-Link application URL
2. If no valid token is found in `localStorage`, the user is redirected to the Base44 login page
3. Enter email and password (or use SSO)
4. On success, `access_token` is set in the URL and persisted to `localStorage`
5. The user is redirected to the **Home** page (`/`)

---

## Onboarding Flow

### Onboarding Page

The **Onboarding** page (`/onboarding`) is a guided setup wizard that appears after first-time registration. It helps new users configure their account and understand the platform.

**Onboarding steps typically include:**

1. **Welcome Screen**: Introduction to R-Link and its capabilities (Meetings, Webinars, Live Streams)
2. **Account Setup**: Organization name, basic account preferences
3. **Brand Kit Preview**: Preview of default branding (can be customized later in Admin > Brand Kit)
4. **First Room Creation**: Guided creation of the user's first virtual room
5. **Session Type Introduction**: Explanation of Meeting, Webinar, and Live Stream modes
6. **Completion**: Redirect to the Admin Dashboard or Home page

### First-Time Account Auto-Creation

When a newly registered user has no existing accounts, R-Link automatically creates a default account:

**Auto-created Account defaults:**

| Field | Default Value |
|---|---|
| `plan` | `basic` |
| `billing_cycle` | `monthly` |
| `limits.max_rooms` | 5 |
| `limits.max_storage_gb` | 10 |
| `limits.max_attendees` | 100 |
| `limits.max_team_members` | 3 |
| `owner_email` | The registering user's email |

**What happens during auto-creation:**

1. The system detects no Account entity exists for the authenticated user
2. A new Account entity is created with the defaults above
3. The user's email is set as `owner_email`, granting full owner-level access
4. A default Brand Kit is auto-created and associated with the account (see below)
5. The user is granted implicit `admin` role as the account owner

### Default Brand Kit Auto-Creation

When a new account is created, a Brand Kit entity is automatically generated with the following defaults:

| Setting Category | Field | Default Value |
|---|---|---|
| **Colors** | Primary | `#6a1fbf` (purple) |
| | Accent | `#00c853` (green) |
| | Background | `#001233` (dark navy) |
| | Text | `#ffffff` (white) |
| | Secondary Text | `#9ca3af` (gray) |
| **Fonts** | Heading | `Inter` |
| | Body | `Inter` |
| | Caption | `Inter` |
| **Frame Settings** | Style | `rounded` |
| | Border Width | `2` (pixels) |
| | Border Color | `#6a1fbf` (matches primary) |
| | Shadow | `true` (enabled) |
| **Lower Third** | Template | `modern` |
| | Background Color | `#001233` (matches background) |
| | Text Color | `#ffffff` (white) |
| | Accent Color | `#6a1fbf` (matches primary) |
| | Show Logo | `true` (enabled) |

The Brand Kit can be fully customized later via the **Admin > Brand Kit** tab.

---

## Creating Your First Room

### What is a Room?

A Room is a persistent virtual space where sessions (meetings, webinars, or live streams) take place. Rooms have their own configuration including name, type, participant capacity, and optional branding overrides. On the Basic plan, you can create 1 room. On the Business plan, you can create up to 5 rooms that can run in parallel.

### Step-by-Step Room Creation

1. Navigate to **Admin > Rooms** tab (`/admin?tab=rooms`)
2. Click the **Create Room** button
3. Fill in room configuration:

| Field | Required | Description |
|---|---|---|
| Room Name | Yes | A descriptive name for the room (e.g., "Weekly Team Standup", "Product Launch Webinar") |
| Room Type | Yes | Default session type for this room: Meeting, Webinar, or Live Stream |
| Max Participants | Optional | Override the default participant limit for this room |
| Description | Optional | Internal description for team reference |
| Branding Overrides | Optional | Override account-level Brand Kit settings for this specific room |

4. Click **Save** or **Create**
5. The new room appears in the Rooms list
6. The room is now ready to launch a session

### Room Templates

For frequently used configurations, Room Templates can be created and reused:

1. Navigate to **Admin > Templates** tab
2. Create a template with pre-configured room settings
3. When creating a new room, select a template to auto-fill the configuration

---

## Launching the Studio

### What is the Studio?

The Studio (`/studio`) is the live session production interface. It is where hosts manage video feeds, switch layouts, activate elements, manage participants, and control the session. The Studio is the core production environment for all three session types.

### How to Launch Studio

**Method 1: From Admin > Rooms**
1. Navigate to **Admin > Rooms** tab
2. Find the room you want to launch
3. Click the **Launch** or **Start Session** button
4. You are redirected to the Setup page (if configured) or directly to the Studio

**Method 2: Direct URL**
Navigate directly to the Studio URL with appropriate parameters:
```
/studio?appId={appId}&serverUrl={serverUrl}&access_token={token}&type={session_type}
```

**Method 3: From Home/Dashboard**
1. Navigate to the Home page (`/`)
2. Quick-launch a session from the dashboard
3. Select room and session type
4. Proceed through Setup to Studio

### Pre-Session Setup Page

Before entering the Studio, users typically pass through the **Setup** page (`/setup`). This page allows pre-session device configuration:

| Setup Step | Description |
|---|---|
| **Camera Selection** | Choose which camera device to use; preview the video feed |
| **Microphone Selection** | Choose which microphone to use; test audio input levels |
| **Speaker Selection** | Choose audio output device; test speaker playback |
| **Virtual Background** | Select or upload a virtual background (optional) |
| **Display Name** | Set the name displayed to other participants |
| **Audio/Video Toggle** | Choose whether to join with camera and/or microphone on or off |
| **Network Check** | Verify network quality is sufficient for the session |

After completing setup, click **Join** or **Enter Studio** to proceed to the live session.

---

## Session Type Selection

### How Session Types Are Selected

The session type determines the available layouts, participant roles, and features for a session. Session type is specified via the `?type=` URL query parameter:

| Session Type | URL Parameter | Default Layout | Plan Required |
|---|---|---|---|
| Meeting | `?type=meeting` | Gallery View (gallery) | Basic or Business |
| Webinar | `?type=webinar` | Stage-Host Full (stage_host) | Business only |
| Live Stream | `?type=livestream` | Host Scene (live_host) | Business only |

### Setting Session Type

Session type can be set in multiple ways:

1. **Room Default**: Each room has a default session type configured during creation
2. **URL Parameter Override**: Adding `?type=meeting`, `?type=webinar`, or `?type=livestream` to the Studio URL overrides the room default
3. **Session Launch UI**: When launching a session from the Admin portal, the session type can be selected in the launch dialog

### Session Type Comparison

| Feature | Meeting | Webinar | Live Stream |
|---|---|---|---|
| **Participant Model** | All participants interactive | Hosts/speakers on stage; audience view-only | Production crew; audience via RTMP |
| **Default Layout** | Gallery View | Stage-Host Full | Host Scene |
| **Max Participants** | 50 (Basic) / 100 (Business) | Up to 1,000 attendees | Unlimited (via RTMP platforms) |
| **Breakout Rooms** | Yes | No | No |
| **Whiteboards** | Yes | No | No |
| **RTMP Output** | No | No | Yes |
| **Screen Sharing** | All participants | Hosts/speakers | Production-controlled |
| **Chat** | All participants | All (including audience) | Via streaming platform |
| **Polls** | Yes (Business) | Yes (Business) | Via streaming platform |
| **Recording** | Yes | Yes | Yes (plus stream recording) |

---

## Quick Start Guides

### Quick Start: First Meeting

1. **Sign up** at the Register page
2. **Complete onboarding** -- your account and Brand Kit are auto-created
3. **Create a room** in Admin > Rooms (or use the auto-created default room if available)
4. **Launch the session** -- click Start on your room
5. **Complete Setup** -- select camera, microphone, test audio
6. **Enter Studio** -- you are now in Gallery View with all participant tiles
7. **Invite participants** -- share the room link; participants join via the Viewer page
8. **Use features**: Enable screen sharing, open whiteboard, use chat
9. **End session** -- click End Meeting; recording is saved automatically (if enabled)
10. **Review** -- check recording in Admin > Recordings; view notes in Meeting Notes (Business)

### Quick Start: First Webinar (Business Plan)

1. **Ensure Business plan** -- Webinars require the Business plan
2. **Create a room** with type set to **Webinar**
3. **Set up Event Landing page** (optional) -- Admin > Event Landing to create a registration page
4. **Configure elements** -- Add Polls, Banners, Links, CTA overlays in Admin > Elements
5. **Schedule the webinar** -- Admin > Schedule to set date/time and enable registration
6. **Share registration link** -- Send the Event Landing page URL to your audience
7. **Launch the session** at the scheduled time
8. **Complete Setup** and enter Studio
9. **Manage the stage** -- You appear on stage by default; invite speakers to join the stage
10. **Engage audience** -- Launch polls, display banners, use chat Q&A
11. **End session** -- Click End Webinar; recording saved; attendee data captured in Leads

### Quick Start: First Live Stream (Business Plan)

1. **Ensure Business plan** -- Live Streaming requires the Business plan
2. **Connect streaming platforms** -- Admin > Integrations to connect YouTube, Facebook, Twitch, and/or LinkedIn
3. **Create a room** with type set to **Live Stream**
4. **Configure scenes** -- Plan your scenes (Host, Interview, Media, CTA, etc.)
5. **Prepare elements** -- Upload media, set up lower thirds, prepare CTA overlays
6. **Launch the session**
7. **Complete Setup** and enter Studio
8. **Start streaming** -- Activate RTMP output to connected platforms
9. **Produce the show** -- Switch between scenes, display elements, manage guests
10. **End stream** -- Stop RTMP output first, then end the session
11. **Review** -- Check recording; monitor analytics

---

## Settings and Options

### Registration Settings

| Setting | Description |
|---|---|
| Email | Primary email for authentication and account ownership |
| Password | Account password (managed by Base44 auth) |
| SSO | Google SSO or Microsoft SSO (if configured by the organization, Business plan) |

### Onboarding Settings

| Setting | Description |
|---|---|
| Organization Name | Name of the organization (stored on Account entity) |
| Default Room Name | Name for the first auto-created room |
| Session Type Preference | Preferred default session type |
| Brand Colors | Quick-set primary and accent colors (optional; detailed setup in Brand Kit) |

### Setup Page Settings

| Setting | Description | Persistence |
|---|---|---|
| Camera Device | Selected camera hardware | Persisted for future sessions |
| Microphone Device | Selected microphone hardware | Persisted for future sessions |
| Speaker Device | Selected audio output hardware | Persisted for future sessions |
| Virtual Background | Background image or blur effect | Persisted for future sessions |
| Display Name | Name shown to other participants | Persisted per user |
| Join with Camera On | Whether camera is enabled on join | Per-session choice |
| Join with Microphone On | Whether microphone is enabled on join | Per-session choice |

### Room Creation Settings

| Setting | Type | Default | Description |
|---|---|---|---|
| Room Name | Text | (required) | Display name for the room |
| Room Type | Selector | `meeting` | Default session type: meeting, webinar, or livestream |
| Max Participants | Number | Plan default | Override participant limit |
| Description | Text | (empty) | Internal description |
| Branding | Object | Account Brand Kit | Room-level branding overrides |
| Template | Selector | None | Apply a Room Template |
| Waiting Room | Toggle | Off | Enable waiting room (Business) |
| Recording | Toggle | Off | Auto-record sessions |

---

## Troubleshooting

### Registration and Login Issues

| Issue | Cause | Solution |
|---|---|---|
| Registration form does not submit | Missing required fields or validation error | Ensure email is valid format and password meets requirements |
| "User already registered" error | Email already has an account | Use login instead of register; or use password reset if forgotten |
| Registration succeeds but no redirect | Missing `fromUrl` or `appId` parameter | Verify the registration URL contains all required application parameters |
| SSO login fails | SSO integration not configured | SSO requires Business plan with Google SSO or Microsoft SSO integration configured in Admin > Integrations |
| "auth_required" error (403) | No valid authentication token | Re-authenticate; navigate to login page |
| "user_not_registered" error (403) | Token is valid but user has no R-Link account | Complete the registration process |
| 401 Unauthorized error | Token has expired | Re-authenticate to obtain a fresh token |

### Onboarding Issues

| Issue | Cause | Solution |
|---|---|---|
| Onboarding page is blank | JavaScript error or missing app parameters | Check browser console for errors; verify URL parameters |
| Account not created after onboarding | Auto-creation failed | Try refreshing the page; if persists, log out and log back in to trigger auto-creation |
| Brand Kit not created | Account creation incomplete | Navigate to Admin > Brand Kit; if empty, the Brand Kit auto-creation may need to be triggered by re-saving account settings |
| Stuck on onboarding step | UI state error | Refresh the page; clear browser cache; try in an incognito window |

### Room Creation Issues

| Issue | Cause | Solution |
|---|---|---|
| "Room limit reached" | `active_rooms >= max_rooms` for current plan | Delete or deactivate unused rooms; or upgrade plan |
| Cannot select Webinar or Live Stream type | Basic plan | These session types require the Business plan |
| Room creation form does not appear | Insufficient permissions | Check user role; Room creation may require specific permissions |
| Room saves but does not appear in list | Data fetch delay | Refresh the Rooms tab; check TanStack Query cache |

### Setup Page Issues

| Issue | Cause | Solution |
|---|---|---|
| Camera not detected | Browser permissions denied or hardware issue | Grant camera permission in browser settings; check if camera is in use by another application |
| Microphone not detected | Browser permissions denied or hardware issue | Grant microphone permission in browser settings; check system audio settings |
| "getUserMedia is not supported" | Browser does not support WebRTC | Use a modern browser (Chrome, Firefox, Edge, Safari) |
| Virtual background not rendering | WebGL or hardware acceleration disabled | Enable hardware acceleration in browser settings; some older hardware may not support virtual backgrounds |
| Setup page does not load | Missing URL parameters | Verify Studio URL contains `appId`, `serverUrl`, and valid `access_token` |

### Studio Launch Issues

| Issue | Cause | Solution |
|---|---|---|
| Studio shows "Not authenticated" | Token expired or invalid | Re-authenticate; check that `access_token` in URL or `localStorage` is valid |
| Studio loads but no video | Camera permissions not granted | Check browser permission bar; ensure camera is selected in Setup |
| "Room not found" error | Invalid room ID or room deleted | Verify room exists in Admin > Rooms; check URL parameters |
| Studio is very slow | Network bandwidth insufficient | Check internet speed; close other bandwidth-heavy applications; use wired connection if possible |

---

## FAQ

**Q: Do I need a credit card to sign up?**
A: Initial signup creates a Basic plan account. Payment information is required when upgrading to Business or if the Basic plan requires payment.

**Q: Can I skip the onboarding flow?**
A: The onboarding flow runs once after first registration. If you navigate away, your account and Brand Kit are still auto-created with defaults. You can configure everything later via the Admin portal.

**Q: How do I change my session type after creating a room?**
A: You can either edit the room's default type in Admin > Rooms, or override it at launch time by adding `?type=meeting`, `?type=webinar`, or `?type=livestream` to the Studio URL.

**Q: Can I test my camera and microphone before a session?**
A: Yes. The Setup page (`/setup`) allows you to test camera, microphone, and speaker before entering the Studio. The VirtualBackgroundTest page (`/virtual-background-test`) is also available for testing virtual backgrounds specifically.

**Q: What happens if I close the browser during a session?**
A: The session continues for other participants. If you were the only host, the session may end automatically depending on room settings. Rejoin by navigating back to the Studio URL.

**Q: Can multiple people host a session?**
A: Yes. Team members with appropriate roles can be co-hosts. In Meeting mode, all participants are interactive. In Webinar mode, multiple speakers can be on stage. In Live Stream mode, multiple crew members can manage production.

**Q: How do participants join my session?**
A: Share the room's Viewer URL (`/viewer`) with participants. For webinars, participants can register via the Event Landing page and receive a join link.

**Q: Is there a mobile app?**
A: R-Link is a web-based platform accessible via mobile browsers. The interface is responsive and sidebars auto-collapse on screens narrower than 768px. There is no native mobile app.

**Q: How many rooms can I create?**
A: Basic plan: 1 room. Business plan: 5 rooms (can run in parallel).

**Q: Can I use R-Link without a camera?**
A: Yes. You can join sessions with camera off and participate via audio only, screen sharing, or chat. The Setup page allows you to toggle camera off before joining.

---

## Known Limitations

1. **Single Onboarding Flow**: The onboarding wizard runs only once after registration. If a user needs to re-run it, there is no built-in mechanism; they must manually configure settings via the Admin portal.
2. **Account Auto-Creation Timing**: Account auto-creation depends on detecting no existing accounts. In rare cases of race conditions or network issues, auto-creation may fail silently. The user should refresh or log out and back in.
3. **Default Limits vs. Plan Limits**: The default Account entity sets `max_rooms: 5` regardless of plan. The actual enforcement depends on the `plan` field. Basic plan users see enforcement at 1 room even though the default `max_rooms` is 5.
4. **Setup Page Device Persistence**: Device selections are persisted locally in the browser. Using a different browser or clearing browser data resets these preferences.
5. **Session Type URL Override**: The `?type=` URL parameter overrides the room's default session type. If a Basic plan user manually adds `?type=webinar` to the URL, the system should block access, but the URL parameter itself is not validated until Studio loads.
6. **No Offline Mode**: R-Link requires an active internet connection. There is no offline functionality.
7. **Browser Compatibility**: Full functionality requires a browser supporting WebRTC and `getUserMedia`. Internet Explorer and very old browser versions are not supported.

---

## Plan Requirements

| Getting Started Feature | Basic | Business |
|---|---|---|
| Registration | Yes | Yes |
| Onboarding | Yes | Yes |
| Account Auto-Creation | Yes | Yes |
| Brand Kit Auto-Creation | Yes | Yes |
| Room Creation | 1 room | 5 rooms |
| Meeting Session Type | Yes | Yes |
| Webinar Session Type | No | Yes |
| Live Stream Session Type | No | Yes |
| Setup Page | Yes | Yes |
| Studio Access | Yes | Yes |
| SSO Login | No | Yes (with integration configured) |

---

## Related Documents

- [00-index.md](./00-index.md) -- Master index and question routing
- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture, glossary, and navigation map
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan comparison, billing, and usage limits
- [31-troubleshooting.md](./31-troubleshooting.md) -- Comprehensive error diagnosis and resolution
