# Viewer, Replay, and Sharing

## Overview

R-Link provides three primary content consumption experiences: the **Viewer page** for live participation, the **Replay page** for recorded content playback, and **Sharing pages** for distributing clips and presentations. Each page has distinct features, entities, and access flows. This document covers all viewer-facing pages, their entities, features, access controls, and analytics.

---

## Viewer Page

The Viewer page is the live participation interface for R-Link rooms. It is accessed via the URL parameter `?room={id}`.

### URL Structure

```
https://app.r-link.com/viewer?room={roomId}
```

### Pre-Join Experience

Before entering the room, users go through a pre-join flow:

| Step | Description |
|------|-------------|
| 1 | User navigates to the Viewer URL with `?room={roomId}` |
| 2 | Pre-join screen displays, requesting the user's name |
| 3 | User enters their display name |
| 4 | System validates the `roomId` and checks room status (live, scheduled, ended) |
| 5 | User clicks "Join" to enter the room |

**Pre-Join Data:**
- `roomId` -- Extracted from the URL parameter; identifies which room to join.
- `name` -- Entered by the user; used as their display name in chat and participant lists.

**Pre-Join Edge Cases:**
- If the `roomId` is invalid, an error message is displayed.
- If the room has not started yet, a "waiting room" or scheduled time message may be shown.
- If the room has ended, the user may be redirected to the replay (if available).

### Reactions

The Viewer page supports real-time emoji reactions that overlay on the video stream.

| Reaction | Emoji | Description |
|----------|-------|-------------|
| Heart | heart | General appreciation or love |
| Thumbs Up | thumbsUp | Agreement or approval |
| Sparkles | sparkles | Excitement or celebration |

**Reaction Behavior:**
- Reactions are triggered by clicking reaction buttons in the viewer interface.
- Reactions appear as animated overlays on the video stream for all participants.
- Reactions are ephemeral; they animate in and fade out. They are not permanently stored.
- Multiple reactions can fire simultaneously from multiple users.
- Reactions provide hosts with real-time audience feedback.

### Poll Overlays

Polls are displayed as overlays on the Viewer page using the `Poll` entity.

#### Poll Entity (Relevant Fields)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `folder_id` | string | Organizational folder reference |
| `status` | string | `'active'` when the poll is currently displayed |
| `question` | string | The poll question text |
| `options` | array | List of answer options |
| `results` | object | Aggregated response data |

**Poll Overlay Behavior:**
- A poll appears as an overlay on the Viewer page when its `status` is set to `'active'`.
- The host activates/deactivates polls from the admin controls.
- Only one poll can be active at a time per room (per `folder_id` scope).
- When active, all viewers see the poll overlay and can submit their response.
- Results can be shown in real time or after the poll closes, depending on configuration.
- Poll responses contribute to engagement scoring in the Leads system.

### Banner Overlays

Banners are displayed as overlays on the Viewer page using the `Banner` entity.

#### Banner Entity (Relevant Fields)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `folder_id` | string | Organizational folder reference |
| `is_active` | boolean | `true` when the banner is currently displayed |
| `content` | string | Banner text content |
| `style` | object | Visual styling (color, position, animation) |
| `link_url` | string | Optional clickable link |

**Banner Overlay Behavior:**
- A banner appears as an overlay when `is_active` is set to `true`.
- The host activates/deactivates banners from the admin controls.
- Multiple banners can be active simultaneously if configured.
- Banners can contain text, links, or calls to action.
- Banners are commonly used for announcements, CTAs, sponsor mentions, or timed offers.

### SimpleChatPanel

The Viewer page includes a chat panel (SimpleChatPanel) for audience interaction.

**Features:**
- Real-time text chat visible to all participants.
- Messages display the sender's name (from pre-join) and timestamp.
- Chat messages are stored for the duration of the session.
- Chat can be moderated by the host (message deletion, user muting).
- Chat history is available in the Replay page for recorded sessions.

### Fullscreen Mode

- The Viewer page supports fullscreen mode.
- Toggled via a fullscreen button in the viewer controls.
- In fullscreen, the video fills the entire screen; overlays (polls, banners, chat) remain accessible.
- Exiting fullscreen returns to the standard layout.

### Share URL

- The Viewer page provides a "Share" button that copies the room URL to the clipboard.
- The share URL format is the same as the Viewer URL: `?room={roomId}`.
- Sharing the URL allows others to join the same room (subject to room access controls).

### Common Customer Questions About Viewer

