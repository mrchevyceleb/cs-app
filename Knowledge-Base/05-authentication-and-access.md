# 05 - Authentication and Access Control

## Overview

R-Link uses a token-based authentication system managed through the `AuthProvider` context. Authentication tokens are initially passed via URL parameters, then persisted to `localStorage` for subsequent sessions. The platform supports Single Sign-On (SSO) through Google and Microsoft identity providers, built on the Base44 platform's authentication infrastructure.

The access control system is layered: authentication determines whether a user can access the platform at all, while the permissions system (owner, admin, host, custom roles) determines what features and tabs are available once authenticated.

---

## Authentication Flow

### Initial Login Flow

1. User navigates to R-Link application URL
2. `AuthProvider` initializes and calls `checkAppState()` to determine application status
3. If a token is present in the URL query parameters, it is extracted and stored
4. Token is saved to `localStorage` under the key `base44_access_token`
5. `AuthProvider` sets `isAuthenticated = true` and populates the `user` object
6. Application renders the authenticated interface

### Token Lifecycle

```
URL Parameter (initial login)
    |
    v
Extract token from URL query string
    |
    v
Store in localStorage as "base44_access_token"
    |
    v
All subsequent API calls use token from localStorage
    |
    v
Token expiry or logout → clear localStorage → redirect to login
```

### Token Storage Details

| Property | Value |
|----------|-------|
| Storage mechanism | `localStorage` |
| Key name | `base44_access_token` |
| Token format | JWT (JSON Web Token) |
| Token source | URL query parameter on initial auth |
| Persistence | Survives browser refresh, cleared on logout |

### Clearing Tokens Manually

Users or support agents can force a token clear by appending the query parameter `clear_access_token=true` to any R-Link URL:

```
https://app.r-link.com/?clear_access_token=true
```

This will:
1. Remove `base44_access_token` from `localStorage`
2. Clear any cached authentication state
3. Redirect the user to the login page

**When to use this:** Use when a user is stuck in a broken authentication state, sees stale session data, or encounters persistent 401 errors after a password change.

---

## SSO (Single Sign-On)

### Supported Identity Providers

| Provider | Method | Button Label |
|----------|--------|-------------|
| Google | OAuth 2.0 | "Sign in with Google" |
| Microsoft | OAuth 2.0 / Azure AD | "Sign in with Microsoft" |

### SSO Login Flow

1. User clicks the SSO provider button on the login page
2. Browser redirects to the provider's OAuth consent screen
3. User authenticates with the provider
4. Provider redirects back to R-Link with an authorization code
5. R-Link backend exchanges the code for tokens
6. Backend generates a Base44 access token
7. User is redirected to the app with the token in the URL
8. Normal token extraction and storage proceeds (see Initial Login Flow)

### SSO Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| "Sign in with Google" button not appearing | App public settings not loaded | Refresh the page; check if `appPublicSettings` includes Google OAuth config |
| Redirect loop after Google sign-in | Token not being extracted from URL | Clear cookies, clear localStorage, try again; check for browser extensions blocking redirects |
| Microsoft SSO fails with "tenant not found" | Organization's Azure AD not configured | Contact the organization's IT admin to configure Azure AD for R-Link |
| SSO works but user sees "not registered" | Account exists at provider but not in R-Link | Admin must add the user's email to the R-Link workspace first |
| SSO popup blocked | Browser blocking popup windows | Allow popups for the R-Link domain in browser settings |

---

## AuthProvider Context

The `AuthProvider` is the central authentication context that wraps the entire application. It exposes the following properties and methods:

### Properties

| Property | Type | Description |
|----------|------|-------------|
| `user` | `Object \| null` | The currently authenticated user object. Contains `email`, `name`, `id`, and role information. `null` when not authenticated. |
| `isAuthenticated` | `boolean` | `true` when a valid token exists and the user object has been loaded. |
| `isLoadingAuth` | `boolean` | `true` during initial authentication check and token validation. UI should show a loading state while this is `true`. |
| `authError` | `Object \| null` | Contains error details when authentication fails. Structure: `{ status, code, message }`. |
| `appPublicSettings` | `Object` | Public application settings that do not require authentication. Includes SSO configuration, branding, and feature flags. |

### Methods

| Method | Parameters | Description |
|--------|------------|-------------|
| `logout()` | None | Clears the `base44_access_token` from localStorage, resets user state to null, sets `isAuthenticated` to false, and triggers navigation to the login page. |
| `navigateToLogin()` | None | Redirects the user to the login page without clearing the token. Used when the user needs to re-authenticate but the token might still be valid. |
| `checkAppState()` | None | Checks the current application state by validating the token with the backend. Updates all auth properties based on the response. Called automatically on mount and can be called manually to refresh auth state. |

### checkAppState() Flow

