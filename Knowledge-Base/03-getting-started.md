# R-Link Getting Started & Onboarding

## Overview

This document covers everything a new user needs to get from zero to their first live session on R-Link. It includes the registration and authentication flow, the complete 6-step onboarding process with interactive demos, account and brand kit auto-creation with all default values, room creation, Studio launch methods, the Setup page for device configuration, session type selection, and quick-start guides for each session type (Meeting, Webinar, Live Stream).

---

## Registration & Authentication Flow

### Registration (New Users)

**Page:** `/Register`

**Step-by-step process:**

1. Navigate to the R-Link application URL or Landing page (`/Landing`)
2. Click **"Sign Up"** or **"Get Started"** to reach the `/Register` page
3. Choose a registration method:
   - **Email/Password:** Enter email address, create password, confirm password
   - **Google SSO:** Click "Sign in with Google" button (redirects to Google OAuth)
   - **Microsoft SSO:** Click "Sign in with Microsoft" button (redirects to Microsoft OAuth)
4. For email registration, verify email address (if required by the Base44 instance)
5. Upon successful registration, the Base44 SDK creates a User auth record
6. User is redirected to the Onboarding page (`/Onboarding`) for first-time setup
7. An Account entity is automatically created with default values (see Account Auto-Creation below)
8. A default BrandKit entity is automatically created (see Brand Kit Auto-Creation below)

### Authentication (Returning Users)

**Login Methods:**
- Email/Password via the login page
- Google SSO
- Microsoft SSO

**Authentication Flow:**
1. User submits credentials
2. Base44 SDK validates credentials and returns an `access_token`
3. The `access_token` is passed via URL fragment (e.g., `#access_token=...`)
4. R-Link stores the token in `localStorage` for session persistence
5. The token is included in all subsequent API requests via the Base44 SDK
6. User is redirected to the Home page (`/Home`) or the `fromUrl` if specified

### Authentication Parameters

| Parameter | Description |
|-----------|-------------|
| `access_token` | JWT token passed in URL fragment after authentication |
| `fromUrl` | URL to redirect to after successful authentication |
| `clear_access_token=true` | Query parameter to force token clear and re-authentication |

### Auth Error Handling

| Error Code | Error Type | Meaning | User Experience |
|-----------|------------|---------|-----------------|
| 403 | `auth_required` | User is not authenticated; no valid token present | Redirected to login page via `navigateToLogin()` |
| 403 | `user_not_registered` | Token is valid but user has no R-Link account | Redirected to registration or account creation flow |
| 401 | Expired token | The `access_token` has expired | Redirected to login; token cleared from localStorage |

**Logout:**
- Call `logout(shouldRedirect)` to clear the session
- `shouldRedirect = true`: User is redirected to the login page after logout
- `shouldRedirect = false`: Token is cleared but user stays on current page (used for background re-auth)

For detailed authentication troubleshooting, see [31-troubleshooting.md](31-troubleshooting.md).

---

## Account Auto-Creation

When a new user completes registration, an Account entity is automatically created with the following default values:

```
Account = {
  plan: 'basic',
  billing_cycle: 'monthly',
  owner_email: <registered email>,
  limits: {
    max_rooms: 5,
    max_storage_gb: 10,
    max_attendees: 100,
    max_team_members: 3
  },
  usage: {
    active_rooms: 0,
    storage_used_gb: 0,
    attendees_this_month: 0,
    hours_streamed: 0
  }
}
```

**Key defaults explained:**
- **plan: 'basic'** -- All new accounts start on the Basic plan
- **billing_cycle: 'monthly'** -- Default billing is monthly
- **limits.max_rooms: 5** -- Code default is 5 but Basic plan enforcement restricts to 1 active room
- **limits.max_storage_gb: 10** -- 10 GB storage for Basic plan
- **limits.max_attendees: 100** -- Code default is 100 but Basic plan enforcement restricts to 50 interactive participants
- **limits.max_team_members: 3** -- Default team size limit of 3 members
- **usage** -- All usage counters start at zero

---

## Brand Kit Auto-Creation

A default BrandKit entity is automatically created alongside the Account. This ensures sessions have a baseline visual identity from day one.

