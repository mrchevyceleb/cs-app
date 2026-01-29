# Brand Kits

## Overview

The Brand Kit system in R-Link allows accounts to define and manage comprehensive visual identities that are applied across rooms, sessions, recordings, and public-facing elements like Event Landing Pages. Brand Kits are located in Group 2 of the Admin Sidebar (alongside Room Templates and Elements Library).

A `BrandKit` entity contains colors, fonts, logos, backgrounds, frame settings, lower third templates, and overlay defaults. Brand Kits are permission-gated and support default designation at both the account level and a global level (owner only).

### BrandKit Entity Structure

```
BrandKit {
  account_id        // The account this brand kit belongs to
  name              // Display name of the brand kit
  description       // Optional description
  is_default        // Whether this is the account's default brand kit
  is_global_default // Whether this is the global default (owner-only setting)
  is_template       // Whether this kit is a template available to other accounts
  colors            // Color configuration object
  fonts             // Font configuration object
  logos             // Logo storage object
  backgrounds       // Array of background images
  frame             // Frame appearance settings
  lower_third       // Lower third overlay configuration
  overlay           // Overlay default settings (watermark)
}
```

## Color Configuration

Brand Kits define five color fields that are applied throughout the R-Link interface for rooms and sessions.

| Color Field | Purpose | Default Value |
|------------|---------|---------------|
| `primary` | Primary brand color, used for buttons, accents, and key UI elements | `#6a1fbf` (purple) |
| `accent` | Secondary accent color for highlights, links, and interactive elements | `#00c853` (green) |
| `background` | Main background color for the room and overlays | `#001233` (dark navy) |
| `text` | Primary text color | `#ffffff` (white) |
| `secondary_text` | Secondary/muted text color for labels, captions, and less prominent text | `#9ca3af` (gray) |

### Setting Colors

1. Navigate to **Brand Kits** in the Admin Sidebar.
2. Create a new brand kit or edit an existing one.
3. In the **Colors** section, click on any color swatch to open the color picker.
4. Enter a hex value directly or use the visual color picker.
5. Changes preview in real time within the editor.
6. Click **Save** to apply.

### Color Application

- **Room UI**: The primary and accent colors style buttons, controls, and interactive elements within the room.
- **Lower thirds**: Background and text colors are used for participant name overlays.
- **Event Landing Pages**: Colors are applied to the registration page, buttons, and text.
- **Recordings/Clips**: Branded overlays in recordings use the brand kit colors.

## Font Configuration

Brand Kits define three font settings for text rendered in the R-Link platform.

| Font Field | Purpose | Default Value |
|-----------|---------|---------------|
| `heading` | Font for headings, titles, and prominent text | `Inter` |
| `body` | Font for body text, descriptions, and general content | `Inter` |
| `caption` | Font for captions, labels, and small text elements | `Inter` |

### Setting Fonts

1. In the brand kit editor, navigate to the **Fonts** section.
2. For each font field (heading, body, caption), select from the available font list.
3. The font list includes web-safe fonts and popular Google Fonts.
4. Preview how each font appears in context.
5. Click **Save** to apply.

## Logo Management

The `logos` field is stored as an empty object `{}` by default and supports uploading multiple logo assets for different contexts.

### Logo Types

- **Primary logo**: The main brand logo displayed in the room header, lower thirds (if `show_logo` is enabled), and Event Landing Pages.
- **Secondary logo**: An alternate logo for lighter or darker backgrounds.
- **Favicon/Icon**: A small icon version used for browser tabs and compact displays.

### Uploading Logos

1. In the brand kit editor, navigate to the **Logos** section.
2. Click **Upload Logo** for the desired logo slot.
3. Select an image file (PNG, SVG, or JPG recommended; PNG with transparency preferred).
4. The logo is uploaded and stored in the brand kit's `logos` object.
5. Adjust positioning or sizing if options are available.
6. Click **Save**.

### Logo Usage

- Logos appear in the room interface based on room template settings.
- The lower third overlay displays the logo when `show_logo` is set to `true`.
- Event Landing Pages use the primary logo in the header area.

## Background Images

The `backgrounds` field is stored as an empty array `[]` by default and holds references to uploaded background images.

### Managing Backgrounds

