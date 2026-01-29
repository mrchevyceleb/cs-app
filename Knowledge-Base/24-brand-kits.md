# 24 - Brand Kits

## Overview

Brand Kits in R-Link allow users to define and manage complete visual identities for their rooms, webinars, and recordings. The Brand Kit system supports multiple brand identities per account, with defaults, templates, and granular permissions. The Brand Kit tab is powered by the `BrandKitTab` component and manages `BrandKit` entities. Each brand kit encapsulates colors, fonts, logos, backgrounds, frame styles, lower third overlays, and watermark settings.

---

## Accessing Brand Kits

1. Log in to your R-Link account.
2. Navigate to the Admin Dashboard.
3. Click the **Brand Kits** tab in the left sidebar.
4. The tab displays two sub-tabs: **My Brand Kits** and **Templates**.

---

## BrandKit Entity

The `BrandKit` entity stores the complete visual identity configuration. Below is the full schema with default values:

### Top-Level Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `id` | string | (auto) | Unique identifier |
| `account_id` | string | (auto) | Owner account ID |
| `name` | string | '' | Display name for the brand kit |
| `description` | string | '' | Optional description |
| `is_default` | boolean | false | Whether this is the account's default brand kit |
| `is_global_default` | boolean | false | Whether this is the global default for all new accounts |
| `is_template` | boolean | false | Whether this brand kit is available as a template |
| `colors` | object | (see below) | Color palette |
| `fonts` | object | (see below) | Typography settings |
| `logos` | object | {} | Logo file URLs |
| `backgrounds` | array | [] | Background image URLs |
| `frame` | object | (see below) | Video frame styling |
| `lower_third` | object | (see below) | Name/title overlay styling |
| `overlay` | object | (see below) | Watermark and overlay settings |

### colors Object

| Field | Type | Default Value | Description |
|-------|------|---------------|-------------|
| `primary` | string | `#6a1fbf` | Primary brand color (purple) -- used for buttons, highlights, and accents |
| `accent` | string | `#00c853` | Accent color (green) -- used for secondary highlights and gradients |
| `background` | string | `#001233` | Background color (dark navy) -- used for page and modal backgrounds |
| `text` | string | `#ffffff` | Primary text color (white) |
| `secondary_text` | string | `#9ca3af` | Secondary/muted text color (gray) |

### fonts Object

| Field | Type | Default Value | Description |
|-------|------|---------------|-------------|
| `heading` | string | `Inter` | Font family for headings (H1-H6) |
| `body` | string | `Inter` | Font family for body text and paragraphs |
| `caption` | string | `Inter` | Font family for captions, labels, and small text |

Available font options: `Inter`, `Roboto`, `Open Sans`, `Poppins`, `Montserrat`, `Lato`, `Playfair Display`.

### logos Object

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `main_logo_url` | string | '' | Primary logo image URL |
| `secondary_logo_url` | string | '' | Secondary/alternate logo URL |
| `favicon_url` | string | '' | Favicon/icon URL |

The logos object defaults to an empty object `{}`. Logo URLs are populated when users upload images through the brand kit editor.

### backgrounds Array

Default: `[]` (empty array)

Each entry is a string URL pointing to a background image. Background images can be uploaded through the brand kit editor and are used for room backgrounds, webinar stages, and waiting rooms.

### frame Object

| Field | Type | Default Value | Description |
|-------|------|---------------|-------------|
| `style` | string | `rounded` | Frame corner style: `'rounded'`, `'square'`, `'circle'` |
| `border_width` | number | `2` | Border width in pixels |
| `border_color` | string | `#6a1fbf` | Border color (matches primary by default) |
| `shadow` | boolean | `true` | Whether to apply drop shadow to frames |

### lower_third Object

The lower third is the name/title overlay that appears at the bottom of participant video feeds during sessions.

