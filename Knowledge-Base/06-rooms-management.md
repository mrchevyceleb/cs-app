# Rooms Management

## Overview

Rooms are the fundamental containers for all live sessions in R-Link. Every Meeting, Webinar, or Live Stream takes place inside a room. A room encapsulates the configuration, branding, layout preferences, and session settings needed to launch a Studio session. Rooms can be created from scratch, from templates, or duplicated from existing rooms. The number of rooms available depends on the customer's subscription plan -- Basic accounts get 1 room, while Business accounts can run up to 5 rooms in parallel.

This document covers the complete lifecycle of rooms: creation, configuration, editing, launching, and deletion, as well as plan-based limitations and troubleshooting.

---

## What Are Rooms?

A room in R-Link is a persistent configuration entity that defines:

- **Session type**: Meeting, Webinar, or Live Stream.
- **Room name**: Display name shown to participants.
- **Branding**: Associated brand kit (colors, logos, fonts, lower thirds).
- **Layout preferences**: Default layout and available layouts for the session type.
- **Account association**: Every room belongs to an account via the `account_id` field.
- **Template source**: Optionally created from a template.
- **Settings**: Session-specific settings such as participant limits, waiting room, recording defaults.

Rooms are NOT the live sessions themselves. A room is a reusable configuration. When a host clicks "Launch" on a room, the Studio opens with that room's settings, and a live session begins within that room context.

---

## Creating Rooms

### Creating a Room from Scratch

1. Navigate to the **Admin Portal**.
2. Click on the **Rooms** tab in the left sidebar.
3. Click the **Create Room** button (or **+** button).
4. Fill in the room details:
   - **Room Name**: A descriptive name for the room.
   - **Session Type**: Select Meeting, Webinar, or Live Stream.
   - **Brand Kit** (optional): Associate a brand kit for consistent branding.
5. Click **Create** to save the room.
6. The room appears in the rooms list with a unique ID.

### Creating a Room from a Template

1. Navigate to the **Rooms** tab.
2. Click **Create Room**.
3. Select **Use Template**.
4. Choose from available templates (pre-configured room setups with session type, layout, branding, and element presets).
5. Optionally modify the template-derived settings.
6. Click **Create** to save.

Templates are especially useful for organizations that run recurring events with consistent branding and configuration.

### Room Entity Structure

Every room is stored as a Base44 entity with the following key fields:

| Field | Description |
|---|---|
| `id` | Unique room identifier (auto-generated) |
| `account_id` | The account this room belongs to |
| `name` | Display name of the room |
| `session_type` | `meeting`, `webinar`, or `live` |
| `brand_kit_id` | Associated brand kit (optional) |
| `template_id` | Source template (if created from template) |
| `settings` | JSON object with room-specific configuration |
| `created_at` | Timestamp of room creation |
| `updated_at` | Timestamp of last modification |

---

## Room Properties and Settings

### Core Properties

| Property | Description | Default |
|---|---|---|
| Name | Display name shown in admin and to participants | Required at creation |
| Session Type | Meeting, Webinar, or Live Stream | Required at creation |
| Brand Kit | Visual branding applied to the room | None (uses default branding) |
| Template | Source template used to create the room | None |

### Session-Specific Settings

Settings vary by session type:

**Meeting Rooms:**
- Default layout (gallery, speaker_filmstrip, screen_thumbnails, presenter_pip, focus)
- Participant limits
- Waiting room toggle
- Recording default (auto-record or manual)

**Webinar Rooms:**
- Default layout (stage_host, interview, panel, content_focus, content_host_pip, offer)
- Attendee capacity (up to 1,000 on Business plan)
- Q&A enabled toggle
- CTA configuration
- Talking points configuration

**Live Stream Rooms:**
- Default layout (live_host, live_interview, live_panel, live_media, live_media_pip, live_comment, live_cta)
- Streaming destinations (RTMP endpoints)
- Scene configuration
- Comments overlay settings
- CTA configuration
- Talking points configuration

---

## Room Limits by Plan

| Plan | Room Limit | Parallel Sessions | Session Types Available |
|---|---|---|---|
| **Basic** | 1 room | 1 active session | Meeting only |
| **Business** | 5 rooms | 5 parallel sessions | Meeting, Webinar, Live Stream |

### What "Parallel" Means

On the Business plan, up to 5 rooms can have active live sessions simultaneously. This is useful for organizations running multiple concurrent events, such as:
- A webinar in one room while a team meeting happens in another.
- Multiple breakout sessions running in parallel rooms.
- A live stream and an internal meeting at the same time.

### Hitting the Room Limit

When a customer attempts to create a room that would exceed their plan limit:

1. The **Create Room** button triggers an upgrade prompt.
2. The prompt explains the current plan limit and offers to upgrade.
3. On the Basic plan, the message indicates that the Business plan supports up to 5 rooms.
4. Clicking **Upgrade** navigates to the billing/upgrade flow.
5. The room is NOT created until the upgrade is completed or the customer deletes an existing room.