1. In the brand kit editor, navigate to the **Backgrounds** section.
2. Click **Add Background** to upload a new background image.
3. Supported formats: JPG, PNG, WebP.
4. Recommended resolution: Match your session's target resolution (e.g., 1920x1080 for full HD).
5. Multiple backgrounds can be uploaded; hosts select which one to use during sessions.
6. To remove a background, click the delete icon on the background thumbnail.
7. Click **Save**.

### Background Application

- Backgrounds are available as virtual backgrounds during live sessions.
- Hosts and participants (depending on room settings) can select from the brand kit's backgrounds.
- Backgrounds can also be used as backdrop images for the room layout.

## Frame Settings

Frame settings control the visual appearance of participant video frames within the room.

| Frame Setting | Purpose | Default Value |
|--------------|---------|---------------|
| `style` | Frame shape/style | `rounded` |
| `border_width` | Width of the frame border in pixels | `2` |
| `border_color` | Color of the frame border | `#6a1fbf` (matches primary) |
| `shadow` | Whether a drop shadow is applied to frames | `true` |

### Configuring Frame Settings

1. In the brand kit editor, navigate to the **Frame** section.
2. **Style**: Choose from available frame styles (e.g., `rounded`, `square`, `circle`, `pill`).
3. **Border Width**: Use a slider or input field to set the border width (0 for no border, up to a maximum value).
4. **Border Color**: Click the color swatch to choose a border color. By default this matches the primary brand color.
5. **Shadow**: Toggle the drop shadow on or off. Shadows add depth to video frames against the background.
6. Preview the frame appearance in the editor.
7. Click **Save**.

### Frame Application

- Frame settings apply to all participant video tiles in the room.
- During recording, the frame settings are baked into the recorded output.
- Multi-track recordings preserve frame settings per track.

## Lower Third Configuration

Lower thirds are overlay graphics that display participant names, titles, and optionally a logo at the bottom of the video feed.

| Lower Third Setting | Purpose | Default Value |
|--------------------|---------|---------------|
| `template` | Lower third design template | `modern` |
| `background_color` | Background color of the lower third bar | `#001233` (dark navy) |
| `text_color` | Text color for name and title | `#ffffff` (white) |
| `accent_color` | Accent color for decorative elements | `#6a1fbf` (purple) |
| `show_logo` | Whether to display the brand logo in the lower third | `true` |

### Configuring Lower Thirds

1. In the brand kit editor, navigate to the **Lower Third** section.
2. **Template**: Select a design template (e.g., `modern`, `minimal`, `bold`, `classic`). Each template has a different layout and animation style.
3. **Background Color**: Set the background color of the lower third overlay.
4. **Text Color**: Set the color for participant name and title text.
5. **Accent Color**: Set the color for accent elements (lines, borders, decorative shapes depending on template).
6. **Show Logo**: Toggle whether the brand logo appears in the lower third.
7. Preview the lower third with sample data.
8. Click **Save**.

### Lower Third Usage

- Lower thirds appear during live sessions when enabled in room settings.
- They display the participant's name and optional title/role.
- Lower thirds are included in recordings.
- Different templates have different animations (slide in, fade in, etc.).

## Overlay Defaults

Overlay defaults control persistent visual elements layered over the session video.

| Overlay Setting | Purpose | Default Value |
|----------------|---------|---------------|
| `watermark_position` | Screen position for the watermark | `bottom-right` |
| `watermark_opacity` | Opacity of the watermark (0 to 1) | `0.7` |

### Configuring Overlay Defaults

1. In the brand kit editor, navigate to the **Overlay** section.
2. **Watermark Position**: Select where the watermark appears on screen. Options typically include: `top-left`, `top-right`, `bottom-left`, `bottom-right`, `center`.
3. **Watermark Opacity**: Adjust the slider from 0 (fully transparent) to 1 (fully opaque). Default is `0.7`.
4. The watermark image is sourced from the brand kit's logo.
5. Preview the watermark position and opacity.
6. Click **Save**.

### Overlay Application

- Watermarks appear during live sessions and are included in recordings.
- Watermark position and opacity persist across all sessions using the brand kit.
- Participants see the watermark but cannot modify it.

## Creating a Brand Kit

### Step-by-Step

1. Navigate to **Brand Kits** in the Admin Sidebar.
2. Click **Create Brand Kit**.
3. Enter a **Name** for the brand kit (required).
4. Enter an optional **Description**.
5. Configure each section: Colors, Fonts, Logos, Backgrounds, Frame, Lower Third, Overlay.
6. Click **Save** to create the brand kit.

