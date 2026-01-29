# 22 - Scheduling Sessions

## Overview

The Schedule tab in the R-Link admin dashboard allows users to create, manage, and organize three types of live sessions: Meetings, Webinars, and Live Streams. The tab is powered by the `ScheduleTab` component, which receives a `rooms` prop containing all available rooms for the account. Scheduled sessions are stored as `ScheduledMeeting` entities regardless of session type.

---

## Accessing the Schedule Tab

1. Log in to your R-Link account.
2. Navigate to the Admin Dashboard.
3. Click the **Schedule** tab in the left sidebar.
4. The schedule view loads with two display modes: **Calendar** and **List**.

---

## View Modes

### Calendar View

- Click the **Calendar** button in the top-right header area to switch to calendar view.
- The calendar displays all scheduled sessions on their respective dates.
- Click any date to open the scheduling wizard pre-filled with that date.
- Supports **drag-and-drop** to reschedule sessions: drag a session card to a new date/time and the system automatically updates the `scheduled_start` and `scheduled_time` fields.
- Calendar events are color-coded by session type (purple for meetings, orange for webinars, green for live streams).

### List View

- Click the **List** button to switch to a three-column lane layout.
- Sessions are organized into three lanes side by side:
  - **Meetings** lane (purple header) -- displays only future, scheduled meetings.
  - **Webinars** lane (orange header) -- displays only future, scheduled webinars.
  - **Live Streams** lane (green header) -- displays only future, scheduled live streams.
- Each lane shows a count of upcoming sessions and has a "Schedule [Type]" button at the top.
- Sessions within each lane are sorted by `scheduled_start` in ascending order (nearest first).
- Only sessions with `status === 'scheduled'` and a future start date appear in the lanes.

---

## Session Types

### Meeting (`session_type: 'meeting'`)

- Standard video meetings for team collaboration.
- Supports invitees list (name + email).
- Supports registration toggle.
- Supports recording toggle.
- Uses the standard `ScheduleMeetingModal` for creation and editing.

### Webinar (`session_type: 'webinar'`)

- Larger-scale broadcast sessions with presenter/audience separation.
- Uses the dedicated **WebinarScheduler** wizard for creation (a multi-step modal).
- Supports all standard fields plus advanced webinar-specific settings.
- Supports invitees list and registration.
- Supports Q&A and polls toggles in `webinar_settings`.

### Live Stream (`session_type: 'live_stream'`)

- Broadcasts to external streaming platforms (YouTube, Facebook, Twitch, X/Twitter, LinkedIn).
- Title limited to 100 characters; description limited to 1550 characters.
- Does NOT support invitees or registration (these sections are hidden).
- Supports RTMP destination configuration for each platform.
- Includes privacy setting (public, unlisted, private), category selection (YouTube categories), thumbnail upload, reusable studio toggle, live chat toggle, and reactions toggle.

---

## ScheduledMeeting Entity

The `ScheduledMeeting` entity stores all session data. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `session_type` | string | `'meeting'`, `'webinar'`, or `'live_stream'` |
| `title` | string | Session title |
| `description` | string | Session description (optional) |
| `room_id` | string | ID of the assigned room |
| `scheduled_start` | datetime | Start date and time |
| `scheduled_end` | datetime | End date and time |
| `duration_minutes` | number | Duration in minutes (default: 60) |
| `invitees` | array | List of objects: `{ email, name, status: 'pending' }` |
| `recording_enabled` | boolean | Whether recording is active (default: false) |
| `require_registration` | boolean | Whether registration is required (default: false) |
| `reminder_minutes_before` | number | Minutes before session to send reminder (default: 15) |
| `status` | string | `'scheduled'`, `'in_progress'`, `'completed'`, `'cancelled'` |
| `host_id` | string | User ID of the host |
| `host_name` | string | Display name of the host |
| `host_email` | string | Email of the host |
| `meeting_link` | string | Auto-generated join URL: `{origin}/Studio?room={room_slug}` |
| `webinar_settings` | object | Webinar-specific settings (see below) |
| `streaming_settings` | object | Live stream-specific settings (see below) |

### webinar_settings Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `allow_q_and_a` | boolean | true | Enable Q&A feature for attendees |
| `allow_polls` | boolean | true | Enable polls during the webinar |
| `panelists` | array | [] | List of panelist objects |
| `require_approval` | boolean | false | When true, registrations require manual approval before attendees receive join links |

