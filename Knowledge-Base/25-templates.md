# Room Templates

## Overview

Room Templates in R-Link allow users to create reusable room configurations with preset settings -- including layout, features, branding, and session type. Templates eliminate the need to manually configure a room from scratch each time. They are managed through the **Templates** admin tab (`/admin?tab=templates`) via the `TemplatesTab` component, and are stored as `RoomTemplate` entities in Base44.

Each template belongs to a specific account (via `account_id`) and can optionally be set as the default template. Templates can be created manually, duplicated from existing templates, or generated using the built-in AI assistant. When creating a new room, users can select a template to pre-populate the room's configuration.

---

## RoomTemplate Entity

The `RoomTemplate` entity stores the following key fields:

| Field | Type | Description |
|---|---|---|
| `id` | string | Unique identifier (auto-generated) |
| `account_id` | string | The account that owns this template |
| `name` | string | Display name of the template |
| `description` | string | Optional description text (shown on template card, truncated to 2 lines) |
| `category` | string | Template category (see categories below) |
| `layout` | string | Default layout for rooms created from this template |
| `is_default` | boolean | Whether this is the account's default template |
| `is_system_template` | boolean | Whether this is a system-provided template (cannot be edited) |
| `brand_kit_id` | string | Optional associated Brand Kit ID |
| `core_features` | object | Feature toggles: `recording`, `chat`, `waiting_room`, `breakout_rooms`, `reactions`, `screen_share`, `polls`, `q_and_a`, `transcription` |
| `commerce_features` | object | Commerce toggles: `product_showcase`, `checkout`, `auctions`, `tipping` |
| `created_date` | string | ISO timestamp of creation |

---

## Template Categories

Templates are organized by category. Each category has an associated icon and color gradient displayed on the template card header.

| Category ID | Label | Description |
|---|---|---|
| `podcast` | Podcast Studio | Optimized for podcast-style recordings |
| `webinar` | Webinar | Presentation and webinar events |
| `meeting` | Team Meeting | Collaborative team meetings |
| `workshop` | Workshop | Interactive training and workshops |
| `event` | Live Event | Live streaming events |
| `sales` | Sales Demo | Sales demonstrations and pitches |
| `interview` | Interview | One-on-one or panel interviews |
| `auction` | Auction | Live auction and bidding sessions |
| `office_hours` | Office Hours | Q&A and open office hours |
| `conference` | Conference | Multi-speaker conference events |
| `custom` | Custom | User-defined custom configuration |

If a template has no recognized category, it defaults to `custom`.

---

## Template Layouts

Each template specifies a default layout. Available layout values:

| Layout ID | Display Label |
|---|---|
| `gallery` | Gallery View |
| `speaker_top` | Speaker Top |
| `focus` | Focus Mode |
| `sidebar` | Sidebar |
| `theater` | Theater Mode |
| `split` | Split Screen |
| `pip` | Picture-in-Picture |
| `boardroom` | Boardroom |

---

## Creating a Template

### Step-by-Step: Manual Creation

1. Navigate to **Admin** > **Templates** tab (`/admin?tab=templates`).
2. Click the **Create Template** button (purple-green gradient, top right).
3. The `RoomTemplateModal` dialog opens with the following fields:
   - **Name** (required): Enter a descriptive template name.
   - **Description** (optional): Brief description of the template's purpose.
   - **Category**: Select from the category dropdown.
   - **Layout**: Choose the default layout.
   - **Brand Kit**: Associate a Brand Kit from the account's available kits (passed as `brandKits` prop).
   - **Core Features**: Toggle recording, chat, waiting room, breakout rooms, etc.
   - **Commerce Features**: Toggle product showcase, checkout, auctions, tipping.
4. Click **Save**. The system calls `RoomTemplate.create()` with the template data plus `account_id`.
5. The new template appears in the grid.

### Step-by-Step: Duplicate an Existing Template

1. On any template card, click the **three-dot menu** (MoreVertical icon).
2. Select **Duplicate**.
3. A copy is created with the name `"{Original Name} (Copy)"` and `is_default: false`, `is_system_template: false`.
4. Edit the duplicate as needed.

---

## Editing a Template

