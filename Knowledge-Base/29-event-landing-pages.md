# Event Landing Pages

## Overview

R-Link provides a full event landing page system for promoting events, collecting registrations, and driving attendance. The system consists of two parts: the **EventLandingTab** (admin interface for creating and managing event pages) and the **EventLanding** public page (the attendee-facing landing page). The system supports five distinct layout types, multiple event states (live, evergreen, replay, countdown, scarcity), and a complete registration workflow with custom fields and approval.

---

## Event Entity

The `Event` entity stores all data for an event landing page and its associated public registration experience.

### Entity Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (auto-generated) |
| `name` | string | Event title displayed on the landing page and in admin |
| `layout_type` | string | One of 5 layout types that determines the page design |
| `format` | string | `'live'` or `'evergreen'` -- determines event behavior |
| `date_time_start` | datetime | Scheduled start date and time for the event |
| `show_countdown` | boolean | Whether to display a countdown timer on the landing page |
| `show_limited_seats` | boolean | Whether to display remaining seat count as a scarcity indicator |
| `capacity_remaining` | number | Number of available seats remaining; decremented on each registration |
| `seats_threshold_warning` | number | When `capacity_remaining` falls below this number, a warning is shown |
| `replay_available_until` | datetime | Deadline after which the replay is no longer accessible |
| `description` | string | Event description/body content for the landing page |
| `speakers` | array | List of speakers with name, title, bio, and avatar |
| `agenda` | array | Structured agenda items with time, title, and description |
| `cta_text` | string | Call-to-action button text |
| `branding` | object | Visual branding overrides (colors, images, logo) |
| `account_id` | string | The account that owns this event |
| `created_date` | datetime | When the event was created |
| `updated_date` | datetime | When the event was last modified |

### Format Values

| Value | Behavior |
|-------|----------|
| `'live'` | Event occurs at a specific date/time. Shows countdown before, live status during, and replay after. |
| `'evergreen'` | Event is always available on-demand. No countdown; always shows as available. |

---

## Layout Types

R-Link offers five layout types for event landing pages. Each layout type is a distinct React component that renders the landing page with a different visual design and content structure.

### 1. Classic SaaS Layout

| Property | Value |
|----------|-------|
| Code value | `'classic_saas'` |
| Component | `ClassicSaasLayout` |
| Description | Traditional SaaS-style landing page with hero section, feature highlights, speaker bios, and registration CTA |

**Design Characteristics:**
- Clean, professional design with a prominent hero section at the top.
- Left-aligned headline with right-aligned registration form.
- Feature/benefit bullet points below the hero.
- Speaker section with profile cards.
- Agenda section with timeline format.
- Sticky CTA button on scroll.

**Best For:** B2B webinars, product launches, professional conferences.

### 2. Centered Big Promise Layout

| Property | Value |
|----------|-------|
| Code value | `'centered_big_promise'` |
| Component | `CenteredBigPromiseLayout` |
| Description | High-impact centered layout with a bold headline and prominent CTA |

**Design Characteristics:**
- Large, centered headline ("the big promise") that fills the viewport.
- Minimal distractions above the fold; focused on the value proposition.
- Registration form appears below or in an overlay on CTA click.
- Social proof section (testimonials, attendee counts).
- Countdown timer prominently displayed when `show_countdown` is true.

**Best For:** Marketing events, product reveals, high-conversion landing pages.

### 3. Background Card Layout

| Property | Value |
|----------|-------|
| Code value | `'background_card'` |
| Component | `BackgroundCardLayout` |
| Description | Full-bleed background image with a floating card containing event details and registration |

**Design Characteristics:**
- Full-width background image or gradient.
- Floating white/dark card centered on the page with event details.
- Registration form embedded within the card.
- Minimal scrolling; most content visible above the fold.
- Elegant, event-style presentation.

**Best For:** Exclusive events, galas, premium webinars, VIP sessions.

### 4. Agenda First Layout

