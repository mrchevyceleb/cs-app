# 06 - Rooms Management

## Overview

Rooms are the fundamental organizational unit in R-Link. Each room is an `EventFolder` entity that acts as a persistent container for live video sessions. Rooms have unique vanity URLs (slugs), configurable settings, and are associated with a specific workspace. Users create rooms to host meetings, webinars, or live streams, and each room can be reused for recurring sessions.

Rooms are managed through the Rooms tab in the R-Link dashboard, accessible to users with the `rooms.view` permission. Room creation, editing, and deletion are governed by the permission system described in [05 - Authentication and Access](./05-authentication-and-access.md).

---

## EventFolder Entity

The `EventFolder` is the underlying data model for rooms. Each room is stored as an EventFolder record with the following key properties:

### Entity Schema

| Field | Type | Description | Required |
|-------|------|-------------|----------|
| `id` | string | Unique identifier (auto-generated) | Auto |
| `name` | string | Display name of the room | Yes |
| `slug` | string | URL-safe identifier for vanity URL | Yes (auto-generated from name, editable) |
| `description` | string | Optional description shown in room details | No |
| `workspace_id` | string | ID of the workspace this room belongs to | Auto |
| `created_by` | string | Email/ID of the user who created the room | Auto |
| `created_at` | datetime | Timestamp of room creation | Auto |
| `updated_at` | datetime | Timestamp of last modification | Auto |
| `session_type` | string | Default session type: `'meeting'`, `'webinar'`, or `'livestream'` | No (defaults to `'meeting'`) |
| `brand_kit_id` | string | ID of the associated brand kit | No |
| `template_id` | string | ID of the associated layout template | No |
| `settings` | object | Room settings (see Room Settings section) | No (defaults applied) |

---

## Room URLs

### Vanity URL Structure

Every room has a public-facing vanity URL:

```
https://rally.r-link.com/{slug}
```

| Component | Description |
|-----------|-------------|
| `rally.r-link.com` | R-Link's session domain |
| `{slug}` | URL-safe room identifier (lowercase, hyphens, no spaces) |

**Examples:**
- `https://rally.r-link.com/weekly-standup`
- `https://rally.r-link.com/product-demo`
- `https://rally.r-link.com/team-sync-q4`

### Slug Rules

| Rule | Detail |
|------|--------|
| Characters allowed | Lowercase letters, numbers, hyphens |
| Auto-generation | Derived from room name (spaces become hyphens, special chars removed, lowercased) |
| Uniqueness | Must be unique within the workspace; system appends a number if duplicate detected |
| Editability | Can be changed after creation via room settings |
| Maximum length | 64 characters |
| Minimum length | 3 characters |

### Studio Launch URL

To launch the studio for a specific room, use the following URL:

```
/Studio?room={slug}
```

**Full URL example:**
```
https://app.r-link.com/Studio?room=weekly-standup
```

Additional URL parameters can be combined:
```
/Studio?room={slug}&type={session_type}&name={display_name}
```

| Parameter | Type | Description |
|-----------|------|-------------|
| `room` | string | Room slug to launch |
| `type` | string | Session type override: `'meeting'`, `'webinar'`, or `'livestream'` |
| `name` | string | Pre-fill participant display name |

---

## Room CRUD Operations

### Creating a Room

**Access required:** `rooms.create` permission (admin, host, or custom role with this permission)

**Steps in the UI:**
1. Navigate to the Rooms tab
2. Click the "Create Room" / "+" button
3. Enter room name (slug auto-generated)
4. Optionally configure:
   - Description
   - Default session type
   - Room settings (waiting room, registration, etc.)
   - Brand kit selection
   - Template selection
5. Click "Create"

**Room limits by plan:**

| Plan | Maximum Rooms | Behavior at Limit |
|------|--------------|-------------------|
| Basic | 1 | "Create Room" button disabled, upgrade prompt shown |
| Business | 5 (`MAX_ROOMS_BUSINESS = 5`) | "Create Room" button disabled, upgrade prompt shown |

**Deduplication:** If a user attempts to create a room with a name that generates a slug identical to an existing room, the system automatically appends a numeric suffix:
- First: `product-demo`
- Duplicate: `product-demo-2`
- Next: `product-demo-3`

### Reading / Viewing Rooms

**Access required:** `rooms.view` permission

The Rooms tab displays a list/grid of all rooms in the workspace with:
- Room name
- Vanity URL (clickable to copy)
- Default session type badge
- Last used date
- Created by
- Quick action buttons (Edit, Launch, Copy Link, Delete)

### Updating a Room

**Access required:** `rooms.edit` permission

Editable fields:
- Room name
- Slug (vanity URL)
- Description
- Default session type
- All room settings (waiting room, registration, recording permission, password)
- Brand kit association
- Template association