```
checkAppState() called
    |
    v
Read token from localStorage
    |
    +-- No token found
    |       |
    |       v
    |   Set isAuthenticated = false
    |   Set authError = null
    |   Set isLoadingAuth = false
    |   (User sees login page)
    |
    +-- Token found
            |
            v
        Send validation request to backend
            |
            +-- 200 OK
            |       |
            |       v
            |   Set user = response.user
            |   Set isAuthenticated = true
            |   Set authError = null
            |   Set isLoadingAuth = false
            |   (User sees dashboard)
            |
            +-- 401 Unauthorized
            |       |
            |       v
            |   Clear token from localStorage
            |   Set isAuthenticated = false
            |   Set authError = { status: 401, code: 'token_invalid', message: '...' }
            |   Set isLoadingAuth = false
            |   (User sees login page with error)
            |
            +-- 403 Forbidden (auth_required)
            |       |
            |       v
            |   Set isAuthenticated = false
            |   Set authError = { status: 403, code: 'auth_required', message: '...' }
            |   Set isLoadingAuth = false
            |   (User sees "Authentication Required" page)
            |
            +-- 403 Forbidden (user_not_registered)
                    |
                    v
                Set isAuthenticated = false
                Set authError = { status: 403, code: 'user_not_registered', message: '...' }
                Set isLoadingAuth = false
                (User sees "Not Registered" page with contact admin instructions)
```

---

## Error Types and Resolutions

### HTTP 401 - Unauthorized

| Error Code | Message | Cause | User-Facing Message | Resolution Steps |
|------------|---------|-------|---------------------|-----------------|
| `token_invalid` | "The authentication token is invalid or malformed" | Corrupted token in localStorage, token was manually edited, or token format changed after platform update | "Your session has expired. Please log in again." | 1. Navigate to login page. 2. If persists, append `?clear_access_token=true` to URL. 3. Clear browser localStorage for the R-Link domain. 4. Try logging in again. |
| `token_expired` | "The authentication token has expired" | Token TTL exceeded, user was inactive for too long | "Your session has expired. Please log in again." | 1. Log in again normally. 2. If using SSO, the provider may re-authenticate automatically. |
| `token_revoked` | "The authentication token has been revoked" | Admin revoked the user's access, password was changed, or security event triggered revocation | "Your access has been revoked. Please contact your administrator." | 1. Contact workspace admin. 2. If self-service, try logging in again to get a new token. |

### HTTP 403 - Forbidden

| Error Code | Message | Cause | User-Facing Message | Resolution Steps |
|------------|---------|-------|---------------------|-----------------|
| `auth_required` | "Authentication is required to access this application" | The application requires login but the user has no valid session | "Please log in to access R-Link." | 1. Navigate to the login page. 2. Log in with email/password or SSO. 3. If the user believes they should have access, contact the workspace admin. |
| `user_not_registered` | "Your account is not registered in this workspace" | The user authenticated successfully (e.g., via Google SSO) but their email is not registered as a member of the R-Link workspace | "Your account is not registered. Please contact your administrator to be added." | 1. Contact the workspace owner or admin. 2. Admin should add the user's email to the workspace. 3. User tries logging in again after being added. |
| `insufficient_permissions` | "You do not have permission to perform this action" | The user is authenticated but their role does not grant access to the requested resource or action | "You don't have permission to do this. Contact your admin for access." | 1. Check with the workspace admin about role assignments. 2. Admin can upgrade the user's role via the Roles tab. |

### Network and Other Errors

| Scenario | Cause | Resolution |
|----------|-------|------------|
| `isLoadingAuth` stays `true` indefinitely | Network timeout, backend unreachable | Check internet connection. Try refreshing. Check R-Link status page. |
| Login page shows but no error message | Token missing and no auth error set | Normal state for unauthenticated users. Just log in. |
| Blank white screen after login | JavaScript error during AuthProvider initialization | Clear localStorage, hard refresh (Ctrl+Shift+R), try incognito window. |
| "Something went wrong" generic error | Unhandled exception in auth flow | Capture browser console logs and report to support. Try `?clear_access_token=true`. |

---

## Permission System

### Overview

The permission system is managed through the `usePermissions` hook and determines what actions a user can perform and what UI elements they can see. Permissions are hierarchical: owner > admin > host > custom roles.

### usePermissions Hook

The `usePermissions` hook provides the following:

```javascript
const {
  isOwner,           // boolean - true if user.email === owner_email
  role,              // string - 'admin', 'host', or custom role name
  permissions,       // object - granular permission flags
  canAccess,         // function(tab) => boolean - checks tab access
  canPerform,        // function(action) => boolean - checks action permission
} = usePermissions();
```

### Role Hierarchy

#### Owner