| Field | Type | Default Value | Description |
|-------|------|---------------|-------------|
| `template` | string | `modern` | Lower third style template |
| `bg` | string | `#001233` | Background color of the lower third bar |
| `text` | string | `#ffffff` | Text color for name/title |
| `accent` | string | `#6a1fbf` | Accent color for decorative elements |
| `show_logo` | boolean | `true` | Whether to display the logo in the lower third |

### overlay Object

| Field | Type | Default Value | Description |
|-------|------|---------------|-------------|
| `watermark_position` | string | `bottom-right` | Position of the watermark overlay. Options: `'top-left'`, `'top-right'`, `'bottom-left'`, `'bottom-right'`, `'center'` |
| `watermark_opacity` | number | `0.7` | Opacity of the watermark (0.0 to 1.0) |

---

## Brand Kit Flags

### is_default

- When `true`, this brand kit is automatically applied to new rooms and sessions for the account.
- Only one brand kit per account can be the default.
- Setting a new default automatically removes the flag from the previous default.
- The default brand kit displays a yellow star icon next to its name.
- The default brand kit cannot be deleted. To delete it, first set another kit as default.

### is_global_default

- When `true`, this brand kit is automatically applied to all **new accounts** when they are created.
- Only one brand kit across the entire platform can be the global default.
- Setting a global default requires confirmation dialog: "Set [Name] as the global default for all new accounts?"
- The global default is displayed in a highlighted banner at the top of the Brand Kits tab.
- The banner shows: "Global Default: [Kit Name] -- This brand kit will be automatically applied to all new accounts."

### is_template

- When `true`, this brand kit appears in the Templates gallery.
- Templates are available for other users to browse and use as starting points.
- Using a template creates a copy -- the original template is not modified.
- Templates section is accessible via the "Templates" sub-tab in the Brand Kits tab.

---

## Permissions

Brand Kit operations are governed by role-based permissions:

| Permission | Action | Description |
|-----------|--------|-------------|
| `brand_kits.view` | View | Can see brand kits in the tab |
| `brand_kits.create` | Create | Can create new brand kits and duplicate existing ones |
| `brand_kits.edit` | Edit | Can modify brand kit settings, set as default, set as global default |
| `brand_kits.delete` | Delete | Can delete brand kits (except the current default) |

The `BrandKitTab` component receives these as props:
- `canCreate` (default: true) -- Controls visibility of "Create Brand Kit" button and "Duplicate" menu item.
- `canEdit` (default: true) -- Controls visibility of "Edit" button, "Set as Default", and "Set as Global Default" menu items.
- `canDelete` (default: true) -- Controls visibility of "Delete" menu item.

---

## Creating a Brand Kit

### From Scratch
1. Click **Create Brand Kit** in the top-right corner.
2. The `BrandKitEditorModal` opens with default values.
3. Configure each section:
   - **Colors**: Set primary, accent, background, text, and secondary text colors.
   - **Fonts**: Choose heading, body, and caption fonts from the available options.
   - **Logos**: Upload main logo, secondary logo, and favicon images.
   - **Backgrounds**: Upload one or more background images.
   - **Frame**: Set frame style, border width, border color, and shadow.
   - **Lower Third**: Choose template style, background/text/accent colors, and logo visibility.
   - **Overlay**: Set watermark position and opacity.
4. Enter a name and optional description.
5. Click **Save** to create the brand kit.

### From Template
1. Switch to the **Templates** sub-tab.
2. Browse available templates in the `BrandTemplatesSection`.
3. Click "Use Template" on any template.
4. A copy of the template is created as a new brand kit in your account.
5. The view automatically switches to the "My Brand Kits" tab.
6. Edit the new kit to customize it further.

### By Duplicating
1. On any existing brand kit card, click the three-dot menu.
2. Select **Duplicate**.
3. A copy is created with the name "[Original Name] (Copy)".
4. The duplicate has `is_default: false` regardless of the original.
5. Edit the duplicate to make changes.

---

## Editing a Brand Kit

