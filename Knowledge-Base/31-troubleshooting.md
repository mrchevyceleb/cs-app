# Troubleshooting

## Overview

This document is the comprehensive troubleshooting reference for the R-Link platform. It covers authentication errors, token management, browser and network requirements, common UI issues, room loading failures, integration connection problems, recording issues, stream health problems, permission denied errors, account creation failures, and known platform limitations. Each section includes specific error messages, error codes, root causes, and step-by-step resolution procedures.

When using this document, match the customer's reported symptom or error message to the appropriate section, follow the diagnostic steps, and apply the recommended solution. If no documented solution resolves the issue, follow the escalation procedures in [00-index.md](./00-index.md).

---

## Authentication Errors

### 401 Unauthorized -- Expired Token

**Error**: HTTP 401 response from Base44 API calls.

**Symptom**: The user sees a blank page, "Session expired" message, or is redirected to a login page unexpectedly. API calls fail silently or show authorization errors in the browser console.

**Root Cause**: The `access_token` stored in `localStorage` (key: `base44_access_token`) or passed via URL parameter has expired. Base44 tokens have a limited lifetime.

**Diagnosis Steps**:
1. Open browser developer tools (F12)
2. Go to the Network tab
3. Look for API requests returning `401` status
4. Check the Console tab for authentication-related error messages
5. Go to Application > Local Storage and check for the `base44_access_token` key

**Resolution**:
1. Redirect the user to the login page using `navigateToLogin()` from `AuthContext`
2. The user re-authenticates through Base44
3. A new `access_token` is issued and stored
4. The user is redirected back to their original page (via `fromUrl` parameter)

**Customer-Facing Instructions**:
"Your session has expired. Please log out and log back in. If the issue persists, try clearing your browser cache and cookies, then log in again."

---

### 403 Forbidden -- auth_required

**Error**: HTTP 403 with reason `auth_required`.

**Symptom**: The user encounters an "Access Denied" or "Authentication Required" message when trying to access a page or feature.

**Root Cause**: The request was made without any authentication token. The user is not logged in, or the token was not included in the request.

**Diagnosis Steps**:
1. Check if the URL contains an `access_token` parameter
2. Check `localStorage` for `base44_access_token`
3. Verify `AuthContext.isAuthenticated` is `true`
4. Check if `AuthContext.isLoadingAuth` is stuck on `true`

**Resolution**:
1. If no token exists: Direct the user to log in
2. If token exists but is not being sent: Check that the Base44 SDK is properly initialized with the token
3. If `isLoadingAuth` is stuck: Refresh the page; if persists, clear `localStorage` and re-authenticate

**Customer-Facing Instructions**:
"You need to be logged in to access this feature. Please click 'Log In' or navigate to the login page. If you believe you are already logged in, try refreshing the page."

---

### 403 Forbidden -- user_not_registered

**Error**: HTTP 403 with reason `user_not_registered`.

**Symptom**: The user can authenticate (has a valid token) but receives an error indicating they are not registered in the R-Link system.

**Root Cause**: The Base44 user account exists, but the user has not completed R-Link registration. This can happen if the user authenticated via Base44 directly without going through the R-Link registration flow.

**Diagnosis Steps**:
1. Confirm the user has a valid `access_token` (token is present and not expired)
2. Check if an Account entity exists for this user
3. Verify the user completed the onboarding flow

**Resolution**:
1. Direct the user to the R-Link registration page (`/register`)
2. Have them complete the registration and onboarding flow
3. Account auto-creation should trigger during onboarding
4. If the issue persists after registration, escalate to support

**Customer-Facing Instructions**:
"Your authentication is valid, but you haven't completed R-Link registration. Please visit the registration page to set up your account. If you've already registered and still see this error, please contact support."

---

## Token Management

### Token Storage and Lifecycle

