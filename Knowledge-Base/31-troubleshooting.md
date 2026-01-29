# R-Link Troubleshooting & Diagnostics

## Overview

This document is the comprehensive troubleshooting reference for the R-Link platform. It covers authentication errors, token management, browser and network requirements, common UI issues, room loading errors, integration connection failures, recording problems, stream health diagnostics, permission denied errors with a full tab access matrix, account creation failures, diagnostic procedures, localStorage key reference, frequently asked questions, and known limitations.

Use the table of contents below to jump to the relevant section, or refer to the question routing table in [00-index.md](00-index.md) to find the right starting point.

---

## Table of Contents

1. [Authentication Errors](#authentication-errors)
2. [Token Management](#token-management)
3. [Browser Requirements](#browser-requirements)
4. [Network Requirements](#network-requirements)
5. [Common UI Issues](#common-ui-issues)
6. [Room Loading Errors](#room-loading-errors)
7. [Integration Connection Failures](#integration-connection-failures)
8. [Recording Issues](#recording-issues)
9. [Stream Health Problems](#stream-health-problems)
10. [Permission Denied Errors](#permission-denied-errors)
11. [Account Creation Failures](#account-creation-failures)
12. [Diagnostic Procedures](#diagnostic-procedures)
13. [localStorage Keys Reference](#localstorage-keys-reference)
14. [FAQ](#faq)
15. [Known Limitations](#known-limitations)

---

## Authentication Errors

### Error: 401 Unauthorized (Expired Token)

**Symptom:**
- User is suddenly logged out mid-session or on page load
- API calls return 401 status code
- Console shows "Unauthorized" or "Token expired" messages
- User sees a blank page or is redirected to the login screen unexpectedly

**Cause:**
- The `access_token` stored in localStorage has expired
- JWT tokens have a limited lifespan (set by the Base44 platform configuration)
- The token was issued in a previous session and is no longer valid

**Resolution:**
1. **Automatic:** R-Link should redirect to the login page automatically via `navigateToLogin()`
2. **Manual:** If not redirected, navigate to the login page directly
3. **Force clear:** Add `?clear_access_token=true` to the URL to force token removal and re-authentication
4. **Clear localStorage:** Open browser DevTools (F12) > Application > Local Storage > clear the `access_token` entry
5. **Re-login:** Enter credentials to obtain a fresh token

**Prevention:**
- Avoid keeping R-Link tabs open for extended periods without interaction
- If using shared/public computers, always log out explicitly

---

### Error: 403 auth_required

**Symptom:**
- User sees a login prompt or blank page when navigating to an authenticated page
- Console shows 403 error with `auth_required` message
- Occurs on pages like `/Admin`, `/Studio`, `/Home`, `/MeetingNotes`, `/Setup`

**Cause:**
- No `access_token` is present in localStorage or the URL
- The user has not authenticated at all
- The token was cleared by another process (browser cleanup, extension, etc.)
- The user navigated to an authenticated page via a direct URL without being logged in

**Resolution:**
1. Navigate to the login page and authenticate with email/password or SSO
2. If using a shared link, ensure the link includes authentication context or the user is already logged in
3. Check that browser extensions (privacy tools, cookie managers) are not clearing localStorage
4. Verify that the R-Link domain is allowed to use localStorage in browser settings

**Diagnostic Check:**
```
Open DevTools (F12) > Console > Type:
localStorage.getItem('access_token')
```
If this returns `null`, the user has no active session.

---

### Error: 403 user_not_registered

**Symptom:**
- User has a valid token (SSO login succeeded) but cannot access R-Link
- Error message indicates the user is not registered
- Console shows 403 with `user_not_registered` type

**Cause:**
- The user authenticated via Google or Microsoft SSO but does not have an R-Link account
- The Base44 auth system recognizes the SSO identity but R-Link's User entity has no matching record
- The account creation process after SSO did not complete (network interruption, browser closed)

**Resolution:**
1. Navigate to `/Register` and complete the registration flow using the same SSO provider
2. If the user believes they already registered, check if they used a different SSO provider or email address
3. Contact support if the issue persists after re-registering
4. Admin can check if the User entity exists by email in the Base44 admin console

**Edge Case:**
- If a team member was invited but has not accepted the invitation, they may see this error. They must complete registration via the invitation link first.

---

### Token Refresh and Session Recovery

**Symptom:**
- Intermittent 401 errors followed by successful requests
- Brief UI flickers or loading states during active use

**Cause:**
- The token is nearing expiration and the SDK is attempting to refresh it
- Network latency is causing temporary failures during the refresh process

**Resolution:**
1. These are typically transient issues. Wait a few seconds for the refresh to complete.
2. If persistent, perform a hard refresh (Ctrl+Shift+R) to force a full page reload.
3. If still failing, log out and log back in to get a completely new token.

---

## Token Management

### How Tokens Work in R-Link

1. **Token Acquisition:** After authentication, the Base44 SDK returns an `access_token` (JWT)
2. **Token Delivery:** The token is passed via URL fragment (`#access_token=...`) or query parameter
3. **Token Storage:** R-Link extracts the token from the URL and stores it in `localStorage`
4. **Token Usage:** All API requests include the token via the Base44 SDK's request headers
5. **Token Expiration:** Tokens have a limited lifespan; expired tokens trigger re-authentication

### Token-Related URL Parameters

| Parameter | Usage | Description |
|-----------|-------|-------------|
| `access_token` | URL fragment | The JWT authentication token delivered after login |
| `clear_access_token=true` | Query parameter | Forces R-Link to clear the stored token and redirect to login |
| `fromUrl` | Query parameter | URL to return to after re-authentication |

### Forcing Re-Authentication

When a customer reports persistent auth issues, instruct them to:

1. **Method 1 -- URL Parameter:**
   - Add `?clear_access_token=true` to any R-Link URL
   - Example: `https://app.r-link.com/?clear_access_token=true`
   - This clears the token and redirects to login

2. **Method 2 -- Manual localStorage Clear:**
   - Open DevTools (F12)
   - Go to Application > Local Storage > select the R-Link domain
   - Find and delete the `access_token` key
   - Refresh the page

3. **Method 3 -- Full Clear:**
   - Open DevTools (F12)
   - Go to Application > Local Storage > select the R-Link domain
   - Click "Clear All" to remove all R-Link localStorage data
   - Note: This also clears device preferences and other local settings
   - Refresh the page and log in again

### Token Security Considerations

- Tokens should not be shared or exposed in URLs sent to others
- If a user suspects token compromise, they should log out immediately and change their password
- The `access_token` in the URL fragment is not sent to the server in HTTP requests (fragments are client-side only)
- Advise users not to bookmark URLs that contain `access_token` fragments

---

## Browser Requirements

### Minimum Browser Versions

| Browser | Minimum Version | WebRTC Support | Recommended |
|---------|----------------|---------------|-------------|
| Google Chrome | 72+ | Full | Yes (primary) |
| Mozilla Firefox | 60+ | Full | Yes |
| Microsoft Edge (Chromium) | 79+ | Full | Yes |
| Safari | 14.1+ | Partial (limited SFU) | Conditional |
| Safari iOS | 14.5+ | Partial | Conditional |
| Chrome Android | 72+ | Full | Yes |
| Opera | 60+ | Full | Yes |

### Required Browser APIs

| API | Purpose | Check Method |
|-----|---------|-------------|
| WebRTC (`RTCPeerConnection`) | Real-time video/audio communication | `typeof RTCPeerConnection !== 'undefined'` |
| `getUserMedia` | Camera and microphone access | `navigator.mediaDevices && navigator.mediaDevices.getUserMedia` |
| `getDisplayMedia` | Screen sharing | `navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia` |
| localStorage | Token storage, preferences | `typeof localStorage !== 'undefined'` |
| WebSocket | Real-time data (chat, events) | `typeof WebSocket !== 'undefined'` |
| Fetch API | HTTP requests | `typeof fetch !== 'undefined'` |
| ES6+ (Promises, async/await) | Modern JavaScript features | Implied by browser version |

### Browser-Specific Issues

| Browser | Known Issue | Workaround |
|---------|------------|------------|
| Safari | Limited SFU support; some layouts may not render correctly | Use Chrome or Firefox for best experience |
| Safari | getUserMedia may require HTTPS | Ensure R-Link is accessed via HTTPS |
| Firefox | Some WebRTC stats APIs differ from Chrome | Monitoring dashboards may show less detail |
| Edge (Legacy/non-Chromium) | Not supported | Upgrade to Chromium-based Edge |
| Internet Explorer | Not supported at all | Use any modern browser |
| Brave | Shield features may block WebRTC | Disable Shields for the R-Link domain or allow WebRTC in settings |
| Any browser (Incognito/Private) | localStorage may be restricted | Use normal browsing mode |

### Hardware Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | Dual-core 2.0 GHz | Quad-core 2.5 GHz+ |
| RAM | 4 GB | 8 GB+ |
| Camera | 720p | 1080p |
| Microphone | Built-in or USB | USB condenser or headset |
| Internet | 2 Mbps up/down | 5 Mbps+ up/down |
| Display | 1280x720 | 1920x1080+ |

---

## Network Requirements

### Bandwidth Requirements

| Activity | Minimum Upload | Minimum Download | Recommended |
|----------|---------------|-----------------|-------------|
| Audio only | 100 Kbps | 100 Kbps | 256 Kbps |
| Video (720p) | 1.5 Mbps | 1.5 Mbps | 3 Mbps |
| Video (1080p) | 3 Mbps | 3 Mbps | 5 Mbps |
| Screen sharing | 1 Mbps | 1 Mbps | 3 Mbps |
| RTMP streaming | 4 Mbps upload | N/A | 6+ Mbps upload |
| Large meeting (20+ participants) | 2 Mbps | 4 Mbps | 8+ Mbps |

### Port and Protocol Requirements

| Protocol | Ports | Purpose |
|----------|-------|---------|
| HTTPS | 443 | Web application, API calls, signaling |
| WebSocket (WSS) | 443 | Real-time data (chat, events, presence) |
| UDP | 10000-60000 (dynamic) | WebRTC media streams (audio/video) |
| TCP | 443 (fallback) | WebRTC TURN relay (when UDP is blocked) |
| RTMP | 1935 | Live streaming output to external platforms |
| RTMPS | 443 | Secure live streaming (encrypted RTMP over TLS) |

### Firewall and Proxy Considerations

| Environment | Common Issue | Resolution |
|------------|--------------|------------|
| Corporate firewall | UDP ports blocked, WebRTC cannot establish peer connections | Configure firewall to allow UDP 10000-60000 or use TURN relay (TCP 443 fallback) |
| Proxy server | WebSocket connections blocked | Whitelist the R-Link domain and Base44 server domain |
| VPN | High latency, packet loss on UDP streams | Use split tunneling to exclude R-Link traffic from VPN |
| Content filter | R-Link domain categorized as "streaming" and blocked | Request domain whitelisting from IT department |
| NAT (Symmetric) | WebRTC peer connections fail | TURN server relay is used automatically; ensure TURN ports are accessible |

### Network Diagnostic Steps

1. **Check bandwidth:** Use speedtest.net or fast.com to verify upload/download speeds
2. **Check WebRTC:** Visit `https://test.webrtc.org/` to verify WebRTC is functioning
3. **Check WebSocket:** Open DevTools > Network > WS tab to see if WebSocket connections are established
4. **Check UDP:** If video/audio fails, UDP may be blocked. Check with IT department.
5. **Check DNS:** Ensure the R-Link domain and Base44 server domain resolve correctly

---

## Common UI Issues

### Sidebar Auto-Collapse (Screen Width < 768px)

**Symptom:**
- Admin sidebar disappears or collapses to a hamburger menu icon
- User reports "missing navigation" or "can't find tabs"

**Cause:**
- The R-Link responsive design collapses the sidebar when the browser window width is less than 768px
- This includes smaller laptop screens, tablets, and mobile devices

**Resolution:**
1. Click the hamburger menu icon (three horizontal lines) to expand the sidebar
2. Resize the browser window to be wider than 768px
3. On desktop, check if the browser is in a split-screen or snapped window mode that reduces width

### Page Not Loading / White Screen

**Symptom:**
- Page shows a white/blank screen with no content
- Spinner/loading indicator shows indefinitely

**Cause:**
- JavaScript error preventing React from rendering
- Network failure blocking API calls
- Authentication error (see Auth Errors section)
- Browser extension interference

**Resolution:**
1. Open DevTools (F12) > Console to check for JavaScript errors
2. Try hard refresh: Ctrl+Shift+R (or Cmd+Shift+R on Mac)
3. Try in an incognito/private window to rule out extensions
4. Clear browser cache for the R-Link domain
5. Check network connectivity
6. Verify the URL is correct and complete

### Stale Data / UI Not Updating

**Symptom:**
- Changes made in one tab (e.g., creating a room) do not appear in another tab
- Dashboard metrics appear outdated
- Recently created entities are missing from lists

**Cause:**
- TanStack Query cache serving stale data
- Network request failed silently
- Real-time subscription disconnected

**Resolution:**
1. Hard refresh the page (Ctrl+Shift+R)
2. Navigate away from and back to the affected tab
3. Check the browser's Network tab for failed API requests
4. If persistent, log out and log back in to reset all caches

### Modal / Overlay Stuck

**Symptom:**
- A modal dialog or overlay is stuck on screen and cannot be dismissed
- Background is darkened but clicking does not close the modal

**Resolution:**
1. Press the Escape key
2. If Escape does not work, hard refresh the page
3. Check if another modal is behind the visible one (layering issue)

### Element Not Displaying in Session

**Symptom:**
- An Element (slide, poll, banner, etc.) is activated but not visible to participants

**Cause:**
- Element type requires Business plan (and account is on Basic)
- Element content failed to load (broken URL, deleted file)
- Layout does not support the Element overlay position
- Browser blocking embedded content (for Website Overlay type)

**Resolution:**
1. Verify the Element type is available on the current plan
2. Check the Element content URL is accessible
3. Try a different layout that supports overlays
4. For Website Overlays, ensure the target URL allows iframe embedding

---

## Room Loading Errors

### "Room Not Found"

**Symptom:**
- Navigating to a room results in a "Room Not Found" or 404-like error
- The room was previously accessible

**Cause:**
- Room was deleted or archived
- Room ID or slug in the URL is incorrect
- User does not have permission to access the room (role-based)
- Room belongs to a different account

**Resolution:**
1. Verify the room exists in Admin > Rooms
2. Check the URL for typos in the room ID or slug
3. If the room was archived, it must be restored by an Admin or Owner
4. If permission-related, contact the account Admin to verify role access

### "Room Limit Reached"

**Symptom:**
- Cannot create a new room
- "Create Room" button is disabled with an upgrade prompt

**Cause:**
- Account has reached the maximum room limit for the current plan
- Basic: 1 room maximum
- Business: 5 rooms maximum

**Resolution:**
1. Delete or archive an existing room to free up a slot
2. Upgrade from Basic to Business for more rooms
3. If on Business and at 5 rooms, contact sales for enterprise options

### Room Fails to Load in Studio

**Symptom:**
- Studio page opens but room content does not load
- Participants cannot see shared content or each other

**Cause:**
- WebRTC connection failure (network issue)
- Room session has ended or was never started
- Conflicting session in the same room

**Resolution:**
1. Check network connectivity (see Network Requirements)
2. Verify the session is active (check Admin > Dashboard for active rooms)
3. Try refreshing the Studio page
4. End any conflicting sessions in the room and restart

---

## Integration Connection Failures

### General Integration Troubleshooting

**Step-by-step diagnostic for any integration failure:**

1. **Verify plan:** Confirm the account is on the Business plan (most integrations require Business). SSO and Calendar integrations are available on Basic.
2. **Check credentials:** Ensure the API key, client ID, or OAuth credentials are correct and not expired
3. **Re-authenticate:** Disconnect and reconnect the integration in Admin > Integrations
4. **Check permissions:** Some integrations require specific permissions (e.g., Salesforce API access, YouTube Live streaming enabled)
5. **Check rate limits:** The external service may have rate-limited the R-Link connection
6. **Check service status:** Verify the external service is not experiencing an outage
7. **Clear cached credentials:** In Admin > Integrations, click "Disconnect" then "Connect" to start fresh
8. **Check webhooks:** If using webhooks, verify the endpoint URL is accessible and returns 200 OK

### Integration-Specific Issues

| Integration | Common Issue | Resolution |
|------------|-------------|------------|
| Mailchimp | "Invalid API Key" | Regenerate API key in Mailchimp dashboard; ensure the key matches the data center (e.g., `us1`) |
| SendGrid | Emails not sending | Verify sender identity is verified in SendGrid; check API key permissions |
| Stripe | Payment page not loading | Verify publishable and secret keys are correct; check Stripe dashboard for blocked payments |
| PayPal | Redirect loop during payment | Verify return URLs are configured correctly in PayPal developer settings |
| Google Drive | "Access Denied" | Re-authorize with an account that has Google Drive access; check sharing permissions |
| Dropbox | Upload fails | Check Dropbox storage limits; verify app permissions in Dropbox settings |
| Google SSO | Pop-up blocked | Disable pop-up blocker for R-Link domain; allow third-party cookies |
| Microsoft SSO | "Admin Consent Required" | Azure AD admin must grant consent for the R-Link application |
| Salesforce | "Insufficient Permissions" | Verify Salesforce user has API access enabled and correct profile permissions |
| HubSpot | Contacts not syncing | Check HubSpot API key permissions; verify contact properties match |
| YouTube Live | "Stream key invalid" | Regenerate stream key in YouTube Studio; ensure channel has live streaming enabled |
| Facebook Live | "Page not authorized" | Ensure the connected Facebook account has admin access to the target page |
| Twitch | Stream not starting | Verify stream key in Twitch dashboard; check if another stream is active |
| LinkedIn Live | "Not approved" | LinkedIn Live requires approval; verify the account/page is approved for streaming |
| Twilio | "Invalid account SID" | Verify Account SID and Auth Token in Twilio console |
| Google Calendar | Events not syncing | Re-authorize; check if the calendar is primary or shared (shared calendars may need explicit permission) |
| Outlook Calendar | "Token expired" | Re-authenticate the Microsoft connection in Admin > Integrations |
| Webhooks | No events received | Verify endpoint URL is publicly accessible; check for SSL certificate issues; review webhook logs |

---

## Recording Issues

### Recording Not Starting

**Symptom:**
- Clicking "Record" does not initiate recording
- Recording indicator does not appear

**Cause:**
- Insufficient storage (account at storage limit)
- Permission issue (only hosts and above can initiate recording)
- Browser does not support recording APIs
- Session is not fully connected (WebRTC still establishing)

**Resolution:**
1. Check storage usage in Admin > Dashboard (must be below limit)
2. Verify user has host, admin, or owner role
3. Wait for the session to fully connect (all indicators green) before starting recording
4. Try a different browser (Chrome recommended)

### Recording Not Saved / Missing

**Symptom:**
- Recording was started and stopped but does not appear in Admin > Recordings
- Recording status shows "Processing" indefinitely

**Cause:**
- Recording processing failed on the server
- Network interruption during recording upload
- Storage limit reached during recording
- Session ended abnormally (browser crash, power loss)

**Resolution:**
1. Wait up to 30 minutes for processing to complete (large recordings take longer)
2. Check Admin > Recordings for entries with "Processing" or "Failed" status
3. If "Failed," check if storage limit was reached during the recording
4. For abnormal session endings, the recording may be partially saved; check for partial files
5. If no recording entry exists, the recording data may have been lost; escalate to Tier 2

### Recording Quality Issues

**Symptom:**
- Recording is blurry, choppy, or has audio sync issues

**Cause:**
- Low network bandwidth during the session
- High CPU usage on the host's machine
- Source video/audio quality was low

**Resolution:**
1. Ensure minimum bandwidth requirements are met during recording sessions
2. Close unnecessary applications to reduce CPU usage
3. Use a high-quality camera and microphone
4. Check if the recording resolution matches the session resolution settings

### Local vs Cloud Recording

| Aspect | Local Recording | Cloud Recording |
|--------|----------------|----------------|
| Storage Location | User's device | R-Link cloud (Base44 storage) |
| Availability | Immediately after session | After processing (minutes to hours) |
| Quality | Depends on local resources | Optimized by platform |
| Storage Impact | Does not count toward account limit | Counts toward storage limit |
| Access | Only on the recording device | Available in Admin > Recordings |
| Sharing | Manual upload/sharing required | Built-in sharing via SharedClip |

---

## Stream Health Problems

### Stream Not Connecting to Platform

**Symptom:**
- "Start Streaming" button pressed but stream does not appear on YouTube/Facebook/Twitch/LinkedIn
- Stream status shows "Connecting" indefinitely

**Cause:**
- Invalid or expired stream key
- RTMP port (1935) blocked by firewall
- Platform-side issue (YouTube Studio not ready, Facebook page permissions)
- Account not on Business plan

**Resolution:**
1. Verify Business plan is active
2. Regenerate stream key on the target platform
3. Update stream key in R-Link Studio streaming panel or Admin > Integrations
4. Check if RTMP port 1935 is open (or use RTMPS on port 443)
5. Verify the target platform is ready to receive the stream

### Stream Buffering / Poor Quality

**Symptom:**
- Viewers report buffering, pixelation, or freezing
- Stream health indicators show warnings

**Cause:**
- Insufficient upload bandwidth on the host's network
- CPU overload on the host's machine (encoding takes significant CPU)
- Network congestion or packet loss
- Too many simultaneous streams (multi-platform)

**Resolution:**
1. Check upload bandwidth: minimum 4 Mbps, recommended 6+ Mbps for 720p
2. Close unnecessary applications and browser tabs
3. Reduce stream resolution (1080p to 720p)
4. Reduce the number of simultaneous streaming destinations
5. Use a wired ethernet connection instead of Wi-Fi
6. If on VPN, try split tunneling or disconnect VPN

### Stream Health Indicators

The Studio displays real-time stream health metrics:

| Indicator | Green | Yellow | Red |
|-----------|-------|--------|-----|
| Bitrate | > 2500 kbps | 1000-2500 kbps | < 1000 kbps |
| Frame Rate | > 25 fps | 15-25 fps | < 15 fps |
| Dropped Frames | < 1% | 1-5% | > 5% |
| Connection | Stable | Intermittent reconnects | Disconnected |

### Stream Dropped / Disconnected

**Symptom:**
- Stream suddenly stops on the external platform
- Studio shows "Disconnected" status

**Cause:**
- Network interruption
- Platform-side disconnect (platform server issue)
- Stream exceeded platform's maximum duration
- RTMP connection timeout (idle stream)

**Resolution:**
1. Check network connectivity
2. Click "Restart Streaming" in the Studio
3. If the platform disconnected, check the platform's streaming dashboard for error messages
4. Verify the stream has not exceeded the platform's duration limit

---

## Permission Denied Errors

### Admin Tab Access Matrix (Complete)

When a user attempts to access an Admin tab they do not have permission for, they receive a "Permission Denied" or "Access Restricted" message.

| Tab | Owner | Admin | Host | Member | Public |
|-----|-------|-------|------|--------|--------|
| dashboard | Full | Full | Full | Full | Yes |
| account | Full | Full | Full | Full | Yes |
| rooms | Full | Full | View/Create/Edit | -- | -- |
| schedule | Full | Full | Full | Full | Yes |
| recordings | Full | Full | View | -- | -- |
| clips | Full | Full | View | -- | -- |
| brand-kit | Full | Full | -- | -- | -- |
| team | Full | Full | View/Invite | -- | -- |
| roles | Full (Owner-only) | -- | -- | -- | -- |
| templates | Full | Full | -- | -- | -- |
| billing | Full (Owner-only) | -- | -- | -- | -- |
| integrations | Full | Full | -- | -- | -- |
| settings | Full | Full | -- | -- | -- |
| support | Full | Full | Full | Full | Yes |
| notetaker | Full | Full | Full | Full | Yes |
| leads | Full | Full | -- | -- | -- |
| event-landing | Full | Full | -- | -- | -- |
| elements | Full | Full | -- | -- | -- |

**Permission levels:**
- **Full:** Complete read/write/delete access
- **View:** Read-only access
- **View/Create/Edit:** Can view, create, and edit but not delete
- **View/Invite:** Can view team members and send invitations
- **--:** No access (tab not visible or shows permission denied)
- **Yes (Public):** Accessible to all authenticated users regardless of role

### Determining User Role

The user's role is determined by:

1. **isOwner:** `user.email === account.owner_email` -- The account creator with full access to everything including billing and roles
2. **Admin role:** Assigned via Team > Roles -- Full access to all tabs except billing and roles
3. **Host role:** Assigned via Team > Roles -- Access to team (view/invite), rooms (view/create/edit), and public tabs
4. **Member (default):** Default role for new team members -- Access to public tabs only

### Common Permission Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Cannot access Billing" | User is not the account Owner | Only the Owner (person who created the account) can access Billing |
| "Cannot access Roles" | User is not the account Owner | Only the Owner can manage Roles |
| "Cannot edit room" | User is a Member (not Host/Admin/Owner) | Request role upgrade from Admin or Owner |
| "Cannot see Recordings tab" | User is a Member | Request Host or Admin role |
| "Cannot manage integrations" | User is Host or Member | Request Admin role |
| "Tab not visible" | User role does not include access | Check role assignment in Admin > Team |

---

## Account Creation Failures

### Registration Fails Silently

**Symptom:**
- User clicks "Register" but nothing happens or the form resets
- No error message displayed

**Cause:**
- Form validation failure (weak password, invalid email format)
- JavaScript error in the registration component
- Network request to Base44 SDK failed
- Base44 platform is experiencing issues

**Resolution:**
1. Check that the email is valid and password meets minimum requirements
2. Open DevTools (F12) > Console for JavaScript errors
3. Check DevTools > Network for failed API requests
4. Try a different browser
5. Wait a few minutes and retry (possible platform issue)

### "Account Already Exists"

**Symptom:**
- Registration fails with a message indicating the email is already in use

**Cause:**
- The user previously registered with this email
- Another user used this email (unlikely if email verification is enabled)
- The user registered via SSO and is now trying email/password registration

**Resolution:**
1. Try logging in instead of registering
2. Use the "Forgot Password" flow to reset credentials
3. If SSO was used previously, log in with the same SSO provider
4. Contact support if the user cannot access the existing account

### Account Entity Not Created After Registration

**Symptom:**
- User can log in but sees an empty/broken Admin portal
- No account data, no brand kit, no rooms

**Cause:**
- The auto-creation process for Account and BrandKit entities failed
- Network interruption during the post-registration setup
- Base44 entity creation API returned an error

**Resolution:**
1. Try logging out and logging back in (may trigger re-initialization)
2. Navigate to `/Onboarding` to see if the flow triggers account creation
3. If the issue persists, escalate to Tier 2 support for manual account entity creation
4. Check Base44 admin console for the User record to verify registration completed

---

## Diagnostic Procedures

### Procedure 1: Full Client-Side Diagnostic

Use this procedure when a customer reports vague issues ("nothing works", "page is broken").

1. **Check browser and version:**
   - Ask the customer for browser name and version
   - Verify it meets minimum requirements (see Browser Requirements)

2. **Check console errors:**
   - Instruct: Press F12 > Click "Console" tab > Look for red error messages
   - Ask the customer to screenshot or copy/paste any red error messages

3. **Check network requests:**
   - Instruct: Press F12 > Click "Network" tab > Refresh the page
   - Look for requests with red status (4xx or 5xx errors)
   - Note the URL and status code of failed requests

4. **Check localStorage:**
   - Instruct: Press F12 > Click "Application" tab > Expand "Local Storage" > Click the R-Link domain
   - Verify `access_token` is present (if not, authentication issue)
   - Check other R-Link keys for corruption

5. **Test in incognito mode:**
   - Open an incognito/private window
   - Navigate to R-Link and log in
   - If the issue does not reproduce, browser extensions or corrupted cache are likely the cause

6. **Clear site data:**
   - In browser settings, find "Site Settings" or "Cookies and Site Data"
   - Find the R-Link domain
   - Clear all data for the domain
   - Log in again

### Procedure 2: Network Connectivity Diagnostic

Use when customers report video/audio issues, streaming failures, or connectivity problems.

1. **Bandwidth test:** Ask customer to run https://speedtest.net and report upload/download speeds
2. **WebRTC test:** Ask customer to visit https://test.webrtc.org/ and report results
3. **Firewall check:** Ask if they are on a corporate network with firewall restrictions
4. **VPN check:** Ask if they are using a VPN; suggest disconnecting temporarily to test
5. **TURN check:** If WebRTC direct connection fails, verify TURN relay is configured and accessible
6. **DNS check:** Ask customer to verify they can resolve the R-Link domain (try `nslookup` in command prompt)

### Procedure 3: Integration Diagnostic

Use when a third-party integration is not working.

1. **Verify plan:** Confirm Business plan (most integrations require it)
2. **Check connection status:** Admin > Integrations > verify the integration shows "Connected"
3. **Re-authenticate:** Click "Disconnect" then "Connect" to refresh credentials
4. **Check external service:** Verify the external service (Mailchimp, Stripe, etc.) is operational
5. **Check API key validity:** If using API keys, verify they are not expired or revoked
6. **Check permissions:** Verify the external account has the necessary permissions (e.g., Salesforce API access)
7. **Check logs:** If the integration has a log/activity view, check for error messages
8. **Test webhook:** If using webhooks, send a test event and verify the endpoint receives it

### Procedure 4: Recording/Playback Diagnostic

Use when recording or playback issues are reported.

1. **Check storage:** Admin > Dashboard > verify storage is not at limit
2. **Check recording status:** Admin > Recordings > find the recording > check status (Processing/Ready/Failed)
3. **Wait for processing:** If "Processing," wait up to 30 minutes for large recordings
4. **Check playback:** If "Ready" but won't play, try a different browser or download the file
5. **Check file format:** Verify the recording format is compatible with the browser's video player
6. **Check file size:** Very large files may fail to stream; try downloading instead
7. **Check permissions:** Verify the user has at least View access to recordings

---

## localStorage Keys Reference

R-Link uses the following localStorage keys. These are useful for diagnostics and manual troubleshooting.

| Key | Type | Description | Safe to Clear? |
|-----|------|-------------|---------------|
| `access_token` | JWT string | Current authentication token | Yes (forces re-login) |
| `rlink_preferred_camera` | Device ID string | User's preferred camera device | Yes (resets to default) |
| `rlink_preferred_microphone` | Device ID string | User's preferred microphone device | Yes (resets to default) |
| `rlink_preferred_speaker` | Device ID string | User's preferred speaker device | Yes (resets to default) |
| `rlink_onboarding_step` | Number | Current onboarding step progress | Yes (resets onboarding progress) |
| `rlink_sidebar_collapsed` | Boolean | Whether the admin sidebar is manually collapsed | Yes (resets sidebar state) |
| `rlink_theme_preference` | String | Light/dark theme preference | Yes (resets to default) |
| `rlink_notification_dismissed` | JSON array | IDs of dismissed notification banners | Yes (shows previously dismissed notifications) |
| `rlink_last_room_id` | String | ID of the last accessed room | Yes (no impact) |
| `rlink_layout_preference` | String | Preferred session layout | Yes (resets to session-type default) |
| `rlink_display_name` | String | User's display name for sessions | Yes (must re-enter on Setup page) |
| `rlink_audio_level_calibration` | Number | Microphone audio level calibration value | Yes (recalibrates on next session) |

**Note:** Key names may vary slightly based on the R-Link version. The prefix `rlink_` is used for application-specific keys. The `access_token` key may not have the `rlink_` prefix.

---

## Settings and Options

### Troubleshooting-Related Settings

| Setting | Location | Description |
|---------|----------|-------------|
| Notification Preferences | Admin > Account | Enable/disable email notifications for errors and warnings |
| Auto-Record | Admin > Settings | If auto-record fails silently, disable and re-enable |
| Default Session Type | Admin > Settings | If wrong session type launches, check this setting |
| Webhook Retry Policy | Admin > Integrations > Webhooks | Number of retry attempts for failed webhook deliveries |
| Integration Sync Frequency | Admin > Integrations > [specific integration] | How often data is synced with external services |

---

## FAQ

**Q1: My screen is blank when I open R-Link. What should I do?**
A: This is usually caused by an authentication error or JavaScript failure. Try: (1) Hard refresh with Ctrl+Shift+R, (2) Clear your browser cache, (3) Try an incognito window, (4) Check if your browser meets minimum requirements. If none of these work, check the console (F12) for error messages and contact support.

**Q2: I keep getting logged out. Why?**
A: This is typically caused by token expiration. Tokens have a limited lifespan set by the Base44 platform. If you are being logged out frequently, check for browser extensions that clear cookies/localStorage, and ensure your network connection is stable.

**Q3: My camera/microphone is not detected on the Setup page.**
A: Ensure: (1) The device is physically connected and powered on, (2) No other application is using the device, (3) Browser permission is granted (check browser address bar for camera/mic permission icon), (4) Try refreshing the page. If using a USB device, unplug and replug it, then refresh.

**Q4: I can hear others but they can't hear me.**
A: Your microphone may be muted at the OS level or the wrong device is selected. Check: (1) R-Link mic toggle is unmuted, (2) Correct mic is selected in the Setup page dropdown, (3) OS sound settings show the correct input device, (4) Audio level meter shows activity when you speak.

**Q5: The video is freezing or lagging during a session.**
A: This is usually a bandwidth issue. Check: (1) Internet speed (minimum 1.5 Mbps up/down for video), (2) Close other bandwidth-heavy applications, (3) Switch from Wi-Fi to wired ethernet if possible, (4) Disable HD video if available, (5) Check if your network is throttling WebRTC traffic.

**Q6: I can't access certain Admin tabs. Why?**
A: Tab access is role-based. Check your role in Admin > Account. Public tabs (dashboard, account, schedule, support, notetaker) are available to everyone. Other tabs require Host, Admin, or Owner roles. The Billing and Roles tabs are Owner-only. Contact your account Owner or Admin for role changes.

**Q7: My recording shows as "Processing" for a long time. Is this normal?**
A: Processing time depends on recording length and server load. Typical: 5-15 minutes for a 1-hour recording. Wait up to 30 minutes before contacting support. If "Processing" persists beyond 1 hour, it may have failed. Check Admin > Recordings for a "Failed" status.

**Q8: My integration says "Connected" but data is not syncing.**
A: Try: (1) Disconnect and reconnect the integration, (2) Verify API key/credentials are still valid in the external service, (3) Check if the external service has rate limits, (4) Review integration sync settings for frequency, (5) Test with a manual data entry to verify the connection is live.

**Q9: I'm getting a "Room Limit Reached" error. What can I do?**
A: Basic plan allows 1 room; Business allows 5. Delete or archive existing rooms to free slots, or upgrade your plan for more rooms.

**Q10: Can I use R-Link behind a corporate firewall?**
A: Yes, but the firewall must allow: HTTPS (port 443) for the web app and APIs, WebSocket (port 443) for real-time features, and UDP ports 10000-60000 for WebRTC media. If UDP is blocked, R-Link falls back to TURN relay over TCP 443, but quality may be reduced. Contact your IT department to whitelist R-Link domains.

**Q11: Why does the sidebar disappear on my laptop?**
A: R-Link's responsive design collapses the sidebar to a hamburger menu when the screen width is less than 768px. Click the hamburger menu icon (three horizontal lines) at the top of the page to access navigation.

**Q12: How do I clear all R-Link data from my browser?**
A: Open DevTools (F12) > Application > Local Storage > Right-click the R-Link domain > "Clear." Then go to browser settings > Cookies and Site Data > search for the R-Link domain > Delete. Refresh the page and log in again.

---

## Known Limitations

1. **No real-time error reporting dashboard:** R-Link does not provide an admin-facing real-time error dashboard. Errors must be diagnosed via browser DevTools or user reports.

2. **Token expiration is platform-controlled:** The JWT token lifetime is set by the Base44 platform and cannot be customized per R-Link account. If tokens expire too quickly, the Base44 platform configuration must be adjusted.

3. **No automatic reconnection for WebRTC:** If a WebRTC connection drops mid-session, automatic reconnection is attempted but may fail. Users must manually refresh or rejoin in some cases.

4. **TURN relay adds latency:** When UDP is blocked and the TURN relay is used (TCP 443 fallback), video/audio quality and latency are degraded compared to direct UDP connections.

5. **Safari SFU limitations:** Safari has limited support for the Selective Forwarding Unit architecture used by R-Link. Large meetings (10+ participants) may experience layout or performance issues on Safari.

6. **No offline diagnostics:** All diagnostic procedures require an active internet connection. There is no offline diagnostic mode or tool.

7. **localStorage is browser-specific:** Preferences, tokens, and device selections stored in localStorage are specific to the browser profile. Users who switch browsers or use multiple browsers must re-configure in each.

8. **Incognito mode limitations:** In incognito/private browsing mode, localStorage may be cleared when the window closes, requiring re-authentication every time.

9. **Recording processing is asynchronous:** There is no way to speed up recording processing. The user must wait for the server-side pipeline to complete.

10. **RTMP streaming to custom endpoints is not validated:** R-Link does not validate custom RTMP URLs before attempting to connect. Invalid URLs result in connection timeouts rather than immediate error messages.

11. **Integration webhook delivery is best-effort:** Webhooks are delivered with a retry policy, but there is no guarantee of delivery. Endpoints must be publicly accessible and respond with 200 OK.

12. **No multi-language error messages:** Error messages from the Base44 SDK are returned in English only. The UI may display localized messages, but console/API errors are always in English.

13. **Device detection requires page refresh:** If a user plugs in a new camera or microphone after the Setup page has loaded, the device will not appear in the dropdown until the page is refreshed.

14. **No built-in speed test:** R-Link does not include a built-in network speed test. Users must use external tools (speedtest.net, fast.com) to diagnose bandwidth issues.

15. **Session type is immutable:** Once a session is started as a Meeting, Webinar, or Live Stream, the type cannot be changed without ending and restarting the session.

---

## Plan Requirements

| Feature | Plan |
|---------|------|
| Basic authentication and login | All plans |
| Admin portal access | Basic+ |
| Token management | All plans (Base44 platform) |
| WebRTC sessions | Basic+ |
| RTMP streaming diagnostics | Business |
| Integration management | Business (except SSO and Calendar on Basic+) |
| Recording (local) | Basic+ |
| Recording (cloud) | Basic+ |
| AI transcript access | Business |

---

## Related Documents

- [00-index.md](00-index.md) -- Master index and question routing
- [01-platform-overview.md](01-platform-overview.md) -- Platform architecture and feature reference
- [02-plans-and-pricing.md](02-plans-and-pricing.md) -- Plans, pricing, and billing
- [03-getting-started.md](03-getting-started.md) -- Registration, onboarding, and first session
