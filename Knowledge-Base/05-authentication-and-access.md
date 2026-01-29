# Authentication and Access Control

## Overview

R-Link uses the Base44 platform's authentication system to manage user identity, session tokens, and access permissions. Authentication is handled through the `AuthProvider` context, which wraps the entire application and provides user state, login/logout flows, and permission checks to all components. This document covers every aspect of the authentication lifecycle -- from initial login through token management, permission evaluation, and troubleshooting auth failures.

Understanding this system is critical for diagnosing customer issues related to login failures, access denied errors, token expiration, and permission misconfigurations.

---

## Login Flow

### How Login Works

1. The user navigates to any R-Link page that requires authentication.
2. The `AuthProvider` component initializes and calls `checkAppState()` to fetch public settings.
3. If the user is not authenticated, the system determines whether auth is required based on the API response.
4. The user is redirected to the Base44 login page via `base44.auth.redirectToLogin(currentUrl)`.
5. The `currentUrl` is passed so the user is returned to their original destination after login.
6. After successful authentication on the Base44 side, the user is redirected back to R-Link with an `access_token` URL parameter.
7. The application reads the `access_token` from the URL and stores it in `localStorage` as `base44_access_token`.
8. The URL parameter is then cleaned from the address bar.
9. Subsequent page loads read the token from `localStorage` to maintain the session.

### Step-by-Step: What the Customer Sees

1. Customer opens an R-Link URL (e.g., a room link or admin portal).
2. A loading spinner appears while `checkAppState()` runs.
3. If not logged in, the customer is redirected to a login page.
4. The login page presents options: email/password, Google SSO, or Microsoft SSO (depending on configuration).
5. After entering credentials, the customer is redirected back to the original R-Link page.
6. The page loads with full access based on their role and permissions.

### Programmatic Login Trigger

The `navigateToLogin()` function is available throughout the application via the `AuthContext`. It calls:

```
base44.auth.redirectToLogin(currentUrl)
```

This ensures the return URL is always the page the user was trying to access.

---

## Token Management

### Token Storage

| Item | Details |
|---|---|
| Token key in localStorage | `base44_access_token` |
| Token source | URL parameter `access_token` after login redirect |
| Token format | JWT (JSON Web Token) issued by Base44 |
| Token lifetime | Managed by Base44 platform; expires after inactivity |
| Token refresh | Not handled client-side; expired tokens trigger re-login |

### Token Lifecycle

1. **Acquisition**: Token arrives as a URL query parameter (`?access_token=...`) after Base44 login.
2. **Storage**: Immediately saved to `localStorage` under the key `base44_access_token`.
3. **Usage**: Included in API requests to Base44 backend for authentication.
4. **Expiration**: When the token expires, API calls return `401` status codes.
5. **Removal**: Token is removed from `localStorage` during logout or when `clear_access_token=true` is passed as a URL parameter.

### Token Reset via URL Parameter

If a customer is experiencing persistent auth issues, the URL parameter `clear_access_token=true` can be appended to any R-Link URL:

```
https://app.r-link.com/?clear_access_token=true
```

This forces the application to:
1. Remove the existing `base44_access_token` from `localStorage`.
2. Clear any cached user state.
3. Redirect the user to the login page for fresh authentication.

**When to recommend this to customers:**
- When they report being "stuck" on a loading screen after login.
- When they see stale user data or wrong account information.
- When switching between accounts on the same browser.
- After a password reset, if the old session persists.

---

## Session Persistence

### How Sessions Persist

R-Link sessions persist entirely through the `base44_access_token` stored in `localStorage`. There are no server-side sessions or cookies involved in the R-Link client application itself.

| Behavior | Details |
|---|---|
| New tab/window | Session persists (same localStorage) |
| Browser refresh | Session persists (token remains in localStorage) |
| Browser close and reopen | Session persists (localStorage survives browser close) |
| Incognito/private mode | No persistence (localStorage cleared on window close) |
| Different browser | No persistence (separate localStorage) |
| Clear browser data | Session lost (localStorage cleared) |

### Important Notes for Support

- If a customer says they have to log in every time they open the browser, check if they are using incognito/private browsing mode.
- If a customer says they are logged in on Chrome but not Firefox, this is expected -- each browser has its own localStorage.
- Clearing browser cache/data will remove the token and require re-login.