---

## Editing and Updating Rooms

### How to Edit a Room

1. Navigate to the **Rooms** tab in the Admin Portal.
2. Find the room in the list.
3. Click on the room name or the **Edit** icon.
4. Modify any of the room's properties:
   - Room name
   - Session type (note: changing session type resets layout and feature settings)
   - Brand kit association
   - Session-specific settings
5. Click **Save** to apply changes.

### What Can Be Changed

| Property | Editable? | Notes |
|---|---|---|
| Room name | Yes | Can be changed at any time |
| Session type | Yes | Resets layout and feature settings |
| Brand kit | Yes | New brand kit applies on next session launch |
| Settings | Yes | Changes apply on next session launch |
| Account ID | No | Fixed at creation |
| Room ID | No | Auto-generated, immutable |

### Important: Changes and Active Sessions

Room edits do NOT affect sessions that are currently live. Changes take effect the next time the room is launched. If a host is currently in a live session and the room settings are changed in the admin portal, the live session continues with the original settings.

---

## Deleting Rooms

### How to Delete a Room

1. Navigate to the **Rooms** tab in the Admin Portal.
2. Find the room in the list.
3. Click the **Delete** icon (trash can) or select **Delete** from the room's action menu.
4. Confirm the deletion in the confirmation dialog.
5. The room is permanently removed.

### Deletion Behavior

| Aspect | Behavior |
|---|---|
| Active session in the room | Deletion is blocked if the room has an active session; end the session first |
| Recordings from the room | Recordings are NOT deleted when the room is deleted; they persist independently |
| Associated brand kit | The brand kit is NOT deleted; it remains available for other rooms |
| Template link | The source template is NOT affected |
| Room URL/links shared previously | Links become invalid; participants will see an error |

### Recovering Deleted Rooms

Room deletion is permanent. There is no "undo" or "trash" feature. If a customer accidentally deletes a room, they must recreate it. If the room was based on a template, they can recreate it from the same template to restore most settings.

---

## Room Deduplication

### How Deduplication Works

In the Admin portal's Rooms tab, rooms are deduplicated by their `id` field. This means:

- If the API returns duplicate room entries (which can happen due to data sync or caching), the admin portal displays only one instance of each unique room.
- The deduplication is performed client-side when the rooms list is rendered.
- This is a defensive measure to prevent confusion in the UI; it does NOT indicate a data integrity issue.

### When Customers Might Notice This

Customers will generally never see duplicate rooms because deduplication happens automatically. However, if a customer reports seeing a room count that differs from what the API returns, deduplication may be the cause. This is normal behavior and not a bug.

---

## Launching a Room (Opening the Studio)

### How to Launch a Room

1. Navigate to the **Rooms** tab in the Admin Portal.
2. Find the room to launch.
3. Click the **Launch** button on the room card.
4. The browser navigates to the Studio page with the room's parameters in the URL.
5. The Studio loads with the room's session type, layout, and branding.

### URL Parameters When Launching

When a room is launched, the following URL parameters are passed to the Studio:

| Parameter | Description | Example |
|---|---|---|
| `type` | Session type | `?type=meeting`, `?type=webinar`, `?type=livestream` |
| `name` | Room name | `?name=Weekly%20Standup` |
| `room_id` | Room identifier | `?room_id=abc123` |

### What Happens in the Studio

1. The Studio reads the URL parameters and configures itself accordingly.
2. The session type determines available layouts, features, and controls.
3. The brand kit (if associated) is loaded and applied to overlays, lower thirds, and backgrounds.
4. The host sees the BottomControls bar with session-appropriate options.
5. The session does not go live until the host explicitly clicks **Go Live** or **Start Recording**.

---

## Room Templates

### What Are Templates?

Templates are pre-configured room setups that can be reused to create new rooms quickly. A template captures:

- Session type
- Default layout
- Brand kit association
- Element presets (CTAs, overlays, talking points, etc.)
- Settings defaults

### Using Templates with Rooms

- When creating a room, selecting a template pre-fills all configuration from the template.
- The room becomes independent after creation; changing the template does NOT retroactively update rooms created from it.
- Templates can be managed in the **Templates** tab of the Admin Portal (requires appropriate permissions).

---

## Brand Kit Association

### How Brand Kits Work with Rooms

- Each room can optionally be associated with one brand kit.
- The brand kit provides: colors, fonts, logo, lower-third style, branded backgrounds.
- When the room is launched, the brand kit's visual settings are applied to the Studio session.
- If no brand kit is associated, the session uses default/generic styling.

### Changing a Room's Brand Kit

1. Edit the room in the Admin Portal.
2. Select a different brand kit from the dropdown.
3. Save the room.
4. The new brand kit applies the next time the room is launched.

---

## Settings and Options

### Room List View Options

