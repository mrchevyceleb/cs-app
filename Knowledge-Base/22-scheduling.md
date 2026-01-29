# Scheduling Sessions

## Overview

The Schedule tab in the R-Link admin panel provides a calendar-based interface for planning and managing upcoming live video sessions. Accessible from Group 3 of the Admin Sidebar (alongside Rooms, Recordings, Clips, and Event Landing Pages), the Schedule tab is powered by the `ScheduleTab` component, which receives the user's `rooms` prop to associate scheduled sessions with specific rooms.

Scheduling supports all three R-Link session modes -- Meeting, Webinar, and Live Stream -- and includes options for one-time events, recurring series, and webinar-specific registration workflows.

## Calendar Interface

### Viewing the Schedule

The Schedule tab renders a calendar view where users can see all upcoming and past sessions at a glance.

- **Calendar navigation**: Move between days, weeks, and months using the calendar controls.
- **Session indicators**: Scheduled sessions appear on their respective dates with visual indicators showing session mode (Meeting, Webinar, or Live Stream).
- **Quick view**: Click on any session entry to see a summary including the room name, scheduled time, duration, and session mode.

### Time Zone Handling

- Sessions are stored with UTC timestamps.
- The calendar displays times in the user's local time zone by default.
- When scheduling, users can specify the time zone for the session, which is useful for teams distributed across regions.

## Scheduling a New Session

### Step-by-Step: Create a One-Time Session

1. Navigate to the **Schedule** tab in the Admin Sidebar.
2. Click the **Schedule Session** button (or click directly on a date in the calendar).
3. Fill in the session details:
   - **Session Title**: A descriptive name for the session.
   - **Session Mode**: Select Meeting, Webinar, or Live Stream.
   - **Room**: Choose from the list of available rooms (populated from the `rooms` prop passed to `ScheduleTab`). If no rooms exist, you will be prompted to create one first.
   - **Date and Time**: Select the start date and time.
   - **Duration**: Set the expected duration of the session.
   - **Description** (optional): Add notes or an agenda for participants.
4. Configure additional options (see Settings and Options below).
5. Click **Save** or **Schedule** to confirm.

### Room Association

Every scheduled session must be associated with a room. The `ScheduleTab` component receives the `rooms` prop, which provides the list of rooms available on the account.

- **Room selection**: During scheduling, a dropdown presents all rooms the user has access to.
- **Room settings inheritance**: The scheduled session inherits the room's configuration, including brand kit, layout preferences, and participant permissions.
- **One room, multiple sessions**: A single room can have multiple sessions scheduled at different times, but overlapping sessions in the same room will trigger a conflict warning.

## Webinar Scheduling

Webinars have additional scheduling options beyond standard meetings.

### Webinar-Specific Fields

- **Registration**: Enable or disable attendee registration. When enabled, attendees must register before the event and receive a unique join link.
- **Registration Form Fields**: Configure which fields to collect (name, email, company, job title, custom fields).
- **Attendee Capacity**: Set a maximum number of registrants.
- **Registration Confirmation Email**: Customize the email sent to registrants upon successful registration.
- **Reminder Emails**: Configure automated reminder emails sent before the webinar (e.g., 24 hours before, 1 hour before).
- **Event Landing Page**: Link the webinar to an Event Landing Page (managed under the Event Landing Pages tab) for public-facing registration.

### Step-by-Step: Schedule a Webinar

1. Navigate to **Schedule** and click **Schedule Session**.
2. Select **Webinar** as the session mode.
3. Choose the room to host the webinar.
4. Set the date, time, and duration.
5. Toggle **Enable Registration** to on.
6. Configure registration form fields as needed.
7. Optionally set an attendee capacity limit.
8. Configure reminder email schedule.
9. Optionally link to or create an Event Landing Page.
10. Click **Schedule**.

## Recurring Sessions

Recurring sessions allow users to schedule a series of sessions that repeat on a defined pattern.

### Recurrence Options

- **Daily**: Repeats every day or every N days.
- **Weekly**: Repeats on selected days of the week (e.g., every Monday and Wednesday).
- **Bi-weekly**: Repeats every two weeks on selected days.
- **Monthly**: Repeats on a specific date each month (e.g., the 15th) or a specific pattern (e.g., the second Tuesday).
- **Custom**: Define a custom recurrence interval.

### Recurrence End Conditions

- **After N occurrences**: The series ends after a set number of sessions.
- **By date**: The series ends on or before a specified date.
- **No end date**: The series continues indefinitely until manually stopped.

### Step-by-Step: Create a Recurring Session

1. Begin scheduling a session as described above.
2. Toggle the **Recurring** option to on.
3. Select the recurrence pattern (daily, weekly, bi-weekly, monthly, or custom).
4. If weekly or bi-weekly, select the days of the week.
5. Set the end condition (number of occurrences, end date, or no end).
6. Click **Schedule**. All occurrences are created and visible on the calendar.

### Managing Recurring Sessions