---

## Logout Flow

### How Logout Works

The `logout(shouldRedirect = true)` function performs the following steps:

1. Clears the user state in the `AuthContext` (sets user to `null`, `isAuthenticated` to `false`).
2. Calls `base44.auth.logout()` to clear the token on the Base44 platform side.
3. Removes `base44_access_token` from `localStorage`.
4. If `shouldRedirect` is `true` (default), redirects the user to the login page.

### When Logout is Triggered

- User clicks the **Logout** button in the admin portal or account settings.
- Programmatically when the application detects an unrecoverable auth error.
- When `clear_access_token=true` URL parameter is processed.

### Silent Logout (No Redirect)

When `logout(false)` is called, the user state is cleared but no redirect occurs. This is used internally when the application needs to reset auth state without disrupting the current page (e.g., during error recovery).

---

## Auth Error Types

### 403 Forbidden -- auth_required

| Field | Value |
|---|---|
| HTTP Status | 403 |
| Error Reason | `auth_required` |
| Meaning | The user is not logged in and the requested resource requires authentication |
| User Experience | Redirected to login page |
| Resolution | Log in with valid credentials |

This error occurs when:
- A user accesses a protected page without a token.
- The token in `localStorage` is missing or empty.

### 403 Forbidden -- user_not_registered

| Field | Value |
|---|---|
| HTTP Status | 403 |
| Error Reason | `user_not_registered` |
| Meaning | The user authenticated successfully but does not have an account in this R-Link application |
| User Experience | Error message displayed; not redirected to login |
| Resolution | The account owner must invite the user, or the user must register through the proper onboarding flow |

This error occurs when:
- A user logs in with valid Base44 credentials but has never been added to this specific R-Link account.
- An invited team member's email does not match their login email.

### 401 Unauthorized -- Expired Token

| Field | Value |
|---|---|
| HTTP Status | 401 |
| Error Reason | Token expired or invalid |
| Meaning | The stored token is no longer valid |
| User Experience | Redirected to login page for re-authentication |
| Resolution | Log in again to obtain a fresh token |

This error occurs when:
- The user has been inactive for an extended period.
- The Base44 platform has invalidated the token (e.g., password change, admin action).
- The token was manually tampered with.

---

## Public Settings Check Flow (checkAppState)

### How It Works

On every application load, the `AuthProvider` calls `checkAppState()`, which:

1. Makes a GET request to: `/api/apps/public/prod/public-settings/by-id/{appId}`
2. This endpoint does NOT require authentication -- it returns public configuration for the R-Link instance.
3. The response includes settings like:
   - Whether the app requires authentication.
   - SSO configuration (which providers are enabled).
   - Public branding settings.
   - Feature flags.
4. The result is stored as `appPublicSettings` in the auth context.
5. The `isLoadingPublicSettings` flag is set to `false` once the request completes.

### Failure Scenarios

| Scenario | Behavior |
|---|---|
| Network error (no internet) | Loading state persists; user sees spinner indefinitely |
| Invalid appId | 404 error; application cannot initialize |
| Server error (500) | Loading state persists; retry may be needed |

**Support guidance**: If a customer reports a permanent loading spinner on the initial page load, it may be a `checkAppState()` failure. Ask them to:
1. Check their internet connection.
2. Try refreshing the page.
3. Clear cache and try again.
4. If the issue persists, escalate to engineering (possible server-side issue).

---

## SSO Integrations

### Google SSO

| Setting | Details |
|---|---|
| Provider | Google |
| Protocol | OAuth 2.0 |
| Configuration | Enabled/disabled at the account level by the account owner |
| User experience | "Sign in with Google" button on the login page |
| Account linking | Email address must match between Google account and R-Link account |

### Microsoft SSO

| Setting | Details |
|---|---|
| Provider | Microsoft (Azure AD) |
| Protocol | OAuth 2.0 |
| Configuration | Enabled/disabled at the account level by the account owner |
| User experience | "Sign in with Microsoft" button on the login page |
| Account linking | Email address must match between Microsoft account and R-Link account |

### SSO Troubleshooting

