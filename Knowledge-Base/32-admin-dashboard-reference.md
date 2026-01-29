# Admin Dashboard Reference

## Overview

The R-Link Admin Portal (`/admin`) is the central management interface for all account operations. It contains 18 tabs organized into 5 sidebar groups, a top header with navigation and notifications, and the `DashboardTab` as the default home screen. The Admin page is implemented in `Admin.jsx` and uses the `AdminSidebar` component for navigation, `NotificationsPanel` for alerts, and renders one of 18 tab components based on the `activeTab` state.

The active tab is determined by the `?tab=` URL query parameter (e.g., `/admin?tab=billing`). If no tab parameter is provided, the dashboard tab is shown by default.

---

## Admin Page Structure

### Layout

```
+-----------------------------------------------------------+
| Top Header (h-14)                                          |
| [<- Back to Dashboard]           [Notifications] [Avatar]  |
+-------+---------------------------------------------------+
|       |                                                   |
| Side  |  Content Area (max-w-5xl, centered)               |
| bar   |                                                   |
| (w-64)|  [Active Tab Component]                           |
|       |                                                   |
|       |                                                   |
+-------+---------------------------------------------------+
```

### Top Header

| Element | Position | Description |
|---|---|---|
| **Back to Dashboard** link | Left | Arrow-left icon + "Back to Dashboard" text. Links to the Landing page. |
| **NotificationsPanel** | Right | Bell icon notification panel component |
| **User Avatar** | Far right | Gradient circle (purple-to-green) with user's first initial. Shows `full_name` and `email`. |

### Background

The entire Admin page uses a dark navy background: `bg-[#001233]`.

---

## AdminSidebar Structure

The sidebar is 264px wide (`w-64`) with a fixed layout containing:

### Sidebar Header

- **Title**: "Admin Panel" (bold white text)
- **Plan Badge**: Shows "Basic Plan" (gray) or "Business Plan" (purple-green gradient)

### 5 Menu Groups

The sidebar is organized into 5 groups separated by horizontal dividers (`border-t border-white/10`):

#### Group 1: Core

| Tab ID | Label | Icon | Business Only |
|---|---|---|---|
| `dashboard` | Dashboard | LayoutTemplate | No |
| `account` | Account | User | No |
| `team` | Team / Users | Users | No |

#### Group 2: Creative Assets

| Tab ID | Label | Icon | Business Only |
|---|---|---|---|
| `brand-kit` | Brand Kits | Palette | No |
| `templates` | Room Templates | LayoutTemplate | No |
| `elements` | Elements Library | Layers | No |

#### Group 3: Content & Events

| Tab ID | Label | Icon | Business Only |
|---|---|---|---|
| `rooms` | Rooms | Video | No |
| `schedule` | Schedule | Calendar | No |
| `recordings` | Recordings | Film | No |
| `clips` | Clips | Scissors | No |
| `event-landing` | Event Landing Pages | Globe | No |

#### Group 4: Intelligence & Integrations

| Tab ID | Label | Icon | Business Only |
|---|---|---|---|
| `leads` | Leads | Mail | No |
| `notetaker` | AI Notetaker | Bot | No |
| `integrations` | Integrations | Plug | No |

#### Group 5: Administration

| Tab ID | Label | Icon | Business Only |
|---|---|---|---|
| `billing` | Billing & Usage | CreditCard | No |
| `settings` | Settings | Settings | No |
| `support` | Support | HelpCircle | No |

### Sidebar Footer (Basic Plan Only)

When the account is on the Basic plan, the sidebar footer shows an upgrade card:
- **Crown icon** with "Upgrade to Business" heading
- Description: "Unlock team management, advanced branding, templates & more."
- **Upgrade Now** button (purple-green gradient)

### Tab Styling

| State | Style |
|---|---|
| **Active** | Purple-green gradient background (`from-[#6a1fbf]/30 to-[#00c853]/30`), white text, white border |
| **Hover** | White text, subtle white background (`bg-white/5`) |
| **Locked** | Gray text, `cursor-not-allowed`, Lock icon |
| **Business Feature** | Crown icon in green when unlocked on Business plan |