**Q: A viewer says they cannot join the room. What should I check?**
A: Verify that:
1. The `roomId` in their URL is correct.
2. The room is currently live or scheduled.
3. The room has not reached its participant capacity.
4. The viewer's browser is supported.

**Q: Reactions are not appearing for some viewers.**
A: Reactions require a stable connection. If a viewer has a slow or intermittent connection, reactions may not render. Ask them to refresh the page.

**Q: Can I disable chat during a live session?**
A: Yes. The host can disable chat from the room admin controls. When disabled, the SimpleChatPanel is hidden for all viewers.

---

## Replay Page

The Replay page provides playback of recorded sessions. It is accessed via the URL parameter `?id={recordingId}`.

### URL Structure

```
https://app.r-link.com/replay?id={recordingId}
```

### Recording Entity

The `Recording` entity stores the recorded session data.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (used as `recordingId` in the URL) |
| `room_id` | string | Reference to the original room |
| `account_id` | string | Owning account |
| `name` | string | Recording title (defaults to room name) |
| `duration` | number | Recording length in seconds |
| `file_url` | string | URL to the recorded media file |
| `status` | string | Processing status (e.g., `'processing'`, `'ready'`, `'failed'`) |
| `chapters` | array | List of chapter markers with timestamps and titles |
| `created_date` | datetime | When the recording was created |

### MeetingTranscript Entity

The `MeetingTranscript` entity stores the transcript of a recorded session.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `session_id` | string | Reference to the recording session |
| `content` | array | Transcript segments with speaker, text, and timestamps |
| `language` | string | Language of the transcript |
| `status` | string | Transcription status (e.g., `'processing'`, `'ready'`) |

### Playback Speeds

The Replay page supports multiple playback speeds for flexible viewing.

| Speed | Label | Use Case |
|-------|-------|----------|
| `0.5x` | Half speed | Detailed review, note-taking |
| `1x` | Normal speed | Standard viewing |
| `1.5x` | 1.5x speed | Efficient review |
| `2x` | Double speed | Quick scan or recap |

**Behavior:**
- Default speed is `1x`.
- Speed can be changed at any point during playback.
- Audio pitch is preserved at all speeds (pitch correction is applied).
- Playback speed affects transcript highlighting synchronization.

### Chapters

Chapters provide navigation markers within a recording.

**Features:**
- Chapters are listed in a sidebar or dropdown with title and timestamp.
- Clicking a chapter jumps to that point in the recording.
- Chapters can be auto-generated from the transcript or manually created by the host.
- Each chapter has a title and a start timestamp.

**Behavior:**
- The current chapter is highlighted during playback.
- Chapters appear in the recording's progress bar as visual markers.
- Chapters are included when sharing or embedding the recording.

### Timestamped Comments

Viewers can leave comments that are tied to specific timestamps in the recording.

**Features:**
- Comments are displayed at the specific playback position where they were left.
- Other viewers can see comments as they reach the same timestamp.
- Comments support text and mentions.
- Comment threads allow replies.
- Comments are visible in the sidebar alongside the playback.

**Behavior:**
- Clicking a comment jumps to the associated timestamp.
- Comments can be sorted by time (chronological) or by most recent.
- The recording owner can moderate (delete) comments.

### Transcript Tabs

The Replay page includes transcript functionality accessible via tabs.

**Tab Options:**
- **Full Transcript**: Complete text transcript with speaker labels and timestamps. Clicking a line jumps to that point in the recording.
- **Search**: Full-text search across the transcript. Results show matching segments with context. Clicking a result jumps to the timestamp.

**Transcript Behavior:**
- Transcripts auto-scroll to follow the current playback position.
- The current segment is highlighted as the recording plays.
- Transcripts are generated from the `MeetingTranscript` entity (linked via `session_id`).
- If the transcript is still processing (`status = 'processing'`), a loading indicator is shown.

### Share and Download

- **Share**: Generates a shareable link to the replay. The link opens the Replay page for the same `recordingId`.
- **Download**: Downloads the recording file to the user's device. Download availability depends on the account plan and recording settings.

### Common Customer Questions About Replay

**Q: The replay says "Processing." How long does this take?**
A: Processing typically takes a few minutes after the event ends. Longer recordings may take more time. If processing has not completed after 30 minutes, contact support.

**Q: The transcript is inaccurate. Can I edit it?**
A: Transcript editing is available depending on your plan. Check the recording settings in the Recordings tab.