**Note:** Changing the slug will break any previously shared links using the old slug. The system warns the user before allowing a slug change.

### Deleting a Room

**Access required:** `rooms.delete` permission (admin or owner; hosts cannot delete rooms by default)

**Behavior:**
1. Confirmation dialog shown: "Are you sure you want to delete '{room name}'? This action cannot be undone."
2. On confirmation, the EventFolder record is soft-deleted
3. The vanity URL becomes available for reuse after deletion
4. Associated recordings and session data are NOT deleted (they remain accessible in the workspace)

---

## Room Settings

All room settings are boolean flags that control access and behavior when participants join:

### Settings Reference

#### `waiting_room`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | When enabled, participants who join the room are placed in a waiting room and must be admitted by the host before they can enter the session. |
| UI location | Room Settings > Access Control |
| Behavior when ON | Joining participants see a "Please wait, the host will let you in shortly" screen. The host sees a notification and a list of waiting participants with "Admit" / "Deny" buttons. |
| Behavior when OFF | Participants enter the session immediately upon joining. |
| Use case | Private meetings, controlled webinars, interviews, any session where the host wants to vet attendees before they enter. |

#### `registration_required`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | When enabled, participants must fill out a registration form before joining the session. Collects name, email, and optional custom fields. |
| UI location | Room Settings > Access Control |
| Behavior when ON | Visitors to the room URL see a registration form. After submitting, they proceed to the session (or waiting room if that is also enabled). Registration data is collected and available to the host. |
| Behavior when OFF | Participants only need to enter a display name on the setup page before joining. |
| Use case | Webinars, lead generation events, any session where the host wants to collect attendee information. |

#### `recording_permission`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | When enabled, a consent notice is shown to all participants informing them that the session may be recorded. Participants must acknowledge the notice to proceed. |
| UI location | Room Settings > Privacy |
| Behavior when ON | Before entering the session, participants see a dialog: "This session may be recorded. By joining, you consent to being recorded." with "I Agree" and "Decline" buttons. Declining prevents entry. |
| Behavior when OFF | No recording consent notice is shown. Recording may still be initiated by the host, but participants are not explicitly warned at entry time. |
| Use case | Compliance requirements, legal recording consent, regulated industries. |

#### `password_protection`

| Attribute | Detail |
|-----------|--------|
| Type | `boolean` |
| Default | `false` |
| Description | When enabled, participants must enter a password to access the room. The password is set by the room creator/editor. |
| UI location | Room Settings > Access Control |
| Behavior when ON | After navigating to the room URL, participants see a password prompt. The password is validated before allowing entry to the setup page. Incorrect passwords show an error and allow retry. |
| Behavior when OFF | No password is required. Anyone with the room URL can access the setup page. |
| Additional field | When enabled, a `password` text field appears in room settings for the host to set/change the password. |
| Use case | Restricted access sessions, confidential meetings, paid events. |

### Settings Interaction Matrix

When multiple settings are enabled, they are applied in the following order:

```
1. Password Protection (if enabled)
   → User enters password
   → If correct, proceed to step 2

2. Registration Required (if enabled)
   → User fills registration form
   → On submit, proceed to step 3

3. Recording Permission (if enabled)
   → User sees consent notice
   → On "I Agree", proceed to step 4

4. Setup Page
   → User selects camera/mic, enters display name
   → Clicks "Join", proceed to step 5

5. Waiting Room (if enabled)
   → User placed in waiting room
   → Host admits user → User enters session

6. Session
   → User is now in the live session
```

---

## Brand Kit Quick-Select

### Overview

Each room can be associated with a brand kit that controls the visual appearance of the session. The brand kit includes logos, colors, fonts, and other branding elements.

### Quick-Select Modal

When editing a room, users can click the "Brand Kit" button to open a quick-select modal:

1. Modal displays available brand kits as visual cards
2. Each card shows a preview of the brand kit (logo, primary color, font)
3. User clicks a card to select it
4. Selection is saved immediately (or on room save, depending on context)
5. The brand kit is applied the next time the room's studio is launched

**Behavior:**
- Only brand kits created in the workspace are shown
- A "None" / "Default" option is always available to remove brand kit association
- Brand kit changes take effect for the next session launch (not retroactive to in-progress sessions)
- Brand kits are a Business plan feature; Basic plan users see an upgrade prompt when accessing this feature

### Brand Kit Properties Applied to Room

| Property | Description | Where Visible |
|----------|-------------|---------------|
| Logo | Primary logo displayed in the session | Studio top bar, waiting room, registration page |
| Primary color | Accent color used throughout the session UI | Buttons, highlights, borders |
| Secondary color | Supporting color | Background accents, secondary elements |
| Font family | Typography used in session overlays | Lower thirds, CTAs, titles |
| Background | Default background for scenes | Studio canvas background |

