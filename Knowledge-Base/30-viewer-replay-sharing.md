# Viewer, Replay, and Sharing Pages

## Overview

R-Link provides four public-facing pages that allow attendees, viewers, and external audiences to interact with session content. These pages operate independently of the Admin portal and Studio -- they are designed for consumption by non-host users.

| Page | Route | Purpose |
|---|---|---|
| **Viewer** | `/viewer` | Live session viewer for attendees (webinars, live streams) |
| **Replay** | `/replay` | Post-session recording playback |
| **SharedClip** | `/shared-clip` | Public page for viewing shared video clips |
| **SharedPresentation** | `/shared-presentation` | Public page for viewing shared presentations |
| **Register** | `/register` | Registration page for webinar events |

Each page serves a distinct role in the content lifecycle: live viewing, post-session replay, and content sharing/distribution.

---

## Viewer Page (Live Attendee View)

### URL Structure

```
/viewer?room={room_id}
```

### Purpose

The Viewer page is the audience-facing interface for live sessions. Attendees join a webinar or live stream as viewers (non-hosts) and can watch the video feed, participate in chat, respond to polls, and interact with CTA overlays.

### How It Works

1. Attendee navigates to the Viewer URL with a `room` query parameter.
2. Before joining, the attendee enters their **viewer name** in a pre-join screen.
3. After clicking "Join", the Viewer enters the live session view.
4. The page fetches room data, active polls, and active CTAs from Base44.

### Features Available to Viewers

| Feature | Description | Component |
|---|---|---|
| **Live Video Feed** | The main video area displaying the host's production | Built-in video player |
| **Chat** | Real-time text chat sidebar | `SimpleChatPanel` |
| **Reactions** | Send emoji reactions (Heart, ThumbsUp, Sparkles) | Reaction buttons |
| **Polls** | Respond to active polls pushed by the host | `PollStageRenderer` |
| **Q&A** | View and participate in Q&A sessions | `QADisplayOverlay` |
| **CTA Overlays** | View call-to-action banners and links from the host | `CTAOverlay` |
| **Fullscreen** | Toggle fullscreen mode | Maximize button |
| **Volume Control** | Mute/unmute and adjust volume | Volume button |

### Viewer Controls

| Control | Icon | Description |
|---|---|---|
| **Chat Toggle** | MessageCircle | Show/hide the chat sidebar |
| **Mute/Unmute** | Volume2 / VolumeX | Toggle audio |
| **Fullscreen** | Maximize | Enter/exit fullscreen mode |
| **Settings** | Settings gear | Open viewer settings |
| **Share** | Share2 | Share the session link |

### Viewer Count

The page tracks a `viewCount` state that can display the current number of viewers in the session.

### Pre-Join Screen

Before entering the session, the viewer sees:
- A name input field
- Room information (fetched from the room entity)
- A Join button

### Key Technical Details

- Room ID is extracted from the `?room=` URL parameter on page load.
- Active polls are fetched by filtering `Poll` entities where `folder_id` matches the room and `status === 'active'`.
- Active CTAs are fetched by filtering `Banner` entities where `folder_id` matches the room and `is_active === true`.
- Reactions use a toast notification for confirmation (in the current implementation).

---

## Replay Page (Post-Session)

### URL Structure

```
/replay?id={recording_id}
```

### Purpose

The Replay page allows users to watch recorded sessions after they have ended. It provides a full-featured video player with chapters, transcript, comments, and playback controls.

### How It Works

1. The page reads the `id` query parameter to identify the recording.
2. It fetches the `Recording` entity from Base44.
3. It also fetches the associated `MeetingTranscript` entity.
4. The recording is displayed in a custom video player with rich controls.

### Video Player Controls

| Control | Description |
|---|---|
| **Play/Pause** | Toggle playback (Play / Pause icons) |
| **Skip Back** | Jump backward in the recording (SkipBack icon) |
| **Skip Forward** | Jump forward in the recording (SkipForward icon) |
| **Rewind** | Rewind the recording (Rewind icon) |
| **Fast Forward** | Fast forward the recording (FastForward icon) |
| **Volume Slider** | Adjust volume level (0-100) |
| **Mute/Unmute** | Toggle audio (Volume2 / VolumeX icons) |
| **Playback Speed** | Adjust playback rate (1x default) |
| **Fullscreen** | Enter fullscreen mode (Maximize icon) |
| **Settings** | Open settings panel (Settings icon) |
| **Download** | Download the recording file (Download icon) |
| **Share** | Share the replay link (Share2 icon) |

