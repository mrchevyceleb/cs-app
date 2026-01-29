# Team Management and Roles

## Overview

The Team/Users tab and the Roles system together provide comprehensive access control for R-Link accounts. Located in Group 1 of the Admin Sidebar (alongside Dashboard and Account), Team management allows account owners and admins to invite members, assign roles, and control what each member can access and modify.

The system consists of two interrelated entities:

- **TeamMember**: Represents a person invited to or active on the account, with a role assignment.
- **Role**: Defines a set of permissions that determine what actions a team member can perform.

R-Link includes built-in roles (admin, host) and supports custom roles for fine-grained access control. Role management is restricted to account owners only.

## Team Members

### TeamMember Entity Structure

```
TeamMember {
  account_id    // The account this member belongs to
  user_email    // The member's email address (used for login)
  email         // Contact email (may be same as user_email)
  status        // Membership status (e.g., 'invited')
  invited_at    // Timestamp of when the invitation was sent
  role          // Role name or identifier assigned to this member
  role_id       // Reference to the Role entity
}
```

### Inviting Team Members

New team members are added via invitation. When invited, a TeamMember record is created with `status: 'invited'`.

**Step-by-Step: Invite a Team Member**

1. Navigate to **Team/Users** in the Admin Sidebar.
2. Click **Invite Member** (or equivalent button).
3. Enter the person's **email address**.
4. Select a **role** to assign (admin, host, or a custom role).
5. Click **Send Invitation**.
6. The system creates a TeamMember record with:
   - `account_id`: Current account
   - `user_email`: The entered email
   - `email`: The entered email
   - `status`: `'invited'`
   - `invited_at`: Current timestamp
   - `role`: Selected role name
   - `role_id`: Selected role's ID
7. The invitee receives an email with instructions to join the account.

**Permission Requirement**: Inviting members requires the `team.invite` permission (`canInvite`).

### Member Status Lifecycle

| Status | Description |
|--------|-------------|
| `invited` | Invitation sent, member has not yet accepted |
| `active` | Member has accepted the invitation and is active on the account |
| `suspended` | Member access has been temporarily suspended |
| `removed` | Member has been removed from the account |

### Updating Team Members

Updating a team member allows changing their role or other profile information.

**Step-by-Step: Update a Team Member**

1. Navigate to **Team/Users**.
2. Find the member in the list.
3. Click **Edit** or the member's row.
4. Change the assigned **role** or update other fields.
5. Click **Save**.

**Permission Requirement**: Editing members requires the `team.edit` permission (`canEdit`).

### Removing Team Members

Removing a team member revokes their access to the account.

**Step-by-Step: Remove a Team Member**

1. Navigate to **Team/Users**.
2. Find the member to remove.
3. Click **Remove** (or delete icon).
4. Confirm the removal.
5. The member loses access to the account immediately.

**Permission Requirement**: Removing members requires the `team.remove` permission (`canRemove`).

**Important Notes**:
- Removing a member does not delete their user account; it only disconnects them from this R-Link account.
- The account owner cannot be removed.
- Content created by removed members (recordings, brand kits, etc.) remains on the account.

## Role System

### Overview

The Role system defines what actions a team member can perform. Each role is a named entity with a permissions object that maps permission categories to specific allowed actions.

### Role Entity Structure

```
Role {
  account_id    // The account this role belongs to
  permissions   // Nested object: { category: { action: boolean } }
}
```

The `permissions` field uses a nested structure where the top-level keys are **permission categories** and the nested keys are **permission actions** with boolean values.

Example:
```json
{
  "team": {
    "view": true,
    "invite": true,
    "edit": false,
    "remove": false
  },
  "rooms": {
    "view": true,
    "create": true,
    "edit": true,
    "delete": false
  },
  "recordings": {
    "view": true,
    "delete": false
  }
}
```

### Permission Categories

The following permission categories control access to different areas of the platform:

| Category | Description | Available Actions |
|----------|-------------|-------------------|
| `team` | Team member management | `view`, `invite`, `edit`, `remove` |
| `rooms` | Room creation and management | `view`, `create`, `edit`, `delete` |
| `settings` | Account settings | `view`, `edit`, `manage` |
| `integrations` | Third-party integrations | `view`, `edit`, `manage` |
| `brand_kits` | Brand kit management | `view`, `create`, `edit`, `delete` |
| `templates` | Room template management | `view`, `create`, `edit`, `delete` |
| `recordings` | Recording management | `view`, `create`, `edit`, `delete` |

### Permission Actions

| Action | Description |
|--------|-------------|
| `view` | Can see/access the feature or data |
| `create` | Can create new items |
| `edit` | Can modify existing items |
| `delete` | Can permanently remove items |
| `invite` | Can send invitations (specific to team) |
| `remove` | Can remove members (specific to team) |
| `manage` | Full management access (specific to settings/integrations) |

### Built-In Roles

R-Link provides two built-in roles with predefined permissions:

#### Admin Role

The admin role grants **all permissions** across all categories. Admins have full access to every feature and management capability.

```
Admin permissions: ALL actions in ALL categories = true
```