---

## Template Quick-Select

### Overview

Each room can be associated with a layout template that pre-configures the studio with specific layouts, elements, and configurations.

### Quick-Select Modal

Similar to the brand kit quick-select:

1. Modal displays available templates as visual previews
2. Templates are filtered by session type (meeting templates, webinar templates, live stream templates)
3. User clicks a template to select it
4. Selection is saved to the room's `template_id`

**Behavior:**
- Templates are session-type-aware; selecting a webinar template for a room sets the session type to webinar if not already set
- A "Blank" option is available to start without a template
- Custom templates created by the user appear alongside system defaults
- Template changes take effect for the next session launch

---

## Copy Link

### Functionality

Every room has a "Copy Link" button that copies the room's vanity URL to the clipboard:

```
https://rally.r-link.com/{slug}
```

**UI behavior:**
- Button shows a clipboard icon
- On click, the URL is copied to the system clipboard
- Button briefly changes to a checkmark with "Copied!" text
- Returns to default state after 2 seconds
- Works in both the room list view and room detail/edit view

### Link Sharing Context

The copied link is the participant-facing URL. When someone visits this link:
1. They see the room's entry flow (password > registration > consent > setup > waiting room, as applicable)
2. They are not taken to the dashboard or admin view
3. The link works for both authenticated and unauthenticated users (authentication applies at the workspace level, not the room level)

---

## Room Limits and Upgrade Prompts

### Plan Limits

| Plan | Max Rooms | Constant |
|------|-----------|----------|
| Basic | 1 | - |
| Business | 5 | `MAX_ROOMS_BUSINESS = 5` |

### Upgrade Prompt Behavior

When a user reaches their plan's room limit:

1. The "Create Room" / "+" button becomes disabled (grayed out)
2. Hovering or clicking shows a tooltip/modal: "You've reached the maximum number of rooms for your plan."
3. The message includes an "Upgrade" button/link that navigates to the Billing tab (if the user is the owner) or instructs them to "Contact your workspace owner to upgrade."
4. Existing rooms can still be edited, launched, and used normally
5. Rooms must be deleted before new ones can be created if the user does not want to upgrade

### Room Count Display

The Rooms tab header shows the current count:
```
Rooms (3 of 5)
```

This gives users immediate visibility into their usage relative to the limit.

---

## Troubleshooting Guide

### Symptom: "Create Room" button is disabled

**Diagnostic steps:**
1. Check the room count displayed in the Rooms tab header
2. Verify the user's plan (Basic or Business)
3. Check if the user has `rooms.create` permission

**Common fixes:**
- If at room limit: Delete an unused room or upgrade the plan
- If permission issue: Contact workspace admin to assign appropriate role
- If UI glitch: Refresh the page

### Symptom: Room vanity URL not working (404 or wrong page)

**Diagnostic steps:**
1. Verify the slug is correct (check for typos)
2. Confirm the room still exists (check Rooms tab)
3. Check if the slug was recently changed

**Common fixes:**
- Use the "Copy Link" button to get the current URL
- If the slug was changed, update all shared links
- If the room was deleted, it will return a 404

### Symptom: Participants cannot join despite having the correct link

**Diagnostic steps:**
1. Check if `password_protection` is enabled - does the participant know the password?
2. Check if `waiting_room` is enabled - is the host in the session to admit them?
3. Check if `registration_required` is enabled - is the participant completing the form?
4. Check if the session has started (host must be present for some configurations)

**Common fixes:**
- Share the password with participants if password protection is on
- Ensure the host joins first and admits waiting participants
- Verify the registration form is functioning correctly

### Symptom: Room settings not taking effect

**Diagnostic steps:**
1. Confirm settings were saved (check for save confirmation message)
2. Check if the session was already in progress when settings were changed
3. Refresh the room settings page to verify current state

**Common fixes:**
- Settings changes apply to the next session, not in-progress sessions
- Save settings and re-launch the studio
- Clear browser cache if settings appear stuck

### Symptom: Duplicate room names causing confusion

**Diagnostic steps:**
1. Check the slug (URL) - duplicates will have numeric suffixes
2. Look at created_by and created_at to distinguish rooms
3. Check if rooms were created by different team members

**Common fixes:**
- Rename rooms to have unique, descriptive names
- Delete unintended duplicates
- Communicate room naming conventions to the team

### Symptom: Brand kit or template not applying to session

**Diagnostic steps:**
1. Verify the brand kit / template is selected in room settings
2. Check if changes were saved
3. Confirm the session was launched AFTER the selection was made