**Q: Can I share just a portion of a recording?**
A: Yes. Use the Clips feature to create a clip from a specific portion of the recording, then share the clip via the SharedClip feature.

**Q: The playback speed buttons are not appearing.**
A: Playback speed controls are available once the recording has fully loaded. If the recording is still buffering, the controls may not appear yet. Refresh the page and wait for full load.

---

## SharedClip

SharedClip enables sharing of repurposed clips from recordings with granular access controls and analytics.

### URL Structure

```
https://app.r-link.com/shared-clip/{shareToken}
```

### SharedClip Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `share_token` | string | URL-safe token used in the public URL |
| `clip_id` | string | Reference to the RepurposedClip entity |
| `is_active` | boolean | Whether the shared link is currently accessible |
| `permission_type` | string | `'public'`, `'password_protected'`, or `'private'` |
| `require_email` | boolean | Whether the viewer must provide an email to access |
| `password` | string | Password required for `password_protected` access |
| `max_views` | number | Maximum number of views allowed (null = unlimited) |
| `view_count` | number | Current number of views |
| `expires_at` | datetime | Expiration date/time for the shared link (null = never) |
| `metadata` | object | Additional metadata including `viewer_emails` |
| `metadata.viewer_emails` | array | List of email addresses that have accessed the clip |
| `created_date` | datetime | When the share link was created |

### RepurposedClip Entity

The `RepurposedClip` entity represents a clip extracted from a recording.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (referenced by `SharedClip.clip_id`) |
| `recording_id` | string | Source recording |
| `start_time` | number | Clip start time in seconds |
| `end_time` | number | Clip end time in seconds |
| `title` | string | Clip title |
| `description` | string | Clip description |
| `file_url` | string | URL to the clip media file |
| `status` | string | Processing status |

### ClipAnalytics Entity

The `ClipAnalytics` entity tracks detailed engagement data for shared clips.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `clip_id` | string | Reference to the clip |
| `shared_clip_id` | string | Reference to the SharedClip |
| `viewer_email` | string | Email of the viewer (if captured) |
| `events` | array | List of engagement events |

### Engagement Event Types

| Event Type | Description |
|------------|-------------|
| `play` | Viewer started playback |
| `pause` | Viewer paused playback |
| `seek` | Viewer jumped to a different position |
| `volume` | Viewer changed the volume |
| `complete` | Viewer watched to the end |

**Analytics Behavior:**
- Every viewer interaction (play, pause, seek, volume change) is tracked as an engagement event.
- Events include timestamps and positions for detailed engagement analysis.
- Analytics data is accessible from the Clips tab in the Admin Dashboard.
- Aggregated analytics (total views, average watch time, completion rate) are calculated from individual events.

### Access Flow

```
1. Viewer navigates to /shared-clip/{shareToken}.
2. System looks up the SharedClip entity by share_token.
3. Access checks:
   a. Is is_active == true? If not, show "Link is no longer available."
   b. Has expires_at passed? If so, show "This link has expired."
   c. Has view_count >= max_views? If so, show "View limit reached."
4. Permission checks based on permission_type:
   a. 'public': No additional checks. Proceed to playback.
   b. 'password_protected': Prompt for password. Validate against SharedClip.password.
   c. 'private': Only accessible to explicitly listed viewer_emails.
5. If require_email == true:
   a. Prompt viewer for their email address.
   b. Store the email in metadata.viewer_emails.
   c. Use the email for ClipAnalytics tracking.
6. Increment view_count by 1.
7. Load and play the RepurposedClip.
8. Track engagement events in ClipAnalytics.
```

### Common Customer Questions About SharedClip

**Q: I shared a clip but the viewer says the link does not work.**
A: Check the following:
1. `is_active` -- The shared link must be active.
2. `expires_at` -- The link may have expired.
3. `max_views` -- The view limit may have been reached.
4. `permission_type` -- If `password_protected`, the viewer needs the correct password. If `private`, the viewer's email must be in the allowed list.

**Q: Can I see who viewed my shared clip?**
A: If `require_email` is enabled, viewer emails are stored in `metadata.viewer_emails`. Detailed engagement data (watch time, play/pause events) is available in ClipAnalytics.

**Q: How do I revoke access to a shared clip?**
A: Set `is_active` to `false` on the SharedClip. The link will immediately become inaccessible.

**Q: Can I change the password on a shared clip?**
A: Yes. Update the `password` field on the SharedClip entity. Viewers who already accessed the clip will not be affected, but new viewers will need the updated password.