An admin can:
- View, invite, edit, and remove team members.
- View, create, edit, and delete rooms, brand kits, templates, and recordings.
- View, edit, and manage settings and integrations.
- Perform all actions available in the admin panel.

**Important**: The admin role does NOT include the ability to manage roles. Role CRUD operations are reserved for the account owner exclusively.

#### Host Role

The host role grants **limited permissions** focused on session hosting and basic team visibility.

```
Host permissions:
  team:       view, invite
  rooms:      view, create, edit
  (all other categories: no access)
```

A host can:
- View the team member list.
- Invite new team members.
- View existing rooms.
- Create new rooms.
- Edit rooms they have access to.

A host **cannot**:
- Edit or remove team members.
- Delete rooms.
- Access settings, integrations, brand kits, templates, or recordings management.

### Default Permission Behavior

**Critical implementation detail**: If `roles.length === 0` (no roles exist on the account), the system grants all permissions to all members. This is a fallback behavior to ensure new accounts are not locked out before roles are configured.

Once at least one role is created and assigned, the permission system enforces role-based restrictions.

### Custom Roles

Account owners can create custom roles with any combination of permissions for fine-grained access control.

#### Creating a Custom Role

1. Navigate to the **Roles** management area (accessible only to account owners).
2. Click **Create Role**.
3. Enter a **name** for the role.
4. Configure permissions by toggling individual actions within each category:
   - For each category (team, rooms, settings, integrations, brand_kits, templates, recordings), enable or disable specific actions (view, create, edit, delete, invite, remove, manage).
5. Click **Save**.

#### Editing a Custom Role

1. Navigate to **Roles** management.
2. Select the role to edit.
3. Modify the permissions as needed.
4. Click **Save**.
5. Changes take effect immediately for all team members assigned to this role.

#### Deleting a Custom Role

1. Navigate to **Roles** management.
2. Select the role to delete.
3. Click **Delete** and confirm.
4. If team members are assigned to this role, you will need to reassign them to a different role.

#### Duplicating a Role

1. Navigate to **Roles** management.
2. Select an existing role.
3. Click **Duplicate**.
4. A new role is created with the same permissions as the source role.
5. Rename the duplicated role and adjust permissions as needed.
6. Click **Save**.

### Owner-Only Role Management

**All role CRUD operations (create, update, delete, duplicate) are restricted to the account owner.** The `canAccessTab('roles')` function returns `false` for all non-owner users, including admins.

This means:
- Only the owner sees the Roles management area.
- Only the owner can create new roles.
- Only the owner can edit existing roles.
- Only the owner can delete roles.
- Only the owner can duplicate roles.
- Admins can assign existing roles to team members but cannot modify role definitions.

## Tab Access Control

The permission system also controls which Admin Sidebar tabs are visible to each user. The `usePermissions` hook (from `usePermissions.jsx`) evaluates the user's role and determines tab visibility.

### Tab Visibility by Permission

| Tab | Required Permission | Admin | Host | Notes |
|-----|-------------------|-------|------|-------|
| Dashboard | Always visible | Yes | Yes | |
| Account | `settings.view` | Yes | No | |
| Team/Users | `team.view` | Yes | Yes | |
| Brand Kits | `brand_kits.view` | Yes | No | |
| Room Templates | `templates.view` | Yes | No | |
| Elements Library | Varies | Yes | No | |
| Rooms | `rooms.view` | Yes | Yes | |
| Schedule | `rooms.view` | Yes | Yes | Tied to rooms permission |
| Recordings | `recordings.view` | Yes | No | |
| Clips | `recordings.view` | Yes | No | Tied to recordings permission |
| Event Landing Pages | Varies | Yes | No | |
| Leads | Varies | Yes | No | |
| AI Notetaker | Varies | Yes | No | |
| Integrations | `integrations.view` | Yes | No | |
| Billing & Usage | `settings.view` | Yes | No | |
| Settings | `settings.view` | Yes | No | |
| Support | Always visible | Yes | Yes | |

## Permission Inheritance and Evaluation

### How Permissions Are Evaluated

The `usePermissions` hook uses the following logic:

1. **Check if user is owner**: Owners have unrestricted access to everything, including role management.
2. **Check if roles exist**: If `roles.length === 0`, all permissions are granted (fallback behavior).
3. **Look up user's role**: Find the Role entity matching the user's `role_id`.
4. **Evaluate permission**: Check `role.permissions[category][action]` for the requested permission.
5. **Return boolean**: `true` if permission is granted, `false` if denied or not defined.

### Permission Check Functions

The permission system exposes helper functions used throughout the admin panel:

- `canInvite` -- checks `team.invite`
- `canEdit` -- checks the relevant `[category].edit` for the context
- `canRemove` -- checks `team.remove`
- `canCreate` -- checks the relevant `[category].create` for the context
- `canDelete` -- checks the relevant `[category].delete` for the context
- `canAccessTab(tabName)` -- determines if a sidebar tab is visible

### Undefined Permissions

If a permission action is not defined in the role's permissions object (i.e., the key does not exist), it is treated as `false` (denied). Only explicitly set `true` values grant access.

