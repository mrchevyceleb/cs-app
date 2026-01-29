# 26 - Team Management and Roles

## Overview

R-Link provides comprehensive team management and role-based access control (RBAC) through two admin dashboard tabs: **Team** and **Roles**. The Team tab (`TeamTab` component) manages `TeamMember` entities -- inviting users, assigning roles, and controlling account access. The Roles tab (`RolesTab` component) manages `Role` entities -- defining custom permission sets that determine what each team member can do. The Roles tab is accessible to account owners only.

---

## Team Tab

### Accessing the Team Tab

1. Log in to your R-Link account.
2. Navigate to the Admin Dashboard.
3. Click the **Team** tab in the left sidebar.

### Dashboard Statistics

The Team tab displays four summary cards:

| Stat | Description |
|------|-------------|
| **Total Members** | Count of all team members. If the account has a member limit, displayed as `count/limit` |
| **Active** | Number of members with `status: 'active'` |
| **Pending Invites** | Number of members with `status: 'invited'` |
| **Admins** | Number of members with role `'owner'` or `'admin'` |

### Search

Use the search bar to filter team members by name or email address. Filtering is real-time.

### Members List

Team members are displayed in a table with the following columns:

| Column | Description |
|--------|-------------|
| **User** | Avatar (gradient fallback with initial), name, and email address |
| **Role** | Color-coded badge with role icon and label |
| **Status** | Color-coded badge showing current status |
| **Last Login** | Date of last login, or "Invited [date]" for pending members |
| **Actions** | Three-dot overflow menu (for non-owner members) |

---

## TeamMember Entity

The `TeamMember` entity stores team membership data. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `account_id` | string | The account this member belongs to |
| `user_email` | string | The member's email address (used for login/identification) |
| `email` | string | Contact email (may differ from user_email) |
| `name` | string | Display name of the member |
| `avatar_url` | string | URL of the member's profile picture |
| `status` | string | `'active'`, `'invited'`, or `'suspended'` |
| `invited_at` | datetime | When the invitation was sent |
| `last_login` | datetime | When the member last logged in |
| `role` | string | Built-in role: `'owner'`, `'admin'`, `'host'`, `'presenter'`, or `'viewer'` |
| `role_id` | string | ID of a custom `Role` entity (for custom role assignments) |

### Member Status Values

| Status | Badge Color | Description |
|--------|-------------|-------------|
| `active` | Green | Member has accepted invitation and can access the account |
| `invited` | Yellow | Invitation sent but not yet accepted |
| `suspended` | Red | Member's access has been temporarily revoked |

---

## Built-In Roles

R-Link provides five built-in roles with predefined capabilities:

### Owner

| Aspect | Detail |
|--------|--------|
| **Badge** | Yellow with crown icon |
| **Access** | Full access to all features |
| **Restrictions** | Cannot be removed or have role changed by other members |
| **Unique** | Only one owner per account (typically the account creator) |
| **Special** | Can access the Roles tab, billing, and all admin settings |

### Admin

| Aspect | Detail |
|--------|--------|
| **Badge** | Purple with shield icon |
| **Access** | Near-full access; can manage team, rooms, settings, integrations |
| **Restrictions** | Cannot change owner settings or access billing (unless explicitly permitted) |
| **Use Case** | Co-administrators who handle day-to-day account management |

### Host

| Aspect | Detail |
|--------|--------|
| **Badge** | Blue with users icon |
| **Access** | Can create and manage rooms, schedule sessions, host sessions |
| **Restrictions** | Limited access to team management, no access to billing or advanced settings |
| **Use Case** | Team members who regularly run meetings and webinars |

### Presenter

| Aspect | Detail |
|--------|--------|
| **Badge** | Green with users icon |
| **Access** | Can present in sessions, share screen, use studio tools |
| **Restrictions** | Cannot create rooms or manage settings; view-only for most admin features |
| **Use Case** | Guest speakers, subject matter experts, workshop facilitators |

### Viewer

| Aspect | Detail |
|--------|--------|
| **Badge** | Gray with users icon |
| **Access** | Can view rooms and recordings; limited studio interaction |
| **Restrictions** | Most admin features are hidden; read-only access |
| **Use Case** | Stakeholders, observers, audience members with accounts |

---

## Team Operations

### Inviting a Team Member

Required permission: `team.invite`

1. Click **Invite User** in the top-right corner.
2. Fill in the invite form:
   - **Email Address** (required) -- The email to send the invitation to.
   - **Name** (optional) -- Display name for the new member.
   - **Role** -- Select from: Owner, Admin, Host, Presenter, Viewer.