### Chapters

Recordings are divided into chapters with:
- **Time offset**: When the chapter starts (in seconds)
- **Title**: Chapter name (e.g., "Introduction", "Main Presentation", "Q&A Session", "Closing Remarks")
- **Duration**: Length of the chapter in seconds

Clicking a chapter jumps the playback to that chapter's start time.

### Transcript

If a `MeetingTranscript` entity exists for the recording:
- A **Transcript toggle** button shows/hides the transcript panel.
- The transcript is fetched by matching `session_id` to the recording ID.
- Transcript text is synchronized with playback time.

### Comments

The Replay page displays timestamped comments from viewers:
- Each comment shows: timestamp, username, comment text, and like count
- Comments are linked to specific times in the recording
- Clicking a comment timestamp jumps to that point in the recording

### Time Display

The player displays current time and total duration in the format:
- Under 1 hour: `m:ss` (e.g., "12:45")
- Over 1 hour: `h:mm:ss` (e.g., "1:23:45")

---

## SharedClip Page (Public Clip Sharing)

### URL Structure

```
/shared-clip/{share_token}
```

The `share_token` is extracted from the last segment of the URL path.

### Purpose

The SharedClip page enables public sharing of video clips extracted from recordings. Clips are shorter segments of recordings that can be shared with external audiences via unique URLs.

### How It Works

1. The page extracts the `share_token` from the URL path.
2. It fetches the `SharedClip` entity by matching `share_token` and `is_active: true`.
3. Access control is applied (password or email gate if configured).
4. Once access is granted, the actual `RepurposedClip` entity is fetched via `clip_id`.
5. View count is incremented via the `SharedClip.update()` mutation.
6. Analytics are recorded via the `ClipAnalytics.create()` mutation.

### Access Control

SharedClip pages support two access control mechanisms:

#### Password Protection

- If the shared clip has a password, the viewer sees a password input form.
- The viewer must enter the correct password to unlock the clip.
- Failed password attempts show an error icon.

#### Email Gate

- If the shared clip requires email, the viewer sees an email input form.
- The viewer must provide their email address before accessing the clip.
- The email is recorded against the shared clip's metadata.

### Video Player Controls

| Control | Description |
|---|---|
| **Play/Pause** | Toggle clip playback |
| **Volume Slider** | Adjust volume (0-100) |
| **Mute/Unmute** | Toggle audio |
| **Fullscreen** | Enter fullscreen mode |
| **Download** | Download the clip file |
| **Progress Bar** | Scrub through the clip timeline |

### Analytics Tracking

The SharedClip page tracks engagement data:

| Metric | Description |
|---|---|
| `view_count` | Total views of the shared clip (incremented per visit) |
| `sessionId` | Unique session identifier per viewer visit |
| `engagementEvents` | Array of interaction events during viewing |
| `watchStartTime` | Timestamp when viewing began |

### Entity Relationships

```
SharedClip (share config) -> RepurposedClip (actual clip media)
                          -> ClipAnalytics (view/engagement data)
```

---

## SharedPresentation Page (Public Presentation Sharing)

### URL Structure

```
/shared-presentation/{share_code}
```

The `share_code` is extracted from the last segment of the URL path.

### Purpose

The SharedPresentation page enables public sharing of presentation slides used during sessions. Presentations are displayed using the `TestPresentationViewer` component.

### How It Works

1. The page extracts the `share_code` from the URL path.
2. It fetches the `SharedPresentation` entity by filtering for `share_code` and `is_active: true`.
3. Access control is applied (password protection if configured).
4. Once unlocked, the presentation is displayed.
5. View count is incremented.

### Access Control

#### Password Protection

- If `has_password` is `true`, the viewer sees a password input form with a Lock icon.
- The viewer must enter the correct password (validated against `shareData.password`).
- Failed attempts display a password error message.

#### Expiration

- If `never_expires` is `false` and `expires_at` is set, the page checks whether the expiration date has passed.
- Expired links show: "This link has expired"

#### Deactivation

- If the share is not found or `is_active` is `false`, the page shows: "This link is invalid or has been revoked"

### View Counting

When a presentation is accessed (either without password or after correct password entry):
- The `view_count` field is incremented by 1 via `SharedPresentation.update()`.