| Aspect | Detail |
|---|---|
| **Token Source** | Provided via URL parameter `access_token` (or `token`) after authentication |
| **Storage Location** | `localStorage` key: `base44_access_token` |
| **Token Format** | JWT (JSON Web Token) issued by Base44 |
| **Expiration** | Tokens expire after a set period (managed by Base44) |
| **Refresh** | No automatic refresh; user must re-authenticate when token expires |
| **Logout** | Calling `AuthContext.logout()` clears the token from `localStorage` |

### Token Persistence Flow

1. User authenticates via Base44 login/registration
2. `access_token` is included in the redirect URL
3. R-Link frontend extracts `access_token` from URL parameters
4. Token is stored in `localStorage` as `base44_access_token`
5. All subsequent Base44 SDK calls use this stored token
6. When token expires, API calls return 401 and user must re-authenticate

### Clearing Tokens -- clear_access_token Parameter

**Parameter**: `?clear_access_token=true`

**Purpose**: Forces the frontend to delete the stored access token from `localStorage` and reset the authentication state. This is a diagnostic and recovery mechanism.

**When to Use**:
- User is stuck in a broken authentication state
- Token in `localStorage` is corrupted or belongs to a different user
- After account switching or SSO issues
- As a first troubleshooting step for persistent auth errors

**How to Use**:
Add `?clear_access_token=true` to any R-Link URL. For example:
```
https://app.rlink.com/?clear_access_token=true
```

**What Happens**:
1. The frontend detects the `clear_access_token=true` parameter
2. The `base44_access_token` key is removed from `localStorage`
3. The user's authentication state is reset (`isAuthenticated` becomes `false`)
4. The user is redirected to the login page
5. After re-authentication, a fresh token is issued

**Customer-Facing Instructions**:
"To reset your login session, add `?clear_access_token=true` to the end of the R-Link URL in your browser's address bar, then press Enter. This will log you out and you can log back in with a fresh session."

---

## Browser Requirements

### Minimum Browser Requirements

| Requirement | Detail |
|---|---|
| **WebRTC Support** | Required for all video/audio functionality |
| **getUserMedia API** | Required for camera and microphone access |
| **JavaScript** | Must be enabled |
| **LocalStorage** | Must be enabled (for token persistence) |
| **Cookies** | May be required for Base44 authentication |
| **WebGL** | Required for virtual backgrounds |
| **Hardware Acceleration** | Recommended for virtual backgrounds and video processing |

### Supported Browsers

| Browser | Version | Support Level |
|---|---|---|
| Google Chrome | 80+ | Full support (recommended) |
| Mozilla Firefox | 78+ | Full support |
| Microsoft Edge | 80+ (Chromium) | Full support |
| Safari | 14+ | Supported (some WebRTC limitations) |
| Internet Explorer | Any | Not supported |
| Opera | 67+ | Supported |

### Browser-Specific Issues

| Issue | Browser | Cause | Solution |
|---|---|---|---|
| Camera/mic prompt never appears | Safari | Requires user gesture before `getUserMedia` | Click "Allow" in Safari permissions; ensure no other app is using the camera |
| Virtual background not working | Any (older hardware) | WebGL not available or hardware too slow | Disable virtual background; update graphics drivers; use Chrome |
| Audio echo or feedback | All | Speaker audio captured by microphone | Use headphones; enable echo cancellation in browser settings |
| Screen share shows black screen | Firefox | Specific Firefox permission model | Grant "Entire Screen" permission; try Chrome if issue persists |
| Video freezes intermittently | Safari | Safari WebRTC implementation differences | Switch to Chrome or Firefox for best experience |

### Camera and Microphone Permissions

**Checking permissions:**
1. Click the lock/info icon in the browser address bar
2. Check Camera and Microphone permissions
3. Ensure both are set to "Allow"

**Resetting permissions:**
1. Open browser settings
2. Navigate to Privacy/Security > Site Settings
3. Find the R-Link domain
4. Reset Camera and Microphone permissions to "Ask" or "Allow"
5. Refresh the R-Link page