### streaming_settings Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `privacy` | string | 'public' | `'public'`, `'unlisted'`, or `'private'` |
| `category` | string | '' | YouTube category for the stream |
| `thumbnail_url` | string | '' | URL of uploaded thumbnail (1280x720 recommended) |
| `reusable_studio` | boolean | false | Allow multiple streams with the same link |
| `enable_chat` | boolean | true | Enable live chat |
| `enable_reactions` | boolean | true | Enable viewer reactions |
| `youtube` | object | `{ enabled: false, rtmp_url: '', stream_key: '' }` | YouTube RTMP config |
| `facebook` | object | `{ enabled: false, rtmp_url: '', stream_key: '' }` | Facebook RTMP config |
| `twitch` | object | `{ enabled: false, rtmp_url: '', stream_key: '' }` | Twitch RTMP config |
| `x` | object | `{ enabled: false, rtmp_url: '', stream_key: '' }` | X (Twitter) RTMP config |
| `linkedin` | object | `{ enabled: false, rtmp_url: '', stream_key: '' }` | LinkedIn RTMP config |

---

## Webinar-Specific Scheduling (WebinarScheduler)

When scheduling a webinar, the system opens the **WebinarScheduler** wizard instead of the standard modal. This wizard provides:

### Basic Settings
- Session type (pre-set to webinar)
- Title and description
- Room selection
- Date, time, and duration
- Access type (default: `'registration'`)
- Auto-record toggle

### Registration Settings
- Custom registration fields (default: Full Name + Email Address, both required)
- Ability to add custom text fields
- Approval mode: `'auto'` (automatic approval) or manual
- Confirmation email configuration:
  - Customizable subject line (supports `{webinar_title}` placeholder)
  - Customizable body text (supports `{name}`, `{webinar_title}`, `{date}`, `{time}`, `{join_link}` placeholders)
  - Option to include calendar invite attachment

### Stage Control
- Allow stage access toggle
- Co-host stage management toggle
- Auto-spotlight toggle
- Presenter email list (invite presenters by email)

### Attendee Options
- Show attendee list toggle
- Show attendee count toggle
- Chat enabled toggle
- Reactions enabled toggle

### Customization
- Custom background toggle and upload
- Waiting room enabled toggle

### AI Assistant
- Integrated AI panel for content generation assistance

---

## Recurring Sessions

Webinars support recurring scheduling through the `RecurringSettings` component:

### Configuration Options

| Setting | Values | Description |
|---------|--------|-------------|
| `is_recurring` | boolean | Enable/disable recurring mode |
| `recurrence_pattern` | string | `'daily'`, `'weekly'`, `'biweekly'`, `'monthly'` |
| `days_of_week` | array | Array of day numbers (0=Sunday through 6=Saturday); only shown for weekly pattern |
| `recurrence_end_date` | date | End date for the recurring series |
| `recurrence_count` | number | Alternative: total number of sessions to create |

### Behavior
- Each recurrence creates a **separate webinar instance** that can be managed individually.
- Users can set either an end date OR a session count (not both required).
- Weekly pattern displays a 7-day selector grid (Sun-Sat) for choosing which days to repeat.
- The system auto-generates individual `ScheduledMeeting` records for each occurrence.

---

## Session Status Lifecycle

Sessions progress through these statuses:

1. **Scheduled** -- Initial state after creation. Displays as "Upcoming", "Today", or "Tomorrow" depending on date.
2. **In Progress** -- Session is currently live. Displays green "Live Now" badge.
3. **Completed** -- Session has ended normally. Displays gray "Completed" badge.
4. **Cancelled** -- Session was cancelled. Displays red "Cancelled" badge.
5. **Missed** -- A scheduled session whose start time has passed without being started. Displays orange "Missed" badge.

---

## CRUD Operations

### Creating a Session
1. Click "Schedule [Meeting/Webinar/Live Stream]" in the appropriate lane, or click a date in calendar view.
2. Fill in the required fields (title, date/time are mandatory).
3. Select a room from the dropdown (first room is auto-selected for new sessions).
4. Configure optional settings (recording, registration, invitees, etc.).
5. Click "Schedule [Type]" to create.
6. The system auto-generates a `meeting_link` using the room slug.

### Editing a Session
1. Click the three-dot menu (...) on any session card.
2. Select "Edit" from the dropdown.
3. Modify fields in the modal.
4. Click "Save Changes" to update.

