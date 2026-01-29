# Event Landing Pages

## Overview

R-Link provides a full event landing page system that allows users to create public-facing registration pages for their events (webinars, live streams, meetings). The system consists of two parts: the **Event Landing Tab** (`/admin?tab=event-landing`) for creating and managing events in the admin portal, and the **EventLanding page** (`/event-landing?id={event_id}`) as the public-facing landing page that attendees see.

Event landing pages support 5 layout types, customizable hero content, registration forms, countdown timers, capacity/urgency indicators, and replay embedding. Events are stored as `Event` entities in Base44.

---

## Event Entity

The `Event` entity stores landing page configuration:

### Basic Information Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `id` | string | Auto-generated | Unique event identifier |
| `name` | string | Required | Event name (displayed as page title) |
| `description` | string | `""` | Internal description |
| `layout_type` | string | `"classic_saas"` | Landing page layout template (see 5 types below) |
| `format` | string | `"live"` | Event format: `"live"`, `"evergreen"`, or `"replay"` |
| `date_time_start` | string | Current datetime | ISO datetime of event start |
| `created_date` | string | Auto-set | ISO timestamp of creation |
| `updated_date` | string | Auto-set | ISO timestamp of last update |
| `created_by` | string | Auto-set | User ID of creator |

### Hero Content Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `hero_headline` | string | `""` | Main headline text (e.g., "Transform Your Business in 90 Days") |
| `hero_subheadline` | string | `""` | Supporting subheadline text |
| `hero_bullets` | array | `[]` | List of bullet point strings for value propositions |
| `cta_text` | string | `"Register Now"` | Call-to-action button text |
| `form_title` | string | `"Save Your Spot"` | Registration form heading |

### Capacity and Urgency Fields

| Field | Type | Default | Description |
|---|---|---|---|
| `capacity_total` | number | `100` | Total available spots |
| `capacity_remaining` | number | `100` | Remaining available spots |
| `show_countdown` | boolean | `true` | Display countdown timer to event start |
| `show_limited_seats` | boolean | `false` | Display limited seats warning |
| `seats_threshold_warning` | number | `10` | Show urgency when remaining spots fall below this number |

### Replay Fields

| Field | Type | Description |
|---|---|---|
| `replay_available_until` | string | ISO datetime of replay expiration |

---

## 5 Layout Types

R-Link offers five distinct layout templates for event landing pages:

### 1. Classic SaaS (`classic_saas`)

- **Description**: Two-column hero with the registration form on the side
- **Visual**: Left column contains hero content (headline, subheadline, bullets). Right column contains the registration form.
- **Best for**: B2B webinars, SaaS product demos, professional events
- **Component**: `ClassicSaasLayout`

### 2. Centered Big Promise (`centered_big_promise`)

- **Description**: Centered hero section with scrolling registration form below
- **Visual**: Large centered headline and subheadline at the top. Registration form stacks below the hero section.
- **Best for**: High-impact announcements, keynote events, single-speaker webinars
- **Component**: `CenteredBigPromiseLayout`

### 3. Background Card (`background_card`)

- **Description**: Full-width background with a centered card overlay
- **Visual**: Immersive background image or color with a floating card containing event details and registration form.
- **Best for**: Premium events, product launches, exclusive invitations
- **Component**: `BackgroundCardLayout`

### 4. Agenda First (`agenda_first`)

- **Description**: Agenda and speakers prominently displayed alongside registration
- **Visual**: Left section features the event agenda and speaker profiles. Right section contains the registration form.
- **Best for**: Multi-session conferences, panel discussions, educational series
- **Component**: `AgendaFirstLayout`

### 5. Evergreen On-Demand (`evergreen_on_demand`)

- **Description**: Watch-now or time slot picker for on-demand content
- **Visual**: Centered video/preview area with a watch-now button or time slot selection below.
- **Best for**: Evergreen webinars, on-demand training, recorded content distribution
- **Component**: `EvergreenOnDemandLayout`

---

## EventLandingTab (Admin Interface)

### Accessing the Event Landing Tab

1. Navigate to **Admin** > **Event Landing Pages** in the sidebar.
2. This tab is permission-gated (requires appropriate role permissions).