**Note:** In the current sidebar configuration, no tabs are marked as `businessOnly: true`. All tabs are visible to all plans. Business-only features are enforced at the component level via permissions and plan checks.

---

## All 18 Admin Tabs -- Complete Reference

### 1. Dashboard (`dashboard`)

| Property | Value |
|---|---|
| **Component** | `DashboardTab` |
| **Props** | `account`, `rooms`, `onNavigate` (tab navigation callback), `plan` |
| **Access** | Public (all roles) |
| **Plan Requirement** | Both plans |

**Description**: The home screen of the Admin portal. Displays:

- **Welcome Header**: "Welcome back, {first_name}" with subtitle "Here's what's happening with your events"
- **Quick Action Cards** (3-column grid):
  - **Start** (purple): Navigate to Landing page to start a session
  - **Schedule** (orange): Navigate to Schedule tab
  - **Room Setup** (green): Navigate to Rooms tab
- **Stats Grid** (4-column):
  - Today's Sessions (blue)
  - Upcoming Sessions (purple)
  - Active Rooms (green)
  - Total Recordings (orange)
- **My Rooms** panel (Business plan, if rooms exist): Shows up to 4 room cards with name, slug URL (`rally.r-link.com/{slug}`), session/participant counts, Launch and Settings buttons
- **Upcoming Sessions** panel: Lists next 5 scheduled sessions with type icon, title, date, time, invitee count, Details button
- **Usage This Month** panel: Recording time (minutes), Storage used (GB), Active Rooms
- **Recent Recordings** panel: Last 3 recordings with title and date

**Data Sources**: `ScheduledMeeting` (upcoming sessions), `Recording` (recent recordings and stats)

---

### 2. Account (`account`)

| Property | Value |
|---|---|
| **Component** | `AccountTab` |
| **Props** | `account`, `onSave` |
| **Access** | Public (all roles) |
| **Plan Requirement** | Both plans |

**Description**: Organization profile editing. Two sections:
- **Organization Details**: company_name, owner_name, owner_email, phone
- **Regional Settings**: timezone (10 options), locale (7 languages)

See [04-account-management.md](./04-account-management.md) for full details.

---

### 3. Rooms (`rooms`)

| Property | Value |
|---|---|
| **Component** | `RoomsTab` |
| **Props** | `rooms`, `templates`, `brandKits`, `plan`, `onCreate`, `onUpdate`, `onDelete`, `onUpgrade` |
| **Access** | Permission-gated |
| **Plan Requirement** | Basic: 1 room. Business: 5 rooms. |

**Description**: Create, configure, and manage virtual rooms. Supports room CRUD operations, template application during creation, Brand Kit association. The `onUpgrade` callback navigates to the Billing tab when the room limit is reached.

**Key Operations**:
- `Room.create({ ...data, account_id })`: Create new room
- `Room.update(id, data)`: Update room settings
- `Room.delete(id)`: Delete a room

---

### 4. Schedule (`schedule`)

| Property | Value |
|---|---|
| **Component** | `ScheduleTab` |
| **Props** | `rooms` |
| **Access** | Public (all roles) |
| **Plan Requirement** | Both plans |

**Description**: Event calendar and scheduling interface. View and manage scheduled sessions. Receives the rooms list for room selection when scheduling.

---

### 5. Recordings (`recordings`)

| Property | Value |
|---|---|
| **Component** | `RecordingsTab` |
| **Props** | None |
| **Access** | Permission-gated |
| **Plan Requirement** | Both plans |

**Description**: Browse, play, download, and manage session recordings. Storage is plan-limited (10 GB Basic, 50 GB Business).

---

### 6. Clips (`clips`)

| Property | Value |
|---|---|
| **Component** | `ClipsTab` |
| **Props** | None |
| **Access** | Permission-gated |
| **Plan Requirement** | Both plans |

**Description**: Create and manage short video clips extracted from recordings. Clips can be shared via the SharedClip public page.

---

### 7. Brand Kit (`brand-kit`)

| Property | Value |
|---|---|
| **Component** | `BrandKitTab` |
| **Props** | `brandKits` (filtered by account/global/template), `onCreate`, `onUpdate`, `onDelete`, `onSetDefault`, `onSetGlobalDefault`, `plan`, `canCreate`, `canEdit`, `canDelete` |
| **Access** | Permission-gated (`canAccessTab('brand-kit')` must return true) |
| **Plan Requirement** | Basic: branded backgrounds. Business: Full Branding Suite. |