### Deleting a Session
1. Click the three-dot menu (...) on any session card.
2. Select "Delete" from the dropdown.
3. Confirm the deletion in the popup dialog.
4. The session is permanently removed.

### Joining a Session
1. Click the three-dot menu (...) on a session with a meeting link.
2. Select "Join" to open the studio in a new tab.
3. Or select "Copy Link" to copy the join URL to clipboard.

---

## Invitees Management

For meetings and webinars (not live streams):

1. In the scheduling modal, find the "Invitees" section.
2. Enter an email address and optional name.
3. Click the "+" button to add the invitee.
4. Invitees appear as badge chips below the input fields.
5. Click the "x" on any badge to remove an invitee.
6. Each invitee is stored with `status: 'pending'`.

---

## Common Troubleshooting

### Q: I cannot see the Schedule tab.
**A:** The Schedule tab requires admin or host-level permissions. Check with your account owner to ensure your role has the appropriate access level.

### Q: My session shows as "Missed" even though it was completed.
**A:** The "Missed" status appears when the scheduled start time passes without the session status being updated to "in_progress". This can happen if the session was started without using the scheduled link. Contact support to manually update the status.

### Q: I cannot add invitees to my live stream.
**A:** Live streams do not support invitees or registration. These features are only available for meetings and webinars. For live streams, share the streaming link or embed code directly.

### Q: How do I stream to multiple platforms simultaneously?
**A:** In the live stream scheduling modal, enable each platform toggle (YouTube, Facebook, Twitch, X, LinkedIn), then enter the RTMP URL and stream key for each. All enabled platforms will receive the stream simultaneously.

### Q: The calendar is not showing my sessions.
**A:** Ensure the sessions have a valid `scheduled_start` date. Sessions must be in the future and have `status: 'scheduled'` to appear in the calendar view. Check that the sessions are not filtered by the current view mode.

### Q: How do I enable recurring webinars?
**A:** Open the webinar scheduler, navigate to the recurring settings section, toggle "Enable Recurring" on, then select the recurrence pattern (daily, weekly, biweekly, monthly). For weekly patterns, select which days of the week. Set an end date or number of sessions.

### Q: What is "Require Approval" for webinars?
**A:** When `require_approval` is set to true in `webinar_settings`, attendees who register are placed in a pending state. A host or admin must manually approve each registration before the attendee receives their join link and confirmation email. This is useful for exclusive or limited-capacity webinars.

### Q: Can I drag sessions between dates on the calendar?
**A:** Yes. In calendar view, you can drag and drop any session to a new date. The system automatically updates the `scheduled_start` and `scheduled_time` fields. The session retains all other settings.

---

## API Reference

### List Scheduled Meetings
```
ScheduledMeeting.list('-scheduled_start')
```
Returns all scheduled meetings sorted by start date descending (newest first).

### Create a Scheduled Meeting
```
ScheduledMeeting.create({
  session_type: 'webinar',
  title: 'Product Launch',
  description: 'Quarterly product announcement',
  room_id: 'room_abc123',
  scheduled_start: '2025-03-15T14:00:00Z',
  scheduled_end: '2025-03-15T15:00:00Z',
  duration_minutes: 60,
  host_id: 'user_xyz',
  host_name: 'Jane Doe',
  host_email: 'jane@example.com',
  meeting_link: 'https://app.rlink.com/Studio?room=product-launch',
  status: 'scheduled',
  recording_enabled: true,
  require_registration: true,
  webinar_settings: {
    allow_q_and_a: true,
    allow_polls: true,
    require_approval: false,
    panelists: []
  }
})
```

### Update a Scheduled Meeting
```
ScheduledMeeting.update(id, {
  title: 'Updated Title',
  scheduled_start: '2025-03-16T14:00:00Z'
})
```

### Delete a Scheduled Meeting
```
ScheduledMeeting.delete(id)
```

---

## Related Features

- **Rooms**: Sessions are linked to rooms via `room_id`. See rooms documentation.
- **Recordings**: Sessions with `recording_enabled: true` will auto-generate a `Recording` entity. See `23-recordings-and-clips.md`.
- **Integrations**: Calendar sync (Google Calendar, Outlook, iCal) can auto-create calendar events for scheduled sessions. See `27-integrations.md`.
- **Brand Kits**: Webinars can use brand kits for visual customization. See `24-brand-kits.md`.
- **Notifications**: The system sends reminder notifications based on `reminder_minutes_before` setting.