**If permissions are granted but devices are not detected:**
1. Check that the device is physically connected and powered on
2. Verify the device is not in use by another application (Zoom, Teams, etc.)
3. Check operating system privacy settings (Windows Settings > Privacy > Camera/Microphone)
4. Try a different USB port or device
5. Restart the browser

---

## Network Requirements

### Bandwidth Requirements

| Activity | Minimum Download | Minimum Upload | Recommended |
|---|---|---|---|
| Audio-only meeting | 100 Kbps | 100 Kbps | 500 Kbps both |
| Video meeting (SD) | 1 Mbps | 1 Mbps | 2 Mbps both |
| Video meeting (HD) | 2.5 Mbps | 2.5 Mbps | 5 Mbps both |
| Screen sharing (receiving) | 1.5 Mbps | -- | 3 Mbps |
| Screen sharing (sending) | -- | 1.5 Mbps | 3 Mbps |
| Live streaming (RTMP output) | -- | 4 Mbps | 8 Mbps |
| Webinar (host) | 2.5 Mbps | 2.5 Mbps | 5 Mbps both |
| Webinar (attendee) | 2 Mbps | 0.5 Mbps | 3 Mbps / 1 Mbps |

### Network Configuration

| Requirement | Detail |
|---|---|
| **Protocol** | HTTPS (port 443) for web traffic |
| **WebRTC** | UDP ports for media (varies by network) |
| **TURN/STUN** | May be needed for restrictive firewalls |
| **RTMP** | Port 1935 for live streaming output (Business plan) |

### Network Troubleshooting

| Symptom | Likely Cause | Solution |
|---|---|---|
| "Unable to connect" on Studio load | Firewall blocking WebRTC | Check that UDP traffic is allowed; configure TURN server if behind strict firewall |
| Audio cuts in and out | Insufficient bandwidth or packet loss | Switch to audio-only; close other applications; use wired connection |
| Video is pixelated or frozen | Low bandwidth | Reduce video quality; turn off HD; close other bandwidth-heavy applications |
| Stream drops mid-session | Upload bandwidth insufficient or unstable | Use wired ethernet; ensure minimum 4 Mbps sustained upload for streaming |
| High latency (delay in audio/video) | Network congestion or geographic distance | Use wired connection; reduce number of active video feeds; check ISP performance |
| Screen share is laggy | Upload bandwidth insufficient | Reduce screen share resolution; close unnecessary applications on shared screen |

---

## Common UI Issues

### Sidebar Auto-Collapse on Mobile

**Behavior**: On screens narrower than 768px, sidebars automatically collapse to maximize the content area.

**Customer Report**: "The sidebar/panel disappeared" or "I can't find the controls"

**Resolution**: This is expected responsive behavior. On mobile or narrow windows:
- Look for a hamburger menu icon or sidebar toggle button
- Tap/click to expand the sidebar
- The sidebar will overlay the content on small screens
- Rotating to landscape orientation may provide more space

### Layout and Display Issues

| Issue | Cause | Solution |
|---|---|---|
| Page layout is broken/overlapping | Zoom level not at 100% | Reset browser zoom to 100% (Ctrl+0 or Cmd+0) |
| Fonts appear wrong | Web fonts failed to load | Check network connectivity; refresh the page; clear browser cache |
| Dark theme elements invisible | Browser forced dark mode overriding R-Link styles | Disable browser-level dark mode for the R-Link site |
| Buttons not responding to clicks | JavaScript error | Open console (F12) for errors; refresh the page; clear cache |
| Modal/popup not closing | UI state stuck | Press Escape key; refresh the page |
| Admin tabs not loading | Data fetch failure | Check network; refresh; if specific tab fails, check permissions |
| Empty state on Dashboard | No data yet (new account) | This is expected for new accounts; create rooms and run sessions to populate |

---

## Room Loading Errors

### "Room Not Found"

**Cause**: The room ID in the URL does not match any existing Room entity.

**Diagnosis**:
1. Verify the room ID in the URL
2. Check Admin > Rooms to confirm the room exists
3. Confirm the room has not been deleted