### Default Brand Kit Values

```
BrandKit = {
  name: 'Default',
  primary_color: '#000000' (or platform default),
  secondary_color: '#FFFFFF' (or platform default),
  accent_color: '#0066FF' (or platform default),
  font_family: 'Inter' (or platform default sans-serif),
  logo_url: null (no logo by default),
  background_url: null (no custom background by default),
  cta_button: {
    text: '',
    url: '',
    enabled: false
  },
  exit_url: '',
  waiting_room_config: {
    enabled: false,
    message: 'The session will begin shortly.',
    background_url: null
  },
  vanity_url: null
}
```

**Note:** The CTA button, exit URL, waiting room customization, and vanity URL fields are present in the BrandKit entity but are only functional on the Business plan. On Basic, these fields are read-only/disabled in the Admin > Brand Kit tab.

### Customizing the Brand Kit

1. Navigate to **Admin > Brand Kit** tab
2. Upload a logo (recommended size: 200x60px, PNG or SVG)
3. Set primary, secondary, and accent colors using the color picker or hex input
4. Choose a font family from the available options
5. Upload a custom background image (recommended: 1920x1080px, JPG or PNG)
6. **(Business only)** Configure CTA button text and URL
7. **(Business only)** Set an exit URL for post-session redirect
8. **(Business only)** Enable and customize the waiting room
9. **(Business only)** Set a vanity URL slug
10. Click **"Save"** to apply changes

---

## Onboarding Page Flow

**Page:** `/Onboarding`

The Onboarding page is a guided 6-step flow presented to new users after registration. It introduces the core features of R-Link through interactive demos and a practice session. Users can navigate forward, backward, or skip the entire onboarding.

### Navigation Controls

| Control | Action |
|---------|--------|
| **Next** button | Advance to the next step |
| **Back** button | Return to the previous step |
| **Skip** button/link | Skip the entire onboarding and go to Home page |
| Step indicators | Visual progress showing current step out of 6 |

### Step 1: Welcome

**Purpose:** Introduce R-Link and set expectations for the onboarding flow.

**Content:**
- Welcome message with the user's name (if available from registration)
- Brief description of R-Link as a live video collaboration platform
- Overview of what the onboarding will cover (Studio, Elements, Layouts, AI Tools)
- "Let's get started" CTA to proceed to Step 2

**Key Points:**
- No interactive demo on this step
- Sets the context for the remaining 5 steps
- First-time personalization: user sees their account details

### Step 2: Studio (Interactive Demo)

**Purpose:** Introduce the Studio interface where live sessions take place.

**Content:**
- Explanation of the Studio page and its purpose
- **StudioControlsDemo** -- An interactive component that demonstrates the Studio control bar:
  - Microphone toggle (mute/unmute)
  - Camera toggle (on/off)
  - Screen share button
  - Chat panel toggle
  - Participants panel toggle
  - Recording button
  - Session end button
  - Layout selector
- Users can click each control to see its effect in a simulated environment
- **Practice Launch** -- A button that launches a real practice session:
  - URL: `/Studio?type=meeting&name=Practice`
  - Opens a meeting-type session named "Practice"
  - User can test their camera, microphone, and Studio controls in a live environment
  - No other participants (solo practice session)
  - User returns to onboarding after ending the practice session

**Key Points:**
- The StudioControlsDemo is a sandboxed simulation (no real WebRTC connection)
- The Practice Launch creates a real Studio session for hands-on experience
- This is the most interactive step in the onboarding flow
- Users who are comfortable can skip the practice and proceed

### Step 3: Elements (Interactive Demo)

**Purpose:** Introduce interactive Elements that enhance sessions.

**Content:**
- Explanation of what Elements are and how they work
- **ElementsDemo** -- An interactive component that showcases available Elements:
  - **Core Media (Basic+):**
    - Slides -- Upload and present slide decks during sessions
    - Video -- Play video files or embed video content
    - Audio -- Play audio tracks during sessions
  - **Advanced Elements (Business):**
    - Links -- Display clickable links as overlays
    - Banners -- Show announcement banners during sessions
    - Polls -- Launch audience polls and view real-time results
    - Website Overlays -- Embed live websites as overlays
    - Prompter -- Scrolling teleprompter text visible only to the host