### Presentation Display

- Uses the `TestPresentationViewer` component to render slides.
- The viewer includes an eye icon indicating the share is being viewed.

### Error States

| Error | Message | Cause |
|---|---|---|
| Invalid share link | "Invalid share link" | No share code in URL |
| Not found | "This link is invalid or has been revoked" | Share not found or `is_active: false` |
| Expired | "This link has expired" | Current time is past `expires_at` |
| Load failure | "Failed to load presentation" | API error during fetch |

---

## Register Page (Event Registration)

### URL Structure

```
/register?webinar_id={scheduled_meeting_id}
```

### Purpose

The Register page provides a dedicated registration interface for webinar events, distinct from the Event Landing page registration.

### How It Works

1. The page reads `webinar_id` from the URL query parameter.
2. It fetches the `ScheduledMeeting` entity to get webinar details.
3. If no `webinar_id` is provided, it finds the first available webinar or the first scheduled meeting.
4. It loads the associated Brand Kit (via `registration_page_branding.brand_kit_id`).
5. It counts existing registrations via the `WebinarRegistration` entity.

### Registration Form

| Field | Required | Description |
|---|---|---|
| **Name** | Yes | Attendee's full name |
| **Email** | Yes | Attendee's email address |
| **Custom Fields** | Varies | Additional fields defined in webinar configuration |

### Registration Process

1. Attendee fills in the form and submits.
2. The system checks if `require_approval` is enabled in `webinar_settings`.
3. A `WebinarRegistration` entity is created:
   - `webinar_id`: The webinar's ID
   - `folder_id`: Same as `webinar_id`
   - `name`: From form
   - `email`: From form
   - `custom_fields`: From form
   - `approval_status`: `"pending"` (if approval required) or `"approved"` (if not)
   - `status`: `"registered"`
   - `emails_sent`: `{ confirmation_sent: true, confirmation_sent_at: "{current_ISO_timestamp}" }`
4. If approval is required, the user sees a "Pending Approval" message.
5. Otherwise, the user sees a confirmation.

### Page Display Elements

- Event date and time (Calendar icon)
- Event time (Clock icon)
- Confirmation checkmark (CheckCircle icon)
- Attendee count (Users icon)
- Brand Kit styling applied if configured

---

## URL Structure Summary

| Page | URL Pattern | Key Parameter | Parameter Type |
|---|---|---|---|
| Viewer | `/viewer?room={id}` | `room` | Query parameter |
| Replay | `/replay?id={id}` | `id` | Query parameter |
| SharedClip | `/shared-clip/{token}` | share token | URL path segment |
| SharedPresentation | `/shared-presentation/{code}` | share code | URL path segment |
| Register | `/register?webinar_id={id}` | `webinar_id` | Query parameter |
| EventLanding | `/event-landing?id={id}` | `id` | Query parameter |

---

## Settings and Options

| Setting | Page | Description |
|---|---|---|
| Room ID | Viewer | Identifies which live session to join |
| Recording ID | Replay | Identifies which recording to play |
| Share Token | SharedClip | Unique token for accessing shared clips |
| Share Code | SharedPresentation | Unique code for accessing shared presentations |
| Webinar ID | Register | Identifies which webinar to register for |
| Password | SharedClip, SharedPresentation | Optional access control |
| Email Gate | SharedClip | Optional email collection before access |
| Expiration | SharedPresentation | Optional time limit on share access |
| Playback Speed | Replay | Adjustable playback rate |
| Volume | Viewer, Replay, SharedClip | Audio volume control (0-100) |
| Fullscreen | Viewer, Replay, SharedClip | Toggle fullscreen mode |
| Chat Toggle | Viewer | Show/hide chat sidebar |

---

## Troubleshooting