### Creating an Event

1. Click the **Create Event** button (purple-green gradient, top right).
2. The `EventModal` dialog opens with the following sections:

#### Basic Information Section

| Field | Input Type | Required | Description |
|---|---|---|---|
| **Event Name** | Text input | Yes | Placeholder: "My Amazing Event" |
| **Description** | Textarea | No | Placeholder: "Brief description for internal use" |
| **Layout Type** | Visual selector grid | Yes | 2-column grid showing all 5 layouts with visual previews. Each option shows a miniature wireframe representation, name, and description. Selected layout has a purple border and checkmark. If a demo event exists for a layout, a "Demo" preview button appears. |
| **Format** | Select dropdown | Yes | Options: Live, Evergreen, Replay |
| **Start Date & Time** | Datetime picker | Yes | Sets `date_time_start` |

#### Hero Content Section

| Field | Input Type | Description |
|---|---|---|
| **Headline** | Text input | Placeholder: "Transform Your Business in 90 Days" |
| **Subheadline** | Textarea | Placeholder: "Join thousands of successful entrepreneurs..." |
| **CTA Button Text** | Text input | Default: "Register Now" |

#### Capacity & Urgency Section

| Field | Input Type | Description |
|---|---|---|
| **Total Capacity** | Number input | Placeholder: 100 |
| **Remaining Spots** | Number input | Placeholder: 100 |
| **Show Countdown Timer** | Checkbox | Display countdown on landing page |
| **Show Limited Seats Warning** | Checkbox | Show urgency message when spots are low |

3. Click **Create Event** to save. The system calls `Event.create(data)`.

### Editing an Event

1. In the event list, click the **Edit** button (pencil icon) on the event card.
2. The `EventModal` opens pre-populated with the event's current data.
3. Modify fields and click **Update Event**.
4. The system calls `Event.update(id, data)`.

### Duplicating an Event

1. Click the **Duplicate** button (copy icon) on the event card.
2. A new event is created with all fields copied except `id`, `created_date`, `updated_date`, and `created_by`.
3. The name is appended with `" (Copy)"`.

### Deleting an Event

1. Click the **Delete** button (trash icon, red) on the event card.
2. A browser confirmation dialog appears: `Delete event "{event_name}"?`
3. Click OK to confirm. The system calls `Event.delete(id)`.

### Previewing an Event

1. Click the **Preview** button (eye icon) on the event card.
2. The event landing page opens in a new browser tab at the public URL.

### Copying the Event URL

1. Click the **Copy URL** button (copy icon) on the event card.
2. The full event URL is copied to the clipboard.
3. An alert confirms: "Event URL copied to clipboard!"

### Event Card Display

Each event in the list shows:
- **Event name** (bold, white)
- **Layout type** badge (indigo, showing the layout name)
- **Start date and time** (formatted as "MMM d, yyyy h:mm a")
- **Format** badge (purple, showing Live/Evergreen/Replay)
- **Capacity** (e.g., "85 / 100 spots remaining")
- **Description** (if provided)
- Action buttons: Preview, Copy URL, Edit, Duplicate, Delete

---

## EventLanding Page (Public-Facing)

### URL Structure

```
/event-landing?id={event_id}
```

Example: `https://app.rlink.com/event-landing?id=abc123`

### How the Page Works

1. The page reads the `id` query parameter from the URL.
2. It fetches the `Event` entity by ID from Base44.
3. Based on the `layout_type` field, it renders one of five layout components:
   - `classic_saas` -> `ClassicSaasLayout`
   - `centered_big_promise` -> `CenteredBigPromiseLayout`
   - `background_card` -> `BackgroundCardLayout`
   - `agenda_first` -> `AgendaFirstLayout`
   - `evergreen_on_demand` -> `EvergreenOnDemandLayout`

### Event State Logic

The page computes the event state based on the current time and event configuration:

| State Property | Condition | Effect |
|---|---|---|
| `is_live` | Format is "live" AND start date is in the future | Registration is open |
| `is_evergreen` | Format is "evergreen" | Always available for viewing |
| `is_replay_available` | Replay expiration date is in the future | Shows replay content |
| `show_countdown` | `show_countdown` is true AND format is "live" AND start date is in the future | Displays countdown timer |
| `show_scarcity` | `show_limited_seats` is true AND remaining spots <= `seats_threshold_warning` | Shows urgency message |