- Each Element type is demonstrated with a preview and description
- Business-only Elements are shown with a "Business" badge

**Key Points:**
- Users can see all Element types even if they are on the Basic plan
- Business-only Elements serve as an upgrade incentive
- Elements are managed in Admin > Elements tab
- Elements are organized into ElementFolders for grouping

### Step 4: Layouts (Interactive Demo)

**Purpose:** Introduce the different layout options for arranging video feeds and content.

**Content:**
- Explanation of how layouts affect the visual arrangement of a session
- **LayoutsDemo** -- An interactive component that previews each layout type:
  - **Meeting Layouts (5):**
    - Gallery -- Grid view, all participants equal
    - Speaker -- Active speaker prominent, others in strip
    - Sidebar -- Content main area, participants in side panel
    - Spotlight -- One participant highlighted, others minimized
    - Compact -- Minimal view optimized for screen sharing
  - **Webinar Layouts (6):**
    - Stage Host -- Host on virtual stage (default for webinar)
    - Stage Content -- Content center stage, host overlay
    - Picture-in-Picture -- Host as small overlay on content
    - Full Content -- Content fills view, host hidden
    - Interview -- Side-by-side speaker arrangement
    - Panel -- Multiple speakers in panel format
  - **Live Stream Layouts (7):**
    - Live Host -- Host with branding overlays (default for live stream)
    - Live Content -- Content primary, host overlay
    - Live Split -- Split view between host and content
    - Live Full -- Full-screen content, no host video
    - Live Interview -- Broadcast-quality interview layout
    - Live Panel -- Panel discussion format
    - Live Custom -- Fully customizable drag-and-drop layout
- Users can click each layout to see a visual preview

**Key Points:**
- Layout availability depends on session type
- Webinar and Live Stream layouts are only available on the Business plan
- The host can switch layouts during a live session via the Studio control bar
- Templates can define a default layout

### Step 5: AI Tools

**Purpose:** Introduce the R-Link AI Suite (Notetaker + Translation).

**Content:**
- Explanation of AI-powered features in R-Link
- **AI Notetaker:**
  - Automatic transcription of meeting audio
  - AI-generated meeting summary with key points
  - Action item extraction
  - Accessible via the MeetingNotes page (`/MeetingNotes`)
  - Configured in Admin > Notetaker tab
- **AI Translation:**
  - Real-time translation of meeting content
  - Multi-language support
  - Useful for international teams and multilingual events
- Both features require the Business plan
- Demo shows sample transcript and summary output

**Key Points:**
- AI Suite is a Business-only feature set
- Notetaker settings are configured per-account in Admin > Notetaker
- Transcripts are stored as MeetingTranscript entities
- Basic plan users see this step as an upgrade incentive

### Step 6: Complete

**Purpose:** Wrap up the onboarding and guide the user to their first action.

**Content:**
- Congratulations message
- Summary of what was covered (Studio, Elements, Layouts, AI Tools)
- Quick-action buttons:
  - **"Create Your First Room"** -- Navigates to Admin > Rooms tab to create a room
  - **"Start a Meeting"** -- Launches the Studio with meeting type
  - **"Explore Admin Portal"** -- Navigates to the Admin page
  - **"Go to Home"** -- Navigates to the Home page
- Reminder that help is available in Admin > Support tab

**Key Points:**
- Marks the onboarding as completed in the user's profile (`onboarding_completed: true`)
- User will not see the onboarding flow again on subsequent logins
- User can always revisit by navigating directly to `/Onboarding`

---

## Room Creation

### Creating a Room (Step-by-Step)

1. Navigate to **Admin > Rooms** tab
2. Click the **"Create Room"** button
   - If on Basic plan and already have 1 room, button is disabled with an upgrade prompt
3. Enter room details:
   - **Room Name** (required): Display name for the room (e.g., "Team Standup", "Weekly Webinar")
   - **Room Slug** (auto-generated or custom): URL-friendly identifier used in links
   - **Template** (optional): Select a pre-configured RoomTemplate to inherit settings
   - **Brand Kit** (optional): Assign a BrandKit for visual branding (defaults to account default)
   - **Default Session Type**: Meeting (default), Webinar, or Live Stream