| Property | Value |
|----------|-------|
| Code value | `'agenda_first'` |
| Component | `AgendaFirstLayout` |
| Description | Agenda-focused layout that leads with the event schedule and session details |

**Design Characteristics:**
- Compact header with event name and date.
- Full agenda displayed prominently as the primary content.
- Each agenda item expandable with session details, speaker info, and time.
- Registration CTA fixed to the bottom or sidebar.
- Best for multi-session events where attendees care about the schedule.

**Best For:** Conferences, multi-session workshops, day-long events, summits.

### 5. Evergreen On-Demand Layout

| Property | Value |
|----------|-------|
| Code value | `'evergreen_on_demand'` |
| Component | `EvergreenOnDemandLayout` |
| Description | Layout optimized for always-available, on-demand content without time constraints |

**Design Characteristics:**
- No countdown timer (evergreen events have no fixed start time).
- "Watch Now" CTA instead of "Register" CTA.
- Emphasis on content preview (thumbnail, description, key takeaways).
- Viewer testimonials and engagement stats.
- Immediate access flow; no registration form by default (configurable).

**Best For:** Evergreen webinars, on-demand training, always-available product demos.

### Layout Type Selection Guide

| Use Case | Recommended Layout |
|----------|-------------------|
| Standard B2B webinar | `classic_saas` |
| High-impact product launch | `centered_big_promise` |
| Premium/exclusive event | `background_card` |
| Multi-session conference | `agenda_first` |
| On-demand/evergreen content | `evergreen_on_demand` |

### Common Customer Questions About Layouts

**Q: Can I switch the layout type after creating an event?**
A: Yes. Changing the layout type re-renders the landing page with the new design. Your content (title, description, speakers, agenda) is preserved, but you may need to adjust some content to fit the new layout's structure.

**Q: Can I customize the layout beyond the provided options?**
A: Each layout type supports customization through the branding settings (colors, images, logo). For more extensive customization, the Enterprise plan offers additional options. Fully custom layouts are not currently supported.

**Q: Which layout converts best?**
A: Conversion depends on your audience and content. `centered_big_promise` tends to perform well for high-urgency events with a clear value proposition. `classic_saas` is a reliable choice for professional B2B events. We recommend A/B testing different layouts if you run recurring events.

---

## Event State Logic

The EventLanding public page dynamically adjusts its display based on computed event states. These states are derived from the Event entity fields and the current date/time.

### Computed States

| State | Field/Condition | Behavior |
|-------|----------------|----------|
| `is_live` | Current time is between `date_time_start` and event end time | Shows "Live Now" indicator, enables join button, hides countdown |
| `is_evergreen` | `format === 'evergreen'` | Shows "Watch Now" CTA, no countdown, always available |
| `is_replay_available` | Event has ended AND current time is before `replay_available_until` | Shows "Watch Replay" CTA, displays replay expiration notice |
| `show_countdown` | `show_countdown === true` AND event has not started | Displays countdown timer to `date_time_start` |
| `show_scarcity` | `show_limited_seats === true` AND `capacity_remaining <= seats_threshold_warning` | Displays "Only X seats remaining" warning |

### State Transitions

```
BEFORE EVENT:
  - show_countdown = true  -> Display countdown timer
  - show_scarcity = true AND capacity_remaining <= seats_threshold_warning
                           -> Display scarcity warning
  - Registration is open

DURING EVENT (is_live = true):
  - Countdown timer disappears
  - "Live Now" badge appears
  - CTA changes to "Join Now"
  - Registration may still be open (depends on configuration)

AFTER EVENT (is_live = false, event ended):
  - If replay_available_until > now:
    - is_replay_available = true
    - CTA changes to "Watch Replay"
    - Shows replay expiration date
  - If replay_available_until <= now OR not set:
    - Shows "Event has ended" message
    - Registration is closed

EVERGREEN (is_evergreen = true):
  - No countdown timer
  - Always shows "Watch Now" CTA
  - No scarcity indicators (unless explicitly configured)
  - Always available; no state transitions
```