| Issue | Page | Cause | Solution |
|---|---|---|---|
| Blank Viewer page | Viewer | Missing `?room=` parameter | Ensure the URL includes `?room={room_id}` |
| Cannot join session | Viewer | Session not active or room not found | Verify the session is live and the room ID is correct |
| "Event Not Found" | Replay | Invalid recording ID | Check that the `?id=` parameter points to a valid recording |
| Replay video not loading | Replay | Recording file not processed yet | Wait for recording processing to complete; check Recordings tab |
| "This link is invalid or has been revoked" | SharedClip, SharedPresentation | Share is deactivated or token/code is wrong | Verify the link; the share may have been revoked by the content owner |
| "This link has expired" | SharedPresentation | Share has passed its expiration date | Contact the content owner to extend or create a new share |
| Password rejected | SharedClip, SharedPresentation | Wrong password entered | Re-enter the correct password; contact the share owner if forgotten |
| Chat not showing | Viewer | Chat sidebar is toggled off | Click the Chat (MessageCircle) icon to show the sidebar |
| Download not working | Replay, SharedClip | Browser blocking download or file not available | Check browser download settings; ensure the file exists |
| Transcript not available | Replay | No MeetingTranscript entity for this recording | AI notetaker must have been active during the session (Business plan) |
| Registration form not submitting | Register | Missing required fields (name or email) | Fill in all required fields |
| "Pending Approval" after registration | Register | Webinar requires approval | The host must approve the registration via the admin interface |

---

## FAQ

**Q: Can anyone access the Viewer page?**
A: The Viewer page requires a valid room ID. The pre-join screen requires a viewer name. No authentication is required to view a public session.

**Q: How do I get the Replay URL for a recording?**
A: The Replay URL format is `/replay?id={recording_id}`. Recording IDs can be found in the Recordings admin tab.

**Q: Can I password-protect a shared clip?**
A: Yes. When creating a shared clip, you can set a password. Viewers must enter this password before accessing the clip content.

**Q: How long do shared presentation links last?**
A: Shared presentation links can be set to expire at a specific date/time, or configured to never expire. Once expired, viewers see "This link has expired."

**Q: Can I track who views my shared clips?**
A: Yes. The SharedClip system tracks view counts, and if email gating is enabled, it collects viewer email addresses. The `ClipAnalytics` entity records detailed engagement data.

**Q: What happens if I deactivate a shared link?**
A: Anyone visiting the link will see "This link is invalid or has been revoked." The content is no longer accessible via that URL.

**Q: Can viewers download recordings from the Replay page?**
A: The Replay page includes a Download button. Whether the download is available depends on the recording's configuration and access permissions.

**Q: Is the Register page different from the Event Landing page registration?**
A: Yes. The Register page (`/register`) is specifically for webinar registration with custom fields and approval workflows. The Event Landing page (`/event-landing`) has its own simpler registration flow. Both create lead data.

---

## Known Limitations

1. **Viewer page is not the Studio**: The Viewer page is for audience consumption only. Viewers cannot control the session, share their camera/mic, or access production tools.
2. **No live chat persistence**: Chat messages during a live session may not persist after the session ends unless separately recorded.
3. **Replay chapters are demo data**: The chapter system in the current Replay implementation uses hardcoded demo data. Dynamic chapter generation depends on recording processing.
4. **SharedClip password is plaintext**: The password comparison for shared clips is done client-side in the current implementation.
5. **SharedPresentation password is plaintext**: Same as SharedClip -- password validation is client-side.
6. **No social sharing widgets**: Sharing is limited to URL copying. There are no built-in social media share buttons.
7. **Single recording per Replay URL**: Each Replay URL shows one recording. There is no playlist or multi-recording viewer.
8. **View count tracking is basic**: View counts increment on page load. There is no unique viewer deduplication beyond the SharedClip analytics system.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Viewer Page (Meetings) | Yes | Yes |
| Viewer Page (Webinars) | No | Yes |
| Viewer Page (Live Streams) | No | Yes |
| Replay Page | Yes | Yes |
| SharedClip Page | Yes | Yes |
| SharedPresentation Page | Yes | Yes |
| Register Page (Webinars) | No | Yes |
| Transcript in Replay | No | Yes |
| Clip Analytics Tracking | Yes | Yes |

---

## Related Documents

- [01-platform-overview.md](./01-platform-overview.md) -- Page navigation map and URL structure
- [12-recordings.md](./12-recordings.md) -- Recording management and storage
- [13-clips.md](./13-clips.md) -- Clip creation and management
- [14-presentations.md](./14-presentations.md) -- Presentation management
- [29-event-landing-pages.md](./29-event-landing-pages.md) -- Event landing pages and registration
- [28-leads-and-analytics.md](./28-leads-and-analytics.md) -- Lead capture from registrations and sessions
- [32-admin-dashboard-reference.md](./32-admin-dashboard-reference.md) -- Complete admin tab reference