3. Click **Send Invitation**.
4. The system creates a `TeamMember` entity with `status: 'invited'` and `invited_at` set to the current timestamp.
5. An email invitation is sent to the specified address.
6. The member appears in the team list with a yellow "Invited" badge.

### Updating a Team Member's Role

Required permission: `team.edit`

1. Find the member in the team list.
2. Click the three-dot menu on the right side of their row.
3. Select one of:
   - **Make Owner** -- Promotes to owner role
   - **Make Admin** -- Sets role to admin
   - **Make Host** -- Sets role to host
   - **Make Presenter** -- Sets role to presenter
   - **Make Viewer** -- Sets role to viewer
4. The role change takes effect immediately.

Note: The owner's role cannot be changed by anyone. Only non-owner members show the action menu.

### Suspending a Team Member

Required permission: `team.edit`

1. Find the active member in the team list.
2. Click the three-dot menu.
3. Select **Suspend**.
4. The member's status changes to `'suspended'` and their badge turns red.
5. Suspended members cannot log in or access any account features.

### Reactivating a Suspended Member

Required permission: `team.edit`

1. Find the suspended member in the team list.
2. Click the three-dot menu.
3. Select **Reactivate**.
4. The member's status changes back to `'active'`.

### Resending an Invitation

For members with `status: 'invited'`:

1. Click the three-dot menu.
2. Select **Resend Invite**.
3. A new invitation email is sent.

### Removing a Team Member

Required permission: `team.remove`

1. Find the member in the team list.
2. Click the three-dot menu.
3. Select **Remove** (red text).
4. The member is permanently removed from the account.
5. Their access is immediately revoked.

Note: The account owner cannot be removed.

---

## Team Permissions

Team operations are governed by three permissions:

| Permission | Key | Description |
|-----------|-----|-------------|
| **Invite** | `team.invite` | Can send invitations to new team members |
| **Edit** | `team.edit` | Can change member roles, suspend/reactivate members |
| **Remove** | `team.remove` | Can permanently remove members from the account |

The `TeamTab` component receives these as props:
- `canInvite` (default: true) -- Controls visibility of the "Invite User" button.
- `canEdit` (default: true) -- Controls visibility of role change and status change menu items.
- `canRemove` (default: true) -- Controls visibility of the "Remove" menu item.

---

## Roles Tab

### Accessing the Roles Tab

1. Log in as the account **Owner**.
2. Navigate to the Admin Dashboard.
3. Click the **Roles** tab in the left sidebar.

**Important**: The Roles tab is only visible to account owners. Other roles do not see this tab.

### Roles Grid

Custom roles are displayed in a responsive grid (1-3 columns). Each role card shows:
- Color-coded shield icon
- Role name (with "System Role" label for built-in roles)
- Description
- Permission summary (first 3 categories with enabled/total count)
- Action buttons: Edit, Duplicate, Delete

---

## Role Entity

The `Role` entity stores custom role definitions. Key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier |
| `account_id` | string | The account this role belongs to |
| `name` | string | Role display name (e.g., "Co-Host", "Content Manager") |
| `description` | string | Description of the role's purpose |
| `color` | string | Badge color hex code (default: `#6a1fbf`) |
| `is_system_role` | boolean | Whether this is a built-in system role (cannot be deleted) |
| `permissions` | object | Nested permissions object (see below) |

---

## Permission Categories

R-Link defines **9 permission categories** with granular action-level controls:

### 1. Rooms

| Permission | Key | Description |
|-----------|-----|-------------|
| View rooms | `rooms.view` | Can see room listings and details |
| Create rooms | `rooms.create` | Can create new rooms |
| Edit rooms | `rooms.edit` | Can modify room settings |
| Delete rooms | `rooms.delete` | Can delete rooms |

### 2. Brand Kits

| Permission | Key | Description |
|-----------|-----|-------------|
| View brand kits | `brand_kits.view` | Can see brand kit listings |
| Create brand kits | `brand_kits.create` | Can create new brand kits |
| Edit brand kits | `brand_kits.edit` | Can modify brand kit settings |
| Delete brand kits | `brand_kits.delete` | Can delete brand kits |

### 3. Templates

| Permission | Key | Description |
|-----------|-----|-------------|
| View templates | `templates.view` | Can browse and view templates |
| Create templates | `templates.create` | Can create new templates |
| Edit templates | `templates.edit` | Can modify existing templates |
| Delete templates | `templates.delete` | Can delete templates |

### 4. Team

| Permission | Key | Description |
|-----------|-----|-------------|
| View team members | `team.view` | Can see the team member list |
| Invite members | `team.invite` | Can send team invitations |
| Edit members | `team.edit` | Can change member roles and status |
| Remove members | `team.remove` | Can remove members from the account |

### 5. Billing