**Description**: Visual branding management including colors, fonts, frame settings, lower thirds, and logos. Brand Kits are filtered to show:
- Account-owned kits (`bk.account_id === account.id`)
- Global defaults (`bk.is_global_default`)
- Template kits (`bk.is_template`)

**Permission-gated operations**:
- Create: requires `hasPermission('brand_kits', 'create')`
- Edit: requires `hasPermission('brand_kits', 'edit')`
- Delete: requires `hasPermission('brand_kits', 'delete')`
- Set Global Default: requires `isOwner`

---

### 8. Team (`team`)

| Property | Value |
|---|---|
| **Component** | `TeamTab` |
| **Props** | `teamMembers`, `account`, `roles`, `onInvite`, `onUpdate`, `onRemove`, `canInvite`, `canEdit`, `canRemove` |
| **Access** | Permission-gated (`canAccessTab('team')` must return true) |
| **Plan Requirement** | Both plans (limited to `max_team_members`) |

**Description**: Invite and manage team members, assign roles.

**Key Operations**:
- Invite: `TeamMember.create({ ...data, account_id, user_email, status: 'invited', invited_at })` -- requires `hasPermission('team', 'invite')`
- Update: `TeamMember.update(id, data)` -- requires `hasPermission('team', 'edit')`
- Remove: `TeamMember.delete(id)` -- requires `hasPermission('team', 'remove')`

---

### 9. Roles (`roles`)

| Property | Value |
|---|---|
| **Component** | `RolesTab` |
| **Props** | `roles`, `account`, `onCreate`, `onUpdate`, `onDelete`, `onDuplicate` |
| **Access** | **Owner-only** (`canAccessTab('roles')`) |
| **Plan Requirement** | Both plans |

**Description**: Define and manage permission roles. Built-in roles: `admin` (all permissions), `host` (limited). Custom roles can be created, edited, deleted, and duplicated.

**Access denied message**: "Only account owners can manage roles"

**Key Operations**:
- Create: `Role.create({ ...data, account_id })`
- Update: `Role.update(id, data)`
- Delete: `Role.delete(id)`
- Duplicate: `Role.create(data)` (creates a copy)

---

### 10. Templates (`templates`)

| Property | Value |
|---|---|
| **Component** | `TemplatesTab` |
| **Props** | `templates`, `brandKits`, `onCreate`, `onUpdate`, `onDelete`, `onSetDefault` |
| **Access** | Permission-gated |
| **Plan Requirement** | Both plans |

**Description**: Create and manage reusable room templates with preset settings.

See [25-templates.md](./25-templates.md) for full details.

**Key Operations**:
- Create: `RoomTemplate.create({ ...data, account_id })`
- Update: `RoomTemplate.update(id, data)`
- Delete: `RoomTemplate.delete(id)`
- Set Default: Updates ALL templates -- `is_default: true` on selected, `is_default: false` on all others

---

### 11. Billing (`billing`)

| Property | Value |
|---|---|
| **Component** | `BillingTab` |
| **Props** | `account`, `plan`, `onUpgrade`, `onManageBilling`, `canManage` |
| **Access** | **Owner-only** (`canAccessTab('billing')`) |
| **Plan Requirement** | Both plans |

**Description**: Subscription management, payment methods, invoices, and usage tracking.

**Access denied message**: "Only account owners can view billing"

`canManage` is `true` when `isOwner || hasPermission('billing', 'manage')`.

---

### 12. Integrations (`integrations`)

| Property | Value |
|---|---|
| **Component** | `IntegrationsTab` |
| **Props** | `integrations`, `onConnect`, `onDisconnect`, `onSave`, `onConfigureWebhook` |
| **Access** | Permission-gated |
| **Plan Requirement** | Calendar integrations on both plans; all others Business only. |

**Description**: Connect and configure 21 third-party services across 8 categories (Email, Payment, Cloud Storage, SSO, CRM, Calendar, SMS, Live Streaming) plus Webhooks and API Keys.