4. Configure room settings:
   - **Waiting Room:** Enable/disable (Business feature for customization)
   - **Chat:** Enable/disable; moderation settings
   - **Recording:** Auto-record setting
   - **Max Participants:** Override account limit (up to plan maximum)
5. Click **"Create Room"** to save
6. The room appears in the Rooms list and is ready for sessions

### Room Management Actions

| Action | Description | Permission |
|--------|------------|------------|
| Edit Room | Modify room name, settings, template, brand kit | Owner, Admin, Host |
| Delete Room | Permanently remove the room and its events | Owner, Admin |
| Archive Room | Deactivate the room without deleting data | Owner, Admin |
| Duplicate Room | Create a copy of the room with same settings | Owner, Admin |
| View Room | See room details and event history | Owner, Admin, Host |

---

## Studio Launch Methods

There are multiple ways to launch a session in the Studio:

### Method 1: Direct URL Navigation

Navigate to the Studio URL with appropriate query parameters:

```
/Studio?type=meeting&name=My+Meeting
/Studio?type=webinar&name=Product+Launch
/Studio?type=livestream&name=Live+Show
```

**Required Parameters:**
| Parameter | Description |
|-----------|-------------|
| `type` | Session type: `meeting`, `webinar`, or `livestream` |

**Optional Parameters:**
| Parameter | Description |
|-----------|-------------|
| `name` | Session display name |
| `room` | Room ID or slug to associate the session with |
| `layout` | Override default layout |
| `autostart` | Set to `true` to skip the pre-session lobby |

### Method 2: From Admin > Rooms

1. Navigate to **Admin > Rooms** tab
2. Find the desired room in the list
3. Click the **"Start Session"** or **"Go Live"** button on the room card
4. Select session type (if not set by room default)
5. The Studio opens with room context pre-loaded

### Method 3: From Admin > Schedule

1. Navigate to **Admin > Schedule** tab
2. Find the scheduled meeting/event
3. Click **"Join"** or **"Start"** when the session time arrives
4. The Studio opens with the scheduled event context

### Method 4: From Home Page

1. On the Home page (`/Home`), find the quick-action section
2. Click **"New Meeting"**, **"New Webinar"**, or **"New Live Stream"**
3. Enter a session name in the quick-start dialog
4. Click **"Launch"** to open the Studio

### Method 5: From Onboarding Practice

During onboarding Step 2 (Studio), click the practice launch button:
```
/Studio?type=meeting&name=Practice
```

---

## Setup Page

**Page:** `/Setup`

The Setup page is the pre-session device configuration screen. It appears before entering the Studio to ensure the user's camera, microphone, and speakers are properly configured.

### Setup Page Components

#### 1. Camera Selection and Preview

- **Camera dropdown:** Lists all available video input devices detected by the browser
- **Camera preview:** Live video feed from the selected camera
- **Camera toggle:** Enable/disable the camera before joining
- **Permission status:** Shows whether camera permission has been granted, denied, or is pending

#### 2. Microphone Selection and Audio Level

- **Microphone dropdown:** Lists all available audio input devices
- **Audio level meter:** Real-time visual indicator showing microphone input volume
  - Green bars: Good audio level
  - Yellow bars: Audio is slightly low or high
  - Red bars: Audio is too loud (clipping)
- **Microphone toggle:** Mute/unmute before joining
- **Permission status:** Shows microphone permission state

#### 3. Speaker Selection and Test

- **Speaker dropdown:** Lists all available audio output devices
- **Test speaker button:** Plays a short test tone to verify speaker output
- **Volume control:** Adjust speaker volume level

#### 4. Display Name

- **Display name input:** Text field for the name shown to other participants
- Pre-populated with the user's registered name
- Can be changed per-session

#### 5. Event Name

- **Event name display:** Shows the name of the session being joined
- Pre-populated from the URL parameter or scheduled event

#### 6. Permission Status Indicators