**Q: What happens when the view limit is reached?**
A: When `view_count >= max_views`, any new viewer will see a "View limit reached" message. Existing viewers who have already accessed the clip may still be able to re-watch it depending on caching. To restore access, increase `max_views`.

---

## SharedPresentation

SharedPresentation enables sharing of presentation materials with access controls.

### URL Structure

```
https://app.r-link.com/shared-presentation/{shareCode}
```

### SharedPresentation Entity

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `share_code` | string | URL-safe code used in the public URL |
| `is_active` | boolean | Whether the shared link is currently accessible |
| `has_password` | boolean | Whether a password is required for access |
| `password` | string | Password required if `has_password` is true |
| `never_expires` | boolean | If true, the link never expires |
| `expires_at` | datetime | Expiration date/time (only used if `never_expires` is false) |
| `view_count` | number | Number of times the presentation has been viewed |
| `presentation_data` | object | The presentation content and slides |
| `account_id` | string | Owning account |
| `created_date` | datetime | When the share link was created |

### Access Flow

```
1. Viewer navigates to /shared-presentation/{shareCode}.
2. System looks up the SharedPresentation entity by share_code.
3. Access checks:
   a. Is is_active == true? If not, show "Link is no longer available."
   b. If never_expires == false:
      - Has expires_at passed? If so, show "This link has expired."
4. If has_password == true:
   a. Prompt viewer for password.
   b. Validate against SharedPresentation.password.
   c. If incorrect, show error and re-prompt.
5. Increment view_count by 1.
6. Load and display the presentation.
```

### SharedPresentation vs SharedClip

| Feature | SharedClip | SharedPresentation |
|---------|-----------|-------------------|
| Content type | Video clip | Presentation slides |
| Access token | `share_token` | `share_code` |
| Password protection | Via `permission_type` | Via `has_password` |
| Email capture | `require_email` field | Not available |
| View limit | `max_views` field | Not available |
| Expiration | `expires_at` | `never_expires` + `expires_at` |
| Analytics | Full engagement tracking (ClipAnalytics) | View count only |
| Privacy levels | public / password_protected / private | open / password_protected |

### Common Customer Questions About SharedPresentation

**Q: I shared a presentation but the viewer says the link is not working.**
A: Check the following:
1. `is_active` must be `true`.
2. If `never_expires` is `false`, check that `expires_at` has not passed.
3. If `has_password` is `true`, ensure the viewer has the correct password.

**Q: How do I see how many people viewed my presentation?**
A: The `view_count` field on the SharedPresentation entity tracks total views. Unlike SharedClip, individual viewer tracking is not available for presentations.

**Q: Can I update a presentation after sharing it?**
A: Yes. Updating the `presentation_data` on the SharedPresentation entity updates the content for all viewers. The share link remains the same.

**Q: How do I make a shared presentation permanent (never expire)?**
A: Set `never_expires` to `true`. The `expires_at` field will be ignored.

---

## Register Page (Viewer Context)

The Register page at `/register?webinar_id={id}` serves as the entry point for event registration. While detailed in the Event Landing Pages document, key aspects relevant to the viewer experience are covered here.

### URL Structure

```
https://app.r-link.com/register?webinar_id={id}
```

### ScheduledMeeting Entity (Registration Context)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | The `webinar_id` in the URL |
| `name` | string | Event name displayed on the registration page |
| `date_time_start` | datetime | Event start time |
| `custom_fields` | array | Custom form fields (text, email, phone, textarea, select) |
| `require_approval` | boolean | Whether registrations require admin approval |
| `registration_page_branding` | object | Contains `brand_kit_id` for page styling |

### WebinarRegistration Entity (Viewer Context)

| Field | Type | Description |
|-------|------|-------------|
| `webinar_id` | string | Reference to the ScheduledMeeting |
| `folder_id` | string | Organizational reference |
| `name` | string | Registrant's name |
| `email` | string | Registrant's email |
| `custom_fields` | object | Responses to custom form fields |
| `approval_status` | string | `'pending'` or `'approved'` |
| `status` | string | `'registered'` |
| `emails_sent` | array | Email delivery history |

### Registration Flow (Viewer Perspective)