### State Priority

When multiple states could apply, the following priority order is used:

1. `is_live` (highest) -- If the event is live, show the live experience.
2. `is_evergreen` -- Evergreen events override time-based states.
3. `is_replay_available` -- Post-event replay takes precedence over ended state.
4. `show_countdown` -- Pre-event countdown.
5. `show_scarcity` -- Scarcity indicators overlay on top of other states.

### Common Customer Questions About Event States

**Q: My event is live but the landing page still shows the countdown. Why?**
A: The event state is determined by comparing the current time to `date_time_start`. Check that:
1. The `date_time_start` is set correctly (including the correct timezone).
2. The user's browser clock is accurate.
3. The page may need to be refreshed to pick up the state change.

**Q: How do I extend the replay availability?**
A: Update the `replay_available_until` field in the EventLandingTab. Set it to a future date to make the replay available for longer.

**Q: I set show_limited_seats to true but no scarcity warning is showing.**
A: The scarcity warning only appears when `capacity_remaining` falls below `seats_threshold_warning`. If there are still many seats available (above the threshold), the warning will not appear yet.

**Q: How do I make an event always available?**
A: Set the `format` to `'evergreen'`. This removes all time-based behavior and shows the event as always available.

---

## Registration and Capacity

### Registration Flow

When a visitor registers for an event on the landing page:

```
1. Visitor fills out the registration form (name, email, custom fields).
2. System creates a WebinarRegistration entity.
3. System decrements capacity_remaining by 1.
4. If require_approval is enabled:
   a. Registration status is set to 'pending'.
   b. Admin reviews and approves/rejects in the EventLandingTab.
   c. On approval, confirmation email is sent.
5. If require_approval is NOT enabled:
   a. Registration status is set to 'registered'.
   b. Confirmation email is sent immediately.
6. If show_limited_seats is true, the landing page updates to reflect the new capacity_remaining.
```

### Capacity Decrement

- `capacity_remaining` is decremented by 1 for each new registration.
- The decrement happens at registration time, regardless of approval status (even pending registrations count against capacity).
- When `capacity_remaining` reaches 0, the registration form is disabled and a "Sold Out" or "Full" message is displayed.
- If a registration is canceled or rejected, `capacity_remaining` is incremented back by 1.

### Scarcity Display

When `show_limited_seats === true` and `capacity_remaining <= seats_threshold_warning`:

- A visual warning is displayed on the landing page (e.g., "Only 5 seats remaining!").
- The exact text and styling depend on the layout type.
- This creates urgency and encourages faster registration.

### Common Customer Questions About Registration

**Q: Someone registered but I did not approve them yet. Does their registration count against the capacity?**
A: Yes. Pending registrations decrement `capacity_remaining` immediately. This prevents overbooking. If you reject the registration, the capacity is restored.

**Q: How do I increase the capacity after the event is created?**
A: Edit the event in the EventLandingTab and update the `capacity_remaining` field. You can set it to any number.

**Q: Can I turn off capacity limits entirely?**
A: Set `show_limited_seats` to `false` and set `capacity_remaining` to a very large number. This effectively removes capacity limits.

---

## Register Page

The Register page is accessible at `/register?webinar_id={id}` and provides the full registration experience for scheduled events.

### URL Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `webinar_id` | string | The ID of the ScheduledMeeting entity for the event |

### ScheduledMeeting Entity

The ScheduledMeeting entity represents a scheduled event that users can register for.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `name` | string | Event name |
| `date_time_start` | datetime | Scheduled start time |
| `account_id` | string | Owning account |
| `room_id` | string | Associated room |
| `registration_enabled` | boolean | Whether registration is open |
| `require_approval` | boolean | Whether registrations require admin approval |
| `custom_fields` | array | Custom registration form fields |
| `registration_page_branding` | object | Branding configuration for the registration page |

### WebinarRegistration Entity