| Status | Icon/Color | Meaning |
|--------|-----------|---------|
| Granted | Green checkmark | Browser has granted access to the device |
| Denied | Red X | Browser permission was denied; user must update browser settings |
| Pending | Yellow/Orange | Permission prompt has not been answered yet |
| Not Found | Gray | No device of this type was detected |

#### 7. Device Selection Persistence

Device selections are saved to `localStorage` so the user's preferred devices are pre-selected on subsequent sessions:
- `rlink_preferred_camera` -- Saved camera device ID
- `rlink_preferred_microphone` -- Saved microphone device ID
- `rlink_preferred_speaker` -- Saved speaker device ID

#### 8. Join Button

After configuring devices, click **"Join Session"** or **"Enter Studio"** to proceed to the Studio page.

### Setup Page Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| No devices listed | Browser permissions not granted | Click the permission prompt or update browser settings |
| Camera shows black | Camera in use by another app | Close other apps using the camera |
| Audio level meter not moving | Wrong microphone selected or muted at OS level | Select correct mic from dropdown; check OS audio settings |
| "Permission Denied" status | User blocked camera/mic access | Go to browser settings > Site permissions > Allow camera and microphone |
| Speaker test plays no sound | Wrong speaker selected or system volume muted | Select correct speaker; check system volume |

---

## Session Type Selection

When launching a session, the type is specified via the `type` URL parameter:

### Meeting

```
/Studio?type=meeting
```

- **Description:** Collaborative session where all participants can interact equally
- **Default Layout:** Gallery (grid view)
- **Plan Requirement:** Basic+
- **Max Participants:** 50 (Basic) / 100 (Business)
- **Best For:** Team meetings, brainstorming, working sessions, 1-on-1 calls

### Webinar

```
/Studio?type=webinar
```

- **Description:** Host-led presentation with audience in view-only mode
- **Default Layout:** Stage Host (`stage_host`)
- **Plan Requirement:** Business
- **Max Attendees:** Up to 1,000
- **Best For:** Product launches, educational sessions, company all-hands, public talks

### Live Stream

```
/Studio?type=livestream
```

- **Description:** Production-quality broadcast to external streaming platforms via RTMP
- **Default Layout:** Live Host (`live_host`)
- **Plan Requirement:** Business
- **Max Viewers:** Unlimited (via RTMP)
- **Best For:** Public broadcasts, YouTube/Facebook/Twitch streams, media events

---

## Quick-Start Guides

### Quick-Start: Your First Meeting (Basic Plan)

**Time to complete:** 5-10 minutes

1. **Register** at `/Register` using email or SSO
2. **Complete onboarding** at `/Onboarding` (or skip to come back later)
3. **Create a room:**
   - Go to **Admin > Rooms**
   - Click **"Create Room"**
   - Name it (e.g., "My Meeting Room")
   - Click **"Create Room"**
4. **Configure devices:**
   - The Setup page (`/Setup`) appears before entering the Studio
   - Select your camera, microphone, and speaker
   - Enter your display name
   - Click **"Join Session"**
5. **Start the meeting:**
   - You are now in the Studio at `/Studio?type=meeting`
   - Your camera and microphone are active
   - Share the meeting link with participants
6. **During the meeting:**
   - Use the control bar to toggle mic, camera, screen share
   - Open chat panel for text communication
   - Switch layouts using the layout selector
   - Start recording if desired
7. **End the meeting:**
   - Click the **"End Session"** button in the control bar
   - Confirm session end
   - Recording (if started) begins processing

### Quick-Start: Your First Webinar (Business Plan)

**Time to complete:** 15-20 minutes

1. **Ensure Business plan** -- Webinars require the Business plan
2. **Create a room** (if not already done):
   - Go to **Admin > Rooms**
   - Click **"Create Room"**
   - Set default session type to "Webinar"
3. **Set up event landing page (optional):**
   - Go to **Admin > Event Landing** tab
   - Create a landing page for the webinar
   - Configure registration form fields
   - Publish the landing page
4. **Schedule the webinar (optional):**
   - Go to **Admin > Schedule** tab
   - Create a new scheduled event
   - Set date, time, and recurrence
   - Add the webinar room
   - Send calendar invitations to attendees