| Setting | Description |
|---|---|
| Sort by name | Alphabetical sorting of rooms |
| Sort by date | Sort by creation or last modified date |
| Filter by session type | Show only Meeting, Webinar, or Live Stream rooms |
| Search | Search rooms by name |

### Room Card Display

Each room in the list shows:
- Room name
- Session type badge (Meeting / Webinar / Live Stream)
- Brand kit indicator (if associated)
- Last used date
- Quick actions: Launch, Edit, Delete

---

## Troubleshooting

### Issue: "Room limit reached" Error When Creating a Room

| Step | Action |
|---|---|
| 1 | Check the customer's plan (Basic = 1 room, Business = 5 rooms) |
| 2 | Count existing rooms in the Rooms tab |
| 3 | If at the limit, advise the customer to delete an unused room or upgrade their plan |
| 4 | If the count seems wrong, check for deduplication -- the API may show more rooms than the UI |

### Issue: Room Settings Not Applying in Studio

| Step | Action |
|---|---|
| 1 | Confirm the room was saved after editing |
| 2 | Confirm the Studio was launched AFTER the edit was saved |
| 3 | If the session was already live when the edit was made, the changes will not apply until the next session |
| 4 | Try relaunching the room from the Admin Portal |

### Issue: Room Shows Wrong Session Type

| Step | Action |
|---|---|
| 1 | Check the URL parameters in the Studio URL -- the `type` parameter determines the session type |
| 2 | Verify the room's configured session type in the Admin Portal |
| 3 | If the URL parameter doesn't match the room config, the room may need to be re-saved |

### Issue: Cannot Delete a Room

| Step | Action |
|---|---|
| 1 | Check if there is an active session in the room; if so, end the session first |
| 2 | Check the customer's permissions -- room deletion requires `rooms.delete` permission |
| 3 | If the customer is not the owner or admin, they may need elevated permissions |

### Issue: Room Link Shared with Participants No Longer Works

| Step | Action |
|---|---|
| 1 | Check if the room was deleted -- deleted room links become invalid |
| 2 | Check if the room's name or ID was changed |
| 3 | Generate a new link from the room's settings and share it with participants |

---

## FAQ

**Q: Can I rename a room?**
A: Yes. Open the room in the Admin Portal, change the name, and save. The new name takes effect immediately in the admin portal and on the next Studio launch.

**Q: Can I change a room's session type after creating it?**
A: Yes, but be aware that changing the session type resets layout and feature settings to the defaults for the new session type.

**Q: Do I need to create a new room for every session?**
A: No. Rooms are reusable. You can launch the same room multiple times for recurring sessions. Each launch creates a new live session within the same room configuration.

**Q: What happens to my recordings if I delete a room?**
A: Recordings are stored independently of rooms. Deleting a room does NOT delete any recordings made in that room.

**Q: Can multiple people launch the same room at the same time?**
A: A room represents a single session space. If multiple hosts try to launch the same room, they join the same session rather than creating separate sessions.

**Q: Can I duplicate a room?**
A: You can create a new room from the same template, or manually recreate the room settings. There is no one-click "duplicate room" button.

**Q: Are rooms shared across team members?**
A: Yes. All rooms in an account are visible to team members who have the `rooms.view` permission. Any team member with `rooms.create` permission can create rooms, and those with `rooms.edit` can modify them.

---

## Known Limitations

1. **No room duplication**: There is no one-click duplicate feature. Customers must create new rooms manually or use templates.
2. **No per-room permissions**: You cannot restrict access to individual rooms. Permissions apply to all rooms equally.
3. **No room archiving**: Rooms can only be deleted, not archived. There is no way to hide a room without deleting it.
4. **Session type change resets settings**: Changing a room's session type clears layout and feature configurations.
5. **No room usage analytics**: There is no per-room analytics dashboard showing how many sessions were held, total participants, etc.
6. **Deleted rooms cannot be recovered**: Deletion is permanent with no undo option.
7. **Room links break on deletion**: Any previously shared room links become invalid when the room is deleted.
8. **Basic plan limited to Meeting rooms only**: Basic plan customers cannot create Webinar or Live Stream rooms.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Create rooms | 1 room | Up to 5 rooms |
| Meeting rooms | Yes | Yes |
| Webinar rooms | No | Yes |
| Live Stream rooms | No | Yes |
| Parallel active sessions | 1 | Up to 5 |
| Room templates | Limited | Full access |
| Brand kit association | Limited branding | Full branding suite |
| Room CRUD operations | Yes | Yes |

---

## Related Documents

- [05-authentication-and-access.md](./05-authentication-and-access.md) -- Permissions required for room management
- [07-session-types.md](./07-session-types.md) -- Detailed comparison of Meeting, Webinar, and Live Stream session types
- [08-studio-interface.md](./08-studio-interface.md) -- What happens after launching a room (Studio interface)
- [09-studio-media-controls.md](./09-studio-media-controls.md) -- Media controls available in Studio sessions
- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture overview
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan limits and pricing details