**Resolution**:
- If the room was deleted: Create a new room
- If the URL is wrong: Correct the room ID in the URL
- If the room should exist: Refresh the page; check for API errors in browser console

### "Unable to Load Room"

**Cause**: API call to fetch room data failed.

**Diagnosis**:
1. Check browser console (F12) for network errors
2. Look for 401/403 responses (authentication issue)
3. Check if Base44 services are accessible

**Resolution**:
- 401 error: Re-authenticate (see Authentication Errors section)
- 403 error: Check permissions (see Permission Denied section)
- Network error: Check internet connection; try again in a few minutes
- 500 error: Server-side issue; escalate to support

### Room Fails to Start Session

**Cause**: Session initialization failed.

**Diagnosis**:
1. Check the session type against the account's plan
2. Verify the room is not already in an active session
3. Check browser console for errors

**Resolution**:
- Wrong plan for session type: Upgrade to Business for webinars/live streams
- Room already active: Wait for current session to end, or end it manually
- Browser error: Refresh and retry; clear cache if persistent

---

## Integration Connection Failures

### General Integration Troubleshooting

| Step | Action |
|---|---|
| 1 | Verify Business plan (most integrations require Business) |
| 2 | Navigate to Admin > Integrations |
| 3 | Check the integration's connection status |
| 4 | If disconnected, click "Connect" or "Reconnect" |
| 5 | Complete the OAuth flow or enter API credentials |
| 6 | Test the connection using the "Test" button if available |
| 7 | Check browser console for specific error messages |

### Integration-Specific Issues

| Integration | Common Issue | Solution |
|---|---|---|
| **Google Calendar** | OAuth consent screen blocked | Ensure third-party cookies are enabled; try Chrome; complete Google consent |
| **Outlook Calendar** | Microsoft permissions insufficient | Re-authorize with appropriate Microsoft permissions |
| **Mailchimp** | API key rejected | Generate a new API key in Mailchimp; verify the key is for the correct account |
| **SendGrid** | Emails not sending | Verify SendGrid API key; check sender authentication in SendGrid dashboard |
| **Stripe** | Payment integration errors | Verify Stripe API keys (publishable and secret); check Stripe dashboard for errors |
| **PayPal** | Callback URL mismatch | Verify PayPal return URLs match R-Link configuration |
| **Google Drive** | File access denied | Re-authorize Google Drive; ensure sufficient Google Drive storage |
| **Dropbox** | Upload failures | Check Dropbox storage quota; re-authorize if token expired |
| **Salesforce** | Sync failures | Verify Salesforce API access; check field mappings; re-authorize OAuth |
| **HubSpot** | Contact sync issues | Re-authorize HubSpot; check HubSpot API rate limits |
| **YouTube Live** | Stream key rejected | Verify YouTube Live streaming is enabled on the YouTube channel; regenerate stream key |
| **Facebook Live** | Permission denied | Re-authorize Facebook; ensure Facebook page has live streaming permission |
| **Twitch** | Stream drops | Verify Twitch stream key; check Twitch server selection; ensure adequate upload bandwidth |
| **LinkedIn Live** | Access not available | LinkedIn Live requires application approval from LinkedIn; verify account eligibility |
| **Twilio** | SMS not sending | Verify Twilio Account SID and Auth Token; check Twilio balance; verify phone number format |
| **Google SSO** | Login redirect fails | Verify Google OAuth client ID and redirect URIs in Google Cloud Console |
| **Microsoft SSO** | Token exchange fails | Verify Azure AD application registration; check redirect URIs and client secret |
| **Webhooks** | Events not received | Verify webhook URL is accessible (not behind firewall); check HTTPS requirement; verify endpoint returns 200 |

### OAuth Flow Failures

**Common Causes**:
1. Third-party cookies blocked (required for OAuth popups)
2. Popup blocker preventing the authorization window
3. OAuth redirect URI mismatch in the third-party service configuration
4. Expired OAuth refresh token requiring re-authorization