5. **Configure branding:**
   - Go to **Admin > Brand Kit**
   - Upload logo, set colors, configure waiting room
   - Set up CTA button and exit URL
6. **Prepare Elements:**
   - Go to **Admin > Elements**
   - Upload slides, create polls, set up banners
   - Organize into folders
7. **Launch the webinar:**
   - Navigate to `/Studio?type=webinar&name=My+Webinar`
   - Or start from the scheduled event in Admin > Schedule
8. **During the webinar:**
   - Use Stage Host layout (default) or switch as needed
   - Present slides using the Elements panel
   - Launch polls for audience engagement
   - Display banners for announcements
   - Monitor attendee chat and Q&A
   - Use the Prompter for scripted content
9. **End the webinar:**
   - Click **"End Session"**
   - Recording processes automatically
   - Attendees are redirected to exit URL (if configured)
   - Lead data is captured in Admin > Leads

### Quick-Start: Your First Live Stream (Business Plan)

**Time to complete:** 20-30 minutes

1. **Ensure Business plan** -- Live Streaming requires the Business plan
2. **Connect streaming platforms:**
   - Go to **Admin > Integrations**
   - Connect YouTube Live, Facebook Live, Twitch, and/or LinkedIn Live
   - Configure RTMP endpoints and stream keys
3. **Create a room:**
   - Go to **Admin > Rooms**
   - Click **"Create Room"**
   - Set default session type to "Live Stream"
4. **Configure branding:**
   - Go to **Admin > Brand Kit**
   - Set up all branding for the stream output (logo, colors, overlays)
5. **Prepare Elements:**
   - Go to **Admin > Elements**
   - Set up banners, lower thirds, and other overlays for production
6. **Launch the stream:**
   - Navigate to `/Studio?type=livestream&name=My+Live+Show`
   - The Studio opens in Live Stream mode with production controls
7. **Configure stream destinations:**
   - In the Studio, open the streaming panel
   - Select which platforms to stream to (multi-platform simultaneous)
   - Verify stream keys and endpoints
8. **Go live:**
   - Click **"Start Streaming"** to begin broadcasting
   - Monitor stream health indicators (bitrate, frame rate, viewer count)
   - Use layout switching for scene changes
   - Display Elements as overlays during the stream
9. **End the stream:**
   - Click **"Stop Streaming"** to end the broadcast
   - Recording of the stream output processes automatically
   - Review analytics in Admin > Dashboard

---

## Settings and Options

### Account Settings (Admin > Account)

| Setting | Description | Default |
|---------|-------------|---------|
| Organization Name | Display name for the account | User's name |
| Owner Email | Primary account email | Registration email |
| Timezone | Account timezone for scheduling | Browser timezone |
| Language | UI language preference | English |
| Notification Preferences | Email and in-app notification settings | All enabled |

### Session Defaults (Admin > Settings)

| Setting | Description | Default |
|---------|-------------|---------|
| Default Session Type | Pre-selected session type for new sessions | Meeting |
| Auto-Record | Automatically start recording when sessions begin | Off |
| Waiting Room | Enable waiting room for all sessions | Off |
| Chat Enabled | Enable chat in all sessions | On |
| Participant Notifications | Notify when participants join/leave | On |

---

## Troubleshooting

### Common Getting-Started Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| Registration email not received | Email in spam, incorrect email entered | Check spam folder; try re-registering with correct email |
| Google/Microsoft SSO fails | Pop-up blocker, third-party cookies disabled | Disable pop-up blocker; enable third-party cookies for SSO domain |
| Onboarding not loading | Network issue, browser incompatibility | Try refreshing; use Chrome, Firefox, or Edge (latest version) |
| Practice session in onboarding has no video | Camera permission not granted | Grant camera permission when prompted by browser |
| "Create Room" button disabled | At room limit (1 on Basic) | Delete existing room or upgrade to Business |
| Cannot select Webinar or Live Stream type | Basic plan only supports Meeting | Upgrade to Business plan |
| Studio page is blank | WebRTC not supported, JavaScript disabled | Use a modern browser; enable JavaScript |
| Setup page shows no devices | Browser has not been granted media permissions | Click "Allow" on browser permission prompt; check site settings |
| Account not created after registration | Registration did not complete successfully | Try registering again; check for error messages |
| Brand kit changes not applied | Browser cache, session not reloaded | Hard refresh (Ctrl+Shift+R); exit and re-enter session |