### Grid View
1. In the grid view, click **Edit Brand Kit** on any card.
2. Or click the three-dot menu and select **Edit**.
3. The `BrandKitEditorModal` opens with the kit's current values.
4. Modify any settings.
5. Click **Save** to apply changes.

### List View
1. In the list view, click the **Edit** button on any row.
2. The same `BrandKitEditorModal` opens.
3. Modify and save.

---

## Managing Brand Kits

### Setting as Default
1. Click the three-dot menu on any brand kit.
2. Select **Set as Default**.
3. The kit is marked with a yellow star icon.
4. All new rooms and sessions will use this kit's visual identity.
5. The previous default (if any) is automatically unset.

### Setting as Global Default
1. Click the three-dot menu on any brand kit.
2. Select **Set as Global Default**.
3. Confirm the action in the dialog.
4. A banner appears at the top of the tab showing the global default.

### Deleting a Brand Kit
1. Click the three-dot menu on any brand kit.
2. Select **Delete**.
3. If the kit is the current default, deletion is blocked with the message: "Cannot delete default brand kit. Please set another as default first."
4. Otherwise, confirm the deletion.
5. The kit is permanently removed. This cannot be undone.

---

## View Modes

### Grid View
- Brand kits are displayed as cards in a responsive grid (1-3 columns depending on screen width).
- Each card shows:
  - Color gradient header (primary to accent colors).
  - Logo preview (if uploaded) overlaid on the gradient.
  - Kit name with default star indicator.
  - Description (truncated to 2 lines).
  - Feature counts (number of colors, fonts, logos configured).
  - Color swatch dots (up to 5 colors).
  - "Edit Brand Kit" button.
  - Three-dot overflow menu (edit, duplicate, set default, set global default, delete).

### List View
- Brand kits are displayed as horizontal rows.
- Each row shows:
  - Small color gradient square (primary to accent).
  - Kit name with default star indicator.
  - Description (truncated).
  - Color swatch dots (up to 5, hidden on small screens).
  - Edit button.
  - Three-dot overflow menu.

Toggle between views using the Grid/List icons in the search bar area.

---

## Search and Filtering

- Use the search bar to filter brand kits by name or description.
- Search is real-time (filters as you type).
- Searching applies to the "My Brand Kits" sub-tab only.

---

## Business Plan Features

The `BrandKitTab` receives a `plan` prop. When `plan === 'business'`:
- Additional features or templates may be unlocked.
- The `isBusinessPlan` flag is available for conditional rendering.
- Business plan users may have access to premium templates and advanced branding options.

---

## Brand Kit Application

Brand kits are applied in several contexts across R-Link:

### Studio / Rooms
- The `BrandingPanel` in the Studio interface allows hosts to select and apply a brand kit during live sessions.
- Colors, fonts, frames, and lower thirds are applied to the room's visual presentation.
- Background images from the brand kit can be used as room backgrounds.

### Webinar Templates
- The `TemplateBrandingStep` in the webinar scheduling wizard allows selecting a brand kit for the webinar.
- The `ReviewScheduleStep` shows how the brand kit will appear in the webinar.

### Recordings and Clips
- Brand kit overlays (watermarks, lower thirds) are burned into recordings and clips.
- The overlay watermark position and opacity settings control the watermark appearance.

---

## Complete Default BrandKit Object

For reference, here is the complete default brand kit configuration:

```json
{
  "name": "",
  "description": "",
  "is_default": false,
  "is_global_default": false,
  "is_template": false,
  "colors": {
    "primary": "#6a1fbf",
    "accent": "#00c853",
    "background": "#001233",
    "text": "#ffffff",
    "secondary_text": "#9ca3af"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter",
    "caption": "Inter"
  },
  "logos": {},
  "backgrounds": [],
  "frame": {
    "style": "rounded",
    "border_width": 2,
    "border_color": "#6a1fbf",
    "shadow": true
  },
  "lower_third": {
    "template": "modern",
    "bg": "#001233",
    "text": "#ffffff",
    "accent": "#6a1fbf",
    "show_logo": true
  },
  "overlay": {
    "watermark_position": "bottom-right",
    "watermark_opacity": 0.7
  }
}
```