Each registration creates a `WebinarRegistration` entity.

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `webinar_id` | string | Reference to the ScheduledMeeting |
| `folder_id` | string | Folder/organizational reference |
| `name` | string | Registrant's full name |
| `email` | string | Registrant's email address |
| `custom_fields` | object | Responses to custom registration fields |
| `approval_status` | string | `'pending'` or `'approved'` |
| `status` | string | `'registered'` |
| `emails_sent` | array | Record of emails sent to this registrant |

### Custom Registration Fields

The registration form supports custom fields beyond name and email.

| Field Type | Code Value | Description |
|-----------|------------|-------------|
| Text input | `'text'` | Single-line text input |
| Email input | `'email'` | Email-formatted input with validation |
| Phone input | `'phone'` | Phone number input |
| Text area | `'textarea'` | Multi-line text input |
| Select dropdown | `'select'` | Dropdown with predefined options |

**Custom Field Configuration:**
- Custom fields are defined in the `ScheduledMeeting.custom_fields` array.
- Each field has a `type`, `label`, `required` flag, and (for `select` type) an `options` array.
- Custom field responses are stored in `WebinarRegistration.custom_fields` as key-value pairs.
- Custom fields appear in lead capture data and CSV exports.

### Approval Workflow

When `require_approval` is set to `true` on the ScheduledMeeting:

```
1. Visitor submits registration form.
2. WebinarRegistration is created with:
   - approval_status = 'pending'
   - status = 'registered'
3. Admin receives notification of pending registration.
4. Admin reviews the registration in the EventLandingTab.
5. Admin approves or rejects:
   a. APPROVE: approval_status changes to 'approved'.
      - Confirmation email sent to registrant.
      - Registrant receives join link.
   b. REJECT: Registration is removed or marked as rejected.
      - capacity_remaining is incremented by 1.
      - Optional rejection notification sent.
```

**Approval Behavior Notes:**
- Pending registrations can access the landing page but cannot join the event until approved.
- The admin can bulk-approve or individually approve registrations.
- Late registrations (after event start) follow the same approval flow if `require_approval` is enabled.

### Registration Page Branding

The registration page's visual appearance is controlled by `registration_page_branding`.

| Field | Type | Description |
|-------|------|-------------|
| `brand_kit_id` | string | Reference to a BrandKit for consistent styling |

**Behavior:**
- When `brand_kit_id` is set, the registration page inherits the BrandKit's colors, fonts, and logo.
- If not set, the account's default BrandKit is used.
- The registration page branding is independent of the event landing page branding, allowing different visual treatments.

### Common Customer Questions About Registration

**Q: Can I add custom questions to the registration form?**
A: Yes. In the EventLandingTab, you can add custom fields to the registration form. Supported types are text, email, phone, textarea, and select (dropdown).

**Q: A registrant says they never received a confirmation email. What should I check?**
A: Check the `emails_sent` field on their WebinarRegistration record. If the email was sent, ask them to check spam. If `require_approval` is enabled, verify that their `approval_status` is `'approved'` -- emails are not sent until approval.

**Q: Can I export registration data?**
A: Yes. Registration data feeds into the LeadsTab and can be exported via CSV. Custom field responses are included in the export.

**Q: How do I disable registration for a past event?**
A: Set `registration_enabled` to `false` on the ScheduledMeeting. The registration form will no longer appear on the landing page.

---

## EventLandingTab (Admin Interface)

The EventLandingTab is the admin-side management interface for creating and configuring event landing pages.

### Features

| Feature | Description |
|---------|-------------|
| Create event | Create a new event with name, format, layout type, and schedule |
| Edit event | Modify all event fields including content, layout, and settings |
| Preview | Live preview of the public landing page |
| Registration management | View, approve, reject, and export registrations |
| Analytics | View page views, registration conversion rate, and attendance data |
| Duplicate | Clone an existing event configuration for reuse |
| Delete | Remove an event and its associated landing page |

### Event Creation Workflow