For comprehensive troubleshooting, see [31-troubleshooting.md](31-troubleshooting.md).

---

## FAQ

**Q: Do I need to complete onboarding to use R-Link?**
A: No. Onboarding can be skipped by clicking "Skip" at any step. However, completing it is recommended to understand the platform's capabilities.

**Q: Can I redo the onboarding later?**
A: Yes. Navigate directly to `/Onboarding` at any time to repeat the guided flow.

**Q: Is the practice session in onboarding private?**
A: Yes. The practice session at `/Studio?type=meeting&name=Practice` is a solo session. No other participants can join.

**Q: What happens if I don't create a room?**
A: You can still launch sessions directly via Studio URL, but rooms provide organizational structure, saved settings, and template support.

**Q: Can I change my account's email address?**
A: The owner email is set during registration. Contact support to request an email change.

**Q: How long does account creation take?**
A: Account and Brand Kit creation are automatic and instant upon registration completion.

**Q: Can I use R-Link on mobile?**
A: R-Link is a web application that works in mobile browsers. The UI is responsive with sidebar auto-collapse at 768px screen width. However, full functionality is best experienced on desktop.

**Q: What if my camera or microphone isn't detected?**
A: Check that the device is connected, not in use by another application, and that browser permissions are granted. See the Setup page troubleshooting section above.

**Q: Can I join a session without a camera?**
A: Yes. You can disable your camera on the Setup page and join with audio only.

**Q: What is the fromUrl parameter?**
A: `fromUrl` is a URL parameter that tells R-Link where to redirect the user after authentication. This is useful when a user clicks a session link while not logged in -- after logging in, they are redirected back to the session.

---

## Known Limitations

1. **Single onboarding flow:** There is only one onboarding path for all users regardless of plan. Business features shown during onboarding are informational only for Basic users.
2. **Practice session limitation:** The onboarding practice session is meeting-type only. Users cannot practice webinar or live stream workflows during onboarding.
3. **No guided room creation in onboarding:** Onboarding introduces features but does not walk through room creation step-by-step. Users create rooms after onboarding via Admin > Rooms.
4. **SSO requires pop-ups:** Google and Microsoft SSO use pop-up windows for OAuth. Pop-up blockers must be disabled for the R-Link domain.
5. **Device persistence uses localStorage:** Saved device preferences are browser-specific. Using a different browser or clearing localStorage resets device selections.
6. **No multi-account support:** A single browser session supports one R-Link account. To switch accounts, the user must log out and log in with different credentials.
7. **Onboarding completion flag:** Once `onboarding_completed` is set to `true`, the onboarding flow does not automatically appear again. Direct URL navigation is required to revisit.
8. **Default brand kit limitations:** The auto-created brand kit uses generic defaults. Users should customize the brand kit before hosting public-facing sessions.
9. **Setup page device list:** The device list refreshes on page load but does not auto-detect new devices plugged in after the page loads. A page refresh is required.
10. **Session type cannot be changed mid-session:** Once a session is launched as a Meeting, Webinar, or Live Stream, the type cannot be changed without ending and restarting.

---

## Plan Requirements

| Feature | Plan |
|---------|------|
| Registration and account creation | Free (all plans) |
| Onboarding flow | Basic+ |
| Room creation (1 room) | Basic+ |
| Meeting session type | Basic+ |
| Webinar session type | Business |
| Live Stream session type | Business |
| Brand Kit (basic customization) | Basic+ |
| Brand Kit (full suite) | Business |
| All Elements during onboarding demo | View only (actual use requires appropriate plan) |

---

## Related Documents

- [00-index.md](00-index.md) -- Master index and question routing
- [01-platform-overview.md](01-platform-overview.md) -- Platform architecture and feature reference
- [02-plans-and-pricing.md](02-plans-and-pricing.md) -- Plans, pricing, and billing
- [31-troubleshooting.md](31-troubleshooting.md) -- Troubleshooting, diagnostics, and known limitations