**Resolution Steps**:
1. Enable third-party cookies or add an exception for the integration's domain
2. Allow popups from the R-Link domain
3. Clear browser cache and try again
4. If re-authorization fails, disconnect the integration completely and reconnect from scratch

---

## Recording Issues

### Recording Does Not Start

| Cause | Solution |
|---|---|
| Recording not enabled for the room | Enable recording in room settings (Admin > Rooms > Edit Room) |
| Storage limit reached | Check storage usage in Admin > Billing; delete old recordings or upgrade plan |
| Session type limitation | Verify recording is supported for the current session type |
| Browser permission issue | Ensure the browser has not blocked necessary permissions |

### Recording Quality Issues

| Issue | Solution |
|---|---|
| Recording is blurry | Check original video quality; ensure HD was enabled during session |
| Recording has no audio | Verify microphone was active during session; check audio permissions |
| Recording is choppy | Network issues during session; check bandwidth logs |
| Recording file is corrupted | Re-download; if still corrupted, escalate to support |

### Recording Playback Issues

| Issue | Solution |
|---|---|
| Replay page shows "Recording not found" | Verify recording ID in URL; check Admin > Recordings for the file |
| Replay page loads but video does not play | Try a different browser; ensure browser supports the video codec |
| Replay is slow to buffer | Check internet speed; try downloading the recording instead of streaming |
| Cannot download recording | Check storage permissions; verify the recording has finished processing |

### Recording Storage

| Plan | Storage Limit | Warning Threshold (80%) |
|---|---|---|
| Basic | 10 GB | 8 GB |
| Business | 50 GB | 40 GB |

When storage is full:
1. New recordings cannot be started
2. Active recordings may be truncated
3. The user receives a notification with options: delete old files or upgrade

---

## Stream Health Problems (Business Plan)

### RTMP Stream Issues

| Issue | Cause | Solution |
|---|---|---|
| Stream does not start | RTMP URL or stream key incorrect | Re-enter RTMP URL and stream key from the platform (YouTube, Facebook, etc.) |
| Stream starts then drops | Insufficient upload bandwidth | Ensure minimum 4 Mbps sustained upload; use wired connection |
| Stream is laggy for viewers | High latency on RTMP path | This is inherent to RTMP (5-30 seconds latency); reduce encoding complexity |
| Audio/video out of sync | Encoding issues | Restart the stream; check CPU usage; reduce video quality |
| Stream is pixelated | Bitrate too low | Increase stream bitrate; ensure upload bandwidth supports higher bitrate |
| Multi-platform stream fails on one platform | Platform-specific issue | Check the specific platform's dashboard for errors; re-enter that platform's stream key |
| "Stream key expired" | Platform regenerated the key | Get a new stream key from the platform and update in R-Link integrations |

### Stream Health Monitoring

During a live stream, monitor:
- **Upload bitrate**: Should be stable and above minimum threshold
- **Frame rate**: Should be consistent (target 30fps)
- **Dropped frames**: Should be near zero; high dropped frames indicate bandwidth or CPU issues
- **Stream status per platform**: Each connected platform shows its own connection status

---

## Permission Denied Errors

### How Permissions Work

The `usePermissions` hook provides three key functions:
- `isOwner`: Returns `true` if the user's email matches `Account.owner_email`
- `hasPermission(category, action)`: Checks if the user's role grants permission for a specific action
- `canAccessTab(tab)`: Checks if the user can access a specific admin tab

### "You don't have permission to access this page/feature"

**Diagnosis**:
1. Determine which tab or feature the user is trying to access
2. Check the tab access rules:

| Tab | Access Rule | Who Can Access |
|---|---|---|
| dashboard | Public | All authenticated users |
| account | Public | All authenticated users |
| schedule | Public | All authenticated users |
| support | Public | All authenticated users |
| notetaker | Public | All authenticated users |
| billing | Owner-only | Only `owner_email` |
| roles | Owner-only | Only `owner_email` |
| rooms, recordings, clips, brand-kit, team, templates, integrations, settings, leads, event-landing, elements | Permission-gated | Depends on user's assigned role |