| Attribute | Detail |
|-----------|--------|
| Determination | `user.email === workspace.owner_email` |
| Access level | Full unrestricted access to all features |
| Special privileges | Can access Billing tab, can manage Roles, can delete workspace, can transfer ownership |
| Cannot be | Removed, demoted, or restricted by any other role |

#### Admin (Built-in Role)

| Attribute | Detail |
|-----------|--------|
| Assignment | Assigned by owner through Roles tab |
| Access level | All permissions (equivalent to owner for most operations) |
| Key permissions | All team management, all room management, all settings |
| Restrictions | Cannot access Billing tab (owner-only), cannot delete workspace, cannot transfer ownership |

#### Host (Built-in Role)

| Attribute | Detail |
|-----------|--------|
| Assignment | Assigned by owner or admin through Roles tab |
| Access level | Limited to team viewing/inviting and room operations |
| Team permissions | `team.view` = true, `team.invite` = true |
| Room permissions | `rooms.view` = true, `rooms.create` = true, `rooms.edit` = true |
| Restrictions | Cannot manage roles, cannot access billing, cannot delete rooms created by others |

#### Custom Roles

| Attribute | Detail |
|-----------|--------|
| Creation | Owner or admin can create custom roles via the Roles tab |
| Permissions | Granular selection from the full permissions list |
| Flexibility | Can combine any subset of available permissions |

### Permission Flags

The permissions object contains the following granular flags:

| Permission | Description | Admin | Host | Default |
|------------|-------------|-------|------|---------|
| `team.view` | View team member list | Yes | Yes | No |
| `team.invite` | Invite new team members | Yes | Yes | No |
| `team.remove` | Remove team members | Yes | No | No |
| `team.edit_roles` | Change member roles | Yes | No | No |
| `rooms.view` | View rooms list | Yes | Yes | No |
| `rooms.create` | Create new rooms | Yes | Yes | No |
| `rooms.edit` | Edit room settings | Yes | Yes | No |
| `rooms.delete` | Delete rooms | Yes | No | No |
| `settings.view` | View workspace settings | Yes | No | No |
| `settings.edit` | Modify workspace settings | Yes | No | No |
| `billing.view` | View billing information | Owner only | No | No |
| `billing.manage` | Manage subscription and payments | Owner only | No | No |
| `roles.view` | View role definitions | Yes | No | No |
| `roles.manage` | Create/edit/delete roles | Owner only | No | No |

---

## Tab Access Control

### Public Tabs

These tabs are accessible to all authenticated users regardless of role:

| Tab | Path | Description |
|-----|------|-------------|
| Dashboard | `/dashboard` | Main overview, upcoming sessions, quick actions |
| Account | `/account` | Personal account settings, profile, preferences |
| Schedule | `/schedule` | Session scheduling and calendar view |
| Support | `/support` | Help articles, contact support, documentation links |
| Notetaker | `/notetaker` | AI-powered meeting notes and transcription management |

### Restricted Tabs

| Tab | Path | Required Access | Description |
|-----|------|----------------|-------------|
| Billing | `/billing` | Owner only | Subscription management, invoices, plan upgrades, payment methods |
| Roles | `/roles` | Owner only (view and manage) | Role definitions, permission assignments, custom role creation |
| Team | `/team` | `team.view` permission | Team member list, invitations, role assignments |
| Rooms | `/rooms` | `rooms.view` permission | Room management, settings, URLs |
| Settings | `/settings` | `settings.view` permission | Workspace-level configuration |

### Tab Access Check

The `canAccess` function from `usePermissions` is used to conditionally render navigation items:

```javascript
// Tab is visible only if canAccess returns true
if (canAccess('billing')) {
  // Render billing tab in navigation
}
```

If a user attempts to navigate directly to a restricted tab URL, they will see a "You don't have permission to access this page" message with a link back to the Dashboard.

---

## Troubleshooting Guide

### Symptom: User cannot log in at all

**Diagnostic steps:**
1. Ask the user what they see on the screen (login page, error message, blank page)
2. Check if the user is using a supported browser (Chrome, Firefox, Edge, Safari)
3. Have the user try incognito/private browsing mode
4. Check if the workspace URL is correct

**Common fixes:**
- Clear browser cache and cookies for R-Link domain
- Use `?clear_access_token=true` to reset auth state
- Try a different browser
- Check if the workspace is active (not suspended)

### Symptom: User logs in but immediately gets redirected back to login

**Diagnostic steps:**
1. This usually indicates a token storage issue
2. Check if third-party cookies are blocked (affects some SSO flows)
3. Check browser console for errors

**Common fixes:**
- Ensure localStorage is enabled and not full
- Disable browser extensions that block storage (privacy extensions)
- Allow third-party cookies for the R-Link domain
- Try incognito without extensions

### Symptom: User sees "Not Registered" error after SSO

**Diagnostic steps:**
1. Confirm the user's email address with the identity provider
2. Check if that exact email is registered in the R-Link workspace