1. On the template card, click the **three-dot menu**.
2. Select **Edit**.
3. The `RoomTemplateModal` opens pre-populated with the template's current settings.
4. Modify any fields.
5. Click **Save**. The system calls `RoomTemplate.update(id, data)`.

---

## Deleting a Template

1. On the template card, click the **three-dot menu**.
2. Select **Delete** (shown in red).
3. The system calls `RoomTemplate.delete(id)`.
4. The template is removed from the grid.

**Note:** There is no confirmation dialog for deletion in the current implementation. Deletion is immediate.

---

## Setting a Default Template

Only one template per account can be the default. When a user sets a template as default:

1. On the template card, click the **three-dot menu**.
2. Select **Set as Default** (only visible if the template is not already the default).
3. The system updates ALL templates for the account: sets `is_default: true` on the selected template and `is_default: false` on all others.
4. The default template displays a yellow star icon next to its name.

**Technical detail:** The `setDefaultTemplateMutation` calls `Promise.all(templates.map(...))` to update every template in the account, ensuring only one default exists.

---

## AI Assistant for Template Generation

The Templates tab includes an AI assistant (`TemplateAIAssistant` component) with three modes:

### AI Generate (New Template)

1. Click the **AI Generate** button (sparkles icon, purple outline) in the Templates header.
2. The AI assistant modal opens in `generate` mode.
3. Describe the type of room you want (e.g., "a podcast studio for 3 hosts with chat and recording").
4. The AI generates a complete template configuration.
5. Click **Apply** to create the template.

### AI Variations (From Existing Template)

1. On a template card, click the **three-dot menu**.
2. Select **AI Variations** (purple refresh icon).
3. The AI assistant opens in `variations` mode with the existing template as context.
4. The AI generates alternative configurations based on the original template.
5. Click **Apply** to create a new template from the variation.

### AI Suggestions (Improve Existing Template)

1. On a template card, click the **three-dot menu**.
2. Select **AI Suggestions** (green lightbulb icon).
3. The AI assistant opens in `suggestions` mode with the existing template as context.
4. The AI analyzes the template and recommends improvements.
5. Click **Apply** to update the existing template with the suggestions (merges changes).

---

## Applying a Template to a Room

Templates can be applied when creating or launching rooms:

### Quick Launch from Template Card

1. On any template card, click the **Launch Room** button at the bottom.
2. The system navigates to the Studio page with the template ID and session type:
   - `webinar` category templates launch as `?type=webinar`
   - `event` category templates launch as `?type=livestream`
   - All other categories launch as `?type=meeting`
   - URL format: `/Studio?template={template_id}&type={session_type}`

### Apply During Room Creation

1. Navigate to **Admin** > **Rooms** tab.
2. Click **Create Room**.
3. In the room creation dialog, select a template from the templates dropdown.
4. The room is pre-populated with the template's configuration.

---

## Searching and Filtering Templates

The Templates tab provides:

### Search

- A search bar at the top filters templates by **name** and **description** (case-insensitive substring match).

### Category Filter

- A dropdown filter next to the search bar allows filtering by category.
- Options: "All Categories" plus each of the 11 category types.
- Only templates matching the selected category are displayed.

---

## Template-BrandKit Association

Templates can be linked to Brand Kits:

- The `RoomTemplateModal` receives the full list of `brandKits` available to the account.
- When creating or editing a template, users can select an associated Brand Kit.
- This Brand Kit is applied when a room is created from the template, giving rooms consistent visual branding.
- Brand Kits shown include account-owned kits, global defaults, and template-specific kits.

---

## TemplatesTab Interface

### Props Received

| Prop | Type | Description |
|---|---|---|
| `templates` | array | List of `RoomTemplate` objects for the current account |
| `brandKits` | array | List of `BrandKit` objects available |
| `onCreate` | function | Callback to create a new template (adds `account_id` automatically) |
| `onUpdate` | function | Callback to update a template `(id, data)` |
| `onDelete` | function | Callback to delete a template `(id)` |
| `onSetDefault` | function | Callback to set a template as default `(id)` |

### UI Layout

