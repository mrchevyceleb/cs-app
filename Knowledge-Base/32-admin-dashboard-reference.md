# Admin Dashboard Reference

## Overview

The R-Link Admin Dashboard is the central management interface for all platform features. It is organized into **18 tabs**, accessed via the `?tab=` URL parameter, and navigated through the **AdminSidebar** which groups tabs into 5 logical sections. The dashboard also includes a **NotificationsPanel** for real-time alerts and a **DashboardTab** as the default landing view. This document provides a comprehensive reference for all tabs, their components, props, access levels, plan requirements, sidebar organization, and data fetching architecture.

---

## Tab Access via URL Parameter

All Admin Dashboard tabs are accessed by setting the `?tab=` URL parameter.

### URL Format

```
https://app.r-link.com/admin?tab={tabId}
```

### Example URLs

| Tab | URL |
|-----|-----|
| Dashboard | `?tab=dashboard` |
| Account | `?tab=account` |
| Rooms | `?tab=rooms` |
| Schedule | `?tab=schedule` |
| Recordings | `?tab=recordings` |
| Clips | `?tab=clips` |
| Brand Kit | `?tab=brand-kit` |
| Team | `?tab=team` |
| Roles | `?tab=roles` |
| Templates | `?tab=templates` |
| Billing | `?tab=billing` |
| Integrations | `?tab=integrations` |
| Settings | `?tab=settings` |
| Support | `?tab=support` |
| Notetaker | `?tab=notetaker` |
| Leads | `?tab=leads` |
| Event Landing | `?tab=event-landing` |
| Elements | `?tab=elements` |

### URL Behavior

- If no `?tab=` parameter is provided, the dashboard defaults to the `dashboard` tab.
- If an invalid `?tab=` value is provided, the dashboard falls back to the `dashboard` tab.
- Tab changes update the URL parameter without a full page reload (client-side routing).
- The URL is shareable; opening a link with a `?tab=` parameter navigates directly to that tab.
- Tab access is subject to user role permissions; if a user does not have access to a tab, they are redirected to the dashboard.

---

## All 18 Tabs: Complete Reference

### 1. DashboardTab

| Property | Value |
|----------|-------|
| Tab ID | `dashboard` |
| Component | `DashboardTab` |
| Props | `accountId`, `user` |
| Access Level | All authenticated users |
| Plan Requirement | All plans |

**Description:** The default landing page of the Admin Dashboard. Provides an at-a-glance overview of account activity, upcoming events, recent recordings, usage metrics, and quick actions.

**DashboardTab Detail:**
- **Upcoming Events Widget**: Shows the next 3-5 scheduled events with name, date, and quick join/edit actions.
- **Recent Recordings Widget**: Displays the latest recordings with thumbnail, title, duration, and view count.
- **Usage Overview Widget**: Shows current usage against plan limits (rooms created, storage used, minutes consumed, team members).
- **Quick Actions**: Shortcuts to common tasks (create room, schedule event, invite team member).
- **Activity Feed**: Recent account activity (new registrations, recordings processed, team member actions).
- **Plan Status Banner**: Displays current plan, status, and upgrade prompts if approaching limits.

### 2. AccountTab

| Property | Value |
|----------|-------|
| Tab ID | `account` |
| Component | `AccountTab` |
| Props | `accountId` |
| Access Level | Account owner, administrators |
| Plan Requirement | All plans |

**Description:** Manages account-level information including company name, owner details, contact information, timezone, and locale. See the Account Management KB article for full detail.

### 3. RoomsTab

| Property | Value |
|----------|-------|
| Tab ID | `rooms` |
| Component | `RoomsTab` |
| Props | `accountId` |
| Access Level | All authenticated users (create/edit restricted by role) |
| Plan Requirement | All plans (room count limited by plan) |

**Description:** Lists all rooms for the account. Supports creating new rooms, editing room configurations, deleting rooms, and launching live sessions. Rooms can be filtered by status (active, ended, scheduled) and searched by name.

### 4. ScheduleTab