| Issue | Cause | Resolution |
|---|---|---|
| "Sign in with Google" button not showing | Google SSO not enabled for this account | Account owner must enable it in SSO settings |
| SSO login succeeds but user gets "not registered" | User's SSO email doesn't match any R-Link account user | Account owner must invite the user with the correct email |
| SSO popup blocked | Browser blocking pop-ups | Customer should allow pop-ups for the R-Link domain |
| SSO login loops back to login page | Token not being saved properly | Try `?clear_access_token=true`, then log in again |

---

## Permission System

### Role Hierarchy

R-Link uses a role-based permission system with the following hierarchy:

1. **Owner** -- The account creator. Has all permissions. Cannot be removed. Identified by `currentUser.email === account.owner_email`.
2. **Admin** (built-in role) -- Has all permissions across the platform. Can manage team, rooms, settings, integrations, brand kits, templates, and recordings.
3. **Host** (built-in role) -- Has limited permissions: can view and invite team members, and can view, create, and edit rooms.
4. **Custom Roles** -- Account owners can create custom roles with specific permission grants.

### Permission Categories and Actions

Permissions are organized by category, with specific actions within each:

| Category | Available Actions |
|---|---|
| `team` | view, invite, edit, remove |
| `rooms` | view, create, edit, delete |
| `settings` | view, edit |
| `integrations` | view, connect, disconnect |
| `brand_kits` | view, create, edit, delete |
| `templates` | view, create, edit, delete |
| `recordings` | view, download, delete |

### Permission Check Function

The `hasPermission(category, action)` function evaluates permissions as follows:

1. If the user is the **owner**, return `true` (owner has all permissions).
2. If the user has an **admin** role, return `true` (admin has all permissions).
3. If **no role system is configured** (i.e., `roles.length === 0`), return `true` for all users (permissions are effectively disabled).
4. Otherwise, check the user's assigned role for the specific `category` + `action` combination.

### Important: Default Behavior When No Roles Exist

If the account owner has not set up any roles, all team members have full permissions. This is by design to avoid blocking access in accounts that have not configured role-based access control. Once the first role is created, the permission system becomes active and all users without an assigned role lose access to restricted tabs and features.

---

## Tab Access Control

### Public Tabs (Always Accessible)

These tabs are accessible to all authenticated users regardless of role:

| Tab | Description |
|---|---|
| `dashboard` | Account dashboard with analytics |
| `account` | User's own account settings |
| `schedule` | Session scheduling |
| `support` | Support and help resources |
| `notetaker` | AI notetaker settings |

### Owner-Only Tabs

These tabs are accessible only to the account owner:

| Tab | Description |
|---|---|
| `billing` | Subscription management, invoices, payment methods |
| `roles` | Role creation and management |

### Permission-Based Tabs

All other tabs require specific permissions as determined by the user's role. The `canAccessTab(tab)` function returns a boolean indicating whether the current user can view a given admin tab.

**Example**: A user with the "host" role can access the **Rooms** tab (because hosts have `rooms.view` permission) but cannot access the **Integrations** tab (because hosts do not have `integrations.view` permission).

---

## Troubleshooting Authentication Issues

### Issue: Customer Cannot Log In

| Step | Action |
|---|---|
| 1 | Verify the customer is using a supported browser (Chrome, Firefox, Edge, Safari) |
| 2 | Ask if they are in incognito/private mode (token will not persist between sessions) |
| 3 | Ask them to clear browser cache and cookies for the R-Link domain |
| 4 | Try appending `?clear_access_token=true` to the URL |
| 5 | Check if pop-ups are blocked (required for SSO) |
| 6 | Verify the customer's email matches an invited user on the account |
| 7 | If all else fails, escalate to Tier 2 support |

### Issue: Customer Sees "Access Denied" or "Permission Denied"

| Step | Action |
|---|---|
| 1 | Confirm the customer's role in the admin portal (ask the account owner to check) |
| 2 | Verify the tab or feature they are trying to access |
| 3 | Check if the feature requires a specific plan (Business vs Basic) |
| 4 | If the customer is the owner, check if the account has expired or is in a grace period |
| 5 | If role-based, ask the owner to assign the correct role or adjust permissions |