**Common fixes:**
- Save room settings and re-launch the studio
- Brand kit and template changes do not apply to in-progress sessions
- If the brand kit was deleted, re-select or choose a different one

### Symptom: Cannot delete a room

**Diagnostic steps:**
1. Check user's permissions - only users with `rooms.delete` can delete rooms
2. Hosts can only delete rooms they created (in some configurations)
3. Check for UI errors

**Common fixes:**
- Contact an admin or owner to delete the room
- Ensure the user has the correct role/permissions

---

## Frequently Asked Questions

### Q: Can I reuse a room for multiple sessions?
**A:** Yes. Rooms are persistent containers. You can launch the studio from the same room as many times as you want. Each launch creates a new session, but the room settings, brand kit, template, and vanity URL remain the same.

### Q: What happens to recordings when I delete a room?
**A:** Recordings are not deleted when a room is deleted. All recordings from past sessions in that room remain accessible in the workspace's recording storage. Only the room configuration and vanity URL are removed.

### Q: Can I transfer a room to a different workspace?
**A:** No. Rooms are bound to their workspace. To move a room's configuration to a different workspace, you would need to manually recreate the room with the same settings in the new workspace.

### Q: Can two rooms have the same slug?
**A:** No. Slugs must be unique within a workspace. The system automatically appends numeric suffixes to prevent duplicates. However, rooms in different workspaces can have the same slug since they are scoped to their workspace.

### Q: How do I change the room URL after sharing it?
**A:** You can edit the slug in the room settings. However, this will break all previously shared links. There is no redirect from old slugs to new slugs. Plan slug changes carefully and notify all participants with the new link.

### Q: Can participants join a room without the host being present?
**A:** This depends on the room settings. If `waiting_room` is enabled, participants cannot enter until a host admits them (so the host must be present). If `waiting_room` is off and no other barriers exist, participants may enter the setup page, but the actual session requires at least one host to be active.

### Q: Does the room URL change if I rename the room?
**A:** Renaming the room name does NOT automatically change the slug. The slug is a separate field. You can change the name without affecting the URL, or you can change both independently.

### Q: What is the maximum number of participants per room?
**A:** Participant limits depend on the session type and plan, not on the room itself. Rooms are containers; the session type (meeting, webinar, live stream) and plan tier determine participant capacity.

### Q: Can I set different settings for different sessions in the same room?
**A:** Room settings apply to all sessions launched from that room. If you need different settings for a specific session, either change the room settings before that session (and change them back after) or create a separate room with the desired settings.

---

## Known Limitations

1. **No slug redirects:** When a room's slug is changed, the old URL immediately stops working. There is no redirect mechanism from old slugs to new slugs. Users must manually update all shared links.

2. **Settings apply globally to the room:** There is no per-session settings override. All sessions in a room use the same settings. Users must change room settings between sessions if different configurations are needed.

3. **No room archiving:** Rooms can only be active or deleted. There is no "archive" state that hides a room from the list without deleting it. Users at the room limit must delete rooms to create new ones.

4. **No room duplication:** There is no "duplicate room" feature. To create a room with the same settings as an existing one, users must manually configure the new room.

5. **Password is plain text:** The `password_protection` password field does not use hashing in the URL-based validation flow. The password is sent as a form input and validated server-side, but it is a simple string match, not a cryptographic verification.

6. **No scheduled room locking:** Rooms cannot be configured to automatically lock/unlock at specific times. If time-based access control is needed, the host must manually enable/disable settings.

7. **Room limit is hard-coded per plan:** The `MAX_ROOMS_BUSINESS = 5` limit cannot be adjusted per-workspace. All Business plan workspaces have the same limit. Custom enterprise limits would require a plan upgrade or custom arrangement.

8. **No room analytics:** Individual room analytics (number of sessions, total participants, average duration) are not available on the room level. Analytics are at the session or workspace level.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Maximum rooms | 1 | 5 (MAX_ROOMS_BUSINESS) |
| Room creation | Yes | Yes |
| Vanity URLs | Yes | Yes |
| Waiting room setting | Yes | Yes |
| Registration required setting | Yes | Yes |
| Recording permission setting | Yes | Yes |
| Password protection | Yes | Yes |
| Brand kit quick-select | No (upgrade prompt) | Yes |
| Template quick-select | Yes (system templates only) | Yes (system + custom templates) |
| Custom slug editing | Yes | Yes |

---

## Related Documents

- [05 - Authentication and Access](./05-authentication-and-access.md) - Permissions required for room CRUD operations
- [07 - Session Types](./07-session-types.md) - Session types that can be launched from rooms
- [08 - Studio Interface](./08-studio-interface.md) - The studio that opens when launching a room
- [09 - Studio Media Controls](./09-studio-media-controls.md) - Media settings within studio sessions launched from rooms