| Property | Value |
|----------|-------|
| Tab ID | `schedule` |
| Component | `ScheduleTab` |
| Props | `accountId` |
| Access Level | All authenticated users (create/edit restricted by role) |
| Plan Requirement | All plans |

**Description:** Calendar-based view of all scheduled events and meetings. Supports creating new scheduled events, editing existing ones, and viewing registration counts. Integrates with the Event Landing system for webinar scheduling.

### 5. RecordingsTab

| Property | Value |
|----------|-------|
| Tab ID | `recordings` |
| Component | `RecordingsTab` |
| Props | `accountId` |
| Access Level | All authenticated users (delete restricted by role) |
| Plan Requirement | All plans (storage limited by plan) |

**Description:** Lists all recordings for the account. Supports playback, download, sharing, clip creation, and deletion. Shows recording status (processing, ready, failed), duration, and view count. Integrates with the Replay page and Clips system.

### 6. ClipsTab

| Property | Value |
|----------|-------|
| Tab ID | `clips` |
| Component | `ClipsTab` |
| Props | `accountId` |
| Access Level | All authenticated users (create/share restricted by role) |
| Plan Requirement | Pro and above |

**Description:** Manages repurposed clips extracted from recordings. Supports creating clips from recordings, editing clip metadata, sharing via SharedClip, viewing clip analytics, and deleting clips. Integrates with ClipAnalytics for engagement tracking.

### 7. BrandKitTab

| Property | Value |
|----------|-------|
| Tab ID | `brand-kit` |
| Component | `BrandKitTab` |
| Props | `accountId` |
| Access Level | Account owner, administrators |
| Plan Requirement | All plans (multiple BrandKits on Pro and above) |

**Description:** Manages visual branding for the account. Supports creating and editing BrandKits (colors, fonts, logos), setting a default BrandKit, and previewing branding across rooms and landing pages. The default BrandKit is auto-created during account setup.

### 8. TeamTab

| Property | Value |
|----------|-------|
| Tab ID | `team` |
| Component | `TeamTab` |
| Props | `accountId` |
| Access Level | Account owner, administrators |
| Plan Requirement | All plans (team size limited by plan) |

**Description:** Manages team members for the account. Supports inviting new members, editing member roles, removing members, and viewing member activity. Respects `allowed_email_domains` from security settings. Integrates with the Roles system for permission management.

### 9. RolesTab

| Property | Value |
|----------|-------|
| Tab ID | `roles` |
| Component | `RolesTab` |
| Props | `accountId` |
| Access Level | Account owner, administrators |
| Plan Requirement | Pro and above |

**Description:** Manages custom roles and permissions for the account. Supports creating roles with granular permissions, editing existing roles, assigning roles to team members, and deleting custom roles. Default roles (owner, admin, member) cannot be deleted.

### 10. TemplatesTab

| Property | Value |
|----------|-------|
| Tab ID | `templates` |
| Component | `TemplatesTab` |
| Props | `accountId` |
| Access Level | All authenticated users (create/edit restricted by role) |
| Plan Requirement | All plans (AI assistant on Pro and above) |

**Description:** Manages room templates. Supports CRUD operations, setting default template, duplicating templates, and AI-assisted template creation. See the Templates KB article for full detail.

### 11. BillingTab

| Property | Value |
|----------|-------|
| Tab ID | `billing` |
| Component | `BillingTab` |
| Props | `accountId` |
| Access Level | Account owner only |
| Plan Requirement | All plans |

**Description:** Manages subscription and billing. Shows current plan, plan status, billing cycle, payment method, invoice history, and next renewal date. Supports plan upgrades/downgrades, payment method updates, and invoice downloads.

### 12. IntegrationsTab

| Property | Value |
|----------|-------|
| Tab ID | `integrations` |
| Component | `IntegrationsTab` |
| Props | `accountId` |
| Access Level | Account owner, administrators |
| Plan Requirement | Pro and above |

**Description:** Manages third-party integrations. Supports connecting CRM platforms, calendar integrations, streaming services (RTMP), and other external tools. Each integration has its own authentication flow and configuration. See also the CRM integration section in the Leads and Analytics KB article.