**Key Operations**:
- Connect: `Integration.create({ ...data, account_id })`
- Update: `Integration.update(id, data)` (for saving configuration)
- Disconnect: `Integration.update(id, { status: 'disconnected' })`

---

### 13. Settings (`settings`)

| Property | Value |
|---|---|
| **Component** | `SettingsTab` |
| **Props** | `account`, `plan`, `integrations`, `onSave`, `onSaveIntegrations` |
| **Access** | Permission-gated |
| **Plan Requirement** | Both plans (domain restriction is Business only) |

**Description**: Security settings, notification preferences, active session management, and streaming integration quick access.

See [04-account-management.md](./04-account-management.md) for full details.

**Saves**: `security_settings` and `notification_preferences` objects on the Account entity.

---

### 14. Support (`support`)

| Property | Value |
|---|---|
| **Component** | `SupportTab` |
| **Props** | `plan` |
| **Access** | Public (all roles) |
| **Plan Requirement** | Both plans |

**Description**: Help resources, documentation links, and contact support options. Content may vary based on the user's plan (Business customers may have priority support access).

---

### 15. Notetaker (`notetaker`)

| Property | Value |
|---|---|
| **Component** | `NotetakerTab` |
| **Props** | `settings` (NotetakerSettings entity), `onSave`, `templates` |
| **Access** | Public (all roles) |
| **Plan Requirement** | Business plan for AI Notetaker functionality |

**Description**: Configure AI notetaker settings for automatic transcription, summarization, and action item extraction during sessions. Receives the `templates` list for note template selection.

**Key Operations**:
- Save: If `NotetakerSettings` exists, updates via `NotetakerSettings.update(id, data)`. Otherwise, creates via `NotetakerSettings.create({ ...data, account_id })`.

---

### 16. Leads (`leads`)

| Property | Value |
|---|---|
| **Component** | `LeadsTab` |
| **Props** | `accountId` |
| **Access** | Permission-gated |
| **Plan Requirement** | Both plans (CRM integration Business only) |

**Description**: View, filter, and export lead capture data from sessions.

See [28-leads-and-analytics.md](./28-leads-and-analytics.md) for full details.

---

### 17. Event Landing (`event-landing`)

| Property | Value |
|---|---|
| **Component** | `EventLandingTab` |
| **Props** | None |
| **Access** | Permission-gated |
| **Plan Requirement** | Both plans |

**Description**: Create and manage event landing pages with 5 layout types, registration forms, countdown timers, and replay embedding.

See [29-event-landing-pages.md](./29-event-landing-pages.md) for full details.

---

### 18. Elements (`elements`)

| Property | Value |
|---|---|
| **Component** | `ElementsTab` |
| **Props** | `folders`, `elements`, `onCreateFolder`, `onEditFolder`, `onDeleteFolder`, `onCreateElement`, `onEditElement`, `onDuplicateElement`, `onDeleteElement`, `onMoveElement`, `onToggleFavorite`, `onReorderElements`, `currentRoomId` |
| **Access** | Permission-gated |
| **Plan Requirement** | Basic: Core Media only. Business: All element types. |

**Description**: Manage interactive overlays and media elements used during sessions. Elements include Links, Banners, Polls, Website Overlays, Prompter, and Core Media (Slides, Video, Audio).

**Key Operations**:
- Create folder: `ElementFolder.create(data)`
- Edit folder: `ElementFolder.update(id, data)`
- Delete folder: `ElementFolder.delete(id)`
- Create element: `Element.create(data)`
- Edit element: `Element.update(id, data)`
- Duplicate element: `Element.create({ ...data, id: undefined, name: "{name} (Copy)" })`
- Delete element: `Element.delete(id)`
- Move element: `Element.update(id, { folder_id })`
- Toggle favorite: `Element.update(id, { is_favorite: !isFavorite })`
- Reorder: `Promise.all(elements.map(el => Element.update(el.id, { order: el.order })))`

---

## Tab Access Control Summary

### Public Tabs (All Authenticated Users)

| Tab | Slug | Additional Notes |
|---|---|---|
| Dashboard | `dashboard` | Default tab on Admin load |
| Account | `account` | Profile editing for all users |
| Schedule | `schedule` | Calendar visible to all |
| Support | `support` | Help always accessible |
| Notetaker | `notetaker` | Settings visible to all (feature requires Business) |