### Issue: Customer Is Logged In as the Wrong Account

| Step | Action |
|---|---|
| 1 | Navigate to `?clear_access_token=true` to force token reset |
| 2 | Log out using the Logout button |
| 3 | Clear all R-Link cookies and localStorage |
| 4 | Log in again with the correct credentials |

### Issue: Infinite Loading Spinner on Page Load

| Step | Action |
|---|---|
| 1 | This may indicate a `checkAppState()` failure |
| 2 | Check internet connection |
| 3 | Try refreshing the page |
| 4 | Try a different browser or incognito mode |
| 5 | Append `?clear_access_token=true` to the URL |
| 6 | If the issue persists across browsers and networks, escalate to engineering |

### Issue: Customer Gets Logged Out Unexpectedly

| Step | Action |
|---|---|
| 1 | Token may have expired due to inactivity |
| 2 | Check if the customer recently changed their password (invalidates tokens) |
| 3 | Check if browser extensions are clearing localStorage |
| 4 | Verify the customer is not in incognito/private mode |
| 5 | Ask if the issue is reproducible at a specific time interval |

---

## FAQ

**Q: How long does a login session last?**
A: Session duration is managed by the Base44 platform. Tokens expire after a period of inactivity. The exact timeout is configured server-side and is not exposed to the client application. If a customer's token expires, they are automatically redirected to the login page.

**Q: Can a user be logged in on multiple devices simultaneously?**
A: Yes. Each device/browser has its own independent token. Logging in on a new device does not invalidate tokens on other devices.

**Q: What happens if two people use the same account?**
A: R-Link does not prevent concurrent sessions on the same account. However, each user should have their own account for proper permission tracking and audit trails.

**Q: Can the account owner see who is logged in?**
A: The admin portal shows team members, but there is no real-time "currently logged in" indicator. Session activity is tracked at the API level.

**Q: Does R-Link support multi-factor authentication (MFA)?**
A: MFA is handled at the Base44 platform level, not within R-Link directly. If the Base44 account has MFA enabled, it will be enforced during login.

**Q: Can I force all team members to re-authenticate?**
A: There is no direct "force logout all users" button in R-Link. Changing the account's auth settings or contacting Base44 support can achieve this.

**Q: What happens to a user's access when their role is changed?**
A: Permission changes take effect on the next page load or API call. There is no real-time push of permission changes to active sessions. Advise the user to refresh the page after a role change.

---

## Known Limitations

1. **No client-side token refresh**: When a token expires, the user must log in again. There is no silent refresh mechanism.
2. **No session timeout warning**: Users are not warned before their token expires. They discover the expiration when an API call fails.
3. **No "remember me" option**: The token always persists in localStorage. There is no option for session-only tokens (except by using incognito mode).
4. **SSO provider limitations**: Only Google and Microsoft SSO are supported. Other providers (Apple, GitHub, SAML) are not available.
5. **No audit log for login events**: Individual login/logout events are not tracked in a customer-facing audit log.
6. **Role changes not real-time**: After changing a user's role, they must refresh the page for the new permissions to take effect.
7. **No granular permission for individual rooms**: Permissions apply to all rooms equally; you cannot restrict a user to only specific rooms.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Email/password login | Yes | Yes |
| Google SSO | Yes | Yes |
| Microsoft SSO | Yes | Yes |
| Role-based access control | Yes | Yes |
| Custom roles | Yes | Yes |
| Team member invitations | Yes (limited seats) | Yes (more seats) |
| Owner-only billing tab | Yes | Yes |

Authentication and access control features are available on both Basic and Business plans. The permission system itself is not plan-gated, though some of the features that permissions control (e.g., integrations, advanced recordings) may be Business-only.

---

## Related Documents

- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture and navigation overview
- [02-plans-and-pricing.md](./02-plans-and-pricing.md) -- Plan limits that affect access and features
- [03-getting-started.md](./03-getting-started.md) -- Initial signup and onboarding flow
- [06-rooms-management.md](./06-rooms-management.md) -- Room access and permissions
- [08-studio-interface.md](./08-studio-interface.md) -- Studio access requirements
- [31-troubleshooting.md](./31-troubleshooting.md) -- Auth error troubleshooting steps