### 13. SettingsTab

| Property | Value |
|----------|-------|
| Tab ID | `settings` |
| Component | `SettingsTab` |
| Props | `accountId` |
| Access Level | Account owner, administrators |
| Plan Requirement | All plans (some features plan-restricted) |

**Description:** Manages account-wide settings including security (2FA, domain restrictions, session timeout), active sessions, notification preferences, and streaming integrations. See the Account Management KB article for full detail.

### 14. SupportTab

| Property | Value |
|----------|-------|
| Tab ID | `support` |
| Component | `SupportTab` |
| Props | `accountId` |
| Access Level | All authenticated users |
| Plan Requirement | All plans (priority support on Enterprise) |

**Description:** Access to help resources, documentation, and support channels. Supports submitting support tickets, browsing help articles, viewing system status, and accessing live chat (plan-dependent). Enterprise plans receive priority support with dedicated channels.

### 15. NotetakerTab

| Property | Value |
|----------|-------|
| Tab ID | `notetaker` |
| Component | `NotetakerTab` |
| Props | `accountId` |
| Access Level | All authenticated users |
| Plan Requirement | Pro and above |

**Description:** AI-powered meeting notes and action items. Automatically generates meeting summaries, key takeaways, action items, and follow-up tasks from recorded sessions. Integrates with the Recordings and Transcript systems. Notes can be exported and shared.

### 16. LeadsTab

| Property | Value |
|----------|-------|
| Tab ID | `leads` |
| Component | `LeadsTab` |
| Props | `accountId` |
| Access Level | Account owner, administrators, sales roles |
| Plan Requirement | Pro and above |

**Description:** Centralized lead management with capture, scoring, tagging, and export. See the Leads and Analytics KB article for full detail.

### 17. EventLandingTab

| Property | Value |
|----------|-------|
| Tab ID | `event-landing` |
| Component | `EventLandingTab` |
| Props | `accountId` |
| Access Level | All authenticated users (create/edit restricted by role) |
| Plan Requirement | All plans (advanced layouts on Pro and above) |

**Description:** Creates and manages event landing pages with 5 layout types, registration forms, and branding. See the Event Landing Pages KB article for full detail.

### 18. ElementsTab

| Property | Value |
|----------|-------|
| Tab ID | `elements` |
| Component | `ElementsTab` |
| Props | `accountId` |
| Access Level | All authenticated users (create/edit restricted by role) |
| Plan Requirement | All plans |

**Description:** Manages reusable room elements including polls, banners, CTAs, overlays, and other interactive components that can be added to rooms during live sessions. Elements are stored at the account level and can be reused across multiple rooms.

---

## AdminSidebar

The AdminSidebar is the primary navigation component for the Admin Dashboard. It organizes all 18 tabs into 5 logical groups.

### Sidebar Group Structure

#### Group 1: Overview

| Tab ID | Label | Icon |
|--------|-------|------|
| `dashboard` | Dashboard | LayoutDashboard |
| `account` | Account | Building |
| `schedule` | Schedule | Calendar |

**Purpose:** Top-level account information and scheduling overview.

#### Group 2: Content

| Tab ID | Label | Icon |
|--------|-------|------|
| `rooms` | Rooms | Video |
| `recordings` | Recordings | Film |
| `clips` | Clips | Scissors |
| `elements` | Elements | Puzzle |
| `templates` | Templates | LayoutTemplate |

**Purpose:** All content creation and management tools.

#### Group 3: Marketing

| Tab ID | Label | Icon |
|--------|-------|------|
| `event-landing` | Event Landing | Globe |
| `leads` | Leads | Users |
| `brand-kit` | Brand Kit | Palette |

**Purpose:** Marketing, branding, and lead management tools.

#### Group 4: Organization

| Tab ID | Label | Icon |
|--------|-------|------|
| `team` | Team | UserPlus |
| `roles` | Roles | Shield |
| `notetaker` | Notetaker | FileText |
| `integrations` | Integrations | Plug |