### Owner-Only Tabs

| Tab | Slug | Denied Message |
|---|---|---|
| Billing | `billing` | "Only account owners can view billing" |
| Roles | `roles` | "Only account owners can manage roles" |

### Permission-Gated Tabs

| Tab | Slug | Permission Check |
|---|---|---|
| Rooms | `rooms` | `canAccessTab('rooms')` |
| Recordings | `recordings` | `canAccessTab('recordings')` |
| Clips | `clips` | `canAccessTab('clips')` |
| Brand Kit | `brand-kit` | `canAccessTab('brand-kit')` |
| Team | `team` | `canAccessTab('team')` |
| Templates | `templates` | `canAccessTab('templates')` |
| Integrations | `integrations` | `canAccessTab('integrations')` |
| Settings | `settings` | `canAccessTab('settings')` |
| Leads | `leads` | `canAccessTab('leads')` |
| Event Landing | `event-landing` | `canAccessTab('event-landing')` |
| Elements | `elements` | `canAccessTab('elements')` |

Permission-gated tabs show "Access denied" (gray text, centered) when the user's role does not grant access.

---

## NotificationsPanel

The `NotificationsPanel` component is displayed in the Admin header (top right, before the user avatar). It provides:

- **Bell icon** button to toggle the notifications panel
- In-app notifications about account activity (upcoming events, recording completion, usage warnings, etc.)
- Notification management (read/dismiss)

---

## Data Fetching Architecture

The Admin page fetches all primary data at the top level and passes it down to tab components as props. This ensures:
- Consistent data across all tabs
- Efficient caching via React Query
- Automatic cache invalidation after mutations

### Queries Executed at Admin Level

| Query Key | Entity | Filter | Description |
|---|---|---|---|
| `currentUser` | `auth.me()` | None | Current authenticated user |
| `accounts` | `Account.list()` | None | All accounts (uses first one) |
| `brandKits` | `BrandKit.list()` | None (RLS filters) | Brand kits for the account |
| `teamMembers` | `TeamMember.filter()` | `{ account_id }` | Team members |
| `templates` | `RoomTemplate.filter()` | `{ account_id }` | Room templates |
| `rooms` | `Room.filter()` | `{ account_id }` | Rooms (deduplicated by ID) |
| `integrations` | `Integration.filter()` | `{ account_id }` | Connected integrations |
| `elementFolders` | `ElementFolder.list()` | None | Element folders |
| `elements` | `Element.list()` | None | All elements |
| `notetakerSettings` | `NotetakerSettings.filter()` | `{ account_id }` | AI notetaker config |
| `roles` | `Role.filter()` | `{ account_id }` | Permission roles |

### Room Deduplication

Rooms are deduplicated after fetching to prevent duplicate entries:
```
const rooms = roomsRaw.filter(room => {
  if (seen.has(room.id)) return false;
  seen.add(room.id);
  return true;
});
```

---

## Settings and Options

| Setting | Location | Description |
|---|---|---|
| Active Tab | URL `?tab=` parameter | Controls which tab is displayed; defaults to `dashboard` |
| Plan | Account entity | Determines feature availability and sidebar badge |
| Permissions | `usePermissions(account)` hook | Controls tab access and operation permissions |
| Sidebar Width | Fixed: `w-64` (256px) | Not configurable |
| Content Width | Fixed: `max-w-5xl` (1024px, centered) | Not configurable |

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| Admin page shows blank content | No account exists and auto-creation failed | Check browser console for account creation errors; verify user has an email address |
| Sidebar shows "Basic Plan" incorrectly | Account plan field is `"basic"` | Check account entity plan field; upgrade via Billing tab |
| Tab shows "Access denied" | User's role does not include permissions for that tab | Contact the account owner to update the user's role via the Team or Roles tab |
| "Only account owners can view billing" | User is not the account owner | Only the user whose email matches `account.owner_email` can access Billing |
| "Only account owners can manage roles" | User is not the account owner | Same as above -- only the owner can manage roles |
| NotificationsPanel not showing | Component render issue | Refresh the page |
| Data not loading in a tab | React Query cache is stale or network error | Refresh the page; check network connectivity |
| Tab does not match URL parameter | `?tab=` value does not match any tab ID | Use exact tab slugs from the table above (e.g., `brand-kit`, not `brandkit`) |
| Upgrade card not showing in sidebar | User is on Business plan | The upgrade card only appears for Basic plan users |
| Room duplicates in Rooms tab | Base44 returned duplicate entries | Deduplication is handled automatically; if persistent, contact support |