| Permission | Key | Description |
|-----------|-----|-------------|
| View billing | `billing.view` | Can see billing information and invoices |
| Manage billing | `billing.manage` | Can change plans, update payment methods |

### 6. Settings

| Permission | Key | Description |
|-----------|-----|-------------|
| View settings | `settings.view` | Can see account settings |
| Edit settings | `settings.edit` | Can modify account settings |

### 7. Recordings

| Permission | Key | Description |
|-----------|-----|-------------|
| View recordings | `recordings.view` | Can see and play recordings |
| Download recordings | `recordings.download` | Can download recording files |
| Delete recordings | `recordings.delete` | Can delete recordings |

### 8. Integrations

| Permission | Key | Description |
|-----------|-----|-------------|
| View integrations | `integrations.view` | Can see connected integrations |
| Manage integrations | `integrations.manage` | Can connect, configure, and disconnect integrations |

### 9. Studio Controls

| Permission | Key | Description |
|-----------|-----|-------------|
| Host sessions | `studio.host` | Can start and control sessions as host |
| Present | `studio.present` | Can present (share screen, use camera/mic) |
| Moderate chat | `studio.moderate_chat` | Can moderate the chat (delete messages, mute users) |
| Manage participants | `studio.manage_participants` | Can admit/remove participants, manage waiting room |
| Control recording | `studio.control_recording` | Can start/stop recording during sessions |
| Use studio tools | `studio.use_tools` | Can use studio tools (scenes, overlays, graphics) |

---

## Default Permissions

When creating a new role, the following default permissions are applied:

```json
{
  "rooms": { "view": true, "create": false, "edit": false, "delete": false },
  "brand_kits": { "view": true, "create": false, "edit": false, "delete": false },
  "templates": { "view": true, "create": false, "edit": false, "delete": false },
  "team": { "view": true, "invite": false, "edit": false, "remove": false },
  "billing": { "view": false, "manage": false },
  "settings": { "view": false, "edit": false },
  "recordings": { "view": true, "download": false, "delete": false },
  "integrations": { "view": false, "manage": false },
  "studio": {
    "host": false,
    "present": false,
    "moderate_chat": false,
    "manage_participants": false,
    "control_recording": false,
    "use_tools": false
  }
}
```

This default gives new roles **view-only access** to rooms, brand kits, templates, team, and recordings, with everything else disabled.

---

## Custom Role Operations

### Creating a Custom Role

1. Click **Create Role** in the top-right corner.
2. Fill in the role details:
   - **Role Name** (required) -- e.g., "Co-Host", "Content Manager", "Moderator"
   - **Badge Color** -- Choose a hex color for the role badge
   - **Description** (optional) -- Explain the role's purpose
3. Configure permissions:
   - Each permission category is displayed as a bordered section.
   - Toggle individual permissions on/off using switches.
   - Permissions are organized in a 2-column grid within each category.
4. Click **Create Role** to save.

### Editing a Custom Role

1. Find the role in the grid.
2. Click the **Edit** button on the card.
3. Modify name, description, color, and permissions.
4. Click **Save Changes**.

### Duplicating a Role

1. Find the role in the grid.
2. Click the **Duplicate** button (copy icon).
3. A new role is created with:
   - Name: "[Original Name] (Copy)"
   - `is_system_role: false` (always editable)
   - All permissions copied from the original.
4. Edit the duplicate to customize.

### Deleting a Custom Role

1. Find the role in the grid.
2. Click the **Delete** button (trash icon, red).
3. System roles cannot be deleted (alert: "Cannot delete system roles").
4. Confirm the deletion for custom roles.
5. The role is permanently removed. Team members using this role should be reassigned.

---

## Role Assignment Flow

1. **Create a custom role** in the Roles tab with specific permissions.
2. **Invite a team member** in the Team tab and assign them a built-in role.
3. **Assign the custom role** by updating the member's `role_id` to point to the custom role.
4. The member's effective permissions are determined by their role assignment.
5. UI elements (buttons, tabs, actions) automatically show/hide based on the member's permissions.

---

## Permissions Integration with UI

The `usePermissions` hook is used throughout the admin dashboard to check permissions:

- **Tab visibility**: Admin tabs are shown/hidden based on the user's role and permissions.
- **Button visibility**: Create, edit, and delete buttons are conditionally rendered.
- **Action availability**: Context menu items are enabled/disabled based on permissions.
- **Data access**: API queries may be restricted based on the user's permission level.

### Example Permission Checks

| Feature | Required Permission |
|---------|-------------------|
| See Recordings tab | `recordings.view` |
| Download a recording | `recordings.download` |
| Delete a recording | `recordings.delete` |
| Create a room | `rooms.create` |
| Edit a brand kit | `brand_kits.edit` |
| Invite team members | `team.invite` |
| Connect an integration | `integrations.manage` |
| Host a session | `studio.host` |
| Start/stop recording | `studio.control_recording` |