**Purpose:** Team management, permissions, AI tools, and external integrations.

#### Group 5: System

| Tab ID | Label | Icon |
|--------|-------|------|
| `billing` | Billing | CreditCard |
| `settings` | Settings | Settings |
| `support` | Support | HelpCircle |

**Purpose:** Account administration, billing, and support.

### Sidebar Behavior

- The sidebar is always visible on desktop viewports (left-side panel).
- On mobile viewports, the sidebar collapses into a hamburger menu.
- The currently active tab is highlighted in the sidebar.
- Clicking a tab in the sidebar updates the `?tab=` URL parameter and renders the corresponding component.
- Tabs that the user does not have permission to access are either hidden or shown as disabled (depending on the access restriction type).
- Plan-restricted tabs show a lock icon or "Upgrade" badge for users on plans that do not include the feature.

### Sidebar Visual Indicators

| Indicator | Meaning |
|-----------|---------|
| Active highlight | Currently selected tab |
| Lock icon | Feature requires a plan upgrade |
| Badge/count | Number of pending items (e.g., pending registrations, unread notifications) |
| Disabled/grayed | User's role does not have permission to access this tab |

---

## NotificationsPanel

The NotificationsPanel provides real-time notifications within the Admin Dashboard.

### Access

- The NotificationsPanel is accessible via a bell icon in the dashboard header.
- Clicking the bell opens a dropdown or slide-out panel with notifications.
- An unread count badge appears on the bell icon when there are new notifications.

### Notification Types

| Type | Description | Example |
|------|-------------|---------|
| Event reminders | Upcoming event notifications | "Your webinar starts in 30 minutes" |
| Recording ready | Recording processing complete | "Recording 'Q4 Demo' is ready to view" |
| Registration alert | New registration received | "New registration for 'Product Launch'" |
| Team activity | Team member actions | "Jane Doe joined your team" |
| Usage warning | Approaching plan limits | "You've used 90% of your storage" |
| Payment alert | Billing notifications | "Payment due in 3 days" |
| System announcement | Platform updates and maintenance | "Scheduled maintenance on Jan 30" |

### Notification Behavior

- Notifications are loaded on dashboard open and updated in real time.
- Each notification has a read/unread status.
- Notifications can be marked as read individually or all at once ("Mark all as read").
- Clicking a notification navigates to the relevant tab or page.
- Notifications follow the `notification_frequency` setting from the account's notification preferences for email delivery. In-app notifications always appear in real time.
- Old notifications are archived after a retention period (typically 30 days).

### Common Customer Questions About Notifications

**Q: I am not seeing any notifications in the panel.**
A: Check that:
1. You are logged in and on the correct account.
2. Your browser supports notifications (no ad blockers interfering).
3. Try refreshing the page.

**Q: Can I turn off in-app notifications?**
A: In-app notifications cannot be fully disabled as they include critical information (payment alerts, security notifications). You can dismiss individual notifications. Email notifications can be configured in the Settings tab.

---

## DashboardTab Detail

The DashboardTab (`?tab=dashboard`) is the default view and serves as the command center for the account.

### Widget Layout

```
+-------------------------------------------------------+
|  Plan Status Banner                                    |
+---------------------------+---------------------------+
|  Upcoming Events          |  Quick Actions             |
|  - Event 1 (date, time)  |  [Create Room]             |
|  - Event 2 (date, time)  |  [Schedule Event]          |
|  - Event 3 (date, time)  |  [Invite Team Member]      |
+---------------------------+---------------------------+
|  Usage Overview                                        |
|  Rooms: 5/10 | Storage: 2.1GB/5GB | Minutes: 120/500  |
+-------------------------------------------------------+
|  Recent Recordings        |  Activity Feed             |
|  - Recording 1 (thumb)   |  - "New registration..."   |
|  - Recording 2 (thumb)   |  - "Recording ready..."    |
|  - Recording 3 (thumb)   |  - "Team member joined..." |
+---------------------------+---------------------------+
```