**Resolution by Access Level**:

For **public tabs** (dashboard, account, schedule, support, notetaker):
- If access is denied, there may be an authentication issue. Re-authenticate.

For **owner-only tabs** (billing, roles):
- Only the account owner can access these. The user must be the person whose email is `owner_email` on the Account entity.
- If the user should be the owner but cannot access: Check that their login email matches exactly (case-sensitive) with `owner_email`.

For **permission-gated tabs** (all others):
- The user's role must grant permission for the specific tab.
- Check the user's role in Admin > Team.
- The account owner or an admin can change the user's role.
- Built-in roles: `admin` (all permissions), `host` (limited team/rooms permissions).
- Custom roles can be created by the account owner in Admin > Roles.

### "canAccessTab returned false" Debugging

**For support agents debugging this issue**:
1. Identify the user's email address
2. Look up their TeamMember entity to find their assigned role
3. Look up the Role entity to check its permission set
4. Compare the required permission for the tab against the role's permissions
5. If the role lacks the needed permission, the account owner must update the role or assign a different role

---

## Account Creation Failures

### Auto-Creation Does Not Trigger

**Symptom**: User completes registration/onboarding but no Account entity is created. Admin portal shows empty state or errors.

**Possible Causes**:
1. Network error during the auto-creation API call
2. Base44 backend error preventing entity creation
3. Race condition if multiple requests fire simultaneously
4. The detection logic for "no existing accounts" failed

**Resolution**:
1. Have the user log out completely
2. Clear `localStorage` (or use `?clear_access_token=true`)
3. Log back in
4. Navigate to the Home page or Admin portal
5. The auto-creation logic should re-trigger
6. If it still fails, check the browser console for API errors
7. If API errors indicate a server-side issue, escalate to engineering

### Account Created with Wrong Defaults

**Symptom**: Account exists but has unexpected default values.

**Expected Defaults**:
| Field | Expected Default |
|---|---|
| `plan` | `basic` |
| `billing_cycle` | `monthly` |
| `limits.max_rooms` | 5 |
| `limits.max_storage_gb` | 10 |
| `limits.max_attendees` | 100 |
| `limits.max_team_members` | 3 |

**Resolution**: If defaults are wrong, the account owner can manually update settings via Admin > Account and Admin > Billing. For limit discrepancies, escalate to support.

### Brand Kit Not Auto-Created

**Symptom**: Admin > Brand Kit tab is empty or shows errors instead of the default brand kit.

**Resolution**:
1. Navigate to Admin > Brand Kit
2. If empty, try creating a new Brand Kit manually
3. Use the default values documented in [03-getting-started.md](./03-getting-started.md) as reference
4. If creation fails, check for API errors in the browser console
5. Escalate to support if the issue persists

---

## General Diagnostic Procedures

### Step 1: Gather Information

Always collect the following before attempting troubleshooting:
1. **Browser and version** (e.g., Chrome 120)
2. **Operating system** (e.g., Windows 11, macOS 14)
3. **Internet connection type** (WiFi, ethernet, mobile)
4. **The exact URL** the user is on (including all query parameters)
5. **The exact error message** (word for word)
6. **When it started** (always, recently, after an action)
7. **Account plan** (Basic or Business)
8. **User role** (owner, admin, host, custom)

### Step 2: Basic Checks

| Check | Action |
|---|---|
| Browser up to date? | Check browser version against supported list |
| JavaScript enabled? | Should be enabled by default; check browser settings |
| Extensions interfering? | Try incognito/private mode |
| Multiple tabs issue? | Close other R-Link tabs; only keep one active |
| Cache issue? | Hard refresh (Ctrl+Shift+R or Cmd+Shift+R) |
| Token issue? | Try `?clear_access_token=true` |

### Step 3: Console Diagnostics