## Settings and Options

### Team Settings

| Setting | Description | Notes |
|---------|-------------|-------|
| Invite by email | Send invitation via email | Primary invitation method |
| Role assignment | Assign role during invite | Required field |
| Bulk invite | Invite multiple members at once | Enter comma-separated emails |

### Role Settings

| Setting | Description | Notes |
|---------|-------------|-------|
| Role name | Display name of the role | Required, must be unique on account |
| Permission toggles | Individual category.action booleans | All default to false for new custom roles |

## Troubleshooting

### Cannot invite team members
- Verify your role has the `team.invite` permission.
- Admin role includes this permission by default.
- Host role includes this permission by default.
- Check that the email address is valid and not already on the account.

### Invited member did not receive invitation
- Check the email address for typos.
- Ask the invitee to check spam/junk folders.
- The invitation email may be delayed; wait a few minutes.
- If using a custom email integration (SendGrid, Mailchimp), verify the integration is connected.

### Cannot see certain admin tabs
- Your role does not include the `view` permission for that category.
- Ask the account owner to check your role assignment.
- If no roles have been configured yet (`roles.length === 0`), all tabs should be visible. If they are not, there may be a different issue.

### Cannot manage roles
- Role management is owner-only. Even admin role users cannot access role CRUD.
- Verify you are logged in as the account owner (not just an admin).

### Permission changes not taking effect
- Permission changes take effect immediately. Try refreshing the browser.
- Verify the correct role was edited (not a different role with a similar name).
- Check that the team member is assigned to the updated role.

### All permissions granted unexpectedly
- If no roles exist on the account (`roles.length === 0`), the system defaults to granting all permissions.
- Create at least one role and assign it to team members to enforce restrictions.

### Cannot remove a team member
- Verify your role has the `team.remove` permission.
- The account owner cannot be removed from the account.
- Admin role includes this permission; host role does not.

### Role deletion issues
- Roles assigned to active team members cannot be deleted without reassigning those members first.
- Only the account owner can delete roles.

## FAQ

**Q: What is the difference between `user_email` and `email` on a TeamMember?**
A: `user_email` is the email used for authentication and login. `email` is the contact email, which is often the same but can differ if the member uses a different email for correspondence.

**Q: Can I create unlimited custom roles?**
A: On Business plans, there is no hard limit on the number of custom roles. Basic plans may have restrictions.

**Q: What happens when I change a team member's role?**
A: The change takes effect immediately. The member's accessible tabs and actions update the next time they load the admin panel (or on page refresh).

**Q: Can a team member have multiple roles?**
A: No. Each team member is assigned exactly one role via the `role_id` field. To combine permissions from multiple roles, create a custom role with the desired combination.

**Q: What is the difference between "admin" and "owner"?**
A: The **owner** is the person who created the account and has unrestricted access to everything, including role management. An **admin** has all operational permissions but cannot create, edit, or delete roles. Only one person is the owner; multiple people can be admins.

**Q: Can the owner's role be changed?**
A: No. The owner always has full access regardless of role assignments. The owner is identified by account ownership, not by role.

**Q: What happens if I delete all roles?**
A: If `roles.length === 0`, the system defaults to granting all permissions to all team members. This is a safety fallback. It is recommended to always have at least one role configured.

**Q: Can I restrict which rooms a team member can access?**
A: The current role system controls access at the category level (e.g., `rooms.view` grants access to all rooms). Room-level granular access control (per-room permissions) is not part of the role system.

**Q: How do built-in roles differ from custom roles?**
A: Built-in roles (admin, host) have fixed permission sets that cannot be modified. Custom roles allow you to define any combination of permissions. Built-in roles are always available; custom roles are created by the account owner.

**Q: Can I rename built-in roles?**
A: No. Built-in roles (admin, host) have fixed names. You can create a custom role with any name and similar permissions if you prefer different naming.

## Known Limitations

- Each team member can only have one role; multi-role assignment is not supported.
- Role management is exclusively owner-only; it cannot be delegated to admins.
- Built-in roles (admin, host) cannot be modified or deleted.
- The fallback behavior (all permissions when `roles.length === 0`) may create a security concern on new accounts before roles are configured.
- Permission granularity is at the category level; per-item permissions (e.g., specific rooms, specific brand kits) are not supported.
- There is no audit log for permission changes or team member actions.
- Bulk role assignment (changing multiple members' roles at once) is not available.
- The `invited` status does not expire automatically; stale invitations remain in the system.

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Invite team members | Limited seats | Extended seats |
| Built-in roles (admin, host) | Yes | Yes |
| Custom roles | No | Yes |
| Role CRUD (owner) | N/A (no custom roles) | Yes |
| Permission categories | All | All |
| Team member management | Yes | Yes |
| Bulk invite | No | Yes |

## Related Documents

- **21-admin-panel-navigation.md** -- Admin sidebar structure and tab groupings
- **24-brand-kits.md** -- Brand kit permissions (`brand_kits` category)
- **27-integrations.md** -- Integration permissions (`integrations` category)
- **23-recordings-and-clips.md** -- Recording permissions (`recordings` category)