### Widget Details

#### Plan Status Banner

| Field | Description |
|-------|-------------|
| Plan name | Current plan (basic, pro, enterprise) |
| Plan status | Active, trialing, past_due, canceled |
| Upgrade CTA | Shown when on basic or approaching limits |
| Trial countdown | Days remaining in trial (if trialing) |

**Behavior:**
- Always visible at the top of the DashboardTab.
- Color-coded: green for active, yellow for trialing, red for past_due/canceled.
- Clicking the upgrade CTA navigates to `?tab=billing`.

#### Upcoming Events Widget

- Fetches the next 3-5 scheduled events from the ScheduledMeeting entity.
- Each event shows name, date/time, registration count, and quick actions (edit, join, view landing page).
- If no events are scheduled, shows "No upcoming events" with a CTA to schedule one.

#### Recent Recordings Widget

- Fetches the latest 3-5 recordings from the Recording entity.
- Each recording shows a thumbnail, title, duration, view count, and quick actions (play, share, create clip).
- If no recordings exist, shows "No recordings yet" with a CTA to create a room.

#### Usage Overview Widget

- Displays current usage against plan limits.
- Metrics include: rooms created, storage used, minutes consumed, team members.
- Uses progress bars or circular gauges for visual representation.
- When usage exceeds 80%, the metric turns yellow. At 95%, it turns red.
- Clicking a metric navigates to the relevant tab (rooms, recordings, team).

#### Quick Actions

- Shortcuts to the most common tasks.
- Actions: Create Room, Schedule Event, Invite Team Member.
- Each action either navigates to the relevant tab or opens a creation dialog.

#### Activity Feed

- Shows recent account activity in reverse chronological order.
- Activity types: registrations, recordings processed, team changes, billing events.
- Each activity is clickable and navigates to the relevant context.
- Limited to the most recent 10-20 activities.

---

## Data Fetching Architecture

The Admin Dashboard uses a consistent data fetching pattern across all tabs.

### Fetching Pattern

```
1. Tab component mounts (user navigates to ?tab={tabId}).
2. Component receives accountId as a prop.
3. Component calls the relevant entity API(s) filtered by account_id.
4. Data is loaded into component state.
5. UI renders with the fetched data.
6. User interactions trigger mutations (create, update, delete).
7. After mutations, data is re-fetched or optimistically updated.
```

### Key Architecture Principles

| Principle | Description |
|-----------|-------------|
| Account scoping | All data fetches are scoped to the `accountId` prop. Users only see data from their own account. |
| Lazy loading | Tab data is fetched only when the tab is activated (not on initial dashboard load). |
| Prop drilling | `accountId` is passed from the dashboard root to all tab components as a prop. |
| Entity-based | Each tab fetches from one or more base44 entities using standard CRUD operations. |
| Real-time updates | Some components (chat, notifications) use WebSocket or polling for real-time data. |
| Optimistic updates | UI updates immediately on user action; reverts if the API call fails. |
| Error handling | Failed fetches display error messages with retry options. |

### Data Dependencies Between Tabs

| Tab | Primary Entity | Secondary Entities |
|-----|---------------|-------------------|
| DashboardTab | Account | ScheduledMeeting, Recording, Usage |
| AccountTab | Account | -- |
| RoomsTab | Room | Template, BrandKit |
| ScheduleTab | ScheduledMeeting | Room, WebinarRegistration |
| RecordingsTab | Recording | MeetingTranscript, Room |
| ClipsTab | RepurposedClip | Recording, SharedClip, ClipAnalytics |
| BrandKitTab | BrandKit | -- |
| TeamTab | TeamMember | Role, Account (security settings) |
| RolesTab | Role | -- |
| TemplatesTab | RoomTemplate | BrandKit |
| BillingTab | Account (billing fields) | PaymentHistory |
| IntegrationsTab | Integration | -- |
| SettingsTab | Account (settings fields) | Session |
| SupportTab | SupportTicket | -- |
| NotetakerTab | MeetingNotes | Recording, MeetingTranscript |
| LeadsTab | Lead | Event, WebinarRegistration, ClipAnalytics |
| EventLandingTab | Event | ScheduledMeeting, WebinarRegistration, BrandKit |
| ElementsTab | Element (Poll, Banner, CTA) | -- |