### Registration Flow

1. Attendee visits the event landing page URL.
2. The registration form is displayed (within the layout component).
3. Attendee fills in their details and clicks the CTA button.
4. The `registerMutation` runs:
   - Logs the registration data
   - Decreases `capacity_remaining` by 1 (if > 0)
   - Invalidates the event query to update the UI
5. The page reflects the updated capacity.

### Loading and Error States

- **Loading**: Shows a spinning loader with "Loading event..."
- **No event ID**: Shows "Event Not Found" with the message "No event ID provided"
- **Invalid event ID**: Shows "Event Not Found" with "The event you are looking for does not exist."

---

## Registration Forms and Flow (Register Page)

R-Link also has a dedicated **Register** page (`/register`) specifically for webinar registration:

### URL Structure

```
/register?webinar_id={scheduled_meeting_id}
```

### Registration Page Features

- Fetches the `ScheduledMeeting` entity by `webinar_id`
- Loads associated Brand Kit for visual styling
- Tracks registration count via `WebinarRegistration` entity
- Displays event details: date, time, attendee count

### Registration Form Fields

| Field | Required | Description |
|---|---|---|
| **Name** | Yes | Attendee's full name |
| **Email** | Yes | Attendee's email address |
| **Custom Fields** | Varies | Additional fields defined in the webinar configuration |

### Registration Process

1. Attendee submits the form.
2. A `WebinarRegistration` entity is created with:
   - `webinar_id` and `folder_id`: The webinar's ID
   - `name` and `email`: From the form
   - `custom_fields`: Any additional data
   - `approval_status`: `"pending"` if `require_approval` is enabled, otherwise `"approved"`
   - `status`: `"registered"`
   - `emails_sent.confirmation_sent`: `true`
   - `emails_sent.confirmation_sent_at`: Current ISO timestamp
3. If approval is required, the attendee sees a "Pending Approval" message.
4. Otherwise, the attendee sees a confirmation message.

---

## Countdown Timers

Countdown timers are displayed on event landing pages when:
- `show_countdown` is `true`
- Event `format` is `"live"`
- Event `date_time_start` is in the future

The countdown shows the remaining time until the event starts, creating urgency for registration.

---

## Replay Embedding

Events with replay available display replay content:
- The `replay_available_until` field determines how long the replay is accessible.
- If the current time is before `replay_available_until`, the replay is shown.
- Events with `format: "replay"` are always in replay mode.
- Events with `format: "evergreen"` offer on-demand access.

---

## Customization with Brand Kits

Event landing pages can be styled using the account's Brand Kit:
- The Register page explicitly fetches the Brand Kit associated with the webinar via `registration_page_branding.brand_kit_id`.
- Brand Kit colors, fonts, and logos are applied to the landing page layout.
- Each of the 5 layout components accepts the event data and applies the appropriate visual styling.

---

## Settings and Options

| Setting | Location | Default | Description |
|---|---|---|---|
| Layout Type | Event modal | `classic_saas` | Choose from 5 layout templates |
| Event Format | Event modal | `live` | Live, Evergreen, or Replay |
| Start Date/Time | Event modal | Current datetime | When the event begins |
| Headline | Event modal | Empty | Main headline text |
| Subheadline | Event modal | Empty | Supporting text |
| CTA Button Text | Event modal | "Register Now" | Registration button label |
| Form Title | Event modal | "Save Your Spot" | Registration form heading |
| Total Capacity | Event modal | 100 | Maximum registrations |
| Remaining Spots | Event modal | 100 | Current availability |
| Show Countdown | Event modal | On | Display countdown timer |
| Show Limited Seats | Event modal | Off | Display urgency warning |
| Seats Warning Threshold | Event modal | 10 | When to show scarcity message |

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| "Event Not Found" on landing page | Invalid or missing event ID in URL | Verify the URL contains a valid `?id=` parameter; check that the event exists in the admin tab |
| Countdown timer not showing | Event format is not "live", or start date is in the past, or `show_countdown` is off | Verify event format is "live", start date is in the future, and countdown is enabled |
| Registration form not accepting submissions | Capacity remaining is 0 | Increase `capacity_remaining` in the event settings |
| Event URL not working after sharing | Event was deleted | Check the Events list in admin; deleted events cannot be accessed |
| Layout not rendering correctly | Invalid `layout_type` value | Edit the event and re-select the layout type |
| "Loading event..." spinner persists | Network issue or Base44 API timeout | Check network connectivity; refresh the page |
| Scarcity warning not showing | `show_limited_seats` is off, or remaining spots are above threshold | Enable "Show Limited Seats Warning" and ensure remaining spots are below the threshold |
| Demo preview button not appearing | No event exists with that layout type | Create at least one event with each layout type to enable demo previews |
| Duplicate event has wrong date | Duplication copies all fields including date | Edit the duplicated event to set the correct start date |