**Common fixes:**
- Workspace admin adds the user's email address
- Check for email mismatches (e.g., alias vs. primary email)
- If using Microsoft, verify the correct tenant/directory is being used

### Symptom: User was working fine but suddenly gets 401 errors

**Diagnostic steps:**
1. Check when the issue started
2. Was there a recent password change or security event?
3. Is the issue on all devices or just one?

**Common fixes:**
- Log out and log back in to get a fresh token
- If password was changed, all existing tokens are revoked - user must log in again
- Use `?clear_access_token=true` then log in again

### Symptom: User has wrong permissions / cannot see expected tabs

**Diagnostic steps:**
1. Confirm the user's role with the workspace owner/admin
2. Check if the user is accessing the correct workspace
3. Verify the role assignment in the Roles tab

**Common fixes:**
- Owner/admin reassigns the correct role
- If using custom roles, verify all needed permissions are included
- User may need to refresh the page after role changes take effect

### Symptom: "Authentication Required" page appears unexpectedly

**Diagnostic steps:**
1. This is the `403/auth_required` error
2. Check if the workspace requires authentication (most do)
3. Token may have been cleared by another tab or browser action

**Common fixes:**
- Simply log in again
- If the user was previously authenticated, their token may have expired
- Check if another browser tab triggered a logout

---

## Frequently Asked Questions

### Q: How long does a login session last?
**A:** Sessions persist as long as the token in localStorage is valid. Token expiry is managed by the Base44 backend. Typically, sessions last several days but may be shorter if the workspace admin has configured stricter session policies. Users will be prompted to re-authenticate when the token expires.

### Q: Can a user be logged into multiple devices simultaneously?
**A:** Yes. Each device/browser gets its own token. Logging out on one device does not affect sessions on other devices. However, if the user's access is revoked by an admin, all tokens become invalid.

### Q: What happens if a user changes their email address?
**A:** Email address changes must be coordinated with the workspace admin. The permission system uses email matching (`user.email === owner_email` for owner detection), so email changes can affect role assignments. The admin should update the user's record in the workspace.

### Q: Can an admin see who is currently logged in?
**A:** The current version does not provide a real-time "active sessions" view. Admins can see team members and their last activity, but not active session counts.

### Q: How does R-Link handle concurrent login from the same browser?
**A:** Only one token is stored per browser (single `base44_access_token` key). If a user logs into a different account in the same browser, the previous token is overwritten. Use different browser profiles for multiple accounts.

### Q: Is there two-factor authentication (2FA)?
**A:** 2FA depends on the SSO provider. If the user logs in via Google or Microsoft and their provider account has 2FA enabled, it will be enforced during the SSO flow. R-Link does not have its own standalone 2FA mechanism.

### Q: What data is stored in localStorage?
**A:** The primary authentication data stored is the `base44_access_token`. Additional settings (display preferences, last-used devices) may also be cached in localStorage but are not authentication-critical.

---

## Known Limitations

1. **No session management UI:** Users cannot view or manage their active sessions. There is no "log out all devices" button - this requires admin intervention or a password change.

2. **Token revocation lag:** When an admin removes a user's access, existing tokens may remain valid until the next `checkAppState()` call or API request. There is no real-time push notification to invalidate sessions.

3. **Single workspace per session:** The auth token is scoped to one workspace. Users who belong to multiple workspaces must switch contexts, which may require re-authentication.

4. **localStorage dependency:** Authentication relies entirely on localStorage. Users with localStorage disabled, browsers in certain privacy modes, or storage quota exceeded will not be able to maintain sessions.

5. **No password reset flow in-app:** Password management is handled through the Base44 platform or the SSO provider. R-Link does not have its own password reset page.

6. **SSO-only restriction not configurable:** Workspace admins cannot currently force SSO-only login (disabling email/password login). All login methods are available if configured.

7. **Email case sensitivity:** Email matching for owner detection and role assignment may be case-sensitive depending on the backend configuration. Users should ensure consistent email casing across SSO providers and workspace registration.

---

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Email/password login | Yes | Yes |
| Google SSO | Yes | Yes |
| Microsoft SSO | Yes | Yes |
| Custom roles | No | Yes |
| Built-in roles (admin, host) | Yes | Yes |
| Team management | Limited (up to 5 members) | Yes (unlimited) |
| Role management tab | Owner only | Owner only |
| Billing tab | Owner only | Owner only |

---

## Related Documents

- [06 - Rooms Management](./06-rooms-management.md) - Room access requires authentication; room settings interact with permission levels
- [07 - Session Types](./07-session-types.md) - Session creation requires appropriate permissions
- [08 - Studio Interface](./08-studio-interface.md) - Studio access is controlled by room permissions and authentication state
- [09 - Studio Media Controls](./09-studio-media-controls.md) - Media settings are per-user and tied to the authenticated session