1. Click "Create Event" in the EventLandingTab.
2. Enter the event name.
3. Select the format (`live` or `evergreen`).
4. Select the layout type (one of 5 options).
5. Configure event details (date, description, speakers, agenda).
6. Set capacity and scarcity settings.
7. Configure registration fields and approval workflow.
8. Apply branding.
9. Preview the landing page.
10. Publish the event.

---

## Troubleshooting

### Landing Page Shows Wrong State

**Possible Causes:**
- `date_time_start` is set to the wrong timezone.
- The event format is `evergreen` when it should be `live` (or vice versa).
- The user's browser time is incorrect.

**Resolution Steps:**
1. Verify `date_time_start` is correct, including timezone.
2. Verify the `format` field matches the intended event behavior.
3. Ask the user to refresh the page.
4. Check if the account timezone matches the intended timezone.

### Registration Form Not Appearing

**Possible Causes:**
- `registration_enabled` is set to `false`.
- `capacity_remaining` has reached 0 (sold out).
- The event has ended and the post-event state does not show registration.

**Resolution Steps:**
1. Check `registration_enabled` on the ScheduledMeeting.
2. Check `capacity_remaining`. If 0, increase it or confirm the event is sold out.
3. Verify the event has not ended. Post-event pages do not show registration by default.

### Countdown Timer Shows Wrong Time

**Possible Causes:**
- `date_time_start` timezone mismatch.
- The user's device clock is not synchronized.
- Daylight saving time discrepancy.

**Resolution Steps:**
1. Verify `date_time_start` in the Event entity.
2. Ask the user what time and timezone they expect to see.
3. Compare with the stored `date_time_start` value.
4. If there is a timezone mismatch, update `date_time_start` to the correct UTC value.

### Scarcity Warning Not Showing

**Possible Causes:**
- `show_limited_seats` is `false`.
- `capacity_remaining` is still above `seats_threshold_warning`.

**Resolution Steps:**
1. Verify `show_limited_seats` is `true`.
2. Check the current `capacity_remaining` and `seats_threshold_warning` values.
3. The warning only displays when `capacity_remaining <= seats_threshold_warning`.

### Approval Emails Not Sending

**Possible Causes:**
- The registration is still in `pending` status (not yet approved).
- The admin's email notification settings have emails disabled.
- Email delivery service issue.

**Resolution Steps:**
1. Verify the registration's `approval_status`. Emails are sent on approval, not on registration.
2. Check the `emails_sent` array on the WebinarRegistration.
3. If the email should have been sent but was not, escalate to engineering to check email delivery logs.

---

## Internal Reference

### Entity Relationships

```
Event (landing page configuration)
  |-- Account (owner via account_id)
  |-- ScheduledMeeting (registration/scheduling)
  |     |-- WebinarRegistration[] (individual registrations)
  |     |     |-- custom_fields (registration responses)
  |     |     |-- emails_sent (email history)
  |     |-- custom_fields (form field definitions)
  |     |-- registration_page_branding
  |           |-- BrandKit (via brand_kit_id)
  |-- Layout Component (determined by layout_type)
```

### Layout Type to Component Mapping

| `layout_type` value | React Component |
|---------------------|----------------|
| `'classic_saas'` | `ClassicSaasLayout` |
| `'centered_big_promise'` | `CenteredBigPromiseLayout` |
| `'background_card'` | `BackgroundCardLayout` |
| `'agenda_first'` | `AgendaFirstLayout` |
| `'evergreen_on_demand'` | `EvergreenOnDemandLayout` |

### Related Admin Tabs

- **EventLandingTab** (`?tab=event-landing`): Admin management interface
- **ScheduleTab** (`?tab=schedule`): Broader scheduling context
- **LeadsTab** (`?tab=leads`): Registration data feeds into leads
- **BrandKitTab** (`?tab=brand-kit`): BrandKits applied to landing and registration pages
- **RoomsTab** (`?tab=rooms`): Rooms associated with events

### Public Pages

- **EventLanding**: `/event-landing/{eventId}` -- Public landing page
- **Register**: `/register?webinar_id={id}` -- Registration page