Guide the user (or check yourself if on a support call):
1. Press F12 to open developer tools
2. Go to the Console tab
3. Look for red error messages
4. Common error patterns:
   - `401` or `403` = Authentication/permission issue (see respective sections)
   - `404` = Resource not found (room, recording, etc.)
   - `500` = Server error (escalate if persistent)
   - `TypeError` or `ReferenceError` = Frontend code error (note the error and escalate)
   - `NetworkError` or `Failed to fetch` = Connection issue (check network)

### Step 4: Network Diagnostics

1. Go to the Network tab in developer tools
2. Refresh the page
3. Look for failed requests (red entries)
4. Check the status code and response body
5. For WebRTC issues, check `chrome://webrtc-internals/` in Chrome

---

## Settings and Options

### Diagnostic URL Parameters

| Parameter | Value | Purpose |
|---|---|---|
| `clear_access_token` | `true` | Clears stored auth token and forces re-login |
| `access_token` / `token` | JWT string | Provides authentication token via URL |
| `appId` | Application ID | Identifies the R-Link Base44 application |
| `serverUrl` | URL | Base44 backend server endpoint |
| `fromUrl` | URL | Return URL after auth flow |
| `functionsVersion` | Version string | Specifies serverless functions version |
| `type` | `meeting`, `webinar`, `livestream` | Sets session type for Studio |

### LocalStorage Keys

| Key | Purpose | When to Clear |
|---|---|---|
| `base44_access_token` | Authentication token | Auth issues, account switching, token corruption |
| Device preferences | Camera/mic/speaker selection | Device detection issues |
| UI state | Sidebar collapsed state, preferences | Layout/display issues |

### Clearing All Local Data

For persistent issues that resist individual fixes:
1. Open browser settings
2. Navigate to Privacy > Clear browsing data
3. Select "Cookies and site data" and "Cached images and files"
4. Select the R-Link domain specifically (if possible) or clear all
5. Close and reopen the browser
6. Navigate to R-Link and log in fresh

---

## FAQ

**Q: The page is completely blank/white. What do I do?**
A: This usually indicates a JavaScript error or missing URL parameters. Try: (1) Hard refresh (Ctrl+Shift+R), (2) Check that the URL includes `appId` and `serverUrl` parameters, (3) Try in an incognito window, (4) Check browser console (F12) for errors.

**Q: I keep getting logged out. Why?**
A: Your authentication token is expiring. This can happen if: (1) The token has reached its expiration time, (2) You are using a shared or public computer where `localStorage` is cleared, (3) A browser extension is clearing local storage. Solution: Re-login each time; consider bookmarking the direct login URL.

**Q: I can see the Admin portal but some tabs are missing. Why?**
A: Tab visibility is controlled by role-based permissions. Your assigned role may not include access to all tabs. Contact your account owner to adjust your role. See the Permission Denied section for the full tab access matrix.

**Q: My camera works in other apps but not in R-Link. Why?**
A: Common causes: (1) Browser has not granted camera permission to R-Link -- check the address bar for a camera icon or go to browser settings, (2) Another app has exclusive camera access -- close other video apps, (3) Browser needs to be updated to support WebRTC, (4) The Setup page was skipped -- navigate to `/setup` to select your camera.

**Q: The recording says "processing" for a long time. Is it stuck?**
A: Recording processing can take several minutes to hours depending on session length. If it has been more than 2 hours for a short session, try refreshing the page. If the status does not change, escalate to support.

**Q: I connected an integration but it shows "disconnected" now. Why?**
A: OAuth tokens for third-party services can expire. Navigate to Admin > Integrations, find the integration, and click "Reconnect" to re-authorize. If the issue persists, disconnect completely and reconnect from scratch.

**Q: The live stream started but viewers say it is not showing on YouTube/Facebook/etc.**
A: There is an inherent delay of 5-30 seconds for RTMP streams. Wait up to 60 seconds. If still not visible: (1) Verify the stream key is correct, (2) Check that the destination platform's live stream is set to "Live" not "Scheduled", (3) Ensure RTMP port 1935 is not blocked by your firewall.