### Caching and Performance

- Tab data is cached in memory during the session. Navigating away and back to a tab does not re-fetch if the cache is still valid.
- Cache invalidation occurs on:
  - Explicit user action (creating, updating, or deleting entities).
  - Tab re-activation after a configurable stale time.
  - Manual refresh (pull-to-refresh or refresh button).
- Large datasets (recordings, leads) support pagination to avoid loading all data at once.
- Search and filter operations may trigger new API calls or filter cached data client-side, depending on the data size.

---

## Tab Access Control Summary

### By User Role

| Tab | Owner | Admin | Member | Sales | Viewer |
|-----|-------|-------|--------|-------|--------|
| dashboard | Yes | Yes | Yes | Yes | Yes |
| account | Yes | Yes | No | No | No |
| rooms | Yes | Yes | Yes | View Only | No |
| schedule | Yes | Yes | Yes | View Only | No |
| recordings | Yes | Yes | Yes | View Only | No |
| clips | Yes | Yes | Yes | View Only | No |
| brand-kit | Yes | Yes | No | No | No |
| team | Yes | Yes | No | No | No |
| roles | Yes | Yes | No | No | No |
| templates | Yes | Yes | Yes | No | No |
| billing | Yes | No | No | No | No |
| integrations | Yes | Yes | No | No | No |
| settings | Yes | Yes | No | No | No |
| support | Yes | Yes | Yes | Yes | Yes |
| notetaker | Yes | Yes | Yes | No | No |
| leads | Yes | Yes | No | Yes | No |
| event-landing | Yes | Yes | Yes | View Only | No |
| elements | Yes | Yes | Yes | No | No |

### By Plan

| Tab | Basic | Pro | Enterprise |
|-----|-------|-----|-----------|
| dashboard | Yes | Yes | Yes |
| account | Yes | Yes | Yes |
| rooms | Yes (limited) | Yes | Yes |
| schedule | Yes | Yes | Yes |
| recordings | Yes (limited storage) | Yes | Yes |
| clips | No | Yes | Yes |
| brand-kit | Yes (1 BrandKit) | Yes (multiple) | Yes (unlimited) |
| team | Yes (limited members) | Yes | Yes |
| roles | No | Yes | Yes |
| templates | Yes (no AI) | Yes | Yes |
| billing | Yes | Yes | Yes |
| integrations | No | Yes | Yes |
| settings | Yes (basic security) | Yes | Yes (SSO, advanced) |
| support | Yes (email only) | Yes (email + chat) | Yes (priority + dedicated) |
| notetaker | No | Yes | Yes |
| leads | No | Yes | Yes |
| event-landing | Yes (basic layouts) | Yes (all layouts) | Yes (all + custom) |
| elements | Yes | Yes | Yes |

---

## Troubleshooting

### Tab Not Loading / Shows Blank

**Possible Causes:**
- Network error during data fetch.
- The `accountId` prop is missing or incorrect.
- The user's session has expired.

**Resolution Steps:**
1. Ask the user to refresh the page.
2. Check if other tabs load correctly (to isolate whether it is a specific tab issue or a session issue).
3. If only one tab is affected, the entity API for that tab may be experiencing issues. Check system status.
4. If no tabs load, the session may have expired. Ask the user to log out and log back in.

### Tab Shows "Access Denied" or Is Missing

**Possible Causes:**
- The user's role does not have permission to access the tab.
- The account's plan does not include the feature.

**Resolution Steps:**
1. Check the user's role. Refer to the access control table above.
2. Check the account's plan. Refer to the plan requirements table above.
3. If the user should have access, verify their role assignment in the Team tab.
4. If the feature requires a plan upgrade, direct the user to the Billing tab.

### NotificationsPanel Not Showing Updates