---

## Common Troubleshooting

### Q: I cannot create a brand kit.
**A:** Creating brand kits requires the `brand_kits.create` permission. Check your role in the Team tab or ask an admin to grant you this permission. See `26-team-and-roles.md`.

### Q: I cannot delete a brand kit.
**A:** There are two possible reasons:
1. The kit is the current account default (`is_default: true`). You must set another kit as default first.
2. Your role does not have the `brand_kits.delete` permission.

### Q: My brand kit colors are not showing in the studio.
**A:** Ensure the brand kit is selected in the Studio's Branding Panel. The studio must be refreshed or the brand kit re-applied if changes were made after the session started.

### Q: The logo is not appearing in my lower third.
**A:** Check that:
1. A logo has been uploaded in the brand kit's logos section (main_logo_url must be populated).
2. The lower third `show_logo` setting is set to `true`.
3. The brand kit is selected and applied to the current session.

### Q: I want to use the same branding across multiple accounts.
**A:** Set the brand kit as the **Global Default**. This applies the brand kit to all new accounts. For existing accounts, you can export the brand kit configuration and import it, or use the Templates feature to share brand kits.

### Q: What is the difference between "Default" and "Global Default"?
**A:**
- **Default** (`is_default`) -- The brand kit automatically applied to new rooms and sessions within YOUR account.
- **Global Default** (`is_global_default`) -- The brand kit automatically applied to ALL NEW ACCOUNTS on the platform. This is typically used by platform administrators.

### Q: How do I change the watermark position?
**A:** Edit the brand kit and navigate to the Overlay section. Change the `watermark_position` field to one of: `top-left`, `top-right`, `bottom-left`, `bottom-right`, or `center`. Adjust `watermark_opacity` (0.0 = invisible, 1.0 = fully opaque) as needed.

### Q: Can I use different brand kits for different rooms?
**A:** Yes. Each room can be assigned a different brand kit. The default brand kit is used when no specific kit is assigned, but you can override this in the room settings or in the Studio's Branding Panel.

### Q: What fonts are available?
**A:** R-Link currently supports the following fonts: Inter, Roboto, Open Sans, Poppins, Montserrat, Lato, and Playfair Display. All fonts are loaded from Google Fonts.

### Q: How do I make my brand kit available as a template?
**A:** Set the `is_template` flag to `true` on the brand kit. This makes it appear in the Templates gallery for other users to browse and copy. Note that templates are read-only -- using a template creates a copy.

---

## API Reference

### Brand Kit Operations

Brand kit entities are managed through the standard entity CRUD pattern. The BrandKitTab component uses callback props:

```
// Create a brand kit
onCreate(data)  // data = { name, colors, fonts, logos, backgrounds, frame, lower_third, overlay, ... }

// Update a brand kit
onUpdate(kitId, data)  // Partial update -- only include changed fields

// Delete a brand kit
onDelete(kitId)

// Set as account default
onSetDefault(kitId)

// Set as global default
onSetGlobalDefault(kitId)

// Duplicate a brand kit
onDuplicate(kitData)  // Pass the full kit object; id is stripped and name gets "(Copy)" suffix
```

---

## Related Features

- **Rooms**: Brand kits are applied to rooms via the Studio's BrandingPanel. See rooms documentation.
- **Recordings and Clips**: Overlay settings (watermark, lower third) appear in recordings. See `23-recordings-and-clips.md`.
- **Webinar Scheduling**: Brand kits can be selected during webinar setup. See `22-scheduling.md`.
- **Roles and Permissions**: Brand kit CRUD is governed by the `brand_kits` permission category. See `26-team-and-roles.md`.