---

## FAQ

**Q: How do I navigate to a specific admin tab?**
A: Use the sidebar navigation, or add `?tab={tab_id}` to the Admin URL. For example: `/admin?tab=billing`.

**Q: Which tabs can I access on the Basic plan?**
A: All 18 tabs are visible in the sidebar on both plans. However, some features within tabs (like webinar settings, RTMP streaming, or AI notetaker) require the Business plan.

**Q: How do I know which plan I'm on?**
A: The sidebar header shows a plan badge: "Basic Plan" (gray) or "Business Plan" (purple-green gradient).

**Q: What is the default tab when I open Admin?**
A: The Dashboard tab is the default. It shows an overview of your account with quick actions, stats, upcoming sessions, and recent recordings.

**Q: Can I bookmark a specific tab?**
A: Yes. The `?tab=` URL parameter is read on page load. Bookmarking `/admin?tab=brand-kit` will open directly to the Brand Kit tab.

**Q: Why do some tabs show "Access denied"?**
A: Your role does not include permissions for that tab. Contact the account owner to update your role. Owner-only tabs (Billing, Roles) can only be accessed by the user whose email matches `account.owner_email`.

**Q: How many sidebar groups are there?**
A: Five groups: Core (Dashboard, Account, Team), Creative Assets (Brand Kits, Templates, Elements), Content & Events (Rooms, Schedule, Recordings, Clips, Event Landing), Intelligence & Integrations (Leads, Notetaker, Integrations), and Administration (Billing, Settings, Support).

---

## Known Limitations

1. **No responsive sidebar**: The sidebar is a fixed 264px width and does not collapse on smaller screens. On mobile devices, the sidebar may overlap content.
2. **Single account context**: The Admin page always uses the first account returned by `Account.list()`. Multi-account support is not available.
3. **Tab state not persisted**: Switching tabs updates the internal state but does not update the URL `?tab=` parameter dynamically (it is only read on initial load).
4. **No tab deep linking within tabs**: Some tabs have internal sub-views (e.g., editing a specific room), but these are not URL-addressable.
5. **Top-level data fetching**: All entity data is fetched at the Admin page level regardless of which tab is active. This may result in unnecessary API calls for data not relevant to the current tab.
6. **No breadcrumb navigation**: There is no breadcrumb trail showing the current location within the admin hierarchy.
7. **Sidebar scroll**: On very small screens, the sidebar navigation may exceed viewport height. The sidebar uses `flex flex-col h-full` but does not have an explicit scroll container for the nav area.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Admin Portal Access | Yes | Yes |
| All 18 Tabs Visible | Yes | Yes |
| Dashboard with Stats | Yes | Yes |
| My Rooms Panel (Dashboard) | 1 room | Up to 5 rooms |
| Account Profile Editing | Yes | Yes |
| Team Management (max members) | 3 | Varies by plan |
| Custom Roles | Yes | Yes |
| Full Branding Suite | No | Yes |
| AI Notetaker Configuration | No | Yes |
| CRM Integrations | No | Yes |
| RTMP Streaming Integrations | No | Yes |
| Email Domain Restriction (Settings) | No | Yes |

---

## Related Documents

- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture, all 18 tabs listed with access rules
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan comparison and feature gating
- [04-account-management.md](./04-account-management.md) -- Account and Settings tab details
- [25-templates.md](./25-templates.md) -- Templates tab details
- [28-leads-and-analytics.md](./28-leads-and-analytics.md) -- Leads tab details
- [29-event-landing-pages.md](./29-event-landing-pages.md) -- Event Landing tab details
- [30-viewer-replay-sharing.md](./30-viewer-replay-sharing.md) -- Public-facing pages
- [18-roles-and-permissions.md](./18-roles-and-permissions.md) -- Permission system and role definitions