**Possible Causes:**
- WebSocket connection is not established.
- Browser tab is in the background (some browsers throttle background connections).
- Notification preferences are configured for daily/weekly batch delivery (email-only; in-app should still be real-time).

**Resolution Steps:**
1. Ask the user to refresh the page to re-establish the WebSocket connection.
2. Ensure the browser tab is in the foreground.
3. Check if the bell icon shows a badge (unread count). If yes, click to open the panel.
4. If notifications are consistently missing, escalate to engineering.

### Dashboard Widgets Showing Stale Data

**Possible Causes:**
- Data cache has not been invalidated after recent changes.
- The user has been on the dashboard tab for an extended period without refreshing.

**Resolution Steps:**
1. Ask the user to refresh the page.
2. Navigate away from the dashboard tab and back to trigger a re-fetch.
3. If the data is still stale, log out and log back in to clear the session cache.

### URL Tab Parameter Not Working

**Possible Causes:**
- The tab ID is misspelled in the URL.
- The user is not on the admin dashboard route.
- Browser URL handling issue.

**Resolution Steps:**
1. Verify the URL format: `https://app.r-link.com/admin?tab={tabId}`.
2. Check the tab ID against the list of valid tab IDs above.
3. Ensure the user is on the `/admin` route, not a different page.
4. Try navigating via the sidebar instead of directly editing the URL.

---

## Internal Reference

### Complete Tab Registry

| # | Tab ID | Component | Props | Access | Plan |
|---|--------|-----------|-------|--------|------|
| 1 | `dashboard` | `DashboardTab` | `accountId`, `user` | All users | All |
| 2 | `account` | `AccountTab` | `accountId` | Owner, Admin | All |
| 3 | `rooms` | `RoomsTab` | `accountId` | All (restricted) | All |
| 4 | `schedule` | `ScheduleTab` | `accountId` | All (restricted) | All |
| 5 | `recordings` | `RecordingsTab` | `accountId` | All (restricted) | All |
| 6 | `clips` | `ClipsTab` | `accountId` | All (restricted) | Pro+ |
| 7 | `brand-kit` | `BrandKitTab` | `accountId` | Owner, Admin | All |
| 8 | `team` | `TeamTab` | `accountId` | Owner, Admin | All |
| 9 | `roles` | `RolesTab` | `accountId` | Owner, Admin | Pro+ |
| 10 | `templates` | `TemplatesTab` | `accountId` | All (restricted) | All |
| 11 | `billing` | `BillingTab` | `accountId` | Owner only | All |
| 12 | `integrations` | `IntegrationsTab` | `accountId` | Owner, Admin | Pro+ |
| 13 | `settings` | `SettingsTab` | `accountId` | Owner, Admin | All |
| 14 | `support` | `SupportTab` | `accountId` | All users | All |
| 15 | `notetaker` | `NotetakerTab` | `accountId` | All (restricted) | Pro+ |
| 16 | `leads` | `LeadsTab` | `accountId` | Owner, Admin, Sales | Pro+ |
| 17 | `event-landing` | `EventLandingTab` | `accountId` | All (restricted) | All |
| 18 | `elements` | `ElementsTab` | `accountId` | All (restricted) | All |

### Sidebar Group Summary

| Group | Label | Tabs |
|-------|-------|------|
| 1 | Overview | dashboard, account, schedule |
| 2 | Content | rooms, recordings, clips, elements, templates |
| 3 | Marketing | event-landing, leads, brand-kit |
| 4 | Organization | team, roles, notetaker, integrations |
| 5 | System | billing, settings, support |

### Related KB Articles

- **Templates** (25-templates.md): Full detail on TemplatesTab
- **Account Management** (04-account-management.md): Full detail on AccountTab and SettingsTab
- **Leads and Analytics** (28-leads-and-analytics.md): Full detail on LeadsTab
- **Event Landing Pages** (29-event-landing-pages.md): Full detail on EventLandingTab
- **Viewer, Replay, Sharing** (30-viewer-replay-sharing.md): Full detail on viewer-facing pages