### Permission Requirement

Creating a brand kit requires the `brand_kits.create` permission (`canCreate`). If you do not see the Create button, your role does not have this permission. Contact your account owner or an admin to update your role.

## Editing a Brand Kit

1. Navigate to **Brand Kits** in the Admin Sidebar.
2. Click on the brand kit you want to edit.
3. Modify any settings as needed.
4. Click **Save** to apply changes.

### Permission Requirement

Editing requires the `brand_kits.edit` permission (`canEdit`).

### Impact of Edits

Changes to a brand kit take effect immediately for all rooms and sessions using that brand kit. Existing recordings are not retroactively updated.

## Deleting a Brand Kit

1. Navigate to **Brand Kits** in the Admin Sidebar.
2. Select the brand kit to delete.
3. Click **Delete** and confirm the action.
4. If the brand kit is in use by rooms, you may be prompted to assign a replacement.

### Permission Requirement

Deleting requires the `brand_kits.delete` permission (`canDelete`).

### Impact of Deletion

- Rooms using the deleted brand kit will fall back to the account default brand kit or platform defaults.
- The default brand kit cannot be deleted until another kit is designated as default.

## Setting Default Brand Kit

The default brand kit is automatically applied to new rooms and sessions unless a different kit is explicitly selected.

1. Navigate to **Brand Kits**.
2. Click the **Set as Default** option on the desired brand kit.
3. The previous default kit loses its default status.
4. The `is_default` field is set to `true` on the selected kit.

Any team member with `brand_kits.edit` permission can set the account default.

## Setting Global Default (Owner Only)

The global default brand kit is a special designation that makes a brand kit available and default across all accounts in a multi-account context (e.g., whitelabel or enterprise deployments).

1. Only the **account owner** can set the global default.
2. Navigate to **Brand Kits**.
3. Select the desired brand kit and click **Set as Global Default**.
4. The `is_global_default` field is set to `true`.

**Important**: This is an owner-only operation. Non-owner users, including admins, cannot set the global default.

## Brand Kit Filtering and Visibility

The Brand Kits list shows kits based on the following criteria:

- Brand kits where `account_id` matches the current account (kits created by this account).
- Brand kits where `is_global_default` is `true` (global defaults visible to all accounts).
- Brand kits where `is_template` is `true` (template kits available as starting points).

This means users may see brand kits they did not create if those kits are global defaults or templates.

## Settings and Options

| Setting | Field | Default | Notes |
|---------|-------|---------|-------|
| Primary Color | `colors.primary` | `#6a1fbf` | Purple |
| Accent Color | `colors.accent` | `#00c853` | Green |
| Background Color | `colors.background` | `#001233` | Dark navy |
| Text Color | `colors.text` | `#ffffff` | White |
| Secondary Text Color | `colors.secondary_text` | `#9ca3af` | Gray |
| Heading Font | `fonts.heading` | `Inter` | |
| Body Font | `fonts.body` | `Inter` | |
| Caption Font | `fonts.caption` | `Inter` | |
| Logos | `logos` | `{}` | Empty object |
| Backgrounds | `backgrounds` | `[]` | Empty array |
| Frame Style | `frame.style` | `rounded` | |
| Frame Border Width | `frame.border_width` | `2` | Pixels |
| Frame Border Color | `frame.border_color` | `#6a1fbf` | Matches primary |
| Frame Shadow | `frame.shadow` | `true` | Drop shadow on frames |
| Lower Third Template | `lower_third.template` | `modern` | |
| Lower Third BG Color | `lower_third.background_color` | `#001233` | Dark navy |
| Lower Third Text Color | `lower_third.text_color` | `#ffffff` | White |
| Lower Third Accent | `lower_third.accent_color` | `#6a1fbf` | Purple |
| Lower Third Logo | `lower_third.show_logo` | `true` | |
| Watermark Position | `overlay.watermark_position` | `bottom-right` | |
| Watermark Opacity | `overlay.watermark_opacity` | `0.7` | Range 0-1 |
| Is Default | `is_default` | `false` | Account default |
| Is Global Default | `is_global_default` | `false` | Owner only |
| Is Template | `is_template` | `false` | Template visibility |

## Troubleshooting