---

## FAQ

**Q: How do I share my event landing page?**
A: In the Event Landing admin tab, click the Copy URL button on the event card. The full URL is copied to your clipboard in the format `/event-landing?id={event_id}`. Share this URL with your audience.

**Q: Can I have multiple event landing pages?**
A: Yes. There is no documented limit on the number of events you can create. Each event has its own unique URL.

**Q: What is the difference between the event formats?**
A: "Live" events have a specific start time with countdown. "Evergreen" events are available on-demand at any time. "Replay" events show recorded content.

**Q: How does the countdown timer work?**
A: The countdown timer automatically calculates the time remaining until `date_time_start` and displays it on the landing page. It only appears for "live" format events when the start time is in the future.

**Q: Can I customize the registration form fields?**
A: The event landing page uses a standard registration form. Custom fields can be configured through the webinar registration system (Register page) which supports additional custom fields.

**Q: How do I track registrations?**
A: Registration data is captured when attendees submit the form. The event's `capacity_remaining` decreases automatically. Lead data from registrations appears in the Leads tab.

**Q: Can I preview the landing page before publishing?**
A: Yes. Click the Preview button (eye icon) on the event card to open the public landing page in a new tab.

**Q: What happens when an event reaches full capacity?**
A: When `capacity_remaining` reaches 0, no additional registrations can be submitted through the landing page.

---

## Known Limitations

1. **No draft/publish workflow**: Events are immediately live at their URL once created. There is no draft state or publish toggle.
2. **Simple registration**: The event landing page registration captures basic data but does not support custom field configuration (unlike the Register page for webinars).
3. **No A/B testing**: Only one layout can be active per event. There is no built-in A/B testing for different layouts.
4. **Manual capacity management**: The `capacity_remaining` field must be manually set or is decremented by 1 per registration. There is no automatic sync with actual session attendance.
5. **No SEO metadata**: Event landing pages do not have configurable meta tags, Open Graph data, or SEO settings.
6. **Confirmation via browser alert**: URL copy confirmation uses a browser `alert()` rather than a toast notification.
7. **Delete confirmation via browser confirm**: Event deletion uses a browser `confirm()` dialog rather than a styled modal.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Event Landing Tab Access | Yes | Yes |
| Create Event Landing Pages | Yes | Yes |
| All 5 Layout Types | Yes | Yes |
| Countdown Timer | Yes | Yes |
| Capacity Management | Yes | Yes |
| Webinar Registration (Register page) | No | Yes |
| Brand Kit Customization | Yes (basic) | Yes (full) |
| CRM Integration for Registrations | No | Yes |

---

## Related Documents

- [01-platform-overview.md](./01-platform-overview.md) -- Platform pages and navigation
- [07-webinars.md](./07-webinars.md) -- Webinar session type and attendee management
- [28-leads-and-analytics.md](./28-leads-and-analytics.md) -- Lead capture from registrations
- [11-brand-kit.md](./11-brand-kit.md) -- Brand Kit customization for landing pages
- [30-viewer-replay-sharing.md](./30-viewer-replay-sharing.md) -- Viewer and Replay page details
- [32-admin-dashboard-reference.md](./32-admin-dashboard-reference.md) -- Complete admin tab reference