**Q: I upgraded to Business but features are still locked.**
A: Try: (1) Hard refresh the browser (Ctrl+Shift+R), (2) Log out and log back in, (3) Clear browser cache. If still locked, check Admin > Billing to confirm the plan shows "Business" and status is "Active". If billing shows Basic despite payment, escalate to support.

**Q: My virtual background is not working / looks bad.**
A: Virtual backgrounds require WebGL and hardware acceleration. Try: (1) Enable hardware acceleration in browser settings, (2) Use Chrome for best performance, (3) Ensure adequate lighting (poor lighting makes edge detection difficult), (4) Use a solid-color background for best results. Test at `/virtual-background-test`.

**Q: Multiple team members cannot join the account.**
A: Check: (1) Team member limit -- default is 3 on Basic plan, (2) Admin > Team tab to see current member count, (3) Upgrade plan or remove inactive members to make room.

---

## Known Limitations

1. **No Automatic Token Refresh**: Base44 tokens expire and are not automatically refreshed. Users must re-authenticate when their token expires, which can interrupt active sessions if the token expires mid-session.

2. **LocalStorage Dependency**: Authentication depends on `localStorage`. Private/incognito mode, browser extensions that clear storage, or corporate browser policies that restrict `localStorage` can cause persistent authentication issues.

3. **Single-Browser State**: Device preferences and UI state are stored per-browser. Users switching between browsers or devices must reconfigure their preferences.

4. **Mobile Limitations**: On screens narrower than 768px, sidebars auto-collapse. The full Studio production experience is optimized for desktop browsers. Touch interactions for complex production controls (e.g., drag-and-drop in scene management) may be limited.

5. **WebRTC Firewall Restrictions**: Corporate or institutional firewalls that block UDP traffic may prevent WebRTC connections. TURN server fallback may be required but adds latency.

6. **RTMP Latency**: Live streams to external platforms inherently have 5-30 seconds of latency due to RTMP protocol characteristics. This cannot be reduced from the R-Link side.

7. **Integration Token Expiration**: Third-party OAuth tokens can expire independently. Users may need to periodically re-authorize integrations without warning.

8. **Recording Processing Time**: Long sessions produce large recordings that take significant time to process. There is no progress indicator during processing -- only a "processing" status.

9. **Concurrent Session Limit**: Even on Business plan, rooms are limited to 5 parallel sessions. Exceeding this requires contacting support for enterprise options.

10. **Browser Compatibility Variance**: While Chrome, Firefox, Edge, and Safari are supported, WebRTC implementation differences across browsers can cause subtle behavior variations in video quality, screen sharing, and virtual backgrounds.

11. **No Offline Capability**: R-Link requires a persistent internet connection. There is no offline mode or local caching of session content.

12. **Case-Sensitive Owner Email**: The owner check (`email === owner_email`) may be case-sensitive. If a user registered with different email casing than what is stored in `owner_email`, owner-only features (billing, roles tabs) will be inaccessible.

---

## Plan Requirements

| Troubleshooting Area | Basic | Business |
|---|---|---|
| Authentication troubleshooting | Yes | Yes |
| Token management | Yes | Yes |
| Browser/network requirements | Yes | Yes |
| Room loading issues | Yes | Yes |
| Recording issues | Yes | Yes |
| UI/display issues | Yes | Yes |
| Permission issues | Yes | Yes |
| Account creation issues | Yes | Yes |
| Integration troubleshooting | Calendar only | All integrations |
| Streaming issues | N/A (not available) | Yes |
| Webinar issues | N/A (not available) | Yes |
| AI Notetaker issues | N/A (not available) | Yes |

---

## Related Documents

- [00-index.md](./00-index.md) -- Master index, question routing, and escalation paths
- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture, entities, permissions system
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan limits, feature gating, billing troubleshooting
- [03-getting-started.md](./03-getting-started.md) -- Registration, onboarding, setup page, first session