---

## Suggested Custom Role Templates

Here are common custom role configurations:

### Co-Host
```
rooms: { view: true, create: true, edit: true, delete: false }
brand_kits: { view: true, create: false, edit: true, delete: false }
team: { view: true, invite: false, edit: false, remove: false }
recordings: { view: true, download: true, delete: false }
studio: { host: true, present: true, moderate_chat: true, manage_participants: true, control_recording: true, use_tools: true }
```

### Content Manager
```
rooms: { view: true, create: false, edit: true, delete: false }
brand_kits: { view: true, create: true, edit: true, delete: false }
templates: { view: true, create: true, edit: true, delete: true }
recordings: { view: true, download: true, delete: true }
studio: { host: false, present: false, moderate_chat: false, manage_participants: false, control_recording: false, use_tools: true }
```

### Moderator
```
rooms: { view: true, create: false, edit: false, delete: false }
team: { view: true, invite: false, edit: false, remove: false }
recordings: { view: true, download: false, delete: false }
studio: { host: false, present: false, moderate_chat: true, manage_participants: true, control_recording: false, use_tools: false }
```

---

## Common Troubleshooting

### Q: I cannot see the Roles tab.
**A:** The Roles tab is only visible to account owners. If you are an admin, host, presenter, or viewer, you will not see this tab. Ask the account owner to configure roles on your behalf.

### Q: I invited someone but they did not receive the email.
**A:** Check the following:
1. Verify the email address was entered correctly (no typos).
2. Ask the invitee to check their spam/junk folder.
3. Use the "Resend Invite" option from the three-dot menu.
4. If the issue persists, the email service may be experiencing delays. Contact support.

### Q: A team member's status is "Invited" for a long time.
**A:** The status remains "Invited" until the person accepts the invitation by clicking the link in the email and completing registration. They may have missed the email. Use "Resend Invite" to send a fresh invitation.

### Q: I cannot remove a team member.
**A:** Check these scenarios:
1. You cannot remove the account owner (owner role is protected).
2. Your role must have the `team.remove` permission.
3. If you are not the owner and lack remove permissions, ask the owner to perform the removal.

### Q: A suspended member needs to be reactivated.
**A:** Find the suspended member in the team list, click the three-dot menu, and select "Reactivate". Their status will change from "Suspended" back to "Active" and they can log in again.

### Q: How do I transfer account ownership?
**A:** The current owner can promote another admin to owner using the "Make Owner" option in the three-dot menu. Note: transferring ownership is a significant action. The new owner gains full control of the account. The previous owner's role should be updated accordingly.

### Q: My custom role permissions are not working.
**A:** Ensure that:
1. The role was saved correctly (check the permission toggles in the role editor).
2. The team member is assigned to the correct role (check both `role` and `role_id`).
3. The page was refreshed after role changes. Some permission changes require a page reload.

### Q: What happens to members when I delete a custom role?
**A:** Members assigned to a deleted custom role may lose specific permissions. Reassign affected members to a new role (built-in or custom) to ensure continued access.

### Q: Can I have multiple owners?
**A:** The built-in role system supports assigning the "owner" role to multiple members via the "Make Owner" menu option. However, only one user is typically the primary account owner. Use admin roles for additional administrators.

---

## API Reference

### Team Members

```
// List team members
TeamMember.list()

// Invite a new member
onInvite({ email: 'user@example.com', name: 'Jane Doe', role: 'host' })

// Update a member (role change)
onUpdate(memberId, { role: 'admin' })

// Update a member (status change)
onUpdate(memberId, { status: 'suspended' })

// Remove a member
onRemove(memberId)
```

### Roles

```
// Create a role
onCreate({
  name: 'Moderator',
  description: 'Chat and participant management',
  color: '#00c853',
  permissions: { ... }
})

// Update a role
onUpdate(roleId, {
  name: 'Updated Name',
  permissions: { rooms: { view: true, create: true, edit: true, delete: false } }
})

// Delete a role
onDelete(roleId)

// Duplicate a role
onDuplicate({
  ...existingRole,
  name: 'Existing Role (Copy)',
  is_system_role: false
})
```

---

## Related Features

- **Brand Kits**: Brand kit operations require `brand_kits.*` permissions. See `24-brand-kits.md`.
- **Recordings**: Recording access requires `recordings.*` permissions. See `23-recordings-and-clips.md`.
- **Integrations**: Integration management requires `integrations.manage` permission. See `27-integrations.md`.
- **Scheduling**: Session hosting requires `studio.host` permission. See `22-scheduling.md`.