```
1. Viewer navigates to /register?webinar_id={id}.
2. Registration form displays with:
   - Event name and details from ScheduledMeeting
   - Name and email fields (required)
   - Custom fields as configured
   - Branding from registration_page_branding.brand_kit_id
3. Viewer fills out the form and submits.
4. WebinarRegistration entity is created.
5. If require_approval == false:
   - Status immediately set to 'approved'.
   - Confirmation email sent with join link.
6. If require_approval == true:
   - Status set to 'pending'.
   - Viewer sees "Registration pending approval" message.
   - Admin must approve before confirmation email is sent.
7. Viewer receives join link (immediately or after approval).
```

### Custom Fields for Registration

| Type | Code | Input Element |
|------|------|---------------|
| Text | `'text'` | Single-line text input |
| Email | `'email'` | Email input with validation |
| Phone | `'phone'` | Phone number input |
| Text Area | `'textarea'` | Multi-line text input |
| Select | `'select'` | Dropdown with predefined options |

### Common Customer Questions About Registration (Viewer Context)

**Q: I registered but did not receive a confirmation email.**
A: If the event requires approval (`require_approval = true`), you will receive a confirmation email only after the admin approves your registration. Check your approval status or contact the event organizer.

**Q: Can I update my registration information after submitting?**
A: Contact the event organizer to update your registration details. Self-service editing is not currently available on the registration page.

---

## Troubleshooting

### Viewer Page: Room Not Loading

**Possible Causes:**
- Invalid `roomId` in the URL.
- Room has been deleted.
- Network/firewall blocking WebRTC connections.

**Resolution Steps:**
1. Verify the URL contains a valid `room` parameter.
2. Check if the room exists in the Rooms tab.
3. Ask the viewer to try a different browser or network.
4. Check if the organization's firewall blocks WebRTC traffic.

### Replay Page: Transcript Not Available

**Possible Causes:**
- Transcript is still processing.
- Transcription failed.
- The recording does not have an associated MeetingTranscript.

**Resolution Steps:**
1. Check the MeetingTranscript entity's `status` field.
2. If `'processing'`, ask the customer to wait (typical processing time is a few minutes).
3. If `'failed'`, escalate to engineering with the `session_id`.
4. If no MeetingTranscript exists for the recording, transcription may need to be triggered manually.

### SharedClip: Analytics Not Tracking

**Possible Causes:**
- The viewer did not provide an email (and `require_email` is false).
- The viewer's browser blocks analytics scripts.
- ClipAnalytics entity creation failed.

**Resolution Steps:**
1. Enable `require_email` on the SharedClip for email-level tracking.
2. Aggregated analytics (view_count) should still work even without email.
3. If view_count is not incrementing, escalate to engineering.

### SharedPresentation: Password Not Working

**Possible Causes:**
- Incorrect password (case-sensitive).
- The password was changed after the viewer received it.

**Resolution Steps:**
1. Verify the current password on the SharedPresentation entity.
2. Provide the viewer with the correct password.
3. If needed, update the password and communicate the new one.

---

## Internal Reference

### Page URL Summary

| Page | URL Pattern | Key Parameter |
|------|-------------|---------------|
| Viewer | `?room={id}` | `roomId` |
| Replay | `?id={recordingId}` | `recordingId` |
| SharedClip | `/shared-clip/{shareToken}` | `shareToken` |
| SharedPresentation | `/shared-presentation/{shareCode}` | `shareCode` |
| Register | `/register?webinar_id={id}` | `webinar_id` |

### Entity Relationship Map

```
Room
  |-- Viewer Page (live participation)
  |     |-- Poll (overlay, status=active)
  |     |-- Banner (overlay, is_active=true)
  |     |-- SimpleChatPanel
  |     |-- Reactions (heart, thumbsUp, sparkles)
  |
  |-- Recording (post-session)
        |-- Replay Page (playback)
        |     |-- MeetingTranscript (via session_id)
        |     |-- Chapters
        |     |-- Timestamped Comments
        |
        |-- RepurposedClip (extracted segment)
              |-- SharedClip (sharing wrapper)
              |     |-- ClipAnalytics (engagement tracking)
              |
              |-- SharedPresentation (presentation sharing)

ScheduledMeeting
  |-- Register Page
        |-- WebinarRegistration (individual registration)
```

### Related Admin Tabs

- **RoomsTab** (`?tab=rooms`): Room management
- **RecordingsTab** (`?tab=recordings`): Recording management
- **ClipsTab** (`?tab=clips`): Clip management and sharing
- **LeadsTab** (`?tab=leads`): Lead data from viewer interactions
- **EventLandingTab** (`?tab=event-landing`): Event page management