- **Edit single occurrence**: Modify one session in the series without affecting others.
- **Edit entire series**: Change the recurrence pattern, time, or room for all future occurrences.
- **Cancel single occurrence**: Remove one session from the series.
- **Cancel entire series**: Remove all future occurrences.

## Session Planning Features

### Pre-Session Preparation

- **Agenda**: Add an agenda or talking points to the session that hosts can reference during the event.
- **Invite participants**: Send email invitations to participants directly from the scheduling interface.
- **Calendar integration**: Sessions can sync with connected calendar services (Google Calendar, Microsoft Outlook, iCal Feed) via the Integrations tab.
- **Pre-upload content**: Prepare slides, documents, or media to be available in the room when the session starts.

### Notifications and Reminders

- **Email notifications**: Participants receive email notifications when a session is scheduled, updated, or canceled.
- **Reminder schedule**: Configure automated reminders at customizable intervals before the session.
- **SMS reminders**: If Twilio integration is connected, SMS reminders can be sent to participants (see document 27-integrations.md).

## Settings and Options

| Setting | Description | Default |
|---------|-------------|---------|
| Session Title | Display name for the session | Required |
| Session Mode | Meeting, Webinar, or Live Stream | Meeting |
| Room | Associated room from account rooms | Required |
| Date & Time | Start date and time | Required |
| Duration | Expected length of session | 60 minutes |
| Time Zone | Time zone for the scheduled time | User's local |
| Recurring | Enable recurrence pattern | Off |
| Description | Session notes or agenda | Empty |
| Registration (Webinar) | Require attendee registration | Off |
| Reminder Emails | Automated pre-session reminders | On |
| Calendar Sync | Sync to connected calendars | On (if integration active) |

## Troubleshooting

### Session does not appear on the calendar
- Verify the session was saved successfully (check for confirmation message).
- Refresh the Schedule tab.
- Check that you are viewing the correct date range on the calendar.
- Ensure the room associated with the session still exists; deleted rooms may cause orphaned schedule entries.

### Room conflict warning
- Two sessions cannot overlap in the same room. Either change the time of one session or assign it to a different room.
- For recurring sessions, check all occurrences for conflicts.

### Calendar sync not working
- Confirm that a calendar integration (Google Calendar, Microsoft Outlook, or iCal) is connected under the Integrations tab.
- Check the integration status is "connected" (not "disconnected").
- Re-authorize the calendar integration if the OAuth token has expired.

### Participants did not receive invitations
- Verify the email addresses entered are correct.
- Check email integration status (Mailchimp or SendGrid) under Integrations.
- Ask participants to check their spam or junk folders.
- For webinars, ensure registration is enabled and the participant has completed registration.

### Recurring session edits not applying
- When editing a single occurrence, changes apply only to that one session.
- When editing the series, changes apply to all future occurrences but not past ones.
- If the recurrence pattern change is not reflected, cancel the series and recreate it.

## FAQ

**Q: Can I schedule a session without creating a room first?**
A: No. Every session must be associated with a room. The `ScheduleTab` component requires the `rooms` prop, so at least one room must exist before scheduling. Create a room under the Rooms tab first.

**Q: How far in advance can I schedule sessions?**
A: There is no hard limit on how far in advance sessions can be scheduled. Recurring sessions can also be set to continue indefinitely.

**Q: Can I duplicate a scheduled session?**
A: Yes. Open an existing scheduled session and use the duplicate option to create a new session with the same settings on a different date.

**Q: What happens if I delete a room that has scheduled sessions?**
A: Scheduled sessions associated with the deleted room may become orphaned. It is recommended to cancel or reschedule sessions before deleting their associated room.

**Q: Can multiple hosts be assigned to a scheduled session?**
A: Host assignments are managed at the room level. Team members with the appropriate role and permissions can join any session in a room they have access to.

**Q: Do attendees see the schedule?**
A: Attendees receive invitations and reminders but do not have access to the admin Schedule tab. For webinars, attendees interact with the Event Landing Page and registration flow.

## Known Limitations

- The Schedule tab does not currently support drag-and-drop rescheduling on the calendar; sessions must be edited manually.
- Recurring session patterns cannot be changed retroactively for past occurrences.
- Room conflicts are checked at save time; if two users schedule overlapping sessions simultaneously, the second save may succeed without a warning.
- Calendar sync is one-way for iCal Feed subscriptions (R-Link to external calendar only).
- SMS reminders require an active Twilio integration; they are not available natively.

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Schedule sessions | Yes | Yes |
| Meeting mode scheduling | Yes | Yes |
| Webinar mode scheduling | No | Yes |
| Live Stream mode scheduling | No | Yes |
| Recurring sessions | Limited | Yes |
| Registration workflows | No | Yes |
| SMS reminders (via Twilio) | No | Yes |
| Calendar integrations | Limited | Yes |

## Related Documents

- **21-admin-panel-navigation.md** -- Admin panel layout and sidebar navigation
- **23-recordings-and-clips.md** -- Recording sessions and creating clips
- **27-integrations.md** -- Calendar, email, and SMS integrations for scheduling
- **24-brand-kits.md** -- Room branding applied to scheduled sessions