### Brand kit changes not appearing in room
- Verify the room is using the correct brand kit (check room settings).
- Hard refresh the browser to clear cached styles.
- Changes apply immediately to new sessions but do not retroactively affect active sessions. The host may need to refresh or rejoin.

### Cannot create or edit brand kits
- Your role must have the `brand_kits.create` or `brand_kits.edit` permission. Check with your account owner or admin.
- If you see brand kits but cannot modify them, they may be global defaults or templates owned by another account.

### Logo not displaying
- Verify the logo was uploaded successfully (check the Logos section in the brand kit editor).
- Ensure the file format is supported (PNG, SVG, JPG).
- Very large logo files may fail to upload; try reducing file size.
- For lower thirds, confirm `show_logo` is set to `true`.

### Colors look different in recording vs. live session
- Recordings encode the colors as rendered at session time. If the brand kit was changed after the session, the recording reflects the old colors.
- Monitor calibration differences between devices can also cause perceived color differences.

### Cannot set global default
- Only the account owner can set the global default. Admin role users and custom roles cannot perform this action. Verify you are logged in as the account owner.

### Background image not appearing as option in session
- Verify the background image was added to the brand kit's `backgrounds` array.
- Ensure the room is using the brand kit that contains the background.
- Check that the image format is supported (JPG, PNG, WebP).

### "Set as Default" button not visible
- The `brand_kits.edit` permission is required to set the default. Check your role permissions.

## FAQ

**Q: How many brand kits can I create?**
A: The number of brand kits depends on your plan. Basic plans may be limited to 1-2 brand kits, while Business plans support unlimited brand kits.

**Q: Can I duplicate a brand kit?**
A: Yes. Open an existing brand kit and use the Duplicate option to create a copy with all settings pre-filled. This is useful for creating variations of an existing brand.

**Q: What is the difference between "default" and "global default"?**
A: The **default** (`is_default`) brand kit is the account-level default applied to new rooms in that account. The **global default** (`is_global_default`) is visible and available across all accounts (useful in enterprise/whitelabel setups) and can only be set by the account owner.

**Q: What are template brand kits?**
A: Brand kits with `is_template` set to `true` are available as starting points for all accounts. They appear in the brand kit list for any account, but users create their own copy when they want to customize them.

**Q: Can different rooms use different brand kits?**
A: Yes. Each room can be assigned a specific brand kit. If no brand kit is explicitly assigned, the account default is used.

**Q: Do brand kit changes affect existing recordings?**
A: No. Recordings capture the brand kit settings as they were at the time of recording. Changing a brand kit after a session does not alter the recording.

**Q: Can I export or import brand kits?**
A: Brand kit export/import is not currently available as a user-facing feature. Template brand kits serve a similar purpose for sharing brand configurations.

**Q: What fonts are available?**
A: The platform supports a curated list of web-safe fonts and popular Google Fonts. Custom font uploads are not currently supported.

## Known Limitations

- Custom font uploads are not supported; only the platform's font library is available.
- Brand kit changes do not retroactively update existing recordings or clips.
- The `logos` object structure does not enforce specific logo slots, so logo management depends on the UI implementation.
- Background images do not have automatic resizing; users should upload images at the recommended resolution.
- Lower third template options are fixed; custom lower third designs are not supported.
- Global default and template brand kits are read-only for non-owning accounts.
- Watermark image is sourced from the brand logo; custom watermark images separate from the logo are not supported.

## Plan Requirements

| Feature | Basic Plan | Business Plan |
|---------|-----------|---------------|
| Create brand kits | Limited (1-2) | Unlimited |
| Edit brand kits | Yes | Yes |
| Custom colors | Yes | Yes |
| Custom fonts | Yes | Yes |
| Logo upload | Yes | Yes |
| Background images | Limited | Unlimited |
| Frame customization | Basic | Full (all settings) |
| Lower third templates | 1 template | All templates |
| Overlay/watermark | Basic | Full control |
| Set default | Yes | Yes |
| Set global default | N/A | Owner only |
| Template brand kits | View only | Create and manage |

## Related Documents

- **21-admin-panel-navigation.md** -- Admin panel sidebar structure and Group 2 navigation
- **23-recordings-and-clips.md** -- How brand kit settings apply to recordings
- **26-team-and-roles.md** -- Permission system for brand kit operations
- **22-scheduling.md** -- Sessions inherit brand kits from their associated rooms