- **Header**: Title ("Room Templates"), subtitle, AI Generate button, Create Template button.
- **Search/Filter bar**: Search input + category dropdown.
- **Template Grid**: 3-column responsive grid (1 col mobile, 2 col tablet, 3 col desktop).
- **Empty State**: When no templates exist, shows a centered prompt with a Create Template button.
- **Template Cards**: Each card shows a colored gradient header (based on category), star icon if default, name, layout badge with category icon, description (2-line clamp), enabled features icons (up to 4), and a Launch Room button.

---

## Settings and Options

| Setting | Location | Description |
|---|---|---|
| Template Name | Template modal | Required. Display name shown on the card. |
| Template Description | Template modal | Optional. Shown truncated on the card. |
| Category | Template modal | One of 11 categories (determines icon and color). |
| Layout | Template modal | Default layout preset. |
| Brand Kit | Template modal | Associated brand kit for visual configuration. |
| Core Features | Template modal | Toggle switches for recording, chat, waiting room, etc. |
| Commerce Features | Template modal | Toggle switches for product showcase, auctions, etc. |
| Is Default | Three-dot menu | Set as the account's default template. |

---

## Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| "No templates yet" empty state | Account has no templates created | Click **Create Template** or **AI Generate** to create the first template |
| Template not appearing after creation | Query cache not invalidated | Refresh the page; the `templates` query key should auto-invalidate |
| Cannot set as default | Template is already the default | The "Set as Default" option only appears for non-default templates |
| Duplicate has same name | Expected behavior | Duplicates are named `"{Original Name} (Copy)"` -- rename after duplicating |
| AI assistant not opening | JavaScript error or modal state issue | Refresh the page and try again; check browser console for errors |
| Template features not reflecting in room | Template was changed after room creation | Templates set initial configuration only; changing a template does not retroactively update rooms |
| Search returns no results | Search query does not match name or description | Clear the search field or adjust the query; search is case-insensitive |
| Category filter shows no templates | No templates in the selected category | Switch to "All Categories" or create a template in that category |

---

## FAQ

**Q: Can I create a room template without a Brand Kit?**
A: Yes. The Brand Kit association is optional. If no Brand Kit is selected, the room will use the account's default Brand Kit.

**Q: How many templates can I create?**
A: There is no documented limit on the number of templates per account.

**Q: Can I share templates between accounts?**
A: No. Templates are scoped to a single account via `account_id`. System templates (where `is_system_template: true`) may be available across accounts.

**Q: Does changing a template update existing rooms?**
A: No. Templates define the initial configuration when a room is created or launched. Existing rooms retain their current settings.

**Q: Can I use AI to generate a template if I'm on the Basic plan?**
A: The AI assistant button appears on the Templates tab regardless of plan. However, features that are Business-only (like webinar and livestream capabilities) may not be fully functional on the Basic plan even if included in an AI-generated template.

**Q: What happens if I delete the default template?**
A: The default template is deleted and no template will have `is_default: true`. The next room creation will proceed without a pre-selected template.

---

## Known Limitations

1. **No confirmation on delete**: Template deletion is immediate with no undo or confirmation dialog.
2. **Single default per account**: Only one template can be the default at a time. Setting a new default clears the previous one.
3. **No template versioning**: Changes to templates overwrite the previous state with no revision history.
4. **AI assistant availability**: The AI assistant relies on the Base44 AI infrastructure and may not be available during outages.
5. **Template features exceed plan**: A template may include features (e.g., webinar, breakout rooms) that the user's plan does not support. The room will be created but those features will be gated.

---

## Plan Requirements

| Feature | Basic | Business |
|---|---|---|
| Access Templates Tab | Yes | Yes |
| Create Templates | Yes | Yes |
| AI Template Generation | Yes | Yes |
| Set Default Template | Yes | Yes |
| Launch Room from Template (Meeting) | Yes | Yes |
| Launch Room from Template (Webinar) | No | Yes |
| Launch Room from Template (Live Stream) | No | Yes |

---

## Related Documents

- [01-platform-overview.md](./01-platform-overview.md) -- Platform architecture and entity model
- [04-account-management.md](./04-account-management.md) -- Account setup and Brand Kit auto-creation
- [11-brand-kit.md](./11-brand-kit.md) -- Brand Kit configuration details
- [04-rooms.md](./04-rooms.md) -- Room creation and configuration
- [32-admin-dashboard-reference.md](./32-admin-dashboard-reference.md) -- Complete admin tab reference
